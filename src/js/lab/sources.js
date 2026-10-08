/* ---------- light sources ---------- */
const LSRC=[['pcw','White LED (example)'],['rgb','RGB white LED (example)'],['d65','D65 daylight'],['bb','Blackbody'],['ee','Equal energy']];
function spdOf(s){if(s.src==='bb')return planckSPD(s.cct);if(s.src==='led'&&st.led)return st.led;
  if(s.src==='lib'){const it=LED.items.get(s.id);if(it)return it.spd;}
  if(s.src==='ref'){const it=LED.items.get(s.id),r=it&&ledReference(it);if(r)return r.spd;}
  return (SRC[s.src]||SRC.pcw).spd;}
function srcName(s){if(s.src==='lib'){const it=LED.items.get(s.id);if(it)return it.name;}
  if(s.src==='ref'){const it=LED.items.get(s.id),r=it&&ledReference(it);if(r)return r.name+' (ideal match for '+it.name+')';}
  if(s.src==='bb')return 'blackbody '+Math.round(s.cct)+' K';if(s.src==='led')return st.ledName||'imported LED';return (SRC[s.src]||SRC.pcw).name;}
function srcPanel(k,title){
  return '<div class="ph"><h2>'+title+'</h2>'+(k==='A'?'<button class="btn sm" id="l-swap" title="Swap A and B">⇄ Swap</button>':'')+'</div>'+
  '<div class="field" style="margin-top:0"><label for="l'+k+'-src">Light source</label><select id="l'+k+'-src"></select></div>'+
  '<div class="field" id="l'+k+'-lib" hidden><div id="l'+k+'-pick"></div></div>'+
  '<div class="field" id="l'+k+'-bb" hidden><label for="l'+k+'-cct"><span>Colour temperature</span><span><input type="number" id="l'+k+'-ncct" min="1000" max="25000" step="50"> K</span></label>'+
  '<input type="range" id="l'+k+'-cct" min="1000" max="12000" step="50">'+
  '<div class="row">'+[2700,3200,4300,5600,6500].map(t=>'<button class="btn sm" data-k="'+k+'" data-cct="'+t+'">'+t+'</button>').join('')+'</div></div>'+
  '<div class="readout" id="l'+k+'-read"></div>';}
$('lp-A').innerHTML=srcPanel('A','Light A (from)');
$('lp-B').innerHTML=srcPanel('B','Light B (to)');
const labPick={};
for(const k of ['A','B'])labPick[k]=mountPicker($('l'+k+'-pick'),{get:()=>lab[k].id||'',set:id=>{lab[k]={src:'lib',id,cct:lab[k].cct};labUpdate();if(lab.mode==='one'&&lab.follow)frameErrors();}});
function fillSrc(){for(const k of ['A','B']){const sel=$('l'+k+'-src'),opts=LSRC.slice();opts.push(['lib','LED library…']);
  if(st.led)opts.push(['led',st.ledName||'Imported LED']);
  if(lab[k].src==='led'&&!st.led)lab[k].src='pcw';
  sel.innerHTML=opts.map(o=>'<option value="'+o[0]+'">'+esc(o[1])+'</option>').join('');sel.value=lab[k].src;
  $('l'+k+'-bb').hidden=lab[k].src!=='bb';$('l'+k+'-lib').hidden=lab[k].src!=='lib';if(labPick[k])labPick[k].refresh();$('l'+k+'-ncct').value=lab[k].cct;$('l'+k+'-cct').value=Math.min(12000,lab[k].cct);}}

