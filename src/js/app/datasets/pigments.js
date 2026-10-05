/* Built-in data set: artist-pigment reflectance spectra (data/pigments.json).
   PIG_DATA = {w0:380, s:1, f:[[id, name, [percent per wavelength]], ...]} (regular grid: wavelength = w0 + i*s) */
registerDataset({id:'pig',label:'Artist pigments',noun:'artist pigments',measure:'reflectance',
 vocab:{noCode:true,filter:'pigment',filters:'pigments',Filter:'Pigment',Filters:'Pigments',Out:'Reflectance',out:'reflectance',curve:'Pigment reflectance',curveL:'pigment reflectance',pass:'reflecting',
 leaves:'is reflected by the pigment',dotnote:' Dots show chromaticity only, not brightness, so a dark pigment can look as bright as a pale one.',built:'The artist-pigment reflectance spectra',mult:"the pigment's reflectance curve",sortY:'Reflectance',sortNum:'Sort: name',numname:'name',search:'Search name',
 labelsT:'Pigment names',idcol:'pigment_id',outcol:'reflectance_percent',sel:'cobalt-blue',
 attrib:'Built-in spectra: reflectance of 82 artist pigments painted in an acrylic binder on cardboard, bin-averaged to 1 nm from 380 to 780 nm. The data set does not say who measured it. Reflectance is relative to a perfect white diffuser under the chosen light, so gloss, texture and the support are not modelled. Pigment names were tidied (for example “b” written out as “blue”).'},
 entries(){return PIG_DATA.f.map(([id,name,v])=>({id,name,code:'',wl:v.map((_,i)=>PIG_DATA.w0+i*PIG_DATA.s),v:v.map(x=>x/100)}));}});
