/* ---------- tabs ---------- */
function showTab(which){const isLab=which==='lab';
  $('view-map').hidden=isLab;$('view-lab').hidden=!isLab;
  $('t-map').setAttribute('aria-selected',!isLab);$('t-lab').setAttribute('aria-selected',isLab);lab.visible=isLab;
  try{history.replaceState(null,'',isLab?'#lab':location.pathname+location.search);}catch(e){}
  if(isLab){requestAnimationFrame(()=>{fillSrc();view.size();if(lab.dirty||!lab.res)labUpdate();else{drawLabSpectrum();view.request();}
    if(!lab.framed){lab.framed=true;if(lab.mode==='one'&&lab.follow)frameErrors();}});}
  else{requestAnimationFrame(()=>{if(st.sel&&st.filters.has(st.sel))select(st.sel,true);});}}
$('t-map').onclick=()=>showTab('map');$('t-lab').onclick=()=>showTab('lab');

/* theme + resize */
function labTheme(){readLCols();if(lab.visible&&lab.res){view.bgKey='';view.request();renderBoard();renderLList();drawLabSpectrum();}}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',labTheme);
new MutationObserver(labTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
new ResizeObserver(()=>{if(lab.visible){view.size();drawLabSpectrum();}}).observe($('lplot'));
