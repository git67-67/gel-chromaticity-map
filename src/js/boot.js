/* Start-up. Runs last, after every module has defined its functions and state. */
readCols();readLCols();
renderDatasetSwitch();renderMetricSort();
loadBuiltin('lee');          // start with the built-in LEE set so the page is useful before any import
sizeCanvas();recompute();
fillSrc();
if(!st.sel||!st.filters.has(st.sel))st.sel=firstId();
let startHash='';try{startHash=location.hash;}catch(e){}
if(startHash==='#lab')showTab('lab');
