/* Calibration and measurement records for the instrument tab (AGPL-3.0-or-later, see LICENSE).

   Two kinds of stored object:
   - calibration: one reusable calibration (kind 'blackbody1' | 'blackbodySet' | 'absolute'), with parameters and the inputs
     it was built from.
   - measurement: one spectrum with its raw data, settings, instrument identity and a SNAPSHOT of every calibration that was
     applied. The snapshot is a copy, not only a reference, so a measurement reproduces exactly even after the calibration
     it used is changed or deleted.

   This file is pure logic (no DOM, no USB). The IndexedDB part is at the bottom and is only used in the browser.
   Works in the browser (window.CalStore) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalStore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CAL_KINDS = ['blackbody1', 'blackbodySet', 'absolute'];
  const ABS_REFS = ['luminance', 'irradiance', 'laser', 'factor'];
  const BACKUP_FORMAT = 'gel-chromaticity-map-library';
  const BACKUP_VERSION = 2;
  const DB_NAME = 'gel-map', DB_VERSION = 2;
  const STORES = { leds: 'leds', measurements: 'measurements', calibrations: 'calibrations' };

  const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const newId = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  /* ---- calibration objects ---- */

  /* params per kind:
     blackbody1:    { T: K, refSpd: [nm,...] or null, measured: {bands:[36], ...}, correction: [36 factors] }
     blackbodySet:  { steps: [{ estimateK, fittedK, anchor: bool, bands:[36] }], anchorIndex: n|null }
     absolute:      { ref: 'luminance'|'irradiance'|'laser'|'factor', value, unit, factor, window_nm: [lo,hi] | null,
                      beamArea_mm2: n|null } */
  function validateCalibration(c) {
    const p = [];
    if (!c || typeof c !== 'object') return ['not an object'];
    if (!CAL_KINDS.includes(c.kind)) p.push('unknown kind ' + c.kind);
    if (!c.id) p.push('missing id');
    if (!c.params || typeof c.params !== 'object') p.push('missing params');
    else if (c.kind === 'blackbody1') {
      if (!(c.params.T > 0)) p.push('blackbody temperature missing');
      if (!Array.isArray(c.params.correction) || c.params.correction.length !== 36) p.push('correction must have 36 values');
    } else if (c.kind === 'blackbodySet') {
      if (!Array.isArray(c.params.steps) || c.params.steps.length < 1) p.push('no steps');
    } else if (c.kind === 'absolute') {
      if (!ABS_REFS.includes(c.params.ref)) p.push('unknown absolute reference ' + c.params.ref);
      if (!(c.params.factor > 0)) p.push('absolute factor must be positive');
    }
    return p;
  }

  function makeCalibration({ kind, name, params, inputs, created }) {
    const c = { id: newId('cal'), kind, name: name || kind, created: created || new Date().toISOString(),
      params: clone(params), inputs: clone(inputs || {}) };
    const bad = validateCalibration(c);
    if (bad.length) throw new Error('Invalid calibration: ' + bad.join('; '));
    return c;
  }

  /* ---- measurement records ---- */

  /* A measurement holds the raw data needed to re-process it later:
     raw: { pixels:[128 counts/s], bands:[36 ArgyllCMS values], darkModel?: {...} }
     settings: { mode:'em'|'rf', integrationMs, averaged, resolution: preset id or custom opts, kernel... }
     instrument: { serial, firmware, eepromHash, eepromSource: 'device'|'file'|'backup'|'demo' }
     calibrations: [{ role:'source'|'absolute'|'white'|'dark', id, snapshot: {...} }]
     derived: { cct, duv, cri:{Ra,R}, tm30:{Rf,Rg}, ... } (optional, recomputed on load if missing)
     spectrum: [{nm, v}] output spectrum, or flat arrays wl/v */
  function makeMeasurement({ name, comment, type, created, raw, settings, instrument, spectrum, derived, calibrations }) {
    const snaps = (calibrations || []).map(c => ({ role: c.role, id: c.id, snapshot: clone(c.snapshot) }));
    const m = {
      id: newId('msr'), name: name || 'measurement', comment: comment || '',
      type, created: created || new Date().toISOString(),
      raw: clone(raw || {}), settings: clone(settings || {}), instrument: clone(instrument || {}),
      calibrations: snaps, spectrum: clone(spectrum || null), derived: clone(derived || null)
    };
    const bad = validateMeasurement(m);
    if (bad.length) throw new Error('Invalid measurement: ' + bad.join('; '));
    return m;
  }

  function validateMeasurement(m) {
    const p = [];
    if (!m || typeof m !== 'object') return ['not an object'];
    if (!m.id) p.push('missing id');
    if (!['light', 'pigment'].includes(m.type)) p.push('type must be light or pigment');
    if (!m.raw || !Array.isArray(m.raw.pixels) || m.raw.pixels.length !== 128) p.push('raw.pixels must have 128 values');
    if (!m.instrument || !m.instrument.eepromHash) p.push('instrument.eepromHash missing');
    for (const c of m.calibrations || []) {
      if (!['source', 'absolute', 'white', 'dark'].includes(c.role)) p.push('unknown calibration role ' + c.role);
      if (!c.snapshot) p.push('calibration ' + c.id + ' has no snapshot');
    }
    return p;
  }

  /* SHA-256 of the EEPROM bytes, hex. Uses WebCrypto (browser and Node 20+). */
  async function eepromHash(bytes) {
    const d = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ---- backup file (format 2; format 1 files are read too) ---- */
  function backupBuild({ sets, leds, measurements, calibrations, saved }) {
    return JSON.stringify({
      format: BACKUP_FORMAT, version: BACKUP_VERSION, saved: saved || new Date().toISOString(),
      sets: sets || {}, leds: leds || [], measurements: measurements || [], calibrations: calibrations || []
    });
  }

  function backupParse(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { throw new Error('That file is not a backup (not valid JSON).'); }
    if (!o || o.format !== BACKUP_FORMAT) throw new Error('That file is not a backup made by this page.');
    if (!(o.version >= 1 && o.version <= BACKUP_VERSION)) throw new Error('Backup version ' + o.version + ' is not supported.');
    return {
      version: o.version, sets: o.sets || {}, leds: o.leds || [],
      measurements: o.measurements || [], calibrations: o.calibrations || []
    };
  }

  /* ---- IndexedDB (browser only). Version 2 adds 'measurements' and 'calibrations' to the existing 'leds' store. ---- */
  function openDB(indexedDBImpl) {
    const idb = indexedDBImpl || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    if (!idb) return Promise.reject(new Error('IndexedDB is not available'));
    return new Promise((res, rej) => {
      const r = idb.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORES.leds)) db.createObjectStore(STORES.leds, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.measurements)) db.createObjectStore(STORES.measurements, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.calibrations)) db.createObjectStore(STORES.calibrations, { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  function putRecord(db, store, rec) {
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(clone(rec));
      tx.oncomplete = () => res(rec.id);
      tx.onerror = () => rej(tx.error);
    });
  }

  function getAllRecords(db, store) {
    return new Promise((res, rej) => {
      const r = db.transaction(store).objectStore(store).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  function deleteRecord(db, store, id) {
    return new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  return {
    CAL_KINDS, ABS_REFS, BACKUP_VERSION, STORES, DB_NAME, DB_VERSION,
    makeCalibration, validateCalibration, makeMeasurement, validateMeasurement, eepromHash,
    backupBuild, backupParse, openDB, putRecord, getAllRecords, deleteRecord
  };
});
