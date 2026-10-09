/* ---------- tabs ---------- */
const TABS={map:{view:'view-map',btn:'t-map',hash:''},lab:{view:'view-lab',btn:'t-lab',hash:'#lab'},leds:{view:'view-leds',btn:'t-leds',hash:'#leds'},cmp:{view:'view-cmp',btn:'t-cmp',hash:'#compare'},o1:{view:'view-o1',btn:'t-o1',hash:'#filter-lights'},m1:{view:'view-m1',btn:'t-m1',hash:'#filter-match'}};
function showTab(which){const isLab=which==='lab';
  for(const k in TABS){$(TABS[k].view).hidden=k!==which;$(TABS[k].btn).setAttribute('aria-selected',k===which);}
  lab.visible=isLab;ld.visible=which==='leds';cmp.visible=which==='cmp';o1.visible=which==='o1';m1.visible=which==='m1';
  try{history.replaceState(null,'',TABS[which].hash||location.pathname+location.search);}catch(e){}
  if(isLab){requestAnimationFrame(()=>{fillSrc();view.size();if(lab.dirty||!lab.res)labUpdate();else{drawLabSpectrum();view.request();}
    if(!lab.framed){lab.framed=true;if(lab.mode==='one'&&lab.follow)frameErrors();}});}
  else if(which==='leds')ledsShow();
  else if(which==='cmp')cmpShow();
  else if(which==='o1')requestAnimationFrame(o1Update);
  else if(which==='m1')requestAnimationFrame(m1Update);
  else{requestAnimationFrame(()=>{if(st.sel&&st.filters.has(st.sel))select(st.sel,true);});}}
for(const k in TABS)$(TABS[k].btn).onclick=()=>showTab(k);

/* theme + resize */
function labTheme(){readLCols();if(lab.visible&&lab.res){view.bgKey='';view.request();renderBoard();renderLList();drawLabSpectrum();}}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',labTheme);
new MutationObserver(labTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
new ResizeObserver(()=>{if(lab.visible){view.size();drawLabSpectrum();}}).observe($('lplot'));
