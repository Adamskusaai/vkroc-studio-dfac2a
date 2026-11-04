import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRButton} from 'three/addons/webxr/VRButton.js';
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
function save(){if(!PID)return;const L=idx().filter(p=>p.id!==PID);L.unshift({id:PID,name:H.name,date:Date.now()});try{localStorage.setItem('vks_p_'+PID,JSON.stringify(H));localStorage.setItem(IDX,JSON.stringify(L));}catch(e){alert('Úložisko prehliadača je plné – stiahnite projekt ako súbor.');}}
function setBg(){bg=null;bgW=H.underlay?H.underlay.w:12;$('imw').value=bgW;if(H.underlay){bg=new Image();bg.onload=draw;bg.src=H.underlay.src;}}
function openP(id,data){PID=id;H=data||JSON.parse(localStorage.getItem('vks_p_'+id));if(!H.levels)H.levels=JSON.parse(JSON.stringify(DEMO.levels));undo=[];setBg();save();show('ed');}
const newP=(name,walls=[],ul=null)=>openP('p'+Date.now(),{...JSON.parse(JSON.stringify(DEMO)),name,walls,underlay:ul});
function load(){const L=idx();if(L.length){try{openP(L[0].id);return;}catch(e){}}newP('Ukážkový dom',JSON.parse(JSON.stringify(DEMO.walls)));}
const snap=()=>{undo.push(JSON.stringify(H));if(undo.length>80)undo.shift();};
// ---------- editor ----------
const cv=$('cv'),cx=cv.getContext('2d');
const TCH=matchMedia('(pointer:coarse)').matches;
const HINT0={wall:'Ťahaj myšou = nová stena (prichytáva sa ku koncom stien). Koliesko/2 prsty = zoom a posun.',move:'Ťahaj koniec steny (bodku) alebo celú stenu. Dvere/okno ťahaj po stene.',door:'Klikni na stenu = vložia sa dvere.',window:'Klikni na stenu = vloží sa okno.',del:'Klikni na stenu, dvere alebo okno = zmaže sa.'};
const HINT=Object.fromEntries(Object.entries(HINT0).map(([k,v])=>[k,TCH?v.replace('Ťahaj myšou','Ťahaj prstom').replace('Koliesko/2 prsty','2 prsty').replace(/Klikni/g,'Ťukni'):v]));HINT.cal='Ťukni/klikni na začiatok a koniec známej dĺžky (napr. kótovaná stena).';
function fit(){const r=cv.getBoundingClientRect();cv.width=r.width*devicePixelRatio;cv.height=r.height*devicePixelRatio;
 let xs=[0,10],zs=[0,8];if(bg&&bg.width){xs.push(0,bgW);zs.push(0,bgW*bg.height/bg.width);}H.walls.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});
 const x0=Math.min(...xs)-.3,x1=Math.max(...xs)+.3,z0=Math.min(...zs)-.3,z1=Math.max(...zs)+.3;view.s=Math.min(cv.width/(x1-x0),cv.height/(z1-z0));view.x=x0;view.y=z0;draw();}
const toS=p=>[(p[0]-view.x)*view.s,(p[1]-view.y)*view.s],toW=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*devicePixelRatio/view.s+view.x,(e.clientY-r.top)*devicePixelRatio/view.s+view.y];};
const r2=v=>Math.round(v*20)/20;
function geo(w){const[x0,z0]=w.start,[x1,z1]=w.end,L=Math.hypot(x1-x0,z1-z0)||1e-9;return{x0,z0,L,u:[(x1-x0)/L,(z1-z0)/L]};}
function proj(w,p){const g=geo(w),s=(p[0]-g.x0)*g.u[0]+(p[1]-g.z0)*g.u[1],t=-(p[0]-g.x0)*g.u[1]+(p[1]-g.z0)*g.u[0];return{s,t,g};}
function hitWall(p){let b=null,bd=.35;H.walls.forEach(w=>{const q=proj(w,p);if(q.s>=-.1&&q.s<=q.g.L+.1&&Math.abs(q.t)<Math.max(bd,w.thickness/2+.05)){const d=Math.abs(q.t);if(d<bd||!b){bd=d;b={w,s:q.s};}}});return b;}
function hitOp(p){for(const w of H.walls){const q=proj(w,p);if(Math.abs(q.t)>w.thickness/2+.15)continue;for(const o of w.openings||[])if(q.s>=o.offset&&q.s<=o.offset+o.width)return{w,o,ds:q.s-o.offset};}return null;}
let TOUCH=false;
function hitEnd(p){let b=null,bd=(TOUCH?30:12)*devicePixelRatio/view.s;H.walls.forEach(w=>['start','end'].forEach(k=>{const d=Math.hypot(w[k][0]-p[0],w[k][1]-p[1]);if(d<bd){bd=d;b={w,k};}}));return b;}
function snapPt(p,skip){let b=[r2(p[0]),r2(p[1])],bd=(TOUCH?28:15)*devicePixelRatio/view.s;H.walls.forEach(w=>{if(w===skip)return;['start','end'].forEach(k=>{const d=Math.hypot(w[k][0]-p[0],w[k][1]-p[1]);if(d<bd){bd=d;b=[...w[k]];}});});return b;}
function ortho(a,b){if(obl)return b;return Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?[b[0],a[1]]:[a[0],b[1]];}
function quad(w,s0,s1,t0,t1){const g=geo(w),v=[-g.u[1],g.u[0]];cx.beginPath();[[s0,t0],[s1,t0],[s1,t1],[s0,t1]].forEach(([s,t],i)=>{const P=toS([g.x0+g.u[0]*s+v[0]*t,g.z0+g.u[1]*s+v[1]*t]);i?cx.lineTo(...P):cx.moveTo(...P);});cx.closePath();cx.fill();}
function draw(){cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#f7f8fa';cx.fillRect(0,0,cv.width,cv.height);
 if(bg){const P=toS([0,0]),w=bgW*view.s;cx.globalAlpha=.6;cx.drawImage(bg,P[0],P[1],w,w*bg.height/bg.width);cx.globalAlpha=1;}
 cx.strokeStyle='#e3e7ee';cx.lineWidth=1;const x0=Math.floor(view.x),y0=Math.floor(view.y);for(let i=x0;i<x0+cv.width/view.s+1;i++){const a=toS([i,0])[0];cx.beginPath();cx.moveTo(a,0);cx.lineTo(a,cv.height);cx.stroke();}
 for(let i=y0;i<y0+cv.height/view.s+1;i++){const a=toS([0,i])[1];cx.beginPath();cx.moveTo(0,a);cx.lineTo(cv.width,a);cx.stroke();}
 H.walls.forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='#374151';quad(w,0,g.L,-t,t);
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
 if(['door','window','del'].includes(tool))lastAct=Date.now();
 if(e.button===2){drag={k:'pan',e0:[e.clientX,e.clientY],v0:{...view}};return;}
 if(tool==='cal'){calPts.push(p);draw();if(calPts.length===2)calDone();return;}
 if(tool==='wall'){drag={k:'new',a:snapPt(p),b:snapPt(p)};}
 else if(tool==='move'){const en=hitEnd(p);if(en){snap();drag={k:'end',w:en.w,key:en.k};return;}const op=hitOp(p);if(op){snap();drag={k:'op',...op};return;}const h=hitWall(p);if(h){snap();drag={k:'wall',w:h.w,p0:p,a:[...h.w.start],b:[...h.w.end]};return;}drag={k:'pan',e0:[e.clientX,e.clientY],v0:{...view}};}
 else if(tool==='door'||tool==='window'){const h=hitWall(p);if(!h)return;const d=tool==='door',wd=d?.9:1.2,g=geo(h.w);if(g.L<wd+.1)return;snap();
  (h.w.openings=h.w.openings||[]).push(d?{type:'door',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:0,height:2.05}:{type:'window',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:.9,height:1.4});save();draw();}
 else if(tool==='del'){const op=hitOp(p);if(op){snap();op.w.openings.splice(op.w.openings.indexOf(op.o),1);}else{const h=hitWall(p);if(!h)return;snap();H.walls.splice(H.walls.indexOf(h.w),1);}save();draw();}});
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
 if(drag.k==='new'&&Math.hypot(drag.b[0]-drag.a[0],drag.b[1]-drag.a[1])>.2){snap();H.walls.push({id:'w'+Date.now(),level:H.levels[0].name,start:drag.a,end:drag.b,thickness:+$('th').value/100,base:0,height:H.levels[0].height,openings:[]});}
 drag=null;save();draw();};
cv.addEventListener('pointerup',pu);cv.addEventListener('pointercancel',pu);
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
$('hint').textContent=HINT.wall;
$('undo').onclick=()=>{if(undo.length){H=JSON.parse(undo.pop());save();draw();}};
addEventListener('keydown',e=>{if(e.target.tagName!=='INPUT'&&(e.ctrlKey||e.metaKey)&&e.key==='z')$('undo').onclick();});
$('th').oninput=()=>{$('thv').textContent=$('th').value+' cm';};
$('th').onchange=()=>{snap();const t=+$('th').value/100;H.walls.forEach(w=>{if(w.thickness>=.2||t<.2)w.thickness=t;});save();draw();};
$('imw').oninput=()=>{bgW=+$('imw').value||12;if(H.underlay){H.underlay.w=bgW;save();}draw();};
$('obl').onclick=()=>{obl=!obl;$('obl').textContent='📐 Šikmé steny: '+(obl?'ZAP':'VYP');$('obl').classList.toggle('on',obl);};
function dlg(title,body,btns){return new Promise(res=>{$('ovb').innerHTML='<h3>'+title+'</h3>'+(body||'')+'<div class="bs"></div>';const bs=$('ovb').querySelector('.bs');
 btns.forEach(([t,v,c])=>{const b=document.createElement('button');b.textContent=t;if(c)b.className=c;b.onclick=()=>{const i=$('ovb').querySelector('input');$('ov').classList.remove('on');res(v===null?null:{v,name:i&&i.value.trim()});};bs.appendChild(b);});
 $('ov').classList.add('on');const i=$('ovb').querySelector('input');if(i){i.focus();i.onkeydown=e=>{if(e.key==='Enter')bs.lastChild.click();};}});}
const esc=t=>String(t).replace(/[<>&"]/g,c=>'&#'+c.charCodeAt(0)+';');
async function askName(def){const r=await dlg('Názov projektu','<input type="text" value="'+esc(def)+'" placeholder="napr. Rodinný dom Kováč">',[['Zrušiť',null],['Vytvoriť',1,'go']]);return r?(r.name||def):null;}
function readImg(f){return new Promise(res=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,2000/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.8));};im.src=r.result;};r.readAsDataURL(f);});}
let imgMode='ask',calPts=[];
function setTool(t){const b=document.querySelector('[data-t='+t+']');tool=t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));$('hint').textContent=HINT[t];calPts=[];draw();}
$('cal').onclick=()=>{if(!H.underlay){dlg('Najprv nahrajte výkres','',[['OK',1]]);return;}setTool('cal');};
async function calDone(){const d=Math.hypot(calPts[1][0]-calPts[0][0],calPts[1][1]-calPts[0][1]);
 const r=await dlg('Aká dlhá je označená úsečka?','<input type="text" inputmode="decimal" placeholder="napr. 8,5"> <p style="color:#9fb3c8;font-size:13px">Zadajte v metroch.</p>',[['Zrušiť',null],['Nastaviť mierku',1,'go']]);
 const v=r&&parseFloat((r.name||'').replace(',','.'));setTool('wall');if(!v||!d)return;const f=v/d;snap();
 bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);w.thickness=Math.max(.1,Math.round(w.thickness*f*20)/20);(w.openings||[]).forEach(o=>{o.offset*=f;o.width=Math.min(o.width,o.width*f>.5?o.width:o.width);});});save();fit();
 if(!H.walls.length)recog();}
async function recog(){if(!bg||!bg.complete||!bg.width){dlg('Najprv nahrajte výkres','',[['OK',1]]);return;}$('hint').textContent='Rozpoznávam steny…';await new Promise(r=>setTimeout(r,30));
 let ws=[];try{ws=detectWalls(bg,bgW);}catch(e){console.warn(e);}
 if(!ws.length){$('hint').textContent=HINT[tool];dlg('Steny sa nepodarilo rozpoznať','<p>Na výkrese sme nenašli hrubé čiary stien (napr. ide o situáciu, fotku alebo slabý sken). Steny nakreslite ručne nástrojom ✏️ Stena – výkres zostane ako podklad.</p>',[['OK',1,'go']]);return;}
 snap();const lv=H.levels[0];H.walls=H.walls.concat(ws.map((w,i)=>({id:'a'+Date.now()+i,level:lv.name,start:w.start,end:w.end,thickness:w.thickness,base:0,height:lv.height,openings:[]})));save();fit();
 $('hint').textContent='Rozpoznaných '+ws.length+' stien. Skontrolujte ich: ✋ Posunúť opraví polohu, 🗑 Zmazať odstráni chybné, ↶ Späť vráti. Mierku nastavte cez 📏.';}
$('rec').onclick=()=>{if(H.walls.length)dlg('Rozpoznať steny znova?','<p>Nové steny sa pridajú k existujúcim.</p>',[['Zrušiť',null],['Rozpoznať',1,'go']]).then(r=>r&&recog());else recog();};
function afterImg(){const go=()=>{fit();recog().then(()=>{if(H.walls.length)dlg('Nastavte mierku','<p>Pre správne rozmery označte na výkrese známu dĺžku: 📏 Mierka → ťuknite na 2 body → zadajte metre.</p>',[['Neskôr',null],['📏 Označiť teraz',1,'go']]).then(r=>r&&$('cal').click());});};bg.complete&&bg.width?go():bg.onload=()=>{draw();go();};}
const pickImg=m=>{imgMode=m;$('img').value='';$('img').click();};
$('upl').onclick=()=>pickImg('ask');
$('img').onchange=async e=>{const f=e.target.files[0];if(!f)return;const src=await readImg(f);let m=imgMode;
 if(m==='ask'&&H.walls.length){const r=await dlg('Nahrali ste výkres','<p>Tento projekt už má nakreslené steny. Čo chcete urobiť?</p>',[['Zrušiť',null],['Vymeniť podklad v tomto projekte','swap'],['Nový projekt z tohto výkresu','new','go']]);if(!r)return;m=r.v;}
 if(m==='new'){const n=await askName(f.name.replace(/\.[^.]+$/,''));if(n){newP(n,[],{src,w:20});afterImg();}}
 else{snap();H.underlay={src,w:bgW};setBg();save();bg.onload=()=>fit();}};
async function act(m){$('dd').classList.remove('on');
 if(m==='new'){const n=await askName('Nový dom');if(n)newP(n);}
 if(m==='newimg')pickImg('new');if(m==='open')$('ld').click();if(m==='mine')show('home');
 if(m==='demo')newP('Ukážkový dom',JSON.parse(JSON.stringify(DEMO.walls)));
 if(m==='dl'){save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(H,null,1)],{type:'application/json'}));a.download=(H.name||'dom')+'.json';a.click();}}
$('menu').onclick=e=>{e.stopPropagation();$('dd').classList.toggle('on');};document.addEventListener('click',()=>$('dd').classList.remove('on'));
document.querySelectorAll('#dd a').forEach(a=>a.onclick=()=>act(a.dataset.m));
$('logo').onclick=()=>show('home');$('hNew').onclick=()=>act('new');$('hImg').onclick=()=>act('newimg');$('hDemo').onclick=()=>act('demo');
function home(){const L=idx();$('plist').innerHTML=L.length?'':'<p style="color:#9fb3c8">Zatiaľ žiadne projekty.</p>';L.forEach(p=>{const d=document.createElement('div');d.className='pc';d.innerHTML='<b>'+esc(p.name)+'</b><small>'+new Date(p.date).toLocaleString('sk-SK')+'</small><button class="x" title="Zmazať">🗑</button>';
 d.onclick=()=>openP(p.id);d.querySelector('.x').onclick=async e=>{e.stopPropagation();if(await dlg('Zmazať projekt „'+esc(p.name)+'“?','',[['Nie',null],['Zmazať',1]])){localStorage.removeItem('vks_p_'+p.id);localStorage.setItem(IDX,JSON.stringify(idx().filter(x=>x.id!==p.id)));if(p.id===PID)PID=null;home();}};$('plist').appendChild(d);});}
$('ld').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t);if(!j.walls)throw 0;j.name=j.name||f.name.replace(/\.json$/,'');openP('p'+Date.now(),j);}catch(_){alert('Neplatný súbor projektu.');}});};
addEventListener('resize',()=>{if($('ed').classList.contains('on'))fit();});
// ---------- 3D ----------
let R,scene,cam,rig,orb,world,loco,inited=false,walk=false;const clock=new THREE.Clock();
const M={wall:new THREE.MeshStandardMaterial({color:0xf2efe9,roughness:.9}),floor:new THREE.MeshStandardMaterial({color:0xb48a5a,roughness:.7}),glass:new THREE.MeshStandardMaterial({color:0x88bbdd,transparent:true,opacity:.3}),ground:new THREE.MeshStandardMaterial({color:0x6f9a4f,roughness:1})};
function init3(){inited=true;R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.xr.enabled=true;$('v3').appendChild(R.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xbfd8f0);scene.add(new THREE.HemisphereLight(0xffffff,0x88aa66,1.6));const sun=new THREE.DirectionalLight(0xffffff,1.6);sun.position.set(8,15,6);scene.add(sun);
 rig=new THREE.Group();cam=new THREE.PerspectiveCamera(65,1,.05,300);rig.add(cam);scene.add(rig);orb=new OrbitControls(cam,R.domElement);
 const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200).rotateX(-Math.PI/2),M.ground);g.position.y=-.02;scene.add(g);
 document.body.appendChild(VRButton.createButton(R));
 R.xr.addEventListener('sessionstart',()=>{place(true);loco&&loco.init&&loco.init();});R.xr.addEventListener('sessionend',()=>place(walk));
 R.setAnimationLoop(()=>{const dt=clock.getDelta(),s=R.xr.getSession();if(s&&loco)loco.update(dt,s.inputSources);else if(!s)orb.update();R.render(scene,cam);});
 new ResizeObserver(()=>{const r=$('v3').getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();}).observe($('v3'));}
function build(){const root=new THREE.Group(),lv={};H.levels.forEach(l=>lv[l.name]=l);let xs=[],zs=[];
 const box=(w,s0,s1,y0,y1,mat)=>{if(s1-s0<.005||y1-y0<.005)return;const g=geo(w),m=new THREE.Mesh(new THREE.BoxGeometry(s1-s0,y1-y0,w.thickness),mat);
  m.position.set(g.x0+g.u[0]*(s0+s1)/2,y0+(y1-y0)/2,g.z0+g.u[1]*(s0+s1)/2);m.rotation.y=-Math.atan2(g.u[1],g.u[0]);root.add(m);return m;};
 H.walls.forEach(w=>{const L=geo(w).L,e=(lv[w.level]||{elevation:0}).elevation+(w.base||0),h=w.height||2.8;xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);
  const ops=[...(w.openings||[])].sort((a,b)=>a.offset-b.offset);let s=0;
  ops.forEach(o=>{box(w,s,o.offset,e,e+h,M.wall);box(w,o.offset,o.offset+o.width,e,e+(o.sill||0),M.wall);box(w,o.offset,o.offset+o.width,e+(o.sill||0)+o.height,e+h,M.wall);
   if(o.type==='window'){const gl=box(w,o.offset,o.offset+o.width,e+o.sill,e+o.sill+o.height,M.glass);if(gl){gl.scale.z=.1;gl.userData.noCol=true;}}s=o.offset+o.width;});box(w,s,L,e,e+h,M.wall);});
 if(!xs.length)return null;const fp=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
 const f=new THREE.Mesh(new THREE.BoxGeometry(fp[2]-fp[0],.1,fp[3]-fp[1]),M.floor);f.position.set((fp[0]+fp[2])/2,-.05,(fp[1]+fp[3])/2);root.add(f);root.userData.fp=fp;return root;}
function place(inside){const fp=world.userData.fp,c=[(fp[0]+fp[2])/2,(fp[1]+fp[3])/2];rig.position.set(0,0,0);rig.rotation.set(0,0,0);
 if(R.xr.isPresenting||inside){rig.position.set(c[0],0,c[1]);if(!R.xr.isPresenting){cam.position.set(0,1.6,0);orb.target.set(0,1.6,-.01);}}
 else{cam.position.set(c[0]+ (fp[2]-fp[0]),Math.max(fp[2]-fp[0],fp[3]-fp[1])*1.1,c[1]+(fp[3]-fp[1])*1.3);orb.target.set(c[0],0,c[1]);}orb.update();}
function gen(){if(!inited)init3();if(world)scene.remove(world);world=build();if(!world){$('st').textContent='Najprv nakreslite steny.';return;}scene.add(world);
 const colRoot=world.clone();colRoot.traverse(o=>{if(o.userData&&o.userData.noCol)o.visible=false;});colRoot.children=colRoot.children.filter(o=>!o.userData.noCol);colRoot.updateMatrixWorld(true);
 try{const col=colliderFromObject(colRoot),body=new Body(col,{radius:.18});if(!loco)loco=new Locomotion({renderer:R,rig,camera:cam,scene,body,speed:1.4,snapDeg:30});else loco.body=body;}catch(err){console.warn('kolízie',err);}
 place(walk);$('st').textContent='Model hotový ('+H.walls.length+' stien). Ťahaj: otáčanie, koliesko/2 prsty: zoom. Okuliare VR: tlačidlo dole.';}
function show(s){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.s===s));document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('on',x.id===s));
 $('tbed').classList.toggle('on',s==='ed');if(s==='home'){home();}$('tbvw').classList.toggle('on',s==='vw');const vb=$('VRButton');if(vb)vb.style.display=s==='vw'?'':'none';if(s==='vw')gen();else if(s==='ed')fit();}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.s));$('gen').onclick=()=>show('vw');
const _sh=show;
$('walk').onclick=()=>{walk=!walk;place(walk);};
load();window.__ok=true;
