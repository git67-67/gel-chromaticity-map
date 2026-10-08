/* Colour rendering of the light that reaches the eye: CRI (Ra, R9) and TM-30 (Rf, Rg). For a filter this describes the
   filtered light; for a pigment it describes the light reflected from it (informative only: a pigment is not a light source).
   The maths is in core/cri.js and core/tm30.js. Empty when the light has no CCT (|Duv| > 0.05 or outside 1000-25000 K). */
registerMetric({id:'rendering',heavy:true,title:'Colour rendering (CRI, TM-30)',
  columns:[{key:'Ra',label:'CRI Ra',digits:0,sortable:true},{key:'R9',label:'R9',digits:0,sortable:true},
           {key:'Rf',label:'TM-30 Rf',digits:0,sortable:true},{key:'Rg',label:'TM-30 Rg',digits:0,sortable:true}],
  compute({out,chroma:c}){const q=cctDuv(c.u,c.v);
    if(!q.cct||q.cct<1000||q.cct>25000)return{Ra:null,R9:null,Rf:null,Rg:null};
    const k=cri(out,q.cct),t=tm30(out,q.cct);return{Ra:k.Ra,R9:k.R[8],Rf:t.Rf,Rg:t.Rg};}});
