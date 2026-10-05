/* Data-set registry.
   A data set is one family of spectra (a gel catalogue, a paint range, ...) plus the words the UI uses for it.
   Register one with registerDataset(); the header switch, the import panel and every label pick it up automatically.
   See docs/ARCHITECTURE.md ("Add a data set"). */
const DATASETS=new Map();   // id -> definition
const KIND={};              // id -> vocabulary, used by tk() and the CSV export
/* definition = {
     id, label,                 // label is the button text
     noun,                      // used in "292 {noun} are built in"
     measure,                   // 'transmission' | 'reflectance' (shown in the import panel)
     vocab:{...},               // words for the UI, see the two built-in sets for every key
     entries(){ return [{id,name,code?,wl:[nm...],v:[fraction...]}] }   // code '' = no catalogue number
   } */
function registerDataset(d){DATASETS.set(d.id,d);KIND[d.id]=d.vocab;}

/* {token} placeholders in the HTML (class="tk") are filled from the active data set's vocab. */
function tk(s){const K=KIND[st.kind]||KIND[DATASETS.keys().next().value];return String(s).replace(/\{(\w+)\}/g,(m,k)=>K[k]!==undefined?K[k]:m);}
function applyTerms(){
  document.documentElement.dataset.kind=st.kind;
  if(KIND[st.kind].noCode)document.documentElement.dataset.nocode='1';else delete document.documentElement.dataset.nocode;
  document.querySelectorAll('.tk').forEach(el=>{if(el._tpl===undefined)el._tpl=el.innerHTML;el.innerHTML=tk(el._tpl);});
  document.querySelectorAll('[data-tk-al]').forEach(el=>el.setAttribute('aria-label',tk(el.dataset.tkAl)));
  document.querySelectorAll('[data-tk-ph]').forEach(el=>el.setAttribute('placeholder',tk(el.dataset.tkPh)));
  $('attrib').textContent=KIND[st.kind].attrib;
  document.querySelectorAll('#dsseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ds===st.kind));
  const k=$('imp-kind');if(k)k.value=st.kind;}

/* header switch + the "imported spectra are" selector, built from the registry */
function renderDatasetSwitch(){
  $('dsseg').innerHTML=[...DATASETS.values()].map(d=>`<button data-ds="${esc(d.id)}" aria-pressed="false">${esc(d.label)}</button>`).join('');
  $('dsseg').onclick=e=>{const b=e.target.closest('button[data-ds]');if(b)setKind(b.dataset.ds);};
  const k=$('imp-kind');
  if(k){k.innerHTML=[...DATASETS.values()].map(d=>`<option value="${esc(d.id)}">${esc(d.vocab.Filters)} (${esc(d.measure)})</option>`).join('');
    k.onchange=()=>{st.kind=k.value;applyTerms();renderAll();};}}

function loadBuiltin(kind){
  kind=kind||st.kind||DATASETS.keys().next().value;const d=DATASETS.get(kind);st.kind=kind;
  st.filters.clear();st.names.clear();
  for(const e of d.entries()){st.names.set(e.id,e.name);addFilter({...e,demo:true});}
  st.demo=true;st.sel=d.vocab.sel;st.q='';const qe=$('q');if(qe)qe.value='';
  applyTerms();
  if(typeof labDatasetChanged==='function')labDatasetChanged();
  setStatus(`${st.filters.size} ${d.noun} are built in. Import your own CSVs to replace them.`);}
function setKind(k){loadBuiltin(k);if(typeof fitView==='function')fitView();recompute();}
