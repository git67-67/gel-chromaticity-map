/* CIE 13.3-1995 colour rendering index: Ra (R1-R8) and the special indices R1-R14.
   The test light is compared with a reference of the same CCT (Planckian below 5000 K, D-series from 5000 K) after a
   von Kries adaptation in CIE 1960 UCS; R_i = 100 - 4.6 * dE(U*V*W*). Input: spd on the 1 nm grid, its CCT. */
function uv60(X,Y,Z){const d=X+15*Y+3*Z;return[4*X/d,6*Y/d];}
const CRI_TCSY=(()=>{ // per-sample weights: sample reflectance * 2 degree CMFs on the 5 nm grid
  return COLT.tcs.map(r=>{const w=[new Float64Array(Q5),new Float64Array(Q5),new Float64Array(Q5)];
    for(let i=0;i<Q5;i++){w[0][i]=r[i]*XB[i*5];w[1][i]=r[i]*YB[i*5];w[2][i]=r[i]*ZB[i*5];}return w;});})();
function criSamples(S5){const white=[0,0,0];for(let i=0;i<Q5;i++){white[0]+=S5[i]*XB[i*5];white[1]+=S5[i]*YB[i*5];white[2]+=S5[i]*ZB[i*5];}
  const k=100/white[1],uvw=uv60(...white),res=[];
  for(const w of CRI_TCSY){let X=0,Y=0,Z=0;for(let i=0;i<Q5;i++){X+=S5[i]*w[0][i];Y+=S5[i]*w[1][i];Z+=S5[i]*w[2][i];}
    res.push([X*k,Y*k,Z*k]);}
  return{white:uvw,xyz:res};}
function cri(spd,cct){
  const T=sample5(spd),R=referenceLight5(cct,REF_CRI),t=criSamples(T),r=criSamples(R);
  const cd=(u,v)=>[(4-u-10*v)/v,(1.708*v+0.404-1.481*u)/v];
  const [ck,dk]=cd(...t.white),[cr,dr]=cd(...r.white),Ri=[];
  for(let j=0;j<14;j++){
    const a=uv60(...t.xyz[j]),c=cd(a[0],a[1]),ca=cr/ck*c[0],da=dr/dk*c[1],den=16.518+1.481*ca-da,
      ua=(10.872+0.404*ca-4*da)/den,va=5.520/den,b=uv60(...r.xyz[j]);
    const Wt=25*Math.cbrt(t.xyz[j][1])-17,Wr=25*Math.cbrt(r.xyz[j][1])-17;
    const dU=13*Wt*(ua-r.white[0])-13*Wr*(b[0]-r.white[0]),dV=13*Wt*(va-r.white[1])-13*Wr*(b[1]-r.white[1]),dW=Wt-Wr;
    Ri.push(100-4.6*Math.sqrt(dU*dU+dV*dV+dW*dW));}
  let s=0;for(let j=0;j<8;j++)s+=Ri[j];
  return{Ra:s/8,R:Ri};}
