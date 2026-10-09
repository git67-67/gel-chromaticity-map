/* Saved data: keeps what you import so it is still there next time.
   - spectra sets (filters, pigments, LEE, Munsell, ...): one set per data set, in IndexedDB database 'gelmap-sets'
   - LED library: see led/library.js (database 'gel-map')
   - backup file: both together as one JSON file, so you can move them to another browser or recover after clearing site data
   Where the browser blocks storage (private windows, some sandboxes) everything still works for the session; the page says so
   and the backup file is the way to keep your data. */
const userSets=new Map();   // data set id -> [{id,name,code,wl:[nm],v:[fraction]}]
const US={persist:false,ready:false,last:null};
function kvOpen(){return new Promise((res,rej)=>{try{const r=indexedDB.open('gelmap-sets',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
function kvDo(fn){return kvOpen().then(db=>new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');let r;try{r=fn(tx.objectStore('kv'));}catch(e){rej(e);return;}tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error);}));}
const kvPut=(k,v)=>kvDo(os=>{os.put(v,k);});
const kvDel=k=>kvDo(os=>{os.delete(k);});
async function usLoad(){
  try{const db=await kvOpen();US.persist=true;
    const get=(os,m)=>new Promise((a,b)=>{const r=os[m]();r.onsuccess=()=>a(r.result);r.onerror=()=>b(r.error);});
    const os=db.transaction('kv').objectStore('kv'),keys=await get(os,'getAllKeys'),vals=await get(os,'getAll');
    keys.forEach((k,i)=>{if(String(k).startsWith('set:')&&Array.isArray(vals[i])&&vals[i].length)userSets.set(String(k).slice(4),vals[i]);else if(k==='last')US.last=vals[i];});
    try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}   // ask the browser not to evict it
  }catch(e){US.persist=false;}
  US.ready=true;return userSets.size;}
/* what is on screen for the current data set, as plain data */
function usSnapshot(){return [...st.filters.values()].map(f=>({id:f.id,name:f.name,code:f.code,wl:f.wl,v:f.v}));}
let usT=0;
function usSaveSoon(){clearTimeout(usT);usT=setTimeout(usSave,300);}
async function usSave(){
  const kind=st.kind,items=usSnapshot();
  if(items.length)userSets.set(kind,items);else userSets.delete(kind);
  usRefresh();
  if(!US.persist)return;
  try{if(items.length)await kvPut('set:'+kind,items);else await kvDel('set:'+kind);}catch(e){US.persist=false;usRefresh();}}
async function usDelete(kind){userSets.delete(kind);if(US.persist){try{await kvDel('set:'+kind);}catch(e){}}usRefresh();}
/* header switch + the "saved" note follow whatever is saved */
function usRefresh(){
  if(typeof renderDatasetSwitch==='function'){renderDatasetSwitch();document.querySelectorAll('#dsseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ds===st.kind));}
  const note=$('us-note');if(!note)return;
  const parts=[...userSets].map(([k,v])=>`${v.length} ${DATASETS.has(k)?DATASETS.get(k).vocab.Filters.toLowerCase():k}`).join(', ');
  note.textContent=US.persist
    ?(parts?`Saved in this browser (${parts}). They load automatically next time.`:'Anything you import is saved in this browser automatically, so you do not have to import it again.')
    :'This page cannot store data here, so imports last only until you close it. Use “Download backup” to keep them'+(parts?` (now held: ${parts}).`:'.');
  const p=$('ld-persist');if(p&&typeof LED!=='undefined')p.textContent=LED.persist?'Imported lights are saved in this browser and load automatically next time. “Remove imported” deletes them.':'This page cannot store data here, so imported lights last only until you close it. Use “Download backup” to keep them.';}

/* ---- backup file ---- */
const BK_FORMAT='gel-chromaticity-map-library';
function backupBuild(){
  const sets={};for(const [k,v] of userSets)sets[k]=v.map(e=>({id:e.id,name:e.name,code:e.code,wl:e.wl,v:e.v.map(x=>+x.toFixed(6))}));
  const leds=ledUser().map(it=>({id:it.id,name:it.name,wl:Array.from(it.wl),v:Array.from(it.v,x=>+x.toFixed(5)),meta:it.meta,notes:it.notes}));
  return JSON.stringify({format:BK_FORMAT,version:1,saved:new Date().toISOString(),sets,leds});}
async function backupRestore(text){
  let o;try{o=JSON.parse(text);}catch(e){throw new Error('That file is not a backup (not valid JSON).');}
  if(!o||o.format!==BK_FORMAT)throw new Error('That file is not a backup made by this page.');
  let ns=0,nl=0;
  let first=null;
  for(const [k,items] of Object.entries(o.sets||{})){if(!Array.isArray(items)||!items.length)continue;
    userSets.set(k,items.map(e=>({id:String(e.id),name:String(e.name||''),code:e.code||'',wl:e.wl.map(Number),v:e.v.map(Number)})));ns+=items.length;if(!first||k===st.kind)first=k;
    if(US.persist)try{await kvPut('set:'+k,userSets.get(k));}catch(e){US.persist=false;}}
  for(const r of (o.leds||[])){try{ledPut(ledMake(String(r.id),r.name,'Imported','usr',r.wl.map(Number),r.v.map(Number),r.meta,r.notes));nl++;}catch(e){}}
  if(nl){ledChanged();ledSaveSoon();}
  usRefresh();
  if(first){loadBuiltin(first);if(typeof fitView==='function')fitView();recompute();}
  return {ns,nl};}
async function copyText(text,ta){ta.value=text;ta.hidden=false;ta.select();try{await navigator.clipboard.writeText(text);return true;}catch(e){try{return document.execCommand('copy');}catch(e2){return false;}}}
function saveTextFile(name,text){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);return true;}catch(e){return false;}}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-bk]');if(!b)return;
  const box=b.closest('.bk-box'),msg=box.querySelector('.bk-msg'),ta=box.querySelector('.bk-out'),say=(t,c)=>{msg.textContent=t;msg.className='status bk-msg '+(c||'');};
  const act=b.dataset.bk;
  if(act==='load'){document.getElementById('bk-file').onchange=async ev=>{const f=ev.target.files[0];ev.target.value='';if(!f)return;
      try{const r=await backupRestore(await f.text());say(`Restored ${r.ns} spectra and ${r.nl} lights from ${f.name}.`,'ok');}catch(err){say(err.message,'err');}};
    document.getElementById('bk-file').click();return;}
  const text=backupBuild(),n=userSets.size+ledUser().length;
  if(!n){say('Nothing imported yet, so there is nothing to back up.','err');return;}
  if(act==='download'){const ok=saveTextFile('gel-map-backup.json',text);say(ok?'Backup file created. If your browser did not offer a download, use “Copy backup text” instead.':'Could not create a file; use “Copy backup text”.',ok?'ok':'err');}
  else{const ok=await copyText(text,ta);say(ok?'Backup text copied. Paste it into a text file and save it as gel-map-backup.json.':'Select the text below, copy it, and save it as gel-map-backup.json.',ok?'ok':'');}});
