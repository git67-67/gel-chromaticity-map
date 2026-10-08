/* ---- import ---- */
function pretty(id){return id.replace(/[-_]+/g,' ').replace(/\b(lee)\b/gi,'LEE').replace(/\b([a-z])/g,c=>c.toUpperCase()).replace(/\bLee\b/,'LEE');}
function splitLine(l,d){const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const c=l[i];
  if(q){if(c==='"'){if(l[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
  else if(c==='"')q=true;else if(c===d){out.push(cur);cur='';}else cur+=c;}
  out.push(cur);return out.map(s=>s.trim());}
function parseCSV(text){text=text.replace(/^﻿/,'');const lines=text.split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return{rows:[],d:','};
  const f=lines[0],c=f.split(',').length,sc=f.split(';').length,tc=f.split('\t').length;
  const d=tc>c&&tc>=sc?'\t':(sc>c?';':(c>1?',':(/\s/.test(f.trim())?'ws':',')));   // 'ws' = columns separated by spaces
  return{rows:lines.map(l=>d==='ws'?l.trim().split(/\s+/):splitLine(l,d)),d};}
const num=(s,d)=>parseFloat(d===';'?String(s).replace(',','.'):s);
/* catalogue number = first word of the name, but only if it contains a digit ("119 Dark Blue" yes, "Example Red" no) */
function codeOf(name){const w=String(name).trim().split(/\s+/)[0]||'';return /\d/.test(w)?w.slice(0,10):'';}
function ingest(text,fname){
  const {rows,d}=parseCSV(text);if(rows.length<2)return null;
  const hdr=rows[0].map(s=>s.toLowerCase());const hasHdr=isNaN(parseFloat(hdr[0]));
  const wlIdx=hdr.findIndex(h=>/wavelength|^nm$|^wl$/.test(h));const fid=['filter_id','pigment_id','id'].map(k=>hdr.indexOf(k)).find(k=>k>=0)??-1;
  if(hasHdr&&fid>=0&&wlIdx>=0){ // long format
    let ti=hdr.findIndex(x=>x==='transmission'||x==='reflectance'),pct=false;if(ti<0){ti=hdr.findIndex(x=>x==='transmission_percent'||x==='reflectance_percent');pct=true;}if(ti<0)return null;
    const ni=hdr.indexOf('name'),m=new Map();
    for(let r=1;r<rows.length;r++){const R=rows[r],id=R[fid];if(!id)continue;let e=m.get(id);
      if(!e){e={id,name:ni>=0?R[ni]:'',wl:[],v:[]};m.set(id,e);}
      const w=num(R[wlIdx],d),v=num(R[ti],d);if(isFinite(w)&&isFinite(v)){e.wl.push(w);e.v.push(pct?v/100:v);}}
    return{kind:'filters',items:[...m.values()]};}
  if(hasHdr&&fid>=0&&wlIdx<0){ // metadata
    const ni=hdr.indexOf('name');if(ni<0)return null;const map=new Map();
    for(let r=1;r<rows.length;r++)if(rows[r][fid]&&rows[r][ni])map.set(rows[r][fid],rows[r][ni]);return{kind:'meta',map};}
  if(hasHdr&&wlIdx===0&&hdr.length>2){ // wide
    const items=[];for(let c=1;c<hdr.length;c++)items.push({id:rows[0][c],name:'',wl:[],v:[]});
    for(let r=1;r<rows.length;r++){const w=num(rows[r][0],d);if(!isFinite(w))continue;
      for(let c=1;c<hdr.length;c++){const v=num(rows[r][c],d);if(isFinite(v)){items[c-1].wl.push(w);items[c-1].v.push(v);}}}
    return{kind:'filters',items};}
  // single filter: two numeric columns
  const e={id:fname.replace(/\.[^.]+$/,''),name:'',wl:[],v:[]};
  for(let r=hasHdr?1:0;r<rows.length;r++){const w=num(rows[r][0],d),v=num(rows[r][1],d);if(isFinite(w)&&isFinite(v)){e.wl.push(w);e.v.push(v);}}
  return{kind:'filters',items:[e]};}
function addFilter(e){
  if(e.wl.length<5)return false;
  const idx=e.wl.map((_,i)=>i).sort((a,b)=>e.wl[a]-e.wl[b]);const wl=idx.map(i=>e.wl[i]),v=idx.map(i=>e.v[i]);
  if(Math.max(...v)>1.5)for(let i=0;i<v.length;i++)v[i]/=100;
  const name=e.name||st.names.get(e.id)||pretty(e.id);
  const code=e.code!==undefined?e.code:codeOf(name);st.filters.set(e.id,{id:e.id,name,code,lab:code||name.slice(0,16),wl,v,T:null,res:null,demo:!!e.demo});return true;}
async function importFiles(fileList){
  const files=[...fileList].filter(f=>/\.(csv|tsv|txt)$/i.test(f.name));
  if(!files.length){setStatus('No CSV files found in that selection.','err');return;}
  const mode=($('imp-mode')||{}).value||'replace';
  if(mode==='replace'){st.filters.clear();st.names.clear();st.sel=null;}
  st.demo=false;
  const uniq=new Set();let nf=0,metas=[],bad=0;
  for(const f of files){try{const r=ingest(await f.text(),f.name);
    if(!r){bad++;continue;}
    if(r.kind==='meta'){metas.push(r.map);continue;}
    for(const e of r.items)if(addFilter(e))uniq.add(e.id);else bad++;}catch(err){bad++;}}
  nf=uniq.size;
  for(const m of metas)for(const [id,name] of m){st.names.set(id,name);const f=st.filters.get(id);if(f){f.name=name;f.code=codeOf(name);f.lab=f.code||name.slice(0,16);}}
  setStatus(`Imported ${nf} ${tk(nf===1?'{filter}':'{filters}')} from ${files.length} file${files.length===1?'':'s'}`+(bad?` · ${bad} skipped (unrecognised format)`:'')+(mode==='add'?` · set now has ${st.filters.size}`:'')+'.',nf?'ok':'err');
  if(!st.sel||!st.filters.has(st.sel))st.sel=firstId();
  recompute();}
function setStatus(t,c){const s=$('status');s.textContent=t;s.className='status '+(c||'');}
/* first entry by number/name; independent of the sort menu because spectra may not be calculated yet */
function firstId(){return [...st.filters.values()].sort(natCmp)[0]?.id||null;}

