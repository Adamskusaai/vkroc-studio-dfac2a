// plan image -> walls (plain JS, no AI)
// detectWalls(img,{sens,mW,rect}) -> {walls,canvas,w,guess,mode}
export function detectWalls(img,o={}){const sens=o.sens??.5;
 let c=toCanvas(img,1400);
 if(!o.rect){c=deskew(c);c=rectify(c);}
 const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data,g=new Uint8Array(W*H);
 for(let i=0;i<W*H;i++)g[i]=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)|0;
 let m=binar(g,W,H,sens);m=dropSmall(m,W,H,.025*Math.max(W,H));
 const lw=lineW(m,W,H),f=2.2-1.4*sens,ks=[...new Set([Math.round(lw*f)+1,Math.round(lw*1.2)+1,Math.round(lw*.8),3].map(k=>Math.max(3,k)))].sort((a,b)=>b-a);
 let cands=ks.map(k=>({k,s:clean(segs(open(m,W,H,k),W,H,k),W,H)}));
 cands.push({k:2,line:1,s:clean(pairUp(segs(dil(m,W,H,3),W,H,2),W,H),W,H)});
 cands.forEach(q=>q.L=q.s.reduce((a,s)=>a+s.b-s.a,0));const mx=Math.max(...cands.map(q=>q.L));
 const best=cands.find(q=>q.L>=.85*mx&&q.s.length>=3)||cands[0];
 return toMetres(best.s,W,H,o.mW,!!best.line,c);}
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
function dropSmall(m,W,H,minD){const{L,cs}=comps(m,W,H),o=new Uint8Array(W*H),nb=noBorder(cs,W,H);for(let i=0;i<W*H;i++)if(L[i]>=0){const c=cs[L[i]];if(Math.max(c.x1-c.x0,c.y1-c.y0)>=minD&&!(nb&&edge(c,W,H)))o[i]=1;}return o;}
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
