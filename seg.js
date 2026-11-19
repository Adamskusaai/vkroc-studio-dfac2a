/* v18: own learned wall/opening segmenter (tiny dilated FCN, int8, trained on synthetic Slovak/CZ plan sheets on our own CPU).
   segPlan(canvas) -> {wall,open} masks (Uint8Array, canvas size). Runs locally in the browser. */
import {SEGW} from './segw.js?v=20261118b';
let NET=null;
function load(){if(NET)return NET;const bin=atob(SEGW.b64),q=new Int8Array(bin.length);for(let i=0;i<bin.length;i++)q[i]=bin.charCodeAt(i)<<24>>24;
 const T={};let o=0;for(const t of SEGW.t){const n=t.shape.reduce((a,b)=>a*b,1),f=new Float32Array(n);for(let i=0;i<n;i++)f[i]=q[o+i]*t.s;o+=n;T[t.k]=f;T[t.k+'_s']=t.shape;}NET=T;return T;}
function conv(x,C,H,W,w,b,sh,st,pd,dl,relu){const Co=sh[0],kh=sh[2],kw=sh[3],Ho=Math.floor((H+2*pd-dl*(kh-1)-1)/st)+1,Wo=Math.floor((W+2*pd-dl*(kw-1)-1)/st)+1,y=new Float32Array(Co*Ho*Wo);
 for(let co=0;co<Co;co++){const yo=co*Ho*Wo;y.fill(b[co],yo,yo+Ho*Wo);for(let ci=0;ci<C;ci++){const xi=ci*H*W;for(let ky=0;ky<kh;ky++)for(let kx=0;kx<kw;kx++){const wv=w[((co*C+ci)*kh+ky)*kw+kx];if(!wv)continue;
   const oxs=Math.max(0,Math.ceil((pd-kx*dl)/st)),oxe=Math.min(Wo,Math.floor((W-1+pd-kx*dl)/st)+1);
   for(let oy=0;oy<Ho;oy++){const iy=oy*st+ky*dl-pd;if(iy<0||iy>=H)continue;const r=xi+iy*W+kx*dl-pd,ro=yo+oy*Wo;if(st===1){for(let ox=oxs;ox<oxe;ox++)y[ro+ox]+=wv*x[r+ox];}else{for(let ox=oxs;ox<oxe;ox++)y[ro+ox]+=wv*x[r+ox*st];}}}}
  if(relu)for(let i=yo;i<yo+Ho*Wo;i++)if(y[i]<0)y[i]=0;}
 return {y,H:Ho,W:Wo};}
export function segPlan(c,maxS=700){const N=load(),W0=c.width,H0=c.height,s=Math.min(1,maxS/Math.max(W0,H0)),W=Math.max(16,Math.round(W0*s)),H=Math.max(16,Math.round(H0*s));
 const cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(W,H):Object.assign(document.createElement('canvas'),{width:W,height:H});const x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(c,0,0,W,H);
 const D=x.getImageData(0,0,W,H).data,inp=new Float32Array(W*H);for(let i=0;i<W*H;i++){const g=.299*D[4*i]+.587*D[4*i+1]+.114*D[4*i+2];inp[i]=Math.min(1,Math.max(0,(255-g)/255));}
 const L=(k,x,C,H,W,st,pd,dl,rl=1)=>conv(x,C,H,W,N[k+'.weight'],N[k+'.bias'],N[k+'.weight_s'],st,pd,dl,rl);const Cn=N['c1.weight_s'][0];
 const a=L('c1',inp,1,H,W,1,1,1),b=L('c2',a.y,Cn,H,W,2,1,1);let y=L('c3',b.y,Cn,b.H,b.W,1,1,1);y=L('c4',y.y,Cn,b.H,b.W,1,2,2);y=L('c5',y.y,Cn,b.H,b.W,1,4,4);y=L('c6',y.y,Cn,b.H,b.W,1,8,8);
 const cat=new Float32Array(2*Cn*b.H*b.W);cat.set(y.y,0);cat.set(b.y,Cn*b.H*b.W);const o=L('c7',cat,2*Cn,b.H,b.W,1,0,1,0),Hh=o.H,Wh=o.W,P=Hh*Wh;
 const wall=new Uint8Array(W0*H0),open=new Uint8Array(W0*H0);
 for(let yy=0;yy<H0;yy++){const sy=Math.min(Hh-1,Math.floor(yy*Hh/H0));for(let xx=0;xx<W0;xx++){const sx=Math.min(Wh-1,Math.floor(xx*Wh/W0)),k=sy*Wh+sx,v0=o.y[k],v1=o.y[P+k],v2=o.y[2*P+k];if(v1>v0&&v1>=v2)wall[yy*W0+xx]=1;else if(v2>v0&&v2>v1)open[yy*W0+xx]=1;}}
 return {wall,open,s};}
