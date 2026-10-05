const CATS=[
  {id:'xyz',name:'XYZ scaling',short:'XYZ',M:[[1,0,0],[0,1,0],[0,0,1]],note:'Scales X, Y and Z directly. The simplest possible CAT.'},
  {id:'vk',name:'von Kries (HPE)',short:'vK',M:[[.4002,.7076,-.0808],[-.2263,1.1653,.0457],[0,0,.9182]],note:'Scales Hunt-Pointer-Estevez cone responses. The original idea.'},
  {id:'bfd',name:'Bradford',short:'BFD',M:[[.8951,.2664,-.1614],[-.7502,1.7135,.0367],[.0389,-.0685,1.0296]],note:'Sharpened primaries. The usual choice in ICC colour management (linear form).'},
  {id:'cat02',name:'CAT02 (CIECAM02)',short:'CAT02',M:[[.7328,.4296,-.1624],[-.7036,1.6975,.0061],[.0030,.0136,.9834]],note:'The adaptation step of CIECAM02.'},
  {id:'cat16',name:'CAT16 (CAM16)',short:'CAT16',M:[[.401288,.650173,-.051461],[-.250268,1.204414,.045854],[-.002079,.048952,.953127]],note:'The adaptation step of CAM16, a refit of CAT02 without its blue problem.'},
  {id:'sharp',name:'Sharp',short:'Sharp',M:[[1.2694,-.0988,-.1706],[-.8364,1.8006,.0357],[.0297,-.0315,1.0018]],note:'Spectrally sharpened primaries (Süsstrunk et al.).'},
  {id:'cmc',name:'CMCCAT2000',short:'CMC',M:[[.7982,.3389,-.1371],[-.5918,1.5512,.0406],[.0008,.0239,.9753]],note:'Matrix of CMCCAT2000, here with the shared degree of adaptation D.'}
];
function m3v(M,v){return[M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2],M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2],M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2]];}
function inv3(M){const[a,b,c]=M[0],[d,e,f]=M[1],[g,h,i]=M[2];
  const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;
  return[[A/det,-(b*i-c*h)/det,(b*f-c*e)/det],[B/det,(a*i-c*g)/det,-(a*f-c*d)/det],[C/det,-(a*h-b*g)/det,(a*e-b*d)/det]];}
/* Per-channel gains in the CAT's cone-like space, whites normalised to Y = 1.
   Incomplete adaptation as in CIECAM02: adapt to white A with degree D, then undo for white B. D = 1 is plain von Kries. */
function catGains(M,WA,WB,D){const a=m3v(M,WA),b=m3v(M,WB);return a.map((ai,i)=>(D/ai+1-D)/(D/b[i]+1-D));}
function catApply(M,Mi,g,xyz){const c=m3v(M,xyz);return m3v(Mi,[c[0]*g[0],c[1]*g[1],c[2]*g[2]]);}
function degreeD(mode,man,LA,F){if(mode==='full')return 1;if(mode==='manual')return Math.max(0,Math.min(1,man));
  return Math.max(0,Math.min(1,F*(1-(1/3.6)*Math.exp((-LA-42)/92))));}
function ptOf(t){const s=t[0]+t[1]+t[2],d=t[0]+15*t[1]+3*t[2];if(!(d>1e-9)||!(Math.abs(s)>1e-9))return null;
  return{X:t[0],Y:t[1],Z:t[2],x:t[0]/s,y:t[1]/s,u:4*t[0]/d,v:9*t[1]/d};}
function statOf(a){a=a.filter(Number.isFinite).sort((x,y)=>x-y);const n=a.length;if(!n)return null;
  const q=p=>a[Math.min(n-1,Math.floor(p*(n-1)+.5))];return{n,mean:a.reduce((s,x)=>s+x,0)/n,med:q(.5),p95:q(.95),max:a[n-1]};}
