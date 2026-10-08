/* ---------- panels ---------- */
function renderSrcReads(){const R=lab.res;
  for(const [k,w] of [['A',R.wA],['B',R.wB]]){const q=cctDuv(4*w.X/(w.X+15*w.Y+3*w.Z),6*w.Y/(w.X+15*w.Y+3*w.Z));
    $('l'+k+'-read').innerHTML=[['x',f4(w.x)],['y',f4(w.y)],['CCT',q.cct?Math.round(q.cct)+' K':'n/a'],['Duv',f4(q.duv)]].map(a=>'<div class="kv"><span>'+a[0]+'</span><b>'+a[1]+'</b></div>').join('');}
  $('l-dval').textContent=R.D.toFixed(3);$('l-dval2').textContent=R.D.toFixed(2);}
function renderBoard(){const R=lab.res,S=R.stats,fm=v=>(v*1000).toFixed(1);
  const order=CATS.map((c,i)=>i).filter(i=>S[CATS[i].id]).sort((a,b)=>S[CATS[a].id].mean-S[CATS[b].id].mean);
  const mx=S.base?S.base.mean:1;
  let h='<div class="bhead"><span></span><span>CAT</span><span>mean</span><span>median</span><span>95th</span><span>max</span></div>';
  order.forEach((i,rank)=>{const c=CATS[i],s=S[c.id];
    h+='<div class="brow" data-cat="'+c.id+'" aria-current="'+(c.id===lab.cat)+'"><input type="checkbox" data-vis="'+c.id+'" '+(lab.vis[c.id]?'checked':'')+' style="accent-color:'+lc.k[i]+'" aria-label="Show '+esc(c.name)+' in the diagram">'+
      '<button class="bn" title="'+esc(c.note)+'"><i class="chip2" style="background:'+lc.k[i]+'"></i><span>'+(rank===0?'★ ':'')+esc(c.name.replace(/ \(.*\)$/,''))+'</span></button>'+
      '<span class="v">'+fm(s.mean)+'</span><span class="v">'+fm(s.med)+'</span><span class="v">'+fm(s.p95)+'</span><span class="v">'+fm(s.max)+'</span>'+
      '<div class="bar"><i style="width:'+Math.min(100,s.mean/mx*100).toFixed(1)+'%;background:'+lc.k[i]+'"></i></div></div>';});
  if(S.base){const s=S.base;h+='<div class="brow ref"><span></span><span class="bn"><i class="chip2" style="background:var(--muted)"></i><span title="No adaptation at all: how far the colour really moves">No CAT</span></span><span class="v">'+fm(s.mean)+'</span><span class="v">'+fm(s.med)+'</span><span class="v">'+fm(s.p95)+'</span><span class="v">'+fm(s.max)+'</span><div class="bar"><i style="width:100%;background:var(--muted)"></i></div></div>';}
  $('lboard').innerHTML=h;
  $('lb-n').textContent=S.base?('Values are Δu′v′ × 1000, over '+S.base.n+' of '+R.rows.length+' '+tk('{filters}')+'. ★ marks the lowest mean error. The grey row (No CAT) is the real shift when nothing is adapted.'):tk('No {filters} match these settings.');}
function renderLList(){const R=lab.res,ci=catIdx(lab.cat);
  let a=R.inc.filter(r=>matchQ(r.f));const E=r=>r.preds[ci].err,num=x=>Number.isFinite(x)?x:-1;
  const nat=(x,y)=>x.f.code.localeCompare(y.f.code,undefined,{numeric:true})||x.f.name.localeCompare(y.f.name,undefined,{numeric:true});
  if(lab.sort==='err')a.sort((x,y)=>num(E(y))-num(E(x)));else if(lab.sort==='errasc')a.sort((x,y)=>(Number.isFinite(E(x))?E(x):9)-(Number.isFinite(E(y))?E(y):9));
  else if(lab.sort==='code')a.sort(nat);else if(lab.sort==='shift')a.sort((x,y)=>y.base-x.base);else a.sort((x,y)=>y.yB-x.yB);
  $('lcount').textContent='('+a.length+(a.length!==R.rows.length?' of '+R.rows.length:'')+')';
  $('llist').innerHTML=a.length?a.map(r=>{const f=r.f,rest=f.name.startsWith(f.code)?f.name.slice(f.code.length).trim():f.name;
    return '<button class="item" data-id="'+esc(f.id)+'" aria-current="'+(f.id===st.sel)+'"><span class="sw" style="background:'+cssOf(r.B)+'"></span><span class="code">'+esc(f.code)+'</span><span class="nm" title="'+esc(f.name)+'">'+esc(rest)+'</span><span class="num">'+f4(E(r))+'</span><span class="num" style="color:'+lc.k[r.best]+'">'+CATS[r.best].short+'</span></button>';}).join(''):'<div class="empty">'+tk('No {filters} match.')+'</div>';}
function renderExplain(){const R=lab.res,el=$('lexp'),r=R.byId.get(st.sel),ci=catIdx(lab.cat),c=CATS[ci];
  if(!r){el.innerHTML='<h2>Step by step</h2><div class="empty">'+tk('Pick a {filter} from the list or the diagram.')+'</div>';return;}
  const m=R.mats[ci],a=m3v(c.M,r.XA),wa=m3v(c.M,R.WA),wb=m3v(c.M,R.WB),ad=a.map((x,i)=>x*m.g[i]),p=r.preds[ci],fx=v=>v.map(x=>x.toFixed(4));
  const row=(n,v)=>'<tr><td>'+n+'</td>'+fx(v).map(x=>'<td>'+x+'</td>').join('')+'</tr>';
  const closed=r.base>1e-9&&Number.isFinite(p.err)?Math.round((1-p.err/r.base)*100):null;
  el.innerHTML='<h2>Step by step</h2><h3>'+esc(r.f.name)+' · '+esc(c.name)+'</h3>'+
  '<p class="hint" style="margin:4px 0 0">'+esc(c.note)+' Light A is '+esc(srcName(lab.A))+', light B is '+esc(srcName(lab.B))+', D = '+R.D.toFixed(2)+'.</p>'+
  '<div class="tw"><table><thead><tr><th>1 · XYZ into cone-like space</th><th>R</th><th>G</th><th>B</th></tr></thead><tbody>'+
  row(tk('{filter} under A'),a)+row('white A',wa)+row('white B',wb)+
  '<tr><td>2 · gain (new white ÷ old white, with D)</td>'+fx(m.g).map(x=>'<td>'+x+'</td>').join('')+'</tr>'+
  row(tk('{filter} after gain'),ad)+'</tbody></table></div>'+
  '<div class="tw"><table><thead><tr><th>3 · back to XYZ</th><th>X</th><th>Y</th><th>Z</th><th>u′</th><th>v′</th></tr></thead><tbody>'+
  '<tr><td>'+tk('{filter} under A (input)')+'</td>'+fx(r.XA).map(x=>'<td>'+x+'</td>').join('')+'<td>'+f4(r.A.u)+'</td><td>'+f4(r.A.v)+'</td></tr>'+
  '<tr><td>CAT prediction for B</td>'+fx(p.xyz).map(x=>'<td>'+x+'</td>').join('')+'<td>'+f4(p.pt&&p.pt.u)+'</td><td>'+f4(p.pt&&p.pt.v)+'</td></tr>'+
  '<tr><td>spectral truth for B</td>'+fx(r.XB).map(x=>'<td>'+x+'</td>').join('')+'<td>'+f4(r.B.u)+'</td><td>'+f4(r.B.v)+'</td></tr></tbody></table></div>'+
  '<div class="res"><div><i class="chip3" style="background:'+cssOf(p.pt)+'"></i><span><b>CAT prediction</b><span>colour on screen</span></span></div>'+
  '<div><i class="chip3" style="background:'+cssOf(r.B)+'"></i><span><b>Spectral truth</b><span>colour on screen</span></span></div>'+
  '<div><span><b>Error</b><span class="big">Δu′v′ '+f4(p.err)+'</span><span>'+(closed==null?'':'closes '+closed+' % of the A→B shift ('+f4(r.base)+')')+'</span></span></div></div>';}
function drawLabSpectrum(){const c=$('lsp'),R=lab.res;if(!c||!R||!lab.visible)return;if(!cols.fg)readCols();
  const w=c.clientWidth||400,h=220,d=Math.min(window.devicePixelRatio||1,2);c.width=w*d;c.height=h*d;const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
  const ci=catIdx(lab.cat),M=CATS[ci].M,prim=[0,1,2].map(k=>{const a=new Float64Array(N);let mx=0;for(let i=0;i<N;i++){a[i]=M[k][0]*XB[i]+M[k][1]*YB[i]+M[k][2]*ZB[i];mx=Math.max(mx,Math.abs(a[i]));}
    let pk=0;for(let i=0;i<N;i++)pk=Math.max(pk,a[i]);for(let i=0;i<N;i++)a[i]/=pk||1;return a;});
  let lo=0;prim.forEach(a=>{for(let i=0;i<N;i++)lo=Math.min(lo,a[i]);});lo=Math.floor((lo-.04)*4)/4;
  const L=38,Rr=8,T=8,B=24,pw=w-L-Rr,ph=h-T-B,X=l=>L+(l-380)/400*pw,Y=v=>T+(1-(v-lo)/(1.05-lo))*ph;
  g.font='10px '+FM;g.fillStyle=cols.muted;g.strokeStyle=cols.grid;g.lineWidth=1;g.textAlign='right';g.textBaseline='middle';
  for(let v=lo;v<=1.001;v+=.25){g.beginPath();g.moveTo(L,Y(v));g.lineTo(w-Rr,Y(v));g.stroke();g.fillText(v.toFixed(2),L-5,Y(v));}
  g.strokeStyle=cols.muted;g.beginPath();g.moveTo(L,Y(0));g.lineTo(w-Rr,Y(0));g.stroke();
  g.textAlign='center';g.textBaseline='top';for(let l=400;l<=780;l+=100){g.strokeStyle=cols.grid;g.beginPath();g.moveTo(X(l),T);g.lineTo(X(l),T+ph);g.stroke();g.fillText(l+' nm',X(l),T+ph+6);}
  const norm=S=>{let m=0;for(let i=0;i<N;i++)m=Math.max(m,S[i]);return S.map(v=>v/(m||1));};
  const nA=norm(R.SA),nB=norm(R.SB);
  g.beginPath();g.moveTo(X(380),Y(0));for(let i=0;i<N;i++)g.lineTo(X(WLS[i]),Y(nA[i]));g.lineTo(X(780),Y(0));g.closePath();g.fillStyle=cols.muted;g.globalAlpha=.22;g.fill();g.globalAlpha=1;
  g.strokeStyle=cols.muted;g.lineWidth=1.4;g.setLineDash([2,3]);g.beginPath();for(let i=0;i<N;i++){const x=X(WLS[i]),y=Y(nB[i]);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.setLineDash([]);
  const rr=R.byId.get(st.sel);
  if(rr){g.strokeStyle=cols.fg;g.lineWidth=1.8;g.setLineDash([6,3]);g.beginPath();for(let i=0;i<N;i++){const x=X(WLS[i]),y=Y(rr.f.T[i]);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.setLineDash([]);}
  [lc.cr,lc.cg,lc.cb].forEach((col,k)=>{g.strokeStyle=col;g.lineWidth=2;g.beginPath();for(let i=0;i<N;i++){const x=X(WLS[i]),y=Y(prim[k][i]);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();});
  $('lsplegend').innerHTML='<span><i style="border-color:var(--muted);opacity:.7"></i>Light A</span><span><i style="border-color:var(--muted);border-top-style:dotted"></i>Light B</span>'+
    '<span><i style="border-color:var(--fg);border-top-style:dashed"></i>'+tk('{curve}')+'</span>'+
    '<span><i style="border-color:'+lc.cr+'"></i>R</span><span><i style="border-color:'+lc.cg+'"></i>G</span><span><i style="border-color:'+lc.cb+'"></i>B of '+esc(CATS[ci].name)+' (each scaled to its peak)</span>';}
function renderNote(){const c=CATS[catIdx(lab.cat)];
  $('lnote').textContent=tk(lab.mode==='one'
   ?'The dashed arrow is how the {filter}\'s colour really moves from light A to light B. The big dot is the spectral truth under B. Each diamond is where one CAT puts it, so the closer a diamond is to the big dot, the better that CAT did for this {filter}.'
   :'Each dot is a {filter}\'s true colour under light B. The whisker from each dot points towards where '+c.name+' puts it, magnified ×'+lab.mag+'. Long, vivid whiskers are {filters} this CAT gets wrong.');
  $('lt-one').hidden=lab.mode!=='one';$('lt-all').hidden=lab.mode!=='all';}

