// Calibration builders against known synthetic answers:  node tests/calibration-logic.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/js/instrument');
const I1Pro = require(path.join(dir, 'i1pro-core.js'));
const CS = require(path.join(dir, 'calibration-store.js'));
const CL = require(path.join(dir, 'calibration-logic.js'));

let fail = 0;
const ok = (name, fn) => { try { fn(); console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '  ' + e.message); } };
const WL = I1Pro.WL36;
const bb = T => I1Pro.referenceBands('blackbody', T);

ok('blackbody1: a lamp that reads exactly as the reference gives a flat correction', () => {
  const cal = CL.blackbody1({ measured36: bb(2856), T: 2856 });
  assert.equal(cal.kind, 'blackbody1');
  assert.equal(cal.params.correction.length, 36);
  for (const c of cal.params.correction) assert.ok(Math.abs(c - 1) < 1e-6, 'factor ' + c);
});

ok('blackbody1: a lamp that reads 20% high in the blue gets factors below 1 there', () => {
  const meas = bb(2856).map((v, b) => v * (WL[b] < 500 ? 1.2 : 1));
  const cal = CL.blackbody1({ measured36: meas, T: 2856 });
  const blue = cal.params.correction[WL.indexOf(450)], green = cal.params.correction[WL.indexOf(550)];
  assert.ok(blue < green, 'blue ' + blue + ' green ' + green);
  assert.ok(Math.abs(blue / green - 1 / 1.2) < 0.02, 'ratio ' + blue / green);
});

ok('blackbody1: non-positive temperature is refused', () => {
  assert.throws(() => CL.blackbody1({ measured36: bb(2856), T: 0 }), /positive/);
});

ok('blackbodySet: fitted temperatures recover the true ones within 3%', () => {
  const truth = [2700, 4000, 6500];
  const items = truth.map((T, i) => ({ estimateK: T * 1.05, bands36: bb(T).map(v => v * (1 + 0.1 * Math.sin(i))) }));
  const set = CL.blackbodySet({ items, anchorIndex: 0, anchorK: 2700 });
  assert.equal(set.kind, 'blackbodySet');
  assert.equal(set.params.steps[0].anchor, true);
  assert.equal(set.params.steps[0].fittedK, 2700);
  set.params.steps.forEach((s, i) => assert.ok(Math.abs(s.fittedK / truth[i] - 1) < 0.03, 'step ' + i + ' fitted ' + s.fittedK));
  assert.equal(set.params.correction.length, 36);
});

ok('blackbodySet: fewer than two sources is refused', () => {
  assert.throws(() => CL.blackbodySet({ items: [{ estimateK: 3000, bands36: bb(3000) }] }), /at least two/);
});

ok('absolute: factor = target / measured, and it is stored with its reference', () => {
  const cal = CL.absolute({ ref: 'luminance', measured: 80, target: 100, unit: 'cd/m2' });
  assert.equal(cal.kind, 'absolute');
  assert.ok(Math.abs(cal.params.factor - 1.25) < 1e-12);
  assert.equal(cal.params.value, 100);
  assert.equal(cal.params.unit, 'cd/m2');
});

ok('absolute: an unknown reference or zero measured value is refused', () => {
  assert.throws(() => CL.absolute({ ref: 'brightness', measured: 1, target: 1 }), /unknown absolute reference/);
  assert.throws(() => CL.absolute({ ref: 'irradiance', measured: 0, target: 5 }), /positive/);
});

ok('describe gives a short line for each kind and for none', () => {
  assert.equal(CL.describe(null), 'none');
  assert.match(CL.describe(CL.blackbody1({ measured36: bb(2856), T: 2856 })), /2856 K/);
  assert.match(CL.describe(CL.absolute({ ref: 'luminance', measured: 80, target: 100, unit: 'cd/m2' })), /factor 1\.25/);
});

ok('calibrations pass the store validator and can be snapshotted into a record', () => {
  const cal = CL.absolute({ ref: 'factor', measured: 1, target: 2 });
  assert.deepEqual(CS.validateCalibration(cal), []);
});

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
