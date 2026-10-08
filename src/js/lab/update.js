/* ---------- updates ---------- */
function frameErrors(){const R=lab.res,r=R&&R.byId.get(st.sel);if(!r)return;const pts=[view.crd(r.B)];
  CATS.forEach((c,i)=>{if(lab.vis[c.id]&&r.preds[i].pt)pts.push(view.crd(r.preds[i].pt));});
  let a=Math.min(...pts.map(p=>p[0])),b=Math.min(...pts.map(p=>p[1])),c=Math.max(...pts.map(p=>p[0])),d=Math.max(...pts.map(p=>p[1]));
  const sp=Math.max(c-a,d-b,view.mode==='xy'?.01:.012),cxm=(a+c)/2,cym=(b+d)/2,hs=sp*.75;view.frame(cxm-hs*1.15,cym-hs,cxm+hs*1.15,cym+hs);}
function frameJourney(){const R=lab.res,r=R&&R.byId.get(st.sel);if(!r)return;const pts=[view.crd(r.A),view.crd(r.B),view.crd(R.wA),view.crd(R.wB)];
  CATS.forEach((c,i)=>{if(lab.vis[c.id]&&r.preds[i].pt)pts.push(view.crd(r.preds[i].pt));});
  const a=Math.min(...pts.map(p=>p[0])),b=Math.min(...pts.map(p=>p[1])),c=Math.max(...pts.map(p=>p[0])),d=Math.max(...pts.map(p=>p[1])),sp=Math.max(c-a,d-b,.02),pad=sp*.2;
  view.frame((a+c)/2-(sp/2+pad)*1.15,(b+d)/2-(sp/2+pad),(a+c)/2+(sp/2+pad)*1.15,(b+d)/2+(sp/2+pad));}
function labUpdate(){lab.dirty=false;labCompute();renderSrcReads();renderBoard();renderLList();renderExplain();renderNote();drawLabSpectrum();view.request();}
function labDatasetChanged(){lab.q='';const e=$('lq');if(e)e.value='';lab.dirty=true;lab.framed=false;}
function labRefresh(){lab.dirty=true;fillSrc();if(lab.visible)labUpdate();}
function labSelect(id){st.sel=id;renderLList();renderExplain();drawLabSpectrum();
  const el=$('llist').querySelector('[aria-current="true"]');if(el)el.scrollIntoView({block:'nearest'});
  if(lab.mode==='one'&&lab.follow)frameErrors();else view.request();}
function labCatChanged(){renderBoard();renderLList();renderExplain();renderNote();drawLabSpectrum();view.request();}

