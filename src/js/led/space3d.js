/* 3D view of the apparent change in LED compare: every item under light A (open dot) and light B (filled dot), joined by a line,
   in CIELUV (u*, v*, L*) or CAM02-UCS (a', b', J'), the same space as the ΔE numbers. Drag to rotate, wheel to zoom.
   Reads cmp.res.rows[].P = [[L,a,b] under A, [L,a,b] under B] and cmp.res.PW (the two white points). */
const c3={yaw:-0.7,pitch:0.5,zoom:1,dot:'true',pts:[],drag:null,raf:0,cv:$('cm-3d')};
function c3Axes(){return cmp.space==='cam'?{x:"a′",y:"b′",z:'J′'}:{x:'u*',y:'v*',z:'L*'};}
function c3Draw(){c3.raf=0;const R=cmp.res,cv=c3.cv;if(!cv||!$('cm-3dp').offsetParent)return;if(!cols.fg)readCols();
  const {c,w,h}=prepCanvas(cv,Math.round(Math.min(460,Math.max(300,cv.parentElement.clientWidth*.75))));c3.pts=[];
  c.fillStyle=cols.plotbg;c.fillRect(0,0,w,h);if(!R||!R.rows.length)return;
  let ext=20;for(const r of R.rows)for(const P of r.P)ext=Math.max(ext,Math.hypot(P[1],P[2]));for(const P of R.PW)ext=Math.max(ext,Math.hypot(P[1],P[2]));ext*=1.1;
  const zc=50,sc=Math.min(w,h*1.15)/(1.9*Math.max(ext,55))*c3.zoom,cy=Math.cos(c3.yaw),sy=Math.sin(c3.yaw),cp=Math.cos(c3.pitch),sp=Math.sin(c3.pitch);
  // x = a, y = b (depth axis at pitch 0), z = lightness
  const pr=(a,b,L)=>{const xr=a*cy-b*sy,yr=a*sy+b*cy,z=L-zc;return{x:w/2+xr*sc,y:h/2+8-(z*cp+yr*sp)*sc,d:yr*cp-z*sp};};
  const ax=c3Axes();c.lineWidth=1;c.font='11px '+FM;c.fillStyle=cols.muted;c.strokeStyle=cols.grid;c.textAlign='center';c.textBaseline='middle';
  // chroma rings on the floor (L = 0) and at L = 100, lightness axis
  for(const L of [0,100]){for(const f of [.5,1]){c.beginPath();for(let i=0;i<=64;i++){const t=i/64*Math.PI*2,p=pr(ext*f*Math.cos(t),ext*f*Math.sin(t),L);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.globalAlpha=L?.35:.8;c.stroke();}}
  c.globalAlpha=1;c.strokeStyle=cols.muted;
  const seg=(a,b,L,a2,b2,L2)=>{const p=pr(a,b,L),q=pr(a2,b2,L2);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();};
  seg(0,0,0,0,0,100);seg(-ext,0,0,ext,0,0);seg(0,-ext,0,0,ext,0);
  for(const L of [0,50,100]){const p=pr(0,0,L);c.fillText(String(L),p.x-14,p.y);}
  let p=pr(ext,0,0);c.fillText(ax.x,p.x+12,p.y);p=pr(0,ext,0);c.fillText(ax.y,p.x+12,p.y);p=pr(0,0,100);c.fillText(ax.z,p.x,p.y-12);
  // items, far to near
  const rng=cmRange(),list=R.rows.map(r=>({r,a:pr(r.P[0][1],r.P[0][2],r.P[0][0]),b:pr(r.P[1][1],r.P[1][2],r.P[1][0])})).sort((u,v)=>(u.b.d+u.a.d)-(v.b.d+v.a.d));
  c.lineWidth=1;for(const o of list){c.strokeStyle=cols.fg;c.globalAlpha=.3;c.beginPath();c.moveTo(o.a.x,o.a.y);c.lineTo(o.b.x,o.b.y);c.stroke();}
  c.globalAlpha=1;
  const tr=c3.dot==='true';   // true: each dot in the colour and brightness it really has (white of the bare light = full brightness)
  for(const o of list){const sel=o.r.f.id===cmp.sel,r=o.r;
    if(tr){c.fillStyle=cmpColorY(r.A,r.yA,1);c.strokeStyle=cols.muted;c.globalAlpha=.9;c.lineWidth=1;c.beginPath();c.arc(o.a.x,o.a.y,2.8,0,7);c.fill();c.stroke();c.globalAlpha=1;}
    else{c.strokeStyle=cols.fg;c.globalAlpha=.6;c.beginPath();c.arc(o.a.x,o.a.y,2.4,0,7);c.stroke();c.globalAlpha=1;}
    c.fillStyle=tr?cmpColorY(r.B,Math.min(1,r.yB*R.rate),1):(cmSigned(r)==null?cmpColor(r.B):cmDiv(cmSigned(r)/rng));
    c.strokeStyle=sel?cols.fg:(tr?cols.muted:cols.plotbg);c.lineWidth=sel?2.2:1.1;c.beginPath();c.arc(o.b.x,o.b.y,sel?5.5:3.8,0,7);c.fill();c.stroke();
    c3.pts.push({x:o.b.x,y:o.b.y,id:r.f.id});}
  // white points
  [[R.PW[0],lc.k[0],'A'],[R.PW[1],lc.k[1],'B']].forEach(([P,col,n])=>{const q=pr(P[1],P[2],P[0]);c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(q.x-6,q.y);c.lineTo(q.x+6,q.y);c.moveTo(q.x,q.y-6);c.lineTo(q.x,q.y+6);c.stroke();c.fillStyle=col;c.font='bold 11px '+FM;c.textAlign='left';c.fillText('white '+n,q.x+8,q.y-6);});}
function c3Request(){if(!c3.raf)c3.raf=requestAnimationFrame(c3Draw);}
function c3View(name){c3.zoom=1;if(name==='top'){c3.yaw=0;c3.pitch=Math.PI/2;}else if(name==='side'){c3.yaw=0;c3.pitch=0;}else{c3.yaw=-0.7;c3.pitch=0.5;}c3Request();}
(function(){const cv=c3.cv,tip=$('cm-3dtip');
  const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.clientWidth/r.width,(e.clientY-r.top)*cv.clientHeight/r.height];};
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);c3.drag={x:e.clientX,y:e.clientY,moved:false};});
  cv.addEventListener('pointermove',e=>{
    if(c3.drag){const dx=e.clientX-c3.drag.x,dy=e.clientY-c3.drag.y;if(Math.abs(dx)+Math.abs(dy)>2)c3.drag.moved=true;
      if(c3.drag.moved){c3.yaw+=dx*.008;c3.pitch=Math.max(0,Math.min(Math.PI/2,c3.pitch+dy*.008));c3.drag.x=e.clientX;c3.drag.y=e.clientY;tip.hidden=true;c3Request();}return;}
    const [x,y]=pos(e);let best=null,bd=100;for(const q of c3.pts){const d=(q.x-x)**2+(q.y-y)**2;if(d<bd){bd=d;best=q;}}
    const r=best&&cmp.res&&cmp.res.byId.get(best.id);if(!r){tip.hidden=true;return;}
    const L=cmLab();tip.innerHTML=`<b>${esc(r.f.name)}</b><span>${L.E} ${r.d.dE.toFixed(1)}</span><span>${L.L} ${sgn(r.d.dL,1,'')} · ${L.C} ${sgn(r.d.dC,1,'')} · ${L.H} ${r.d.dH.toFixed(1)}</span>`;
    tip.hidden=false;tip.style.left=Math.min(x+12,cv.clientWidth-tip.offsetWidth-6)+'px';tip.style.top=Math.max(4,Math.min(y+12,cv.clientHeight-tip.offsetHeight-6))+'px';});
  cv.addEventListener('pointerup',e=>{const was=c3.drag;c3.drag=null;if(was&&!was.moved){const [x,y]=pos(e);let best=null,bd=144;for(const q of c3.pts){const d=(q.x-x)**2+(q.y-y)**2;if(d<bd){bd=d;best=q;}}if(best)cmSelect(best.id);}});
  cv.addEventListener('pointerleave',()=>{tip.hidden=true;});
  cv.addEventListener('wheel',e=>{e.preventDefault();c3.zoom=Math.max(.4,Math.min(6,c3.zoom*(e.deltaY<0?1.12:1/1.12)));c3Request();},{passive:false});
  $('c3-dot').onchange=e=>{c3.dot=e.target.value;c3Request();};
  $('c3-3d').onclick=()=>c3View('3d');$('c3-top').onclick=()=>c3View('top');$('c3-side').onclick=()=>c3View('side');
  new ResizeObserver(()=>{if(cmp.visible)c3Request();}).observe($('cm-3dwrap'));})();
