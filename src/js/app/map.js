/* ---- diagram ---- */
const cv=$('cv'),ctx=cv.getContext('2d');let W=600,H=560,dpr=1;
const PAD={l:42,b:30,t:14,r:14};
const RANGE={xy:{x0:0,x1:.8,y0:0,y1:.9},uv:{x0:0,x1:.65,y0:0,y1:.6}};
const V={x0:0,y0:0,s:1,fitS:1,user:false};
function fitView(){const r=RANGE[st.mode],w=W-PAD.l-PAD.r,h=H-PAD.t-PAD.b;
  V.s=Math.min(w/(r.x1-r.x0),h/(r.y1-r.y0));V.fitS=V.s;V.x0=r.x0-(w/V.s-(r.x1-r.x0))/2;V.y0=r.y0-(h/V.s-(r.y1-r.y0))/2;V.user=false;}
const px=(a,b)=>[PAD.l+(a-V.x0)*V.s,H-PAD.b-(b-V.y0)*V.s];
const cx=(X)=>(X-PAD.l)/V.s+V.x0, cy=(Y)=>V.y0+(H-PAD.b-Y)/V.s;
const coord=r=>st.mode==='xy'?[r.x,r.y]:[r.up,r.vp];
function sizeCanvas(){const w=$('plot').clientWidth;W=Math.max(300,Math.round(w));H=Math.round(Math.min(W*.95,Math.max(400,innerHeight*.78)));
  dpr=Math.min(window.devicePixelRatio||1,2);cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';if(!V.user)fitView();else{V.s=Math.max(V.s,V.fitS*.5);}requestDraw();}
let bgCache=null,bgKey='';
function makeBg(){const sc=.5,w=Math.round(W*sc),h=Math.round(H*sc);const off=document.createElement('canvas');off.width=w;off.height=h;
  const c=off.getContext('2d'),img=c.createImageData(w,h),d=img.data,bg=cols.bgRGB,k=cols.mix;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=cx(i/sc),b=cy(j/sc);let x,y;
    if(st.mode==='xy'){x=a;y=b;}else{const dd=6*a-16*b+12;if(dd<.5)continue;x=9*a/dd;y=4*b/dd;}
    if(!(y>.004)||x<0||x+y>1)continue;const m=mat(x,y),o=(j*w+i)*4;
    d[o]=bg[0]+(gam(m[0])-bg[0])*k;d[o+1]=bg[1]+(gam(m[1])-bg[1])*k;d[o+2]=bg[2]+(gam(m[2])-bg[2])*k;d[o+3]=255;}
  c.putImageData(img,0,0);return off;}
function locusPoints(){return LOC.map(r=>px(...coord(r)));}
function niceStep(){const t=70/V.s;const c=[.005,.01,.02,.05,.1,.2,.5];return c.find(s=>s>=t)||.5;}
let raf=0;function requestDraw(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw();});}
function draw(){
  if(!cols.fg)readCols();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=cols.plotbg;ctx.fillRect(0,0,W,H);
  const key=[st.mode,V.x0.toFixed(5),V.y0.toFixed(5),V.s.toFixed(3),W,H,cols.key].join('|');
  if(key!==bgKey){bgCache=makeBg();bgKey=key;}
  ctx.save();ctx.beginPath();ctx.rect(PAD.l,PAD.t,W-PAD.l-PAD.r,H-PAD.t-PAD.b);ctx.clip();
  const L=locusPoints();
  ctx.save();ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.clip();
  ctx.imageSmoothingEnabled=true;ctx.drawImage(bgCache,0,0,W,H);ctx.restore();
  // grid
  const step=niceStep();ctx.strokeStyle=cols.grid;ctx.lineWidth=1;ctx.beginPath();
  for(let a=Math.ceil(cx(PAD.l)/step)*step;a<=cx(W-PAD.r);a+=step){const X=px(a,0)[0];ctx.moveTo(X,PAD.t);ctx.lineTo(X,H-PAD.b);}
  for(let b=Math.ceil(cy(H-PAD.b)/step)*step;b<=cy(PAD.t);b+=step){const Y=px(0,b)[1];ctx.moveTo(PAD.l,Y);ctx.lineTo(W-PAD.r,Y);}
  ctx.stroke();
  // locus outline
  ctx.strokeStyle=cols.fg;ctx.globalAlpha=.75;ctx.lineWidth=1.5;ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.stroke();ctx.globalAlpha=1;
  // wavelength ticks
  const wp=px(...coord(chroma(1,1,1)));ctx.font='10px '+getComputedStyle(document.body).getPropertyValue('--mono');ctx.textAlign='center';ctx.textBaseline='middle';
  for(const l of [460,470,480,490,500,510,520,530,540,550,560,570,580,600,620,650]){const i=l-400,p=L[i],q=L[i+1]||L[i],o=L[i-1];
    let tx=q[0]-o[0],ty=q[1]-o[1];const n=Math.hypot(tx,ty)||1;let nx=ty/n,ny=-tx/n;if((p[0]-wp[0])*nx+(p[1]-wp[1])*ny<0){nx=-nx;ny=-ny;}
    ctx.strokeStyle=cols.fg;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+nx*6,p[1]+ny*6);ctx.stroke();
    ctx.fillStyle=cols.muted;ctx.fillText(l,p[0]+nx*17,p[1]+ny*10);}
  // Planckian locus
  if(st.planck){ctx.strokeStyle=cols.fg;ctx.globalAlpha=.55;ctx.setLineDash([4,3]);ctx.lineWidth=1;ctx.beginPath();let first=true;
    for(const e of PT){if(e[0]<1500||e[0]>20000)continue;const u=e[1],v=e[2]; // uv1960 -> xy / u'v'
      const den=2*u-8*v+4,x=3*u/den,y=2*v/den;const c=st.mode==='xy'?[x,y]:[u,1.5*v];const p=px(c[0],c[1]);first?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);first=false;}
    ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=cols.muted;ctx.textAlign='left';
    for(const T of [2000,3000,4000,5000,6500,10000]){const e=PT.reduce((m,c)=>Math.abs(c[0]-T)<Math.abs(m[0]-T)?c:m);const den=2*e[1]-8*e[2]+4,x=3*e[1]/den,y=2*e[2]/den;
      const c=st.mode==='xy'?[x,y]:[e[1],1.5*e[2]];const p=px(c[0],c[1]);ctx.beginPath();ctx.arc(p[0],p[1],2,0,7);ctx.fill();ctx.fillText(T>=1e4?'10k':(T/1000)+'k',p[0]+5,p[1]+11);}}
  // filter points
  const few=st.filters.size<40,r0=few?5.5:3.6;const all=[...st.filters.values()];
  const draws=(f,dim)=>{const p=px(...coord(f.res));if(p[0]<PAD.l-10||p[0]>W||p[1]<0||p[1]>H-PAD.b+10)return;
    ctx.globalAlpha=dim?.14:1;ctx.fillStyle=f.res.css;ctx.strokeStyle=cols.dot;ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(p[0],p[1],r0,0,7);ctx.fill();ctx.stroke();
    if(st.labels&&!dim){ctx.globalAlpha=1;ctx.fillStyle=cols.fg;ctx.font='10px '+getComputedStyle(document.body).getPropertyValue('--mono');ctx.textAlign='left';ctx.fillText(f.lab,p[0]+r0+3,p[1]-r0-1);}ctx.globalAlpha=1;};
  for(const f of all)if(f.id!==st.sel&&f.id!==st.hover&&!matches(f))draws(f,true);
  for(const f of all)if(f.id!==st.sel&&f.id!==st.hover&&matches(f))draws(f,false);
  // source marker
  const sp=px(...coord(st.srcRes));ctx.strokeStyle=cols.fg;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(sp[0],sp[1],7,0,7);ctx.moveTo(sp[0]-11,sp[1]);ctx.lineTo(sp[0]+11,sp[1]);ctx.moveTo(sp[0],sp[1]-11);ctx.lineTo(sp[0],sp[1]+11);ctx.stroke();
  ctx.fillStyle=cols.fg;ctx.font='600 11px '+getComputedStyle(document.body).getPropertyValue('--ui');ctx.textAlign='left';ctx.fillText('source',sp[0]+10,sp[1]+22);
  // selection and hover
  const fs=st.sel&&st.filters.get(st.sel);
  if(fs){const p=px(...coord(fs.res));ctx.strokeStyle=cols.fg;ctx.globalAlpha=.6;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(sp[0],sp[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    draws(fs,false);ctx.strokeStyle=cols.fg;ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(p[0],p[1],r0+4,0,7);ctx.stroke();
    ctx.fillStyle=cols.fg;ctx.font='600 12px '+getComputedStyle(document.body).getPropertyValue('--ui');ctx.textAlign='left';ctx.fillText(fs.lab,p[0]+r0+8,p[1]+4);}
  const fh=st.hover&&st.filters.get(st.hover);if(fh&&fh!==fs){draws(fh,false);const p=px(...coord(fh.res));ctx.strokeStyle=cols.fg;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(p[0],p[1],r0+3,0,7);ctx.stroke();}
  ctx.restore();
  // axes labels
  ctx.fillStyle=cols.muted;ctx.font='11px '+getComputedStyle(document.body).getPropertyValue('--mono');ctx.textAlign='center';ctx.textBaseline='top';
  const dec=step<.01?3:2;
  for(let a=Math.max(0,Math.ceil(cx(PAD.l)/step)*step);a<=cx(W-PAD.r);a+=step)ctx.fillText(a.toFixed(dec),px(a,0)[0],H-PAD.b+6);
  ctx.textAlign='right';ctx.textBaseline='middle';
  for(let b=Math.max(0,Math.ceil(cy(H-PAD.b)/step)*step);b<=cy(PAD.t);b+=step)ctx.fillText(b.toFixed(dec),PAD.l-6,px(0,b)[1]);
  ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(st.mode==='xy'?'x':'u′',W-PAD.r,H-2);
  ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(st.mode==='xy'?'y':'v′',PAD.l+4,2);
}

