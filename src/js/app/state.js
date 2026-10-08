const SRC={pcw:{name:'White LED (example)',spd:buildPcWhite()},rgb:{name:'RGB white LED (example)',spd:buildRgbLed()},
  d65:{name:'D65 daylight',spd:from5(D65_5)},ee:{name:'Equal energy',spd:new Float64Array(N).fill(1)}};
const LOC=[];for(let l=400;l<=700;l++){const i=l-380;LOC.push(chroma(XB[i],YB[i],ZB[i]));}

const st={mode:'xy',src:'pcw',cct:3200,led:null,ledName:'',libId:'',edge:'hold',filters:new Map(),names:new Map(),
  sel:null,q:'',sort:'code',planck:true,labels:false,hover:null,srcRes:null,spd:null,k:1,demo:false};
