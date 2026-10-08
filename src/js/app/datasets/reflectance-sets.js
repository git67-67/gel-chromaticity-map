/* Built-in open reflectance sets, all 380-780 nm at 5 nm:
   tcs  CIE 13.3-1995 test colour samples TCS01-14 (the CRI samples)   -> COLT.tcs
   ces  IES TM-30 / CIE 224 colour evaluation samples CES01-99          -> COLT.ces
   cc   ColorChecker (Macbeth) 24 patches, Ohta data                    -> CC_DATA
   mun  Munsell: import only (nothing built in), see docs/DATA_FORMATS.md */
function reflVocab(Fs,fs,sel,idcol){return{noCode:true,filter:fs,filters:Fs.toLowerCase(),Filter:fs[0].toUpperCase()+fs.slice(1),Filters:Fs,Out:'Reflectance',out:'reflectance',curve:'Sample reflectance',curveL:'sample reflectance',pass:'reflecting',
 leaves:'is reflected by the sample',dotnote:' Dots show chromaticity only, not brightness, so a dark sample can look as bright as a pale one.',built:'The reflectance spectra',mult:"the sample's reflectance curve",sortY:'Reflectance',sortNum:'Sort: name',numname:'name',search:'Search name',
 labelsT:'Sample names',idcol,outcol:'reflectance_percent',sel};}
const fromTable=(rows,prefix,label)=>()=>rows.map((v,i)=>({id:prefix+String(i+1).padStart(2,'0'),name:label+' '+String(i+1).padStart(2,'0'),code:'',wl:COLT.wl,v}));
registerDataset({id:'tcs',label:'CRI samples',noun:'CRI test colour samples',measure:'reflectance',
 vocab:{...reflVocab('Samples','sample','tcs01','sample_id'),attrib:'Built-in spectra: the 14 CIE 13.3-1995 test colour samples used for the colour rendering index (R1–R14), 380–780 nm at 5 nm.'},
 entries:fromTable(COLT.tcs,'tcs','TCS')});
registerDataset({id:'ces',label:'TM-30 samples',noun:'TM-30 colour evaluation samples',measure:'reflectance',
 vocab:{...reflVocab('Samples','sample','ces01','sample_id'),attrib:'Built-in spectra: the 99 colour evaluation samples of IES TM-30 / CIE 224:2017, 380–780 nm at 5 nm.'},
 entries:fromTable(COLT.ces,'ces','CES')});
registerDataset({id:'cc',label:'ColorChecker',noun:'ColorChecker patches',measure:'reflectance',
 vocab:{...reflVocab('Patches','patch','cc-19','patch_id'),attrib:'Built-in spectra: the 24 patches of the ColorChecker (Macbeth) chart, reflectance measured by Ohta, 380–780 nm at 5 nm, via the colour-science package.'},
 entries(){return CC_DATA.f.map(([id,name,v])=>({id,name,code:'',wl:v.map((_,i)=>CC_DATA.w0+i*CC_DATA.s),v:v.map(x=>x/100)}));}});
registerDataset({id:'mun',label:'Munsell',noun:'Munsell chips',measure:'reflectance',
 vocab:{...reflVocab('Chips','chip','','chip_id'),attrib:'Spectra imported by the user (Munsell colour chips, for example the University of Eastern Finland measurements).'},
 entries(){return[];}});
