/* Optional data set: LEE Filters transmission curves, supplied by the user.
   Nothing is built in (the licence for redistributing the data is unclear). To use it:
     - import your own CSVs in the app and choose "LEE filters" under "Imported spectra are", or
     - for a build that includes them, put your data in data/lee.json (format below) and run tools/build.py.
   LEE_DATA = null when data/lee.json is absent, else {w:[405..700 step 5], f:[[id, name, [percent or null per wavelength]], ...]} */
registerDataset({id:'lee',label:'LEE filters',noun:'LEE filters',measure:'transmission',
 vocab:{filter:'filter',filters:'filters',Filter:'Filter',Filters:'Filters',Out:'Light out',out:'light out',curve:'Filter transmission',curveL:'filter transmission',pass:'passing',
 leaves:'leaves the filter',dotnote:'',built:'The LEE filter spectra',mult:'the filter curve',sortY:'Light transmitted',sortNum:'Sort: number',numname:'number, name',search:'Search name or number',
 labelsT:'Filter codes',idcol:'filter_id',outcol:'light_out_percent',sel:'247-lee-minus-green',
 attrib:'Spectra imported by the user (LEE Filters data). Frosts and diffusion filters scatter light, so their published luminance figures differ from what a transmission curve alone gives.'},
 entries(){if(!LEE_DATA)return[];return LEE_DATA.f.map(([id,name,v])=>{const wl=[],vv=[];
   LEE_DATA.w.forEach((w,i)=>{if(v[i]!=null){wl.push(w);vv.push(v[i]/100);}});
   return{id,name,wl,v:vv};});}});
