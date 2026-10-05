/* ---------- events ---------- */
for(const k of ['A','B']){
  $('l'+k+'-src').onchange=e=>{lab[k].src=e.target.value;$('l'+k+'-bb').hidden=lab[k].src!=='bb';labUpdate();if(lab.mode==='one'&&lab.follow)frameErrors();};
  const setC=v=>{v=Math.min(25000,Math.max(1000,Math.round(+v)||lab[k].cct));lab[k].cct=v;$('l'+k+'-ncct').value=v;$('l'+k+'-cct').value=Math.min(12000,v);labUpdate();};
  $('l'+k+'-cct').oninput=e=>setC(e.target.value);$('l'+k+'-ncct').onchange=e=>setC(e.target.value);
  $('lp-'+k).addEventListener('click',e=>{const b=e.target.closest('[data-cct]');if(b)setC(b.dataset.cct);});}
$('l-swap').onclick=()=>{const t=lab.A;lab.A=lab.B;lab.B=t;fillSrc();labUpdate();if(lab.mode==='one'&&lab.follow)frameErrors();};
$('l-dmode').onchange=e=>{lab.dmode=e.target.value;$('l-dview').hidden=lab.dmode!=='view';$('l-dman').hidden=lab.dmode!=='manual';labUpdate();};
$('l-la').onchange=e=>{lab.LA=Math.max(1,+e.target.value||64);labUpdate();};
$('l-f').onchange=e=>{lab.F=+e.target.value;labUpdate();};
$('l-dr').oninput=e=>{lab.dman=+e.target.value;labUpdate();};
function setLMode(m){lab.mode=m;$('lm-one').setAttribute('aria-pressed',m==='one');$('lm-all').setAttribute('aria-pressed',m==='all');renderNote();
  if(m==='one'&&lab.follow)frameErrors();else if(m==='all'){view.fit();view.request();}else view.request();}
$('lm-one').onclick=()=>setLMode('one');$('lm-all').onclick=()=>setLMode('all');
function setSpace(s){view.mode=s;$('ls-uv').setAttribute('aria-pressed',s==='uv');$('ls-xy').setAttribute('aria-pressed',s==='xy');view.fit();if(lab.mode==='one'&&lab.follow)frameErrors();else view.request();}
$('ls-uv').onclick=()=>setSpace('uv');$('ls-xy').onclick=()=>setSpace('xy');
$('lf-journey').onclick=frameJourney;$('lf-err').onclick=frameErrors;$('lf-whole').onclick=()=>{view.fit();view.request();};
$('lz-fit').onclick=()=>{view.fit();view.request();};
$('lz-in').onclick=()=>view.zoomAt((view.W+view.PAD.l-view.PAD.r)/2,(view.H-view.PAD.b+view.PAD.t)/2,1.5);
$('lz-out').onclick=()=>view.zoomAt((view.W+view.PAD.l-view.PAD.r)/2,(view.H-view.PAD.b+view.PAD.t)/2,1/1.5);
$('lc-follow').onchange=e=>{lab.follow=e.target.checked;if(lab.follow&&lab.mode==='one')frameErrors();};
$('lc-mag').oninput=e=>{lab.mag=+e.target.value;$('lc-magv').textContent='×'+lab.mag;renderNote();view.request();};
$('lc-shift').onchange=e=>{lab.showShift=e.target.checked;view.request();};
$('lc-planck').onchange=e=>{lab.planck=e.target.checked;view.request();};
$('lboard').addEventListener('click',e=>{const row=e.target.closest('.brow');if(!row||row.classList.contains('ref'))return;
  const vis=e.target.closest('[data-vis]');
  if(vis){lab.vis[vis.dataset.vis]=vis.checked;view.request();if(lab.mode==='one'&&lab.follow)frameErrors();return;}
  lab.cat=row.dataset.cat;labCatChanged();});
$('llist').addEventListener('click',e=>{const b=e.target.closest('.item');if(b)labSelect(b.dataset.id);});
$('lq').oninput=e=>{lab.q=e.target.value.trim();renderLList();view.request();};
$('l-sort').onchange=e=>{lab.sort=e.target.value;renderLList();};
$('lb-min').onchange=e=>{lab.minLight=+e.target.value;computeStats();renderBoard();renderLList();view.request();};
$('lb-neutral').onchange=e=>{lab.skipNeutral=e.target.checked;computeStats();renderBoard();renderLList();view.request();};

