// plan.js — robust floor-plan reader (plain JS, no deps). prem8.
// readPlan(img,{rect}) -> {walls:[{start,end,thickness,op:[]}], canvas, w, guess, mode:'plan', conf, scaleSrc, dbg} | null
// Steps: paper detect + perspective warp -> colour-annotation removal -> illumination normalisation -> deskew ->
//        thick-stroke (wall) mask -> axis segments -> junction snapping -> openings (door/window) -> scale -> metres.
const MAXD=1400;
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function imgCanvas(img,M){const S=Math.min(2.5,M/Math.max(img.width,img.height)),c=mk(Math.max(1,Math.round(img.width*S)),Math.max(1,Math.round(img.height*S)));const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);return c;}
function grayOf(c){const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data,g=new Float32Array(W*H);for(let i=0;i<W*H;i++)g[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;return g;}
function otsuF(g,step=1){const h=new Float64Array(256);let n=0;for(let i=0;i<g.length;i+=step){h[Math.max(0,Math.min(255,g[i]|0))]++;n++;}let s=0,sB=0,wB=0,b=0,t=128;for(let i=0;i<256;i++)s+=i*h[i];for(let i=0;i<256;i++){wB+=h[i];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=i*h[i];const v=wB*wF*(sB/wB-(s-sB)/wF)**2;if(v>b){b=v;t=i;}}return t;}
// ---------- paper detection + perspective ----------
function findPaper(c){const s=Math.min(1,360/Math.max(c.width,c.height)),w=Math.max(8,Math.round(c.width*s)),h=Math.max(8,Math.round(c.height*s)),sc=mk(w,h);{// stepwise halving = antialiased downscale (one big drawImage step aliases text into fake edges)
  let cur=c;while(cur.width>2.2*w){const t=mk(Math.round(cur.width/2),Math.round(cur.height/2));const x=t.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cur,0,0,t.width,t.height);cur=t;}const x=sc.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cur,0,0,w,h);}
 const g=grayOf(sc);// blur 3x3 twice to drop drawing lines
 const t=otsuF(g);const m=new Uint8Array(w*h);for(let i=0;i<w*h;i++)m[i]=g[i]>t?1:0;
 // close lines inside the paper: dilate bright by 2
 const m2=dilate(m,w,h,3);const lab=new Int32Array(w*h);let best=0,bestN=0,id=0;const st=[];
 for(let i=0;i<w*h;i++){if(!m2[i]||lab[i])continue;id++;let n=0;st.push(i);lab[i]=id;while(st.length){const j=st.pop();n++;const x=j%w,y=(j/w)|0;if(x>0&&m2[j-1]&&!lab[j-1]){lab[j-1]=id;st.push(j-1);}if(x<w-1&&m2[j+1]&&!lab[j+1]){lab[j+1]=id;st.push(j+1);}if(y>0&&m2[j-w]&&!lab[j-w]){lab[j-w]=id;st.push(j-w);}if(y<h-1&&m2[j+w]&&!lab[j+w]){lab[j+w]=id;st.push(j+w);}}if(n>bestN){bestN=n;best=id;}}
 // prem8: illumination-safe paper region = flood fill from the bright centre across small relative steps (soft shadows and
 // gradients pass, the paper edge does not), then holes filled. Falls back to the Otsu component above.
 {const b=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s2=0,n2=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<w&&Y<h){s2+=g[Y*w+X];n2++;}}b[y*w+x]=s2/n2;}
  // several seeds (centre may sit inside a closed room) x several step tolerances (low-contrast shadowed edges leak at loose ones)
  const seeds=[];const bri=(x0,x1,y0,y1)=>{let sd=-1,sv=-1;for(let y=Math.round(h*y0);y<h*y1;y++)for(let x=Math.round(w*x0);x<w*x1;x++){const v=b[y*w+x];if(v>sv){sv=v;sd=y*w+x;}}return[sd,sv];};
  // digital page (bright, flat border all round) -> no separate sheet, skip the floods (speed)
  {let nb=0,nt=0,mxb=0;for(let i=0;i<w*h;i++)if(b[i]>mxb)mxb=b[i];const chk=v=>{nt++;if(v>.88*mxb&&v>185)nb++;};for(let x=0;x<w;x++){chk(b[x]);chk(b[(h-1)*w+x]);}for(let y=0;y<h;y++){chk(b[y*w]);chk(b[y*w+w-1]);}if(nb>.7*nt&&!(globalThis.__PF||{}).noDig){findPaper.src='digital';return null;}}
  seeds.push(bri(.3,.7,.3,.7),bri(.12,.25,.3,.7),bri(.75,.88,.3,.7),bri(.3,.7,.12,.25),bri(.3,.7,.75,.88));
  // edge barrier: strong local contrast over a 5x5 window stops the fill even when a blurred paper edge falls in small steps
  const E=new Uint8Array(w*h);{const r=2,mx=new Float32Array(w*h),mn=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let M=0,m=1e9;for(let k=Math.max(0,x-r);k<=Math.min(w-1,x+r);k++){const v=b[y*w+k];if(v>M)M=v;if(v<m)m=v;}mx[y*w+x]=M;mn[y*w+x]=m;}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let M=0,m=1e9;for(let k=Math.max(0,y-r);k<=Math.min(h-1,y+r);k++){const i=k*w+x;if(mx[i]>M)M=mx[i];if(mn[i]<m)m=mn[i];}E[y*w+x]=(M-m)/Math.max(M,20)>.35?1:0;}}
  let bestF=null;findPaper.fd=[];
  for(const tol of[.045,.03,.02,.013]){for(const[seed,sv]of seeds){if(seed<0||E[seed])continue;if(bestF&&bestF.tol>tol)break;
   const F=new Uint8Array(w*h),q=[seed];F[seed]=1;
   while(q.length){const j=q.pop(),x=j%w,y=(j/w)|0,v=b[j];for(const[k,ok]of[[j-1,x>0],[j+1,x<w-1],[j-w,y>0],[j+w,y<h-1]]){if(!ok||F[k])continue;const u=b[k];if(!E[k]&&Math.abs(u-v)/Math.max(u,v,20)<tol&&u>.35*sv){F[k]=1;q.push(k);}}}
   const O=new Uint8Array(w*h),q2=[];for(let x=0;x<w;x++){for(const j of[x,(h-1)*w+x])if(!F[j]&&!O[j]){O[j]=1;q2.push(j);}}for(let y=0;y<h;y++){for(const j of[y*w,y*w+w-1])if(!F[j]&&!O[j]){O[j]=1;q2.push(j);}}
   while(q2.length){const j=q2.pop(),x=j%w,y=(j/w)|0;for(const[k,ok]of[[j-1,x>0],[j+1,x<w-1],[j-w,y>0],[j+w,y<h-1]]){if(ok&&!F[k]&&!O[k]){O[k]=1;q2.push(k);}}}
   let n=0;for(let i=0;i<w*h;i++)if(!O[i])n++;
   let tb2=0;for(let x=0;x<w;x++){if(!O[x])tb2++;if(!O[(h-1)*w+x])tb2++;}for(let y=0;y<h;y++){if(!O[y*w])tb2++;if(!O[y*w+w-1])tb2++;}
   // convexity: a real sheet fills its hull; leaks into the table are ragged
   if(findPaper.fd.length<6)findPaper.fd.push([tol,+(n/(w*h)).toFixed(2),+(tb2/(2*w+2*h)).toFixed(2)]);
   let okOut=true;if(n>.2*w*h&&n<.93*w*h&&tb2<.12*(2*w+2*h)){// what lies outside must be a darker surface (table), not white margin around a house outline
    const hi=[],ho=[];for(let i=0;i<w*h;i+=3)(O[i]?ho:hi).push(b[i]);hi.sort((a,b)=>a-b);ho.sort((a,b)=>a-b);const mi=hi[hi.length>>1],mo=ho[ho.length>>1];okOut=mo<.85*mi;
    if(findPaper.fd.length<8)findPaper.fd.push(['io',tol,Math.round(mi),Math.round(mo)]);}
   if(okOut&&n>.2*w*h&&n<.93*w*h&&tb2<.12*(2*w+2*h)&&(!bestF||n>bestF.n))bestF={O,n,tol};}
   if(bestF)break;}
  if(bestF){const qd=[0,0,0,0];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!bestF.O[y*w+x])qd[(y>h/2?2:0)+(x>w/2?1:0)]++;findPaper.fd.push(['qd',...qd.map(v=>+(v/(w*h/4)).toFixed(2))]);let ne=0;for(let i=0;i<w*h;i++)ne+=E[i];findPaper.fd.push(['E',+(ne/(w*h)).toFixed(3)]);}
  if(bestF){const inn=new Uint8Array(w*h);for(let i=0;i<w*h;i++)inn[i]=bestF.O[i]?0:1;const dl=dilate(inn,w,h,5);for(let i=0;i<w*h;i++)bestF.O[i]=dl[i]?0:1;}// undo the 5x5 barrier erosion
  if(bestF){for(let i=0;i<w*h;i++)lab[i]=bestF.O[i]?0:-7;best=-7;bestN=bestF.n;findPaper.src='fill'+bestF.tol;}else findPaper.src='otsu';}
 if(bestN<.2*w*h)return null;
 // touches all 4 borders broadly -> no separate paper
 let tb=0;for(let x=0;x<w;x++){if(lab[x]===best)tb++;if(lab[(h-1)*w+x]===best)tb++;}for(let y=0;y<h;y++){if(lab[y*w]===best)tb++;if(lab[y*w+w-1]===best)tb++;}
 if(tb>.5*(2*w+2*h))return null;
 // corners = extreme points along diagonals
 let P=[[1e9,0,0],[-1e9,0,0],[1e9,0,0],[-1e9,0,0]];// min x+y (TL), max x-y (TR), max x+y (BR), min x-y... use 4 scores
 const sc4=[(x,y)=>-(x+y),(x,y)=>x-y,(x,y)=>x+y,(x,y)=>y-x];const B=sc4.map(()=>[-1e9,0,0]);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(lab[y*w+x]===best)for(let k=0;k<4;k++){const v=sc4[k](x,y);if(v>B[k][0])B[k]=[v,x,y];}
 let q0=B.map(b=>[b[1]+.5,b[2]+.5]);
 // prem8: refine corners — fit a line to each paper edge (boundary pixels between two corners, ends excluded), intersect neighbours
 {const bd=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(lab[i]===best&&(lab[i-1]!==best||lab[i+1]!==best||lab[i-w]!==best||lab[i+w]!==best))bd.push([x+.5,y+.5]);}
  const L=[];let ok=true;
  for(let k=0;k<4;k++){const A=q0[k],Bq=q0[(k+1)%4],dx=Bq[0]-A[0],dy=Bq[1]-A[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;const P=[];
   for(const p of bd){const t=(p[0]-A[0])*ux+(p[1]-A[1])*uy,d=Math.abs(-(p[0]-A[0])*uy+(p[1]-A[1])*ux);if(t>.12*len&&t<.88*len&&d<.04*len+2)P.push(p);}
   if(P.length<10){ok=false;break;}
   // PCA line, then one trim pass of outliers
   let fit=pts=>{let mx=0,my=0;for(const p of pts){mx+=p[0];my+=p[1];}mx/=pts.length;my/=pts.length;let sxx=0,syy=0,sxy=0;for(const p of pts){const a=p[0]-mx,b=p[1]-my;sxx+=a*a;syy+=b*b;sxy+=a*b;}const th=.5*Math.atan2(2*sxy,sxx-syy);return{mx,my,c:Math.cos(th),s:Math.sin(th)};};
   let f=fit(P);const res=P.map(p=>Math.abs(-(p[0]-f.mx)*f.s+(p[1]-f.my)*f.c));const srt=[...res].sort((a,b)=>a-b),thr=Math.max(1.5,srt[Math.floor(srt.length*.7)]*1.5);const P2=P.filter((p,i)=>res[i]<=thr);if(P2.length>=10)f=fit(P2);L.push(f);}
  if(ok){const X=(a,b)=>{const det=a.c*b.s-a.s*b.c;if(Math.abs(det)<1e-3)return null;const t=((b.mx-a.mx)*b.s-(b.my-a.my)*b.c)/det;return[a.mx+a.c*t,a.my+a.s*t];};
   const q1=[];for(let k=0;k<4;k++){const p=X(L[(k+3)%4],L[k]);if(!p||Math.hypot(p[0]-q0[k][0],p[1]-q0[k][1])>.08*Math.max(w,h)){ok=false;break;}q1.push(p);}findPaper.ref=ok;if(ok)q0=q1;}else findPaper.ref=0;}
 const q=q0.map(p=>[p[0]/s,p[1]/s]);
 const area=Math.abs(polyArea(q)),full=c.width*c.height;if(area<.2*full||area>.93*full)return null;
 return q;}
function polyArea(q){let a=0;for(let i=0;i<q.length;i++){const p=q[i],r=q[(i+1)%q.length];a+=p[0]*r[1]-r[0]*p[1];}return a/2;}
function homog(src,dst){// solve H mapping src->dst (8x8)
 const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=src[i],[u,v]=dst[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}
 for(let i=0;i<8;i++){let p=i;for(let r=i+1;r<8;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let r=0;r<8;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let k=i;k<8;k++)A[r][k]-=f*A[i][k];b[r]-=f*b[i];}}
 const h=b.map((v,i)=>v/A[i][i]);return[...h,1];}
// prem8: true width/height of a photographed rectangle (Zhang & He, whiteboard rectification): focal length from the two
// vanishing points, principal point = image centre; affine fallback. q = TL,TR,BR,BL in canvas pixels.
function paperAspect(q,cw,ch){const u0=cw/2,v0=ch/2,P=p=>[p[0],p[1],1],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const m1=P(q[0]),m2=P(q[1]),m3=P(q[3]),m4=P(q[2]);const k2=dt(cr(m1,m4),m3)/dt(cr(m2,m4),m3),k3=dt(cr(m1,m4),m2)/dt(cr(m3,m4),m2);
 const n2=m2.map((v,i)=>k2*v-m1[i]),n3=m3.map((v,i)=>k3*v-m1[i]);
 const aff=()=>Math.sqrt((n2[0]**2+n2[1]**2)/(n3[0]**2+n3[1]**2));
 if(Math.abs(n2[2]*n3[2])<1e-9)return{r:aff(),f:0};
 const f2=-((n2[0]*n3[0]-(n2[0]*n3[2]+n2[2]*n3[0])*u0+n2[2]*n3[2]*u0*u0)+(n2[1]*n3[1]-(n2[1]*n3[2]+n2[2]*n3[1])*v0+n2[2]*n3[2]*v0*v0))/(n2[2]*n3[2]);
 const D=Math.max(cw,ch);if(!(f2>(.4*D)**2&&f2<(6*D)**2))return{r:aff(),f:0};
 const qf=n=>{const x=n[0]-u0*n[2],y=n[1]-v0*n[2];return(x*x+y*y)/f2+n[2]*n[2];};const r=Math.sqrt(qf(n2)/qf(n3));
 return isFinite(r)&&r>.2&&r<5?{r,f:Math.sqrt(f2)}:{r:aff(),f:0};}
function warpPaper(c,q){const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);let W=Math.round((d(q[0],q[1])+d(q[3],q[2]))/2),H=Math.round((d(q[0],q[3])+d(q[1],q[2]))/2);
 {const A=paperAspect(q,c.width,c.height);warpPaper.asp=[+(W/H).toFixed(3),+A.r.toFixed(3),Math.round(A.f)];// Zhang's ratio is logged only (synthetic warps are not pinhole cameras); a sheet within 4% of ISO A (1.414) snaps to it
  let r=W/H;const iso=r>=1?Math.SQRT2:1/Math.SQRT2;if(Math.abs(r/iso-1)<.04){const ar=Math.sqrt(W*H);W=Math.round(ar*Math.sqrt(iso));H=Math.round(ar/Math.sqrt(iso));warpPaper.asp.push('iso');}}const s=Math.min(1,MAXD/Math.max(W,H));W=Math.round(W*s);H=Math.round(H*s);
 const Hm=homog([[0,0],[W,0],[W,H],[0,H]],q),src=c.getContext('2d').getImageData(0,0,c.width,c.height),sd=src.data,SW=c.width,SH=c.height,o=mk(W,H),ox=o.getContext('2d'),od=ox.createImageData(W,H),dd=od.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const z=Hm[6]*x+Hm[7]*y+1,u=(Hm[0]*x+Hm[1]*y+Hm[2])/z,v=(Hm[3]*x+Hm[4]*y+Hm[5])/z;const x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0,j=(y*W+x)*4;
  if(x0<0||y0<0||x0>=SW-1||y0>=SH-1){dd[j]=dd[j+1]=dd[j+2]=255;dd[j+3]=255;continue;}const i00=(y0*SW+x0)*4,i10=i00+4,i01=i00+SW*4,i11=i01+4;
  for(let k=0;k<3;k++)dd[j+k]=(sd[i00+k]*(1-fx)+sd[i10+k]*fx)*(1-fy)+(sd[i01+k]*(1-fx)+sd[i11+k]*fx)*fy;dd[j+3]=255;}
 ox.putImageData(od,0,0);
 // trim 1.5% border (paper edge shading)
 const m=Math.round(Math.min(W,H)*.015),t=mk(W-2*m,H-2*m);t.getContext('2d').drawImage(o,-m,-m);return t;}
// ---------- cleaning ----------
// remove coloured pen / highlighter (chroma) and normalise illumination -> Float32 "whiteness" 0..1
function cleanGrayOld(c){/* pre-photo-stage cleaning, kept for clean digital plans (chosen by quality) */const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data,g=new Float32Array(W*H);
 for(let i=0;i<W*H;i++){const r=d[i*4],gg=d[i*4+1],b=d[i*4+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),y=r*.3+gg*.59+b*.11;g[i]=(mx-mn>28&&(mx-mn)>.16*mx)?-1:y;}
 // background (paper) level: block max then smooth
 const B=Math.max(8,Math.round(Math.max(W,H)/40)),bw=Math.ceil(W/B),bh=Math.ceil(H/B),bm=new Float32Array(bw*bh);
 for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){const vals=[];for(let y=by*B;y<Math.min(H,by*B+B);y+=2)for(let x=bx*B;x<Math.min(W,bx*B+B);x+=2){const v=g[y*W+x];if(v>=0)vals.push(v);}vals.sort((a,b)=>a-b);bm[by*bw+bx]=vals.length?vals[Math.floor(vals.length*.9)]:255;}
 // max-filter 3x3 blocks (walls bigger than a block) then mean 3x3
 const bm2=new Float32Array(bw*bh),bm3=new Float32Array(bw*bh);
 for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let m=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<bw&&Y<bh)m=Math.max(m,bm[Y*bw+X]);}bm2[y*bw+x]=m;}
 for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<bw&&Y<bh){s+=bm2[Y*bw+X];n++;}}bm3[y*bw+x]=s/n;}
 const out=new Float32Array(W*H);
 for(let y=0;y<H;y++){const fy=Math.min(bh-1.001,Math.max(0,(y+.5)/B-.5)),y0=Math.floor(fy),ty=fy-y0;for(let x=0;x<W;x++){const fx=Math.min(bw-1.001,Math.max(0,(x+.5)/B-.5)),x0=Math.floor(fx),tx=fx-x0,i=y0*bw+x0,
   bg=(bm3[i]*(1-tx)+bm3[i+1<bw*bh?i+1:i]*tx)*(1-ty)+(bm3[Math.min(i+bw,bw*bh-1)]*(1-tx)+bm3[Math.min(i+bw+1,bw*bh-1)]*tx)*ty;const v=g[y*W+x];out[y*W+x]=v<0?1:Math.min(1,v/Math.max(30,bg));}}
 return out;}
function cleanGray(c){const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data,g=new Float32Array(W*H);
 const gm=new Float32Array(W*H);for(let i=0;i<W*H;i++){const r=d[i*4],gg=d[i*4+1],b=d[i*4+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),y=r*.3+gg*.59+b*.11;g[i]=(mx-mn>28&&(mx-mn)>.16*mx&&y>95)?-1:y;/* prem8: dark coloured strokes (maroon/navy walls) stay ink; only light fills are stripped */gm[i]=mx;}
 // prem8 photo stage: paper level = grey closing (removes dark strokes up to K px) on a 4x-reduced max image, so soft shadows,
 // gradients and glare stay in the background while lines/walls do not; then divide (background normalisation)
 const F=4,bw=Math.ceil(W/F),bh=Math.ceil(H/F),sm=new Float32Array(bw*bh);
 {const vv=[];for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){vv.length=0;for(let y=by*F;y<Math.min(H,by*F+F);y++)for(let x=bx*F;x<Math.min(W,bx*F+F);x++)vv.push(gm[y*W+x]);vv.sort((a,b)=>a-b);sm[by*bw+bx]=vv[Math.floor((vv.length-1)*.8)];}}// 80th pct of the block (robust to sensor noise)
 // colour-only blocks: take neighbour level later (fill with local max)
 const mx1=(a,r,hz)=>{const o=new Float32Array(a.length),n=hz?bw:bh,M=hz?bh:bw;for(let j=0;j<M;j++)for(let i=0;i<n;i++){let m=-1;for(let k=Math.max(0,i-r);k<=Math.min(n-1,i+r);k++){const v=hz?a[j*bw+k]:a[k*bw+j];if(v>m)m=v;}hz?o[j*bw+i]=m:o[i*bw+j]=m;}return o;};
 const mn1=(a,r,hz)=>{const o=new Float32Array(a.length),n=hz?bw:bh,M=hz?bh:bw;for(let j=0;j<M;j++)for(let i=0;i<n;i++){let m=1e9;for(let k=Math.max(0,i-r);k<=Math.min(n-1,i+r);k++){let v=hz?a[j*bw+k]:a[k*bw+j];if(v<0)continue;if(v<m)m=v;}hz?o[j*bw+i]=(m>1e8?-1:m):o[i*bw+j]=(m>1e8?-1:m);}return o;};
 const r=Math.max(4,Math.round(Math.max(W,H)/F/45));// closing radius ≈ 2.2% of the page (> thickest poché wall)
 let bgS=mx1(mx1(sm,r,1),r,0);bgS=mn1(mn1(bgS,r,1),r,0);
 for(let i=0;i<bgS.length;i++)if(bgS[i]<0)bgS[i]=255;
 // smooth 5x5 box
 {const t=new Float32Array(bgS.length);for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let s2=0,n2=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<bw&&Y<bh){s2+=bgS[Y*bw+X];n2++;}}t[y*bw+x]=s2/n2;}bgS=t;}
 const srt=Float32Array.from(bgS).sort(),bgLo=Math.max(30,.3*srt[Math.floor(srt.length*.7)]);
 const out=new Float32Array(W*H);
 for(let y=0;y<H;y++){const fy=Math.min(bh-1.001,Math.max(0,(y+.5)/F-.5)),y0=Math.floor(fy),ty=fy-y0;for(let x=0;x<W;x++){const fx=Math.min(bw-1.001,Math.max(0,(x+.5)/F-.5)),x0=Math.floor(fx),tx=fx-x0,i=y0*bw+x0,
   bg=(bgS[i]*(1-tx)+bgS[Math.min(i+1,bw*bh-1)]*tx)*(1-ty)+(bgS[Math.min(i+bw,bw*bh-1)]*(1-tx)+bgS[Math.min(i+bw+1,bw*bh-1)]*tx)*ty;const v=g[y*W+x];out[y*W+x]=v<0||bg<bgLo?1:Math.min(1,v/Math.max(30,bg));}}
 return out;}
function inkMask(n,W,H,thr){const m=new Uint8Array(W*H);for(let i=0;i<W*H;i++)m[i]=n[i]<thr?1:0;if(inkMask.off)return m;
 // prem8 hysteresis: faint (blurred / pencil / JPEG) parts of a stroke join when they touch a confident stroke
 // grow at most 3 px from a confident stroke; skipped on noisy (dark / grainy) pages where faint pixels are everywhere
 const wk=Math.min(.86,thr+.2);let nw=0,ns=0;for(let i=0;i<W*H;i++){if(m[i])ns++;else if(n[i]<wk)nw++;}
 if(nw<Math.max(.04*W*H,1.5*ns)){const D=new Uint8Array(W*H);let cur=[];for(let i=0;i<W*H;i++)if(m[i])cur.push(i);
  for(let it=1;it<=3&&cur.length;it++){const nx=[];for(const j of cur){const x=j%W;for(const k of[j-1,j+1,j-W,j+W]){if(k<0||k>=W*H||m[k])continue;if((k===j-1&&x===0)||(k===j+1&&x===W-1))continue;if(n[k]<wk){m[k]=1;nx.push(k);}}}cur=nx;}}
 return m;}
// ---------- morphology (separable, box) ----------
function dil1(m,W,H,r,hz){const o=new Uint8Array(W*H);if(hz){for(let y=0;y<H;y++){let run=-1e9;for(let x=0;x<W;x++){if(m[y*W+x])run=x;if(x-run<=r)o[y*W+x]=1;}run=1e9;for(let x=W-1;x>=0;x--){if(m[y*W+x])run=x;if(run-x<=r)o[y*W+x]=1;}}}else{for(let x=0;x<W;x++){let run=-1e9;for(let y=0;y<H;y++){if(m[y*W+x])run=y;if(y-run<=r)o[y*W+x]=1;}run=1e9;for(let y=H-1;y>=0;y--){if(m[y*W+x])run=y;if(run-y<=r)o[y*W+x]=1;}}}return o;}
function inv(m){const o=new Uint8Array(m.length);for(let i=0;i<m.length;i++)o[i]=m[i]?0:1;return o;}
function dilate(m,W,H,k){const r=k>>1;return dil1(dil1(m,W,H,r,1),W,H,r,0);}
function erode(m,W,H,k){return inv(dilate(inv(m),W,H,k));}
function openK(m,W,H,k){return dilate(erode(m,W,H,k),W,H,k);}
function closeK(m,W,H,k){return erode(dilate(m,W,H,k),W,H,k);}
function open1(m,W,H,L,hz){const r=L>>1;const e=inv(dil1(inv(m),W,H,r,hz));return dil1(e,W,H,r,hz);}
// chamfer distance to background
function dist(m,W,H){const d=new Float32Array(W*H);for(let i=0;i<W*H;i++)d[i]=m[i]?1e6:0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!d[i])continue;let v=d[i];if(x>0)v=Math.min(v,d[i-1]+1);if(y>0){v=Math.min(v,d[i-W]+1);if(x>0)v=Math.min(v,d[i-W-1]+1.414);if(x<W-1)v=Math.min(v,d[i-W+1]+1.414);}d[i]=v;}
 for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(!d[i])continue;let v=d[i];if(x<W-1)v=Math.min(v,d[i+1]+1);if(y<H-1){v=Math.min(v,d[i+W]+1);if(x<W-1)v=Math.min(v,d[i+W+1]+1.414);if(x>0)v=Math.min(v,d[i+W-1]+1.414);}d[i]=v;}
 return d;}
// ---------- deskew (projection profile) ----------
function skewAngle(m,W,H){const s=Math.min(1,500/Math.max(W,H)),pts=[];const step=Math.max(1,Math.round(1/s));
 for(let y=0;y<H;y+=step)for(let x=0;x<W;x+=step)if(m[y*W+x])pts.push(x,y);if(pts.length<200)return 0;
 const score=a=>{const c=Math.cos(a),sn=Math.sin(a),N=Math.ceil((W+H)/step)+4,hy=new Float32Array(N),hx=new Float32Array(N);for(let i=0;i<pts.length;i+=2){const x=pts[i],y=pts[i+1];const ry=(-x*sn+y*c)/step+N/2,rx=(x*c+y*sn)/step+N/2;hy[ry|0]++;hx[rx|0]++;}let v=0;for(let i=0;i<N;i++)v+=hy[i]*hy[i]+hx[i]*hx[i];return v;};
 let best=0,bv=-1;for(let a=-20;a<=20;a+=1){const v=score(a*Math.PI/180);if(v>bv){bv=v;best=a;}}
 let b2=best;for(let a=best-1;a<=best+1;a+=.1){const v=score(a*Math.PI/180);if(v>bv){bv=v;b2=a;}}return b2*Math.PI/180;}
function rotateCanvas(c,a){if(Math.abs(a)<.002)return c;const cs=Math.abs(Math.cos(a)),sn=Math.abs(Math.sin(a)),W=Math.round(c.width*cs+c.height*sn),H=Math.round(c.width*sn+c.height*cs),o=mk(W,H),x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.translate(W/2,H/2);x.rotate(-a);x.drawImage(c,-c.width/2,-c.height/2);return o;}
// ---------- wall mask ----------
function compsFilter(m,W,H,keep){const lab=new Int32Array(W*H),st=[],out=new Uint8Array(W*H);let id=0;
 for(let i=0;i<W*H;i++){if(!m[i]||lab[i])continue;id++;const px=[];st.push(i);lab[i]=id;let x0=1e9,y0=1e9,x1=-1,y1=-1;
  while(st.length){const j=st.pop();px.push(j);const x=j%W,y=(j/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(x>0&&m[j-1]&&!lab[j-1]){lab[j-1]=id;st.push(j-1);}if(x<W-1&&m[j+1]&&!lab[j+1]){lab[j+1]=id;st.push(j+1);}if(y>0&&m[j-W]&&!lab[j-W]){lab[j-W]=id;st.push(j-W);}if(y<H-1&&m[j+W]&&!lab[j+W]){lab[j+W]=id;st.push(j+W);}}
  if(keep({n:px.length,x0,y0,x1,y1}))for(const j of px)out[j]=1;}
 return out;}
function strokeWidths(m,W,H){const d=dist(m,W,H),h=new Float64Array(64);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,v=d[i];if(!v)continue;// ridge: not smaller than 4-neighbours
  if(v>=d[i-1]&&v>=d[i+1]&&v>=d[i-W]&&v>=d[i+W]){const k=Math.min(63,Math.round(v*2-1));h[k]++;}}
 return{h,d};}
function wallMask(ink,W,H){const {h}=strokeWidths(ink,W,H);
 // thin-line width (text, dimension lines, door arcs) = most common ridge width among thin strokes
 let lw=1,mx=0;for(let k=1;k<=5;k++)if(h[k]>mx){mx=h[k];lw=k;}
 // wall widths: length-weighted mass above the thin lines; interior = thinnest significant class
 let lwMax=lw;for(let k=lw+1;k<=6;k++)if(h[k]>.12*mx)lwMax=k;else break;
 let wk=0,wv=0;const k0=Math.max(lwMax+2,3);for(let k=k0;k<64;k++){const v=h[k]*k;if(v>wv){wv=v;wk=k;}}
 const kLo=Math.max(k0,Math.round(wk*.28));let kInt=wk;for(let k=kLo;k<wk;k++){if(h[k]*k>.12*wv){kInt=k;break;}}
 const kOpen=Math.max(3,Math.min(kInt-1,Math.max(lwMax+2,Math.round(kInt*.7))));
 return{wm:openK(ink,W,H,kOpen),lw:lwMax,wk,kInt,kOpen};}
// hatched / outlined walls: fill thin-outline wall bodies by closing, then the same opening
function hatchMask(ink,W,H,lw){const k=Math.max(5,lw*4+1);const c=closeK(ink,W,H,k);return c;}
// ---------- segments ----------
function axisSegs(wm,W,H,minLen,hz){const o=open1(wm,W,H,minLen,hz);const segs=[];
 const lab=new Int32Array(W*H),st=[];let id=0;
 for(let i=0;i<W*H;i++){if(!o[i]||lab[i])continue;id++;st.push(i);lab[i]=id;let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;
  while(st.length){const j=st.pop();n++;const x=j%W,y=(j/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(x>0&&o[j-1]&&!lab[j-1]){lab[j-1]=id;st.push(j-1);}if(x<W-1&&o[j+1]&&!lab[j+1]){lab[j+1]=id;st.push(j+1);}if(y>0&&o[j-W]&&!lab[j-W]){lab[j-W]=id;st.push(j-W);}if(y<H-1&&o[j+W]&&!lab[j+W]){lab[j+W]=id;st.push(j+W);}}
  const L=hz?x1-x0+1:y1-y0+1,T=n/L;if(L<minLen||T>L*.6)continue;
  // split thick blobs (two parallel walls touching) are rare; use mean thickness
  segs.push(hz?{hz:1,a:x0,b:x1+1,c:(y0+y1+1)/2,t:Math.max(1,T)}:{hz:0,a:y0,b:y1+1,c:(x0+x1+1)/2,t:Math.max(1,T)});}
 return segs;}
function mergeColinear(S,gapMax){let ch=1;while(ch){ch=0;for(let i=0;i<S.length&&!ch;i++)for(let j=i+1;j<S.length&&!ch;j++){const A=S[i],B=S[j];if(A.hz!==B.hz)continue;if(Math.abs(A.c-B.c)>Math.max(A.t,B.t)*.5+1)continue;if(Math.abs(A.t-B.t)>Math.max(A.t,B.t)*.5+1)continue;
  const g=Math.max(A.a,B.a)-Math.min(A.b,B.b);if(g>gapMax)continue;const LA=A.b-A.a,LB=B.b-B.a;S[i]={hz:A.hz,a:Math.min(A.a,B.a),b:Math.max(A.b,B.b),c:(A.c*LA+B.c*LB)/(LA+LB),t:(A.t*LA+B.t*LB)/(LA+LB),op:[...(A.op||[]),...(B.op||[])]};S.splice(j,1);ch=1;}}return S;}
// snap segment ends to perpendicular walls (corners, T-junctions)
function snap(S){for(const s of S){for(const end of ['a','b']){const p=s[end];let best=null,bd=1e9;
  for(const q of S){if(q.hz===s.hz)continue;// q runs perpendicular; its centre line coordinate is q.c along s's axis
   if(s.c<q.a-q.t-s.t||s.c>q.b+q.t+s.t)continue;const dd=Math.abs(q.c-p);const lim=q.t/2+Math.max(4,s.t*.8);if(dd<lim&&dd<bd){bd=dd;best=q;}}
  if(best){s[end]=best.c;}}
 // extend other ends: perpendicular wall ends that stop near s get pulled onto s.c (done symmetrically by loop)
 }return S.filter(s=>s.b-s.a>s.t*.8);}
// ---------- openings ----------
function classifyGap(A,lo,hi,c,t,ink,W,H){let lines=0;const nS=7;for(let k=0;k<nS;k++){const off=-t*.7+k*(t*1.4)/(nS-1);let on=0,tot=0;for(let u=lo+2;u<hi-2;u+=1){const x=Math.round(A.hz?u:c+off),y=Math.round(A.hz?c+off:u);if(x<0||y<0||x>=W||y>=H)continue;tot++;if(ink[y*W+x])on++;}if(tot&&on>.7*tot)lines++;}
 return lines>=2?'window':'door';}
function findOpenings(S,ink,W,H,ppm,bb){const out=[];const used=new Set();
 const isExt=(A,c,t)=>A.hz?Math.min(Math.abs(c-bb[1]),Math.abs(c-bb[3]))<t*1.5:Math.min(Math.abs(c-bb[0]),Math.abs(c-bb[2]))<t*1.5;
 const pairs=[];for(let i=0;i<S.length;i++)for(let j=0;j<S.length;j++){if(i===j)continue;const A=S[i],B=S[j];if(A.hz!==B.hz||B.a<A.b-1)continue;if(Math.abs(A.c-B.c)>Math.max(A.t,B.t)*.6+1)continue;
  const g=B.a-A.b;if(g<.45*ppm||g>3.2*ppm)continue;
  if(S.some((C,k)=>k!==i&&k!==j&&C.hz===A.hz&&Math.abs(C.c-A.c)<A.t&&C.a<B.a-1&&C.b>A.b+1))continue;
  const lo=A.b,hi=B.a;if(S.some(C=>C.hz!==A.hz&&C.c>lo+C.t&&C.c<hi-C.t&&A.c>C.a-1&&A.c<C.b+1))continue;
  pairs.push([g,i,j]);}
 pairs.sort((a,b)=>a[0]-b[0]);
 for(const[g,i,j]of pairs){if(used.has('b'+i)||used.has('a'+j))continue;used.add('b'+i);used.add('a'+j);const A=S[i],B=S[j],t=(A.t+B.t)/2,lo=A.b,hi=B.a,c=(A.c+B.c)/2;
  out.push({i,j,type:classifyGap(A,lo,hi,c,t,ink,W,H),lo,hi,ext:isExt(A,c,t),g});}
 // exterior walls are continuous: bridge any remaining colinear gap on the outline (bay, chimney, wide glazing)
 for(let i=0;i<S.length;i++){if(used.has('b'+i))continue;const A=S[i];if(!isExt(A,A.c,A.t))continue;let bj=-1,bg=1e9;
  for(let j=0;j<S.length;j++){if(j===i||used.has('a'+j))continue;const B=S[j];if(B.hz!==A.hz||Math.abs(B.c-A.c)>Math.max(A.t,B.t)+2)continue;const g=B.a-A.b;if(g>0&&g<bg){bg=g;bj=j;}}
  if(bj<0||bg>.5*Math.max(bb[2]-bb[0],bb[3]-bb[1]))continue;const B=S[bj];if(S.some((C,k)=>k!==i&&k!==bj&&C.hz===A.hz&&Math.abs(C.c-A.c)<A.t&&C.a<B.a-1&&C.b>A.b+1))continue;
  used.add('b'+i);used.add('a'+bj);const t=(A.t+B.t)/2,lo=A.b,hi=B.a,c=(A.c+B.c)/2,ty=classifyGap(A,lo,hi,c,t,ink,W,H);
  out.push({i,j:bj,type:bg>3.2*ppm&&ty!=='window'?'wall':ty,lo,hi,ext:true,g:bg});}
 // free ends: gap up to a perpendicular wall (door next to a corner / junction)
 S.forEach((A,i)=>{for(const end of['a','b']){if(used.has(end+i))continue;const p=A[end],dir=end==='b'?1:-1;
   // already touching a perpendicular wall?
   if(S.some(C=>C.hz!==A.hz&&Math.abs(C.c-p)<=C.t/2+3&&A.c>=C.a-C.t-2&&A.c<=C.b+C.t+2))continue;
   let best=null,bd=1e9;for(const C of S){if(C.hz===A.hz)continue;if(A.c<C.a-C.t/2-2||A.c>C.b+C.t/2+2)continue;const d=(C.c-p)*dir;if(d<.45*ppm||d>3.2*ppm)continue;if(d<bd){bd=d;best=C;}}
   if(!best)continue;const to=best.c,lo=dir>0?p:to+best.t/2,hi=dir>0?to-best.t/2:p;
   if(S.some(C=>C!==A&&C.hz===A.hz&&Math.abs(C.c-A.c)<A.t&&C.a<hi&&C.b>lo))continue;
   if(hi-lo<.45*ppm)continue;used.add(end+i);
   out.push({i,j:null,end,to,type:classifyGap(A,lo,hi,A.c,A.t,ink,W,H),lo,hi,ext:isExt(A,A.c,A.t),g:hi-lo});}});
 return out;}
// ---------- scale ----------
function median(a){if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];}
function estimateScale(S,ops,bb){const bw=Math.max(bb[2]-bb[0],bb[3]-bb[1]);const ok=p=>p>0&&bw/p>=4&&bw/p<=40;
 const outer=S.filter(s=>s.hz?Math.min(Math.abs(s.c-bb[1]),Math.abs(s.c-bb[3]))<2*s.t:Math.min(Math.abs(s.c-bb[0]),Math.abs(s.c-bb[2]))<2*s.t).map(s=>s.t);
 const tE=median(outer),pT=tE/.37;// prem8: SK brick houses 0.44–0.50, timber/synthetic ~0.30 -> middle value, and doors weigh more below
// exterior wall typ. 0.30–0.45 m
 const doors=ops.filter(o=>o.type==='door'&&!o.ext).map(o=>o.g),pD=doors.length?median(doors)/.85:0;
 let ppm,src;if(ok(pD)&&ok(pT)&&doors.length>=2){ppm=Math.pow(pD,.7)*Math.pow(pT,.3);src='doors+walls';}else if(ok(pD)&&doors.length>=2){ppm=pD;src='doors';}else if(ok(pT)){ppm=pT;src='walls';}else{ppm=bw/12;src='size';}
 estimateScale.last=[pD,pT,doors.length,outer.length];return{ppm,src};}
// outline walls: two thin parallel lines with nothing between (white or grey) -> fill the band.
// Stacks of 3+ lines (windows) and hatch are left alone.
function pairFill(ink,W,H,kmax,lwm){const o=new Uint8Array(ink);
 for(const hz of[1,0]){const N=hz?W:H,L=hz?H:W;const at=(u,v)=>hz?v*W+u:u*W+v;const P=[];// scan across the wall direction
  for(let u=0;u<N;u++){const R=[];let v=0;while(v<L){if(ink[at(u,v)]){const v0=v;while(v<L&&ink[at(u,v)])v++;R.push([v0,v-1]);}else v++;}const pu=[];
   for(let k=0;k+1<R.length;k++){const a=R[k],b=R[k+1],g=b[0]-a[1]-1;if(g<1||g>kmax)continue;if(a[1]-a[0]>lwm||b[1]-b[0]>lwm)continue;
    const gp=k>0?a[0]-R[k-1][1]-1:1e9,gn=k+2<R.length?R[k+2][0]-b[1]-1:1e9;if(gp<=kmax*1.2||gn<=kmax*1.2)continue;pu.push([a[1]+1,b[0]-1]);k++;}
   P.push(pu);}
  // keep only bands that continue along the wall (hatch / text give scattered pairs)
  for(let u=0;u<N;u++)for(const[p0,p1]of P[u]){let ok=0;for(let d=-3;d<=3;d++){if(!d||u+d<0||u+d>=N)continue;if(P[u+d].some(q=>Math.abs(q[0]-p0)<=Math.abs(d)+1&&Math.abs(q[1]-p1)<=Math.abs(d)+1))ok++;}
   if(ok>=4)for(let w=p0;w<=p1;w++)o[at(u,w)]=1;}}
 return o;}
function close1(m,W,H,L,hz){const r=L>>1;return inv(dil1(inv(dil1(m,W,H,r,hz)),W,H,r,hz));}
// windows drawn as 3+ thin parallel lines inside a wall (works even when the wall body was closed over them)
function stackWindows(S,ink,tone,W,H,ppm,lwm){const out=[];
 S.forEach((A,i)=>{const L=A.b-A.a;if(L<.6*ppm)return;const h=Math.ceil(A.t/2)+2;const flag=new Uint8Array(Math.ceil(L)+1),sig=[];
  for(let k=0;k<=L;k++){const u=Math.round(A.a+k);let runs=0,inRun=0,rl=0,bad=0,tn=0;const cs=[];
   for(let d=-h;d<=h;d++){const x=A.hz?u:Math.round(A.c+d),y=A.hz?Math.round(A.c+d):u;if(x<0||y<0||x>=W||y>=H){continue;}const q=y*W+x;if(tone&&tone[q])tn++;
    if(ink[q]){if(!inRun){runs++;inRun=1;rl=0;cs.push(d);}rl++;if(rl>lwm)bad=1;}else inRun=0;}
   sig[k]=cs;const pv=sig[k-3];flag[k]=runs>=3&&!bad&&tn<2&&pv&&pv.length===cs.length&&cs.every((c,j)=>Math.abs(c-pv[j])<=1)?1:0;}
  // smooth: spans of flagged positions with small holes
  let k=0;while(k<=L){if(!flag[k]){k++;continue;}let e=k,hole=0;for(let j=k;j<=L;j++){if(flag[j]){e=j;hole=0;}else if(++hole>4)break;}
   if(e-k>=.5*ppm&&e-k<=3.5*ppm)out.push({i,lo:A.a+k,hi:A.a+e});k=e+1;}});
 return out;}
// plausibility of a reading: closed rooms of sensible size (openings bridged), closed outline, few loose pieces
function quality(S,ops,bb,ppm,W,H){const f=3,gw=Math.ceil(W/f)+2,gh=Math.ceil(H/f)+2,g=new Uint8Array(gw*gh);
 const rect=(x0,y0,x1,y1)=>{for(let y=Math.max(0,Math.floor(y0/f));y<=Math.min(gh-1,Math.ceil(y1/f));y++)for(let x=Math.max(0,Math.floor(x0/f));x<=Math.min(gw-1,Math.ceil(x1/f));x++)g[y*gw+x]=1;};
 const seg=(hz,c,a,b,t)=>{const h=Math.max(t,f*1.5)/2;hz?rect(a,c-h,b,c+h):rect(c-h,a,c+h,b);};
 S.forEach(s=>seg(s.hz,s.c,s.a-s.t/2,s.b+s.t/2,s.t));ops.forEach(p=>{const A=S[p.i];seg(A.hz,A.c,p.lo-2,p.hi+2,A.t);});
 const lab=new Int32Array(gw*gh),st=[];let id=1;const areas=[];
 for(let i=0;i<gw*gh;i++){if(g[i]||lab[i])continue;id++;let n=0,edge=false,bx0=1e9,by0=1e9,bx1=-1,by1=-1;st.push(i);lab[i]=id;while(st.length){const k=st.pop(),x=k%gw,y=(k/gw)|0;n++;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;if(!x||!y||x===gw-1||y===gh-1)edge=true;for(const j of[x>0?k-1:-1,x<gw-1?k+1:-1,y>0?k-gw:-1,y<gh-1?k+gw:-1])if(j>=0&&!g[j]&&!lab[j]){lab[j]=id;st.push(j);}}
  if(!edge){const mn=Math.min(bx1-bx0+1,by1-by0+1)*f/ppm;areas.push(mn<.75?-(n*f*f/(ppm*ppm)):n*f*f/(ppm*ppm));}}
 const good=areas.filter(a=>a>=1.2&&a<=150),tiny=areas.filter(a=>(a<1.2&&a>.15)||a<-.15).length;const encl=good.reduce((a,b)=>a+b,0),bbA=Math.max(1,(bb[2]-bb[0])*(bb[3]-bb[1])/(ppm*ppm));
 const cov=sideCoverage(S,bb);const nR=Math.min(good.length,30);
 const Q=nR*.6+Math.min(1,encl/bbA)*3+cov.n*.4-.3*tiny-.04*Math.max(0,S.length-3*nR-8);
 return{Q,nR,encl:encl/bbA};}
// ---------- main ----------
// prem8: digital (no paper found) uploads are read with both cleanings; the reading with the more plausible rooms wins
export function readPlan(img,o={}){if(o._cm)return readPlan1(img,o);const R=readPlan0(img,o);if(R&&R.dbg&&!(R.dbg.nR>0)&&!o._cyan&&!(globalThis.__PF||{}).noCyan){/* outline open: retry with coloured window symbols as wall body */let C=null;try{C=readPlan1(img,{...o,_cm:R.dbg.cm||'new',_cyan:1,noPaper:!R.dbg.paper});}catch(e){C=null;}if(C&&C.dbg&&(C.dbg.nR||0)>0){C.dbg.cyanRetry=1;return C;}}return R;}
function readPlan0(img,o){const A=readPlan1(img,{...o,_cm:'new'});if(A&&A.dbg&&(A.dbg.paper||((globalThis.__PF||{}).skip&&(A.dbg.Q||0)>=4.5)))return A;/* photo, or a confident first reading -> no second pass (speed) */
 let B=null;try{B=readPlan1(img,A?{...o,_cm:'old',noPaper:1,noSketch:1}:{...o,_cm:'old'});/* first reading failed completely -> full second reading (paper + sketch) */}catch(e){B=null;}if(!B)return A;if(!A){B.dbg.aNull=1;return B;}
 const qa=(A.dbg.Q||0)+(A.dbg.scale==='dims'?.6:0),qb=(B.dbg.Q||0)+(B.dbg.scale==='dims'?.6:0);/* a reading whose dimension text parsed is the cleaner one */const R=qb>qa+.05?B:A;R.dbg.cm=R===B?'old':'new';R.dbg.tA=A.dbg.t;R.dbg.tB=B.dbg.t;R.dbg.Qs=[+qa.toFixed(2),+qb.toFixed(2)];return R;}
function readPlan1(img,o={}){const dbg={},T0=performance.now(),tm=k=>{dbg.t=dbg.t||{};dbg.t[k]=Math.round(performance.now()-T0);};let c=imgCanvas(img,MAXD);const CG=o._cm==='old'?cleanGrayOld:cleanGray;inkMask.off=o._cm==='old';
 if(!o.rect&&!o.noPaper){const q=findPaper(c);if(q){dbg.pq=q.map(p=>p.map(v=>Math.round(v)));dbg.pref=findPaper.ref;dbg.psrc=findPaper.src;dbg.fd=findPaper.fd;dbg.cw=[c.width,c.height];c=warpPaper(c,q);dbg.asp=warpPaper.asp;dbg.paper=1;}}
 focus.nearE=!!o._cyan;tm('paper');let n=CG(c),W=c.width,H=c.height,ink=inkMask(n,W,H,.6);
 if(!o.rect){const a=skewAngle(ink,W,H);dbg.skew=+(a*180/Math.PI).toFixed(2);if(Math.abs(a)>.003){c=rotateCanvas(c,a);n=CG(c);W=c.width;H=c.height;ink=inkMask(n,W,H,.6);}}
 tm('clean');ink=compsFilter(ink,W,H,k=>k.n>=6);
 // prem8: coloured window symbols (saturated cyan / blue bands in the wall line) close the outline as wall body and are
 // turned into window openings after the walls are found (instead of being stripped with the colour fills)
 let cyan=null;if(o._cyan){const d=c.getContext('2d').getImageData(0,0,W,H).data,cm=new Uint8Array(W*H);let nc=0;for(let i=0;i<W*H;i++){const r0=d[i*4],g0=d[i*4+1],b0=d[i*4+2],mx=Math.max(r0,g0,b0),mn=Math.min(r0,g0,b0);if(b0>130&&b0-r0>60&&mx-mn>60&&g0>=r0){cm[i]=1;nc++;}}
  if(nc>W*H*.0003&&nc<W*H*.05){const mxD=Math.max(W,H);cyan=compsFilter(cm,W,H,k=>{const a2=k.x1-k.x0+1,b2=k.y1-k.y0+1;const mw=k.n/Math.max(a2,b2);return Math.max(a2,b2)>=.015*mxD&&mw<=.05*mxD&&(Math.max(a2,b2)>=3*Math.min(a2,b2)||(mw<=.35*Math.max(a2,b2)&&k.n<.6*a2*b2));});let nk=0;for(let i=0;i<W*H;i++)if(cyan[i]){nk++;ink[i]=1;}dbg.cyan=nk;if(!nk)cyan=null;}}
 // wall bodies may be grey (poché) rather than black: add mid-grey tone to the body mask
 let tone=new Uint8Array(W*H);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,v=n[i];if(v<.86&&v>.2&&!ink[i]){let g=0;for(const j of[i-1,i+1,i-W,i+W]){if(!ink[j])g=Math.max(g,Math.abs(v-n[j]));}if(g<.045)tone[i]=1;}}dbg.tone0=tone.reduce((a,b)=>a+b,0);tone=openK(tone,W,H,3);const body=new Uint8Array(W*H);let nTone=0;for(let i=0;i<W*H;i++){body[i]=ink[i]||tone[i]?1:0;nTone+=tone[i];}dbg.tone=+(nTone/(W*H)).toFixed(3);
 // several readings of the wall bodies; keep the one that forms the most plausible closed rooms
 const base=wallMask(ink,W,H);const lw=base.lw;
 const run=(mask,wk,useM,kI)=>{let wkM=wk;if(useM){const hh=strokeWidths(mask,W,H).h;let bv=0;for(let k=3;k<64;k++){const v=hh[k]*k;if(v>bv){bv=v;wkM=k;}}}const minLen=Math.max(12,Math.round(Math.min(Math.max(wk,wkM,4)*2.5,.07*Math.max(W,H))));
  const big=compsFilter(mask,W,H,k=>Math.max(k.x1-k.x0,k.y1-k.y0)>=Math.max(minLen*1.5,.04*Math.max(W,H)));
  let S=[...axisSegs(big,W,H,minLen,1),...axisSegs(big,W,H,minLen,0)];
  // second, finer pass for thin partitions between door gaps (shorter than the thick-wall length limit)
  const tThin=median(S.filter(q=>q.t<.6*wk).map(q=>q.t))||Math.min(kI,wk*.5);const mL2=Math.max(12,Math.round(Math.max(tThin,4)*3.5));if(mL2<minLen*.8){const res=new Uint8Array(mask);const pad=2;for(const q of S){const h=q.t/2+pad;const x0=Math.max(0,Math.floor(q.hz?q.a-pad:q.c-h)),x1=Math.min(W-1,Math.ceil(q.hz?q.b+pad:q.c+h)),y0=Math.max(0,Math.floor(q.hz?q.c-h:q.a-pad)),y1=Math.min(H-1,Math.ceil(q.hz?q.c+h:q.b+pad));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)res[y*W+x]=0;}
   const S2=[...axisSegs(res,W,H,mL2,1),...axisSegs(res,W,H,mL2,0)].filter(q=>q.b-q.a>=3*q.t&&q.t<=Math.max(tThin*1.8,4));
   const touch=(q,P)=>P.some(r=>{if(r===q)return false;const m=Math.max(q.t,r.t)+4;if(q.hz===r.hz)return Math.abs(q.c-r.c)<m&&(Math.abs(q.a-r.b)<m*2||Math.abs(q.b-r.a)<m*2);return r.c>q.a-m&&r.c<q.b+m&&q.c>r.a-m&&q.c<r.b+m;});
   let add2=S2.filter(q=>touch(q,S)),rest=S2.filter(q=>!add2.includes(q)),ch=1;while(ch){ch=0;for(const q of rest){if(!add2.includes(q)&&touch(q,[...S,...add2])){add2.push(q);ch=1;}}}
   if(o.debug)(dbg.thin=dbg.thin||[]).push([mL2,S2.filter(q=>q.hz).map(q=>[q.a|0,q.b|0,q.c|0,+q.t.toFixed(1)]),add2.length]);S=S.concat(add2);}
  S=mergeColinear(S,2);S=snap(S);S=mergeColinear(S,1);return S;};
 const V=[];const add=(name,mask,wk,kOpen,kInt)=>{let S=run(mask,wk,/^t?h\d/.test(name),kInt||wk);if(o.debug)dbg["raw_"+name]=S.map(q=>[q.hz,q.a|0,q.b|0,q.c|0,+q.t.toFixed(1)]);if(S.length<3)return;S=focus(S);if(S.length<3)return;S=o._cyan?closeCorners(S):S;void(S);const bb=bbox(S);
  const ops=findOpenings(S,ink,W,H,Math.max(wk*2.5,(bb[2]-bb[0])/15),bb);const sc=estimateScale(S,ops,bb);const q=quality(S,ops,bb,sc.ppm,W,H);
  V.push({name,S,mask,wk,kOpen,kInt,bb,q});dbg['q_'+name]=[S.length,+q.Q.toFixed(2),q.nR];};
 add('ink',base.wm,base.wk,base.kOpen,base.kInt);
 if(nTone>W*H*.0008){const B=wallMask(body,W,H);add('tone',B.wm,B.wk,B.kOpen,B.kInt);}
 {const km=Math.max(6,Math.round(.022*Math.max(W,H))),pfS=compsFilter(nTone>W*H*.0008?body:ink,W,H,k=>{const a=k.x1-k.x0+1,b=k.y1-k.y0+1;return Math.max(a,b)>=.025*Math.max(W,H)||Math.min(a,b)<.3*Math.max(a,b);}),pf0=pairFill(pfS,W,H,km,lw*2+2),pf=close1(close1(pf0,W,H,9,1),W,H,9,0);let d=0;for(let i=0;i<W*H;i+=7)d+=pf[i]-pfS[i];dbg.pairD=+(d*7/(W*H)).toFixed(4);if(d>W*H*.0003/7){const B=wallMask(pf,W,H);add('pair',B.wm,B.wk,B.kOpen,B.kInt);}}
 // prem8 sketch stage: thin, wobbly, broken hand strokes (pen/pencil photo) -> looser threshold, short axis closings bridge
 // breaks and wobble, then the double-line walls are filled like 'pair'. Only when strokes are thin and no reading closes rooms.
 if(!o.noSketch&&((globalThis.__PF||{}).oldSk?lw<=3:(dbg.paper?lw<=3:lw<=2))&&!V.some(v=>v.q.nR>=3))for(const skT of[.74,.8,.86]){const m2=inkMask(n,W,H,skT),mx=Math.max(W,H);let c2=close1(close1(m2,W,H,7,1),W,H,7,0);c2=compsFilter(c2,W,H,k=>Math.max(k.x1-k.x0,k.y1-k.y0)>=.03*mx);
  const km=Math.max(6,Math.round(.022*mx)),pf=close1(close1(pairFill(c2,W,H,km,lw*2+5),W,H,9,1),W,H,9,0);let d=0;for(let i=0;i<W*H;i+=7)d+=pf[i]-c2[i];
  if(d>W*H*.0003/7){const B=wallMask(pf,W,H);add('sk'+Math.round(skT*100),B.wm,B.wk,B.kOpen,B.kInt);}}
 const solidOK=V.length&&V[0].S.length>=4&&(base.wk>2.2*lw+2)&&sideCoverage(V[0].S,V[0].bb).n>=2;dbg.solidOK=!!solidOK;
 for(const src of solidOK?[]:nTone>W*H*.0008?[ink,body]:[ink]){const inkBig=compsFilter(src,W,H,k=>Math.max(k.x1-k.x0,k.y1-k.y0)>=.025*Math.max(W,H));
  for(const kc of[5,9,13]){const kk=Math.max(kc,lw*3+1);const hm=openK(closeK(inkBig,W,H,kk),W,H,Math.max(base.kOpen,Math.round(kc*.6)));add((src===ink?'h':'th')+kc,hm,Math.max(base.wk,kk),base.kOpen,base.kInt);}}
 tm('var');if(!V.length)return null;
 const pen=v=>v.name==='pair'?.35:0;let best=V[0];for(const v of V){if(o.forceHatch&&v.name==='h'+o.forceHatch){best=v;break;}if(v.q.Q-pen(v)>best.q.Q-pen(best)+.05)best=v;}
 dbg.pick=best.name;dbg.nR=best.q.nR;dbg.Q=best.q.Q;let S=pruneLoose(best.S);dbg.pruned=best.S.length-S.length;const dbgMask=best.mask,wk=best.wk,kInt=best.kInt,kOpen=best.kOpen;dbg.lw=lw;dbg.wk=wk;dbg.kInt=kInt;dbg.kOpen=kOpen;
 if(o.debug){const dc=mk(W,H),x=dc.getContext('2d'),id=x.createImageData(W,H);for(let i=0;i<W*H;i++){const v=dbgMask[i]?0:ink[i]?170:255;id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255;}x.putImageData(id,0,0);x.strokeStyle='red';x.lineWidth=2;S.forEach(q=>{x.beginPath();if(q.hz){x.moveTo(q.a,q.c);x.lineTo(q.b,q.c);}else{x.moveTo(q.c,q.a);x.lineTo(q.c,q.b);}x.stroke();});dbg.img=dc.toDataURL('image/png');}
 dbg.nS=S.length;
 let bb=best.bb;
 let ops=findOpenings(S,ink,W,H,Math.max(wk*2.5,(bb[2]-bb[0])/15),bb);
 tm('pick');let sc=estimateScale(S,ops,bb);dbg.est=estimateScale.last.map(v=>+v.toFixed(1));
 try{const tE=median(S.filter(s=>s.hz?Math.min(Math.abs(s.c-bb[1]),Math.abs(s.c-bb[3]))<2*s.t:Math.min(Math.abs(s.c-bb[0]),Math.abs(s.c-bb[2]))<2*s.t).map(s=>s.t))||wk;dimScale.log=[];
  // prem8 photo stage: dimension text may be upside down (plan shot at 180°) or too small/blurred for the 1x ink mask ->
  // retry on the 180°-rotated mask and on a 2x bilinear upscale of the cleaned page (own threshold), lengths scaled back
  const r180=(m,w,h)=>{const o=new Uint8Array(w*h);for(let i=0;i<w*h;i++)o[i]=m[w*h-1-i];return o;};
  const tryD=(m,w,h,f,flip)=>{const b2=bb.map(v=>v*f),bq=flip?[w-b2[2],h-b2[3],w-b2[0],h-b2[1]]:b2;const R=dimScale(flip?r180(m,w,h):m,w,h,bq,tE*f,sc.ppm*f);return R?{...R,ppm:R.ppm/f,via:f+(flip?'r':'')}:null;};
  let D=tryD(ink,W,H,1,0);
  if(!D||D.n<2){const D2=tryD(ink,W,H,1,1);if(D2&&(!D||D2.n>D.n))D=D2;}
  if((!D||D.n<2)&&W*H<4.5e6&&(dbg.paper||W*H<1.2e6||(globalThis.__PF||{}).up)){const W2=W*2,H2=H*2,u=new Uint8Array(W2*H2);for(let y=0;y<H2;y++){const fy=Math.min(H-1.001,Math.max(0,(y-.5)/2)),y0=fy|0,ay=fy-y0;for(let x=0;x<W2;x++){const fx=Math.min(W-1.001,Math.max(0,(x-.5)/2)),x0=fx|0,ax=fx-x0,i=y0*W+x0;const v=(n[i]*(1-ax)+n[i+1]*ax)*(1-ay)+(n[i+W]*(1-ax)+n[i+W+1]*ax)*ay;u[y*W2+x]=v<.55?1:0;}}
   if(o.debug){const hh=Math.round(H2*.3),dc=mk(W2,hh),x=dc.getContext('2d'),id=x.createImageData(W2,hh);for(let i=0;i<W2*hh;i++){const v=u[i]?0:255;id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255;}x.putImageData(id,0,0);dbg.uimg=dc.toDataURL();}
   for(const fl of[0,1]){if(D&&D.n>=2)break;const D3=tryD(u,W2,H2,2,fl);if(D3&&(!D||D3.n>D.n))D=D3;}}
  if(D)dbg.dimVia=D.via;dbg.dimLog=dimScale.log.filter(t=>+t.split(":").pop()>.7).slice(0,40);if(D){dbg.dims=D.dims;dbg.dimN=D.n;if(D.n>=1)sc={ppm:D.ppm,src:'dims'};}}catch(e){dbg.dimErr=String(e);}
 tm('dims');if(o.ppm){sc={ppm:o.ppm,src:'user'};}else if(o.mW>0){sc={ppm:W/o.mW,src:'user'};}
 ops=findOpenings(S,ink,W,H,sc.ppm,bb);
 {const sw=stackWindows(S,ink,null,W,H,sc.ppm,lw*2+2);let nw=0;for(const w of sw){if(ops.some(p=>p.i===w.i&&p.type!=='wall'&&p.lo<w.hi&&p.hi>w.lo))continue;if(ops.some(p=>p.j!=null&&p.j===w.i&&p.lo<w.hi&&p.hi>w.lo))continue;ops.push({i:w.i,j:null,end:'x',to:null,type:'window',lo:w.lo,hi:w.hi,inside:1,ext:true,g:w.hi-w.lo});nw++;}dbg.stackWin=nw;}
 if(cyan){let nw=0;S.forEach((A,i)=>{const L=A.b-A.a;let run=-1;const h=Math.max(2,A.t/2+2);const isC=u=>{for(let v=-h;v<=h;v+=1){const x=Math.round(A.hz?u:A.c+v),y=Math.round(A.hz?A.c+v:u);if(x>=0&&y>=0&&x<W&&y<H&&cyan[y*W+x])return true;}return false;};
  for(let u=A.a;u<=A.b+1;u++){const on=u<=A.b&&isC(u);if(on&&run<0)run=u;if(!on&&run>=0){const lo=run,hi=u-1;run=-1;if(hi-lo>=.4*sc.ppm&&!ops.some(p=>p.i===i&&p.lo<hi&&p.hi>lo)){ops.push({i,j:null,end:'x',to:null,type:'window',lo,hi,inside:1,ext:true,g:hi-lo});nw++;}}}});dbg.cyanWin=nw;}
 const ppm=sc.ppm,r=v=>Math.round(v/ppm*100)/100;
 // build walls: merge pairs with openings into one wall each
 const parent=S.map((s,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
 ops.forEach(p=>{if(p.j!=null)parent[find(p.j)]=find(p.i);});
 const groups={};S.forEach((s,i)=>{(groups[find(i)]=groups[find(i)]||[]).push(i);});
 const walls=[];
 for(const g of Object.values(groups)){const ss=g.map(i=>S[i]);let a=Math.min(...ss.map(s=>s.a)),b=Math.max(...ss.map(s=>s.b));ops.filter(p=>p.j==null&&!p.inside&&g.includes(p.i)).forEach(p=>{if(p.end==='b')b=Math.max(b,p.to);else a=Math.min(a,p.to);});const L=ss.reduce((q,s)=>q+s.b-s.a,0),cc=ss.reduce((q,s)=>q+s.c*(s.b-s.a),0)/L,t=ss.reduce((q,s)=>q+s.t*(s.b-s.a),0)/L;
  const th=Math.min(.6,Math.max(.08,Math.round(t/ppm*100)/100));
  const op=ops.filter(p=>g.includes(p.i)&&p.type!=='wall').map(p=>{const off=r(p.lo-a),w=r(p.hi-p.lo);return p.type==='window'?{type:'window',offset:off,width:w,sill:w>2.1?0:.9,height:w>2.1?2.2:1.4}:{type:'door',offset:off,width:Math.min(w,1.6),height:2.05,...(p.ext?{out:1}:{})};});
  const s0=ss[0];walls.push(s0.hz?{start:[r(a),r(cc)],end:[r(b),r(cc)],thickness:th,op}:{start:[r(cc),r(a)],end:[r(cc),r(b)],thickness:th,op});}
 // confidence: closed outline + reasonable count + interior walls
 const cov=sideCoverage(S,bb);const conf=Math.min(1,(cov.n/4)*.6+(S.length>=6?.25:S.length/24)+(ops.length?.15:0));
 dbg.cov=cov;dbg.ops=ops.length;dbg.scale=sc.src;dbg.ppm=+ppm.toFixed(2);
 let labels=[];if(!o.noLabels){try{const t0=performance.now();readLabels.log=[];labels=readLabels(ink,W,H,[bb[0]-2,bb[1]-2,bb[2]+2,bb[3]+2],ppm).map(l=>({n:l.n,s:l.s,t:l.t,p:[r(l.p[0]),r(l.p[1])]}));dbg.labels=labels.map(l=>l.t+'>'+l.n);dbg.words=readLabels.log.slice(0,40);dbg.tLab=Math.round(performance.now()-t0);}catch(e){dbg.labErr=String(e);}}
 tm('end');return{walls,labels,canvas:c,w:Math.round(W/ppm*100)/100,guess:sc.src!=='user'&&sc.src!=='dims',mode:'plan',conf,scaleSrc:sc.src,dbg};}
function bbox(S){return[Math.min(...S.map(s=>s.hz?s.a:s.c)),Math.min(...S.map(s=>s.hz?s.c:s.a)),Math.max(...S.map(s=>s.hz?s.b:s.c)),Math.max(...S.map(s=>s.hz?s.c:s.b))];}
function sideCoverage(S,bb){const cov=(hz,c,lo,hi)=>S.filter(s=>s.hz===hz&&Math.abs(s.c-c)<2*s.t+3).reduce((a,s)=>a+Math.max(0,Math.min(s.b,hi)-Math.max(s.a,lo)),0)/Math.max(1,hi-lo);
 const v=[cov(1,bb[1],bb[0],bb[2]),cov(1,bb[3],bb[0],bb[2]),cov(0,bb[0],bb[1],bb[3]),cov(0,bb[2],bb[1],bb[3])];return{v:v.map(x=>+x.toFixed(2)),n:v.filter(x=>x>.45).length};}
// keep segments connected (by touching / near) to the largest wall network
function focus(S){const n=S.length,par=S.map((_,i)=>i),f=i=>par[i]===i?i:(par[i]=f(par[i]));
 const near=(A,B)=>{const ax0=A.hz?A.a:A.c-A.t,ax1=A.hz?A.b:A.c+A.t,ay0=A.hz?A.c-A.t:A.a,ay1=A.hz?A.c+A.t:A.b,bx0=B.hz?B.a:B.c-B.t,bx1=B.hz?B.b:B.c+B.t,by0=B.hz?B.c-B.t:B.a,by1=B.hz?B.c+B.t:B.b,m=Math.max(A.t,B.t)*1.5+4;if(A.hz===B.hz&&Math.abs(A.c-B.c)<Math.max(A.t,B.t)&&Math.max(A.a,B.a)-Math.min(A.b,B.b)<Math.max(A.t,B.t)*9)return true;return ax0<bx1+m&&bx0<ax1+m&&ay0<by1+m&&by0<ay1+m;};
 // prem8: wall ends facing each other across a door-sized gap belong together (thick walls with wide door gaps)
 const eb=bbox(S),ext=Math.max(eb[2]-eb[0],eb[3]-eb[1]),m2=.12*ext,ends=A=>A.hz?[[A.a,A.c],[A.b,A.c]]:[[A.c,A.a],[A.c,A.b]];
 const nearE=(A,B)=>A.t>=.6*B.t&&B.t>=.6*A.t&&ends(A).some(p=>ends(B).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<Math.max(m2,7*Math.max(A.t,B.t))));
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(near(S[i],S[j])||(focus.nearE&&nearE(S[i],S[j])))par[f(i)]=f(j);
 const L={};S.forEach((s,i)=>{L[f(i)]=(L[f(i)]||0)+(s.b-s.a)*s.t;});const best=+Object.keys(L).sort((a,b)=>L[b]-L[a])[0];
 // also keep colinear wall pieces across door gaps (separate clusters on the same line within 3 m-ish)
 const keep=S.filter((s,i)=>f(i)===best);const kb=bbox(keep);
 return S.filter((s,i)=>f(i)===best||(s.hz?(s.c>=kb[1]-s.t&&s.c<=kb[3]+s.t&&s.a>=kb[0]-s.t&&s.b<=kb[2]+s.t):(s.c>=kb[0]-s.t&&s.c<=kb[2]+s.t&&s.a>=kb[1]-s.t&&s.b<=kb[3]+s.t)));}
// prem8: a door placed right at a corner leaves an L-gap (wall end near the perpendicular wall's end): extend the wall to
// the corner so the room closes; the empty stretch is then found as an opening
function closeCorners(S){const out=S.map(q=>({...q}));for(const A of out)for(const B of out){if(A.hz===B.hz||!A.hz)continue;const t=Math.max(A.t,B.t);
  for(const[endB,yb]of[['a',B.a],['b',B.b]]){if(Math.abs(yb-A.c)>1.2*t)continue;// B (vertical) ends at A's line
   const gL=A.a-B.c,gR=B.c-A.b;if(gL>1.5*t&&gL<7*t){if(!out.some(C=>C!==A&&C!==B&&!C.hz&&C.c>B.c&&C.c<A.a&&C.a<A.c&&C.b>A.c))A.a=B.c;}
   else if(gR>1.5*t&&gR<7*t){if(!out.some(C=>C!==A&&C!==B&&!C.hz&&C.c<B.c&&C.c>A.b&&C.a<A.c&&C.b>A.c))A.b=B.c;}}
  for(const[endA,xa]of[['a',A.a],['b',A.b]]){if(Math.abs(xa-B.c)>1.2*t)continue;const gT=B.a-A.c,gB=A.c-B.b;if(gT>1.5*t&&gT<7*t)B.a=A.c;else if(gB>1.5*t&&gB<7*t)B.b=A.c;}}
 return out;}
// prem8: a segment touching nothing and lying outside the bbox of all the others is a dimension line / text stroke, not a wall
function pruneLoose(S){let ch=1;while(ch&&S.length>4){ch=0;for(const s of S){const R=S.filter(q=>q!==s),m=s.t+8;
  const box=q=>q.hz?[q.a-q.t/2,q.c-q.t/2,q.b+q.t/2,q.c+q.t/2]:[q.c-q.t/2,q.a-q.t/2,q.c+q.t/2,q.b+q.t/2];const A=box(s);
  const touch=R.some(q=>{const B=box(q);return A[0]<B[2]+m&&B[0]<A[2]+m&&A[1]<B[3]+m&&B[1]<A[3]+m;});if(touch)continue;
  const bb=bbox(R),out=s.hz?(s.c<bb[1]-s.t||s.c>bb[3]+s.t):(s.c<bb[0]-s.t||s.c>bb[2]+s.t);if(out){S=R;ch=1;break;}}}return S;}

// ---------- room labels (printed words, letter templates + fuzzy dictionary; SK/CZ/DE/EN incl. abbreviations) ----------
let LTPL=null;const LCH='ABCDEFGHIJKLMNOPRSTUVWZYabcdefghijklmnoprstuvwzy';
function letterTemplates(){if(LTPL)return LTPL;LTPL=[];const fams=['Arial','DejaVu Sans','Liberation Sans','Roboto','Verdana','Arial Narrow','sans-serif'];const c=mk(80,80),x=c.getContext('2d');
 for(const f of fams)for(const wt of['normal','bold'])for(const ch of LCH){x.setTransform(1,0,0,1,0,0);x.fillStyle='#fff';x.fillRect(0,0,80,80);x.fillStyle='#000';x.font=`${wt} 52px ${f}`;x.textBaseline='alphabetic';x.fillText(ch,8,62);
  const d=x.getImageData(0,0,80,80).data,m=new Uint8Array(6400);for(let i=0;i<6400;i++)m[i]=d[i*4]<128?1:0;let x0=80,y0=80,x1=-1,y1=-1;for(let y=0;y<80;y++)for(let xx=0;xx<80;xx++)if(m[y*80+xx]){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)continue;LTPL.push({ch,g:grid(m,80,x0,y0,x1+1,y1+1),asp:(x1-x0+1)/(y1-y0+1),top:y0,bot:y1});}
 return LTPL;}
const LDICT=[['OBYVACKA','Obývačka'],['OBYVACIA','Obývačka'],['OBYVAK','Obývačka'],['OBYV','Obývačka'],['OB','Obývačka'],['KUCHYNA','Kuchyňa'],['KUCHYNKA','Kuchyňa'],['KUCH','Kuchyňa'],['JEDALEN','Jedáleň'],['SPALNA','Spálňa'],['SP','Spálňa'],['DETSKA','Detská izba'],['DI','Detská izba'],['IZBA','Izba'],['PRACOVNA','Pracovňa'],
 ['KUPELNA','Kúpeľňa'],['KUP','Kúpeľňa'],['WC','WC'],['CHODBA','Chodba'],['ZADVERIE','Predsieň'],['ZAD','Predsieň'],['PREDSIEN','Predsieň'],['VSTUP','Predsieň'],['SPAJZA','Špajza'],['SPAJZ','Špajza'],['KOMORA','Komora'],['SATNIK','Šatník'],['TECHNICKA','Technická miestnosť'],['TECH','Technická miestnosť'],['KOTOLNA','Technická miestnosť'],['GARAZ','Garáž'],['TERASA','Terasa'],
 ['WOHNZIMMER','Obývačka'],['WOHNEN','Obývačka'],['KUCHE','Kuchyňa'],['KOCHEN','Kuchyňa'],['SCHLAFZIMMER','Spálňa'],['SCHLAFEN','Spálňa'],['ELTERN','Spálňa'],['KINDERZIMMER','Detská izba'],['KIND','Detská izba'],['ZIMMER','Izba'],['BAD','Kúpeľňa'],['DUSCHE','Kúpeľňa'],['FLUR','Chodba'],['DIELE','Chodba'],['ABSTELLRAUM','Komora'],['ESSEN','Jedáleň'],
 ['LIVING','Obývačka'],['LOUNGE','Obývačka'],['KITCHEN','Kuchyňa'],['BEDROOM','Spálňa'],['BATHROOM','Kúpeľňa'],['BATH','Kúpeľňa'],['HALL','Chodba'],['HALLWAY','Chodba'],['LANDING','Chodba'],['CORRIDOR','Chodba'],['DINING','Jedáleň'],['STUDY','Pracovňa'],['OFFICE','Pracovňa'],['STORAGE','Komora'],['PANTRY','Špajza'],['TOILET','WC'],['GARAGE','Garáž']];
function lev(a,b){const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];}for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length];}
function matchWord(t){const u=t.toUpperCase().replace(/[^A-Z]/g,'');if(u.length<2)return null;let best=null;
 for(const[k,n]of LDICT){let sc;if(k.length<=3){if(u!==k)continue;sc=1;}else{const L=Math.max(k.length,u.length);sc=1-lev(u,k)/L;if(u.length>k.length+1&&u.startsWith(k.slice(0,4)))sc=Math.max(sc,.8);}const thr=(k.length>=5&&u.length>=4&&u[0]===k[0])?.6:.72;if(sc>=thr&&(!best||sc>best.s))best={n,s:sc,k};}return best;}
export function readLabels(ink,W,H,bb,ppm){const out=[];const T=letterTemplates();const lab=new Int32Array(W*H),st=[];let id=0;const comps=[];
 const hMin=Math.max(5,.08*ppm),hMax=Math.max(12,.7*ppm);
 for(let y=Math.max(0,Math.floor(bb[1]));y<Math.min(H,Math.ceil(bb[3]));y++)for(let x=Math.max(0,Math.floor(bb[0]));x<Math.min(W,Math.ceil(bb[2]));x++){const i=y*W+x;if(!ink[i]||lab[i])continue;id++;st.push(i);lab[i]=id;let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;
  while(st.length){const j=st.pop();n++;const X=j%W,Y=(j/W)|0;if(X<x0)x0=X;if(X>x1)x1=X;if(Y<y0)y0=Y;if(Y>y1)y1=Y;if(n>4000)continue;for(const k of[j-1,j+1,j-W,j+W])if(k>=0&&k<W*H&&ink[k]&&!lab[k]){lab[k]=id;st.push(k);}}
  const w=x1-x0+1,h=y1-y0+1;if(n>4000||h>hMax||w>hMax*1.6)continue;comps.push({x0,y0,x1:x1+1,y1:y1+1,n,h,w});}
 const big=comps.filter(c=>c.h>=hMin);big.sort((a,b)=>a.x0-b.x0);const used=new Set();
 for(const c of big){if(used.has(c))continue;const g=[c];used.add(c);let last=c,hM=c.h;
  for(const d of big){if(used.has(d)||d.x0<last.x0)continue;const ov=Math.min(last.y1,d.y1)-Math.max(last.y0,d.y0),gap=d.x0-last.x1;if(ov>.35*Math.min(hM,d.h)&&gap>-2&&gap<.42*hM&&d.h<2.2*hM&&d.h>.3*hM){g.push(d);used.add(d);last=d;hM=Math.max(hM,d.h);}}
  if(g.length<2||g.length>14)continue;const yb=Math.max(...g.map(q=>q.y1)),Hh=hM;let txt='';
  for(const q of g){if(q.h<.45*Hh){continue;}const gr=grid(ink,W,q.x0,q.y0,q.x1,q.y1),asp=q.w/q.h,rel=(yb-q.y0)/Hh;let bc=null,bs=-1;
   for(const t of T){let d=0;for(let i=0;i<gr.length;i++)d+=Math.abs(gr[i]-t.g[i]);const s2=1-d/gr.length-Math.abs(Math.log((asp+.05)/(t.asp+.05)))*.12;if(s2>bs){bs=s2;bc=t.ch;}}
   txt+=bs>.55?bc:'?';}
  (readLabels.log=readLabels.log||[]).push(txt+'/'+Math.round(Hh));const m=matchWord(txt);if(m)out.push({n:m.n,s:+m.s.toFixed(2),t:txt,p:[(g[0].x0+last.x1)/2,(Math.min(...g.map(q=>q.y0))+yb)/2]});}
 return out;}
// ---------- dimension OCR (printed digits, template matching; no deps) ----------
const GW=12,GH=18;let TPL=null;
function templates(){if(TPL)return TPL;TPL=[];const fams=['Arial','Arial Narrow','Helvetica','DejaVu Sans','Liberation Sans','Liberation Sans Narrow','Verdana','Roboto','Roboto Condensed','Times New Roman','Liberation Serif','Courier New','ISOCPEUR','sans-serif','serif','monospace'];
 const c=mk(80,80),x=c.getContext('2d');
 for(const f of fams)for(const wt of['300','normal','bold'])for(const sx of[1,.72])for(const ch of'0123456789'){x.setTransform(1,0,0,1,0,0);x.fillStyle='#fff';x.fillRect(0,0,80,80);x.fillStyle='#000';x.font=`${wt} 56px ${f}`;x.textBaseline='alphabetic';x.setTransform(sx,0,0,1,10,0);x.fillText(ch,0,64);x.setTransform(1,0,0,1,0,0);
  const d=x.getImageData(0,0,80,80).data,m=new Uint8Array(6400);for(let i=0;i<6400;i++)m[i]=d[i*4]<128?1:0;let x0=80,y0=80,x1=-1,y1=-1;for(let y=0;y<80;y++)for(let xx=0;xx<80;xx++)if(m[y*80+xx]){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)continue;TPL.push({ch,g:grid(m,80,x0,y0,x1+1,y1+1),asp:(x1-x0+1)/(y1-y0+1)});}
 return TPL;}
function grid(m,W,x0,y0,x1,y1,rot){const g=new Float32Array(GW*GH),w=x1-x0,h=y1-y0;
 for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++){let s=0,n=0;const sx0=x0+gx*w/GW,sx1=x0+(gx+1)*w/GW,sy0=y0+gy*h/GH,sy1=y0+(gy+1)*h/GH;
  for(let y=Math.floor(sy0);y<Math.max(Math.floor(sy0)+1,Math.ceil(sy1));y++)for(let x=Math.floor(sx0);x<Math.max(Math.floor(sx0)+1,Math.ceil(sx1));x++){s+=m[y*W+x];n++;}g[gy*GW+gx]=n?s/n:0;}
 return g;}
function rotGrid(m,W,b,dir){// crop b rotated by dir (1 = text reads bottom->top, rotate crop clockwise to upright)
 const w=b.x1-b.x0,h=b.y1-b.y0,o=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=m[(b.y0+y)*W+b.x0+x];// new image is h wide, w tall
   const nx=dir>0?(h-1-y):y,ny=dir>0?x:(w-1-x);o[ny*h+nx]=v;}
 return{m:o,W:h,H:w};}
function ocrChar(m,W,x0,y0,x1,y1){const T=templates(),g=grid(m,W,x0,y0,x1,y1),asp=(x1-x0)/Math.max(1,y1-y0);let best=null,bs=-1;
 for(const t of T){let d=0;for(let i=0;i<g.length;i++)d+=Math.abs(g[i]-t.g[i]);const s=1-d/g.length-Math.abs(Math.log((asp+.05)/(t.asp+.05)))*.12;if(s>bs){bs=s;best=t.ch;}}
 return{ch:best,s:bs};}
function readString(chars,m,W,rot){// chars: comps (in page coords) ordered along reading direction
 {const L=chars[chars.length-1],w=rot?L.y1-L.y0:L.x1-L.x0,h=rot?L.x1-L.x0:L.y1-L.y0;if(chars.length>2&&w>1.05*h)chars=chars.slice(0,-1);}// unit "m"
 const hs=chars.map(c=>rot?c.x1-c.x0:c.y1-c.y0),H=Math.max(...hs);let txt='',sc=0,n=0;
 for(const c of chars){const ch=rot?c.x1-c.x0:c.y1-c.y0;if(ch<.5*H){txt+=',';continue;}
  let r;if(rot){const R=rotGrid(m,W,c,rot);r=ocrChar(R.m,R.W,0,0,R.W,R.H);}else r=ocrChar(m,W,c.x0,c.y0,c.x1,c.y1);txt+=r.ch;sc+=r.s;n++;}
 return{txt,s:n?sc/n:0};}
function parseDim(txt){const t=txt.replace(/^,+|,+$/g,'');if(!/^\d+(,\d+)?$/.test(t))return[];const v=parseFloat(t.replace(',','.'));if(!isFinite(v)||v<=0)return[];
 if(t.includes(','))return[v];// metres "15,00"
 return[v/100,v/1000,v];}// "1500" cm, "15000" mm, "15" m
export function dimScale(ink,W,H,bb,tWall,prior){const out=[];const pad=Math.max(6,tWall);
 const comps=[];const lab=new Int32Array(W*H),st=[];let id=0;
 for(let i=0;i<W*H;i++){if(!ink[i]||lab[i])continue;id++;st.push(i);lab[i]=id;let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;while(st.length){const j=st.pop();n++;const x=j%W,y=(j/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(x>0&&ink[j-1]&&!lab[j-1]){lab[j-1]=id;st.push(j-1);}if(x<W-1&&ink[j+1]&&!lab[j+1]){lab[j+1]=id;st.push(j+1);}if(y>0&&ink[j-W]&&!lab[j-W]){lab[j-W]=id;st.push(j-W);}if(y<H-1&&ink[j+W]&&!lab[j+W]){lab[j+W]=id;st.push(j+W);}}
  const w=x1-x0+1,h=y1-y0+1;if(Math.max(w,h)>.06*Math.max(W,H)||Math.max(w,h)<4)continue;
  comps.push({x0,y0,x1:x1+1,y1:y1+1,n});}
 // group into strings: horizontal (side zones above/below) and vertical (left/right)
 const strings=[];
 for(const rot of[0,1]){const used=new Set();const cs=comps;
  const key=c=>rot?c.y0:c.x0;cs.sort((a,b)=>key(a)-key(b));
  for(const c of cs){if(used.has(c))continue;const g=[c];used.add(c);let last=c,hM=rot?c.x1-c.x0:c.y1-c.y0;
   for(const d of cs){if(used.has(d))continue;const hL=hM;
    const ov=rot?Math.min(last.x1,d.x1)-Math.max(last.x0,d.x0):Math.min(last.y1,d.y1)-Math.max(last.y0,d.y0);const gap=rot?d.y0-last.y1:d.x0-last.x1;
    if(ov>-.1*hL&&gap>-2&&gap<hL*.9){g.push(d);used.add(d);last=d;hM=Math.max(hM,rot?d.x1-d.x0:d.y1-d.y0);}}
   if(g.length>=2&&g.length<=8)strings.push({rot,g});}}
 for(const S of strings){const ord=S.rot?[...S.g].sort((a,b)=>b.y0-a.y0):S.g;// vertical text reads bottom->top
  let best=null;for(const dir of S.rot?[1,-1]:[0]){const chars=S.rot?(dir>0?ord:[...ord].reverse()):ord;const r=readString(chars,ink,W,dir);if(!best||r.s>best.s)best={...r,dir};}
  dimScale.log&&dimScale.log.push(best.txt+':'+best.s.toFixed(2));if(best.s<.78)continue;const vals=parseDim(best.txt);if(!vals.length)continue;
  // dimension line next to the text, then the nearest perpendicular marks (ticks / extension lines) on each side
  const x0=Math.min(...S.g.map(c=>c.x0)),x1=Math.max(...S.g.map(c=>c.x1)),y0=Math.min(...S.g.map(c=>c.y0)),y1=Math.max(...S.g.map(c=>c.y1)),th=S.rot?x1-x0:y1-y0;
  // work in (u along line, v across) coordinates
  const I=S.rot?(u,v)=>(u>=0&&u<H&&v>=0&&v<W)?ink[u*W+v]:0:(u,v)=>(u>=0&&u<W&&v>=0&&v<H)?ink[v*W+u]:0;
  const uc=Math.round(S.rot?(y0+y1)/2:(x0+x1)/2),tu0=S.rot?y0:x0,tu1=S.rot?y1:x1,tv0=S.rot?x0:y0,tv1=S.rot?x1:y1;
  let seg=0,lineV=-1;
  for(let k=1;k<=Math.round(th*1.3)&&!seg;k++)for(const v of[tv1+k,tv0-k]){if(seg)break;
   if(!(I(uc,v)||I(uc-2,v)||I(uc+2,v)))continue;// line must pass under/over the text
   const on=u=>I(u,v)||I(u,v-1)||I(u,v+1);const side=v>tv1?1:-1;// text side
   const mark=u=>{let a=0,b=0;for(let d=3;d<=6;d++){a+=I(u,v+d*side*-1)?1:0;if(u<tu0-1||u>tu1+1)b+=I(u,v+d*side)?1:0;}return a>=2||b>=2;};
   const G=Math.max(3,Math.round(th*1.5));const walk=dir=>{let u=uc,g=0;for(let n=0;n<4000;n++){u+=dir;if(on(u)){g=0;if((dir<0?u<tu0-1:u>tu1+1)&&mark(u)){let e=u;for(let q=u+dir,gq=0;Math.abs(q-u)<16&&gq<=3;q+=dir){if(mark(q)){e=q;gq=0;}else gq++;}return (u+e)/2;}}else if(++g>G)return u-dir*g;}return null;};
   const a=walk(-1),b=walk(1);if(a!=null&&b!=null&&b-a>(tu1-tu0)*1.1){seg=b-a;lineV=v;}}
  if(!seg)continue;
  out.push({txt:best.txt,s:+best.s.toFixed(2),ext:seg,vals,rot:S.rot});}
 if(!out.length)return null;
 // every reading votes for ppm under each unit interpretation; keep the value most strings agree on
 const bw=Math.max(bb[2]-bb[0],bb[3]-bb[1]);const cand=[];out.forEach((o,k)=>o.vals.forEach(v=>{const p=o.ext/v;const m=bw/p,t=tWall/p;if(m>=3&&m<=60&&t>=.05&&t<=.8)cand.push({p,k});}));
 let best=null;for(const c of cand){const sup=new Set(cand.filter(d=>Math.abs(d.p/c.p-1)<.035).map(d=>d.k));const ps=cand.filter(d=>Math.abs(d.p/c.p-1)<.035).map(d=>d.p);const sc=sup.size;if(!best||sc>best.cons)best={ppm:median(ps),cons:sc};}
 if(best&&best.cons<2&&!(prior&&Math.abs(best.ppm/prior-1)<.3))best=null;
 return best?{ppm:best.ppm,n:best.cons,dims:out.map(o=>o.txt+'@'+o.ext+'/'+o.s)}:null;}
