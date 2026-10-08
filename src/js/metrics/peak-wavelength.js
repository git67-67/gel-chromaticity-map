/* Example metric (also a working one): where the light that reaches the eye peaks.
   Copy this file to start a new metric, see docs/ARCHITECTURE.md. */
registerMetric({id:'peak',title:'Output peak',
  columns:[{key:'peakNm',label:'Peak',digits:0,unit:' nm',sortable:true}],
  compute({out}){let b=0;for(let i=1;i<N;i++)if(out[i]>out[b])b=i;return{peakNm:WLS[b]};}});
