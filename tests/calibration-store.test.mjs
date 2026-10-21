// Tests for src/js/instrument/calibration-store.js (no browser needed):  node tests/calibration-store.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CS = require(path.join(root, 'src/js/instrument/calibration-store.js'));

let fail = 0;
const ok = (name, fn) => {
  try { fn(); console.log('PASS ' + name); }
  catch (e) { fail++; console.log('FAIL ' + name + '  ' + e.message); }
};
const bands = Array.from({ length: 36 }, (_, i) => 1 + i / 100);
const pixels = Array.from({ length: 128 }, (_, i) => i * 10);

ok('blackbody calibration with 36 correction factors is accepted', () => {
  const c = CS.makeCalibration({ kind: 'blackbody1', params: { T: 2856, correction: bands, measured: { bands } } });
  assert.equal(c.kind, 'blackbody1');
  assert.ok(c.id.startsWith('cal-'));
});

ok('blackbody calibration without 36 factors is refused', () => {
  assert.throws(() => CS.makeCalibration({ kind: 'blackbody1', params: { T: 2856, correction: [1, 2] } }), /36 values/);
});

ok('multi-temperature set needs at least one step', () => {
  assert.throws(() => CS.makeCalibration({ kind: 'blackbodySet', params: { steps: [] } }), /no steps/);
  const c = CS.makeCalibration({ kind: 'blackbodySet', params: { steps: [{ estimateK: 2700, fittedK: 2710, anchor: true, bands }], anchorIndex: 0 } });
  assert.equal(c.params.steps.length, 1);
});

ok('absolute calibration needs a known reference and a positive factor', () => {
  assert.throws(() => CS.makeCalibration({ kind: 'absolute', params: { ref: 'brightness', factor: 1 } }), /unknown absolute reference/);
  assert.throws(() => CS.makeCalibration({ kind: 'absolute', params: { ref: 'luminance', factor: 0 } }), /positive/);
  const c = CS.makeCalibration({ kind: 'absolute', params: { ref: 'luminance', value: 100, factor: 0.8, window_nm: null } });
  assert.equal(c.params.value, 100);
});

ok('unknown calibration kind is refused', () => {
  assert.throws(() => CS.makeCalibration({ kind: 'magic', params: {} }), /unknown kind/);
});

ok('measurement snapshots the calibration: later changes do not alter it', () => {
  const cal = CS.makeCalibration({ kind: 'absolute', params: { ref: 'luminance', value: 100, factor: 0.8 } });
  const m = CS.makeMeasurement({
    name: 'LED A', type: 'light', raw: { pixels }, instrument: { serial: '715997', eepromHash: 'abc' },
    calibrations: [{ role: 'absolute', id: cal.id, snapshot: cal }]
  });
  cal.params.factor = 99;                       // the calibration object is changed afterwards
  assert.equal(m.calibrations[0].snapshot.params.factor, 0.8);
  assert.equal(m.calibrations[0].id, cal.id);
});

ok('measurement needs 128 pixels, an EEPROM hash and a valid type', () => {
  assert.throws(() => CS.makeMeasurement({ type: 'light', raw: { pixels: [1] }, instrument: { eepromHash: 'x' } }), /128/);
  assert.throws(() => CS.makeMeasurement({ type: 'light', raw: { pixels }, instrument: {} }), /eepromHash/);
  assert.throws(() => CS.makeMeasurement({ type: 'paint', raw: { pixels }, instrument: { eepromHash: 'x' } }), /light or pigment/);
});

ok('a snapshot-less calibration reference is refused', () => {
  assert.throws(() => CS.makeMeasurement({ type: 'pigment', raw: { pixels }, instrument: { eepromHash: 'x' },
    calibrations: [{ role: 'white', id: 'cal-1' }] }), /no snapshot/);
});


ok('backup v2 round trip keeps measurements and calibrations', () => {
  const cal = CS.makeCalibration({ kind: 'absolute', params: { ref: 'factor', factor: 2 } });
  const m = CS.makeMeasurement({ type: 'light', raw: { pixels }, instrument: { eepromHash: 'h' },
    calibrations: [{ role: 'absolute', id: cal.id, snapshot: cal }] });
  const text = CS.backupBuild({ sets: {}, leds: [], measurements: [m], calibrations: [cal] });
  const back = CS.backupParse(text);
  assert.equal(back.version, 2);
  assert.equal(back.measurements[0].id, m.id);
  assert.equal(back.calibrations[0].id, cal.id);
});

ok('backup version 1 (no measurements) still loads', () => {
  const v1 = JSON.stringify({ format: 'gel-chromaticity-map-library', version: 1, sets: { gel: [] }, leds: [] });
  const back = CS.backupParse(v1);
  assert.deepEqual(back.measurements, []);
  assert.deepEqual(back.calibrations, []);
});

ok('a foreign file and a future version are refused', () => {
  assert.throws(() => CS.backupParse('{}'), /not a backup/);
  assert.throws(() => CS.backupParse('nope'), /not valid JSON/);
  assert.throws(() => CS.backupParse(JSON.stringify({ format: 'gel-chromaticity-map-library', version: 3 })), /not supported/);
});

ok('the database version is 2 and creates the three stores', () => {
  assert.equal(CS.DB_VERSION, 2);
  assert.deepEqual(Object.values(CS.STORES).sort(), ['calibrations', 'leds', 'measurements']);
});

try {
  const h = await CS.eepromHash(new TextEncoder().encode('abc'));
  assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  console.log('PASS EEPROM hash is SHA-256 hex and stable');
} catch (e) { fail++; console.log('FAIL EEPROM hash  ' + e.message); }

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
