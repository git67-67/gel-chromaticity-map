/* Metric plug-ins: extra numbers computed for every spectrum (CRI, TM-30, ...).
   A metric is an object:
     { id:'peak', title:'Output peak',
       columns:[{key:'peakNm', label:'Peak', digits:0, unit:' nm', sortable:true}],
       compute(ctx){ return {peakNm: 452}; } }          // keys must match the columns
   ctx (everything is on the 380-780 nm, 1 nm grid, index 0 = 380 nm):
     ctx.spd     Float64Array  the light source
     ctx.T       Float64Array | null  the filter transmission or pigment reflectance (null = the bare source)
     ctx.out     Float64Array  spd * T, the light that reaches the eye
     ctx.xyz     [X,Y,Z]       of ctx.out, scaled so the bare source has Y = 100
     ctx.chroma  {x,y,u,v,up,vp}  chromaticity of ctx.out
   Register it with registerMetric() and list the file in src/js/manifest.txt. Nothing else needs to change:
   the detail panel, the CSV export and the sort menu pick the columns up. See docs/ARCHITECTURE.md. */
const METRICS=[];
function registerMetric(m){METRICS.push(m);}
function metricColumns(){return METRICS.flatMap(m=>m.columns.map(c=>({...c,metric:m.id})));}
function runMetrics(ctx){const o={};
  for(const m of METRICS){try{Object.assign(o,m.compute(ctx));}catch(e){console.warn('metric '+m.id+' failed',e);}}
  return o;}
function metricCtx(spd,T,k){const out=new Float64Array(N);for(let i=0;i<N;i++)out[i]=T?spd[i]*T[i]:spd[i];
  const s=sums(spd,T),sc=k?100/k:1,xyz=[s[0]*sc,s[1]*sc,s[2]*sc];
  return{spd,T,out,xyz,chroma:chroma(s[0],s[1],s[2])};}
function fmtMetric(c,v){return v==null||!isFinite(v)?'—':v.toFixed(c.digits??2)+(c.unit||'');}
/* Add the sortable metric columns to the sort menus (called once at start-up). */
function renderMetricSort(){
  for(const id of ['s-sort']){const sel=$(id);if(!sel)continue;
    for(const c of metricColumns())if(c.sortable)sel.insertAdjacentHTML('beforeend',`<option value="m:${esc(c.key)}">${esc(c.label)}</option>`);}}
