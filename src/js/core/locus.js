/* Planckian locus table in CIE 1960 uv, for CCT and Duv */
const PT=[];{const n=2000,t0=1000,t1=25000;for(let k=0;k<n;k++){const T=t0*Math.pow(t1/t0,k/(n-1));const s=sums(planckSPD(T));const d=s[0]+15*s[1]+3*s[2];PT.push([T,4*s[0]/d,6*s[1]/d]);}}
function cctDuv(u,v){let b=0,bd=1e9;for(let k=0;k<PT.length;k++){const du=u-PT[k][1],dv=v-PT[k][2],d=du*du+dv*dv;if(d<bd){bd=d;b=k;}}
  // refine: project onto the two locus segments next to the nearest table entry
  let T=PT[b][0],dist=Math.sqrt(bd);
  for(const [i,j] of [[b-1,b],[b,b+1]]){if(i<0||j>=PT.length)continue;
    const ax=PT[i][1],ay=PT[i][2],ex=PT[j][1]-ax,ey=PT[j][2]-ay;
    const t=Math.max(0,Math.min(1,((u-ax)*ex+(v-ay)*ey)/(ex*ex+ey*ey)));
    const dd=Math.hypot(u-(ax+t*ex),v-(ay+t*ey));
    if(dd<dist){dist=dd;T=PT[i][0]+t*(PT[j][0]-PT[i][0]);}}
  const duv=(v>PT[b][2]?1:-1)*dist;
  const ok=Math.abs(duv)<0.05&&b>0&&b<PT.length-1;return{cct:ok?T:null,duv};}
