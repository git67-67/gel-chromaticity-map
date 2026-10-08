/* ---- calculation ---- */
function currentSPD(){return spdOf({src:st.src,cct:st.cct,id:st.libId});}
function recompute(){
  st.spd=currentSPD();
  const s=sums(st.spd);st.k=s[1];st.srcRes=evalFilter(st.spd,null,0);st.srcRes.m=runMetrics(metricCtx(st.spd,null,s[1]));
  for(const f of st.filters.values()){f.T=resample(f.wl,f.v,st.edge);const r=evalFilter(st.spd,f.T,st.k);
    r.shift=Math.hypot(r.up-st.srcRes.up,r.vp-st.srcRes.vp);const c=rgbOfXY(r.x,r.y);r.css=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;r.m=runMetrics(metricCtx(st.spd,f.T,st.k));f.res=r;}
  st.srcRes.m=Object.assign(st.srcRes.m,runMetrics(metricCtx(st.spd,null,st.k),true));
  renderAll();
  const spd=st.spd,k=st.k,T=[...st.filters.values()];
  runHeavy(T.map(f=>({res:f.res,ctx:()=>metricCtx(spd,f.T,k)})),()=>{renderList();renderDetail();});}

