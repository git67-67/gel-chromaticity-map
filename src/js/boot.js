/* Start-up. Runs last, after every module has defined its functions and state. */
readCols();readLCols();
renderDatasetSwitch();renderMetricSort();
ledLoadStandard();
ledLoadSaved().then(n=>{if(n&&st.src==='lib')recompute();});
loadBuiltin(DEFAULT_KIND);   // start with the built-in example gels so the page is useful before any import
usLoad().then(n=>{   // saved spectra sets: switch to the last data set you used, if it holds your saved spectra
  usRefresh();const k=(US.last&&userSets.has(US.last))?US.last:(userSets.has(st.kind)?st.kind:null);
  if(k){loadBuiltin(k);if(typeof fitView==='function')fitView();recompute();}});
sizeCanvas();recompute();
fillSrc();
if(!st.sel||!st.filters.has(st.sel))st.sel=firstId();
let startHash='';try{startHash=location.hash;}catch(e){}
{const t=Object.keys(TABS).find(k=>TABS[k].hash&&TABS[k].hash===startHash);if(t)showTab(t);}

/* Installable / offline: only when served over http(s) (GitHub Pages, localhost); file:// and sandboxes just skip it. */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(()=>{});}
