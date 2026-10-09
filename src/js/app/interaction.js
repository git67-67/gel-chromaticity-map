/* ---- interaction ---- */
const tip=$('tip');const ptrs=new Map();let drag=null,pinch=null;
function hit(mx,my){let best=null,bd=1e9;const r0=(st.filters.size<40?5.5:3.6)+5;
  for(const f of st.filters.values()){if(!matches(f))continue;const p=px(...coord(f.res)),d=(p[0]-mx)**2+(p[1]-my)**2;if(d<bd&&d<=r0*r0){bd=d;best=f;}}return best;}
function pos(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];}
function zoomAt(mx,my,f){const a=cx(mx),b=cy(my);V.s=Math.min(Math.max(V.s*f,V.fitS*.8),V.fitS*400);V.x0=a-(mx-PAD.l)/V.s;V.y0=b-(H-PAD.b-my)/V.s;V.user=true;requestDraw();}
cv.addEventListener('wheel',e=>{e.preventDefault();const [mx,my]=pos(e);zoomAt(mx,my,Math.pow(1.0018,-e.deltaY));},{passive:false});
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);const p=pos(e);ptrs.set(e.pointerId,p);
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s:V.s};drag=null;}
  else drag={x:p[0],y:p[1],moved:0,x0:V.x0,y0:V.y0};});
cv.addEventListener('pointermove',e=>{const p=pos(e);if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,p);
  if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    zoomAt(mx,my,(pinch.s*d/pinch.d)/V.s);return;}
  if(drag){const dx=p[0]-drag.x,dy=p[1]-drag.y;drag.moved=Math.max(drag.moved,Math.hypot(dx,dy));
    if(drag.moved>3){V.x0=drag.x0-dx/V.s;V.y0=drag.y0+dy/V.s;V.user=true;tip.hidden=true;requestDraw();return;}}
  const f=hit(p[0],p[1]);const id=f?f.id:null;
  if(id!==st.hover){st.hover=id;requestDraw();}
  cv.style.cursor=f?'pointer':'crosshair';
  if(f){const r=f.res;tip.innerHTML=`<b>${esc(f.name)}</b><span>${fmt(r.Yr*100,1)} % ${tk('{out}')}</span><span>x ${fmt(r.x,4)}  y ${fmt(r.y,4)}</span><span>CCT ${r.cct?Math.round(r.cct)+' K':'—'}  Duv ${fmt(r.duv,4)}</span>`;
    tip.hidden=false;const pr=$('plot').getBoundingClientRect(),cr=cv.getBoundingClientRect();let l=(p[0]*cr.width/W)+14,t=(p[1]*cr.height/H)+14;
    const tw=tip.offsetWidth,th=tip.offsetHeight;if(l+tw>pr.width-6)l-=tw+28;if(t+th>pr.height-6)t-=th+28;tip.style.left=Math.max(4,l)+'px';tip.style.top=Math.max(4,t)+'px';}
  else tip.hidden=true;});
cv.addEventListener('pointerup',e=>{const p=pos(e);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;
  if(drag&&drag.moved<=3){const f=hit(p[0],p[1]);if(f)select(f.id,true);}drag=null;});
cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);pinch=null;drag=null;});
cv.addEventListener('pointerleave',()=>{if(st.hover){st.hover=null;requestDraw();}tip.hidden=true;});
function select(id,scroll){st.sel=id;renderList();renderDetail();requestDraw();
  if(scroll){const el=$('list').querySelector('[aria-current="true"]');if(el)el.scrollIntoView({block:'nearest'});}}
$('list').addEventListener('click',e=>{const b=e.target.closest('.item');if(b)select(b.dataset.id,false);});
$('z-in').onclick=()=>zoomAt((W+PAD.l-PAD.r)/2,(H-PAD.b+PAD.t)/2,1.5);
$('z-out').onclick=()=>zoomAt((W+PAD.l-PAD.r)/2,(H-PAD.b+PAD.t)/2,1/1.5);
$('z-fit').onclick=()=>{fitView();requestDraw();};
function setMode(m){st.mode=m;$('m-xy').setAttribute('aria-pressed',m==='xy');$('m-uv').setAttribute('aria-pressed',m==='uv');fitView();requestDraw();}
$('m-xy').onclick=()=>setMode('xy');$('m-uv').onclick=()=>setMode('uv');
$('c-planck').onchange=e=>{st.planck=e.target.checked;requestDraw();};
$('c-labels').onchange=e=>{st.labels=e.target.checked;requestDraw();};
$('q').oninput=e=>{st.q=e.target.value.trim();renderList();requestDraw();};
$('s-sort').onchange=e=>{st.sort=e.target.value;renderList();};
$('s-edge').onchange=e=>{st.edge=e.target.value;recompute();};

/* source controls */
$('srcrow').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.src=b.dataset.src;if(st.src==='lib'&&!LED.items.has(st.libId))st.libId='std:LED-B3';recompute();});
const mapPick=mountPicker($('libpick'),{get:()=>st.libId,set:id=>{st.libId=id;st.src='lib';recompute();}});
function setCCT(v){v=Math.min(25000,Math.max(1000,Math.round(+v)||3200));st.cct=v;$('n-cct').value=v;$('r-cct').value=Math.min(v,12000);if(st.src==='bb')recompute();}
$('r-cct').oninput=e=>setCCT(e.target.value);$('n-cct').onchange=e=>setCCT(e.target.value);
$('bbbox').querySelectorAll('[data-cct]').forEach(b=>b.onclick=()=>setCCT(b.dataset.cct));
$('b-led').onclick=()=>$('f-led').click();
$('f-led').onchange=async e=>{const fl=[...e.target.files];e.target.value='';if(!fl.length)return;
  $('ledname').textContent='Reading '+fl.length+' file'+(fl.length>1?'s':'')+'…';
  const r=await ledImportFiles(fl,(i,n)=>{$('ledname').textContent='Reading '+i+' / '+n+'…';});
  $('ledname').textContent=ledResultText(r);
  const last=ledUser().pop();if(last){st.libId=last.id;st.src='lib';recompute();}};
function ledResultText(r){return (r.added+r.updated?'Added '+r.added+(r.updated?', updated '+r.updated:'')+' light'+(r.added+r.updated===1?'':'s'):'')+
  (r.meta?(r.added+r.updated?' · ':'')+'metadata for '+r.meta:'')+(r.bad.length?' · '+r.bad.length+' not readable':'')+(r.warn?' · '+r.warn+' with notes':'')||'Nothing imported.';}

/* import controls */
$('b-files').onclick=()=>$('f-files').click();$('b-dir').onclick=()=>$('f-dir').click();
$('f-files').onchange=e=>{importFiles(e.target.files);e.target.value='';};
$('f-dir').onchange=e=>{importFiles(e.target.files);e.target.value='';};
$('b-clear').onclick=()=>{st.filters.clear();st.names.clear();st.demo=false;st.sel=null;usDelete(st.kind);setStatus(tk('All {filters} removed, and the saved copy deleted.'));recompute();};
$('b-lee').onclick=async()=>{const k=st.kind;await usDelete(k);loadBuiltin(k,true);if(typeof fitView==='function')fitView();recompute();};

const drop=$('drop');
['dragenter','dragover'].forEach(t=>document.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over');}));
['dragleave','drop'].forEach(t=>document.addEventListener(t,e=>{e.preventDefault();if(t==='drop'||e.target===document||e.relatedTarget===null)drop.classList.remove('over');}));
document.addEventListener('drop',e=>{if(e.dataTransfer&&e.dataTransfer.files.length)importFiles(e.dataTransfer.files);});

/* copy results */
$('b-copy').onclick=async()=>{
  const rows=[[KIND[st.kind].idcol,'name',KIND[st.kind].outcol,'x','y','u_prime','v_prime','cct_k','duv',...metricColumns().map(c=>c.key)]];
  for(const f of sorted()){const r=f.res;rows.push([f.id,'"'+f.name.replace(/"/g,'""')+'"',(r.Yr*100).toFixed(2),r.x.toFixed(5),r.y.toFixed(5),r.up.toFixed(5),r.vp.toFixed(5),r.cct?Math.round(r.cct):'',r.duv.toFixed(5),...metricColumns().map(c=>r.m[c.key]==null?'':+(+r.m[c.key]).toFixed(4))]);}
  const txt=rows.map(r=>r.join(',')).join('\n');const ta=$('csvout');ta.value=txt;
  try{await navigator.clipboard.writeText(txt);setStatus(`Copied ${rows.length-1} rows for source: ${st.srcName}.`,'ok');ta.hidden=true;}
  catch(e){ta.hidden=false;ta.focus();ta.select();setStatus('Clipboard is blocked here. The CSV is selected below; copy it with Ctrl/Cmd+C.','');}};

/* theme + resize */
function themeChanged(){readCols();bgKey='';requestDraw();const f=st.sel&&st.filters.get(st.sel);if(f)drawSpec(f);}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeChanged);
new MutationObserver(themeChanged).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
new ResizeObserver(()=>{sizeCanvas();const f=st.sel&&st.filters.get(st.sel);if(f)drawSpec(f);}).observe($('plot'));

