// 3D view (lazy-loaded)
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {Body,Locomotion,colliderFromObject} from './vm.js';
const $=id=>document.getElementById(id),TCH=matchMedia('(pointer:coarse)').matches;
let H,R,scene,cam,rig,orb,world,loco,body,sun,inited=false,walk=false,roof='flat',intro=null;const clock=new THREE.Clock(),keys={},joy=[0,0];let yaw=0,pitch=0,LK='',DIRTY=60,FT=[],PRMAX=2;export function dirty(n=60){DIRTY=Math.max(DIRTY,n);}
export const geo=w=>{const[x0,z0]=w.start,[x1,z1]=w.end,L=Math.hypot(x1-x0,z1-z0)||1e-9;return{x0,z0,L,u:[(x1-x0)/L,(z1-z0)/L]};};
export function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function tex(draw,n=256,rep=1){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
const wood=tex((x,n)=>{for(let i=0;i<8;i++){const l=150+rnd()*30;x.fillStyle=`rgb(${l+40},${l},${l-45})`;x.fillRect(0,i*n/8,n,n/8);x.fillStyle='#0002';x.fillRect(0,i*n/8,n,1.5);x.fillRect(rnd()*n,i*n/8,1.5,n/8);}for(let i=0;i<900;i++){x.fillStyle=`rgba(80,50,20,${rnd()*.08})`;x.fillRect(rnd()*n,rnd()*n,rnd()*40,1);}});
const grass=tex((x,n)=>{x.fillStyle='#5f8a3e';x.fillRect(0,0,n,n);for(let i=0;i<6000;i++){const g=110+rnd()*70;x.fillStyle=`rgba(${g*.55|0},${g|0},${g*.35|0},.5)`;x.fillRect(rnd()*n,rnd()*n,1.5,3);}},256);
const std=(o)=>new THREE.MeshStandardMaterial(o);
const M={wall:std({color:0xf4f1ec,roughness:.92}),floor:std({map:wood,roughness:.55}),ceil:std({color:0xfbfbfa,roughness:1,emissive:0x8a8781}),
 glass:new THREE.MeshPhysicalMaterial({color:0xdfeef8,transparent:true,opacity:.22,roughness:.03,metalness:0,envMapIntensity:1.5}),frame:std({color:0x2f3235,roughness:.45,metalness:.2}),
 door:std({color:0xcdb89a,roughness:.55}),roof:std({color:0x34373b,roughness:.7}),stair:std({map:wood,roughness:.5}),ground:std({map:grass,roughness:1,color:0x9aa98a}),lawn:std({map:grass,roughness:1,color:0xd0dcbc}),
 fac:std({color:0xf7f5f0,roughness:.95}),wood2:std({color:0x9b7653,roughness:.6}),fence:std({color:0x2b2b2b,roughness:.6,metalness:.3}),path:std({color:0xcfc8bb,roughness:.95}),plinth:std({color:0x8d8a84,roughness:.9})};
export function init(){if(inited)return;inited=true;
 R=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});R.setPixelRatio(PRMAX=Math.min(devicePixelRatio,TCH?1.5:2));R.xr.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;$('v3').appendChild(R.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xcfe0ee);scene.fog=new THREE.Fog(0xcfe0ee,80,260);
 new THREE.TextureLoader().load('assets/sky.jpg',t=>{t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;scene.environment=t;scene.background=t;scene.backgroundBlurriness=.04;scene.environmentIntensity=1.25;scene.fog=null;DIRTY=Math.max(DIRTY,30);});
 scene.add(new THREE.HemisphereLight(0xfff8ee,0x9a9784,.6));sun=new THREE.DirectionalLight(0xfff1dc,2.6);sun.castShadow=true;const sm=TCH?1024:2048;sun.shadow.mapSize.set(sm,sm);sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=4;scene.add(sun,sun.target);
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
  if(s&&loco)loco.update(dt,s.inputSources);else if(!s){if(walk)walkTick(dt);else{if(intro)introTick(dt);orb.update();}}
  if(!s){const k=cam.matrixWorld.elements.join()+rig.position.x+rig.position.z;if(k===LK&&DIRTY<=0&&!walk)return;if(k!==LK)DIRTY=Math.max(DIRTY,2);LK=k;DIRTY--;
   FT.push(dt);if(FT.length>90){const av=FT.reduce((a,b)=>a+b)/FT.length;FT=[];const pr=R.getPixelRatio();if(av>.028&&pr>1){R.setPixelRatio(Math.max(1,pr-.25));}else if(av<.014&&pr<PRMAX){R.setPixelRatio(Math.min(PRMAX,pr+.25));}}}
  R.render(scene,cam);});
 new ResizeObserver(()=>{const r=$('v3').getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();DIRTY=Math.max(DIRTY,30);}).observe($('v3'));}
const ease=t=>1-Math.pow(1-t,3);
function introTick(dt){intro.t=Math.min(1,intro.t+dt/2.2);const k=ease(intro.t);cam.position.lerpVectors(intro.a,intro.b,k);if(intro.t>=1)intro=null;}
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
function build(){const root=new THREE.Group(),lv={};H.levels.forEach(l=>lv[l.name]=l);let xs=[],zs=[];
 const add=(geom,mat,x,y,z,ry=0,nc)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=m.receiveShadow=mat!==M.glass;if(nc)m.userData.noCol=true;root.add(m);return m;};
 const box=(w,s0,s1,y0,y1,mat,t,tOff=0,nc)=>{if(s1-s0<.005||y1-y0<.005)return;if(mat===M.wall&&w._ext)mat=w._ext>0?WP:WN;const g=geo(w);t=t||w.thickness;return add(new THREE.BoxGeometry(s1-s0,y1-y0,t),mat,g.x0+g.u[0]*(s0+s1)/2-g.u[1]*tOff,y0+(y1-y0)/2,g.z0+g.u[1]*(s0+s1)/2+g.u[0]*tOff,-Math.atan2(g.u[1],g.u[0]),nc);};
 H.walls.forEach(w=>{const L=geo(w).L,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0),h=w.height||2.8;xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);
  const ops=[...(w.openings||[])].sort((a,b)=>a.offset-b.offset);let s=0;
  ops.forEach(o=>{const sl=o.sill||0,a=o.offset,b=a+o.width,f=.06;box(w,s,a,e,e+h,M.wall);box(w,a,b,e,e+sl,M.wall);box(w,a,b,e+sl+o.height,e+h,M.wall);
   if(o.type==='window'){box(w,a,b,e+sl+f,e+sl+o.height-f,M.glass,.02,0,1);box(w,a,b,e+sl,e+sl+f,M.frame,.08);box(w,a,b,e+sl+o.height-f,e+sl+o.height,M.frame,.08);box(w,a,a+f,e+sl,e+sl+o.height,M.frame,.08);box(w,b-f,b,e+sl,e+sl+o.height,M.frame,.08);box(w,(a+b)/2-.025,(a+b)/2+.025,e+sl,e+sl+o.height,M.frame,.06,0,1);}
   else{box(w,a,a+.05,e,e+o.height,M.frame,w.thickness+.02);box(w,b-.05,b,e,e+o.height,M.frame,w.thickness+.02);box(w,a,b,e+o.height-.05,e+o.height,M.frame,w.thickness+.02);
    const G=geo(w),ang=-Math.atan2(G.u[1],G.u[0]),sd=o.out?-1:1,kd=o.kind||'single',mat=kd==='entrance'?M.frame:M.door;
    const leaf=(hs,lw,dir,rot)=>{const lf=new THREE.Mesh(new THREE.BoxGeometry(lw,o.height-.06,.04),mat);lf.castShadow=true;lf.position.set(dir*lw/2,(o.height-.06)/2,0);const piv=new THREE.Group();piv.position.set(G.x0+G.u[0]*hs-G.u[1]*sd*(w.thickness/2),e,G.z0+G.u[1]*hs+G.u[0]*sd*(w.thickness/2));piv.rotation.y=ang+rot;piv.add(lf);piv.userData.noCol=true;root.add(piv);};
    const lw=o.width-.1;if(kd==='double'){leaf(a+.05,lw/2,1,-1.2*sd);leaf(b-.05,lw/2,-1,1.2*sd);}else if(kd==='sliding'){leaf(a+.05+lw*.45,lw*.55,1,0);}else{const R=o.hinge==='R';leaf(R?b-.05:a+.05,lw,R?-1:1,(R?1.3:-1.3)*sd);}}
   s=b;});box(w,s,L,e,e+h,M.wall);});
 if(!xs.length)return null;const fp=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];root.userData.fp=fp;
 const stairs=H.stairs||[];
 H.levels.forEach((l,i)=>{const ws=H.walls.filter(w=>w.level===l.name);if(!ws.length)return;const hole=stairs.filter(st=>st.level===(H.levels[i-1]||{}).name).map(stairRect);
  cells(ws,hole).forEach(r=>{const m=add(new THREE.BoxGeometry(r[2]-r[0],.1,r[3]-r[1]),M.floor,(r[0]+r[2])/2,l.elevation-.05+.001*i,(r[1]+r[3])/2);
   const up=H.levels[i+1],topH=Math.max(...ws.map(w=>w.height||l.height));if(!up)add(new THREE.BoxGeometry(r[2]-r[0],.05,r[3]-r[1]),M.ceil,(r[0]+r[2])/2,l.elevation+topH+.025,(r[1]+r[3])/2,0,1).userData.ceil=1;});});
 (H.furn||[]).forEach(f=>{const l=lv[f.level];if(!l)return;const F=FUR[f.t];if(!F)return;const g=new THREE.Group(),r=(f.r||0)*Math.PI/2;g.position.set(f.p[0],l.elevation,f.p[1]);g.rotation.y=-r;const mt=fm(F.c);
  const bx=(w,h,d,x,y,z,m)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||mt);q.position.set(x,y,z);q.castShadow=q.receiveShadow=true;g.add(q);};const{w,d,h}=F;
  if(f.t==='bed'||f.t==='bed1'){bx(w,.32,d,0,.16,0,M.wood2);bx(w-.06,.2,d-.1,0,.42,.03,fm('#f4f1ea'));bx(w,.8,.08,0,.4,-d/2+.04,M.wood2);bx(w*.38,.12,.4,-w*.23*(f.t==='bed'?1:0),.58,-d/2+.32,fm('#ffffff'));if(f.t==='bed')bx(w*.38,.12,.4,w*.23,.58,-d/2+.32,fm('#ffffff'));bx(w-.04,.06,d*.55,0,.53,d*.2,fm('#c9b9a3'));}
  else if(f.t==='sofa'||f.t==='armch'){bx(w,.42,d,0,.21,0);bx(w,.4,.2,0,.62,-d/2+.1);bx(.18,.25,d,-w/2+.09,.54,0);bx(.18,.25,d,w/2-.09,.54,0);}
  else if(f.t==='table'||f.t==='desk'||f.t==='ctable'){bx(w,.04,d,0,h-.02,0);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>bx(.05,h-.04,.05,a*(w/2-.06),(h-.04)/2,b*(d/2-.06),M.frame));if(f.t==='table')[-1,1].forEach(s=>[-.4,.4].forEach(o=>{bx(.42,.45,.42,o*w*.6,.225,s*(d/2+.28),fm('#d9d3c7'));bx(.42,.45,.05,o*w*.6,.67,s*(d/2+.47),fm('#d9d3c7'));}));}
  else if(f.t==='plant'){bx(.32,.35,.32,0,.175,0,fm('#d7d1c5'));const s=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,0),mt);s.position.y=.75;s.castShadow=true;g.add(s);}
  else if(f.t==='kitch'){bx(w,h-.04,d,0,(h-.04)/2,0);bx(w,.04,d+.02,0,h-.02,0,fm('#3a3a3a'));bx(w,.7,.35,0,1.85,-d/2+.175);}
  else bx(w,h,d,0,h/2,0);
  g.traverse(o=>o.userData.noCol=true);root.add(g);});
 // plinth strip around footprint for grounding
 stairs.forEach(st=>{const l=lv[st.level],up=H.levels[H.levels.indexOf(l)+1];if(!l)return;const rise=up?up.elevation-l.elevation:l.height,n=Math.max(2,Math.round(rise/.18)),L=st.length||3.6,W=st.width||1,d=st.dir||0;
  for(let k=0;k<n;k++){const sx=(k+.5)*L/n;add(new THREE.BoxGeometry(L/n,(k+1)*rise/n,W),M.stair,st.pos[0]+Math.cos(d)*sx-Math.sin(d)*W/2,l.elevation+(k+1)*rise/n/2,st.pos[1]+Math.sin(d)*sx+Math.cos(d)*W/2,-d);}});
 const top=H.levels[H.levels.length-1],tw=H.walls.filter(w=>w.level===top.name),th=top.elevation+Math.max(...(tw.length?tw:H.walls).map(w=>w.height||2.8));
 if(roof!=='none'){const o=.45,W=fp[2]-fp[0]+2*o,D=fp[3]-fp[1]+2*o,cx=(fp[0]+fp[2])/2,cz=(fp[1]+fp[3])/2;
  if(roof==='flat'){add(new THREE.BoxGeometry(W,.22,D),M.roof,cx,th+.16,cz,0,1).userData.roof=1;add(new THREE.BoxGeometry(W+.04,.08,D+.04),M.roof,cx,th+.3,cz,0,1).userData.roof=1;}
  else{const rh=Math.min(W,D)*.35,lng=W>=D,a=lng?W:D,b=lng?D:W,sh=new THREE.Shape([new THREE.Vector2(-b/2,0),new THREE.Vector2(b/2,0),new THREE.Vector2(0,rh)]),gm=new THREE.ExtrudeGeometry(sh,{depth:a,bevelEnabled:false});gm.translate(0,0,-a/2);
   add(gm,M.roof,cx,th+.05,cz,lng?Math.PI/2:0,1).userData.roof=1;}}
 // plot: lawn, fence, path
 const P=H.plot;if(P&&P.pts&&P.pts.length>2){const sh=new THREE.Shape(P.pts.map(p=>new THREE.Vector2(p[0],-p[1])));const lg=new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2);const lm=new THREE.Mesh(lg,M.lawn);M.lawn.map.repeat.set(.5,.5);lm.position.y=-.015;lm.receiveShadow=true;lm.userData.noCol=true;root.add(lm);
  const edge=new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2),M.path);edge.scale.set(1,1,1);
  if(P.fence!==false)P.pts.forEach((a,i)=>{const b=P.pts[(i+1)%P.pts.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=-Math.atan2(b[1]-a[1],b[0]-a[0]),n=Math.max(1,Math.round(L/2.5));
   const rail=(y)=>{const m=add(new THREE.BoxGeometry(L,.04,.04),M.fence,(a[0]+b[0])/2,y,(a[1]+b[1])/2,ang,1);};rail(.35);rail(1.15);
   for(let k=0;k<=n;k++){const t=k/n;add(new THREE.BoxGeometry(.08,1.3,.08),M.fence,a[0]+(b[0]-a[0])*t,.65,a[1]+(b[1]-a[1])*t,0,1);}
   for(let k=0;k<L/0.12;k++){const t=(k+.5)*.12/L;if(t>1)break;add(new THREE.BoxGeometry(.02,.95,.02),M.fence,a[0]+(b[0]-a[0])*t,.72,a[1]+(b[1]-a[1])*t,0,1).castShadow=false;}});}
 root.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&root.children.length>2500)o.castShadow=false;});
 return root;}
function fitSun(fp){lastFp=fp;const c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2],r=Math.max(fp[2]-fp[0],fp[3]-fp[1])*.8+6,az=(sunH-12)*15*Math.PI/180,el=Math.max(.07,62*Math.PI/180*Math.cos((sunH-12)/8*Math.PI/2)),R2=r*1.8;sun.position.set(c[0]-Math.sin(az)*Math.cos(el)*R2,Math.sin(el)*R2,c[1]+Math.cos(az)*Math.cos(el)*R2);const k=Math.min(1,Math.max(.3,Math.sin(el)*2.2));sun.intensity=2.6*k;sun.color.setRGB(1,.8+.15*k,.62+.3*k);sun.target.position.set(c[0],0,c[1]);const sc=sun.shadow.camera;sc.left=sc.bottom=-r*1.2;sc.right=sc.top=r*1.2;sc.near=.5;sc.far=r*5;sc.updateProjectionMatrix();}
function place(inside,anim){if(!world)return;const fp=world.userData.fp,c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2];rig.position.set(0,0,0);rig.rotation.set(0,0,0);intro=null;
 if(R.xr.isPresenting||inside){rig.position.set(c[0],H.levels[0].elevation,c[1]);if(body){body.resolve(rig.position);}cam.position.set(0,R.xr.isPresenting?0:1.6,0);yaw=0;pitch=0;}
 else{cam.quaternion.identity();const el=R.domElement,ar=innerWidth/Math.max(1,innerHeight),S=Math.max(fp[2]-fp[0],fp[3]-fp[1],6)*(ar<1?Math.min(2,1/ar*.75):1),b=new THREE.Vector3(c[0]+S*.95,S*.75,c[1]+S*1.25);orb.target.set(c[0],1.2,c[1]);
  if(anim){const a=new THREE.Vector3(c[0]-S*1.6,S*2.2,c[1]+S*2.6);cam.position.copy(a);intro={a,b,t:0};}else cam.position.copy(b);orb.update();}}
export function setWalk(v,xr){DIRTY=Math.max(DIRTY,90);walk=v;orb.enabled=!v;$('joy').style.display=v&&!xr&&TCH?'block':'none';world&&world.traverse(o=>{if(o.userData.roof)o.visible=!v&&!xr;if(o.userData.ceil)o.visible=v||!!xr;});place(v||xr);return walk;}
export function setRoof(r){DIRTY=Math.max(DIRTY,90);roof=r;}
export const isWalk=()=>walk;
export function gen(h,anim){DIRTY=Math.max(DIRTY,90);H=h;init();if(world){scene.remove(world);world.traverse(o=>o.geometry&&o.geometry.dispose());}world=build();if(!world)return false;scene.add(world);fitSun(world.userData.fp);
 const colRoot=new THREE.Group();world.updateMatrixWorld(true);world.traverse(o=>{if(o.isMesh&&!o.userData.noCol&&!(o.parent&&o.parent.userData.noCol)){const m=o.clone();m.matrixAutoUpdate=false;m.matrix.copy(o.matrixWorld);colRoot.add(m);}});colRoot.updateMatrixWorld(true);
 try{const col=colliderFromObject(colRoot);body=new Body(col,{radius:.18});if(!loco)loco=new Locomotion({renderer:R,rig,camera:cam,scene,body,speed:1.4,snapDeg:30});else loco.body=body;}catch(err){console.warn('kolízie',err);}
 walk=walk&&!anim;setWalk(walk);if(anim&&!walk)place(false,true);return true;}
export async function glb(){if(!world)return null;const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');return new Promise((res,rej)=>new GLTFExporter().parse(world,b=>res(new Blob([b],{type:'model/gltf-binary'})),rej,{binary:true}));}

export function snap(){if(!R)return null;R.render(scene,cam);return R.domElement.toDataURL('image/png');}

export const FUR={bed:{w:1.6,d:2.05,h:.5,c:'#e9e4da'},bed1:{w:.9,d:2,h:.5,c:'#e9e4da'},sofa:{w:2.2,d:.95,h:.8,c:'#8e9aa6'},armch:{w:.85,d:.85,h:.8,c:'#b9a78f'},table:{w:1.6,d:.9,h:.75,c:'#b08a63'},ctable:{w:1.1,d:.6,h:.42,c:'#b08a63'},desk:{w:1.2,d:.6,h:.75,c:'#c8b8a0'},tv:{w:1.8,d:.42,h:.5,c:'#3b3d40'},ward:{w:1.8,d:.62,h:2.2,c:'#e3ddd2'},kitch:{w:2.6,d:.62,h:.9,c:'#f2efe9'},fridge:{w:.6,d:.65,h:1.85,c:'#dcdcdc'},bath:{w:1.7,d:.75,h:.55,c:'#ffffff'},shower:{w:.9,d:.9,h:.1,c:'#ffffff'},sink:{w:.6,d:.45,h:.85,c:'#ffffff'},wc:{w:.4,d:.65,h:.42,c:'#ffffff'},shelf:{w:.9,d:.35,h:1.8,c:'#c8b8a0'},plant:{w:.45,d:.45,h:1.1,c:'#5b7d4a'}};
const FM={};function fm(c){return FM[c]||(FM[c]=new THREE.MeshStandardMaterial({color:c,roughness:.75}));}
const FLO={dub:[0xffffff,1],orech:[0x8a6448,1],dlazba:[0xe6e1d8,0],beton:[0xa3a19c,0],tmave:[0x5a4636,1]};
export function setMat(o={}){DIRTY=Math.max(DIRTY,90);if(!M)return;M.wall.color.set(o.wall||'#f4f1ec');M.fac.color.set(o.fac||'#f7f5f0');M.roof.color.set(o.roof||'#2b3442');const f=FLO[o.floor||'dub']||FLO.dub;M.floor.map=f[1]?M.stair.map:null;M.floor.color.setHex(f[0]);M.floor.roughness=f[1]?.55:.35;M.floor.needsUpdate=true;}
let sunH=15,lastFp=null;
export function setSun(h){DIRTY=Math.max(DIRTY,90);sunH=h;if(lastFp)fitSun(lastFp);}
export function jump(x,z,e){DIRTY=Math.max(DIRTY,90);if(!walk)setWalk(true);rig.position.set(x,e,z);if(body&&body.resolve)body.resolve(rig.position);cam.position.set(0,1.6,0);}

const WP=[M.wall,M.wall,M.wall,M.wall,M.fac,M.wall],WN=[M.wall,M.wall,M.wall,M.wall,M.wall,M.fac];
export function setAuto(v){DIRTY=Math.max(DIRTY,90);if(!orb)return;orb.autoRotate=v;orb.autoRotateSpeed=1.6;}
export function spin(d){DIRTY=Math.max(DIRTY,90);yaw+=d;}
