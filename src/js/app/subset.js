/* Keep only a subset of the loaded spectra.
   Match a typed/pasted/loaded list against each entry's id, name or catalogue number, or keep what the search box shows. */
const normKey=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'');
function parseList(text){return String(text).split(/\r?\n/).map(l=>l.replace(/#.*$/,'').split(',')[0].trim()).filter(Boolean);}
function keepOnly(pred,what){
  const before=st.filters.size;
  for(const [id,f] of [...st.filters])if(!pred(f))st.filters.delete(id);
  st.demo=false;
  if(!st.sel||!st.filters.has(st.sel))st.sel=firstId();
  setStatus(`Kept ${st.filters.size} of ${before} ${tk('{filters}')} (${what}).`,st.filters.size?'ok':'err');
  if(st.filters.size)usSaveSoon();
  recompute();}
function keepList(lines){
  const want=lines.map(normKey).filter(Boolean),hit=new Set();
  const keys=f=>[f.id,f.name,f.code].filter(Boolean).map(normKey);
  keepOnly(f=>{const k=keys(f);for(const w of want)if(k.includes(w)||normKey(f.id).startsWith(w+'-')){hit.add(w);return true;}return false;},'from your list');
  const miss=lines.filter(l=>normKey(l)&&!hit.has(normKey(l)));
  if(miss.length)setStatus($('status').textContent+` Not found: ${miss.slice(0,6).join(', ')}${miss.length>6?` and ${miss.length-6} more`:''}.`,st.filters.size?'':'err');}
$('b-subset').onclick=()=>keepList(parseList($('subset-text').value));
$('b-subset-file').onclick=()=>$('f-subset').click();
$('f-subset').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;$('subset-text').value=(await f.text()).trim();keepList(parseList($('subset-text').value));};
$('b-keepvis').onclick=()=>keepOnly(matches,'current search');
