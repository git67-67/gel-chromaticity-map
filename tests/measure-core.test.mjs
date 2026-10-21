// Measurement bridge tests, with the simulated i1 Pro:  node tests/measure-core.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_EEPROM } from '../src/js/instrument/i1pro-demo-eeprom.mjs';

const require = createRequire(import.meta.url);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/js/instrument');
const I1Pro = require(path.join(dir, 'i1pro-core.js'));
const Sim = require(path.join(dir, 'i1pro-sim.js'));
const M = require(path.join(dir, 'measure-core.js'));
const CS = require(path.join(dir, 'calibration-store.js'));
globalThis.performance ??= { now: () => Date.now() };

let fail = 0;
const ok = async (name, fn) => {
  try { await fn(); console.log('PASS ' + name); }
  catch (e) { fail++; console.log('FAIL ' + name + '  ' + e.message); }
};

const sim = new Sim.SimTransport({ eepromB64: DEMO_EEPROM, level: 20000, speed: 0 });
const dev = new I1Pro.I1ProDevice(sim, { log: () => {} });
await dev.init();
sim.covered = true; await dev.calibrateDark({ readTime: 0.2, longTime: 0.5 }); sim.covered = false;
const result = await dev.measure({ readTime: 0.2 });

await ok('the spectrum runs 380-780 nm on a 1 nm grid, peak 1', () => {
  const s = M.toSpectrum(result);
  assert.equal(s.wl.length, M.N);
  assert.equal(s.wl[0], 380); assert.equal(s.wl[400], 780);
  assert.ok(Math.abs(Math.max(...s.v) - 1) < 1e-12);
});

await ok('the spectrum matches the measured bands at their own wavelengths', () => {
  const s = M.toSpectrum(result);
  const mx = Math.max(...result.s36);
  const i = 450 - 380;                       // 450 nm is a band centre
  const b = result.wl36.indexOf(450);
  assert.ok(Math.abs(s.v[i] - result.s36[b] / mx) < 1e-9);
});

await ok('730-780 nm is marked as extrapolated, 380-730 as measured', () => {
  const s = M.toSpectrum(result);
  assert.deepEqual(s.measured, [380, 730]);
  assert.deepEqual(s.extrapolated, [730, 780]);
  assert.match(M.coverageNote(s), /not measured/);
});

await ok('extrapolation: hold (default), zero and fade differ only above 730 nm', () => {
  const h = M.toSpectrum(result), z = M.toSpectrum(result, { beyond: 'zero' }), f = M.toSpectrum(result, { beyond: 'fade' });
  const i = 500 - 380, j = 730 - 380;
  assert.equal(h.v[i], z.v[i]); assert.equal(h.v[i], f.v[i]);
  assert.equal(h.v[j], f.v[j]);
  assert.equal(z.v[j + 10], 0);
  assert.ok(Math.abs(h.v[400] - h.v[j]) < 1e-12);
  assert.ok(f.v[400] === 0 || Math.abs(f.v[400]) < 1e-12);
  for (let k = j + 1; k < 400; k++) assert.ok(f.v[k] <= f.v[k - 1] + 1e-12, 'fade must not rise');
  assert.equal(h.beyond, 'hold'); assert.equal(f.beyond, 'fade');
});

await ok('an unknown extrapolation mode is refused', () => {
  assert.throws(() => M.toSpectrum(result, { beyond: 'magic' }), /unknown extrapolation/);
});

await ok('the coverage note names the chosen extrapolation', () => {
  assert.match(M.coverageNote(M.toSpectrum(result, { beyond: 'fade' })), /faded smoothly/);
  assert.match(M.coverageNote(M.toSpectrum(result, { beyond: 'zero' })), /set to zero/);
});

await ok('reflectance is not peak-normalised when normalise is false', () => {
  const refl = { wl36: result.wl36, s36: result.s36.map(x => x * 0 + 0.5) };
  const s = M.toSpectrum(refl, { normalise: false });
  assert.ok(Math.abs(s.v[100] - 0.5) < 1e-12);
  assert.ok(Math.abs(Math.max(...M.toSpectrum(refl).v) - 1) < 1e-12);
});

await ok('a reflective record names the white-tile calibration it used', () => {
  const white = { id: 'white-715997-1', snapshot: { whiteRef36: [0.9], t: 0.02 } };
  const roles = M.appliedRoles({ kind: 'reflective', corrApplied: false, absApplied: false }, {}, white);
  assert.equal(roles.length, 1); assert.equal(roles[0].role, 'white'); assert.equal(roles[0].snapshot.t, 0.02);
  assert.deepEqual(M.appliedRoles({ kind: 'emission' }, {}, white), []);
});

await ok('lightNumbers passes the spectrum to the colour maths and returns plain numbers', () => {
  const s = M.toSpectrum(result);
  let seen = null;
  const fake = spd => { seen = spd; return { x: 0.3, y: 0.33, up: 0.2, vp: 0.46, cct: 4000, duv: 0.001, ok: true,
    cri: { Ra: 90.123456789, R: Array.from({ length: 14 }, () => 88) }, tm30: { Rf: 85, Rg: 102 } }; };
  const n = M.lightNumbers(s, fake);
  assert.equal(seen.length, 401);
  assert.equal(n.cct, 4000);
  assert.equal(n.Ra, 90.123457);
  assert.equal(n.R9, 88);
});

await ok('a light without a CCT gives null for CRI and TM-30, not NaN', () => {
  const s = M.toSpectrum(result);
  const n = M.lightNumbers(s, () => ({ x: 0.3, y: 0.3, up: 0.2, vp: 0.4, cct: null, duv: null, ok: false }));
  assert.equal(n.Ra, null); assert.equal(n.Rf, null); assert.equal(n.cct, null);
});

await ok('a record stores the raw pixels, settings, the EEPROM hash and the applied calibration snapshot', async () => {
  const s = M.toSpectrum(result);
  const hash = await CS.eepromHash(dev.eeprom);
  const abs = CS.makeCalibration({ kind: 'absolute', name: 'test', params: { ref: 'factor', factor: 1.5 } });
  const calibrations = M.appliedRoles({ corrApplied: false, absApplied: true }, { absolute: abs });
  const rec = M.buildRecord({ result, spectrum: s, derived: { cct: 4000 }, type: 'light', name: 'LED A', comment: 'bench',
    device: { serial: String(dev.describe().serial), eepromHash: hash, eepromSource: 'demo' }, calibrations, CalStore: CS });
  assert.equal(rec.raw.pixels.length, 128);
  assert.equal(rec.instrument.eepromHash, hash);
  assert.equal(rec.calibrations[0].role, 'absolute');
  assert.equal(rec.calibrations[0].snapshot.params.factor, 1.5);
  assert.equal(rec.spectrum.v.length, 401);
  assert.equal(rec.settings.mode, 'em');
  // the record survives the backup round trip
  const back = CS.backupParse(CS.backupBuild({ sets: {}, leds: [], measurements: [rec], calibrations: [abs] }));
  assert.equal(back.measurements[0].name, 'LED A');
});

await ok('no calibration applied gives an empty calibration list', () => {
  assert.deepEqual(M.appliedRoles({ corrApplied: false, absApplied: false }, {}), []);
});

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
