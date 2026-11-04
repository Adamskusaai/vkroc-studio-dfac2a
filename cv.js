// plan -> walls (plain JS)
export function detectWalls(img,mW){const S=Math.min(1,1400/Math.max(img.width,img.height)),W=Math.round(img.width*S),H=Math.round(img.height*S);
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(img,0,0,W,H);const d=x.getImageData(0,0,W,H).data;
 const g=new Uint8Array(W*H),hist=new Array(256).fill(0);for(let i=0;i<W*H;i++){const v=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)|0;g[i]=v;hist[v]++;}
 let sum=0,sB=0,wB=0,best=0,th=128;for(let i=0;i<256;i++)sum+=i*hist[i];for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=W*H-wB;if(!wF)break;sB+=t*hist[t];const mB=sB/wB,mF=(sum-sB)/wF,b=wB*wF*(mB-mF)**2;if(b>best){best=b;th=t;}}
 th=Math.min(th,160);const m=new Uint8Array(W*H);for(let i=0;i<W*H;i++)m[i]=g[i]<=th?1:0;
 const ppm=W/mW;let walls=[];
 // try decreasing kernel sizes; walls survive opening, thin lines don't
 for(const k of [Math.max(3,Math.round(.12*ppm)),Math.max(3,Math.round(.08*ppm)),3]){walls=run(open(m,W,H,k),W,H,k,ppm);if(walls.length>=3)break;}
 return walls;}
function erode(a,W,H,k,hz){const o=new Uint8Array(W*H);for(let y=0;y<H;y++){let c=0;for(let x=0;x<(hz?W:H);x++){}}
 if(hz){for(let y=0;y<H;y++){let c=0;for(let x=0;x<W;x++){c=a[y*W+x]?c+1:0;if(c>=k)o[y*W+x-(k>>1)]=1;}}}
 else{for(let x=0;x<W;x++){let c=0;for(let y=0;y<H;y++){c=a[y*W+x]?c+1:0;if(c>=k)o[(y-(k>>1))*W+x]=1;}}}return o;}
function dilate(a,W,H,k,hz){const o=new Uint8Array(W*H),r=k>>1;for(let i=0;i<W*H;i++)if(a[i]){const y=(i/W)|0,x=i%W;for(let j=-r;j<=r;j++){if(hz){const xx=x+j;if(xx>=0&&xx<W)o[y*W+xx]=1;}else{const yy=y+j;if(yy>=0&&yy<H)o[yy*W+x]=1;}}}return o;}
function open(m,W,H,k){let e=erode(erode(m,W,H,k,1),W,H,k,0);return dilate(dilate(e,W,H,k,1),W,H,k,0);}
function run(m,W,H,k,ppm){const out=[],minL=Math.max(3*k,.5*ppm);
 const scan=(hz)=>{const N=hz?H:W,M=hz?W:H,at=(i,j)=>hz?m[i*W+j]:m[j*W+i];let open=[];
  for(let i=0;i<=N;i++){const runs=[];if(i<N){let s=-1;for(let j=0;j<=M;j++){const v=j<M&&at(i,j);if(v&&s<0)s=j;if(!v&&s>=0){if(j-s>=minL)runs.push([s,j]);s=-1;}}}
   const next=[];for(const r of runs){const o=open.find(g=>!g.u&&Math.min(g.b,r[1])-Math.max(g.a,r[0])>.7*(r[1]-r[0]));if(o){o.u=1;o.a=Math.min(o.a,r[0]);o.b=Math.max(o.b,r[1]);o.i1=i;next.push(o);}else next.push({a:r[0],b:r[1],i0:i,i1:i});}
   open.filter(g=>!g.u&&!next.includes(g)).forEach(g=>{const t=g.i1-g.i0+1;if(t>=k*.8&&t<=.035*Math.max(W,H)&&(g.b-g.a)>2*t)out.push({hz,c:(g.i0+g.i1+1)/2,a:g.a,b:g.b,t});});next.forEach(g=>delete g.u);open=next;}};
 scan(1);scan(0);
 // merge collinear
 out.sort((p,q)=>p.c-q.c||p.a-q.a);const mg=[];for(const s of out){const p=mg.find(q=>q.hz===s.hz&&Math.abs(q.c-s.c)<k&&s.a-q.b<1.2*Math.max(q.t,s.t)&&q.a-s.b<1.2*Math.max(q.t,s.t));if(p){p.a=Math.min(p.a,s.a);p.b=Math.max(p.b,s.b);p.t=Math.max(p.t,s.t);}else mg.push({...s});}
 const r=v=>Math.round(v/ppm*20)/20;
 const ws=mg.map(s=>{const t=Math.max(.1,Math.round(s.t/ppm*20)/20);return s.hz?{start:[r(s.a),r(s.c)],end:[r(s.b),r(s.c)],thickness:t}:{start:[r(s.c),r(s.a)],end:[r(s.c),r(s.b)],thickness:t};});
 // connect ends to nearby perpendicular walls (center lines)
 for(const w of ws)for(const k2 of['start','end']){const p=w[k2],hz=w.start[1]===w.end[1];let best=null,bd=1e9;
  for(const o of ws){if(o===w)continue;const ohz=o.start[1]===o.end[1];if(ohz===hz)continue;const tol=Math.max(w.thickness,o.thickness)*1.5+.1;
   if(ohz){const lo=Math.min(o.start[0],o.end[0])-tol,hi=Math.max(o.start[0],o.end[0])+tol,d=Math.abs(p[1]-o.start[1]);if(p[0]>=lo&&p[0]<=hi&&d<tol&&d<bd){bd=d;best=[p[0],o.start[1]];}}
   else{const lo=Math.min(o.start[1],o.end[1])-tol,hi=Math.max(o.start[1],o.end[1])+tol,d=Math.abs(p[0]-o.start[0]);if(p[1]>=lo&&p[1]<=hi&&d<tol&&d<bd){bd=d;best=[o.start[0],p[1]];}}}
  if(best)w[k2]=best;}
 return ws.filter(w=>Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1])>.3);}
