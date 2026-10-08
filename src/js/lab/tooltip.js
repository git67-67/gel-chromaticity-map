/* ---------- tooltip ---------- */
const view=new CView($('lcv'),$('lplot'),{
  onDraw:drawContent,
  onHover(h,p){const tip=$('ltip');const next=h?h.data:null;
    const changed=JSON.stringify(next)!==JSON.stringify(lab.hover);lab.hover=next;
    if(!h){tip.hidden=true;$('lcv').style.cursor='crosshair';if(changed)view.request();return;}
    $('lcv').style.cursor=(h.data.t==='row'||h.data.t==='cat')?'pointer':'crosshair';
    tip.innerHTML=tipHTML(h.data);tip.hidden=false;
    const pr=$('lplot').getBoundingClientRect(),cr=$('lcv').getBoundingClientRect();let l=p[0]*cr.width/view.W+14,t=p[1]*cr.height/view.H+14;
    const tw=tip.offsetWidth,th=tip.offsetHeight;if(l+tw>pr.width-6)l-=tw+28;if(t+th>pr.height-6)t-=th+28;tip.style.left=Math.max(4,l)+'px';tip.style.top=Math.max(4,t)+'px';
    if(changed&&h.data.t==='row')view.request();},
  onClick(h){if(h.data.t==='row')labSelect(h.data.id);else if(h.data.t==='cat'){lab.cat=CATS[h.data.i].id;labCatChanged();}}
});
function tipHTML(d){const R=lab.res;
  if(d.t==='row'){const r=R.byId.get(d.id);if(!r)return '';const idx=CATS.map((c,i)=>i).sort((a,b)=>(r.preds[a].err||9)-(r.preds[b].err||9));
    return '<b>'+esc(r.f.name)+'</b>'+'<span>true u′ '+f4(r.B.u)+'  v′ '+f4(r.B.v)+'</span>'+'<span>real shift A→B '+f4(r.base)+'</span>'+
      idx.map((i,k)=>'<span'+(k===0?' style="color:var(--fg)"':'')+'>'+CATS[i].short.padEnd(6,' ')+' '+f4(r.preds[i].err)+(k===0?'  best':'')+'</span>').join('');}
  const r=R.byId.get(st.sel);if(!r)return '';
  if(d.t==='A')return '<b>'+esc(r.f.name)+' under A</b><span>u′ '+f4(r.A.u)+'  v′ '+f4(r.A.v)+'</span><span>x '+f4(r.A.x)+'  y '+f4(r.A.y)+'</span>';
  if(d.t==='B')return '<b>True colour under B</b><span>u′ '+f4(r.B.u)+'  v′ '+f4(r.B.v)+'</span><span>x '+f4(r.B.x)+'  y '+f4(r.B.y)+'</span><span>'+tk('{out}')+' '+(r.yB*100).toFixed(1)+' %</span>';
  const p=r.preds[d.i];return '<b>'+esc(CATS[d.i].name)+'</b><span>u′ '+f4(p.pt&&p.pt.u)+'  v′ '+f4(p.pt&&p.pt.v)+'</span><span>error Δu′v′ '+f4(p.err)+'</span><span>click to select this CAT</span>';}

