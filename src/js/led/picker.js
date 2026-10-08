/* Searchable light chooser for the LED library: mountPicker(host, {get, set}). `get()` returns the current id (or ''),
   `set(id)` is called when the user picks one. Shows at most 80 matches at a time, so it stays fast with thousands of lights. */
const fmtK=v=>v?Math.round(v)+' K':'—';
function ledOneLine(it){const q=it.q,a=ledVal(it,'Ra'),f=ledVal(it,'Rf');
  return`<span class="pk-n">${esc(it.name)}</span><span class="pk-m">${fmtK(q.cct)}</span><span class="pk-m">${a==null?'—':'Ra '+Math.round(a)}</span><span class="pk-m">${f==null?'—':'Rf '+Math.round(f)}</span>`;}
function mountPicker(host,o){
  host.classList.add('picker');
  host.innerHTML='<input type="search" class="pk-in" autocomplete="off" aria-label="Search the LED library" placeholder="Search the LED library…"><div class="pk-list" role="listbox" hidden></div>';
  const inp=host.querySelector('input'),box=host.querySelector('.pk-list');let hi=-1,rows=[];
  const label=()=>{const it=LED.items.get(o.get());inp.value=it?it.name:(o.text?o.text():'');};
  function show(){const q=inp.dataset.typing?inp.value:'';rows=ledAll().filter(it=>ledMatch(it,q)).sort((a,b)=>(a.kind===b.kind?0:a.kind==='usr'?-1:1)||a.name.localeCompare(b.name,undefined,{numeric:true})).slice(0,80);
    box.innerHTML=rows.length?rows.map((it,i)=>`<div class="pk-row" role="option" data-i="${i}" aria-selected="${it.id===o.get()}">${ledOneLine(it)}</div>`).join(''):'<div class="pk-none">No light matches.</div>';
    box.hidden=false;hi=-1;}
  const pick=i=>{const it=rows[i];if(!it)return;box.hidden=true;delete inp.dataset.typing;o.set(it.id);label();inp.blur();};
  inp.addEventListener('focus',()=>{inp.select();show();});
  inp.addEventListener('input',()=>{inp.dataset.typing='1';show();});
  inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();hi=Math.max(0,Math.min(rows.length-1,hi+(e.key==='ArrowDown'?1:-1)));
      box.querySelectorAll('.pk-row').forEach((r,i)=>r.classList.toggle('on',i===hi));box.querySelector('.on')?.scrollIntoView({block:'nearest'});}
    else if(e.key==='Enter'){e.preventDefault();pick(hi<0?0:hi);}else if(e.key==='Escape'){box.hidden=true;delete inp.dataset.typing;label();inp.blur();}});
  box.addEventListener('pointerdown',e=>{const r=e.target.closest('.pk-row');if(r){e.preventDefault();pick(+r.dataset.i);}});
  inp.addEventListener('blur',()=>setTimeout(()=>{box.hidden=true;delete inp.dataset.typing;label();},120));
  label();return{refresh:label};}
