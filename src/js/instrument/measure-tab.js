/* AGPL-3.0-or-later, see LICENSE. */
/* Measure tab: connect the i1 Pro, measure a light, show its numbers, save it with its calibration, add it to the LED library.
   Needs the colour map globals: quality(), LED, ledMake(), ledPut(), ledChanged(), showTab(). Browser only. */
(function () {
  'use strict';
  const g = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = window.I1Pro, CS = window.CalStore, MC = window.MeasureCore, CL = window.CalLogic;
  let dev = null, sim = null, last = null, db = null, saved = [], calSource = null, calAbs = null, bbsItems = [];

  function status(t, c) { const s = g('ms-status'); s.textContent = t; s.className = 'status ' + (c || ''); }
  function explain(e) { const m = (e && e.message) || String(e); return m; }
  const f2 = v => (v == null ? '—' : v.toFixed(2)), f0 = v => (v == null ? '—' : Math.round(v)), f4 = v => (v == null ? '—' : v.toFixed(4));

  function refresh() {
    const c = !!dev, dark = !!(dev && dev.dark), pig = g('ms-type').value === 'pigment', white = !!(dev && dev.refl);
    g('ms-connect').disabled = c; g('ms-demo').disabled = c; g('ms-disc').disabled = !c;
    g('ms-dark').disabled = !c; g('ms-white').disabled = !c || !dark;
    g('ms-meas').disabled = !(dark && (!pig || white));
    g('ms-whiterow').hidden = !pig; g('ms-whitehint').hidden = !pig;
    g('ms-whitechip').textContent = white ? 'done' : 'not done'; g('ms-whitechip').className = 'chip' + (white ? ' ok' : '');
    g('ms-save').disabled = !last; g('ms-tolib').disabled = !last || last.type !== 'light';
    g('ms-darkchip').textContent = dark ? 'done' : 'not done'; g('ms-darkchip').className = 'chip' + (dark ? ' ok' : '');
    g('ms-cal').innerHTML = `<div class="kv"><span>Source</span><b>${calSource ? esc(CL.describe(calSource)) : 'none'}</b></div><div class="kv"><span>Absolute</span><b>${calAbs ? esc(CL.describe(calAbs)) : 'none'}</b></div>`;
  }

  async function openDb() { if (!db) db = await CS.openDB(); return db; }
  async function loadSaved() {
    try { await openDb(); saved = await CS.getAllRecords(db, CS.STORES.measurements); } catch (e) { saved = []; }
    renderList();
  }

  async function attach(t, isDemo) {
    try {
      status('Connecting…');
      dev = new I.I1ProDevice(t); dev.autoRecover = true;
      const info = await dev.init();
      g('ms-who').textContent = 'S/N ' + info.serial + ' · firmware ' + info.firmware + (isDemo ? ' · DEMO' : '');
      status('Ready. Cover the sensor and press “Dark calibration”.', 'ok');
    } catch (e) { dev = null; status(explain(e), 'err'); }
    refresh();
  }
  g('ms-connect').onclick = async () => { try { sim = null; await attach(await I.WebUSBTransport.request(), false); } catch (e) { status(explain(e), 'err'); } };
  g('ms-demo').onclick = async () => {
    sim = new I1ProSim.SimTransport({ eepromB64: window.I1P_DEMO_EEPROM, level: 20000, speed: 0.15 }); await attach(sim, true);
  };
  g('ms-disc').onclick = async () => { try { await dev.close(); } catch (e) { } dev = null; sim = null; g('ms-who').textContent = ''; status('Disconnected.'); refresh(); };

  g('ms-dark').onclick = async () => {
    try {
      status('Dark calibration… keep the sensor covered.');
      if (sim) sim.covered = true;
      await dev.calibrateDark({ readTime: 1.0, longTime: 4.0 });
      if (sim) sim.covered = false;
      status('Dark calibration done.', 'ok');
    } catch (e) { if (sim) sim.covered = false; status(explain(e), 'err'); }
    refresh();
  };

  function whiteSnapshot() {
    const r = dev.refl;
    return { id: 'white-' + String(dev.describe().serial) + '-' + String(r.date).slice(0, 19),
      snapshot: { whiteRef36: dev.whiteRef36(), t: r.t, whiteAbs: r.whiteAbs ? Array.from(r.whiteAbs) : null,
        date: String(r.date), peakCounts: r.peakCounts, inconsistent: !!r.inconsistent } };
  }

  async function measure() {
    try {
      const type = g('ms-type').value;
      status(type === 'pigment' ? 'Measuring the sample…' : 'Measuring…');
      const beyond = g('ms-beyond').value;
      let result, spectrum, numbers = null, calWhite = null;
      if (type === 'pigment') {
        if (sim) sim.mode = 'reflective';
        result = await dev.measureReflective({ readTime: 1.0, progress: m => status(m) });
        spectrum = MC.toSpectrum(result, { beyond, normalise: false });
        calWhite = whiteSnapshot();
      } else {
        if (sim) sim.mode = 'emission';
        result = await dev.measure({ readTime: 1.0 });
        spectrum = MC.toSpectrum(result, { beyond });
        numbers = MC.lightNumbers(spectrum, quality);
      }
      const hash = await CS.eepromHash(dev.eeprom);
      last = { type, result, spectrum, numbers, hash, serial: String(dev.describe().serial), calWhite };
      renderResult();
      status(MC.coverageNote(spectrum), 'ok');
    } catch (e) { status(explain(e), 'err'); }
    refresh();
  }
  g('ms-meas').onclick = measure;
  g('ms-type').onchange = refresh;

  g('ms-white').onclick = async () => {
    try {
      status('White tile calibration… place the white tile in the measuring head.');
      if (sim) sim.mode = 'reflective';
      await dev.calibrateWhite({ progress: m => status(m) });
      status('White tile calibration done.', 'ok');
    } catch (e) { status(explain(e), 'err'); }
    refresh();
  };

  const pct = v => (100 * v).toFixed(1) + ' %';
  function renderResult() {
    const r = last.result;
    const items = last.type === 'pigment'
      ? [['450 nm', pct(last.spectrum.v[70])], ['550 nm', pct(last.spectrum.v[170])], ['650 nm', pct(last.spectrum.v[270])], ['Frames', r.nFrames]]
      : [['CCT', last.numbers.cct == null ? '—' : Math.round(last.numbers.cct) + ' K'], ['Duv', f4(last.numbers.duv)], ['x', f4(last.numbers.x)], ['y', f4(last.numbers.y)],
         ['CRI Ra', f0(last.numbers.Ra)], ['R9', f0(last.numbers.R9)], ['TM-30 Rf', f0(last.numbers.Rf)], ['TM-30 Rg', f0(last.numbers.Rg)],
         ['Exposure', (r.inttime * 1000).toFixed(0) + ' ms'], ['Frames', r.nFrames]];
    const note = last.type === 'pigment'
      ? 'Reflectance relative to the white tile. Colour numbers are shown for lights only.'
      : (last.numbers.ok ? '' : ' No CCT: CRI and TM-30 are not defined for this light.');
    g('ms-result').innerHTML = `<h2>Last measurement (${last.type === 'pigment' ? 'pigment' : 'light'})</h2>
      <div class="kvs">${items.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <p class="note">${esc(MC.coverageNote(last.spectrum))}${esc(note)}</p>
      <p class="note">Calibration: source ${r.corrApplied ? 'applied' : 'none'}, absolute ${r.absApplied ? 'applied' : 'none'}${last.calWhite ? ', white tile ' + esc(last.calWhite.snapshot.date.slice(0, 16)) : ''}.</p>`;
  }

  g('ms-save').onclick = async () => {
    try {
      await openDb();
      const rec = MC.buildRecord({ result: last.result, spectrum: last.spectrum, derived: last.numbers, type: last.type,
        name: g('ms-name').value.trim() || ('Light ' + new Date().toLocaleString()), comment: g('ms-comment').value,
        device: { serial: last.serial, eepromHash: last.hash, eepromSource: sim ? 'demo' : 'device' },
        calibrations: MC.appliedRoles(last.result, { source: calSource, absolute: calAbs }, last.calWhite), CalStore: CS });
      await CS.putRecord(db, CS.STORES.measurements, rec);
      saved.unshift(rec); renderList(); status('Saved “' + rec.name + '”.', 'ok');
    } catch (e) { status(explain(e), 'err'); }
  };

  g('ms-tolib').onclick = () => {
    if (!last) return;
    const id = 'usr:meas-' + Date.now().toString(36), name = g('ms-name').value.trim() || 'Measured light';
    ledPut(ledMake(id, name, 'Imported', 'usr', last.spectrum.wl, Array.from(last.spectrum.v), { device: 'i1 Pro', notes: g('ms-comment').value }, []));
    ledChanged(); status('Added “' + name + '” to the LED library.', 'ok');
  };

  /* ---- calibration section ---- */
  async function keepCal(cal) {
    await openDb();
    await CS.putRecord(db, CS.STORES.calibrations, cal);
    return cal;
  }
  function needLight() {
    if (!last || last.type !== 'light') throw new Error('Measure the lamp first (type: Light).');
    return last.result.s36raw || last.result.s36;
  }

  g('ms-bb1').onclick = async () => {
    try {
      const cal = await keepCal(CL.blackbody1({ measured36: needLight(), T: +g('ms-bb1-T').value }));
      calSource = cal; dev.setCorrection(cal.params.correction, true, { id: cal.id });
      status('Applied: ' + CL.describe(cal) + '.', 'ok');
    } catch (e) { status(explain(e), 'err'); }
    refresh();
  };

  function renderBbs() {
    g('ms-bbs-list').textContent = bbsItems.length ? bbsItems.map((it, i) => (i + 1) + ': ' + it.estimateK + ' K').join(' · ') : 'No lamps added yet.';
    const sel = g('ms-bbs-anchor'), keep = sel.value;
    sel.innerHTML = '<option value="">none (fit without anchor)</option>' +
      bbsItems.map((it, i) => `<option value="${i}">${i + 1}: ${it.estimateK} K</option>`).join('');
    sel.value = keep;
  }
  g('ms-bbs-add').onclick = () => {
    try {
      bbsItems.push({ estimateK: +g('ms-bbs-est').value, bands36: Array.from(needLight()) });
      renderBbs(); status('Added lamp ' + bbsItems.length + '.', 'ok');
    } catch (e) { status(explain(e), 'err'); }
  };
  g('ms-bbs-reset').onclick = () => { bbsItems = []; renderBbs(); };
  g('ms-bbs-fit').onclick = async () => {
    try {
      const a = g('ms-bbs-anchor').value;
      const cal = await keepCal(CL.blackbodySet({ items: bbsItems, anchorIndex: a === '' ? undefined : +a, anchorK: +g('ms-bbs-anchorK').value }));
      calSource = cal; dev.setCorrection(cal.params.correction, true, { id: cal.id });
      status('Applied: ' + CL.describe(cal) + '.', 'ok');
    } catch (e) { status(explain(e), 'err'); }
    refresh();
  };

  g('ms-abs-apply').onclick = async () => {
    try {
      const ref = g('ms-abs-ref').value;
      const cal = await keepCal(CL.absolute({ ref, measured: ref === 'factor' ? 1 : +g('ms-abs-meas').value,
        target: +g('ms-abs-target').value, unit: { luminance: 'cd/m2', irradiance: 'mW/m2', laser: 'mW', factor: null }[ref] }));
      calAbs = cal; dev.setAbsCal(cal.params.factor, true, { id: cal.id });
      status('Applied: ' + CL.describe(cal) + '.', 'ok');
    } catch (e) { status(explain(e), 'err'); }
    refresh();
  };

  g('ms-cal-clear').onclick = () => {
    if (dev) { dev.setCorrection(null); dev.setAbsCal(0); }
    calSource = null; calAbs = null; status('Calibration cleared.');
    refresh();
  };

  function renderList() {
    g('ms-count').textContent = '(' + saved.length + ')';
    g('ms-list').innerHTML = saved.length ? saved.map(m => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:4px 0">
      <span><b>${esc(m.name)}</b> <span class="note">${new Date(m.created).toLocaleString()}${m.comment ? ' · ' + esc(m.comment) : ''}</span>
      <span class="note">CCT ${m.derived && m.derived.cct ? Math.round(m.derived.cct) + ' K' : '—'} · Ra ${m.derived && m.derived.Ra != null ? Math.round(m.derived.Ra) : '—'} · Rf ${m.derived && m.derived.Rf != null ? Math.round(m.derived.Rf) : '—'}</span></span>
      <span class="row"><button class="btn sm" data-del="${esc(m.id)}">Delete</button></span></div>`).join('') : '<div class="empty">No saved measurements yet.</div>';
  }
  g('ms-list').addEventListener('click', async e => {
    const id = e.target.dataset.del; if (!id) return;
    await CS.deleteRecord(db, CS.STORES.measurements, id); saved = saved.filter(x => x.id !== id); renderList();
  });

  /* show the tab's data when it opens */
  window.measShow = () => { refresh(); loadSaved(); };
  refresh();
})();
