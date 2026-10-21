// Reflective (pigment) path against the simulator:  node tests/reflective.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_EEPROM } from '../src/js/instrument/i1pro-demo-eeprom.mjs';

const require = createRequire(import.meta.url);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/js/instrument');
const I1Pro = require(path.join(dir, 'i1pro-core.js'));
const Sim = require(path.join(dir, 'i1pro-sim.js'));
globalThis.performance ??= { now: () => Date.now() };

let fail = 0;
const ok = async (name, fn) => { try { await fn(); console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '  ' + e.message); } };
const quiet = { log: () => {} };

const sim = new Sim.SimTransport({ eepromB64: DEMO_EEPROM, level: 20000, speed: 0 });
const dev = new I1Pro.I1ProDevice(sim, quiet);
await dev.init();
sim.covered = true; await dev.calibrateDark({ readTime: 0.2, longTime: 0.5 }); sim.covered = false;

await ok('measureReflective refuses to run before the white tile calibration', async () => {
  await assert.rejects(() => dev.measureReflective({ readTime: 0.2 }), /white tile/i);
});

await ok('white tile calibration runs and stores its reference', async () => {
  sim.mode = 'reflective';
  await dev.calibrateWhite({ progress: () => {} });
  assert.ok(dev.refl, 'refl not set');
  const ref = dev.whiteRef36();
  assert.equal(ref.length, 36);
  assert.ok(ref.every(x => x > 0 && x < 2), 'white reference out of range: ' + ref.slice(0, 3));
});

await ok('a pigment measurement returns 36 reflectance values, finite and non-negative', async () => {
  const r = await dev.measureReflective({ readTime: 0.2 });
  assert.equal(r.kind, 'reflective');
  assert.equal(r.s36.length, 36);
  assert.ok(r.s36.every(x => Number.isFinite(x) && x >= 0), 'bad reflectance values');
});

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
