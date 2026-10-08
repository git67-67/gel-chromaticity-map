/* Built-in data set: synthetic example colour gels (data/gels.json). Parametric curves, NOT measurements and NOT any
   manufacturer's data; they only resemble typical lighting-filter families. Real catalogue data can be imported (see lee.js).
   GEL_DATA = {w0:380, s:5, f:[[id, name, [percent per wavelength]], ...]} */
const GEL_VOCAB={noCode:true,filter:'gel',filters:'gels',Filter:'Gel',Filters:'Gels',Out:'Light out',out:'light out',curve:'Gel transmission',curveL:'gel transmission',pass:'passing',
 leaves:'leaves the gel',dotnote:'',built:'The example gel spectra',mult:'the gel curve',sortY:'Light transmitted',sortNum:'Sort: name',numname:'name',search:'Search name',
 labelsT:'Gel names',idcol:'gel_id',outcol:'light_out_percent'};
registerDataset({id:'gel',label:'Colour gels',noun:'example colour gels',measure:'transmission',
 vocab:{...GEL_VOCAB,sel:'gel-053',
 attrib:'Built-in spectra: synthetic example colour gels. These are smooth made-up curves that behave like common lighting filters (saturated colours, pinks, amber and blue colour-temperature correction, neutral density, frost). They are not measurements of any real product. Import your own spectra to use real filters.'},
 entries(){return GEL_DATA.f.map(([id,name,v])=>({id,name,code:'',wl:v.map((_,i)=>GEL_DATA.w0+i*GEL_DATA.s),v:v.map(x=>x/100)}));}});
