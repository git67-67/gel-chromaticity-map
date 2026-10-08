/* ---------- drawing helpers ---------- */
function haloText(ctx,t,x,y,font,align){ctx.font=font;ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=3;
  ctx.strokeStyle=cols.plotbg;ctx.strokeText(t,x,y);ctx.fillStyle=cols.fg;ctx.fillText(t,x,y);}
function arrow(ctx,x0,y0,x1,y1,hs){ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();ctx.setLineDash([]);
  const a=Math.atan2(y1-y0,x1-x0);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-hs*Math.cos(a-.4),y1-hs*Math.sin(a-.4));ctx.lineTo(x1-hs*Math.cos(a+.4),y1-hs*Math.sin(a+.4));ctx.closePath();ctx.fill();}
function whiteMark(ctx,p,label){ctx.strokeStyle=cols.fg;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(p[0],p[1],7,0,7);ctx.moveTo(p[0]-11,p[1]);ctx.lineTo(p[0]+11,p[1]);ctx.moveTo(p[0],p[1]-11);ctx.lineTo(p[0],p[1]+11);ctx.stroke();
  haloText(ctx,label,p[0]+11,p[1]-13,'600 11px '+FU);}
function placeLabel(ctx,placed,t,x,y,font,align){ctx.font=font;const w=ctx.measureText(t).width,x0=align==='left'?x:x-w;
  for(const dy of [0,13,-13,26,-26]){const yy=y+dy;if(!placed.some(p=>Math.abs(p.y-yy)<12&&x0<p.x1&&x0+w>p.x0)){placed.push({x0,x1:x0+w,y:yy});return yy;}}return y;}
function diamond(ctx,x,y,r){ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();}

function drawContent(v){
  const ctx=v.ctx,R=lab.res;if(!R)return;
  v.hits=[];
  whiteMark(ctx,v.px(...v.crd(R.wA)),'white A');whiteMark(ctx,v.px(...v.crd(R.wB)),'white B');
  const ci=catIdx(lab.cat);
  if(lab.mode==='one'){
    const r=R.byId.get(st.sel);if(!r){haloText(ctx,tk('Pick a {filter} from the list'),v.PAD.l+14,v.PAD.t+20,'600 13px '+FU);return;}
    const pa=v.px(...v.crd(r.A)),pb=v.px(...v.crd(r.B));
    ctx.strokeStyle=cols.muted;ctx.fillStyle=cols.muted;ctx.lineWidth=1.4;ctx.setLineDash([5,4]);arrow(ctx,pa[0],pa[1],pb[0],pb[1],9);
    CATS.forEach((c,i)=>{if(!lab.vis[c.id])return;const q=r.preds[i].pt;if(!q)return;const pp=v.px(...v.crd(q));
      ctx.strokeStyle=lc.k[i];ctx.globalAlpha=i===ci?1:.75;ctx.lineWidth=i===ci?1.8:1.2;ctx.beginPath();ctx.moveTo(pb[0],pb[1]);ctx.lineTo(pp[0],pp[1]);ctx.stroke();ctx.globalAlpha=1;});
    ctx.beginPath();ctx.arc(pa[0],pa[1],6,0,7);ctx.fillStyle=cssOf(r.A);ctx.fill();ctx.strokeStyle=cols.fg;ctx.lineWidth=1.5;ctx.stroke();
    haloText(ctx,'under A',pa[0]+10,pa[1]+(pa[1]<pb[1]?-9:11),'11px '+FU);
    v.hits.push({x:pa[0],y:pa[1],r:7,data:{t:'A'}});
    const placed=[];
    CATS.forEach((c,i)=>{if(!lab.vis[c.id])return;const q=r.preds[i].pt;if(!q)return;const pp=v.px(...v.crd(q));
      const sel=i===ci,rr=sel?7:5.5;diamond(ctx,pp[0],pp[1],rr);ctx.fillStyle=cssOf(q);ctx.fill();ctx.strokeStyle=lc.k[i];ctx.lineWidth=sel?3:2;ctx.stroke();
      let dx=pp[0]-pb[0],dy=pp[1]-pb[1];const L=Math.hypot(dx,dy);if(L<3){const a=i*.9+.4;dx=Math.cos(a);dy=Math.sin(a);}else{dx/=L;dy/=L;}
      const lf=(sel?'700 ':'600 ')+'11px '+FU,lx=pp[0]+dx*(rr+9)+(dx>=0?2:-2),ly=placeLabel(ctx,placed,c.short,lx,pp[1]+dy*(rr+7),lf,dx>=0?'left':'right');
      haloText(ctx,c.short,lx,ly,lf,dx>=0?'left':'right');
      v.hits.push({x:pp[0],y:pp[1],r:rr+2,data:{t:'cat',i}});});
    ctx.beginPath();ctx.arc(pb[0],pb[1],8,0,7);ctx.fillStyle=cssOf(r.B);ctx.fill();ctx.strokeStyle=cols.fg;ctx.lineWidth=2.4;ctx.stroke();
    haloText(ctx,'true (spectral)',pb[0]-11,pb[1]+(pb[1]<pa[1]?-14:16),'700 11px '+FU,'right');
    v.hits.push({x:pb[0],y:pb[1],r:9,data:{t:'B'}});
  }else{
    const mag=lab.mag,pts=[];
    for(const r of R.inc){const dim=!matchQ(r.f);const pa=v.px(...v.crd(r.A)),pb=v.px(...v.crd(r.B)),q=r.preds[ci].pt;
      if(pb[0]<v.PAD.l-30||pb[0]>v.W+30||pb[1]<-30||pb[1]>v.H+30)continue;
      ctx.globalAlpha=dim?.12:1;
      if(lab.showShift){ctx.strokeStyle=cols.muted;ctx.globalAlpha=dim?.05:.35;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.stroke();
        ctx.beginPath();ctx.arc(pa[0],pa[1],2,0,7);ctx.fillStyle=cols.muted;ctx.fill();ctx.globalAlpha=dim?.12:1;}
      if(q){const pp=v.px(...v.crd(q)),ex=pb[0]+mag*(pp[0]-pb[0]),ey=pb[1]+mag*(pp[1]-pb[1]),e=r.preds[ci].err;
        ctx.strokeStyle=cols.accent;ctx.globalAlpha=(dim?.1:1)*(.3+.7*Math.min(1,e/0.02));ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(pb[0],pb[1]);ctx.lineTo(ex,ey);ctx.stroke();ctx.globalAlpha=dim?.12:1;}
      pts.push([r,pb]);}
    ctx.globalAlpha=1;
    for(const [r,pb] of pts){const dim=!matchQ(r.f);ctx.globalAlpha=dim?.15:1;ctx.beginPath();ctx.arc(pb[0],pb[1],3.4,0,7);ctx.fillStyle=cssOf(r.B);ctx.fill();ctx.strokeStyle=cols.dot;ctx.lineWidth=1;ctx.stroke();
      if(!dim)v.hits.push({x:pb[0],y:pb[1],r:3.4,data:{t:'row',id:r.f.id}});}
    ctx.globalAlpha=1;
    const rs=R.byId.get(st.sel);if(rs){const pb=v.px(...v.crd(rs.B));ctx.strokeStyle=cols.fg;ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(pb[0],pb[1],8,0,7);ctx.stroke();haloText(ctx,rs.f.lab,pb[0]+11,pb[1]-8,'700 12px '+FU);}
    if(lab.hover&&lab.hover.t==='row'){const rh=R.byId.get(lab.hover.id);if(rh&&rh!==rs){const pb=v.px(...v.crd(rh.B));ctx.strokeStyle=cols.fg;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pb[0],pb[1],7,0,7);ctx.stroke();}}
    // scale key
    const len=0.01*mag*v.V.s,kx=v.PAD.l+14,ky=v.H-v.PAD.b-16;
    ctx.strokeStyle=cols.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(kx,ky);ctx.lineTo(kx+len,ky);ctx.moveTo(kx,ky-4);ctx.lineTo(kx,ky+4);ctx.moveTo(kx+len,ky-4);ctx.lineTo(kx+len,ky+4);ctx.stroke();
    haloText(ctx,'error of 0.010 Δu′v′ (whisker is ×'+mag+')',kx+len+8,ky,'11px '+FU);
  }
}

