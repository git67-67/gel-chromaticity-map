// Pure-maths checks of the core modules (no browser needed):  node tests/maths.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['core/grid-cmf.js','core/spectra.js','core/locus.js','core/display.js','core/example-sources.js','core/evaluate.js','lab/cat.js',
  'core/reference-light.js','core/cri.js','core/tm30.js','core/quality.js','app/import.js','led/parse.js'];
const COLT_JSON = fs.readFileSync(path.join(root,'data/colour-tables.json'),'utf8');
const src = 'const COLT='+COLT_JSON+';\n' + files.map(f => fs.readFileSync(path.join(root,'src/js',f),'utf8')).join('\n') +
  '\n;({sums,chroma,planckSPD,cctDuv,from5,D65_5,N,CATS,catGains,catApply,m3v,inv3,buildPcWhite,buildRgbLed,resample,cri,tm30,quality,REF_CIE224,REF_TM30,sample5,referenceLight5,REF_CRI,ingestLED,cleanLED,parseCSVFull})';
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

/* ---- CRI and TM-30 against colour-science (tests/reference-quality.json, made by tools/gen_quality_reference.py) ---- */
const REF = JSON.parse(fs.readFileSync(path.join(root,'tests/reference-quality.json'),'utf8'));
let maxT=0,maxRa=0,maxR=0,maxRf=0,maxRfi=0,maxRg=0,maxRcs=0,nCri=0,nTm=0,worst={};
const track=(k,v,n)=>{if(v>(worst[k]?.v??-1))worst[k]={v,n};};
for (const r of REF) {
  const spd = m.from5(r.spd5), s = m.sums(spd), ch = m.chroma(s[0],s[1],s[2]), q = m.cctDuv(ch.u,ch.v);
  if (!q.cct || q.cct<1000 || q.cct>25000) continue;
  const dT=Math.abs(q.cct-r.cct)/r.cct; maxT=Math.max(maxT,dT);
  // The metrics are compared at the reference CCT so a few kelvin of CCT-algorithm difference cannot move a sample across a hue-bin edge.
  // CRI is skipped below 1800 K (colour-science's Robertson CCT table starts at 1667 K and clamps) and within 3 K of the 5000 K switch.
  if (r.Ra!=null && r.cct>=1800 && Math.abs(r.cct-5000)>3) { const c = m.cri(spd,r.cct); nCri++;
    const dRa=Math.abs(c.Ra-r.Ra), dR=Math.max(...c.R.map((x,i)=>Math.abs(x-r.R[i])));
    maxRa=Math.max(maxRa,dRa);maxR=Math.max(maxR,dR);track('Ra',dRa,r.name);track('R1-14',dR,r.name); }
  if (r.Rf!=null) { const t = m.tm30(spd,r.cct,m.REF_CIE224); nTm++;
    const dRf=Math.abs(t.Rf-r.Rf), dRfi=Math.max(...t.Rfi.map((x,i)=>Math.abs(x-r.Rfi[i])));
    maxRf=Math.max(maxRf,dRf);maxRfi=Math.max(maxRfi,dRfi);track('Rf',dRf,r.name);
    if (Number.isFinite(r.Rg)) { const dRg=Math.abs(t.Rg-r.Rg);maxRg=Math.max(maxRg,dRg);track('Rg',dRg,r.name);
      const dc=Math.max(...t.Rcs.map((x,i)=>Math.abs(x-r.Rcs[i])));maxRcs=Math.max(maxRcs,dc);track('Rcs',dc,r.name); } }
}
console.log(`  (${nCri} spectra for CRI, ${nTm} for TM-30; CCT from this tool's own Planckian table)`);
console.log('  max CCT difference vs colour-science:',(maxT*100).toFixed(2)+' %');
ok('CCT agrees with colour-science within 0.5 %', maxT<0.005);
console.log('  max |diff|: Ra',maxRa.toFixed(3),' R1-14',maxR.toFixed(3),' Rf',maxRf.toFixed(3),' Rf,i',maxRfi.toFixed(3),' Rg',maxRg.toFixed(3),' Rcs',maxRcs.toFixed(4));
ok('CRI Ra matches colour-science within 0.05', maxRa<0.05, JSON.stringify(worst.Ra));
ok('CRI R1-R14 match colour-science within 0.1', maxR<0.1, JSON.stringify(worst['R1-14']));
ok('TM-30 Rf matches colour-science within 0.01', maxRf<0.01, JSON.stringify(worst.Rf));
ok('TM-30 per-sample Rf,i match within 0.05', maxRfi<0.05);
ok('TM-30 Rg matches the independent bin calculation within 0.1', maxRg<0.01, JSON.stringify(worst.Rg));
ok('TM-30 Rcs matches the independent calculation within 0.0005', maxRcs<0.0005, JSON.stringify(worst.Rcs));
const pk=m.planckSPD(3000), pq=m.quality(pk);
ok('a 3000 K blackbody scores Ra, Rf and Rg of 100', Math.abs(pq.cri.Ra-100)<0.01&&Math.abs(pq.tm30.Rf-100)<0.01&&Math.abs(pq.tm30.Rg-100)<0.01, `Ra=${pq.cri.Ra.toFixed(3)} Rf=${pq.tm30.Rf.toFixed(3)} Rg=${pq.tm30.Rg.toFixed(3)}`);

/* ---- LED file parsing ---- */
const rows = (a,b,n=60)=>Array.from({length:n},(_,i)=>`${380+i*5},${(a+b*i).toFixed(4)}`).join('\n');
let r1 = m.ingestLED('# status,normal\n# metrics.cct,1092\n# metrics.ra,38.8\n# device,ABC\nWavelength (nm),Intensity\n'+rows(.1,.01),'113.csv');
ok('instrument file: one spectrum named after the file', r1.kind==='spectra'&&r1.items.length===1&&r1.items[0].id==='113'&&r1.items[0].wl.length===60);
ok('instrument file: "# key,value" lines become reported values', r1.items[0].meta.cct===1092&&r1.items[0].meta.ra===38.8&&r1.items[0].meta.device==='ABC');
let r2 = m.ingestLED('# Model,HPCS\n# CCT(K),1118\n# Ra,95.9\n# R9,96\n# x,0.63\nWavelength (nm),Intensity\n'+rows(.1,.01),'70.csv');
ok('second header style (CCT(K), Ra, R9, x)', r2.items[0].meta.cct===1118&&r2.items[0].meta.ra===95.9&&r2.items[0].meta.r9===96&&r2.items[0].meta.x===0.63&&r2.items[0].meta.device==='HPCS');
let r3 = m.ingestLED('led_id,wavelength_nm,intensity\n'+['a','b'].map(id=>rows(0,1,25).split('\n').map(l=>id+','+l).join('\n')).join('\n'),'many.csv');
ok('long format with an id column gives one spectrum per id', r3.kind==='spectra'&&r3.items.length===2&&r3.items[0].wl.length===25);
let r4 = m.ingestLED('wavelength_nm,x1,x2\n'+Array.from({length:25},(_,i)=>`${400+i},${i},${i*2}`).join('\n'),'wide.csv');
ok('wide format gives one spectrum per column', r4.kind==='spectra'&&r4.items.length===2&&r4.items[1].v[3]===6);
let r5 = m.ingestLED('\uFEFFrid,url,title,notes,cct,duv,ra,rf,rg,tag_LED Brand\n70,http://x,"Ultra, Warm",\"line one\nline two\",1375,-0.0461,66,74,97,Nichia\n','reports.csv');
ok('metadata table (quoted commas and line breaks) is read', r5.kind==='meta'&&r5.map.get('70').name==='Ultra, Warm'&&r5.map.get('70').cct===1375&&r5.map.get('70').rf===74&&r5.map.get('70').tags[0]==='Nichia');
let r6 = m.ingestLED('wavelength;intensity\n'+Array.from({length:25},(_,i)=>`${400+i};0,${i}`).join('\n'),'eu.csv');
ok('semicolon file with decimal commas', r6.items[0].v[5]===0.5);
const cl = m.cleanLED({wl:Array.from({length:30},(_,i)=>400+i),v:Array.from({length:30},(_,i)=>i===3?-5:i),meta:{}});
ok('cleaning clips negatives and normalises to a peak of 1', cl&&cl.v[3]===0&&Math.max(...cl.v)===1);
ok('a spectrum with too few points is rejected', m.cleanLED({wl:[400,500],v:[1,2],meta:{}})===null);
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail?1:0);
