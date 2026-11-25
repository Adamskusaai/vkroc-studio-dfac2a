/* v20261125a AR prototype: house at 1:1 scale on the phone.
   Android Chrome: immersive-ar session with hit-test; the user taps the LEFT and then the RIGHT front corner of the house on the ground,
   the model is placed so that its street-side facade edge runs through both points (scale stays 1:1, the two points give position + rotation).
   iPhone/iPad Safari: the current model is exported in the browser to a .usdz file and opened in the system AR viewer (no upload anywhere).
   Self-contained: reads the generated 3D world through window.__vk.m.sceneRoot() and never changes it (works on a clone).
   Switches (URL): ?ar=0 hides the button, ?arcut=0 disables the near-camera wall cut-away, ?arraw=1 skips geometry merging. */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const Q=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
export const AR_V='20261125b';
const LOD_T=+(Q.get('arlodt')||1500),LOD_C=+(Q.get('arlodc')||0.02); // usdz: dense glTF decor (> LOD_T triangles) simplified by 2 cm vertex clustering (?arlod=0 = off)
const SKIP=['lawn','drive','site','outdoor','sky','wx','helper'];           // real ground / surroundings: the real world replaces them
const TOP=['roof','lroof','ceil','gutter','hopper','dpipe','flash','cope','cap']; // toggled by "Strecha" (dollhouse view in AR)
const MARGIN=+(Q.get('armargin')||1.2),YARD=5,YARD_TAGS=['terrace','terrE','terrF','terrS','terrL','pergola','kit','planter','balc','tf'];
const NEAR_CUT=Q.get('arcut')==='0'?0:0.45;                                   // metres around the phone where walls are cut away

function tagUp(o,keys,root){for(let q=o;q&&q!==root.parent;q=q.parent){const u=q.userData||{};for(const k of keys)if(u[k])return k;}return null;}
function visUp(o,root){for(let q=o;q&&q!==root.parent;q=q.parent)if(q.visible===false)return false;return true;}

/* Material for AR/USDZ: always MeshStandardMaterial (the only type USDZ keeps), textures converted to canvas when needed. */
function texOK(t){if(!t||!t.image)return null;const im=t.image;
 if((typeof HTMLImageElement!=='undefined'&&im instanceof HTMLImageElement)||(typeof HTMLCanvasElement!=='undefined'&&im instanceof HTMLCanvasElement)||(typeof ImageBitmap!=='undefined'&&im instanceof ImageBitmap)||(typeof OffscreenCanvas!=='undefined'&&im instanceof OffscreenCanvas))return (im.width>0&&im.height>0)?t:null;
 if(im.data&&im.width&&im.height&&(im.data instanceof Uint8Array||im.data instanceof Uint8ClampedArray)&&im.data.length===im.width*im.height*4){ // DataTexture -> canvas
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);
  const n=new THREE.CanvasTexture(c);['wrapS','wrapT','repeat','offset','rotation','center','colorSpace','flipY'].forEach(k=>{if(t[k]&&t[k].clone)n[k]=t[k].clone();else n[k]=t[k];});return n;}
 return null;}
function arMat(m,cache,stat,usdz){if(cache.has(m))return cache.get(m);
 const o={color:m.color?m.color.clone():new THREE.Color(1,1,1),side:m.side,transparent:!!m.transparent,opacity:m.opacity==null?1:m.opacity};
 if(m.isMeshBasicMaterial){o.emissive=o.color.clone().multiplyScalar(.6);o.roughness=1;o.metalness=0;}
 else{o.roughness=m.roughness==null?.8:m.roughness;o.metalness=m.metalness==null?0:Math.min(m.metalness,.6);if(m.emissive)o.emissive=m.emissive.clone();}
 if(m.isMeshPhysicalMaterial&&m.transmission>0){o.transparent=true;o.opacity=Math.min(o.opacity,.35);o.roughness=.05;}
 const mp=texOK(m.map);if(mp){o.map=mp;stat.tex.add(mp.uuid);}else if(m.map)stat.texLost++;
 const nm=!usdz&&texOK(m.normalMap);if(nm&&!Q.has('arnonorm')){o.normalMap=nm;stat.tex.add(nm.uuid);}
 if(o.transparent)o.depthWrite=m.depthWrite!==false&&o.opacity>.9;
 if(usdz&&o.side===THREE.DoubleSide){o.side=THREE.FrontSide;o.__dbl=1;}const dbl=o.__dbl;delete o.__dbl;
 const r=new THREE.MeshStandardMaterial(o);r.userData.dbl=!!dbl;r.name=m.name||'';cache.set(m,r);return r;}

/* Geometry piece in world space with a fixed attribute set so pieces can be merged per material. */
function piece(g,mw,start,count){let s=g;
 if(s.index==null){s=s.clone();const n=s.attributes.position.count,ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;s.setIndex(new THREE.BufferAttribute(ix,1));}
 const src=s.index.array,a=start||0,b=count==null?src.length:Math.min(src.length,a+count);
 const out=new THREE.BufferGeometry();const used=new Map(),ix=[];const P=s.attributes.position,N=s.attributes.normal,U=s.attributes.uv;
 const pp=[],nn=[],uu=[];
 for(let i=a;i<b;i++){const v=src[i];let k=used.get(v);if(k==null){k=used.size;used.set(v,k);pp.push(P.getX(v),P.getY(v),P.getZ(v));if(N)nn.push(N.getX(v),N.getY(v),N.getZ(v));uu.push(U?U.getX(v):0,U?U.getY(v):0);}ix.push(k);}
 if(!pp.length)return null;
 out.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));if(N)out.setAttribute('normal',new THREE.Float32BufferAttribute(nn,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(uu,2));
 out.setIndex(ix);if(!N)out.computeVertexNormals();
 out.applyMatrix4(mw);
 if(mw.determinant()<0){const I=out.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}}
 return out;}

/* Vertex clustering: snap vertices to a c-metre grid, keep the first vertex of each cell, drop collapsed triangles. O(n), keeps the silhouette. */
function cluster(g,c){const P=g.attributes.position,I=g.index.array,map=new Map(),rep=new Int32Array(P.count),keep=[];
 for(let i=0;i<P.count;i++){const k=Math.floor(P.getX(i)/c)+','+Math.floor(P.getY(i)/c)+','+Math.floor(P.getZ(i)/c);let r=map.get(k);if(r==null){r=keep.length;map.set(k,r);keep.push(i);}rep[i]=r;}
 const ix=[];for(let i=0;i<I.length;i+=3){const a=rep[I[i]],b=rep[I[i+1]],d=rep[I[i+2]];if(a!==b&&b!==d&&a!==d)ix.push(a,b,d);}
 if(ix.length/3>I.length/3*.92)return g; // nothing gained
 const out=new THREE.BufferGeometry();for(const n of ['position','normal','uv']){const A=g.attributes[n];if(!A)continue;const it=A.itemSize,arr=new Float32Array(keep.length*it);keep.forEach((v,j)=>{for(let q=0;q<it;q++)arr[j*it+q]=A.array[v*it+q];});out.setAttribute(n,new THREE.BufferAttribute(arr,it));}
 out.setIndex(ix);return out;}

/* Build the AR model from the studio world. Returns a Group whose origin is the middle of the street-side facade edge at ground level,
   the house extending to +z; front = the street side (-z in the studio after streetTurn). */
export function buildModel(world,{merge=!Q.has('arraw'),usdz=false,top=true,side=0}={}){
 if(!world)return null;const t0=performance.now();
 const W=world.clone(true);
 W.traverse(o=>{const u=o.userData||{};
  if(u.wallCut){const{base,h}=u.wallCut;o.scale.y=1;o.position.y=base+h/2;o.visible=true;}
  if(u.doorLeaf){o.scale.y=1;o.visible=true;}
  if(u.grow){o.scale.y=1;if(u.growBase!=null&&u.growH!=null)o.position.y=u.growBase+u.growH/2;o.visible=true;}
  if(u.roof||u.lroof)o.visible=true;});
 // side k: which facade is the front (0 = street side, 1 = left side seen from the street, 2 = back, 3 = right side)
 W.position.set(0,0,0);W.rotation.set(0,(side|0)*Math.PI/2,0);W.scale.set(1,1,1);W.updateMatrixWorld(true);
 const stat={src:0,tris:0,tex:new Set(),texLost:0,skipped:0,draw:0};const cache=new Map();const buckets=new Map();
 const shell=new THREE.Box3(),all=new THREE.Box3();let ground=Infinity;const ob=new THREE.Box3(); // shell = ground-storey walls (front corners), all = walls of every storey (keep-zone)
 // pass 1: house shell = ground-storey walls (wallCut pieces); everything outside shell+margin is surroundings (ground, street, fences, neighbours)
 W.traverse(o=>{if(o.isMesh&&visUp(o,W)&&tagUp(o,['wallCut'],W)){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();ob.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);all.union(ob);if(ob.min.y<1.2){shell.union(ob);ground=Math.min(ground,ob.min.y);}}});
 const near=new THREE.Box3(),yard=new THREE.Box3();if(!all.isEmpty()){near.copy(all).expandByVector(new THREE.Vector3(MARGIN,0,MARGIN));near.min.y=-1;near.max.y+=8;yard.copy(near).expandByVector(new THREE.Vector3(YARD,0,YARD));}
 W.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh)return;if(!visUp(o,W)){return;}
  if(tagUp(o,SKIP,W)){stat.skipped++;return;}
  if(!near.isEmpty()&&o.geometry&&o.geometry.attributes.position){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();ob.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
   if(!(near.containsBox(ob)||(tagUp(o,YARD_TAGS,W)&&yard.containsBox(ob)))){stat.skipped++;return;}}
  const g=o.geometry;if(!g||!g.attributes||!g.attributes.position)return;stat.src++;
  const isTop=!!tagUp(o,TOP,W);if(isTop&&!top)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  const parts=Array.isArray(o.material)&&g.groups.length?g.groups.map(gr=>[mats[gr.materialIndex],gr.start,gr.count]):[[mats[0],0,null]];
  const wallish=!!tagUp(o,['wallCut'],W),isPH=!!tagUp(o,['ph'],W); // ph = closed glTF furniture: no back faces needed
  const inst=o.isInstancedMesh?o.count:0,mi=new THREE.Matrix4(),mw=new THREE.Matrix4();
  for(let k=0;k<(inst||1);k++){if(inst){o.getMatrixAt(k,mi);mw.multiplyMatrices(o.matrixWorld,mi);}else mw.copy(o.matrixWorld);
   for(const[m,st,ct]of parts){if(!m||m.visible===false)continue;let p=piece(g,mw,st,ct);if(!p)continue;if(usdz&&isPH&&Q.get('arlod')!=='0'&&p.index.count/3>LOD_T){const n0=p.index.count/3;p=cluster(p,n0>8000?LOD_C*2:LOD_C);stat.lodCut=(stat.lodCut||0)+n0-p.index.count/3;}
    const am=arMat(m,cache,stat,usdz);const key=am.uuid+'|'+(isTop?1:0);if(!buckets.has(key))buckets.set(key,{m:am,top:isTop,g:[]});const bk=buckets.get(key);bk.g.push(p);stat.tris+=p.index.count/3;
    if(am.userData.dbl&&!isPH){const r=p.clone(),I=r.index.array;for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t;}const n=r.attributes.normal;for(let i=0;i<n.array.length;i++)n.array[i]=-n.array[i];bk.g.push(r);stat.tris+=r.index.count/3;}}}});
 if(shell.isEmpty()){W.traverse(o=>{if(o.isMesh&&!tagUp(o,SKIP,W))shell.expandByObject(o);});ground=shell.min.y;}
 const front={left:[shell.max.x,shell.min.z],right:[shell.min.x,shell.min.z],width:shell.max.x-shell.min.x,depth:shell.max.z-shell.min.z,ground};
 const cx=(shell.min.x+shell.max.x)/2,cz=shell.min.z,G=new THREE.Group();G.name='VkrocAR';
 for(const b of buckets.values()){const list=merge?[mergeGeometries(b.g,false)].filter(Boolean):b.g;
  for(const g of list){g.translate(-cx,-ground,-cz);if(usdz&&!b.m.map&&!b.m.normalMap)g.deleteAttribute('uv');g.computeBoundingSphere();const me=new THREE.Mesh(g,b.m);me.userData.top=b.top;me.name=b.top?'top':'body';G.add(me);stat.draw++;}}
 // the clone shares geometry with the studio world; nothing of it is kept
 W.clear();
 stat.ms=Math.round(performance.now()-t0);stat.tex=stat.tex.size;stat.mats=cache.size;
 G.userData.front=front;G.userData.stat=stat;return G;}
/* 1 m check rods (10 cm orange/white stripes) standing on the 4 corners of the ground-storey wall box: a size check you can hold a tape against. */
export function addRods(G){const F=G.userData.front,ow=[],wh=[],t=.04;
 for(const[x,z]of[[F.width/2,0],[-F.width/2,0],[F.width/2,F.depth],[-F.width/2,F.depth]])for(let k=0;k<10;k++){const b=new THREE.BoxGeometry(t,.1,t).translate(x+(x>0?t/2:-t/2),.05+k*.1,z+(z>0?t/2:-t/2));(k%2?wh:ow).push(b);}
 // 1 m bar on the ground along the front edge from the left corner
 for(let k=0;k<10;k++){const b=new THREE.BoxGeometry(.1,.02,t).translate(F.width/2-.05-k*.1,.01,-t/2);(k%2?wh:ow).push(b);}
 const R=new THREE.Group();R.name='rods';R.add(new THREE.Mesh(mergeGeometries(ow),new THREE.MeshStandardMaterial({color:0xE2552D,roughness:.6})),new THREE.Mesh(mergeGeometries(wh),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6})));G.add(R);return R;}
export function setTop(G,on){G.traverse(o=>{if(o.userData&&o.userData.top!==undefined&&o.isMesh)o.visible=on;});}

/* ---------- iPhone: USDZ + system AR viewer ---------- */
/* anchor = null (plane: the viewer drops it on the floor, facade towards you) or {mode:'post'|'ground',h,along,front}: the printed sign
   (assets/ar/marker_*.png, 18 cm wide) stands at the front-left corner, face to the street; along = metres from the corner towards the right corner,
   front = metres in front of the facade (street side), h = height of the sign centre above ground (post only).
   Image anchor axes (ARKit): X = right edge of the image, Y = normal out of the printed face, Z = towards the image bottom. */
export const MARKER={png:'assets/ar/marker_ref_'+AR_V+'.png',cm:18};
export function anchorMatrix(F,a){const sx=F.width/2-(+a.along||0),sz=-(+a.front||0),sy=a.mode==='ground'?0:(a.h==null?1:+a.h),M=new THREE.Matrix4();
 if(a.mode==='ground')M.set(-1,0,0,sx, 0,1,0,-sy, 0,0,-1,sz, 0,0,0,1);   // sign flat on the ground, top edge towards the house
 else M.set(-1,0,0,sx, 0,0,-1,sz, 0,-1,0,sy, 0,0,0,1);                   // upright sign facing the street
 return M;}
export async function toUSDZ(G,{maxTex=+(Q.get('artex')||512),anchor=null}={}){
 const {USDZExporter}=await import('./ar-usdz.js?v='+AR_V);
 const S=new THREE.Scene(),R=new THREE.Group();R.add(G);S.add(R);
 let ar={anchoring:{type:'plane'},planeAnchoring:{alignment:'horizontal'}};
 if(anchor){R.matrixAutoUpdate=false;R.matrix.copy(anchorMatrix(G.userData.front,anchor));
  const bytes=new Uint8Array(await (await fetch(MARKER.png)).arrayBuffer());
  ar={anchoring:{type:'image'},imageAnchoring:{file:'marker/vkroc_marker.png',physicalWidth:MARKER.cm,bytes}};}
 else R.rotation.y=Math.PI;  // facade faces the viewer when the AR viewer drops it in front
 S.updateMatrixWorld(true);
 const buf=await new USDZExporter().parseAsync(S,{quickLookCompatible:true,maxTextureSize:maxTex,jpeg:Q.get('arjpeg')!=='0',ar});
 R.remove(G);return new Blob([buf],{type:'model/vnd.usdz+zip'});}

/* ---------- Android: WebXR immersive-ar ---------- */
const CSS=`#arov{position:fixed;inset:0;z-index:90;pointer-events:none;font:500 15px/1.4 Inter,system-ui,sans-serif;color:#fff}
#arov .t{position:absolute;left:12px;right:12px;top:max(14px,env(safe-area-inset-top));background:#0b0b0bcc;border-radius:14px;padding:12px 14px;text-align:center}
#arov .t b{display:block;font-size:16px;margin-bottom:2px}#arov .m{display:block;margin-top:6px;font-size:13.5px;color:#ffd8c9}
#arov .bt{position:absolute;left:0;right:0;bottom:max(18px,env(safe-area-inset-bottom));display:flex;gap:8px;justify-content:center;flex-wrap:wrap;pointer-events:auto;padding:0 10px}
#arov button{height:46px;padding:0 16px;border-radius:12px;border:0;background:#0b0b0bcc;color:#fff;font:600 14px inherit}#arov button.go{background:#E2552D}
#arov .dot{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px;border:2px solid #fff;border-radius:50%;opacity:.8}
#ardlg{position:fixed;inset:0;z-index:80;background:rgba(11,11,11,.45);display:grid;place-items:center;font:500 14px/1.45 Inter,system-ui,sans-serif}
#ardlg .c{background:#fff;color:#0b0b0b;border-radius:16px;padding:18px;width:min(420px,92vw);box-shadow:0 10px 40px #0004}
#ardlg h3{margin:0 0 8px;font:800 18px Archivo,Inter,sans-serif}#ardlg p{margin:6px 0;color:#3a3a3a}#ardlg ol{margin:6px 0;padding-left:20px;color:#3a3a3a}
#ardlg .r{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}#ardlg button,#ardlg a.b{height:44px;padding:0 16px;border-radius:11px;border:1px solid #E3DFD8;background:#fff;font:600 14px inherit;display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#0b0b0b;cursor:pointer}
#ardlg .ck{display:flex;gap:8px;align-items:center;margin:6px 0}#ardlg .ck input{width:18px;height:18px;accent-color:#E2552D;flex:none}#ardlg .ln{display:flex;gap:8px;align-items:center;margin:6px 0}#ardlg .ln select,#ardlg .ln input{flex:1;min-width:0;height:36px;border-radius:9px;border:1px solid #E3DFD8;padding:0 8px;font:inherit}#ardlg .ln input{max-width:90px}#ardlg .an{background:#F3F1ED;border-radius:12px;padding:6px 10px;margin:4px 0}#ardlg .an button{height:36px;margin:4px 0}#ardlg a{color:#E2552D}#ardlg .c{max-height:92vh;overflow:auto}
#ardlg .go,#ardlg a.b{background:#E2552D;border-color:#E2552D;color:#fff}#ardlg a.b img{width:26px;height:26px}#ardlg small{color:#6b6b6b}`;
function css(){if($('arcss'))return;const s=document.createElement('style');s.id='arcss';s.textContent=CSS;document.head.appendChild(s);}
const fm=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',')+' m';

export async function startXR(G,{onEnd}={}){css();
 const ov=document.createElement('div');ov.id='arov';ov.innerHTML='<div class="t"><b id="art1">Hľadám zem…</b><span id="art2">Pomaly pohybujte telefónom nad zemou.</span><span class="m" id="art3"></span></div><div class="dot"></div><div class="bt"><button id="arReset">Znova</button><button id="arRoof">Strecha: ZAP</button><button id="arExit" class="go">Ukončiť</button></div>';
 document.body.appendChild(ov);ov.querySelector('.bt').addEventListener('beforexrselect',e=>e.preventDefault());
 const R=new THREE.WebGLRenderer({antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.setSize(innerWidth,innerHeight);R.xr.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.1;
 R.domElement.style.cssText='position:fixed;inset:0;z-index:89';document.body.appendChild(R.domElement);
 const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,200);
 const hemi=new THREE.HemisphereLight(0xffffff,0x8a8070,2.2),sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(4,8,3);S.add(hemi,sun);
 // near-camera cut-away: fragments closer than NEAR_CUT to the phone are discarded, so walking into a wall never blacks out the screen
 const U={c:{value:new THREE.Vector3(0,-999,0)},r:{value:NEAR_CUT}};
 G.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.userData.arCut)return;m.userData.arCut=1;m.onBeforeCompile=sh=>{sh.uniforms.arC=U.c;sh.uniforms.arR=U.r;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vArW;').replace('#include <project_vertex>','#include <project_vertex>\nvArW=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vArW;uniform vec3 arC;uniform float arR;').replace('void main() {','void main() {\nif(arR>0.0&&distance(vArW,arC)<arR)discard;');};m.customProgramCacheKey=()=>'arcut';m.needsUpdate=true;});
 const P=new THREE.Group();P.visible=false;P.add(G);S.add(P);
 const ret=new THREE.Mesh(new THREE.RingGeometry(.09,.12,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff}));ret.matrixAutoUpdate=false;ret.visible=false;S.add(ret);
 const pinM=new THREE.MeshBasicMaterial({color:0xE2552D}),pins=[];const mkPin=()=>{const g=new THREE.Group();const c=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.6,8).translate(0,.3,0),pinM),s=new THREE.Mesh(new THREE.SphereGeometry(.05,12,8).translate(0,.62,0),pinM);g.add(c,s);S.add(g);pins.push(g);return g;};
 const lineG=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),line=new THREE.Line(lineG,new THREE.LineBasicMaterial({color:0xE2552D}));line.visible=false;S.add(line);
 let pts=[],roofOn=true,src=null,xrLight=null,hitPose=null;const F=G.userData.front;
 const say=(a,b,c)=>{$('art1').textContent=a;$('art2').textContent=b||'';$('art3').textContent=c||'';};
 const reset=()=>{pts=[];pins.splice(0).forEach(p=>S.remove(p));line.visible=false;P.visible=false;ret.visible=true;say('Ľavý predný roh','Postavte sa pred dom (strana k ulici), namierte krúžok na miesto ľavého rohu na zemi a ťuknite na obrazovku.');};
 const place=()=>{const[A,B]=pts,dx=B.x-A.x,dz=B.z-A.z,d=Math.hypot(dx,dz);const th=Math.atan2(dz,-dx);
  P.position.set((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);P.rotation.set(0,th,0);P.visible=true;ret.visible=false;
  const diff=F.width>0?Math.round(Math.abs(d-F.width)/F.width*100):0;
  say('Dom stojí v skutočnej veľkosti','Obíďte ho alebo vojdite dnu. Strechu vypnete tlačidlom dole.','Namerané '+fm(d)+' · šírka domu '+fm(F.width)+(diff>10?' · rozdiel '+diff+' %, skúste rohy označiť presnejšie (Znova)':diff>3?' · rozdiel '+diff+' %':' · sedí'));
  P.updateMatrixWorld(true);const cL=new THREE.Vector3(F.width/2,0,0).applyMatrix4(P.matrixWorld),cR=new THREE.Vector3(-F.width/2,0,0).applyMatrix4(P.matrixWorld),bk=new THREE.Vector3(0,0,F.depth).applyMatrix4(P.matrixWorld);
  window.__vkAR={placed:true,measured:d,width:F.width,diff,theta:th,pos:P.position.toArray(),cornerL:cL.toArray(),cornerR:cR.toArray(),backMid:bk.toArray()};};
 const session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay','light-estimation','local-floor'],domOverlay:{root:ov}});
 R.xr.setReferenceSpaceType('local');await R.xr.setSession(session);
 try{if(session.enabledFeatures?session.enabledFeatures.includes('light-estimation'):true){const{XREstimatedLight}=await import('three/addons/webxr/XREstimatedLight.js');xrLight=new XREstimatedLight(R);
  xrLight.addEventListener('estimationstart',()=>{S.add(xrLight);hemi.visible=false;sun.visible=false;if(xrLight.environment)S.environment=xrLight.environment;});
  xrLight.addEventListener('estimationend',()=>{S.remove(xrLight);hemi.visible=true;sun.visible=true;S.environment=null;});}}catch(e){console.info('[ar] no light estimation',e&&e.message);}
 const vs=await session.requestReferenceSpace('viewer');src=await session.requestHitTestSource({space:vs});
 session.addEventListener('select',()=>{if(pts.length>=2||!hitPose)return;const p=new THREE.Vector3().setFromMatrixPosition(hitPose);pts.push(p);const pin=mkPin();pin.position.copy(p);
  if(pts.length===1)say('Pravý predný roh','Prejdite k pravému rohu domu (na tej istej strane) a ťuknite.');
  else{lineG.setFromPoints(pts);line.visible=true;place();}});
 $('arReset').onclick=reset;$('arRoof').onclick=()=>{roofOn=!roofOn;setTop(G,roofOn);$('arRoof').textContent='Strecha: '+(roofOn?'ZAP':'VYP');};
 $('arExit').onclick=()=>session.end();
 let ended=false;session.addEventListener('end',()=>{if(ended)return;ended=true;R.setAnimationLoop(null);if(src)src.cancel&&src.cancel();ov.remove();R.domElement.remove();P.remove(G);R.dispose();window.__vkAR=Object.assign(window.__vkAR||{},{ended:true});onEnd&&onEnd();});
 reset();window.__vkAR={placed:false,started:true};if(Q.has('arqa'))window.__vkARdbg={R,S,P,G,cam};
 const up=new THREE.Vector3(),q=new THREE.Matrix4();
 R.setAnimationLoop((t,frame)=>{if(!frame)return;const ref=R.xr.getReferenceSpace();
  if(src&&pts.length<2){const hs=frame.getHitTestResults(src);hitPose=null;if(hs.length){const pose=hs[0].getPose(ref);if(pose){q.fromArray(pose.transform.matrix);up.setFromMatrixColumn(q,1);
   if(up.y>.85){hitPose=q.clone();ret.matrix.copy(q);ret.visible=true;if(pts.length===1){lineG.setFromPoints([pts[0],new THREE.Vector3().setFromMatrixPosition(q)]);line.visible=true;$('art3').textContent='Vzdialenosť '+fm(pts[0].distanceTo(new THREE.Vector3().setFromMatrixPosition(q)))+' · šírka domu '+fm(F.width);}}else ret.visible=false;}}else ret.visible=false;}
  const xc=R.xr.getCamera();U.c.value.setFromMatrixPosition(xc.matrixWorld);
  R.render(S,cam);});
 return session;}

/* ---------- UI: AR button in the 3D toolbar ---------- */
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function quickLook(){const a=document.createElement('a');return !!(a.relList&&a.relList.supports&&a.relList.supports('ar'));}
export async function mode(){if(navigator.xr&&navigator.xr.isSessionSupported){try{if(await navigator.xr.isSessionSupported('immersive-ar'))return 'webxr';}catch(e){}}if(quickLook()||isIOS())return 'usdz';return 'none';}
function dlg(html){css();const d=document.createElement('div');d.id='ardlg';d.innerHTML='<div class="c">'+html+'</div>';d.addEventListener('click',e=>{if(e.target===d)close();});const close=()=>d.remove();document.body.appendChild(d);return{d,close};}
function toast(t,k){try{const el=document.createElement('div');el.className='toast '+(k||'');el.textContent=t;const h=$('toasts');if(h){h.appendChild(el);setTimeout(()=>el.remove(),4500);}}catch(e){}}
let busy=false;
async function onAR(){if(busy)return;const V=window.__vk&&window.__vk.m,world=V&&V.sceneRoot&&V.sceneRoot();
 if(!world){toast('Najprv vytvorte 3D model domu.','warn');return;}
 try{window.vkA&&window.vkA('ar_open');}catch(e){}
 const md=Q.get('armode')||await mode();
 if(md==='none'){dlg('<h3>Dom v skutočnej veľkosti</h3><p>Otvorte tento projekt na mobile (Android v Chrome alebo iPhone v Safari) a ťuknite na AR. Dom sa zobrazí na vašom pozemku v mierke 1:1.</p><div class="r"><button class="go" data-x>Rozumiem</button></div>').d.querySelector('[data-x]').onclick=e=>e.target.closest('#ardlg').remove();return;}
 busy=true;
 try{
  if(md==='webxr'){const D=dlg('<h3>Dom v skutočnej veľkosti</h3><ol><li>Postavte sa na rovnú zem pred miesto, kde bude dom (strana k ulici).</li><li>Ťuknite na <b>ľavý</b> a potom na <b>pravý</b> predný roh domu na zemi.</li><li>Dom sa postaví v mierke 1:1, môžete ho obísť aj vojsť dnu.</li></ol>'+'<label style="display:flex;gap:8px;align-items:center;margin:8px 0">Predná strana <select id="arside" style="flex:1;height:38px;border-radius:10px;border:1px solid #E3DFD8;padding:0 8px"><option value="0">k ulici (štandard)</option><option value="1">ľavý bok (pri pohľade z ulice)</option><option value="2">zadná strana</option><option value="3">pravý bok (pri pohľade z ulice)</option></select></label>'+'<small>Ak plán nemá zadanú ulicu, predná strana je horná strana pôdorysu. Kamera sa používa len vo vašom telefóne, nič sa neodosiela.</small><div class="r"><button data-x>Zrušiť</button><button class="go" data-go>Spustiť AR</button></div>');
   D.d.querySelector('[data-x]').onclick=()=>{D.close();busy=false;};
   D.d.querySelector('[data-go]').onclick=async()=>{const side=+D.d.querySelector('#arside').value;D.close();try{const G=buildModel(world,{side});if(Q.get('arrods')!=='0')addRods(G);console.info('[ar] model',JSON.stringify(G.userData.stat),JSON.stringify(G.userData.front));await startXR(G,{onEnd:()=>{busy=false;}});}catch(e){busy=false;console.warn('[ar]',e);toast('AR sa nepodarilo spustiť: '+(e&&e.message||e),'err');}};
   return;}
  // iPhone / iPad
  const D=dlg('<h3>Dom v skutočnej veľkosti</h3><p id="arst">Pripravujem model…</p><div class="r"><button data-x>Zavrieť</button></div>');
  let url=null;const done=()=>{D.close();busy=false;if(url){const u=url;setTimeout(()=>URL.revokeObjectURL(u),60000);}};
  D.d.querySelector('[data-x]').onclick=done;
  const O={top:!(V.isDoll&&V.isDoll()),side:0,rods:Q.get('arrods')!=='0',anc:false,mode:'post',h:1,along:0,front:0};
  const SEL='<label class="ln">Predná strana <select id="arside"><option value="0">k ulici (štandard)</option><option value="1">ľavý bok (pri pohľade z ulice)</option><option value="2">zadná strana</option><option value="3">pravý bok (pri pohľade z ulice)</option></select></label>';
  const num=(id,lab,v)=>'<label class="ln">'+lab+' <input id="'+id+'" type="number" step="0.05" inputmode="decimal" value="'+v+'"> m</label>';
  const make=async()=>{const t0=performance.now();const c=D.d.querySelector('.c');if(url){URL.revokeObjectURL(url);url=null;}
   c.innerHTML='<h3>Dom v skutočnej veľkosti</h3><p>Pripravujem model…</p>';await new Promise(r=>setTimeout(r,30));
   const G=buildModel(world,{usdz:true,top:O.top,side:O.side});if(O.rods)addRods(G);
   const anchor=O.anc?{mode:O.mode,h:O.h,along:O.along,front:O.front}:null;
   const blob=await toUSDZ(G,{anchor});url=URL.createObjectURL(blob);const mb=(blob.size/1048576).toFixed(1).replace('.',',');const F=G.userData.front;
   window.__vkARusdz={ms:Math.round(performance.now()-t0),size:blob.size,stat:G.userData.stat,front:F,url,opts:{...O},anchor:anchor&&anchorMatrix(F,anchor).toArray()};console.info('[ar] usdz',blob.size,JSON.stringify(G.userData.stat));
   const steps=O.anc?'<ol><li>Vytlačte <a href="ar-preview/tabula_a4_'+AR_V+'.pdf" target="_blank">tabuľu (A4, PDF)</a> v mierke 100 % a nalepte ju na tvrdú dosku.</li><li>'+(O.mode==='post'?'Postavte ju zvislo na <b>ľavý predný roh</b> domu (pri pohľade z ulice), lícom k ulici, stred obrázka '+fm(O.h)+' nad terénom.':'Položte ju na zem na <b>ľavý predný roh</b> domu, hornou hranou k domu.')+'</li><li>Ťuknite na <b>Otvoriť v AR</b> a namierte telefón na tabuľu z 1–2 m. Keď ju telefón rozpozná, dom sa postaví sám na svoje miesto.</li></ol>'
    :'<ol><li>Postavte sa na rovnú zem pred miesto, kde bude dom.</li><li>Ťuknite na <b>Otvoriť v AR</b>. Dom sa položí na zem pred vami, <b>fasádou k vám</b>, v mierke 1:1.</li><li>Jedným prstom ho posuniete tak, aby predná hrana sedela s rohmi domu na zemi, dvoma prstami ho otočíte. Potom ho obíďte alebo vojdite dnu.</li></ol>';
   c.innerHTML='<h3>Dom v skutočnej veľkosti</h3>'+steps+
    '<label class="ck"><input type="checkbox" id="artop" '+(O.top?'checked':'')+'>So strechou</label>'+
    '<label class="ck"><input type="checkbox" id="arrods" '+(O.rods?'checked':'')+'>Kontrolné tyče 1 m na rohoch (na overenie veľkosti)</label>'+
    '<label class="ck"><input type="checkbox" id="aranc" '+(O.anc?'checked':'')+'>Ukotviť na tabuľu (presné umiestnenie na pozemku)</label>'+
    (O.anc?'<div class="an"><label class="ln">Tabuľa <select id="armode"><option value="post">zvislo na kolíku, lícom k ulici</option><option value="ground">na zemi, hornou hranou k domu</option></select></label>'+(O.mode==='post'?num('arh','Výška stredu tabule',O.h):'')+num('aralong','Posun od rohu pozdĺž fasády',O.along)+num('arfront','Posun pred fasádu (k ulici)',O.front)+'<button id="arapply">Použiť</button></div>':'')+
    SEL+'<small>Šírka domu '+fm(F.width)+', hĺbka '+fm(F.depth)+'. Model sa vytvoril priamo v telefóne ('+mb+' MB), nič sa neodosiela.</small><div class="r"><button data-x>Zavrieť</button><a class="b" rel="ar" id="arql" href="'+url+'#allowsContentScaling=0"><img alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22%3E%3Cpath d=%22M12 2l9 5v10l-9 5-9-5V7z%22/%3E%3Cpath d=%22M12 12l9-5M12 12v10M12 12L3 7%22/%3E%3C/svg%3E">Otvoriť v AR</a></div>';
   if(!quickLook()){const a=c.querySelector('#arql');a.removeAttribute('rel');a.setAttribute('download',(document.title||'dom').replace(/\W+/g,'_')+'.usdz');a.lastChild.textContent='Stiahnuť model (USDZ)';}
   c.querySelector('[data-x]').onclick=done;
   const re=()=>make().catch(fail),q=k=>c.querySelector(k),rd=k=>{const e=q(k);if(!e)return null;const v=parseFloat(String(e.value).replace(',','.'));return isFinite(v)?Math.max(-50,Math.min(50,v)):0;};
   q('#artop').onchange=e=>{O.top=e.target.checked;re();};q('#arrods').onchange=e=>{O.rods=e.target.checked;re();};q('#aranc').onchange=e=>{O.anc=e.target.checked;re();};
   const sl=q('#arside');sl.value=O.side;sl.onchange=e=>{O.side=+e.target.value;re();};
   if(O.anc){q('#armode').value=O.mode;q('#armode').onchange=e=>{O.mode=e.target.value;re();};q('#arapply').onclick=()=>{const h=rd('#arh');if(h!=null)O.h=Math.max(0,h);O.along=rd('#aralong');O.front=rd('#arfront');re();};}};
  const fail=e=>{busy=false;console.warn('[ar]',e);toast('AR model sa nepodarilo pripraviť.','err');const d=$('ardlg');if(d)d.remove();};
  await make();
 }catch(e){busy=false;console.warn('[ar]',e);toast('AR model sa nepodarilo pripraviť.','err');const d=$('ardlg');if(d)d.remove();}
}
export function mount(){if(Q.get('ar')==='0'||$('mAR'))return;const modes=$('modes');if(!modes){setTimeout(mount,400);return;}
 const b=document.createElement('button');b.id='mAR';b.title='Dom v skutočnej veľkosti na vašom pozemku (mobil)';b.innerHTML='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M12 7l5 2.8v4.4L12 17l-5-2.8V9.8z"/></svg><span>AR</span>';
 b.onclick=onAR;const vr=$('mVR');modes.insertBefore(b,vr?vr.nextSibling:null);window.__vkARmount=1;}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
