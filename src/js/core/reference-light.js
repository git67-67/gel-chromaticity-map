/* Reference illuminants for colour-rendering metrics (CRI, TM-30), all on the 380-780 nm, 5 nm grid (81 values).
   Needs the data table COLT (data/colour-tables.json) and the 1 nm CMF arrays from grid-cmf.js. */
const Q5=81;                                   // 380..780 step 5
function sample5(spd){const a=new Float64Array(Q5);for(let i=0;i<Q5;i++)a[i]=spd[i*5];return a;}
function planck5(T){const a=new Float64Array(Q5);for(let i=0;i<Q5;i++){const l=(380+5*i)*1e-9;a[i]=1/(Math.pow(l,5)*(Math.exp(1.4388e-2/(l*T))-1));}return a;}
/* CIE daylight (D-series) chromaticity for a CCT, 4000-25000 K */
function dSeriesXY(T){const x=T<=7000?0.244063+0.09911e3/T+2.9678e6/(T*T)-4.6070e9/(T*T*T):0.237040+0.24748e3/T+1.9018e6/(T*T)-2.0064e9/(T*T*T);
  return[x,-3*x*x+2.870*x-0.275];}
function dSeries5(T){const [x,y]=dSeriesXY(T),d=0.0241+0.2562*x-0.7341*y,
  M1=Math.round((-1.3515-1.7703*x+5.9114*y)/d*1000)/1000,M2=Math.round((0.0300-31.4424*x+30.0717*y)/d*1000)/1000,S=COLT.S,a=new Float64Array(Q5);
  for(let i=0;i<Q5;i++)a[i]=S[0][i]+M1*S[1][i]+M2*S[2][i];return a;}
const Y5=(()=>{const a=new Float64Array(Q5);for(let i=0;i<Q5;i++)a[i]=YB[i*5];return a;})();
function lum5(a){let s=0;for(let i=0;i<Q5;i++)s+=a[i]*Y5[i];return s;}
/* Reference illuminant for a CCT. Planckian below `lo`, D-series above `hi`, proportional mixture between.
   CRI uses a hard switch at 5000 K (lo=hi=5000). TM-30 (IES) mixes over 4500-5500 K; CIE 224:2017 mixes over 4000-5000 K. */
const REF_TM30={lo:4500,hi:5500},REF_CIE224={lo:4000,hi:5000},REF_CRI={lo:5000,hi:5000};
function referenceLight5(T,rule){
  if(rule.lo===rule.hi)return T<rule.lo?planck5(T):dSeries5(T);
  if(T<=rule.lo)return planck5(T);
  if(T>=rule.hi)return dSeries5(T);
  const p=planck5(T),d=dSeries5(T),kp=lum5(p),kd=lum5(d),m=(T-rule.lo)/(rule.hi-rule.lo),a=new Float64Array(Q5);
  for(let i=0;i<Q5;i++)a[i]=(1-m)*p[i]/kp+m*d[i]/kd;return a;}
