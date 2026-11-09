// 3D view (lazy-loaded)
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {Body,Locomotion,colliderFromObject} from './vm.js';
import {loadKit,makeFurn,makeTree,makeShrub,makeCar} from './kit.js?v=20261109ar';
const $=id=>document.getElementById(id),TCH=matchMedia('(pointer:coarse)').matches;
let H,R,scene,cam,rig,orb,world,loco,body,sun,inited=false,walk=false,roof='flat',intro=null;const clock=new THREE.Clock(),keys={},joy=[0,0];let yaw=0,pitch=0,LK='',DIRTY=60,FT=[],PRMAX=2;export function dirty(n=60){DIRTY=Math.max(DIRTY,n);}

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
 return{ok:true,grow,short,roof,wallish,maxH:+maxH.toFixed(2),worldMinY:+worldMinY.toFixed(2),worldMaxY:+worldMaxY.toFixed(2),samples,DOLL,roofVis,camY:cam?+cam.position.y.toFixed(2):null,camPos:cam?cam.position.toArray().map(n=>+n.toFixed(1)):null};}
export function stopCam(){camPath=null;if(orb)orb.enabled=true;}
export function isDoll(){return DOLL;}
export const geo=w=>{const[x0,z0]=w.start,[x1,z1]=w.end,L=Math.hypot(x1-x0,z1-z0)||1e-9;return{x0,z0,L,u:[(x1-x0)/L,(z1-z0)/L]};};
export function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function tex(draw,n=256,rep=1){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=TCH?2:4;return t;}
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
const wood=tex((x,n)=>{for(let i=0;i<8;i++){const l=168+rnd()*28;x.fillStyle=`rgb(${(l+62)|0},${(l+22)|0},${(l-40)|0})`;x.fillRect(0,i*n/8,n,n/8+1);x.fillStyle='rgba(90,50,15,.35)';x.fillRect(0,i*n/8,n,2);for(let k=0;k<4;k++){x.fillStyle='rgba(70,40,10,.12)';x.fillRect(rnd()*n,i*n/8,1+rnd()*2,n/8);}}for(let i=0;i<400;i++){x.fillStyle=`rgba(120,70,30,${rnd()*.08})`;x.fillRect(rnd()*n,rnd()*n,2+rnd()*40,1);}},256,3);
const tile=tex((x,n)=>{x.fillStyle='#e8e4dc';x.fillRect(0,0,n,n);const g=n/4;x.strokeStyle='#c9c3b8';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*g,0);x.lineTo(i*g,n);x.stroke();x.beginPath();x.moveTo(0,i*g);x.lineTo(n,i*g);x.stroke();}for(let i=0;i<200;i++){x.fillStyle=`rgba(0,0,0,${rnd()*.04})`;x.fillRect(rnd()*n,rnd()*n,2,2);}},128,6);
const beton=tex((x,n)=>{x.fillStyle='#a8a69f';x.fillRect(0,0,n,n);for(let i=0;i<1800;i++){const v=140+rnd()*50;x.fillStyle=`rgba(${v|0},${v|0},${v-5|0},${.15+rnd()*.25})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*3,1+rnd()*2);}x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,n*.48,n,2);},128,8);
const fabric=tex((x,n)=>{x.fillStyle='#888';x.fillRect(0,0,n,n);for(let i=0;i<2500;i++){x.fillStyle=`rgba(${200+rnd()*40|0},${200+rnd()*40|0},${200+rnd()*40|0},${.08+rnd()*.12})`;x.fillRect(rnd()*n,rnd()*n,1.2,1.2);}},64,8);
const plaster=tex((x,n)=>{x.fillStyle='#f2efe8';x.fillRect(0,0,n,n);for(let i=0;i<900;i++){x.fillStyle=`rgba(0,0,0,${rnd()*.035})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,1+rnd()*2);}},128,4);
const grass=tex((x,n)=>{x.fillStyle='#6d7a58';x.fillRect(0,0,n,n);for(let i=0;i<4200;i++){const g=95+rnd()*55;x.fillStyle=`rgba(${(g*.62)|0},${g|0},${(g*.48)|0},${.35+rnd()*.35})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,2+rnd()*3);}for(let i=0;i<80;i++){x.fillStyle=`rgba(90,100,70,${.08+rnd()*.12})`;x.beginPath();x.ellipse(rnd()*n,rnd()*n,8+rnd()*18,5+rnd()*12,rnd()*3,0,6.3);x.fill();}},256);
const earth=tex((x,n)=>{x.fillStyle='#8a8478';x.fillRect(0,0,n,n);for(let i=0;i<3000;i++){const g=110+rnd()*40;x.fillStyle=`rgba(${g|0},${(g*.92)|0},${(g*.78)|0},.4)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},128,4);
const pave=tex((x,n)=>{x.fillStyle='#c9c2b4';x.fillRect(0,0,n,n);for(let i=0;i<n;i+=32){x.fillStyle='rgba(110,105,95,.28)';x.fillRect(i,0,1,n);x.fillRect(0,i,n,1);}for(let i=0;i<800;i++){const g=180+rnd()*40;x.fillStyle=`rgba(${g|0},${(g*.96)|0},${(g*.88)|0},.25)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},256,2);
const roofTex=tex((x,n)=>{x.fillStyle='#a4adb6';x.fillRect(0,0,n,n);for(let col=0;col<n;col+=16){x.fillStyle='rgba(255,255,255,.12)';x.fillRect(col,0,12,n);x.fillStyle='rgba(0,0,0,.22)';x.fillRect(col+12,0,2.5,n);x.fillStyle='rgba(255,255,255,.06)';x.fillRect(col+5,0,1,n);}for(let row=0;row<n;row+=48){x.fillStyle='rgba(0,0,0,.08)';x.fillRect(0,row,n,1);}for(let i=0;i<500;i++){x.fillStyle=`rgba(255,255,255,${rnd()*.05})`;x.fillRect(rnd()*n,rnd()*n,2,1);}},256,5);

const std=(o)=>new THREE.MeshStandardMaterial(o);
const M={wall:std({color:0xf4f1ec,map:plaster,roughness:.9}),floor:std({map:wood,roughness:.55}),ceil:std({color:0xfaf6ef,roughness:1,emissive:0xd4c4a8,emissiveIntensity:.25}),
 glass:new THREE.MeshPhysicalMaterial({color:0xc5d8e8,transparent:true,opacity:.3,roughness:.06,metalness:0,envMapIntensity:1.15}),frame:std({color:0x2f3235,roughness:.45,metalness:.2}),
 door:std({color:0xcdb89a,map:wood,roughness:.55}),roof:std({map:roofTex,color:0xa8b2bc,roughness:.62,metalness:.08}),stair:std({map:wood,roughness:.5}),lawn:std({map:grass,roughness:1,color:0xa8b888}),ground:std({map:grass,roughness:1,color:0xc4d0a4}),
 fac:std({color:0xf7f5f0,map:plaster,roughness:.95}),wood2:std({color:0x9b7653,map:wood,roughness:.55}),fence:std({color:0x4a4a48,roughness:.75,metalness:.05}),path:std({map:pave,color:0xcfc8bb,roughness:.92}),plinth:std({color:0xb08968,roughness:.88,map:wood}),
 tile:std({map:tile,roughness:.35}),beton:std({map:beton,roughness:.85}),fab:fabric};
if(M.roof.map)M.roof.map.repeat.set(6,6);if(M.lawn.map)M.lawn.map.repeat.set(.4,.4);if(M.path.map)M.path.map.repeat.set(2,2);if(M.tile.map)M.tile.map.repeat.set(2,2);if(M.floor.map)M.floor.map.repeat.set(3,3);
export function init(){if(inited)return;inited=true;loadKit().then(()=>DIRTY=Math.max(DIRTY,60)).catch(()=>{});
 R=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});R.setPixelRatio(PRMAX=Math.min(devicePixelRatio,TCH?1.5:2));R.xr.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.22;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;$('v3').appendChild(R.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xc5d4e0);scene.fog=new THREE.FogExp2(0xc5d4e0,.012);
 new RGBELoader().load('assets/cc0/hdri/kloppenheim_06_puresky_1k.hdr',t=>{t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=t;scene.environmentIntensity=1.05;
  // Clean gradient sky (no photographic strip) — HDRI used for lighting/reflections only
  const c=document.createElement('canvas');c.width=2;c.height=256;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#b7c8da');g.addColorStop(.4,'#d5e0ea');g.addColorStop(.7,'#e8eee8');g.addColorStop(1,'#f2f0e8');
  x.fillStyle=g;x.fillRect(0,0,2,256);const bt=new THREE.CanvasTexture(c);bt.colorSpace=THREE.SRGBColorSpace;bt.mapping=THREE.EquirectangularReflectionMapping;
  scene.background=bt;scene.backgroundBlurriness=0;scene.fog=new THREE.FogExp2(0xe4eadc,.0042);DIRTY=Math.max(DIRTY,40);});
 scene.add(new THREE.HemisphereLight(0xfff1dc,0xa8b890,.88));sun=new THREE.DirectionalLight(0xffd9a0,3.4);sun.castShadow=true;const sm=TCH?1024:2048;sun.shadow.mapSize.set(sm,sm);sun.shadow.bias=-.00035;sun.shadow.normalBias=.028;sun.shadow.radius=3.5;scene.add(sun,sun.target);const fill=new THREE.DirectionalLight(0xfff0dd,0.55);fill.position.set(-8,10,6);scene.add(fill);
 rig=new THREE.Group();cam=new THREE.PerspectiveCamera(55,1,.05,600);rig.add(cam);scene.add(rig);orb=new OrbitControls(cam,R.domElement);orb.enableDamping=true;orb.dampingFactor=.08;orb.maxPolarAngle=Math.PI*.49;orb.minDistance=2;orb.maxDistance=120;
 const g=new THREE.Mesh(new THREE.CircleGeometry(250,64).rotateX(-Math.PI/2),M.ground);grass.repeat.set(1,1);g.material.map=grass.clone();g.material.map.repeat.set(120,120);g.material.map.needsUpdate=true;g.position.y=-.03;g.receiveShadow=true;scene.add(g);
 const vb=VRButton.createButton(R);document.body.appendChild(vb);
 R.xr.addEventListener('sessionstart',()=>{setWalk(false,true);loco&&loco.init&&loco.init();});R.xr.addEventListener('sessionend',()=>place(walk));
 const el=R.domElement;let lk=null;el.addEventListener('pointerdown',e=>{intro=null;if(walk&&!R.xr.isPresenting)lk=[e.clientX,e.clientY];});addEventListener('pointerup',()=>lk=null);
 el.addEventListener('pointermove',e=>{if(!lk)return;yaw+=(e.clientX-lk[0])*.005;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lk[1])*.004));lk=[e.clientX,e.clientY];});
 el.addEventListener('wheel',()=>intro=null,{passive:true});
 addEventListener('keydown',e=>keys[e.code]=1);addEventListener('keyup',e=>keys[e.code]=0);
 const J=$('joy'),K=J.firstElementChild;let jid=null;J.addEventListener('pointerdown',e=>{jid=e.pointerId;J.setPointerCapture(jid);jm(e);});J.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
 const je=()=>{jid=null;joy[0]=joy[1]=0;K.style.transform='';};J.addEventListener('pointerup',je);J.addEventListener('pointercancel',je);
 function jm(e){const r=J.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy[0]=x;joy[1]=y;K.style.transform=`translate(${x*35}px,${y*35}px)`;}
 R.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05),s=R.xr.getSession();if(!s&&(document.hidden||!$('vw').offsetWidth))return;
  if(s&&loco)loco.update(dt,s.inputSources);else if(!s){if(walk)walkTick(dt);else{if(camPath)camPathTick(dt);else if(intro)introTick(dt);orb.update();}roofTweenTick(dt);if(sunTween)sunTweenTick(dt);if(wallGrow)wallGrowTick(dt);}
  if(!s){const k=cam.matrixWorld.elements.join()+rig.position.x+rig.position.z;if(k===LK&&DIRTY<=0&&!walk&&!camPath&&!sunTween&&!wallGrow&&Math.abs(roofVis-roofTgt)<.01)return;if(k!==LK)DIRTY=Math.max(DIRTY,2);LK=k;DIRTY--;
   FT.push(dt);if(FT.length>90){const av=FT.reduce((a,b)=>a+b)/FT.length;FT=[];const pr=R.getPixelRatio();if(av>.028&&pr>1){R.setPixelRatio(Math.max(1,pr-.25));}else if(av<.014&&pr<PRMAX){R.setPixelRatio(Math.min(PRMAX,pr+.25));}}}
  R.render(scene,cam);});
 new ResizeObserver(()=>{if(fixedSize)return;const r=$('v3').getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();DIRTY=Math.max(DIRTY,30);}).observe($('v3'));}
const ease=t=>1-Math.pow(1-t,3),easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function introTick(dt){intro.t=Math.min(1,intro.t+dt/2.2);const k=ease(intro.t);cam.position.lerpVectors(intro.a,intro.b,k);if(intro.t>=1)intro=null;}
let roofVis=1,roofTgt=1,sunTween=null,camPath=null,wallGrow=null,DOLL=false,doGrow=false,fixedSize=null;
function camPathTick(dt){if(!camPath)return;const P=camPath;P.t=Math.min(1,P.t+dt/(P.dur||8));const u=easeInOut(P.t);
 if(P.kind==='orbit'){const c=P.c,r=P.r,y=P.y,a0=P.a0,a1=P.a1,ang=a0+(a1-a0)*u;cam.position.set(c[0]+Math.cos(ang)*r,y,c[1]+Math.sin(ang)*r);orb.target.set(c[0],P.ty||1.2,c[1]);orb.update();}
 else if(P.kind==='lerp'){cam.position.lerpVectors(P.a,P.b,u);orb.target.lerpVectors(P.ta,P.tb,u);orb.update();}
 else if(P.kind==='walk'){const a=P.pts,n=a.length-1,x=u*n,i=Math.min(n-1,x|0),f=x-i;const p=a[i].clone().lerp(a[i+1],easeInOut(f));cam.position.copy(p);
  const look=(P.look?P.look.clone():a[n].clone());if(!P.look)look.y=1.45;orb.target.lerp(look,.65);orb.update();}
 if(P.t>=1){if(P.loop&&P.kind==='orbit'){P.t=0;}else{const n=P.next;camPath=null;if(n)startCam(n);}}}
function startCam(o){DIRTY=Math.max(DIRTY,999);if(!world||!orb)return;orb.autoRotate=false;orb.enabled=!(o&&o.lock);
 const fp=world.userData.fp||[0,0,10,10],c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],S=Math.max(fp[2]-fp[0],fp[3]-fp[1],8);
 if(o.kind==='orbit'){setWalk(false);resetExterior();
  const port=cam&&cam.aspect<0.85; if(cam){cam.fov=port?58:48;cam.updateProjectionMatrix();}
  const R0=port?Math.max(13.5,S*1.18):Math.max(13,S*1.28), Y0=port?Math.max(6.4,S*.5):Math.max(5.8,S*.48);
  camPath={kind:'orbit',c,r:o.r||R0,y:o.y||Y0,ty:o.ty||0.85,a0:o.a0||0.55,a1:o.a1||(Math.PI*2+0.55),t:0,dur:(o.dur||16)/(o.speed||1),loop:!!o.loop};}
 else if(o.kind==='dollhouse'){setWalk(false);setDollViz(true);
  const a=cam.position.clone(),b=new THREE.Vector3(c[0]-S*.04,S*0.78,c[1]+S*.22),ta=orb.target.clone(),tb=new THREE.Vector3(c[0],.15,c[1]);
  camPath={kind:'lerp',a,b,ta,tb,t:0,dur:(o.dur||5)/(o.speed||1),next:o.next};}
 else if(o.kind==='walk'){setWalk(false);resetExterior();if(cam){cam.fov=62;cam.updateProjectionMatrix();}
  let doorX=fp[0]+1.7,doorZ=fp[1];
  try{(H.walls||[]).forEach(w=>{(w.openings||[]).forEach(op=>{if(op.kind==='entrance'||(op.type==='door'&&op.out)){const g=geo(w);doorX=g.x0+g.u[0]*(op.offset+op.width/2);doorZ=g.z0+g.u[1]*(op.offset+op.width/2);}});});}catch(e){}
  const y=1.65,zSouth=H.plot&&H.plot.pts?Math.min(...H.plot.pts.map(p=>p[1])):fp[1]-5;
  const gateZ=Math.min(zSouth-1.8,fp[1]-8.5);
  // path along clear walkway; look target on facade (door + window) not into hall
  const lookX=doorX+2.1, lookZ=fp[1]+0.2;
  const pts=[new THREE.Vector3(doorX,y,gateZ),new THREE.Vector3(doorX,y,(gateZ+fp[1]-3.5)/2),new THREE.Vector3(doorX,y,fp[1]-3.6),new THREE.Vector3(doorX,y,fp[1]-2.2)];
  camPath={kind:'walk',pts,look:new THREE.Vector3(lookX,1.75,lookZ),t:0,dur:(o.dur||12)/(o.speed||1)};
  if(o.at!=null){camPath.t=Math.min(1,Math.max(0,+o.at));}
  if(doorMode==='closed'){doorPivs.forEach(p=>{const d=p.userData.door;if(!d)return;d.u=0;p.rotation.y=d.closed;});DIRTY=Math.max(DIRTY,60);}}
 else if(o.kind==='interior'){finishGrow();DOLL=false;setWalk(false);
  if(cam){cam.fov=70;cam.updateProjectionMatrix();}
  // Show ceilings (hide exterior roof), keep full walls
  if(world)world.traverse(o=>{if(o.userData.roof)o.visible=false;if(o.userData.ceil)o.visible=true;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=true;});
  const ix=o.x!=null?o.x:4.2,iz=o.z!=null?o.z:8.4,tx=o.tx!=null?o.tx:6.0,tz=o.tz!=null?o.tz:5.1;
  rig.position.set(0,0,0);rig.rotation.set(0,0,0);
  cam.position.set(ix,1.6,iz);orb.target.set(tx,1.05,tz);orb.enabled=true;orb.update();
  camPath=null;DIRTY=Math.max(DIRTY,90);}
 else if(o.kind==='descend'){setWalk(false);setDollViz(true);
  const rooms=(H.furn||[]).slice(0,6).map(f=>new THREE.Vector3(f.p[0],S*1.2,f.p[1]));
  if(!rooms.length)rooms.push(new THREE.Vector3(c[0],S*1.2,c[1]));
  const pts=[new THREE.Vector3(c[0],S*1.9,c[1]+S*.4),...rooms];
  camPath={kind:'walk',pts,t:0,dur:(o.dur||12)/(o.speed||1)};}
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
function resetExterior(){finishGrow();DOLL=false;roofTgt=(roof==='none')?0:1;roofVis=roofTgt;if(!world)return;
 world.traverse(o=>{if(o.userData.roof){o.visible=roof!=='none';if(o.material&&o.userData.roofMat){o.material.opacity=1;o.material.transparent=false;o.material.depthWrite=true;}}
  if(o.userData.ceil)o.visible=false;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=false;});DIRTY=Math.max(DIRTY,90);}
function setDollViz(on){finishGrow();DOLL=!!on;roofTgt=on?0:1;roofVis=on?0:1;if(!world)return;
 world.traverse(o=>{if(o.userData.roof){if(o.material&&!o.userData.roofMat){o.material=o.material.clone();o.userData.roofMat=1;}if(o.material){o.material.transparent=true;o.material.opacity=on?0:1;o.material.depthWrite=!on;}o.visible=!on;}
  if(o.userData.cap)o.visible=!!on;if(o.userData.ceil)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=!!on;});DIRTY=Math.max(DIRTY,90);}

export function playCam(kind,speed=1,extra={}){startCam({kind,speed,...extra});}
export function scrubCam(u){if(!camPath)return;camPath.t=Math.min(1,Math.max(0,+u));
  if(camPath.kind==='walk'){const P=camPath,a=P.pts,n=a.length-1,x=P.t*n,i=Math.min(n-1,x|0),f=x-i;const ee=t=>t*t*(3-2*t);const p=a[i].clone().lerp(a[i+1],ee(f));cam.position.copy(p);const look=(P.look?P.look.clone():a[n].clone());if(!P.look)look.y=1.45;orb.target.copy(look);orb.update();}
  else if(camPath.kind==='orbit'){const P=camPath,ang=P.a0+(P.a1-P.a0)*P.t;cam.position.set(P.c[0]+Math.cos(ang)*P.r,P.y,P.c[1]+Math.sin(ang)*P.r);orb.target.set(P.c[0],P.ty||1.2,P.c[1]);orb.update();}
  else camPathTick(0);DIRTY=Math.max(DIRTY,60);}
export function dollhouse(on){DIRTY=Math.max(DIRTY,180);if(!world)return;setWalk(false);
 if(on){setDollViz(true);startCam({kind:'dollhouse',dur:3.2,speed:1});}
 else{resetExterior();place(false,false);}
}

function walkTick(dt){let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy[1],r=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy[0];
 if(keys.ArrowLeft)yaw-=dt*1.8;if(keys.ArrowRight)yaw+=dt*1.8;const sp=1.6*dt*(keys.ShiftLeft?2:1),p=rig.position;
 if(f||r){p.x+=(Math.sin(yaw)*f+Math.cos(yaw)*r)*sp;p.z+=(-Math.cos(yaw)*f+Math.sin(yaw)*r)*sp;if(body)body.resolve(p);}
 if(body){const y=body.floor(p);if(y!==null)p.y=y;}cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));}
function cells(ws,stairsHole){const C=.1;let xs=[],zs=[];ws.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});const x0=Math.min(...xs)-.5,z0=Math.min(...zs)-.5,
 nx=Math.ceil((Math.max(...xs)+.5-x0)/C),nz=Math.ceil((Math.max(...zs)+.5-z0)/C),g=new Uint8Array(nx*nz);
 ws.forEach(w=>{const G=geo(w),n=Math.ceil(G.L/(C/2)),t=w.thickness/2+.06;for(let i=0;i<=n;i++){const s=i*G.L/n;for(let k=-t;k<=t;k+=C/2){const x=G.x0+G.u[0]*s-G.u[1]*k,z=G.z0+G.u[1]*s+G.u[0]*k,ix=((x-x0)/C)|0,iz=((z-z0)/C)|0;if(ix>=0&&iz>=0&&ix<nx&&iz<nz)g[iz*nx+ix]=1;}}});
 const q=[0];g[0]=2;while(q.length){const i=q.pop(),x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!g[j]){g[j]=2;q.push(j);}}}
 const rects=[];for(let z=0;z<nz;z++){let s=-1;for(let x=0;x<=nx;x++){const cx0=x0+x*C+C/2,cz=z0+z*C+C/2;const inH=stairsHole&&stairsHole.some(h=>cx0>h[0]&&cx0<h[2]&&cz>h[1]&&cz<h[3]);const v=x<nx&&g[z*nx+x]!==2&&!inH;
  if(v&&s<0)s=x;if(!v&&s>=0){rects.push([x0+s*C,z0+z*C,x0+x*C,z0+(z+1)*C]);s=-1;}}}
 const out=[];rects.forEach(r=>{const p=out.find(o=>o[0]===r[0]&&o[2]===r[2]&&Math.abs(o[3]-r[1])<1e-6);if(p)p[3]=r[3];else out.push(r);});return out;}
function build(){const root=new THREE.Group(),lv={};H.levels.forEach(l=>lv[l.name]=l);let xs=[],zs=[];doorPivs=[];
 const add=(geom,mat,x,y,z,ry=0,nc)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=mat!==M.glass;if(nc)m.userData.noCol=true;root.add(m);return m;};
 const box=(w,s0,s1,y0,y1,mat,t,tOff=0,nc)=>{if(s1-s0<.005||y1-y0<.005)return;if(mat===M.wall&&w._ext)mat=w._ext>0?WP:WN;const g=geo(w);t=t||w.thickness;const m=add(new THREE.BoxGeometry(s1-s0,y1-y0,t),mat,g.x0+g.u[0]*(s0+s1)/2-g.u[1]*tOff,y0+(y1-y0)/2,g.z0+g.u[1]*(s0+s1)/2+g.u[0]*tOff,-Math.atan2(g.u[1],g.u[0]),nc);if(doGrow&&mat!==M.glass&&mat!==M.frame){const hh=y1-y0;m.userData.grow=1;m.userData.growBase=y0;m.userData.growH=hh;m.scale.y=.001;m.position.y=y0;m.visible=false;}return m;};
 H.walls.forEach(w=>{const L=geo(w).L,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0),h=w.height||2.8;xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);
  const ops=[...(w.openings||[])].sort((a,b)=>a.offset-b.offset);let s=0;
  ops.forEach(o=>{const sl=o.sill||0,a=o.offset,b=a+o.width,f=.06;box(w,s,a,e,e+h,M.wall);box(w,a,b,e,e+sl,M.wall);box(w,a,b,e+sl+o.height,e+h,M.wall);
   if(o.type==='window'){box(w,a,b,e+sl+f,e+sl+o.height-f,M.glass,.02,0,1);box(w,a,b,e+sl,e+sl+f,M.frame,.1);box(w,a,b,e+sl+o.height-f,e+sl+o.height,M.frame,.1);box(w,a,a+f,e+sl,e+sl+o.height,M.frame,.1);box(w,b-f,b,e+sl,e+sl+o.height,M.frame,.1);box(w,(a+b)/2-.02,(a+b)/2+.02,e+sl,e+sl+o.height,M.frame,.07,0,1);
    // exterior sill
    box(w,a-.02,b+.02,e+sl-.04,e+sl,M.plinth,w.thickness+.08,0,1);}
   else{box(w,a,a+.06,e,e+o.height,M.frame,w.thickness+.04);box(w,b-.06,b,e,e+o.height,M.frame,w.thickness+.04);box(w,a,b,e+o.height-.06,e+o.height,M.frame,w.thickness+.04);box(w,a-.02,b+.02,e,e+.04,M.plinth,w.thickness+.1,0,1);
    const G=geo(w),ang=-Math.atan2(G.u[1],G.u[0]),sd=o.out?-1:1,kd=o.kind||'single',mat=kd==='entrance'?M.frame:M.door;
    const isEnt=kd==='entrance'||(o.type==='door'&&o.out&&o.kind!=='sliding');
    const leaf=(hs,lw,dir,openRot)=>{const lf=new THREE.Mesh(new THREE.BoxGeometry(lw,o.height-.06,.04),mat);lf.castShadow=true;lf.position.set(dir*lw/2,(o.height-.06)/2,0);const piv=new THREE.Group();piv.position.set(G.x0+G.u[0]*hs-G.u[1]*sd*(w.thickness/2),e,G.z0+G.u[1]*hs+G.u[0]*sd*(w.thickness/2));
      const closedRot=ang, openR=ang+openRot; const start= (isEnt&&doorMode==='closed')?closedRot:openR;
      piv.rotation.y=start;piv.add(lf);piv.userData.noCol=true;
      if(isEnt){piv.userData.door={closed:closedRot,open:openR,u:doorMode==='closed'?0:1,cx:G.x0+G.u[0]*(a+b)/2,cz:G.z0+G.u[1]*(a+b)/2};doorPivs.push(piv);}
      root.add(piv);};
    const lw=o.width-.1;if(kd==='double'){leaf(a+.05,lw/2,1,-1.2*sd);leaf(b-.05,lw/2,-1,1.2*sd);}else if(kd==='sliding'){leaf(a+.05+lw*.45,lw*.55,1,0);}else{const R=o.hinge==='R';leaf(R?b-.05:a+.05,lw,R?-1:1,(R?1.3:-1.3)*sd);}}
   s=b;});box(w,s,L,e,e+h,M.wall);});
 if(!xs.length)return null;const fp=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];root.userData.fp=fp;
 const stairs=H.stairs||[];
 // Wet-room centers for tile floors
 const wet=[];(H.furn||[]).forEach(f=>{if(['bath','shower','wc','sink'].includes(f.t))wet.push(f.p);});
 const isWet=(cx,cz)=>wet.some(p=>Math.hypot(p[0]-cx,p[1]-cz)<1.15);
 H.levels.forEach((l,i)=>{const ws=H.walls.filter(w=>w.level===l.name);if(!ws.length)return;const hole=stairs.filter(st=>st.level===(H.levels[i-1]||{}).name).map(stairRect);
  const topH=Math.max(...ws.map(w=>w.height||l.height));
  cells(ws,hole).forEach(r=>{const cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2;
   const wetR=isWet(cx,cz);
   // BasicMaterial keeps oak/tile readable under ACES (Standard was washing to grey)
   const mat=new THREE.MeshBasicMaterial({color: wetR?0xe8e0d4:0xd4a05a, map:(wetR?tile:wood).clone(), toneMapped:false});
   mat.map.colorSpace=THREE.SRGBColorSpace; mat.map.repeat.set(wetR?1.5:1.8, wetR?1.5:1.8); mat.map.needsUpdate=true;
   const m=add(new THREE.BoxGeometry(r[2]-r[0],.06,r[3]-r[1]),mat,cx,l.elevation+.03+.001*i,cz);m.receiveShadow=false;m.userData.floor=1;
   const up=H.levels[i+1];if(!up){add(new THREE.BoxGeometry(r[2]-r[0],.05,r[3]-r[1]),M.ceil,cx,l.elevation+topH+.025,cz,0,1).userData.ceil=1;
    // warm ceiling disc light (emissive) + soft point
    if(Math.min(r[2]-r[0],r[3]-r[1])>1.6){const disc=add(new THREE.CylinderGeometry(.18,.18,.02,12),std({color:0xfff6e8,emissive:0xffe2b0,emissiveIntensity:1.15,roughness:.4}),cx,l.elevation+topH-.02,cz,0,1);disc.castShadow=false;disc.userData.ceil=1;disc.userData.noCol=true;
     const pl=new THREE.PointLight(0xffe2b0,1.65,Math.max(r[2]-r[0],r[3]-r[1])*1.55,1.8);pl.position.set(cx,l.elevation+topH-.15,cz);pl.userData.ceil=1;root.add(pl);}}});});
 M.wood2.color.set((STY[H.style]||{}).wood||'#d4b48a');(H.furn||[]).forEach(f=>{const l=lv[f.level];if(!l)return;const F=FUR[f.t];if(!F)return;const S=STY[H.style]||{};
  const g=makeFurn(f.t,F,{wood:(S.wood||'#d4b48a'),fab:S[f.t]||F.c,bed:S.bed||'#c4a882',rug:S.rug||'#c4a484'});
  g.position.set(f.p[0],l.elevation,f.p[1]);g.rotation.y=-((f.r||0)*Math.PI/2);g.userData.furn=f.t;g.userData.noCol=true;root.add(g);});
 // solid oak slab over whole footprint (guarantees readable floors from dollhouse + interior)
 if(xs.length&&zs.length){const fx0=Math.min(...xs),fx1=Math.max(...xs),fz0=Math.min(...zs),fz1=Math.max(...zs);
  const oak=new THREE.MeshBasicMaterial({color:0xd4a05a, map:wood.clone(), toneMapped:false});
  oak.map.colorSpace=THREE.SRGBColorSpace;oak.map.repeat.set(4,4);oak.map.needsUpdate=true;
  const slab=add(new THREE.BoxGeometry(fx1-fx0-.08,.04,fz1-fz0-.08),oak,(fx0+fx1)/2,.012,(fz0+fz1)/2,0,1);slab.receiveShadow=false;slab.userData.floor=1;}

 // plinth strip around footprint for grounding
 stairs.forEach(st=>{const l=lv[st.level],up=H.levels[H.levels.indexOf(l)+1];if(!l)return;const rise=up?up.elevation-l.elevation:l.height,n=Math.max(2,Math.round(rise/.18)),L=st.length||3.6,W=st.width||1,d=st.dir||0;
  for(let k=0;k<n;k++){const sx=(k+.5)*L/n;add(new THREE.BoxGeometry(L/n,(k+1)*rise/n,W),M.stair,st.pos[0]+Math.cos(d)*sx-Math.sin(d)*W/2,l.elevation+(k+1)*rise/n/2,st.pos[1]+Math.sin(d)*sx+Math.cos(d)*W/2,-d);}});
 const top=H.levels[H.levels.length-1],tw=H.walls.filter(w=>w.level===top.name),th=top.elevation+Math.max(...(tw.length?tw:H.walls).map(w=>w.height||2.8));
 // plinth: perimeter band only (never a solid slab — that covered oak floors)
 if(xs.length&&zs.length){const px0=Math.min(...xs),px1=Math.max(...xs),pz0=Math.min(...zs),pz1=Math.max(...zs);
  const t=.14,h=.16,y=h/2-.01,cx=(px0+px1)/2,cz=(pz0+pz1)/2,pw=px1-px0+t*2,pd=pz1-pz0+t*2;
  add(new THREE.BoxGeometry(pw,h,t),M.plinth,cx,y,pz0-t/2,0,1).userData.noCol=true;
  add(new THREE.BoxGeometry(pw,h,t),M.plinth,cx,y,pz1+t/2,0,1).userData.noCol=true;
  add(new THREE.BoxGeometry(t,h,pd-t*2),M.plinth,px0-t/2,y,cz,0,1).userData.noCol=true;
  add(new THREE.BoxGeometry(t,h,pd-t*2),M.plinth,px1+t/2,y,cz,0,1).userData.noCol=true;}
 // soft wall caps for dollhouse (hidden until doll mode)
 if(xs.length&&zs.length){H.walls.forEach(w=>{const g=geo(w),h=w.height||2.8,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0);if(e>0.2)return;
  const cap=add(new THREE.BoxGeometry(g.L,.04,w.thickness+.04),std({color:0xe8e4dc,roughness:.9}),g.x0+g.u[0]*g.L/2,e+h+.02,g.z0+g.u[1]*g.L/2,-Math.atan2(g.u[1],g.u[0]),1);
  cap.userData.cap=1;cap.userData.noCol=true;cap.visible=false;cap.castShadow=false;});}
 if(roof!=='none'){const o=.75,W=fp[2]-fp[0]+2*o,D=fp[3]-fp[1]+2*o,cx=(fp[0]+fp[2])/2,cz=(fp[1]+fp[3])/2;
  if(roof==='flat'){add(new THREE.BoxGeometry(W,.22,D),M.roof,cx,th+.16,cz,0,1).userData.roof=1;add(new THREE.BoxGeometry(W+.08,.06,D+.08),M.roof,cx,th+.3,cz,0,1).userData.roof=1;
   // gutter ring
   add(new THREE.BoxGeometry(W+.1,.06,.08),M.frame,cx,th+.02,fp[1]-o,0,1).userData.roof=1;add(new THREE.BoxGeometry(W+.1,.06,.08),M.frame,cx,th+.02,fp[3]+o,0,1).userData.roof=1;}
  else{const rh=Math.min(W,D)*.32,lng=W>=D,a=lng?W:D,b=lng?D:W,sh=new THREE.Shape([new THREE.Vector2(-b/2,0),new THREE.Vector2(b/2,0),new THREE.Vector2(0,rh)]),gm=new THREE.ExtrudeGeometry(sh,{depth:a,bevelEnabled:false});gm.translate(0,0,-a/2);
   add(gm,M.roof,cx,th+.05,cz,lng?Math.PI/2:0,1).userData.roof=1;
   // overhang fascia + gutter along eaves
   const eaveY=th+.08;add(new THREE.BoxGeometry(lng?a:b,.08,.1),M.frame,cx,eaveY,fp[1]-o*.7,0,1).userData.roof=1;add(new THREE.BoxGeometry(lng?a:b,.08,.1),M.frame,cx,eaveY,fp[3]+o*.7,0,1).userData.roof=1;
   add(new THREE.BoxGeometry(.08,.08,lng?b:a),M.frame,fp[0]-o*.7,eaveY,cz,0,1).userData.roof=1;add(new THREE.BoxGeometry(.08,.08,lng?b:a),M.frame,fp[2]+o*.7,eaveY,cz,0,1).userData.roof=1;}}
 // plot: muted lawn (plot only), soft ground, drive, terrace accents, trees, slim fence
 const P=H.plot;const xMinP=xs.length?Math.min(...xs)-6: -4,xMaxP=xs.length?Math.max(...xs)+6:20,zMinP=zs.length?Math.min(...zs)-6:-5,zMaxP=zs.length?Math.max(...zs)+6:15;
 // soft neighbouring ground (large disc under everything)
 {const gw=Math.max(40,xMaxP-xMinP+24),gd=Math.max(40,zMaxP-zMinP+24);const gnd=add(new THREE.CylinderGeometry(gw*.55,gw*.55,.04,48),M.ground,(xMinP+xMaxP)/2,-.04,(zMinP+zMaxP)/2,0,1);gnd.receiveShadow=true;gnd.castShadow=false;gnd.userData.noCol=true;}
 if(P&&P.pts&&P.pts.length>2){const sh=new THREE.Shape(P.pts.map(p=>new THREE.Vector2(p[0],-p[1])));const lg=new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2);const lm=new THREE.Mesh(lg,M.lawn);if(M.lawn.map)M.lawn.map.repeat.set(.35,.35);lm.position.y=-.01;lm.receiveShadow=true;lm.userData.noCol=true;root.add(lm);
  const zMin=Math.min(...P.pts.map(p=>p[1])),zMax=Math.max(...P.pts.map(p=>p[1])),xMin=Math.min(...P.pts.map(p=>p[0])),xMax=Math.max(...P.pts.map(p=>p[0]));
  const hx=(xs.length?(Math.min(...xs)+Math.max(...xs))/2: (xMin+xMax)/2), hz=zs.length?Math.min(...zs):zMin+2;
  // driveway with jointed paving
  // driveway on EAST side (away from west entrance) so walk-to-door stays clear
  const dLen=Math.max(4.5,hz-zMin+1.2),drive=add(new THREE.BoxGeometry(3.2,.025,dLen),M.path,hx+4.2,.008,(zMin+hz)/2-.1,0,1);drive.receiveShadow=true;drive.userData.noCol=true;
  // front path to door (center-west)
  add(new THREE.BoxGeometry(1.5,.02,Math.max(2.8,hz-zMin)),M.path,Math.min(...xs)+1.7,.01,(zMin+hz)/2,0,1).userData.noCol=true;
  // terrace (south / max z of house)
  const tw=Math.min(7.5,(xs.length?Math.max(...xs)-Math.min(...xs):6)-.6), terrZ=(zs.length?Math.max(...zs):zMax-2)+1.55;
  const terr=add(new THREE.BoxGeometry(tw,.035,2.8),M.path,hx,.018,terrZ,0,1);terr.receiveShadow=true;terr.userData.noCol=true;
  // terrace accents (lightweight)
  {const woodAcc=M.wood2||M.door;add(new THREE.BoxGeometry(1.5,.06,.75),woodAcc,hx-1.5,.28,terrZ+.15,0,1);
   [[-0.6,-0.25],[0.6,-0.25],[-0.6,0.25],[0.6,0.25]].forEach(([a,b])=>add(new THREE.BoxGeometry(.07,.4,.07),woodAcc,hx-1.5+a,.22,terrZ+.15+b,0,1));
   add(new THREE.BoxGeometry(.5,.05,.5),woodAcc,hx+1.6,.28,terrZ+.1,0,1);}
  // path lamps (2)
  const lamp=(x,z)=>{add(new THREE.CylinderGeometry(.04,.05,1.1,6),M.frame,x,.55,z,0,1);const cap=add(new THREE.SphereGeometry(.1,6,4),std({color:0xf5e6c8,roughness:.4,emissive:0x665533,emissiveIntensity:.35}),x,1.15,z,0,1);cap.castShadow=false;};
  lamp(hx-4.2,hz-1.5);lamp(hx+1.5,hz-1.2);
  // CC0-style low-poly car parked on east driveway (never on entrance path)
  {const car=makeCar('#6b7c88');car.position.set(hx+4.2,0,zMin+2.5);car.rotation.y=0;root.add(car);}
  // hedge soft strips (not walls)
  const hedgeMat=std({color:0x4a6340,roughness:1,map:grass});
  const mkHedge=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),ang=-Math.atan2(z1-z0,x1-x0);const m=add(new THREE.BoxGeometry(L,.7,.28),hedgeMat,(x0+x1)/2,.38,(z0+z1)/2,ang,1);m.castShadow=false;};
  mkHedge(xMin+.5,zMin+.5,xMin+.5,zMax-.5);mkHedge(xMax-.5,zMin+.5,xMax-.5,zMax-.5);mkHedge(xMin+.5,zMax-.5,xMax-.5,zMax-.5);
  // CC0-style trees/shrubs from kit
  const tree=(x,z,s=1)=>{const t=makeTree(s);t.position.set(x,0,z);root.add(t);};
  const shrub=(x,z,s=.5)=>{const t=makeShrub(s);t.position.set(x,0,z);root.add(t);};
  const seed=(a,b)=>{let h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
  const hx0=Math.min(...xs)-1,hx1=Math.max(...xs)+1,hz0=Math.min(...zs)-1,hz1=Math.max(...zs)+1;
  [[xMin+1.6,zMin+1.4,1.15],[xMax-1.7,zMin+1.6,.95],[xMin+1.9,zMax-1.6,1.25],[xMax-2.1,zMax-1.9,1.0],[xMin+3.2,zMin+2.4,.8],[xMax-3.8,zMax-2.8,1.1]].forEach(t=>{
   if(t[0]>hx0&&t[0]<hx1&&t[1]>hz0&&t[1]<hz1)return;tree(t[0],t[1],t[2]);});
  for(let i=0;i<8;i++){const t=seed(i,7),u=seed(i,19),x=xMin+1.2+(xMax-xMin-2.4)*t,z=zMin+1.2+(zMax-zMin-2.4)*u;
   if(x>hx0&&x<hx1&&z>hz0&&z<hz1)continue;shrub(x,z,.35+.28*seed(i,3));}
  // slim fence (less dominant)
  if(P.fence!==false){const gateX=(xs.length?Math.min(...xs):0)+1.7,gateW=1.4,zSouth=Math.min(...P.pts.map(p=>p[1]));
   P.pts.forEach((a,i)=>{const b=P.pts[(i+1)%P.pts.length],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1e-6,ang=-Math.atan2(b[1]-a[1],b[0]-a[0]),n=Math.max(1,Math.round(L/3.2));
   const onGate=t=>{const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;return Math.abs(z-zSouth)<0.4&&Math.abs(x-gateX)<gateW;};
   // rails as segments skipping the gate
   let u0=0;const pushRail=(u1)=>{if(u1-u0<0.015){u0=u1;return;}const mid=(u0+u1)/2,L2=L*(u1-u0);const mx=a[0]+(b[0]-a[0])*mid,mz=a[1]+(b[1]-a[1])*mid;
    add(new THREE.BoxGeometry(L2,.025,.025),M.fence,mx,.4,mz,ang,1);add(new THREE.BoxGeometry(L2,.025,.025),M.fence,mx,1.0,mz,ang,1);u0=u1;};
   for(let k=0;k<=Math.ceil(L/0.2);k++){const t=Math.min(1,k*0.2/L);if(onGate(t)){pushRail(t);u0=t;} if(t>=1)pushRail(1);}
   for(let k=0;k<=n;k++){const t=k/n;if(onGate(t))continue;add(new THREE.BoxGeometry(.045,1.15,.045),M.fence,a[0]+(b[0]-a[0])*t,.58,a[1]+(b[1]-a[1])*t,0,1);}
   for(let k=0;k<L/0.18;k++){const t=(k+.5)*.18/L;if(t>1||onGate(t))continue;add(new THREE.BoxGeometry(.015,.85,.015),M.fence,a[0]+(b[0]-a[0])*t,.62,a[1]+(b[1]-a[1])*t,0,1).castShadow=false;}});}}
 root.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&root.children.length>2500)o.castShadow=false;});
 return root;}
function fitSun(fp){lastFp=fp;const c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],r=Math.max(fp[2]-fp[0],fp[3]-fp[1])*.8+6,az=(sunH-12)*15*Math.PI/180,el=Math.max(.07,62*Math.PI/180*Math.cos((sunH-12)/8*Math.PI/2)),R2=r*1.8;sun.position.set(c[0]-Math.sin(az)*Math.cos(el)*R2,Math.sin(el)*R2,c[1]+Math.cos(az)*Math.cos(el)*R2);const k=Math.min(1,Math.max(.45,Math.sin(el)*2.0));sun.intensity=3.1*k;sun.color.setRGB(1,.78+.12*k,.55+.25*k);sun.target.position.set(c[0],0,c[1]);const sc=sun.shadow.camera;sc.left=sc.bottom=-r*1.2;sc.right=sc.top=r*1.2;sc.near=.5;sc.far=r*5;sc.updateProjectionMatrix();}
function place(inside,anim){if(!world)return;const fp=world.userData.fp,c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2];rig.position.set(0,0,0);rig.rotation.set(0,0,0);intro=null;
 if(R.xr.isPresenting||inside){rig.position.set(c[0],H.levels[0].elevation,c[1]);if(body){body.resolve(rig.position);}cam.position.set(0,R.xr.isPresenting?0:1.6,0);yaw=0;pitch=0;}
 else{cam.quaternion.identity();const el=R.domElement,ar=innerWidth/Math.max(1,innerHeight),S=Math.max(fp[2]-fp[0],fp[3]-fp[1],6)*(ar<1?Math.min(2,1/ar*.75):1),b=new THREE.Vector3(c[0]+S*.95,S*.75,c[1]+S*1.25);orb.target.set(c[0],1.2,c[1]);
  if(anim){const a=new THREE.Vector3(c[0]-S*1.6,S*2.2,c[1]+S*2.6);cam.position.copy(a);intro={a,b,t:0};}else cam.position.copy(b);orb.update();}}
export function setWalk(v,xr){DIRTY=Math.max(DIRTY,90);walk=v;orb.enabled=!v;$('joy').style.display=v&&!xr&&TCH?'block':'none';
 if(v||xr){finishGrow();world&&world.traverse(o=>{if(o.userData.roof)o.visible=false;if(o.userData.ceil)o.visible=true;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=true;});}
 else if(!DOLL){world&&world.traverse(o=>{if(o.userData.roof)o.visible=roof!=='none';if(o.userData.ceil)o.visible=false;});}
 place(v||xr);return walk;}
export function setRoof(r,smooth){DIRTY=Math.max(DIRTY,90);const prev=roof;roof=r;if(smooth&&world){if(r==='none'||DOLL){roofTgt=0;}else{roofTgt=1;world.traverse(o=>{if(o.userData.roof)o.visible=true;});} }else{roofTgt=(r==='none'||DOLL)?0:1;roofVis=roofTgt;}}
export const isWalk=()=>walk;
export function gen(h,anim){DIRTY=Math.max(DIRTY,90);H=h;init();doGrow=!!anim;if(world){scene.remove(world);world.traverse(o=>o.geometry&&o.geometry.dispose());}world=build();doGrow=false;if(!world)return false;scene.add(world);fitSun(world.userData.fp);
 const colRoot=new THREE.Group();world.updateMatrixWorld(true);world.traverse(o=>{if(o.isMesh&&!o.userData.noCol&&!(o.parent&&o.parent.userData.noCol)){const m=o.clone();m.matrixAutoUpdate=false;m.matrix.copy(o.matrixWorld);colRoot.add(m);}});colRoot.updateMatrixWorld(true);
 try{const col=colliderFromObject(colRoot);body=new Body(col,{radius:.18});if(!loco)loco=new Locomotion({renderer:R,rig,camera:cam,scene,body,speed:1.4,snapDeg:30});else loco.body=body;}catch(err){console.warn('kolízie',err);}
 walk=walk&&!anim;setWalk(walk);if(anim&&!walk){place(false,true);wallGrow={t:0,dur:2.6};DIRTY=Math.max(DIRTY,180);}else wallGrow=null;return true;}
export async function glb(){if(!world)return null;const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');return new Promise((res,rej)=>new GLTFExporter().parse(world,b=>res(new Blob([b],{type:'model/gltf-binary'})),rej,{binary:true}));}

export function snap(){if(!R)return null;R.render(scene,cam);return R.domElement.toDataURL('image/png');}

export function panoHere(W){return pano(rig.position.x,rig.position.z,rig.position.y,W,1);}
export function pano(x,z,e,W=4096,keep){if(!R)return null;if(!keep)jump(x,z,e);const rt=new THREE.WebGLCubeRenderTarget(W/4,{type:THREE.HalfFloatType});const cc=new THREE.CubeCamera(.05,300,rt);cc.position.set(x,e+1.55,z);scene.add(cc);cc.update(R,scene);scene.remove(cc);
 const qs=new THREE.Scene(),oc=new THREE.OrthographicCamera(-1,1,1,-1,0,1),mt=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture},yaw:{value:-yaw}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform samplerCube t;uniform float yaw;varying vec2 v;void main(){float lo=(v.x-.5)*6.2831853+yaw,la=(v.y-.5)*3.14159265;vec3 d=vec3(cos(la)*sin(lo),sin(la),-cos(la)*cos(lo));gl_FragColor=textureCube(t,d);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',toneMapped:true});
 qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mt));const pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),xr=R.xr.enabled;R.xr.enabled=false;R.setPixelRatio(1);R.setSize(W,W/2,false);R.render(qs,oc);const u=R.domElement.toDataURL('image/jpeg',.9);R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);R.xr.enabled=xr;rt.dispose();mt.dispose();DIRTY=Math.max(DIRTY,30);return u;}
export const STY={moderny:{sofa:'#5d6470',armch:'#2f3237',table:'#2b2b2b',ctable:'#2b2b2b',desk:'#3a3a3a',ward:'#ececea',kitch:'#2f3237',shelf:'#3a3a3a',bed:'#d6d6d2',chair:'#2f3237',wood:'#3b3b3b',art:'#6a7a88',curtain:'#d0d4d8'},skandi:{sofa:'#7a6854',armch:'#8f7a64',table:'#d4b48a',ctable:'#d4b48a',desk:'#e0c9a6',ward:'#f4f1ea',kitch:'#f7f5f0',shelf:'#d4b48a',chair:'#f1ece2',wood:'#d4b48a',art:'#c4b8a4',curtain:'#e8e2d6',shoe:'#d4b48a',rug:'#8a5a32'},klasik:{sofa:'#6b3f35',armch:'#8a5a3c',table:'#5a3a26',ctable:'#5a3a26',desk:'#6b4a30',ward:'#7a5a40',kitch:'#efe6d6',shelf:'#5a3a26',chair:'#7a5a40',wood:'#5a3a26'}};
export const FUR={bed:{w:1.6,d:2.05,h:.5,c:'#e9e4da'},bed1:{w:.9,d:2,h:.5,c:'#e9e4da'},sofa:{w:2.2,d:.95,h:.8,c:'#d9d2c6'},armch:{w:.85,d:.85,h:.8,c:'#e6ddd0'},table:{w:1.6,d:.9,h:.75,c:'#d4b48a'},ctable:{w:1.1,d:.6,h:.42,c:'#d4b48a'},desk:{w:1.2,d:.6,h:.75,c:'#e0c9a6'},tv:{w:1.8,d:.42,h:.5,c:'#3b3d40'},ward:{w:1.8,d:.62,h:2.2,c:'#f4f1ea'},kitch:{w:2.4,d:.62,h:.9,c:'#f7f5f0'},fridge:{w:.6,d:.65,h:1.85,c:'#dcdcdc'},bath:{w:1.7,d:.75,h:.55,c:'#ffffff'},shower:{w:.9,d:.9,h:.1,c:'#ffffff'},sink:{w:.6,d:.45,h:.85,c:'#ffffff'},wc:{w:.4,d:.65,h:.42,c:'#ffffff'},shelf:{w:.9,d:.35,h:1.8,c:'#d4b48a'},plant:{w:.45,d:.45,h:1.1,c:'#5b7d4a'},rug:{w:2.2,d:1.6,h:.02,c:'#c4a484'},lamp:{w:.35,d:.35,h:1.3,c:'#2f3235'},chair:{w:.45,d:.5,h:.9,c:'#f1ece2'},art:{w:.9,d:.04,h:.7,c:'#c4b8a4'},curtain:{w:1.4,d:.08,h:2.0,c:'#e8e2d6'},shoe:{w:1.0,d:.4,h:.7,c:'#d4b48a'}};
const FM={};function fm(c,soft){const k=c+(soft?'~f':'');return FM[k]||(FM[k]=new THREE.MeshStandardMaterial({color:c,roughness:soft?.85:.72,map:soft?fabric:null}));}
const FLO={dub:[0x8a5a28,'wood',.55],orech:[0x8a6448,'wood',.55],dlazba:[0xe6e2da,'tile',.35],beton:[0xb0aea8,'beton',.85],tmave:[0x5a4636,'wood',.6]};
export function setMat(o={}){DIRTY=Math.max(DIRTY,90);if(!M)return;M.wall.color.set(o.wall||'#f4f1ec');M.fac.color.set(o.fac||'#f7f5f0');M.roof.color.set(o.roof||'#a0a8b0');const f=FLO[o.floor||'dub']||FLO.dub;M.floor.map=f[1]==='wood'?wood:f[1]==='tile'?tile:f[1]==='beton'?beton:null;M.floor.color.setHex(f[0]);M.floor.roughness=f[2];M.floor.needsUpdate=true;if(M.floor.map){M.floor.map.colorSpace=THREE.SRGBColorSpace;M.floor.map.needsUpdate=true;}}
let sunH=16.5,lastFp=null,doorMode='open',doorPivs=[],mktGlass=false;
export function setDoorMode(mode){doorMode=(mode==='closed')?'closed':'open';DIRTY=Math.max(DIRTY,30);
  doorPivs.forEach(p=>{const d=p.userData.door;if(!d)return;d.u=doorMode==='closed'?0:1;p.rotation.y=doorMode==='closed'?d.closed:d.open;});}
export function setMktGlass(on){mktGlass=!!on;if(!M||!M.glass)return;DIRTY=Math.max(DIRTY,40);
  if(mktGlass){M.glass.opacity=.72;M.glass.color.setHex(0x7a92a8);M.glass.metalness=.35;M.glass.roughness=.12;M.glass.envMapIntensity=1.6;M.glass.needsUpdate=true;}
  else{M.glass.opacity=.3;M.glass.color.setHex(0xc5d8e8);M.glass.metalness=0;M.glass.roughness=.06;M.glass.envMapIntensity=1.15;M.glass.needsUpdate=true;}}
function doorTick(){if(doorMode!=='closed'||!doorPivs.length||!cam)return;
  const cp=new THREE.Vector3();cam.getWorldPosition(cp);
  doorPivs.forEach(p=>{const d=p.userData.door;if(!d)return;const dist=Math.hypot(cp.x-d.cx,cp.z-d.cz);
    // open smoothly within ~2.4m, fully open by 1.5m
    const tgt=dist<=1.5?1:dist>=2.4?0: (2.4-dist)/(2.4-1.5);
    d.u+=(tgt-d.u)*0.12; p.rotation.y=d.closed+(d.open-d.closed)*d.u; if(Math.abs(tgt-d.u)>.002)DIRTY=Math.max(DIRTY,4);});}
export function setSun(h,smooth){DIRTY=Math.max(DIRTY,90);if(smooth){sunTween={a:sunH,b:h,t:0,dur:1.8};}else{sunH=h;sunTween=null;if(lastFp)fitSun(lastFp);}}
export function jump(x,z,e){DIRTY=Math.max(DIRTY,90);if(!walk)setWalk(true);rig.position.set(x,e,z);if(body&&body.resolve)body.resolve(rig.position);cam.position.set(0,1.6,0);}

const WP=[M.wall,M.wall,M.wall,M.wall,M.fac,M.wall],WN=[M.wall,M.wall,M.wall,M.wall,M.wall,M.fac];
export function setAuto(v,spd){DIRTY=Math.max(DIRTY,90);if(!orb)return;orb.autoRotate=!!v;orb.autoRotateSpeed=spd!=null?spd:0.55;}
export function spin(d){DIRTY=Math.max(DIRTY,90);yaw+=d;}
