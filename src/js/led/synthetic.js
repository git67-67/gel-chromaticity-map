/* Synthetic light sources for A or B: a blackbody, a CIE daylight (D-series) or the TM-30 reference light at any CCT, optionally
   moved off the Planckian locus by Duv. Ids are 'syn:A' and 'syn:B' (parameters in cmp.syn); cmLight() builds them with synItem(). */
cmp.syn={A:{kind:'mix',cct:2700,duv:0},B:{kind:'daylight',cct:6500,duv:0}};
const SYN_KINDS={planck:'Blackbody (incandescent)',daylight:'Daylight (CIE D-series)',mix:'TM-30 reference (blackbody → daylight)'},SYN_RANGE={planck:[1500,25000],daylight:[4000,25000],mix:[1500,25000]};
function synBase(kind,T){let a;
  if(kind==='planck')return planckSPD(T);
  a=referenceLight5(T,kind==='daylight'?{lo:-1,hi:-1}:REF_TM30);let m=0;for(const x of a)if(x>m)m=x;return from5(Array.from(a,x=>x/m));}
/* off-locus: add a green bump (Duv > 0) or a magenta pair of bumps (Duv < 0) until the requested Duv is reached, re-centring the CCT */
function synSpd(kind,T,duv){const base=synBase(kind,T);if(!duv)return base;
  const add=duv>0?gaussArr(550,45):(()=>{const a=gaussArr(440,22),b=gaussArr(650,35),o=new Float64Array(N);for(let i=0;i<N;i++)o[i]=a[i]+b[i];return o;})();
  const mix=(b0,k)=>{const o=new Float64Array(N);let m=0;for(let i=0;i<N;i++){o[i]=b0[i]+k*add[i];if(o[i]>m)m=o[i];}for(let i=0;i<N;i++)o[i]/=m;return o;};
  const at=spd=>{const s=sums(spd),c=chroma(s[0],s[1],s[2]);return cctDuv(c.u,c.v);};
  let T0=T,out=base;
  for(let it=0;it<6;it++){const b0=synBase(kind,Math.max(SYN_RANGE[kind][0]*.8,Math.min(25000,T0)));let lo=0,hi=40;
    for(let k=0;k<26;k++){const mid=(lo+hi)/2,q=at(mix(b0,mid));if(Math.abs(q.duv)<Math.abs(duv))lo=mid;else hi=mid;}
    out=mix(b0,(lo+hi)/2);const q=at(out);if(!q.cct)break;if(Math.abs(q.cct-T)<2)break;T0*=T/q.cct;}
  return out;}
const synName=(P)=>'Synthetic '+({planck:'blackbody',daylight:'daylight',mix:'reference light'})[P.kind]+' '+Math.round(P.cct)+' K'+(P.duv?', Duv '+(P.duv>0?'+':'−')+Math.abs(P.duv).toFixed(3):'');
const synCache=new Map();
function synItem(id){const P=cmp.syn[id.slice(4)];if(!P)return null;
  const T=Math.max(SYN_RANGE[P.kind][0],Math.min(SYN_RANGE[P.kind][1],P.cct)),key=P.kind+'|'+T+'|'+P.duv;let it=synCache.get(key);
  if(!it){const spd=synSpd(P.kind,T,P.duv);it={id,name:synName({kind:P.kind,cct:T,duv:P.duv}),spd,q:quality(spd)};if(synCache.size>40)synCache.clear();synCache.set(key,it);}
  return{id,name:it.name,spd:it.spd,q:it.q};}
/* controls */
function synBuild(X){const el=$('cm-syn'+X);el.innerHTML=`<button class="btn sm" data-syn="on">Use a synthetic light</button><div class="synctl" hidden>
  <label>Type <select data-syn="kind">${Object.entries(SYN_KINDS).map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select></label>
  <label>CCT <input type="range" data-syn="cct" min="1500" max="25000" step="50"><input type="number" data-syn="cctn" min="1500" max="25000" step="50"> K</label>
  <label>Duv <input type="range" data-syn="duv" min="-0.03" max="0.03" step="0.001"><input type="number" data-syn="duvn" min="-0.03" max="0.03" step="0.001"></label>
  <p class="hint" style="margin:0">Duv above 0 is greener, below 0 more magenta. “Daylight” starts at 4000 K. Pick a light from the library above to leave the synthetic one.</p></div>`;
  let t=0;const apply=()=>{if(t)return;t=requestAnimationFrame(()=>{t=0;cmp.keepFrame=false;cmpUpdate(false);});};
  el.addEventListener('click',e=>{if(e.target.dataset.syn==='on'){cmp[X]='syn:'+X;cmp.keepFrame=false;cmpUpdate(true);}});
  el.addEventListener('input',e=>{const P=cmp.syn[X],k=e.target.dataset.syn;if(!k)return;const v=+e.target.value;
    if(k==='kind'){P.kind=e.target.value;P.cct=Math.max(SYN_RANGE[P.kind][0],P.cct);}
    else if(k==='cct'||k==='cctn')P.cct=Math.max(1500,Math.min(25000,v||P.cct));
    else if(k==='duv'||k==='duvn')P.duv=Math.max(-.03,Math.min(.03,isFinite(v)?v:0));
    synFill(X,e.target);apply();});}
function synFill(X,skip){const el=$('cm-syn'+X),P=cmp.syn[X],on=cmp[X]==='syn:'+X,set=(k,v)=>{const i=el.querySelector('[data-syn="'+k+'"]');if(i&&i!==skip)i.value=v;};
  el.querySelector('.synctl').hidden=!on;el.querySelector('[data-syn="on"]').hidden=on;
  set('kind',P.kind);set('cct',P.cct);set('cctn',Math.round(P.cct));set('duv',P.duv);set('duvn',P.duv);
  const r=SYN_RANGE[P.kind];el.querySelector('[data-syn="cct"]').min=el.querySelector('[data-syn="cctn"]').min=r[0];}
function synSync(){for(const X of ['A','B'])synFill(X);}
function synSwap(){const t=cmp.syn.A;cmp.syn.A=cmp.syn.B;cmp.syn.B=t;}
synBuild('A');synBuild('B');synSync();
