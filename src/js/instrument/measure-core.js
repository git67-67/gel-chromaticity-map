/* Measurement bridge (AGPL-3.0-or-later, see LICENSE): driver result -> spectrum on the 380-780 nm, 1 nm grid used by the
   colour maths -> derived numbers (CCT, Duv, CRI, TM-30) -> a stored measurement record with its calibration snapshot.
   Pure logic: the colour functions (quality) and the storage module (CalStore) are passed in or found on the global scope. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MeasureCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = 401, WL0 = 380;                       // the colour maths grid: 380..780 nm, 1 nm
  const MEAS_LO = 380, MEAS_HI = 730;             // the i1 Pro measures 380..730 nm in 10 nm bands

  /* driver result (36 bands at 380..730 nm) -> { wl:[401 nm], v:Float64Array(401) peak-normalised, coverage }
     Linear between bands; outside the measured range the end band is held and the range is recorded as extrapolated. */
  /* beyond: how 730-780 nm (not measured) is filled. 'hold' (default) keeps the last measured value; 'zero' sets 0;
     'fade' starts at the last measured value and falls smoothly (cosine) to 0 at 780 nm. */
  const BEYOND = ['hold', 'zero', 'fade'];
  function toSpectrum(result, opts) {
    const beyond = (opts && opts.beyond) || 'hold';
    const normalise = !(opts && opts.normalise === false);   // reflectance keeps its absolute values
    if (!BEYOND.includes(beyond)) throw new Error('unknown extrapolation mode ' + beyond);
    const wl36 = result.wl36, s36 = result.s36;
    if (!wl36 || !s36 || s36.length !== wl36.length) throw new Error('driver result has no bands');
    const v = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const nm = WL0 + i;
      if (nm <= wl36[0]) v[i] = s36[0];
      else if (nm >= wl36[wl36.length - 1]) {
        const last = s36[s36.length - 1];
        if (beyond === 'hold') v[i] = last;
        else if (beyond === 'zero') v[i] = 0;
        else { const t = (nm - MEAS_HI) / (WL0 + N - 1 - MEAS_HI); v[i] = last * 0.5 * (1 + Math.cos(Math.PI * t)); }
      }
      else {
        let j = 0; while (j < wl36.length - 2 && wl36[j + 1] < nm) j++;
        const f = (nm - wl36[j]) / (wl36[j + 1] - wl36[j]);
        v[i] = s36[j] * (1 - f) + s36[j + 1] * f;
      }
    }
    if (normalise) { let mx = 0; for (const x of v) if (x > mx) mx = x; if (mx > 0) for (let i = 0; i < N; i++) v[i] /= mx; }
    const extrapolated = (WL0 + N - 1) > MEAS_HI ? [MEAS_HI, WL0 + N - 1] : null;
    return { wl: Array.from({ length: N }, (_, i) => WL0 + i), v, measured: [MEAS_LO, MEAS_HI], extrapolated, beyond };
  }

  /* Colour numbers for a light. `quality` is the colour-science-validated quality(spd) from the colour map core.
     Returns plain numbers; metrics that cannot be computed are null. */
  function lightNumbers(spectrum, quality) {
    const q = quality(spectrum.v);
    const num = x => (x === undefined || x === null || !Number.isFinite(x) ? null : +x.toFixed(6));
    return {
      x: num(q.x), y: num(q.y), u: num(q.up), v: num(q.vp), cct: num(q.cct), duv: num(q.duv), ok: !!q.ok,
      Ra: q.cri ? num(q.cri.Ra) : null, R9: q.cri ? num(q.cri.R[8]) : null,
      Rf: q.tm30 ? num(q.tm30.Rf) : null, Rg: q.tm30 ? num(q.tm30.Rg) : null
    };
  }

  /* Build the stored record. `calibrations`: [{role, id, snapshot}] for the calibrations that were applied, taken from the
     calibration store. `device`: {serial, firmware, eepromHash, eepromSource}. `spectrum` is kept at 1 nm with its coverage. */
  function buildRecord({ result, spectrum, derived, device, calibrations, name, comment, type, CalStore }) {
    const pixels = Array.from(result.avgAbs || []);
    return CalStore.makeMeasurement({
      name, comment, type,
      raw: { pixels, bands: Array.from(result.s36raw || result.s36), wl36: result.wl36 },
      settings: {
        mode: result.kind === 'reflective' ? 'rf' : 'em', exposure: result.exposureMode, integrationS: result.inttime,
        frames: result.nFrames, reusedExposure: !!result.reusedExposure, targetCounts: result.targetCounts,
        peakCounts: result.peakCounts, inconsistent: !!result.inconsistent
      },
      instrument: device,
      spectrum: { wl: spectrum.wl, v: Array.from(spectrum.v), measured: spectrum.measured, extrapolated: spectrum.extrapolated, beyond: spectrum.beyond },
      derived,
      calibrations: calibrations || []
    });
  }

  /* Which calibrations were actually applied to this result, so the record can name them. `white`: {id, snapshot} of the
     white-tile calibration used for a reflective measurement. */
  function appliedRoles(result, calStore, white) {
    const out = [];
    if (result.kind === 'reflective' && white && white.snapshot) out.push({ role: 'white', id: white.id, snapshot: white.snapshot });
    if (result.corrApplied && calStore.source) out.push({ role: 'source', id: calStore.source.id, snapshot: calStore.source });
    if (result.absApplied && calStore.absolute) out.push({ role: 'absolute', id: calStore.absolute.id, snapshot: calStore.absolute });
    return out;
  }

  /* One-line text for the tab: what the numbers are based on. */
  function coverageNote(spectrum) {
    if (!spectrum.extrapolated) return 'Measured 380–730 nm.';
    const how = { hold: 'held at the last value', zero: 'set to zero', fade: 'faded smoothly to zero' }[spectrum.beyond || 'hold'];
    return 'Measured 380–730 nm; 730–780 nm ' + how + ' (not measured), so CRI and TM-30 are approximate for deep red.';
  }

  return { N, BEYOND, toSpectrum, lightNumbers, buildRecord, appliedRoles, coverageNote };
});
