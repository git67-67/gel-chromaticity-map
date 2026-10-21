/* The LED library: every light source the user can pick, with its colour-rendering numbers worked out once.
   Items: { id, name, group, kind:'std'|'usr', wl, v, spd, q, meta, notes }
     id    'std:F2' for built-in CIE sources, 'usr:<file name>' for imported ones
     spd   Float64Array on the 380-780 nm, 1 nm grid, peak 1
     q     quality(spd): x, y, u, v, up, vp, cct, duv, cri{Ra,R[14]}, tm30{Rf,Rg,Rfh,Rcs,Rhs,bins}
     meta  numbers reported by the instrument or a metadata table (cct, duv, ra, r9, rf, rg, x, y), name, device, tags, notes
   Imported lights are kept in the browser (IndexedDB) when the page is hosted; in sandboxes without storage they last for the visit. */
const LED={items:new Map(),pending:new Map(),persist:false,ver:0,listeners:[]};
const ledChanged=()=>{LED.ver++;LED.listeners.forEach(f=>{try{f();}catch(e){console.warn(e);}});};
function ledMake(id,name,group,kind,wl,v,meta,notes){
  const spd=resample(wl,v,'zero');
  return{id,name,group,kind,wl:Float32Array.from(wl),v:Float32Array.from(v),spd,q:quality(spd),meta:meta||{},notes:notes||[]};}
function ledPut(it){const p=LED.pending.get(it.id.replace(/^usr:/,''));
  if(p){Object.assign(it.meta,p);if(p.name)it.name=p.name;LED.pending.delete(it.id.replace(/^usr:/,''));}
  LED.items.set(it.id,it);}
/* built-in CIE sources (data/standard-sources.json) */
function ledLoadStandard(){for(const s of STD_SOURCES){const wl=[],v=s.spd5;for(let i=0;i<81;i++)wl.push(380+5*i);ledPut(ledMake(s.id,s.name,s.group,'std',wl,v,{}));}}
const ledAll=()=>[...LED.items.values()];
const ledUser=()=>ledAll().filter(x=>x.kind==='usr');
function ledVal(it,k){const q=it.q;switch(k){
  case'cct':return q.cct;case'duv':return q.duv;case'Ra':return q.cri?q.cri.Ra:null;case'R9':return q.cri?q.cri.R[8]:null;
  case'Rf':return q.tm30?q.tm30.Rf:null;case'Rg':return q.tm30?q.tm30.Rg:null;case'name':return it.name;}return null;}
const ledGroupName=it=>it.kind==='std'?it.group:'Imported';
function ledMatch(it,q){if(!q)return true;const h=(it.name+' '+it.id+' '+(it.meta.device||'')+' '+(it.meta.tags||[]).join(' ')+' '+ledGroupName(it)).toLowerCase();
  return q.toLowerCase().split(/\s+/).every(t=>h.includes(t));}
/* the ideal comparison light for an LED: Planckian / daylight (TM-30 rule) at the same CCT, so Ra = Rf = Rg = 100 */
function ledReference(it){const T=it.q.cct;if(!it.q.ok||!T)return null;
  const a=referenceLight5(T,REF_TM30);let m=0;for(const x of a)if(x>m)m=x;return{spd:from5(Array.from(a,x=>x/m)),name:'Reference light, '+Math.round(T)+' K',cct:T};}
/* importing: files -> parsed -> cleaned -> items. Works in small slices so the page stays responsive with 1000+ files. */
async function ledImportFiles(files,onProgress){
  files=[...files].filter(f=>/\.(csv|tsv|txt)$/i.test(f.name));
  const res={added:0,updated:0,meta:0,bad:[],warn:0,total:files.length};let t0=performance.now();
  for(let i=0;i<files.length;i++){const f=files[i];
    try{const r=ingestLED(await f.text(),f.name);
      if(!r){res.bad.push(f.name);continue;}
      if(r.kind==='meta'){res.meta+=ledApplyMeta(r.map);continue;}
      for(const e of r.items){const c=cleanLED(e);if(!c){res.bad.push(f.name+(r.items.length>1?' ['+e.id+']':''));continue;}
        const id='usr:'+e.id,had=LED.items.has(id),meta=Object.assign({},e.meta),notes=c.notes;
        const it=ledMake(id,e.name||e.id,'Imported','usr',c.wl,c.v,meta,notes);ledPut(it);if(notes.length)res.warn++;had?res.updated++:res.added++;}}
    catch(err){res.bad.push(f.name);}
    if(performance.now()-t0>30){if(onProgress)onProgress(i+1,files.length);await new Promise(r=>setTimeout(r,0));t0=performance.now();}}
  ledApplyAllPending();ledChanged();ledSaveSoon();return res;}
function ledApplyMeta(map){let n=0;
  for(const [id,m] of map){const it=LED.items.get('usr:'+id);
    if(it){Object.assign(it.meta,m);if(m.name)it.name=m.name;n++;}else LED.pending.set(id,m);}
  return n;}
function ledApplyAllPending(){for(const [id,m] of [...LED.pending]){const it=LED.items.get('usr:'+id);if(it){Object.assign(it.meta,m);if(m.name)it.name=m.name;LED.pending.delete(id);}}}
function ledRemoveUser(){for(const it of ledUser())LED.items.delete(it.id);LED.pending.clear();ledChanged();ledSaveSoon();}
function ledRemove(id){LED.items.delete(id);ledChanged();ledSaveSoon();}

/* ---- persistence (IndexedDB; silently off where unavailable) ---- */
const LED_DB='gel-map',LED_STORE='leds';
function ledDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open(LED_DB,2);r.onupgradeneeded=()=>{const db=r.result;for(const s of [LED_STORE,'measurements','calibrations'])if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
let ledSaveT=0;
function ledSaveSoon(){if(!LED.persist)return;clearTimeout(ledSaveT);ledSaveT=setTimeout(ledSave,400);}
async function ledSave(){try{const db=await ledDB(),tx=db.transaction(LED_STORE,'readwrite'),os=tx.objectStore(LED_STORE);os.clear();
  for(const it of ledUser())os.put({id:it.id,name:it.name,wl:it.wl,v:it.v,meta:it.meta,notes:it.notes});
  await new Promise((a,b)=>{tx.oncomplete=a;tx.onerror=()=>b(tx.error);});}catch(e){LED.persist=false;}}
async function ledLoadSaved(){try{const db=await ledDB();LED.persist=true;
  const rows=await new Promise((a,b)=>{const r=db.transaction(LED_STORE).objectStore(LED_STORE).getAll();r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error);});
  for(const r of rows)ledPut(ledMake(r.id,r.name,'Imported','usr',Array.from(r.wl),Array.from(r.v),r.meta,r.notes));
  if(rows.length)ledChanged();return rows.length;}catch(e){LED.persist=false;return 0;}}
/* a light source reference used by the map, the lab and the compare tab: {src:'lib', id} */
const libSrc=id=>({src:'lib',id});
