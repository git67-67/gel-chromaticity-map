// Pure-maths checks of the core modules (no browser needed):  node tests/maths.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['core/grid-cmf.js','core/spectra.js','core/locus.js','core/display.js','core/example-sources.js','core/evaluate.js','lab/cat.js'];
const src = files.map(f => fs.readFileSync(path.join(root,'src/js',f),'utf8')).join('\n') +
  '\n;({sums,chroma,planckSPD,cctDuv,from5,D65_5,N,CATS,catGains,catApply,m3v,inv3,buildPcWhite,buildRgbLed,resample})';
const m = vm.runInContext(src, vm.createContext({console, Math, Float64Array}));
let fail = 0;
const ok = (name, cond, info='') => { console.log((cond?'PASS ':'FAIL ')+name+(info?'  '+info:'')); if(!cond) fail++; };
const near = (a,b,t) => Math.abs(a-b) <= t;

const ee = new Float64Array(m.N).fill(1), c = (S,T)=>{const s=m.sums(S,T);return m.chroma(s[0],s[1],s[2]);};
let q = c(ee); ok('equal energy is near (1/3,1/3)', near(q.x,1/3,2e-4)&&near(q.y,1/3,2e-4), `x=${q.x.toFixed(4)} y=${q.y.toFixed(4)}`);
q = c(m.from5(m.D65_5)); ok('D65 is near (0.3127,0.3290)', near(q.x,0.3127,6e-4)&&near(q.y,0.3290,6e-4), `x=${q.x.toFixed(4)} y=${q.y.toFixed(4)}`);
for (const T of [2700,4000,6500,10000]) { const p=c(m.planckSPD(T)), r=m.cctDuv(p.u,p.v);
  ok(`blackbody ${T} K gives CCT ${T}±1% and |Duv|<2e-4`, r.cct&&near(r.cct,T,T*0.01)&&Math.abs(r.duv)<2e-4, `cct=${r.cct&&r.cct.toFixed(0)} duv=${r.duv.toFixed(5)}`); }
const w = m.buildPcWhite(); q = c(w); const r = m.cctDuv(q.u,q.v); ok('example white LED is a cool white (4000-6500 K)', r.cct>4000&&r.cct<6500, `cct=${r.cct&&r.cct.toFixed(0)}`);
q = c(m.buildRgbLed()); ok('example RGB LED is close to D65 white', near(q.x,0.3127,2e-3)&&near(q.y,0.3290,2e-3), `x=${q.x.toFixed(4)} y=${q.y.toFixed(4)}`);
const half = new Float64Array(m.N).fill(0.5); const a = m.sums(ee), b = m.sums(ee,half);
ok('a neutral 50% filter halves Y and keeps the chromaticity', near(b[1]/a[1],0.5,1e-9)&&near(c(ee,half).x,c(ee).x,1e-9));
const rs = m.resample([400,500],[0,1],'hold'); ok('resample interpolates and holds the ends', near(rs[40],0.2,1e-9)&&rs[0]===0&&rs[400]===1);
const rz = m.resample([400,500],[0.3,1],'zero'); ok('resample can treat outside as zero', rz[0]===0&&rz[400]===0);
for (const C of m.CATS) { const M=C.M, Mi=m.inv3(M), I=m.m3v(M,[1,0,0]);
  const g = m.catGains(M,[0.95,1,1.09],[0.95,1,1.09],1);
  ok(`${C.id}: same white on both sides leaves colours unchanged`, g.every(x=>near(x,1,1e-12)) && m.catApply(M,Mi,g,[0.3,0.4,0.2]).every((x,i)=>near(x,[0.3,0.4,0.2][i],1e-9)));
  const WA=[0.9505,1,1.089], WB=[0.9642,1,0.8249], gg=m.catGains(M,WA,WB,1), mapped=m.catApply(M,Mi,gg,WA);
  ok(`${C.id}: maps white A exactly onto white B`, mapped.every((x,i)=>near(x,WB[i],1e-9))); }
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail?1:0);
