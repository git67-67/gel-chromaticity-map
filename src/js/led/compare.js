/* LED compare tab: how every filter / pigment moves when light A is swapped for light B, plus what each light does to hue and
   saturation (TM-30 colour vector graphic). A and B are library ids; 'ref:' + id is the ideal reference light of that LED. */
const cmp={A:'std:LED-B3',B:'',mode:'uv',mag:1,wp:{mode:'none',cat:'bfd',anchor:'A',dmode:'full',dman:1,LA:64,F:1},planck:true,sel:null,q:'',sort:'shift',visible:false,dirty:true,find:false,res:null,view:null,tolC:150,tolD:0.003,candSort:'rf',candA:'',cands:[]};
const cmQ={}; // quality cache for reference lights
function cmLight(id){ // -> {id,name,spd,q} or null
  if(!id)return null;
  if(id.startsWith('ref:')){const base=LED.items.get(id.slice(4)),r=base&&ledReference(base);if(!r)return null;
    const key=id+'|'+base.q.cct;if(!cmQ[key])cmQ[key]=quality(r.spd);return{id,name:'Ideal reference for '+base.name+' ('+Math.round(r.cct)+' K)',spd:r.spd,q:cmQ[key]};}
  const it=LED.items.get(id);return it?{id,name:it.name,spd:it.spd,q:it.q}:null;}
const cmSet=(k,id)=>{cmp[k]=id;cmp.keepFrame=false;cmpUpdate(true);};
const cmPickA=mountPicker($('cm-pickA'),{get:()=>cmp.A,set:id=>cmSet('A',id)});
const cmPickB=mountPicker($('cm-pickB'),{get:()=>cmp.B&&!cmp.B.startsWith('ref:')?cmp.B:'',set:id=>cmSet('B',id),text:()=>cmp.B&&cmp.B.startsWith('ref:')?'Ideal reference light (CRI 100)':''});
const cmReadout=(L)=>{if(!L)return'<div class="note">Pick a light.</div>';const q=L.q,a=q.cri&&q.cri.Ra,t=q.tm30;
  return[['CCT',fmtK(q.cct)],['Duv',f0(q.duv,4)],['CRI Ra',f0(a,0)],['R9',f0(q.cri&&q.cri.R[8],0)],['Rf',f0(t&&t.Rf,0)],['Rg',f0(t&&t.Rg,0)]].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');};

/* ---- white-point handling ----
   Two lights have different white points, so every colour moves partly just because the whole picture got warmer or cooler.
   A "white-point treatment" maps the colours seen under the source light to what they would be after the eye adapts to the
   target white. Methods: none; plain shift in u'v'; the CRI (CIE 13.3) von Kries in CIE 1960 u,v; the TM-30/CIECAM02 step
   (CAT02, full adaptation); or any matrix CAT from the Adaptation lab with a degree of adaptation D.
   Ws, Wd = {xyz:[X,Y,Z with Y=1], up, vp} of the source and target white. Returns f(xyz, chroma) -> {up,vp} or null. */
function cmpAdapter(wp,Ws,Wd){
  if(wp.mode==='none')return null;
  if(wp.mode==='shift'){const dU=Wd.up-Ws.up,dV=Wd.vp-Ws.vp;return(xyz,c)=>({up:c.up+dU,vp:c.vp+dV});}
  if(wp.mode==='cri'){const cd=(u,v)=>[(4-u-10*v)/v,(1.708*v+.404-1.481*u)/v],[ck,dk]=cd(Ws.up,Ws.vp*2/3),[cr,dr]=cd(Wd.up,Wd.vp*2/3);
    return(xyz,c)=>{const[cc,dd]=cd(c.up,c.vp*2/3),ca=cr/ck*cc,da=dr/dk*dd,den=16.518+1.481*ca-da;return{up:(10.872+.404*ca-4*da)/den,vp:1.5*5.52/den};};}
  const C=CATS.find(x=>x.id===(wp.mode==='tm30'?'cat02':wp.cat))||CATS[0],D=wp.mode==='tm30'?1:degreeD(wp.dmode,wp.dman,wp.LA,wp.F),Mi=inv3(C.M),g=catGains(C.M,Ws.xyz,Wd.xyz,D);
  return xyz=>{const p=ptOf(catApply(C.M,Mi,g,xyz));return p?{up:p.u,vp:p.v}:null;};}
function cmpWpName(wp){return wp.mode==='none'?'no white-point correction':wp.mode==='shift'?'plain u′v′ shift':wp.mode==='cri'?'CRI von Kries (CIE 1960 u,v)':wp.mode==='tm30'?'TM-30 / CIECAM02 (CAT02, D = 1)':(CATS.find(x=>x.id===wp.cat)||CATS[0]).name+(wp.dmode==='full'?', D = 1':wp.dmode==='manual'?', D = '+(+wp.dman).toFixed(2):', D from viewing conditions');}
const cmpPt=(up,vp)=>{const dd=6*up-16*vp+12;return{up,vp,x:9*up/dd,y:4*vp/dd,u:up,v:vp*2/3};};

/* ---- calculation ---- */
function cmpCompute(){const LA=cmLight(cmp.A),LB=cmLight(cmp.B);if(!LA||!LB){cmp.res=null;return;}
  const sa=sums(LA.spd),sb=sums(LB.spd),wA=chroma(...sa),wB=chroma(...sb),rows=[],byId=new Map(),wp=cmp.wp;
  const nW=(s,w)=>({xyz:[s[0]/s[1],1,s[2]/s[1]],up:w.up,vp:w.vp});
  const fromA=wp.anchor==='B';   // anchor 'A': B's colours are moved to A's white. anchor 'B': A's colours are moved to B's white.
  const adapt=cmpAdapter(wp,fromA?nW(sa,wA):nW(sb,wB),fromA?nW(sb,wB):nW(sa,wA));
  for(const f of st.filters.values()){if(!f.T)f.T=resample(f.wl,f.v,st.edge);
    const ta=sums(LA.spd,f.T),tb=sums(LB.spd,f.T);if(!(ta[1]>1e-9&&tb[1]>1e-9))continue;
    let A=chroma(...ta),B=chroma(...tb);
    if(adapt){const m=fromA?adapt([ta[0]/sa[1],ta[1]/sa[1],ta[2]/sa[1]],A):adapt([tb[0]/sb[1],tb[1]/sb[1],tb[2]/sb[1]],B);if(!m)continue;
      if(fromA)A=cmpPt(m.up,m.vp);else B=cmpPt(m.up,m.vp);}
    const row={f,A,B,shift:Math.hypot(B.up-A.up,B.vp-A.vp),yA:ta[1]/sa[1],yB:tb[1]/sb[1]};rows.push(row);byId.set(f.id,row);}
  const s=rows.map(r=>r.shift).sort((a,b)=>a-b),pct=p=>s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)))]:NaN;
  cmp.res={LA,LB,wA,wB,rows,byId,stats:{mean:s.length?s.reduce((a,b)=>a+b,0)/s.length:NaN,median:pct(.5),p90:pct(.9),max:s.length?s[s.length-1]:NaN,n:s.length},
    wShift:Math.hypot(wB.up-wA.up,wB.vp-wA.vp)};}
function cmpColor(p){const c=rgbOfXY(p.x,p.y);return'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';}

/* ---- chart ---- */
function cmDraw(v){const R=cmp.res;if(!R)return;const ctx=v.ctx,k=cmp.mag,ss=cmp.sel&&R.byId.get(cmp.sel);
  const pt=p=>v.px(...v.crdLoc(p)),mix=(A,B)=>({up:A.up+(B.up-A.up)*k,vp:A.vp+(B.vp-A.vp)*k});
  const crdOf=p=>v.mode==='xy'?(()=>{const d=6*p.up-16*p.vp+12;return[9*p.up/d,4*p.vp/d];})():[p.up,p.vp],px2=p=>{const c=crdOf(p);return v.px(c[0],c[1]);};
  // whiskers
  ctx.lineWidth=1;for(const r of R.rows){if(r===ss)continue;const a=pt(r.A),b=px2(mix(r.A,r.B));ctx.strokeStyle=cols.fg;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  ctx.globalAlpha=1;
  for(const r of R.rows){const a=pt(r.A),b=px2(mix(r.A,r.B));
    ctx.strokeStyle=cols.fg;ctx.globalAlpha=.55;ctx.lineWidth=1;ctx.beginPath();ctx.arc(a[0],a[1],2.4,0,7);ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle=cmpColor(r.B);ctx.strokeStyle=cols.plotbg;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(b[0],b[1],3.6,0,7);ctx.fill();ctx.stroke();v.hits.push({x:b[0],y:b[1],r:3.6,id:r.f.id});}
  if(ss){const a=pt(ss.A),b=px2(mix(ss.A,ss.B));ctx.strokeStyle=cols.fg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.fillStyle=cmpColor(ss.A);ctx.beginPath();ctx.arc(a[0],a[1],5,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle=cmpColor(ss.B);ctx.beginPath();ctx.arc(b[0],b[1],6,0,7);ctx.fill();ctx.stroke();}
  // white points
  for(const [w,l,c] of [[R.wA,'A',lc.k[0]],[R.wB,'B',lc.k[1]]]){const p=pt(w);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p[0]-6,p[1]);ctx.lineTo(p[0]+6,p[1]);ctx.moveTo(p[0],p[1]-6);ctx.lineTo(p[0],p[1]+6);ctx.stroke();
    ctx.fillStyle=c;ctx.font='bold 11px '+FM;ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('white '+l,p[0]+8,p[1]-4);}}
function cmTip(h,p){const tip=$('cm-tip'),R=cmp.res;if(!h||!R){tip.hidden=true;return;}const r=R.byId.get(h.id);if(!r){tip.hidden=true;return;}
  tip.innerHTML=`<b>${esc(r.f.name)}</b><span>shift Δu′v′ ${f4(r.shift)}</span><span>Y under A ${(r.yA*100).toFixed(1)} % · under B ${(r.yB*100).toFixed(1)} %</span>`;
  tip.hidden=false;const W=cmp.view.W,r0=cmp.view.cv.getBoundingClientRect(),sx=r0.width/W;
  tip.style.left=Math.min(p[0]*sx+12,r0.width-tip.offsetWidth-6)+'px';tip.style.top=Math.max(4,Math.min(p[1]*sx+12,r0.height-tip.offsetHeight-6))+'px';}
cmp.view=new CView($('cm-cv'),$('cm-plot'),{onDraw:cmDraw,onHover:cmTip,onClick:h=>cmSelect(h.id),planck:()=>cmp.planck});
function cmFrame(){const R=cmp.res;if(!R||!R.rows.length)return;const v=cmp.view,pts=[];
  const crdOfRow=p=>v.mode==='xy'?[p.x,p.y]:[p.up,p.vp];
  for(const r of R.rows)pts.push(crdOfRow(r.A),crdOfRow(r.B));
  pts.push(crdOfRow(R.wA),crdOfRow(R.wB));
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),a=Math.min(...xs),b=Math.min(...ys),c=Math.max(...xs),d=Math.max(...ys);
  const sp=Math.max(c-a,d-b,.02),hs=sp/2+sp*.08,mx=(a+c)/2,my=(b+d)/2;v.frame(mx-hs*1.15,my-hs,mx+hs*1.15,my+hs);}

/* ---- candidates (same CCT and Duv as A) ---- */
function cmCands(){const A=LED.items.get(cmp.A);cmp.cands=[];const el=$('cm-cands');
  if(!A||!A.q.ok){el.innerHTML='<div class="note">Light A needs a CCT (it is too far from the Planckian locus) to look for partners.</div>';return;}
  const tc=parseFloat($('cm-tc').value),td=parseFloat($('cm-td').value);cmp.tolC=isFinite(tc)?tc:150;cmp.tolD=isFinite(td)?td:.003;
  const list=[];
  for(const it of ledAll()){if(it===A||!it.q.ok)continue;const dc=it.q.cct-A.q.cct,dd=it.q.duv-A.q.duv;
    if(Math.abs(dc)>cmp.tolC||Math.abs(dd)>cmp.tolD)continue;list.push({it,dc,dd,du:Math.hypot(it.q.up-A.q.up,it.q.vp-A.q.vp)});}
  const S=cmp.candSort,key={rf:x=>ledVal(x.it,'Rf'),rfd:x=>-ledVal(x.it,'Rf'),ra:x=>ledVal(x.it,'Ra'),rg:x=>-ledVal(x.it,'Rg'),rgl:x=>ledVal(x.it,'Rg'),dd:x=>x.du}[S];
  list.sort((a,b)=>key(a)-key(b));cmp.cands=list;
  el.innerHTML=list.length?`<table class="cmp-tab"><tr><th>Light</th><th>ΔCCT</th><th>ΔDuv</th><th>Ra</th><th>Rf</th><th>Rg</th></tr>${list.slice(0,200).map(c=>`<tr class="cand" data-id="${esc(c.it.id)}" aria-current="${c.it.id===cmp.B}"><td>${esc(c.it.name)}</td><td>${c.dc>0?'+':''}${Math.round(c.dc)}</td><td>${c.dd>0?'+':''}${c.dd.toFixed(4)}</td><td>${Math.round(ledVal(c.it,'Ra'))}</td><td>${Math.round(ledVal(c.it,'Rf'))}</td><td>${Math.round(ledVal(c.it,'Rg'))}</td></tr>`).join('')}</table>${list.length>200?`<p class="hint">Showing the first 200 of ${list.length}.</p>`:''}`
    :`<div class="note">No other light within ±${cmp.tolC} K and |ΔDuv| ≤ ${cmp.tolD}. Widen the limits, or import more lights.</div>`;}
$('cm-cands').addEventListener('click',e=>{const r=e.target.closest('.cand');if(r)cmSet('B',r.dataset.id);});
for(const id of ['cm-tc','cm-td'])$(id).oninput=()=>{clearTimeout(cmp._t);cmp._t=setTimeout(cmCands,200);};
$('cm-ts').onchange=e=>{cmp.candSort=e.target.value;cmCands();};

/* ---- lists and detail ---- */
const cmMatch=f=>{if(!cmp.q)return true;const n=(f.code+' '+f.name).toLowerCase();return cmp.q.toLowerCase().split(/\s+/).every(t=>n.includes(t));};
function cmRows(){const R=cmp.res;if(!R)return[];const a=R.rows.filter(r=>cmMatch(r.f));
  if(cmp.sort==='shift')a.sort((x,y)=>y.shift-x.shift);else if(cmp.sort==='small')a.sort((x,y)=>x.shift-y.shift);else a.sort((x,y)=>natCmp(x.f,y.f));return a;}
function cmRenderList(){const R=cmp.res,rows=cmRows();$('cm-count').textContent=R?`(${rows.length}${rows.length!==R.rows.length?' of '+R.rows.length:''})`:'';
  $('cm-list').innerHTML=rows.length?rows.slice(0,400).map(r=>{const f=r.f,rest=f.name.startsWith(f.code)?f.name.slice(f.code.length).trim():f.name;
    return`<button class="item" data-id="${esc(f.id)}" aria-current="${f.id===cmp.sel}"><span class="sw" style="background:${cmpColor(r.A)}"></span><span class="code">${esc(f.code)}</span><span class="nm" title="${esc(f.name)}">${esc(rest)}</span><span class="num">${(r.shift*1000).toFixed(1)}</span><span class="num"><i class="dsw" style="background:${cmpColor(r.B)};margin:0"></i></span></button>`;}).join('')+(rows.length>400?'<div class="hint" style="padding:6px">Showing 400; search to narrow.</div>':'')
    :'<div class="empty">'+(R?tk('No {filters} match.'):'Pick two lights.')+'</div>';}
$('cm-list').addEventListener('click',e=>{const b=e.target.closest('.item');if(b)cmSelect(b.dataset.id);});
$('cm-q').oninput=e=>{cmp.q=e.target.value.trim();cmRenderList();};$('cm-sort').onchange=e=>{cmp.sort=e.target.value;cmRenderList();};
function cmSelect(id){cmp.sel=id;cmRenderList();cmRenderDetail();cmp.view.request();
  const el=$('cm-list').querySelector('[aria-current="true"]');if(el)el.scrollIntoView({block:'nearest'});}
function cmRenderDetail(){const R=cmp.res,r=R&&cmp.sel&&R.byId.get(cmp.sel),el=$('cm-detail');
  if(!r){el.innerHTML='<h2>'+tk('Selected {filter}')+'</h2><div class="empty">'+tk('Select a {filter} in the list or on the diagram.')+'</div>';return;}
  el.innerHTML=`<h3><span class="sw" style="background:${cmpColor(r.A)};width:18px;height:18px"></span><span class="sw" style="background:${cmpColor(r.B)};width:18px;height:18px;margin-left:2px"></span>${esc(r.f.name)}</h3>
  <div class="readout" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[['Shift Δu′v′',f4(r.shift)],['u′ A → B',f3(r.A.up)+' → '+f3(r.B.up)],['v′ A → B',f3(r.A.vp)+' → '+f3(r.B.vp)],[tk('{Out}')+' A',(r.yA*100).toFixed(1)+' %'],[tk('{Out}')+' B',(r.yB*100).toFixed(1)+' %']].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
  <canvas id="cm-dsp" class="sp" style="margin-top:10px"></canvas>
  <div class="legend"><span><i style="border-color:${lc.k[0]}"></i>Light that leaves, A</span><span><i style="border-color:${lc.k[1]}"></i>B</span><span><i style="border-color:var(--fg);border-top-style:dashed"></i>${tk('{curve}')}</span></div>`;
  const mulv=(S,T)=>{const o=new Float64Array(N);for(let i=0;i<N;i++)o[i]=S[i]*T[i];return o;};
  plotSpectra($('cm-dsp'),[{spd:r.f.T,color:cols.fg,dash:[4,3],width:1.2},{spd:mulv(R.LA.spd,r.f.T),color:lc.k[0],width:1.8},{spd:mulv(R.LB.spd,r.f.T),color:lc.k[1],width:1.8}],{h:150});}
function cmRenderPairs(){const R=cmp.res,el=$('cm-pairs');if(!R){el.innerHTML='';return;}
  el.innerHTML=[...R.rows].sort((a,b)=>b.shift-a.shift).slice(0,24).map(r=>`<button class="pair" data-id="${esc(r.f.id)}" aria-current="${r.f.id===cmp.sel}"><div class="sws"><div style="background:${cmpColor(r.A)}"></div><div style="background:${cmpColor(r.B)}"></div></div><div class="cap"><b>${esc(r.f.name)}</b><span>Δu′v′ ${(r.shift*1000).toFixed(1)}e-3</span></div></button>`).join('');}
$('cm-pairs').addEventListener('click',e=>{const b=e.target.closest('.pair');if(b)cmSelect(b.dataset.id);});
function cmRenderSide(){const R=cmp.res;if(!R){$('cm-sum').innerHTML='Pick light A and light B to compare them.';
    for(const id of ['cm-tab','cm-cvgleg','cm-spleg'])$(id).innerHTML='';return;}
  const s=R.stats,mx=R.rows.reduce((m,r)=>r.shift>m.shift?r:m,R.rows[0]);
  $('cm-sum').innerHTML=s.n?`Swapping <b>${esc(R.LA.name)}</b> for <b>${esc(R.LB.name)}</b> moves the average ${tk('{filter}')} by Δu′v′ <b>${f4(s.mean)}</b> (median ${f4(s.median)}, 90th percentile ${f4(s.p90)}). The biggest change is <b>${esc(mx.f.name)}</b> at <b>${f4(mx.shift)}</b>. The two white points differ by ${f4(R.wShift)}.${cmp.wp.mode==='none'?'':' Method: '+cmpWpName(cmp.wp)+', colours moved to the white of light '+cmp.wp.anchor+'.'}`
    :'None of the items produce light under both lights.';
  const a=R.LA.q,b=R.LB.q,d=(x,y,dg)=>x==null||y==null?'—':((y-x>=0?'+':'')+(y-x).toFixed(dg));
  const row=(n,x,y,dg)=>`<tr><td>${n}</td><td>${f0(x,dg)}</td><td>${f0(y,dg)}</td><td>${d(x,y,dg)}</td></tr>`;
  $('cm-tab').innerHTML=`<table class="cmp-tab" style="margin-top:10px"><tr><th></th><th>A</th><th>B</th><th>B − A</th></tr>${row('CCT (K)',a.cct,b.cct,0)}${row('Duv',a.duv,b.duv,4)}${row('CRI Ra',a.cri&&a.cri.Ra,b.cri&&b.cri.Ra,1)}${row('R9',a.cri&&a.cri.R[8],b.cri&&b.cri.R[8],1)}${row('TM-30 Rf',a.tm30&&a.tm30.Rf,b.tm30&&b.tm30.Rf,1)}${row('TM-30 Rg',a.tm30&&a.tm30.Rg,b.tm30&&b.tm30.Rg,1)}</table>`;
  const leg=[[lc.k[0],'A · '+R.LA.name],[lc.k[1],'B · '+R.LB.name]].map(([c,n])=>`<span><i style="border-color:${c}"></i>${esc(n)}</span>`).join('');
  $('cm-cvgleg').innerHTML=leg;$('cm-spleg').innerHTML=leg;}
function cmDrawSide(){const R=cmp.res;if(!R){return;}
  plotCVG($('cm-cvg'),[{t:R.LA.q.tm30,color:lc.k[0]},{t:R.LB.q.tm30,color:lc.k[1]}]);
  plotSpectra($('cm-sp'),[{spd:R.LA.spd,color:lc.k[0],width:2,fill:true},{spd:R.LB.spd,color:lc.k[1],width:2,fill:true}]);}

/* ---- update ---- */
function cmpUpdate(reframe){if(!cmp.visible){cmp.dirty=true;return;}cmp.dirty=false;
  if(!cmp.B&&cmp.A)cmp.B='ref:'+cmp.A;
  if(cmp.B&&cmp.B.startsWith('ref:'))cmp.B='ref:'+cmp.A;
  cmPickA.refresh();cmPickB.refresh();
  const LA=cmLight(cmp.A),LB=cmLight(cmp.B);$('cm-readA').innerHTML=cmReadout(LA);$('cm-readB').innerHTML=cmReadout(LB);
  cmpCompute();cmCands();cmRenderSide();cmRenderList();cmRenderPairs();
  if(cmp.res&&(!cmp.sel||!cmp.res.byId.has(cmp.sel)))cmp.sel=cmRows()[0]?.f.id||null;
  cmRenderDetail();cmDrawSide();
  const hint='Open dots are the colours under A, filled dots under B (drawn in the colour of the light they give). The line joins the two'+(cmp.mag>1?', stretched ×'+cmp.mag:'')+'. Crosses are the white points.';
  $('cm-note').textContent=hint;
  if(reframe||!cmp.keepFrame){cmp.view.size();cmFrame();cmp.keepFrame=true;}cmp.view.request();}
function cmpRefresh(){if(cmp.visible){cmp.dirty=true;cmpUpdate(false);}else cmp.dirty=true;}
LED.listeners.push(()=>{if(cmp.A&&!LED.items.has(cmp.A))cmp.A='std:LED-B3';if(cmp.B&&!cmp.B.startsWith('ref:')&&!LED.items.has(cmp.B))cmp.B='';cmpRefresh();});

/* ---- controls ---- */
$('cm-swap').onclick=()=>{const A=cmp.A,B=cmp.B;if(!B||B.startsWith('ref:'))return;cmp.A=B;cmp.B=A;cmp.keepFrame=false;cmpUpdate(true);};
$('cm-ref').onclick=()=>{cmp.B='ref:'+cmp.A;cmpUpdate(true);};
function cmSpace(s){cmp.mode=cmp.view.mode=s;$('cm-uv').setAttribute('aria-pressed',s==='uv');$('cm-xy').setAttribute('aria-pressed',s==='xy');cmp.view.V.user=false;cmp.view.fit();cmFrame();cmp.view.request();}
$('cm-uv').onclick=()=>cmSpace('uv');$('cm-xy').onclick=()=>cmSpace('xy');
$('cm-mag').oninput=e=>{cmp.mag=+e.target.value;$('cm-magv').textContent='×'+cmp.mag;$('cm-note').textContent=cmp.mag>1?'Shifts are stretched ×'+cmp.mag+' so small differences are visible; the open dot is the true colour under A.':'Open dots are the colours under A, filled dots under B. The line joins the two. Crosses are the white points.';cmp.view.request();};
/* white-point options */
(function(){const sel=$('cm-wp');
  sel.innerHTML=[['none','Off: show the real difference'],['shift','Plain shift in u′v′ (simple)'],['cri','CRI method: von Kries in CIE 1960 u,v'],['tm30','TM-30 method: CIECAM02 (CAT02, complete adaptation)'],...CATS.map(c=>['cat:'+c.id,'Matrix CAT: '+c.name])].map(([v,t])=>`<option value="${v}">${t}</option>`).join('');})();
function cmWpSync(){const w=cmp.wp,isCat=w.mode==='cat';
  $('cm-wp').value=w.mode==='cat'?'cat:'+w.cat:w.mode;$('cm-wp-anchor').value=w.anchor;$('cm-wp-dmode').value=w.dmode;$('cm-wp-dman').value=w.dman;$('cm-wp-la').value=w.LA;$('cm-wp-f').value=w.F;
  $('cm-wp-dmode').disabled=!isCat;$('cm-wp-dman').disabled=!isCat||w.dmode!=='manual';$('cm-wp-la').disabled=!isCat||w.dmode!=='view';$('cm-wp-f').disabled=!isCat||w.dmode!=='view';
  const T={none:'The shifts are the real difference between the two lights, including the overall change of white point.',
    shift:'Every colour under B is moved by the same amount in u′v′: the difference between the two white points. Fast and easy to see, but it ignores that the eye adapts differently to different colours.',
    cri:'The method CRI (CIE 13.3) uses: each colour is converted to CIE 1960 u,v, then a von Kries adaptation (scaling the c and d terms) maps B’s white onto A’s white.',
    tm30:'The step inside TM-30 (CIECAM02): the CAT02 matrix, scaling cone-like responses, with complete adaptation (D = 1) to the white.',
    cat:'A matrix chromatic adaptation transform in XYZ: convert to cone-like responses with the transform’s matrix, scale each by (target white ÷ source white), convert back. “D” sets how complete the adaptation is.'};
  $('cm-wp-expl').textContent=T[w.mode];}
function cmWpChange(fn){fn(cmp.wp);cmWpSync();cmp.keepFrame=false;cmpUpdate(false);}
$('cm-wp').onchange=e=>cmWpChange(w=>{const v=e.target.value;if(v.startsWith('cat:')){w.mode='cat';w.cat=v.slice(4);}else w.mode=v;});
$('cm-wp-anchor').onchange=e=>cmWpChange(w=>{w.anchor=e.target.value;});
$('cm-wp-dmode').onchange=e=>cmWpChange(w=>{w.dmode=e.target.value;});
$('cm-wp-dman').oninput=e=>cmWpChange(w=>{w.dman=Math.max(0,Math.min(1,+e.target.value||0));});
$('cm-wp-la').oninput=e=>cmWpChange(w=>{w.LA=Math.max(1,+e.target.value||64);});
$('cm-wp-f').onchange=e=>cmWpChange(w=>{w.F=+e.target.value;});
cmWpSync();
$('cm-planck').onchange=e=>{cmp.planck=e.target.checked;cmp.view.request();};
$('cm-frame').onclick=cmFrame;$('cm-whole').onclick=()=>{cmp.view.fit();cmp.view.request();};$('cm-zfit').onclick=$('cm-whole').onclick;
$('cm-zin').onclick=()=>cmp.view.zoomAt((cmp.view.W+cmp.view.PAD.l-cmp.view.PAD.r)/2,(cmp.view.H-cmp.view.PAD.b+cmp.view.PAD.t)/2,1.5);
$('cm-zout').onclick=()=>cmp.view.zoomAt((cmp.view.W+cmp.view.PAD.l-cmp.view.PAD.r)/2,(cmp.view.H-cmp.view.PAD.b+cmp.view.PAD.t)/2,1/1.5);
function cmpShow(){requestAnimationFrame(()=>{const f=cmp.find;cmp.find=false;cmpUpdate(true);if(f)$('cm-cands').scrollIntoView({block:'center'});});}
new ResizeObserver(()=>{if(cmp.visible){cmp.view.size();cmDrawSide();}}).observe($('cm-plot'));
function cmTheme(){if(cmp.visible){cmp.view.bgKey='';cmpUpdate(false);}}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',cmTheme);
new MutationObserver(cmTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
