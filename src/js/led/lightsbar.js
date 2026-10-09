/* The strip at the top of "Lights for a filter" and "Filter match": which lights A and B are, and a button to change them in LED compare. */
function lbOne(L,tag){if(!L)return`<span><b>${tag}</b> none chosen</span>`;const q=L.q;
  return`<span><b>${tag}</b> ${esc(L.name)}${q&&q.cct?' · '+Math.round(q.cct)+' K':''}${q&&q.cri?' · Ra '+Math.round(q.cri.Ra):''}</span>`;}
function lbRender(id,both){const el=$(id);if(!el)return;
  const wp=cmp.wp.mode==='none'?'':' · white point: '+esc(cmpWpName(cmp.wp)),
    set=both?'':'<span class="lb-set">Settings from LED compare: '+(cmp.equal==='power'?'equal watts':'equal lumens')+' · '+cmSpaceName()+' for ΔE'+wp+'</span>';
  el.innerHTML=lbOne(cmLight(cmp.A),'Light A')+(both?lbOne(cmLight(cmp.B),'Light B'):'')+set+'<button class="btn sm" type="button" data-lb="go">Change lights in LED compare</button>';}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-lb="go"]')){showTab('cmp');requestAnimationFrame(()=>{const a=$('cm-pickA');if(a)a.scrollIntoView({block:'center'});});}});
