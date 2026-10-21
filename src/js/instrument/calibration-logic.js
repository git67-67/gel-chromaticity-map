/* Calibration builders for the instrument tab (AGPL-3.0-or-later, see LICENSE).
   Each builder takes measured data and returns a calibration object from calibration-store.js. Nothing here touches USB;
   the caller applies the result with device.setCorrection(...) or device.setAbsCal(...). Pure logic.
   Works in the browser (window.CalLogic) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./i1pro-core.js'), require('./calibration-store.js'));
  else root.CalLogic = factory(root.I1Pro, root.CalStore);
})(typeof self !== 'undefined' ? self : this, function (I1Pro, CalStore) {
  'use strict';

  /* 1. One known blackbody temperature (e.g. a reference lamp with a stated colour temperature).
     measured36: the 36 band values the instrument read from that lamp (uncorrected, ArgyllCMS bands 380-730 nm). */
  function blackbody1({ measured36, T, name }) {
    if (!(T > 0)) throw new Error('blackbody temperature must be positive');
    const ref36 = I1Pro.referenceBands('blackbody', T);
    const r = I1Pro.computeCorrection(Array.from(measured36), ref36);
    return CalStore.makeCalibration({
      kind: 'blackbody1', name: name || ('Blackbody ' + Math.round(T) + ' K'),
      params: { T, correction: Array.from(r.c), usable: r.usable, lo: r.lo, hi: r.hi },
      inputs: { measured: Array.from(measured36) }
    });
  }

  /* 2. Several blackbody sources at different temperatures. The true temperatures are fitted from the spectra.
     items: [{ estimateK, bands36 }], at least two. anchorIndex (optional): the item whose true temperature is known,
     and anchorK: that known temperature. Without an anchor the scale is fixed by the grey-body fit only. */
  function blackbodySet({ items, anchorIndex, anchorK, name }) {
    if (!Array.isArray(items) || items.length < 2) throw new Error('at least two blackbody measurements are needed');
    const hasAnchor = Number.isInteger(anchorIndex) && anchorIndex >= 0 && anchorIndex < items.length && anchorK > 0;
    const fit = I1Pro.fitBlackbodyTemperatures(
      items.map(it => ({ v: Array.from(it.bands36), T0: it.estimateK > 0 ? it.estimateK : 0 })),
      Object.assign({ lo: 430, hi: 710 }, hasAnchor ? { anchorIndex, anchorT: anchorK } : {})
    );
    const steps = items.map((it, i) => ({
      estimateK: it.estimateK || null, fittedK: Math.round(fit.T[i]), anchor: hasAnchor && i === anchorIndex,
      bands: Array.from(it.bands36)
    }));
    return CalStore.makeCalibration({
      kind: 'blackbodySet', name: name || ('Blackbody set (' + items.length + ' sources)'),
      params: { steps, anchorIndex: hasAnchor ? anchorIndex : null, correction: Array.from(fit.corr),
        resid: fit.resid, gauge: fit.gauge, usable: fit.usable, lo: fit.lo, hi: fit.hi },
      inputs: { anchorK: hasAnchor ? anchorK : null }
    });
  }

  /* 3. Absolute level. ref: 'luminance' (cd/m2), 'irradiance' (mW/m2), 'laser' (mW, with a beam area) or 'factor' (direct).
     measured and target are in the same unit; factor = target / measured. */
  function absolute({ ref, measured, target, unit, windowNm, beamArea_mm2, name }) {
    if (!CalStore.ABS_REFS.includes(ref)) throw new Error('unknown absolute reference ' + ref);
    const factor = I1Pro.absoluteFactor(measured, target);
    return CalStore.makeCalibration({
      kind: 'absolute', name: name || ('Absolute ' + ref),
      params: { ref, value: target, unit: unit || null, factor, window_nm: windowNm || null,
        beamArea_mm2: beamArea_mm2 || null },
      inputs: { measured }
    });
  }

  /* One line for the "Calibration in use" box. */
  function describe(cal) {
    if (!cal) return 'none';
    const p = cal.params;
    if (cal.kind === 'blackbody1') return 'Blackbody ' + Math.round(p.T) + ' K (' + cal.name + ')';
    if (cal.kind === 'blackbodySet') {
      const ks = p.steps.map(s => s.fittedK).join(', ');
      return 'Blackbody set, fitted ' + ks + ' K' + (p.anchorIndex === null ? ' (no anchor)' : '');
    }
    if (cal.kind === 'absolute') return 'Absolute ' + p.ref + ': target ' + p.value + (p.unit ? ' ' + p.unit : '') + ', factor ' + (+p.factor.toPrecision(5));
    return cal.kind;
  }

  return { blackbody1, blackbodySet, absolute, describe };
});
