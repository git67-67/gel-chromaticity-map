function mat(x,y){const X=x/y,Y=1,Z=(1-x-y)/y;
  let r=3.2406*X-1.5372*Y-0.4986*Z,g=-0.9689*X+1.8758*Y+0.0415*Z,b=0.0557*X-0.2040*Y+1.0570*Z;
  const m=Math.min(r,g,b);if(m<0){r-=m;g-=m;b-=m;}const M=Math.max(r,g,b)||1;return[r/M,g/M,b/M];}
function gam(c){c=Math.max(0,Math.min(1,c));return 255*(c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055);}
function rgbOfXY(x,y){const c=mat(x,y);return[gam(c[0]),gam(c[1]),gam(c[2])];}
