/* v20261126a "QR na pláne": tabletop AR model standing on a printed flyer (generator side, runs inside ar-preview with a generated project).
   The flyer (A4) carries the plan section at 1:S, an image marker (assets/ar/marker_ref_20261125b.png printed MARKER_MM wide) and a QR with the
   viewer URL (ar-qr/index.html?v=..&m=<id>). The USDZ is image-anchored to the marker, so the house stands on its own plan on the paper.
   Image anchor frame (ARKit): X = image right, Y = out of the paper (up when flat), Z = image bottom (towards the reader). Units: metres.
   Layout numbers (mm on the A4 page, origin top-left) are shared with the flyer builder (/workspace/vk_ar_qa/qr_build.py) via LAYOUT. */
import * as THREE from 'three';
import {buildModel,toUSDZ,cluster,levelsOf} from '../ar.js?v=20261127t';
export const QR_V='20261127t';
export const LAYOUT={markerMM:80,marker:[57,240],plan:[105,118],planBox:[186,120]}; // centres in mm; plan box = max printed plan size
export const MARKER_PNG='assets/ar/marker_ref_20261125b.png';
/* model -> image-anchor matrix for scale 1:S: facade (street side, model -z) faces the reader (image +Z), house centred over the plan centre. */
export function tableMatrix(F,S,L=LAYOUT){const k=1/S,dx=(L.plan[0]-L.marker[0])/1000,dz=(L.plan[1]-L.marker[1])/1000,M=new THREE.Matrix4();
 M.set(-k,0,0,dx, 0,k,0,0.0005, 0,0,-k,dz+k*F.depth/2, 0,0,0,1);return M;} // 0.5 mm lift so the floor does not z-fight with the paper
/* top-down section at cut height (m) -> PNG data URL, pxm px per real metre; returns also the exact real extents drawn */
export function planPNG(world,{cut=null,pxm=120,side=0,floor=-1,furn=true}={}){const LV=levelsOf(world);if(cut==null)cut=(floor>0&&LV[floor]!=null?LV[floor]-LV[0]:0)+1.2;
 const G=buildModel(world,{usdz:false,top:false,side,merge:true,floor,furn}),F=G.userData.front;
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
function tableModel(world,o){const G=buildModel(world,{usdz:true,top:o.top,side:o.side,floor:o.floor==null?-1:o.floor,furn:o.furn!==false});return new URLSearchParams(location.search).get('qrlod')==='0'?G:decimate(G);}
export async function tableUSDZ(world,{S=100,top=true,side=0,floor=-1,furn=true}={}){const G=tableModel(world,{top,side,floor,furn});console.info('[qr] tris',JSON.stringify(G.userData.qrTris));
 return toUSDZ(G,{maxTex:256,matrix:tableMatrix(G.userData.front,S),marker:{png:MARKER_PNG,cm:LAYOUT.markerMM/10}});}
/* Android Scene Viewer fallback: GLB at 1:S (no image anchoring there, user places it on the table) */
export async function tableGLB(world,{S=100,top=true,side=0,floor=-1,furn=true}={}){const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
 const G=tableModel(world,{top,side,floor,furn}),R=new THREE.Group();R.add(G);R.scale.setScalar(1/S);R.rotation.y=Math.PI;R.position.z=G.userData.front.depth/S/2;
 const buf=await new GLTFExporter().parseAsync(R,{binary:true,maxTextureSize:256});return new Blob([buf],{type:'model/gltf-binary'});}
async function b64(blob){const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s);}
/* used by the generator: everything for one flyer as base64 */
export async function flyerKit(opts={}){const V=window.__vk&&window.__vk.m,world=V&&V.sceneRoot&&V.sceneRoot();if(!world)throw new Error('no 3D model');
 const out={plan:planPNG(world,opts),files:{}};
 for(const S of opts.scales||[100,50])for(const top of [true,false]){const t0=performance.now();out.files[`s${S}${top?'':'_open'}.usdz`]=await b64(await tableUSDZ(world,{S,top,side:opts.side||0}));console.info('[qr] usdz',S,top,Math.round(performance.now()-t0));}
 for(const S of opts.scales||[100,50])out.files[`s${S}.glb`]=await b64(await tableGLB(world,{S,side:opts.side||0}));
 return out;}
/* v20261126c in-studio flyer: printed plan scale = smallest of 1:100/150/200/250 that fits the plan box (wall box + 0.8 m) */
export function flyerScale(F,L=LAYOUT){for(const S of [100,150,200,250])if((F.width+.8)*1000/S<=L.planBox[0]&&(F.depth+.8)*1000/S<=L.planBox[1])return S;return 300;}
let jsP=null;function jspdf(){return jsP||(jsP=new Promise((ok,no)=>{if(window.jspdf)return ok(window.jspdf);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';s.onload=()=>ok(window.jspdf);s.onerror=no;document.head.appendChild(s);}));} // jsPDF: MIT licence
function img(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});}
/* A4 PDF made in the browser: whole page drawn on a 10 px/mm canvas (Slovak diacritics, exact mm), placed 1:1 on the PDF page. No QR for user projects
   (their model is not hosted anywhere public); qrPNG (data/URL) can be passed for hosted catalogue models. */
export async function flyerPDF(world,{S=100,floor=-1,furn=true,side=0,title='Váš dom',qrPNG=null}={},L=LAYOUT){const k=10,P=planPNG(world,{floor,furn,side,pxm:120});
 const c=document.createElement('canvas');c.width=210*k;c.height=297*k;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 const pw=P.mm[0]/S,ph=P.mm[1]/S,pi=await img(P.url),mk=await img(MARKER_PNG);x.drawImage(pi,(L.plan[0]-pw/2)*k,(L.plan[1]-ph/2)*k,pw*k,ph*k);
 x.imageSmoothingEnabled=false;x.drawImage(mk,(L.marker[0]-L.markerMM/2)*k,(L.marker[1]-L.markerMM/2)*k,L.markerMM*k,L.markerMM*k);x.imageSmoothingEnabled=true;
 const T=(s,X,Y,px,w='400',col='#1b1b1b')=>{x.font=w+' '+px*k/3.78+'px Inter,"DejaVu Sans",Helvetica,Arial,sans-serif';x.fillStyle=col;x.fillText(s,X*k,Y*k);};
 const fm=v=>v.toFixed(2).replace('.',',');T(title,12,20,26,'700');T('Šírka '+fm(P.F.width)+' m · hĺbka '+fm(P.F.depth)+' m · Vkroč',12,27,13,'400','#555');
 T('Pôdorys 1:'+S+(floor>=0?' ('+(floor?floor+'. poschodie':'prízemie')+')':'')+' · ulica / vstup je dole',12,L.plan[1]+L.planBox[1]/2+4,12,'400','#555');
 let tx=110;if(qrPNG){const q=await img(qrPNG);x.drawImage(q,110*k,(L.marker[1]-L.markerMM/2)*k,38*k,38*k);tx=152;}
 const lines=qrPNG?['Dom v 3D na tomto papieri','1. Naskenujte QR kód fotoaparátom.','2. Ťuknite na Otvoriť v AR.','3. Namierte mobil na obrázok','   vľavo z 30–40 cm, dom sa','   postaví na pôdorys.']:['Dom v 3D na tomto papieri','1. Vo Vkroči ťuknite na AR,','   zvoľte „Na pláne 1:'+S+'“.','2. Ťuknite na Otvoriť v AR.','3. Namierte mobil na obrázok','   vľavo z 30–40 cm, dom sa','   postaví na pôdorys.'];
 lines.forEach((s,i)=>T(s,tx,L.marker[1]-L.markerMM/2+5+i*6,i?12:14,i?'400':'700'));
 T('Tlačte v mierke 100 % (bez prispôsobenia).',110,L.marker[1]+28,10,'400','#555');T('Kontrola: čiara má mať 50 mm.',110,L.marker[1]+33,10,'400','#555');x.fillStyle='#000';x.fillRect(110*k,(L.marker[1]+35)*k,50*k,2*k);
 const {jsPDF}=await jspdf(),d=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});d.addImage(c.toDataURL('image/jpeg',.92),'JPEG',0,0,210,297);return d.output('blob');}
