/* LED library tab: chart of every light, search / filter / sort list, detail panel. */
const ld={mode:'uv',by:'Rf',planck:true,q:'',sort:'name',f:{},sel:null,visible:false,list:[],view:null,hover:null,dirty:true};
const LD_BY=[['Rf','TM-30 Rf (fidelity)',100,0],['Ra','CRI Ra',100,0],['Rg','TM-30 Rg (gamut)',140,60],['R9','R9 (saturated red)',100,-100],['cct','CCT',8000,1500],['none','No colouring',0,0]];
const ldNum=id=>{const v=parseFloat($(id).value);return isFinite(v)?v:null;};
function ldReadFilters(){ld.f={c0:ldNum('ld-f-c0'),c1:ldNum('ld-f-c1'),duv:ldNum('ld-f-duv'),ra:ldNum('ld-f-ra'),rf:ldNum('ld-f-rf'),r9:ldNum('ld-f-r9'),std:$('ld-f-std').checked,usr:$('ld-f-usr').checked};}
function ldPass(it){const f=ld.f,q=it.q;
  if(it.kind==='std'?!f.std:!f.usr)return false;
  if(!ledMatch(it,ld.q))return false;
  if(f.c0!=null&&!(q.cct>=f.c0))return false;if(f.c1!=null&&!(q.cct<=f.c1))return false;
  if(f.duv!=null&&!(Math.abs(q.duv)<=f.duv))return false;
  if(f.ra!=null&&!(ledVal(it,'Ra')>=f.ra))return false;if(f.rf!=null&&!(ledVal(it,'Rf')>=f.rf))return false;if(f.r9!=null&&!(ledVal(it,'R9')>=f.r9))return false;
  return true;}
function ldRefilter(){ldReadFilters();const k=ld.sort;
  const a=ledAll().filter(ldPass);
  if(k==='name')a.sort((x,y)=>x.name.localeCompare(y.name,undefined,{numeric:true}));
  else if(k==='duv')a.sort((x,y)=>Math.abs(x.q.duv)-Math.abs(y.q.duv));
  else if(k==='cct')a.sort((x,y)=>(x.q.cct??1e9)-(y.q.cct??1e9));
  else a.sort((x,y)=>(ledVal(y,k)??-1e9)-(ledVal(x,k)??-1e9));
  ld.list=a;ldSetRange();ldLegend();$('ld-count').textContent='('+a.length+(a.length!==LED.items.size?' of '+LED.items.size:'')+')';
  ldRenderList();if(ld.view)ld.view.request();}
/* colour of a light for the chosen metric */
const ldMetric=(it,k)=>k==='cct'?it.q.cct:ledVal(it,k);
/* the colour ramp spans the 2nd to 98th percentile of the lights currently shown, so it stays readable for any library */
function ldSetRange(){const k=ld.by;ld.rng=null;if(k==='none')return;const v=ld.list.map(it=>ldMetric(it,k)).filter(x=>x!=null&&isFinite(x)).sort((a,b)=>a-b);if(!v.length)return;
  const q=f=>v[Math.min(v.length-1,Math.max(0,Math.round(f*(v.length-1))))];let lo=q(.02),hi=q(.98);if(hi-lo<1e-6){lo-=1;hi+=1;}ld.rng=[lo,hi];}
function ldColor(it){if(ld.by==='none'||!ld.rng)return cols.accent||'#0b7d8a';
  const v=ldMetric(it,ld.by);if(v==null||!isFinite(v))return isDarkTheme()?'#6b7a86':'#98a6b1';return seqColor((v-ld.rng[0])/(ld.rng[1]-ld.rng[0]));}
function ldLegend(){const b=LD_BY.find(x=>x[0]===ld.by);if(!b||b[0]==='none'||!ld.rng){$('ld-legend').innerHTML='';return;}
  const g=[0,.25,.5,.75,1].map(t=>seqColor(t)).join(',');
  $('ld-legend').innerHTML=`<span>${esc(b[1])}</span><span>${ld.rng[0].toFixed(b[0]==='cct'?0:0)}</span><span class="ramp" style="background:linear-gradient(90deg,${g})"></span><span>${ld.rng[1].toFixed(0)}</span><span><i class="dsw" style="background:${isDarkTheme()?'#6b7a86':'#98a6b1'}"></i>no value</span>`;}

/* ---- virtual list ---- */
const LD_ROW=34;
function ldRenderList(){const box=$('ld-list'),n=ld.list.length;$('ld-vin').style.height=(n*LD_ROW)+'px';
  const top=box.scrollTop,i0=Math.max(0,Math.floor(top/LD_ROW)-3),i1=Math.min(n,Math.ceil((top+box.clientHeight)/LD_ROW)+3);let h='';
  for(let i=i0;i<i1;i++){const it=ld.list[i],a=ledVal(it,'Ra'),f=ledVal(it,'Rf'),c=rgbOfXY(it.q.x,it.q.y);
    h+=`<button class="vrow" role="option" aria-selected="${it.id===ld.sel}" data-id="${esc(it.id)}" style="top:${i*LD_ROW}px"><span class="sw" style="background:rgb(${c[0]|0},${c[1]|0},${c[2]|0})"></span><span class="nm" title="${esc(it.name)}">${esc(it.name)}</span><span class="num">${fmtK(it.q.cct)}</span><span class="num">${a==null?'—':'Ra '+Math.round(a)}</span><span class="num">${f==null?'—':'Rf '+Math.round(f)}</span></button>`;}
  $('ld-vin').innerHTML=h||'<div class="empty" style="position:absolute;inset:0">No lights match.</div>';}

/* ---- chart ---- */
function ldDraw(v){const ctx=v.ctx;const pts=ld.list;
  for(const it of pts){if(it.id===ld.sel)continue;const p=v.px(...v.crdLoc(it.q));ctx.fillStyle=ldColor(it);ctx.strokeStyle=cols.plotbg;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(p[0],p[1],3.6,0,7);ctx.fill();ctx.stroke();v.hits.push({x:p[0],y:p[1],r:3.6,id:it.id});}
  const s=ld.sel&&LED.items.get(ld.sel);if(s){const p=v.px(...v.crdLoc(s.q));ctx.strokeStyle=cols.fg;ctx.lineWidth=2.2;ctx.fillStyle=ldColor(s);ctx.beginPath();ctx.arc(p[0],p[1],6,0,7);ctx.fill();ctx.stroke();v.hits.push({x:p[0],y:p[1],r:6,id:s.id});}}
function ldTip(h,p){const tip=$('ld-tip');if(!h){tip.hidden=true;return;}const it=LED.items.get(h.id);if(!it){tip.hidden=true;return;}
  const a=ledVal(it,'Ra'),f=ledVal(it,'Rf');
  tip.innerHTML=`<b>${esc(it.name)}</b><span>${fmtK(it.q.cct)} · Duv ${fmt(it.q.duv,4)}</span><span>${a==null?'no CCT':'Ra '+a.toFixed(0)+' · Rf '+f.toFixed(0)+' · Rg '+ledVal(it,'Rg').toFixed(0)}</span>`;
  tip.hidden=false;const W=ld.view.W,H=ld.view.H,r=ld.view.cv.getBoundingClientRect(),sx=r.width/W;
  tip.style.left=Math.min(p[0]*sx+12,r.width-tip.offsetWidth-6)+'px';tip.style.top=Math.max(4,Math.min(p[1]*sx+12,r.height-tip.offsetHeight-6))+'px';}
ld.view=new CView($('ld-cv'),$('ld-plot'),{onDraw:ldDraw,onHover:ldTip,onClick:h=>ldSelect(h.id),planck:()=>ld.planck});

/* ---- detail ---- */
function ldSelect(id,scroll){ld.sel=id;ldRenderDetail();ldRenderList();ld.view.request();
  if(scroll){const i=ld.list.findIndex(x=>x.id===id);if(i>=0){const b=$('ld-list');if(i*LD_ROW<b.scrollTop||(i+1)*LD_ROW>b.scrollTop+b.clientHeight)b.scrollTop=Math.max(0,i*LD_ROW-b.clientHeight/2);}}}
const f0=(v,d)=>v==null||!isFinite(v)?'—':v.toFixed(d);
function ldReportedTable(it){const m=it.meta,q=it.q,rows=[['CCT',m.cct,q.cct,0,' K'],['Duv',m.duv,q.duv,4,''],['CRI Ra',m.ra,ledVal(it,'Ra'),1,''],['R9',m.r9,ledVal(it,'R9'),1,''],['Rf',m.rf,ledVal(it,'Rf'),1,''],['Rg',m.rg,ledVal(it,'Rg'),1,'']].filter(r=>r[1]!=null);
  if(!rows.length)return'';
  return`<table class="cmp-tab" style="margin-top:10px"><tr><th></th><th>Reported</th><th>This tool</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td>${f0(r[1],r[3])}${r[4]}</td><td>${f0(r[2],r[3])}${r[4]}</td></tr>`).join('')}</table>
  <p class="hint">“Reported” is what the instrument or table said. Differences are normal at low CCT or far from the locus, where CRI depends on how the reference light is chosen.</p>`;}
function ldRenderDetail(){const it=ld.sel&&LED.items.get(ld.sel),el=$('ld-detail');
  if(!it){el.innerHTML='<h2>Selected light</h2><div class="empty">Select a light in the list or on the diagram.</div>';return;}
  const q=it.q,c=rgbOfXY(q.x,q.y);
  el.innerHTML=`<h3><span class="sw" style="background:rgb(${c[0]|0},${c[1]|0},${c[2]|0});width:18px;height:18px"></span>${esc(it.name)}</h3>
  <div class="note">${it.kind==='std'?esc(it.group):'Imported'}${it.meta.device?' · '+esc(it.meta.device):''}${it.notes.length?' · '+esc(it.notes.join('; ')):''}</div>
  <div class="readout">${[['x',f0(q.x,4)],['y',f0(q.y,4)],['u′',f0(q.up,4)],['v′',f0(q.vp,4)],['CCT',fmtK(q.cct)],['Duv',f0(q.duv,4)],
    ['CRI Ra',f0(ledVal(it,'Ra'),1)],['R9',f0(ledVal(it,'R9'),1)],['Rf',f0(ledVal(it,'Rf'),1)],['Rg',f0(ledVal(it,'Rg'),1)]].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
  ${q.ok?'':'<p class="hint">This light has no usable CCT (it is more than 0.05 Duv from the Planckian locus, or outside 1000–25000 K), so CRI and TM-30 are not defined for it.</p>'}
  ${q.ok&&q.cct<1700?'<p class="hint">Below about 1700 K CRI and TM-30 are very sensitive: a 50 K change in the reference CCT moves Ra by several points, and other tools disagree with each other here.</p>':''}
  ${Math.abs(q.duv)>0.0054&&q.ok?'<p class="hint">|Duv| is above 0.0054: CRI and TM-30 are still computed, but the standards only recommend them for lights close to the locus.</p>':''}
  <div class="two"><div><h2 style="margin-top:12px">Spectrum</h2><canvas id="ld-sp" class="sp"></canvas>
    <div class="legend"><span><i style="border-color:var(--accent)"></i>This light</span><span><i style="border-color:var(--muted);border-top-style:dashed"></i>Ideal reference at its CCT</span></div></div>
   <div><h2 style="margin-top:12px">TM-30 colour vector graphic</h2><canvas id="ld-cvg" class="cvg"></canvas>
    <p class="hint">16 hue bins. The dashed circle is the reference; each dot is where this light puts that hue. Outside the circle is more saturated, inside less, sideways is a hue shift.</p></div></div>
  ${ldReportedTable(it)}
  <div class="row" style="margin-top:12px"><button class="btn primary" id="ld-use">Use in Colour map</button><button class="btn" id="ld-seta">Compare: set as A</button><button class="btn" id="ld-setb">Compare: set as B</button><button class="btn" id="ld-find">Find lights with the same CCT and Duv</button>${it.kind==='usr'?'<button class="btn" id="ld-rm">Remove</button>':''}</div>`;
  ldDrawDetail(it);}
function ldDrawDetail(it){const sp=$('ld-sp');if(!sp)return;const r=ledReference(it);
  plotSpectra(sp,[r&&{spd:r.spd,color:cols.muted,dash:[4,3],width:1.2},{spd:it.spd,color:cols.accent,fill:true,width:2}]);
  plotCVG($('ld-cvg'),it.q.tm30?[{t:it.q.tm30,color:cols.accent}]:[]);}
$('ld-detail').addEventListener('click',e=>{const id=ld.sel,b=e.target.closest('button');if(!b||!id)return;
  if(b.id==='ld-use'){st.libId=id;st.src='lib';showTab('map');recompute();}
  else if(b.id==='ld-seta'){cmp.A=id;showTab('cmp');}
  else if(b.id==='ld-setb'){cmp.B=id;showTab('cmp');}
  else if(b.id==='ld-find'){cmp.A=id;cmp.B='';cmp.find=true;showTab('cmp');}
  else if(b.id==='ld-rm'){LED.items.delete(id);ld.sel=null;ledChanged();ldRenderDetail();}});

/* ---- controls ---- */
$('ld-by').innerHTML=LD_BY.map(b=>`<option value="${b[0]}">${esc(b[1])}</option>`).join('');
$('ld-by').onchange=e=>{ld.by=e.target.value;ldSetRange();ldLegend();ldRenderList();ld.view.request();};
$('ld-planck').onchange=e=>{ld.planck=e.target.checked;ld.view.request();};
function ldSpace(s){ld.mode=ld.view.mode=s;$('ld-uv').setAttribute('aria-pressed',s==='uv');$('ld-xy').setAttribute('aria-pressed',s==='xy');ld.view.V.user=false;ld.view.fit();ld.view.request();}
$('ld-uv').onclick=()=>ldSpace('uv');$('ld-xy').onclick=()=>ldSpace('xy');
function ldFrame(){const pts=ld.list.filter(it=>it.q.ok).map(it=>ld.view.crdLoc(it.q));if(pts.length<1){ld.view.fit();ld.view.request();return;}
  const xs=pts.map(p=>p[0]).sort((a,b)=>a-b),ys=pts.map(p=>p[1]).sort((a,b)=>a-b),q=(a,f)=>a[Math.min(a.length-1,Math.max(0,Math.round(f*(a.length-1))))];
  const a=q(xs,.01),c=q(xs,.99),b=q(ys,.01),d=q(ys,.99),sp=Math.max(c-a,d-b,.03),mx=(a+c)/2,my=(b+d)/2,hs=sp/2*1.25;ld.view.frame(mx-hs*1.15,my-hs,mx+hs*1.15,my+hs);}
$('ld-frame').onclick=ldFrame;
$('ld-zfit').onclick=()=>{ld.view.fit();ld.view.request();};
$('ld-zin').onclick=()=>ld.view.zoomAt((ld.view.W+ld.view.PAD.l-ld.view.PAD.r)/2,(ld.view.H-ld.view.PAD.b+ld.view.PAD.t)/2,1.5);
$('ld-zout').onclick=()=>ld.view.zoomAt((ld.view.W+ld.view.PAD.l-ld.view.PAD.r)/2,(ld.view.H-ld.view.PAD.b+ld.view.PAD.t)/2,1/1.5);
let ldQT=0;$('ld-q').oninput=e=>{ld.q=e.target.value.trim();clearTimeout(ldQT);ldQT=setTimeout(ldRefilter,120);};
$('ld-sort').onchange=e=>{ld.sort=e.target.value;ldRefilter();};
for(const id of ['ld-f-c0','ld-f-c1','ld-f-duv','ld-f-ra','ld-f-rf','ld-f-r9'])$(id).oninput=()=>{clearTimeout(ldQT);ldQT=setTimeout(ldRefilter,200);};
for(const id of ['ld-f-std','ld-f-usr'])$(id).onchange=ldRefilter;
$('ld-f-clear').onclick=()=>{for(const id of ['ld-f-c0','ld-f-c1','ld-f-duv','ld-f-ra','ld-f-rf','ld-f-r9'])$(id).value='';$('ld-f-std').checked=$('ld-f-usr').checked=true;ld.q='';$('ld-q').value='';ldRefilter();};
$('ld-list').addEventListener('scroll',()=>requestAnimationFrame(ldRenderList));
$('ld-list').addEventListener('click',e=>{const b=e.target.closest('.vrow');if(b)ldSelect(b.dataset.id);});
/* import */
async function ldImport(files){const st0=$('ld-status');st0.className='status';st0.textContent='Reading…';
  const r=await ledImportFiles(files,(i,n)=>{st0.textContent='Reading '+i+' / '+n+'…';});
  st0.textContent=ledResultText(r)+(r.bad.length?' (e.g. '+r.bad.slice(0,3).join(', ')+')':'');st0.className='status '+(r.added+r.updated+r.meta?'ok':'err');
  const last=ledUser().pop();if(last&&r.added+r.updated){ldSelect(last.id,true);if(r.added>3)ldFrame();}}
$('ld-bfiles').onclick=()=>$('ld-files').click();$('ld-bdir').onclick=()=>$('ld-dir').click();
$('ld-files').onchange=e=>{ldImport(e.target.files);e.target.value='';};$('ld-dir').onchange=e=>{ldImport(e.target.files);e.target.value='';};
const ldDrop=$('ld-drop');
['dragenter','dragover'].forEach(t=>ldDrop.addEventListener(t,e=>{e.preventDefault();ldDrop.classList.add('over');}));
['dragleave','drop'].forEach(t=>ldDrop.addEventListener(t,e=>{e.preventDefault();ldDrop.classList.remove('over');}));
ldDrop.addEventListener('drop',e=>{if(e.dataTransfer.files.length)ldImport(e.dataTransfer.files);});
$('ld-clear').onclick=()=>{if(ledUser().length&&confirm('Remove all '+ledUser().length+' imported lights from this browser?')){ledRemoveUser();ld.sel=null;}};
/* CSV export of everything in the library */
function ledTableCSV(items){const H=['id','name','group','cct_k','duv','x','y','u_prime','v_prime','CRI_Ra',...Array.from({length:14},(_,i)=>'R'+(i+1)),'TM30_Rf','TM30_Rg',...Array.from({length:16},(_,i)=>'Rcs_h'+(i+1)),...Array.from({length:16},(_,i)=>'Rhs_h'+(i+1)),'reported_cct','reported_duv','reported_ra','reported_r9','reported_rf','reported_rg'];
  const q=s=>'"'+String(s).replace(/"/g,'""')+'"',n=(v,d)=>v==null||!isFinite(v)?'':v.toFixed(d),rows=[H.join(',')];
  for(const it of items){const z=it.q,c=z.cri,t=z.tm30,m=it.meta;
    rows.push([q(it.id),q(it.name),q(ledGroupName(it)),n(z.cct,0),n(z.duv,5),n(z.x,5),n(z.y,5),n(z.up,5),n(z.vp,5),n(c&&c.Ra,2),...Array.from({length:14},(_,i)=>n(c&&c.R[i],2)),
      n(t&&t.Rf,2),n(t&&t.Rg,2),...Array.from({length:16},(_,i)=>n(t&&t.Rcs[i],4)),...Array.from({length:16},(_,i)=>n(t&&t.Rhs[i],4)),n(m.cct,0),n(m.duv,5),n(m.ra,1),n(m.r9,1),n(m.rf,1),n(m.rg,1)].join(','));}
  return rows.join('\n');}
$('ld-csv').onclick=async()=>{const csv=ledTableCSV(ld.list),ta=$('ld-csvout');ta.value=csv;ta.hidden=false;ta.select();
  let ok=false;try{await navigator.clipboard.writeText(csv);ok=true;}catch(e){try{ok=document.execCommand('copy');}catch(e2){}}
  $('ld-status').textContent=ok?'Table for '+ld.list.length+' lights copied as CSV. Paste it into a text file or spreadsheet.':'Select the text below and copy it.';$('ld-status').className='status ok';};
/* showing the tab */
function ledsShow(){$('ld-persist').textContent=LED.persist?'Imported lights are kept in this browser, so they are still here next time. “Remove imported” clears them.':'This copy of the page cannot store data, so imported lights last until you close it. The hosted copy (GitHub Pages) keeps them between visits.';
  requestAnimationFrame(()=>{ld.view.size();if(ld.dirty){ld.dirty=false;if(!ld.sel){const f=ledAll().find(x=>x.id==='std:LED-B3');ld.sel=f?f.id:null;}}ldLegend();ldRefilter();ldRenderDetail();if(!ld.framed){ld.framed=true;ldFrame();}ld.view.request();});}
LED.listeners.push(()=>{if(ld.visible){ldRefilter();if(ld.sel&&!LED.items.has(ld.sel))ld.sel=null;ldRenderDetail();}else ld.dirty=true;});
new ResizeObserver(()=>{if(ld.visible){ld.view.size();ldRenderList();}}).observe($('ld-plot'));
function ldTheme(){if(ld.visible){ld.view.bgKey='';ldLegend();ldRefilter();ldRenderDetail();ld.view.request();}}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',ldTheme);
new MutationObserver(ldTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
