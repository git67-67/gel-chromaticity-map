/* Reading LED files. Three kinds of input are recognised (see docs/DATA_FORMATS.md):
     1. one spectrum per file: optional "# key,value" header lines (instrument metrics), then wavelength,intensity rows
     2. several spectra in one file: long (id, wavelength, intensity) or wide (wavelength, one column per LED)
     3. a metadata table (one row per LED: rid / id, title, cct, duv, ra, ...) that adds names and reported values
   Nothing here touches the DOM, so tests can load this file on its own (it needs splitLine/num from app/import.js). */

/* full CSV parser: quoted fields may contain delimiters, quotes ("") and line breaks */
function parseCSVFull(text,d){text=text.replace(/^\uFEFF/,'');
  if(!d){const f=text.slice(0,text.search(/\r?\n|$/));d=(f.split('\t').length>f.split(',').length)?'\t':(f.split(';').length>f.split(',').length?';':',');}
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
    else if(c==='"')q=true;
    else if(c===d){row.push(cur);cur='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.length>1||row[0].trim())rows.push(row.map(s=>s.trim()));row=[];}
    else cur+=c;}
  row.push(cur);if(row.length>1||row[0].trim())rows.push(row.map(s=>s.trim()));
  return{rows,d};}

/* names of reported values, however the instrument or a table spells them */
const LED_META_KEYS={cct:/^(metrics\.)?cct(\(k\))?$/,duv:/^(metrics\.)?duv$/,ra:/^(metrics\.)?ra$/,r9:/^(metrics\.)?r9$/,rf:/^(metrics\.)?rf$/,rg:/^(metrics\.)?rg$/,
  x:/^(cie_)?x$/,y:/^(cie_)?y$/,device:/^(device|instrument|model)$/,name:/^(name|title)$/};
function ledMetaKey(k){k=k.toLowerCase().trim();for(const n in LED_META_KEYS)if(LED_META_KEYS[n].test(k))return n;return null;}
function ledMetaPut(meta,k,v){const n=ledMetaKey(k);if(!n)return;
  if(n==='device'||n==='name'){if(String(v).trim()&&!meta[n])meta[n]=String(v).trim();return;}
  const x=parseFloat(String(v).replace(',','.'));if(isFinite(x))meta[n]=x;}

function ingestLED(text,fname){
  text=text.replace(/^\uFEFF/,'');
  const stem=fname.replace(/^.*[\\/]/,'').replace(/\.[^.]+$/,'');
  const lines=text.split(/\r?\n/),meta={};let k=0;
  for(;k<lines.length;k++){const l=lines[k];if(!l.trim())continue;if(l[0]!=='#')break;     // leading "# key,value" block only
    const m=/^#\s*([^,;\t]+)[,;\t]\s*(.*)$/.exec(l);if(m)ledMetaPut(meta,m[1],m[2].trim());}
  const body=lines.slice(k);
  if(!body.length)return null;
  const {rows,d}=parseCSVFull(body.join('\n'));if(!rows.length)return null;
  const hdr=rows[0].map(s=>s.toLowerCase()),hasHdr=!isFinite(num(rows[0][0],d));
  const wlI=hdr.findIndex(h=>/wavelength|^nm$|^wl$|^lambda/.test(h));
  const idI=hasHdr?hdr.findIndex(h=>/^(led_?id|rid|id|sample|spectrum|file)$/.test(h)):-1;
  const valI=hasHdr?hdr.findIndex((h,i)=>i!==wlI&&i!==idI&&/intens|power|irradiance|radiance|spd|value|relative|signal|counts/.test(h)):-1;
  const mk=(id,name,wl,v)=>({id,name:name||'',wl,v,meta:{}});
  if(hasHdr&&idI>=0&&wlI>=0){ // long: one row per (led, wavelength); a "name" column is optional
    const ni=hdr.indexOf('name'),vi=valI>=0?valI:hdr.findIndex((h,i)=>i!==wlI&&i!==idI&&i!==ni&&isFinite(num(rows[1]?.[i],d)));if(vi<0)return null;
    const map=new Map();
    for(let r=1;r<rows.length;r++){const R=rows[r],id=R[idI];if(!id)continue;let e=map.get(id);if(!e){e=mk(id,ni>=0?R[ni]:'',[],[]);map.set(id,e);}
      const w=num(R[wlI],d),v=num(R[vi],d);if(isFinite(w)&&isFinite(v)){e.wl.push(w);e.v.push(v);}}
    return{kind:'spectra',items:[...map.values()]};}
  if(hasHdr&&idI>=0&&wlI<0){ // metadata table
    const map=new Map();
    for(let r=1;r<rows.length;r++){const R=rows[r],id=R[idI];if(!id)continue;const m={};
      hdr.forEach((h,i)=>{if(i!==idI&&R[i]!=null&&R[i]!=='')ledMetaPut(m,h,R[i]);
        if(/^tag_/.test(h)&&R[i])(m.tags=m.tags||[]).push(R[i]);if(h==='notes'&&R[i])m.notes=R[i];if(h==='uploader'&&R[i])m.uploader=R[i];if(h==='url'&&R[i])m.url=R[i];});
      map.set(id,m);}
    return{kind:'meta',map};}
  if(hasHdr&&wlI===0&&hdr.length>2){ // wide
    const items=[];for(let c=1;c<hdr.length;c++)items.push(mk(rows[0][c],'',[],[]));
    for(let r=1;r<rows.length;r++){const w=num(rows[r][0],d);if(!isFinite(w))continue;
      for(let c=1;c<hdr.length;c++){const v=num(rows[r][c],d);if(isFinite(v)){items[c-1].wl.push(w);items[c-1].v.push(v);}}}
    return{kind:'spectra',items};}
  // one spectrum: first two numeric columns (or the named intensity column)
  const e=mk(stem,'',[],[]),vi=valI>=0?valI:1,wi=wlI>=0?wlI:0;
  for(let r=hasHdr?1:0;r<rows.length;r++){const w=num(rows[r][wi],d),v=num(rows[r][vi],d);if(isFinite(w)&&isFinite(v)){e.wl.push(w);e.v.push(v);}}
  e.meta=meta;if(meta.name){e.name=meta.name;}
  return{kind:'spectra',items:[e]};}

/* clean one measured spectrum: sort, drop duplicates, clip negatives (instrument noise), report coverage */
function cleanLED(e){
  if(e.wl.length<20)return null;
  const idx=e.wl.map((_,i)=>i).sort((a,b)=>e.wl[a]-e.wl[b]),wl=[],v=[];let clipped=0;
  for(const i of idx){if(wl.length&&e.wl[i]===wl[wl.length-1])continue;wl.push(e.wl[i]);let x=e.v[i];if(x<0){x=0;clipped++;}v.push(x);}
  let mx=0;for(const x of v)if(x>mx)mx=x;if(!(mx>0))return null;
  const notes=[];if(wl[0]>420||wl[wl.length-1]<680)notes.push('measured range '+Math.round(wl[0])+'–'+Math.round(wl[wl.length-1])+' nm does not cover 420–680 nm');
  if(clipped>wl.length*.2)notes.push('many negative values clipped');
  return{wl,v:v.map(x=>x/mx),notes};}
