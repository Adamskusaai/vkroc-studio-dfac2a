// 3D view (lazy-loaded)
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {Body,Locomotion,colliderFromObject} from './vm.js';
import {loadKit,makeFurn,makeTree,makeShrub,makeCar} from './kit.js?v=20261111c';
const $=id=>document.getElementById(id),TCH=matchMedia('(pointer:coarse)').matches;
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
export function stopCam(){camPath=null;if(orb)orb.enabled=true;}
export function isDoll(){return DOLL;}
export const geo=w=>{const[x0,z0]=w.start,[x1,z1]=w.end,L=Math.hypot(x1-x0,z1-z0)||1e-9;return{x0,z0,L,u:[(x1-x0)/L,(z1-z0)/L]};};
export function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function tex(draw,n=256,rep=1){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=TCH?2:4;return t;}
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
const wood=tex((x,n)=>{for(let i=0;i<8;i++){const l=175+rnd()*22;x.fillStyle=`rgb(${(l+40)|0},${(l+18)|0},${(l-20)|0})`;x.fillRect(0,i*n/8,n,n/8+1);x.fillStyle='rgba(90,50,15,.35)';x.fillRect(0,i*n/8,n,2);for(let k=0;k<4;k++){x.fillStyle='rgba(70,40,10,.12)';x.fillRect(rnd()*n,i*n/8,1+rnd()*2,n/8);}}for(let i=0;i<400;i++){x.fillStyle=`rgba(120,70,30,${rnd()*.08})`;x.fillRect(rnd()*n,rnd()*n,2+rnd()*40,1);}},256,3);
const tile=tex((x,n)=>{x.fillStyle='#e8e4dc';x.fillRect(0,0,n,n);const g=n/4;x.strokeStyle='#c9c3b8';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*g,0);x.lineTo(i*g,n);x.stroke();x.beginPath();x.moveTo(0,i*g);x.lineTo(n,i*g);x.stroke();}for(let i=0;i<200;i++){x.fillStyle=`rgba(0,0,0,${rnd()*.04})`;x.fillRect(rnd()*n,rnd()*n,2,2);}},128,6);
const beton=tex((x,n)=>{x.fillStyle='#a8a69f';x.fillRect(0,0,n,n);for(let i=0;i<1800;i++){const v=140+rnd()*50;x.fillStyle=`rgba(${v|0},${v|0},${v-5|0},${.15+rnd()*.25})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*3,1+rnd()*2);}x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,n*.48,n,2);},128,8);
const fabric=tex((x,n)=>{x.fillStyle='#888';x.fillRect(0,0,n,n);for(let i=0;i<2500;i++){x.fillStyle=`rgba(${200+rnd()*40|0},${200+rnd()*40|0},${200+rnd()*40|0},${.08+rnd()*.12})`;x.fillRect(rnd()*n,rnd()*n,1.2,1.2);}},64,8);
const plaster=tex((x,n)=>{x.fillStyle='#f2efe8';x.fillRect(0,0,n,n);for(let i=0;i<900;i++){x.fillStyle=`rgba(0,0,0,${rnd()*.035})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,1+rnd()*2);}},128,4);
const grass=tex((x,n)=>{x.fillStyle='#6d7a58';x.fillRect(0,0,n,n);for(let i=0;i<4200;i++){const g=95+rnd()*55;x.fillStyle=`rgba(${(g*.62)|0},${g|0},${(g*.48)|0},${.35+rnd()*.35})`;x.fillRect(rnd()*n,rnd()*n,1+rnd()*2,2+rnd()*3);}for(let i=0;i<80;i++){x.fillStyle=`rgba(90,100,70,${.08+rnd()*.12})`;x.beginPath();x.ellipse(rnd()*n,rnd()*n,8+rnd()*18,5+rnd()*12,rnd()*3,0,6.3);x.fill();}},256);
const earth=tex((x,n)=>{x.fillStyle='#8a8478';x.fillRect(0,0,n,n);for(let i=0;i<3000;i++){const g=110+rnd()*40;x.fillStyle=`rgba(${g|0},${(g*.92)|0},${(g*.78)|0},.4)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},128,4);
const pave=tex((x,n)=>{x.fillStyle='#c9c2b4';x.fillRect(0,0,n,n);for(let i=0;i<n;i+=32){x.fillStyle='rgba(110,105,95,.28)';x.fillRect(i,0,1,n);x.fillRect(0,i,n,1);}for(let i=0;i<800;i++){const g=180+rnd()*40;x.fillStyle=`rgba(${g|0},${(g*.96)|0},${(g*.88)|0},.25)`;x.fillRect(rnd()*n,rnd()*n,2,2);}},256,2);
const roofTex=tex((x,n)=>{x.fillStyle='#7a848e';x.fillRect(0,0,n,n);for(let row=0;row<n;row+=16){const odd=((row/16)|0)%2;for(let col=odd?11:0;col<n;col+=22){x.fillStyle='#7e8792';x.fillRect(col+1,row+1,19,12);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(col+2,row+2,17,1);x.fillStyle='rgba(0,0,0,.42)';x.fillRect(col+1,row+11,19,2);x.fillStyle='rgba(0,0,0,.28)';x.fillRect(col+19,row+1,1,12);}x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,row+14,n,2);}},256,5);
roofTex.wrapS=roofTex.wrapT=THREE.RepeatWrapping;roofTex.repeat.set(5,3);roofTex.colorSpace=THREE.SRGBColorSpace;
const roofBump=tex((x,n)=>{x.fillStyle='#808080';x.fillRect(0,0,n,n);for(let row=0;row<n;row+=16){const odd=((row/16)|0)%2;for(let col=odd?11:0;col<n;col+=22){x.fillStyle='#b0b0b0';x.fillRect(col+1,row+1,19,10);x.fillStyle='#606060';x.fillRect(col+1,row+11,19,2);x.fillStyle='#505050';x.fillRect(col+19,row+1,1,12);}x.fillStyle='#404040';x.fillRect(0,row+14,n,2);}},256,5);
roofBump.wrapS=roofBump.wrapT=THREE.RepeatWrapping;roofBump.repeat.set(5,3);

const std=(o)=>new THREE.MeshStandardMaterial(o);
const CAPM=new THREE.MeshBasicMaterial({color:0x3a3d42,toneMapped:false}); // prem8: dark wall tops read clearly from above
const M={wall:std({color:0xf2ebe3,map:plaster,roughness:.9}),floor:std({map:wood,roughness:.55}),ceil:std({color:0xfaf6ef,roughness:1,emissive:0xd4c4a8,emissiveIntensity:.25}),
 glass:new THREE.MeshPhysicalMaterial({color:0xc5d8e8,transparent:true,opacity:.3,roughness:.06,metalness:0,envMapIntensity:1.15}),frame:std({color:0x2f3235,roughness:.45,metalness:.2}),
 door:std({color:0xe4e0d8,roughness:.5}),roof:std({map:roofTex,bumpMap:roofBump,bumpScale:1.8,color:0x9aa3ab,roughness:.72,metalness:.05}),stair:std({map:wood,roughness:.5}),lawn:std({map:grass,roughness:1,color:0xa8b888}),ground:std({map:grass,roughness:1,color:0xc4d0a4}),
 fac:std({color:0xf7f5f0,map:plaster,roughness:.95}),wood2:std({color:0x9b7653,map:wood,roughness:.55}),fence:std({color:0x4a4a48,roughness:.75,metalness:.05}),path:std({map:pave,color:0xcfc8bb,roughness:.92}),plinth:std({color:0x2f3135,roughness:.92}),
 tile:std({map:tile,roughness:.35}),beton:std({map:beton,roughness:.85}),fab:fabric};
if(M.roof.map)M.roof.map.repeat.set(6,6);if(M.lawn.map)M.lawn.map.repeat.set(.4,.4);if(M.path.map)M.path.map.repeat.set(2,2);if(M.tile.map)M.tile.map.repeat.set(2,2);if(M.floor.map)M.floor.map.repeat.set(3,3);
export function init(){if(inited)return;inited=true;loadKit().then(()=>DIRTY=Math.max(DIRTY,60)).catch(()=>{});
 R=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});R.setPixelRatio(PRMAX=Math.min(devicePixelRatio,TCH?1.5:2));R.xr.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.22;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;$('v3').appendChild(R.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xc5d4e0);scene.fog=new THREE.FogExp2(0xc5d4e0,.012);
 new RGBELoader().load('assets/cc0/hdri/kloppenheim_06_puresky_1k.hdr',t=>{t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=t;scene.environmentIntensity=1.05;
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
 R.xr.addEventListener('sessionstart',()=>{setWalk(false,true);loco&&loco.init&&loco.init();});R.xr.addEventListener('sessionend',()=>place(walk));
 const el=R.domElement;let lk=null;el.addEventListener('pointerdown',e=>{intro=null;if(walk&&!R.xr.isPresenting)lk=[e.clientX,e.clientY];});addEventListener('pointerup',()=>lk=null);
 el.addEventListener('pointermove',e=>{if(!lk)return;yaw+=(e.clientX-lk[0])*.005;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lk[1])*.004));lk=[e.clientX,e.clientY];});
 el.addEventListener('wheel',()=>intro=null,{passive:true});
 addEventListener('keydown',e=>keys[e.code]=1);addEventListener('keyup',e=>keys[e.code]=0);
 const J=$('joy'),K=J.firstElementChild;let jid=null;J.addEventListener('pointerdown',e=>{jid=e.pointerId;J.setPointerCapture(jid);jm(e);});J.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
 const je=()=>{jid=null;joy[0]=joy[1]=0;K.style.transform='';};J.addEventListener('pointerup',je);J.addEventListener('pointercancel',je);
 function jm(e){const r=J.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy[0]=x;joy[1]=y;K.style.transform=`translate(${x*35}px,${y*35}px)`;}
 R.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05),s=R.xr.getSession();if(!s&&(document.hidden||!$('vw').offsetWidth))return;if(wxObj)wxTick(dt,!!s);
  if(s&&loco)loco.update(dt,s.inputSources);else if(!s){if(walk)walkTick(dt);else{if(camPath)camPathTick(dt);else if(intro)introTick(dt);orb.update();}roofTweenTick(dt);if(sunTween)sunTweenTick(dt);if(wallGrow)wallGrowTick(dt);}
  if(!s){const k=cam.matrixWorld.elements.join()+rig.position.x+rig.position.z;if(k===LK&&DIRTY<=0&&!walk&&!camPath&&!sunTween&&!wallGrow&&!wxObj&&Math.abs(roofVis-roofTgt)<.01)return;if(k!==LK)DIRTY=Math.max(DIRTY,2);LK=k;DIRTY--;
   FT.push(dt);if(FT.length>90){const av=FT.reduce((a,b)=>a+b)/FT.length;FT=[];const pr=R.getPixelRatio();if(av>.028&&pr>1){R.setPixelRatio(Math.max(1,pr-.25));}else if(av<.014&&pr<PRMAX){R.setPixelRatio(Math.min(PRMAX,pr+.25));}}}
  R.render(scene,cam);});
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
function resetExterior(){finishGrow();DOLL=false;roofTgt=(roof==='none')?0:1;roofVis=roofTgt;if(!world)return;
 world.traverse(o=>{if(o.userData.roofP0)o.position.copy(o.userData.roofP0);if(o.userData.roof){o.visible=roof!=='none';if(o.material&&o.userData.roofMat){o.material.opacity=1;o.material.transparent=false;o.material.depthWrite=true;}}
  if(o.userData.ceil)o.visible=false;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=false;
  if(o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;}if(o.userData.doorLeaf)o.scale.y=1;
 });DIRTY=Math.max(DIRTY,90);}
function setDollViz(on){finishGrow();DOLL=!!on;roofTgt=on?0:1;roofVis=on?0:1;if(!world)return;
 // Adam: dollhouse keeps FULL-HEIGHT walls; only roof + ceilings removed
 world.traverse(o=>{if(o.userData.roofP0)o.position.copy(o.userData.roofP0);if(o.userData.roof){if(o.material&&!o.userData.roofMat){o.material=o.material.clone();o.userData.roofMat=1;}if(o.material){o.material.transparent=true;o.material.opacity=on?0:1;o.material.depthWrite=!on;}o.visible=!on;}
  if(o.userData.ceil)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=false;
  if(o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;}
  if(o.userData.doorLeaf)o.scale.y=1;
  if(o.userData.cap)o.visible=!!on; // prem8: dark wall tops in dollhouse
 });DIRTY=Math.max(DIRTY,90);}
/** Full-height walls + ceilings for interior/walk (never keep dollhouse cut). */
function setInteriorViz(){finishGrow();DOLL=false;roofTgt=0;roofVis=0;if(!world)return;
 world.traverse(o=>{if(o.userData.roofP0)o.position.copy(o.userData.roofP0);
  if(o.userData.wallCut){const{base,h}=o.userData.wallCut;o.scale.y=1;o.position.y=base+h/2;}
  if(o.userData.doorLeaf)o.scale.y=1;
  if(o.userData.roof){o.visible=false;if(o.material&&o.userData.roofMat){o.material.opacity=0;o.material.transparent=true;o.material.depthWrite=false;}}
  if(o.userData.ceil)o.visible=true;if(o.userData.cap)o.visible=false;if(o.isLight&&o.userData.ceil)o.visible=true;
 });DIRTY=Math.max(DIRTY,90);}

export function playCam(kind,speed=1,extra={}){startCam({kind,speed,...extra});}
/** Steep top-down over a room centre for marketing room crops. */
export function birdCam(x,z,h=9.5){
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

function walkTick(dt){let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy[1],r=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy[0];
 if(keys.ArrowLeft)yaw-=dt*1.8;if(keys.ArrowRight)yaw+=dt*1.8;const sp=1.6*dt*(keys.ShiftLeft?2:1),p=rig.position;
 if(f||r){p.x+=(Math.sin(yaw)*f+Math.cos(yaw)*r)*sp;p.z+=(-Math.cos(yaw)*f+Math.sin(yaw)*r)*sp;if(body)body.resolve(p);}
 if(body){const y=body.floor(p);if(y!==null)p.y=y;}cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));}
function cells(ws,stairsHole){const C=.1;let xs=[],zs=[];ws.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});const x0=Math.min(...xs)-.5,z0=Math.min(...zs)-.5,
 nx=Math.ceil((Math.max(...xs)+.5-x0)/C),nz=Math.ceil((Math.max(...zs)+.5-z0)/C),g=new Uint8Array(nx*nz);
 ws.forEach(w=>{const G=geo(w),n=Math.ceil(G.L/(C/2)),t=w.thickness/2+.06;for(let i=0;i<=n;i++){const s=i*G.L/n;for(let k=-t;k<=t;k+=C/2){const x=G.x0+G.u[0]*s-G.u[1]*k,z=G.z0+G.u[1]*s+G.u[0]*k,ix=((x-x0)/C)|0,iz=((z-z0)/C)|0;if(ix>=0&&iz>=0&&ix<nx&&iz<nz)g[iz*nx+ix]=1;}}});
 const q=[0];g[0]=2;while(q.length){const i=q.pop(),x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!g[j]){g[j]=2;q.push(j);}}}
 // prem8: label each enclosed room (4-connected interior component) so floors can follow room type
 const lab=new Int32Array(nx*nz);let nl=0;for(let i0=0;i0<nx*nz;i0++){if(g[i0]||lab[i0])continue;nl++;const st=[i0];lab[i0]=nl;while(st.length){const i=st.pop(),x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!g[j]&&!lab[j]){lab[j]=nl;st.push(j);}}}}
 const labelAt=(px,pz)=>{const ix=((px-x0)/C)|0,iz=((pz-z0)/C)|0;if(ix<0||iz<0||ix>=nx||iz>=nz)return 0;let L=lab[iz*nx+ix];if(L)return L;for(let r=1;r<4&&!L;r++)for(let dz=-r;dz<=r&&!L;dz++)for(let dx=-r;dx<=r&&!L;dx++){const X=ix+dx,Z=iz+dz;if(X>=0&&Z>=0&&X<nx&&Z<nz)L=lab[Z*nx+X];}return L;};
 const rects=[];for(let z=0;z<nz;z++){let s=-1,sl=0;for(let x=0;x<=nx;x++){const cx0=x0+x*C+C/2,cz=z0+z*C+C/2;const inH=stairsHole&&stairsHole.some(h=>cx0>h[0]&&cx0<h[2]&&cz>h[1]&&cz<h[3]);const v=x<nx&&g[z*nx+x]!==2&&!inH;const L=v?(lab[z*nx+x]||sl):0;
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
const RUGC={living:'#5d6872',bed:'#b08a7c',kids:'#8fa3b4'};
function roomKind(types){const has=t=>types.has(t);
 const kit=has('kitch')||has('fridge')||has('island');
 if(has('bath')||has('shower')||has('wc')||(has('sink')&&!kit&&!has('sofa')))return'wet';
 if(has('bed'))return'bed';if(has('bed1')||has('bunk')||has('toy'))return'kids';
 if(has('sofa')||has('tv')||has('table'))return'living';
 if(has('kitch')||has('fridge')||has('island'))return'kitchen';
 if(has('shoe')||has('coat')||has('bench')||has('runner'))return'hall';return'other';}
function build(){const root=new THREE.Group(),lv={};H.levels.forEach(l=>lv[l.name]=l);let xs=[],zs=[];doorPivs=[];
 const Rroof=(H&&H.roof)||roof; if(Rroof&&Rroof!==roof) roof=Rroof;
 const add=(geom,mat,x,y,z,ry=0,nc)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=mat!==M.glass;if(nc)m.userData.noCol=true;root.add(m);return m;};
 const box=(w,s0,s1,y0,y1,mat,t,tOff=0,nc)=>{if(s1-s0<.005||y1-y0<.005)return;if(mat===M.wall&&w._ext)mat=w._ext>0?WP:WN;const g=geo(w);t=t||w.thickness;const m=add(new THREE.BoxGeometry(s1-s0,y1-y0,t),mat,g.x0+g.u[0]*(s0+s1)/2-g.u[1]*tOff,y0+(y1-y0)/2,g.z0+g.u[1]*(s0+s1)/2+g.u[0]*tOff,-Math.atan2(g.u[1],g.u[0]),nc);const hh=y1-y0;
  // Only structural wall slabs get wallCut (dollhouse). Frames/doors/glass must never — they caused ghost windows in GLB/Blender.
  const isWallMat=mat===M.wall||mat===M.fac||mat===M.plinth||mat===WP||mat===WN||(Array.isArray(mat)&&(mat.includes(M.wall)||mat.includes(M.fac)));
  if(hh>0.4&&isWallMat){m.userData.wallCut={base:y0,h:hh};}
  if(doGrow&&isWallMat){m.userData.grow=1;m.userData.growBase=y0;m.userData.growH=hh;m.scale.y=.001;m.position.y=y0;m.visible=false;}return m;};
 H.walls.forEach(w=>{const L=geo(w).L,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0),h=w.height||2.8;xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);
  const ops=[...(w.openings||[])].sort((a,b)=>a.offset-b.offset);let s=0;
  ops.forEach(o=>{const sl=o.sill||0,a=o.offset,b=a+o.width,f=.06;box(w,s,a,e,e+h,M.wall);box(w,a,b,e,e+sl,M.wall);box(w,a,b,e+sl+o.height,e+h,M.wall);
   if(o.type==='window'){box(w,a,b,e+sl+f,e+sl+o.height-f,M.glass,.02,0,1);box(w,a,b,e+sl,e+sl+f,M.frame,.1);box(w,a,b,e+sl+o.height-f,e+sl+o.height,M.frame,.1);box(w,a,a+f,e+sl,e+sl+o.height,M.frame,.1);box(w,b-f,b,e+sl,e+sl+o.height,M.frame,.1);box(w,(a+b)/2-.02,(a+b)/2+.02,e+sl,e+sl+o.height,M.frame,.07,0,1);
    // exterior sill
    box(w,a-.02,b+.02,e+sl-.04,e+sl,M.frame,w.thickness+.08,0,1);}
   else{box(w,a,a+.06,e,e+o.height,M.frame,w.thickness+.04);box(w,b-.06,b,e,e+o.height,M.frame,w.thickness+.04);box(w,a,b,e+o.height-.06,e+o.height,M.frame,w.thickness+.04);box(w,a-.02,b+.02,e,e+.04,M.frame,w.thickness+.1,0,1);
    const G=geo(w),ang=-Math.atan2(G.u[1],G.u[0]),sd=o.out?-1:1,kd=o.kind||'single',mat=kd==='entrance'?M.frame:M.door;
    const isEnt=kd==='entrance'||(o.type==='door'&&o.out&&o.kind!=='sliding');
    const leaf=(hs,lw,dir,openRot)=>{const lf=new THREE.Mesh(new THREE.BoxGeometry(lw,o.height-.06,.04),mat);lf.castShadow=true;lf.position.set(dir*lw/2,(o.height-.06)/2,0);const piv=new THREE.Group();piv.position.set(G.x0+G.u[0]*hs-G.u[1]*sd*(w.thickness/2),e,G.z0+G.u[1]*hs+G.u[0]*sd*(w.thickness/2));
      const closedRot=ang, openR=ang+openRot; const start= (isEnt&&doorMode==='closed')?closedRot:openR;
      piv.rotation.y=start;piv.add(lf);piv.userData.noCol=true;
      piv.userData.doorLeaf=1;piv.userData.doorH=o.height||2.05;
      if(isEnt){piv.userData.door={closed:closedRot,open:openR,u:doorMode==='closed'?0:1,cx:G.x0+G.u[0]*(a+b)/2,cz:G.z0+G.u[1]*(a+b)/2};doorPivs.push(piv);}
      root.add(piv);};
    const lw=o.width-.1,oa=(o.open!=null?o.open:90)*Math.PI/180;if(kd==='double'){leaf(a+.05,lw/2,1,-oa*sd);leaf(b-.05,lw/2,-1,oa*sd);}else if(kd==='sliding'){leaf(a+.05+lw*.45,lw*.55,1,0);}else{const R=o.hinge==='R';leaf(R?b-.05:a+.05,lw,R?-1:1,(R?1:-1)*oa*sd);}}
   s=b;});box(w,s,L,e,e+h,M.wall);});
 if(!xs.length)return null;const fp=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];root.userData.fp=fp;
 const stairs=H.stairs||[];
 // prem8: floors follow room type (living oak, bedroom herringbone, kids birch, bath/wc grey tile, hall stone, kitchen tile)
 const FMAT={};const floorMat=(kind,rw,rd)=>{const R=ROOMFLOOR[kind]||ROOMFLOOR.other;const k=kind+'|'+rw.toFixed(2)+'|'+rd.toFixed(2);if(FMAT[k])return FMAT[k];
  const base=R[1]==='oak'?wood:floorTex(R[1]);const mt=new THREE.MeshBasicMaterial({color:R[0],map:base.clone(),toneMapped:false});mt.map.colorSpace=THREE.SRGBColorSpace;mt.map.repeat.set(Math.max(.3,rw/R[2]),Math.max(.3,rd/R[2]));mt.map.needsUpdate=true;return FMAT[k]=mt;};
 roomKinds={};
 H.levels.forEach((l,i)=>{const ws=H.walls.filter(w=>w.level===l.name);if(!ws.length)return;const hole=stairs.filter(st=>st.level===(H.levels[i-1]||{}).name).map(stairRect);
  const topH=Math.max(...ws.map(w=>w.height||l.height));
  const CR=cells(ws,hole),byL={};(H.furn||[]).filter(f=>f.level===l.name).forEach(f=>{const L=CR.labelAt(f.p[0],f.p[1]);if(!L)return;(byL[L]=byL[L]||{t:new Set(),k:[]}).t.add(f.t);if(['kitch','fridge','island','stool'].includes(f.t))byL[L].k.push(f);});
  const kindOf={};Object.keys(byL).forEach(L=>kindOf[L]=roomKind(byL[L].t));roomKinds[l.name]={labelAt:CR.labelAt,kindOf};
  CR.forEach(r=>{const cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2;
   const kind=kindOf[r[4]]||'other';const mat=floorMat(kind,r[2]-r[0],r[3]-r[1]);
const m=add(new THREE.BoxGeometry(r[2]-r[0],.06,r[3]-r[1]),mat,cx,l.elevation+.03+.001*i,cz);m.receiveShadow=false;m.userData.floor=1;
   const up=H.levels[i+1];if(!up){add(new THREE.BoxGeometry(r[2]-r[0],.05,r[3]-r[1]),M.ceil,cx,l.elevation+topH+.025,cz,0,1).userData.ceil=1;
    // warm ceiling disc light (emissive) + soft point
    if(Math.min(r[2]-r[0],r[3]-r[1])>1.6){const disc=add(new THREE.CylinderGeometry(.26,.26,.012,16),std({color:0xe8dcc8,emissive:0xb89a70,emissiveIntensity:0.02,roughness:.98}),cx,l.elevation+topH-.03,cz,0,1);disc.scale.set(1,1,1);disc.castShadow=false;disc.userData.ceil=1;disc.userData.noCol=true;
     const pl=new THREE.PointLight(0xffd4a0,0.16,Math.max(r[2]-r[0],r[3]-r[1])*1.15,2);pl.position.set(cx,l.elevation+topH-.22,cz);pl.userData.ceil=1;root.add(pl);}}});});
 // prem8: kitchen tile zone inside open-plan living (bbox of kitchen pieces + 0.9 m working aisle)
 H.levels.forEach(l=>{const RK=roomKinds[l.name];if(!RK)return;const grp={};(H.furn||[]).filter(f=>f.level===l.name&&['kitch','fridge','island'].includes(f.t)).forEach(f=>{const L=RK.labelAt(f.p[0],f.p[1]);if(L&&RK.kindOf[L]==='living')(grp[L]=grp[L]||[]).push(f);});
  Object.values(grp).forEach(fs=>{let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;fs.forEach(f=>{const F=FUR[f.t]||{w:1,d:1},rot=(f.r||0)%2,w=rot?F.d:F.w,d=rot?F.w:F.d;x0=Math.min(x0,f.p[0]-w/2);x1=Math.max(x1,f.p[0]+w/2);z0=Math.min(z0,f.p[1]-d/2);z1=Math.max(z1,f.p[1]+d/2);});
   x0-=.9;z0-=.9;x1+=.9;z1+=.9;const fp0=root.userData.fp;x0=Math.max(x0,fp0[0]+.16);z0=Math.max(z0,fp0[1]+.16);x1=Math.min(x1,fp0[2]-.16);z1=Math.min(z1,fp0[3]-.16);if(x1-x0<.5||z1-z0<.5)return;
   const m=add(new THREE.BoxGeometry(x1-x0,.004,z1-z0),floorMat('kitchen',x1-x0,z1-z0),(x0+x1)/2,l.elevation+.0625,(z0+z1)/2,0,1);m.receiveShadow=false;m.castShadow=false;m.userData.floor=1;});});
 M.wood2.color.set((STY[H.style]||{}).wood||'#d4b48a');(H.furn||[]).forEach(f=>{const l=lv[f.level];if(!l)return;let F=FUR[f.t];if(!F)return;if(f.w&&f.d)F={...F,w:f.w,d:f.d};if(f.nu)F={...F,nu:1};const S=STY[H.style]||{};
  const RK=roomKinds[f.level],rk=RK?RK.kindOf[RK.labelAt(f.p[0],f.p[1])]:null;
  if(f.t==='rug'&&(rk==='bed'||rk==='kids')&&F.w>2.6)F=rk==='bed'?{...F,w:2.6,d:2.4}:{...F,w:2.0,d:1.4}; // prem8: room-sized rugs keep floors visible
  const rugC=(f.t==='rug'&&rk&&RUGC[rk]&&H.style==='skandi')?RUGC[rk]:(S.rug||'#c4a484');
  const g=makeFurn(f.t,F,{wood:(S.wood||'#d4b48a'),fab:f.c||(f.t==='rug'?rugC:(S[f.t]||F.c)),bed:f.cb||S.bed||'#c4a882',rug:f.c||rugC,curtain:S.curtain||'#b8a890'});
  g.position.set(f.p[0],l.elevation,f.p[1]);g.rotation.y=-((f.r||0)*Math.PI/2);g.userData.furn=f.t;g.userData.noCol=true;root.add(g);});
 // solid oak slab over whole footprint (guarantees readable floors from dollhouse + interior)
 if(xs.length&&zs.length){const fx0=Math.min(...xs),fx1=Math.max(...xs),fz0=Math.min(...zs),fz1=Math.max(...zs);
  const oak=new THREE.MeshBasicMaterial({color:0xd2bea0, map:wood.clone(), toneMapped:false});
  oak.map.colorSpace=THREE.SRGBColorSpace;oak.map.repeat.set(4,4);oak.map.needsUpdate=true;
  const slab=add(new THREE.BoxGeometry(Math.max(1,fx1-fx0-.55),.04,Math.max(1,fz1-fz0-.55)),oak,(fx0+fx1)/2,.008,(fz0+fz1)/2,0,1);slab.receiveShadow=false;slab.userData.floor=1;}

 // plinth strip around footprint for grounding
 stairs.forEach(st=>{const l=lv[st.level],up=H.levels[H.levels.indexOf(l)+1];if(!l)return;const rise=up?up.elevation-l.elevation:l.height,n=Math.max(2,Math.round(rise/.18)),L=st.length||3.6,W=st.width||1,d=st.dir||0;
  for(let k=0;k<n;k++){const sx=(k+.5)*L/n;add(new THREE.BoxGeometry(L/n,(k+1)*rise/n,W),M.stair,st.pos[0]+Math.cos(d)*sx-Math.sin(d)*W/2,l.elevation+(k+1)*rise/n/2,st.pos[1]+Math.sin(d)*sx+Math.cos(d)*W/2,-d);}});
 const top=H.levels[H.levels.length-1],tw=H.walls.filter(w=>w.level===top.name),th=top.elevation+Math.max(...(tw.length?tw:H.walls).map(w=>w.height||2.8));
 // plinth: dark grey band on exterior face only (never solid fill over floors)
 if(xs.length&&zs.length){const px0=Math.min(...xs),px1=Math.max(...xs),pz0=Math.min(...zs),pz1=Math.max(...zs);
  const t=.28,h=.38,y=h/2-.02,cx=(px0+px1)/2,cz=(pz0+pz1)/2,pw=px1-px0+.2,pd=pz1-pz0+.2;
  // prem8: the band stops at exterior door openings (no 38 cm step in the doorway, leaves swing clear)
  const gaps=(hz,c)=>{const G=[];H.walls.forEach(w=>{const g=geo(w);const on=hz?Math.abs(g.u[1])<.01&&Math.abs(w.start[1]-c)<.05:Math.abs(g.u[0])<.01&&Math.abs(w.start[0]-c)<.05;if(!on)return;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const p0=hz?g.x0+g.u[0]*o.offset:g.z0+g.u[1]*o.offset,p1=hz?g.x0+g.u[0]*(o.offset+o.width):g.z0+g.u[1]*(o.offset+o.width);G.push([Math.min(p0,p1)-.02,Math.max(p0,p1)+.02]);});});return G.sort((a,b)=>a[0]-b[0]);};
  const band=(hz,c,a0,a1,off)=>{let s0=a0;for(const[g0,g1]of[...gaps(hz,c),[a1,a1]]){const e0=Math.min(g0,a1);if(e0-s0>.02){const m=(s0+e0)/2,L=e0-s0;hz?add(new THREE.BoxGeometry(L,h,t),M.plinth,m,y,c+off,0,1).userData.noCol=true:add(new THREE.BoxGeometry(t,h,L),M.plinth,c+off,y,m,0,1).userData.noCol=true;}s0=Math.max(s0,g1);}};
  band(1,pz0,cx-(pw+.4)/2,cx+(pw+.4)/2,-t/2);band(1,pz1,cx-(pw+.4)/2,cx+(pw+.4)/2,t/2);band(0,px0,cz-pd/2,cz+pd/2,-t/2);band(0,px1,cz-pd/2,cz+pd/2,t/2);}
 // soft wall caps for dollhouse (hidden until doll mode)
 if(xs.length&&zs.length){H.walls.forEach(w=>{const g=geo(w),h=w.height||2.8,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0);if(e>0.2)return;
  const cap=add(new THREE.BoxGeometry(g.L,.04,w.thickness+.04),CAPM,g.x0+g.u[0]*g.L/2,e+h+.02,g.z0+g.u[1]*g.L/2,-Math.atan2(g.u[1],g.u[0]),1);
  cap.userData.cap=1;cap.userData.capY=cap.position.y;cap.userData.noCol=true;cap.visible=false;cap.castShadow=false;});}
 if(roof!=='none'){const eave=.40; // ~0.4 m overhang past wall outer face
  const houseW=fp[2]-fp[0], houseD=fp[3]-fp[1];
  const W=houseW+2*eave, D=houseD+2*eave, cx=(fp[0]+fp[2])/2, cz=(fp[1]+fp[3])/2;
  if(roof==='flat'){add(new THREE.BoxGeometry(W,.22,D),M.roof,cx,th+.16,cz,0,1).userData.roof=1;add(new THREE.BoxGeometry(W+.08,.06,D+.08),M.roof,cx,th+.3,cz,0,1).userData.roof=1;
   add(new THREE.BoxGeometry(W+.1,.06,.08),M.frame,cx,th+.02,fp[1]-eave,0,1).userData.roof=1;add(new THREE.BoxGeometry(W+.1,.06,.08),M.frame,cx,th+.02,fp[3]+eave,0,1).userData.roof=1;}
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
      const mesh=new THREE.Mesh(g, gMat);
      mesh.userData.roof=1; mesh.userData.noCol=true; mesh.castShadow=true;
      const out=along/2+0.015; // just outside Extrude end face
      if(lng){ mesh.rotation.y=atNeg?Math.PI/2:-Math.PI/2; mesh.position.set(cx+(atNeg?-out:out), ry, cz); }
      else { mesh.rotation.y=atNeg?Math.PI:0; mesh.position.set(cx, ry, cz+(atNeg?-out:out)); }
      root.add(mesh);
    };
    gable(true); gable(false);}
  }}
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
  // prem8: outward frames of the entrance / terrace doors (door centre, outward normal, along-wall)
  const hcx=(Math.min(...xs)+Math.max(...xs))/2,hcz=(Math.min(...zs)+Math.max(...zs))/2;const dOut=k=>{let r=null;(H.walls||[]).forEach(w=>{(w.openings||[]).forEach(op=>{if(r||op.type!=='door'||op.kind!==k)return;const g=geo(w),m=op.offset+op.width/2,cx=g.x0+g.u[0]*m,cz=g.z0+g.u[1]*m;let nx=-g.u[1],nz=g.u[0];if(nx*(cx-hcx)+nz*(cz-hcz)<0){nx=-nx;nz=-nz;}r={cx,cz,nx,nz,ux:g.u[0],uz:g.u[1],w:op.width,t:w.thickness||.3};});});return r;};
  const ENT=dOut('entrance'),TER=dOut('terrace');
  // distance from a door to the plot edge along its outward normal
  const toEdge=D=>{const tx=D.nx>0?(xMax-D.cx)/D.nx:D.nx<0?(xMin-D.cx)/D.nx:1e9,tz=D.nz>0?(zMax-D.cz)/D.nz:D.nz<0?(zMin-D.cz)/D.nz:1e9;return Math.max(1.5,Math.min(tx,tz));};
  if(ENT&&Math.abs(ENT.nx)>.9){// path to a door on an east/west facade
   const Lp=toEdge(ENT)-.1;add(new THREE.BoxGeometry(Lp,.02,1.5),M.path,ENT.cx+ENT.nx*(ENT.t/2+Lp/2),.01,ENT.cz,0,1).userData.noCol=true;}
  else if(ENT){const Lp=toEdge(ENT)-.1;add(new THREE.BoxGeometry(1.5,.02,Lp),M.path,ENT.cx,.01,ENT.cz+ENT.nz*(ENT.t/2+Lp/2),0,1).userData.noCol=true;}
  else // front path to door (center-west)
  add(new THREE.BoxGeometry(1.5,.02,Math.max(2.8,hz-zMin)),M.path,Math.min(...xs)+1.7,.01,(zMin+hz)/2,0,1).userData.noCol=true;
  // terrace (south / max z of house)
  const tw=Math.min(7.5,(xs.length?Math.max(...xs)-Math.min(...xs):6)-.6), terrZ=(zs.length?Math.max(...zs):zMax-2)+1.55;
  let terr;if(TER){// slab in front of the terrace door, shifted away from the entrance
   const tl=4.6,dp=2.9;let sh=tl/2-.7;if(ENT){const se=(ENT.cx-TER.cx)*TER.ux+(ENT.cz-TER.cz)*TER.uz;if(se>0)sh=-sh;}
   const cx=TER.cx+TER.nx*(TER.t/2+dp/2)+TER.ux*sh,cz=TER.cz+TER.nz*(TER.t/2+dp/2)+TER.uz*sh,ew=Math.abs(TER.nx)>.9;
   terr=add(new THREE.BoxGeometry(ew?dp:tl,.035,ew?tl:dp),M.path,cx,.018,cz,0,1);}
  else terr=add(new THREE.BoxGeometry(tw,.035,2.8),M.path,hx,.018,terrZ,0,1);terr.receiveShadow=true;terr.userData.noCol=true;
  // terrace accents (lightweight)
  if(!(H.furn||[]).some(f=>f.t==='otable'))
  {const woodAcc=M.wood2||M.door;add(new THREE.BoxGeometry(1.5,.06,.75),woodAcc,hx-1.5,.28,terrZ+.15,0,1);
   [[-0.6,-0.25],[0.6,-0.25],[-0.6,0.25],[0.6,0.25]].forEach(([a,b])=>add(new THREE.BoxGeometry(.07,.4,.07),woodAcc,hx-1.5+a,.22,terrZ+.15+b,0,1));
   add(new THREE.BoxGeometry(.5,.05,.5),woodAcc,hx+1.6,.28,terrZ+.1,0,1);}
  // path lamps (2)
  const lamp=(x,z)=>{add(new THREE.CylinderGeometry(.04,.05,1.1,6),M.frame,x,.55,z,0,1);const cap=add(new THREE.SphereGeometry(.1,6,4),std({color:0xf5e6c8,roughness:.4,emissive:0x665533,emissiveIntensity:.35}),x,1.15,z,0,1);cap.castShadow=false;};
  lamp(hx-4.2,hz-1.5);lamp(hx+1.5,hz-1.2);
  // car removed (prem7) — driveway kept clear
  // hedge soft strips (not walls)
  const hedgeMat=std({color:0x4a6340,roughness:1,map:grass});
  const mkHedge=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),ang=-Math.atan2(z1-z0,x1-x0);const m=add(new THREE.BoxGeometry(L,.7,.28),hedgeMat,(x0+x1)/2,.38,(z0+z1)/2,ang,1);m.castShadow=false;};
  mkHedge(xMin+.5,zMin+.5,xMin+.5,zMax-.5);mkHedge(xMax-.5,zMin+.5,xMax-.5,zMax-.5);mkHedge(xMin+.5,zMax-.5,xMax-.5,zMax-.5);
  // CC0-style trees/shrubs from kit
  const tree=(x,z,s=1)=>{const t=makeTree(s);t.position.set(x,0,z);root.add(t);};
  const shrub=(x,z,s=.5)=>{const t=makeShrub(s);t.position.set(x,0,z);root.add(t);};
  const seed=(a,b)=>{let h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
  const hx0=Math.min(...xs)-1,hx1=Math.max(...xs)+1,hz0=Math.min(...zs)-1,hz1=Math.max(...zs)+1;
  [[xMin+2.8,zMax-2.4,1.05],[xMax-2.8,zMax-2.6,1.0],[xMax-2.2,hz0+1.8,.9]].forEach(t=>{
   if(t[0]>hx0&&t[0]<hx1&&t[1]>hz0&&t[1]<hz1)return;if([ENT,TER].some(D=>{if(!D)return false;const tt=(t[0]-D.cx)*D.nx+(t[1]-D.cz)*D.nz,la=Math.abs((t[0]-D.cx)*D.ux+(t[1]-D.cz)*D.uz);return tt>0&&tt<9&&la<(D===TER?3.4:2.2);}))return;tree(t[0],t[1],t[2]);});
  // surrounding context: distant tree line + neighbour silhouettes (hides empty green field)
  {const sil=std({color:0x8a9488,roughness:1});
   [[-18,8,1.2],[-16,-6,1.0],[28,4,1.3],[26,-8,0.9],[8,-22,1.1],[-6,24,1.0],[22,22,1.2]].forEach(([x,z,s])=>tree(x,z,s));
   // low neighbour massing (simple boxes)
   [[-14,6,8,3.5,7],[-12,-10,6,3.2,9],[-26,18,9,3.8,8],[34,20,7,3.0,10]].forEach(([x,z,ww,hh,dd])=>{
    const m=add(new THREE.BoxGeometry(ww,hh,dd),sil,x,hh/2,z,0,1);m.castShadow=false;m.receiveShadow=false;
    add(new THREE.BoxGeometry(ww+.4,.15,dd+.4),std({color:0x3a3e44,roughness:.85}),x,hh+.05,z,0,1).castShadow=false;
   });
   // horizon hedge band
   const hm=std({color:0x5a6e4a,roughness:1,map:grass});
   [[0,-28,50,.9],[0,30,55,.8],[-28,0,.9,45],[32,2,.9,48]].forEach(([x,z,ww,dd])=>{
    const m=add(new THREE.BoxGeometry(ww,1.1,dd),hm,x,.5,z,0,1);m.castShadow=false;
   });
  }
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
function fitSun(fp){lastFp=fp;const c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],r=Math.max(fp[2]-fp[0],fp[3]-fp[1])*.8+6,az=(sunH-11.75)/5.25*63*Math.PI/180,el=Math.max(.035,sunEl(sunH)),R2=r*1.8;// Nov arc: rises ESE (~117°), noon S at ~22°, sets WSW (~243°)
sun.position.set(c[0]-Math.sin(az)*Math.cos(el)*R2,Math.sin(el)*R2,c[1]+Math.cos(az)*Math.cos(el)*R2);const k=Math.min(1,.55+Math.sin(el)*1.3);sun.intensity=3.1*k*SUNK;if(ATM.h==null)sun.color.setRGB(1,.78+.12*k,.55+.25*k);sun.target.position.set(c[0],0,c[1]);const sc=sun.shadow.camera;sc.left=sc.bottom=-r*1.2;sc.right=sc.top=r*1.2;sc.near=.5;sc.far=r*5;sc.updateProjectionMatrix();}
function place(inside,anim){if(!world)return;const fp=world.userData.fp,c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2];rig.position.set(0,0,0);rig.rotation.set(0,0,0);intro=null;
 if(R.xr.isPresenting||inside){rig.position.set(c[0],H.levels[0].elevation,c[1]);if(body){body.resolve(rig.position);}cam.position.set(0,R.xr.isPresenting?0:1.6,0);yaw=0;pitch=0;}
 else{cam.quaternion.identity();const el=R.domElement,ar=innerWidth/Math.max(1,innerHeight),S=Math.max(fp[2]-fp[0],fp[3]-fp[1],6)*(ar<1?Math.min(2,1/ar*.75):1),b=new THREE.Vector3(c[0]+S*.95,S*.75,c[1]+S*1.25);orb.target.set(c[0],1.2,c[1]);
  if(anim){const a=new THREE.Vector3(c[0]-S*1.6,S*2.2,c[1]+S*2.6);cam.position.copy(a);intro={a,b,t:0};}else cam.position.copy(b);orb.update();}}
export function setWalk(v,xr){DIRTY=Math.max(DIRTY,90);walk=v;orb.enabled=!v;$('joy').style.display=v&&!xr&&TCH?'block':'none';
 if(v||xr){setInteriorViz();}
 else if(!DOLL){world&&world.traverse(o=>{if(o.userData.roof)o.visible=roof!=='none';if(o.userData.ceil)o.visible=false;});}
 place(v||xr);return walk;}
export function setRoof(r,smooth){DIRTY=Math.max(DIRTY,90);const prev=roof;roof=r;if(smooth&&world){if(r==='none'||DOLL){roofTgt=0;}else{roofTgt=1;world.traverse(o=>{if(o.userData.roof)o.visible=true;});} }else{roofTgt=(r==='none'||DOLL)?0:1;roofVis=roofTgt;}}
export const isWalk=()=>walk;
export function gen(h,anim){DIRTY=Math.max(DIRTY,90);H=h;init();doGrow=!!anim;if(world){scene.remove(world);world.traverse(o=>o.geometry&&o.geometry.dispose());}world=build();doGrow=false;if(!world)return false;scene.add(world);fitSun(world.userData.fp);nightLights();if(wxObj)makeWx();
 const colRoot=new THREE.Group();world.updateMatrixWorld(true);world.traverse(o=>{if(o.isMesh&&!o.userData.noCol&&!(o.parent&&o.parent.userData.noCol)){const m=o.clone();m.matrixAutoUpdate=false;m.matrix.copy(o.matrixWorld);colRoot.add(m);}});colRoot.updateMatrixWorld(true);
 try{const col=colliderFromObject(colRoot);body=new Body(col,{radius:.18});if(!loco)loco=new Locomotion({renderer:R,rig,camera:cam,scene,body,speed:1.4,snapDeg:30});else loco.body=body;}catch(err){console.warn('kolízie',err);}
 walk=walk&&!anim;setWalk(walk);if(anim&&!walk){place(false,true);wallGrow={t:0,dur:2.6};DIRTY=Math.max(DIRTY,180);}else wallGrow=null;return true;}
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

export function snap(){if(!R)return null;R.render(scene,cam);return R.domElement.toDataURL('image/png');}

export function panoHere(W){return pano(rig.position.x,rig.position.z,rig.position.y,W,1);}
export function pano(x,z,e,W=4096,keep){if(!R)return null;if(!keep)jump(x,z,e);const rt=new THREE.WebGLCubeRenderTarget(W/4,{type:THREE.HalfFloatType});const cc=new THREE.CubeCamera(.05,300,rt);cc.position.set(x,e+1.55,z);scene.add(cc);cc.update(R,scene);scene.remove(cc);
 const qs=new THREE.Scene(),oc=new THREE.OrthographicCamera(-1,1,1,-1,0,1),mt=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture},yaw:{value:-yaw}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform samplerCube t;uniform float yaw;varying vec2 v;void main(){float lo=(v.x-.5)*6.2831853+yaw,la=(v.y-.5)*3.14159265;vec3 d=vec3(cos(la)*sin(lo),sin(la),-cos(la)*cos(lo));gl_FragColor=textureCube(t,d);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',toneMapped:true});
 qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mt));const pr=R.getPixelRatio(),sz=R.getSize(new THREE.Vector2()),xr=R.xr.enabled;R.xr.enabled=false;R.setPixelRatio(1);R.setSize(W,W/2,false);R.render(qs,oc);const u=R.domElement.toDataURL('image/jpeg',.9);R.setPixelRatio(pr);R.setSize(sz.x,sz.y,false);R.xr.enabled=xr;rt.dispose();mt.dispose();DIRTY=Math.max(DIRTY,30);return u;}
export const STY={minimal:{sofa:'#d9d6cf',armch:'#cfcac1',table:'#e9e5dd',ctable:'#e9e5dd',desk:'#ece8e0',ward:'#f3f2ef',kitch:'#f3f2ef',shelf:'#e6e1d8',bed:'#eeebe5',chair:'#d8d2c6',wood:'#d8c8ae',art:'#cfcac1',curtain:'#f0ede6',rug:'#d8d2c6',runner:'#d8d2c6',lounge:'#cfcac1',dresser:'#ece8e0',sideb:'#ece8e0'},futur:{sofa:'#e9edf2',armch:'#2a2f38',table:'#f4f6f8',ctable:'#1f242c',desk:'#f4f6f8',ward:'#f7f8fa',kitch:'#1c2028',shelf:'#2a2f38',bed:'#f1f3f6',chair:'#e8ecf0',wood:'#2a2f38',art:'#3fd0e0',curtain:'#cfd8e0',rug:'#3a4250',runner:'#3a4250',lounge:'#e9edf2',pendant:'#3fd0e0',lamp:'#3fd0e0',sideb:'#1f242c',dresser:'#f4f6f8'},moderny:{sofa:'#5d6470',armch:'#2f3237',table:'#2b2b2b',ctable:'#2b2b2b',desk:'#3a3a3a',ward:'#ececea',kitch:'#2f3237',shelf:'#3a3a3a',bed:'#d6d6d2',chair:'#2f3237',wood:'#3b3b3b',art:'#6a7a88',curtain:'#d0d4d8',rug:'#4a5560',lounge:'#4a5560'},skandi:{sofa:'#6a5644',armch:'#7a6550',table:'#c4a07a',ctable:'#c4a07a',desk:'#c9a882',ward:'#e8e0d4',kitch:'#ebe6de',shelf:'#c4a07a',chair:'#d8cfc0',wood:'#c4a07a',art:'#c4b8a4',curtain:'#b8a890',shoe:'#c4a07a',rug:'#7a4028',bed:'#5a3e2c',lounge:'#5a6a4a',stool:'#6a5644',runner:'#6a4a3a',pendant:'#e8dcc8'},klasik:{sofa:'#6b3f35',armch:'#8a5a3c',table:'#5a3a26',ctable:'#5a3a26',desk:'#6b4a30',ward:'#7a5a40',kitch:'#efe6d6',shelf:'#5a3a26',chair:'#7a5a40',wood:'#5a3a26',rug:'#5a3020'}};
export const FUR={bed:{w:1.6,d:2.05,h:.5,c:'#e9e4da'},bed1:{w:.9,d:2,h:.5,c:'#e9e4da'},bunk:{w:.9,d:2,h:1.65,c:'#e9e4da'},sofa:{w:2.4,d:1.0,h:.8,c:'#6a5644'},armch:{w:.85,d:.85,h:.8,c:'#7a6550'},table:{w:1.8,d:1.0,h:.75,c:'#d4b48a'},ctable:{w:1.1,d:.7,h:.42,c:'#d4b48a'},desk:{w:1.2,d:.6,h:.75,c:'#e0c9a6'},tv:{w:1.8,d:.42,h:.5,c:'#3b3d40'},ward:{w:1.8,d:.62,h:2.2,c:'#f4f1ea'},kitch:{w:2.8,d:.62,h:.9,c:'#f7f5f0'},fridge:{w:.65,d:.7,h:1.85,c:'#dcdcdc'},bath:{w:1.7,d:.75,h:.55,c:'#ffffff'},shower:{w:.9,d:.9,h:.1,c:'#ffffff'},sink:{w:.6,d:.45,h:.85,c:'#ffffff'},wc:{w:.4,d:.65,h:.42,c:'#ffffff'},shelf:{w:.9,d:.35,h:1.8,c:'#d4b48a'},plant:{w:.45,d:.45,h:1.1,c:'#5b7d4a'},rug:{w:3.2,d:3.4,h:.02,c:'#7a4530'},runner:{w:2.4,d:.7,h:.02,c:'#6a4a3a'},lamp:{w:.35,d:.35,h:1.3,c:'#2f3235'},chair:{w:.45,d:.5,h:.9,c:'#f1ece2'},art:{w:.9,d:.04,h:.7,c:'#c4b8a4'},curtain:{w:1.4,d:.08,h:2.0,c:'#e8e2d6'},shoe:{w:1.0,d:.4,h:.7,c:'#d4b48a'},bench:{w:1.2,d:.4,h:.45,c:'#c4a07a'},nstand:{w:.45,d:.4,h:.55,c:'#c4a07a'},dresser:{w:1.2,d:.5,h:.9,c:'#e8e0d4'},sideb:{w:1.6,d:.45,h:.85,c:'#c4a07a'},side:{w:.45,d:.45,h:.5,c:'#c4a07a'},stool:{w:.38,d:.38,h:.75,c:'#6a5644'},island:{w:1.6,d:.8,h:.9,c:'#efe8de'},pendant:{w:.4,d:.4,h:.3,c:'#e8dcc8'},mirror:{w:.7,d:.04,h:.9,c:'#c5d4e0'},towel:{w:.55,d:.12,h:.7,c:'#d8c8b0'},coat:{w:.5,d:.5,h:1.8,c:'#3a4a5a'},toy:{w:.55,d:.4,h:.5,c:'#c4783a'},otable:{w:1.4,d:.8,h:.75,c:'#a08060'},lounge:{w:1.6,d:.85,h:.55,c:'#5a6a4a'},wshelf:{w:.8,d:.25,h:1.8,c:'#c4a07a'},tvw:{w:1.2,d:.06,h:.7,c:'#1a1c20'},hooks:{w:.6,d:.08,h:.3,c:'#8a6a4a'},washer:{w:.6,d:.6,h:.85,c:'#f2f2f0'}};
const FM={};function fm(c,soft){const k=c+(soft?'~f':'');return FM[k]||(FM[k]=new THREE.MeshStandardMaterial({color:c,roughness:soft?.85:.72,map:soft?fabric:null}));}
const FLO={dub:[0xbea07d,'wood',.55],orech:[0x8a6448,'wood',.55],dlazba:[0xe6e2da,'tile',.35],beton:[0xb0aea8,'beton',.85],tmave:[0x5a4636,'wood',.6]};
export function setMat(o={}){DIRTY=Math.max(DIRTY,90);if(!M)return;M.wall.color.set(o.wall||'#f2ebe3');M.fac.color.set(o.fac||'#f7f5f0');M.roof.color.set(o.roof||'#3e444c');const f=FLO[o.floor||'dub']||FLO.dub;M.floor.map=f[1]==='wood'?wood:f[1]==='tile'?tile:f[1]==='beton'?beton:null;M.floor.color.setHex(f[0]);M.floor.roughness=f[2];M.floor.needsUpdate=true;if(M.floor.map){M.floor.map.colorSpace=THREE.SRGBColorSpace;M.floor.map.needsUpdate=true;}}
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
export function jump(x,z,e){DIRTY=Math.max(DIRTY,90);if(!walk)setWalk(true);rig.position.set(x,e,z);if(body&&body.resolve)body.resolve(rig.position);cam.position.set(0,1.6,0);}

const WP=[M.wall,M.wall,M.wall,M.wall,M.fac,M.wall],WN=[M.wall,M.wall,M.wall,M.wall,M.wall,M.fac];
export function setAuto(v,spd){DIRTY=Math.max(DIRTY,90);if(!orb)return;orb.autoRotate=!!v;orb.autoRotateSpeed=spd!=null?spd:0.55;}
export function spin(d){DIRTY=Math.max(DIRTY,90);yaw+=d;}
export function camInfo(){return{path:camPath?{kind:camPath.kind,t:camPath.t,over:camPath.over,dE:camPath.dE,d0:camPath.d0,el0:camPath.el0,elE:camPath.elE}:null,asp:cam&&cam.aspect,fov:cam&&cam.fov,pos:cam&&cam.position.toArray().map(v=>+v.toFixed(2))};}

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
export function setHour(h,drag){ATM.h=h;hourDrag=!!drag;if(!scene)return;if(drag){R.shadowMap.autoUpdate=false;const t=performance.now();if(t-lastShadow>100){R.shadowMap.needsUpdate=true;lastShadow=t;}applyAtmo(true);}else{R.shadowMap.autoUpdate=true;applyAtmo();}}
function applyAtmo(live){const h=ATM.h!=null?+ATM.h:14.5,w=ATM.w||'sun',cl=w!=='sun',wet=w==='rain';ATM.t=h>=18.3||h<6?'night':(h>=16.6||h<7.2)?'eve':'day';
 sunH=h;sunTween=null;const A=atmoAt(h),el=sunEl(h),up=el>0?Math.min(1,el/(10*Math.PI/180)):0;// up: 0 below horizon -> 1 at 10°
 const wk=(w==='cloudy'?.35:wet?.18:w==='snow'?.4:1);SUNK=up*wk;
 const cm=cl?(wet?.82:.88):1;
 if(hemiL){hemiL.intensity=A.hemi*cm;hemiL.color.copy(A.hemiC);hemiL.groundColor.copy(A.hemiC).multiplyScalar(up>0?.75:.3);}
 // fill: daylight bounce by day, cool moonlight at night (directional, unshadowed)
 if(fillL){const day=.7*up*(cl?.6:1),moon=.95*A.moon;fillL.intensity=day+moon;fillL.color.setRGB(1,.94,.87).lerp(_c1.setRGB(.55,.66,1),moon/(day+moon+1e-6));}
 if(roofFillL){roofFillL.intensity=.85*(.06+.94*up)*(cl?.6:1)+.12*A.moon;roofFillL.color.setRGB(1,.89,.72).lerp(_c1.setRGB(.5,.6,1),A.moon);}
 scene.environmentIntensity=A.env*(cl?.75:1)*(wet?.85:1);R.toneMappingExposure=A.exp*(wet?.9:1);
 let sky=A.sky;if(cl){const gc=wet?'#7d858f':'#a4abb2',k=.55*Math.max(.25,up);sky=sky.map(c=>grey(c,k,gc));}
 const useDay=!cl&&skyDay&&h>=9.2&&h<=14.4;scene.background=useDay?skyDay:skyGrad(sky);
 const fc=new THREE.Color(sky[2]).lerp(new THREE.Color(A.fog),.5);if(!scene.fog||!scene.fog.isFogExp2)scene.fog=new THREE.FogExp2(fc,.005);scene.fog.color.copy(fc);scene.fog.density=cl?.009:up>0?.0048:.006;
 if(sun){sun.color.copy(A.sunC);}
 if(M.glass){if(!M.glass.userData.d)M.glass.userData.d={op:M.glass.opacity};const g=A.glass;M.glass.emissive.setRGB(1,.72,.38);M.glass.emissiveIntensity=g;M.glass.opacity=g>.05?Math.min(.85,M.glass.userData.d.op+g):M.glass.userData.d.op;}
 if(!live)for(const k of['lawn','ground','path']){const m=M[k];if(!m)continue;if(!m.userData.d)m.userData.d={r:m.roughness,c:m.color.getHex()};m.roughness=wet?Math.min(m.userData.d.r,.35):m.userData.d.r;m.color.setHex(m.userData.d.c);if(wet)m.color.multiplyScalar(.62);}
 if(sun){const cs=SUNK>.03;if(sun.castShadow!==cs){sun.castShadow=cs;}}if(lastFp)fitSun(lastFp);
 LAMP=A.lamp;if(LAMP>.01){if(!nightG||nightG.userData.k!==lampKey())nightLights();setLamps(LAMP);}else if(nightG)nightG.visible=false;
 if(!live)makeWx();DIRTY=Math.max(DIRTY,live?6:90);}
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
 scene.add(nightG);if(LAMP>.01)setLamps(LAMP);else nightG.visible=false;}
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
