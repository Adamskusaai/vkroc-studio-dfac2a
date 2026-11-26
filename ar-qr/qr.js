/* v20261126a "QR na pláne": tabletop AR model standing on a printed flyer (generator side, runs inside ar-preview with a generated project).
   The flyer (A4) carries the plan section at 1:S, an image marker (assets/ar/marker_ref_20261125b.png printed MARKER_MM wide) and a QR with the
   viewer URL (ar-qr/index.html?v=..&m=<id>). The USDZ is image-anchored to the marker, so the house stands on its own plan on the paper.
   Image anchor frame (ARKit): X = image right, Y = out of the paper (up when flat), Z = image bottom (towards the reader). Units: metres.
   Layout numbers (mm on the A4 page, origin top-left) are shared with the flyer builder (/workspace/vk_ar_qa/qr_build.py) via LAYOUT. */
import * as THREE from 'three';
import {buildModel,toUSDZ,cluster} from '../ar.js?v=20261125b';
export const QR_V='20261126a';
export const LAYOUT={markerMM:80,marker:[57,240],plan:[105,118],planBox:[186,120]}; // centres in mm; plan box = max printed plan size
export const MARKER_PNG='assets/ar/marker_ref_20261125b.png';
/* model -> image-anchor matrix for scale 1:S: facade (street side, model -z) faces the reader (image +Z), house centred over the plan centre. */
export function tableMatrix(F,S,L=LAYOUT){const k=1/S,dx=(L.plan[0]-L.marker[0])/1000,dz=(L.plan[1]-L.marker[1])/1000,M=new THREE.Matrix4();
 M.set(-k,0,0,dx, 0,k,0,0.0005, 0,0,-k,dz+k*F.depth/2, 0,0,0,1);return M;} // 0.5 mm lift so the floor does not z-fight with the paper
/* top-down section at cut height (m) -> PNG data URL, pxm px per real metre; returns also the exact real extents drawn */
export function planPNG(world,{cut=1.2,pxm=120,side=0}={}){const G=buildModel(world,{usdz:false,top:false,side,merge:true}),F=G.userData.front;
 const pad=.4,x0=-F.width/2-pad,x1=F.width/2+pad,z0=-pad,z1=F.depth+pad,W=Math.round((x1-x0)*pxm),H=Math.round((z1-z0)*pxm);
 const S=new THREE.Scene();S.background=new THREE.Color(0xffffff);S.add(G);S.add(new THREE.HemisphereLight(0xffffff,0xbbbbbb,2.2));const dl=new THREE.DirectionalLight(0xffffff,1.2);dl.position.set(3,10,-4);S.add(dl);
 // camera looks down; image right = model -x, image down = model -z (facade at the bottom, like the AR view from the reader)
 const cam=new THREE.OrthographicCamera(-(x1-x0)/2,(x1-x0)/2,(z1-z0)/2,-(z1-z0)/2,.1,100);cam.position.set((x0+x1)/2,50,(z0+z1)/2);cam.up.set(0,0,1);cam.lookAt((x0+x1)/2,0,(z0+z1)/2);
 const c=document.createElement('canvas');c.width=W;c.height=H;const r=new THREE.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});
 r.localClippingEnabled=true;r.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),cut)];r.setSize(W,H,false);r.render(S,cam);
 const url=c.toDataURL('image/png');r.dispose();return {url,W,H,mm:[(x1-x0)*1000,(z1-z0)*1000],F};}
/* tabletop decimation: every mesh > minTri triangles is vertex-clustered at c metres (3 cm real = 0.3 mm on paper at 1:100) */
export function decimate(G,{c=+(new URLSearchParams(location.search).get('qrlodc')||0.03),minTri=200}={}){let n0=0,n1=0;
 G.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.index)return;const t=o.geometry.index.count/3;n0+=t;if(t>minTri){const g=cluster(o.geometry,t>20000?c*1.6:c);if(g!==o.geometry)o.geometry=g;}n1+=o.geometry.index.count/3;});
 G.userData.qrTris=[n0,n1];return G;}
function tableModel(world,o){const G=buildModel(world,{usdz:true,top:o.top,side:o.side});return new URLSearchParams(location.search).get('qrlod')==='0'?G:decimate(G);}
export async function tableUSDZ(world,{S=100,top=true,side=0}={}){const G=tableModel(world,{top,side});console.info('[qr] tris',JSON.stringify(G.userData.qrTris));
 return toUSDZ(G,{maxTex:256,matrix:tableMatrix(G.userData.front,S),marker:{png:MARKER_PNG,cm:LAYOUT.markerMM/10}});}
/* Android Scene Viewer fallback: GLB at 1:S (no image anchoring there, user places it on the table) */
export async function tableGLB(world,{S=100,top=true,side=0}={}){const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
 const G=tableModel(world,{top,side}),R=new THREE.Group();R.add(G);R.scale.setScalar(1/S);R.rotation.y=Math.PI;R.position.z=G.userData.front.depth/S/2;
 const buf=await new GLTFExporter().parseAsync(R,{binary:true,maxTextureSize:256});return new Blob([buf],{type:'model/gltf-binary'});}
async function b64(blob){const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s);}
/* used by the generator: everything for one flyer as base64 */
export async function flyerKit(opts={}){const V=window.__vk&&window.__vk.m,world=V&&V.sceneRoot&&V.sceneRoot();if(!world)throw new Error('no 3D model');
 const out={plan:planPNG(world,opts),files:{}};
 for(const S of opts.scales||[100,50])for(const top of [true,false]){const t0=performance.now();out.files[`s${S}${top?'':'_open'}.usdz`]=await b64(await tableUSDZ(world,{S,top,side:opts.side||0}));console.info('[qr] usdz',S,top,Math.round(performance.now()-t0));}
 for(const S of opts.scales||[100,50])out.files[`s${S}.glb`]=await b64(await tableGLB(world,{S,side:opts.side||0}));
 return out;}
