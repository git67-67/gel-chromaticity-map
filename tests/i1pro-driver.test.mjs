// End-to-end driver test against the simulator (no hardware):  node tests/i1pro-driver.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_EEPROM } from '../src/js/instrument/i1pro-demo-eeprom.mjs';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/js/instrument');
const I1Pro = require(path.join(root, 'i1pro-core.js'));
const Sim = require(path.join(root, 'i1pro-sim.js'));
globalThis.performance ??= { now: () => Date.now() };

let fail = 0;
const ok = async (name, fn) => {
  try { await fn(); console.log('PASS ' + name); }
  catch (e) { fail++; console.log('FAIL ' + name + '  ' + e.message); }
};

const sim = new Sim.SimTransport({ eepromB64: DEMO_EEPROM, level: 20000, speed: 0 });
const dev = new I1Pro.I1ProDevice(sim, { log: () => {} });
let info;

await ok('init reads the instrument identity from the EEPROM', async () => {
  info = await dev.init();
  assert.ok(String(info.serial).length > 0, 'no serial');
});

await ok('dark calibration completes', async () => {
  sim.covered = true;            // sensor capped for the dark reading
  await dev.calibrateDark({ readTime: 0.2, longTime: 0.5 });
  sim.covered = false;           // uncapped for measurements
  assert.ok(dev.dark, 'dark model missing');
});

await ok('an emission measurement gives 36 bands and 36 wavelengths', async () => {
  const r = await dev.measure({ readTime: 0.2 });
  assert.equal(r.kind, 'emission');
  assert.equal(r.s36.length, 36);
  assert.equal(r.wl36.length, 36);
  assert.equal(r.wl36[0], 380);
  assert.equal(r.wl36[35], 730);
  assert.ok(r.s36.every(Number.isFinite), 'non-finite band');
});

await ok('the simulated light peaks in the blue-green region it was given', async () => {
  const r = await dev.measure({ readTime: 0.2 });
  let b = 0;
  for (let i = 1; i < 36; i++) if (r.s36[i] > r.s36[b]) b = i;
  // the simulator's spectrum peaks near 450 nm and has a broad second hump near 560 nm
  assert.ok(r.wl36[b] >= 440 && r.wl36[b] <= 470, 'peak at ' + r.wl36[b] + ' nm');
});

await ok('the device exposes its identity for the calibration record', async () => {
  const d = dev.describe();
  assert.equal(String(d.serial), String(info.serial));
});

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
