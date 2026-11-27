// 3D view (lazy-loaded)
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {Body,Locomotion,colliderFromObject} from './vm.js';
import {loadKit,makeFurn,makeTree,makeShrub,makeCar,onPhSwap,PH_STATS,phPending} from './kit.js?v=20261121m';
onPhSwap(()=>{DIRTY=Math.max(DIRTY,30);});
export function phInfo(){return PH_STATS;}
export function phWait(){return phPending();}
const $=id=>document.getElementById(id),TCH=matchMedia('(pointer:coarse)').matches,isTouch=()=>TCH||(typeof navigator!=='undefined'&&navigator.maxTouchPoints>0)||!!(typeof window!=='undefined'&&window.__vkTouch);
let roomKinds={};let H,R,scene,cam,rig,orb,world,loco,body,sun,inited=false,walk=false,roof='flat',intro=null;const clock=new THREE.Clock(),keys={},joy=[0,0];let yaw=0,pitch=0,LK='',DIRTY=60,FT=[],PRMAX=2;export function dirty(n=60){DIRTY=Math.max(DIRTY,n);}

export function setCanvasSize(w,h){if(w&&h){fixedSize=[w,h];}else{fixedSize=null;return;}if(!R)return;const el=R.domElement.parentElement||R.domElement;if(el&&el.id==='v3'){el.style.width=w+'px';el.style.height=h+'px';el.style.maxWidth='none';el.style.maxHeight='none';}R.setSize(w,h,false);if(cam){cam.aspect=w/h;cam.updateProjectionMatrix();}DIRTY=Math.max(DIRTY,60);}
export async function ensureKit(){return loadKit();}
export function snapBuild(){finishGrow();if(DOLL)setDollViz(true);else resetExterior();}
export function countFurn(){let n=0,types={},samples=[];if(!world)return{n:0};
  world.traverse(o=>{if(o.userData&&o.userData.furn){n++;types[o.userData.furn]=(types[o.userData.furn]|0)+1;
    if(samples.length<8){o.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(o);const s=new THREE.Vector3();b.getSize(s);samples.push({t:o.userData.furn,pos:o.position.toArray().map(v=>+v.toFixed(2)),size:s.toArray().map(v=>+v.toFixed(2)),vis:o.visible,nChild:o.children.length});}}});
  return{n,types,child:world.children.length,samples};}
export function debugViz(){let grow=0,short=0,roof=0,wallish=0,maxH=0,worldMaxY=-1e9,worldMinY=1e9,samples=[];if(!world)return{ok:false};
 const box=new THREE.Box3();world.updateMatrixWorld(true);world.traverse(o=>{if(!o.isMesh||!o.geometry)return;wallish++;
 if(o.userData.grow)grow++;if(o.scale&&o.scale.y<0.95)short++;if(o.userData.roof)roof++;
 const mats=[].concat(o.material||[]);const isWall=mats.some(m=>m&&(m===M.wall||m===M.fac||m===M.plinth||(M.wall&&m.color&&m.map===M.wall.map)));
 if(isWall||o.userData.grow){box.setFromObject(o);if(box.max.y>worldMaxY)worldMaxY=box.max.y;if(box.min.y<worldMinY)worldMinY=box.min.y;
  const h=box.max.y-box.min.y;if(h>maxH)maxH=h;if(samples.length<6)samples.push({h:+h.toFixed(2),minY:+box.min.y.toFixed(2),maxY:+box.max.y.toFixed(2),sy:+o.scale.y.toFixed(2)});}
 });
 let wallCuts=0;if(world)world.traverse(o=>{if(o.userData&&o.userData.wallCut)wallCuts++;});
 return{ok:true,grow,short,roof,wallish,wallCuts,DOLL,maxH:+maxH.toFixed(2),worldMinY:+worldMinY.toFixed(2),worldMaxY:+worldMaxY.toFixed(2),samples,DOLL,roofVis,camY:cam?+cam.position.y.toFixed(2):null,camPos:cam?cam.position.toArray().map(n=>+n.toFixed(1)):null};}
export function qaCam(px,py,pz,tx,ty,tz){camPath=null;intro=null;if(walk)setWalk(false);orb.enabled=true;cam.position.set(px,py,pz);orb.target.set(tx,ty,tz);orb.update();DIRTY=Math.max(DIRTY,90);}
// prem10 QA: vertical gaps between storeys. Under every upper wall (sampled each 0.25 m) and every upper room cell there must be solid geometry within 6 cm
// below the upper floor level; otherwise sky/air shows between storeys. Returns {gaps,samples,where}.
export function storeyQA(){if(!world||!H||!H.levels||H.levels.length<2)return{gaps:0,samples:0,where:[]};const rc=new THREE.Raycaster(),ms=[];world.traverse(o=>{if(o.isMesh&&o.material!==M.glass&&!o.userData.roof)ms.push(o);});
 world.updateMatrixWorld(true);let gaps=0,n=0;const where=[];const probe=(x,y,z)=>{rc.set(new THREE.Vector3(x,y,z),new THREE.Vector3(0,-1,0));rc.far=.08;n++;if(!rc.intersectObjects(ms,false).length){gaps++;if(where.length<12)where.push([+x.toFixed(2),+z.toFixed(2)]);}};
 H.levels.forEach((l,i)=>{if(!i)return;const e=(l.elevation||0)+.005;H.walls.filter(w=>w.level===l.name&&w._ext).forEach(w=>{const g=geo(w),N=Math.max(1,Math.floor(g.L/.25));for(let k=1;k<N;k++){const s=k/N*g.L;probe(g.x0+g.u[0]*s,e,g.z0+g.u[1]*s);}});
  (CELLS[l.name]||[]).forEach(r=>{if((r[2]-r[0])*(r[3]-r[1])<.5)return;probe((r[0]+r[2])/2,e,(r[1]+r[3])/2);});});return{gaps,samples:n,where};}
export function stopCam(){camPath=null;if(orb)orb.enabled=true;}
export function isDoll(){return DOLL;}
export const geo=w=>{const[x0,z0]=w.start,[x1,z1]=w.end,L=Math.hypot(x1-x0,z1-z0)||1e-9;return{x0,z0,L,u:[(x1-x0)/L,(z1-z0)/L]};};
const GLAZED=o=>o.type==='window'||(o.type==='door'&&(o.kind==='sliding'||o.kind==='terrace'));
function wallMount(f,F,l){const ws=H.walls.filter(w=>w.level===f.level);let bw=null,bd=.9,bq=0;
 ws.forEach(w=>{const g=geo(w),px=f.p[0]-g.x0,pz=f.p[1]-g.z0,q=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1])),d=Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)-(w.thickness||.3)/2;
  if(f.t==='curtain'&&!(w.openings||[]).some(o=>GLAZED(o)&&Math.abs(o.offset+o.width/2-q)<1.6))return;if(d<bd){bd=d;bw=w;bq=q;}});
 if(!bw)return null;const g=geo(bw),T=(bw.thickness||.3)/2,nx=-g.u[1],nz=g.u[0],sd=((f.p[0]-g.x0)*nx+(f.p[1]-g.z0)*nz)>=0?1:-1,ry=Math.atan2(nx*sd,nz*sd),ops=bw.openings||[],lh=l.height||2.8;
 const at=(q,off)=>({x:g.x0+g.u[0]*q+nx*sd*off,z:g.z0+g.u[1]*q+nz*sd*off});
 if(f.t==='curtain'){let o=null,od=1.6;ops.forEach(p=>{if(!GLAZED(p))return;const d=Math.abs(p.offset+p.width/2-bq);if(d<od){od=d;o=p;}});if(!o)return null;
  let m=.35;ops.forEach(p=>{if(p===o)return;const gap=p.offset>o.offset?p.offset-(o.offset+o.width):o.offset-(p.offset+p.width);if(gap>-.01)m=Math.min(m,gap/2-.03);});m=Math.max(.06,Math.min(m,o.offset,g.L-o.offset-o.width));
  const q=o.offset+o.width/2,rod=o.width+2*m,rodY=Math.min((o.sill||0)+o.height+.12,lh-.06),p=at(q,T+.08);
  return{...p,ry,F:{w:rod,rodY,pw:m+.15},rec:{t:'curtain',w:bw.id,q,oq:q,off:T+.08}};}
 const w=F.w||.9,h=F.h||.7,free=q=>q-w/2>.15&&q+w/2<g.L-.15&&!ops.some(o=>o.offset<q+w/2+.15&&o.offset+o.width>q-w/2-.15);
 /* furniture in front of the span: tall pieces (>1.3 m: wardrobes, shelves, fridges) block the span, lower ones lift the piece to 25 cm above their top */
 const near=(x,z)=>(H.furn||[]).filter(q2=>q2!==f&&q2.level===f.level&&!['art','mirror','curtain','rug','runner','towel','lamp','plant'].includes(q2.t)&&FUR[q2.t]&&Math.hypot(q2.p[0]-x,q2.p[1]-z)<Math.max(q2.w||FUR[q2.t].w,q2.d||FUR[q2.t].d)/2+.35+w/2*.5).map(q2=>FUR[q2.t].h||0);
 const SR=(H.stairs||[]).filter(st=>{const li=H.levels.findIndex(x=>x.name===st.level);return st.level===f.level||(H.levels[li+1]||{}).name===f.level;}).map(stairRect);
 let q=null,p=null,top=0;for(const dq of[0,.15,-.15,.3,-.3,.45,-.45,.6,-.6,.9,-.9]){const qq=bq+dq;if(!free(qq))continue;const pp=at(qq,T+.012),hs=near(pp.x,pp.z);if(hs.some(v=>v>1.3))continue;
  if(SR.some(r=>pp.x>r[0]-1&&pp.x<r[2]+1&&pp.z>r[1]-1&&pp.z<r[3]+1))continue;q=qq;p=pp;top=Math.max(0,...hs);break;}if(q==null)return null;
 const ay=Math.min(Math.max(1.5,top+.25+h/2),lh-h/2-.3);return{...p,ry,F:{ay},rec:{t:f.t,w:bw.id,q,off:T+.012,ay,h}};}
export function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function tex(draw,n=256,rep=1){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=TCH?2:4;return t;}
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
const wood=tex((x,n)=>{for(let i=0;i<8;i++){const l=175+rnd()*22;x.fillStyle=`rgb(${(l+40)|0},${(l+18)|0},${(l-20)|0})`;x.fillRect(0,i*n/8,n,n/8+1);x.fillStyle='rgba(90,50,15,.35)';x.fillRect(0,i*n/8,n,2);for(let k=0;k<4;k++){x.fillStyle='rgba(70,40,10,.12)';x.fillRect(rnd()*n,i*n/8,1+rnd()*2,n/8);}}for(let i=0;i<400;i++){x.fillStyle=`rgba(120,70,30,${rnd()*.08})`;x.fillRect(rnd()*n,rnd()*n,2+rnd()*40,1);}},256,3);
const tile=tex((x,n)=>{x.fillStyle='#e8e4dc';x.fillRect(0,0,n,n);const g=n/4;x.strokeStyle='#c9c3b8';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*g,0);x.lineTo(i*g,n);x.stroke();x.beginPath();x.moveTo(0,i*g);x.lineTo(n,i*g);x.stroke();}for(let i=0;i<200;i++){x.fillStyle=`rgba(0,0,0,${rnd()*.04})`;x.fillRect(rnd()*n,rnd()*n,2,2);}},128,6);
const beton=tex((x,n)=>{x.fillStyle='#a8a69f';x.fillRect(0,0,n,n);for(let i=0;i<1800;i++){const v=140+rnd()*50;x.fillStyle=`rgba(${v|0},${v|0},${v-5|0},${.15+rnd()*.25})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*3,1+rnd()*2);}x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,n*.48,n,2);},128,8);
const fabric=tex((x,n)=>{x.fillStyle='#888';x.fillRect(0,0,n,n);for(let i=0;i<2500;i++){x.fillStyle=`rgba(${200+rnd()*40|0},${200+rnd()*40|0},${200+rnd()*40|0},${.08+rnd()*.12})`;x.fillRect(rnd()*n,rnd()*n,1.2,1.2);}},64,8);
const plaster=tex((x,n)=>{x.fillStyle='#f2efe8';x.fillRect(0,0,n,n);for(let i=0;i<900;i++){x.fillStyle=`rgba(0,0,0,${rnd()*.035})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,1+rnd()*2);}},128,1.5);
const grass=tex((x,n)=>{x.fillStyle='#6d7a58';x.fillRect(0,0,n,n);for(let i=0;i<4200;i++){const g=95+rnd()*55;x.fillStyle=`rgba(${(g*.62)|0},${g|0},${(g*.48)|0},${.35+rnd()*.35})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,2+rnd()*3);}for(let i=0;i<80;i++){x.fillStyle=`rgba(90,100,70,${.08+rnd()*.12})`;x.beginPath();x.ellipse(rnd()*n,rnd()*n,8+rnd()*18,5+rnd()*12,rnd()*3,0,6.3);x.fill();}},256);
const earth=tex((x,n)=>{x.fillStyle='#8a8478';x.fillRect(0,0,n,n);for(let i=0;i<3000;i++){const g=110+rnd()*40;x.fillStyle=`rgba(${g|0},${(g*.92)|0},${(g*.78)|0},.4)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},128,4);
const pave=tex((x,n)=>{x.fillStyle='#c9c2b4';x.fillRect(0,0,n,n);for(let i=0;i<n;i+=32){x.fillStyle='rgba(110,105,95,.28)';x.fillRect(i,0,1,n);x.fillRect(0,i,n,1);}for(let i=0;i<800;i++){const g=180+rnd()*40;x.fillStyle=`rgba(${g|0},${(g*.96)|0},${(g*.88)|0},.25)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},256,2);
const roofTex=tex((x,n)=>{x.fillStyle='#7a848e';x.fillRect(0,0,n,n);for(let row=0;row<n;row+=16){const odd=((row/16)|0)%2;for(let col=odd?11:0;col<n;col+=22){x.fillStyle='#7e8792';x.fillRect(col+1,row+1,19,12);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(col+2,row+2,17,1);x.fillStyle='rgba(0,0,0,.42)';x.fillRect(col+1,row+11,19,2);x.fillStyle='rgba(0,0,0,.28)';x.fillRect(col+19,row+1,1,12);}x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,row+14,n,2);}},256,5);
roofTex.wrapS=roofTex.wrapT=THREE.RepeatWrapping;roofTex.repeat.set(5,3);roofTex.colorSpace=THREE.SRGBColorSpace;
const roofBump=tex((x,n)=>{x.fillStyle='#808080';x.fillRect(0,0,n,n);for(let row=0;row<n;row+=16){const odd=((row/16)|0)%2;for(let col=odd?11:0;col<n;col+=22){x.fillStyle='#b0b0b0';x.fillRect(col+1,row+1,19,10);x.fillStyle='#606060';x.fillRect(col+1,row+11,19,2);x.fillStyle='#505050';x.fillRect(col+19,row+1,1,12);}x.fillStyle='#404040';x.fillRect(0,row+14,n,2);}},256,5);
roofBump.wrapS=roofBump.wrapT=THREE.RepeatWrapping;roofBump.repeat.set(5,3);

// prem8 h2: concrete pavers (20x10 cm stretcher bond, 2 m tile) and larch decking (14 cm boards, 1.2 m tile), metre UVs
const PAVT=tex((x,n)=>{x.fillStyle='#8f8a82';x.fillRect(0,0,n,n);const bw=n/10,bh=n/20;for(let r=0;r<20;r++){const off=(r%2)*bw/2;for(let c=-1;c<11;c++){const t=rnd(),d=(rnd()-.5)*18;const C=t<.45?[192,186,174]:t<.8?[170,166,158]:[150,146,140];x.fillStyle=`rgb(${C[0]+d|0},${C[1]+d|0},${C[2]+d|0})`;x.fillRect(c*bw+off+1.5,r*bh+1.5,bw-3,bh-3);x.fillStyle='rgba(255,255,255,.10)';x.fillRect(c*bw+off+1.5,r*bh+1.5,bw-3,1);}}
  for(let i=0;i<2500;i++){x.fillStyle=`rgba(${rnd()<.5?0:255},${rnd()<.5?0:255},${rnd()<.5?0:255},.05)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},512,1);
const DECKT=tex((x,n)=>{const bh=n/8;for(let i=0;i<8;i++){const l=40+rnd()*10;x.fillStyle=`hsl(${25+rnd()*8},${38+rnd()*10}%,${l}%)`;x.fillRect(0,i*bh,n,bh);for(let k=0;k<18;k++){const gy=i*bh+2+rnd()*(bh-4);x.strokeStyle=`rgba(70,40,20,${.08+rnd()*.12})`;x.lineWidth=.8+rnd();x.beginPath();x.moveTo(0,gy);for(let xx=0;xx<=n;xx+=32)x.lineTo(xx,gy+Math.sin(xx*.02+k)*1.4);x.stroke();}
  x.fillStyle='rgba(25,15,8,.85)';x.fillRect(0,i*bh,n,3);const j=rnd()*n;x.fillRect(j,i*bh,2,bh);}},512,1);
const SLATT=tex((x,n)=>{const h=n/8;for(let i=0;i<8;i++){x.fillStyle='#3a3d41';x.fillRect(0,i*h,n,h);x.fillStyle='rgba(255,255,255,.07)';x.fillRect(0,i*h+2,n,2);x.fillStyle='#16181a';x.fillRect(0,i*h+h-6,n,6);}},256,1); // 8 horizontal slats per metre
const MESHT=tex((x,n)=>{x.clearRect(0,0,n,n);x.fillStyle='#2c2f33';for(let i=0;i<4;i++)x.fillRect(i*n/4,0,3,n);for(let j=0;j<2;j++)x.fillRect(0,j*n/2,n,3);},128,1); // 25x50 cm welded mesh / 1 m tile
const ASPT=tex((x,n)=>{x.fillStyle='#4b4d50';x.fillRect(0,0,n,n);for(let i=0;i<9000;i++){const g=50+rnd()*60;x.fillStyle=`rgba(${g|0},${g|0},${(g+3)|0},.55)`;x.fillRect(rnd()*n,rnd()*n,1.5,1.5);}},256,1); // 3 m tile
const std=(o)=>new THREE.MeshStandardMaterial(o);
const WTILE=tex((x,n)=>{x.fillStyle='#cfccc6';x.fillRect(0,0,n,n);const tw=n/2,th=n/4;for(let r=0;r<4;r++)for(let c=0;c<2;c++){const g=236+rnd()*10;x.fillStyle=`rgb(${g|0},${(g-2)|0},${(g-5)|0})`;x.fillRect(c*tw+2,r*th+2,tw-4,th-4);x.fillStyle='rgba(255,255,255,.35)';x.fillRect(c*tw+2,r*th+2,tw-4,2);}},512,1); // 60x30 cm wall tiles, 1.2 m tile
let FLATW=null,FLC=0;const FLATM=std({map:tex((x,n)=>{x.fillStyle='#c4c6c9';x.fillRect(0,0,n,n);for(let i=0;i<5000;i++){const g=150+rnd()*90;x.fillStyle=`rgba(${g|0},${g|0},${(g+4)|0},.5)`;x.fillRect(rnd()*n,rnd()*n,1.5,1.5);}},256,6),roughness:.95}); // flat roof: grey gravel/membrane
const CAPM=new THREE.MeshBasicMaterial({color:0x3a3d42,toneMapped:false}); // prem8: dark wall tops read clearly from above
const M={wall:std({color:0xf2ebe3,map:plaster,roughness:.9}),floor:std({map:wood,roughness:.55}),ceil:std({color:0xfaf6ef,roughness:1,emissive:0xd4c4a8,emissiveIntensity:.25}),
 glass:new THREE.MeshPhysicalMaterial({color:0xb4c6d4,transparent:true,opacity:.36,roughness:.03,metalness:0,ior:1.5,specularIntensity:1,envMapIntensity:1.9}),frame:std({color:0x2f3235,roughness:.45,metalness:.2}),wtile:std({map:WTILE,color:0xffffff,roughness:.25,metalness:0}),skirt:std({color:0xf4f2ee,roughness:.5}),base:std({color:0xb9b5ad,roughness:.9}),slat:std({map:SLATT,color:0xffffff,roughness:.6,metalness:.2}),mesh:std({map:MESHT,color:0xffffff,roughness:.6,alphaTest:.5,side:THREE.DoubleSide}),asph:std({map:ASPT,color:0xffffff,roughness:.95}),sill:std({color:0x9a9ea3,roughness:.35,metalness:.6}),board:std({color:0xf3f1ec,roughness:.5}),
 door:std({color:0xe4e0d8,roughness:.5}),roof:std({map:roofTex,bumpMap:roofBump,bumpScale:1.8,color:0x9aa3ab,roughness:.72,metalness:.05}),stair:std({map:wood,roughness:.5}),lawn:std({map:grass,roughness:1,color:0xa8b888}),ground:std({map:grass,roughness:1,color:0xc4d0a4}),
 fac:std({color:0xf7f5f0,map:plaster,roughness:.95}),wood2:std({color:0x9b7653,map:wood,roughness:.55}),fence:std({color:0x4a4a48,roughness:.75,metalness:.05}),path:std({map:PAVT,color:0xffffff,roughness:.92}),deck:std({map:DECKT,color:0xffffff,roughness:.7}),plinth:std({color:0x2f3135,roughness:.92}),
 tile:std({map:tile,roughness:.35}),beton:std({map:beton,roughness:.85}),fab:fabric};
// prem8 h: facade claddings (procedural, 512 px, mipmapped, metre-based UVs). T = metres one texture tile covers.
const FCT={};
FCT.wood=tex((x,n)=>{const bw=n/10;for(let i=0;i<10;i++){const h=24+rnd()*10,l=44+rnd()*8;x.fillStyle=`hsl(${h},${50+rnd()*12}%,${l}%)`;x.fillRect(i*bw,0,bw,n);
  for(let k=0;k<26;k++){const gx=i*bw+2+rnd()*(bw-4);x.strokeStyle=`rgba(${70+rnd()*30|0},${38+rnd()*20|0},20,${.10+rnd()*.14})`;x.lineWidth=.6+rnd()*1.4;x.beginPath();x.moveTo(gx,0);for(let y=0;y<=n;y+=32)x.lineTo(gx+Math.sin(y*.02+k)*1.6,y);x.stroke();}
  x.fillStyle='rgba(28,16,8,.82)';x.fillRect(i*bw,0,2.5,n);x.fillStyle='rgba(255,230,190,.18)';x.fillRect(i*bw+2.5,0,1.5,n);}},512,1);
FCT.stone=tex((x,n)=>{x.fillStyle='#4a4743';x.fillRect(0,0,n,n);let y=0;while(y<n){const h=Math.min(n-y,14+rnd()*30);let xx=-rnd()*60;while(xx<n){const w=40+rnd()*110,t=rnd();const c=t<.33?[150,140,126]:t<.66?[118,114,108]:[176,164,142];const d=(rnd()-.5)*34;
   x.fillStyle=`rgb(${c[0]+d|0},${c[1]+d|0},${c[2]+d|0})`;x.fillRect(xx+2,y+2,w-3,h-3);for(let k=0;k<6;k++){x.fillStyle=`rgba(${rnd()<.5?255:0},${rnd()<.5?255:0},${rnd()<.5?255:0},.05)`;x.fillRect(xx+2+rnd()*(w-6),y+2+rnd()*(h-6),3+rnd()*10,2+rnd()*4);}
   x.fillStyle='rgba(255,255,255,.12)';x.fillRect(xx+2,y+2,w-3,1.5);x.fillStyle='rgba(0,0,0,.22)';x.fillRect(xx+2,y+h-2.5,w-3,1.5);xx+=w;}
  y+=h;}
  // wrap seam: copy the first row band to the bottom so the tile repeats vertically
  },512,1);
FCT.dark=tex((x,n)=>{x.fillStyle='#34373b';x.fillRect(0,0,n,n);for(let i=0;i<n*n/90;i++){const g=44+rnd()*16;x.fillStyle=`rgba(${g},${g+2},${g+5},.35)`;x.fillRect(rnd()*n,rnd()*n,2,2);}
  const p=n/5;for(let i=0;i<5;i++){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(i*p,0,3,n);x.fillStyle='rgba(255,255,255,.10)';x.fillRect(i*p+3,0,2,n);x.fillStyle='rgba(255,255,255,.04)';x.fillRect(i*p+p/2-1,0,2,n);}},512,1);
const FCM={wood:{m:std({map:FCT.wood,roughness:.62,color:0xffffff}),T:1.2},stone:{m:std({map:FCT.stone,roughness:.93,color:0xffffff}),T:1.6},dark:{m:std({map:FCT.dark,roughness:.55,metalness:.25,color:0xffffff}),T:2.0}};
for(const k in FCM)FCM[k].m.map.repeat.set(1/FCM[k].T,1/FCM[k].T);
// composition per facade style: entrance zone, terrace zone, plinth
const FSTY={mix:{ent:'wood',ter:'dark',pl:'stone'},drevo:{ent:'wood',ter:'wood',pl:null},kamen:{ent:'stone',ter:'wood',pl:'stone'},kontrast:{ent:'dark',ter:'wood',pl:'stone'},omietka:{ent:null,ter:null,pl:null}};
let FGE=null,FZW=[],CELLS={};
// prem8 h9: real CC0 PBR maps (Poly Haven, 1k albedo + 512 normal/roughness) swapped in when loaded; procedural canvases stay as fallback.
// Metre UVs everywhere these are used, so repeat = 1 / tile size in metres.
{const TL=new THREE.TextureLoader(),pbr=(mats,id,T,dsz)=>{const ld=(k,sz,f)=>TL.load(`assets/cc0/tex/${id}_${k}_${sz}.jpg`,t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/T,1/T);t.anisotropy=TCH?2:8;f(t);mats.forEach(m=>m.needsUpdate=true);Object.keys(facDS).forEach(k=>delete facDS[k]);DIRTY=Math.max(DIRTY,30);});
  ld('diff',dsz||'1k',t=>{t.colorSpace=THREE.SRGBColorSpace;mats.forEach(m=>{m.map=t;m.color.set(0xffffff);});});ld('nor','512',t=>mats.forEach(m=>{m.normalMap=t;m.normalScale.set(.8,.8);}));ld('rough','512',t=>mats.forEach(m=>{m.roughnessMap=t;m.roughness=1;}));};
 pbr([FCM.wood.m],'clad_wood',1.2);pbr([FCM.stone.m],'stone_slate',1.8);pbr([M.path],'pavers',2.2);pbr([M.asph],'asphalt',4,'512');pbr([M.wtile],'ph/wtile',1.27);TL.load('assets/cc0/tex/plaster_nor_512.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.5,.5);[M.wall,M.fac].forEach(m=>{m.normalMap=t;m.normalScale.set(.3,.3);m.needsUpdate=true;});DIRTY=Math.max(DIRTY,30);});}const facDS={};const facGable=k=>facDS[k]||(facDS[k]=Object.assign(FCM[k].m.clone(),{side:THREE.DoubleSide}));const facArr={};function facMats(k,side){const key=k+side;if(!facArr[key]){const a=[M.wall,M.wall,M.wall,M.wall,M.wall,M.wall];a[side>0?4:5]=FCM[k].m;facArr[key]=a;}return facArr[key];}
function boxUV(g,ou=0,ov=0){const P=g.attributes.position,N=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<P.count;i++){const nx=Math.abs(N.getX(i)),ny=Math.abs(N.getY(i));const x=P.getX(i),y=P.getY(i),z=P.getZ(i);if(ny>.5)uv.setXY(i,x+ou,z+ov);else if(nx>.5)uv.setXY(i,z+ou,y+ov);else uv.setXY(i,x+ou,y+ov);}uv.needsUpdate=true;}
function metreUV(g,s0,s1,y0,y1,side){const uv=g.attributes.uv,fi=side>0?4:5;for(let v=fi*4;v<fi*4+4;v++){const u=uv.getX(v),t=uv.getY(v);uv.setXY(v,side>0?s0+u*(s1-s0):s1-u*(s1-s0),y0+t*(y1-y0));}uv.needsUpdate=true;}
if(M.roof.map)M.roof.map.repeat.set(6,6);if(M.lawn.map)M.lawn.map.repeat.set(.4,.4);if(M.path.map)M.path.map.repeat.set(.5,.5);M.wtile.map.repeat.set(1/1.2,1/1.2);M.slat.map.repeat.set(1,1);M.mesh.map.repeat.set(1,1);M.asph.map.repeat.set(1/3,1/3);M.deck.map.repeat.set(1/1.2,1/1.2);if(M.tile.map)M.tile.map.repeat.set(2,2);if(M.floor.map)M.floor.map.repeat.set(3,3);
// prem8 y: Quest budget. In a headset session: no per-room ceiling fill point lights (emissive discs stay), at most 4 night point lights,
// 1024 sun shadow map rendered only when the sun/scene changes (setHour drag already throttles), desktop untouched.
let XRL=false;function xrLean(on){XRL=!!on;if(!scene)return;let n=0;scene.traverse(o=>{if(!o.isPointLight)return;if(o.userData.ceil){o.visible=!on;return;}if(o.parent===nightG){n++;o.visible=!on||n<=4;}});
 const sm=on?1024:(TCH?1024:2048);if(sun&&sun.shadow.mapSize.x!==sm){sun.shadow.mapSize.set(sm,sm);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
 R.shadowMap.autoUpdate=!on;R.shadowMap.needsUpdate=true;DIRTY=Math.max(DIRTY,10);}
window.__xrLean=xrLean;
// prem8 z: identical materials (same type + params + textures + userData) are shared -> fewer GPU state changes / programs on Quest.
// Code that changes one object's material (roof fade) clones it first, so sharing is safe; custom-shader materials are left alone.
const MBASE=THREE.Material.prototype;function dedupMats(root){const C=new Map();let n=0,u=0;
 /* v20261117i FREEZE FIX: the key used to be material.toJSON() which serialised every texture image with canvas.toDataURL (~16 s per style switch on a 2k-texture house).
    Same key, textures referenced by uuid only. */
 const TXP=new Proxy({},{get:(t,k)=>typeof k==='string'?{uuid:k}:undefined,has:()=>true});
 /* same key as before (material.toJSON), but every texture is pre-registered in meta.textures via a proxy, so three never serialises the image (no toDataURL) */
 const key=m=>{if(m.onBeforeCompile!==MBASE.onBeforeCompile||m.customProgramCacheKey!==MBASE.customProgramCacheKey||m.isShaderMaterial)return null;let j;try{j=m.toJSON({textures:TXP,images:{},materials:{}});}catch(e){return null;}delete j.uuid;delete j.name;delete j.metadata;return m.type+JSON.stringify(j);};
 root.traverse(o=>{if(!o.isMesh||!o.material)return;const one=m=>{n++;const k=key(m);if(!k)return m;const h=C.get(k);if(h)return h;C.set(k,m);u++;return m;};o.material=Array.isArray(o.material)?o.material.map(one):one(o.material);});
 root.userData.mats={n,u};}
// prem8 h9: desktop post-processing = GTAO ambient occlusion + 4x MSAA target + OutputPass (ACES + sRGB). Off on touch devices,
// in the headset (R.xr.isPresenting) and with ?ao=0; window.__ao(false) toggles at runtime. Falls back to plain rendering until loaded / on error.
let PP=null,PPon=!TCH&&!/[?&]ao=0/.test(location.search),PPload=false;const _ps=new THREE.Vector2();
async function ppInit(){if(PPload)return;PPload=true;try{const[{EffectComposer},{RenderPass},{GTAOPass},{OutputPass}]=await Promise.all(['EffectComposer','RenderPass','GTAOPass','OutputPass'].map(n=>import(`three/addons/postprocessing/${n}.js`)));
  R.getSize(_ps);const rt=new THREE.WebGLRenderTarget(_ps.x*R.getPixelRatio(),_ps.y*R.getPixelRatio(),{type:THREE.HalfFloatType,samples:4});const c=new EffectComposer(R,rt);c.setPixelRatio(R.getPixelRatio());c.setSize(_ps.x,_ps.y);
  c.addPass(new RenderPass(scene,cam));const ao=new GTAOPass(scene,cam,_ps.x,_ps.y);ao.blendIntensity=.85;ao.updateGtaoMaterial({radius:.45,distanceExponent:1.4,thickness:1.2,scale:1,samples:12});ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:12});c.addPass(ao);c.addPass(new OutputPass());
  // subtle grade after tone mapping (display space): +4% contrast, +6% saturation, light vignette
  const{ShaderPass}=await import('three/addons/postprocessing/ShaderPass.js');c.addPass(new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 v=c.rgb;float l=dot(v,vec3(.2126,.7152,.0722));v=mix(vec3(l),v,1.06);v=(v-.5)*1.04+.5;vec2 d=vUv-.5;v*=1.-.16*dot(d,d)*2.;gl_FragColor=vec4(clamp(v,0.,1.),c.a);}'}));
  PP={c,w:_ps.x,h:_ps.y,pr:R.getPixelRatio()};DIRTY=Math.max(DIRTY,30);}catch(e){console.warn('postfx',e);PPon=false;}}
// sRGB backgrounds skip tone mapping when drawn straight to the canvas, but the composer's OutputPass tone-maps everything,
// which turned the sky grey-green. Fix: under the composer, swap in an inverse-ACES (three's fit, current exposure) linear copy of the sky.
const _iM=new THREE.Matrix3().set(0.59719,0.35458,0.04823,0.07600,0.90834,0.01566,0.02840,0.13383,0.83777).invert(),_oM=new THREE.Matrix3().set(1.60475,-0.53108,-0.07367,-0.10208,1.10813,-0.00605,-0.00327,-0.07276,1.07602).invert();
function invACES(r,g,b,ex){const v=new THREE.Vector3(Math.min(r,.985),Math.min(g,.985),Math.min(b,.985)).applyMatrix3(_oM);const f=y=>{y=Math.max(0,Math.min(.985,y));const A=1-.983729*y,B=.0245786-.432951*y,C=-.000090537-.238081*y;return(-B+Math.sqrt(B*B-4*A*C))/(2*A);};
 v.set(f(v.x),f(v.y),f(v.z)).applyMatrix3(_iM).multiplyScalar(.6/ex);return[Math.max(0,v.x),Math.max(0,v.y),Math.max(0,v.z)];}
const BGC=new Map();function bgComp(bg){if(R.toneMapping!==THREE.ACESFilmicToneMapping)return bg;const ex=R.toneMappingExposure;
 if(bg&&bg.isColor){const c=new THREE.Color().copy(bg).convertLinearToSRGB(),k='c'+c.getHexString()+ex;if(!BGC.has(k)){const l=new THREE.Color(0,0,0);const q=invACES(...new THREE.Color().copy(bg).toArray(),ex);BGC.set(k,l.setRGB(q[0],q[1],q[2]));}return BGC.get(k);}
 if(!bg||!bg.isTexture||!bg.image||!bg.image.getContext||bg.colorSpace!==THREE.SRGBColorSpace)return bg;const k=bg.uuid+'|'+bg.version+'|'+ex;if(BGC.has(k))return BGC.get(k);
 const cv=bg.image,w=cv.width,h=cv.height,d=cv.getContext('2d').getImageData(0,0,w,h).data,o=new Float32Array(w*h*4),tl=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,j=((h-1-y)*w+x)*4,q=invACES(tl(d[i]/255),tl(d[i+1]/255),tl(d[i+2]/255),ex);o[j]=q[0];o[j+1]=q[1];o[j+2]=q[2];o[j+3]=1;}
 const t=new THREE.DataTexture(o,w,h,THREE.RGBAFormat,THREE.FloatType);t.colorSpace=THREE.LinearSRGBColorSpace;t.mapping=bg.mapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;
 if(BGC.size>12){BGC.forEach(v=>v.dispose&&v.dispose());BGC.clear();}BGC.set(k,t);return t;}
// prem8 h10: HDRI sun (brightest upper-hemisphere texel) is rotated onto the actual sun light azimuth, so reflections/env light match the shadows.
let ENVPHI=null;function envSync(){if(ENVPHI==null||!sun||!scene.environmentRotation)return;const dx=sun.position.x-sun.target.position.x,dz=sun.position.z-sun.target.position.z;scene.environmentRotation.y=Math.atan2(dz,dx)-ENVPHI;}
function draw(){envSync();if(PPon&&!R.xr.isPresenting){if(!PP){ppInit();R.render(scene,cam);return;}R.getSize(_ps);const pr=R.getPixelRatio();if(_ps.x!==PP.w||_ps.y!==PP.h||pr!==PP.pr){PP.c.setPixelRatio(pr);PP.c.setSize(_ps.x,_ps.y);PP.w=_ps.x;PP.h=_ps.y;PP.pr=pr;}const bg=scene.background;scene.background=bgComp(bg);try{PP.c.render();}finally{scene.background=bg;}}else R.render(scene,cam);}
window.__ao=on=>{PPon=!!on;DIRTY=Math.max(DIRTY,30);};
export function perfInfo(){if(!R||!scene)return null;R.info.autoReset=false;R.info.reset();R.render(scene,cam);const i=R.info;let meshes=0,vis=0,inst=0,cast=0,lights=[],mats=new Set(),geos=new Set(),tris=0;
 scene.traverseVisible(o=>{if(o.isMesh){vis++;if(o.isInstancedMesh)inst++;if(o.castShadow)cast++;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m.uuid));geos.add(o.geometry.uuid);}if(o.isLight)lights.push(o.type+(o.castShadow?'*'+(o.shadow&&o.shadow.mapSize.x):''));});
 scene.traverse(o=>{if(o.isMesh)meshes++;});const r={calls:i.render.calls,tris:i.render.triangles,geoms:i.memory.geometries,tex:i.memory.textures,meshes,visMeshes:vis,instanced:inst,castShadow:cast,materials:mats.size,uniqueGeo:geos.size,lights,pr:R.getPixelRatio(),size:R.getSize(new THREE.Vector2()).toArray(),shadowAuto:R.shadowMap.autoUpdate};R.info.autoReset=true;return r;}
window.__perf=perfInfo;
export function init(){if(inited)return;inited=true;loadKit().then(()=>DIRTY=Math.max(DIRTY,60)).catch(()=>{});
 R=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});R.setPixelRatio(PRMAX=Math.min(devicePixelRatio,TCH?1.5:2));R.xr.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.22;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;$('v3').appendChild(R.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xc5d4e0);scene.fog=new THREE.FogExp2(0xc5d4e0,.012);
 new RGBELoader().load('assets/cc0/hdri/kloppenheim_06_puresky_1k.hdr',t=>{t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=t;try{const D=t.image.data,W=t.image.width,Hh=t.image.height,hf=D instanceof Uint16Array,rd=i=>hf?THREE.DataUtils.fromHalfFloat(D[i]):D[i];let bl=-1,bu=.5;for(let y=0;y<Hh*.5;y+=2)for(let x=0;x<W;x+=2){const i=(y*W+x)*4,l=rd(i)+rd(i+1)+rd(i+2);if(l>bl){bl=l;bu=(x+.5)/W;}}ENVPHI=(bu-.5)*Math.PI*2;}catch(e){}scene.environmentIntensity=1.05;
  // Clean gradient sky (no photographic strip) — HDRI used for lighting/reflections only
  const c=document.createElement('canvas');c.width=2;c.height=256;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#b7c8da');g.addColorStop(.4,'#d5e0ea');g.addColorStop(.7,'#e8eee8');g.addColorStop(1,'#f2f0e8');
  x.fillStyle=g;x.fillRect(0,0,2,256);const bt=new THREE.CanvasTexture(c);bt.colorSpace=THREE.SRGBColorSpace;bt.mapping=THREE.EquirectangularReflectionMapping;
  skyDay=bt;scene.background=bt;scene.backgroundBlurriness=0;scene.fog=new THREE.FogExp2(0xe4ebe0,.0048);DIRTY=Math.max(DIRTY,40);applyAtmo();});
 scene.add(hemiL=new THREE.HemisphereLight(0xfff0e0,0xb8a888,.95));sun=new THREE.DirectionalLight(0xffd9a0,3.1);sun.castShadow=true;const sm=TCH?1024:2048;sun.shadow.mapSize.set(sm,sm);sun.shadow.bias=-.00035;sun.shadow.normalBias=.028;sun.shadow.radius=3.5;scene.add(sun,sun.target);const fill=fillL=new THREE.DirectionalLight(0xfff0dd,0.7);fill.position.set(-8,10,6);scene.add(fill);
 const roofFill=roofFillL=new THREE.DirectionalLight(0xffe2b8,0.85);roofFill.position.set(6,18,-4);scene.add(roofFill);
 rig=new THREE.Group();cam=new THREE.PerspectiveCamera(55,1,.05,600);rig.add(cam);scene.add(rig);orb=new OrbitControls(cam,R.domElement);orb.enableDamping=true;orb.dampingFactor=.08;orb.maxPolarAngle=Math.PI*.49;orb.minDistance=2;orb.maxDistance=120;
 const g=new THREE.Mesh(new THREE.CircleGeometry(250,64).rotateX(-Math.PI/2),M.ground);grass.repeat.set(1,1);g.material.map=grass.clone();g.material.map.repeat.set(120,120);g.material.map.needsUpdate=true;g.position.y=-.03;g.receiveShadow=true;scene.add(g);
 // three's VRButton is never shown: without WebXR it would add an unlabelled 'WEBXR NOT AVAILABLE' link over our controls; with WebXR our own 'VR' mode button clicks it
 if(navigator.xr){const vb=VRButton.createButton(R);vb.id='VRButton';vb.style.display='none';vb.setAttribute('aria-hidden','true');document.body.appendChild(vb);}
 R.xr.addEventListener('sessionstart',()=>{setWalk(false,true);loco&&loco.init&&loco.init();xrLean(true);});R.xr.addEventListener('sessionend',()=>{xrLean(false);place(walk);});
 const el=R.domElement;let lk=null;el.addEventListener('pointerdown',e=>{intro=null;if(walk&&!R.xr.isPresenting)lk=[e.clientX,e.clientY];});addEventListener('pointerup',()=>lk=null);
 el.addEventListener('pointermove',e=>{if(!lk)return;yaw+=(e.clientX-lk[0])*.005;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lk[1])*.004));lk=[e.clientX,e.clientY];});
 el.addEventListener('wheel',()=>intro=null,{passive:true});
 addEventListener('keydown',e=>keys[e.code]=1);addEventListener('keyup',e=>keys[e.code]=0);
 bindJoy();
 R.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05),s=R.xr.getSession();if(!s&&(document.hidden||!$('vw').offsetWidth))return;if(wxObj)wxTick(dt,!!s);
  if(s&&loco)loco.update(dt,s.inputSources);else if(!s){if(walk)walkTick(dt);else{if(camPath)camPathTick(dt);else if(intro)introTick(dt);orb.update();}roofTweenTick(dt);if(sunTween)sunTweenTick(dt);if(wallGrow)wallGrowTick(dt);}
  if(!s){const k=cam.matrixWorld.elements.join()+rig.position.x+rig.position.z;if(k===LK&&DIRTY<=0&&!walk&&!camPath&&!sunTween&&!wallGrow&&!wxObj&&Math.abs(roofVis-roofTgt)<.01)return;if(k!==LK)DIRTY=Math.max(DIRTY,2);LK=k;DIRTY--;
   FT.push(dt);if(FT.length>90){const av=FT.reduce((a,b)=>a+b)/FT.length;FT=[];const pr=R.getPixelRatio();if(av>.028&&pr>1){R.setPixelRatio(Math.max(1,pr-.25));}else if(av<.014&&pr<PRMAX){R.setPixelRatio(Math.min(PRMAX,pr+.25));}}}
  draw();});
 new ResizeObserver(()=>{if(fixedSize)return;const r=$('v3').getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();DIRTY=Math.max(DIRTY,30);}).observe($('v3'));}
const ease=t=>1-Math.pow(1-t,3),easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function introTick(dt){intro.t=Math.min(1,intro.t+dt/2.2);const k=ease(intro.t);cam.position.lerpVectors(intro.a,intro.b,k);if(intro.t>=1)intro=null;}
let roofVis=1,roofTgt=1,sunTween=null,camPath=null,wallGrow=null,DOLL=false,doGrow=false,fixedSize=null;
function camPathTick(dt){if(!camPath)return;const P=camPath;if(!P.paused)P.t=Math.min(1,P.t+dt/(P.dur||8));const u=easeInOut(P.t);
 if(P.kind==='orbit'){const c=P.c,r=P.r,y=P.y,a0=P.a0,a1=P.a1,ang=a0+(a1-a0)*u;cam.position.set(c[0]+Math.cos(ang)*r,y,c[1]+Math.sin(ang)*r);orb.target.set(c[0],P.ty||1.2,c[1]);orb.update();}
 if(P.kind==='reveal')revealAt(P);
 else if(P.kind==='lerp'){cam.position.lerpVectors(P.a,P.b,u);orb.target.lerpVectors(P.ta,P.tb,u);orb.update();}
 else if(P.kind==='walk'){const s=sampleWalkPath(P,u);aimWalkCam(s.p,s.look);syncEntranceDoor(s.p);
  if(P.door&&dDep(P.door,s.p)>0.25&&!P._int){setInteriorViz();P._int=1;}}
 if(P.kind==='reveal'&&P.t>=1&&!P.hold){if(!P.paused)P.over=(P.over||0)+dt/(P.dur||12);return;}
 if(P.t>=1){if(P.loop&&P.kind==='orbit'){P.t=0;}else{const n=P.next;camPath=null;if(n)startCam(n);}}}

/** Distance from house bbox + vertical FOV + aspect so whole house fits with ~15% side margins,
 *  house in the middle third vertically (sky above, garden/path below). Three.js fov = vertical. */
function fitExteriorCam(fp, aspect, fovDeg, a0){
  const houseW=Math.max(1,fp[2]-fp[0]), houseD=Math.max(1,fp[3]-fp[1]);
  const wallH=2.85, roofH=Math.min(houseW,houseD)*.32*.55, houseH=wallH+roofH+.2;
  const cx=(fp[0]+fp[2])/2, cz=(fp[1]+fp[3])/2;
  const fov=(fovDeg||46)*Math.PI/180;
  const asp=Math.max(0.4, Math.min(2.6, aspect||1));
  const hFov=2*Math.atan(Math.tan(fov/2)*asp);
  // 3/4 apparent extents
  const apparentW=Math.hypot(houseW, houseD)*0.92;
  const apparentH=houseH*1.05;
  // portrait: prefer vertical middle-third sizing (distW alone pushes cam ~60m → speck)
  // landscape: ~15% side margins
  const port=asp<0.85;
  const sideMargin=port?0.06:0.15;
  const distW=(apparentW/2)/Math.tan(hFov*(1-2*sideMargin)/2);
  const vFrac=port?0.40:0.36;
  const distH=(apparentH/2)/Math.tan(fov*vFrac/2);
  let dist=port?Math.max(distH*1.55, distW*0.55):Math.max(distW, distH)*1.12;
  // mild look-down so sky + garden share the rest
  const elev=Math.atan2(apparentH*0.62, dist*0.9);
  const ty=houseH*0.28;
  const y=ty+Math.sin(elev)*dist;
  const r=Math.cos(elev)*dist;
  const ang=a0!=null?a0:-0.55;
  return{r,y,ty,fov:fovDeg||46,a0:ang,c:[cx,cz],houseH,dist};
}


/** Push point ≥minDist from wall faces (skip door openings / entrance corridor). */
function keepClearOfWalls(p, minDist=0.4, door){
  if(!H||!H.walls)return p;
  // Lock to door centre through the doorway so spline never clips the jambs
  if(door&&door.w){
    const half=Math.max(0.25, door.w*0.42);
    const dp=dDep(door,p);if(Math.abs(dLat(door,p))<=half+0.15 && dp>=-1.35 && dp<=1.6){
      dLat0(door,p); return p;
    }
  }
  let x=p.x, z=p.z;
  for(let iter=0;iter<5;iter++){
    let moved=false;
    for(const w of H.walls){
      const G=geo(w), L=G.L||1e-6, ux=G.u[0], uz=G.u[1];
      const s=Math.max(0,Math.min(L,(x-G.x0)*ux+(z-G.z0)*uz));
      const inDoor=(w.openings||[]).some(o=>o.type==='door'&&s>=o.offset-0.02&&s<=o.offset+o.width+0.02);
      if(inDoor)continue;
      const cx=G.x0+ux*s, cz=G.z0+uz*s;
      const nx=x-cx, nz=z-cz, dist=Math.hypot(nx,nz), need=(w.thickness||0.3)/2+minDist;
      if(dist<need && dist>1e-5){const k=(need-dist)/dist; x+=nx*k; z+=nz*k; moved=true;}
      else if(dist<=1e-5){x+=(-uz)*need; z+=ux*need; moved=true;}
    }
    if(!moved)break;
  }
  p.x=x; p.z=z; return p;
}
function syncEntranceDoor(p){
  if(!doorPivs||!doorPivs.length||!p)return;
  doorPivs.forEach(piv=>{
    const d=piv.userData.door; if(!d)return;
    const dist=Math.hypot(p.x-d.cx, p.z-d.cz);
    // Open by ~2.8 m so scrubbed stills near the door aren't a black leaf
    if(dist<2.8){d.u=1; piv.rotation.y=d.open;}
    else if(doorMode==='closed'&&dist>3.4){d.u=0; piv.rotation.y=d.closed;}
  });
}
function aimWalkCam(p,look){
  if(!cam||!orb)return;
  orb.enabled=false;
  cam.position.copy(p);
  cam.up.set(0,1,0);
  cam.lookAt(look);
  orb.target.copy(look);
  DIRTY=Math.max(DIRTY,4);
}
// prem8: door frame helpers (inward depth / lateral offset; default = entrance on the south facade)
const dDep=(D,p)=>(p.x-D.x)*(D.ix==null?0:D.ix)+(p.z-D.z)*(D.iz==null?1:D.iz),dLat=(D,p)=>(p.x-D.x)*(D.lx==null?1:D.lx)+(p.z-D.z)*(D.lz==null?0:D.lz);
const dLat0=(D,p)=>{const l=dLat(D,p);p.x-=l*(D.lx==null?1:D.lx);p.z-=l*(D.lz==null?0:D.lz);return p;};
function sampleWalkPath(P,u){
  const ee=t=>t*t*(3-2*t); const t=ee(Math.min(1,Math.max(0,u)));
  let p;
  if(P.curve){p=P.curve.getPoint(t);}
  else{const a=P.pts,n=a.length-1,x=t*n,i=Math.min(n-1,x|0),f=x-i;p=a[i].clone().lerp(a[i+1],ee(f));}
  p=keepClearOfWalls(p.clone(), P.clear||0.4, P.door);
  // Hard-lock lateral position on approach so door stays dead-centre in frame
  if(P.door && dDep(P.door,p) < 0.9){dLat0(P.door,p);}
  let look;
  if(P.looks&&P.looks.length>1){
    const x=t*(P.looks.length-1),i=Math.min(P.looks.length-2,x|0),f=x-i;
    look=P.looks[i].clone().lerp(P.looks[i+1],ee(f));
  }else if(P.look){look=P.look.clone();}
  else{look=p.clone(); look.y=1.45;}
  if(P.door && dDep(P.door,p) < 0.55){dLat0(P.door,look);}
  return{p,look};
}

const sstep=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
function revealAt(P){if(!world||!cam)return;const t=P.t,ov=P.over||0;
 // angle: eases in over first 30%, then constant angular speed (continues after t=1 so the orbit never stops abruptly)
 const g=t<0.3?t*t/(2*0.3):t-0.15, W=P.rot/0.85, ang=P.a0+W*(g+ov);
 const k=sstep(t/0.62), el=P.el0+(P.elE-P.el0)*k, d=P.d0+(P.dE-P.d0)*k, ty=P.ty0+(P.tyE-P.ty0)*k;
 cam.position.set(P.c[0]+Math.cos(ang)*Math.cos(el)*d, ty+Math.sin(el)*d, P.c[1]+Math.sin(ang)*Math.cos(el)*d);
 orb.target.set(P.c[0],ty,P.c[1]);cam.lookAt(orb.target);orb.update();
 // roof: small lift, then slides sideways off the house, stays opaque until fully clear, then fades
 const s=sstep((t-0.2)/0.4), lift=0.9*sstep(s*4), op=1-sstep((s-0.8)/0.2);
 world.traverse(o=>{if(o.userData.roof){if(!o.userData.roofP0)o.userData.roofP0=o.position.clone();const p0=o.userData.roofP0;o.position.set(p0.x+P.slide.x*P.slide.d*s,p0.y+lift,p0.z+P.slide.z*P.slide.d*s);
   if(o.material){if(!o.userData.roofMat){o.material=o.material.clone();o.userData.roofMat=1;}const tr=op<.999;o.material.transparent=tr;o.material.opacity=op;o.material.depthWrite=!tr;}o.visible=op>.01;}
  if(o.userData.cap)o.visible=s>0.05;if(o.userData.ceil)o.visible=false;});
 roofTgt=roofVis=op;DIRTY=Math.max(DIRTY,4);}
export function pauseCam(on){if(camPath){camPath.paused=on==null?!camPath.paused:!!on;}return camPath?camPath.paused:null;}
function startCam(o){DIRTY=Math.max(DIRTY,999);if(!world||!orb)return;orb.autoRotate=false;orb.enabled=!(o&&o.lock);
 const fp=world.userData.fp||[0,0,10,10],c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],S=Math.max(fp[2]-fp[0],fp[3]-fp[1],8);
 if(o.kind==='orbit'){setWalk(false);resetExterior();
  const asp=cam?cam.aspect:(innerWidth/Math.max(1,innerHeight));
  const port=asp<0.85; const fov0=port?42:46;
  const a0=o.a0!=null?o.a0:-0.55, fit=fitExteriorCam(fp, asp, o.fov||fov0, a0);
  if(cam){cam.fov=fit.fov;cam.updateProjectionMatrix();}
  const a1=o.a1!=null?o.a1:(Math.PI*2+a0),rr=o.r||fit.r,yy=o.y||fit.y,ty=o.ty!=null?o.ty:fit.ty;
  cam.position.set(c[0]+Math.cos(a0)*rr,yy,c[1]+Math.sin(a0)*rr);orb.target.set(c[0],ty,c[1]);orb.update();
  camPath={kind:'orbit',c,r:rr,y:yy,ty,a0,a1,t:0,dur:(o.dur||16)/(o.speed||1),loop:!!o.loop};}
 else if(o.kind==='dollhouse'){setWalk(false);setDollViz(true);
  if(cam){cam.fov=48;cam.updateProjectionMatrix();}
  // steeper top-down so kitchen/bath wells stay readable with full-height walls
  const b=new THREE.Vector3(c[0]-S*.12,S*1.25,c[1]+S*.42),tb=new THREE.Vector3(c[0],.15,c[1]);
  const a=b.clone().add(new THREE.Vector3(S*.03,S*.06,S*.04)),ta=tb.clone();
  cam.position.copy(b);orb.target.copy(tb);orb.update();
  camPath={kind:'lerp',a,b,ta,tb,t:0,dur:(o.dur||5)/(o.speed||1),next:o.next};}
 else if(o.kind==='walk'){setWalk(false);resetExterior();orb.enabled=false;rig.position.set(0,0,0);rig.rotation.set(0,0,0);if(cam){cam.fov=58;cam.updateProjectionMatrix();cam.up.set(0,1,0);}
  // prem8: works for an entrance on any facade — everything is laid out in the door frame (lateral, depth) and mapped to world
  const hcx=(fp[0]+fp[2])/2,hcz=(fp[1]+fp[3])/2;let door={x:fp[0]+1.7,z:fp[1],w:1.05,ix:0,iz:1,lx:1,lz:0};
  try{let found=0;(H.walls||[]).forEach(w=>{(w.openings||[]).forEach(op=>{if(found)return;if(op.kind==='entrance'||(op.type==='door'&&op.out&&op.kind!=='terrace')){const g=geo(w),m=op.offset+op.width/2,x=g.x0+g.u[0]*m,z=g.z0+g.u[1]*m;let ix=-g.u[1],iz=g.u[0];if(ix*(hcx-x)+iz*(hcz-z)<0){ix=-ix;iz=-iz;}door={x,z,w:op.width||1.05,ix,iz,lx:iz,lz:-ix};if(op.kind==='entrance')found=1;}});});}catch(e){}
  const D=door,W=(l,y,d)=>new THREE.Vector3(D.x+D.lx*l+D.ix*d,y,D.z+D.lz*l+D.iz*d);
  const y=1.6;let edge=5;if(H.plot&&H.plot.pts){const P=H.plot.pts;edge=Math.max(...P.map(q=>-((q[0]-D.x)*D.ix+(q[1]-D.z)*D.iz)));}
  const gate=-Math.max(edge+2.5,10);
  // into the hall, then through the interior door that leads to the living room (room kinds from furniture)
  const RK=roomKinds[(H.levels&&H.levels[0]&&H.levels[0].name)||'1NP'];const hall=W(0.15,y,1.3);let via=null,best=1e9;
  (H.walls||[]).forEach(w=>{(w.openings||[]).forEach(op=>{if(op.type!=='door'||op.kind==='entrance'||op.kind==='terrace'||op.out)return;const g=geo(w),m=op.offset+op.width/2,x=g.x0+g.u[0]*m,z=g.z0+g.u[1]*m;
   for(const sg of[1,-1]){const nx=-g.u[1]*sg,nz=g.u[0]*sg,fx=x+nx*.9,fz=z+nz*.9,bx=x-nx*.9,bz=z-nz*.9;const k=RK?RK.kindOf[RK.labelAt(fx,fz)]:null,kb=RK?RK.kindOf[RK.labelAt(bx,bz)]:null;
    if(k!=='living'||kb==='living')continue;const dd=Math.hypot(bx-hall.x,bz-hall.z);if(dd<best&&dd<6){best=dd;via={x,z,nx,nz};}}});});
  const raw=[W(0,y,gate),W(0,y,-6),W(0,y,-3.6),W(0,y,-1.9),W(0,y,-.7),W(0,y,.2),W(0,y,1.15)];const looks=[W(0,1.55,0),W(0,1.55,0),W(0,1.52,0),W(0,1.5,.15),W(0,1.48,1.4)];
  // living-room centroid (cells whose furniture says 'living')
  let lcx=0,lcz=0,ln=0;if(RK)for(let x=fp[0]+.3;x<fp[2];x+=.3)for(let z=fp[1]+.3;z<fp[3];z+=.3){if(RK.kindOf[RK.labelAt(x,z)]==='living'){lcx+=x;lcz+=z;ln++;}}
  if(via){const V=(k,yy)=>new THREE.Vector3(via.x+via.nx*k,yy,via.z+via.nz*k);const a=V(.6,y);
   const lc=ln?new THREE.Vector3(lcx/ln,y,lcz/ln):V(3,y),b=a.clone().lerp(lc,.5),c=a.clone().lerp(lc,.8),far=a.clone().lerp(lc,1.9);
   raw.push(V(-1.0,y),V(-.35,y),a,b);looks.push(V(0,1.45),V(1.2,1.42),new THREE.Vector3(c.x,1.4,c.z),new THREE.Vector3(lc.x,1.36,lc.z),new THREE.Vector3(far.x,1.32,far.z));}
  else{raw.push(W(.15,y,2.7),W(.6,y,4.2));looks.push(W(.35,1.45,2.8),W(.5,1.4,4.4),W(.6,1.38,5.6),W(.6,1.35,7),W(.6,1.32,8.2));}
  const pts=raw.map(p=>keepClearOfWalls(p,0.4,door));
  for(const p of pts){const dp=dDep(door,p);if(dp>=-1.4&&dp<=1.5)dLat0(door,p);}
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',0.45);
  camPath={kind:'walk',pts,looks,curve,clear:0.4,door,t:0,dur:(o.dur||14)/(o.speed||1),_int:0,paused:!!o.pause};
  if(o.at!=null){camPath.t=Math.min(1,Math.max(0,+o.at));}
  {const s=sampleWalkPath(camPath,camPath.t);aimWalkCam(s.p,s.look);syncEntranceDoor(s.p);
   const dp=dDep(door,s.p);if(dp>0.25){setInteriorViz();camPath._int=1;}
   else if(doorMode==='closed'&&dp<-3.2){doorPivs.forEach(p=>{const d=p.userData.door;if(!d)return;d.u=0;p.rotation.y=d.closed;});}
  }
  DIRTY=Math.max(DIRTY,60);}
 else if(o.kind==='interior'){setWalk(false);setInteriorViz();
  if(cam){cam.fov=70;cam.updateProjectionMatrix();}
  const ix=o.x!=null?o.x:4.2,iz=o.z!=null?o.z:8.4,tx=o.tx!=null?o.tx:6.0,tz=o.tz!=null?o.tz:5.1;
  rig.position.set(0,0,0);rig.rotation.set(0,0,0);
  cam.position.set(ix,1.55,iz);orb.target.set(tx,1.15,tz);orb.enabled=true;orb.update();
  camPath=null;DIRTY=Math.max(DIRTY,90);}
 else if(o.kind==='descend'){setWalk(false);setDollViz(true);
  const rooms=(H.furn||[]).slice(0,6).map(f=>new THREE.Vector3(f.p[0],S*1.2,f.p[1]));
  if(!rooms.length)rooms.push(new THREE.Vector3(c[0],S*1.2,c[1]));
  const pts=[new THREE.Vector3(c[0],S*1.9,c[1]+S*.4),...rooms];
  camPath={kind:'walk',pts,t:0,dur:(o.dur||12)/(o.speed||1)};}
 else if(o.kind==='reveal'){setWalk(false);resetExterior();
  // prem8: one deterministic path (scrub-safe): 3/4 exterior -> rise while the opaque roof slides off sideways -> slow orbit framing the whole furnished house
  const asp=cam?cam.aspect:(innerWidth/Math.max(1,innerHeight));
  const port=asp<0.85; const fov0=port?42:46;
  const a0=-0.55, fit=fitExteriorCam(fp, asp, fov0, a0);
  if(cam){cam.fov=fit.fov;cam.updateProjectionMatrix();}
  const vf=fit.fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*asp),W=fp[2]-fp[0],D=fp[3]-fp[1];
  const Rr=Math.hypot(W,D)/2+0.7, dE=Rr/Math.sin(Math.min(vf,hf)/2)*(port?0.9:0.95);
  const el0=port?Math.max(0.36,Math.atan2(fit.y-fit.ty,fit.r)):Math.atan2(fit.y-fit.ty,fit.r), dW=(Math.hypot(W,D)*0.92/2)/Math.tan(hf*0.9/2), d0=Math.max(Math.hypot(fit.y-fit.ty,fit.r), port?dW*0.97:0);
  // roof slides along the camera's right-hand side so the viewer sees it move off the house
  const rx=-Math.sin(a0),rz=Math.cos(a0);
  if(world)world.traverse(m=>{if(m.userData.roof){if(!m.userData.roofP0)m.userData.roofP0=m.position.clone();m.position.copy(m.userData.roofP0);}});
  roofTgt=1;roofVis=1;
  if(typeof fitSun==='function'&&lastFp)fitSun(lastFp);
  DIRTY=Math.max(DIRTY,120);
  camPath={kind:'reveal',c,a0,el0,d0,ty0:fit.ty,elE:port?1.08:0.95,dE,tyE:0.3,rot:1.25,slide:{x:rx,z:rz,d:Math.max(W,D)+8},t:0,over:0,hold:!!o.hold,dur:(o.dur||12)/(o.speed||1),paused:!!o.pause};
  revealAt(camPath);}
 DIRTY=Math.max(DIRTY,999);}
function roofTweenTick(dt){if(Math.abs(roofVis-roofTgt)<.01){if(roofVis!==roofTgt){roofVis=roofTgt;DIRTY=Math.max(DIRTY,8);}return;}roofVis+=(roofTgt-roofVis)*Math.min(1,dt*2.2);DIRTY=Math.max(DIRTY,8);
 if(!world)return;world.traverse(o=>{if(o.userData.roof&&o.material){if(!o.userData.roofMat){o.material=o.material.clone();o.userData.roofMat=1;}o.material.transparent=true;o.material.depthWrite=roofVis>.9;o.material.opacity=roofVis;o.visible=roofVis>.02;}});}
function sunTweenTick(dt){if(!sunTween)return;sunTween.t=Math.min(1,sunTween.t+dt/(sunTween.dur||1.6));const k=easeInOut(sunTween.t);sunH=sunTween.a+(sunTween.b-sunTween.a)*k;if(lastFp)fitSun(lastFp);DIRTY=Math.max(DIRTY,10);if(sunTween.t>=1)sunTween=null;}
function wallGrowTick(dt){if(!wallGrow)return;wallGrow.t=Math.min(1,wallGrow.t+dt/(wallGrow.dur||2.8));const k=ease(wallGrow.t);DIRTY=Math.max(DIRTY,12);
 if(world)world.traverse(o=>{if(o.userData.grow){o.scale.y=Math.max(.001,k);o.position.y=o.userData.growBase+o.userData.growH*k*.5;o.visible=k>.01;}});
 if(wallGrow.t>=1)wallGrow=null;}
function finishGrow(){wallGrow=null;if(!world)return;world.traverse(o=>{if(!o.isMesh)return;
  if(o.userData.grow){o.scale.y=1;o.position.y=o.userData.growBase+o.userData.growH*.5;o.visible=true;}
  else if(o.scale&&o.scale.y<0.999&&o.userData.growH!=null){o.scale.y=1;o.position.y=o.userData.growBase+o.userData.growH*.5;o.visible=true;}
 });}

// prem10 STOREY PICKER (Bez strechy): LVCUT=null shows everything; k = storey index that becomes the top cut. Storeys above k are hidden,
// storeys below k are drawn as a light ghost (so the picked floor never floats), garden/plot stay normal. Tags are computed once per build from each object's lowest point.
let LVCUT=null,GHOST=null;
function tagLv(){if(!world||!H||world.userData.lvTag)return;world.userData.lvTag=1;const E=H.levels.map(l=>l.elevation||0),fp=world.userData.fp||(world.children[0]&&world.children[0].userData.fp),bb=new THREE.Box3();
 const tagOne=o=>{if(o.userData.lvJ!=null){o.userData.lv=o.userData.lvJ;}else{bb.setFromObject(o);const y=isFinite(bb.min.y)?bb.min.y:o.position.y;let k=0;E.forEach((e,i)=>{if(y>=e-.06)k=i;});o.userData.lv=k;}
  if(fp){bb.setFromObject(o);o.userData.inH=isFinite(bb.min.x)&&bb.max.x>fp[0]-.4&&bb.min.x<fp[2]+.4&&bb.max.z>fp[1]-.4&&bb.min.z<fp[3]+.4&&(bb.max.x-bb.min.x)<(fp[2]-fp[0])+3;}};
 const kids=o=>o.children.forEach(c=>{if(c.isGroup&&!c.userData.furn&&!c.userData.doorLeaf&&c.children.length>12&&c.userData.lvJ==null)kids(c);else tagOne(c);});kids(world);}
function applyCut(){if(!world)return;const on=DOLL&&LVCUT!=null&&H&&H.levels&&H.levels.length>1;if(on)tagLv();
 world.traverse(o=>{if(o.userData.cutHid){o.visible=true;o.userData.cutHid=0;}if(o.userData.m0){o.material=o.userData.m0;o.userData.m0=null;}});
 if(!on)return;if(!GHOST)GHOST=new THREE.MeshBasicMaterial({color:0xe6e0d8,transparent:true,opacity:.32,depthWrite:false});
 world.traverse(o=>{const lv=o.userData.lv;if(lv==null)return;if(lv>LVCUT){if(o.visible){o.visible=false;o.userData.cutHid=1;}}else if(lv<LVCUT&&o.userData.inH){o.traverse(x=>{if(x.isMesh&&!x.userData.m0){x.userData.m0=x.material;x.material=GHOST;}});}});if(GREY)applyGrey();DIRTY=Math.max(DIRTY,90);}
export function setLevelCut(k){LVCUT=(k==null||k<0||!H||!H.levels||k>=H.levels.length)?null:k;applyCut();return LVCUT;}
export function getLevelCut(){return LVCUT;}
function resetExterior(){finishGrow();DOLL=false;roofTgt=(roof==='none')?0:1;roofVis=roofTgt;if(!world)return;applyCut();
 world.traverse(o=>{if(o.userData.roofP0)o.position.copy(o.userData.roofP0);if(o.userData.roof){o.visible=roof!=='none';if(o.material&&o.userData.roofMat){o.material.opacity=1;o.material.transparent=false;o.material.depthWrite=true;}}
  if(o.userData.ceil)o.visible=false;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=false;
  if(o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;}if(o.userData.doorLeaf)o.scale.y=1;
 });if(GREY)applyGrey();DIRTY=Math.max(DIRTY,90);}
function setDollViz(on){finishGrow();DOLL=!!on;roofTgt=on?0:1;roofVis=on?0:1;if(!world)return;
 // Adam: dollhouse keeps FULL-HEIGHT walls; only roof + ceilings removed
 world.traverse(o=>{if(o.userData.roofP0)o.position.copy(o.userData.roofP0);if(o.userData.roof){if(o.material&&!o.userData.roofMat){o.material=o.material.clone();o.userData.roofMat=1;}if(o.material){o.material.transparent=true;o.material.opacity=on?0:1;o.material.depthWrite=!on;}o.visible=!on;}
  if(o.userData.ceil)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=false;
  if(o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;}
  if(o.userData.doorLeaf)o.scale.y=1;
  if(o.userData.cap)o.visible=!!on; // prem8: dark wall tops in dollhouse
 });if(GREY)applyGrey();DIRTY=Math.max(DIRTY,90);}
/** Full-height walls + ceilings for interior/walk (never keep dollhouse cut). */
function setInteriorViz(){finishGrow();DOLL=false;roofTgt=0;roofVis=0;if(!world)return;
 world.traverse(o=>{if(o.userData.roofP0)o.position.copy(o.userData.roofP0);
  if(o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;}
  if(o.userData.doorLeaf)o.scale.y=1;
  if(o.userData.roof){o.visible=false;if(o.material&&o.userData.roofMat){o.material.opacity=0;o.material.transparent=true;o.material.depthWrite=false;}}
  if(o.userData.ceil)o.visible=true;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=true;
 });if(GREY)applyGrey();DIRTY=Math.max(DIRTY,90);}

export function playCam(kind,speed=1,extra={}){startCam({kind,speed,...extra});}
/** Steep top-down over a room centre for marketing room crops. */
export function birdCam(x,z,h=9.5){[x,z]=srP([x,z]);
  setWalk(false); setDollViz(true);
  if(cam){cam.fov=50;cam.updateProjectionMatrix();cam.up.set(0,0,-1);}
  orb.enabled=false; rig.position.set(0,0,0); rig.rotation.set(0,0,0);
  cam.position.set(x,h,z+0.02); orb.target.set(x,0.02,z); cam.lookAt(x,0.02,z);
  cam.updateMatrixWorld(true);
  camPath=null; DIRTY=Math.max(DIRTY,120);
}

export function scrubCam(u){if(!camPath)return;camPath.t=Math.min(1,Math.max(0,+u));camPath.over=0;
  if(camPath.kind==='walk'){const s=sampleWalkPath(camPath,camPath.t);aimWalkCam(s.p,s.look);syncEntranceDoor(s.p);
    if(camPath.door&&dDep(camPath.door,s.p)>0.25){if(!camPath._int){setInteriorViz();camPath._int=1;}}
    else if(camPath._int&&camPath.door&&dDep(camPath.door,s.p)<=0.15){resetExterior();camPath._int=0;}}
  else if(camPath.kind==='orbit'){const P=camPath,ang=P.a0+(P.a1-P.a0)*P.t;cam.position.set(P.c[0]+Math.cos(ang)*P.r,P.y,P.c[1]+Math.sin(ang)*P.r);orb.target.set(P.c[0],P.ty||1.2,P.c[1]);orb.update();}
  else camPathTick(0);DIRTY=Math.max(DIRTY,60);}
export function dollhouse(on){DIRTY=Math.max(DIRTY,180);if(!world)return;setWalk(false);
 if(on){setDollViz(true);startCam({kind:'dollhouse',dur:3.2,speed:1});}
 else{resetExterior();place(false,false);}
}

function deckStayY(p,pad=.12){if((globalThis.__PF||{}).noDeckStay||!DECKS||!DECKS.length)return null;for(const d of DECKS){if(p.x>=d[1]-pad&&p.x<=d[3]+pad&&p.z>=d[2]-pad&&p.z<=d[4]+pad){const y=d.length>5?d[5]:null;if(y!=null&&p.y>y-.9)return y;}}return null;}
function snapWalkY(p){const hold=deckStayY(p);const y=body&&body.floor?body.floor(p):null;if((globalThis.__PF||{}).noDeckStay)return y;if(hold!=null)return hold;if(y!=null&&y<p.y-1)return p.y;return y;}
function walkTick(dt){if(fly){const cancel=keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown||joy[0]||joy[1];if(cancel)fly=null;else{flyTick(dt);if(window.__onWalk)window.__onWalk(hereInfo());return;}}
 let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy[1],r=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy[0];
 if(keys.ArrowLeft)yaw-=dt*1.8;if(keys.ArrowRight)yaw+=dt*1.8;const sp=1.6*dt*(keys.ShiftLeft?2:1),p=rig.position;
 if(f||r){p.x+=(Math.sin(yaw)*f+Math.cos(yaw)*r)*sp;p.z+=(-Math.cos(yaw)*f+Math.sin(yaw)*r)*sp;if(body)body.resolve(p);}
 if(body){const y=snapWalkY(p);if(y!==null)p.y=y;}cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));if(window.__onWalk)window.__onWalk(hereInfo());}
function cells(ws,stairsHole){const C=.1;let xs=[],zs=[];ws.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});const x0=Math.min(...xs)-.5,z0=Math.min(...zs)-.5,
 nx=Math.ceil((Math.max(...xs)+.5-x0)/C),nz=Math.ceil((Math.max(...zs)+.5-z0)/C),g=new Uint8Array(nx*nz);
 ws.forEach(w=>{const G=geo(w),n=Math.ceil(G.L/(C/2)),t=w.thickness/2+.06;for(let i=0;i<=n;i++){const s=i*G.L/n;for(let k=-t;k<=t;k+=C/2){const x=G.x0+G.u[0]*s-G.u[1]*k,z=G.z0+G.u[1]*s+G.u[0]*k,ix=((x-x0)/C)|0,iz=((z-z0)/C)|0;if(ix>=0&&iz>=0&&ix<nx&&iz<nz)g[iz*nx+ix]=1;}}});
 const q=[0];g[0]=2;while(q.length){const i=q.pop(),x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!g[j]){g[j]=2;q.push(j);}}}
 // prem8: label each enclosed room (4-connected interior component) so floors can follow room type
 const lab=new Int32Array(nx*nz);let nl=0;for(let i0=0;i0<nx*nz;i0++){if(g[i0]||lab[i0])continue;nl++;const st=[i0];lab[i0]=nl;while(st.length){const i=st.pop(),x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!g[j]&&!lab[j]){lab[j]=nl;st.push(j);}}}}
 /* v20261117s RULE: wall / door-threshold cells take the label of the NEAREST room (multi-source BFS, max 3 cells) instead of the room left of them in the scan row -
    a wet/kitchen floor used to run through the whole wall and door opening into the next room or corridor. The material edge now sits on the wall centre / door line. audit: floor-spill */
  const LL=Int32Array.from(lab);{let fr=[];for(let i=0;i<nx*nz;i++)if(lab[i]&&!g[i])fr.push(i);for(let d=0;d<3&&fr.length;d++){const nf=[];for(const i of fr){const x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!LL[j]&&g[j]!==2){LL[j]=LL[i];nf.push(j);}}}fr=nf;}}
  const labelAt=(px,pz)=>{const ix=((px-x0)/C)|0,iz=((pz-z0)/C)|0;if(ix<0||iz<0||ix>=nx||iz>=nz)return 0;let L=lab[iz*nx+ix];if(L)return L;for(let r=1;r<4&&!L;r++)for(let dz=-r;dz<=r&&!L;dz++)for(let dx=-r;dx<=r&&!L;dx++){const X=ix+dx,Z=iz+dz;if(X>=0&&Z>=0&&X<nx&&Z<nz)L=lab[Z*nx+X];}return L;};
 const rects=[];for(let z=0;z<nz;z++){let s=-1,sl=0;for(let x=0;x<=nx;x++){const cx0=x0+x*C+C/2,cz=z0+z*C+C/2;const inH=stairsHole&&stairsHole.some(h=>cx0>h[0]&&cx0<h[2]&&cz>h[1]&&cz<h[3]);const v=x<nx&&g[z*nx+x]!==2&&!inH;const L=v?(LL[z*nx+x]||sl):0;
  if(s>=0&&(!v||(L&&L!==sl))){rects.push([x0+s*C,z0+z*C,x0+x*C,z0+(z+1)*C,sl]);s=-1;}if(v&&s<0){s=x;sl=L;}else if(v&&!sl&&L)sl=L;}}
 const out=[];rects.forEach(r=>{const p=out.find(o=>o[0]===r[0]&&o[2]===r[2]&&o[4]===r[4]&&Math.abs(o[3]-r[1])<1e-6);if(p)p[3]=r[3];else out.push(r);});out.labelAt=labelAt;return out;}
// prem8: room-typed floor textures (procedural, tiny canvases; cached)
const FLT={};function floorTex(kind){if(FLT[kind])return FLT[kind];let t;
 if(kind==='herring')t=tex((x,n)=>{x.fillStyle='#d6c09c';x.fillRect(0,0,n,n);const u=n/8;for(let r=-8;r<16;r++)for(let c=0;c<8;c++){const l=200+rnd()*28;x.save();x.translate(c*u*2,r*u+c*u);x.rotate(Math.PI/4*((c%2)?1:-1));x.fillStyle=`rgb(${l|0},${(l*.86)|0},${(l*.66)|0})`;x.fillRect(0,0,u*2.2,u*.72);x.strokeStyle='rgba(95,62,30,.38)';x.lineWidth=1.2;x.strokeRect(0,0,u*2.2,u*.72);x.restore();}},256,2);
 else if(kind==='birch')t=tex((x,n)=>{for(let i=0;i<10;i++){const l=222+rnd()*18;x.fillStyle=`rgb(${l|0},${(l*.9)|0},${(l*.76)|0})`;x.fillRect(0,i*n/10,n,n/10+1);x.fillStyle='rgba(120,90,50,.28)';x.fillRect(0,i*n/10,n,1.5);const o=rnd()*n;x.fillRect(o,i*n/10,1.5,n/10);}for(let i=0;i<300;i++){x.fillStyle=`rgba(140,100,60,${rnd()*.07})`;x.fillRect(rnd()*n,rnd()*n,2+rnd()*30,1);}},256,2);
 else if(kind==='wet')t=tex((x,n)=>{x.fillStyle='#b9bcbd';x.fillRect(0,0,n,n);for(let i=0;i<900;i++){const v=165+rnd()*45;x.fillStyle=`rgba(${v|0},${v|0},${(v+3)|0},.35)`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,1+rnd()*2);}x.strokeStyle='#8e9192';x.lineWidth=2;const g=n/4;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*g,0);x.lineTo(i*g,n);x.stroke();}for(let i=0;i<=2;i++){x.beginPath();x.moveTo(0,i*n/2);x.lineTo(n,i*n/2);x.stroke();}},128,2);
 else if(kind==='stone')t=tex((x,n)=>{x.fillStyle='#a49d92';x.fillRect(0,0,n,n);for(let i=0;i<1400;i++){const v=140+rnd()*55;x.fillStyle=`rgba(${v|0},${(v*.96)|0},${(v*.9)|0},.3)`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*3,1+rnd()*2);}x.strokeStyle='#7d776d';x.lineWidth=2;for(let i=0;i<=2;i++){x.beginPath();x.moveTo(i*n/2,0);x.lineTo(i*n/2,n);x.stroke();x.beginPath();x.moveTo(0,i*n/2);x.lineTo(n,i*n/2);x.stroke();}},128,2);
 else if(kind==='kitchen')t=tex((x,n)=>{x.fillStyle='#8e8a84';x.fillRect(0,0,n,n);for(let i=0;i<1400;i++){const v=115+rnd()*50;x.fillStyle=`rgba(${v|0},${v|0},${(v*.97)|0},.3)`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,1+rnd()*2);}x.strokeStyle='#6c6964';x.lineWidth=2;for(let i=0;i<=2;i++){x.beginPath();x.moveTo(i*n/2,0);x.lineTo(i*n/2,n);x.stroke();}x.beginPath();x.moveTo(0,0);x.lineTo(n,0);x.stroke();},128,2);
 else t=wood;
 return FLT[kind]=t;}
// kind -> [tint, texture, metres per texture repeat]
const ROOMFLOOR={living:[0xd2bea0,'oak',1.8],bed:[0xffffff,'herring',2.2],kids:[0xffffff,'birch',2.0],wet:[0xffffff,'wet',1.2],hall:[0xffffff,'stone',1.2],kitchen:[0xffffff,'kitchen',1.2],other:[0xd2bea0,'oak',1.8]};
const REALFLOOR={living:['floor_oak_diff_1k',1.2,0xffffff],other:['floor_oak_diff_1k',1.2,0xffffff],kids:['floor_oak_diff_1k',1.2,0xfff4e6],bed:['floor_herring_diff_1k',3.4,0xffffff],
 wet:['floor_tile_light_diff_1k',2.2,0xffffff],kitchen:['floor_tile_light_diff_1k',2.2,0xffffff],hall:['floor_tile_mid_diff_1k',2.2,0xffffff]};
if(typeof window!=='undefined')window.__vkDirty=()=>{DIRTY=Math.max(DIRTY,30);};
const FTX={};function floorTexLoad(id,cb){let e=FTX[id];if(!e){e=FTX[id]={t:null,q:[]};new THREE.TextureLoader().load(`assets/cc0/tex/${id}.jpg`,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=TCH?2:8;e.t=t;e.q.forEach(f=>f(t));e.q=[];});}
 if(e.t)cb(e.t);else e.q.push(cb);}
const RUGC={living:'#5d6872',bed:'#b08a7c',kids:'#8fa3b4'};
function roomKind(types){const has=t=>types.has(t);
 const kit=has('kitch')||has('fridge')||has('island');
 if(has('bath')||has('shower')||has('wc')||(has('sink')&&!kit&&!has('sofa')))return'wet';
 if(has('bed'))return'bed';if(has('bed1')||has('bunk')||has('toy'))return'kids';
 if(has('sofa')||has('tv')||has('table'))return'living';
 if(has('kitch')||has('fridge')||has('island'))return'kitchen';
 if(has('shoe')||has('coat')||has('bench')||has('runner'))return'hall';return'other';}
function build(){KCH={};const root=new THREE.Group(),lv={};H.levels.forEach(l=>lv[l.name]=l);let xs=[],zs=[];doorPivs=[];
 const Rroof=(H&&H.roof)||roof; if(Rroof&&Rroof!==roof) roof=Rroof;
 /* v20261117g RULE (flat roofs): every gravel/membrane slab gets world-space UVs (no per-piece stretching), so overlapping slab pieces render one identical
   surface (no visible z-fight, no hairline steps); sky-exposed roof slabs are not lightmapped (live light only). audit: coplanar-overlap */
const add=(geom,mat,x,y,z,ry=0,nc)=>{if(mat===FLATM){if(!FLATW){FLATW=FLATM.clone();FLATW.map=FLATM.map.clone();FLATW.map.repeat.set(.5,.5);FLATW.map.needsUpdate=true;FLATW.color.set(0xa4a8ae);FLATW.userData.flatw=1;}boxUV(geom,x,z);mat=FLATW;}const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=mat!==M.glass;if(nc)m.userData.noCol=true;root.add(m);return m;};
 FGE=null;CELLS={};for(const k of Object.keys(_dc))delete _dc[k];const FS=FSTY[(H.mat&&H.mat.fasada)||'mix']||FSTY.mix,FZ=new Map();
 // accent zones on exterior walls: around the entrance door (ent) and around terrace / sliding doors (ter); slivers < 0.6 m snap to the wall end
 H.walls.forEach(w=>{if(!w._ext)return;const L=geo(w).L,Z=[];[...(w.openings||[])].sort((p,q)=>(q.kind==='entrance')-(p.kind==='entrance')).forEach(o=>{const c=o.offset+o.width/2;let k=null,r=0;
   if(o.type==='door'&&(o.kind==='entrance'||(o.out&&o.kind!=='sliding'&&o.kind!=='terrace'))){k=FS.ent;r=Math.max(1.4,o.width/2+.9);}
   else if(o.kind==='terrace'||o.kind==='sliding'){k=FS.ter;r=o.width/2+1.1;}
   if(!k)return;let a=Math.max(0,c-r),b=Math.min(L,c+r);if(a<.6)a=0;if(L-b<.6)b=L;for(const z of Z){if(a<z[1]&&b>z[0]){if(c>=z[1])a=z[1];else if(c<=z[0])b=z[0];else{a=b;}}}if(b-a>=.9)Z.push([a,b,k]);});if(Z.length)FZ.set(w,Z);});
 // long eaves sides: frame the widest window (>=1.2 m) of each still-plain long exterior wall (>=6 m) with the terrace accent
 {const EX=H.walls.filter(w=>w._ext),xa=EX.flatMap(w=>[w.start[0],w.end[0]]),za=EX.flatMap(w=>[w.start[1],w.end[1]]);var LX=xa.length&&(Math.max(...xa)-Math.min(...xa)>=Math.max(...za)-Math.min(...za));}
 if(FS.ter)H.walls.forEach(w=>{if(!w._ext||FZ.has(w))return;const L=geo(w).L,G=geo(w);if(L<6||(LX?Math.abs(G.u[1])>.01:Math.abs(G.u[0])>.01))return;let bo=null;(w.openings||[]).forEach(o=>{if(o.type==='window'&&o.width>=1.2&&(!bo||o.width>bo.width))bo=o;});if(!bo)return;let a=Math.max(0,bo.offset-.45),b=Math.min(L,bo.offset+bo.width+.45);if(a<.6)a=0;if(L-b<.6)b=L;FZ.set(w,[[a,b,FS.ter]]);});{const noTer=!![FS.ter]&&!!FS.ter&&![...FZ.values()].some(Z=>Z.some(z=>z[2]===FS.ter&&z[2]!==FS.ent));const E=H.walls.filter(w=>w._ext),X=E.flatMap(w=>[w.start[0],w.end[0]]),Zs=E.flatMap(w=>[w.start[1],w.end[1]]);if(E.length){const x0=Math.min(...X),x1=Math.max(...X),z0=Math.min(...Zs),z1=Math.max(...Zs),lx=x1-x0>=z1-z0;
  // a short end wall that already carries an accent zone gets its gable triangle clad too (wood unless the accent is anthracite)
  if(FS.ent||FS.ter)[...E].sort((p,q)=>((FZ.get(q)||[]).some(z=>z[2]===FS.ent))-((FZ.get(p)||[]).some(z=>z[2]===FS.ent))).forEach(w=>{const Z=FZ.get(w);if(!Z||FGE)return;const alg=lx?Math.abs(w.start[0]-w.end[0])<.05:Math.abs(w.start[1]-w.end[1])<.05,c=lx?w.start[0]:w.start[1];if(!alg)return;const neg=Math.abs(c-(lx?x0:z0))<.3,pos=Math.abs(c-(lx?x1:z1))<.3;if(neg||pos)FGE={k:Z.some(z=>z[2]==='dark')&&!Z.some(z=>z[2]==='wood')?'dark':'wood',neg};});
  // fallback "one volume": clad the longest wall on a short end of the footprint (the gable end on a gable roof)
  if(noTer){let bw=null,bl=0;E.forEach(w=>{if(FZ.has(w))return;const L=geo(w).L,c=lx?w.start[0]:w.start[1],alg=lx?Math.abs(w.start[0]-w.end[0])<.05:Math.abs(w.start[1]-w.end[1])<.05,lo=lx?x0:z0,hi=lx?x1:z1;if(alg&&(Math.abs(c-lo)<.3||Math.abs(c-hi)<.3)&&L>=2.5&&L>bl){bl=L;bw=w;}});if(bw){FZ.set(bw,[[0,bl,"wood"]]);const c=lx?bw.start[0]:bw.start[1];FGE={k:"wood",neg:Math.abs(c-(lx?x0:z0))<.3};}}}}
 /* v20261117b: explicit per-wall cladding from the project (w.clad = 'wood'|'stone'|'dark'|'none' or [[a,b,k],...]) overrides the automatic accent zones - lets a designed house keep one facade concept */
 H.walls.forEach(w=>{if(!w._ext||!w.clad)return;const L=geo(w).L;if(w.clad==='none'){FZ.delete(w);return;}const Z=Array.isArray(w.clad)?w.clad.filter(z=>FCM[z[2]]).map(z=>[Math.max(0,z[0]),Math.min(L,z[1]),z[2]]):(FCM[w.clad]?[[0,L,w.clad]]:null);if(Z&&Z.length)FZ.set(w,Z);});
 FZW=[...FZ.entries()];window.__fz=[...FZ.entries()].map(([w,Z])=>[w.start,w.end,w._ext,Z]);
 const box=(w,s0,s1,y0,y1,mat,t,tOff=0,nc)=>{const Z=mat===M.wall&&w._ext&&FZ.get(w);if(!Z)return box0(w,s0,s1,y0,y1,mat,t,tOff,nc);const cuts=[s0,s1];Z.forEach(z=>{for(const v of[z[0],z[1]])if(v>s0&&v<s1)cuts.push(v);});cuts.sort((a,b)=>a-b);let last;
  for(let i=0;i+1<cuts.length;i++){const a=cuts[i],b=cuts[i+1];if(b-a<.005)continue;const md=(a+b)/2,z=Z.find(z=>md>=z[0]&&md<=z[1]);if(!z){last=box0(w,a,b,y0,y1,mat,t,tOff,nc);continue;}const m=box0(w,a,b,y0,y1,facMats(z[2],w._ext),t,tOff,nc);if(m)boxUV(m.geometry,(a+b)/2,(y0+y1)/2);last=m;}return last;};
 const box0=(w,s0,s1,y0,y1,mat,t,tOff=0,nc)=>{if(s1-s0<.005||y1-y0<.005)return;if(mat===M.wall&&w._ext)mat=w._ext>0?WP:WN;const g=geo(w);t=t||w.thickness;const bgm=new THREE.BoxGeometry(s1-s0,y1-y0,t);if(mat===M.wall||mat===WP||mat===WN||mat===M.fac)boxUV(bgm,(s0+s1)/2,(y0+y1)/2);const m=add(bgm,mat,g.x0+g.u[0]*(s0+s1)/2-g.u[1]*tOff,y0+(y1-y0)/2,g.z0+g.u[1]*(s0+s1)/2+g.u[0]*tOff,-Math.atan2(g.u[1],g.u[0]),nc);const hh=y1-y0;
  // Only structural wall slabs get wallCut (dollhouse). Frames/doors/glass must never — they caused ghost windows in GLB/Blender.
  const isWallMat=mat===M.wall||mat===M.fac||mat===M.plinth||mat===WP||mat===WN||(Array.isArray(mat)&&(mat.includes(M.wall)||mat.includes(M.fac)));
  if(hh>0.4&&isWallMat){m.userData.wallCut={base:y0,h:hh};}
  if(isWallMat&&mat!==M.plinth)m.userData.wp=[w,s0,s1,y0,y1,t];
  if(doGrow&&isWallMat){m.userData.grow=1;m.userData.growBase=y0;m.userData.growH=hh;m.scale.y=.001;m.position.y=y0;m.visible=false;}return m;};
 H.walls.forEach(w=>{const L=geo(w).L,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0),h=w.height||2.8;xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);
  const ops=[...(w.openings||[])].sort((a,b)=>a.offset-b.offset);let s=0;
  ops.forEach(o=>{const sl=o.sill||0,a=o.offset,b=a+o.width,f=.085,sg=w._ext?Math.sign(w._ext):0;box(w,s,a,e,e+h,M.wall);box(w,a,b,e,e+sl,M.wall);box(w,a,b,e+sl+o.height,e+h,M.wall);
   if(o.type==='window'){box(w,a,b,e+sl+f,e+sl+o.height-f,M.glass,.02,0,1);box(w,a,b,e+sl,e+sl+f,M.frame,.12);box(w,a,b,e+sl+o.height-f,e+sl+o.height,M.frame,.12);box(w,a,a+f,e+sl,e+sl+o.height,M.frame,.12);box(w,b-f,b,e+sl,e+sl+o.height,M.frame,.12);if(b-a>.75)box(w,(a+b)/2-.035,(a+b)/2+.035,e+sl,e+sl+o.height,M.frame,.09,0,1);
    // exterior sill
    if(sg){const T=w.thickness;box(w,a-.03,b+.03,e+sl-.035,e+sl,M.sill,T/2+.06,sg*(T/4+.03),1);if(sl>.3)box(w,a-.02,b+.02,e+sl-.025,e+sl,M.board,T/2+.03,-sg*(T/4+.015),1);}else box(w,a-.02,b+.02,e+sl-.04,e+sl,M.frame,w.thickness+.08,0,1);}
   else{const JM=w._ext?M.frame:M.skirt;box(w,a,a+.06,e,e+o.height,JM,w.thickness+.04);box(w,b-.06,b,e,e+o.height,JM,w.thickness+.04);box(w,a,b,e+o.height-.06,e+o.height,JM,w.thickness+.04);
    if(!w._ext&&o.height<2.5){const T=w.thickness+.03;box(w,a-.07,a,e,e+o.height+.07,M.skirt,T,0,1);box(w,b,b+.07,e,e+o.height+.07,M.skirt,T,0,1);box(w,a-.07,b+.07,e+o.height,e+o.height+.07,M.skirt,T,0,1);}box(w,a-.02,b+.02,e,e+.04,M.frame,w.thickness+.1,0,1);
    const G=geo(w),ang=-Math.atan2(G.u[1],G.u[0]),sd=o.out?-1:1,kd=o.kind||'single',mat=kd==='entrance'?M.frame:M.door;if(w._ext){box(w,a,a+.06,e,e+o.height,M.frame,.14,0,1);box(w,b-.06,b,e,e+o.height,M.frame,.14,0,1);box(w,a,b,e+o.height-.06,e+o.height,M.frame,.14,0,1);}
    const isEnt=kd==='entrance'||(o.type==='door'&&o.out&&o.kind!=='sliding');
    const leaf=(hs,lw,dir,openRot)=>{const lf=new THREE.Mesh(new THREE.BoxGeometry(lw,o.height-.06,.04),mat);lf.castShadow=true;lf.position.set(dir*lw/2,(o.height-.06)/2,0);const piv=new THREE.Group();piv.position.set(G.x0+G.u[0]*hs-G.u[1]*sd*(w.thickness/2),e,G.z0+G.u[1]*hs+G.u[0]*sd*(w.thickness/2));
      const closedRot=ang, openR=ang+openRot; const start= (isEnt&&doorMode==='closed')?closedRot:openR;
      piv.rotation.y=start;piv.add(lf);piv.userData.noCol=true;
      piv.userData.doorLeaf=1;piv.userData.doorH=o.height||2.05;
      if(isEnt){piv.userData.door={closed:closedRot,open:openR,u:doorMode==='closed'?0:1,cx:G.x0+G.u[0]*(a+b)/2,cz:G.z0+G.u[1]*(a+b)/2};doorPivs.push(piv);}
      root.add(piv);return piv;};
    const leafI=(hs,lw,dir,openRot,sd2,sw)=>{const lf=new THREE.Mesh(new THREE.BoxGeometry(lw,o.height-.06,.04),mat);lf.castShadow=true;lf.position.set(dir*lw/2,(o.height-.06)/2,0);const piv=new THREE.Group();piv.position.set(G.x0+G.u[0]*hs-G.u[1]*sd2*(w.thickness/2),e,G.z0+G.u[1]*hs+G.u[0]*sd2*(w.thickness/2));piv.rotation.y=ang+openRot;piv.add(lf);piv.userData.noCol=true;piv.userData.doorLeaf=1;piv.userData.doorH=o.height||2.05;piv.userData.sw=Object.assign({w:w.id,T:w.thickness||.3},sw);root.add(piv);return piv;};
    const lw=o.width-.1,oa=(o.open!=null?o.open:90)*Math.PI/180;if(kd==='garage'){/* v18e: sectional garage door - closed panel inside the opening with horizontal ribs */const GM=std({color:0x6a6f75,roughness:.5,metalness:.25});const pn=box(w,a+.06,b-.06,e+.01,e+o.height-.06,GM,.05,0,1);if(pn&&pn.userData)pn.userData.garageDoor=1;for(let k=1;k<5;k++){const y=e+k*(o.height-.06)/5;box(w,a+.08,b-.08,y-.012,y+.012,M.frame,.065,0,1);}}else if(kd==='double'){leaf(a+.05,lw/2,1,-oa*sd);leaf(b-.05,lw/2,-1,oa*sd);}else if(kd==='sliding'||(kd==='terrace'&&w._ext)){
      /* v20261117g RULE (glazed exterior doors stay INSIDE the opening): sliding / terrace doors are framed lift-slide units within the wall thickness - fixed glazed half +
         sliding glazed half parked in front of it (half open), anthracite jambs/head; never a solid leaf standing in front of the facade. audit: door-leaf-outside */
      const m=(a+b)/2,y0=e+.05,y1=e+o.height-.06,fr=(s0,s1,off)=>{box(w,s0,s0+.06,y0,y1,M.frame,.06,off,1);box(w,s1-.06,s1,y0,y1,M.frame,.06,off,1);box(w,s0,s1,y0,y0+.07,M.frame,.06,off,1);box(w,s0,s1,y1-.06,y1,M.frame,.06,off,1);box(w,s0+.05,s1-.05,y0+.06,y1-.05,M.glass,.015,off,1);};
      fr(m-.03,b-.06,.035);fr(m-.06,b-.03,-.035);}else if(!w._ext&&kd==='single'){/* v20261117r RULE (every interior door, every house): the leaf stands ajar at DOOR_OPEN deg (never flat in the frame, never a straight
       panel), and hinge side + swing side are chosen so the swept quarter and the open leaf hit no furniture, appliance or wall (Adam: 'do chladničky vojdeš len z jednej strany').
       Order: plan hinge/side first, then the other three; if every option collides the angle steps down (80/65/50). audit: door-swing, door-blocked */
      const ch=doorChoose(w,o,G,e);const R=ch.R,sd2=ch.sd;leafI(R?b-.05:a+.05,lw,R?-1:1,(R?1:-1)*ch.a*Math.PI/180*sd2,sd2,{hinge:R?b-.05:a+.05,dir:R?-1:1,a:ch.a,sd:sd2,lw,L:w.level,hit:ch.hit});}
     else{const R=o.hinge==='R';leaf(R?b-.05:a+.05,lw,R?-1:1,(R?1:-1)*oa*sd);}}
   s=b;});box(w,s,L,e,e+h,M.wall);});
 if(!xs.length)return null;const fp=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];root.userData.fp=fp;
 const stairs=H.stairs||[];
 // prem8: floors follow room type (living oak, bedroom herringbone, kids birch, bath/wc grey tile, hall stone, kitchen tile)
 // prem8 h11: floors carry world-metre UVs (boxUV at the cell centre), so one material per room kind keeps plank/tile size identical in every room;
 // real CC0 albedo (Poly Haven, 1k) swaps in when loaded: oak planks 1.2 m tile, herringbone 3.4 m, 55 cm grey tiles 2.2 m.
 const FMAT={};const floorMat=kind=>{const R=ROOMFLOOR[kind]||ROOMFLOOR.other;if(FMAT[kind])return FMAT[kind];
  const base=R[1]==='oak'?wood:floorTex(R[1]);const mt=new THREE.MeshBasicMaterial({color:R[0],map:base.clone(),toneMapped:false});mt.userData={floor:1};mt.map.colorSpace=THREE.SRGBColorSpace;mt.map.repeat.set(1/R[2],1/R[2]);mt.map.needsUpdate=true;
  const RF=REALFLOOR[kind];if(RF)floorTexLoad(RF[0],t=>{const q=t.clone();q.repeat.set(1/RF[1],1/RF[1]);q.needsUpdate=true;mt.map=q;mt.color.set(RF[2]);mt.needsUpdate=true;DIRTY=Math.max(DIRTY,30);});return FMAT[kind]=mt;};
 roomKinds={};
 H.levels.forEach((l,i)=>{const ws=H.walls.filter(w=>w.level===l.name);if(!ws.length)return;const hole=stairs.filter(st=>st.level===(H.levels[i-1]||{}).name).map(stairRect);
  const topH=Math.max(...ws.map(w=>w.height||l.height));
  const CR=cells(ws,hole),byL={};CELLS[l.name]=CR;(H.furn||[]).filter(f=>f.level===l.name).forEach(f=>{const L=CR.labelAt(f.p[0],f.p[1]);if(!L)return;(byL[L]=byL[L]||{t:new Set(),k:[]}).t.add(f.t);if(['kitch','fridge','island','stool'].includes(f.t))byL[L].k.push(f);});
  const kindOf={};Object.keys(byL).forEach(L=>kindOf[L]=roomKind(byL[L].t));roomKinds[l.name]={labelAt:CR.labelAt,kindOf};
  CR.forEach(r=>{/* v20261117u: floors/ceilings stop at the inner face of bordering exterior walls (never an infinite plane). if a clip would go degenerate, keep the room cell so a floor is never dropped. audit: floor-present, ext-material */
   const raw=clipInExt(r[0],r[1],r[2],r[3],ws,.02);let cl=(raw[2]-raw[0]>=.05&&raw[3]-raw[1]>=.05)?shrinkIn(raw,ws):null;if(cl&&(cl[2]-cl[0]<.05||cl[3]-cl[1]<.05||inExtBand((cl[0]+cl[2])/2,(cl[1]+cl[3])/2,ws)||_bOutExt((cl[0]+cl[2])/2,(cl[1]+cl[3])/2,ws)))cl=null;/* v20261117u BASICS: a floor is NEVER dropped - a failed clip falls back to the room cell inset 2 cm */if(!cl&&raw[2]-raw[0]>=.005&&raw[3]-raw[1]>=.005&&(raw[2]-raw[0]<.05||raw[3]-raw[1]<.05)){const mx=(raw[0]+raw[2])/2,mz=(raw[1]+raw[3])/2;if(inExtBand(mx,mz,ws)||_bOutExt(mx,mz,ws))return;cl=raw;}/* thin strip already inside the inner wall face: keep it as is */
   if(!cl){let tn=0,ti=0;for(let a=.1;a<1;a+=.2)for(let c=.1;c<1;c+=.2){tn++;const x=r[0]+(r[2]-r[0])*a,z=r[1]+(r[3]-r[1])*c;if(inExtBand(x,z,ws)||_bOutExt(x,z,ws))ti++;}if(ti/tn>=.8)return;/* cell is wall or outside the envelope *//* a sliver cell lying inside an exterior wall is wall, not room */cl=[r[0]+.02,r[1]+.02,r[2]-.02,r[3]-.02];}if(cl[2]-cl[0]<.01||cl[3]-cl[1]<.01)return;
   /* v21x RULE (floor clip fallback): a corner-based inset that leaves part of the room bare (an outer-wall stub at one corner pulled a whole edge in) is undone:
      sampled like the audit (points in a wall or outside the envelope do not count), a clip covering < 95 % falls back to the plain clip, then to the room cell. PF.noFloorCov. audit: floor-present */
   if(!(globalThis.__PF||{}).noFloorCov&&(r[2]-r[0])*(r[3]-r[1])>=.25){const inW=(x,z)=>ws.some(w=>{const g=geo(w),T=(w.thickness||.3)/2+.03,px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-.02||q>g.L+.02)return false;return Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)<T;});
    const cov=c=>{const area=(r[2]-r[0])*(r[3]-r[1]),st=Math.max(.15,Math.min(.4,Math.sqrt(area)/7));let t=0,h=0;for(let x=r[0]+.08;x<r[2]-.08;x+=st)for(let z=r[1]+.08;z<r[3]-.08;z+=st){if(inW(x,z)||_bOutExt(x,z,ws)||inExtBand(x,z,ws))continue;t++;if(x>=c[0]&&x<=c[2]&&z>=c[1]&&z<=c[3])h++;}return t>=4?h/t:1;};
    if(cov(cl)<.95){const c2=(raw[2]-raw[0]>=.05&&raw[3]-raw[1]>=.05)?raw:null,c3=[r[0]+.02,r[1]+.02,r[2]-.02,r[3]-.02];const pick=c2&&cov(c2)>=.95?c2:cov(c3)>cov(cl)?c3:cl;if(pick!==cl){cl=pick;(window.__floorCov=window.__floorCov||[]).push(r.slice(0,4).map(v=>+v.toFixed(2)));}}}const cx=(cl[0]+cl[2])/2,cz=(cl[1]+cl[3])/2;
   const kind=kindOf[r[4]]||'other';const mat=floorMat(kind);const fg=new THREE.BoxGeometry(cl[2]-cl[0],.06,cl[3]-cl[1]);boxUV(fg,cx,cz);
const m=add(fg,mat,cx,l.elevation+.03+.001*i,cz);m.receiveShadow=false;m.userData.floor=1;m.userData.lvJ=i;
   const up=H.levels[i+1];if(up){/* v20261117q: no ceiling across the stair void - you see the upper floor when you look up the stairs. audit: stair-void-capped */let pcs=[[r[0],r[1],r[2],r[3]]];(H.stairs||[]).filter(st=>st.level===l.name).map(stairRect).forEach(q=>{const nx=[];pcs.forEach(c=>{if(q[0]>=c[2]||q[2]<=c[0]||q[1]>=c[3]||q[3]<=c[1]){nx.push(c);return;}if(q[0]>c[0])nx.push([c[0],c[1],q[0],c[3]]);if(q[2]<c[2])nx.push([q[2],c[1],c[2],c[3]]);const a0=Math.max(c[0],q[0]),a1=Math.min(c[2],q[2]);if(q[1]>c[1])nx.push([a0,c[1],a1,q[1]]);if(q[3]<c[3])nx.push([a0,q[3],a1,c[3]]);});pcs=nx;});pcs.forEach(c=>{if(c[2]-c[0]<.02||c[3]-c[1]<.02)return;add(new THREE.BoxGeometry(c[2]-c[0],.05,c[3]-c[1]),M.ceil,(c[0]+c[2])/2,l.elevation+topH+.025,(c[1]+c[3])/2,0,1).userData.ceil=1;});}/* ukážka 2 fix: lower floors get a white ceiling too */if(!up){add(new THREE.BoxGeometry(cl[2]-cl[0],.05,cl[3]-cl[1]),M.ceil,cx,l.elevation+topH+.025,cz,0,1).userData.ceil=1;
    // warm ceiling disc light (emissive) + soft point
    if(Math.min(r[2]-r[0],r[3]-r[1])>1.6){const disc=add(new THREE.CylinderGeometry(.26,.26,.012,16),std({color:0xe8dcc8,emissive:0xb89a70,emissiveIntensity:0.02,roughness:.98}),cx,l.elevation+topH-.03,cz,0,1);disc.scale.set(1,1,1);disc.castShadow=false;disc.userData.ceil=1;disc.userData.noCol=true;
     const pl=new THREE.PointLight(0xffd4a0,0.16,Math.max(r[2]-r[0],r[3]-r[1])*1.15,2);pl.position.set(cx,l.elevation+topH-.22,cz);pl.userData.ceil=1;root.add(pl);}}});
  // prem9: the stair opening is a hole in THIS floor only - the ceiling above it stays closed (no sky strip), unless a stair from this level climbs through the same spot
  const up2=stairs.filter(st=>st.level===l.name).map(stairRect);hole.forEach(h=>{if(up2.some(g=>g[0]<h[2]&&g[2]>h[0]&&g[1]<h[3]&&g[3]>h[1]))return;add(new THREE.BoxGeometry(h[2]-h[0],.05,h[3]-h[1]),M.ceil,(h[0]+h[2])/2,l.elevation+topH+.025,(h[1]+h[3])/2,0,1).userData.ceil=1;});});
 // prem10 STOREY JOINT (Adam: "druhé poschodie je vo vzduchu"): levels sit 3.05 m apart but walls are 2.8 m tall, so a 25 cm slot stayed open between storeys.
 // LOGIC RULE: the floor above is a real slab. (1) lower walls under the upper floor continue up to it (slab edge in the facade), (2) a structural slab fills the
 // upper rooms' footprint between the lower wall tops and the upper floor, (3) upper walls with no wall below get a beam down to the lower wall top,
 // (4) an upper part that hangs >1.5 m past the walls below is a covered terrace: a post goes under each such free corner. Everything is tagged with its storey (lvJ) for the storey picker.
 window.__posts=[];const DZ=H.roofEdge==='parapet';if(!/[?&]nojoint=1/.test(location.search))H.levels.forEach((l,i)=>{const up=H.levels[i+1];if(!up)return;const uc=CELLS[up.name]||[],lw=H.walls.filter(w=>w.level===l.name),uw=H.walls.filter(w=>w.level===up.name);if(!uc.length||!lw.length||!uw.length)return;
  const eu=up.elevation||0,el=l.elevation||0,lt=el+Math.max(...lw.map(w=>(w.base||0)+(w.height||l.height||2.8)));if(eu-lt<.01)return;
  const tag=(n0,k)=>{for(let j=n0;j<root.children.length;j++)root.children[j].userData.lvJ=k;};
  const inUp=(x,z,m)=>uc.some(u=>x>u[0]-m&&x<u[2]+m&&z>u[1]-m&&z<u[3]+m);
  const segD=(x,z,w)=>{const g=geo(w),px=x-g.x0,pz=z-g.z0,s=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1]));return Math.hypot(px-g.u[0]*s,pz-g.u[1]*s);};
  const lowWallAt=(x,z,m)=>lw.some(w=>segD(x,z,w)<(w.thickness||.3)/2+m);
  let n0=root.children.length;
  lw.forEach(w=>{const g=geo(w),e=el+(w.base||0),h=w.height||2.8;if(e+h>=eu-.005)return;const T=(w.thickness||.3)/2+.12,N=Math.max(2,Math.ceil(g.L/.1));let a=null;
   for(let k=0;k<=N;k++){const s=k/N*g.L,x=g.x0+g.u[0]*s,z=g.z0+g.u[1]*s,c=k<N&&(inUp(x,z,.02)||inUp(x-g.u[1]*T,z+g.u[0]*T,0)||inUp(x+g.u[1]*T,z-g.u[0]*T,0)||uw.some(q=>segD(x,z,q)<(q.thickness||.3)/2));
    if(c&&a===null)a=s;if((!c||k===N)&&a!==null){const b=c?g.L:s;if(b-a>.05)box(w,Math.max(0,a-.02),Math.min(g.L,b+.02),e+h,eu+.002,M.wall,0,0,1);a=null;}}});
  uc.forEach(r=>{const raw=clipInExt(r[0]-.01,r[1]-.01,r[2]+.01,r[3]+.01,uw.filter(w=>w._ext),'outer'),sl=(raw[2]-raw[0]>=.05&&raw[3]-raw[1]>=.05)?raw:[r[0]+.02,r[1]+.02,r[2]-.02,r[3]-.02];if(sl[2]-sl[0]<.05||sl[3]-sl[1]<.05)return;add(new THREE.BoxGeometry(sl[2]-sl[0],eu-lt-.002,sl[3]-sl[1]),M.fac,(sl[0]+sl[2])/2,(lt+eu)/2,(sl[1]+sl[3])/2,0,1).userData.slab=1;});
  uw.forEach(w=>{const g=geo(w),N=Math.max(2,Math.ceil(g.L/.1));let a=null;
   for(let k=0;k<=N;k++){const s=k/N*g.L,x=g.x0+g.u[0]*s,z=g.z0+g.u[1]*s,c=k<N&&!lowWallAt(x,z,.02);
    if(c&&a===null)a=s;if((!c||k===N)&&a!==null){const b=c?g.L:s;if(b-a>.05)box(w,Math.max(0,a-.02),Math.min(g.L,b+.02),lt,eu+.002,M.wall,0,0,1);a=null;}}});
  tag(n0,i+1);
  const lc=CELLS[l.name]||[],onLow=(x,z)=>lowWallAt(x,z,.05)||lc.some(u=>x>u[0]-.05&&x<u[2]+.05&&z>u[1]-.05&&z<u[3]+.05);
  const pts=[];uw.filter(w=>w._ext).forEach(w=>[w.start,w.end].forEach(p=>{if(!pts.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<.05))pts.push(p);}));
  pts.forEach(p=>{if(onLow(p[0],p[1]))return;let d=1e9;lw.forEach(w=>{d=Math.min(d,segD(p[0],p[1],w));});if(d<1.5)return;
   const pm=add(/* v20261117c: designed (parapet) projects get slim anthracite steel columns */new THREE.BoxGeometry(DZ?.16:.24,lt-el,DZ?.16:.24),DZ?M.frame:M.fac,p[0],el+(lt-el)/2,p[1],0);pm.userData.post=1;pm.userData.lvJ=i;window.__posts.push([p[0],p[1],up.name]);});
  /* v20261117c: designed projects - a slim dark flashing band covers the slab edge between storeys on every lower exterior wall (the bare slab edge read as a glowing line at dusk) */
  /* v20261117t: every multi-storey house gets a dark metal flashing at the storey joint (never a floor material). audit: ext-material */
  lw.filter(w=>w._ext).forEach((w,k)=>{const g=geo(w),T=w.thickness||.3,D=.04,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,o=T/2+D/2+.01,fb=add(new THREE.BoxGeometry(g.L+T+2*D-.02,eu-lt+.12+(k%2)*.004,D),M.frame,g.x0+g.u[0]*g.L/2+nx*o,(lt+eu)/2+.03,g.z0+g.u[1]*g.L/2+nz*o,-Math.atan2(g.u[1],g.u[0]),1);fb.userData.lvJ=i;fb.userData.flash=D;fb.userData.cope=1;});});
 // prem8: kitchen tile zone inside open-plan living (bbox of kitchen pieces + 0.9 m working aisle)
 H.levels.forEach((l,i)=>{const RK=roomKinds[l.name];if(!RK)return;const grp={};(H.furn||[]).filter(f=>f.level===l.name&&['kitch','fridge','island'].includes(f.t)).forEach(f=>{const L=RK.labelAt(f.p[0],f.p[1]);if(L&&RK.kindOf[L]==='living')(grp[L]=grp[L]||[]).push(f);});
  Object.values(grp).forEach(fs=>{let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;fs.forEach(f=>{const F=FUR[f.t]||{w:1,d:1},rot=(f.r||0)%2,w=rot?F.d:F.w,d=rot?F.w:F.d;x0=Math.min(x0,f.p[0]-w/2);x1=Math.max(x1,f.p[0]+w/2);z0=Math.min(z0,f.p[1]-d/2);z1=Math.max(z1,f.p[1]+d/2);});
   x0-=.9;z0-=.9;x1+=.9;z1+=.9;const fp0=root.userData.fp;x0=Math.max(x0,fp0[0]+.16);z0=Math.max(z0,fp0[1]+.16);x1=Math.min(x1,fp0[2]-.16);z1=Math.min(z1,fp0[3]-.16);if(x1-x0<.5||z1-z0<.5)return;
   const kg=new THREE.BoxGeometry(x1-x0,.004,z1-z0);boxUV(kg,(x0+x1)/2,(z0+z1)/2);const m=add(kg,floorMat('kitchen'),(x0+x1)/2,l.elevation+.0625,(z0+z1)/2,0,1);m.receiveShadow=false;m.castShadow=false;m.userData.floor=1;m.userData.lvJ=i;});});
 M.wood2.color.set((STY[H.style]||{}).wood||'#d4b48a');(H.furn||[]).forEach(f=>{const l=lv[f.level];if(!l)return;let F=FUR[f.t];if(!F)return;if(f.w&&f.d)F={...F,w:f.w,d:f.d};if(f.nu)F={...F,nu:1};const S=STY[H.style]||{};
  const RK=roomKinds[f.level],rk=RK?RK.kindOf[RK.labelAt(f.p[0],f.p[1])]:null;
  // prem8 h11: no big potted plants in wet rooms or rooms under 6 m² (they blocked the bathroom view)
  if(f.t==='plant'&&RK){const L=RK.labelAt(f.p[0],f.p[1]),A=(CELLS[f.level]||[]).filter(r=>r[4]===L).reduce((a,r)=>a+(r[2]-r[0])*(r[3]-r[1]),0);if(rk==='wet'||(A>0&&A<6))return;}
  if(f.t==='rug'&&(rk==='bed'||rk==='kids')&&F.w>2.6)F=rk==='bed'?{...F,w:2.6,d:2.4}:{...F,w:2.0,d:1.4}; // prem8: room-sized rugs keep floors visible
  const rugC=(f.t==='rug'&&rk&&RUGC[rk]&&H.style==='skandi')?RUGC[rk]:(S.rug||'#c4a484');
  // v20261117g RULE: one hob + one sink per kitchen - only the longest kitchen run on a level carries them (audit: kitchen-multi-hob)
  if(f.t==='kitch'){const ks=(H.furn||[]).filter(q=>q.t==='kitch'&&q.level===f.level).sort((p,q)=>(q.w||2.8)-(p.w||2.8));if(ks[0]!==f)F={...F,run2:1};}
  /* v20261117i GENERATOR RULES (wall-mounted pieces, Stani review): curtains snap to the nearest window / glazed door on the same wall: rod centred on it, rod = opening
     + margin (shrunk so it never reaches the next opening), panels parked at the sides, 8 cm off the wall, rod 12 cm above the opening, panels to the floor. Art and mirrors
     hang flat on the nearest wall FACING the room, centred, on a free stretch of wall (no opening within 15 cm), never within 1 m of a stair, at eye height or 25 cm above
     the furniture below. Pieces without a valid wall are dropped. audit: curtain-off-window, art-placement */
  let WM=null;if(f.t==='art'||f.t==='mirror'||f.t==='curtain'){WM=wallMount(f,F,l);if(!WM)return;F={...F,...WM.F};}
  const g=makeFurn(f.t,F,{wood:(S.wood||'#d4b48a'),fab:f.c||(f.t==='rug'?rugC:(S[f.t]||F.c)),bed:f.cb||S.bed||'#c4a882',rug:f.c||rugC,curtain:S.curtain||'#b8a890',leather:S.leather,metal:S.metal,sty:H.style||''});
  g.position.set(f.p[0],l.elevation,f.p[1]);/* v20261117q: r follows layout.js FV (r=1 faces +x, r=3 faces -x); the old minus sign turned every odd-r piece 180 deg (chairs backing into the table, armchairs/sofas facing the wall). audit: furn-orient */g.rotation.y=((f.r||0)*Math.PI/2);if(WM){g.position.set(WM.x,l.elevation,WM.z);g.rotation.y=WM.ry;g.userData.wm=WM.rec;}g.userData.furn=f.t;g.userData.noCol=true;root.add(g);});
 // solid oak slab over whole footprint (guarantees readable floors from dollhouse + interior)
 if(xs.length&&zs.length){const fx0=Math.min(...xs),fx1=Math.max(...xs),fz0=Math.min(...zs),fz1=Math.max(...zs);
  const oak=M.floor;/* v12g: the footprint slab uses the chosen floor (style / Podlahy), no fixed oak */
  const slab=add(new THREE.BoxGeometry(Math.max(1,fx1-fx0-.55),.04,Math.max(1,fz1-fz0-.55)),oak,(fx0+fx1)/2,.008,(fz0+fz1)/2,0,1);slab.receiveShadow=false;slab.userData.floor=1;}

 // plinth strip around footprint for grounding
 stairs.forEach(st=>{const l=lv[st.level],up=H.levels[H.levels.indexOf(l)+1];if(!l)return;const rise=up?up.elevation-l.elevation:l.height,n=Math.max(2,Math.round(rise/.18)),L=st.length||3.6,W=st.width||1,d=st.dir||0;
  for(let k=0;k<n;k++){const sx=(k+.5)*L/n;add(new THREE.BoxGeometry(L/n,(k+1)*rise/n,W),M.stair,st.pos[0]+Math.cos(d)*sx-Math.sin(d)*W/2,l.elevation+(k+1)*rise/n/2,st.pos[1]+Math.sin(d)*sx+Math.cos(d)*W/2,-d);}});
 /* v20261117b LOGIC RULE (stair-guard): every stair opening gets a 1 m glass balustrade with a steel cap on its free edges on the floor above (not on the arrival edge,
    not where a wall already closes it), and every open side of the stair run gets a sloped glass guard + handrail. Tagged per storey for the storey picker / dollhouse. */
 stairs.forEach(st=>{const l=lv[st.level],li=H.levels.indexOf(l),up=H.levels[li+1];if(!l||!up)return;const r=stairRect(st),d=st.dir||0,c=Math.cos(d),sn=Math.sin(d),L=st.length||3.6,W=st.width||1,eu=up.elevation||0,el=l.elevation||0;
  const near=(lvN,x,z,m)=>H.walls.some(w=>{if(w.level!==lvN)return false;const g=geo(w),px=x-g.x0,pz=z-g.z0,q=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1]));return Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)<(w.thickness||.3)/2+m;});
  const topE=[st.pos[0]+c*L,st.pos[1]+sn*L];
  /* v20261117i RULE (stair opening edge): the slab edge around the stair opening is lined with a white reveal from the ceiling below up to the floor above, so the
     opening reads as a clean cut (no grey slab core / structure visible above the stairs). audit: stair-opening-unlined */
  {const y0=el+(l.height||2.8)-.01,y1=eu+.065,hh=y1-y0;if(hh>.02)[[r[0],r[1],r[2],r[1],0,1],[r[2],r[1],r[2],r[3],-1,0],[r[2],r[3],r[0],r[3],0,-1],[r[0],r[3],r[0],r[1],1,0]].forEach(([x0,z0,x1,z1,nx,nz])=>{
    const ln=Math.hypot(x1-x0,z1-z0);if(ln<.2)return;const ln2=add(new THREE.BoxGeometry(ln+.02,hh,.02),M.ceil,(x0+x1)/2+nx*.01,y0+hh/2,(z0+z1)/2+nz*.01,nz?0:Math.PI/2,1);ln2.userData.stairLining=1;});}
  [[r[0],r[1],r[2],r[1]],[r[2],r[1],r[2],r[3]],[r[2],r[3],r[0],r[3]],[r[0],r[3],r[0],r[1]]].forEach(([x0,z0,x1,z1])=>{const mx=(x0+x1)/2,mz=(z0+z1)/2,ln=Math.hypot(x1-x0,z1-z0);if(ln<.2)return;
   const ex=x1-x0,ez=z1-z0;if(Math.abs((topE[0]-mx)*ez-(topE[1]-mz)*ex)/ln<.05&&Math.abs(ex*c+ez*sn)/ln<.2)return; // arrival edge stays open
   if(near(up.name,mx,mz,.08)&&near(up.name,x0+ex*.15,z0+ez*.15,.08)&&near(up.name,x0+ex*.85,z0+ez*.85,.08))return; // a wall closes this edge
   const an=-Math.atan2(ez,ex);add(new THREE.BoxGeometry(ln,.92,.02),M.glass,mx,eu+.1+.46,mz,an);add(new THREE.BoxGeometry(ln+.04,.05,.06),M.frame,mx,eu+1.02,mz,an);});
  // sloped guard on the open long sides of the run (lower floor)
  for(const sd of[0,1]){const ox=-sn*W*sd,oz=c*W*sd,ax=st.pos[0]+ox,az=st.pos[1]+oz,mx=ax+c*L/2,mz=az+sn*L/2,nx=-sn*(sd?1:-1),nz=c*(sd?1:-1);
   if(near(st.level,mx+nx*.12,mz+nz*.12,.06)&&near(st.level,ax+c*L*.2+nx*.12,az+sn*L*.2+nz*.12,.06))continue;
   const rise=eu-el,ang=Math.atan2(rise,L),hyp=Math.hypot(L,rise),gx=ax-nx*.03,gz=az-nz*.03,cy=el+rise/2;
   const gm=new THREE.Mesh(new THREE.BoxGeometry(hyp,.8,.02),M.glass);gm.position.set(gx+c*L/2,cy+.5,gz+sn*L/2);gm.rotation.set(0,-d,ang,'YXZ');root.add(gm);gm.userData.lvJ=li;
   const hr=new THREE.Mesh(new THREE.BoxGeometry(hyp+.05,.05,.06),M.frame);hr.position.set(gx+c*L/2,cy+.93,gz+sn*L/2);hr.rotation.set(0,-d,ang,'YXZ');root.add(hr);hr.userData.lvJ=li;}
 });
 const top=H.levels[H.levels.length-1],tw=H.walls.filter(w=>w.level===top.name),th=top.elevation+Math.max(...(tw.length?tw:H.walls).map(w=>w.height||2.8));
 // prem8 h8: footprint fill (room cells area / centre-line bbox). Below .8 the house is L/U-shaped or notched: plinth follows the exterior
 // walls and the roof becomes an outline-following flat roof (a bbox gable would hang over empty yard and hide the walls).
 const fillOf=n=>{const C=CELLS[n];if(!C||!C.length)return 1;let a=0,x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;C.forEach(r=>{a+=(r[2]-r[0])*(r[3]-r[1]);x0=Math.min(x0,r[0]);x1=Math.max(x1,r[2]);z0=Math.min(z0,r[1]);z1=Math.max(z1,r[3]);});return a/Math.max(1,(x1-x0)*(z1-z0));}; // room-cell area / room-cell bbox
 const IRR=fillOf(H.levels[0].name)<.93||fillOf(top.name)<.93;window.__irr=[fillOf(H.levels[0].name),fillOf(top.name)];
 if(IRR&&xs.length){const pm=FS.pl?FCM[FS.pl].m:M.plinth,h=.38;H.walls.forEach(w=>{if(!w._ext||(lv[w.level]||{elevation:0}).elevation+(w.base||0)>.2)return;const g=geo(w),T=w.thickness||.3,L=g.L;let sg=Math.sign(w._ext);{const mx=g.x0+g.u[0]*L/2,mz=g.z0+g.u[1]*L/2;const io=inFoot(mx-g.u[1]*sg*(T/2+.3),mz+g.u[0]*sg*(T/2+.3)),ii=inFoot(mx+g.u[1]*sg*(T/2+.3),mz-g.u[0]*sg*(T/2+.3));if(io&&ii)return;/* both sides are rooms = an inner wall wrongly marked exterior: no plinth inside the house */if(io&&!ii)sg=-sg;}
   const cuts=[[-T/2-.1,L+T/2+.1]];(w.openings||[]).filter(o=>o.type==='door').forEach(o=>{const a=o.offset-.02,b=o.offset+o.width+.02;for(let i=cuts.length-1;i>=0;i--){const[c0,c1]=cuts[i];if(b<=c0||a>=c1)continue;cuts.splice(i,1,...[[c0,a],[b,c1]].filter(q=>q[1]-q[0]>.03));}});
   /* v20261117r RULE: the plinth runs past the wall ends to wrap convex corners, but at a concave (inner) corner that run-out went through the
       perpendicular wall and left a 10x10x38 cm stone stub standing inside the room (Adam: 'mramorový hranolček' in kitchen/technical/kids/living). Each end is
       trimmed back until neither plinth face lies inside a room cell. audit: plinth-in-room */
    const cc=s=>inFoot(g.x0+g.u[0]*s-g.u[1]*sg*(T/2+.25),g.z0+g.u[1]*s+g.u[0]*sg*(T/2+.25));
    if(cc(-T/2-.25)&&cuts[0][0]<0)cuts[0][0]=0;if(cc(L+T/2+.25)&&cuts[cuts.length-1][1]>L)cuts[cuts.length-1][1]=L;
    /* v20261117r RULE: a plinth piece shorter than 60 cm between two openings (not wrapping a corner) reads as a lone stone block by the door - dropped. audit: plinth-stub */
    cuts.filter(c=>c[1]-c[0]>.03&&(c[1]-c[0]>=.6||c[0]<=0||c[1]>=L)).forEach(([a,b])=>{const m=(a+b)/2,off=sg*(T/2+.05),bg=new THREE.BoxGeometry(b-a,h,.1);if(FS.pl)boxUV(bg,m,0);const pm2=add(bg,pm,g.x0+g.u[0]*m-g.u[1]*off,h/2-.02,g.z0+g.u[1]*m+g.u[0]*off,-Math.atan2(g.u[1],g.u[0]),1);pm2.userData.noCol=true;pm2.userData.plinth=1;pm2.userData.plEnd=(a<=0||b>=L)?1:0;});});}
 else if(xs.length&&zs.length){const px0=Math.min(...xs),px1=Math.max(...xs),pz0=Math.min(...zs),pz1=Math.max(...zs);
  const t=.28,h=.38,y=h/2-.02,cx=(px0+px1)/2,cz=(pz0+pz1)/2,pw=px1-px0+.2,pd=pz1-pz0+.2;
  // prem8: the band stops at exterior door openings (no 38 cm step in the doorway, leaves swing clear)
  const gaps=(hz,c)=>{const G=[];H.walls.forEach(w=>{const g=geo(w);const on=hz?Math.abs(g.u[1])<.01&&Math.abs(w.start[1]-c)<.05:Math.abs(g.u[0])<.01&&Math.abs(w.start[0]-c)<.05;if(!on)return;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const p0=hz?g.x0+g.u[0]*o.offset:g.z0+g.u[1]*o.offset,p1=hz?g.x0+g.u[0]*(o.offset+o.width):g.z0+g.u[1]*(o.offset+o.width);G.push([Math.min(p0,p1)-.02,Math.max(p0,p1)+.02]);});});return G.sort((a,b)=>a[0]-b[0]);};
  const band=(hz,c,a0,a1,off)=>{let s0=a0;for(const[g0,g1]of[...gaps(hz,c),[a1,a1]]){const e0=Math.min(g0,a1);if(e0-s0>.02&&(e0-s0>=.6||s0<=a0+.001||e0>=a1-.001)){const m=(s0+e0)/2,L=e0-s0;{const pm=FS.pl?FCM[FS.pl].m:M.plinth,bg=hz?new THREE.BoxGeometry(L,h,t):new THREE.BoxGeometry(t,h,L);if(FS.pl)boxUV(bg,m,0);const pm3=add(bg,pm,hz?m:c+off,y,hz?c+off:m,0,1);pm3.userData.noCol=true;pm3.userData.plinth=1;pm3.userData.plEnd=(s0<=a0+.001||e0>=a1-.001)?1:0;}}s0=Math.max(s0,g1);}};
  band(1,pz0,cx-(pw+.4)/2,cx+(pw+.4)/2,-t/2);band(1,pz1,cx-(pw+.4)/2,cx+(pw+.4)/2,t/2);band(0,px0,cz-pd/2,cz+pd/2,-t/2);band(0,px1,cz-pd/2,cz+pd/2,t/2);}
 // soft wall caps for dollhouse (hidden until doll mode)
 if(xs.length&&zs.length){H.walls.forEach(w=>{const g=geo(w),h=w.height||2.8,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0);if(e>0.2)return;
  const cap=add(new THREE.BoxGeometry(g.L,.04,w.thickness+.04),CAPM,g.x0+g.u[0]*g.L/2,e+h+.02,g.z0+g.u[1]*g.L/2,-Math.atan2(g.u[1],g.u[0]),1);
  cap.userData.cap=1;cap.userData.capY=cap.position.y;cap.userData.noCol=true;cap.visible=false;cap.castShadow=false;});}
 // prem8 h10: slim anthracite entrance canopy (1.2 m deep, door width + 1.2 m) 0.3 m above the entrance door, kept under the eaves
 {const hx=(fp[0]+fp[2])/2,hz=(fp[1]+fp[3])/2;H.walls.forEach(w=>{if(!w._ext)return;const e=(lv[w.level]||{elevation:0}).elevation+(w.base||0);if(e>.2)return;(w.openings||[]).forEach(o=>{if(o.type!=='door'||o.kind!=='entrance')return;
  const g=geo(w),t=w.thickness||.3,sm=o.offset+o.width/2,mx=g.x0+g.u[0]*sm,mz=g.z0+g.u[1]*sm;let nx=-g.u[1],nz=g.u[0];if((mx+nx-hx)**2+(mz+nz-hz)**2<(mx-nx-hx)**2+(mz-nz-hz)**2){nx=-nx;nz=-nz;}
  const y=Math.min(e+(o.height||2.1)+.3,th-.18),dp=1.2,cw=o.width+1.2,m=add(new THREE.BoxGeometry(cw,.1,dp),M.frame,mx+nx*(t/2+dp/2),y,mz+nz*(t/2+dp/2),-Math.atan2(g.u[1],g.u[0]),1);m.castShadow=true;m.userData.noCol=true;
  const sf=add(new THREE.BoxGeometry(cw-.04,.004,dp-.04),M.skirt,mx+nx*(t/2+dp/2),y-.052,mz+nz*(t/2+dp/2),-Math.atan2(g.u[1],g.u[0]),1);sf.userData.noCol=true;});});}
 // LOGIC RULE render: auto balconies for upper exterior doors (slab + glass railing on the 3 free sides) and French-window railings (app.js upperDoors)
 {const lvE=n=>((H.levels||[]).find(l=>l.name===n)||{elevation:0}).elevation||0;
  (H.balc||[]).forEach(B=>{const e=lvE(B.level),L=B.b-B.a,ang=-Math.atan2(B.u[1],B.u[0]),cx=B.o[0]+B.u[0]*(B.a+B.b)/2+B.n[0]*B.d/2,cz=B.o[1]+B.u[1]*(B.a+B.b)/2+B.n[1]*B.d/2;
   add(new THREE.BoxGeometry(L,.2,B.d),M.beton,cx,e-.08,cz,ang).userData.balc=1;
   const P=(s,d)=>[B.o[0]+B.u[0]*s+B.n[0]*d,B.o[1]+B.u[1]*s+B.n[1]*d];
   [[P(B.a,B.d),P(B.b,B.d)],[P(B.a,.02),P(B.a,B.d)],[P(B.b,.02),P(B.b,B.d)]].forEach(([q,r])=>{const l=Math.hypot(r[0]-q[0],r[1]-q[1]),an=-Math.atan2(r[1]-q[1],r[0]-q[0]),mx=(q[0]+r[0])/2,mz=(q[1]+r[1])/2;
    add(new THREE.BoxGeometry(l,.92,.02),M.glass,mx,e+.1+.46,mz,an);add(new THREE.BoxGeometry(l+.04,.05,.06),M.frame,mx,e+1.02,mz,an);});});
  H.walls.forEach(w=>{if(!w._ext)return;(w.openings||[]).forEach(o=>{if(!o.rail)return;const g=geo(w),e=lvE(w.level),t=(w.thickness||.3)/2+.06,s=o.offset+o.width/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,x=g.x0+g.u[0]*s+nx*t,z=g.z0+g.u[1]*s+nz*t,an=-Math.atan2(g.u[1],g.u[0]);
   add(new THREE.BoxGeometry(o.width+.1,.85,.02),M.glass,x,e+.15+.425,z,an);add(new THREE.BoxGeometry(o.width+.14,.045,.05),M.frame,x,e+1.0,z,an);});});}
 // ukážka 2 fix: on multi-storey houses the parts of a lower floor not covered by the floor above get their own flat roof (gravel slab + dark coping),
 // otherwise single-storey wings stayed open-topped. Slides away with the roof (userData.roof).
 if(roof!=='none')H.levels.forEach((l,i)=>{const up=H.levels[i+1];if(!up)return;const uc=CELLS[up.name]||[],lc=CELLS[l.name]||[],lw=H.walls.filter(w=>w.level===l.name);if(!lw.length)return;
  const lh=(l.elevation||0)+Math.max(...lw.map(w=>w.height||l.height||2.8));
  // LOGIC RULE: a lower roof that an upper door opens onto is a walkable deck: wood decking on top + 1 m glass railing on its parapets
  const DK=(H.decks||[]).filter(d=>d.level===l.name),dc=[];
  /* v20261117e LOGIC RULE (closed lower roof): every part of a lower room cell that is not under an upper room gets roof slab - the cell is cut along the
     upper cells' edges (grown by .3 m = under the upper walls) and each free piece is slabbed, so a terrace over part of a room is never an open hole.
     Pieces grow by .16 m only on the cell's own outer edges (cover the wall tops), never into the upper floor; a walkable deck gets decking on top. */
  /* v20261117q: the stair void up to the next floor counts as covered (it is open to the upper floor, never roofed over). audit: stair-void-capped */
  const ucg=uc.map(u=>[u[0]-.3,u[1]-.3,u[2]+.3,u[3]+.3]).concat((H.stairs||[]).filter(st=>st.level===l.name).map(stairRect));
  lc.forEach(r=>{const xs=[r[0],r[2]],zs=[r[1],r[3]];ucg.forEach(u=>{[u[0],u[2]].forEach(x=>{if(x>r[0]+.01&&x<r[2]-.01)xs.push(x);});[u[1],u[3]].forEach(z=>{if(z>r[1]+.01&&z<r[3]-.01)zs.push(z);});});
   xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);
   for(let a=0;a<xs.length-1;a++)for(let b=0;b<zs.length-1;b++){let x0=xs[a],x1=xs[a+1],z0=zs[b],z1=zs[b+1];if(x1-x0<.02||z1-z0<.02)continue;const cx=(x0+x1)/2,cz=(z0+z1)/2;
    if(ucg.some(u=>cx>u[0]&&cx<u[2]&&cz>u[1]&&cz<u[3]))continue;const d0=x0,d1=x1,e0=z0,e1=z1;
    if(x0<=r[0]+.001)x0-=.16;if(x1>=r[2]-.001)x1+=.16;if(z0<=r[1]+.001)z0-=.16;if(z1>=r[3]-.001)z1+=.16;
    const sl=add(new THREE.BoxGeometry(x1-x0,.2,z1-z0),FLATM,(x0+x1)/2,lh+.1,(z0+z1)/2,0,1);sl.userData.roof=1;sl.userData.lroof=1;LROOF.push([l.name,x0,z0,x1,z1]);
}});
  /* v20261117f LOGIC RULE (terrace from its outer boundary): the walkable deck is rasterised (5 cm) as "inside the lower building (rooms grown over
     partitions, clipped at the INNER faces of the outer walls)" minus "under the upper floor (upper rooms + their walls)". Decking = merged rectangles of
     that mask (no gaps, no slivers); open edges = mask cells whose outer neighbour lies in an outer wall -> merged straight runs for the railing. */
  const DG=[];if(DK.length){const S=.05,lwx=lw.filter(w=>w._ext),uw=H.walls.filter(w=>w.level===up.name);
   const dW=(ws,x,z,m)=>ws.some(w=>{const g=geo(w),px=x-g.x0,pz=z-g.z0,q=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1]));return Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)<(w.thickness||.3)/2+m;});
   const inL=(x,z)=>x>fp[0]&&x<fp[2]&&z>fp[1]&&z<fp[3]&&lc.some(r=>x>r[0]-.3&&x<r[2]+.3&&z>r[1]-.3&&z<r[3]+.3)&&!dW(lwx,x,z,0),
         unU=(x,z)=>uc.some(u=>x>u[0]-.02&&x<u[2]+.02&&z>u[1]-.02&&z<u[3]+.02)||dW(uw,x,z,.01)||encl(x,z),
         // v20261117g: a point boxed in by upper walls on all 4 sides (stair void, hall without a room cell) is INSIDE the upper floor, never a terrace
         encl=(x,z)=>[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>uw.some(w=>{const g=geo(w),ex=g.u[0]*g.L,ez=g.u[1]*g.L,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)return false;
           const qx=g.x0-x,qz=g.z0-z,t=(qx*ez-qz*ex)/den,s2=(qx*dz-qz*dx)/den;return t>0&&s2>=-.02&&s2<=1.02;}));
   const X0=fp[0]-.5,Z0=fp[1]-.5,NX=Math.ceil((fp[2]-fp[0]+1)/S),NZ=Math.ceil((fp[3]-fp[1]+1)/S),G=new Uint8Array(NX*NZ);
   for(let a=0;a<NX;a++)for(let b=0;b<NZ;b++){const x=X0+(a+.5)*S,z=Z0+(b+.5)*S;if(inL(x,z))G[a*NZ+b]=unU(x,z)?2:1;}// 1 deck, 2 under upper floor
   // v20261117g RULE (no sliver terraces): deck components narrower than 0.9 m or smaller than 1.5 m2 (strips along walls, wall-thickness offsets) stay plain roof:
   // no decking, no railing (marked 2 so the neighbouring real deck does not see an open edge there)
   {const lab=new Int32Array(NX*NZ).fill(-1);for(let a=0;a<NX;a++)for(let b=0;b<NZ;b++){const i0=a*NZ+b;if(G[i0]!==1||lab[i0]>=0)continue;const st=[i0],cc=[];lab[i0]=i0;
     while(st.length){const i=st.pop();cc.push(i);const ia=(i/NZ)|0,ib=i%NZ;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([p,q])=>{const A=ia+p,B=ib+q;if(A<0||B<0||A>=NX||B>=NZ)return;const j=A*NZ+B;if(G[j]===1&&lab[j]<0){lab[j]=i0;st.push(j);}});}
     let a0=1e9,a1=-1,b0=1e9,b1=-1;cc.forEach(i=>{const ia=(i/NZ)|0,ib=i%NZ;a0=Math.min(a0,ia);a1=Math.max(a1,ia);b0=Math.min(b0,ib);b1=Math.max(b1,ib);});
     if(Math.min(a1-a0+1,b1-b0+1)*S<.9||cc.length*S*S<1.5)cc.forEach(i=>G[i]=2);}}
   const used=new Uint8Array(NX*NZ);
   for(let a=0;a<NX;a++)for(let b=0;b<NZ;b++){if(G[a*NZ+b]!==1||used[a*NZ+b])continue;let b1=b;while(b1+1<NZ&&G[a*NZ+b1+1]===1&&!used[a*NZ+b1+1])b1++;let a1=a;
    while(a1+1<NX){let ok=true;for(let k=b;k<=b1;k++)if(G[(a1+1)*NZ+k]!==1||used[(a1+1)*NZ+k]){ok=false;break;}if(!ok)break;a1++;}
    for(let p=a;p<=a1;p++)for(let k=b;k<=b1;k++)used[p*NZ+k]=1;const r=[X0+a*S,Z0+b*S,X0+(a1+1)*S,Z0+(b1+1)*S];if((r[2]-r[0])*(r[3]-r[1])<.04)continue;DG.push(r);}
   /* v22u RULE (upper deck stay, PF.noDeckStay): walkable roof-terrace decking is solid underfoot, so walking there keeps you on that storey instead of dropping through noCol planks onto the floor below. audit: deck-stay */
   DG.forEach(r=>{dc.push(r);const stay=!(globalThis.__PF||{}).noDeckStay;const dk=add(new THREE.BoxGeometry(r[2]-r[0],.04,r[3]-r[1]),M.deck,(r[0]+r[2])/2,lh+.22,(r[1]+r[3])/2,0,stay?0:1);dk.userData.lroof=1;dk.userData.deck=1;dk.userData.walkDeck=1;DECKS.push([up.name,...r,lh+.24]);});
   /* v22r LOGIC RULE (upper deck cover, PF.noDeckCover): a walkable roof terrace gets a light anthracite pergola like the ground-floor terrace - slim posts only on
      the deck's outer corners (never inside the terrace where merged deck pieces meet), a perimeter beam 2.45 m above the deck and slats every 45 cm. Tagged
      roof+pergola+deckCover, so 'Bez strechy' (studio and AR) hides it like the roof. Pieces < 4 m2 or narrower than 1.5 m stay open. audit: deck-cover */
   if(!(globalThis.__PF||{}).noDeckCover){const xt=Math.max(.3,...lw.filter(w=>w._ext).map(w=>w.thickness||.3))/2;const CV=[];DG.slice().sort((p,q)=>(q[2]-q[0])*(q[3]-q[1])-(p[2]-p[0])*(p[3]-p[1])).forEach(r0=>{const w0=r0[2]-r0[0],d0=r0[3]-r0[1];if(w0*d0<4||Math.min(w0,d0)<1.5)return;
    // one cover per terrace: a deck piece whose frame would overlap an already covered piece stays open (no doubled beams, no coplanar overlap)
    if(CV.some(c=>r0[0]-xt-.1<c[2]&&r0[2]+xt+.1>c[0]&&r0[1]-xt-.1<c[3]&&r0[3]+xt+.1>c[1]))return;CV.push([r0[0]-xt,r0[1]-xt,r0[2]+xt,r0[3]+xt]);
    // frame = deck grown to the parapet centre line: posts stand ON the parapet (outside the walking area, never in furniture), beams and slats span over the deck
    const r=[r0[0]-xt,r0[1]-xt,r0[2]+xt,r0[3]+xt],w=r[2]-r[0],d=r[3]-r[1],y0=lh+.24,h=2.45,PM=M.frame,tg=o=>{o.userData.roof=1;o.userData.pergola=1;o.userData.deckCover=1;return o;};
    const inOther=(x,z)=>DG.some(q=>q!==r0&&x>q[0]-.08&&x<q[2]+.08&&z>q[1]-.08&&z<q[3]+.08)||unU(x,z);
    [[r[0],r[1],-1,-1],[r[2],r[1],1,-1],[r[0],r[3],-1,1],[r[2],r[3],1,1]].forEach(([x,z,sx,sz])=>{const ix=x-sx*xt,iz=z-sz*xt;if(inOther(ix-sx*.25,iz)||inOther(ix,iz-sz*.25)||inOther(ix+sx*.3,iz)||inOther(ix,iz+sz*.3))return;
     tg(add(new THREE.BoxGeometry(.1,h+.24-.4-.12,.1),PM,x,lh+.4+(h+.24-.4-.12)/2,z,0,1));});
    [[r[0],r[2],r[1]-.05,r[1]+.05],[r[0],r[2],r[3]-.05,r[3]+.05],[r[0]-.05,r[0]+.05,r[1]+.05,r[3]-.05],[r[2]-.05,r[2]+.05,r[1]+.05,r[3]-.05]].forEach(([a0,a1,b0,b1])=>tg(add(new THREE.BoxGeometry(a1-a0,.12,b1-b0),PM,(a0+a1)/2,y0+h-.06,(b0+b1)/2,0,1)));
    const along=w>=d;for(let s=(along?r[0]:r[1])+.45;s<(along?r[2]:r[3])-.3;s+=.45){if(along)tg(add(new THREE.BoxGeometry(.05,.09,d),PM,s,y0+h+.045,(r[1]+r[3])/2,0,1));else tg(add(new THREE.BoxGeometry(w,.09,.05),PM,(r[0]+r[2])/2,y0+h+.045,s,0,1));}});}
   // open edges: deck cell whose neighbour is neither deck nor under the upper floor
   const ED=[];const g=(a,b)=>a<0||b<0||a>=NX||b>=NZ?0:G[a*NZ+b];
   for(let a=0;a<NX;a++)for(let b=0;b<NZ;b++){if(g(a,b)!==1)continue;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{if(g(a+dx,b+dz))return;
     if(dx)ED.push({ax:1,n:dx,f:X0+(a+(dx>0?1:0))*S,a0:Z0+b*S,a1:Z0+(b+1)*S});else ED.push({ax:0,n:dz,f:Z0+(b+(dz>0?1:0))*S,a0:X0+a*S,a1:X0+(a+1)*S});});}
   ED.sort((p,q)=>p.ax-q.ax||p.n-q.n||p.f-q.f||p.a0-q.a0);const RN=[];ED.forEach(e=>{const r=RN[RN.length-1];if(r&&r.ax===e.ax&&r.n===e.n&&Math.abs(r.f-e.f)<.001&&e.a0<=r.a1+.001)r.a1=Math.max(r.a1,e.a1);else RN.push(Object.assign({},e));});
   const xT=Math.max(.3,...lwx.map(w=>w.thickness||.3)),PST=new Set();
   RN.forEach(r=>{if(r.a1-r.a0<.3)return;const c=r.f+r.n*xT/2,b0=r.a0-xT/2,b1=r.a1+xT/2,L=b1-b0,m=(b0+b1)/2,cx=r.ax?c:m,cz=r.ax?m:c,an=r.ax?Math.PI/2:0,dy=r.ax?-.003:0;
    const pL=L+xT-(r.ax?.004:0),pp=add(new THREE.BoxGeometry(pL,.35+dy,xT-(r.ax?.004:0)),M.fac,cx,lh+.175+dy/2,cz,an,1);pp.userData.roof=1;pp.castShadow=true;
    {const _m=add(new THREE.BoxGeometry(pL+.06,.05,xT+.06-(r.ax?.004:0)),M.frame,cx,lh+.375+dy,cz,an,1);_m.userData.roof=1;_m.userData.cope=1;}
    add(new THREE.BoxGeometry(L-.05,.62,.02),M.glass,cx,lh+.4+.31,cz,an,1).userData.rail=1;add(new THREE.BoxGeometry(L-.05,.05,.06),M.frame,cx,lh+1.05,cz,an,1).userData.rail=1;
    [b0,b1].forEach(b=>{const px=r.ax?c:b,pz=r.ax?b:c,k=px.toFixed(2)+','+pz.toFixed(2);if(PST.has(k))return;PST.add(k);add(new THREE.BoxGeometry(.06,.7,.06),M.frame,px,lh+.4+.35,pz,0,1).userData.rail=1;});});}
  lw.forEach(w=>{if(!w._ext)return;const g=geo(w),mx=g.x0+g.u[0]*g.L/2,mz=g.z0+g.u[1]*g.L/2;const T=w.thickness||.3,mg=T/2+.2;/* v20261117c: margin includes the wall's own half-thickness - a thick (48 cm) outer wall under the upper floor got a stray parapet ledge */if(uc.some(u=>mx>u[0]-mg&&mx<u[2]+mg&&mz>u[1]-mg&&mz<u[3]+mg))return;if(dc.length&&dc.some(r=>mx>r[0]-.6&&mx<r[2]+.6&&mz>r[1]-.6&&mz<r[3]+.6))return;/* v20261117e: deck walls get their parapet+railing per open deck edge below */const ang=-Math.atan2(g.u[1],g.u[0]),dy=Math.abs(g.u[1])>Math.abs(g.u[0])?-.003:0;/* v20261117s: walls along z sit 3 mm lower (parapet + coping) so the corner overlap never z-fights. audit: coplanar-overlap */
   const pp=add(new THREE.BoxGeometry(g.L+T,.35+dy,T),M.fac,mx,lh+.175+dy/2,mz,ang,1);pp.userData.roof=1;pp.castShadow=true;{const _m=add(new THREE.BoxGeometry(g.L+T+.06,.05,T+.06),M.frame,mx,lh+.375+dy,mz,ang,1);_m.userData.roof=1;_m.userData.cope=1;}});
});
 if(roof!=='none'&&IRR){const ah=.5,tc=(CELLS[top.name]||[]).concat(/* v20261117q: the stair void of the top floor is not a room cell - without it the slab left a hairline slit wherever the void is wider than 2x the wall growth (Adam: 'čiarka v streche'). audit: roof-hole */(H.stairs||[]).filter(st=>{const li=H.levels.findIndex(x=>x.name===st.level);return H.levels[li+1]===top;}).map(stairRect));
  /* v13c: ONE continuous roof - each room cell grows by the outer-wall thickness so the slab also covers every wall top (no gaps / dark wall lines above the roof); clipped to the building outline */
  {const gT=Math.max(.3,...tw.filter(w=>w._ext).map(w=>w.thickness||.3)),eo2=Math.max(.15,...tw.filter(w=>w._ext).map(w=>(w.thickness||.3)/2)),B=tc.reduce((b,r)=>[Math.min(b[0],r[0]),Math.min(b[1],r[1]),Math.max(b[2],r[2]),Math.max(b[3],r[3])],[fp[0]-eo2,fp[1]-eo2,fp[2]+eo2,fp[3]+eo2])/* v20261117q: the clip box never cuts into a room cell (a cell reaching past the outline left a ceiling strip open to the sky) */,ca=tc.reduce((a,r)=>a+(r[2]-r[0])*(r[3]-r[1]),0),fa=(fp[2]-fp[0])*(fp[3]-fp[1]);
   const cs=ca<.6*fa?[[fp[0],fp[1],fp[2],fp[3]]]:tc;cs.forEach(r=>{const x0=Math.max(B[0],r[0]-gT),x1=Math.min(B[2],r[2]+gT),z0=Math.max(B[1],r[1]-gT),z1=Math.min(B[3],r[3]+gT);if(x1-x0<.05||z1-z0<.05)return;add(new THREE.BoxGeometry(x1-x0,.2,z1-z0),FLATM,(x0+x1)/2,th+.1,(z0+z1)/2,0,1).userData.roof=1;});}
  /* v20261117b: designed projects (H.roofEdge==='parapet', clean drawn walls) get a real attic parapet along the top-floor outline: render (or the wall's own cladding) + dark coping,
     one box per exterior wall; neighbouring boxes differ by 2-3 mm in height so the corner overlap never z-fights. Rain-water downpipes come from H.downpipes [[x,z,topY?],..]. */
  if(H.roofEdge==='parapet'){tw.filter(w=>w._ext).forEach((w,i)=>{const g=geo(w),T=w.thickness||.3,ang=-Math.atan2(g.u[1],g.u[0]),mx=g.x0+g.u[0]*g.L/2,mz=g.z0+g.u[1]*g.L/2,L=g.L+T-.004,dy=(i%2)*.003;
    const k=typeof w.clad==='string'&&FCM[w.clad]?w.clad:null,bg=new THREE.BoxGeometry(L,ah+.1,T);if(k)boxUV(bg,mx+mz,th+ah/2);const p=add(bg,k?FCM[k].m:M.fac,mx,th+ah/2-.05+dy,mz,ang,1);p.userData.roof=1;p.castShadow=true;
    {const _m=add(new THREE.BoxGeometry(L+.06,.05,T+.06),M.frame,mx,th+ah+.025+dy,mz,ang,1);_m.userData.roof=1;_m.userData.cope=1;}});
   /* v20261117g RULE (downpipes never float): each pipe snaps to the outer face of the nearest exterior wall (5 cm gap, brackets), the rain-head sits flush on that
      wall right under the coping (never on top of it), and the pipe runs from the head to the ground. audit: downpipe-off-wall */
   const XW=H.walls.filter(w=>w._ext);(H.downpipes||[]).forEach(d=>{const top=d[2]!=null?d[2]:th+ah-.15;let bw=null,bd=1e9,bs=0;
    XW.forEach(w=>{if((((H.levels||[]).find(l=>l.name===w.level)||{}).elevation||0)>top-.5)return;const g=geo(w),px=d[0]-g.x0,pz=d[1]-g.z0,q=Math.max(.15,Math.min(g.L-.15,px*g.u[0]+pz*g.u[1])),dd=Math.hypot(px-g.u[0]*q,pz-g.u[1]*q);if(dd<bd){bd=dd;bw=w;bs=q;}});
    let x=d[0],z=d[1],nx=0,nz=0,an=0;if(bw){const g=geo(bw),T=(bw.thickness||.3)/2+.1;nx=-g.u[1]*bw._ext;nz=g.u[0]*bw._ext;x=g.x0+g.u[0]*bs+nx*T;z=g.z0+g.u[1]*bs+nz*T;an=-Math.atan2(g.u[1],g.u[0]);}
    const pt=top-.22,pm=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,pt,12),M.frame);pm.position.set(x,pt/2,z);pm.castShadow=true;pm.userData.roof=1;pm.userData.noCol=true;pm.userData.dpipe=1;root.add(pm);
    for(let y=.6;y<pt-.2;y+=1.6){const br=add(new THREE.BoxGeometry(.03,.03,.1),M.frame,x-nx*.05,y,z-nz*.05,an+Math.PI/2,1);br.userData.roof=1;}
    const hd=add(new THREE.BoxGeometry(.2,.18,.14),M.frame,x-nx*.02,top-.13,z-nz*.02,an,1);hd.userData.roof=1;hd.userData.dpipe=1;hd.userData.hopper=1;
    add(new THREE.BoxGeometry(.06,.06,.12),M.frame,x-nx*.09,top-.08,z-nz*.09,an+Math.PI/2,1).userData.roof=1;});}
  /* v13c: no per-wall parapets on irregular footprints - jogs/inner walls flagged exterior drew dark lines across the roof; the roof stays one flat slab */
  if(0)tw.forEach(w=>{if(!w._ext)return;const g=geo(w),T=w.thickness||.3,L=g.L+T,ang=-Math.atan2(g.u[1],g.u[0]),mx=g.x0+g.u[0]*g.L/2,mz=g.z0+g.u[1]*g.L/2;
   const p=add(new THREE.BoxGeometry(L,ah+.1,T),M.fac,mx,th+ah/2-.05,mz,ang,1);p.userData.roof=1;p.castShadow=true;
   add(new THREE.BoxGeometry(L+.06,.05,T+.06),M.frame,mx,th+ah+.025,mz,ang,1).userData.roof=1;});}
 else if(roof!=='none'){const eave=.40; // ~0.4 m overhang past wall outer face
  const houseW=fp[2]-fp[0], houseD=fp[3]-fp[1];
  const W=houseW+2*eave, D=houseD+2*eave, cx=(fp[0]+fp[2])/2, cz=(fp[1]+fp[3])/2;
  if(roof==='flat'){ // prem8 h3: modern flat roof = flush attic parapet in render + dark coping, no overhang (typical SK new-build)
   const eo=Math.max(.15,...H.walls.filter(w=>w._ext).map(w=>(w.thickness||.3)/2)),fq=[fp[0]-eo,fp[1]-eo,fp[2]+eo,fp[3]+eo],qW=fq[2]-fq[0],qD=fq[3]-fq[1],at=.3,ah=.5,cy=th+ah/2-.05,R=(w,d,x,z)=>{const m=add(new THREE.BoxGeometry(w,ah+.1,d),M.fac,x,cy,z,0,1);m.userData.roof=1;},C=(w,d,x,z)=>{const _m=add(new THREE.BoxGeometry(w,.05,d),M.frame,x,th+ah+.025,z,0,1);_m.userData.roof=1;_m.userData.cope=1;};
   add(new THREE.BoxGeometry(qW-.02,.2,qD-.02),FLATM,cx,th+.1,cz,0,1).userData.roof=1;
   R(qW,at,cx,fq[1]+at/2);R(qW,at,cx,fq[3]-at/2);R(at,qD-2*at,fq[0]+at/2,cz);R(at,qD-2*at,fq[2]-at/2,cz);
   // accent zones continue up the parapet (outer face overlay, 1 cm proud)
   FZW.forEach(([w,Z])=>{const g=geo(w),hz=Math.abs(g.u[1])<.01,vt=Math.abs(g.u[0])<.01;if(!hz&&!vt)return;const c=hz?w.start[1]:w.start[0],lo=hz?fp[1]:fp[0],hi=hz?fp[3]:fp[2];const side=Math.abs(c-lo)<.05?-1:Math.abs(c-hi)<.05?1:0;if(!side)return;const pl=(hz?(side<0?fq[1]:fq[3]):(side<0?fq[0]:fq[2]))+side*.011;
    Z.forEach(([za,zb,k])=>{const p0=hz?g.x0+g.u[0]*za:g.z0+g.u[1]*za,p1=hz?g.x0+g.u[0]*zb:g.z0+g.u[1]*zb,m0=Math.min(p0,p1),m1=Math.max(p0,p1),ln=m1-m0;if(ln<.3)return;const bg=hz?new THREE.BoxGeometry(ln,ah+.1,.02):new THREE.BoxGeometry(.02,ah+.1,ln);boxUV(bg,(m0+m1)/2,cy);add(bg,FCM[k].m,hz?(m0+m1)/2:pl,cy,hz?pl:(m0+m1)/2,0,1).userData.roof=1;});});
   C(qW+.06,at+.06,cx,fq[1]+at/2);C(qW+.06,at+.06,cx,fq[3]-at/2);C(at+.06,qD-2*at,fq[0]+at/2,cz);C(at+.06,qD-2*at,fq[2]-at/2,cz);}
  else{
   // Solid extruded gable. Eaves 0.4 m on all sides; mid-grey tiles; white end caps OUTSIDE extrude.
   const lng=W>=D;
   const along=lng?W:D, span=lng?D:W;
   const rh=Math.min(span,along)*.26;
   const hd=span/2;
   const shape=new THREE.Shape([new THREE.Vector2(-hd,0), new THREE.Vector2(hd,0), new THREE.Vector2(0,rh)]);
   const geo=new THREE.ExtrudeGeometry(shape,{depth:along,bevelEnabled:false,steps:1});
   geo.translate(0,0,-along/2);
   const rMat=M.roof.clone(); rMat.color.setHex(0x9aa3ab); rMat.side=THREE.DoubleSide;
   rMat.roughness=.72; rMat.metalness=.05; rMat.needsUpdate=true;
   const roofMesh=new THREE.Mesh(geo,rMat);
   roofMesh.castShadow=roofMesh.receiveShadow=true; roofMesh.userData.roof=1;
   // nest 2 cm onto wall tops so no float gap from elevated angles
   const ry=th-0.02;
   if(lng){ roofMesh.rotation.y=-Math.PI/2; roofMesh.position.set(cx, ry, cz); }
   else { roofMesh.position.set(cx, ry, cz); }
   root.add(roofMesh);
   // White gables OUTSIDE extruded ends (cover grey caps); full eave span
   {const gW=span;
    const gMat=(M.fac||M.wall).clone(); gMat.color.setHex(0xf7f5f0); gMat.side=THREE.DoubleSide; gMat.needsUpdate=true;
    const gable=(atNeg)=>{
      const g=new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-gW/2,0),new THREE.Vector2(gW/2,0),new THREE.Vector2(0,rh)]));
      const mesh=new THREE.Mesh(g, FGE&&FGE.neg===atNeg?facGable(FGE.k):gMat);
      mesh.userData.roof=1; mesh.userData.noCol=true; mesh.castShadow=true;
      const out=along/2+0.015; // just outside Extrude end face
      if(lng){ mesh.rotation.y=atNeg?Math.PI/2:-Math.PI/2; mesh.position.set(cx+(atNeg?-out:out), ry, cz); }
      else { mesh.rotation.y=atNeg?Math.PI:0; mesh.position.set(cx, ry, cz+(atNeg?-out:out)); }
      root.add(mesh);
    };
    gable(true); gable(false);}
   // prem8 h10: anthracite gutters along both eaves + 4 corner downspouts (pipe on the wall, short offset arm to the gutter)
   {const gr=.06,gy=ry-.03,aH=along-2*eave,sH=span-2*eave,P=(L,r,a,y,c,ax)=>{const g=new THREE.CylinderGeometry(r,r,L,10);if(ax==='a')lng?g.rotateZ(Math.PI/2):g.rotateX(Math.PI/2);else if(ax==='c')lng?g.rotateX(Math.PI/2):g.rotateZ(Math.PI/2);
     const m=new THREE.Mesh(g,M.frame);m.position.set(lng?cx+a:cx+c,y,lng?cz+c:cz+a);m.castShadow=true;m.userData.roof=1;m.userData.noCol=true;if(ax==='a')m.userData.gutter=1;root.add(m);};
    for(const sd of[-1,1]){P(along,gr,0,gy,sd*(hd+.03),'a');}}
  }}
 installDownpipes(root);
 // plot: muted lawn (plot only), soft ground, drive, terrace accents, trees, slim fence
 const P=H.plot;const xMinP=xs.length?Math.min(...xs)-6: -4,xMaxP=xs.length?Math.max(...xs)+6:20,zMinP=zs.length?Math.min(...zs)-6:-5,zMaxP=zs.length?Math.max(...zs)+6:15;
 // soft neighbouring ground (large disc under everything)
 {const gw=Math.max(40,xMaxP-xMinP+24),gd=Math.max(40,zMaxP-zMinP+24);const gnd=add(new THREE.CylinderGeometry(gw*.55,gw*.55,.04,48),M.ground,(xMinP+xMaxP)/2,-.04,(zMinP+zMaxP)/2,0,1);gnd.receiveShadow=true;gnd.castShadow=false;gnd.userData.noCol=true;}
 if(P&&P.pts&&P.pts.length>2){const sh=new THREE.Shape(P.pts.map(p=>new THREE.Vector2(p[0],-p[1])));const lg=new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2);const lm=new THREE.Mesh(lg,M.lawn);lm.userData.lawn=1;if(M.lawn.map)M.lawn.map.repeat.set(.35,.35);lm.position.y=-.01;lm.receiveShadow=true;lm.userData.noCol=true;root.add(lm);
  const zMin=Math.min(...P.pts.map(p=>p[1])),zMax=Math.max(...P.pts.map(p=>p[1])),xMin=Math.min(...P.pts.map(p=>p[0])),xMax=Math.max(...P.pts.map(p=>p[0]));
  const hx=(xs.length?(Math.min(...xs)+Math.max(...xs))/2: (xMin+xMax)/2), hz=zs.length?Math.min(...zs):zMin+2;/* v18e RULE (garage): a plan with a garage gets its driveway from the street to the garage door (no carport). audit: garage-door, garage-drive */
  const GA=P.garage||null;let DRX=GA?(GA.n[1]<-.5?GA.x:Math.max(xMin+1.8,Math.min(xMax-1.8,GA.x+(GA.n[0]||1)*3.6))):hx+4.2;
  // driveway with jointed paving
  // driveway on EAST side (away from west entrance) so walk-to-door stays clear
  const dEnd=GA?(GA.n[1]<-.5?GA.z+.05:GA.z+1.6):hz,dW=GA?Math.max(3.2,(GA.w||2.5)+.7):3.2,dLen=Math.max(4.5,dEnd-zMin+1.2),drive=add(new THREE.BoxGeometry(dW,.025,dLen),M.path,DRX,.008,(zMin+dEnd)/2-.1,0,1);drive.userData.drive=1;
  if(GA&&!(GA.n[1]<-.5)){/* side/back garage door: paved apron from the door to the driveway */const ax=Math.abs(GA.n[0])>.5,L=ax?Math.abs(DRX-GA.x)+dW/2:3.2;const ap=add(new THREE.BoxGeometry(ax?L:dW,.026,ax?dW:L),M.path,ax?(GA.x+DRX)/2+(DRX>GA.x?dW/4:-dW/4):GA.x,.009,ax?GA.z:GA.z+GA.n[1]*1.6,0,1);ap.userData.noCol=true;ap.userData.drive=1;}drive.receiveShadow=true;drive.userData.noCol=true;
  // prem8: outward frames of the entrance / terrace doors (door centre, outward normal, along-wall)
  const hcx=(Math.min(...xs)+Math.max(...xs))/2,hcz=(Math.min(...zs)+Math.max(...zs))/2;const dOut=k=>{let r=null;(H.walls||[]).forEach(w=>{(w.openings||[]).forEach(op=>{if(r||op.type!=='door'||op.kind!==k||(H.levels&&H.levels.length>1&&w.level!==H.levels[0].name))return;const g=geo(w),m=op.offset+op.width/2,cx=g.x0+g.u[0]*m,cz=g.z0+g.u[1]*m;let nx=-g.u[1],nz=g.u[0];if(nx*(cx-hcx)+nz*(cz-hcz)<0){nx=-nx;nz=-nz;}r={cx,cz,nx,nz,ux:g.u[0],uz:g.u[1],w:op.width,t:w.thickness||.3};});});return r;};
  /* v21n: a plan whose front door was read as a plain door (no 'entrance' kind) still has an entrance: the outer-wall door (not terrace /
     garage) facing the street (-z) first, then a side, then the back. audit: path-to-street */
  const dOutExt=()=>{if((globalThis.__PF||{}).noEntExt)return null;const L0=H.levels[0].name,ws=(H.walls||[]).filter(w=>w.level===L0),X0=Math.min(...xs),X1=Math.max(...xs),Z0=Math.min(...zs),Z1=Math.max(...zs);let best=null;
   ws.forEach(w=>{const g=geo(w),hz2=Math.abs(g.u[1])<.05,vt=Math.abs(g.u[0])<.05;if(!hz2&&!vt)return;const edge=hz2?(Math.abs(g.z0-Z0)<.45||Math.abs(g.z0-Z1)<.45):(Math.abs(g.x0-X0)<.45||Math.abs(g.x0-X1)<.45);const CR0=CELLS[L0],lab=(x,z)=>CR0&&CR0.labelAt?!!CR0.labelAt(x,z):null;
    (w.openings||[]).forEach(op=>{if(op.type!=='door'||op.kind==='terrace'||op.kind==='garage'||op.width>1.6)return;const m=op.offset+op.width/2,cx=g.x0+g.u[0]*m,cz=g.z0+g.u[1]*m;let nx=-g.u[1],nz=g.u[0];if(nx*(cx-hcx)+nz*(cz-hcz)<0){nx=-nx;nz=-nz;}
     /* v21o: a recessed front door (porch / entrance niche) is not on the outline: it counts when one side is a room and the other is outside */
     if(!edge){const A=lab(cx+nx*.7,cz+nz*.7),B=lab(cx-nx*.7,cz-nz*.7);if(A===null||A===B||(globalThis.__PF||{}).noRecessEnt)return;if(A){nx=-nx;nz=-nz;}}
     const sc=(nz<-.5?3:Math.abs(nx)>.5?2:1)-Math.abs(op.width-.9)-(edge?0:4);/* v21p: a door on the outline always beats a recessed one */if(!best||sc>best.sc)best={sc,r:{cx,cz,nx,nz,ux:g.u[0],uz:g.u[1],w:op.width,t:w.thickness||.3,ext:1}};});});return best?best.r:null;};
  const ENT=dOut('entrance')||dOutExt();let TER=dOut('terrace');
  /* v18k RULE (terrace where the plan draws it): a printed area OUTSIDE the walls (4-60 m2, the largest one) is the terrace. The deck goes on
     the exterior wall facing it - in front of that wall's door when it has one (living-room exit -> pergola), else centred on the label.
     audit: terrace-placed */
  const THint=(()=>{const L0=H.levels&&H.levels[0]&&H.levels[0].name;if(!xs.length)return null;const X0=Math.min(...xs),X1=Math.max(...xs),Z0=Math.min(...zs),Z1=Math.max(...zs);
   const A=(H.rarea||[]).filter(a=>a.level===L0&&a.p&&a.v>=4&&a.v<=60&&(a.p[0]<X0-.3||a.p[0]>X1+.3||a.p[1]<Z0-.3||a.p[1]>Z1+.3)&&a.p[0]>X0-8&&a.p[0]<X1+8&&a.p[1]>Z0-8&&a.p[1]<Z1+8).sort((a,b)=>b.v-a.v);if(!A.length)return null;const p=A[0].p;
   let best=null;(H.walls||[]).filter(w=>w.level===L0).forEach(w=>{const g=geo(w);if(g.L<1.5)return;const t=(p[0]-g.x0)*g.u[0]+(p[1]-g.z0)*g.u[1];if(t<.3||t>g.L-.3)return;const fx=g.x0+g.u[0]*t,fz=g.z0+g.u[1]*t;let nx=-g.u[1],nz=g.u[0];if(nx*(fx-hcx)+nz*(fz-hcz)<0){nx=-nx;nz=-nz;}
    const d=(p[0]-fx)*nx+(p[1]-fz)*nz;if(d<.2||d>7)return;if(Math.abs((p[0]-fx)*g.u[0]+(p[1]-fz)*g.u[1])>.01)return;if(!best||d<best.d)best={w,g,t,fx,fz,nx,nz,d};});
   if(!best)return null;const{w,g}=best;let dr=null;(w.openings||[]).forEach(op=>{if(op.type!=='door'||op.kind==='entrance'||op.kind==='garage')return;const m=op.offset+op.width/2;if(Math.abs(m-best.t)<3.5&&(!dr||Math.abs(m-best.t)<Math.abs(dr.m-best.t)))dr={m,op};});
   const m=dr?dr.m:best.t;return{p,v:A[0].v,f:{cx:g.x0+g.u[0]*m,cz:g.z0+g.u[1]*m,nx:best.nx,nz:best.nz,ux:g.u[0],uz:g.u[1],w:dr?dr.op.width:0,t:w.thickness||.3,nodoor:!dr}};})();
  if(THint)TER=THint.f;
  /* v18k: no readable label and no terrace door -> the paved area the plan draws against a facade (app.js terrInk) */
  let TInk=null;if(!THint&&!TER&&H.terrInk&&xs.length&&(!H.levels||H.terrInk.level===H.levels[0].name)){const k=H.terrInk,X0=Math.min(...xs),X1=Math.max(...xs),Z0=Math.min(...zs),Z1=Math.max(...zs),hz=k.s%2===0,n=[[0,-1],[-1,0],[0,1],[1,0]][k.s],e=[Z0,X0,Z1,X1][k.s],mid=(k.a+k.b)/2;
   let dr=null;(H.walls||[]).filter(w=>w.level===H.levels[0].name).forEach(w=>{const g=geo(w);if(hz?Math.abs(g.u[1])>.05||Math.abs(g.z0-e)>.45:Math.abs(g.u[0])>.05||Math.abs(g.x0-e)>.45)return;(w.openings||[]).forEach(op=>{if(op.type!=='door'||op.kind==='entrance'||op.kind==='garage'||op.width<.75)return;const m=op.offset+op.width/2,p=hz?g.x0+g.u[0]*m:g.z0+g.u[1]*m;if(p<k.a-.5||p>k.b+.5)return;if(!dr||Math.abs(p-mid)<Math.abs(dr.p-mid))dr={p,w:op.width,t:w.thickness||.3};});});
   const tl=Math.max(4,Math.min(8,k.b-k.a)),c=dr?dr.p:mid,sh=dr?Math.max(-(tl/2-.5),Math.min(tl/2-.5,mid-c)):0;
   TER={cx:hz?c:e,cz:hz?e:c,nx:n[0],nz:n[1],ux:hz?1:0,uz:hz?0:1,w:dr?dr.w:0,t:dr?dr.t:.3,nodoor:!dr,tl,sh,liv:!!k.liv};TInk=[hz?mid:e+n[0]*1.9,hz?e+n[1]*1.9:mid];}try{window.__terrHint=THint&&{p:THint.p,v:THint.v,door:!THint.f.nodoor};}catch(e){}

  // distance from a door to the plot edge along its outward normal
  const toEdge=D=>{const tx=D.nx>0?(xMax-D.cx)/D.nx:D.nx<0?(xMin-D.cx)/D.nx:1e9,tz=D.nz>0?(zMax-D.cz)/D.nz:D.nz<0?(zMin-D.cz)/D.nz:1e9;return Math.max(1.5,Math.min(tx,tz));};
  /* v21m RULE (path-to-street): the entrance path always reaches the street edge (-z): straight out of a street-facing door; out of a side
     door 1 m then down to the street; out of a back door 1 m, round the nearer side of the house and down. Each run is checked against the
     house walls and the plot; a run that would cut the house falls back to the other side, then to the old straight path. audit: path-to-street */
  const mkPath=(ENT)=>{const W2=.75,L0n=H.levels[0].name,WB2=(H.walls||[]).filter(w=>w.level===L0n).map(w=>{const t2=(w.thickness||.3)/2;return[Math.min(w.start[0],w.end[0])-t2,Math.min(w.start[1],w.end[1])-t2,Math.max(w.start[0],w.end[0])+t2,Math.max(w.start[1],w.end[1])+t2];});
   /* v21s: a wall line parallel to the entrance wall right at the door (a doubled outer-wall line read from the plan, a sill) does not block
      the path - only walls further out do. audit: path-to-street */
   const adj=b=>{if(!ENT||(globalThis.__PF||{}).noDoorAdj)return false;const m=ENT.t/2+.6;if(Math.abs(ENT.nz)>.5)return b[2]-b[0]>b[3]-b[1]&&b[0]<ENT.cx&&b[2]>ENT.cx&&b[1]>=ENT.cz-m&&b[3]<=ENT.cz+m;return b[3]-b[1]>b[2]-b[0]&&b[1]<ENT.cz&&b[3]>ENT.cz&&b[0]>=ENT.cx-m&&b[2]<=ENT.cx+m;};
   /* v22g RULE (wall band at the entrance): between the entrance wall and a doubled outer-wall line in front of it the path crosses solid wall mass;
      a cross-wall end that stops inside that band (no deeper out than the doubled line) does not block the path. PF.noEntBand. audit: path-to-street */
   const ax0=ENT&&Math.abs(ENT.nz)>.5,outx=b=>!ENT?0:ax0?(ENT.nz<0?ENT.cz-b[1]:b[3]-ENT.cz):(ENT.nx<0?ENT.cx-b[0]:b[2]-ENT.cx),adjL=ENT?WB2.filter(adj):[],
    bandD=(!ENT||(globalThis.__PF||{}).noEntBand||!adjL.length)?-1:Math.max(ENT.t/2,...adjL.map(outx)),
    inBand=(r,b)=>{if(bandD<0)return false;const o=[Math.max(r[0],b[0]),Math.max(r[1],b[1]),Math.min(r[2],b[2]),Math.min(r[3],b[3])];if(outx(o)>bandD+.02)return false;const lo=ax0?o[0]:o[1],hi=ax0?o[2]:o[3],c=ax0?ENT.cx:ENT.cz;return lo>c-W2-.6&&hi<c+W2+.6;};
   const HX0=Math.min(...xs),HX1=Math.max(...xs),clear=r=>r[0]>=xMin+.15&&r[2]<=xMax-.15&&r[1]>=zMin-.01&&r[3]<=zMax-.15&&!WB2.some(b=>!adj(b)&&!inBand(r,b)&&r[0]<b[2]-.02&&r[2]>b[0]+.02&&r[1]<b[3]-.02&&r[3]>b[1]+.02);
   const ok=L=>L.every(clear)?L:null;
   /* v21s RULE (path-to-street, any shape): when none of the fixed runs is clear (door in a recess / courtyard, house close to a plot
      side), route the path on a 0.25 m grid round the house walls to the street edge (fewest turns), as straight paved runs. PF.noGridPath */
   const GRIDP=()=>{const W2=.5;if((globalThis.__PF||{}).noGridPath||!ENT)return null;const S=.25,gx0=xMin,gz0=zMin,NX=Math.ceil((xMax-xMin)/S)+1,NZ=Math.ceil((zMax-zMin)/S)+1;if(NX*NZ>250000)return null;
    const sq=(x,z)=>[x-W2,z-W2,x+W2,z+W2],OK=new Int8Array(NX*NZ).fill(-1),okc=(i,k)=>{const q=k*NX+i;if(OK[q]<0)OK[q]=clear(sq(gx0+i*S,gz0+k*S))?1:0;return OK[q]===1;};
    /* v22g RULE (entrance path start slides): the first paved square may slide along the entrance wall (still covering the door opening, up to
       15 cm past its jamb) when a wall corner or a cross-wall end right beside the door clips it. PF.noStartSlide. audit: path-to-street */
    const uX=ENT.ux!=null?ENT.ux:Math.abs(ENT.nz)>.5?1:0,uZ=ENT.uz!=null?ENT.uz:Math.abs(ENT.nx)>.5?1:0,smax=(globalThis.__PF||{}).noStartSlide?0:Math.max(0,W2-(ENT.w||.9)/2+.15),SH=[0];for(let q=.05;q<=smax+1e-6;q+=.05)SH.push(q,-q);
    let si=-1,sk=-1,st=0,R0=null,fx=0,fz=0;for(const sh of SH){fx=ENT.cx+ENT.nx*t2+uX*sh;fz=ENT.cz+ENT.nz*t2+uZ*sh;si=-1;
     for(let d=W2;d<=W2+1.01&&si<0;d+=S){const i=Math.round((fx+ENT.nx*d-gx0)/S),k=Math.round((fz+ENT.nz*d-gz0)/S);if(i>=0&&k>=0&&i<NX&&k<NZ&&okc(i,k)){si=i;sk=k;st=d;}}
     if(si<0)continue;const sx=gx0+si*S,sz=gz0+sk*S,R=[Math.min(fx,sx)-(Math.abs(ENT.nx)>.5?0:W2),Math.min(fz,sz)-(Math.abs(ENT.nz)>.5?0:W2),Math.max(fx,sx)+(Math.abs(ENT.nx)>.5?0:W2),Math.max(fz,sz)+(Math.abs(ENT.nz)>.5?0:W2)];
     if(Math.abs(ENT.nx)>.5){R[1]=sz-W2;R[3]=sz+W2;}else{R[0]=sx-W2;R[2]=sx+W2;}if(clear(R)){R0=R;break;}si=-1;}
    if(!R0)return null;
    const DI=[[1,0],[-1,0],[0,1],[0,-1]],N=NX*NZ,GD=new Int8Array(N).fill(-1),C=new Int32Array(N*4).fill(1e9),PR=new Int32Array(N*4).fill(-1),B=[];const push=(c,v)=>{(B[c]||(B[c]=[])).push(v);};
    for(let d=0;d<4;d++){C[(sk*NX+si)*4+d]=0;push(0,(sk*NX+si)*4+d);}let goal=-1;
    for(let c=0;c<B.length&&goal<0;c++){const L=B[c];if(!L)continue;for(let t=0;t<L.length;t++){const v=L[t];if(C[v]!==c)continue;const q=v>>2,dd=v&3,i=q%NX,k=(q/NX)|0;
      if(GD[q]<0)GD[q]=clear([gx0+i*S-W2,zMin,gx0+i*S+W2,gz0+k*S+W2])?1:0;if(GD[q]===1){goal=v;break;}
      for(let d=0;d<4;d++){const ni=i+DI[d][0],nk=k+DI[d][1];if(ni<0||nk<0||ni>=NX||nk>=NZ||!okc(ni,nk))continue;const nv=(nk*NX+ni)*4+d,nc=c+1+(d!==dd?4:0);if(nc<C[nv]){C[nv]=nc;PR[nv]=v;push(nc,nv);}}}}
    if(goal<0)return null;const P=[];for(let v=goal;v>=0;v=PR[v])P.push(v>>2);P.reverse();const pt=q=>[gx0+(q%NX)*S,gz0+((q/NX)|0)*S];const out=[R0];let a0=0;
    for(let t=1;t<=P.length;t++){if(t<P.length&&t>=2){const A=pt(P[t-2]),Bq=pt(P[t-1]),Cq=pt(P[t]);if((Bq[0]-A[0])*(Cq[1]-Bq[1])-(Bq[1]-A[1])*(Cq[0]-Bq[0])===0)continue;}else if(t<P.length)continue;
     const A=pt(P[a0]),E=pt(P[t-1]);out.push([Math.min(A[0],E[0])-W2,Math.min(A[1],E[1])-W2,Math.max(A[0],E[0])+W2,Math.max(A[1],E[1])+W2]);a0=t-1;}
    const G=pt(P[P.length-1]);out.push([G[0]-W2,zMin,G[0]+W2,G[1]+W2]);return out;};if((globalThis.__PF||{}).noStreetPath||!ENT)return null;const cx=ENT.cx,cz=ENT.cz,t2=ENT.t/2;
   if(ENT.nz<-.5)return ok([[cx-W2,zMin,cx+W2,cz-t2]])||GRIDP();
   if(Math.abs(ENT.nx)>.9){const e=cx+ENT.nx*t2,xo=e+ENT.nx*(1.0+W2);return ok([[Math.min(e,xo),cz-W2,Math.max(e,xo),cz+W2],[xo-W2,zMin,xo+W2,cz+W2]])||GRIDP();}
   const e=cz+t2,zo=e+1.0+W2;for(const sd of (cx-HX0<HX1-cx?[-1,1]:[1,-1])){const xo=sd<0?HX0-1.0-W2:HX1+1.0+W2,L=ok([[cx-W2,e,cx+W2,zo+W2],[Math.min(cx,xo)-W2,zo-W2,Math.max(cx,xo)+W2,zo+W2],[xo-W2,zMin,xo+W2,zo+W2]]);if(L)return L;}return GRIDP();};
  const PATHR=mkPath(ENT);
  try{window.__entPath={ent:ENT?{cx:ENT.cx,cz:ENT.cz,nx:ENT.nx,nz:ENT.nz}:null,rects:PATHR,zMin};}catch(e){}
  // prem8 h5: carport (slim dark steel posts, flat dark roof) over the driveway. Candidates: current driveway, then beside the house (E/W).
  // A candidate is rejected if it leaves the plot, touches the house, covers a path, or comes within 1.2 m of any door/window; the driveway follows the pick.
  {const X0=Math.min(...xs),X1=Math.max(...xs),Z0=Math.min(...zs),Z1=Math.max(...zs),OP=[];
   (H.walls||[]).forEach(w=>(w.openings||[]).forEach(op=>{const g=geo(w);for(const f of[0,.5,1]){const m=op.offset+op.width*f;OP.push([g.x0+g.u[0]*m,g.z0+g.u[1]*m]);}}));
   const PR=[[X0+1.7-.75,X0+1.7+.75,zMin,hz]];if(PATHR)PATHR.forEach(r=>PR.push([r[0],r[2],r[1],r[3]]));if(ENT){const Lp=toEdge(ENT);const ex=ENT.cx+ENT.nx*Lp,ez=ENT.cz+ENT.nz*Lp;PR.push([Math.min(ENT.cx,ex)-.75-Math.abs(ENT.nz)*0,Math.max(ENT.cx,ex)+.75,Math.min(ENT.cz,ez)-.75,Math.max(ENT.cz,ez)+.75]);}
   const hw=1.5,ok=(cx,z0,z1)=>{const x0=cx-hw,x1=cx+hw;if(x0<xMin+.2||x1>xMax-.2||z0<zMin+.2||z1>zMax-.2)return false;if(x1>X0-.3&&x0<X1+.3&&z1>Z0-.3&&z0<Z1+.3)return false;
    if(OP.some(([x,z])=>x>x0-1.2&&x<x1+1.2&&z>z0-1.2&&z<z1+1.2))return false;if(PR.some(r=>x1>r[0]&&x0<r[1]&&z1>r[2]&&z0<r[3]))return false;if((H.balc||[]).some(B=>x1>B.r[0]-.3&&x0<B.r[2]+.3&&z1>B.r[1]-.3&&z0<B.r[3]+.3))return false;return true;};
   const C=[[hx+4.2,zMin+.4,Math.min(zMin+.4+5.5,hz-.4)],[X1+.4+hw,zMin+.4,zMin+5.4],[X0-.4-hw,zMin+.4,zMin+5.4]].filter(c=>c[2]-c[1]>=4.4);const pick=C.find(c=>ok(...c));window.__cp={C,pick:pick||null};
   if(pick&&P.carport!==false){const[dX,cz0,cz1]=pick,L=cz1-cz0,cy=(cz0+cz1)/2,cm=std({color:0x2d3034,roughness:.6,metalness:.3});DRX=dX;
    const dl=Math.max(cz1+.3,hz)-(zMin-.6);drive.geometry.dispose();drive.geometry=new THREE.BoxGeometry(2*hw,.025,dl);drive.position.set(dX,.008,zMin-.6+dl/2);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{add(new THREE.BoxGeometry(.1,2.3,.1),cm,dX+sx*(hw-.15),1.15,cy+sz*(L/2-.2),0,1);});
    const rf=add(new THREE.BoxGeometry(2*hw+.2,.16,L+.3),cm,dX,2.38,cy,0,1);rf.castShadow=true;rf.userData.noCol=true;
    add(new THREE.BoxGeometry(2*hw-.1,.04,L),M.frame,dX,2.29,cy,0,1).userData.noCol=true;}}
  if(PATHR)PATHR.forEach(r=>{add(new THREE.BoxGeometry(r[2]-r[0],.02,r[3]-r[1]),M.path,(r[0]+r[2])/2,.01,(r[1]+r[3])/2,0,1).userData.noCol=true;});
  /* v21m front garden: Stani kit plants in pots flank the entrance door and the street end of the path (kept off every paved run and
     inside the plot). audit: path-to-street, site-clear */
  if(PATHR&&ENT&&!(globalThis.__PF||{}).noFrontPlants){const onPave=(x,z)=>PATHR.some(r=>x>r[0]-.3&&x<r[2]+.3&&z>r[1]-.3&&z<r[3]+.3),inPlot=(x,z)=>x>xMin+.4&&x<xMax-.4&&z>zMin+.4&&z<zMax-.4;
   const pot=(x,z,h)=>{if(onPave(x,z)||!inPlot(x,z))return;const g=makeFurn('plant',{w:.5,d:.5,h},{sty:H.style||''});g.position.set(x,0,z);g.userData.outdoor=1;g.userData.noCol=true;root.add(g);};
   const tx=-ENT.nz,tz=ENT.nx,o0=ENT.t/2+.4,s0=.75+.45;[-1,1].forEach(sg=>pot(ENT.cx+ENT.nx*o0+tx*s0*sg,ENT.cz+ENT.nz*o0+tz*s0*sg,1.0));
   const L=PATHR[PATHR.length-1],mx=(L[0]+L[2])/2;[-1,1].forEach(sg=>pot(mx+sg*(.75+.45),zMin+.8,.8));}
  else if(ENT&&Math.abs(ENT.nx)>.9){// path to a door on an east/west facade
   const Lp=toEdge(ENT)-.1;add(new THREE.BoxGeometry(Lp,.02,1.5),M.path,ENT.cx+ENT.nx*(ENT.t/2+Lp/2),.01,ENT.cz,0,1).userData.noCol=true;}
  else if(ENT){const Lp=toEdge(ENT)-.1;add(new THREE.BoxGeometry(1.5,.02,Lp),M.path,ENT.cx,.01,ENT.cz+ENT.nz*(ENT.t/2+Lp/2),0,1).userData.noCol=true;}
  else // front path to door (center-west)
  add(new THREE.BoxGeometry(1.5,.02,Math.max(2.8,hz-zMin)),M.path,Math.min(...xs)+1.7,.01,(zMin+hz)/2,0,1).userData.noCol=true;
  // terrace (south / max z of house)
  const tw=Math.min(7.5,(xs.length?Math.max(...xs)-Math.min(...xs):6)-.6), terrZ=(zs.length?Math.max(...zs):zMax-2)+1.55;
  let terr;if(TER){// slab in front of the terrace door, shifted away from the entrance
   const tl=TER.tl||6.0,dp=3.4;let sh=TER.sh!=null?TER.sh:TER.nodoor?0:tl/2-.8;if(TER.sh==null&&ENT){const se=(ENT.cx-TER.cx)*TER.ux+(ENT.cz-TER.cz)*TER.uz;if(se>0)sh=-sh;}
   /* v18k: the deck slides along its wall (door kept on it) until it hits no other wall - an L-corner or a wing never cuts through the set */
   {const L0n=H.levels&&H.levels[0]&&H.levels[0].name,WBt=(H.walls||[]).filter(w=>w.level===L0n).map(w=>{const t2=(w.thickness||.3)/2;return[Math.min(w.start[0],w.end[0])-t2,Math.min(w.start[1],w.end[1])-t2,Math.max(w.start[0],w.end[0])+t2,Math.max(w.start[1],w.end[1])+t2];});
    const hit=s=>{const x=TER.cx+TER.nx*(TER.t/2+dp/2)+TER.ux*s,z=TER.cz+TER.nz*(TER.t/2+dp/2)+TER.uz*s,ew=Math.abs(TER.nx)>.9,hx=(ew?dp:tl)/2-.06,hz=(ew?tl:dp)/2-.06;return WBt.some(b=>x-hx<b[2]&&x+hx>b[0]&&z-hz<b[3]&&z+hz>b[1]);};
    if(hit(sh)){const lim=TER.nodoor?tl/2:tl/2-.5;const C=[-sh];for(let d=.25;d<=lim;d+=.25)C.push(sh>0?sh-d:sh+d,sh>0?sh+d:sh-d);const f=C.find(s=>Math.abs(s)<=lim+1e-6&&!hit(s));if(f!=null)sh=f;}}
   /* v22d RULE (deck outside the house): a deck with no terrace door whose slab would cover rooms (a wall line parallel to its own runs through it - the
      chosen wall was an inner one) moves out along its normal past the farthest such wall, so it sits outside the outer wall. PF.noTerrOut */
   let po=0;if(TER.nodoor&&!(globalThis.__PF||{}).noTerrOut){const L0n=H.levels&&H.levels[0]&&H.levels[0].name,Wp=(H.walls||[]).filter(w=>w.level===L0n),ew0=Math.abs(TER.nx)>.9;
    for(let it=0;it<8;it++){const x=TER.cx+TER.nx*(TER.t/2+dp/2+po)+TER.ux*sh,z=TER.cz+TER.nz*(TER.t/2+dp/2+po)+TER.uz*sh,hx=(ew0?dp:tl)/2-.06,hz=(ew0?tl:dp)/2-.06;let far=null;
     Wp.forEach(w=>{if(ew0?Math.abs(w.start[0]-w.end[0])>.05:Math.abs(w.start[1]-w.end[1])>.05)return;const t2=(w.thickness||.3)/2,b=[Math.min(w.start[0],w.end[0])-t2,Math.min(w.start[1],w.end[1])-t2,Math.max(w.start[0],w.end[0])+t2,Math.max(w.start[1],w.end[1])+t2];
      if(!(x-hx<b[2]&&x+hx>b[0]&&z-hz<b[3]&&z+hz>b[1]))return;const nn=(ew0?(w.start[0]-TER.cx)*TER.nx:(w.start[1]-TER.cz)*TER.nz)+t2;if(nn>0&&(far==null||nn>far))far=nn;});
     if(far==null)break;po=far-TER.t/2+.02;}if(po>9)po=0;if(po)try{window.__terrOut=+po.toFixed(2);}catch(e){}}
   const cx=TER.cx+TER.nx*(TER.t/2+dp/2+po)+TER.ux*sh,cz=TER.cz+TER.nz*(TER.t/2+dp/2+po)+TER.uz*sh,ew=Math.abs(TER.nx)>.9;
   terr=add(new THREE.BoxGeometry(ew?dp:tl,.12,ew?tl:dp),M.deck,cx,.06,cz,0,1);terr.userData.tf={cx,cz,ux:TER.ux,uz:TER.uz,nx:TER.nx,nz:TER.nz,L:tl,D:dp,door:TER.nodoor?null:-sh,dw:TER.w||1.6,liv:TER.nodoor&&!TER.liv?0:1,hint:THint?THint.p:TInk};}
  else{terr=add(new THREE.BoxGeometry(tw,.12,3.2),M.deck,hx,.06,terrZ+.2,0,1);terr.userData.tf={cx:hx,cz:terrZ+.2,ux:1,uz:0,nx:0,nz:1,L:tw,D:3.2,door:null,liv:0};}terr.receiveShadow=true;terr.userData.noCol=true;terr.userData.terrace=1;
  /* v18j RULES (terrace = the demo villa's terrace, generic): the deck sits 12 cm above the lawn with a stone edge (one step down),
     carries the villa set from the furniture kit/asset pack (outdoor table + 4 chairs, lounger, potted plants in planters on the
     outer corners), a wall light by the door and - in front of a terrace door - a slim pergola. A 1.2 m path straight out of the door
     and 0.6 m in front of the wall stay free. audit: terrace-furnished, terrace-clear */
  {const T=terr.userData.tf;try{window.__terrT=T;}catch(e){}if(T&&T.L>=3.2&&T.D>=2.6&&!(H.furn||[]).some(f=>f.t==='otable')){const S=STY[H.style]||{},cols={wood:S.wood||'#b08a62',fab:'#6d6a5f',sty:H.style||''};const W=(u,n)=>[T.cx+T.ux*u+T.nx*n,T.cz+T.uz*u+T.nz*n];
   const edge=std({color:0x8d877d,roughness:.85});const ew=Math.abs(T.nx)>.5;const bx=(u0,u1,n0,n1,h,m,y)=>{const a=W((u0+u1)/2,(n0+n1)/2),lu=Math.abs(u1-u0),ln=Math.abs(n1-n0);const o=add(new THREE.BoxGeometry(ew?ln:lu,h,ew?lu:ln),m,a[0],y,a[1],0,1);o.userData.noCol=true;o.userData.terrE=1;return o;};
   const hL=T.L/2,hD=T.D/2;bx(-hL-.06,hL+.06,hD,hD+.12,.13,edge,.065);bx(-hL-.12,-hL,-hD,hD+.12,.13,edge,.065);bx(hL,hL+.12,-hD,hD+.12,.13,edge,.065);
   bx(-hL-.06,hL+.06,hD+.12,hD+.42,.06,edge,.03);/* step down to the lawn */
   const kit=(t,u,n,fx,fz,F)=>{const FF=F||FUR[t];if(!FF)return null;const g=makeFurn(t,FF,cols);const p=W(u,n);g.position.set(p[0],.12,p[1]);const dx=T.ux*fx+T.nx*fz,dz=T.uz*fx+T.nz*fz;g.rotation.y=Math.atan2(dx,dz);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});g.userData.terrF=t;g.userData.kit=1;g.userData.noCol=true;root.add(g);return g;};
   const du=T.door==null?-9:T.door,free=(u,r)=>Math.abs(u-du)>.6+r;/* door path */
   let tu=T.door==null?-hL*.25:(du<0?Math.min(hL-1.4,du+1.9):Math.max(-hL+1.4,du-1.9));const tn=.15;
   kit('otable',tu,tn,0,1,{...FUR.otable,w:1.4,d:.85});[[-.95,0,1,0],[.95,0,-1,0],[0,-.75,0,1],[0,.75,0,-1]].forEach(([a,b,fx,fz])=>{if(tn+b<-hD+.55)return;kit('chair',tu+a,tn+b,fx,fz);});
   const lu=T.door==null?hL*.6:(du<0?hL-.75:-hL+.75);if(free(lu,.5))kit('lounge',lu,hD-.9,0,-1);
   {let np=0;[[-hL+.3,hD-.3],[hL-.3,hD-.3],[-hL+.3,-hD+.35],[hL-.3,-hD+.35],[0,hD-.3]].forEach(([u,n])=>{if(np>=2||!free(u,.3))return;np++;const pl=bx(u-.22,u+.22,n-.22,n+.22,.42,std({color:0x6f6a62,roughness:.9}),.12+.21);pl.userData.planter=1;kit('plant',u,n,0,1).position.y=.54;});}
   const shrub=(u,n,sc)=>{const m=makeShrub(sc);const p=W(u,n);m.position.set(p[0],0,p[1]);m.userData.noCol=true;m.userData.terrS=1;root.add(m);};for(let u=-hL+.9;u<hL-.6;u+=1.4)if(free(u,.4))shrub(u,hD+.75,.45);
   /* v22b RULE (terrace clear of walls, generic): after the set is laid, any group (table+chairs, lounger, plant+planter) whose footprint reaches into a
      ground-floor wall slides to the nearest spot on the deck (25 cm grid, up to 2.5 m) that is clear of walls, the door path and the other pieces;
      a group with no such spot is left out (the table set is kept). PF.noTerrWall */
   if(!(globalThis.__PF||{}).noTerrWall){try{const ln=H.levels[0]&&H.levels[0].name,WB=[];(H.walls||[]).filter(w=>w.level===ln).forEach(w=>{const t2=(w.thickness||.3)/2;WB.push([Math.min(w.start[0],w.end[0])-t2,Math.min(w.start[1],w.end[1])-t2,Math.max(w.start[0],w.end[0])+t2,Math.max(w.start[1],w.end[1])+t2]);});
    const ov=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];const bq=os=>{const b=new THREE.Box3();os.forEach(o=>{o.updateMatrixWorld(true);b.expandByObject(o);});return [b.min.x+.03,b.min.z+.03,b.max.x-.03,b.max.z-.03];};
    const db=bq([terr]),deck=[db[0]-.1,db[1]-.1,db[2]+.1,db[3]+.1];let DP=null;if(T.door!=null){const c=W(T.door,-hD),e=W(T.door,hD);DP=[Math.min(c[0],e[0])-Math.abs(T.ux)*.6,Math.min(c[1],e[1])-Math.abs(T.uz)*.6,Math.max(c[0],e[0])+Math.abs(T.ux)*.6,Math.max(c[1],e[1])+Math.abs(T.uz)*.6];}
    const K=root.children.filter(o=>o.userData&&(o.userData.terrF||o.userData.planter));const used=new Set(),GR=[];
    {const tb=K.filter(o=>o.userData.terrF==='otable'||o.userData.terrF==='chair');if(tb.length){GR.push({os:tb,keep:1});tb.forEach(o=>used.add(o));}}
    K.forEach(o=>{if(used.has(o))return;const g=[o];used.add(o);if(o.userData.terrF==='plant'||o.userData.planter)K.forEach(p=>{if(!used.has(p)&&(p.userData.terrF==='plant'||p.userData.planter)&&Math.hypot(p.position.x-o.position.x,p.position.z-o.position.z)<.05){g.push(p);used.add(p);}});GR.push({os:g});});
    GR.forEach(g=>g.q=bq(g.os));
    GR.forEach(g=>{if(!WB.some(w=>ov(g.q,w)))return;const C=[];for(let a=-2.5;a<=2.5001;a+=.25)for(let b=-2.5;b<=2.5001;b+=.25)if(a||b)C.push([a,b]);C.sort((x,y)=>Math.hypot(x[0],x[1])-Math.hypot(y[0],y[1]));
     const fit=C.find(([a,b])=>{const dx=T.ux*a+T.nx*b,dz=T.uz*a+T.nz*b,q=[g.q[0]+dx,g.q[1]+dz,g.q[2]+dx,g.q[3]+dz];return q[0]>=deck[0]&&q[1]>=deck[1]&&q[2]<=deck[2]&&q[3]<=deck[3]&&!WB.some(w=>ov([q[0]-.05,q[1]-.05,q[2]+.05,q[3]+.05],w))&&!(DP&&ov(q,DP))&&!GR.some(h=>h!==g&&!h.gone&&ov(q,h.q));});
     if(fit){const dx=T.ux*fit[0]+T.nx*fit[1],dz=T.uz*fit[0]+T.nz*fit[1];g.os.forEach(o=>{o.position.x+=dx;o.position.z+=dz;});g.q=[g.q[0]+dx,g.q[1]+dz,g.q[2]+dx,g.q[3]+dz];}
     else if(!g.keep){g.os.forEach(o=>root.remove(o));g.gone=1;}});
    try{window.__terrWall=1;}catch(e){}}catch(e){}}
   if(T.door!=null){/* wall light beside the door */const p=W(du+(du<0?.95:-.95),-hD+.06);const wl=add(new THREE.BoxGeometry(.12,.22,.1),std({color:0x2c2c2c,roughness:.5}),p[0],2.1,p[1],0,1);wl.userData.noCol=true;wl.userData.terrL=1;const gl=add(new THREE.BoxGeometry(.08,.12,.02),std({color:0xfff1d0,emissive:0xffd9a0,emissiveIntensity:.8}),p[0]+T.nx*.06,2.1,p[1]+T.nz*.06,0,1);gl.castShadow=false;gl.userData.noCol=true;}
   if(T.liv){/* slim pergola over the deck (v21c: also off the living room without a readable door): 2 outer posts, beams to the wall, slats */const PM=std({color:0x3b3a37,roughness:.6,metalness:.3}),h=2.55;
    [[-hL+.12,hD-.12],[hL-.12,hD-.12]].forEach(([u,n])=>{const p=W(u,n);const po=add(new THREE.BoxGeometry(.1,h,.1),PM,p[0],.12+h/2,p[1],0,1);po.userData.pergola=1;});
    bx(-hL+.07,hL-.07,hD-.17,hD-.07,.14,PM,.12+h-.07).userData.pergola=1;[-hL+.12,hL-.12].forEach(u=>{bx(u-.05,u+.05,-hD+.02,hD-.07,.14,PM,.12+h-.07).userData.pergola=1;});
    for(let u=-hL+.5;u<hL-.3;u+=.45)bx(u-.025,u+.025,-hD+.02,hD-.12,.1,PM,.12+h+.05).userData.pergola=1;}
  }}
  // path lamps (2)
  const lamp=(x,z)=>{add(new THREE.CylinderGeometry(.04,.05,1.1,6),M.frame,x,.55,z,0,1);const cap=add(new THREE.SphereGeometry(.1,6,4),std({color:0xf5e6c8,roughness:.4,emissive:0x665533,emissiveIntensity:.35}),x,1.15,z,0,1);cap.castShadow=false;};
  lamp(hx-4.2,hz-1.5);lamp(hx+1.5,hz-1.2);
  // v18e: a car from the asset pack stands in the garage (or in front of its door when the garage is too short for it)
  if(GA){const car=makeCar('#5f6f7e'),ax=Math.abs(GA.n[0])>.5,dep=GA.bb?(ax?GA.bb[2]-GA.bb[0]:GA.bb[3]-GA.bb[1]):0,bw=GA.bb?Math.min(GA.bb[2]-GA.bb[0],GA.bb[3]-GA.bb[1]):0,bl=GA.bb?Math.max(GA.bb[2]-GA.bb[0],GA.bb[3]-GA.bb[1]):0,ins=dep>=4.7,side=!ins&&bl>=4.6&&bw>=2.4/* v18k: a garage the car fits in keeps it inside, along its long axis, even when the door sits on the long side - never parked across the door */,lx=GA.bb&&(GA.bb[2]-GA.bb[0])>=(GA.bb[3]-GA.bb[1]);const e0=(H.levels[0]&&H.levels[0].elevation)||0;
   const ii=ins||side,px=ii?GA.c[0]:GA.x+GA.n[0]*3.2,pz=ii?GA.c[1]:GA.z+GA.n[1]*3.2;car.position.set(px,ii?e0+.02:0,pz);car.rotation.y=side?(lx?Math.PI/2:0):ax?Math.PI/2:0;car.userData.noCol=true;car.userData.car=1;root.add(car);}
  // hedge soft strips (not walls)
  const hedgeMat=std({color:0x4a6340,roughness:1,map:grass});
  const mkHedge=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),ang=-Math.atan2(z1-z0,x1-x0);const m=add(new THREE.BoxGeometry(L,.7,.28),hedgeMat,(x0+x1)/2,.38,(z0+z1)/2,ang,1);m.castShadow=false;};
  mkHedge(xMin+.5,zMin+.5,xMin+.5,zMax-.5);mkHedge(xMax-.5,zMin+.5,xMax-.5,zMax-.5);mkHedge(xMin+.5,zMax-.5,xMax-.5,zMax-.5);
  // CC0-style trees/shrubs from kit
  const tree=(x,z,s=1)=>{const t=makeTree(s);t.position.set(x,0,z);t.userData.site=1;root.add(t);};
  /* v18e: the demo's context (tree line, neighbours) is laid out around the demo plot [-4,21]x[-6,13]; an automatic plot moves it with its own edges */
  const RX=x=>P.auto?(x<8.5?x+xMin+4:x+xMax-21):x,RZ=z=>P.auto?(z<3.5?z+zMin+6:z+zMax-13):z;
  const shrub=(x,z,s=.5)=>{const t=makeShrub(s);t.position.set(x,0,z);root.add(t);};
  const seed=(a,b)=>{let h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
  const hx0=Math.min(...xs)-1,hx1=Math.max(...xs)+1,hz0=Math.min(...zs)-1,hz1=Math.max(...zs)+1;
  [[xMin+2.8,zMax-2.4,1.05],[xMax-2.8,zMax-2.6,1.0],[xMax-2.2,hz0+1.8,.9]].forEach(t=>{
   if(t[0]>hx0&&t[0]<hx1&&t[1]>hz0&&t[1]<hz1)return;if([ENT,TER].some(D=>{if(!D)return false;const tt=(t[0]-D.cx)*D.nx+(t[1]-D.cz)*D.nz,la=Math.abs((t[0]-D.cx)*D.ux+(t[1]-D.cz)*D.uz);return tt>0&&tt<9&&la<(D===TER?3.4:2.2);}))return;tree(t[0],t[1],t[2]);});
  // surrounding context: distant tree line + neighbour silhouettes (hides empty green field)
  {const sil=std({color:0x8a9488,roughness:1});
   [[-18,8,1.2],[-16,-6,1.0],[28,4,1.3],[26,-8,0.9],[8,-22,1.1],[-6,24,1.0],[22,22,1.2]].forEach(([x,z,s])=>tree(RX(x),RZ(z),s));
   // prem8 h5: neighbour houses = rendered body + gable or flat/parapet roof + dark windows (+ wood panel on flat ones); shared materials, ~12 meshes each.
   // Houses that would sit on the street move across it.
   const NB={w:std({color:0xece8e0,map:plaster,roughness:.92}),r:std({color:0x4b5057,roughness:.8}),g:std({color:0x2b3238,roughness:.25,metalness:.35}),c:M.frame};
   [[-14,6,8,3.0,7,0],[-12,-10,6,3.0,9,1],[-26,18,9,3.2,8,1],[34,20,7,3.0,10,0]].forEach(([x,z,ww,hh,dd,fl],ni)=>{x=RX(x);z=RZ(z);/* v20261117c: designed flat-roof villa - neighbours get pitched roofs so nothing flat-topped reads as a box on our roof */if(H.roofEdge==='parapet')fl=0;
    if(P.fence!==false&&z+dd/2>zMin-9.5&&z-dd/2<zMin+.5)z=zMin-9.5-dd/2;
    const m=add(new THREE.BoxGeometry(ww,hh,dd),NB.w,x,hh/2,z,0,1);m.castShadow=false;m.userData.site=1;
    if(fl){add(new THREE.BoxGeometry(ww+.06,.5,dd+.06),NB.w,x,hh+.25,z,0,1).castShadow=false;add(new THREE.BoxGeometry(ww+.12,.06,dd+.12),NB.c,x,hh+.53,z,0,1).castShadow=false;
     const wp=add(new THREE.BoxGeometry(Math.min(3,ww*.35),hh+.5,.04),FCM.wood.m,x+ww*.25,(hh+.5)/2,z+dd/2+.02,0,1);boxUV(wp.geometry,0,0);wp.castShadow=false;}
    else{const lng=ww>=dd,along=lng?ww:dd,span=(lng?dd:ww)+.6,rh=span*.28,sh=new THREE.Shape([new THREE.Vector2(-span/2,0),new THREE.Vector2(span/2,0),new THREE.Vector2(0,rh)]);
     const g=new THREE.ExtrudeGeometry(sh,{depth:along+.6,bevelEnabled:false});g.translate(0,0,-(along+.6)/2);const r=new THREE.Mesh(g,NB.r);r.position.set(x,hh,z);if(lng)r.rotation.y=Math.PI/2;r.castShadow=false;r.userData.noCol=true;root.add(r);}
    // windows: every ~2.6 m on each face, 1.2 x 1.3 m, sill height 0.9
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([fx,fz])=>{const L=fx?dd:ww,n=Math.max(1,Math.floor(L/2.6));for(let k=0;k<n;k++){if(fl&&fz===1&&k===n-1)continue;const o=-L/2+(k+.5)*L/n;
     const px=fx?x+fx*(ww/2+.015):x+o,pz=fx?z+o:z+fz*(dd/2+.015);add(fx?new THREE.BoxGeometry(.03,1.3,1.2):new THREE.BoxGeometry(1.2,1.3,.03),NB.g,px,1.55,pz,0,1).castShadow=false;}});
   });
   // horizon hedge band: low, lawn-toned, no shading tile (reads as a soft field edge from above, not a dark wall)
   const hm=std({color:0x7d8e62,roughness:1});
   [[0,-28,50,.9],[0,30,55,.8],[-28,0,.9,45],[32,2,.9,48]].forEach(([x,z,ww,dd])=>{
    const m=add(new THREE.BoxGeometry(ww,.55,dd),hm,x,.27,z,0,1);m.castShadow=false;
   });
  }
  for(let i=0;i<8;i++){const t=seed(i,7),u=seed(i,19),x=xMin+1.2+(xMax-xMin-2.4)*t,z=zMin+1.2+(zMax-zMin-2.4)*u;
   if(x>hx0&&x<hx1&&z>hz0&&z<hz1)continue;shrub(x,z,.35+.28*seed(i,3));}
  // prem8 h4: street side = stone pillars + dark slat panels on a concrete base (gaps at path gate + driveway);
  // other sides = dark welded-mesh panels (one alpha-tested quad per span). Outside the street fence: paved sidewalk, kerb, asphalt.
  if(P.fence!==false){const gateX=(xs.length?Math.min(...xs):0)+1.7,gateW=.75,dX=DRX,dW=1.75,zSouth=zMin;
   const gap=(x,z)=>Math.abs(z-zSouth)<.4&&(Math.abs(x-gateX)<gateW||Math.abs(x-dX)<dW);
   P.pts.forEach((a,i)=>{const b=P.pts[(i+1)%P.pts.length],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1e-6,ang=-Math.atan2(b[1]-a[1],b[0]-a[0]),street=Math.abs(a[1]-zSouth)<.4&&Math.abs(b[1]-zSouth)<.4;
    const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    if(street){const n=Math.max(1,Math.round(L/2.6));for(let k=0;k<=n;k++){const[x,z]=at(k/n);if(gap(x,z))continue;const pg=new THREE.BoxGeometry(.38,1.6,.38);boxUV(pg,x+z,0);add(pg,FCM.stone.m,x,.8,z,ang,1);add(new THREE.BoxGeometry(.46,.06,.46),M.frame,x,1.63,z,ang,1).castShadow=false;}
     // spans split at gaps
     const st=Math.max(2,Math.ceil(L/.25));let u0=null;for(let k=0;k<=st;k++){const t=k/st,[x,z]=at(t),g=gap(x,z)||k===st;if(!g&&u0===null)u0=t;if(g&&u0!==null){const u1=k===st&&!gap(x,z)?1:t,Ls=L*(u1-u0)-.38;if(Ls>.2){const[mx,mz]=at((u0+u1)/2);add(new THREE.BoxGeometry(Ls,.25,.2),M.base,mx,.125,mz,ang,1);const sg=new THREE.BoxGeometry(Ls,1.15,.05);boxUV(sg,mx+mz,0);add(sg,M.slat,mx,.25+.575,mz,ang,1);}u0=null;}}}
    else{const n=Math.max(1,Math.round(L/2.5));for(let k=0;k<=n;k++){const[x,z]=at(k/n);add(new THREE.BoxGeometry(.06,1.55,.06),M.frame,x,.775,z,0,1).castShadow=false;}
     const[mx,mz]=at(.5),mg=new THREE.PlaneGeometry(L,1.45);const uv=mg.attributes.uv;for(let v=0;v<uv.count;v++)uv.setXY(v,uv.getX(v)*L,uv.getY(v)*1.45);const mm=new THREE.Mesh(mg,M.mesh);mm.position.set(mx,.05+.725,mz);mm.rotation.y=ang;mm.userData.noCol=true;root.add(mm);}});
   // street: sidewalk (pavers), kerb, asphalt
   const sx=(xMin+xMax)/2,sw=xMax-xMin+40,swk=add(new THREE.BoxGeometry(sw,.03,1.8),M.path,sx,.012,zSouth-1.0,0,1);boxUV(swk.geometry,sx,zSouth-1.0);swk.userData.noCol=true;swk.receiveShadow=true;
   add(new THREE.BoxGeometry(sw,.12,.15),M.base,sx,.05,zSouth-1.98,0,1).userData.noCol=true;
   const asg=new THREE.BoxGeometry(sw,.02,6.5);boxUV(asg,sx,zSouth-5.3);const as=add(asg,M.asph,sx,.0,zSouth-5.3,0,1);as.userData.noCol=true;as.receiveShadow=true;
   const ln=add(new THREE.BoxGeometry(sw,.005,.12),std({color:0xe8e6df,roughness:.6}),sx,.013,zSouth-5.3,0,1);ln.userData.noCol=true;ln.castShadow=false;}}
 root.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&root.children.length>2500)o.castShadow=false;});
 return root;}
function fitSun(fp){lastFp=fp;const c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],r=Math.max(fp[2]-fp[0],fp[3]-fp[1])*.8+6,az=(sunH-11.75)/5.25*63*Math.PI/180,el=Math.max(.035,sunEl(sunH)),R2=r*1.8;// Nov arc: rises ESE (~117°), noon S at ~22°, sets WSW (~243°)
sun.position.set(c[0]-Math.sin(az)*Math.cos(el)*R2,Math.sin(el)*R2,c[1]+Math.cos(az)*Math.cos(el)*R2);const k=Math.min(1,.55+Math.sin(el)*1.3);sun.intensity=3.1*k*SUNK;if(ATM.h==null)sun.color.setRGB(1,.78+.12*k,.55+.25*k);sun.target.position.set(c[0],0,c[1]);const sc=sun.shadow.camera;sc.left=sc.bottom=-r*1.2;sc.right=sc.top=r*1.2;sc.near=.5;sc.far=r*5;sc.updateProjectionMatrix();}
function place(inside,anim){if(!world)return;const fp=world.userData.fp,c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2];rig.position.set(0,0,0);rig.rotation.set(0,0,0);intro=null;
 if(R.xr.isPresenting||inside){rig.position.set(c[0],H.levels[0].elevation,c[1]);if(body){body.resolve(rig.position);}cam.position.set(0,R.xr.isPresenting?0:1.6,0);yaw=0;pitch=0;}
 else{cam.quaternion.identity();const el=R.domElement,ar=innerWidth/Math.max(1,innerHeight),S=Math.max(fp[2]-fp[0],fp[3]-fp[1],6)*(ar<1?Math.min(2,1/ar*.75):1),b=new THREE.Vector3(c[0]+S*.95,S*.75,c[1]+S*1.25);orb.target.set(c[0],1.2,c[1]);
  if(anim){const a=new THREE.Vector3(c[0]-S*1.6,S*2.2,c[1]+S*2.6);cam.position.copy(a);intro={a,b,t:0};}else cam.position.copy(b);orb.update();}}
export function setWalk(v,xr,keep){DIRTY=Math.max(DIRTY,90);walk=v;orb.enabled=!v;if($('joy'))$('joy').style.display=v&&!xr&&isTouch()?'block':'none';bindJoy();
 if(v||xr){setInteriorViz();}
 else if(!DOLL){world&&world.traverse(o=>{if(o.userData.roof)o.visible=roof!=='none';if(o.userData.ceil)o.visible=false;});}
 if(!keep)place(v||xr);else if(v||xr){orb.enabled=false;if(cam){cam.up.set(0,1,0);}}return walk;}
export function setRoof(r,smooth){DIRTY=Math.max(DIRTY,90);const prev=roof;roof=r;if(smooth&&world){if(r==='none'||DOLL){roofTgt=0;}else{roofTgt=1;world.traverse(o=>{if(o.userData.roof)o.visible=true;});} }else{roofTgt=(r==='none'||DOLL)?0:1;roofVis=roofTgt;}}
export const isWalk=()=>walk;
/* v21g RULE (street side): the site generator lays the street along the plot's -z edge. When the auto plot's street lies on another side (plot.st = garage /
   entrance side), the 3D scene is built from a copy of the house turned in quarter turns so that side faces -z; every coordinate (walls, furniture + its
   quarter-turn r, stairs, balconies, decks, labels, plot, garage, terrace ink, downpipes) turns together, so all generators and audits stay consistent.
   Calls that pass plan coordinates in (jump, birdCam, pano, rooms list) are turned the same way. audit: street-side */
let SR=null;const srP=p=>{if(!SR||!p)return p;const x=p[0]-SR.c[0],z=p[1]-SR.c[1];return[SR.c[0]+SR.m[0]*x+SR.m[1]*z,SR.c[1]+SR.m[2]*x+SR.m[3]*z,...p.slice(2)];},srV=v=>v&&SR?[SR.m[0]*v[0]+SR.m[1]*v[1],SR.m[2]*v[0]+SR.m[3]*v[1]]:v,srB=b=>{if(!SR||!b)return b;const p=srP([b[0],b[1]]),q=srP([b[2],b[3]]);return[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])];};
function streetTurn(h){SR=null;const st=h&&h.plot&&h.plot.auto&&h.plot.st;if(!st||(st[0]===0&&st[1]===-1)||/[?&]nost=1/.test(location.search))return h;
 const M={'1,0':[0,1,-1,0],'-1,0':[0,-1,1,0],'0,1':[-1,0,0,-1]}[st.join(',')];if(!M)return h;const W=(h.walls||[]).filter(w=>w.level===(h.levels[0]||{}).name);if(!W.length)return h;
 const xs=W.flatMap(w=>[w.start[0],w.end[0]]),zs=W.flatMap(w=>[w.start[1],w.end[1]]);SR={m:M,c:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2],st};
 const F4=[[0,1],[1,0],[0,-1],[-1,0]],dr=(F4.findIndex(v=>{const r=srV(F4[0]);return Math.abs(v[0]-r[0])<.1&&Math.abs(v[1]-r[1])<.1;})+4)%4,phi=Math.atan2(M[2],M[0]);SR.dr=dr;SR.phi=phi;
 const g=JSON.parse(JSON.stringify(h));delete g.lightmap;delete g.dv;
 (g.walls||[]).forEach(w=>{w.start=srP(w.start);w.end=srP(w.end);});
 (g.furn||[]).forEach(f=>{f.p=srP(f.p);f.r=(((f.r||0)+dr)%4+4)%4;});
 (g.stairs||[]).forEach(s=>{if(s.pos)s.pos=srP(s.pos);s.dir=(s.dir||0)+phi;});
 (g.balc||[]).forEach(B=>{if(B.o)B.o=srP(B.o);if(B.u)B.u=srV(B.u);if(B.n)B.n=srV(B.n);if(B.r)B.r=srB(B.r);});
 ['decks','rarea','rlab','rn'].forEach(k=>(g[k]||[]).forEach(e=>{if(e.p)e.p=srP(e.p);}));
 g.downpipes=(g.downpipes||[]).map(d=>srP(d));
 if(g.plot){g.plot.pts=g.plot.pts.map(srP);g.plot.st=[0,-1];const G=g.plot.garage;if(G){if(G.x!=null){const p=srP([G.x,G.z]);G.x=p[0];G.z=p[1];}if(G.n)G.n=srV(G.n);if(G.c)G.c=srP(G.c);if(G.bb)G.bb=srB(G.bb);}}
 if(g.terrInk){const k=g.terrInk,N=[[0,-1],[-1,0],[0,1],[1,0]],n=srV(N[k.s]),s=N.findIndex(v=>Math.abs(v[0]-n[0])<.1&&Math.abs(v[1]-n[1])<.1),X0=Math.min(...xs),X1=Math.max(...xs),Z0=Math.min(...zs),Z1=Math.max(...zs),e=[Z0,X0,Z1,X1][k.s],pt=t=>k.s%2?[e,t]:[t,e],A=srP(pt(k.a)),B=srP(pt(k.b)),ax=s%2?1:0;k.s=s;k.a=Math.min(A[ax],B[ax]);k.b=Math.max(A[ax],B[ax]);}
 return g;}
function roomsAllS(){return (window.__roomsAll?window.__roomsAll():[]).map(x=>SR?{...x,bb:srB(x.bb),c:srP(x.c)}:x);}
export function kindsAgree(){const bad=[];(H.levels||[]).forEach(l=>{const RK=roomKinds[l.name],PK=KCH[l.name];if(!RK||!PK)return;Object.keys(RK.kindOf).forEach(k=>{if(RK.kindOf[k]==='hall'&&PK[k]!=='hall')bad.push([l.name,k,RK.kindOf[k],PK[k]||null]);});});return bad;}
export function streetInfo(){return SR&&{st:SR.st,dr:SR.dr,c:SR.c};}
export function gen(h,anim){try{window.__entPath=null;}catch(e){}DIRTY=Math.max(DIRTY,90);H=streetTurn(h);init();const keep=(walk&&!anim&&rig)?{x:rig.position.x,y:rig.position.y,z:rig.position.z,yaw,pitch}:null;doGrow=!!anim;if(world){scene.remove(world);world.traverse(o=>o.geometry&&o.geometry.dispose());}DECKS=[];LROOF=[];world=build();doGrow=false;if(!world)return false;interiorFinish(world);backsplash(world);world.traverse(o=>{if(o.isMesh&&(o.material===M.path||o.material===M.deck)&&o.geometry.type==='BoxGeometry'){boxUV(o.geometry,o.position.x,o.position.z);}});dedupMats(world);scene.add(world);fitSun(world.userData.fp);nightLights();if(wxObj)makeWx();
 const colRoot=new THREE.Group();world.updateMatrixWorld(true);world.traverse(o=>{if(o.isMesh&&!o.userData.noCol&&!(o.parent&&o.parent.userData.noCol)){const m=o.clone();m.matrixAutoUpdate=false;m.matrix.copy(o.matrixWorld);colRoot.add(m);}});colRoot.updateMatrixWorld(true);
 try{const col=colliderFromObject(colRoot);body=new Body(col,{radius:.18});if(!(globalThis.__PF||{}).noDeckStay){const raw=body.floor.bind(body);body.floor=function(p){const d=deckStayY(p),y=raw(p);if(d!=null&&(y==null||d>=y-.02))return d;return y;};}if(!loco)loco=new Locomotion({renderer:R,rig,camera:cam,scene,body,speed:1.4,snapDeg:30});else loco.body=body;}catch(err){console.warn('kolízie',err);}
 walk=walk&&!anim;
 if(keep&&walk){orb.enabled=false;if($('joy'))$('joy').style.display=!(R&&R.xr&&R.xr.isPresenting)&&isTouch()?'block':'none';setInteriorViz();bindJoy();
  rig.position.set(keep.x,keep.y,keep.z);yaw=keep.yaw;pitch=keep.pitch;nudgeFree(rig.position);if(cam){cam.position.set(0,1.6,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));}}
 else setWalk(walk);if(anim&&!walk){place(false,true);wallGrow={t:0,dur:2.6};DIRTY=Math.max(DIRTY,180);}else wallGrow=null;lmHook();if(GREY)applyGrey();return true;}
/* v20261117d BAKED LIGHTMAPS (pipeline: /workspace/bake/bake_house.sh). Static architecture meshes (walls, floors, ceilings, slabs, roof, facade, plot)
   get a sky-light bake (direct sky + all bounces + AO) from headless Blender/Cycles in ONE atlas on uv1. The live sun + its shadows stay real-time, so the
   time-of-day slider keeps working: the bake replaces the hemisphere/fill/IBL ambient by day and fades out towards dusk/night (live lights take over).
   Candidates are picked by the same deterministic rule on export and on load; per-mesh vertex counts are checked, any mismatch = no lightmap (live fallback). */
/* v20261117e AUDIT (window.__vk.m.audit()): (1) every upper-floor furniture item stands in an upper room or on a real deck slab, (2) every part of a lower room
   cell is either under an upper room (+walls) or covered by lower-roof slab - no holes to look down through. Returns a list of problems ([] = clean). */
/* v20261117r door swing helpers (shared by the generator and the audit) */
/* footprint test from the ground-floor exterior wall centre lines (even-odd, works on unordered segments) + clearance from any wall face */
function inFoot(x,z){const L0=H.levels[0].name;return (CELLS[L0]||[]).some(r=>r[4]>0&&x>r[0]&&x<r[2]&&z>r[1]&&z<r[3]);} /* inside a ground-floor room cell (label 0 = outside) */
function wallClear(x,z){let m=1e9;H.walls.forEach(w=>{if(((H.levels.find(l=>l.name===w.level)||{}).elevation||0)+(w.base||0)>.2)return;const g=geo(w),px=x-g.x0,pz=z-g.z0,q=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1]));m=Math.min(m,Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)-(w.thickness||.3)/2);});return m;}
const DOOR_OPEN=80,DSKIP=new Set(['rug','runner','curtain','art','mirror','towel','tvw','hooks','lamp','pendant']);const _dc={};
function dcells(L){if(CELLS[L]&&CELLS[L].length)return CELLS[L];if(_dc[L]&&_dc[L].k===H.walls.length)return _dc[L].c;const c=cells(H.walls.filter(w=>w.level===L),[]);_dc[L]={k:H.walls.length,c};return c;}
function furnRects(L){return (H.furn||[]).filter(f=>f.level===L&&!DSKIP.has(f.t)&&FUR[f.t]).map(f=>{const D=FUR[f.t],w=f.w||D.w,d=f.d||D.d,q=((f.r||0)%2)?[d,w]:[w,d];return{t:f.t,tall:(D.h||0)>1.2||['fridge','ward','shelf','bunk','washer','coat'].includes(f.t),r:[f.p[0]-q[0]/2,f.p[1]-q[1]/2,f.p[0]+q[0]/2,f.p[1]+q[1]/2]};});}
/* sample the swept quarter of a leaf: hinge at s=hs on wall w, side sd, leaf points along dir*u when closed, opened by a deg */

/* v20261117t: joystick is re-bound after every style/gen so a rebuilt #joy or a missed pointer still drives walk */
function bindJoy(){const J=$('joy');if(!J)return;const K=J.firstElementChild;if(!K)return;
 if(J._vkJoy){J.removeEventListener('pointerdown',J._vkJoy.dn);J.removeEventListener('pointermove',J._vkJoy.mv);J.removeEventListener('pointerup',J._vkJoy.up);J.removeEventListener('pointercancel',J._vkJoy.up);}
 let jid=null;const jm=e=>{const r=J.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy[0]=x;joy[1]=y;K.style.transform=`translate(${x*35}px,${y*35}px)`;};
 const dn=e=>{jid=e.pointerId;try{J.setPointerCapture(jid);}catch(err){}jm(e);},mv=e=>{if(e.pointerId===jid)jm(e);},up=()=>{jid=null;joy[0]=joy[1]=0;K.style.transform='';};
 J.addEventListener('pointerdown',dn);J.addEventListener('pointermove',mv);J.addEventListener('pointerup',up);J.addEventListener('pointercancel',up);J._vkJoy={dn,mv,up};}
/* if the player is inside a new collider after a style swap, slide to the nearest free floor spot */
function nudgeFree(p){if(!body||!p)return p;const tryP=(x,z,y)=>{const q=p.clone?p.clone():new THREE.Vector3(x,y,z);q.set(x,y,z);const fl=body.floor(q);if(fl===null)return null;q.y=fl;if(body.blocked&&body.blocked(q))return null;return q;};
 if(tryP(p.x,p.z,p.y)){const fl=body.floor(p);if(fl!==null)p.y=fl;if(body.resolve)body.resolve(p);return p;}
 for(let rad=.15;rad<=2.8;rad+=.15){for(let a=0;a<16;a++){const x=p.x+Math.cos(a*Math.PI/8)*rad,z=p.z+Math.sin(a*Math.PI/8)*rad,q=tryP(x,z,p.y);if(q){p.x=q.x;p.y=q.y;p.z=q.z;return p;}}}
 if(body.resolve)body.resolve(p);const y=body.floor(p);if(y!==null)p.y=y;return p;}
function clipInExt(x0,z0,x1,z1,ws,mode){ (ws||[]).forEach(w=>{if(!w._ext)return;const g=geo(w),T=(w.thickness||.3)/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,ins=(mode==='outer'?0:(+mode||0)),k=mode==='outer'?T:-(T+ins),px=g.x0+nx*k,pz=g.z0+nz*k,near=T+Math.abs(ins)+.12;
  /* v21m: a wall that only touches a cell corner (side overlap < min(0.3 m, 25 %)) never cuts it - a 0.11 m floor gap in an open plan. */
  /* v20261117u: inset a cell that the inner face actually cuts; never treat a recess wall as an infinite plane. slivers in the wall/yard are dropped later by inExtBand. audit: floor-present, ext-material */
  if(Math.abs(nx)>.9){const a=g.z0,b=g.z0+g.u[1]*g.L;if(Math.min(z1,Math.max(a,b)+.08)-Math.max(z0,Math.min(a,b)-.08)<=((globalThis.__PF||{}).noCornerClip?0:Math.min(.3,.25*(z1-z0))))return;const wx=g.x0;if(wx+T+near<x0||wx-T-near>x1)return;
   if(nx>0){if(x0<px&&px<=x1+near)x1=Math.min(x1,px);}else if(x1>px&&px>=x0-near)x0=Math.max(x0,px);}
  else if(Math.abs(nz)>.9){const a=g.x0,b=g.x0+g.u[0]*g.L;if(Math.min(x1,Math.max(a,b)+.08)-Math.max(x0,Math.min(a,b)-.08)<=((globalThis.__PF||{}).noCornerClip?0:Math.min(.3,.25*(x1-x0))))return;const wz=g.z0;if(wz+T+near<z0||wz-T-near>z1)return;
   if(nz>0){if(z0<pz&&pz<=z1+near)z1=Math.min(z1,pz);}else if(z1>pz&&pz>=z0-near)z0=Math.max(z0,pz);}});return[x0,z0,x1,z1];}
function inExtBand(x,z,ws){return (ws||[]).some(w=>{if(!w._ext)return false;const g=geo(w),T=(w.thickness||.3)/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-.05||q>g.L+.05)return false;const d=(x-(g.x0+g.u[0]*q))*nx+(z-(g.z0+g.u[1]*q))*nz;return d>-T+.02&&d<T+.08;});}
function shrinkIn(cl,ws){let[x0,z0,x1,z1]=cl;for(let k=0;k<24;k++){const a=inExtBand(x0,z0,ws),b=inExtBand(x1,z0,ws),c=inExtBand(x0,z1,ws),d=inExtBand(x1,z1,ws);if(!(a||b||c||d))return[x0,z0,x1,z1];if(a||c)x0+=.03;if(b||d)x1-=.03;if(a||b)z0+=.03;if(c||d)z1-=.03;if(x1-x0<.05||z1-z0<.05)return null;}return[x0,z0,x1,z1];}
function stairPads(L){const li=(H.levels||[]).findIndex(l=>l.name===L),out=[];if(li>=1)(H.stairs||[]).filter(st=>st.level===H.levels[li-1].name).forEach(st=>{const r=stairRect(st);out.push([r[0]-.6,r[1]-.6,r[2]+.6,r[3]+.6]);});
 if(li>=0)(H.stairs||[]).filter(st=>st.level===L).forEach(st=>out.push(stairRect(st)));return out;}
function stairHoles(L){const li=(H.levels||[]).findIndex(l=>l.name===L),out=[];if(li>=1)(H.stairs||[]).filter(st=>st.level===H.levels[li-1].name).forEach(st=>{const r=stairRect(st);out.push([r[0]-.08,r[1]-.08,r[2]+.08,r[3]+.08]);});
 if(li>=0)(H.stairs||[]).filter(st=>st.level===L).forEach(st=>out.push(stairRect(st)));return out;}
/* v21i RULE (door-blocked): interior doors are swung while the walls are built, before the floor pass names the room kinds - so the hall test
   that the door-blocked audit applies afterwards saw no halls at choice time and leaves swung into halls. preKinds(L) gives the same room kinds
   from the same cells + furniture up front, so the choice and the audit agree. audit: door-blocked */
function preKinds(L){const CR=dcells(L),byL={};if(!CR||!CR.labelAt)return null;(H.furn||[]).filter(f=>f.level===L).forEach(f=>{const k=CR.labelAt(f.p[0],f.p[1]);if(!k)return;(byL[k]=byL[k]||{t:new Set()}).t.add(f.t);});const kindOf={};Object.keys(byL).forEach(k=>kindOf[k]=roomKind(byL[k].t));return{labelAt:CR.labelAt,kindOf};}
let KCH={};function circLabs(L){const C=dcells(L),labs=new Set(),RK=roomKinds[L]||((globalThis.__PF||{}).noPreKinds?null:preKinds(L)),_k=(!roomKinds[L]&&!KCH[L])?(KCH[L]=RK?{...RK.kindOf}:{}):0,holes=stairHoles(L);
 const ov=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
 C.forEach(r=>{if(RK&&RK.kindOf[r[4]]==='hall')labs.add(r[4]);if(holes.some(p=>ov(r,p)>.2))labs.add(r[4]);});
 (H.rn||[]).forEach(e=>{if(e.level!==L||!/Predsieň|Chodba|Hala|Zádverie|Schodisko/i.test(e.n||''))return;const c=C.find(r=>e.p[0]>r[0]&&e.p[0]<r[2]&&e.p[1]>r[1]&&e.p[1]<r[3]);if(c)labs.add(c[4]);});return labs;}
function circAt(L,x,z,labs,CR){if(stairHoles(L).some(p=>x>p[0]&&x<p[2]&&z>p[1]&&z<p[3]))return 2;const c=(CR||dcells(L)).find(r=>x>r[0]&&x<r[2]&&z>r[1]&&z<r[3]);if(c&&labs&&labs.has(c[4]))return 1;return 0;}
function swingHits(w,G,hs,dir,sd,a,lw,FR,CR,labs){const T=w.thickness||.3,nx=-G.u[1]*sd,nz=G.u[0]*sd,hx=G.x0+G.u[0]*hs+nx*T/2,hz=G.z0+G.u[1]*hs+nz*T/2;let n=0,tall=0,out=0,circ=0,stair=0;
 for(let p=0;p<=a+.1;p+=a/6){const c=Math.cos(p*Math.PI/180),sn=Math.sin(p*Math.PI/180);for(const rho of[.2,.45,.7*lw,lw]){const dx=dir*G.u[0]*c*rho+nx*sn*rho,dz=dir*G.u[1]*c*rho+nz*sn*rho,x=hx+dx,z=hz+dz;
  if(sn*rho>.06&&!CR.some(r=>x>r[0]-.01&&x<r[2]+.01&&z>r[1]-.01&&z<r[3]+.01))out++;
  if(p>=a*.7){const ck=circAt(w.level,x,z,labs,CR);if(ck===2)stair++;else if(ck===1)circ++;}
  for(const f of FR){if(x>f.r[0]-.03&&x<f.r[2]+.03&&z>f.r[1]-.03&&z<f.r[3]+.03){n++;if(f.tall)tall++;break;}}}}
 /* a tall piece standing right beside the open leaf (within 35 cm of its outer face) blocks the way past it */
 const c=Math.cos(a*Math.PI/180),sn=Math.sin(a*Math.PI/180),tx=hx+dir*G.u[0]*c*lw+nx*sn*lw,tz=hz+dir*G.u[1]*c*lw+nz*sn*lw;let near=0,hug=0,narrow=0;
 for(const f of FR)if(f.tall){for(let k=.25;k<=1;k+=.25){const x=hx+(tx-hx)*k-dir*G.u[0]*.3,z=hz+(tz-hz)*k-dir*G.u[1]*.3;if(x>f.r[0]&&x<f.r[2]&&z>f.r[1]&&z<f.r[3]){near++;break;}}}
 H.walls.forEach(q=>{if(q===w||q.level!==w.level)return;const g=geo(q),px=tx-g.x0,pz=tz-g.z0,s=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1])),d=Math.hypot(px-g.u[0]*s,pz-g.u[1]*s)-(q.thickness||.3)/2;if(d<.25)hug=1;});
 let hallW=0;for(let d=.1;d<4.1;d+=.1){const x=hx+nx*d,z=hz+nz*d;if(stairHoles(w.level).some(p=>x>p[0]&&x<p[2]&&z>p[1]&&z<p[3])&&d>.25){hallW=d;break;}if(!CR.some(r=>x>r[0]&&x<r[2]&&z>r[1]&&z<r[3])){hallW=d;break;}}
 const leafD=Math.sin(a*Math.PI/180)*lw;if(hallW>0&&hallW-leafD<.8&&(circ||stair||hallW<2.5))narrow=1;
 return{n,tall,out,near,circ,stair,hug,narrow};}
function doorChoose(w,o,G,e){const a0=o.offset,b0=o.offset+o.width,lw=o.width-.1,FR=furnRects(w.level),CR=dcells(w.level),labs=circLabs(w.level),R0=o.hinge==='R',S0=o.out?-1:1;
 /* prefer swinging into the room (not a hall / landing / stair) and against a wall; drop the angle rather than block a walkway. audit: door-swing, door-blocked, walkability */
 const opts=[[R0,S0],[!R0,S0],[R0,-S0],[!R0,-S0]];let best=null;
 for(const A of[DOOR_OPEN,65,50,40]){for(let i=0;i<4;i++){const[R,sd]=opts[i],h=swingHits(w,G,R?b0-.05:a0+.05,R?-1:1,sd,A,lw,FR,CR,labs);
  const sc=h.n+3*h.tall+2*h.out+1.5*h.near+10*h.stair+5*h.circ+14*h.narrow-2*h.hug+i*.01+(A<DOOR_OPEN?(DOOR_OPEN-A)*.02:0);
  if(!best||sc<best.sc)best={R,sd,a:A,sc,hit:h};}if(best&&best.hit.stair===0&&best.hit.narrow===0&&best.sc<1)break;}
 return best;}

/* v20261117t: rainwater — a hopper sits on the roof-edge / gutter (outside the coping), a pipe runs down the wall to the ground and never bores through a slab or cornice. audit: downpipe-connected, downpipe-pierce */
/* v18c RULE (downpipe top = eave): the roof edge height at (x,z) is the highest roof point CLOSE to that spot (vertices within 0.8 m),
   not the bounding box of the whole roof mesh - a pitched roof's box reaches the ridge, which made bungalow downpipes start at 2nd-floor height. audit: downpipe-eave */
function eaveAt(root,x,z,R=.8){let y=null;const v=new THREE.Vector3();root.traverse(o=>{const u=o.userData||{};if(!o.isMesh||!(u.cope||u.lroof||u.roof)||u.dpipe||u.gutter||u.rail||u.hopper||u.flash)return;
  o.updateWorldMatrix(true,false);const b=new THREE.Box3().setFromObject(o);if(x<b.min.x-R||x>b.max.x+R||z<b.min.z-R||z>b.max.z+R)return;
  const pos=o.geometry&&o.geometry.attributes&&o.geometry.attributes.position;let yy=null;
  if(pos&&pos.count<=20000&&!(u.cope&&o.geometry.type==='BoxGeometry')){for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);if(Math.abs(v.x-x)<=R&&Math.abs(v.z-z)<=R&&(yy===null||v.y>yy))yy=v.y;}
   if(yy===null){/* big faces with no vertex nearby: sample the box only if the box is flat (slab/coping) */if(b.max.y-b.min.y<.35)yy=b.max.y;}}
  else yy=b.max.y;
  if(yy!==null&&(y===null||yy>y))y=yy;});return y;}
function installDownpipes(root){window.__dpInfo=[];if(!root||roof==='none')return;
 const boxes=[];root.traverse(o=>{const u=o.userData||{};if(!o.isMesh)return;if(u.cope||u.lroof||(u.roof&&o.geometry&&o.geometry.type==='BoxGeometry'&&o.material!==M.glass&&!u.dpipe&&!u.gutter&&!u.rail&&!u.flash)){o.updateWorldMatrix(true,false);boxes.push(new THREE.Box3().setFromObject(o));}});
 const hits=(x,z,y0,y1)=>{for(const b of boxes){if(x>b.min.x-.02&&x<b.max.x+.02&&z>b.min.z-.02&&z<b.max.z+.02&&y1>b.min.y+.02&&y0<b.max.y-.02)return b;}return null;};
 const XW=(H.walls||[]).filter(w=>w._ext);if(!XW.length)return;
 const corners=[];const key=(x,z)=>x.toFixed(2)+','+z.toFixed(2),seen=new Set();
 XW.forEach(w=>{[w.start,w.end].forEach(p=>{const k=key(p[0],p[1]);if(seen.has(k))return;const n=XW.filter(q=>Math.hypot(q.start[0]-p[0],q.start[1]-p[1])<.12||Math.hypot(q.end[0]-p[0],q.end[1]-p[1])<.12);if(n.length<2)return;seen.add(k);
  /* convex exterior corner: two ext walls meet, the bisector points outside */
  const ns=n.map(q=>{const g=geo(q);return[-g.u[1]*q._ext,g.u[0]*q._ext];});const bx=ns[0][0]+ns[1][0],bz=ns[0][1]+ns[1][1],bl=Math.hypot(bx,bz)||1;
  const tx=p[0]+(bx/bl)*.45,tz=p[1]+(bz/bl)*.45,inside=(H.levels||[]).some(l=>(dcells(l.name)||[]).some(r=>tx>r[0]&&tx<r[2]&&tz>r[1]&&tz<r[3]));if(inside)return;/* v21p: two wall ends a few cm apart are one corner - one downpipe, not two with overlapping brackets. audit: coplanar-overlap */if(!(globalThis.__PF||{}).noDpDedup&&corners.some(q=>Math.hypot(q.x-p[0],q.z-p[1])<.4))return;corners.push({x:p[0],z:p[1],nx:bx/bl,nz:bz/bl});});});
 /* roof-edge height at a corner: top of the nearest coping / lower-roof / top slab */
 const edgeY=(x,z)=>eaveAt(root,x,z);
 corners.forEach(c=>{let y=edgeY(c.x,c.z);if(y===null||y<1.2)return;
  /* sit the pipe outside the coping: start 12 cm out, push further until the run is clear of slabs */
  let off=.18,x=c.x+c.nx*off,z=c.z+c.nz*off;for(let k=0;k<8;k++){if(!hits(x,z,.2,y-.15))break;off+=.06;x=c.x+c.nx*off;z=c.z+c.nz*off;}
  /* v21q RULE (downpipe-off-wall): a wide eave / porch roof would push the pipe more than ~0.4 m off the wall - instead the pipe stays at the
     corner and ends under the lowest slab above it (it enters the soffit). audit: downpipe-off-wall, downpipe-eave */
  let yTop=y;if(!(globalThis.__PF||{}).noDpSoffit&&(off>.42||hits(x,z,.2,y-.15))){off=.18;x=c.x+c.nx*off;z=c.z+c.nz*off;let lo=1e9;for(const b of boxes)if(x>b.min.x-.06&&x<b.max.x+.06&&z>b.min.z-.06&&z<b.max.z+.06&&b.min.y>1.2&&b.min.y<lo)lo=b.min.y;if(lo<1e9)yTop=Math.min(y,lo+.02);}
  const top=yTop-.04,pt=Math.max(.4,top-.2);(window.__dpInfo=window.__dpInfo||[]).push({x:+c.x.toFixed(2),z:+c.z.toFixed(2),top:+top.toFixed(2)});
  const hd=new THREE.Mesh(new THREE.BoxGeometry(.22,.16,.16),M.frame);hd.position.set(x-c.nx*.04,top-.1,z-c.nz*.04);hd.castShadow=true;hd.userData.roof=1;hd.userData.noCol=true;hd.userData.dpipe=1;hd.userData.hopper=1;root.add(hd);
  const armL=Math.max(.08,off-.04),arm=new THREE.Mesh(new THREE.BoxGeometry(armL,.05,.05),M.frame);arm.position.set(c.x+c.nx*(off-armL/2),top-.08,c.z+c.nz*(off-armL/2));arm.userData.roof=1;arm.userData.noCol=true;arm.userData.dpipe=1;arm.userData.gutter=1;root.add(arm);
  const pm=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,pt,12),M.frame);pm.position.set(x,pt/2,z);pm.castShadow=true;pm.userData.roof=1;pm.userData.noCol=true;pm.userData.dpipe=1;root.add(pm);
  for(let yy=.55;yy<pt-.25;yy+=1.5){const br=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.1),M.frame);br.position.set(x-c.nx*.05,yy,z-c.nz*.05);br.userData.roof=1;br.userData.noCol=true;root.add(br);}
 });}


function extPipeAudit(P,world,bb,r2){if(!world)return;
 const floorMats=new Set([M.floor]);
 const past=(b,tol)=>H.walls.some(w=>{if(!w._ext)return false;const lv=H.levels.find(l=>l.name===w.level),el=(lv&&lv.elevation)||0,eh=el+(w.height||(lv&&lv.height)||2.8);if(b.max.y<el-.15||b.min.y>eh+.15)return false;const g=geo(w),T=(w.thickness||.3)/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext;
  return [[b.min.x,b.min.z],[b.max.x,b.min.z],[b.min.x,b.max.z],[b.max.x,b.max.z]].some(([x,z])=>{const px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-.08||q>g.L+.08)return false;const d=(x-(g.x0+g.u[0]*q))*nx+(z-(g.z0+g.u[1]*q))*nz;return d>T+tol&&d<T+.5;});});
 let ne=0;world.traverse(o=>{if(!o.isMesh||ne>=6)return;const u=o.userData||{};if(u.furn||u.doorLeaf||u.wm||u.rug)return;
  const mats=[].concat(o.material||[]),isFl=u.floor||mats.some(m=>m&&(floorMats.has(m)||(m.userData&&m.userData.floor)));
  if(!isFl)return;const b=bb(o);if(b.max.y>.5&&past(b,.10)){ne++;P.push({rule:'ext-material',p:[r2(b.min.x),r2(b.min.z)],why:'floor-outside'});}});
 /* v18d RULE (ATL-1): no wall geometry floats across a room - a wall piece that starts well above the floor (a lintel/header over an opening)
    rests at both ends on a lower piece of the same wall, or that end meets another wall. audit: lintel-floating */
 {const WP=new Map();world.traverse(o=>{const u=o.userData||{};if(o.isMesh&&u.wp){const w=u.wp[0];if(!WP.has(w))WP.set(w,[]);WP.get(w).push(u.wp);}});let nf=0;
  WP.forEach((ps,w)=>{if(!w||!w.start)return;const g=geo(w),L=g.L,tw=(w.thickness||.3)/2;const joins=s=>{const x=g.x0+g.u[0]*s,z=g.z0+g.u[1]*s;return H.walls.some(q=>{if(q===w||q.level!==w.level)return false;const h=geo(q),px=x-h.x0,pz=z-h.z0,t=Math.max(0,Math.min(h.L,px*h.u[0]+pz*h.u[1]));return Math.hypot(px-h.u[0]*t,pz-h.u[1]*t)<(q.thickness||.3)/2+tw+.08;});};
   const base=Math.min(...ps.map(q=>q[3]));/* facade zones split one header into several boxes: merge touching pieces of the same height band first */
   const mg=[];ps.slice().sort((a,b)=>a[3]-b[3]||a[4]-b[4]||a[1]-b[1]).forEach(q=>{const l=mg[mg.length-1];if(l&&Math.abs(l[3]-q[3])<.02&&Math.abs(l[4]-q[4])<.02&&q[1]<=l[2]+.03)l[2]=Math.max(l[2],q[2]);else mg.push([q[0],q[1],q[2],q[3],q[4]]);});
   mg.forEach(p=>{const s0=p[1],s1=p[2],y0=p[3];if(nf>=6||y0<base+1.2)return;
    const sup=s=>mg.some(q=>q!==p&&q[3]<y0-.3&&q[4]>=y0-.05&&q[1]-.06<=s&&q[2]+.06>=s)||((s<tw+.15||s>L-tw-.15)&&joins(Math.max(0,Math.min(L,s))));
    if(!sup(s0)||!sup(s1)){nf++;const s=(s0+s1)/2;P.push({rule:'lintel-floating',p:[r2(g.x0+g.u[0]*s),r2(g.z0+g.u[1]*s)],w:w.id,s:[r2(s0),r2(s1)],y0:r2(y0)});}});});}
 /* v18j RULE (furniture-from-pack): every furniture piece - interior and terrace - is built by the shared furniture kit (makeFurn, asset-pack
    models swapped in where the pack has them), never a raw placeholder box. audit: furn-from-kit */
 {const bad=(H.furn||[]).filter(f=>!FUR[f.t]).map(f=>f.t);world.traverse(o=>{const u=o.userData||{};if(u.terrF&&!u.kit)bad.push(u.terrF);});if(bad.length)P.push({rule:'furn-from-kit',types:[...new Set(bad)]});}
 /* v18j RULES (terrace): terrace-furnished = the deck carries an outdoor table, >=2 seats and >=2 plants from the kit; terrace-clear = none of them
    reaches into a wall or the 1.2 m path out of the terrace door */
 {const TS=[];world.traverse(o=>{if(o.userData&&o.userData.terrace)TS.push(o);});TS.forEach(t=>{const T=t.userData.tf;if(!T||T.L<3.2||T.D<2.6||(H.furn||[]).some(f=>f.t==='otable'))return;/* designed houses carry their own terrace set */const cnt={};const FB=[];world.traverse(o=>{const u=o.userData||{};if(u.terrF){cnt[u.terrF]=(cnt[u.terrF]||0)+1;FB.push([u.terrF,bb(o)]);}});
  if(!cnt.otable||((cnt.chair||0)+(cnt.lounge||0))<2||(cnt.plant||0)<2)P.push({rule:'terrace-furnished',got:cnt});
  if(T.hint&&Math.hypot(T.cx-T.hint[0],T.cz-T.hint[1])>4.5)P.push({rule:'terrace-placed',p:[r2(T.cx),r2(T.cz)],printed:T.hint});
  /* v21c audit terrace-pergola: a deck off the living room (door or not) carries the pergola */
  if(T.liv){let pg=0;world.traverse(o=>{if(o.userData&&o.userData.pergola)pg++;});if(pg<3)P.push({rule:'terrace-pergola',got:pg});}
  const WB=[];(H.walls||[]).filter(w=>w.level===(H.levels[0]&&H.levels[0].name)).forEach(w=>{const g=geo(w),t2=(w.thickness||.3)/2;WB.push([Math.min(w.start[0],w.end[0])-t2,Math.min(w.start[1],w.end[1])-t2,Math.max(w.start[0],w.end[0])+t2,Math.max(w.start[1],w.end[1])+t2]);});
  FB.forEach(([k,b])=>{const q=[b.min.x+.03,b.min.z+.03,b.max.x-.03,b.max.z-.03];if(WB.some(w=>q[0]<w[2]&&q[2]>w[0]&&q[1]<w[3]&&q[3]>w[1]))P.push({rule:'terrace-clear',what:k,why:'wall'});
   if(T.door!=null){const c=[T.cx+T.ux*T.door,T.cz+T.uz*T.door],e=[c[0]+T.nx*T.D,c[1]+T.nz*T.D],pb=[Math.min(c[0],e[0])-(Math.abs(T.ux)*.6),Math.min(c[1],e[1])-(Math.abs(T.uz)*.6),Math.max(c[0],e[0])+(Math.abs(T.ux)*.6),Math.max(c[1],e[1])+(Math.abs(T.uz)*.6)];if(q[0]<pb[2]&&q[2]>pb[0]&&q[1]<pb[3]&&q[3]>pb[1])P.push({rule:'terrace-clear',what:k,why:'door-path'});}});});}
 /* v18e RULES (site + garage): every house with a plot has its lawn; context (trees, neighbours) never stands on the house or the driveway;
    a garage has a garage door on an outside wall, a driveway reaching that door and a car. audit: site-present, site-clear, garage-door, garage-drive */
 /* v21j audit kitchen-aisle: in front of every kitchen run a 1.0 m work aisle stays free of the dining table and its chairs (same room) */
 {const F4=[[0,1],[1,0],[0,-1],[-1,0]],AIS=1.0;(H.levels||[]).forEach(l=>{const RK=roomKinds[l.name];if(!RK||!RK.labelAt)return;const F=(H.furn||[]).filter(f=>f.level===l.name&&FUR[f.t]);
  const rc=f=>{const D=FUR[f.t],w=f.w||D.w,d=f.d||D.d,q=((f.r||0)%2)?[d,w]:[w,d];return[f.p[0]-q[0]/2,f.p[1]-q[1]/2,f.p[0]+q[0]/2,f.p[1]+q[1]/2];};
  F.filter(f=>f.t==='kitch').forEach(k=>{const v=F4[((k.r||0)%4+4)%4],q=rc(k),S=v[1]>0?[q[0],q[3],q[2],q[3]+AIS]:v[0]>0?[q[2],q[1],q[2]+AIS,q[3]]:v[1]<0?[q[0],q[1]-AIS,q[2],q[1]]:[q[0]-AIS,q[1],q[0],q[3]],lk=RK.labelAt(k.p[0],k.p[1]);
   F.filter(f=>(f.t==='table'||f.t==='chair')&&RK.labelAt(f.p[0],f.p[1])===lk).forEach(f=>{const r=rc(f),ox=Math.min(r[2],S[2])-Math.max(r[0],S[0]),oz=Math.min(r[3],S[3])-Math.max(r[1],S[1]);if(ox>.05&&oz>.05)P.push({rule:'kitchen-aisle',level:l.name,t:f.t,p:f.p,gap:+(v[1]>0?r[1]-q[3]:v[0]>0?r[0]-q[2]:v[1]<0?q[1]-r[3]:q[0]-r[2]).toFixed(2)});});});});}
/* v21g audit street-side: the scene was built with the plot's street side turned to the generator's street edge (-z) */if(H.plot&&H.plot.auto&&H.plot.st&&!(H.plot.st[0]===0&&H.plot.st[1]===-1))P.push({rule:'street-side',st:H.plot.st});/* v21m audit path-to-street: the entrance path is a chain of paved runs from the entrance door to the street edge */try{const EP=window.__entPath;if(H.plot&&H.plot.pts&&EP&&EP.ent){const Rr=EP.rects;if(!Rr||!Rr.length)P.push({rule:'path-to-street',why:'none'});else{const d=EP.ent,ins=(r,x,z,m)=>x>=r[0]-m&&x<=r[2]+m&&z>=r[1]-m&&z<=r[3]+m;const touch=(A,B)=>A[0]<=B[2]+.01&&A[2]>=B[0]-.01&&A[1]<=B[3]+.01&&A[3]>=B[1]-.01;
 if(!ins(Rr[0],d.cx,d.cz,.5))P.push({rule:'path-to-street',why:'door'});else if(Rr.slice(1).some((r,i)=>!touch(Rr[i],r)))P.push({rule:'path-to-street',why:'gap'});else if(Rr[Rr.length-1][1]>EP.zMin+.05)P.push({rule:'path-to-street',why:'street',z:Rr[Rr.length-1][1]});}}}catch(e){}if(H.plot&&H.plot.pts){let lawn=0;const DR=[],ST=[];world.traverse(o=>{const u=o.userData||{};if(u.lawn)lawn=1;if(u.drive)DR.push(bb(o));if(u.site)ST.push(o);});if(!lawn)P.push({rule:'site-present',why:'lawn'});
  const W0=(H.walls||[]).filter(w=>w.level===H.levels[0].name),hxs=W0.flatMap(w=>[w.start[0],w.end[0]]),hzs=W0.flatMap(w=>[w.start[1],w.end[1]]),hb=[Math.min(...hxs)-.3,Math.min(...hzs)-.3,Math.max(...hxs)+.3,Math.max(...hzs)+.3];let nc=0;ST.forEach(o=>{if(nc>=4)return;const b=bb(o);const hit=r=>b.max.x>r[0]&&b.min.x<r[2]&&b.max.z>r[1]&&b.min.z<r[3];if(hit(hb)||DR.some(d=>hit([d.min.x,d.min.z,d.max.x,d.max.z]))){nc++;P.push({rule:'site-clear',p:[r2((b.min.x+b.max.x)/2),r2((b.min.z+b.max.z)/2)]});}});
  const GA=H.plot.garage;if(GA){let gd=0,car=0;world.traverse(o=>{if(o.userData&&o.userData.car)car=1;});(H.walls||[]).forEach(w=>(w.openings||[]).forEach(o=>{if(o.kind==='garage')gd=1;}));if(!gd)P.push({rule:'garage-door'});
   if(!DR.some(d=>GA.x>d.min.x-.6&&GA.x<d.max.x+.6&&GA.z>d.min.z-.6&&GA.z<d.max.z+.6)||!car)P.push({rule:'garage-drive',car});
   /* v18k audit car-clear: the car is inside the garage or on the drive, never in the 5 m in front of the garage door */
   {let cp=null;world.traverse(o=>{if(o.userData&&o.userData.car&&!cp)cp=o.position;});if(cp&&GA.bb){const inG=cp.x>GA.bb[0]&&cp.x<GA.bb[2]&&cp.z>GA.bb[1]&&cp.z<GA.bb[3];const d=(cp.x-GA.x)*GA.n[0]+(cp.z-GA.z)*GA.n[1],s=Math.abs((cp.x-GA.x)*GA.n[1]-(cp.z-GA.z)*GA.n[0]);if(!inG&&d>0&&d<5&&s<1.6)P.push({rule:'car-clear',p:[r2(cp.x),r2(cp.z)]});}}}}
 const pipes=[],hops=[],guts=[],copes=[];world.traverse(o=>{const u=o.userData||{};if(!o.isMesh)return;if(u.dpipe&&o.geometry&&/Cylinder/.test(o.geometry.type||''))pipes.push(o);if(u.hopper)hops.push(o);if(u.gutter)guts.push(o);if(u.cope)copes.push(o);});
 pipes.forEach(p=>{const b=bb(p),c=b.getCenter(new THREE.Vector3()),top=b.max.y,bot=b.min.y;
  const nearH=hops.some(h=>{const a=bb(h);return Math.hypot(c.x-(a.min.x+a.max.x)/2,c.z-(a.min.z+a.max.z)/2)<.4&&Math.abs((a.min.y+a.max.y)/2-top)<.45;});
  const nearG=guts.concat(copes).some(h=>{const a=bb(h);return Math.hypot(c.x-(a.min.x+a.max.x)/2,c.z-(a.min.z+a.max.z)/2)<.55&&a.min.y-.2<=top&&top<=a.max.y+.45;});
  if(bot>.4||!(nearH||nearG))P.push({rule:'downpipe-connected',p:[r2(c.x),r2(c.z)],bot:+bot.toFixed(2)});
  {const e=eaveAt(world,c.x,c.z,1.0);if(e!==null&&top>e+.35)P.push({rule:'downpipe-eave',p:[r2(c.x),r2(c.z)],top:+top.toFixed(2),eave:+e.toFixed(2)});}
  let hit=0;world.traverse(o=>{if(hit||!o.isMesh)return;const u=o.userData||{};if(!(u.cope||u.lroof||(u.roof&&u.slab))&&!u.cope)return;if(u.dpipe||u.gutter||u.hopper||u.rail||u.flash)return;
   if(!(u.cope||u.lroof))return;const a=bb(o),ox=Math.min(b.max.x,a.max.x)-Math.max(b.min.x,a.min.x),oz=Math.min(b.max.z,a.max.z)-Math.max(b.min.z,a.min.z),oy=Math.min(b.max.y-.22,a.max.y)-Math.max(b.min.y,a.min.y);
   if(ox>.02&&oz>.02&&oy>.02){hit=1;P.push({rule:'downpipe-pierce',p:[r2(c.x),r2(c.z)]});}});});
}

function walkAudit(P){if(!H||!H.levels)return;
 H.levels.forEach((l,li)=>{const L=l.name,C=dcells(L);if(!C.length)return;const xs=C.flatMap(r=>[r[0],r[2]]),zs=C.flatMap(r=>[r[1],r[3]]);
  const Csz=.1,x0=Math.min(...xs)-.4,z0=Math.min(...zs)-.4,nx=Math.ceil((Math.max(...xs)+.4-x0)/Csz),nz=Math.ceil((Math.max(...zs)+.4-z0)/Csz);
  const g=new Uint8Array(nx*nz),door=new Uint8Array(nx*nz);
  const inb=(i,j)=>i>=0&&j>=0&&i<nx&&j<nz;
  /* floor: paint every grid cell that overlaps a room rect, then close 1-cell cracks so a 10 cm raster gap cannot split a hall */
  C.forEach(r=>{const i0=Math.floor((r[0]-x0)/Csz+1e-9),i1=Math.ceil((r[2]-x0)/Csz-1e-9),j0=Math.floor((r[1]-z0)/Csz+1e-9),j1=Math.ceil((r[3]-z0)/Csz-1e-9);for(let i=i0;i<i1;i++)for(let j=j0;j<j1;j++)if(inb(i,j))g[i+j*nx]=1;});
  {const g2=new Uint8Array(g);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){if(g[i+j*nx])continue;const L=inb(i-1,j)&&g[(i-1)+j*nx],R=inb(i+1,j)&&g[(i+1)+j*nx],U=inb(i,j-1)&&g[i+(j-1)*nx],D=inb(i,j+1)&&g[i+(j+1)*nx];if((L&&R)||(U&&D))g2[i+j*nx]=1;}g.set(g2);}
  /* walls, keep door openings */
  H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),t=(w.thickness||.3)/2+.04,n=Math.ceil(G.L/(Csz/2));
   const ops=(w.openings||[]).filter(o=>o.type==='door');
   for(let s=0;s<=G.L;s+=Csz/2){const isD=ops.some(o=>s>=o.offset&&s<=o.offset+o.width);
    for(let k=-t;k<=t;k+=Csz/2){const x=G.x0+G.u[0]*s-G.u[1]*k,z=G.z0+G.u[1]*s+G.u[0]*k,i=((x-x0)/Csz)|0,j=((z-z0)/Csz)|0;if(!inb(i,j))continue;if(isD){door[i+j*nx]=1;g[i+j*nx]=1;}else g[i+j*nx]=0;}}});
  /* furniture */
  furnRects(L).forEach(f=>{const r=f.r;for(let x=r[0];x<r[2];x+=Csz)for(let z=r[1];z<r[3];z+=Csz){const i=((x-x0)/Csz)|0,j=((z-z0)/Csz)|0;if(inb(i,j))g[i+j*nx]=0;}});
  /* open leaves are judged by doorChoose / door-blocked; a closed leaf would not block the room, so they stay off the reachability grid */
  /* stair void + slim railing only (the 60 cm walkway around the opening must stay walkable) */
  stairHoles(L).forEach(r=>{for(let x=r[0];x<r[2];x+=Csz)for(let z=r[1];z<r[3];z+=Csz){const i=((x-x0)/Csz)|0,j=((z-z0)/Csz)|0;if(inb(i,j))g[i+j*nx]=0;}});
  /* dilate door cells 40 cm into rooms so the eroded grid still crosses the threshold */
  const door2=new Uint8Array(door);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)if(door[i+j*nx]){for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){if(dx*dx+dy*dy>16)continue;const I=i+dx,J=j+dy;if(inb(I,J)&&g[I+J*nx])door2[I+J*nx]=1;}}
  /* erode 40 cm (80 cm path) except in door approaches (keep 10 cm) */
  const e=new Uint8Array(g);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){if(!g[i+j*nx])continue;const need=door2[i+j*nx]?1:4;let ok=1;for(let dy=-need;dy<=need&&ok;dy++)for(let dx=-need;dx<=need;dx++){if(dx*dx+dy*dy>need*need)continue;const I=i+dx,J=j+dy;if(!inb(I,J)||!g[I+J*nx]){ok=0;break;}}if(!ok)e[i+j*nx]=0;else e[i+j*nx]=1;}
  /* a straight 80 cm clear width (axis-aligned) also counts: a 10 cm grid can drop a 90 cm stair-side passage under a 40 cm disk */
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){if(!g[i+j*nx]||e[i+j*nx])continue;let l=0,r=0,u=0,d=0;while(inb(i-l-1,j)&&g[(i-l-1)+j*nx])l++;while(inb(i+r+1,j)&&g[(i+r+1)+j*nx])r++;while(inb(i,j-u-1)&&g[i+(j-u-1)*nx])u++;while(inb(i,j+d+1)&&g[i+(j+d+1)*nx])d++;if(l+r+1>=8||u+d+1>=8)e[i+j*nx]=1;}
  const seen=new Uint8Array(nx*nz),q=[];
  const push=(x,z)=>{const tryAt=(x,z)=>{const i=((x-x0)/Csz)|0,j=((z-z0)/Csz)|0;if(!inb(i,j))return 0;const k=i+j*nx;if(!(e[k]||door[k]||door2[k]||g[k]))return 0;if(seen[k])return 1;seen[k]=1;q.push(k);return 1;};
   if(tryAt(x,z))return;for(let rad=Csz;rad<=.7;rad+=Csz){for(let a=0;a<12;a++)if(tryAt(x+Math.cos(a*Math.PI/6)*rad,z+Math.sin(a*Math.PI/6)*rad))return;}};
  /* seeds: entrance on ground floor, stair arrival on every floor */
  if(li===0)H.walls.filter(w=>w.level===L).forEach(w=>{(w.openings||[]).forEach(o=>{if(o.type!=='door'||!(w._ext||o.kind==='entrance'))return;const G=geo(w),m=o.offset+o.width/2,nx2=-G.u[1],nz2=G.u[0],cx=G.x0+G.u[0]*m,cz=G.z0+G.u[1]*m,T=(w.thickness||.3)/2+.35;
   for(const sd of[1,-1])push(cx+nx2*sd*T,cz+nz2*sd*T);});});
  const labs=circLabs(L);
  (H.stairs||[]).forEach(st=>{const si=(H.levels||[]).findIndex(x=>x.name===st.level);if(!(si===li||si===li-1))return;const r=stairRect(st),holes=stairHoles(L);
   const cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2;for(const[dx,dz] of[[.9,0],[-.9,0],[0,.9],[0,-.9],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7],[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]]){const x=cx+dx,z=cz+dz;if(holes.some(p=>x>p[0]&&x<p[2]&&z>p[1]&&z<p[3]))continue;const cell=C.find(q=>x>q[0]&&x<q[2]&&z>q[1]&&z<q[3]);if(!cell||!cell[4])continue;if(labs.size&&!labs.has(cell[4]))continue;push(x,z);}});
  for(let h=0;h<q.length;h++){const k=q[h],i=k%nx,j=(k/nx)|0;for(const[dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){const I=i+dx,J=j+dz;if(!inb(I,J))continue;const k2=I+J*nx;if(seen[k2]||!(e[k2]||door[k2]||door2[k2]))continue;seen[k2]=1;q.push(k2);}}
  const reached=new Set(),BB={};C.forEach(r=>{const b=BB[r[4]]||(BB[r[4]]=[r[0],r[1],r[2],r[3],0]);b[0]=Math.min(b[0],r[0]);b[1]=Math.min(b[1],r[1]);b[2]=Math.max(b[2],r[2]);b[3]=Math.max(b[3],r[3]);b[4]+=(r[2]-r[0])*(r[3]-r[1]);
   const i0=((r[0]-x0)/Csz)|0,i1=((r[2]-x0)/Csz)|0,j0=((r[1]-z0)/Csz)|0,j1=((r[3]-z0)/Csz)|0;
   for(let i=i0;i<=i1&&!reached.has(r[4]);i++)for(let j=j0;j<=j1;j++)if(inb(i,j)&&seen[i+j*nx]){reached.add(r[4]);break;}});
  let n=0;const RK=roomKinds[L];Object.keys(BB).forEach(lab=>{if(+lab===0||reached.has(+lab))return;if(RK&&RK.kindOf&&!RK.kindOf[+lab])return;const b=BB[lab],cx=(b[0]+b[2])/2,cz=(b[1]+b[3])/2,wd=b[2]-b[0],hd=b[3]-b[1],fill=b[4]/Math.max(.01,wd*hd);if(b[4]<1.2||Math.min(wd,hd)<.8||fill<.35)return;
   const inside=!H.walls.filter(w=>w.level===L&&w._ext).some(w=>{const G=geo(w),T=(w.thickness||.3)/2,nx=-G.u[1]*w._ext,nz=G.u[0]*w._ext,px=cx-G.x0,pz=cz-G.z0,s=px*G.u[0]+pz*G.u[1];if(s<-.05||s>G.L+.05)return false;const d=(cx-(G.x0+G.u[0]*s))*nx+(cz-(G.z0+G.u[1]*s))*nz;return d>-T+.08;});
   if(!inside)return;if(n++<6)P.push({rule:'walkability',level:L,p:[+cx.toFixed(2),+cz.toFixed(2)],why:'unreachable'});});
  /* door approach: some clear cell in an 80 cm deep zone on each side (skip if the point sits in a stair pad) */
  let nd=0;const pads=stairPads(L);H.walls.filter(w=>w.level===L&&!w._ext).forEach(w=>{(w.openings||[]).forEach(o=>{if(o.type!=='door'||nd>=5)return;const G=geo(w),m=o.offset+o.width/2,nx2=-G.u[1],nz2=G.u[0],cx=G.x0+G.u[0]*m,cz=G.z0+G.u[1]*m,T=(w.thickness||.3)/2;
   for(const sd of[1,-1]){let ok=0;for(const d of[.25,.45,.7])for(const lat of[-o.width*.3,0,o.width*.3]){const x=cx+nx2*sd*(T+d)+G.u[0]*lat,z=cz+nz2*sd*(T+d)+G.u[1]*lat;if(pads.some(p=>x>p[0]&&x<p[2]&&z>p[1]&&z<p[3])){ok=1;break;}const I=((x-x0)/Csz)|0,J=((z-z0)/Csz)|0;if(inb(I,J)&&(e[I+J*nx]||door[I+J*nx]||g[I+J*nx])){ok=1;break;}}if(!ok){nd++;P.push({rule:'walkability',level:L,p:[+(cx+nx2*sd*(T+.4)).toFixed(2),+(cz+nz2*sd*(T+.4)).toFixed(2)],why:'door-approach'});return;}}});});
 });}

let DECKS=[],LROOF=[];
export function decks(){return DECKS;}
/* v22u: place the walk rig on a walkable roof terrace in world space (for stay-on-storey). */
export function lookWalk(yw,pt){if(yw!=null)yaw=yw;if(pt!=null)pitch=pt;if(cam){cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);if(rig)rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));}DIRTY=Math.max(DIRTY,30);return{yaw,pitch};}
export function standDeck(i){const ds=(DECKS||[]).slice().sort((a,b)=>(b[3]-b[1])*(b[4]-b[2])-(a[3]-a[1])*(a[4]-a[2]));const d=ds[i||0];if(!d||!rig)return null;const x=(d[1]+d[3])/2,z=(d[2]+d[4])/2,y=d[5];fly=null;if(!walk)setWalk(true);rig.position.set(x,y,z);if(body&&body.resolve)body.resolve(rig.position);const yy=snapWalkY(rig.position);if(yy!=null)rig.position.y=yy;let tx=0,tz=0,n=0;(H.walls||[]).filter(w=>w.level===d[0]).forEach(w=>{tx+=w.start[0]+w.end[0];tz+=w.start[1]+w.end[1];n+=2;});if(n){yaw=Math.atan2((tx/n)-x,-((tz/n)-z));}pitch=.22;cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));DIRTY=Math.max(DIRTY,90);if(window.__onWalk)window.__onWalk(hereInfo());return{x,z,y:rig.position.y,L:d[0],want:y,w:d[3]-d[1],d:d[4]-d[2]};}
export function audit(){const P=[],inR=(p,r,m=0)=>p[0]>r[0]-m&&p[0]<r[2]+m&&p[1]>r[1]-m&&p[1]<r[3]+m;if(!H||!H.levels)return P;
 (H.furn||[]).forEach(f=>{const li=H.levels.findIndex(l=>l.name===f.level);if(li<1)return;const cs=CELLS[f.level]||[];if(cs.some(r=>inR(f.p,r,.05)))return;
  if(!DECKS.some(d=>d[0]===f.level&&inR(f.p,[d[1],d[2],d[3],d[4]],.05)))P.push({rule:'furniture-on-slab',t:f.t,level:f.level,p:f.p});});
 H.levels.forEach((l,i)=>{const up=H.levels[i+1];if(!up)return;const uc=(CELLS[up.name]||[]).map(u=>[u[0]-.31,u[1]-.31,u[2]+.31,u[3]+.31]),lr=LROOF.filter(q=>q[0]===l.name).map(q=>q.slice(1));
  (CELLS[l.name]||[]).forEach(r=>{for(let x=r[0]+.25;x<r[2];x+=.5)for(let z=r[1]+.25;z<r[3];z+=.5){const p=[x,z];if(uc.some(u=>inR(p,u))||lr.some(q=>inR(p,q))||(H.stairs||[]).some(st=>st.level===l.name&&inR(p,stairRect(st),.05)))continue;P.push({rule:'roof-gap',level:l.name,p:[+x.toFixed(2),+z.toFixed(2)]});return;}});});
 /* v20261117g geometric rules taught from Adam's review - all generic, scene-based */
 if(world){world.updateMatrixWorld(true);const bb=o=>new THREE.Box3().setFromObject(o),r2=v=>+v.toFixed(2),fp=world.userData.fp||[0,0,0,0],XW=H.walls.filter(w=>w._ext),xT=Math.max(.3,...XW.map(w=>w.thickness||.3));
  const faceD=(x,z)=>Math.min(...XW.map(w=>{const g=geo(w),px=x-g.x0,pz=z-g.z0,q=Math.max(0,Math.min(g.L,px*g.u[0]+pz*g.u[1]));return Math.abs(Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)-(w.thickness||.3)/2);}));
  const RF=[];world.traverse(o=>{const u=o.userData||{};
   if(u.hobRing&&o.parent){const pl=o.parent.children.find(c=>c.userData&&c.userData.hobPlate);if(pl){const a=bb(o),b=bb(pl);if(a.min.x<b.min.x-.005||a.max.x>b.max.x+.005||a.min.z<b.min.z-.005||a.max.z>b.max.z+.005)P.push({rule:'hob-zone-off-plate',p:[r2(a.min.x),r2(a.min.z)]});}}
   if(u.rail&&o.isMesh){const a=bb(o),m=xT/2+.05;if(a.min.x<fp[0]-m||a.max.x>fp[2]+m||a.min.z<fp[1]-m||a.max.z>fp[3]+m)P.push({rule:'railing-outside-slab',p:[r2(a.min.x),r2(a.min.z)]});}
   if(u.dpipe&&o.isMesh&&!u.hopper&&!u.gutter){const a=bb(o),c=a.getCenter(new THREE.Vector3());if(faceD(c.x,c.z)>.5)P.push({rule:'downpipe-off-wall',p:[r2(c.x),r2(c.z)]});}
   if(u.doorLeaf&&!u.door){const a=bb(o),c=a.getCenter(new THREE.Vector3());if(c.x<fp[0]-.3||c.x>fp[2]+.3||c.z<fp[1]-.3||c.z>fp[3]+.3)P.push({rule:'door-leaf-outside',p:[r2(c.x),r2(c.z)]});}
   if((u.roof||u.lroof)&&o.isMesh&&o.geometry&&o.geometry.type==='BoxGeometry'&&o.material!==M.glass&&!u.dpipe&&!u.hopper&&!u.gutter&&!u.flash&&!u.rail)RF.push([bb(o),o]);});
  let nc=0;for(let i=0;i<RF.length&&nc<5;i++)for(let j=i+1;j<RF.length&&nc<5;j++){const A=RF[i][0],B=RF[j][0];if(Math.abs(A.max.y-B.max.y)>.0004)continue;
   /* v21o: roof materials are cloned when the roof is hidden / faded (Bez strechy) - same flat-roof surface is recognised by its flag, not by identity */const isFW=m=>m===FLATW||!!(m&&m.userData&&m.userData.flatw&&!(globalThis.__PF||{}).noFlatFlag);if(isFW(RF[i][1].material)&&isFW(RF[j][1].material))continue;const ox=Math.min(A.max.x,B.max.x)-Math.max(A.min.x,B.min.x),oz=Math.min(A.max.z,B.max.z)-Math.max(A.min.z,B.min.z);if(ox>.02&&oz>.02){nc++;const dsc=k=>{const o=RF[k][1],b=RF[k][0];return [Object.keys(o.userData||{}).join('.'),(o.material&&(o.material.name||o.material.type))||'',r2(b.max.x-b.min.x),r2(b.max.y-b.min.y),r2(b.max.z-b.min.z)];};P.push({rule:'coplanar-overlap',y:r2(A.max.y),p:[r2(Math.max(A.min.x,B.min.x)),r2(Math.max(A.min.z,B.min.z))],a:dsc(i),b:dsc(j)});}}
  {let nh=0;world.traverse(o=>{if(o.userData&&o.userData.hobPlate)nh++;});const kl=new Set((H.furn||[]).filter(f=>f.t==='kitch').map(f=>f.level)).size;if(nh>kl)P.push({rule:'kitchen-multi-hob',hobs:nh,kitchens:kl});}
  // v20261117h: slab-edge flashing band max 6 cm proud of the wall (was a 20 cm fascia that wrapped past the corners)
  world.traverse(o=>{const u=o.userData||{};if(u.flash&&u.flash>.06)P.push({rule:'flashing-too-proud',d:u.flash});
});
  // v20261117i: wall-mounted pieces - curtains centred on a glazed opening of their wall and close to it; art/mirrors on a free wall stretch, away from stairs
  world.traverse(o=>{const r=o.userData&&o.userData.wm;if(!r)return;const w=H.walls.find(x=>x.id===r.w);if(!w){P.push({rule:'wallmount-no-wall',t:r.t});return;}const g=geo(w),ops=w.openings||[];
   if(r.t==='curtain'){if(!ops.some(p=>GLAZED(p)&&Math.abs(p.offset+p.width/2-r.q)<.03))P.push({rule:'curtain-off-window',p:[r2(o.position.x),r2(o.position.z)]});if(r.off>(w.thickness||.3)/2+.12)P.push({rule:'curtain-off-wall'});}
   else{const hw=(r.t==='art'?.9:.7)/2;if(ops.some(p=>p.offset<r.q+hw+.1&&p.offset+p.width>r.q-hw-.1))P.push({rule:'art-placement',why:'over-opening',t:r.t});if(r.ay!=null&&r.ay+r.h/2>2.5)P.push({rule:'art-placement',why:'too-high',t:r.t,top:r2(r.ay+r.h/2)});
    if((H.stairs||[]).map(stairRect).some(q=>o.position.x>q[0]-.95&&o.position.x<q[2]+.95&&o.position.z>q[1]-.95&&o.position.z<q[3]+.95))P.push({rule:'art-placement',why:'near-stair',t:r.t});}});
  {let nl=0;world.traverse(o=>{if(o.userData&&o.userData.stairLining)nl++;});const ns=(H.stairs||[]).filter(st=>{const li=H.levels.findIndex(x=>x.name===st.level);return H.levels[li+1];}).length;if(nl<ns*4)P.push({rule:'stair-opening-unlined',linings:nl,stairs:ns});}
  // furniture footprints must not interpenetrate (rugs/wall decor excluded; chairs may tuck under tables/desks)
  const SKIP=new Set(['rug','runner','curtain','art','mirror','towel','tvw','hooks','wshelf','lamp']),TUCK=new Set(['chair','stool']),UND=new Set(['table','desk','island','otable','kitch']);
  const fr=(H.furn||[]).filter(f=>!SKIP.has(f.t)&&FUR[f.t]).map(f=>{const D=FUR[f.t],w=f.w||D.w,d=f.d||D.d,q=((f.r||0)%2)?[d,w]:[w,d];return [f,f.p[0]-q[0]/2,f.p[1]-q[1]/2,f.p[0]+q[0]/2,f.p[1]+q[1]/2];});
  for(let i=0;i<fr.length;i++)for(let j=i+1;j<fr.length;j++){const A=fr[i],B=fr[j];if(A[0].level!==B[0].level)continue;const ta=A[0].t,tb=B[0].t;if((TUCK.has(ta)&&UND.has(tb))||(TUCK.has(tb)&&UND.has(ta))){const C=TUCK.has(ta)?A:B,T0=TUCK.has(ta)?B:A;if(C[0].p[0]>T0[1]+.02&&C[0].p[0]<T0[3]-.02&&C[0].p[1]>T0[2]+.02&&C[0].p[1]<T0[4]-.02)P.push({rule:'chair-in-table',level:C[0].level,p:C[0].p});continue;}
   const ox=Math.min(A[3],B[3])-Math.max(A[1],B[1]),oz=Math.min(A[4],B[4])-Math.max(A[2],B[2]);if(ox>.03&&oz>.03)P.push({rule:'furn-overlap',a:ta,b:tb,level:A[0].level,p:A[0].p});}
  /* v20261117r rules taught from Adam's Ukážka 2 walk (generic, scene-based, real mesh bounds):
     door-swing: every interior leaf stands ajar and its swept quarter + open leaf hit no furniture/wall; door-blocked: no tall piece right beside the open leaf;
     plinth-in-room: the facade plinth never pokes into a room; tile-outside-wet: wall tiles only on faces of wet rooms;
     furn-footprint: a kit piece's real mesh stays inside its catalogue footprint (books in the shelf, no bedside cubes); furn-overlap3d: real bounds of two pieces never interpenetrate;
     furn-out-of-room: real bounds (plants' leaves too) stay inside the room cells (clear of walls/columns); furn-zfight: no two coplanar faces of different material in a piece */
  {const FRc={},CRc=L=>CELLS[L]||[];world.traverse(o=>{const s=o.userData&&o.userData.sw;if(!s)return;const w=H.walls.find(x=>x.id===s.w);if(!w)return;const G=geo(w),FR=FRc[s.L]||(FRc[s.L]=furnRects(s.L)),h=swingHits(w,G,s.hinge,s.dir,s.sd,s.a,s.lw,FR,CRc(s.L),circLabs(s.L));
    if(s.a<45||s.a>89)P.push({rule:'door-swing',why:'angle',a:s.a,level:s.L});if(h.n||h.out)P.push({rule:'door-swing',level:s.L,wall:s.w,hits:h.n,out:h.out});/* v21i: a door between two halls opens into a hall either way - that alone is not blocking (narrow / stair / tall piece still are) */const hc=h.circ&&!h.near&&!h.stair&&!h.narrow&&swingHits(w,G,s.hinge,s.dir,-s.sd,s.a,s.lw,FR,CRc(s.L),circLabs(s.L)).circ>0;if((h.near||h.circ||h.stair||h.narrow)&&!hc)P.push({rule:'door-blocked',level:s.L,wall:s.w,why:h.stair?'stair':h.narrow?'walkway':h.circ?'hall': 'furn'});});
   let nd=0;H.walls.forEach(w=>{if(w._ext)return;(w.openings||[]).forEach(o=>{if(o.type!=='door'||(o.kind&&o.kind!=='single'))return;nd++;});});let ns=0;world.traverse(o=>{if(o.userData&&o.userData.sw)ns++;});if(ns<nd)P.push({rule:'door-swing',why:'leaf-missing',doors:nd,leaves:ns});}
  walkAudit(P);
  extPipeAudit(P,world,bb,r2);
  {const inC=(x,z)=>inFoot(x,z)&&wallClear(x,z)>.03;let np=0;world.traverse(o=>{if(!o.isMesh||!o.userData.plinth||np>=5)return;const b=bb(o);if(!o.userData.plEnd&&Math.max(b.max.x-b.min.x,b.max.z-b.min.z)<.59){np++;P.push({rule:'plinth-stub',p:[r2(b.min.x),r2(b.min.z)]});return;}/* plinth-in-room by sampling is too coarse on the 10 cm room grid (false hits on the outer face) - the builder trims concave corners and skips inner walls instead */void inC;});}
  {let nt=0;world.traverse(o=>{if(!o.isMesh||o.userData.wetTile==null||nt>=5)return;const[L,nx,nz,lab]=o.userData.wetTile,RK=roomKinds[L];if(!RK)return;const b=bb(o);const sx=b.max.x-b.min.x>b.max.z-b.min.z;
    for(let k=1;k<=5;k++){const x=sx?b.min.x+(b.max.x-b.min.x)*k/6:(b.min.x+b.max.x)/2,z=sx?(b.min.z+b.max.z)/2:b.min.z+(b.max.z-b.min.z)*k/6,lb=RK.labelAt(x+nx*.15,z+nz*.15);if(lb!==lab||RK.kindOf[lb]!=='wet'){nt++;P.push({rule:'tile-outside-wet',level:L,p:[r2(x),r2(z)]});return;}}});}
  {const FB=furnBoxes().filter(f=>!f.wm),FS=new Set(['rug','runner','curtain','art','mirror','towel','tvw','hooks','lamp','pendant']),TU=new Set(['chair','stool']),UN=new Set(['table','desk','island','otable','kitch']);let no=0,nf=0,nr=0;
   FB.forEach(f=>{const F=(H.furn||[]).find(q=>q.t===f.t&&Math.abs(q.p[0]-f.x)<.01&&Math.abs(q.p[1]-f.z)<.01);f.f=F;if(!F)return;const li=H.levels.findIndex(l=>l.name===F.level);f.L=F.level;
    if(!f.ph&&FUR[f.t]&&!FS.has(f.t)&&f.t!=='plant'&&nf<6){const D=FUR[f.t],w=F.w||D.w,d=F.d||D.d,q=((F.r||0)%2)?[d,w]:[w,d];const tl=f.t==='kitch'?.17:.07;if(f.b[3]-f.b[0]>q[0]+tl||f.b[5]-f.b[2]>q[1]+tl){nf++;P.push({rule:'furn-footprint',t:f.t,level:F.level,size:[r2(f.b[3]-f.b[0]),r2(f.b[5]-f.b[2])],want:q.map(r2)});}}
    if(false&&!FS.has(f.t)&&nr<6&&(CELLS[F.level]||[]).some(r=>r[4]>0&&F.p[0]>r[0]&&F.p[0]<r[2]&&F.p[1]>r[1]&&F.p[1]<r[3])){const C=(CELLS[F.level]||[]).filter(r=>r[4]>0),ST=(H.stairs||[]).filter(st=>st.level===F.level).map(stairRect),ok=(x,z)=>C.some(r=>x>r[0]-.1&&x<r[2]+.1&&z>r[1]-.1&&z<r[3]+.1)||ST.some(r=>x>r[0]&&x<r[2]&&z>r[1]&&z<r[3]),m=.04;
     if(![[f.b[0]+m,f.b[2]+m],[f.b[3]-m,f.b[2]+m],[f.b[0]+m,f.b[5]-m],[f.b[3]-m,f.b[5]-m]].every(c=>ok(c[0],c[1]))){nr++;P.push({rule:'furn-out-of-room',t:f.t,level:F.level,p:F.p});}}});
   const G2=FB.filter(f=>f.f&&!FS.has(f.t));for(let i=0;i<G2.length&&no<8;i++)for(let j=i+1;j<G2.length&&no<8;j++){const A=G2[i],B=G2[j];if(A.L!==B.L)continue;if((TU.has(A.t)&&UN.has(B.t))||(TU.has(B.t)&&UN.has(A.t))||(A.t==='kitch'&&(B.t==='kitch'||B.t==='fridge'))||(B.t==='kitch'&&A.t==='fridge'))continue;
    const ox=Math.min(A.b[3],B.b[3])-Math.max(A.b[0],B.b[0]),oz=Math.min(A.b[5],B.b[5])-Math.max(A.b[2],B.b[2]),oy=Math.min(A.b[4],B.b[4])-Math.max(A.b[1],B.b[1]);const pl=A.t==='plant'||B.t==='plant'?.08:.05;if(ox>pl&&oz>pl&&oy>.02){no++;P.push({rule:'furn-overlap3d',a:A.t,b:B.t,level:A.L,p:[A.x,A.z,A.t,B.t]});}}}
  {const seen=new Set();world.traverse(g=>{const u=g.userData||{};if(!u.furn||u.ph||u.furn==='plant'||seen.has(u.furn)||(g.parent&&g.parent.userData&&g.parent.userData.furn))return;seen.add(u.furn);const bx=[];g.children.forEach(c=>{if(!c.isMesh||!c.geometry||!c.material||c.material.transparent||c.rotation.x||c.rotation.y||c.rotation.z)return;if(!c.geometry.boundingBox)c.geometry.computeBoundingBox();const k=c.geometry.boundingBox;bx.push([c,[k.min.x+c.position.x,k.min.y+c.position.y,k.min.z+c.position.z,k.max.x+c.position.x,k.max.y+c.position.y,k.max.z+c.position.z]]);});
    let hit=0;for(let i=0;i<bx.length&&!hit;i++)for(let j=i+1;j<bx.length&&!hit;j++){const[A,a]=bx[i],[B,b]=bx[j];if(A.material===B.material)continue;for(let ax=0;ax<3&&!hit;ax++){const o1=(ax+1)%3,o2=(ax+2)%3,ov1=Math.min(a[o1+3],b[o1+3])-Math.max(a[o1],b[o1]),ov2=Math.min(a[o2+3],b[o2+3])-Math.max(a[o2],b[o2]);if(ov1<.02||ov2<.02)continue;
     if(Math.abs(a[ax+3]-b[ax+3])<.0015||(Math.abs(a[ax]-b[ax])<.0015&&!(ax===1&&a[1]<.01)))hit=[ax,a.map(r2),b.map(r2)];}}if(hit)P.push({rule:'furn-zfight',t:u.furn,pair:hit});});}
  /* v20261117s floor-spill: just inside each side of an interior door the floor material belongs to the room on that side (the floor cell under p1 = room seen deeper at p2) */
  {let nfs=0;H.walls.forEach(w=>{if(w._ext||nfs>=5)return;const RK=roomKinds[w.level],C=CELLS[w.level]||[];if(!RK)return;const G=geo(w),T=w.thickness||.3,n=[-G.u[1],G.u[0]];(w.openings||[]).forEach(o=>{if(o.type!=='door'||nfs>=5)return;const m=o.offset+o.width/2,cx=G.x0+G.u[0]*m,cz=G.z0+G.u[1]*m;
    for(const sd of[1,-1]){const p1=[cx+n[0]*sd*(T/2+.06),cz+n[1]*sd*(T/2+.06)],p2=[cx+n[0]*sd*(T/2+.45),cz+n[1]*sd*(T/2+.45)],c=C.find(r=>p1[0]>r[0]&&p1[0]<r[2]&&p1[1]>r[1]&&p1[1]<r[3]),l2=RK.labelAt(p2[0],p2[1]);if(!c||!l2)continue;
     const k1=RK.kindOf[c[4]]||'other',k2=RK.kindOf[l2]||'other';if(k1!==k2){nfs++;P.push({rule:'floor-spill',level:w.level,p:p1.map(r2),floor:k1,room:k2});}}});});}
  /* v20261117u floor-present: every room on every storey has an opaque floor mesh covering ≥95% of its area, in exterior / bez strechy (each floor filter) / walk. a clip must never drop a room floor. audit: floor-present */
  {const holes=L=>{const li=H.levels.findIndex(x=>x.name===L),out=[];if(li>=1)(H.stairs||[]).filter(st=>st.level===H.levels[li-1].name).forEach(st=>out.push(stairRect(st)));return out;};
   const FL=[];world.updateMatrixWorld(true);world.traverse(o=>{if(!o.isMesh)return;const u=o.userData||{},mat=o.material;if(!(u.floor||(mat&&mat.userData&&mat.userData.floor)))return;const b=bb(o);FL.push({b,o,y:(b.min.y+b.max.y)/2,ghost:mat===GHOST||(mat&&mat.transparent&&(mat.opacity||1)<.9)});});
   const inWall=(x,z,L)=>H.walls.some(w=>{if(w.level!==L)return false;const g=geo(w),T=(w.thickness||.3)/2+.03,px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-.02||q>g.L+.02)return false;return Math.hypot(px-g.u[0]*q,pz-g.u[1]*q)<T;});
   const outExt=(x,z,L)=>H.walls.some(w=>{if(w.level!==L||!w._ext)return false;const g=geo(w),T=(w.thickness||.3)/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-.05||q>g.L+.05)return false;const d=(x-(g.x0+g.u[0]*q))*nx+(z-(g.z0+g.u[1]*q))*nz;return d>-T+.04;});
   const cover=(i,useVis)=>{const l=H.levels[i],hs=holes(l.name),fl=FL.filter(f=>f.y>=(l.elevation||0)+.02&&f.y<(l.elevation||0)+.2&&(!useVis||(f.o.visible!==false&&!f.ghost&&f.o.material!==GHOST)));let bad=0;
    (CELLS[l.name]||[]).forEach(r=>{const area=(r[2]-r[0])*(r[3]-r[1]);if(area<.25)return;const step=Math.max(.15,Math.min(.4,Math.sqrt(area)/7));let t=0,h=0;
     for(let x=r[0]+.08;x<r[2]-.08;x+=step)for(let z=r[1]+.08;z<r[3]-.08;z+=step){if(hs.some(q=>x>q[0]&&x<q[2]&&z>q[1]&&z<q[3])||inWall(x,z,l.name)||outExt(x,z,l.name))continue;t++;if(fl.some(f=>x>=f.b.min.x&&x<=f.b.max.x&&z>=f.b.min.z&&z<=f.b.max.z))h++;}
     if(t>=4&&h/t<.95){bad++;if(!useVis)P.push({rule:'floor-present',level:l.name,p:[r2((r[0]+r[2])/2),r2((r[1]+r[3])/2)],frac:r2(h/t),area:r2(area),cell:r.slice(0,4).map(r2),near:FL.filter(f=>f.b.max.x>r[0]&&f.b.min.x<r[2]&&f.b.max.z>r[1]&&f.b.min.z<r[3]).slice(0,6).map(f=>[r2(f.y),r2(f.b.min.x),r2(f.b.max.x),r2(f.b.min.z),r2(f.b.max.z),f.o.name||f.o.geometry.type])});}});return bad;};
   H.levels.forEach((l,i)=>cover(i,false));
   const prevD=DOLL,prevC=LVCUT,prevW=walk;try{setDollViz(true);
    [null,...H.levels.map((l,i)=>i)].forEach(k=>{LVCUT=k;applyCut();const idx=k==null?H.levels.map((l,i)=>i):[k];idx.forEach(i=>{if(cover(i,true))P.push({rule:'floor-present',level:H.levels[i].name,mode:k==null?'doll-all':'doll-'+H.levels[i].name});});});
   }finally{DOLL=prevD;LVCUT=prevC;if(prevD){setDollViz(true);applyCut();}else if(prevW)setInteriorViz();else resetExterior();}}
  /* v20261117q rules taught from Adam's regenerated villa (generic, scene-based):
     furn-orient: every free piece faces the way layout.js meant (FV[r]); seat-faces-away: a chair/stool next to a table/desk faces it;
     lone-side: a side table stands next to a seat or bed; plant-cluster: no plant within 0.7 m of another; prop-scale: a model's height stays 0.5-1.8x its catalogue height;
     roof-hole: vertical rays over the whole roofed footprint must hit roof (no slit/hole) */
  const FVv=[[0,1],[1,0],[0,-1],[-1,0]],GR=[];world.traverse(o=>{const u=o.userData||{};if(u.furn&&!u.wm&&o.parent&&!(o.parent.userData&&o.parent.userData.furn))GR.push(o);});
  const v0=new THREE.Vector3(),v1=new THREE.Vector3();GR.forEach(g=>{const f=(H.furn||[]).find(f=>f.t===g.userData.furn&&Math.abs(f.p[0]-g.position.x)<.01&&Math.abs(f.p[1]-g.position.z)<.01);if(!f)return;g.userData.f=f;g.getWorldDirection(v0);const r=((f.r||0)%4+4)%4;if(v0.x*FVv[r][0]+v0.z*FVv[r][1]<.9)P.push({rule:'furn-orient',t:f.t,level:f.level,p:f.p});
   if(FUR[f.t]&&FUR[f.t].h&&!['rug','runner','plant'].includes(f.t)&&g.userData.ph){/* only downloaded (Poly Haven) models - kit pieces are authored to size */const b=bb(g),hh=b.max.y-b.min.y;if(hh>.05&&(hh<.5*FUR[f.t].h||hh>1.8*FUR[f.t].h))P.push({rule:'prop-scale',t:f.t,h:r2(hh),want:FUR[f.t].h,level:f.level});}});
  const FF=GR.map(g=>g.userData.f).filter(Boolean),dR=(a,b)=>{const A=FUR[a.t],B=FUR[b.t];if(!A||!B)return 9;const qa=(a.r||0)%2?[a.d||A.d,a.w||A.w]:[a.w||A.w,a.d||A.d],qb=(b.r||0)%2?[b.d||B.d,b.w||B.w]:[b.w||B.w,b.d||B.d];return Math.hypot(Math.max(0,Math.abs(a.p[0]-b.p[0])-(qa[0]+qb[0])/2),Math.max(0,Math.abs(a.p[1]-b.p[1])-(qa[1]+qb[1])/2));};
  FF.forEach(f=>{const same=FF.filter(o=>o!==f&&o.level===f.level);
   if(f.t==='chair'||f.t==='stool'){const T=same.filter(o=>['table','desk','otable'].includes(o.t)).map(o=>[o,Math.hypot(o.p[0]-f.p[0],o.p[1]-f.p[1])]).sort((a,b)=>a[1]-b[1])[0];if(T&&dR(f,T[0])<.25){const r=((f.r||0)%4+4)%4,dx=T[0].p[0]-f.p[0],dz=T[0].p[1]-f.p[1];if((FVv[r][0]*dx+FVv[r][1]*dz)/Math.max(.01,T[1])<.3)P.push({rule:'seat-faces-away',level:f.level,p:f.p});}}
   if((f.t==='chair'||f.t==='stool')&&!same.some(o=>['table','desk','otable','island','kitch'].includes(o.t)&&dR(f,o)<.45))P.push({rule:'lone-chair',level:f.level,p:f.p});
   if(f.t==='side'&&!same.some(o=>['sofa','armch','lounge','bed','bed1','bunk'].includes(o.t)&&dR(f,o)<.35))P.push({rule:'lone-side',level:f.level,p:f.p});
   if(f.t==='plant'&&same.some(o=>o.t==='plant'&&Math.hypot(o.p[0]-f.p[0],o.p[1]-f.p[1])<.7))P.push({rule:'plant-cluster',level:f.level,p:f.p});});
  /* stair-void-capped: looking up the stair from the lower floor you must see the upper floor - no ceiling/slab/box across the void (only the flight, railings and lining) */
  (H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(x=>x.name===st.level),lo=H.levels[li],up=H.levels[li+1];if(!up)return;const q=stairRect(st),OB=[];world.traverse(o=>{if(!o.isMesh||!o.material||o.material.transparent||o.material===M.glass)return;for(let p=o;p;p=p.parent){const d=p.userData||{};if(d.stair||d.rail||d.stairLining||d.furn||d.lamp||d.flight||d.step)return;}OB.push(o);});const rc=new THREE.Raycaster(),u=new THREE.Vector3(0,1,0);let hit=0;
   for(const fx of[.3,.5,.7])for(const fz of[.3,.5,.7]){const x=q[0]+(q[2]-q[0])*fx,z=q[1]+(q[3]-q[1])*fz;rc.set(v1.set(x,(lo.elevation||0)+(up.elevation-(lo.elevation||0))*.5,z),u);const h=rc.intersectObjects(OB,false)[0];if(h&&h.point.y<(up.elevation||0)+.5)hit++;}
   if(hit>=3)P.push({rule:'stair-void-capped',level:st.level,hits:hit});});
  {const RM=[];if(roof!=='none')world.traverse(o=>{if(o.isMesh){let u=null;for(let q=o;q;q=q.parent)if(q.userData&&(q.userData.roof||q.userData.lroof)){u=1;break;}if(u)RM.push(o);}});
   if(RM.length){const rc=new THREE.Raycaster(),dn=new THREE.Vector3(0,-1,0),top=H.levels[H.levels.length-1],rects=[];(CELLS[top.name]||[]).forEach(r=>rects.push(r));LROOF.forEach(q=>rects.push(q.slice(1)));(H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(x=>x.name===st.level);if(H.levels[li+1]===top)rects.push(stairRect(st));});let nh=0;
    /* union bbox of the roofed area, scanned in 3 cm steps along 30 cm lines both ways: catches slits down to ~3 cm wide */
    const tst=(x,z)=>{if(nh>=6||x<fp[0]||x>fp[2]||z<fp[1]||z>fp[3]||!rects.some(r=>x>r[0]+.03&&x<r[2]-.03&&z>r[1]+.03&&z<r[3]-.03))return;rc.set(v1.set(x,60,z),dn);if(!rc.intersectObjects(RM,false).length){nh++;P.push({rule:'roof-hole',p:[r2(x),r2(z)]});}};
    const U=rects.reduce((a,r)=>[Math.min(a[0],r[0]),Math.min(a[1],r[1]),Math.max(a[2],r[2]),Math.max(a[3],r[3])],[1e9,1e9,-1e9,-1e9]);
    for(let z=U[1]+.15;z<U[3];z+=.3)for(let x=U[0];x<U[2];x+=.03)tst(x,z);for(let x=U[0]+.15;x<U[2];x+=.3)for(let z=U[1];z<U[3];z+=.03)tst(x,z);}}
 }
 return P;}
let LMS=null;let LMSRC=[];const _lmv=new THREE.Vector3();
function lmCands(w){const use=new Map();w.traverse(o=>{if(o.isMesh)use.set(o.geometry,(use.get(o.geometry)||0)+1);});const out=[];
 w.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||o.material===FLATW||o.material===FLATM)return;for(let p=o;p&&p!==w;p=p.parent){const u=p.userData||{};if(u.furn||u.doorLeaf||u.lamp||u.door||u.ceil||u.stairLining)return;}
  const m=o.material,g=o.geometry;if(!m||m.transparent||m.opacity<1||!(m.isMeshStandardMaterial||m.isMeshLambertMaterial))return; // unlit MeshBasic floors stay live (their clone lost the floor look)if(use.get(g)>1)return;
  if(!/^(Box|Extrude|Shape|Plane|Buffer)Geometry$/.test(g.type)||!g.attributes.position)return;if(g.attributes.position.count>20000)return;
  g.computeBoundingBox();const s=g.boundingBox.getSize(_lmv),mx=Math.max(s.x,s.y,s.z);if(mx<.25||mx>80)return;out.push(o);});return out;}
function lmNorm(){world.traverse(o=>{const u=o.userData||{};if(u.wallCut){o.scale.y=1;o.position.y=u.wallCut.base+u.wallCut.h/2;o.visible=true;}if(u.doorLeaf){o.scale.y=1;o.visible=true;}
  if(u.grow){o.scale.y=1;if(u.growBase!=null&&u.growH!=null)o.position.y=u.growBase+u.growH/2;o.visible=true;}});world.updateMatrixWorld(true);}
const _b64=a=>{const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);};
function lmMesh(o){const g=o.geometry,P=g.attributes.position,n=P.count,f=new Float32Array(n*3);for(let i=0;i<n;i++){_lmv.fromBufferAttribute(P,i).applyMatrix4(o.matrixWorld);f[i*3]=_lmv.x;f[i*3+1]=_lmv.y;f[i*3+2]=_lmv.z;}
 const ix=g.index?Uint32Array.from(g.index.array):null,m=o.material,c=m&&m.color?m.color:new THREE.Color(.8,.8,.8),k=m&&m.map?.75:1;return{p:_b64(f),i:ix?_b64(ix):null,n,c:[c.r*k,c.g*k,c.b*k]};}
export function sceneRoot(){return world;}
export function cellsOf(L){return (CELLS[L]||[]).map(r=>r.map(v=>+(+v).toFixed(2)).concat([roomKinds[L]&&roomKinds[L].kindOf[r[4]]||'']));}
/* v20261117r QA: real (mesh) bounding boxes of every free furniture group - used by the 3D overlap/decor rules and by QA scripts */
export function furnBoxes(){const o=[];if(!world)return o;world.updateMatrixWorld(true);world.traverse(g=>{const u=g.userData||{};if(u.furn&&!(g.parent&&g.parent.userData&&g.parent.userData.furn)){const b=new THREE.Box3();g.traverse(m=>{if(m.isMesh&&m.visible!==false){let v=1;for(let q=m;q&&q!==g;q=q.parent)if(q.visible===false){v=0;break;}if(v)b.expandByObject(m);}});if(b.isEmpty())return;o.push({t:u.furn,wm:!!u.wm,ph:u.ph||0,x:+g.position.x.toFixed(2),z:+g.position.z.toFixed(2),b:[b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].map(v=>+v.toFixed(3))});}});return o;}
export function rayDbg(x,z,y0){world.updateMatrixWorld(true);const rc=new THREE.Raycaster();rc.set(new THREE.Vector3(x,y0==null?80:y0,z),new THREE.Vector3(0,y0==null?-1:1,0));return rc.intersectObjects(world.children,true).slice(0,4).map(h=>{let k=[];for(let q=h.object;q&&q!==world;q=q.parent)k.push(Object.keys(q.userData||{}).join('/')+':'+(q.geometry?q.geometry.type:''));return [+h.point.y.toFixed(3),h.object.material&&h.object.material.color?h.object.material.color.getHexString():'',k.join('<')];});}
/* v20261117q QA: dense vertical ray scan of the roof - returns points where a ray from the sky reaches the house (wall top, floor, ceiling) without crossing a roof mesh = a slit/hole */
export function roofScan(step=.02,line=.25){if(!world||roof==='none')return[];world.updateMatrixWorld(true);const RM=[],HS=[];world.traverse(o=>{if(!o.isMesh)return;let u=0,c=0;for(let q=o;q;q=q.parent){const d=q.userData||{};if(d.roof||d.lroof){u=1;break;}if(d.ceil||d.furn||d.lamp)c=1;}if(u)RM.push(o);else if(!c)HS.push(o);});
 const fp=world.userData.fp||[0,0,0,0],rc=new THREE.Raycaster(),dn=new THREE.Vector3(0,-1,0),v=new THREE.Vector3(),out=[],y0=(H.levels[1]||H.levels[0]).elevation+.5;
 const test=(x,z)=>{rc.set(v.set(x,80,z),dn);const a=rc.intersectObjects(RM,false)[0];const b=rc.intersectObjects(HS,false).find(h=>h.object.material&&h.object.material!==M.glass&&!h.object.material.transparent);if(b&&b.point.y>y0&&(!a||a.point.y<b.point.y-.01)){out.push([+x.toFixed(2),+z.toFixed(2),+b.point.y.toFixed(2),b.object.userData&&Object.keys(b.object.userData).join('/')||b.object.name||'']);}};
 for(let z=fp[1]-.3;z<=fp[3]+.3&&out.length<400;z+=line)for(let x=fp[0]-.3;x<=fp[2]+.3;x+=step)test(x,z);
 for(let x=fp[0]-.3;x<=fp[2]+.3&&out.length<400;x+=line)for(let z=fp[1]-.3;z<=fp[3]+.3;z+=step)test(x,z);
 /* from inside: a ray up from eye height in every room must hit a ceiling/slab/roof before the sky (a light slit in the ceiling = gap) */
 const ALLM=[];world.traverse(o=>{if(o.isMesh&&o.material&&o.material!==M.glass&&!o.material.transparent){let f=0;for(let q=o;q;q=q.parent){const d=q.userData||{};if(d.furn||d.lamp){f=1;break;}}if(!f)ALLM.push(o);}});const up=new THREE.Vector3(0,1,0),ST=(H.stairs||[]).map(stairRect);
 H.levels.forEach(l=>{(CELLS[l.name]||[]).forEach(r=>{const tz=(x,z)=>{if(ST.some(q=>x>q[0]-.05&&x<q[2]+.05&&z>q[1]-.05&&z<q[3]+.05))return;rc.set(v.set(x,(l.elevation||0)+1.6,z),up);if(!rc.intersectObjects(ALLM,false).length&&out.length<400)out.push([+x.toFixed(2),+z.toFixed(2),'up',l.name]);};
  for(let z=r[1]+.05;z<r[3];z+=line)for(let x=r[0]+.02;x<r[2];x+=step)tz(x,z);for(let x=r[0]+.05;x<r[2];x+=line)for(let z=r[1]+.02;z<r[3];z+=step)tz(x,z);});});
 return out;}
export function lmExport(){if(!world)return null;finishGrow();lmNorm();const C=lmCands(world),cs=new Set(C),occ=[];
 world.traverse(o=>{if(!o.isMesh||cs.has(o)||Array.isArray(o.material)||!o.visible)return;const m=o.material;if(!m||m.transparent&&m.opacity<.9)return;if(!o.geometry.attributes.position||o.geometry.attributes.position.count>60000)return;occ.push(lmMesh(o));});
 return JSON.stringify({v:1,geom:LM_GEOM,bake:C.map(o=>Object.assign(lmMesh(o),{off:o.userData.floor?.006:.0015})),occ});}
/* v20261117u: a bake is only valid for the floor/ceiling geometry it was baked on. Same mesh counts with re-clipped boxes mapped the baked atlas onto the wrong spots (white 'tile grid' floors in Ukážka 2 2NP). LM_GEOM changes whenever floor/ceiling generation changes; a bake without the matching tag -> live lighting. */
const LM_GEOM='u1';
async function lmHook(){const src=H&&H.lightmap&&H.lightmap.src;if(LMS&&LMS.w!==world)LMS=null;if(!src||!world||/[?&]nolm=1/.test(location.search))return;if((H.lightmap.geom||'')!==LM_GEOM){console.warn('lightmap: baked on older geometry, live lighting');return;}const w=world;
 try{const t0=performance.now(),meta=await(await fetch(src)).json(),base=src.replace(/[^/]*$/,''),mob=Math.min(innerWidth,innerHeight)<700;
  const [bin,tex]=await Promise.all([fetch(base+meta.uv).then(r=>r.arrayBuffer()),new THREE.TextureLoader().loadAsync(base+(mob&&meta.texMob?meta.texMob:meta.tex))]);if(w!==world)return;
  const C=lmCands(w),cn=o=>{const g=o.geometry;return g.index?g.index.count-g.index.count%3:g.attributes.position.count;};if(C.length!==meta.counts.length||C.some((o,i)=>cn(o)!==meta.counts[i])){console.warn('lightmap: mesh mismatch, live lighting',C.length,meta.counts.length);return;}
  tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=false;tex.channel=1;tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.anisotropy=4;
  const U=new Uint16Array(bin),cl=new Map(),mats=[],bas=[];let q=0;LMSRC=[];
  const GS=new Set();let shg=0;/* v20261117j FIX (lightmap shards): candidates may share one non-indexed geometry (extruded slabs/ceilings); uv1 written on the shared buffer was overwritten by the last mesh -> every other user sampled someone else's lightmap islands. Each candidate now owns its geometry. */
  C.forEach((o,i)=>{if(o.geometry.index){const g0=o.geometry;o.geometry=g0.toNonIndexed();}else if(GS.has(o.geometry)){o.geometry=o.geometry.clone();shg++;}GS.add(o.geometry);const n=meta.counts[i],a=new Float32Array(n*2);for(let j=0;j<n*2;j++)a[j]=U[q+j]/65535;q+=n*2;o.geometry.setAttribute('uv1',new THREE.BufferAttribute(a,2));
   const o0=o.material;let m=cl.get(o0);if(!m){m=o0.clone();m.lightMap=tex;LMSRC.push([o0,m]);m.userData.lmEnv=m.envMapIntensity!=null?m.envMapIntensity:1;mats.push(m);cl.set(o0,m);}o.material=m;if(m.isMeshBasicMaterial)bas.push([o,o0,m]);});
  LMS={w,mats,bas,kb:meta.kb||1.6,k:meta.k||1,ms:Math.round(performance.now()-t0)};window.__lmS=LMS;window.__lm={meshes:C.length,shared:shg,mats:mats.length,ms:LMS.ms,tex:mob&&meta.texMob?meta.texMob:meta.tex};applyAtmo(true);DIRTY=Math.max(DIRTY,60);
 }catch(e){console.warn('lightmap failed, live lighting',e);}}
function lmAtmo(up){if(!LMS||LMS.w!==world)return;const d=up,cut=.7*d;if(hemiL)hemiL.intensity*=1-cut;if(fillL)fillL.intensity*=1-cut*.8;if(roofFillL)roofFillL.intensity*=1-cut*.8;
 LMS.mats.forEach(m=>{if(m.isMeshBasicMaterial)m.lightMapIntensity=Math.PI*LMS.kb;else{m.lightMapIntensity=LMS.k*d;m.envMapIntensity=m.userData.lmEnv*(1-.5*d);}});
 /* unlit (MeshBasic) floors: baked contact shadows by day, their original unlit material from dusk on */LMS.bas.forEach(([o,o0,m])=>{o.material=d>.35?m:o0;});}
export async function glb(){if(!world)return null;
  // Normalize dollhouse/grow state so Blender does not get ghost window/door meshes below the real ones
  world.traverse(o=>{
    if(o.userData&&o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;o.visible=true;}
    if(o.userData&&o.userData.doorLeaf){o.scale.y=1;o.visible=true;}
    if(o.userData&&o.userData.grow){o.scale.y=1;if(o.userData.growBase!=null&&o.userData.growH!=null)o.position.y=o.userData.growBase+o.userData.growH/2;o.visible=true;}
  });
  world.updateMatrixWorld(true);
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  return new Promise((res,rej)=>new GLTFExporter().parse(world,b=>res(new Blob([b],{type:'model/gltf-binary'})),rej,{binary:true,onlyVisible:true}));}

export function snap(){if(!R)return null;draw();return R.domElement.toDataURL('image/png');}

export function panoHere(W){return pano(rig.position.x,rig.position.z,rig.position.y,W,1);}
export function pano(x,z,e,W=4096,keep){if(!R)return null;if(!keep){[x,z]=srP([x,z]);jumpS(x,z,e);}const rt=new THREE.WebGLCubeRenderTarget(W/4,{type:THREE.HalfFloatType});const cc=new THREE.CubeCamera(.05,300,rt);cc.position.set(x,e+1.55,z);scene.add(cc);cc.update(R,scene);scene.remove(cc);
 const qs=new THREE.Scene(),oc=new THREE.OrthographicCamera(-1,1,1,-1,0,1),mt=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture},yaw:{value:-yaw}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform samplerCube t;uniform float yaw;varying vec2 v;void main(){float lo=(v.x-.5)*6.2831853+yaw,la=(v.y-.5)*3.14159265;vec3 d=vec3(cos(la)*sin(lo),sin(la),-cos(la)*cos(lo));gl_FragColor=textureCube(t,d);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',toneMapped:true});
 qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mt));const pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),xr=R.xr.enabled;R.xr.enabled=false;R.setPixelRatio(1);R.setSize(W,W/2,false);R.render(qs,oc);const u=R.domElement.toDataURL('image/jpeg',.9);R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);R.xr.enabled=xr;rt.dispose();mt.dispose();DIRTY=Math.max(DIRTY,30);return u;}
export const STY={minimal:{sofa:'#d9d6cf',armch:'#cfcac1',table:'#e9e5dd',ctable:'#e9e5dd',desk:'#ece8e0',ward:'#f3f2ef',kitch:'#f3f2ef',shelf:'#e6e1d8',bed:'#eeebe5',chair:'#d8d2c6',wood:'#d8c8ae',art:'#cfcac1',curtain:'#f0ede6',rug:'#d8d2c6',runner:'#d8d2c6',lounge:'#cfcac1',dresser:'#ece8e0',sideb:'#ece8e0'},futur:{sofa:'#e9edf2',armch:'#2a2f38',table:'#f4f6f8',ctable:'#1f242c',desk:'#f4f6f8',ward:'#f7f8fa',kitch:'#1c2028',shelf:'#2a2f38',bed:'#f1f3f6',chair:'#e8ecf0',wood:'#2a2f38',art:'#3fd0e0',curtain:'#cfd8e0',rug:'#3a4250',runner:'#3a4250',lounge:'#e9edf2',pendant:'#3fd0e0',lamp:'#3fd0e0',sideb:'#1f242c',dresser:'#f4f6f8'},moderny:{sofa:'#5d6470',armch:'#2f3237',table:'#2b2b2b',ctable:'#2b2b2b',desk:'#3a3a3a',ward:'#ececea',kitch:'#2f3237',shelf:'#3a3a3a',bed:'#d6d6d2',chair:'#2f3237',wood:'#3b3b3b',art:'#6a7a88',curtain:'#d0d4d8',rug:'#4a5560',lounge:'#4a5560'},skandi:{sofa:'#6a5644',armch:'#7a6550',table:'#c4a07a',ctable:'#c4a07a',desk:'#c9a882',ward:'#e8e0d4',kitch:'#ebe6de',shelf:'#c4a07a',chair:'#d8cfc0',wood:'#c4a07a',art:'#c4b8a4',curtain:'#b8a890',shoe:'#c4a07a',rug:'#7a4028',bed:'#5a3e2c',lounge:'#5a6a4a',stool:'#6a5644',runner:'#6a4a3a',pendant:'#e8dcc8'},indus:{leather:1,metal:'#2a2c2e',sofa:'#7a4a2e',armch:'#6a3f26',table:'#4a3a2e',ctable:'#2b2b2b',desk:'#4a3a2e',ward:'#4a4e52',kitch:'#33363a',shelf:'#2b2b2b',bed:'#5a6068',chair:'#2b2b2b',wood:'#5a4636',art:'#a0522d',curtain:'#8a8478',rug:'#6a5e52',runner:'#6a5e52',lounge:'#4a4e52',pendant:'#2b2b2b',lamp:'#2b2b2b',sideb:'#4a3a2e',dresser:'#4a3a2e',stool:'#2b2b2b'},klasik:{sofa:'#6b3f35',armch:'#8a5a3c',table:'#5a3a26',ctable:'#5a3a26',desk:'#6b4a30',ward:'#7a5a40',kitch:'#efe6d6',shelf:'#5a3a26',chair:'#7a5a40',wood:'#5a3a26',rug:'#5a3020'}};
export const FUR={bed:{w:1.6,d:2.05,h:.5,c:'#e9e4da'},bed1:{w:.9,d:2,h:.5,c:'#e9e4da'},bunk:{w:.9,d:2,h:1.65,c:'#e9e4da'},sofa:{w:2.4,d:1.0,h:.8,c:'#6a5644'},armch:{w:.85,d:.85,h:.8,c:'#7a6550'},table:{w:1.8,d:1.0,h:.75,c:'#d4b48a'},ctable:{w:1.1,d:.7,h:.42,c:'#d4b48a'},desk:{w:1.2,d:.6,h:.75,c:'#e0c9a6'},tv:{w:1.8,d:.42,h:.5,c:'#3b3d40'},ward:{w:1.8,d:.62,h:2.2,c:'#f4f1ea'},kitch:{w:2.8,d:.62,h:.9,c:'#f7f5f0'},fridge:{w:.65,d:.7,h:1.85,c:'#dcdcdc'},bath:{w:1.7,d:.75,h:.55,c:'#ffffff'},shower:{w:.9,d:.9,h:.1,c:'#ffffff'},sink:{w:.6,d:.45,h:.85,c:'#ffffff'},wc:{w:.4,d:.65,h:.42,c:'#ffffff'},shelf:{w:.9,d:.35,h:1.8,c:'#d4b48a'},plant:{w:.45,d:.45,h:1.1,c:'#5b7d4a'},rug:{w:3.2,d:3.4,h:.02,c:'#7a4530'},runner:{w:2.4,d:.7,h:.02,c:'#6a4a3a'},lamp:{w:.35,d:.35,h:1.3,c:'#2f3235'},chair:{w:.45,d:.5,h:.9,c:'#f1ece2'},art:{w:.9,d:.04,h:.7,c:'#c4b8a4'},curtain:{w:1.4,d:.08,h:2.0,c:'#e8e2d6'},shoe:{w:1.0,d:.4,h:.7,c:'#d4b48a'},bench:{w:1.2,d:.4,h:.45,c:'#c4a07a'},nstand:{w:.45,d:.4,h:.55,c:'#c4a07a'},dresser:{w:1.2,d:.5,h:.9,c:'#e8e0d4'},sideb:{w:1.6,d:.45,h:.85,c:'#c4a07a'},side:{w:.45,d:.45,h:.5,c:'#c4a07a'},stool:{w:.38,d:.38,h:.75,c:'#6a5644'},island:{w:1.6,d:.8,h:.9,c:'#efe8de'},pendant:{w:.4,d:.4,h:.3,c:'#e8dcc8'},mirror:{w:.7,d:.04,h:.9,c:'#c5d4e0'},towel:{w:.55,d:.12,h:.7,c:'#d8c8b0'},coat:{w:.5,d:.5,h:1.8,c:'#3a4a5a'},toy:{w:.55,d:.4,h:.5,c:'#c4783a'},otable:{w:1.4,d:.8,h:.75,c:'#a08060'},lounge:{w:1.6,d:.85,h:.55,c:'#5a6a4a'},wshelf:{w:.8,d:.25,h:1.8,c:'#c4a07a'},tvw:{w:1.2,d:.06,h:.7,c:'#1a1c20'},hooks:{w:.6,d:.08,h:.3,c:'#8a6a4a'},washer:{w:.6,d:.6,h:.85,c:'#f2f2f0'}};
const FM={};function fm(c,soft){const k=c+(soft?'~f':'');return FM[k]||(FM[k]=new THREE.MeshStandardMaterial({color:c,roughness:soft?.85:.72,map:soft?fabric:null}));}
const FLO={dub:[0xbea07d,'wood',.55],orech:[0x8a6448,'wood',.55],dlazba:[0xe6e2da,'tile',.35],beton:[0xb0aea8,'beton',.85],tmave:[0x5a4636,'wood',.6]};
/* v20261117i: style/colour switches only touch materials in place; lightmapped clones follow their source (colour, map, roughness) so 'Steny dnu' also recolours baked walls */
function lmSync(){LMSRC.forEach(([a,b])=>{if(a.color&&b.color)b.color.copy(a.color);if(b.map!==a.map){b.map=a.map;b.needsUpdate=true;}if(a.roughness!=null)b.roughness=a.roughness;});}
export function setMat(o={}){DIRTY=Math.max(DIRTY,90);if(!M)return;queueMicrotask(lmSync);M.wall.color.set(o.wall||'#f2ebe3');M.fac.color.set(o.fac||'#f7f5f0');M.roof.color.set(o.roof||'#3e444c');FLATM.color.set(o.roof||'#3e444c').lerp(new THREE.Color(0xb8b8b4),.55);const f=FLO[o.floor||'dub']||FLO.dub;M.floor.map=f[1]==='wood'?wood:f[1]==='tile'?tile:f[1]==='beton'?beton:null;M.floor.color.setHex(f[0]);M.floor.roughness=f[2];M.floor.needsUpdate=true;if(M.floor.map){M.floor.map.colorSpace=THREE.SRGBColorSpace;M.floor.map.needsUpdate=true;};if(GREY)applyGrey();}
let SUNK=1,roofFillL=null,hemiL=null,fillL=null,skyDay=null,ATM={t:'day',w:'sun'},wxObj=null,nightG=null;
let sunH=16.5,lastFp=null,doorMode='open',doorPivs=[],mktGlass=false;
export function checkClearances(){
  if(!H)return{ok:false,doorHits:[],wallHits:[],doors:0,furn:0};
  const FD=FUR;const dim=(t,r)=>{const F=FD[t]||{w:1,d:1};return ((r||0)%2)?[F.d,F.w]:[F.w,F.d];};
  const aabb=(x,z,w,d)=>({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});
  const overlap=(A,B)=>!(A.x1<=B.x0||A.x0>=B.x1||A.z1<=B.z0||A.z0>=B.z1);
  const zones=[];
  (H.walls||[]).forEach(w=>{(w.openings||[]).forEach(o=>{if(o.type!=='door')return;
    const G=geo(w),a=o.offset,b=a+o.width,rad=o.width+.1,Rhinge=o.hinge==='R';
    const hs=Rhinge?b-.05:a+.05;const sd=o.out?-1:1;
    const hx=G.x0+G.u[0]*hs,hz=G.z0+G.u[1]*hs;
    const px=-G.u[1]*sd,pz=G.u[0]*sd; // swing normal
    const along=Rhinge?-1:1; // free edge direction along wall from hinge
    // conservative AABB covering quarter-circle swing + 10cm
    const pts=[];
    for(let i=0;i<=8;i++){const ang=(i/8)*(Math.PI/2);const ca=Math.cos(ang),sa=Math.sin(ang);
      const ax=G.u[0]*along*rad*ca,az=G.u[1]*along*rad*ca;const nx=px*rad*sa,nz=pz*rad*sa;
      pts.push([hx+ax+nx,hz+az+nz]);}
    pts.push([hx,hz]);
    const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
    zones.push({x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs),door:o,wall:w.id||w});
  });});
  const doorHits=[],wallHits=[];
  const mount=new Set(['art','curtain','mirror','towel','pendant','wshelf','tvw','hooks']);
  const softFloor=new Set(['rug','runner']);
  (H.furn||[]).forEach(f=>{const[w,d]=dim(f.t,f.r);const A=aabb(f.p[0],f.p[1],w,d);
    if(!softFloor.has(f.t))zones.forEach(Z=>{if(overlap(A,Z))doorHits.push({t:f.t,p:f.p,door:Z.door.width,wall:Z.wall});});
    if(mount.has(f.t))return;
    (H.walls||[]).forEach(w=>{const G=geo(w),t=w.thickness/2+.02;
      // sample wall as AABB thickened
      const wx0=Math.min(w.start[0],w.end[0])-t,wx1=Math.max(w.start[0],w.end[0])+t;
      const wz0=Math.min(w.start[1],w.end[1])-t,wz1=Math.max(w.start[1],w.end[1])+t;
      // skip if near an opening (door/window) center
      const nearOp=(w.openings||[]).some(o=>{const mid=o.offset+o.width/2;const mx=G.x0+G.u[0]*mid,mz=G.z0+G.u[1]*mid;return Math.hypot(f.p[0]-mx,f.p[1]-mz)<Math.max(o.width,w,d)*.55+.15;});
      if(nearOp&&(f.t==='shoe'||f.t==='bench'))return;
      if(overlap(A,{x0:wx0,x1:wx1,z0:wz0,z1:wz1})){
        // only count if furniture center projects onto solid wall (not opening)
        const q=/*proj*/(()=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],L=Math.hypot(dx,dz)||1;const s=((f.p[0]-w.start[0])*dx+(f.p[1]-w.start[1])*dz)/L;const t2=(-(f.p[0]-w.start[0])*dz+(f.p[1]-w.start[1])*dx)/L;return{s,t:t2,L};})();
        if(Math.abs(q.t)>w.thickness/2+.12)return;
        const inOp=(w.openings||[]).some(o=>q.s>=o.offset-.02&&q.s<=o.offset+o.width+.02);
        if(!inOp&&Math.abs(q.t)<w.thickness/2+Math.min(w,d)/2+.02)wallHits.push({t:f.t,p:f.p,wall:w.id||w});
      }
    });
  });
  const out={ok:!doorHits.length,doorHits,wallHits,doors:zones.length,furn:(H.furn||[]).length};
  console.log('[clearance]',out.ok?'OK 0 door collisions':'FAIL',out);
  return out;}
export function setDoorMode(mode){doorMode=(mode==='closed')?'closed':'open';DIRTY=Math.max(DIRTY,30);
  doorPivs.forEach(p=>{const d=p.userData.door;if(!d)return;d.u=doorMode==='closed'?0:1;p.rotation.y=doorMode==='closed'?d.closed:d.open;});}
export function setMktGlass(on){mktGlass=!!on;if(!M||!M.glass)return;DIRTY=Math.max(DIRTY,40);
  if(mktGlass){M.glass.opacity=.88;M.glass.color.setHex(0x5a7388);M.glass.metalness=.45;M.glass.roughness=.08;M.glass.envMapIntensity=1.8;M.glass.needsUpdate=true;}
  else{M.glass.opacity=.3;M.glass.color.setHex(0xc5d8e8);M.glass.metalness=0;M.glass.roughness=.06;M.glass.envMapIntensity=1.15;M.glass.needsUpdate=true;}}
function doorTick(){if(doorMode!=='closed'||!doorPivs.length||!cam)return;
  const cp=new THREE.Vector3();cam.getWorldPosition(cp);
  doorPivs.forEach(p=>{const d=p.userData.door;if(!d)return;const dist=Math.hypot(cp.x-d.cx,cp.z-d.cz);
    // open smoothly within ~2.4m, fully open by 1.5m
    const tgt=dist<=1.5?1:dist>=2.4?0: (2.4-dist)/(2.4-1.5);
    d.u+=(tgt-d.u)*0.12; p.rotation.y=d.closed+(d.open-d.closed)*d.u; if(Math.abs(tgt-d.u)>.002)DIRTY=Math.max(DIRTY,4);});}
export function setSun(h,smooth){DIRTY=Math.max(DIRTY,90);if(ATM.h!=null&&scene){return;}if(smooth){sunTween={a:sunH,b:h,t:0,dur:1.8};}else{sunH=h;sunTween=null;if(lastFp)fitSun(lastFp);}}
// prem8 h6: room jumps look across the room: of 16 directions the one with the longest free view wins; we step back toward the opposite wall.
function viewFrom(x,z){const W=(H&&H.walls)||[];let RK=null,L0=null;for(const k in roomKinds){const r=roomKinds[k];const l=r&&r.labelAt&&r.labelAt(x,z);if(l){RK=r;L0=l;break;}}
 const inRoom=(dx,dz,d)=>{if(!RK)return d;for(let q=.2;q<d;q+=.15){if(RK.labelAt(x+dx*q,z+dz*q)!==L0)return Math.max(.1,q-.15);}return d;};
 const ray=(dx,dz)=>inRoom(dx,dz,ray0(dx,dz)),ray0=(dx,dz)=>{let best=12;W.forEach(w=>{const ax=w.start[0],az=w.start[1],bx=w.end[0]-ax,bz=w.end[1]-az,den=dx*bz-dz*bx;if(Math.abs(den)<1e-9)return;const t=((ax-x)*bz-(az-z)*bx)/den,u=((ax-x)*dz-(az-z)*dx)/den;if(t>.05&&u>=0&&u<=1&&t<best)best=t;});return best;};
 // prem8 h9: bathroom/WC — stand just inside its door, eye a bit higher, look toward the room centroid, 80° FOV (other jumps restore 58°).
 if(RK&&RK.kindOf&&RK.kindOf[L0]==='wet'){let dv=null;W.forEach(w=>{if(dv)return;const ax=w.start[0],az=w.start[1],L=Math.hypot(w.end[0]-ax,w.end[1]-az)||1e-9,ux=(w.end[0]-ax)/L,uz=(w.end[1]-az)/L;
   (w.openings||[]).forEach(o=>{if(dv||o.type!=='door')return;const s=o.offset+o.width/2,cx=ax+ux*s,cz=az+uz*s;for(const sd of[1,-1]){const nx=-uz*sd,nz=ux*sd;if(RK.labelAt(cx+nx*.45,cz+nz*.45)===L0){const hu=o.hinge==='R'?1:-1,lin=sd===(o.out?-1:1)&&o.kind!=='sliding';dv={x:cx+nx*.4,z:cz+nz*.4,nx,nz,hx:ux*hu,hz:uz*hu,lin,ow:o.width};break;}}});});
  if(dv){let sx=0,sz=0,n=0;for(let a=-4;a<=4;a+=.2)for(let b=-4;b<=4;b+=.2)if(RK.labelAt(dv.x+a,dv.z+b)===L0){sx+=a;sz+=b;n++;}
   if(n){let dx=sx/n,dz=sz/n;const dl=Math.hypot(dx,dz);if(dl>.2){dx/=dl;dz/=dl;const an=Math.atan2(dv.nx,-dv.nz),ac=Math.atan2(dx,-dz);let dy=ac-an;dy=Math.atan2(Math.sin(dy),Math.cos(dy));dy=Math.max(-1,Math.min(1,dy));let ox=0,oz=0;
     // door leaf swung into this room sits at the hinge edge: step to the latch side and never look toward the hinge side
     if(dv.lin){const sh=Math.min(.22,dv.ow*.25);ox=-dv.hx*sh;oz=-dv.hz*sh;const tw=Math.sin(an+dy*.8)*dv.hx+(-Math.cos(an+dy*.8))*dv.hz;if(tw>0)dy=-dy;dy=Math.sign(dy||-1)*Math.max(Math.abs(dy),.25);const lat=Math.sin(an+dy*.8)*dv.hx-Math.cos(an+dy*.8)*dv.hz;if(lat>0)dy=-dy;}
     return{x:dv.x-dv.nx*.32+ox,z:dv.z-dv.nz*.32+oz,yaw:an+dy*.8,h:1.7,p:.16,fov:80};}}}}
 let bd=-1,bdir=null;for(let i=0;i<16;i++){const a=i/16*Math.PI*2,dx=Math.sin(a),dz=-Math.cos(a),d=ray(dx,dz);if(d>bd+.05){bd=d;bdir=[dx,dz,a];}}
 if(!bdir)return null;const back=ray(-bdir[0],-bdir[1]),st=Math.max(0,Math.min(1.4,back-.5));return{x:x-bdir[0]*st,z:z-bdir[1]*st,yaw:bdir[2]};}
// prem8 h9: kitchen backsplash — counter back = nearest parallel wall in plan (gap ≤ 0.3 m); tile panel 0.91–1.45 m added as a child of that wall piece.
 function backsplash(root){const WP=[];root.traverse(o=>{if(o.isMesh&&o.userData.wp)WP.push(o);});
  (H.furn||[]).filter(f=>f.t==='kitch').forEach(f=>{const l=H.levels.find(q=>q.name===f.level);if(!l)return;const e=l.elevation||0,F=FUR.kitch,rot=(f.r||0)%2,ax=rot?[0,1]:[1,0];let best=null;
   (H.walls||[]).filter(w=>w.level===l.name).forEach(w=>{const g=geo(w);if(Math.abs(g.u[0]*ax[0]+g.u[1]*ax[1])<.95)return;const t=w.thickness||.3,px=f.p[0]-g.x0,pz=f.p[1]-g.z0,sa=px*g.u[0]+pz*g.u[1],dn=-px*g.u[1]+pz*g.u[0],gap=Math.abs(dn)-t/2-F.d/2;
    if(gap<-.08||gap>.3||sa<-.3||sa>g.L+.3)return;const a=Math.max(0,sa-F.w/2),b=Math.min(g.L,sa+F.w/2);if(b-a<.8)return;if(!best||gap<best.gap)best={w,gap,a,b,sd:Math.sign(dn)||1,t};});
   if(!best)return;const sm=(best.a+best.b)/2,yy=e+1.18,P=WP.filter(o=>o.userData.wp[0]===best.w&&o.userData.wp[1]<=sm&&o.userData.wp[2]>=sm);if(!P.length)return;const ob=P.find(o=>o.userData.wp[3]<=yy&&o.userData.wp[4]>=yy)||P[0],[,s0,s1,y0,y1,t]=ob.userData.wp;
   const gg=new THREE.BoxGeometry(best.b-best.a,.54,.012);boxUV(gg,sm,1.18);const m=new THREE.Mesh(gg,M.wtile);m.position.set(sm-(s0+s1)/2,yy-(y0+y1)/2,best.sd*(t/2+.006));m.receiveShadow=true;m.userData.noCol=true;m.userData.bsp=1;ob.add(m);});}
// prem8 h7: interior finishes as children of each wall piece (so dollhouse cut / grow animation carry them):
// wet rooms get 2.05 m of 60x30 wall tiles, other rooms a 7 cm skirting board on the floor-touching pieces. Exterior sides are skipped (no room there).
function interiorFinish(root){const P=[];root.traverse(o=>{if(o.isMesh&&o.userData.wp)P.push(o);});
 P.forEach(o=>{const[w,s0,s1,y0,y1,t]=o.userData.wp,RK=roomKinds[w.level];if(!RK||!RK.labelAt)return;const g=geo(w),lv=(H.levels||[]).find(l=>l.name===w.level),e0=lv?lv.elevation||0:0,L=s1-s0;if(L<.08)return;
  const sm=(s0+s1)/2,cxm=g.x0+g.u[0]*sm,czm=g.z0+g.u[1]*sm,yc=(y0+y1)/2;
  for(const sd of[1,-1]){const nx=-g.u[1]*sd,nz=g.u[0]*sd,lab=RK.labelAt(cxm+nx*(t/2+.15),czm+nz*(t/2+.15));if(!lab)continue;const kind=RK.kindOf[lab]||'other';
   if(kind==='wet'){const a=Math.max(y0,e0),b=Math.min(y1,e0+2.05);if(b-a<.04)continue;
     /* v20261117r RULE: wall tiles only where the wall face really borders the wet room - sampled every 5 cm along the piece (a long wall piece shared by the
        bathroom and a bedroom used to be tiled end to end from its midpoint label, leaving a tile strip beside the bedroom window; a stub inside a partition
        showed as a free-standing tiled slab). Face point 2 cm in front of the wall must sit inside a cell of THAT wet room. audit: tile-outside-wet */
     const wetAt=q=>RK.labelAt(g.x0+g.u[0]*q+nx*(t/2+.15),g.z0+g.u[1]*q+nz*(t/2+.15))===lab;
     const runs=[];let r0=null;for(let q=s0+.025;q<s1;q+=.05){const ok=wetAt(q);if(ok&&r0==null)r0=q-.025;if(!ok&&r0!=null){runs.push([r0,q-.025]);r0=null;}}if(r0!=null)runs.push([r0,s1]);
     runs.forEach(([q0,q1])=>{q0=Math.max(s0,q0);q1=Math.min(s1,q1);if(q1-q0<.2)return;const qm=(q0+q1)/2,gg=new THREE.BoxGeometry(q1-q0,b-a,.012);boxUV(gg,qm,(a+b)/2-e0);const m=new THREE.Mesh(gg,M.wtile);m.position.set(qm-sm,(a+b)/2-yc,sd*(t/2+.006));m.receiveShadow=true;m.userData.noCol=true;m.userData.wetTile=[w.level,nx,nz,lab];o.add(m);});}
   else if(y0<e0+.03){const m=new THREE.Mesh(new THREE.BoxGeometry(L,.07,.014),M.skirt);m.position.set(0,e0+.035-yc,sd*(t/2+.007));m.userData.noCol=true;o.add(m);}}});}
/* v20261117b QA helper: walk-mode camera at (x,z) on floor e looking at (tx,tz), pitch in degrees (screenshots / presentations) */
export function qaWalk(x,z,e,tx,tz,pt){jump(x,z,e);rig.position.set(x,e,z);if(body&&body.resolve)body.resolve(rig.position);yaw=Math.atan2(tx-x,-(tz-z));pitch=-(pt||0)*Math.PI/180;if(cam){cam.fov=62;cam.updateProjectionMatrix();cam.position.set(0,1.6,0);}DIRTY=Math.max(DIRTY,90);}
export function jump(x,z,e){[x,z]=srP([x,z]);return jumpS(x,z,e);}
function jumpS(x,z,e){DIRTY=Math.max(DIRTY,90);if(!walk)setWalk(true);const V=viewFrom(x,z);if(V){x=V.x;z=V.z;if(!(R.xr&&R.xr.isPresenting)){yaw=V.yaw;pitch=V.p||0;}}if(cam&&!(R.xr&&R.xr.isPresenting)){const fv=(V&&V.fov)||58;if(cam.fov!==fv){cam.fov=fv;cam.updateProjectionMatrix();}}rig.position.set(x,e,z);if(body&&body.resolve)body.resolve(rig.position);cam.position.set(0,V&&V.h&&!(R.xr&&R.xr.isPresenting)?V.h:1.6,0);}
/* v22s: smooth eye-height fly into a room (plan coords, same as jump); grey massing vs finished look */
let fly=null,GREY=false,GREYM=null,GREYG=null;
const srInv=p=>{if(!SR||!p)return p;const x=p[0]-SR.c[0],z=p[1]-SR.c[1];return[SR.c[0]+SR.m[0]*x+SR.m[2]*z,SR.c[1]+SR.m[1]*x+SR.m[3]*z,...p.slice(2)];};
const lerpAng=(a,b,t)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*t;};
export function hereInfo(){if(!rig)return null;const x=rig.position.x,z=rig.position.z,y=rig.position.y,[px,pz]=srInv([x,z]);let L=null,li=0,e=0;if(H&&H.levels)H.levels.forEach((l,i)=>{if(y>=(l.elevation||0)-.45){L=l.name;li=i;e=l.elevation||0;}});const rec=window.__roomAt&&window.__roomAt([px,pz],L);return{x:px,z:pz,sx:x,sz:z,y,yaw,pitch,walk,L,li,n:rec&&rec.n,id:rec&&rec.id,e,fly:!!fly};}
export function hereRoom(){return hereInfo();}
function adoptWalkFromCam(){if(!cam||!rig)return;const w=cam.getWorldPosition(new THREE.Vector3()),q=cam.getWorldQuaternion(new THREE.Quaternion()),eu=new THREE.Euler().setFromQuaternion(q,'YXZ');yaw=-eu.y;pitch=-eu.x;rig.position.set(w.x,w.y-1.6,w.z);rig.rotation.set(0,0,0);cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);cam.up.set(0,1,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));}
export function flyTo(x,z,e){if(!cam||!rig)return jump(x,z,e);[x,z]=srP([x,z]);const was=walk;if(!walk){setWalk(true,null,true);adoptWalkFromCam();}const V=viewFrom(x,z);if(V){x=V.x;z=V.z;if(!(R&&R.xr&&R.xr.isPresenting))pitch=V.p||0;}const fv=(V&&V.fov)||58;if(cam&&cam.fov!==fv&&!(R&&R.xr&&R.xr.isPresenting)){cam.fov=fv;cam.updateProjectionMatrix();}const h=V&&V.h&&!(R&&R.xr&&R.xr.isPresenting)?V.h:1.6,tyaw=V?V.yaw:yaw,p=rig.position,d=Math.hypot(x-p.x,z-p.z)+Math.abs((e||0)-p.y)*.4,dur=Math.max(.85,Math.min(2.2,.7+d*.22));
 fly={t:0,t0:performance.now(),dur,sx:p.x,sy:p.y,sz:p.z,sh:cam.position.y||1.6,syaw:yaw,spitch:pitch,ex:x,ey:e||0,ez:z,eh:h,eyaw:tyaw,epitch:V&&V.p||0};DIRTY=Math.max(DIRTY,240);return fly;}
export function isFlying(){return!!fly;}
function flyTick(dt){if(!fly||!rig)return;fly.t=Math.min(1,(performance.now()-fly.t0)/(fly.dur*1000));const u=easeInOut(fly.t),p=rig.position;p.x=fly.sx+(fly.ex-fly.sx)*u;p.y=fly.sy+(fly.ey-fly.sy)*u;p.z=fly.sz+(fly.ez-fly.sz)*u;yaw=lerpAng(fly.syaw,fly.eyaw,u);pitch=fly.spitch+(fly.epitch-fly.spitch)*u;cam.position.set(0,fly.sh+(fly.eh-fly.sh)*u,0);cam.rotation.set(0,0,0);rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));DIRTY=Math.max(DIRTY,4);
 if(fly.t>=1){if(body&&body.resolve)body.resolve(p);const hold=deckStayY(p);const y=body&&body.floor&&body.floor(p);p.y=hold!=null?hold:((y!=null&&Math.abs(y-fly.ey)<.7)?y:fly.ey);cam.position.set(0,fly.eh,0);fly=null;if(window.__onWalk)window.__onWalk(hereInfo());}}
function greyMats(){if(!GREYM&&typeof THREE!=='undefined'){GREYM=new THREE.MeshStandardMaterial({color:0xb3b3ae,roughness:.92,metalness:.02,envMapIntensity:.35});GREYG=new THREE.MeshStandardMaterial({color:0x5c5c5a,roughness:.3,metalness:.04,transparent:true,opacity:.38,depthWrite:false,envMapIntensity:.2});}return GREYM;}
function isFurnish(o){for(let x=o;x;x=x.parent){const u=x.userData||{};if(u.furn||u.bsp||u.wetTile)return true;if(u.doorLeaf)return false;}return false;}
export function applyGrey(){if(!world)return;greyMats();world.traverse(o=>{if(o.userData.gHid){o.visible=true;o.userData.gHid=0;}if(o.userData.gMat){o.material=o.userData.gMat;o.userData.gMat=null;}});
 if(!GREY){DIRTY=Math.max(DIRTY,90);return;}world.traverse(o=>{const u=o.userData||{};if(isFurnish(o)){if(o.visible){o.visible=false;u.gHid=1;}return;}if(!o.isMesh||!o.material||u.doorLeaf)return;const mats=Array.isArray(o.material)?o.material:[o.material],gl=mats.some(m=>m===M.glass||(m&&m.transparent&&m.opacity<.5&&m!==GREYG));u.gMat=o.material;o.material=Array.isArray(o.material)?o.material.map(m=>m===M.glass||(m&&m.transparent&&m.opacity<.5)?GREYG:GREYM):((o.material===M.glass||gl)?GREYG:GREYM);});DIRTY=Math.max(DIRTY,90);}
export function setGrey(on){GREY=!!on;applyGrey();return GREY;}
export function isGrey(){return!!GREY;}


const WP=[M.wall,M.wall,M.wall,M.wall,M.fac,M.wall],WN=[M.wall,M.wall,M.wall,M.wall,M.wall,M.fac];
export function setAuto(v,spd){DIRTY=Math.max(DIRTY,90);if(!orb)return;orb.autoRotate=!!v;orb.autoRotateSpeed=spd!=null?spd:0.55;}
export function spin(d){DIRTY=Math.max(DIRTY,90);yaw+=d;}
export function camInfo(){const wpos=cam&&cam.getWorldPosition(new THREE.Vector3());return{path:camPath?{kind:camPath.kind,t:camPath.t,over:camPath.over,dE:camPath.dE,d0:camPath.d0,el0:camPath.el0,elE:camPath.elE}:null,asp:cam&&cam.aspect,fov:cam&&cam.fov,pos:cam&&cam.position.toArray().map(v=>+v.toFixed(2)),world:wpos&&wpos.toArray().map(v=>+v.toFixed(2)),rig:rig&&rig.position.toArray().map(v=>+v.toFixed(2)),yaw,pitch,walk};}

// ---- prem8 D: time of day + weather (cheap: one gradient sky, a few unshadowed point lights at night, one particle draw call) ----
const skyTex=(a,b,c)=>{const cv=document.createElement('canvas');cv.width=2;cv.height=128;const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,a);g.addColorStop(.55,b);g.addColorStop(1,c);x.fillStyle=g;x.fillRect(0,0,2,128);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.mapping=THREE.EquirectangularReflectionMapping;return t;};
const SKY={};
export function getAtmo(){return{...ATM};}
export function setAtmo(a){ATM={...ATM,...(a||{})};if(scene)applyAtmo();}
// prem8 r: one continuous clock (0:00–23:59). Keyframes for a November day in central Europe: sunrise ~6:30, sunset ~17:00.
// Everything (sky gradient, fog, sun arc/colour, ambient, moonlight, exposure, lit glass, lamps) is interpolated between keys.
const KF=[// h, sky top/mid/bottom, fog, hemi int, hemi col, sun col, env, exposure, moon, glass, lamps
 [0,'#0f1d4e','#1d3268','#30477a',0x1c2a58,.42,0x6a80c0,0xffffff,.22,1.05,1,1.15,1],
 [5.6,'#0f1d4e','#1d3268','#30477a',0x1c2a58,.42,0x6a80c0,0xffffff,.22,1.05,1,1.15,1],
 [6.2,'#1c2c62','#5a5c92','#c58894',0x3c3c62,.48,0x9a90c0,0xff8a6a,.3,1.05,.7,.8,.75],
 [6.7,'#4a6aa6','#d79aa4','#f6bc96',0x9a8a96,.6,0xf0c0b4,0xff9a70,.45,1.1,.25,.3,.25],
 [7.6,'#5f92cc','#e6c8a6','#f8d8a6',0xc8c0b0,.8,0xffe0c4,0xffc890,.75,1.16,0,0,0],
 [9.2,'#5e9be0','#a8cdf0','#dbe8f2',0xe4ebe0,.95,0xfff0e0,0xfff4e6,1.05,1.22,0,0,0],
 [14.4,'#5e9be0','#a8cdf0','#dbe8f2',0xe4ebe0,.95,0xfff0e0,0xfff0e0,1.05,1.22,0,0,0],
 [15.7,'#5a88c8','#efc892','#f8b474',0xd8c4a8,.8,0xffe0b8,0xffbe80,.75,1.16,0,0,0],
 [16.6,'#3a4c86','#e07a4c','#f89c62',0x9a7a70,.6,0xf0b090,0xff7a48,.45,1.1,.15,.35,.3],
 [17.3,'#1c2c64','#56588e','#c47c74',0x40405e,.5,0x9890c0,0xff6a40,.32,1.05,.5,.85,.8],
 [18.3,'#11204f','#21366a','#36507e',0x1e2c5a,.44,0x7084c0,0xffffff,.24,1.05,.9,1.1,1],
 [24,'#0f1d4e','#1d3268','#30477a',0x1c2a58,.42,0x6a80c0,0xffffff,.22,1.05,1,1.15,1]];
const _c1=new THREE.Color(),_c2=new THREE.Color();
const lerpHex=(a,b,k)=>{_c1.set(a);_c2.set(b);return _c1.lerp(_c2,k).getStyle();};
function atmoAt(h){h=((h%24)+24)%24;let i=0;while(i<KF.length-2&&KF[i+1][0]<=h)i++;const A=KF[i],B=KF[i+1],k=(h-A[0])/Math.max(1e-6,B[0]-A[0]),n=v=>v;
 const L=j=>typeof A[j]==='string'?lerpHex(A[j],B[j],k):(j===4||j===6||j===7)?new THREE.Color(A[j]).lerp(new THREE.Color(B[j]),k):A[j]+(B[j]-A[j])*k;
 return{sky:[L(1),L(2),L(3)],fog:L(4),hemi:L(5),hemiC:L(6),sunC:L(7),env:L(8),exp:L(9),moon:L(10),glass:L(11),lamp:L(12)};}
export var SUNRISE=6.5,SUNSET=17;
function sunEl(h){const d=SUNSET-SUNRISE;if(h<=SUNRISE-.3||h>=SUNSET+.3)return -1;return Math.sin(Math.PI*(h-SUNRISE)/d)*22*Math.PI/180;}// Nov at 48°N: ~22° at noon
// equirect backgrounds are converted to a cube map once per texture (cached), so a changed sky needs a NEW texture; old one disposed
let skyCv=null,skyT=null,skyK='';function skyGrad(c){const k=c.join();if(skyT&&k===skyK)return skyT;skyK=k;const cv=document.createElement('canvas');cv.width=2;cv.height=128;
 const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,c[0]);g.addColorStop(.55,c[1]);g.addColorStop(1,c[2]);x.fillStyle=g;x.fillRect(0,0,2,128);
 const old=skyT;skyCv=cv;skyT=new THREE.CanvasTexture(cv);skyT.colorSpace=THREE.SRGBColorSpace;skyT.mapping=THREE.EquirectangularReflectionMapping;if(old)setTimeout(()=>old.dispose(),0);return skyT;}
const grey=(c,k,to)=>lerpHex(c,to,k);
let hourDrag=false,lastShadow=0,pendH=null,hT=0;
// live drag: lighting every call (cheap uniforms), shadow map re-rendered at most ~10 Hz; full update on release
export function setHour(h,drag){ATM.h=h;hourDrag=!!drag;if(!scene)return;if(drag){R.shadowMap.autoUpdate=false;const t=performance.now();if(t-lastShadow>100){R.shadowMap.needsUpdate=true;lastShadow=t;}applyAtmo(true);}else{R.shadowMap.autoUpdate=!XRL;R.shadowMap.needsUpdate=true;applyAtmo();}}
function applyAtmo(live){const h=ATM.h!=null?+ATM.h:14.5,w=ATM.w||'sun',cl=w!=='sun',wet=w==='rain';ATM.t=h>=18.3||h<6?'night':(h>=16.6||h<7.2)?'eve':'day';
 sunH=h;sunTween=null;const A=atmoAt(h),el=sunEl(h),up=el>0?Math.min(1,el/(10*Math.PI/180)):0;// up: 0 below horizon -> 1 at 10°
 const wk=(w==='cloudy'?.35:wet?.18:w==='snow'?.4:1);SUNK=up*wk;
 const cm=cl?(wet?.82:.88):1;
 if(hemiL){hemiL.intensity=A.hemi*cm;hemiL.color.copy(A.hemiC);hemiL.groundColor.copy(A.hemiC).multiplyScalar(up>0?.75:.3);}
 // fill: daylight bounce by day, cool moonlight at night (directional, unshadowed)
 if(fillL){const day=.7*up*(cl?.6:1),moon=.95*A.moon;fillL.intensity=day+moon;fillL.color.setRGB(1,.94,.87).lerp(_c1.setRGB(.55,.66,1),moon/(day+moon+1e-6));}
 if(roofFillL){roofFillL.intensity=.85*(.06+.94*up)*(cl?.6:1)+.12*A.moon;roofFillL.color.setRGB(1,.89,.72).lerp(_c1.setRGB(.5,.6,1),A.moon);}lmAtmo(up*(cl?.7:1));
 scene.environmentIntensity=A.env*(cl?.75:1)*(wet?.85:1);R.toneMappingExposure=A.exp*(wet?.9:1);
 let sky=A.sky;if(cl){const gc=wet?'#7d858f':'#a4abb2',k=.55*Math.max(.25,up);sky=sky.map(c=>grey(c,k,gc));}
 const useDay=!cl&&skyDay&&h>=9.2&&h<=14.4;scene.background=useDay?skyDay:skyGrad(sky);
 const fc=new THREE.Color(sky[2]).lerp(new THREE.Color(A.fog),.25);if(!scene.fog||!scene.fog.isFogExp2)scene.fog=new THREE.FogExp2(fc,.005);scene.fog.color.copy(fc);if(R.toneMapping===THREE.ACESFilmicToneMapping){const q=invACES(fc.r,fc.g,fc.b,R.toneMappingExposure);scene.fog.color.setRGB(q[0],q[1],q[2]);}scene.fog.density=cl?.009:up>0?.0048:.006;// prem8 h10: fog = inverse-ACES of the horizon colour, so far ground melts into the untonemapped sky
 if(sun){sun.color.copy(A.sunC);}
 if(M.glass){if(!M.glass.userData.d)M.glass.userData.d={op:M.glass.opacity};const g=A.glass;M.glass.emissive.setRGB(1,.72,.38);M.glass.emissiveIntensity=g;M.glass.opacity=g>.05?Math.min(.85,M.glass.userData.d.op+g):M.glass.userData.d.op;}
 if(!live)for(const k of['lawn','ground','path']){const m=M[k];if(!m)continue;if(!m.userData.d)m.userData.d={r:m.roughness,c:m.color.getHex()};m.roughness=wet?Math.min(m.userData.d.r,.35):m.userData.d.r;m.color.setHex(m.userData.d.c);if(wet)m.color.multiplyScalar(.62);}
 if(sun){const cs=SUNK>.03;if(sun.castShadow!==cs){sun.castShadow=cs;}}if(lastFp)fitSun(lastFp);
 LAMP=A.lamp;if(LAMP>.01){if(!nightG||nightG.userData.k!==lampKey())nightLights();setLamps(LAMP);}else if(nightG)nightG.visible=false;
 if(!live)makeWx();DIRTY=Math.max(DIRTY,live?6:90);if(XRL)xrLean(true);}
let LAMP=0;const lampKey=()=>(H&&H.furn?H.furn.length:0)+'|'+(H&&H.walls?H.walls.length:0)+'|'+(TCH?1:0);
function setLamps(k){if(!nightG)return;nightG.visible=true;nightG.traverse(o=>{if(o.isPointLight)o.intensity=o.userData.base*k;else if(o.isMesh&&o.material&&o.material.userData.lamp){o.material.opacity=Math.min(1,k*1.4);}});}
// night: warm bulbs at floor lamps / pendants / bedside tables (max 6 lights, no shadows -> Quest stays >72 fps)
function nightLights(){if(nightG){scene.remove(nightG);nightG.traverse(o=>o.geometry&&o.geometry.dispose());nightG=null;}if(!H||!H.furn)return;
 nightG=new THREE.Group();nightG.userData.k=lampKey();const lv=n=>(H.levels||[]).find(l=>l.name===n)||{elevation:0};const HY={lamp:1.45,pendant:2.25,nstand:.75,desk:1.05};
 const src=H.furn.filter(f=>HY[f.t]!=null).sort((a,b)=>(a.t==='lamp'?0:a.t==='pendant'?1:2)-(b.t==='lamp'?0:b.t==='pendant'?1:2));const used=[];
 const bm=new THREE.MeshBasicMaterial({color:0xffe2b0,toneMapped:false,transparent:true});bm.userData.lamp=1;const bg=new THREE.SphereGeometry(.07,10,8);
 for(const f of src){const y=(lv(f.level).elevation||0)+HY[f.t];if(used.some(u=>Math.hypot(u[0]-f.p[0],u[1]-f.p[1])<2.2))continue;used.push(f.p);
  const b=new THREE.Mesh(bg,bm);b.position.set(f.p[0],y,f.p[1]);nightG.add(b);if(used.length<=(TCH?4:6)){const L=new THREE.PointLight(0xffb870,7,5.5,2);L.userData.base=7;L.position.set(f.p[0],y,f.p[1]);nightG.add(L);}}
 // facade / porch lights at exterior doors (entrance, terrace) so the house reads from the street at night
 const fp=lastFp||[0,0,0,0],cx=(fp[0]+fp[2])/2,cz=(fp[1]+fp[3])/2;let nf=0;const lm=new THREE.MeshBasicMaterial({color:0xffd9a0,toneMapped:false,transparent:true});lm.userData.lamp=1;const lg=new THREE.BoxGeometry(.16,.22,.08);
 for(const w of (H.walls||[])){const lv0=lv(w.level).elevation||0;const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],L0=Math.hypot(dx,dz)||1,u=[dx/L0,dz/L0];
  for(const o of (w.openings||[])){if(o.type!=='door'||!(o.kind==='entrance'||o.kind==='terrace'||o.out))continue;if(nf>=(TCH?2:3))break;const s=o.offset+o.width/2;const c=[w.start[0]+u[0]*s,w.start[1]+u[1]*s];let n=[-u[1],u[0]];if((c[0]-cx)*n[0]+(c[1]-cz)*n[1]<0)n=[-n[0],-n[1]];
   const off=(w.thickness||.3)/2+.05,px=c[0]+n[0]*off+u[0]*(o.width/2+.25),pz=c[1]+n[1]*off+u[1]*(o.width/2+.25);const m=new THREE.Mesh(lg,lm);m.position.set(px,lv0+2.15,pz);m.rotation.y=Math.atan2(n[0],n[1]);nightG.add(m);
   const P=new THREE.PointLight(0xffc888,6,6,1.8);P.userData.base=6;P.position.set(px+n[0]*.3,lv0+2.1,pz+n[1]*.3);nightG.add(P);nf++;}}
 scene.add(nightG);if(LAMP>.01)setLamps(LAMP);else nightG.visible=false;if(XRL)xrLean(true);}
function makeWx(){if(wxObj){scene.remove(wxObj);wxObj.geometry.dispose();wxObj.material.dispose();wxObj=null;}const w=ATM.w;if(w!=='rain'&&w!=='snow')return;
 const fp=lastFp||[-10,-10,10,10],c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],r=Math.max(fp[2]-fp[0],fp[3]-fp[1])/2+8,N=w==='rain'?(TCH?1200:2600):(TCH?900:1800);
 const P=new Float32Array(N*(w==='rain'?6:3));const box={c,r,h:14};
 for(let i=0;i<N;i++){const x=c[0]+(Math.random()*2-1)*r,z=c[1]+(Math.random()*2-1)*r,y=Math.random()*box.h;if(w==='rain'){P.set([x,y,z,x+.32,y+.9,z+.12],i*6);}else P.set([x,y,z],i*3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));
 wxObj=w==='rain'?new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xdde6f0,transparent:true,opacity:.7,fog:false,toneMapped:false})):new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:.07,sizeAttenuation:true,transparent:true,opacity:.9,depthWrite:false}));
 wxObj.frustumCulled=false;wxObj.userData={box,N,w,ph:new Float32Array(N).map(()=>Math.random()*6.28)};scene.add(wxObj);}
function wxTick(dt,xr){const o=wxObj,u=o.userData,a=o.geometry.attributes.position,A=a.array,rain=u.w==='rain';const n=xr?Math.floor(u.N*.3):u.N;o.geometry.setDrawRange(0,rain?n*2:n);
 const v=rain?11*dt:.9*dt,t=performance.now()/1000;
 for(let i=0;i<n;i++){if(rain){const k=i*6;A[k+1]-=v;A[k+4]-=v;if(A[k+1]<0){A[k+1]+=u.box.h;A[k+4]+=u.box.h;}}else{const k=i*3;A[k+1]-=v;A[k]+=Math.sin(t+u.ph[i])*.15*dt;if(A[k+1]<0)A[k+1]+=u.box.h;}}
 a.needsUpdate=true;}
export function dbgLights(){const o=[];scene.traverse(x=>{if(x.isLight)o.push([x.type,+x.intensity.toFixed(2),x.visible]);});return{L:o,env:scene.environmentIntensity,exp:R.toneMappingExposure,ATM,SUNK,bg:scene.background&&(scene.background.isColor?'col':scene.background===skyDay?'day':scene.background===skyT?'grad':'tex'),px:skyCv?Array.from(skyCv.getContext('2d').getImageData(0,64,1,1).data):null};}
/* v20261117u BASICS gate (Adam: "basics must never break again"). Scene-based checks run by __rules() on every house, in every build:
   ceiling-present, walls-closed, opening-mesh, stair-connects, room-empty (+ floor-present/roof-hole/walkability/ext-material in audit/rulesCheck).
   basicsBreak(kind) deliberately removes geometry so test/basics_negative.sh can prove each rule fires. */
const r2=v=>+(+v).toFixed(2);const _bTag=(o,ks)=>{for(let q=o;q&&q!==world;q=q.parent){const u=q.userData||{};if(ks.some(k=>u[k]))return true;}return false;};
const _bVis=o=>{for(let q=o;q;q=q.parent)if(q.visible===false)return false;return true;};
function _bRayAll(ox,oy,oz,dx,dy,dz,far){return new THREE.Raycaster(new THREE.Vector3(ox,oy,oz),new THREE.Vector3(dx,dy,dz).normalize(),0,far).intersectObjects(world.children,true);}
function _bInWall(x,z,ws,me){return ws.some(v=>{if(v===me)return false;const g=geo(v),T=(v.thickness||.3)/2+.05,px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-T||q>g.L+T)return false;return Math.abs(px*g.u[1]-pz*g.u[0])<T;});}
function _bDoorOk(px,pz,wb,g,T,o){let f=false;world.traverse(m=>{if(f||!m.userData||!m.userData.doorLeaf||!_bVis(m))return;const v=new THREE.Vector3();m.getWorldPosition(v);if(Math.abs(v.y-wb)<.6&&Math.hypot(v.x-px,v.z-pz)<o.width/2+.35)f=true;});if(f)return true;const nx=-g.u[1],nz=g.u[0];return [.6,1.2,1.7].some(y=>_bRay(px-nx*(T+.3),wb+y,pz-nz*(T+.3),nx,0,nz,2*T+.6).length>0);}
function _bOutExt(x,z,ws){return (ws||[]).some(w=>{if(!w._ext)return false;const g=geo(w),T=(w.thickness||.3)/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,px=x-g.x0,pz=z-g.z0,q=px*g.u[0]+pz*g.u[1];if(q<-.05||q>g.L+.05)return false;const d=(x-(g.x0+g.u[0]*q))*nx+(z-(g.z0+g.u[1]*q))*nz;return d>T-.02&&d<6;});}
function _bRay(ox,oy,oz,dx,dy,dz,far){const rc=new THREE.Raycaster(new THREE.Vector3(ox,oy,oz),new THREE.Vector3(dx,dy,dz).normalize(),0,far);return rc.intersectObjects(world.children,true).filter(h=>_bVis(h.object));}
export function basics(){const P=[];if(!H||!H.levels||!world)return P;world.updateMatrixWorld(true);const NL=H.levels.length;
 H.levels.forEach((l,i)=>{const el=l.elevation||0,lh=l.height||2.8,top=i===NL-1,ws=H.walls.filter(w=>w.level===l.name),sh=(H.stairs||[]).filter(st=>st.level===l.name).map(stairRect);
  // ceiling-present: every room cell has a ceiling (top storey: ceiling or roof) above it, except over its own stair void
  if(!(top&&roof==='none'))(CELLS[l.name]||[]).forEach(r=>{if((r[2]-r[0])*(r[3]-r[1])<.25)return;let t=0,h=0;for(let a=.2;a<.85;a+=.3)for(let b=.2;b<.85;b+=.3){const x=r[0]+(r[2]-r[0])*a,z=r[1]+(r[3]-r[1])*b;if(sh.some(q=>x>q[0]-.1&&x<q[2]+.1&&z>q[1]-.1&&z<q[3]+.1)||inExtBand(x,z,ws)||_bOutExt(x,z,ws)||_bInWall(x,z,ws,null))continue;t++;
   if(_bRayAll(x,el+1,z,0,1,0,lh+1.2).some(hh=>_bTag(hh.object,top?['ceil','roof','roofMat','lroof','slab']:['ceil'])))h++;}
   if(t>=2&&h/t<.75)P.push({rule:'ceiling-present',level:l.name,p:[r2((r[0]+r[2])/2),r2((r[1]+r[3])/2)],frac:r2(h/t)});});
  ws.forEach(w=>{const g=geo(w),T=(w.thickness||.3)/2,wb=el+(w.base||0),wh=w.height||lh,O=w.openings||[];
   // walls-closed: an exterior wall has no hole outside its openings (horizontal rays from inside, every 25 cm, 3 heights)
   if(w._ext){const nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext;let run=0,bad=null;for(let s=.45;s<g.L-.45;s+=.25){if(O.some(o=>s>o.offset-.12&&s<o.offset+o.width+.12)){run=0;continue;}
     const px=g.x0+g.u[0]*s,pz=g.z0+g.u[1]*s;if(_bInWall(px-nx*(T+.2),pz-nz*(T+.2),ws,w)){run=0;continue;}const miss=[.3,wh*.5,wh-.35].some(y=>!_bRay(px-nx*(T+.2),wb+y,pz-nz*(T+.2),nx,0,nz,2*T+.45).length);run=miss?run+1:0;if(run>=2&&!bad)bad=[r2(px),r2(pz)];}
    if(bad)P.push({rule:'walls-closed',level:l.name,wall:w.id,p:bad});}
   // opening-mesh: every window has glass/frame in its hole, every door has a leaf
   O.forEach(o=>{const q=o.offset+o.width/2,px=g.x0+g.u[0]*q,pz=g.z0+g.u[1]*q;
    if(o.type==='door'){if(!_bDoorOk(px,pz,wb,g,T,o))P.push({rule:'opening-mesh',level:l.name,wall:w.id,kind:'door',p:[r2(px),r2(pz)]});}
    else{const y=wb+(o.sill||0)+(o.height||1.2)/2,nx=-g.u[1],nz=g.u[0];if(!_bRay(px-nx*(T+.3),y,pz-nz*(T+.3),nx,0,nz,2*T+.6).length)P.push({rule:'opening-mesh',level:l.name,wall:w.id,kind:'window',p:[r2(px),r2(pz)]});}});});
  // stair-connects: the run under every stair rises from this floor to the next storey, monotonic
  const up=H.levels[i+1];(H.stairs||[]).filter(st=>st.level===l.name).forEach(st=>{if(!up)return;const r=stairRect(st),eu=up.elevation||0,lx=r[2]-r[0]>=r[3]-r[1],hs=[];
   for(let k=0;k<7;k++){const f=.06+k*.88/6,x=lx?r[0]+(r[2]-r[0])*f:(r[0]+r[2])/2,z=lx?(r[1]+r[3])/2:r[1]+(r[3]-r[1])*f;const hit=_bRay(x,eu+.9,z,0,-1,0,eu-el+1.2).find(hh=>!_bTag(hh.object,['rail','post','noCol','lamp'])&&hh.point.y>el-.2);hs.push(hit?hit.point.y:el-9);}
   const mn=Math.min(...hs),mx=Math.max(...hs),inc=hs.every((v,k)=>!k||v>=hs[k-1]-.06),dec=hs.every((v,k)=>!k||v<=hs[k-1]+.06);
   if(mn<el-1||mx<eu-.6||mn>el+.6||!(inc||dec))P.push({rule:'stair-connects',level:l.name,p:[r2((r[0]+r[2])/2),r2((r[1]+r[3])/2)],hs:hs.map(r2)});});});
 // room-empty: a habitable room ≥4 m² has at least one piece of furniture in the scene
 try{const FB=[];world.traverse(o=>{if(o.userData&&o.userData.furn&&_bVis(o)){const b=new THREE.Box3().setFromObject(o);if(!b.isEmpty())FB.push(b);}});
  roomsAllS().forEach(x=>{const bb=x.bb,a=(bb[2]-bb[0])*(bb[3]-bb[1]);if(a<4||/^(chodba|hala|zádver|predsie|schod|komunik|technick|šatn|sklad|komora|wc|terasa|balk|lodžia|garáž|kotol|práčov)/i.test(x.n.trim()))return;
   if(!FB.some(b=>{const cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2,cy=(b.min.y+b.max.y)/2;return cx>bb[0]&&cx<bb[2]&&cz>bb[1]&&cz<bb[3]&&cy>x.e-.1&&cy<x.e+2.6;}))P.push({rule:'room-empty',level:x.L,room:x.n,where:{room:x.n,level:x.L}});});}catch(e){P.push({rule:'basics-crash',err:String(e)});}
 return P;}
export function basicsBreak(kind){world.updateMatrixWorld(true);const rm=o=>{if(o&&o.parent)o.parent.remove(o);},R=roomsAllS(),NL=H.levels.length,TL=H.levels[NL-1],L0=H.levels[0];
 const big=L=>R.filter(x=>x.L===L.name).sort((a,b)=>(b.bb[2]-b.bb[0])*(b.bb[3]-b.bb[1])-(a.bb[2]-a.bb[0])*(a.bb[3]-a.bb[1]))[0];let n=0;
 if(kind==='floor'){const x=big(TL);const hs=_bRay(x.c[0],TL.elevation+.5,x.c[1],0,-1,0,1).filter(h=>_bTag(h.object,['floor']));hs.forEach(h=>{rm(h.object);n++;});}
 if(kind==='ceiling'){const toR=[];world.traverse(o=>{if(o.userData&&o.userData.ceil)toR.push(o);});toR.forEach(o=>{rm(o);n++;});}
 if(kind==='wall'){const el=L0.elevation||0;for(const w of H.walls.filter(w=>w._ext&&w.level===L0.name)){const g=geo(w),T=(w.thickness||.3)/2,nx=-g.u[1]*w._ext,nz=g.u[0]*w._ext,O=w.openings||[];
  for(let s=.6;s<g.L-.6&&!n;s+=.25){if(O.some(o=>s>o.offset-.5&&s<o.offset+o.width+.5))continue;const px=g.x0+g.u[0]*s,pz=g.z0+g.u[1]*s;
   for(const y of [.3,1.4,2.4])for(let k=0;k<8;k++){const h=_bRay(px-nx*(T+.2),el+(w.base||0)+y,pz-nz*(T+.2),nx,0,nz,2*T+.45)[0];if(!h)break;rm(h.object);n++;}}if(n)break;}}
 if(kind==='window'){const w=H.walls.find(w=>w._ext&&(w.openings||[]).some(o=>o.type!=='door')),o=w.openings.find(o=>o.type!=='door'),g=geo(w),T=(w.thickness||.3)/2,q=o.offset+o.width/2,px=g.x0+g.u[0]*q,pz=g.z0+g.u[1]*q,lv=H.levels.find(l=>l.name===w.level),y=(lv.elevation||0)+(w.base||0)+(o.sill||0)+(o.height||1.2)/2;
  for(let k=0;k<10;k++){const h=_bRay(px+g.u[1]*(T+.3),y,pz-g.u[0]*(T+.3),-g.u[1],0,g.u[0],2*T+.6)[0];if(!h)break;rm(h.object);n++;}}
 if(kind==='door'){let leaf=null;world.traverse(m=>{if(!leaf&&m.userData&&m.userData.doorLeaf&&m.parent)leaf=m;});if(leaf){const v=new THREE.Vector3();leaf.getWorldPosition(v);
  for(const w of H.walls){const g=geo(w),T=(w.thickness||.3)/2,lv=H.levels.find(l=>l.name===w.level),wb=(lv.elevation||0)+(w.base||0);for(const o of (w.openings||[]).filter(o=>o.type==='door')){const q=o.offset+o.width/2,px=g.x0+g.u[0]*q,pz=g.z0+g.u[1]*q;if(Math.abs(v.y-wb)>.6||Math.hypot(v.x-px,v.z-pz)>o.width/2+.35)continue;
   const toR=[];world.traverse(m=>{if(m.userData&&m.userData.doorLeaf){const u=new THREE.Vector3();m.getWorldPosition(u);if(Math.abs(u.y-wb)<.6&&Math.hypot(u.x-px,u.z-pz)<o.width/2+.35)toR.push(m);}});toR.forEach(m=>{rm(m);n++;});
   const nx=-g.u[1],nz=g.u[0];for(const y of [.6,1.2,1.7])for(let k=0;k<8;k++){const h=_bRay(px-nx*(T+.3),wb+y,pz-nz*(T+.3),nx,0,nz,2*T+.6)[0];if(!h)break;rm(h.object);n++;}return n;}}}}
 if(kind==='stair'){(H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(l=>l.name===st.level),el=H.levels[li].elevation||0,eu=(H.levels[li+1]||{}).elevation||el+3,r=stairRect(st);const toR=[];
  world.traverse(o=>{if(!o.isMesh||_bTag(o,['floor','ceil']))return;const b=new THREE.Box3().setFromObject(o),cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2,cy=(b.min.y+b.max.y)/2;if(cx>r[0]&&cx<r[2]&&cz>r[1]&&cz<r[3]&&cy>el+.05&&cy<eu-.05&&b.max.x-b.min.x<6)toR.push(o);});toR.forEach(o=>{rm(o);n++;});});}
 if(kind==='furn'){const x=R.filter(x=>/^(spálň|obýva|detsk|pracov)/i.test(x.n.trim()))[0];const toR=[];world.traverse(o=>{if(!(o.userData&&o.userData.furn))return;const b=new THREE.Box3().setFromObject(o),cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2,cy=(b.min.y+b.max.y)/2;if(cx>x.bb[0]&&cx<x.bb[2]&&cz>x.bb[1]&&cz<x.bb[3]&&cy>x.e-.1&&cy<x.e+2.6)toR.push(o);});toR.forEach(o=>{rm(o);n++;});}
 if(kind==='roof'){let best=null;world.traverse(o=>{if(o.isMesh&&o.userData&&o.userData.roof){const b=new THREE.Box3().setFromObject(o),a=(b.max.x-b.min.x)*(b.max.z-b.min.z);if(!best||a>best[1])best=[o,a];}});if(best){rm(best[0]);n++;}}
 world.updateMatrixWorld(true);return n;}
