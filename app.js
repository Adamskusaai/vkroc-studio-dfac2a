import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {detectWalls} from './cv.js';
import {Body,Locomotion,colliderFromObject} from './vm.js';
const $=id=>document.getElementById(id),KEY='vkroc_studio_project';
const DEMO={name:'Ukážkový dom',units:'m',levels:[{name:'1NP',elevation:0,height:2.8}],walls:[]};
(()=>{const W=(a,b,o=[],t=.3)=>DEMO.walls.push({id:'w'+DEMO.walls.length,level:'1NP',start:a,end:b,thickness:t,base:0,height:2.8,openings:o});
 W([0,0],[10,0],[{type:'window',offset:2,width:1.5,sill:.9,height:1.4},{type:'window',offset:6.5,width:1.5,sill:.9,height:1.4}]);
 W([10,0],[10,8],[{type:'window',offset:3,width:2,sill:.9,height:1.4}]);W([10,8],[0,8],[{type:'door',offset:4.5,width:1,sill:0,height:2.1}]);
 W([0,8],[0,0],[{type:'window',offset:3,width:1.2,sill:.9,height:1.4}]);W([6,0],[6,5],[{type:'door',offset:2,width:.9,sill:0,height:2.05}],.15);W([6,5],[10,5],[{type:'door',offset:1.5,width:.9,sill:0,height:2.05}],.15);})();
let H,undo=[],tool='wall',bg=null,bgW=12,view={x:-1,y:-1,s:50},drag=null,PID=null,obl=false;
const IDX='vks_idx',idx=()=>{try{return JSON.parse(localStorage.getItem(IDX))||[]}catch(e){return[]}};
function save(){if(!PID)return;const L=idx().filter(p=>p.id!==PID);L.unshift({id:PID,name:H.name,date:Date.now()});try{localStorage.setItem('vks_p_'+PID,JSON.stringify(H));localStorage.setItem(IDX,JSON.stringify(L));window.__full=0;}catch(e){window.__full=(window.__full||0)+1;if(window.__full===1)dlg('Úložisko prehliadača je plné','<p>Posledné zmeny sa nepodarilo uložiť v prehliadači. Stiahnite projekt ako súbor (📁 Projekt → 💾 Uložiť) alebo zmažte staré projekty na úvodnej obrazovke.</p>',[['OK',1,'go']]);}}
function setBg(){bg=null;bgW=H.underlay?H.underlay.w:12;$('imw').value=bgW;if(H.underlay){bg=new Image();bg.onload=draw;bg.src=H.underlay.src;}}
function openP(id,data){PID=id;H=data||JSON.parse(localStorage.getItem('vks_p_'+id));if(!H.levels)H.levels=JSON.parse(JSON.stringify(DEMO.levels));lvl=H.levels[0].name;lvUI();undo=[];setBg();save();show('ed');banner();if(H.underlay&&!H.walls.length)afterImg(1);}
const newP=(name,walls=[],ul=null)=>openP('p'+Date.now(),{...JSON.parse(JSON.stringify(DEMO)),name,walls,underlay:ul});
function load(){const L=idx();if(L.length){try{openP(L[0].id);return;}catch(e){}}newP('Ukážkový dom',JSON.parse(JSON.stringify(DEMO.walls)));}
const snap=()=>{undo.push(JSON.stringify(H));if(undo.length>80)undo.shift();};
// ---------- editor ----------
const cv=$('cv'),cx=cv.getContext('2d');
const TCH=matchMedia('(pointer:coarse)').matches;
const HINT0={wall:'Ťahaj myšou = nová stena (prichytáva sa ku koncom stien). Koliesko/2 prsty = zoom a posun.',move:'Ťahaj koniec steny (bodku) alebo celú stenu. Dvere/okno ťahaj po stene.',door:'Klikni na stenu = vložia sa dvere.',window:'Klikni na stenu = vloží sa okno.',del:'Klikni na stenu, dvere alebo okno = zmaže sa.'};
const HINT=Object.fromEntries(Object.entries(HINT0).map(([k,v])=>[k,TCH?v.replace('Ťahaj myšou','Ťahaj prstom').replace('Koliesko/2 prsty','2 prsty').replace(/Klikni/g,'Ťukni'):v]));HINT.stair=(TCH?'Ťukni':'Klikni')+' = schody (1 × 3,6 m) z tohto podlažia na vyššie. Zmažeš ich nástrojom 🗑.';HINT.cal='Ťukni/klikni na začiatok a koniec známej dĺžky (napr. kótovaná stena).';
function fit(){const r=cv.getBoundingClientRect();cv.width=r.width*devicePixelRatio;cv.height=r.height*devicePixelRatio;
 let xs=[0,10],zs=[0,8];if(bg&&bg.width){xs.push(0,bgW);zs.push(0,bgW*bg.height/bg.width);}H.walls.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});
 const x0=Math.min(...xs)-.3,x1=Math.max(...xs)+.3,z0=Math.min(...zs)-.3,z1=Math.max(...zs)+.3;view.s=Math.min(cv.width/(x1-x0),cv.height/(z1-z0));view.x=x0;view.y=z0;draw();}
const toS=p=>[(p[0]-view.x)*view.s,(p[1]-view.y)*view.s],toW=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*devicePixelRatio/view.s+view.x,(e.clientY-r.top)*devicePixelRatio/view.s+view.y];};
const r2=v=>Math.round(v*20)/20;
function geo(w){const[x0,z0]=w.start,[x1,z1]=w.end,L=Math.hypot(x1-x0,z1-z0)||1e-9;return{x0,z0,L,u:[(x1-x0)/L,(z1-z0)/L]};}
function proj(w,p){const g=geo(w),s=(p[0]-g.x0)*g.u[0]+(p[1]-g.z0)*g.u[1],t=-(p[0]-g.x0)*g.u[1]+(p[1]-g.z0)*g.u[0];return{s,t,g};}
function hitWall(p){let b=null,bd=.35;WL().forEach(w=>{const q=proj(w,p);if(q.s>=-.1&&q.s<=q.g.L+.1&&Math.abs(q.t)<Math.max(bd,w.thickness/2+.05)){const d=Math.abs(q.t);if(d<bd||!b){bd=d;b={w,s:q.s};}}});return b;}
function hitOp(p){for(const w of WL()){const q=proj(w,p);if(Math.abs(q.t)>w.thickness/2+.15)continue;for(const o of w.openings||[])if(q.s>=o.offset&&q.s<=o.offset+o.width)return{w,o,ds:q.s-o.offset};}return null;}
let TOUCH=false,lvl=null;const WL=()=>H.walls.filter(w=>w.level===lvl),LV=()=>H.levels.find(l=>l.name===lvl)||H.levels[0];
function hitEnd(p){let b=null,bd=(TOUCH?30:12)*devicePixelRatio/view.s;WL().forEach(w=>['start','end'].forEach(k=>{const d=Math.hypot(w[k][0]-p[0],w[k][1]-p[1]);if(d<bd){bd=d;b={w,k};}}));return b;}
function snapPt(p,skip){let b=[r2(p[0]),r2(p[1])],bd=(TOUCH?28:15)*devicePixelRatio/view.s;H.walls.forEach(w=>{if(w===skip)return;['start','end'].forEach(k=>{const d=Math.hypot(w[k][0]-p[0],w[k][1]-p[1]);if(d<bd){bd=d;b=[...w[k]];}});});return b;}
function ortho(a,b){if(obl)return b;return Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?[b[0],a[1]]:[a[0],b[1]];}
function quad(w,s0,s1,t0,t1){const g=geo(w),v=[-g.u[1],g.u[0]];cx.beginPath();[[s0,t0],[s1,t0],[s1,t1],[s0,t1]].forEach(([s,t],i)=>{const P=toS([g.x0+g.u[0]*s+v[0]*t,g.z0+g.u[1]*s+v[1]*t]);i?cx.lineTo(...P):cx.moveTo(...P);});cx.closePath();cx.fill();}
function draw(){cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#f7f8fa';cx.fillRect(0,0,cv.width,cv.height);
 if(bg){const P=toS([0,0]),w=bgW*view.s;cx.globalAlpha=.6;cx.drawImage(bg,P[0],P[1],w,w*bg.height/bg.width);cx.globalAlpha=1;}
 cx.strokeStyle='#e3e7ee';cx.lineWidth=1;const x0=Math.floor(view.x),y0=Math.floor(view.y);for(let i=x0;i<x0+cv.width/view.s+1;i++){const a=toS([i,0])[0];cx.beginPath();cx.moveTo(a,0);cx.lineTo(a,cv.height);cx.stroke();}
 for(let i=y0;i<y0+cv.height/view.s+1;i++){const a=toS([0,i])[1];cx.beginPath();cx.moveTo(0,a);cx.lineTo(cv.width,a);cx.stroke();}
 H.walls.filter(w=>w.level!==lvl).forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='#9ca3af55';quad(w,0,g.L,-t,t);});
 (H.stairs||[]).filter(st=>st.level===lvl||H.levels[H.levels.indexOf(LV())-1]?.name===st.level).forEach(st=>{const r=stairRect(st),a=toS([r[0],r[1]]),b=toS([r[2],r[3]]);cx.fillStyle=st.level===lvl?'#9c7a55':'#9c7a5555';cx.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);cx.fillStyle='#fff';cx.textAlign='center';cx.fillText('🪜 schody',(a[0]+b[0])/2,(a[1]+b[1])/2);});
 WL().forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='#374151';quad(w,0,g.L,-t,t);
  (w.openings||[]).forEach(o=>{cx.fillStyle=o.type==='door'?'#d97706':'#38bdf8';quad(w,o.offset,o.offset+o.width,-t-.03,t+.03);});
  cx.fillStyle='#1e6fd9';cx.font=`${12*devicePixelRatio}px system-ui`;const m=toS([g.x0+g.u[0]*g.L/2-g.u[1]*(t+.25),g.z0+g.u[1]*g.L/2+g.u[0]*(t+.25)]);cx.textAlign='center';cx.fillText(g.L.toFixed(2)+' m',...m);
  if(tool==='move')['start','end'].forEach(k=>{const P=toS(w[k]);cx.fillStyle='#fff';cx.strokeStyle='#1e6fd9';cx.lineWidth=2;cx.beginPath();cx.arc(...P,6*devicePixelRatio,0,7);cx.fill();cx.stroke();});});
 calPts.forEach((q,i)=>{const P=toS(q);cx.fillStyle='#e11d48';cx.beginPath();cx.arc(...P,7*devicePixelRatio,0,7);cx.fill();if(i)( cx.strokeStyle='#e11d48',cx.lineWidth=3,cx.beginPath(),cx.moveTo(...toS(calPts[0])),cx.lineTo(...P),cx.stroke());});
 if(drag&&drag.k==='new'){cx.strokeStyle='#1e6fd9';cx.lineWidth=3;cx.beginPath();cx.moveTo(...toS(drag.a));cx.lineTo(...toS(drag.b));cx.stroke();}}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{e.preventDefault();const p=toW(e),f=e.deltaY<0?1.15:1/1.15;view.s*=f;view.x=p[0]-(p[0]-view.x)/f;view.y=p[1]-(p[1]-view.y)/f;draw();},{passive:false});
const ptrs=new Map();let pinch=null,lastAct=0;
const two=()=>{const [a,b]=[...ptrs.values()];return{c:[(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2],d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1};};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,e);TOUCH=e.pointerType==='touch';
 if(ptrs.size===2){if(drag&&['end','wall','op'].includes(drag.k)&&undo.length)H=JSON.parse(undo.pop());else if(Date.now()-lastAct<400&&undo.length)H=JSON.parse(undo.pop());
  const t=two();pinch={...t,v0:{...view},w0:toW({clientX:t.c[0],clientY:t.c[1]})};drag=null;draw();return;}
 if(ptrs.size>2)return;const p=toW(e);
 if(['door','window','del','stair'].includes(tool))lastAct=Date.now();
 if(e.button===2){drag={k:'pan',e0:[e.clientX,e.clientY],v0:{...view}};return;}
 if(tool==='cal'){calPts.push(p);draw();if(calPts.length===2)calDone();return;}
 if(tool==='wall'){drag={k:'new',a:snapPt(p),b:snapPt(p)};}
 else if(tool==='move'){const en=hitEnd(p);if(en){snap();drag={k:'end',w:en.w,key:en.k};return;}const op=hitOp(p);if(op){snap();drag={k:'op',...op};return;}const h=hitWall(p);if(h){snap();drag={k:'wall',w:h.w,p0:p,a:[...h.w.start],b:[...h.w.end]};return;}drag={k:'pan',e0:[e.clientX,e.clientY],v0:{...view}};}
 else if(tool==='door'||tool==='window'){const h=hitWall(p);if(!h)return;const d=tool==='door',wd=d?.9:1.2,g=geo(h.w);if(g.L<wd+.1){$('hint').textContent='⚠️ Stena je príliš krátka na '+(d?'dvere (min. 1 m).':'okno (min. 1,3 m).');return;}snap();
  (h.w.openings=h.w.openings||[]).push(d?{type:'door',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:0,height:2.05}:{type:'window',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:.9,height:1.4});save();draw();}
 else if(tool==='stair'){snap();(H.stairs=H.stairs||[]).push({level:lvl,pos:[r2(p[0]),r2(p[1])],dir:0,width:1,length:3.6});save();draw();}
 else if(tool==='del'){const si=(H.stairs||[]).findIndex(st=>{const r=stairRect(st);return (st.level===lvl||H.levels[H.levels.indexOf(LV())-1]?.name===st.level)&&p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3];});if(si>=0){snap();H.stairs.splice(si,1);save();draw();return;}const op=hitOp(p);if(op){snap();op.w.openings.splice(op.w.openings.indexOf(op.o),1);}else{const h=hitWall(p);if(!h)return;snap();H.walls.splice(H.walls.indexOf(h.w),1);}save();draw();}});
cv.addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,e);
 if(pinch&&ptrs.size>=2){const t=two(),k=t.d/pinch.d,r=cv.getBoundingClientRect();view.s=pinch.v0.s*k;view.x=pinch.w0[0]-(t.c[0]-r.left)*devicePixelRatio/view.s;view.y=pinch.w0[1]-(t.c[1]-r.top)*devicePixelRatio/view.s;draw();return;}
 if(!drag)return;const p=toW(e);
 if(drag.k==='pan'){view.x=drag.v0.x-(e.clientX-drag.e0[0])*devicePixelRatio/view.s;view.y=drag.v0.y-(e.clientY-drag.e0[1])*devicePixelRatio/view.s;}
 else if(drag.k==='new'){drag.b=ortho(drag.a,snapPt(p));}
draw();});
// endpoint/wall/op dragging handled here to keep logic readable
cv.addEventListener('pointermove',e=>{if(!drag)return;const p=toW(e);
 if(drag.k==='end')drag.w[drag.key]=ortho(drag.w[drag.key==='start'?'end':'start'],snapPt(p,drag.w));
 if(drag.k==='wall'){const d=[r2(p[0]-drag.p0[0]),r2(p[1]-drag.p0[1])];drag.w.start=[drag.a[0]+d[0],drag.a[1]+d[1]];drag.w.end=[drag.b[0]+d[0],drag.b[1]+d[1]];}
 if(drag.k==='op'){const q=proj(drag.w,p);drag.o.offset=Math.max(.05,Math.min(q.g.L-drag.o.width-.05,r2(q.s-drag.ds)));}
 draw();});
const pu=e=>{ptrs.delete(e.pointerId);if(pinch){if(!ptrs.size)pinch=null;return;}if(!drag)return;if(e.type==='pointercancel'){drag=null;draw();return;}
 if(drag.k==='new'&&Math.hypot(drag.b[0]-drag.a[0],drag.b[1]-drag.a[1])>.2){snap();H.walls.push({id:'w'+Date.now(),level:lvl,start:drag.a,end:drag.b,thickness:+$('th').value/100,base:0,height:LV().height,openings:[]});}
 if(['end','wall','op'].includes(drag.k)&&undo.length&&undo[undo.length-1]===JSON.stringify(H))undo.pop();
 drag=null;save();draw();};
cv.addEventListener('pointerup',pu);cv.addEventListener('pointercancel',pu);
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
$('hint').textContent=HINT.wall;
$('undo').onclick=()=>{if(undo.length){H=JSON.parse(undo.pop());if(!H.levels.find(l=>l.name===lvl))lvl=H.levels[0].name;const u=H.underlay;if((u&&u.src)!==(bg&&bg.src))setBg();else{bgW=u?u.w:bgW;$('imw').value=bgW;}lvUI();banner();save();draw();}};
addEventListener('keydown',e=>{if(e.target.tagName!=='INPUT'&&(e.ctrlKey||e.metaKey)&&e.key==='z')$('undo').onclick();});
$('th').oninput=()=>{$('thv').textContent=$('th').value+' cm';};
$('th').onchange=()=>{snap();const t=+$('th').value/100;H.walls.forEach(w=>{if(w.thickness>=.2||t<.2)w.thickness=t;});save();draw();};
$('imw').oninput=()=>{bgW=+$('imw').value||12;if(H.underlay){H.underlay.w=bgW;save();}draw();};
$('obl').onclick=()=>{obl=!obl;$('obl').textContent='📐 Šikmé steny: '+(obl?'ZAP':'VYP');$('obl').classList.toggle('on',obl);};
function dlg(title,body,btns){return new Promise(res=>{$('ovb').innerHTML='<h3>'+title+'</h3>'+(body||'')+'<div class="bs"></div>';const bs=$('ovb').querySelector('.bs');
 btns.forEach(([t,v,c])=>{const b=document.createElement('button');b.textContent=t;if(c)b.className=c;b.onclick=()=>{const i=$('ovb').querySelector('input');$('ov').classList.remove('on');res(v===null?null:{v,name:i&&i.value.trim()});};bs.appendChild(b);});
 $('ov').classList.add('on');const i=$('ovb').querySelector('input');if(i){i.focus();i.onkeydown=e=>{if(e.key==='Enter')bs.lastChild.click();};}});}
var esc=t=>String(t).replace(/[<>&"]/g,c=>'&#'+c.charCodeAt(0)+';');
async function askName(def,ti,ok){const r=await dlg(ti||'Názov projektu','<input type="text" value="'+esc(def)+'" placeholder="napr. Rodinný dom Kováč">',[['Zrušiť',null],[ok||'Vytvoriť',1,'go']]);return r?(r.name||def):null;}
const shrink=(im,M=2000)=>{const k=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85);};
let pdfjs=null;
async function readPdf(f){busy('Načítavam PDF…');try{if(!pdfjs){pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';}
 const doc=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;let n=1;busy(0);
 if(doc.numPages>1){const r=await dlg('PDF má '+doc.numPages+' strán','<p>Ktorú stranu použiť ako výkres?</p>',[['Zrušiť',null],...Array.from({length:Math.min(doc.numPages,12)},(_,i)=>['Strana '+(i+1),i+1,i?'':'go'])]);if(!r)return null;n=r.v;}
 busy('Vykresľujem stranu '+n+'…');const pg=await doc.getPage(n),v0=pg.getViewport({scale:1}),sc=2400/Math.max(v0.width,v0.height),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 await pg.render({canvasContext:x,viewport:vp}).promise;busy(0);return shrink(c);}catch(e){busy(0);console.warn(e);dlg('PDF sa nepodarilo otvoriť','<p>Skúste výkres uložiť ako obrázok (JPG/PNG) alebo urobiť snímku obrazovky.</p>',[['OK',1,'go']]);return null;}}
function readImg(f){if(/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name))return readPdf(f);
 return new Promise(res=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{res(shrink(im));URL.revokeObjectURL(u);};
  im.onerror=()=>{res(null);dlg('Obrázok sa nedá otvoriť',/hei[cf]/i.test(f.type+f.name)?'<p>Formát HEIC (fotky z iPhonu) tento prehliadač nevie zobraziť. Na iPhone: Nastavenia → Fotoaparát → Formáty → <b>Najkompatibilnejšie</b>, alebo pošlite fotku ako JPG / urobte snímku obrazovky.</p>':'<p>Podporované sú JPG, PNG, WebP a PDF.</p>',[['OK',1,'go']]);};im.src=u;});}
let imgMode='ask',calPts=[];
function lvUI(){const sel=$('lvl');sel.innerHTML=H.levels.map(l=>'<option'+(l.name===lvl?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'<option value="+">➕ Pridať podlažie</option>';$('stb').hidden=H.levels.length<2;}
$('lvl').onchange=async e=>{const v=e.target.value;if(v!=='+'){lvl=v;draw();return;}
 const top=H.levels[H.levels.length-1],ws=H.walls.filter(w=>w.level===top.name),nm=(H.levels.length+1)+'NP';
 const r=await dlg('Pridať podlažie '+nm,'<p>Obvodové steny sa skopírujú z podlažia '+esc(top.name)+' a pridajú sa predvolené schody (môžete ich presunúť zmazaním a novým vložením 🪜).</p>',[['Zrušiť',null],['Pridať prázdne','e'],['Pridať s kópiou stien','c','go']]);
 if(!r){lvUI();return;}snap();const L={name:nm,elevation:Math.round((top.elevation+top.height+.25)*100)/100,height:2.7};H.levels.push(L);
 if(r.v==='c')ws.forEach((w,i)=>H.walls.push({...JSON.parse(JSON.stringify(w)),id:'c'+Date.now()+i,level:nm,height:L.height,openings:(w.openings||[]).filter(o=>o.type==='window')}));
 let xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]);if(!xs.length){xs=[0];zs=[0];}
 (H.stairs=H.stairs||[]).push({level:top.name,pos:[r2(Math.min(...xs)+.5),r2(Math.min(...zs)+.5)],dir:0,width:1,length:3.6});lvl=nm;lvUI();save();draw();};
function setTool(t){const b=document.querySelector('[data-t='+t+']');tool=t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));$('hint').textContent=HINT[t];calPts=[];draw();}
$('cal').onclick=()=>{if(!H.underlay){dlg('Najprv nahrajte výkres','',[['OK',1]]);return;}setTool('cal');};
async function calDone(){const d=Math.hypot(calPts[1][0]-calPts[0][0],calPts[1][1]-calPts[0][1]);
 const r=await dlg('Aká dlhá je označená úsečka?','<input type="text" inputmode="decimal" placeholder="napr. 8,5"> <p style="color:#9fb3c8;font-size:13px">Zadajte v metroch.</p>',[['Zrušiť',null],['Nastaviť mierku',1,'go']]);
 const v=r&&parseFloat((r.name||'').replace(',','.'));setTool('wall');if(!v||!d)return;const f=v/d;snap();
 bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;banner();$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);w.thickness=Math.max(.1,Math.round(w.thickness*f*20)/20);(w.openings||[]).forEach(o=>{o.offset*=f;o.width=Math.min(o.width,o.width*f>.5?o.width:o.width);});});save();fit();
 if(!H.walls.length)recog(1);}
function busy(t){let b=$('busy');if(!t){if(b)b.remove();return;}if(!b){b=document.createElement('div');b.id='busy';document.body.appendChild(b);}b.innerHTML='<div class="spin"></div><div>'+t+'</div>';}
function banner(){$('ban').hidden=!(H.underlay&&H.underlay.guess&&!H.underlay.cal&&H.walls.length);}
let recBusy=0;
async function recog(quiet,nosnap){if(!bg||!bg.complete||!bg.width){if(!quiet)dlg('Najprv nahrajte výkres','',[['OK',1]]);return;}if(recBusy)return;recBusy=1;busy('Rozpoznávam steny…');await new Promise(r=>setTimeout(r,40));
 let R=null;const man=H.walls.some(w=>!w.auto);try{R=detectWalls(bg,{sens:+$('sens').value,mW:H.underlay.cal||man?bgW:null,rect:H.underlay.rect||man,site:H.underlay.site&&!man,w:bgW});if(man)R.guess=false;}catch(e){console.warn(e);}
 const ws=R?R.walls:[];busy(0);recBusy=0;if(!nosnap)snap();const lv=LV();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lv.name));
 if(R&&!H.underlay.rect&&!man){H.underlay={src:R.mode==='plan'?R.canvas.toDataURL('image/jpeg',.85):H.underlay.src,w:R.w,rect:1,guess:R.guess,site:R.mode==='site'?1:0};}else if(R&&R.guess&&!H.underlay.cal){H.underlay.w=R.w;H.underlay.guess=true;}
 H.walls=H.walls.concat(ws.map((w,i)=>({id:'a'+Date.now()+i,auto:1,level:lv.name,start:w.start,end:w.end,thickness:w.thickness,base:0,height:lv.height,openings:[]})));
 save();const u=H.underlay;bgW=u.w;$('imw').value=bgW;if(!bg.src.endsWith(u.src.slice(-40))){bg=new Image();bg.onload=()=>{fit();};bg.src=u.src;}else fit();banner();
 const md=R?R.mode:'none';window.__mode=md;
 $('hint').textContent=md==='site'?'🏡 Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokresli alebo nahraj pôdorys.':ws.length?'✅ Rozpoznaných '+ws.length+' stien. Ak niečo chýba alebo prebýva, posuňte „Citlivosť“. Opravy: ✋ Posunúť, 🗑 Zmazať, ↶ Späť.':'⚠️ Na obrázku sme nenašli steny ani obrys domu. Výkres zostáva ako podklad – steny nakreslite ručne (✏️ Stena) alebo nahrajte pôdorys.';
 if(md==='site'&&!quiet2.v&&!H.underlay.cal&&!man){quiet2.v=1;dlg('Situácia pozemku','<p>Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokresli alebo nahraj pôdorys.</p><p>Aká dlhá je dlhšia strana domu (v metroch)? Nájdete ju na kóte, napr. „14400“ = 14,4 m.</p><input type="text" inputmode="decimal" placeholder="napr. 14,4">',[['Neskôr',null],['Nastaviť','ok','go']]).then(r=>{quiet2.v=0;const v=parseFloat(((r&&r.name)||'').replace(',','.'));if(r&&v>2&&v<100)scaleBy(v/(R.longPx/R.ppm));});}
 window.__rec=ws.length;}
const quiet2={v:0};
function scaleBy(f){snap();bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);});save();fit();banner();}
$('rec').onclick=()=>recog();$('recx').onclick=()=>{const n=H.walls.filter(w=>w.auto&&w.level===lvl).length;if(!n)return;snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));save();draw();$('hint').textContent='Rozpoznané steny vymazané ('+n+'). ↶ Späť ich vráti.';};let sT;$('sens').oninput=()=>{clearTimeout(sT);sT=setTimeout(()=>H.underlay&&recog(1),350);};$('banc').onclick=()=>$('cal').click();
function afterImg(ns){const go=()=>{fit();recog(1,ns===2);};bg.complete&&bg.width?go():bg.onload=()=>{draw();go();};}
const pickImg=m=>{imgMode=m;$('img').value='';$('img').click();};
$('upl').onclick=()=>pickImg('ask');
$('img').onchange=async e=>{const f=e.target.files[0];if(!f)return;const src=await readImg(f);if(!src)return;let m=imgMode;
 if(m==='ask'&&H.walls.length){const r=await dlg('Nahrali ste výkres','<p>Tento projekt už má nakreslené steny. Čo chcete urobiť?</p>',[['Zrušiť',null],['Vymeniť podklad v tomto projekte','swap'],['Nový projekt z tohto výkresu','new','go']]);if(!r)return;m=r.v;}
 if(m==='new'){const n=await askName(f.name.replace(/\.[^.]+$/,''));if(n){newP(n,[],{src,w:20});afterImg();}}
 else{snap();H.walls=H.walls.filter(w=>!w.auto);H.underlay={src,w:20};setBg();save();afterImg(2);}};
async function act(m){$('dd').classList.remove('on');
 if(m==='new'){const n=await askName('Nový dom');if(n)newP(n);}
 if(m==='newimg')pickImg('new');if(m==='open')$('ld').click();if(m==='mine')show('home');
 if(m==='demo')newP('Ukážkový dom',JSON.parse(JSON.stringify(DEMO.walls)));
 if(m==='dl'){save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(H,null,1)],{type:'application/json'}));a.download=(H.name||'dom')+'.json';a.click();}}
$('menu').onclick=e=>{e.stopPropagation();$('dd').classList.toggle('on');};document.addEventListener('click',()=>$('dd').classList.remove('on'));
document.querySelectorAll('#dd a').forEach(a=>a.onclick=()=>act(a.dataset.m));
$('logo').onclick=()=>show('home');$('hNew').onclick=()=>act('new');$('hImg').onclick=()=>act('newimg');$('hDemo').onclick=()=>act('demo');
function home(){const L=idx();$('plist').innerHTML=L.length?'':'<p style="color:#9fb3c8">Zatiaľ žiadne projekty.</p>';L.forEach(p=>{const d=document.createElement('div');d.className='pc';d.innerHTML='<b>'+esc(p.name)+'</b><small>'+new Date(p.date).toLocaleString('sk-SK')+'</small><button class="x" title="Zmazať">🗑</button><button class="rn" title="Premenovať">✏️</button>';
 d.onclick=()=>openP(p.id);d.querySelector('.rn').onclick=async e=>{e.stopPropagation();const n=await askName(p.name,'Premenovať projekt','Uložiť');if(!n)return;const P=JSON.parse(localStorage.getItem('vks_p_'+p.id));P.name=n;localStorage.setItem('vks_p_'+p.id,JSON.stringify(P));localStorage.setItem(IDX,JSON.stringify(idx().map(x=>x.id===p.id?{...x,name:n}:x)));if(p.id===PID)H.name=n;home();};d.querySelector('.x').onclick=async e=>{e.stopPropagation();if(await dlg('Zmazať projekt „'+esc(p.name)+'“?','',[['Nie',null],['Zmazať',1]])){localStorage.removeItem('vks_p_'+p.id);localStorage.setItem(IDX,JSON.stringify(idx().filter(x=>x.id!==p.id)));if(p.id===PID)PID=null;home();}};$('plist').appendChild(d);});}
$('ld').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t);if(!j.walls)throw 0;j.name=j.name||f.name.replace(/\.json$/,'');openP('p'+Date.now(),j);}catch(_){alert('Neplatný súbor projektu.');}});};
addEventListener('resize',()=>{if($('ed').classList.contains('on'))fit();});
// ---------- 3D ----------
let R,scene,cam,rig,orb,world,loco,body,inited=false,walk=false,roof='flat';const clock=new THREE.Clock(),keys={},joy=[0,0];let yaw=0,pitch=0;
const std=(c,r=.9)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const M={wall:std(0xf2efe9),ext:std(0xe9e4da),floor:std(0xb48a5a,.6),ceil:std(0xfafafa),glass:new THREE.MeshPhysicalMaterial({color:0xcfe6f5,transparent:true,opacity:.25,roughness:.05}),frame:std(0x3a3d42,.5),door:std(0xd8cbb2,.6),roof:std(0x6b4a3a,.8),stair:std(0x9c7a55,.6),ground:std(0x6f9a4f,1)};
function init3(){inited=true;R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.xr.enabled=true;R.toneMapping=THREE.ACESFilmicToneMapping;$('v3').appendChild(R.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xbfd8f0);const pm=new THREE.PMREMGenerator(R);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.6;
 scene.add(new THREE.HemisphereLight(0xffffff,0x88aa66,1.2));const sun=new THREE.DirectionalLight(0xfff4e0,2.2);sun.position.set(8,15,6);scene.add(sun);
 rig=new THREE.Group();cam=new THREE.PerspectiveCamera(65,1,.05,300);rig.add(cam);scene.add(rig);orb=new OrbitControls(cam,R.domElement);
 const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200).rotateX(-Math.PI/2),M.ground);g.position.y=-.02;scene.add(g);
 document.body.appendChild(VRButton.createButton(R));
 R.xr.addEventListener('sessionstart',()=>{setWalk(false,true);loco&&loco.init&&loco.init();});R.xr.addEventListener('sessionend',()=>place(walk));
 // desktop/mobile walking: drag = look, WASD/arrows or joystick = move
 const el=R.domElement;let lk=null;el.addEventListener('pointerdown',e=>{if(walk&&!R.xr.isPresenting)lk=[e.clientX,e.clientY];});addEventListener('pointerup',()=>lk=null);
 el.addEventListener('pointermove',e=>{if(!lk)return;yaw+=(e.clientX-lk[0])*.005;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-lk[1])*.004));lk=[e.clientX,e.clientY];});
 addEventListener('keydown',e=>keys[e.code]=1);addEventListener('keyup',e=>keys[e.code]=0);
 const J=$('joy'),K=J.firstElementChild;let jid=null;J.addEventListener('pointerdown',e=>{jid=e.pointerId;J.setPointerCapture(jid);jm(e);});J.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
 const je=()=>{jid=null;joy[0]=joy[1]=0;K.style.transform='';};J.addEventListener('pointerup',je);J.addEventListener('pointercancel',je);
 function jm(e){const r=J.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}joy[0]=x;joy[1]=y;K.style.transform=`translate(${x*35}px,${y*35}px)`;}
 R.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05),s=R.xr.getSession();if(!s&&(document.hidden||!$('vw').offsetWidth))return;if(s&&loco)loco.update(dt,s.inputSources);else if(!s){if(walk)walkTick(dt);else orb.update();}R.render(scene,cam);});
 new ResizeObserver(()=>{const r=$('v3').getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();}).observe($('v3'));}
function walkTick(dt){let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy[1],r=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy[0];
 if(keys.ArrowLeft)yaw-=dt*1.8;if(keys.ArrowRight)yaw+=dt*1.8;const sp=1.6*dt*(keys.ShiftLeft?2:1),p=rig.position;
 if(f||r){p.x+=(Math.sin(yaw)*f+Math.cos(yaw)*r)*sp;p.z+=(-Math.cos(yaw)*f+Math.sin(yaw)*r)*sp;if(body)body.resolve(p);}
 if(body){const y=body.floor(p);if(y!==null)p.y=y;}cam.position.set(0,1.6,0);cam.rotation.set(0,0,0);rig.rotation.set(0,0,0);cam.quaternion.setFromEuler(new THREE.Euler(-pitch,-yaw,0,'YXZ'));}
// interior cells via flood fill from outside on a 10 cm grid (per level)
function cells(ws,stairsHole){const C=.1;let xs=[],zs=[];ws.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});const x0=Math.min(...xs)-.5,z0=Math.min(...zs)-.5,
 nx=Math.ceil((Math.max(...xs)+.5-x0)/C),nz=Math.ceil((Math.max(...zs)+.5-z0)/C),g=new Uint8Array(nx*nz);
 ws.forEach(w=>{const G=geo(w),n=Math.ceil(G.L/(C/2)),t=w.thickness/2+.06;for(let i=0;i<=n;i++){const s=i*G.L/n;for(let k=-t;k<=t;k+=C/2){const x=G.x0+G.u[0]*s-G.u[1]*k,z=G.z0+G.u[1]*s+G.u[0]*k,ix=((x-x0)/C)|0,iz=((z-z0)/C)|0;if(ix>=0&&iz>=0&&ix<nx&&iz<nz)g[iz*nx+ix]=1;}}});
 const q=[0];g[0]=2;while(q.length){const i=q.pop(),x=i%nx,z=(i/nx)|0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=nx||Z>=nz)continue;const j=Z*nx+X;if(!g[j]){g[j]=2;q.push(j);}}}
 const rects=[];for(let z=0;z<nz;z++){let s=-1;for(let x=0;x<=nx;x++){const cx0=x0+x*C+C/2,cz=z0+z*C+C/2;const inH=stairsHole&&stairsHole.some(h=>cx0>h[0]&&cx0<h[2]&&cz>h[1]&&cz<h[3]);const v=x<nx&&g[z*nx+x]!==2&&!inH;
  if(v&&s<0)s=x;if(!v&&s>=0){rects.push([x0+s*C,z0+z*C,x0+x*C,z0+(z+1)*C]);s=-1;}}}
 // merge vertically identical runs
 const out=[];rects.forEach(r=>{const p=out.find(o=>o[0]===r[0]&&o[2]===r[2]&&Math.abs(o[3]-r[1])<1e-6);if(p)p[3]=r[3];else out.push(r);});return out;}
function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function build(){const root=new THREE.Group(),lv={};H.levels.forEach(l=>lv[l.name]=l);let xs=[],zs=[];
 const add=(geom,mat,x,y,z,ry=0,nc)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.rotation.y=ry;if(nc)m.userData.noCol=true;root.add(m);return m;};
 const box=(w,s0,s1,y0,y1,mat,t,tOff=0,nc)=>{if(s1-s0<.005||y1-y0<.005)return;const g=geo(w);t=t||w.thickness;return add(new THREE.BoxGeometry(s1-s0,y1-y0,t),mat,g.x0+g.u[0]*(s0+s1)/2-g.u[1]*tOff,y0+(y1-y0)/2,g.z0+g.u[1]*(s0+s1)/2+g.u[0]*tOff,-Math.atan2(g.u[1],g.u[0]),nc);};
 H.walls.forEach(w=>{const L=geo(w).L,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0),h=w.height||2.8;xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);
  const ops=[...(w.openings||[])].sort((a,b)=>a.offset-b.offset);let s=0;
  ops.forEach(o=>{const sl=o.sill||0,a=o.offset,b=a+o.width,f=.06;box(w,s,a,e,e+h,M.wall);box(w,a,b,e,e+sl,M.wall);box(w,a,b,e+sl+o.height,e+h,M.wall);
   if(o.type==='window'){box(w,a,b,e+sl+f,e+sl+o.height-f,M.glass,.02,0,1);box(w,a,b,e+sl,e+sl+f,M.frame,.08);box(w,a,b,e+sl+o.height-f,e+sl+o.height,M.frame,.08);box(w,a,a+f,e+sl,e+sl+o.height,M.frame,.08);box(w,b-f,b,e+sl,e+sl+o.height,M.frame,.08);}
   else{box(w,a,a+.05,e,e+o.height,M.frame,w.thickness+.02);box(w,b-.05,b,e,e+o.height,M.frame,w.thickness+.02);box(w,a,b,e+o.height-.05,e+o.height,M.frame,w.thickness+.02);
    const G=geo(w),ang=-Math.atan2(G.u[1],G.u[0]),hx=G.x0+G.u[0]*(a+.05)+(-G.u[1])*(w.thickness/2),hz=G.z0+G.u[1]*(a+.05)+G.u[0]*(w.thickness/2),lw=o.width-.1,open=-1.3;
    const leaf=new THREE.Mesh(new THREE.BoxGeometry(lw,o.height-.06,.04),M.door);leaf.position.set(lw/2,(o.height-.06)/2,0);const piv=new THREE.Group();piv.position.set(hx,e,hz);piv.rotation.y=ang+open;piv.add(leaf);piv.userData.noCol=true;root.add(piv);}
   s=b;});box(w,s,L,e,e+h,M.wall);});
 if(!xs.length)return null;const fp=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];root.userData.fp=fp;
 const stairs=H.stairs||[];
 H.levels.forEach((l,i)=>{const ws=H.walls.filter(w=>w.level===l.name);if(!ws.length)return;const hole=stairs.filter(st=>st.level===(H.levels[i-1]||{}).name).map(stairRect);
  cells(ws,hole).forEach(r=>{add(new THREE.BoxGeometry(r[2]-r[0],.1,r[3]-r[1]),M.floor,(r[0]+r[2])/2,l.elevation-.05+.001*i,(r[1]+r[3])/2);
   const up=H.levels[i+1],topH=Math.max(...ws.map(w=>w.height||l.height));if(!up)add(new THREE.BoxGeometry(r[2]-r[0],.05,r[3]-r[1]),M.ceil,(r[0]+r[2])/2,l.elevation+topH+.025,(r[1]+r[3])/2,0,1).userData.ceil=1;});});
 stairs.forEach(st=>{const l=lv[st.level],up=H.levels[H.levels.indexOf(l)+1];if(!l)return;const rise=up?up.elevation-l.elevation:l.height,n=Math.max(2,Math.round(rise/.18)),L=st.length||3.6,W=st.width||1,d=st.dir||0;
  for(let k=0;k<n;k++){const sx=(k+.5)*L/n,m=add(new THREE.BoxGeometry(L/n,(k+1)*rise/n,W),M.stair,st.pos[0]+Math.cos(d)*sx-Math.sin(d)*W/2,l.elevation+(k+1)*rise/n/2,st.pos[1]+Math.sin(d)*sx+Math.cos(d)*W/2,-d);}});
 const top=H.levels[H.levels.length-1],tw=H.walls.filter(w=>w.level===top.name),th=top.elevation+Math.max(...(tw.length?tw:H.walls).map(w=>w.height||2.8));
 if(roof!=='none'){const o=.4,W=fp[2]-fp[0]+2*o,D=fp[3]-fp[1]+2*o,cx=(fp[0]+fp[2])/2,cz=(fp[1]+fp[3])/2;
  if(roof==='flat')add(new THREE.BoxGeometry(W,.25,D),M.roof,cx,th+.175,cz,0,1).userData.roof=1;
  else{const rh=Math.min(W,D)*.35,sh=new THREE.Shape([new THREE.Vector2(-D/2,0),new THREE.Vector2(D/2,0),new THREE.Vector2(0,rh)]),gm=new THREE.ExtrudeGeometry(sh,{depth:W,bevelEnabled:false});gm.translate(0,0,-W/2);
   add(gm,M.roof,cx,th+.05,cz,Math.PI/2,1).userData.roof=1;}}
 return root;}
function place(inside){if(!world)return;const fp=world.userData.fp,c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2];rig.position.set(0,0,0);rig.rotation.set(0,0,0);
 if(R.xr.isPresenting||inside){rig.position.set(c[0],H.levels[0].elevation,c[1]);if(body){body.resolve(rig.position);}cam.position.set(0,R.xr.isPresenting?0:1.6,0);yaw=0;pitch=0;}
 else{cam.quaternion.identity();cam.position.set(c[0]+(fp[2]-fp[0]),Math.max(fp[2]-fp[0],fp[3]-fp[1])*1.1,c[1]+(fp[3]-fp[1])*1.3);orb.target.set(c[0],0,c[1]);orb.update();}}
function setWalk(v,xr){walk=v;orb.enabled=!v;$('joy').style.display=v&&!xr&&TCH?'block':'none';world&&world.traverse(o=>{if(o.userData.roof)o.visible=!v&&!xr;if(o.userData.ceil)o.visible=v||!!xr;});place(v||xr);
 $('walk').textContent=v?'🔄 Pohľad zvonka':'🚶 Prechádzka';$('st').textContent=v?(TCH?'Joystick vľavo dole = chôdza, ťahaj prstom = rozhliadanie.':'W A S D / šípky = chôdza, ťahaj myšou = rozhliadanie, Shift = rýchlejšie.'):(TCH?'Ťahaj = otáčanie, 2 prsty = zoom.':'Ťahaj = otáčanie, koliesko = zoom.')+' Okuliare VR: tlačidlo dole.';}
function gen(){if(!inited)init3();if(world)scene.remove(world);world=build();if(!world){$('st').textContent='Najprv nakreslite steny v Pôdoryse.';return;}scene.add(world);
 const colRoot=new THREE.Group();world.updateMatrixWorld(true);world.traverse(o=>{if(o.isMesh&&!o.userData.noCol&&!(o.parent&&o.parent.userData.noCol)){const m=o.clone();m.matrixAutoUpdate=false;m.matrix.copy(o.matrixWorld);colRoot.add(m);}});colRoot.updateMatrixWorld(true);
 try{const col=colliderFromObject(colRoot);body=new Body(col,{radius:.18});if(!loco)loco=new Locomotion({renderer:R,rig,camera:cam,scene,body,speed:1.4,snapDeg:30});else loco.body=body;}catch(err){console.warn('kolízie',err);}
 setWalk(walk);}
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};
$('glb').onclick=()=>{if(!world)return;new GLTFExporter().parse(world,b=>dl(new Blob([b],{type:'model/gltf-binary'}),(H.name||'dom')+'.glb'),e=>alert('Export zlyhal: '+e),{binary:true});};
async function packH(){const j={...H,underlay:undefined,roof};const st=new Blob([JSON.stringify(j)]).stream().pipeThrough(new CompressionStream('gzip'));const b=new Uint8Array(await new Response(st).arrayBuffer());let t='';b.forEach(c=>t+=String.fromCharCode(c));return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function unpackH(t){const b=Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
$('share').onclick=async()=>{const url=location.href.split('#')[0]+'#t='+await packH();
 const r=await dlg('Zdieľať prehliadku','<p>Odkaz otvorí iba 3D prehliadku (bez editora). Pošlite ho klientovi.</p><input type="text" readonly value="'+esc(url)+'">',[['Zavrieť',null],['⬇ Stiahnuť ako súbor','f'],['📋 Kopírovať odkaz','c','go']]);
 if(r&&r.v==='c'){try{await navigator.clipboard.writeText(url);}catch(e){}}
 if(r&&r.v==='f')dl(new Blob(['<!doctype html><meta charset="utf-8"><title>'+esc(H.name)+' – prehliadka</title><meta http-equiv="refresh" content="0;url='+esc(url)+'"><a href="'+esc(url)+'">Otvoriť prehliadku</a>'],{type:'text/html'}),(H.name||'dom')+' - prehliadka.html');};
$('roof').onchange=e=>{roof=e.target.value;gen();};
function show(s){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.s===s));document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('on',x.id===s));
 $('tbed').classList.toggle('on',s==='ed');if(s==='home'){home();}$('tbvw').classList.toggle('on',s==='vw');const vb=$('VRButton');if(vb)vb.style.display=s==='vw'?'':'none';if(s==='vw')gen();else if(s==='ed')fit();}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.s));$('gen').onclick=()=>show('vw');
const _sh=show;
$('walk').onclick=()=>setWalk(!walk);
const TH=location.hash.match(/^#t=(.+)/);
if(TH){unpackH(TH[1]).then(j=>{H=j;PID=null;lvl=H.levels[0].name;if(j.roof){roof=j.roof;$('roof').value=roof;}document.body.classList.add('viewonly');show('vw');window.__ok=true;}).catch(()=>{alert('Odkaz na prehliadku je poškodený.');load();window.__ok=true;});}
else{load();window.__ok=true;}
if(!TH&&!localStorage.vks_seen){localStorage.vks_seen=1;dlg('Vitajte vo Vkroč Štúdiu','<p>1. 🖼 <b>Nahrajte výkres</b> pôdorysu – steny sa skúsia rozpoznať samé.<br>2. 📏 <b>Nastavte mierku</b> – označte známu dĺžku.<br>3. Opravte steny (✏️ ✋ 🗑), pridajte 🚪 dvere a 🪟 okná.<br>4. ▶ <b>Vygenerovať 3D</b> – prechádzka aj vo VR okuliaroch.</p>',[['Rozumiem',1,'go']]);}

window.__dbg={get H(){return H},toS:p=>toS(p),get lvl(){return lvl},get undo(){return undo.length}};
