/* ---------- calculation ---------- */
function labCompute(){
  const SA=spdOf(lab.A),SB=spdOf(lab.B),sa=sums(SA),sb=sums(SB);
  const WA=[sa[0]/sa[1],1,sa[2]/sa[1]],WB=[sb[0]/sb[1],1,sb[2]/sb[1]];
  const D=degreeD(lab.dmode,lab.dman,lab.LA,lab.F);
  const mats=CATS.map(c=>{const Mi=inv3(c.M);return{M:c.M,Mi,g:catGains(c.M,WA,WB,D)};});
  const wA=ptOf(WA),wB=ptOf(WB),rows=[],byId=new Map();
  for(const f of st.filters.values()){if(!f.T)continue;
    const ta=sums(SA,f.T),tb=sums(SB,f.T);
    const XA=[ta[0]/sa[1],ta[1]/sa[1],ta[2]/sa[1]],XB=[tb[0]/sb[1],tb[1]/sb[1],tb[2]/sb[1]];
    const A=ptOf(XA),B=ptOf(XB);if(!A||!B)continue;
    const preds=mats.map(m=>{const xyz=catApply(m.M,m.Mi,m.g,XA),pt=ptOf(xyz);return{xyz,pt,err:pt?Math.hypot(pt.u-B.u,pt.v-B.v):NaN};});
    let best=-1,be=1e9;preds.forEach((p,i)=>{if(p.err<be){be=p.err;best=i;}});
    if(best<0)best=0;
    const row={f,XA,XB,A,B,preds,best,base:Math.hypot(A.u-B.u,A.v-B.v),yB:XB[1],neutral:Math.hypot(A.u-wA.u,A.v-wA.v)<0.003};
    rows.push(row);byId.set(f.id,row);}
  lab.res={SA,SB,sa,sb,WA,WB,wA,wB,D,mats,rows,byId};
  computeStats();}
function included(r){return r.yB*100>=lab.minLight&&!(lab.skipNeutral&&r.neutral);}
function computeStats(){const R=lab.res,inc=R.rows.filter(included);R.inc=inc;R.stats={};
  CATS.forEach((c,i)=>R.stats[c.id]=statOf(inc.map(r=>r.preds[i].err)));R.stats.base=statOf(inc.map(r=>r.base));}
const matchQ=f=>{if(!lab.q)return true;const n=(f.code+' '+f.name).toLowerCase();return lab.q.toLowerCase().split(/\s+/).every(t=>n.includes(t));};

