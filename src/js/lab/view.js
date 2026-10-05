/* ---------- chart view ---------- */
class CView{
  constructor(canvas,host,o){this.cv=canvas;this.ctx=canvas.getContext('2d');this.host=host;this.mode='uv';this.W=600;this.H=520;this.dpr=1;
    this.PAD={l:42,b:30,t:14,r:14};this.V={x0:0,y0:0,s:1,fitS:1,user:false};this.bg=null;this.bgKey='';this.raf=0;this.hits=[];
    this.ptrs=new Map();this.drag=null;this.pinch=null;this.o=o;
    canvas.addEventListener('wheel',e=>{e.preventDefault();const p=this.pos(e);this.zoomAt(p[0],p[1],Math.pow(1.0018,-e.deltaY));},{passive:false});
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const p=this.pos(e);this.ptrs.set(e.pointerId,p);
      if(this.ptrs.size===2){const q=[...this.ptrs.values()];this.pinch={d:Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]),s:this.V.s};this.drag=null;}
      else this.drag={x:p[0],y:p[1],moved:0,x0:this.V.x0,y0:this.V.y0};});
    canvas.addEventListener('pointermove',e=>{const p=this.pos(e);if(this.ptrs.has(e.pointerId))this.ptrs.set(e.pointerId,p);
      if(this.pinch&&this.ptrs.size===2){const q=[...this.ptrs.values()],d=Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]);
        this.zoomAt((q[0][0]+q[1][0])/2,(q[0][1]+q[1][1])/2,(this.pinch.s*d/this.pinch.d)/this.V.s);return;}
      if(this.drag){const dx=p[0]-this.drag.x,dy=p[1]-this.drag.y;this.drag.moved=Math.max(this.drag.moved,Math.hypot(dx,dy));
        if(this.drag.moved>3){this.V.x0=this.drag.x0-dx/this.V.s;this.V.y0=this.drag.y0+dy/this.V.s;this.V.user=true;o.onHover(null);this.request();return;}}
      o.onHover(this.hit(p[0],p[1]),p);});
    canvas.addEventListener('pointerup',e=>{const p=this.pos(e);this.ptrs.delete(e.pointerId);if(this.ptrs.size<2)this.pinch=null;
      if(this.drag&&this.drag.moved<=3){const h=this.hit(p[0],p[1]);if(h)o.onClick(h);}this.drag=null;});
    canvas.addEventListener('pointercancel',e=>{this.ptrs.delete(e.pointerId);this.pinch=null;this.drag=null;});
    canvas.addEventListener('pointerleave',()=>o.onHover(null));}
  pos(e){const r=this.cv.getBoundingClientRect();return[(e.clientX-r.left)*this.W/r.width,(e.clientY-r.top)*this.H/r.height];}
  range(){return this.mode==='xy'?{x0:0,x1:.8,y0:0,y1:.9}:{x0:0,x1:.65,y0:0,y1:.6};}
  fit(){const r=this.range(),P=this.PAD,w=this.W-P.l-P.r,h=this.H-P.t-P.b,V=this.V;
    V.s=Math.min(w/(r.x1-r.x0),h/(r.y1-r.y0));V.fitS=V.s;V.x0=r.x0-(w/V.s-(r.x1-r.x0))/2;V.y0=r.y0-(h/V.s-(r.y1-r.y0))/2;V.user=false;}
  frame(a,b,c,d){const P=this.PAD,w=this.W-P.l-P.r,h=this.H-P.t-P.b,V=this.V;
    const s=Math.min(w/(c-a),h/(d-b));V.s=Math.min(s,V.fitS*400);V.x0=(a+c)/2-(w/2)/V.s;V.y0=(b+d)/2-(h/2)/V.s;V.user=true;this.request();}
  size(){const w=this.host.clientWidth;this.W=Math.max(300,Math.round(w));this.H=Math.round(Math.min(this.W*.95,Math.max(400,innerHeight*.78)));
    this.dpr=Math.min(window.devicePixelRatio||1,2);this.cv.width=this.W*this.dpr;this.cv.height=this.H*this.dpr;this.cv.style.height=this.H+'px';
    if(!this.V.user)this.fit();this.request();}
  px(a,b){return[this.PAD.l+(a-this.V.x0)*this.V.s,this.H-this.PAD.b-(b-this.V.y0)*this.V.s];}
  cx(X){return(X-this.PAD.l)/this.V.s+this.V.x0;}
  cy(Y){return this.V.y0+(this.H-this.PAD.b-Y)/this.V.s;}
  crd(p){return this.mode==='xy'?[p.x,p.y]:[p.u,p.v];}
  crdLoc(r){return this.mode==='xy'?[r.x,r.y]:[r.up,r.vp];}
  zoomAt(mx,my,f){const V=this.V,a=this.cx(mx),b=this.cy(my);V.s=Math.min(Math.max(V.s*f,V.fitS*.8),V.fitS*400);
    V.x0=a-(mx-this.PAD.l)/V.s;V.y0=b-(this.H-this.PAD.b-my)/V.s;V.user=true;this.request();}
  hit(mx,my){let best=null,bd=1e9;for(const h of this.hits){const d=(h.x-mx)**2+(h.y-my)**2,r=h.r+5;if(d<=r*r&&d<bd){bd=d;best=h;}}return best;}
  request(){if(!this.raf)this.raf=requestAnimationFrame(()=>{this.raf=0;this.draw();});}
  makeBg(){const sc=.5,w=Math.round(this.W*sc),h=Math.round(this.H*sc),off=document.createElement('canvas');off.width=w;off.height=h;
    const c=off.getContext('2d'),img=c.createImageData(w,h),d=img.data,bg=cols.bgRGB,k=cols.mix;
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=this.cx(i/sc),b=this.cy(j/sc);let x,y;
      if(this.mode==='xy'){x=a;y=b;}else{const dd=6*a-16*b+12;if(dd<.5)continue;x=9*a/dd;y=4*b/dd;}
      if(!(y>.004)||x<0||x+y>1)continue;const m=mat(x,y),o=(j*w+i)*4;
      d[o]=bg[0]+(gam(m[0])-bg[0])*k;d[o+1]=bg[1]+(gam(m[1])-bg[1])*k;d[o+2]=bg[2]+(gam(m[2])-bg[2])*k;d[o+3]=255;}
    c.putImageData(img,0,0);return off;}
  draw(){const ctx=this.ctx,W=this.W,H=this.H,P=this.PAD,V=this.V;if(!cols.fg)readCols();
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=cols.plotbg;ctx.fillRect(0,0,W,H);
    const key=[this.mode,V.x0.toFixed(5),V.y0.toFixed(5),V.s.toFixed(3),W,H,cols.key].join('|');
    if(key!==this.bgKey){this.bg=this.makeBg();this.bgKey=key;}
    ctx.save();ctx.beginPath();ctx.rect(P.l,P.t,W-P.l-P.r,H-P.t-P.b);ctx.clip();
    const L=LOC.map(r=>this.px(...this.crdLoc(r)));
    ctx.save();ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.clip();ctx.drawImage(this.bg,0,0,W,H);ctx.restore();
    const t=70/V.s,step=[.0005,.001,.002,.005,.01,.02,.05,.1,.2,.5].find(s=>s>=t)||.5;
    ctx.strokeStyle=cols.grid;ctx.lineWidth=1;ctx.beginPath();
    for(let a=Math.ceil(this.cx(P.l)/step)*step;a<=this.cx(W-P.r);a+=step){const X=this.px(a,0)[0];ctx.moveTo(X,P.t);ctx.lineTo(X,H-P.b);}
    for(let b=Math.ceil(this.cy(H-P.b)/step)*step;b<=this.cy(P.t);b+=step){const Y=this.px(0,b)[1];ctx.moveTo(P.l,Y);ctx.lineTo(W-P.r,Y);}
    ctx.stroke();
    ctx.strokeStyle=cols.fg;ctx.globalAlpha=.75;ctx.lineWidth=1.5;ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.stroke();ctx.globalAlpha=1;
    ctx.font='10px '+FM;ctx.textAlign='center';ctx.textBaseline='middle';
    const wp=this.px(...this.crdLoc(chroma(1,1,1)));
    for(const l of [460,470,480,490,500,510,520,530,540,550,560,570,580,600,620,650]){const i=l-400,p=L[i],q=L[i+1]||L[i],o=L[i-1];
      let tx=q[0]-o[0],ty=q[1]-o[1];const n=Math.hypot(tx,ty)||1;let nx=ty/n,ny=-tx/n;if((p[0]-wp[0])*nx+(p[1]-wp[1])*ny<0){nx=-nx;ny=-ny;}
      ctx.strokeStyle=cols.fg;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+nx*6,p[1]+ny*6);ctx.stroke();
      ctx.fillStyle=cols.muted;ctx.fillText(l,p[0]+nx*17,p[1]+ny*10);}
    if(lab.planck){ctx.strokeStyle=cols.fg;ctx.globalAlpha=.55;ctx.setLineDash([4,3]);ctx.lineWidth=1;ctx.beginPath();let first=true;
      for(const e of PT){if(e[0]<1500||e[0]>20000)continue;const u=e[1],v=e[2],den=2*u-8*v+4;
        const c=this.mode==='xy'?[3*u/den,2*v/den]:[u,1.5*v],p=this.px(c[0],c[1]);first?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);first=false;}
      ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=cols.muted;ctx.textAlign='left';
      for(const T of [2000,2700,4000,6500,10000]){const e=PT.reduce((m,c)=>Math.abs(c[0]-T)<Math.abs(m[0]-T)?c:m),den=2*e[1]-8*e[2]+4,
        c=this.mode==='xy'?[3*e[1]/den,2*e[2]/den]:[e[1],1.5*e[2]],p=this.px(c[0],c[1]);ctx.beginPath();ctx.arc(p[0],p[1],2,0,7);ctx.fill();ctx.fillText(T>=1e4?'10k':(T/1000)+'k',p[0]+5,p[1]+11);}}
    this.hits=[];this.o.onDraw(this);
    ctx.restore();
    ctx.fillStyle=cols.muted;ctx.font='11px '+FM;ctx.textAlign='center';ctx.textBaseline='top';
    const dec=step<.002?4:step<.01?3:2;
    for(let a=Math.max(0,Math.ceil(this.cx(P.l)/step)*step);a<=this.cx(W-P.r);a+=step)ctx.fillText(a.toFixed(dec),this.px(a,0)[0],H-P.b+6);
    ctx.textAlign='right';ctx.textBaseline='middle';
    for(let b=Math.max(0,Math.ceil(this.cy(H-P.b)/step)*step);b<=this.cy(P.t);b+=step)ctx.fillText(b.toFixed(dec),P.l-6,this.px(0,b)[1]);
    ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(this.mode==='xy'?'x':'u′',W-P.r,H-2);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(this.mode==='xy'?'y':'v′',P.l+4,2);}
}

