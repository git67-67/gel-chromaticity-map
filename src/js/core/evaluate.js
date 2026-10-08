function evalFilter(S,T,k){const s=sums(S,T),c=chroma(s[0],s[1],s[2]),q=cctDuv(c.u,c.v);
  c.Yr=k?s[1]/k:null;c.cct=q.cct;c.duv=q.duv;return c;}
