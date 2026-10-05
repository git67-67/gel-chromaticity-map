/* ---- calculation ---- */
function currentSPD(){ if(st.src==='bb')return planckSPD(st.cct); if(st.src==='led'&&st.led)return st.led; return SRC[st.src==='led'?'pcw':st.src].spd;}
function recompute(){
  st.spd=currentSPD();
  const s=sums(st.spd);st.k=s[1];st.srcRes=evalFilter(st.spd,null,0);st.srcRes.m=runMetrics(metricCtx(st.spd,null,s[1]));
  for(const f of st.filters.values()){f.T=resample(f.wl,f.v,st.edge);const r=evalFilter(st.spd,f.T,st.k);
    r.shift=Math.hypot(r.up-st.srcRes.up,r.vp-st.srcRes.vp);const c=rgbOfXY(r.x,r.y);r.css=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;r.m=runMetrics(metricCtx(st.spd,f.T,st.k));f.res=r;}
  renderAll();}

