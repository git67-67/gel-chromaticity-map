/* Small canvas plots shared by the LED tabs: spectra, TM-30 colour vector graphic, colour ramp. Colours come from the theme (cols). */
const isDarkTheme=()=>{if(!cols.bgRGB)readCols();return cols.bgRGB[0]+cols.bgRGB[1]+cols.bgRGB[2]<384;};
/* sequential ramp, one hue (the accent teal), light to dark on a light page and the reverse on a dark one. t in 0..1 */
function seqColor(t){t=Math.max(0,Math.min(1,t));const dark=isDarkTheme(),L=dark?22+58*t:88-60*t,S=dark?55:60;return`hsl(190 ${S}% ${L.toFixed(1)}%)`;}
function prepCanvas(cv,h){const w=Math.max(200,Math.round(cv.clientWidth||cv.parentElement.clientWidth||300)),dpr=Math.min(devicePixelRatio||1,2);
  cv.width=w*dpr;cv.height=h*dpr;cv.style.height=h+'px';const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return{c,w,h};}
/* series: [{spd (380-780, 1 nm), color, label, dash, width, fill}], each normalised to its own peak */
function plotSpectra(cv,series,opt){opt=opt||{};if(!cols.fg)readCols();const {c,w,h}=prepCanvas(cv,opt.h||170),P={l:34,r:8,t:8,b:22};
  const X=nm=>P.l+(nm-380)/400*(w-P.l-P.r),Y=v=>h-P.b-v*(h-P.t-P.b);
  c.font='11px '+FM;c.fillStyle=cols.muted;c.strokeStyle=cols.grid;c.lineWidth=1;c.textBaseline='top';c.textAlign='center';
  for(let nm=400;nm<=780;nm+=100){c.beginPath();c.moveTo(X(nm),P.t);c.lineTo(X(nm),h-P.b);c.stroke();c.fillText(nm,X(nm),h-P.b+5);}
  c.textAlign='right';c.textBaseline='middle';for(const v of [0,.5,1]){c.beginPath();c.moveTo(P.l,Y(v));c.lineTo(w-P.r,Y(v));c.stroke();c.fillText(v,P.l-5,Y(v));}
  for(const s of series){if(!s||!s.spd)continue;let m=0;for(let i=0;i<N;i++)if(s.spd[i]>m)m=s.spd[i];if(!(m>0))continue;
    c.beginPath();for(let i=0;i<N;i++){const x=X(WLS[i]),y=Y(s.spd[i]/m);i?c.lineTo(x,y):c.moveTo(x,y);}
    if(s.fill){c.lineTo(X(780),Y(0));c.lineTo(X(380),Y(0));c.closePath();c.globalAlpha=.12;c.fillStyle=s.color;c.fill();c.globalAlpha=1;
      c.beginPath();for(let i=0;i<N;i++){const x=X(WLS[i]),y=Y(s.spd[i]/m);i?c.lineTo(x,y):c.moveTo(x,y);}}
    c.setLineDash(s.dash||[]);c.strokeStyle=s.color;c.lineWidth=s.width||1.6;c.stroke();c.setLineDash([]);}}
/* TM-30 colour vector graphic. items: [{t: tm30 result, color, label}]. The reference sits on the unit circle; each arrow
   runs from the reference hue-bin average to the tested one, in units of the reference chroma (outside = more saturated). */
function plotCVG(cv,items,opt){opt=opt||{};if(!cols.fg)readCols();const w0=Math.round(cv.clientWidth||cv.parentElement.clientWidth||300),S=Math.min(w0,opt.max||360);
  const {c}=prepCanvas(cv,S);cv.style.maxWidth=S+'px';const cx=S/2,cy=S/2,R=S*.33,sc=R;
  c.strokeStyle=cols.grid;c.lineWidth=1;c.fillStyle=cols.muted;c.font='10px '+FM;c.textAlign='center';c.textBaseline='middle';
  for(const r of [.8,1,1.2]){c.beginPath();c.arc(cx,cy,R*r,0,7);c.setLineDash(r===1?[]:[3,3]);c.strokeStyle=r===1?cols.fg:cols.grid;c.globalAlpha=r===1?.5:1;c.stroke();}
  c.setLineDash([]);c.globalAlpha=1;
  for(let b=0;b<16;b++){const th=(b+.5)*22.5*Math.PI/180;c.strokeStyle=cols.grid;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(th)*R*1.3,cy-Math.sin(th)*R*1.3);c.stroke();
    c.fillText(b+1,cx+Math.cos(th)*R*1.42,cy-Math.sin(th)*R*1.42);}
  for(const it of items){const t=it.t;if(!t)continue;const B=t.bins;c.strokeStyle=it.color;c.fillStyle=it.color;c.lineWidth=1.8;c.beginPath();
    for(let b=0;b<=16;b++){const k=b%16,Cr=Math.hypot(B.ar[k],B.br[k]),x=cx+B.at[k]/Cr*sc,y=cy-B.bt[k]/Cr*sc;b?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    for(let k=0;k<16;k++){const Cr=Math.hypot(B.ar[k],B.br[k]),x=cx+B.at[k]/Cr*sc,y=cy-B.bt[k]/Cr*sc,x0=cx+B.ar[k]/Cr*sc,y0=cy-B.br[k]/Cr*sc;
      c.globalAlpha=.45;c.lineWidth=1;c.beginPath();c.moveTo(x0,y0);c.lineTo(x,y);c.stroke();c.globalAlpha=1;c.beginPath();c.arc(x,y,2.6,0,7);c.fill();}}}
