/* IES TM-30 / CIE 224:2017: fidelity Rf, gamut Rg, per-hue-bin fidelity / chroma shift / hue shift, colour vector data.
   99 colour evaluation samples, CIE 1964 10 degree observer, CIECAM02 (L_A=100, Y_b=20, average surround, full adaptation)
   converted to CAM02-UCS. Input: spd on the 1 nm grid and its CCT (1931 2 degree, from cctDuv). */
const CAM={M:[[0.7328,0.4296,-0.1624],[-0.7036,1.6975,0.0061],[0.0030,0.0136,0.9834]],
  Mi:[[1.096124,-0.278869,0.182745],[0.454369,0.473533,0.072098],[-0.009628,-0.005698,1.015326]],
  H:[[0.38971,0.68898,-0.07868],[-0.22981,1.18340,0.04641],[0,0,1]],c:0.69,Nc:1,LA:100,Yb:20};
const CAM_FL=(()=>{const k=1/(5*CAM.LA+1),k4=k*k*k*k;return 0.2*k4*5*CAM.LA+0.1*(1-k4)*(1-k4)*Math.cbrt(5*CAM.LA);})();
const CAM_n=CAM.Yb/100,CAM_Nbb=0.725*Math.pow(1/CAM_n,0.2),CAM_z=1.48+Math.sqrt(CAM_n);
const mulv=(M,v)=>[M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2],M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2],M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2]];
function camComp(x){const f=Math.pow(CAM_FL*Math.abs(x)/100,0.42);return Math.sign(x)*400*f/(27.13+f)+0.1;}
function camAchrom(pa){return(2*pa[0]+pa[1]+pa[2]/20-0.305)*CAM_Nbb;}
/* XYZ (white Y = 100) -> CAM02-UCS J', a', b' plus hue angle h (degrees). Full adaptation to its own white, so the white is
   taken from the same light. */
function xyzToUCS(xyz,Aw,whiteRGBc){
  const rgb=mulv(CAM.M,xyz),rgbw=mulv(CAM.M,whiteRGBc.xyzw);
  const rc=[rgb[0]*100/rgbw[0],rgb[1]*100/rgbw[1],rgb[2]*100/rgbw[2]],p=mulv(CAM.H,mulv(CAM.Mi,rc)),pa=p.map(camComp);
  const a=pa[0]-12*pa[1]/11+pa[2]/11,b=(pa[0]+pa[1]-2*pa[2])/9,h=(Math.atan2(b,a)*180/Math.PI+360)%360;
  const A=camAchrom(pa),J=100*Math.pow(A/Aw,CAM.c*CAM_z),et=0.25*(Math.cos(h*Math.PI/180+2)+3.8);
  const t=(50000/13*CAM.Nc*CAM_Nbb*et*Math.hypot(a,b))/(pa[0]+pa[1]+1.05*pa[2]);
  const C=Math.pow(t,0.9)*Math.sqrt(J/100)*Math.pow(1.64-Math.pow(0.29,CAM_n),0.73),M=C*Math.pow(CAM_FL,0.25);
  const Jp=1.7*J/(1+0.007*J),Mp=Math.log(1+0.0228*M)/0.0228,hr=h*Math.PI/180;
  return[Jp,Mp*Math.cos(hr),Mp*Math.sin(hr),h];}
const CES_W=(()=>{const w=[new Float64Array(99*Q5),new Float64Array(99*Q5),new Float64Array(99*Q5)];
  const c=COLT.cmf10;for(let j=0;j<99;j++)for(let i=0;i<Q5;i++){const r=COLT.ces[j][i];w[0][j*Q5+i]=r*c[0][i];w[1][j*Q5+i]=r*c[1][i];w[2][j*Q5+i]=r*c[2][i];}return w;})();
/* all 99 samples under a 5 nm spectrum: array of [J', a', b', h] */
function cesUnder(S5){
  const c=COLT.cmf10;let Xw=0,Yw=0,Zw=0;for(let i=0;i<Q5;i++){Xw+=S5[i]*c[0][i];Yw+=S5[i]*c[1][i];Zw+=S5[i]*c[2][i];}
  const k=100/Yw,xyzw=[Xw*k,100,Zw*k]; // after full adaptation the white is [Y_w,Y_w,Y_w] in CAT02 space
  const pw=mulv(CAM.H,mulv(CAM.Mi,[100,100,100])),Aw=camAchrom(pw.map(camComp)),ctx={xyzw},out=[];
  for(let j=0;j<99;j++){let X=0,Y=0,Z=0;const o=j*Q5;
    for(let i=0;i<Q5;i++){const s=S5[i];X+=s*CES_W[0][o+i];Y+=s*CES_W[1][o+i];Z+=s*CES_W[2][o+i];}
    out.push(xyzToUCS([X*k,Y*k,Z*k],Aw,ctx));}
  return out;}
const fidScale=dE=>10*Math.log(Math.exp((100-6.73*dE)/10)+1);
/* `rule` selects the reference-mixing range: REF_TM30 (default, IES) or REF_CIE224. */
function tm30(spd,cct,rule){
  rule=rule||REF_TM30;const T=sample5(spd),R=referenceLight5(cct,rule),t=cesUnder(T),r=cesUnder(R);
  const dE=new Float64Array(99);let sum=0;
  for(let j=0;j<99;j++){dE[j]=Math.hypot(t[j][0]-r[j][0],t[j][1]-r[j][1],t[j][2]-r[j][2]);sum+=dE[j];}
  const Rf=fidScale(sum/99),Rfi=Array.from(dE,fidScale);
  // 16 hue bins by the reference hue angle
  const n=new Array(16).fill(0),at=new Array(16).fill(0),bt=new Array(16).fill(0),ar=new Array(16).fill(0),br=new Array(16).fill(0),de=new Array(16).fill(0);
  for(let j=0;j<99;j++){const b=Math.min(15,Math.floor(r[j][3]/22.5));n[b]++;at[b]+=t[j][1];bt[b]+=t[j][2];ar[b]+=r[j][1];br[b]+=r[j][2];de[b]+=dE[j];}
  const Rfh=[],Rcs=[],Rhs=[];
  for(let b=0;b<16;b++){if(!n[b]){Rfh.push(NaN);Rcs.push(NaN);Rhs.push(NaN);continue;}
    at[b]/=n[b];bt[b]/=n[b];ar[b]/=n[b];br[b]/=n[b];
    Rfh.push(fidScale(de[b]/n[b]));
    const Cr=Math.hypot(ar[b],br[b]),Ct=Math.hypot(at[b],bt[b]);
    Rcs.push((Ct-Cr)/Cr);
    let dh=Math.atan2(bt[b],at[b])-Math.atan2(br[b],ar[b]);if(dh>Math.PI)dh-=2*Math.PI;if(dh<-Math.PI)dh+=2*Math.PI;Rhs.push(dh);}
  const area=(x,y)=>{let s=0;for(let i=0;i<16;i++){const j=(i+1)%16;s+=x[i]*y[j]-x[j]*y[i];}return Math.abs(s)/2;};
  const Rg=100*area(at,bt)/area(ar,br);
  return{Rf,Rg,Rfi,Rfh,Rcs,Rhs,bins:{at,bt,ar,br,n}};}
