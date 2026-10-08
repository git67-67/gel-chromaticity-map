/* ---- theme colours ---- */
let cols={};
function hexRGB(h){h=h.trim().replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function readCols(){const cs=getComputedStyle(document.documentElement);const g=n=>cs.getPropertyValue(n).trim();
  cols={fg:g('--fg'),muted:g('--muted'),grid:g('--grid'),plotbg:g('--plotbg'),dot:g('--dot'),accent:g('--accent'),panel:g('--panel'),mix:parseFloat(g('--mix'))||.5,bgRGB:hexRGB(g('--plotbg'))};cols.key=cols.plotbg+cols.fg;}

