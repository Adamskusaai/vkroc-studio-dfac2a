// plan image -> walls (plain JS, no AI)
// detectWalls(img,{sens,mW,rect,site,aiPass}) -> {walls,canvas,w,guess,mode,needTrace?}
// AI_HOOK: pass o.aiPass = (img, classicResult) => result|null for a future optional AI fallback.
export function detectWalls(img,o={}){const sens=o.sens??.5;
 const c0=toCanvas(img,1400);if(o.site){const S=site(c0);return finish(S,img,o);}
 let paper=cropPaper(c0);paper=flatten(paper);paper=autoInvert(paper);
 const pipes=[];
 if(o.rect) pipes.push(paper);
 else{
  pipes.push(paper);
  try{pipes.push(deskew(paper));}catch(e){}
  try{const d=deskew(paper);pipes.push(rectify(d));}catch(e){}
 }
 // unique by size fingerprint
 const seen=new Set(),uniq=[];for(const c of pipes){const k=c.width+'x'+c.height;if(seen.has(k)&&uniq.length)continue;seen.add(k);uniq.push(c);}
 let best=null;
 for(const c of uniq){
  const W=c.width,H=c.height,g=gray(c);
  let m=binar(g,W,H,sens);m=dropSmall(m,W,H,.02*Math.max(W,H));
  const lw=Math.max(1,lineW(m,W,H)),f=2.2-1.4*sens;
  const ks=[...new Set([Math.round(lw*f)+1,Math.round(lw*1.2)+1,Math.round(lw*.8),Math.max(3,lw),3].map(k=>Math.max(3,k)))].sort((a,b)=>b-a);
  const cands=ks.map(k=>({k,s:clean(segs(open(m,W,H,k),W,H,k),W,H)}));
  cands.push({k:2,line:1,s:clean(pairUp(segs(dil(m,W,H,3),W,H,2),W,H),W,H)});
  // also a slightly more aggressive thin-line pass (listing screenshots / CAD)
  cands.push({k:2,line:1,s:clean(pairUp(segs(dil(m,W,H,2),W,H,1),W,H),W,H)});
  for(const q of cands){
   q.s=focusSegs(q.s,W,H);
   q.sc=scorePlan(q.s,W,H);
   q.L=q.s.reduce((a,s)=>a+s.b-s.a,0);
   if(q.sc>0){
    const R=toMetres(q.s,W,H,o.mW,!!q.line,c);R.mode='plan';R._sc=q.sc;R._n=q.s.length;
    if(!best||R._sc>best._sc||(R._sc===best._sc&&R._n<best._n)) best=R;
   }
  }
 }
 // site footprint as alternative (plot drawings)
 const S=site(c0);if(S&&S.walls&&S.walls.length){S._sc=S.hip?12:6;S._n=S.walls.length;
  // prefer site when plan looks like plot junk (many outer-boundary walls, few interiors) or plan missing
  if(!best||best._sc<6||siteBeatsPlan(best,S,c0)) best=S;
 }
 if(looksLikeUI(c0)) best=null;
 else if(best&&best.mode==='plan'&&!looksLikeDrawing(best.canvas||paper)) best=null;
 else if(best&&best.mode==='site'&&best._sc<10&&!looksLikeDrawing(c0)) best=null; // non-hip site needs to look like a drawing
 if(!best||best._sc<3||!(best.walls&&best.walls.length)){
  const none={walls:[],canvas:paper,w:o.w||15,mode:'none',guess:true,needTrace:1};
  return finish(none,img,o);
 }
 // final sanity: drop absurd wall counts
 if(best.mode==='plan'&&best.walls.length>48){
  const focused=focusWalls(best.walls);
  if(focused.length>=3&&focused.length<best.walls.length){best.walls=focused;best._n=focused.length;}
  if(best.walls.length>48){const none={walls:[],canvas:best.canvas||paper,w:best.w||15,mode:'none',guess:true,needTrace:1};return finish(none,img,o);}
 }
 return finish(best,img,o);}
function finish(R,img,o){delete R._sc;delete R._n;
 // AI_HOOK — classic CV only for now; optional future pass may replace a failed/junk result.
 if(typeof o.aiPass==='function'){try{const A=o.aiPass(img,R);if(A&&A.walls&&A.walls.length)return A;}catch(e){}}
 return R;}
function siteBeatsPlan(P,S,c){if(!P||P.mode!=='plan')return true;if(P.walls.length>24)return true;
 // if plan bbox is almost the full image and site found a smaller house, prefer site
 const xs=P.walls.flatMap(w=>[w.start[0],w.end[0]]),zs=P.walls.flatMap(w=>[w.start[1],w.end[1]]);
 const pw=Math.max(...xs)-Math.min(...xs),ph=Math.max(...zs)-Math.min(...zs);
 const sx=S.walls.flatMap(w=>[w.start[0],w.end[0]]),sz=S.walls.flatMap(w=>[w.start[1],w.end[1]]);
 const sw=Math.max(...sx)-Math.min(...sx),sh=Math.max(...sz)-Math.min(...sz);
 return sw*sh>0&&sw*sh<.55*pw*ph&&P.walls.length>=8;}
// 0 = reject, higher = better plan-like segment set
function scorePlan(ss,W,H){if(!ss||ss.length<3||ss.length>55)return 0;
 const x0=Math.min(...ss.map(s=>s.hz?s.a:s.c)),x1=Math.max(...ss.map(s=>s.hz?s.b:s.c)),y0=Math.min(...ss.map(s=>s.hz?s.c:s.a)),y1=Math.max(...ss.map(s=>s.hz?s.c:s.b));
 const bw=x1-x0,bh=y1-y0;if(bw<.08*W||bh<.08*H)return 0;
 const cov=(hz,c,lo,hi)=>{const L=hi-lo||1;return ss.filter(s=>s.hz===hz&&Math.abs(s.c-c)<2*s.t+3).reduce((a,s)=>a+Math.max(0,Math.min(s.b,hi)-Math.max(s.a,lo)),0)/L;};
 const sides=[cov(1,y0,x0,x1),cov(1,y1,x0,x1),cov(0,x0,y0,y1),cov(0,x1,y0,y1)];
 const sideN=sides.filter(v=>v>.4).length,sideAvg=sides.reduce((a,b)=>a+b)/4;
 if(sideN<2||sideAvg<.35)return 0;
 const tm=ss.map(s=>s.t).sort((a,b)=>a-b)[ss.length>>1];if(tm>.08*Math.max(bw,bh))return 0; // blobs
 // reject street/grid: many full-span lines away from bbox edge
 const full=ss.filter(s=>(s.b-s.a)>.85*(s.hz?bw:bh)&&Math.min(Math.abs(s.c-(s.hz?y0:x0)),Math.abs(s.c-(s.hz?y1:x1)))>5*s.t).length;
 if(full>=4)return 0;
 const long=ss.filter(s=>(s.b-s.a)>.2*Math.max(bw,bh)).length;
 const short=ss.length-long;if(short>long*3+8)return 0; // furniture/text crumbs
 let sc=sideN*1.5+sideAvg*3+Math.min(16,long)*.4-Math.max(0,ss.length-28)*.12;
 if(ss.length>=6&&ss.length<=30)sc+=2;
 if(sideN>=3)sc+=1.2;
 // reward presence of interior partitions (not only outer box)
 const interior=ss.filter(s=>{const c=s.c;return s.hz?Math.abs(c-y0)>3*s.t&&Math.abs(c-y1)>3*s.t:Math.abs(c-x0)>3*s.t&&Math.abs(c-x1)>3*s.t;}).length;
 if(interior>=2)sc+=1.5;if(interior>=4)sc+=1;
 return sc;}
function planLike(ss,W,H){return scorePlan(ss,W,H)>=3;}
// keep segments near the densest wall cluster (drops plot boundary / distant junk)
function focusSegs(ss,W,H){if(ss.length<18)return ss;
 const Dm=Math.max(W,H),G=6,cell=new Array(G*G).fill(0);
 for(const s of ss){const x=s.hz?(s.a+s.b)/2:s.c,y=s.hz?s.c:(s.a+s.b)/2;const gx=Math.min(G-1,Math.max(0,(x/W*G)|0)),gy=Math.min(G-1,Math.max(0,(y/H*G)|0));cell[gy*G+gx]+=s.b-s.a;}
 let bi=0;for(let i=1;i<cell.length;i++)if(cell[i]>cell[bi])bi=i;
 const bx=(bi%G+.5)*W/G,by=(((bi/G)|0)+.5)*H/G;
 const dists=ss.map(s=>{const x=s.hz?(s.a+s.b)/2:s.c,y=s.hz?s.c:(s.a+s.b)/2;return{s,d:Math.hypot(x-bx,y-by)};}).sort((a,b)=>a.d-b.d);
 let tot=ss.reduce((a,s)=>a+s.b-s.a,0),acc=0,R=0.4*Dm,kept=0;
 for(const q of dists){acc+=q.s.b-q.s.a;kept++;R=Math.max(R,q.d);if(acc>.9*tot&&kept>=Math.min(ss.length,8))break;}
 R=Math.min(R+.05*Dm,.7*Dm);
 const out=ss.filter(s=>{const x=s.hz?(s.a+s.b)/2:s.c,y=s.hz?s.c:(s.a+s.b)/2;return Math.hypot(x-bx,y-by)<=R;});
 return out.length>=4?out:ss;}
function focusWalls(ws){if(ws.length<5)return ws;
 const mid=w=>[(w.start[0]+w.end[0])/2,(w.start[1]+w.end[1])/2];
 const cx=ws.reduce((a,w)=>a+mid(w)[0],0)/ws.length,cz=ws.reduce((a,w)=>a+mid(w)[1],0)/ws.length;
 const ds=ws.map(w=>({w,d:Math.hypot(mid(w)[0]-cx,mid(w)[1]-cz)})).sort((a,b)=>a.d-b.d);
 const keep=Math.max(4,Math.min(ws.length,Math.ceil(ws.length*.7)));
 const R=ds[keep-1].d*1.15+.5;return ws.filter(w=>Math.hypot(mid(w)[0]-cx,mid(w)[1]-cz)<=R);}
// crop to bright paper / drawing region (phone photos on dark desk)
function looksLikeDrawing(c){if(!c)return false;const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data;let wh=0,dk=0,sat=0,n=0;
 for(let y=0;y<H;y+=3)for(let x=0;x<W;x+=3){const i=(y*W+x)*4,r=d[i],g=d[i+1],b=d[i+2],l=r*.3+g*.59+b*.11,mx=Math.max(r,g,b),mn=Math.min(r,g,b);n++;
  if(l>200)wh++;else if(l<160){dk++;if(mx-mn>45)sat++;}}
 if(!n)return false;return wh/n>.28&&dk/n>.01&&dk/n<.45&&(dk?sat/dk:.0)<.35;}
function looksLikeUI(c){if(!c)return false;const W=c.width,H=c.height;
 // Full phone-UI screenshots are very tall; real plans rarely exceed ~1.7 after paper crop.
 if(H>W*1.85)return true;
 if(H<W*1.45)return false;
 const d=c.getContext('2d').getImageData(0,0,W,Math.max(8,(H*.12)|0)).data;let sat=0,n=0;
 for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);n++;if(mx-mn>40)sat++;}
 return n&&sat/n>.15;}
function autoInvert(c){const W=c.width,H=c.height,g=gray(c);let dark=0;for(let i=0;i<g.length;i+=7)if(g[i]<128)dark++;
 if(dark/(g.length/7)<.55)return c; // already light paper
 const d=c.getContext('2d').getImageData(0,0,W,H),p=d.data;for(let i=0;i<p.length;i+=4){p[i]=255-p[i];p[i+1]=255-p[i+1];p[i+2]=255-p[i+2];}
 c.getContext('2d').putImageData(d,0,0);return c;}
function cropPaper(c){const W=c.width,H=c.height,g=gray(c);let sx=0,sy=0,ex=W-1,ey=H-1;
 // bright mask
 const th=Math.max(otsu(g),170),m=new Uint8Array(W*H);for(let i=0;i<W*H;i++)m[i]=g[i]>=th-15?1:0;
 const{cs}=comps(m,W,H);if(!cs.length)return c;
 let best=null;for(const q of cs){const bw=q.x1-q.x0+1,bh=q.y1-q.y0+1,ar=bw*bh;if(ar<.15*W*H)continue;if(q.n<.45*ar)continue; // solid-ish bright
  if(!best||ar>best.ar)best={...q,ar};}
 if(!best)return c;const pad=Math.round(.02*Math.max(W,H));
 sx=Math.max(0,best.x0-pad);sy=Math.max(0,best.y0-pad);ex=Math.min(W-1,best.x1+pad);ey=Math.min(H-1,best.y1+pad);
 if((ex-sx)<.35*W||(ey-sy)<.35*H)return c;
 if((ex-sx)>W*.97&&(ey-sy)>H*.97)return c;
 const o=document.createElement('canvas');o.width=ex-sx+1;o.height=ey-sy+1;o.getContext('2d').drawImage(c,-sx,-sy);return o;}
// flatten uneven illumination (phone shadows)
function flatten(c){const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H),p=d.data;
 // downsample mean luminance
 const S=32,sw=S,sh=S,sm=new Float32Array(sw*sh);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,l=p[i]*.3+p[i+1]*.59+p[i+2]*.11;sm[((y*sh/H)|0)*sw+((x*sw/W)|0)]+=l;}
 const cnt=new Float32Array(sw*sh);for(let y=0;y<H;y++)for(let x=0;x<W;x++)cnt[((y*sh/H)|0)*sw+((x*sw/W)|0)]++;
 for(let i=0;i<sm.length;i++)sm[i]=cnt[i]?sm[i]/cnt[i]:200;
 // bilinear sample background and divide
 const sample=(x,y)=>{const gx=x*(sw-1)/(W-1),gy=y*(sh-1)/(H-1),x0=gx|0,y0=gy|0,x1=Math.min(sw-1,x0+1),y1=Math.min(sh-1,y0+1),fx=gx-x0,fy=gy-y0;
  return sm[y0*sw+x0]*(1-fx)*(1-fy)+sm[y0*sw+x1]*fx*(1-fy)+sm[y1*sw+x0]*(1-fx)*fy+sm[y1*sw+x1]*fx*fy;};
 let mean=0;for(let i=0;i<sm.length;i++)mean+=sm[i];mean/=sm.length||1;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,bg=sample(x,y)||1,s=mean/bg;for(let k=0;k<3;k++)p[i+k]=Math.max(0,Math.min(255,p[i+k]*s));}
 c.getContext('2d').putImageData(d,0,0);return c;}
// site plan: find building footprint = axis rectangle with hip-roof diagonals from its corners
function site(c){const W=c.width,H=c.height,g=gray(c),m=binar(g,W,H,.5),Dm=Math.max(W,H);
 const ss=segs(dil(m,W,H,3),W,H,2).filter(s=>s.t<.02*Dm),hs=ss.filter(s=>s.hz),vs=ss.filter(s=>!s.hz),tol=.008*Dm+3;
 const on=(x,y)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=Math.round(x)+dx,yy=Math.round(y)+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&m[yy*W+xx])return 1;}return 0;};
 const D=c.getContext('2d').getImageData(0,0,W,H).data,sat=(x0,y0,x1,y1)=>{let n=0,k=0;for(let y=Math.max(0,y0|0);y<Math.min(H,y1);y+=3)for(let x=Math.max(0,x0|0);x<Math.min(W,x1);x+=3){const i=(y*W+x)*4,mx=Math.max(D[i],D[i+1],D[i+2]),mn=Math.min(D[i],D[i+1],D[i+2]);k++;if(mx-mn>35&&mx<250)n++;}return k?n/k:0;};
 const cover=(s,lo,hi)=>Math.max(0,Math.min(s.b+tol,hi)-Math.max(s.a-tol,lo))/(hi-lo);let best=null;
 for(const t of hs)for(const b of hs){const h=b.c-t.c;if(h<.03*Dm||h>.5*H)continue;
  const L=vs.filter(v=>cover(v,t.c,b.c)>.8&&v.c>Math.max(t.a,b.a)-tol&&v.c<Math.min(t.b,b.b)+tol);
  for(const l of L)for(const r of L){const w=r.c-l.c;if(w<.03*Dm||w>.5*W||w/h>4||h/w>4)continue;if(cover(t,l.c,r.c)<.8||cover(b,l.c,r.c)<.8)continue;
   if(l.c<5||t.c<5||r.c>W-5||b.c>H-5)continue;
   const d=Math.min(w,h)*.4;let hit=0;for(const[cx,cy,sx,sy]of[[l.c,t.c,1,1],[r.c,t.c,-1,1],[r.c,b.c,-1,-1],[l.c,b.c,1,-1]])for(let k=3;k<=20;k++)hit+=on(cx+sx*d*k/20,cy+sy*d*k/20);
   const diag=hit/72;if(diag<.55||sat(l.c-.3*w,t.c-.3*h,r.c+.3*w,b.c+.3*h)>.12)continue;const cd=Math.hypot((l.c+r.c)/2-W/2,(t.c+b.c)/2-H/2)/Dm,sc=diag-.3*cd+.05*Math.min(w,h)/Dm;
   if(!best||sc>best.sc)best={sc,x0:l.c,x1:r.c,y0:t.c,y1:b.c,hip:1};}}
 if(!best){
  // fallback: house-sized rectangle with strong edges, low chroma, not a busy map interior
  const ss2=segs(dil(m,W,H,3),W,H,2).filter(s=>s.t<.025*Dm);const hs2=ss2.filter(s=>s.hz),vs2=ss2.filter(s=>!s.hz),tol2=.01*Dm+3;
  const cover2=(s,lo,hi)=>Math.max(0,Math.min(s.b+tol2,hi)-Math.max(s.a-tol2,lo))/(hi-lo||1);
  const inkIn=(x0,y0,x1,y1)=>{let n=0,k=0;for(let y=y0|0;y<y1;y+=4)for(let x=x0|0;x<x1;x+=4){if(x<0||y<0||x>=W||y>=H)continue;k++;if(m[y*W+x])n++;}return k?n/k:1;};
  for(const t of hs2)for(const b of hs2){const h=b.c-t.c;if(h<.06*Dm||h>.45*H)continue;
   const L=vs2.filter(v=>cover2(v,t.c,b.c)>.8&&v.c>Math.max(t.a,b.a)-tol2&&v.c<Math.min(t.b,b.b)+tol2);
   for(const l of L)for(const r of L){const w=r.c-l.c;if(w<.06*Dm||w>.45*W||w/h>3.2||h/w>3.2)continue;
    if(cover2(t,l.c,r.c)<.8||cover2(b,l.c,r.c)<.8)continue;
    if(l.c<4||t.c<4||r.c>W-4||b.c>H-4)continue;
    if(w*h>.4*W*H)continue;
    if(sat(l.c,t.c,r.c,b.c)>.1)continue;
    const inner=inkIn(l.c+w*.15,t.c+h*.15,r.c-w*.15,b.c-h*.15);if(inner>.22)continue; // busy interior = map/hatching
    const sc=.08*Math.min(w,h)/Dm+(inner<.08?.05:0);if(!best||sc>best.sc)best={sc,x0:l.c,x1:r.c,y0:t.c,y1:b.c,hip:0};}}
 }
 if(!best)return{walls:[],canvas:c,w:15,mode:'none',guess:true,needTrace:1};
 const lp=Math.max(best.x1-best.x0,best.y1-best.y0),ppm=lp/12,r=v=>Math.round(v/ppm*100)/100,{x0,x1,y0,y1}=best,T=.3;
 const walls=[[x0,y0,x1,y0],[x1,y0,x1,y1],[x1,y1,x0,y1],[x0,y1,x0,y0]].map(q=>({start:[r(q[0]),r(q[1])],end:[r(q[2]),r(q[3])],thickness:T}));
 return{walls,canvas:c,w:Math.round(W/ppm*100)/100,guess:true,mode:'site',longPx:lp,ppm,hip:!!best.hip};}
function toCanvas(img,M){const S=Math.min(1,M/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*S);c.height=Math.round(img.height*S);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);return c;}
function gray(c){const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data,g=new Uint8Array(W*H);for(let i=0;i<W*H;i++)g[i]=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)|0;return g;}
function otsu(g){const h=new Array(256).fill(0);g.forEach(v=>h[v]++);let s=0,sB=0,wB=0,b=0,t=128;for(let i=0;i<256;i++)s+=i*h[i];for(let i=0;i<256;i++){wB+=h[i];if(!wB)continue;const wF=g.length-wB;if(!wF)break;sB+=i*h[i];const v=wB*wF*(sB/wB-(s-sB)/wF)**2;if(v>b){b=v;t=i;}}return t;}
// adaptive threshold (local mean); OR global Otsu for clean scans
function binar(g,W,H,sens){const I=new Float64Array((W+1)*(H+1));for(let y=0;y<H;y++){let r=0;for(let x=0;x<W;x++){r+=g[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+r;}}
 const R=Math.max(15,Math.round(Math.max(W,H)/30)),C=30-22*sens,m=new Uint8Array(W*H);let ms=[];
 const mean=(x,y)=>{const x0=Math.max(0,x-R),x1=Math.min(W,x+R+1),y0=Math.max(0,y-R),y1=Math.min(H,y+R+1);return(I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0])/((x1-x0)*(y1-y0));};
 for(let y=0;y<H;y+=R)for(let x=0;x<W;x+=R)ms.push(mean(x,y));ms.sort((a,b)=>a-b);const clean=ms[(ms.length*.9)|0]-ms[(ms.length*.5)|0]<10&&ms[(ms.length*.5)|0]>200,th=Math.min(otsu(g),160);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,v=g[i];m[i]=(v<mean(x,y)-C&&v<215)||(clean&&v<=th)?1:0;}return m;}
// connected components: label + drop small (text, symbols)
function comps(m,W,H){const L=new Int32Array(W*H).fill(-1),st=[],cs=[];for(let i=0;i<W*H;i++)if(m[i]&&L[i]<0){const id=cs.length,c={n:0,x0:1e9,y0:1e9,x1:-1,y1:-1};cs.push(c);L[i]=id;st.push(i);
 while(st.length){const p=st.pop(),y=(p/W)|0,x=p-y*W;c.n++;if(x<c.x0)c.x0=x;if(x>c.x1)c.x1=x;if(y<c.y0)c.y0=y;if(y>c.y1)c.y1=y;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const q=yy*W+xx;if(m[q]&&L[q]<0){L[q]=id;st.push(q);}}}}return{L,cs};}
const edge=(c,W,H)=>c.x0<=2||c.y0<=2||c.x1>=W-3||c.y1>=H-3,big=(c,W,H)=>(c.x1-c.x0)>.2*W||(c.y1-c.y0)>.2*H;
function noBorder(cs,W,H){return cs.some(c=>!edge(c,W,H)&&big(c,W,H));}
function dropSmall(m,W,H,minD){const{L,cs}=comps(m,W,H),o=new Uint8Array(W*H),nb=noBorder(cs,W,H);for(let i=0;i<W*H;i++)if(L[i]>=0){const c=cs[L[i]];const bw=c.x1-c.x0+1,bh=c.y1-c.y0+1;if(Math.max(bw,bh)>=minD&&!(nb&&edge(c,W,H))&&!(Math.min(bw,bh)>.04*Math.max(W,H)&&c.n>.5*bw*bh))o[i]=1;}return o;}
// typical stroke width = mode of short perpendicular runs
function lineW(m,W,H){const h=new Array(41).fill(0);for(let y=0;y<H;y+=2){let r=0;for(let x=0;x<=W;x++){if(x<W&&m[y*W+x])r++;else{if(r&&r<=40)h[r]++;r=0;}}}for(let x=0;x<W;x+=2){let r=0;for(let y=0;y<=H;y++){if(y<H&&m[y*W+x])r++;else{if(r&&r<=40)h[r]++;r=0;}}}
 let b=1;for(let i=1;i<=40;i++)if(h[i]>h[b])b=i;return b;}
// Hough on edge pixels: dominant angle (mod 90) -> rotate
function deskew(c){const W=c.width,H=c.height,g=gray(c),th=Math.min(otsu(g),170),pts=[];
 for(let y=1;y<H-1;y+=2)for(let x=1;x<W-1;x+=2){const i=y*W+x;if(g[i]<=th&&(g[i-1]>th||g[i+1]>th||g[i-W]>th||g[i+W]>th))pts.push(x,y);}
 if(pts.length<200)return c;let bA=0,bS=-1;const D=Math.ceil(Math.hypot(W,H));
 for(let a=-44;a<=45;a+=.5){const t=a*Math.PI/180,cs=Math.cos(t),sn=Math.sin(t),A1=new Uint32Array(2*D+2),A2=new Uint32Array(2*D+2);
  for(let k=0;k<pts.length;k+=4){const x=pts[k],y=pts[k+1];A1[(x*cs+y*sn+D)|0]++;A2[(-x*sn+y*cs+D)|0]++;}let s=0;for(let i=0;i<A1.length;i++)s+=A1[i]*A1[i]+A2[i]*A2[i];if(s>bS){bS=s;bA=a;}}
 if(Math.abs(bA)<.4)return c;const t=-bA*Math.PI/180,nW=Math.round(Math.abs(W*Math.cos(t))+Math.abs(H*Math.sin(t))),nH=Math.round(Math.abs(W*Math.sin(t))+Math.abs(H*Math.cos(t))),o=document.createElement('canvas');o.width=nW;o.height=nH;
 const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,nW,nH);x.translate(nW/2,nH/2);x.rotate(t);x.drawImage(c,-W/2,-H/2);return o;}
// crop to main plan component; undo perspective if its outline is a quad
function rectify(c){const W=c.width,H=c.height,g=gray(c);let m=binar(g,W,H,.5);const{L,cs}=comps(m,W,H);if(!cs.length)return c;
 let bi=0,bv=0;const nb=noBorder(cs,W,H);cs.forEach((q,i)=>{if(nb&&edge(q,W,H))return;const v=(q.x1-q.x0)*(q.y1-q.y0)*Math.sqrt(q.n);if(v>bv){bv=v;bi=i;}});const q=cs[bi];if((q.x1-q.x0)<.2*W&&(q.y1-q.y0)<.2*H)return c;
 const P=[[1e9,0,0],[-1e9,0,0],[-1e9,0,0],[1e9,0,0]];// TL(min x+y) TR(max x-y) BR(max x+y) BL(min x-y)
 for(let i=0;i<W*H;i++)if(L[i]===bi){const y=(i/W)|0,x=i-y*W,s=x+y,d=x-y;if(s<P[0][0])P[0]=[s,x,y];if(d>P[1][0])P[1]=[d,x,y];if(s>P[2][0])P[2]=[s,x,y];if(d<P[3][0])P[3]=[d,x,y];}
 const Q=P.map(p=>[p[1],p[2]]),bw=q.x1-q.x0,bh=q.y1-q.y0,bc=[[q.x0,q.y0],[q.x1,q.y0],[q.x1,q.y1],[q.x0,q.y1]],off=Math.max(...Q.map((p,i)=>Math.hypot(p[0]-bc[i][0],p[1]-bc[i][1])))/Math.max(bw,bh);
 let edgeOK=off>.025;if(edgeOK)for(let e=0;e<4&&edgeOK;e++){const a=Q[e],b=Q[(e+1)%4];let hit=0;for(let k=1;k<40;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/40),y=Math.round(a[1]+(b[1]-a[1])*k/40);let f=0;for(let dy=-3;dy<=3&&!f;dy++)for(let dx=-3;dx<=3&&!f;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&m[yy*W+xx])f=1;}hit+=f;}if(hit<30)edgeOK=false;}
 const M=Math.round(.05*Math.max(bw,bh));
 if(!edgeOK){const x0=Math.max(0,q.x0-M),y0=Math.max(0,q.y0-M),o=document.createElement('canvas');o.width=Math.min(W,q.x1+M)-x0;o.height=Math.min(H,q.y1+M)-y0;o.getContext('2d').drawImage(c,-x0,-y0);return o;}
 const ow=Math.round((Math.hypot(Q[1][0]-Q[0][0],Q[1][1]-Q[0][1])+Math.hypot(Q[2][0]-Q[3][0],Q[2][1]-Q[3][1]))/2),oh=Math.round((Math.hypot(Q[3][0]-Q[0][0],Q[3][1]-Q[0][1])+Math.hypot(Q[2][0]-Q[1][0],Q[2][1]-Q[1][1]))/2);
 const Hm=homog([[M,M],[M+ow,M],[M+ow,M+oh],[M,M+oh]],Q),OW=ow+2*M,OH=oh+2*M,o=document.createElement('canvas');o.width=OW;o.height=OH;const ox=o.getContext('2d'),od=ox.createImageData(OW,OH),sd=c.getContext('2d').getImageData(0,0,W,H).data;
 for(let y=0;y<OH;y++)for(let x=0;x<OW;x++){const z=Hm[6]*x+Hm[7]*y+1,sx=Math.round((Hm[0]*x+Hm[1]*y+Hm[2])/z),sy=Math.round((Hm[3]*x+Hm[4]*y+Hm[5])/z),j=(y*OW+x)*4;
  if(sx>=0&&sy>=0&&sx<W&&sy<H){const i=(sy*W+sx)*4;od.data[j]=sd[i];od.data[j+1]=sd[i+1];od.data[j+2]=sd[i+2];}else od.data[j]=od.data[j+1]=od.data[j+2]=255;od.data[j+3]=255;}
 ox.putImageData(od,0,0);return o;}
function homog(s,d){const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=s[i],[u,v]=d[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}
 for(let i=0;i<8;i++){let p=i;for(let r=i+1;r<8;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let r=0;r<8;r++)if(r!==i){const f=A[r][i]/A[i][i];for(let k=i;k<8;k++)A[r][k]-=f*A[i][k];b[r]-=f*b[i];}}return b.map((v,i)=>v/A[i][i]);}
function erode(a,W,H,k,hz){const o=new Uint8Array(W*H);if(hz){for(let y=0;y<H;y++){let c=0;for(let x=0;x<W;x++){c=a[y*W+x]?c+1:0;if(c>=k)o[y*W+x-(k>>1)]=1;}}}else{for(let x=0;x<W;x++){let c=0;for(let y=0;y<H;y++){c=a[y*W+x]?c+1:0;if(c>=k)o[(y-(k>>1))*W+x]=1;}}}return o;}
function dl1(a,W,H,k,hz){const o=new Uint8Array(W*H),r=k>>1;for(let i=0;i<W*H;i++)if(a[i]){const y=(i/W)|0,x=i%W;for(let j=-r;j<=r;j++){if(hz){const xx=x+j;if(xx>=0&&xx<W)o[y*W+xx]=1;}else{const yy=y+j;if(yy>=0&&yy<H)o[yy*W+x]=1;}}}return o;}
const dil=(m,W,H,k)=>dl1(dl1(m,W,H,k,1),W,H,k,0);
function open(m,W,H,k){return dil(erode(erode(m,W,H,k,1),W,H,k,0),W,H,k);}
// axis-aligned stroke segments {hz,c,a,b,t} in px
function segs(m,W,H,k){const out=[],minL=Math.max(3*k,.03*Math.max(W,H));
 const scan=hz=>{const N=hz?H:W,M=hz?W:H,at=(i,j)=>hz?m[i*W+j]:m[j*W+i];let op=[];
  for(let i=0;i<=N;i++){const runs=[];if(i<N){let s=-1,gap=0;for(let j=0;j<=M;j++){const v=j<M&&at(i,j);if(v){if(s<0)s=j;gap=0;}else if(s>=0&&++gap>2||j===M&&s>=0){if(j-gap-s>=minL)runs.push([s,j-gap+1]);s=-1;gap=0;}}}
   const nx=[];for(const r of runs){const o=op.find(g=>!g.u&&Math.min(g.b,r[1])-Math.max(g.a,r[0])>.7*(r[1]-r[0]));if(o){o.u=1;o.a=Math.min(o.a,r[0]);o.b=Math.max(o.b,r[1]);o.i1=i;o.n+=r[1]-r[0];nx.push(o);}else nx.push({a:r[0],b:r[1],i0:i,i1:i,n:r[1]-r[0]});}
   op.filter(g=>!g.u&&!nx.includes(g)).forEach(g=>{const sp=g.i1-g.i0+1,t=Math.min(sp,g.n/(g.b-g.a)*1.05);if(t>=k*.8&&sp<=.08*Math.max(W,H)&&t<=.045*Math.max(W,H)&&(g.b-g.a)>2.5*t)out.push({hz,c:(g.i0+g.i1+1)/2,a:g.a,b:g.b,t});});nx.forEach(g=>delete g.u);op=nx;}};
 scan(1);scan(0);
 out.sort((p,q)=>p.c-q.c||p.a-q.a);const mg=[];for(const s of out){const p=mg.find(q=>q.hz===s.hz&&Math.abs(q.c-s.c)<Math.max(k,q.t/2)&&s.a-q.b<1.2*Math.max(q.t,s.t)&&q.a-s.b<1.2*Math.max(q.t,s.t));if(p){p.a=Math.min(p.a,s.a);p.b=Math.max(p.b,s.b);p.t=Math.max(p.t,s.t);}else mg.push({...s});}return mg;}
// double-line walls -> one wall
function pairUp(ss,W,H){const D=.02*Math.max(W,H),used=new Set(),o=[];for(const s of ss){if(used.has(s))continue;const p=ss.find(q=>q!==s&&!used.has(q)&&q.hz===s.hz&&q.c>s.c&&q.c-s.c<D&&Math.min(q.b,s.b)-Math.max(q.a,s.a)>.6*Math.min(q.b-q.a,s.b-s.a));
  if(p){used.add(p);o.push({hz:s.hz,c:(s.c+p.c)/2,a:Math.min(s.a,p.a),b:Math.max(s.b,p.b),t:p.c-s.c+(s.t+p.t)/2});}else o.push({...s,t:Math.max(s.t,4)});used.add(s);}return o;}
// junk filters: snap ends, min length, keep the main connected outline graph, cap count
function clean(ss,W,H){const Dm=Math.max(W,H);ss=ss.filter(s=>s.b-s.a>=Math.max(2.5*s.t,.03*Dm));
 const end=(s,e)=>s.hz?[e?s.b:s.a,s.c]:[s.c,e?s.b:s.a],near=(p,o,tol)=>o.hz?Math.abs(p[1]-o.c)<tol&&p[0]>o.a-tol&&p[0]<o.b+tol:Math.abs(p[0]-o.c)<tol&&p[1]>o.a-tol&&p[1]<o.b+tol;
 for(const s of ss)for(const e of[0,1]){const p=end(s,e);for(const o of ss){if(o===s||o.hz===s.hz)continue;const tol=Math.max(s.t,o.t)*1.5+.01*Dm;if(near(p,o,tol)){if(e)s.b=o.c;else s.a=o.c;if(s.b<s.a){const t=s.a;s.a=s.b;s.b=t;}break;}}}
 const P=ss.map((_,i)=>i),f=i=>P[i]===i?i:(P[i]=f(P[i]));
 ss.forEach((s,i)=>ss.forEach((o,j)=>{if(j<=i)return;const tol=Math.max(s.t,o.t)*1.5+.07*Dm;if(near(end(s,0),o,tol)||near(end(s,1),o,tol)||near(end(o,0),s,tol)||near(end(o,1),s,tol))P[f(i)]=f(j);}));
 const len={};ss.forEach((s,i)=>len[f(i)]=(len[f(i)]||0)+s.b-s.a);const mx=Math.max(0,...Object.values(len));
 ss=ss.filter((s,i)=>len[f(i)]>=.35*mx&&(len[f(i)]>.08*Dm));ss.sort((p,q)=>(q.b-q.a)-(p.b-p.a));return ss.slice(0,80);}
function toMetres(ss,W,H,mW,line,cv){let ppm,guess=false;
 if(mW)ppm=W/mW;else{guess=true;if(!ss.length)ppm=W/15;else{
  const x0=Math.min(...ss.map(s=>s.hz?s.a:s.c)),x1=Math.max(...ss.map(s=>s.hz?s.b:s.c)),y0=Math.min(...ss.map(s=>s.hz?s.c:s.a)),y1=Math.max(...ss.map(s=>s.hz?s.c:s.b)),bw=Math.max(x1-x0,y1-y0),ok=p=>bw/p>=5&&bw/p<=35;
  const outer=ss.filter(s=>s.hz?Math.min(Math.abs(s.c-y0),Math.abs(s.c-y1))<2*s.t:Math.min(Math.abs(s.c-x0),Math.abs(s.c-x1))<2*s.t).map(s=>s.t).sort((a,b)=>a-b),pT=!line&&outer.length?outer[outer.length>>1]/.3:0;
  const gaps=[];for(const s of ss)for(const q of ss)if(q!==s&&q.hz===s.hz&&Math.abs(q.c-s.c)<s.t&&q.a>s.b){const gp=q.a-s.b;if(gp>2*s.t&&gp<.25*bw)gaps.push(gp);}gaps.sort((a,b)=>a-b);const pD=gaps.length?gaps[gaps.length>>1]/.9:0;
  ppm=ok(pT)&&ok(pD)?Math.sqrt(pT*pD):ok(pD)?pD:ok(pT)?pT:bw/12;}}
 const r=v=>Math.round(v/ppm*100)/100;
 const walls=ss.map(s=>{const t=line?.2:Math.min(.6,Math.max(.1,Math.round(s.t/ppm*20)/20));return s.hz?{start:[r(s.a),r(s.c)],end:[r(s.b),r(s.c)],thickness:t}:{start:[r(s.c),r(s.a)],end:[r(s.c),r(s.b)],thickness:t};});
 return{walls,canvas:cv,w:Math.round(W/ppm*100)/100,guess,mode:line?'line':'thick'};}

/** Merge colinear wall segments that leave a door/window-sized gap.
 *  Endpoints may meet other walls (T-junction / corner / entrance); only a
 *  body blocking the open middle of the gap is rejected. */
export function gapMerge(ws,on){ws=(ws||[]).map(w=>({...w,op:[...(w.op||w.openings||[])]}));if(!on||ws.length<3)return ws;
 const P=[];ws.forEach(w=>P.push(w.start,w.end));
 const xs=P.map(p=>p[0]),zs=P.map(p=>p[1]),bb=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
 const D=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const segD=(p,w)=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],L2=dx*dx+dz*dz||1;let t=((p[0]-w.start[0])*dx+(p[1]-w.start[1])*dz)/L2;t=Math.max(0,Math.min(1,t));return Math.hypot(w.start[0]+dx*t-p[0],w.start[1]+dz*t-p[1]);};
 let ch=1,it=0;while(ch&&it++<200){ch=0;
  for(let i=0;i<ws.length&&!ch;i++)for(let j=i+1;j<ws.length&&!ch;j++){const A=ws[i],B=ws[j];const La=D(A.start,A.end),Lb=D(B.start,B.end);if(La<.3||Lb<.3)continue;
   const u=[(A.end[0]-A.start[0])/La,(A.end[1]-A.start[1])/La],v=[(B.end[0]-B.start[0])/Lb,(B.end[1]-B.start[1])/Lb];if(Math.abs(u[0]*v[1]-u[1]*v[0])>.03)continue;
   if(Math.abs(A.thickness-B.thickness)>.12)continue;const n=[-u[1],u[0]],off=p=>(p[0]-A.start[0])*n[0]+(p[1]-A.start[1])*n[1];if(Math.abs(off(B.start))>.12||Math.abs(off(B.end))>.12)continue;
   const s=p=>(p[0]-A.start[0])*u[0]+(p[1]-A.start[1])*u[1],sb=[s(B.start),s(B.end)].sort((x,y)=>x-y);let g0,g1;if(sb[0]>=La-.01){g0=La;g1=sb[0];}else if(sb[1]<=.01){g0=sb[1];g1=0;}else continue;
   const gap=Math.abs(g1-g0);if(gap<.55||gap>2.8)continue;const lo=Math.min(g0,g1),hi=Math.max(g0,g1),pt=t=>[A.start[0]+u[0]*t,A.start[1]+u[1]*t];
   // Allow walls meeting at jambs/corners; reject only if something sits in the open middle.
   const mid=pt((lo+hi)/2),eps=.28;
   const blocked=ws.some(w=>{if(w===A||w===B)return false;
    const inside=p=>{const t=s(p);return t>lo+eps&&t<hi-eps&&Math.abs(off(p))<Math.max(A.thickness,w.thickness)*.85+.12;};
    if(inside(w.start)||inside(w.end))return true;
    return segD(mid,w)<w.thickness*.45+.06 && (()=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],L2=dx*dx+dz*dz||1;let t=((mid[0]-w.start[0])*dx+(mid[1]-w.start[1])*dz)/L2;const q=[w.start[0]+dx*Math.max(0,Math.min(1,t)),w.start[1]+dz*Math.max(0,Math.min(1,t))];const tt=s(q);return tt>lo+eps&&tt<hi-eps;})();});
   if(blocked)continue;
   const all=[0,La,sb[0],sb[1]],a0=Math.min(...all),a1=Math.max(...all),st=pt(a0),en=pt(a1),m=pt((lo+hi)/2);
   const ext=Math.min(Math.abs(m[0]-bb[0]),Math.abs(m[0]-bb[2]),Math.abs(m[1]-bb[1]),Math.abs(m[1]-bb[3]))<.5;
   const r2=x=>Math.round(x*100)/100,typ=!ext||gap<1.35?'door':'window';
   const o=typ==='door'?{type:'door',offset:r2(lo-a0),width:r2(Math.min(gap,1.2)),height:2.05}:{type:'window',offset:r2(lo-a0+.05),width:r2(Math.max(.5,gap-.1)),sill:gap>2.1?0:.9,height:gap>2.1?2.2:1.4};
   if(typ==='door'&&gap>1.2)o.offset=r2(lo-a0+(gap-1.2)/2);
   if(typ==='door'&&ext)o.out=1;
   const sh=(w,d)=>(w.op||[]).map(q=>({...q,offset:r2(q.offset+d)}));const flipB=s(B.start)>s(B.end);
   const opB=(B.op||[]).map(q=>({...q,offset:r2((flipB?sb[1]-q.offset-q.width:sb[0]+q.offset)-a0)}));
   const W={...A,start:[r2(st[0]),r2(st[1])],end:[r2(en[0]),r2(en[1])],op:[...sh(A,s(A.start)-a0),o,...opB]};ws.splice(j,1);ws.splice(i,1,W);ch=1;}}
 return ws;}
