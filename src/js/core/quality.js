/* One call that gives everything about a light source: chromaticity, CCT, Duv, CRI and TM-30.
   Returns null for the CCT-based parts when the light has no meaningful CCT (|Duv| > 0.05 or outside 1000-25000 K). */
function quality(spd){
  const s=sums(spd),c=chroma(s[0],s[1],s[2]),q=cctDuv(c.u,c.v),o={x:c.x,y:c.y,u:c.u,v:c.v,up:c.up,vp:c.vp,cct:q.cct,duv:q.duv,ok:false};
  if(!q.cct||q.cct<1000||q.cct>25000)return o;
  o.ok=true;o.cri=cri(spd,q.cct);o.tm30=tm30(spd,q.cct);return o;}
