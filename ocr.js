/* v18: tiny area-table reader. A 5-layer CTC CNN (trained on synthetic Slovak area tables, OFL fonts) reads 4-9 px numbers
   that tesseract-style template OCR misses in phone screenshots. Everything runs locally in the browser. */
import {OCRW} from './ocrw.js?v=20261117z';
let NET=null;
function load(){if(NET)return NET;const bin=atob(OCRW.b64),q=new Int8Array(bin.length);for(let i=0;i<bin.length;i++)q[i]=bin.charCodeAt(i)<<24>>24;
 const T={};let o=0;for(const t of OCRW.t){const n=t.shape.reduce((a,b)=>a*b,1),f=new Float32Array(n);for(let i=0;i<n;i++)f[i]=q[o+i]*t.s;o+=n;T[t.k]=f;T[t.k+'_s']=t.shape;}NET=T;return T;}
function conv(x,C,H,W,w,b,sh,ph,pw){const Co=sh[0],kh=sh[2],kw=sh[3],Ho=H+2*ph-kh+1,Wo=W+2*pw-kw+1,y=new Float32Array(Co*Ho*Wo);
 for(let co=0;co<Co;co++){const yo=co*Ho*Wo;y.fill(b[co],yo,yo+Ho*Wo);for(let ci=0;ci<C;ci++){const xi=ci*H*W;for(let ky=0;ky<kh;ky++)for(let kx=0;kx<kw;kx++){const wv=w[((co*C+ci)*kh+ky)*kw+kx];if(!wv)continue;
   for(let oy=0;oy<Ho;oy++){const iy=oy+ky-ph;if(iy<0||iy>=H)continue;const r=xi+iy*W,ro=yo+oy*Wo;const ox0=Math.max(0,pw-kx),ox1=Math.min(Wo,W+pw-kx);for(let ox=ox0;ox<ox1;ox++)y[ro+ox]+=wv*x[r+ox+kx-pw];}}}}
 return {y,H:Ho,W:Wo};}
const relu=a=>{for(let i=0;i<a.length;i++)if(a[i]<0)a[i]=0;return a;};
function pool(x,C,H,W){const Ho=H>>1,y=new Float32Array(C*Ho*W);for(let c=0;c<C;c++)for(let oy=0;oy<Ho;oy++)for(let ox=0;ox<W;ox++){const a=x[(c*H+2*oy)*W+ox],b=x[(c*H+2*oy+1)*W+ox];y[(c*Ho+oy)*W+ox]=a>b?a:b;}return {y,H:Ho};}
export function ocrRead(v,W){const N=load();let x=v,C=1,H=OCRW.hn;const L=[['c1',1,1],['c2',1,1],['c3',1,1]];
 for(const [k,ph,pw] of L){const r=conv(x,C,H,W,N[k+'.weight'],N[k+'.bias'],N[k+'.weight_s'],ph,pw);relu(r.y);C=N[k+'.weight_s'][0];const p=pool(r.y,C,r.H,W);x=p.y;H=p.H;}
 let r=conv(x,C,H,W,N['c4.weight'],N['c4.bias'],N['c4.weight_s'],0,2);relu(r.y);C=N['c4.weight_s'][0];r=conv(r.y,C,1,W,N['c5.weight'],N['c5.bias'],N['c5.weight_s'],0,0);
 const K=N['c5.weight_s'][0];let out='',prev=0,conf=1;for(let t=0;t<W;t++){let bk=0,bv=-1e9,s=0;for(let k=0;k<K;k++){const z=r.y[k*W+t];if(z>bv){bv=z;bk=k;}}for(let k=0;k<K;k++)s+=Math.exp(r.y[k*W+t]-bv);conf=Math.min(conf,1/s);if(bk&&bk!==prev)out+=OCRW.alph[bk-1];prev=bk;}
 return {s:out,conf};}
function bilin(g,w,h,W2,H2){const o=new Float32Array(W2*H2);for(let j=0;j<H2;j++){let ys=(j+.5)*h/H2-.5;ys=Math.min(h-1,Math.max(0,ys));const y0=Math.floor(ys),y1=Math.min(y0+1,h-1),fy=ys-y0;
 for(let i=0;i<W2;i++){let xs=(i+.5)*w/W2-.5;xs=Math.min(w-1,Math.max(0,xs));const x0=Math.floor(xs),x1=Math.min(x0+1,w-1),fx=xs-x0;o[j*W2+i]=(g[y0*w+x0]*(1-fx)+g[y0*w+x1]*fx)*(1-fy)+(g[y1*w+x0]*(1-fx)+g[y1*w+x1]*fx)*fy;}}return o;}
export function ocrPrep(G,GW,x0,y0,x1,y1,pd=0){const HN=OCRW.hn;let w=x1-x0,h=y1-y0;const h0=h;let g=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)g[y*w+x]=G[(y+y0)*GW+x+x0];
 const W2=Math.max(4,Math.round(w*HN/h));if(h>2*HN){const f=Math.floor(h/HN),h2=Math.floor(h/f),w2=Math.floor(w/f),g2=new Float32Array(w2*h2);for(let y=0;y<h2;y++)for(let x=0;x<w2;x++){let s=0;for(let a=0;a<f;a++)for(let b=0;b<f;b++)s+=g[(y*f+a)*w+x*f+b];g2[y*w2+x]=s/(f*f);}g=g2;w=w2;h=h2;}
 const r=bilin(g,w,h,W2,HN),srt=Array.from(r).sort((a,b)=>a-b),pi=(srt.length-1)*.95,i0=Math.floor(pi),hi=srt[i0]+(srt[Math.min(i0+1,srt.length-1)]-srt[i0])*(pi-i0),cc=Math.floor(pd*HN/h0);let lo=1e9;if(HN-2*cc>=2&&W2-2*cc>=2){for(let y=cc;y<HN-cc;y++)for(let x=cc;x<W2-cc;x++)lo=Math.min(lo,r[y*W2+x]);}else lo=srt[0];const d=Math.max(hi-lo,20);
 for(let i=0;i<r.length;i++)r[i]=Math.min(1,Math.max(0,(hi-r[i])/d));return {v:r,W:W2};}
/* find stacked number columns (area table) and read them */
export function tableAreas(img,PF={}){tableAreas.dump=null;const T0=performance.now();let W=img.width,H=img.height;const s=Math.min(1,2600/Math.max(W,H));W=Math.round(W*s);H=Math.round(H*s);
 const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(W,H):Object.assign(document.createElement('canvas'),{width:W,height:H});const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,W,H);
 const D=x.getImageData(0,0,W,H).data,G=new Float32Array(W*H),hist=new Uint32Array(256);for(let i=0;i<W*H;i++){const v=.299*D[4*i]+.587*D[4*i+1]+.114*D[4*i+2];G[i]=v;hist[v|0]++;}
 let acc=0,p95=255;for(let v=0;v<256;v++){acc+=hist[v];if(acc>=.95*W*H){p95=v;break;}}const thr=Math.min(200,p95*.78);
 const lab=new Int32Array(W*H),comps=[];let id=0;
 for(let i=0;i<W*H;i++){if(lab[i]||G[i]>=thr)continue;id++;const st=[i];lab[i]=id;let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;
  while(st.length){const k=st.pop(),px=k%W,py=(k/W)|0;n++;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const qx=px+dx,qy=py+dy;if(qx<0||qy<0||qx>=W||qy>=H)continue;const q=qy*W+qx;if(!lab[q]&&G[q]<thr){lab[q]=id;st.push(q);}}
   if(n>4000)break;}
  if(n>4000){while(st.length)st.pop();continue;}const w=x1-x0+1,h=y1-y0+1;if(h<=40&&w<=8*h+4&&!(w>40&&h>40))comps.push({x0,y0,x1:x1+1,y1:y1+1,h,w,n});}
 comps.sort((a,b)=>a.x0-b.x0);const toks=[];
 for(const q of comps){let best=null;for(let j=toks.length-1;j>=0&&j>=toks.length-60;j--){const t=toks[j],th=t.th,gap=q.x0-t.x1;if(gap>Math.max(1.5,.55*th)||gap<-th)continue;
   const ov=Math.min(q.y1,t.y1)-Math.max(q.y0,t.y0);const big=q.h>=.6*th&&q.h<=1.6*th&&ov>=.5*Math.min(q.h,th),small=q.h<.6*th&&q.y0>=t.y0+.25*th-1&&q.y1<=t.y1+.45*th+1;if(big||small){best=t;break;}}
  if(best){best.x0=Math.min(best.x0,q.x0);best.x1=Math.max(best.x1,q.x1);best.y0=Math.min(best.y0,q.y0);best.y1=Math.max(best.y1,q.y1);if(q.h>=.6*best.th){best.th=Math.max(best.th,q.h);best.ty0=Math.min(best.ty0,q.y0);best.ty1=Math.max(best.ty1,q.y1);}best.k++;}
  else toks.push({x0:q.x0,x1:q.x1,y0:q.y0,y1:q.y1,ty0:q.y0,ty1:q.y1,th:q.h,k:1});}
 const cand=toks.filter(t=>t.th>=3&&t.th<=36&&(t.x1-t.x0)>=1.2*t.th&&(t.x1-t.x0)<=7*t.th);
 /* columns: right edges aligned, similar height, stacked at a near-constant pitch */
 const used=new Set(),cols=[];cand.sort((a,b)=>a.ty0-b.ty0);
 for(const a of cand){if(used.has(a))continue;const m=cand.filter(b=>!used.has(b)&&Math.abs(b.x1-a.x1)<=Math.max(2,.6*a.th)&&b.th/a.th<1.4&&a.th/b.th<1.4);if(m.length<3)continue;
  const runs=[];let cur=[m[0]];for(let i=1;i<m.length;i++){const dy=m[i].ty0-cur[cur.length-1].ty0;if(dy>=1.3*a.th&&dy<=5*a.th)cur.push(m[i]);else if(dy<1.3*a.th)continue;else{runs.push(cur);cur=[m[i]];}}runs.push(cur);
  for(const r of runs)if(r.length>=3){r.forEach(t=>used.add(t));cols.push(r);}}
 const out=[];let nO=0;const MAXO=PF.ocrMax||160;
 const VAR=PF.ocrVar||[[0,0,0],[1,0,0],[0,-1,0],[1,-1,0],[0,0,1],[-1,1,0]];
 for(const col of cols){const rows=[];for(const t of col){if(nO>=MAXO)break;const h=t.y1-t.y0,p=Math.round(.25*h)+1;if(h<2)continue;const vote=new Map();let txt='';
   for(const [a,b,c] of VAR){const X0=Math.max(0,t.x0-p-c),X1=Math.min(W,t.x1+p+c),Y0=Math.max(0,t.y0-p+a),Y1=Math.min(H,t.y1+p+b);if(Y1-Y0<3)continue;
    const P=ocrPrep(G,W,X0,Y0,X1,Y1,p);const R=ocrRead(P.v,P.W);nO++;if(!txt)txt=R.s;if(PF.ocrDump)(tableAreas.dump=tableAreas.dump||[]).push({W:P.W,v:Array.from(P.v,z=>Math.round(z*255)),s:R.s,c:+R.conf.toFixed(3),b:[X0,Y0,X1,Y1]});
    const m=/^(\d{1,3})[,.](\d{1,2})$/.exec(R.s);if(m&&R.conf>(PF.ocrConf??.3)){const v=+(m[1]+'.'+m[2]);vote.set(v,(vote.get(v)||0)+R.conf);}}
   t.txt=txt;const cs=[...vote.entries()].sort((x,y)=>y[1]-x[1]);if(cs.length&&cs[0][1]>=(PF.ocrVote??.9))rows.push(cs.slice(0,3));}
  const vals=rows.map(r=>r[0][0]);
  const seq=vals.length>=3&&vals.slice(1).every((v,i)=>{const d=Math.abs(v-vals[i]);return Math.abs(d-.01)<.003||Math.abs(d-1)<.003||Math.abs(d-.1)<.003;});
  if(vals.length>=3&&vals.length>=.6*col.length&&!seq)out.push({vals,rows,n:col.length,x:col[0].x1/s,txt:col.map(t=>t.txt)});}
 out.sort((a,b)=>b.vals.length-a.vals.length||b.vals.reduce((x,y)=>x+y,0)-a.vals.reduce((x,y)=>x+y,0));
 const best=out[0]||null;
 /* totals in column order: a row equal to the sum of the rows above it (since the last total, or all, optionally minus one, e.g. a balcony) is a total; any row at or above a found total is a grand total */
 const anal=v=>{const it=[],tots=[];let seg=[];const S=a=>a.reduce((x,y)=>x+y,0),near=(x,y)=>Math.abs(x-y)/y<.004;let ok=0;
  for(const x of v){const ss=S(seg),si=S(it);let t=(seg.length>=2&&near(ss,x))||(it.length>=2&&near(si,x))||(seg.length>=3&&seg.some(q=>near(ss-q,x)));if(t)ok=1;else if(tots.length&&x>=Math.max(...tots)*.999)t=1;if(t){tots.push(x);seg=[];}else{it.push(x);seg.push(x);}}
  return {rooms:it,tot:ok,tots};};
 let tot=0,res=null;
 if(best){res=anal(best.vals);tot=res.tot;if(!tot&&best.rows.length<=10){let bs=null;const R=best.rows,k=R.map(()=>0);const rec=i=>{if(i===R.length){const v=R.map((r,j)=>r[k[j]][0]),A=anal(v);if(A.tot){const sc=R.reduce((s,r,j)=>s+r[k[j]][1],0);if(!bs||sc>bs.sc)bs={sc,A};}return;}for(let c=0;c<R[i].length;c++){k[i]=c;rec(i+1);}k[i]=0;};rec(0);if(bs){res=bs.A;tot=2;}}}
 tableAreas.dbg={nc:comps.length,nt:toks.length,ncand:cand.length,ncol:cols.length,nO,t:Math.round(performance.now()-T0),cols:out.slice(0,3).map(c=>c.txt.join(' ')),rows:best&&best.rows.map(r=>r.map(q=>q[0]).join('/')),dump:tableAreas.dump};
 return best?{vals:res.rooms,tots:res.tots,tot,n:best.n}:null;}
