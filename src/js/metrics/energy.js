/* Radiant energy that gets through (filters) or comes back (pigments), and the rest, which is absorbed.
   Energy is the plain sum of the spectral power over 380-780 nm: out / source. This is not the brightness the eye sees
   (that is the "Light out" / "Reflectance" figure, weighted by the eye's sensitivity). Light outside 380-780 nm (UV, infra-red)
   is not in the data and is ignored. Frost and diffusion filters also scatter light, which this counts as passed only if the
   transmission curve says so. */
registerMetric({id:'energy',title:'Energy',
  columns:[{key:'energyOut',label:'Energy passed',digits:1,unit:' %',sortable:true},{key:'energyAbs',label:'Energy absorbed',digits:1,unit:' %',sortable:true}],
  compute({spd,out}){let a=0,b=0;for(let i=0;i<N;i++){a+=spd[i];b+=out[i];}const e=a>0?100*b/a:NaN;return{energyOut:e,energyAbs:100-e};}});
