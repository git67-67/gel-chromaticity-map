/* LED compare, section "One filter, all lights": the other way round from the pair view. Pick one filter / pigment and a
   reference (light A, or each light's own ideal reference at the same CCT) and see which lights in the library change
   how it looks the least or the most: colour shift, brightness, or both together (ΔE). Uses cmpCtx / cmpRowOf from compare.js,
   so the white-point treatment, equal lumens / watts and CIELUV / CAM02-UCS settings are the ones chosen above. */
const o1={f:null,ref:'A',metric:'apparent',dir:'least',fq:'',c0:'',c1:'',res:[],sel:null,sk:null,sd:1,shown:30,raf:0,pts:[],refSpd:new Map()};
function o1RefOf(it){if(!it.q.ok)return null;const k=it.id+'|'+Math.round(it.q.cct);let r=o1.refSpd.get(k);
  if(r===undefined){const x=ledReference(it);r=x?{id:'ref:'+it.id,name:'Ideal reference for '+it.name,spd:x.spd}:null;o1.refSpd.set(k,r);}return r;}
const o1Mag=r=>o1.metric==='bright'?Math.abs(r.row.stops):o1.metric==='shift'?r.row.shift:r.row.d.dE;
function o1Compute(){o1.res=[];const f=o1.f&&st.filters.get(o1.f);if(!f)return;
  const LA=o1.ref==='A'?cmLight(cmp.A):null;if(o1.ref==='A'&&!LA)return;
  const c0=parseFloat(o1.c0),c1=parseFloat(o1.c1),lim=isFinite(c0)||isFinite(c1);
  for(const it of ledAll()){
    if(lim&&!(it.q.ok&&(!isFinite(c0)||it.q.cct>=c0)&&(!isFinite(c1)||it.q.cct<=c1)))continue;
    let A=LA;if(o1.ref==='own'){A=o1RefOf(it);if(!A)continue;}else if(it.id===cmp.A)continue;
    const X=cmpCtx(A,{id:it.id,name:it.name,spd:it.spd}),row=cmpRowOf(X,f);if(!row)continue;
    o1.res.push({it,row,yBr:row.yB*X.rate});}
  const KEY={name:r=>r.it.name,cct:r=>r.it.q.ok?r.it.q.cct:Infinity,shift:r=>r.row.shift,bright:r=>r.row.bright,dE:r=>r.row.d.dE};
  if(o1.sk){const k=KEY[o1.sk],d=o1.sd;o1.res.sort((a,b)=>{const x=k(a),y=k(b);return d*(typeof x==='string'?x.localeCompare(y,undefined,{numeric:true}):x-y);});return;}
  const s=o1.dir==='least'?1:-1;o1.res.sort((a,b)=>s*(o1Mag(a)-o1Mag(b)));}
const o1Unit=(r)=>o1.metric==='bright'?sgn(r.row.bright*100,0,' %'):o1.metric==='shift'?(r.row.shift*1000).toFixed(1):r.row.d.dE.toFixed(1);
function o1Col(r,which,ym){const p=which==='A'?r.row.A:r.row.B;return o1.metric==='bright'?cmpColorY(p,which==='A'?r.row.yA:r.yBr,ym):cmpColor(p);}
function o1Sync(){const f=o1.f&&st.filters.get(o1.f);
  const q=o1.fq.toLowerCase().split(/\s+/).filter(Boolean),list=[...st.filters.values()].filter(x=>{const n=(x.code+' '+x.name).toLowerCase();return q.every(t=>n.includes(t));});
  const sel=$('o1-f');sel.innerHTML=list.slice(0,300).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')||'<option value="">No match</option>';
  if(f&&list.slice(0,300).includes(f))sel.value=f.id;else if(list.length&&!list.slice(0,300).includes(f)){o1.f=list[0].id;sel.value=o1.f;}
  $('o1-ref').value=o1.ref;$('o1-metric').value=o1.metric;$('o1-dir').value=o1.dir;}
function o1Render(){const R=o1.res,f=o1.f&&st.filters.get(o1.f),tab=$('o1-tab'),sum=$('o1-sum'),nm=cmSpaceName();
  const lab={apparent:'ΔE ('+nm+')',shift:'Δu′v′ × 1000',bright:'Brightness'}[o1.metric];
  $('o1-h').textContent=f?`How lights change ${f.name}`:'One filter, all lights';
  $('o1-more').hidden=true;
  if(!f){sum.textContent='Pick a filter or pigment.';tab.innerHTML='';o1Plot();return;}
  if(!R.length){sum.textContent=o1.ref==='A'&&!cmLight(cmp.A)?'Pick light A above.':'No light in the library matches (the CCT limits may be too narrow, or the library has only the built-in lights).';tab.innerHTML='';o1Plot();return;}
  const first=R[0],last=R[R.length-1],lo=o1.dir==='least'?first:last,hi=o1.dir==='least'?last:first,ref=o1.ref==='A'?'under '+esc(cmLight(cmp.A).name):'under its own ideal reference light of the same CCT';
  const desc=r=>`<b>${esc(r.it.name)}</b> (${o1.metric==='bright'?sgn(r.row.bright*100,0,' %'):o1Unit(r)})`;
  sum.innerHTML=`Compared with the same filter ${ref}, of ${R.length} lights, <b>${esc(f.name)}</b> changes least with ${desc(lo)} and most with ${desc(hi)}. Metric: ${lab}${o1.metric==='bright'?', '+(cmp.equal==='power'?'equal radiant power':'equal lumens'):''}.${cmp.wp.mode==='none'?'':' White-point method: '+esc(cmpWpName(cmp.wp))+'.'}`;
  const ym=R.reduce((m,r)=>Math.max(m,r.row.yA,r.yBr),1e-9),n=Math.min(o1.shown,R.length);
  tab.innerHTML=`<table class="cmp-tab"><tr>${[['name','Light'],[null,'Colour'],['cct','CCT'],['shift','Δu′v′·10³'],['bright','Bright.'],['dE',cmLab().E]].map(([k,t])=>k?`<th class="srt" data-k="${k}" tabindex="0" role="button" aria-sort="${o1.sk===k?(o1.sd>0?'ascending':'descending'):'none'}">${t}${o1.sk===k?(o1.sd>0?' ▲':' ▼'):''}</th>`:`<th>${t}</th>`).join('')}</tr>${R.slice(0,n).map(r=>`<tr class="cand" data-id="${esc(r.it.id)}" aria-current="${r.it.id===o1.sel}"><td><a href="#" class="o1-lnk" data-id="${esc(r.it.id)}" title="Open in the LED library">${esc(r.it.name)}</a></td><td><i class="dsw" style="background:${o1Col(r,'A',ym)};margin:0 2px 0 0"></i><i class="dsw" style="background:${o1Col(r,'B',ym)};margin:0"></i></td><td>${r.it.q.ok?Math.round(r.it.q.cct):'—'}</td><td>${(r.row.shift*1000).toFixed(1)}</td><td>${sgn(r.row.bright*100,0,' %')}</td><td>${r.row.d.dE.toFixed(1)}</td></tr>`).join('')}</table>`;
  $('o1-more').hidden=n>=R.length;$('o1-more').textContent='Show '+Math.min(30,R.length-n)+' more ('+n+' of '+R.length+')';
  o1.ym=ym;o1Plot();o1Detail();}
function o1Detail(){const r=o1.res.find(x=>x.it.id===o1.sel),el=$('o1-sel');if(!r){el.innerHTML='';return;}
  el.innerHTML=`<b>${esc(r.it.name)}</b>: light out ${(r.row.yA*100).toFixed(1)} % → ${(r.yBr*100).toFixed(1)} %, ${cmLab().L} ${sgn(r.row.d.dL,1,'')}, ${cmLab().C} ${sgn(r.row.d.dC,1,'')}, ${cmLab().H} ${r.row.d.dH.toFixed(1)}. <button class="btn sm" id="o1-b">Compare as B</button>`;}
/* scatter: CCT against the chosen change; dot = the colour the filter has under that light */
function o1Plot(){const cv=$('o1-cv');if(!cv)return;if(!cols.fg)readCols();const {c,w,h}=prepCanvas(cv,230),P={l:44,r:26,t:10,b:38};o1.pts=[];
  c.fillStyle=cols.plotbg;c.fillRect(0,0,w,h);const R=o1.res.filter(r=>r.it.q.ok);if(!R.length){c.fillStyle=cols.muted;c.font='12px '+FM;c.textAlign='center';c.fillText('No lights with a CCT to plot.',w/2,h/2);return;}
  const val=r=>o1.metric==='bright'?r.row.stops:o1Mag(r),xs=R.map(r=>r.it.q.cct),x0=Math.min(...xs),x1=Math.max(...xs,x0+1),vs=R.map(val);let y0=Math.min(0,...vs),y1=Math.max(...vs,y0+1e-6);
  const X=v=>P.l+(v-x0)/(x1-x0)*(w-P.l-P.r),Y=v=>h-P.b-(v-y0)/(y1-y0)*(h-P.t-P.b);
  c.strokeStyle=cols.grid;c.fillStyle=cols.muted;c.font='11px '+FM;c.lineWidth=1;c.textAlign='right';c.textBaseline='middle';
  for(let i=0;i<=4;i++){const v=y0+(y1-y0)*i/4;c.beginPath();c.moveTo(P.l,Y(v));c.lineTo(w-P.r,Y(v));c.stroke();c.fillText(o1.metric==='shift'?(v*1000).toFixed(0):v.toFixed(o1.metric==='bright'?1:0),P.l-5,Y(v));}
  c.textAlign='center';c.textBaseline='top';for(let i=0;i<=4;i++){const v=x0+(x1-x0)*i/4;c.fillText(Math.round(v/10)*10,X(v),h-P.b+5);}
  c.save();c.translate(11,(P.t+h-P.b)/2);c.rotate(-Math.PI/2);c.textAlign='center';c.textBaseline='top';c.fillText(o1.metric==='bright'?'stops':o1.metric==='shift'?'Δu′v′ × 1000':'ΔE',0,0);c.restore();c.textBaseline='top';c.fillText('CCT (K)',(P.l+w-P.r)/2,h-14);
  for(const r of R){const sel=r.it.id===o1.sel,x=X(r.it.q.cct),y=Y(val(r));c.fillStyle=o1Col(r,'B',o1.ym||1);c.strokeStyle=sel?cols.fg:cols.muted;c.lineWidth=sel?2:.8;c.beginPath();c.arc(x,y,sel?5.5:3.4,0,7);c.fill();c.stroke();o1.pts.push({x,y,id:r.it.id});}}
function o1Update(){if(!cmp.visible||!$('o1-h'))return;if(o1.raf)return;o1.raf=requestAnimationFrame(()=>{o1.raf=0;
  if(!o1.f||!st.filters.has(o1.f))o1.f=(cmp.sel&&st.filters.has(cmp.sel)?cmp.sel:[...st.filters.keys()][0])||null;
  o1Sync();o1Compute();o1.shown=Math.max(30,Math.min(o1.shown,o1.res.length));o1Render();});}
function o1Redo(reset){if(reset)o1.shown=30;o1Compute();o1Render();}
(function(){const g=id=>$(id);if(!g('o1-f'))return;
  g('o1-fq').oninput=e=>{o1.fq=e.target.value.trim();o1Sync();o1Redo(true);};
  g('o1-f').onchange=e=>{o1.f=e.target.value;o1.sel=null;o1Redo(true);};
  g('o1-use').onclick=()=>{if(cmp.sel&&st.filters.has(cmp.sel)){o1.f=cmp.sel;o1.fq='';g('o1-fq').value='';o1.sel=null;o1Sync();o1Redo(true);}};
  g('o1-ref').onchange=e=>{o1.ref=e.target.value;o1Redo(true);};
  g('o1-metric').onchange=e=>{o1.metric=e.target.value;o1.sk=null;o1Redo(true);};
  g('o1-dir').onchange=e=>{o1.dir=e.target.value;o1.sk=null;o1Redo(true);};
  for(const id of ['o1-c0','o1-c1'])g(id).oninput=e=>{o1[id.slice(3)]=e.target.value;clearTimeout(o1.t);o1.t=setTimeout(()=>o1Redo(true),200);};
  g('o1-more').onclick=()=>{o1.shown+=30;o1Render();};
  const sortBy=k=>{if(o1.sk===k)o1.sd=-o1.sd;else{o1.sk=k;o1.sd=1;}o1Redo(false);};
  g('o1-tab').addEventListener('keydown',e=>{const h=e.target.closest('.srt');if(h&&(e.key==='Enter'||e.key===' ')){e.preventDefault();sortBy(h.dataset.k);}});
  g('o1-tab').addEventListener('click',e=>{const h=e.target.closest('.srt');if(h){sortBy(h.dataset.k);return;}
    const l=e.target.closest('.o1-lnk');if(l){e.preventDefault();const id=l.dataset.id;ld.sel=id;showTab('leds');requestAnimationFrame(()=>requestAnimationFrame(()=>ldSelect(id,true)));return;}
    const r=e.target.closest('.cand');if(r){o1.sel=r.dataset.id;o1Render();}});
  g('o1-sel').addEventListener('click',e=>{if(e.target.id==='o1-b'&&o1.sel){cmp.B=o1.sel;cmp.keepFrame=false;cmpUpdate(true);}});
  const cv=g('o1-cv');cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.clientWidth/r.width,y=(e.clientY-r.top)*cv.clientHeight/r.height;
    let b=null,bd=144;for(const q of o1.pts){const d=(q.x-x)**2+(q.y-y)**2;if(d<bd){bd=d;b=q;}}if(b){o1.sel=b.id;const i=o1.res.findIndex(z=>z.it.id===b.id);if(i>=o1.shown)o1.shown=i+1;o1Render();}});
})();
