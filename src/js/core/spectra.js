function planckSPD(T){const a=new Float64Array(N);let m=0;
  for(let i=0;i<N;i++){const l=WLS[i]*1e-9;a[i]=1/(Math.pow(l,5)*(Math.exp(1.4388e-2/(l*T))-1));if(a[i]>m)m=a[i];}
  for(let i=0;i<N;i++)a[i]/=m;return a;}

/* CIE D65, 380-780 nm in 5 nm steps */
const D65_5=[49.98,52.31,54.65,68.70,82.75,87.12,91.49,92.46,93.43,90.06,86.68,95.77,104.86,110.94,117.01,117.41,117.81,116.34,114.86,115.39,115.92,112.37,108.81,109.08,109.35,108.58,107.80,106.30,104.79,106.24,107.69,106.05,104.41,104.23,104.05,102.02,100.00,98.17,96.33,96.06,95.79,92.24,88.69,89.35,90.01,89.80,89.60,88.65,87.70,85.49,83.29,83.49,83.70,81.86,80.03,80.12,80.21,81.25,82.28,80.28,78.28,74.00,69.72,70.67,71.61,72.98,74.35,67.98,61.60,65.74,69.89,72.49,75.09,69.34,63.59,55.01,46.42,56.61,66.81,65.09,63.38];
function from5(arr){const a=new Float64Array(N);for(let i=0;i<N;i++){const p=i/5,k=Math.min(Math.floor(p),arr.length-2),f=p-k;a[i]=arr[k]*(1-f)+arr[k+1]*f;}return a;}
function gaussArr(mu,sig){const a=new Float64Array(N);for(let i=0;i<N;i++){const t=(WLS[i]-mu)/sig;a[i]=Math.exp(-0.5*t*t);}return a;}

/* Resample measured points onto the 1 nm grid */
function resample(wl,v,edge){const T=new Float64Array(N);let j=0;
  for(let i=0;i<N;i++){const l=WLS[i];
    if(l<wl[0]){T[i]=edge==='hold'?v[0]:0;continue;}
    if(l>wl[wl.length-1]){T[i]=edge==='hold'?v[v.length-1]:0;continue;}
    while(j<wl.length-2&&wl[j+1]<l)j++;
    const f=(l-wl[j])/((wl[j+1]-wl[j])||1);T[i]=v[j]*(1-f)+v[j+1]*f;}
  return T;}
