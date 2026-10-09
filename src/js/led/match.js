/* LED compare, section "Find a filter for a colour": take one filter under light A, note the colour it lands on, and find the filters
   that give the closest colour under light B (for example: a 2700 K LED with a colour filter, and now a 6500 K LED needs the same colour).
   Compared as emitted colour in u'v' (no white-point adaptation), at equal luminous flux of the two bare lights. Lights A and B are
   the ones chosen above, library or synthetic. */
const m1={visible:false,f:null,fq:'',mode:'colour',res:[],tgt:null,sel:null,shown:15,raf:0,pts:[]};
const m1Pt=(s,s0)=>{const c=chroma(...s),q=cctDuv(c.u,c.v);return{...c,cct:q.cct,duv:q.duv,y:c.y,Y:s[1]/s0[1]};};
function m1Compute(){m1.res=[];m1.tgt=null;const f=m1.f&&st.filters.get(m1.f),LA=cmLight(cmp.A),LB=cmLight(cmp.B);if(!f||!LA||!LB)return;
  if(!f.T)f.T=resample(f.wl,f.v,st.edge);
  const sa=sums(LA.spd),sb=sums(LB.spd),wA=chroma(...sa),ta=sums(LA.spd,f.T),tb=sums(LB.spd,f.T);if(!(ta[1]>1e-9))return;
  const T=m1Pt(ta,sa),same=tb[1]>1e-9?m1Pt(tb,sb):null,PT=luvOf(T.Y,T.up,T.vp,1,wA.up,wA.vp);
  m1.tgt={T,same,f,LA,LB,white:[m1Pt(sa,sa),m1Pt(sb,sb)]};
  for(const g of st.filters.values()){if(!g.T)g.T=resample(g.wl,g.v,st.edge);const s=sums(LB.spd,g.T);if(!(s[1]>1e-9))continue;
    const C=m1Pt(s,sb),P=luvOf(C.Y,C.up,C.vp,1,wA.up,wA.vp);
    m1.res.push({g,C,d:Math.hypot(C.up-T.up,C.vp-T.vp),dE:apparentParts(PT,P).dE,dL:P[0]-PT[0]});}
  const k=m1.mode==='colour'?r=>r.d:r=>r.dE;m1.res.sort((a,b)=>k(a)-k(b));}
const m1Fmt=p=>p?`x ${p.x.toFixed(4)}, y ${p.y.toFixed(4)} · u′ ${p.up.toFixed(4)}, v′ ${p.vp.toFixed(4)}${p.cct?' · '+Math.round(p.cct)+' K, Duv '+(p.duv>=0?'+':'−')+Math.abs(p.duv).toFixed(4):''}`:'no light gets through';
function m1Sync(){const q=m1.fq.toLowerCase().split(/\s+/).filter(Boolean),list=[...st.filters.values()].filter(x=>{const n=(x.code+' '+x.name).toLowerCase();return q.every(t=>n.includes(t));}),
    sel=$('m1-f'),shown=list.slice(0,300);sel.innerHTML=shown.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')||'<option value="">No match</option>';
  const f=m1.f&&st.filters.get(m1.f);if(f&&shown.includes(f))sel.value=f.id;else if(shown.length){m1.f=shown[0].id;sel.value=m1.f;}
  $('m1-mode').value=m1.mode;}
function m1Render(){lbRender('m1-lights',true);const el=$('m1-sum'),tab=$('m1-tab'),G=m1.tgt;$('m1-more').hidden=true;
  if(!G){el.textContent=cmLight(cmp.A)&&cmLight(cmp.B)?'This filter lets no light through under light A.':'Pick lights A and B in LED compare.';tab.innerHTML='';m1Plot();return;}
  const R=m1.res,f=G.f,top=R[0];
  el.innerHTML=`<div class="readout" style="grid-template-columns:1fr"><div class="kv"><span>${esc(f.name)} under A (${esc(G.LA.name)})</span><b>${m1Fmt(G.T)}</b></div>`+
    `<div class="kv"><span>the same under B (${esc(G.LB.name)})</span><b>${m1Fmt(G.same)}</b></div>`+
    `<div class="kv"><span>bare light white A / B</span><b>${m1Fmt(G.white[0])} / ${G.white[1].cct?Math.round(G.white[1].cct)+' K':'—'}</b></div></div>`+
    (top?`<p class="note">Under B the closest match to that colour is <b>${esc(top.g.name)}</b> (Δu′v′ ${(top.d*1000).toFixed(1)} × 10⁻³, ${cmLab().E} ${top.dE.toFixed(1)}), against ${G.same?((Math.hypot(G.same.up-G.T.up,G.same.vp-G.T.vp))*1000).toFixed(1)+' × 10⁻³ for the same filter':'no light for the same filter'}.</p>`:'<p class="note">No filter lets light through under B.</p>');
  const n=Math.min(m1.shown,R.length),y0=G.T.Y;
  tab.innerHTML=`<table class="cmp-tab"><tr><th>#</th><th>Filter</th><th>Colour</th><th>Δu′v′·10³</th><th>Light out</th><th>${cmLab().E}</th></tr>${R.slice(0,n).map((r,i)=>`<tr class="cand" data-id="${esc(r.g.id)}" aria-current="${r.g.id===m1.sel}"><td>${i+1}</td><td>${esc(r.g.name)}</td><td><i class="dsw" style="background:${cmpColor(G.T)};margin:0 2px 0 0"></i><i class="dsw" style="background:${cmpColor(r.C)};margin:0"></i></td><td>${(r.d*1000).toFixed(1)}</td><td>${(r.C.Y*100).toFixed(1)} % <small>(target ${(y0*100).toFixed(1)} %)</small></td><td>${r.dE.toFixed(1)}</td></tr>`).join('')}</table>`;
  $('m1-more').hidden=n>=R.length;$('m1-more').textContent='Show '+Math.min(15,R.length-n)+' more ('+n+' of '+R.length+')';m1Plot();}
function m1Plot(){const cv=$('m1-cv');if(!cv)return;if(!cols.fg)readCols();const {c,w,h}=prepCanvas(cv,260),G=m1.tgt;m1.pts=[];c.fillStyle=cols.plotbg;c.fillRect(0,0,w,h);
  if(!G||!m1.res.length)return;const R=m1.res,near=R.slice(0,Math.min(R.length,40)),span=Math.max(.02,(near[near.length-1].d||0)*1.4,(G.same?Math.hypot(G.same.up-G.T.up,G.same.vp-G.T.vp):0)*1.2);
  const P={l:44,r:12,t:10,b:30},sc=Math.min(w-P.l-P.r,h-P.t-P.b)/2/span,cx=(P.l+w-P.r)/2,cy=(P.t+h-P.b)/2,X=u=>cx+(u-G.T.up)*sc,Y=v=>cy-(v-G.T.vp)*sc;
  c.strokeStyle=cols.grid;c.fillStyle=cols.muted;c.font='11px '+FM;c.lineWidth=1;c.textAlign='center';c.textBaseline='top';
  for(const f of [-1,-.5,0,.5,1]){const u=G.T.up+f*span,v=G.T.vp+f*span;c.beginPath();c.moveTo(X(u),P.t);c.lineTo(X(u),h-P.b);c.stroke();c.fillText(u.toFixed(3),X(u),h-P.b+5);
    c.beginPath();c.moveTo(P.l,Y(v));c.lineTo(w-P.r,Y(v));c.stroke();c.textAlign='right';c.textBaseline='middle';c.fillText(v.toFixed(3),P.l-5,Y(v));c.textAlign='center';c.textBaseline='top';}
  c.textAlign='left';c.fillText('u′',w-P.r-14,h-P.b-14);c.fillText('v′ ↑',P.l+4,P.t+2);
  for(const r of R){const x=X(r.C.up),y=Y(r.C.vp);if(x<P.l||x>w-P.r||y<P.t||y>h-P.b)continue;const sel=r.g.id===m1.sel,top=r===R[0];
    c.fillStyle=cmpColor(r.C);c.strokeStyle=sel||top?cols.fg:cols.muted;c.lineWidth=sel||top?2:.8;c.beginPath();c.arc(x,y,sel?5.5:top?5:3.2,0,7);c.fill();c.stroke();m1.pts.push({x,y,id:r.g.id});}
  if(G.same){const x=X(G.same.up),y=Y(G.same.vp);c.strokeStyle=cols.fg;c.setLineDash([3,3]);c.lineWidth=1.4;c.beginPath();c.arc(x,y,6,0,7);c.stroke();c.setLineDash([]);c.fillStyle=cols.fg;c.textAlign='left';c.textBaseline='bottom';c.fillText('same filter under B',x+8,y-4);}
  c.strokeStyle=lc.k[0];c.lineWidth=2.2;c.beginPath();c.moveTo(cx-8,cy);c.lineTo(cx+8,cy);c.moveTo(cx,cy-8);c.lineTo(cx,cy+8);c.stroke();c.fillStyle=lc.k[0];c.font='bold 11px '+FM;c.textAlign='left';c.textBaseline='bottom';c.fillText('target',cx+10,cy-6);}
function m1Update(){if(!m1.visible||!$('m1-p'))return;if(m1.raf)return;m1.raf=requestAnimationFrame(()=>{m1.raf=0;if(!cmp.B&&cmp.A)cmp.B='ref:'+cmp.A;
  if(!m1.f||!st.filters.has(m1.f))m1.f=(o1.f&&st.filters.has(o1.f)?o1.f:null)||(cmp.sel&&st.filters.has(cmp.sel)?cmp.sel:[...st.filters.keys()][0])||null;
  m1Sync();m1Compute();m1.shown=Math.max(15,Math.min(m1.shown,m1.res.length));m1Render();});}
function m1Redo(reset){if(reset)m1.shown=15;m1Compute();m1Render();}
(function(){const g=id=>$(id);if(!g('m1-f'))return;
  g('m1-fq').oninput=e=>{m1.fq=e.target.value.trim();m1Sync();m1.sel=null;m1Redo(true);};
  g('m1-f').onchange=e=>{m1.f=e.target.value;m1.sel=null;m1Redo(true);};
  g('m1-use').onclick=()=>{if(cmp.sel&&st.filters.has(cmp.sel)){m1.f=cmp.sel;m1.fq='';g('m1-fq').value='';m1.sel=null;m1Sync();m1Redo(true);}};
  g('m1-mode').onchange=e=>{m1.mode=e.target.value;m1Redo(true);};
  g('m1-more').onclick=()=>{m1.shown+=15;m1Render();};
  g('m1-tab').addEventListener('click',e=>{const r=e.target.closest('.cand');if(r){m1.sel=r.dataset.id;m1Render();}});
  const cv=g('m1-cv');cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.clientWidth/r.width,y=(e.clientY-r.top)*cv.clientHeight/r.height;
    let b=null,bd=144;for(const q of m1.pts){const d=(q.x-x)**2+(q.y-y)**2;if(d<bd){bd=d;b=q;}}if(b){m1.sel=b.id;const i=m1.res.findIndex(z=>z.g.id===b.id);if(i>=m1.shown)m1.shown=i+1;m1Render();}});
})();

window.m1Refresh=()=>{if(m1.visible)m1Update();};LED.listeners.push(()=>{if(m1.visible)m1Update();});
function m1Theme(){if(m1.visible)m1Update();}matchMedia('(prefers-color-scheme: dark)').addEventListener('change',m1Theme);new MutationObserver(m1Theme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
new ResizeObserver(()=>{if(m1.visible)m1Plot();}).observe($('m1-p'));
