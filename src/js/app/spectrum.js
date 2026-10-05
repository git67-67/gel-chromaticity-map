/* ---- spectrum mini chart ---- */
function drawSpec(f){const c=$('sp');if(!c)return;if(!cols.fg)readCols();const w=c.clientWidth||400,h=190,d=Math.min(window.devicePixelRatio||1,2);
  c.width=w*d;c.height=h*d;const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
  const L=34,R=8,T=8,B=22,pw=w-L-R,ph=h-T-B;const X=l=>L+(l-380)/400*pw,Y=v=>T+(1-v)*ph;
  const mono=getComputedStyle(document.body).getPropertyValue('--mono');g.font='10px '+mono;g.fillStyle=cols.muted;g.strokeStyle=cols.grid;g.lineWidth=1;
  g.textAlign='right';g.textBaseline='middle';for(let v=0;v<=1.001;v+=.25){g.beginPath();g.moveTo(L,Y(v));g.lineTo(w-R,Y(v));g.stroke();g.fillText(Math.round(v*100)+'%',L-5,Y(v));}
  g.textAlign='center';g.textBaseline='top';for(let l=400;l<=780;l+=100){g.beginPath();g.moveTo(X(l),T);g.lineTo(X(l),T+ph);g.stroke();g.fillText(l,X(l),T+ph+5);}
  let mx=0;for(let i=0;i<N;i++)mx=Math.max(mx,st.spd[i]);mx=mx||1;
  g.beginPath();g.moveTo(X(380),Y(0));for(let i=0;i<N;i++)g.lineTo(X(WLS[i]),Y(st.spd[i]/mx));g.lineTo(X(780),Y(0));g.closePath();g.fillStyle=cols.muted;g.globalAlpha=.22;g.fill();g.globalAlpha=1;
  g.strokeStyle=cols.fg;g.lineWidth=1.4;g.setLineDash([5,3]);g.beginPath();for(let i=0;i<N;i++){const p=[X(WLS[i]),Y(f.T[i])];i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.stroke();g.setLineDash([]);
  g.strokeStyle=cols.accent;g.lineWidth=2;g.beginPath();for(let i=0;i<N;i++){const p=[X(WLS[i]),Y(st.spd[i]*f.T[i]/mx)];i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.stroke();
  if(f.wl[0]>380){g.fillStyle=cols.muted;g.textAlign='left';g.textBaseline='top';g.fillText('measured '+f.wl[0]+'–'+f.wl[f.wl.length-1]+' nm',L+4,T+2);}}

