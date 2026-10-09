/* ---- list ---- */
const natCmp=(x,y)=>x.code.localeCompare(y.code,undefined,{numeric:true})||x.name.localeCompare(y.name,undefined,{numeric:true});
function sorted(){const a=[...st.filters.values()];const k=st.sort;
  if(k==='code')a.sort(natCmp);
  else if(k==='Y')a.sort((x,y)=>y.res.Yr-x.res.Yr);
  else if(k==='shift')a.sort((x,y)=>x.res.shift-y.res.shift);
  else if(k==='cct')a.sort((x,y)=>(x.res.cct??1e9)-(y.res.cct??1e9));
  else if(k==='duv')a.sort((x,y)=>Math.abs(x.res.duv)-Math.abs(y.res.duv));
  else if(k.startsWith('m:')){const m=k.slice(2);a.sort((x,y)=>(x.res.m[m]??1e9)-(y.res.m[m]??1e9));}
  return a;}
function matches(f){if(!st.q)return true;const n=(f.code+' '+f.name).toLowerCase();return st.q.toLowerCase().split(/\s+/).every(t=>n.includes(t));}
function renderList(){
  const a=sorted().filter(matches);
  $('count').textContent=`(${a.length}${a.length!==st.filters.size?' of '+st.filters.size:''})`;
  $('list').innerHTML=a.length?a.map(f=>{const r=f.res,rest=f.name.startsWith(f.code)?f.name.slice(f.code.length).trim():f.name;
    return `<button class="item" data-id="${esc(f.id)}" aria-current="${f.id===st.sel}"><span class="sw" style="background:${r.css}"></span><span class="code">${esc(f.code)}</span><span class="nm" title="${esc(f.name)}">${esc(rest)}</span><span class="num">${fmt(r.Yr*100,1)}%</span><span class="num">${r.cct?Math.round(r.cct)+' K':'—'}</span></button>`;}).join('')
    :`<div class="empty">${st.filters.size?tk('No {filters} match.'):tk('No {filters} loaded yet.')}</div>`;}
function renderSource(){
  const r=st.srcRes;const nm=srcName({src:st.src,cct:st.cct,id:st.libId});
  $('srcrow').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.src===st.src));
  $('srcrow').querySelectorAll('button').forEach(b=>{b.classList.toggle('primary',b.dataset.src===st.src);});
  $('bbbox').hidden=st.src!=='bb';$('libbox').hidden=st.src!=='lib';if(st.src==='lib'){mapPick.refresh();const it=LED.items.get(st.libId);$('libinfo').textContent=it?(it.q.ok?'Rf '+Math.round(it.q.tm30.Rf)+' · Rg '+Math.round(it.q.tm30.Rg)+' · CRI Ra '+Math.round(it.q.cri.Ra)+' · R9 '+Math.round(it.q.cri.R[8]):''):'';}
  $('srcread').innerHTML=[['x',fmt(r.x,4)],['y',fmt(r.y,4)],['CCT',r.cct?Math.round(r.cct)+' K':'—'],['Duv',fmt(r.duv,4)]].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
  st.srcName=nm;}
function renderDetail(){
  const f=st.sel&&st.filters.get(st.sel);const el=$('detail');
  if(!f){el.innerHTML='<h2>'+tk('Selected {filter}')+'</h2><div class="empty">'+tk('Select a {filter} in the list or on the diagram.')+'</div>';return;}
  const r=f.res;
  el.innerHTML=`<h3><span class="sw" style="background:${r.css};width:18px;height:18px"></span>${esc(f.name)}</h3>
  <div class="note">under ${esc(st.srcName)}</div>
  <div class="readout">${[[tk('{Out}'),fmt(r.Yr*100,1)+' %'],['x',fmt(r.x,4)],['y',fmt(r.y,4)],['u′',fmt(r.up,4)],['v′',fmt(r.vp,4)],
    ['CCT',r.cct?Math.round(r.cct)+' K':'—']].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}
    <div class="kv"><span>Duv</span><b>${fmt(r.duv,4)}</b></div><div class="kv"><span>Shift Δu′v′</span><b>${fmt(r.shift,4)}</b></div>${metricColumns().map(c=>`<div class="kv"><span>${esc(c.label)}</span><b>${fmtMetric(c,r.m[c.key])}</b></div>`).join('')}</div>
  <canvas id="sp"></canvas>
  <div class="legend"><span><i style="border-color:var(--muted);border-top-style:solid;opacity:.6"></i>Source</span><span><i style="border-color:var(--fg);border-top-style:dashed"></i>${tk('{curve}')}</span><span><i style="border-color:var(--accent)"></i>Resulting light</span></div>`;
  drawSpec(f);}
function renderAll(){renderSource();renderList();renderDetail();requestDraw();if(window.labRefresh)labRefresh();if(window.cmpRefresh)cmpRefresh();if(window.o1Refresh)o1Refresh();if(window.m1Refresh)m1Refresh();}

