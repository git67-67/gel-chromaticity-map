/* Example sources */
function buildPcWhite(){const blue=gaussArr(452,8.5),ph=gaussArr(552,55),red=gaussArr(625,45);
  const mk=f=>{const a=new Float64Array(N);for(let i=0;i<N;i++)a[i]=blue[i]+f*(ph[i]+0.5*red[i]);return a;};
  const cct=a=>{const s=sums(a),c=chroma(s[0],s[1],s[2]);return cctDuv(c.u,c.v).cct;};
  let lo=0.05,hi=20;for(let k=0;k<40;k++){const mid=Math.sqrt(lo*hi),c=cct(mk(mid));if(c===null||c>5000)lo=mid;else hi=mid;}
  return mk(Math.sqrt(lo*hi));}
function det3(a,b,c){return a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);}
function buildRgbLed(){const P=[gaussArr(462,9.3),gaussArr(525,13.6),gaussArr(628,7.6)];
  const t=sums(from5(D65_5));const tw=[t[0]/t[1],1,t[2]/t[1]];
  const A=P.map(p=>{const s=sums(p);return s;}); // each primary as [X,Y,Z]
  const D=det3(A[0],A[1],A[2]);
  const w=[det3(tw,A[1],A[2])/D,det3(A[0],tw,A[2])/D,det3(A[0],A[1],tw)/D];
  const a=new Float64Array(N);for(let i=0;i<N;i++)a[i]=Math.max(0,w[0]*P[0][i]+w[1]*P[1][i]+w[2]*P[2][i]);return a;}
