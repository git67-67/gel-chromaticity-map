/* Apparent difference: colour and brightness together, in a perceptual colour space.
   Two spaces:
   - CIELUV (L*, u*, v*): L* from the luminance relative to a reference white, u*, v* from u'v' relative to that white's u'v'.
   - CAM02-UCS (J', a', b'): CIECAM02 with L_A = 100, Y_b = 20, average surround, complete adaptation (D = 1), the same
     appearance model TM-30 uses. Each colour is adapted to the white of its own light.
   Colours are [L, a, b] triples; apparentParts() splits the distance into lightness, chroma and hue parts. */
const lstarOf=r=>r>0.008856451679?116*Math.cbrt(r)-16:903.2962963*Math.max(0,r);      // r = Y / Yn
function luvOf(Y,up,vp,Yn,upn,vpn){const L=lstarOf(Y/Yn);return[L,13*L*(up-upn),13*L*(vp-vpn)];}
const CAM_AW=(()=>{const pw=mulv(CAM.H,mulv(CAM.Mi,[100,100,100]));return camAchrom(pw.map(camComp));})();
/* xyz and its light's white xyzw, both scaled so the white has Y = 100 -> [J', a', b'] */
function camUcsOf(xyz,xyzw){return xyzToUCS(xyz,CAM_AW,{xyzw}).slice(0,3);}
function apparentParts(P,Q){const dL=Q[0]-P[0],CP=Math.hypot(P[1],P[2]),CQ=Math.hypot(Q[1],Q[2]),dC=CQ-CP,
  dE=Math.hypot(dL,Q[1]-P[1],Q[2]-P[2]),dH2=Math.max(0,dE*dE-dL*dL-dC*dC);
  return{dE,dL,dC,dH:Math.sqrt(dH2)};}
