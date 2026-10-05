/* ---------- state ---------- */
const lab={A:{src:'bb',cct:2700},B:{src:'bb',cct:6500},dmode:'full',dman:1,LA:64,F:1,
  mode:'one',cat:'bfd',vis:{},mag:5,showShift:false,planck:true,follow:true,q:'',sort:'err',minLight:0,skipNeutral:false,
  hover:null,res:null,visible:false,dirty:true};
CATS.forEach(c=>lab.vis[c.id]=true);
const catIdx=id=>CATS.findIndex(c=>c.id===id);
const FU=getComputedStyle(document.documentElement).getPropertyValue('--ui')||'sans-serif';
const FM=getComputedStyle(document.documentElement).getPropertyValue('--mono')||'monospace';
let lc={k:[],cr:'#e34948',cg:'#008300',cb:'#2a78d6'};
function readLCols(){const cs=getComputedStyle(document.documentElement);lc.k=CATS.map((c,i)=>cs.getPropertyValue('--k'+(i+1)).trim()||'#888');
  lc.cr=cs.getPropertyValue('--cone-r').trim();lc.cg=cs.getPropertyValue('--cone-g').trim();lc.cb=cs.getPropertyValue('--cone-b').trim();}
function cssOf(p){if(!p||!(p.y>0.002))return '#777';const c=rgbOfXY(p.x,p.y);return 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';}
const f4=v=>Number.isFinite(v)?v.toFixed(4):'n/a';
const f3=v=>Number.isFinite(v)?v.toFixed(3):'n/a';

