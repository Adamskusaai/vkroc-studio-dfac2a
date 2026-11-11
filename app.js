import {detectWalls,gapMerge} from './cv.js?v=20261111zk';
import {readPlan} from './plan.js?v=20261111zk';
import {makeRoom,layoutRoom,validateRoom,sanitizeOpenings,DIM3} from './layout.js?v=20261111zk';
import {I,paint} from './icons.js';
paint();
const hh=()=>document.documentElement.style.setProperty('--hh',document.getElementById('hdr').offsetHeight+'px');new ResizeObserver(hh).observe(document.getElementById('hdr'));
function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function toast(m,k='info',ms=3800){const t=document.createElement('div');t.className='toast '+k;t.innerHTML=I[k==='ok'?'check':k==='err'||k==='warn'?'warn':'info']+'<div>'+m+'</div>';$('toasts').appendChild(t);while($('toasts').children.length>3)$('toasts').firstChild.remove();setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},ms);}
window.__toast=()=>[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | ');
const $=id=>document.getElementById(id),KEY='vkroc_studio_project';
const DEMO={name:'Ukážkový dom',units:'m',style:'skandi',mat:{wall:'#f2ebe3',floor:'dub',fac:'#ece3d3',roof:'#3e444c'},
 levels:[{name:'1NP',elevation:0,height:2.85}],walls:[],furn:[],plot:{pts:[[-4,-5],[20,-5],[20,15],[-4,15]],fence:1},roof:'gable'};
(()=>{const L='1NP',h=2.85,W=(a,b,o=[],t=.3)=>DEMO.walls.push({id:'w'+DEMO.walls.length,level:L,start:a,end:b,thickness:t,base:0,height:h,openings:o});
 // Outer 15×10.5 m ≈ 157 m² footprint (+ terrace/carport outside)
 // South facade z=0, north z=10.5, west x=0, east x=15
 W([0,0],[15,0],[
  {type:'window',offset:3.0,width:1.4,sill:.95,height:1.35}, // predsieň
  {type:'window',offset:5.9,width:.6,sill:1.5,height:.6}, // WC
  {type:'window',offset:9.2,width:1.6,sill:.9,height:1.4}, // spálňa
  {type:'window',offset:11.4,width:1.5,sill:.9,height:1.4}]);
 W([15,0],[15,10.5],[{type:'window',offset:2.2,width:1.4,sill:.9,height:1.4},{type:'window',offset:5.2,width:1.4,sill:.9,height:1.4},{type:'window',offset:8.2,width:1.2,sill:.9,height:1.4}]); // spálňa, detská 1, detská 2
 W([15,10.5],[0,10.5],[{type:'window',offset:2.3,width:1.5,sill:.9,height:1.4},{type:'window',offset:7.2,width:1.6,sill:.9,height:1.4},{type:'window',offset:9.2,width:1.6,sill:.6,height:1.7},{type:'window',offset:11,width:1.5,sill:.9,height:1.4}]); // detská 2, obývačka ×2, kuchyňa
 W([0,10.5],[0,0],[{type:'window',offset:3.5,width:1.2,sill:.9,height:1.4},{type:'door',offset:5.75,width:.9,sill:0,height:2.15,out:1,kind:'terrace'},{type:'door',offset:8.2,width:1.05,sill:0,height:2.15,out:1,kind:'entrance'}]); // jedáleň, terasové dvere, vchod (after the mirror below this is the x=15 front facade)
 // Internal: hallway / living split
 W([0,3.6],[5.2,3.6],[{type:'door',offset:2.8,width:.9,height:2.05}],.15);
 W([5.2,1.9],[5.2,0],[{type:'door',offset:.55,width:.8,height:2.0}],.15); // WC from the hall (opens into the WC)
 W([5.2,1.9],[7.4,1.9],[],.15); W([7.4,0],[7.4,1.9],[],.12); // WC
 W([5.2,1.9],[5.2,3.6],[{type:'door',offset:.5,width:.8,height:2.05}],.15); // kúpeľňa
 W([7.4,1.9],[7.4,3.6],[],.15); W([5.2,3.6],[7.4,3.6],[],.15);
 // Vertical spine bedrooms / living
 W([8.2,0],[8.2,10.5],[{type:'door',offset:3.2,width:.8,height:2.05,hinge:'R'},{type:'door',offset:4.6,width:.9,height:2.05},{type:'door',offset:7.6,width:.9,height:2.05}],.15); // spálňa, detská 1, detská 2 — each room reached from the living area
 W([8.2,4.2],[15,4.2],[],.15);
 W([8.2,7.4],[15,7.4],[],.15);
 // Kitchen peninsula hint wall short
 W([0,7.2],[3.8,7.2],[],.12);
 // Furniture — Scandi, door-swing clear (leaf+10cm), no wall/window solids overlap
 const FD={bed:[1.6,2.05],bed1:[.9,2],bunk:[.9,2],sofa:[2.4,1.0],armch:[.85,.85],table:[1.8,1.0],ctable:[1.1,.7],desk:[1.2,.6],tv:[1.8,.42],ward:[1.8,.62],kitch:[2.8,.62],fridge:[.65,.7],bath:[1.7,.75],shower:[.9,.9],sink:[.6,.45],wc:[.4,.65],shelf:[.9,.35],plant:[.45,.45],rug:[3.2,3.4],runner:[2.4,.7],lamp:[.35,.35],chair:[.45,.5],art:[.9,.04],curtain:[1.4,.08],shoe:[1.0,.4],bench:[1.2,.4],nstand:[.45,.4],dresser:[1.2,.5],sideb:[1.6,.45],side:[.45,.45],stool:[.38,.38],island:[1.6,.8],pendant:[.4,.4],mirror:[.7,.04],towel:[.55,.12],coat:[.5,.5],toy:[.55,.4],otable:[1.4,.8],lounge:[1.6,.85]};
 const soft=new Set(['rug','runner','curtain','lamp','art','pendant','mirror','towel','plant']); // soft vs soft OK; plant/chair still clear of doors
 const mount=new Set(['art','curtain','mirror','towel','pendant']);
 const placed=[];
 const dim=(t,r)=>{const d=FD[t]||[1,1];return (r||0)%2?[d[1],d[0]]:d;};
 const aabb=(x,z,w,d)=>({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});
 const ov=(A,B)=>!(A.x1<=B.x0||A.x0>=B.x1||A.z1<=B.z0||A.z0>=B.z1);
 // door swing zones from DEMO.walls (quarter-circle AABB, radius=width+0.10)
 const swings=[];
 DEMO.walls.forEach(w=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],L=Math.hypot(dx,dz)||1,ux=dx/L,uz=dz/L;
  (w.openings||[]).forEach(o=>{if(o.type!=='door')return;const rad=o.width+.1,Rh=o.hinge==='R',hs=Rh?o.offset+o.width-.05:o.offset+.05;
   const hx=w.start[0]+ux*hs,hz=w.start[1]+uz*hs,sd=o.out?-1:1,px=-uz*sd,pz=ux*sd,along=Rh?-1:1;
   const pts=[[hx,hz]];for(let i=0;i<=8;i++){const ang=(i/8)*(Math.PI/2),ca=Math.cos(ang),sa=Math.sin(ang);
    pts.push([hx+ux*along*rad*ca+px*rad*sa,hz+uz*along*rad*ca+pz*rad*sa]);}
   const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
   swings.push({x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)});});});
 const inSwing=(x,z,w,d)=>{const A=aabb(x,z,w,d);return swings.some(Z=>ov(A,Z));};
 const hitWall=(t,x,z,r)=>{if(mount.has(t))return 0;const[w,d]=dim(t,r);const A=aabb(x,z,w,d);
  for(const wall of DEMO.walls){const t0=wall.thickness/2+.02;const wx0=Math.min(wall.start[0],wall.end[0])-t0,wx1=Math.max(wall.start[0],wall.end[0])+t0;
   const wz0=Math.min(wall.start[1],wall.end[1])-t0,wz1=Math.max(wall.start[1],wall.end[1])+t0;
   if(!ov(A,{x0:wx0,x1:wx1,z0:wz0,z1:wz1}))continue;
   const dx=wall.end[0]-wall.start[0],dz=wall.end[1]-wall.start[1],LL=Math.hypot(dx,dz)||1;
   const s=((x-wall.start[0])*dx+(z-wall.start[1])*dz)/LL,tt=(-(x-wall.start[0])*dz+(z-wall.start[1])*dx)/LL;
   if(Math.abs(tt)>wall.thickness/2+Math.min(w,d)/2-.02)continue;
   const inOp=(wall.openings||[]).some(o=>s>=o.offset-.05&&s<=o.offset+o.width+.05);
   if(!inOp)return 1;}return 0;};
 const hit=(t,x,z,r)=>{const[w,d]=dim(t,r);if(inSwing(x,z,w,d))return 1;if(hitWall(t,x,z,r))return 1;
  // soft items (rugs/curtains/art) never block; hard items may sit on soft
  if(soft.has(t))return 0;
  for(const p of placed){if(soft.has(p.t))continue;const[pw,pd]=dim(p.t,p.r);if(Math.abs(x-p.p[0])<(w+pw)/2+.04&&Math.abs(z-p.p[1])<(d+pd)/2+.04)return 1;}return 0;};
 const F=(t,x,z,r=0,force=0,ex)=>{if(!FD[t])return;if(!force&&hit(t,x,z,r)){(window.__demoSkip=window.__demoSkip||[]).push(t+'@'+x+','+z);return;}const it={t,p:[x,z],r,level:L,...(ex||{})};DEMO.furn.push(it);placed.push(it);};
 // ===== HALL / predsieň (x0–5.2, z0–3.6) =====
 F('shoe',0.7,2.55); F('bench',3.55,0.7); F('coat',4.55,0.7); F('mirror',0.25,0.6,1);
 F('lamp',3.85,2.55); F('plant',4.45,2.85); F('art',2.6,3.4,2); F('runner',2.7,1.95);
 // ===== WC (5.2–7.4, 0–1.9) =====
 F('wc',6.4,0.6); F('sink',6.95,1.3,1); F('mirror',7.15,1.05,1); F('towel',7.3,1.0,3);
 // ===== BATH (5.2–7.4, 1.9–3.6) =====
 F('bath',6.55,2.3,0,1); F('shower',5.7,3.2,0,1); F('sink',7.0,2.5,1,1);
 F('mirror',7.15,2.5,1); F('towel',5.55,2.3,1); F('runner',6.35,3.05);
 // ===== LIVING (fill open plan — sofa south, TV north, big rug, reading corner) =====
 F('sofa',5.55,4.85); F('ctable',5.55,5.95); F('side',4.15,4.8,0,1);
 F('rug',5.55,6.5,0,1); // large rug under sofa→TV
 F('tv',5.55,8.35,2,1); // closer so lower half isn't empty
 F('shelf',4.3,8.3,1,1);
 F('armch',7.15,6.5,3); F('lamp',4.2,5.25); F('lamp',7.15,8.0);
 // reading corner / overflow in north-east of living
 F('armch',7.0,9.35,2,1); F('side',6.2,9.4,0,1); F('lamp',7.35,9.55);
 F('plant',4.25,6.9); F('plant',4.4,8.1); F('plant',7.3,8.9);
 F('art',4.3,3.85); F('art',6.3,3.72); F('art',7.55,6.2,1);
 F('curtain',5.0,10.3,2);
 // ===== DINING =====
 F('table',2.5,5.85);
 F('chair',1.3,5.85,1); F('chair',3.7,5.85,3);
 F('chair',1.85,5.05); F('chair',3.15,5.05);
 F('chair',1.85,6.65,2); F('chair',3.15,6.65,2);
 F('pendant',2.5,5.85);  F('plant',3.7,4.85);
 // ===== KITCHEN =====
 F('fridge',0.65,7.5,0,1); F('kitch',0.6,9.3,1,1); F('island',2.45,8.55,0,1);
 F('stool',1.95,7.9); F('stool',2.9,7.9); F('stool',3.3,8.55,1); F('stool',2.45,9.2,2);
 F('sink',0.6,8.35,1,1); // kitchen sink along run
 F('plant',1.25,10.0); F('curtain',0.2,6.4,1);
 // ===== MASTER =====
 F('bed',11.9,1.95); F('nstand',10.75,0.9); F('nstand',13.05,0.9);
 F('lamp',10.75,0.9); F('lamp',13.05,0.9); F('ward',14.15,1.25,3); F('dresser',14.15,3.25,3,1);
 F('shelf',9.05,1.4,1); F('plant',14.0,3.55);
 F('curtain',10.0,0.3); F('curtain',12.15,0.3); F('art',9.05,2.05,1); F('rug',11.9,2.55,0,1);
 // ===== KIDS 1 (8.2–15 × 4.2–7.4): single bed along the north partition, desk under the east window, wardrobe south — blue/sage =====
 F('bed1',9.35,6.85,3,0,{cb:'#5f7f96'}); F('side',10.65,7.05);
 F('desk',14.5,5.8,3); F('chair',13.85,5.8,1); F('lamp',14.55,7.0);
 F('ward',13.1,4.64,0); F('shelf',9.3,4.45,0);
 F('rug',11.6,6.0,0,1,{c:'#9fb39a'}); F('art',9.35,7.3,2); F('curtain',14.85,5.9,3); F('plant',12.4,7.05);
 // ===== KIDS 2 (8.2–15 × 7.4–10.5): bunk bed along the north wall, play rug in the middle, desk west, shelves + dresser south — terracotta/mustard =====
 F('bunk',13.85,9.9,1,0,{cb:'#d0795e'}); F('lamp',12.5,10.1);
 F('desk',8.6,9.6,1,0,{}); F('chair',9.2,9.6,3);
 F('dresser',13.0,7.75,0); F('shelf',14.3,7.7,0,0,{}); F('shelf',10.3,10.15,2);
 F('toy',9.9,7.75,0,1); F('rug',11.3,8.95,0,1,{c:'#e1b04f'}); F('art',10.4,7.48);
 F('curtain',11.95,10.3,2); F('curtain',14.85,8.8,3); F('plant',9.3,10.1);
 // ===== TERRACE (paved, in front of the terrace door; west here = east x 15–18 after the mirror) =====
 F('otable',-1.9,6.1,1,1); F('chair',-1.9,5.2,0,1); F('chair',-1.9,7.0,2,1); F('chair',-1.0,6.1,3,1); F('chair',-2.8,6.1,1,1);
 F('lounge',-3.6,5.0,1,1); F('plant',-0.45,7.45,0,1); F('plant',-2.75,7.45,0,1); F('lamp',-0.4,3.2,0,1);
 // prem8: mirror the interior so the entrance + terrace door face the x=15 front (video camera side); outline/origin unchanged
 const MX=15;DEMO.walls.forEach(w=>{const s0=w.start,e0=w.end,L=Math.hypot(e0[0]-s0[0],e0[1]-s0[1]);w.start=[MX-e0[0],e0[1]];w.end=[MX-s0[0],s0[1]];
  (w.openings||[]).forEach(o=>{o.offset=+(L-o.offset-o.width).toFixed(3);if(o.type==='door')o.hinge=o.hinge==='R'?'L':'R';});});
 DEMO.furn.forEach(f=>{f.p=[+(MX-f.p[0]).toFixed(3),f.p[1]];f.r=(f.r||0)%2?((f.r||0)+2)%4:(f.r||0);});
})();
let H,undo=[],tool='wall',bg=null,bgW=12,view={x:-1,y:-1,s:50},drag=null,PID=null,obl=false;window.__getH=()=>H;window.__rooms=()=>rooms().map(r=>({n:r.n,a:+r.a.toFixed(1),p:r.p}));
const IDX='vks_idx',idx=()=>{try{return JSON.parse(localStorage.getItem(IDX))||[]}catch(e){return[]}};
function thumb(h){const ws=h.walls.filter(w=>w.level===h.levels[0].name),pp=h.plot?h.plot.pts:[];const P=[...ws.flatMap(w=>[w.start,w.end]),...pp];if(!P.length)return'';const xs=P.map(p=>p[0]),zs=P.map(p=>p[1]),x0=Math.min(...xs),z0=Math.min(...zs),S=Math.max(Math.max(...xs)-x0,Math.max(...zs)-z0,1),k=100/S,f=v=>(v*k).toFixed(1);
 return '<svg viewBox="-6 -6 112 112" preserveAspectRatio="xMidYMid meet">'+(pp.length?'<path d="M'+pp.map(p=>f(p[0]-x0)+' '+f(p[1]-z0)).join('L')+'Z" fill="#E4EED9" stroke="#7a9a5a" stroke-dasharray="3 2"/>':'')+'<path d="'+ws.map(w=>'M'+f(w.start[0]-x0)+' '+f(w.start[1]-z0)+'L'+f(w.end[0]-x0)+' '+f(w.end[1]-z0)).join('')+'" stroke="#0B0B0B" stroke-width="'+Math.max(1.5,.3*k).toFixed(1)+'" stroke-linecap="square" fill="none"/></svg>';}
function save(){if(!PID)return;const L=idx().filter(p=>p.id!==PID);L.unshift({id:PID,name:H.name,date:Date.now(),th:thumb(H),nl:H.levels.length,nw:H.walls.length});$('pname').textContent=H.name;try{localStorage.setItem('vks_p_'+PID,JSON.stringify(H));localStorage.setItem(IDX,JSON.stringify(L));window.__full=0;}catch(e){window.__full=(window.__full||0)+1;if(window.__full===1)dlg('Úložisko prehliadača je plné','<p>Posledné zmeny sa nepodarilo uložiť v prehliadači. Stiahnite projekt ako súbor (Projekt → Uložiť / stiahnuť) alebo zmažte staré projekty na úvodnej obrazovke.</p>',[['OK',1,'go']]);}}
function syncUl(){const cur=H.ulv||H.levels[0].name;if(cur===lvl)return;const a=H.levels.find(l=>l.name===cur);if(a)a.ul=H.underlay||null;const b=LV();H.underlay=b.ul||null;delete b.ul;H.ulv=lvl;}
function goLvl(n){if(n===lvl)return;lvl=n;syncUl();setBg();banner();lvUI();fit();}
function setBg(){bg=null;bgW=H.underlay?H.underlay.w:12;$('imw').value=bgW;if(H.underlay){bg=new Image();bg.onload=draw;bg.src=H.underlay.src;}}
function staleDemo(){if(window.__demoB||!H||H.name!==DEMO.name||H.dv===DEMO_V||!H.walls||H.walls.length!==DEMO.walls.length)return false;/* an older saved copy of the demo house -> rebuild it in place */const old=PID;demoNew();try{localStorage.removeItem('vks_p_'+old);localStorage.setItem(IDX,JSON.stringify(idx().filter(p=>p.id!==old)));}catch(e){}setTimeout(()=>toast('Ukážkový dom aktualizovaný na najnovšiu verziu.','ok'),300);return true;}
function openP(id,data){PID=id;H=data||JSON.parse(localStorage.getItem('vks_p_'+id));if(!H.levels)H.levels=JSON.parse(JSON.stringify(DEMO.levels));lvl=H.levels[0].name;staleDemo();syncUl();lvUI();undo=[];setBg();save();show('ed');banner();if(H.underlay&&!H.walls.length)afterImg(1);}
const newP=(name,walls=[],ul=null,plot)=>openP('p'+Date.now(),{...JSON.parse(JSON.stringify(DEMO)),name,walls,furn:[],rn:[],underlay:ul,plot:plot===undefined?null:plot});
function load(){route(true);}
const snap=()=>{undo.push(JSON.stringify(H));if(undo.length>80)undo.shift();};
// ---------- editor ----------
const cv=$('cv'),cx=cv.getContext('2d');
const TCH=matchMedia('(pointer:coarse)').matches;
const HINT0={meas:'Ťahaj myšou = zmeria vzdialenosť (prichytáva sa ku koncom stien).',furn:'Klikni = vložiť nábytok. Klik na kus nábytku = otočenie. Posun ho presunie, Zmazať zmaže.',wall:'Ťahaj myšou = nová stena (prichytáva sa ku koncom stien). Koliesko/2 prsty = zoom a posun.',move:'Ťahaj koniec steny (bodku) alebo celú stenu. Dvere/okno ťahaj po stene.',door:'Klikni na stenu = vložia sa dvere.',window:'Klikni na stenu = vloží sa okno.',del:'Klikni na stenu, dvere alebo okno = zmaže sa.'};
const HINT=Object.fromEntries(Object.entries(HINT0).map(([k,v])=>[k,TCH?v.replace('Ťahaj myšou','Ťahaj prstom').replace('Koliesko/2 prsty','2 prsty').replace(/Klikni/g,'Ťukni'):v]));HINT.stair=(TCH?'Ťukni':'Klikni')+' = schody z tohto podlažia na vyššie. Ťuknutím na existujúce schody ich otočíš o 90°.';HINT.cal='Ťukni/klikni na začiatok a koniec známej dĺžky (napr. kótovaná stena).';
function fit(){const r=cv.getBoundingClientRect();cv.width=r.width*devicePixelRatio;cv.height=r.height*devicePixelRatio;
 let xs=[0,10],zs=[0,8];if(bg&&bg.width){xs.push(0,bgW);zs.push(0,bgW*bg.height/bg.width);}H.walls.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});if(H.plot)H.plot.pts.forEach(p=>{xs.push(p[0]);zs.push(p[1]);});
 const pd=1.2,x0=Math.min(...xs)-pd,x1=Math.max(...xs)+pd,z0=Math.min(...zs)-pd,z1=Math.max(...zs)+pd;view.s=Math.min(cv.width/(x1-x0),cv.height/(z1-z0));view.x=x0-(cv.width/view.s-(x1-x0))/2;view.y=z0-(cv.height/view.s-(z1-z0))/2;draw();}
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
const RC={};
function rooms(L=lvl){const ws=H.walls.filter(w=>w.level===L),k=JSON.stringify(ws.map(w=>[w.start,w.end,w.thickness]));const C=RC[L];if(C&&C.k===k)return nameR(C,L);const R={k,r:[]};RC[L]=R;if(ws.length<3)return R.r;
 const c=.1;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;ws.forEach(w=>[w.start,w.end].forEach(p=>{x0=Math.min(x0,p[0]);z0=Math.min(z0,p[1]);x1=Math.max(x1,p[0]);z1=Math.max(z1,p[1]);}));x0-=.5;z0-=.5;
 const W=Math.ceil((x1-x0+.5)/c)+1,Hh=Math.ceil((z1-z0+.5)/c)+1;if(W*Hh>4e6)return R.r;const g=new Int32Array(W*Hh);Object.assign(R,{g,W,Hh,x0,z0,c});
 ws.forEach(w=>{const G=geo(w),t=Math.max(w.thickness/2,.06),n=Math.ceil(G.L/(c/2))+1;for(let i=0;i<=n;i++){const s=G.L*i/n;for(let q=-t;q<=t+1e-9;q+=c/2){const x=G.x0+G.u[0]*s-G.u[1]*q,z=G.z0+G.u[1]*s+G.u[0]*q,ix=Math.round((x-x0)/c),iz=Math.round((z-z0)/c);if(ix>=0&&iz>=0&&ix<W&&iz<Hh)g[iz*W+ix]=-1;}}});
 const fl=(s,id)=>{const st=[s];g[s]=id;let n=0,sx=0,sz=0,edge=false,b=[1e9,1e9,-1e9,-1e9];while(st.length){const i=st.pop(),x=i%W,z=(i/W)|0;n++;sx+=x;sz+=z;if(x<b[0])b[0]=x;if(z<b[1])b[1]=z;if(x>b[2])b[2]=x;if(z>b[3])b[3]=z;if(!x||!z||x===W-1||z===Hh-1)edge=true;for(const j of[x>0?i-1:-1,x<W-1?i+1:-1,z>0?i-W:-1,z<Hh-1?i+W:-1])if(j>=0&&!g[j]){g[j]=id;st.push(j);}}return{n,sx,sz,edge,b};};
 let id=1;for(let i=0;i<g.length;i++)if(!g[i]){const r=fl(i,++id);if(!r.edge&&(r.n*c*c>=1.5||(r.n*c*c>=.6&&Math.min(r.b[2]-r.b[0],r.b[3]-r.b[1])*c>=.45&&smallHasDoor(ws,[x0+r.b[0]*c,z0+r.b[1]*c,x0+r.b[2]*c,z0+r.b[3]*c],L)))){let px=x0+r.sx/r.n*c,pz=z0+r.sz/r.n*c;const ci=Math.round((pz-z0)/c)*W+Math.round((px-x0)/c);if(g[ci]!==id){const q=cellIn(R,id);px=q[0];pz=q[1];}R.r.push({id,a:r.n*c*c,p:[px,pz],bb:[x0+r.b[0]*c,z0+r.b[1]*c,x0+r.b[2]*c,z0+r.b[3]*c]});}}
 return nameR(R,L);}
// LOGIC RULE (tiny rooms): an enclosed pocket of 0.6–1.5 m² (≥0.45 m wide inside) that has its own door (a narrow WC, a pantry) is a room, not a hole/outside — only when a room name/label (WC, komora…) sits inside it, so wall-tracing artefacts stay ignored
function smallHasDoor(ws,bb,L){const inb=e=>e.level===L&&e.p[0]>bb[0]&&e.p[0]<bb[2]&&e.p[1]>bb[1]&&e.p[1]<bb[3];if(!(H.rn||[]).some(inb)&&!(H.rlab||[]).some(e=>inb(e)&&/WC|Komora|Šatn|Špajz|Sklad/i.test(e.n||'')))return false;return ws.some(w=>{const G=geo(w);return(w.openings||[]).some(o=>{if(o.type!=='door')return false;const s=o.offset+o.width/2,x=G.x0+G.u[0]*s,z=G.z0+G.u[1]*s;return x>bb[0]-.35&&x<bb[2]+.35&&z>bb[1]-.35&&z<bb[3]+.35;});});}
function cellIn(R,id){let best=null,bd=-1;const{g,W,Hh,x0,z0,c}=R;for(let z=1;z<Hh-1;z+=2)for(let x=1;x<W-1;x+=2){const i=z*W+x;if(g[i]!==id)continue;let d=0;while(d<40&&g[i-d]===id&&g[i+d]===id&&g[i-d*W]===id&&g[i+d*W]===id)d++;if(d>bd){bd=d;best=[x0+x*c,z0+z*c];}}return best||[x0,z0];}
function roomAt(R,p){if(!R||!R.g)return 0;const ix=Math.round((p[0]-R.x0)/R.c),iz=Math.round((p[1]-R.z0)/R.c);if(ix<0||iz<0||ix>=R.W||iz>=R.Hh)return 0;return R.g[iz*R.W+ix];}
const RN=['Obývačka','Obývačka s kuchyňou','Kuchyňa','Jedáleň','Spálňa','Detská izba','Izba','Pracovňa','Kúpeľňa','WC','Chodba','Predsieň','Šatník','Komora','Technická miestnosť','Garáž','Terasa'];
// prem8: house-level room types. Priority: user name > label read from the plan > one consistent assignment for the whole
// floor (≤1 kitchen per unit, bathroom next to the WC, corridor-like rooms = hall, largest = living, entrance room = predsieň)
function roomDoors(R,L){const out=[];H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w);(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s],n=[-G.u[1],G.u[0]],e=w.thickness/2+.25;
 const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);out.push({c,w:o.width,u:G.u,a:a>0?a:0,b:b>0?b:0});});});return out;}
function assignTypes(R,L){const RS=R.r;if(!RS.length)return {};const key=R.k+'|'+JSON.stringify(H.rlab||[]);if(R.tk===key&&R.T)return R.T;
 const T={},D=roomDoors(R,L),adj={};RS.forEach(r=>adj[r.id]=new Set());let ext=new Set();
 D.forEach(d=>{if(!adj[d.a])d.a=0;if(!adj[d.b])d.b=0;if(d.a&&d.b&&d.a!==d.b){adj[d.a].add(d.b);adj[d.b].add(d.a);}else if(d.a||d.b)ext.add(d.a||d.b);});
 const info=r=>{const w=r.bb[2]-r.bb[0],d=r.bb[3]-r.bb[1];return{mn:Math.min(w,d),asp:Math.max(w,d)/Math.max(.1,Math.min(w,d)),fill:r.a/Math.max(.1,w*d)};};
 const dist=(a,b)=>Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]);
 const nD=r=>D.filter(d=>d.a===r.id||d.b===r.id).length>1?60:0; // a bathroom is not a walk-through room
 // labels read from the plan
 (H.rlab||[]).filter(l=>l.level===L).forEach(l=>{const id=roomAt(R,l.p);const r=RS.find(q=>q.id===id);/* a label that cannot be true for the room size (bedroom in 3 m2) is a misread: leave it to the auto rules */if(r&&!T[id]&&!(r.a<5.5&&/^(Spálňa|Detská|Izba|Obývačka|Pracovňa|Jedáleň)/.test(l.n))&&!(r.a<3.5&&/^Kuchyňa/.test(l.n)))T[id]=l.n;});
 // units: groups of rooms joined by interior doors; two big separate groups = two dwellings (one kitchen each)
 const comp={};let cid=0;RS.forEach(r=>{if(comp[r.id])return;cid++;const st=[r.id];comp[r.id]=cid;while(st.length){const i=st.pop();adj[i].forEach(j=>{if(!comp[j]){comp[j]=cid;st.push(j);}});}});
 const units=[...new Set(Object.values(comp))].filter(c=>{const m=RS.filter(r=>comp[r.id]===c);return m.length>=3&&m.reduce((s,r)=>s+r.a,0)>=30;});
 const unitOf=r=>{if(units.length<2)return 0;if(units.includes(comp[r.id]))return comp[r.id];let b=units[0],bd=1e9;units.forEach(u=>{RS.filter(q=>comp[q.id]===u).forEach(q=>{const d=dist(r,q);if(d<bd){bd=d;b=u;}});});return b;};
 const U={};RS.forEach(r=>{const u=unitOf(r);(U[u]=U[u]||[]).push(r);});
 for(const M of Object.values(U)){const free=()=>M.filter(r=>!T[r.id]).sort((a,b)=>b.a-a.a),has=n=>M.some(r=>T[r.id]&&T[r.id].startsWith(n));
  // corridors / entrance
  const hall=r=>{if(Object.values(T).filter(n=>n==='Chodba'||n==='Predsieň').length>=3)return;/* max 3 halls per house */T[r.id]=ext.has(r.id)&&!has('Predsieň')?'Predsieň':!has('Chodba')?'Chodba':!has('Predsieň')?'Predsieň':'Chodba';};
  free().forEach(r=>{const I=info(r);if(I.asp>2.2&&I.mn<2.1&&r.a<26)hall(r);});
  free().filter(r=>ext.has(r.id)&&r.a<9).slice(0,1).forEach(r=>{if(!has('Predsieň'))T[r.id]='Predsieň';});
  // tiny rooms
  free().filter(r=>r.a<2.8).sort((a,b)=>a.a-b.a).forEach(r=>{T[r.id]=!has('WC')?'WC':!has('Špajza')?'Špajza':'Komora';});
  // living
  let liv=M.find(r=>T[r.id]&&T[r.id].startsWith('Obýva'));if(!liv){liv=free().find(r=>r.a>=11);if(liv)T[liv.id]='Obývačka';}
  // kitchen next to living
  if(!has('Kuchyňa')&&!(liv&&T[liv.id]==='Obývačka s kuchyňou')){const c=free().filter(r=>r.a>=4.5&&r.a<=18).sort((a,b)=>((liv&&adj[liv.id].has(a.id))?-50:0)+(liv?dist(a,liv):0)-(((liv&&adj[liv.id].has(b.id))?-50:0)+(liv?dist(b,liv):0)))[0];
   const smallRest=free().filter(r=>r.a>=8).length;if(c&&!(liv&&liv.a>=26&&smallRest<3))T[c.id]='Kuchyňa';else if(liv)T[liv.id]='Obývačka s kuchyňou';}
  // bathroom next to the WC (or the smallest wet-size room)
  if(!has('Kúpeľňa')){const wc=M.find(r=>T[r.id]==='WC');const c=free().filter(r=>r.a>=2.8&&r.a<=11).sort((a,b)=>(wc?dist(a,wc):a.a)+nD(a)-(wc?dist(b,wc):b.a)-nD(b))[0];if(c)T[c.id]='Kúpeľňa';}
  free().forEach(r=>{const I=info(r);if((r.a<10&&adj[r.id].size>=3)||(I.fill<.6&&I.mn<2.4&&r.a<20))hall(r);});
  if(!has('WC')){const c=free().filter(r=>r.a<4).sort((a,b)=>a.a-b.a)[0];if(c)T[c.id]='WC';}
  if(!has('Kúpeľňa')&&M.length>=3){/* a home always has a bathroom: smallest free room up to 14 m2 */const wc=M.find(r=>T[r.id]==='WC');const c=free().filter(r=>r.a>=2.5&&r.a<=14).sort((a,b)=>a.a-b.a+(wc?.3*(dist(a,wc)-dist(b,wc)):0)+nD(a)-nD(b))[0];if(c)T[c.id]='Kúpeľňa';}
  // bedrooms and the rest
  const BIG=['Spálňa','Detská izba','Detská izba','Pracovňa','Izba'],MID=['Pracovňa','Detská izba','Šatník','Izba'],SM=['Technická miestnosť','Šatník','Komora','Špajza'];let bi=0,mi=0,si=0;
  if(has('Spálňa'))bi=1;
  free().forEach(r=>{if(r.a>=9)T[r.id]=BIG[Math.min(bi++,BIG.length-1)];else if(r.a>=5)T[r.id]=MID[Math.min(mi++,MID.length-1)];else T[r.id]=SM[Math.min(si++,SM.length-1)];});}
 // unique names: second "Detská izba" -> "Detská izba 2"
 const cnt={},seen={};Object.values(T).forEach(n=>cnt[n]=(cnt[n]||0)+1);
 RS.slice().sort((a,b)=>b.a-a.a).forEach(r=>{const n=T[r.id];if(cnt[n]>1){seen[n]=(seen[n]||0)+1;if(seen[n]>1)T[r.id]=n+' '+seen[n];}});
 R.tk=key;R.T=T;return T;}
function sugName(r,big){return 'Miestnosť';}
function guessKind(r){const R=RC[lvl];const T=R?assignTypes(R,lvl):{};return (T[r.id]||'Izba').replace(/ \d+$/,'');}
function nameR(R,L){const T=assignTypes(R,L);R.r.forEach(r=>{const e=(H.rn||[]).find(e=>e.level===L&&roomAt(R,e.p)===r.id);r.n=e?e.n:(T[r.id]||'Izba');r.auto=!e;});return R.r;}
async function nameDlg(r){const v=await dlg('Názov miestnosti','<p>'+r.a.toFixed(1).replace('.',',')+' m² · návrh: '+esc(r.n)+'</p><label>Názov<input type="text" name="n" list="rnl" value="'+esc(r.n)+'"></label><datalist id="rnl">'+RN.map(n=>'<option value="'+n+'">').join('')+'</datalist>',[['Zrušiť',0],['Uložiť',1,'go','check']]);
 if(!v||!v.v)return;const n=String(v.f.n||'').trim().slice(0,40);if(!n)return;snap();H.rn=(H.rn||[]).filter(e=>!(e.level===lvl&&roomAt(RC[lvl],e.p)===r.id));H.rn.push({level:lvl,p:[...r.p],n});save();draw();toast('Miestnosť: '+n,'ok');}
function WC(){const ws=WL();let x=0,z=0;ws.forEach(w=>{x+=w.start[0]+w.end[0];z+=w.start[1]+w.end[1];});const n=ws.length*2||1;return[x/n,z/n];}
const FUR={bed:['Manželská posteľ',1.6,2.05],bed1:['Posteľ',.9,2],bunk:['Poschodová posteľ',.9,2],sofa:['Pohovka',2.2,.95],armch:['Kreslo',.85,.85],table:['Jedálenský stôl',1.6,.9],ctable:['Konferenčný stolík',1.1,.6],desk:['Písací stôl',1.2,.6],tv:['TV skrinka',1.8,.42],ward:['Šatníková skriňa',1.8,.62],kitch:['Kuchynská linka',2.4,.62],fridge:['Chladnička',.6,.65],bath:['Vaňa',1.7,.75],shower:['Sprchovací kút',.9,.9],sink:['Umývadlo',.6,.45],wc:['WC',.4,.65],shelf:['Polica',.9,.35],plant:['Rastlina',.45,.45],rug:['Koberec',2.2,1.6],lamp:['Lampa',.35,.35],chair:['Stolička',.45,.5],art:['Obraz',.9,.04],curtain:['Záves',1.4,.08],shoe:['Botník',1.0,.4],bench:['Lavica',1.2,.4],nstand:['Nočný stolík',.45,.4],dresser:['Komoda',1.2,.5],sideb:['Príborník',1.6,.45],mirror:['Zrkadlo',.7,.04],towel:['Sušiak na uteráky',.55,.12],coat:['Vešiak',.5,.5],toy:['Box na hračky',.55,.4],runner:['Behúň',2.4,.7],otable:['Záhradný stôl',1.4,.8],lounge:['Ležadlo',1.6,.85],side:['Príručný stolík',.45,.45],stool:['Stolička barová',.38,.38]};
const FURX={...FUR,runner:['Behúň',2.4,.7],nstand:['Nočný stolík',.45,.4],dresser:['Komoda',1.2,.5],sideb:['Príborník',1.6,.45],side:['Príručný stolík',.45,.45],stool:['Barová stolička',.38,.38],island:['Kuchynský ostrov',1.6,.8],pendant:['Závesné svetlo',.4,.4],mirror:['Zrkadlo',.7,.04],towel:['Uterák',.55,.12],coat:['Vešiak',.5,.5],toy:['Hračky',.55,.4],otable:['Záhradný stôl',1.4,.8],lounge:['Záhradné ležadlo',1.6,.85],washer:['Práčka',.6,.6],wshelf:['Nástenná polica',.8,.25],tvw:['TV na stene',1.2,.1],hooks:['Vešiak na stenu',.6,.1]};
const fdim=f=>{const D=DIM3[f.t]||(FURX[f.t]?[FURX[f.t][1],FURX[f.t][2]]:[.5,.5]);const w=f.w||D[0],d=f.d||D[1];return (f.r||0)%2?[d,w]:[w,d];};
const FL=()=>(H.furn||[]).filter(f=>f.level===lvl);
function hitFurn(p){const fs=FL();for(let i=fs.length-1;i>=0;i--){const f=fs[i],[w,d]=fdim(f);if(Math.abs(p[0]-f.p[0])<=w/2&&Math.abs(p[1]-f.p[1])<=d/2)return f;}return null;}
let EXP=0,MEAS=null,GUIDES=[];
function align(b,a){GUIDES=[];const tol=10*devicePixelRatio/view.s;let bx=null,bz=null;WL().forEach(w=>['start','end'].forEach(k=>{const e=w[k];if(Math.hypot(e[0]-b[0],e[1]-b[1])<1e-6)return;if((!a||a[1]===b[1])&&Math.abs(e[0]-b[0])<tol&&(!bx||Math.abs(e[0]-b[0])<Math.abs(bx[0]-b[0])))bx=e;if((!a||a[0]===b[0])&&Math.abs(e[1]-b[1])<tol&&(!bz||Math.abs(e[1]-b[1])<Math.abs(bz[1]-b[1])))bz=e;}));
 const r=[...b];if(bx){r[0]=bx[0];GUIDES.push([bx,r]);}if(bz){r[1]=bz[1];GUIDES.push([bz,r]);}return r;}
let WLB=[];
function draw(){WLB=[];cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#FAF9F6';cx.fillRect(0,0,cv.width,cv.height);
 if(EXP){cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);}
 if(bg&&!EXP){const P=toS([0,0]),w=bgW*view.s;cx.globalAlpha=.6;cx.drawImage(bg,P[0],P[1],w,w*bg.height/bg.width);cx.globalAlpha=1;}
 cx.lineWidth=1;if(!EXP){const gs=i=>cx.strokeStyle=i%5?'#EEEBE5':'#E0DBD2';const x0=Math.floor(view.x),y0=Math.floor(view.y);for(let i=x0;i<x0+cv.width/view.s+1;i++){gs(i);const a=toS([i,0])[0];cx.beginPath();cx.moveTo(a,0);cx.lineTo(a,cv.height);cx.stroke();}
 for(let i=y0;i<y0+cv.height/view.s+1;i++){gs(i);const a=toS([0,i])[1];cx.beginPath();cx.moveTo(0,a);cx.lineTo(cv.width,a);cx.stroke();}}
 if(H.plot&&H.plot.pts.length>2){cx.beginPath();H.plot.pts.forEach((p,i)=>{const P=toS(p);i?cx.lineTo(...P):cx.moveTo(...P);});cx.closePath();cx.fillStyle='rgba(122,154,90,.13)';cx.fill();cx.setLineDash([8*devicePixelRatio,6*devicePixelRatio]);cx.strokeStyle=H.plot.fence?'#5f7f42':'#7a9a5a';cx.lineWidth=(H.plot.fence?2.5:1.5)*devicePixelRatio;cx.stroke();cx.setLineDash([]);
  const pp=H.plot.pts,d=devicePixelRatio;cx.font=`500 ${11*d}px Inter,system-ui`;cx.fillStyle='#5f7f42';cx.textAlign='center';pp.forEach((p,i)=>{const q=pp[(i+1)%pp.length],m=toS([(p[0]+q[0])/2,(p[1]+q[1])/2]);cx.fillText(Math.hypot(q[0]-p[0],q[1]-p[1]).toFixed(1)+' m',m[0],m[1]-6*d);});
  // editable corner handles
  pp.forEach(p=>{const P=toS(p);cx.fillStyle='#fff';cx.strokeStyle='#5f7f42';cx.lineWidth=2*d;cx.beginPath();cx.arc(P[0],P[1],5.5*d,0,6.3);cx.fill();cx.stroke();});cx.textAlign='left';}
 H.walls.filter(w=>w.level!==lvl).forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='rgba(11,11,11,.12)';quad(w,0,g.L,-t,t);});
 (H.stairs||[]).filter(st=>st.level===lvl||H.levels[H.levels.indexOf(LV())-1]?.name===st.level).forEach(st=>{const r=stairRect(st),a=toS([r[0],r[1]]),b=toS([r[2],r[3]]);cx.globalAlpha=st.level===lvl?1:.35;cx.fillStyle='#EADFCF';cx.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);cx.strokeStyle='#B08D64';cx.lineWidth=1.5*devicePixelRatio;cx.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);const d=st.dir||0,c=Math.cos(d),sn=Math.sin(d),L=st.length||3.6,W=st.width||1;for(let k=1;k<12;k++){const f=k/12,p1=toS([st.pos[0]+c*L*f,st.pos[1]+sn*L*f]),p2=toS([st.pos[0]+c*L*f-sn*W,st.pos[1]+sn*L*f+c*W]);cx.beginPath();cx.moveTo(...p1);cx.lineTo(...p2);cx.stroke();}const m0=toS([st.pos[0]-sn*W/2+c*.3,st.pos[1]+c*W/2+sn*.3]),m1=toS([st.pos[0]-sn*W/2+c*(L-.3),st.pos[1]+c*W/2+sn*(L-.3)]);cx.strokeStyle='#E2552D';cx.lineWidth=2*devicePixelRatio;cx.beginPath();cx.moveTo(...m0);cx.lineTo(...m1);cx.stroke();cx.fillStyle='#E2552D';cx.beginPath();cx.arc(...m1,4*devicePixelRatio,0,7);cx.fill();cx.globalAlpha=1;});
 FL().forEach(f=>{const[w,d]=fdim(f),A=toS([f.p[0]-w/2,f.p[1]-d/2]),dd=devicePixelRatio;cx.fillStyle='#F1ECE4';cx.strokeStyle='#A39A8C';cx.lineWidth=1.2*dd;cx.beginPath();cx.roundRect(A[0],A[1],w*view.s,d*view.s,3*dd);cx.fill();cx.stroke();
  if(f.t==='bed'||f.t==='bed1'||f.t==='bunk'){const r=f.r||0,hp=[[0,-1],[1,0],[0,1],[-1,0]][r],P=toS([f.p[0]+hp[0]*(d/2-.3)*(r%2?0:0)+hp[0]*(w/2-.3),f.p[1]+hp[1]*(d/2-.3)]);cx.fillStyle='#fff';cx.beginPath();cx.arc(P[0],P[1],Math.min(w,d)*view.s*.16,0,7);cx.fill();cx.stroke();}
  if(Math.min(w,d)*view.s>28*dd){cx.fillStyle='#8A8174';cx.font=`500 ${9.5*dd}px Inter,system-ui`;cx.textAlign='center';const C=toS(f.p);cx.fillText((FURX[f.t]||['?'])[0].split(' ')[0],C[0],C[1]+3*dd);}});
 WL().forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='#1F1F1F';quad(w,0,g.L,-t,t);
  (w.openings||[]).forEach(o=>{cx.fillStyle=o.type==='door'?'#E2552D':'#8EC3E6';quad(w,o.offset,o.offset+o.width,-t-.03,t+.03);
   if(o.type==='door'){const sd=o.out?-1:1,v=[-g.u[1]*sd,g.u[0]*sd],W0=o.offset,W1=o.offset+o.width,pt=(s,n)=>toS([g.x0+g.u[0]*s+v[0]*n,g.z0+g.u[1]*s+v[1]*n]);cx.strokeStyle='rgba(226,85,45,.7)';cx.lineWidth=1.3*devicePixelRatio;
    const sw=(hs,len,dir)=>{const H0=pt(hs,t),E=pt(hs,t+len),S=pt(hs+dir*len,t);cx.beginPath();cx.moveTo(...H0);cx.lineTo(...E);cx.stroke();cx.setLineDash([3*devicePixelRatio,3*devicePixelRatio]);cx.beginPath();const a0=Math.atan2(E[1]-H0[1],E[0]-H0[0]),a1=Math.atan2(S[1]-H0[1],S[0]-H0[0]);let da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;cx.arc(H0[0],H0[1],len*view.s,a0,a1,da<0);cx.stroke();cx.setLineDash([]);};
    const k=o.kind||'single';if(k==='double'){sw(W0,o.width/2,1);sw(W1,o.width/2,-1);}else if(k==='sliding'){cx.beginPath();cx.moveTo(...pt(W0,t+.06));cx.lineTo(...pt(W0+o.width*.6,t+.06));cx.stroke();}else{o.hinge==='R'?sw(W1,o.width,-1):sw(W0,o.width,1);}}});
  cx.fillStyle='#6B6B6B';cx.font=`500 ${11.5*devicePixelRatio}px Inter,system-ui`;const mx=g.x0+g.u[0]*g.L/2,mz=g.z0+g.u[1]*g.L/2,C=WC(),sg=((mx-g.u[1]-C[0])**2+(mz+g.u[0]-C[1])**2)>((mx+g.u[1]-C[0])**2+(mz-g.u[0]-C[1])**2)?1:-1,M0=toS([mx,mz]),off=(t*view.s+(Math.abs(g.u[1])>.7?cx.measureText(g.L.toFixed(2)+' m').width/2+8*devicePixelRatio:14*devicePixelRatio))*sg,m=[M0[0]-g.u[1]*off,M0[1]+g.u[0]*off+4*devicePixelRatio];WLB.push(m);cx.textAlign='center';cx.fillText(g.L.toFixed(2)+' m',...m);
  if(tool==='move'&&!EXP)['start','end'].forEach(k=>{const P=toS(w[k]);cx.fillStyle='#fff';cx.strokeStyle='#E2552D';cx.lineWidth=2;cx.beginPath();cx.arc(...P,6*devicePixelRatio,0,7);cx.fill();cx.stroke();});});
 calPts.forEach((q,i)=>{const P=toS(q);cx.fillStyle='#E2552D';cx.beginPath();cx.arc(...P,7*devicePixelRatio,0,7);cx.fill();if(i)( cx.strokeStyle='#E2552D',cx.lineWidth=3,cx.beginPath(),cx.moveTo(...toS(calPts[0])),cx.lineTo(...P),cx.stroke());});
 if(drag&&drag.k==='new'){const t=+$('th').value/100*view.s;cx.strokeStyle='rgba(226,85,45,.85)';cx.lineWidth=Math.max(3,t);cx.lineCap='square';cx.beginPath();cx.moveTo(...toS(drag.a));cx.lineTo(...toS(drag.b));cx.stroke();cx.lineCap='butt';const L=Math.hypot(drag.b[0]-drag.a[0],drag.b[1]-drag.a[1]),P=toS(drag.b);cx.font=`600 ${12*devicePixelRatio}px Inter,system-ui`;const tx=L.toFixed(2)+' m',tw=cx.measureText(tx).width+14*devicePixelRatio;cx.fillStyle='#0B0B0B';cx.fillRect(P[0]+10*devicePixelRatio,P[1]-26*devicePixelRatio,tw,20*devicePixelRatio);cx.fillStyle='#fff';cx.textAlign='left';cx.fillText(tx,P[0]+17*devicePixelRatio,P[1]-12*devicePixelRatio);}
 const dpr=devicePixelRatio;if(drag&&(drag.k==='new'||drag.k==='end'))GUIDES.forEach(([e,r])=>{cx.strokeStyle='rgba(226,85,45,.8)';cx.lineWidth=1*dpr;cx.setLineDash([5*dpr,4*dpr]);cx.beginPath();cx.moveTo(...toS(e));cx.lineTo(...toS(r));cx.stroke();cx.setLineDash([]);});
 if(MEAS&&tool==='meas'){const A=toS(MEAS.a),B=toS(MEAS.b),L=Math.hypot(MEAS.b[0]-MEAS.a[0],MEAS.b[1]-MEAS.a[1]);cx.strokeStyle='#E2552D';cx.lineWidth=2*dpr;cx.setLineDash([7*dpr,5*dpr]);cx.beginPath();cx.moveTo(...A);cx.lineTo(...B);cx.stroke();cx.setLineDash([]);[A,B].forEach(P=>{cx.fillStyle='#E2552D';cx.beginPath();cx.arc(...P,4*dpr,0,7);cx.fill();});
  const M=[(A[0]+B[0])/2,(A[1]+B[1])/2],tx=L.toFixed(2).replace('.',',')+' m';cx.font=`700 ${13*dpr}px Inter,system-ui`;const tw=cx.measureText(tx).width+16*dpr;cx.fillStyle='#0B0B0B';cx.beginPath();cx.roundRect(M[0]-tw/2,M[1]-26*dpr,tw,22*dpr,11*dpr);cx.fill();cx.fillStyle='#fff';cx.textAlign='center';cx.fillText(tx,M[0],M[1]-10*dpr);}
 const RS=rooms();let tot=0;RS.forEach(r=>{tot+=r.a;const P=toS(r.p),d=devicePixelRatio,bw=2*Math.min(r.p[0]-r.bb[0],r.bb[2]-r.p[0])*view.s-18*d;let fs=12.5;cx.font=`700 ${fs*d}px Archivo,Inter,system-ui`;let ln=[r.n];
 if(cx.measureText(r.n).width>bw){const sp=r.n.indexOf(' ',Math.floor(r.n.length/2)-3);if(sp>0)ln=[r.n.slice(0,sp),r.n.slice(sp+1)];while(fs>8.5&&Math.max(...ln.map(t=>cx.measureText(t).width))>bw){fs-=.5;cx.font=`700 ${fs*d}px Archivo,Inter,system-ui`;}}
 const tw=Math.max(...ln.map(t=>cx.measureText(t).width)),th=(ln.length*fs+14)*d,small=bw<34*d;
 for(let k=0;k<3&&WLB.some(q=>Math.abs(q[0]-P[0])<(tw/2+26*d)&&Math.abs(q[1]-P[1])<th/2+10*d);k++)P[1]+=(r.p[1]>0?1:1)*16*d;
 r.sp=P;cx.textAlign='center';if(!small){cx.fillStyle=r.auto?'rgba(11,11,11,.55)':'#0B0B0B';ln.forEach((t,i)=>cx.fillText(t,P[0],P[1]-2*d-(ln.length-1-i)*fs*1.1*d));}cx.font=`500 ${Math.min(11.5,fs)*d}px Inter,system-ui`;cx.fillStyle='#6B6B6B';cx.fillText(r.a.toFixed(1).replace('.',',')+' m²',P[0],P[1]+12*d);});
 const ta=$('area');if(ta){ta.hidden=!RS.length;ta.textContent='Plocha '+lvl+': '+tot.toFixed(1).replace('.',',')+' m² · '+RS.length+' miest.';}chkSoon();
 if(cornerPts&&cornerPts.length){const d=devicePixelRatio;cornerPts.forEach((p,i)=>{const s=toS(p);cx.fillStyle='#E85D04';cx.beginPath();cx.arc(s[0],s[1],7*d,0,6.3);cx.fill();cx.strokeStyle='#fff';cx.lineWidth=2*d;cx.stroke();cx.fillStyle='#fff';cx.font=`700 ${11*d}px Inter,system-ui`;cx.textAlign='center';cx.fillText(String(i+1),s[0],s[1]+4*d);});if(cornerPts.length>1){cx.strokeStyle='#E85D0488';cx.lineWidth=2*d;cx.setLineDash([6*d,4*d]);cx.beginPath();cornerPts.forEach((p,i)=>{const s=toS(p);i?cx.lineTo(s[0],s[1]):cx.moveTo(s[0],s[1]);});if(cornerPts.length===4){const s=toS(cornerPts[0]);cx.lineTo(s[0],s[1]);}cx.stroke();cx.setLineDash([]);}cx.textAlign='left';}
 $('empE').hidden=!!(H.walls.length||bg||H.plot);}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{e.preventDefault();const p=toW(e),f=e.deltaY<0?1.15:1/1.15;view.s*=f;view.x=p[0]-(p[0]-view.x)/f;view.y=p[1]-(p[1]-view.y)/f;draw();},{passive:false});
const ptrs=new Map();let pinch=null,lastAct=0;
const two=()=>{const [a,b]=[...ptrs.values()];return{c:[(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2],d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1};};
cv.addEventListener('pointerdown',e=>{if(cv._cornerMode){e.preventDefault();const p=toW(e);cornerPts.push(p);$('hint').textContent='Označovanie rohov: '+cornerPts.length+'/4';draw();if(cornerPts.length>=4)finishCorners();return;}cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,e);TOUCH=e.pointerType==='touch';
 if(ptrs.size===2){if(drag&&['end','wall','op'].includes(drag.k)&&undo.length)H=JSON.parse(undo.pop());else if(Date.now()-lastAct<400&&undo.length)H=JSON.parse(undo.pop());
  const t=two();pinch={...t,v0:{...view},w0:toW({clientX:t.c[0],clientY:t.c[1]})};drag=null;draw();return;}
 if(ptrs.size>2)return;const p=toW(e);
 if(['door','window','del','stair'].includes(tool))lastAct=Date.now();
 if(e.button===2){drag={k:'pan',e0:[e.clientX,e.clientY],v0:{...view}};return;}
 if(tool==='cal'){calPts.push(p);draw();if(calPts.length===2)calDone();return;}
 if(tool==='wall'){drag={k:'new',a:snapPt(p),b:snapPt(p)};}
 else if(tool==='meas'){const s=snapPt(p);MEAS={a:s,b:s};drag={k:'meas'};draw();}
 else if(tool==='furn'){const f=hitFurn(p);if(f){snap();f.r=((f.r||0)+1)%4;save();draw();toast('Otočené o 90°.','ok',1500);return;}furnPick(p);}
 else if(tool==='move'){const ff=hitFurn(p);if(ff&&!hitEnd(p)&&!hitWall(p)){snap();drag={k:'furn',f:ff,d:[ff.p[0]-p[0],ff.p[1]-p[1]]};return;}const en=hitEnd(p);if(en){snap();drag={k:'end',w:en.w,key:en.k};return;}const op=hitOp(p);if(op){snap();drag={k:'op',...op};return;}const h=hitWall(p);if(h){snap();drag={k:'wall',w:h.w,p0:p,a:[...h.w.start],b:[...h.w.end]};return;}drag={k:'pan',e0:[e.clientX,e.clientY],v0:{...view}};}
 else if(tool==='door'||tool==='window'){const eo=hitOp(p);if(eo){opDlg(eo);return;}const h=hitWall(p);if(!h)return;const d=tool==='door',wd=d?.9:1.2,g=geo(h.w);if(g.L<wd+.1){const m='Stena je príliš krátka na '+(d?'dvere (min. 1 m).':'okno (min. 1,3 m).');$('hint').textContent=m;toast(m,'warn');return;}snap();
  (h.w.openings=h.w.openings||[]).push(d?{type:'door',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:0,height:2.05}:{type:'window',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:.9,height:1.4});save();draw();}
 else if(tool==='stair'){const ex=(H.stairs||[]).find(st=>{const r=stairRect(st);return st.level===lvl&&p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3];});if(ex){snap();ex.dir=((ex.dir||0)+Math.PI/2)%(2*Math.PI);if(ex.dir<1e-6)ex.dir=0;save();draw();toast('Schody otočené o 90°.','ok',1800);return;}snap();(H.stairs=H.stairs||[]).push({level:lvl,pos:[r2(p[0]),r2(p[1])],dir:0,width:1,length:3.6});save();draw();}
 else if(tool==='del'){const ff=hitFurn(p);if(ff&&!hitWall(p)){snap();H.furn.splice(H.furn.indexOf(ff),1);save();draw();return;}const si=(H.stairs||[]).findIndex(st=>{const r=stairRect(st);return (st.level===lvl||H.levels[H.levels.indexOf(LV())-1]?.name===st.level)&&p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3];});if(si>=0){snap();H.stairs.splice(si,1);save();draw();return;}const op=hitOp(p);if(op){snap();op.w.openings.splice(op.w.openings.indexOf(op.o),1);}else{const h=hitWall(p);if(!h)return;snap();H.walls.splice(H.walls.indexOf(h.w),1);}save();draw();}});
cv.addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,e);
 if(pinch&&ptrs.size>=2){const t=two(),k=t.d/pinch.d,r=cv.getBoundingClientRect();view.s=pinch.v0.s*k;view.x=pinch.w0[0]-(t.c[0]-r.left)*devicePixelRatio/view.s;view.y=pinch.w0[1]-(t.c[1]-r.top)*devicePixelRatio/view.s;draw();return;}
 if(!drag)return;const p=toW(e);
 if(drag.k==='pan'){view.x=drag.v0.x-(e.clientX-drag.e0[0])*devicePixelRatio/view.s;view.y=drag.v0.y-(e.clientY-drag.e0[1])*devicePixelRatio/view.s;}
 else if(drag.k==='new'){const s=snapPt(p);drag.b=ortho(drag.a,s);if(s[0]===r2(p[0])&&s[1]===r2(p[1]))drag.b=align(drag.b,obl?null:drag.a);else GUIDES=[];}
 else if(drag.k==='meas'){MEAS.b=snapPt(p);}
draw();});
// endpoint/wall/op dragging handled here to keep logic readable
cv.addEventListener('pointermove',e=>{if(!drag)return;const p=toW(e);
 if(drag.k==='end')drag.w[drag.key]=ortho(drag.w[drag.key==='start'?'end':'start'],snapPt(p,drag.w));
 if(drag.k==='wall'){const d=[r2(p[0]-drag.p0[0]),r2(p[1]-drag.p0[1])];drag.w.start=[drag.a[0]+d[0],drag.a[1]+d[1]];drag.w.end=[drag.b[0]+d[0],drag.b[1]+d[1]];}
 if(drag.k==='furn'){drag.f.p=[r2(p[0]+drag.d[0]),r2(p[1]+drag.d[1])];}
 if(drag.k==='op'){const q=proj(drag.w,p);drag.o.offset=Math.max(.05,Math.min(q.g.L-drag.o.width-.05,r2(q.s-drag.ds)));}
 draw();});
const pu=e=>{ptrs.delete(e.pointerId);if(pinch){if(!ptrs.size)pinch=null;return;}if(!drag)return;if(e.type==='pointercancel'){drag=null;draw();return;}
 if(drag.k==='new'&&Math.hypot(drag.b[0]-drag.a[0],drag.b[1]-drag.a[1])>.2){snap();H.walls.push({id:'w'+Date.now(),level:lvl,start:drag.a,end:drag.b,thickness:+$('th').value/100,base:0,height:LV().height,openings:[]});}
 if(['end','wall','op','furn','plot'].includes(drag.k)&&undo.length&&undo[undo.length-1]===JSON.stringify(H))undo.pop();
 drag=null;save();draw();};
cv.addEventListener('pointerup',pu);cv.addEventListener('pointercancel',pu);
document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(b.dataset.t));
$('hint').textContent=HINT.wall;
$('undo').onclick=()=>{if(undo.length){H=JSON.parse(undo.pop());if(!H.levels.find(l=>l.name===lvl))lvl=H.levels[0].name;syncUl();const u=H.underlay;if((u&&u.src)!==(bg&&bg.src))setBg();else{bgW=u?u.w:bgW;$('imw').value=bgW;}lvUI();banner();save();draw();}};
addEventListener('keydown',e=>{if(e.target.tagName!=='INPUT'&&(e.ctrlKey||e.metaKey)&&e.key==='z')$('undo').onclick();});
$('th').oninput=()=>{$('thv').textContent=$('th').value+' cm';};
$('th').onchange=()=>{snap();const t=+$('th').value/100;H.walls.forEach(w=>{if(w.thickness>=.2||t<.2)w.thickness=t;});save();draw();};
$('imw').oninput=()=>{bgW=+$('imw').value||12;if(H.underlay){H.underlay.w=bgW;save();}draw();};
$('obl').onclick=()=>{obl=!obl;$('obl').innerHTML=I.skew+'Šikmé: '+(obl?'ZAP':'VYP');$('obl').classList.toggle('on',obl);};
let dlgRes=null;
function dlg(title,body,btns,o={}){if(dlgRes)dlgRes(null);return new Promise(res=>{dlgRes=res;$('ovb').innerHTML=(o.step?'<div class="steps">'+Array.from({length:o.step[1]},(_,i)=>'<i class="'+(i<=o.step[0]?'on':'')+'"></i>').join('')+'</div>':'')+'<h3>'+title+'</h3>'+(body||'')+'<div class="bt"></div>';const bs=$('ovb').querySelector('.bt');
 btns.forEach(([t,v,c,ic])=>{const b=document.createElement('button');b.innerHTML=(ic?I[ic]:'')+esc(t);if(c)b.className=c;b.onclick=()=>{const f={};$('ovb').querySelectorAll('input,select').forEach(i=>f[i.name||'_']=i.type==='checkbox'?i.checked:i.value.trim());const i=$('ovb').querySelector('input[type=text],input:not([type])');dlgRes=null;$('ov').classList.remove('on');res(v===null?null:{v,name:i&&i.value.trim(),f});};bs.appendChild(b);});
 $('ov').classList.add('on');$('ov').onclick=e=>{if(e.target===$('ov')){dlgRes=null;$('ov').classList.remove('on');res(null);}};const i=$('ovb').querySelector('input[type=text],input[type=number]');if(i){if(!TCH)i.focus();$('ovb').querySelectorAll('input').forEach(x=>x.onkeydown=e=>{if(e.key==='Enter')bs.lastChild.click();});}});}
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('ov').classList.contains('on')){$('ov').onclick({target:$('ov')});}});
var esc=t=>String(t).replace(/[<>&"]/g,c=>'&#'+c.charCodeAt(0)+';');
async function askName(def,ti,ok){const r=await dlg(ti||'Názov projektu','<input type="text" value="'+esc(def)+'" placeholder="napr. Rodinný dom Kováč">',[['Zrušiť',null],[ok||'Vytvoriť',1,'go']]);return r?(r.name||def):null;}
const shrink=(im,M=2000)=>{const k=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85);};
let pdfjs=null;
async function readPdf(f){busy('Načítavam PDF…');try{if(!pdfjs){pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';}
 const doc=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;let n=1;busy(0);
 if(doc.numPages>1){const r=await dlg('PDF má '+doc.numPages+' strán','<p>Ktorú stranu použiť ako výkres?</p>',[['Zrušiť',null],...Array.from({length:Math.min(doc.numPages,12)},(_,i)=>['Strana '+(i+1),i+1,i?'':'go'])]);if(!r||!r.v)return null;n=r.v;}
 busy('Vykresľujem stranu '+n+'…');const pg=await doc.getPage(n),v0=pg.getViewport({scale:1}),sc=2400/Math.max(v0.width,v0.height),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 await pg.render({canvasContext:x,viewport:vp}).promise;busy(0);return shrink(c);}catch(e){busy(0);console.warn(e);dlg('PDF sa nepodarilo otvoriť','<p>Skúste výkres uložiť ako obrázok (JPG/PNG) alebo urobiť snímku obrazovky.</p>',[['OK',1,'go']]);return null;}}
function readImg(f){if(/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name))return readPdf(f);
 return new Promise(res=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{res(shrink(im));URL.revokeObjectURL(u);};
  im.onerror=()=>{res(null);dlg('Obrázok sa nedá otvoriť',/hei[cf]/i.test(f.type+f.name)?'<p>Formát HEIC (fotky z iPhonu) tento prehliadač nevie zobraziť. Na iPhone: Nastavenia → Fotoaparát → Formáty → <b>Najkompatibilnejšie</b>, alebo pošlite fotku ako JPG / urobte snímku obrazovky.</p>':'<p>Podporované sú JPG, PNG, WebP a PDF.</p>',[['OK',1,'go']]);};im.src=u;});}
let imgMode='ask',calPts=[];
function lvUI(){const sel=$('lvl');sel.innerHTML=H.levels.map(l=>'<option'+(l.name===lvl?' selected':'')+'>'+esc(l.name)+'</option>').join('')+'<option value="+">+ Pridať podlažie</option>';$('stb').hidden=H.levels.length<2;}
$('lvl').onchange=async e=>{const v=e.target.value;if(v!=='+'){goLvl(v);return;}
 const top=H.levels[H.levels.length-1],ws=H.walls.filter(w=>w.level===top.name),nm=(H.levels.length+1)+'NP';
 const r=await dlg('Pridať podlažie '+nm,'<p>Obvodové steny sa skopírujú z podlažia '+esc(top.name)+' a pridajú sa predvolené schody (otočíte ich nástrojom Schody, zmažete nástrojom Zmazať). Každé podlažie môže mať vlastný podklad (Nahrať výkres)..</p>',[['Zrušiť',null],['Pridať prázdne','e'],['Pridať s kópiou stien','c','go']]);
 if(!r||!r.v){lvUI();return;}snap();LV().ul=H.underlay||null;H.underlay=null;H.ulv=nm;const L={name:nm,elevation:Math.round((top.elevation+top.height+.25)*100)/100,height:2.7};H.levels.push(L);
 if(r.v==='c')ws.forEach((w,i)=>H.walls.push({...JSON.parse(JSON.stringify(w)),id:'c'+Date.now()+i,level:nm,height:L.height,openings:(w.openings||[]).filter(o=>o.type==='window')}));
 let xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]);if(!xs.length){xs=[0];zs=[0];}
 (H.stairs=H.stairs||[]).push({level:top.name,pos:[r2(Math.min(...xs)+.5),r2(Math.min(...zs)+.5)],dir:0,width:1,length:3.6});lvl=nm;delete LV().ul;setBg();banner();lvUI();save();fit();toast('Podlažie '+nm+' pridané.','ok');};
function setTool(t){MEAS=null;GUIDES=[];const b=document.querySelector('[data-t='+t+']');tool=t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));$('hint').textContent=HINT[t];calPts=[];draw();}
$('cal').onclick=()=>{if(!H.underlay){toast('Najprv nahrajte výkres pre toto podlažie.','warn');return;}setTool('cal');};
async function calDone(){const d=Math.hypot(calPts[1][0]-calPts[0][0],calPts[1][1]-calPts[0][1]);
 const r=await dlg('Aká dlhá je označená úsečka?','<input type="text" inputmode="decimal" placeholder="napr. 8,5"> <p class="note">Zadajte v metroch.</p>',[['Zrušiť',null],['Nastaviť mierku',1,'go']]);
 const v=r&&parseFloat((r.name||'').replace(',','.'));setTool('wall');if(!v||!d)return;const f=v/d;snap();
 bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;banner();$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);w.thickness=Math.max(.1,Math.round(w.thickness*f*20)/20);(w.openings||[]).forEach(o=>{o.offset*=f;o.width=Math.min(o.width,o.width*f>.5?o.width:o.width);});});save();fit();
 if(!H.walls.length)recog(1);}
function busy(t){let b=$('busy');if(!t){if(b)b.remove();return;}if(!b){b=document.createElement('div');b.id='busy';b.className='busy';document.body.appendChild(b);}b.innerHTML='<div><span class="spin"></span><b>'+t+'</b></div>';}
function banner(){$('ban').hidden=!(H.underlay&&H.underlay.guess&&!H.underlay.cal&&!H.underlay.asked&&H.walls.length);}
let recBusy=0;

function offerTrace(hasGuess){dlg(hasGuess?'Skontrolujte obrys domu':'Rozpoznanie sa nepodarilo',hasGuess?'<p>Obvod domu som odhadol, ale nie som si istý (situácia / farebný výrez / značenie).</p><p>Ak sedí, pokračujte. Ak nie, <b>označte 4 rohy</b> správne, alebo dokreslite ručne.</p>':'<p>Na výkrese neviem spoľahlivo nájsť steny (fotka, tiene, situácia alebo neštandardný formát).</p><p><b>Označte 4 rohy domu</b> na podklade – vytvorím obvod. Vnútro potom dokreslíte, alebo skúste inú citlivosť.</p>',[['Zrušiť',null],['Kresliť ručne','draw'],['Označiť 4 rohy','corners','go']]).then(r=>{if(!r)return;if(r.v==='draw'){tool('wall');toast('Kreslite steny prstom / myšou.','ok');}else if(r.v==='corners')startCorners();});}
let cornerPts=[];
function startCorners(){cornerPts=[];tool('pan');toast('Ťuknite 4 rohy domu (v smere hodinových ručičiek).','ok');$('hint').textContent='Označovanie rohov: 0/4 – ťuknite roh domu na výkrese.';
 cv._cornerMode=1;}
function finishCorners(){if(cornerPts.length<4)return;cv._cornerMode=0;snap();const lv=LV(),r2=x=>Math.round(x*100)/100,P=cornerPts.slice(0,4).map(p=>[r2(p[0]),r2(p[1])]);
 for(let i=0;i<4;i++){const a=P[i],b=P[(i+1)%4];H.walls.push({id:'c'+Date.now()+i,auto:1,level:lv.name,start:a,end:b,thickness:.3,base:0,height:lv.height,openings:[]});}
 cornerPts=[];save();fit();banner();toast('Obvod domu hotový (4 steny). Dokreslite vnútorné priečky.','ok');$('hint').textContent='Obvod z rohov je hotový. Dokreslite vnútorné steny alebo pridajte dvere/okná.';}
async function recog(quiet,nosnap){if(!bg||!bg.complete||!bg.width){if(!quiet)toast('Najprv nahrajte výkres pre toto podlažie.','warn');return;}if(recBusy)return;recBusy=1;busy('Rozpoznávam steny…');await new Promise(r=>setTimeout(r,40));
 let R=null;const man=H.walls.some(w=>!w.auto);
 // new reader first (perspective, deskew, hatch, dimension text); old pipeline for site plans and as fallback
 if(!(H.underlay.site&&!man)&&!/[?&]cv=old/.test(location.search)){try{const P=readPlan(bg,{rect:H.underlay.rect||man,mW:(H.underlay.cal||man)?bgW:null});if(P&&P.walls.length>=4&&(P.conf>=.45||(P.dbg&&P.dbg.nR>=2))){R=P;if(man)R.guess=false;const lvn=LV().name;H.rlab=(H.rlab||[]).filter(l=>l.level!==lvn).concat((P.labels||[]).map(l=>({level:lvn,p:l.p,n:l.n})));}window.__plan=P?{n:P.walls.length,conf:+P.conf.toFixed(2),scale:P.scaleSrc,dims:P.dbg&&P.dbg.dims,log:P.dbg&&P.dbg.dimLog,pick:P.dbg&&P.dbg.pick,nR:P.dbg&&P.dbg.nR,sw:P.dbg&&P.dbg.stackWin,ops:P.dbg&&P.dbg.ops,lab:P.dbg&&P.dbg.labels,wlog:P.dbg&&P.dbg.wlog}:null;}catch(e){console.warn(e);}}
 if(!R)try{R=detectWalls(bg,{sens:+$('sens').value,mW:H.underlay.cal||man?bgW:null,rect:H.underlay.rect||man,site:H.underlay.site&&!man,w:bgW});if(man)R.guess=false;}catch(e){console.warn(e);}
 const ws=R?R.walls:[];busy(0);recBusy=0;if(!nosnap)snap();const lv=LV();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lv.name));
 if(R&&!H.underlay.rect&&!man){H.underlay={src:R.mode==='plan'?R.canvas.toDataURL('image/jpeg',.85):H.underlay.src,w:R.w,rect:1,guess:R.guess,site:R.mode==='site'?1:0};}else if(R&&R.guess&&!H.underlay.cal){H.underlay.w=R.w;H.underlay.guess=true;}
 H.walls=H.walls.concat(gapMerge(ws,R&&R.mode==='plan').map((w,i)=>({id:'a'+Date.now()+i,auto:1,level:lv.name,start:w.start,end:w.end,thickness:w.thickness,base:0,height:lv.height,openings:w.op||[]})));
 if(R&&R.mode==='plan'&&R.dbg&&R.dbg.wordsP&&R.dbg.wordsP.length)dropFurnBoxes(R.dbg.wordsP,lv.name);
 if(R&&R.mode==='plan')inkFilter(R,lv.name);
 if(R&&R.mode==='plan')cleanOutline(lv.name);
 if(R&&R.mode==='plan')closeGaps(lv.name);
 save();const u=H.underlay;bgW=u.w;$('imw').value=bgW;if(!bg.src.endsWith(u.src.slice(-40))){bg=new Image();bg.onload=()=>{fit();};bg.src=u.src;}else fit();banner();
 const md=R?R.mode:'none';window.__mode=md;
 const nAuto=H.walls.filter(w=>w.auto&&w.level===lv.name).length,nOp=H.walls.filter(w=>w.auto&&w.level===lv.name).reduce((s,w)=>s+(w.openings||[]).length,0);
 const hm=md==='site'?(R&&R.parcel?'Toto vyzerá ako situácia pozemku – nakreslil som obvod domu a pozemok. Vnútorné steny dokreslite alebo nahrajte pôdorys.':'Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokreslite alebo nahrajte pôdorys.'):ws.length?'Rozpoznaných '+nAuto+' stien'+(nOp?' a '+nOp+(nOp==1?' otvor':nOp<5?' otvory':' otvorov')+' (dvere/okná)':'')+'. Ak niečo chýba alebo prebýva, posuňte „Citlivosť“. Opravy: Posunúť, Zmazať, Späť.':(R&&R.needTrace)?'Pôdorys sa nepodarilo spoľahlivo prečítať. Označte 4 rohy domu, alebo steny nakreslite ručne.':'Na obrázku sme nenašli steny ani obrys domu. Výkres zostáva ako podklad – steny nakreslite ručne alebo nahrajte pôdorys.';
 $('hint').textContent=hm;if(!quiet||md!=='plan')toast(hm.split('. ')[0]+'.',ws.length?'ok':'warn');
 if(R&&R.needTrace&&!quiet){setTimeout(()=>offerTrace(!!ws.length),200);}
 if(md==='site'&&!H.plot&&ws.length){
  if(R&&R.parcel&&R.parcel.pts&&R.parcel.pts.length>=3){H.plot={pts:R.parcel.pts.map(p=>[p[0],p[1]]),fence:R.parcel.fence!==0?1:0};window.__parcel=1;window.__parcelConf=R.parcel.conf||0;}
  else{const xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]);H.plot=plotAround(Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));window.__parcel=0;}
  save();fit();}
 if(md==='site'&&!quiet2.v&&!H.underlay.cal&&!man){quiet2.v=1;dlg('Situácia pozemku','<p>Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokresli alebo nahraj pôdorys.</p><p>Aká dlhá je dlhšia strana domu (v metroch)? Nájdete ju na kóte, napr. „14400“ = 14,4 m.</p><input type="text" inputmode="decimal" placeholder="napr. 14,4">',[['Neskôr',null],['Nastaviť','ok','go']]).then(r=>{quiet2.v=0;const v=parseFloat(((r&&r.name)||'').replace(',','.'));if(r&&v>2&&v<100)scaleBy(v/(R.longPx/R.ppm));});}
 if(md==='plan'&&R.scaleSrc&&!quiet2.v&&!H.underlay.cal&&!H.underlay.asked&&!man&&ws.length){H.underlay.asked=1;save();banner();const xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]),lx=Math.max(...xs)-Math.min(...xs),lz=Math.max(...zs)-Math.min(...zs),L=Math.max(lx,lz)+ (ws[0].thickness||.3),f1=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',');
  if(R.scaleSrc==='dims'){toast('Mierka podľa kót na výkrese: dom '+f1(L)+' m.','ok');}
  else{quiet2.v=1;/* scale hint from the doors: interior leaves are 80-90 cm in practice */const DW=ws.flatMap(w=>(w.openings||[]).filter(o=>o.type==='door'&&o.kind!=='entrance'&&o.kind!=='terrace'&&o.width>.5&&o.width<1.3).map(o=>o.width)).sort((a,b)=>a-b),dm=DW.length?DW[DW.length>>1]:0,dOff=dm&&(dm<.78||dm>.95);
  const dTxt=dm?'<p>Pomôcka: vnútorné dvere teraz merajú asi <b>'+Math.round(dm*100)+' cm</b> (bežne 80–90 cm)'+(dOff?' – mierka asi nesedí, dom podľa dverí by mal <b>'+f1(L*.85/dm)+' m</b>.':' – mierka vyzerá v poriadku.')+'</p>':'';
  dlg('Skontrolujte mierku','<p>Na výkrese som nenašiel čitateľné kóty, mierku som odhadol: dlhšia strana domu má asi <b>'+f1(L)+' m</b>.</p>'+dTxt+'<p>Aká dlhá je naozaj (v metroch, z vonkajšej strany)?</p><input type="text" inputmode="decimal" value="'+f1(L)+'">',[['Ponechať',null]].concat(dOff?[['Podľa dverí (85 cm)','door']]:[]).concat([['Nastaviť','ok','go']])).then(r=>{quiet2.v=0;if(r&&r.v==='door'){scaleBy(.85/dm);return;}const v=parseFloat(((r&&r.name)||'').replace(',','.'));if(r&&v>2&&v<100&&Math.abs(v/L-1)>.005)scaleBy(v/L);});}}
 window.__rec=ws.length;window.__nw=H.walls.length;window.__ops=H.walls.reduce((s,w)=>s+(w.openings||[]).length,0);window.__need=!!(R&&R.needTrace);}
const quiet2={v:0};
function scaleBy(f){snap();bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);});if(H.plot&&H.plot.pts)H.plot.pts=H.plot.pts.map(p=>[Math.round(p[0]*f*100)/100,Math.round(p[1]*f*100)/100]);const sp=o=>{o.p=[Math.round(o.p[0]*f*100)/100,Math.round(o.p[1]*f*100)/100];};(H.rlab||[]).forEach(sp);(H.rn||[]).forEach(sp);(H.furn||[]).forEach(sp);save();fit();banner();}
$('rec').onclick=()=>recog();$('recx').onclick=()=>{const n=H.walls.filter(w=>w.auto&&w.level===lvl).length;if(!n)return;snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));save();draw();$('hint').textContent='Rozpoznané steny vymazané ('+n+'). Späť ich vráti.';toast('Vymazaných '+n+' rozpoznaných stien.','ok');};let sT;$('sens').oninput=()=>{clearTimeout(sT);sT=setTimeout(()=>H.underlay&&recog(1),350);};$('banc').onclick=()=>$('cal').click();
function afterImg(ns){const go=()=>{fit();recog(1,ns===2);};bg.complete&&bg.width?go():bg.onload=()=>{draw();go();};}
const pickImg=m=>{imgMode=m;$('img').value='';$('img').click();};
$('upl').onclick=()=>pickImg('ask');
$('img').onchange=async e=>{const f=e.target.files[0];if(!f)return;const src=await readImg(f);if(!src)return;let m=imgMode;
 if(m==='ask'&&H.walls.length){const r=await dlg('Nahrali ste výkres','<p>Tento projekt už má nakreslené steny. Čo chcete urobiť?</p>',[['Zrušiť',null],['Vymeniť podklad v tomto projekte','swap'],['Nový projekt z tohto výkresu','new','go']]);if(!r||!r.v)return;m=r.v;}
 if(m==='new'||m==='site'){const n=await askName(f.name.replace(/\.[^.]+$/,''));if(n){newP(n,[],{src,w:20,site:m==='site'?1:0});afterImg();}}
 else{snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));H.underlay={src,w:20};H.ulv=lvl;setBg();save();afterImg(2);}};
// prem8: the demo house is furnished by the same rule engine (0 rule violations), named rooms, unique kids rooms, garden set kept
const DEMO_V='20261111zk';
// ukážka 2: operator-traced two-storey plan (Schmidt-Lademann House 1958 plan from the benchmark set), auto-furnished + QA-curated; ?demo=2 opens it
async function demo2(){try{const j=await(await fetch('assets/ukazka2_20261111s.json?v=20261111zk')).json();openP('p'+Date.now(),j);try{rulesFix();save();draw();}catch(e){}toast('Ukážka 2 – poschodový dom. Kliknite Vygenerovať 3D.','ok');}catch(e){toast('Ukážku 2 sa nepodarilo načítať.','err');}}
if(/[?&]demo=2/.test(location.search))setTimeout(()=>demo2(),400);
function demoNew(){const D=JSON.parse(JSON.stringify(DEMO));window.__demoB=1;try{newP(D.name,D.walls,null,D.plot);}finally{window.__demoB=0;}H.style=D.style;H.mat=D.mat||H.mat;H.dv=DEMO_V;if(D.roof){roof=D.roof;const rs=$('roof');if(rs)rs.value=D.roof;}
 H.rn=[[3.4,2.1,'Spálňa'],[3.4,5.8,'Detská izba 1'],[3.4,9,'Detská izba 2'],[12.4,1.8,'Predsieň'],[8.7,.95,'WC'],[8.7,2.75,'Kúpeľňa'],[11,6,'Obývačka s kuchyňou']].map(([x,z,n])=>({level:H.levels[0].name,p:[x,z],n}));
 const keep=(D.furn||[]).filter(f=>f.p[0]>15.3||f.p[0]<-.3||f.p[1]<-.3||f.p[1]>10.8);H.furn=[];furnish({demo:1});const R=RC[lvl];const nm=id=>{const e=H.rn.find(e=>roomAt(R,e.p)===id);return e?e.n:'';};
 const COL={'Detská izba 1':{bed1:{cb:'#5f7f96'},rug:{c:'#9fb39a'}},'Detská izba 2':{bunk:{cb:'#d0795e'},bed1:{cb:'#d0795e'},rug:{c:'#e1b04f'}}};
 H.furn.forEach(f=>{const c=(COL[nm(roomAt(R,f.p))]||{})[f.t];if(c)Object.assign(f,c);});H.furn=H.furn.concat(keep);save();return H;}
window.__demoNew=demoNew;
async function act(m){$('dd').classList.remove('on');if(m==='png'||m==='a4'||m==='a3'){exportHi(m);return;}if(m==='furnish'){furnish();return;}if(m==='agent'){agentDlg();return;}if(m==='tut'){$('vw').classList.contains('on')?tut(TUT3,'vkTut3'):tut();return;}if(m==='pano'){panoDlg();return;}if(m==='pres'){presOn(true);return;}if(m==='mirror'){mirror();return;}
 if(m==='new')wizNew();
 if(m==='newimg')pickImg('new');if(m==='open')$('ld').click();if(m==='mine')show('home');
 if(m==='demo'){demoNew();draw();toast('Ukážkový rodinný dom – zariadený, pripravený na 3D.','ok');}
 if(m==='dl'){save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(H,null,1)],{type:'application/json'}));a.download=(H.name||'dom')+'.json';a.click();toast('Projekt stiahnutý.','ok');}}
$('menu').onclick=e=>{e.stopPropagation();$('dd').classList.toggle('on');};document.addEventListener('click',()=>$('dd').classList.remove('on'));
document.querySelectorAll('#dd a').forEach(a=>a.onclick=()=>act(a.dataset.m));
$('logo').onclick=()=>show('home');$('hNew').onclick=()=>act('new');$('hImg').onclick=()=>act('newimg');$('hDemo').onclick=()=>act('demo');$('hDemo2').onclick=()=>demo2();$('hSite').onclick=()=>pickImg('site');$('hMulti').onclick=()=>{$('imgs').value='';$('imgs').click();};$('eRect').onclick=()=>houseDlg();$('eImg').onclick=()=>pickImg('ask');$('e3go').onclick=()=>show('ed');$('plotb').onclick=()=>plotDlg();$('pname').onclick=rename;
function home(){const L=idx();$('pcount').textContent=L.length?L.length+(L.length===1?' projekt':L.length<5?' projekty':' projektov'):'';$('plist').innerHTML=L.length?'':'<div class="none">Zatiaľ žiadne projekty. Začnite jednou z možností vyššie.</div>';L.forEach(p=>{const d=document.createElement('div');d.className='pc';d.innerHTML='<div class="th">'+(p.th||'<span style="color:#bbb">'+I.layers+'</span>')+'</div><div class="mt"><b>'+esc(p.name)+'</b><small>'+new Date(p.date).toLocaleDateString('sk-SK',{day:'numeric',month:'short'})+(p.nl>1?' · '+p.nl+' podlažia':'')+'</small></div><div class="ac"><button class="rn" title="Premenovať">'+I.wall+'</button><button class="x" title="Zmazať">'+I.del+'</button></div>';
 d.onclick=()=>openP(p.id);d.querySelector('.rn').onclick=async e=>{e.stopPropagation();const n=await askName(p.name,'Premenovať projekt','Uložiť');if(!n)return;const P=JSON.parse(localStorage.getItem('vks_p_'+p.id));P.name=n;localStorage.setItem('vks_p_'+p.id,JSON.stringify(P));localStorage.setItem(IDX,JSON.stringify(idx().map(x=>x.id===p.id?{...x,name:n}:x)));if(p.id===PID)H.name=n;home();};d.querySelector('.x').onclick=async e=>{e.stopPropagation();if(await dlg('Zmazať projekt „'+esc(p.name)+'“?','<p>Túto akciu nie je možné vrátiť.</p>',[['Nie',null],['Zmazať',1,'dang go']])){localStorage.removeItem('vks_p_'+p.id);localStorage.setItem(IDX,JSON.stringify(idx().filter(x=>x.id!==p.id)));if(p.id===PID)PID=null;home();toast('Projekt zmazaný.','ok');}};$('plist').appendChild(d);});}
async function rename(){if(!H)return;const n=await askName(H.name,'Premenovať projekt','Uložiť');if(n){H.name=n;save();toast('Premenované.','ok',1500);}}
// ---------- plot & wizard ----------
const plotAround=(x0,z0,x1,z1,m=[4,6])=>({pts:[[x0-m[0],z0-m[1]],[x1+m[0],z0-m[1]],[x1+m[0],z1+m[1]],[x0-m[0],z1+m[1]]],fence:1});
const rectWalls=(x,z,w,d,t=.3)=>[[x,z,x+w,z],[x+w,z,x+w,z+d],[x+w,z+d,x,z+d],[x,z+d,x,z]].map((q,i)=>({id:'r'+Date.now()+i,level:lvl||'1NP',start:[q[0],q[1]],end:[q[2],q[3]],thickness:t,base:0,height:2.8,openings:[]}));
const num=(v,d)=>{const x=parseFloat(String(v||'').replace(',','.'));return x>0&&x<500?x:d;};
const fld=(n,l,v)=>'<label>'+l+'<input type="number" inputmode="decimal" step="0.5" name="'+n+'" value="'+v+'"></label>';
async function houseDlg(st,stn){const r=await dlg('Obrys domu','<p>Vonkajšie rozmery domu. Steny potom upravíte, pridáte vnútorné steny, dvere a okná.</p><div class="grid2">'+fld('w','Šírka (m)',12)+fld('d','Hĺbka (m)',9)+'</div>',st?[['Preskočiť','s','skip'],['Vložiť dom',1,'go','check']]:[['Zrušiť',null],['Vložiť dom',1,'go','check']],st?{step:[st,stn]}:{});
 if(!r||r.v==='s')return r;const w=num(r.f.w,12),d=num(r.f.d,9);let x=0,z=0;if(H.plot){const xs=H.plot.pts.map(p=>p[0]),zs=H.plot.pts.map(p=>p[1]);x=r2((Math.min(...xs)+Math.max(...xs)-w)/2);z=r2((Math.min(...zs)+Math.max(...zs)-d)/2);}
 snap();H.walls.push(...rectWalls(x,z,w,d,+$('th').value/100).map(q=>({...q,level:lvl,height:LV().height})));save();fit();toast('Obrys domu '+w+' × '+d+' m vložený.','ok');return r;}
async function plotDlg(st,stn){const p=H.plot,xs=p?p.pts.map(q=>q[0]):[],zs=p?p.pts.map(q=>q[1]):[],cw=p?r2(Math.max(...xs)-Math.min(...xs)):20,cd=p?r2(Math.max(...zs)-Math.min(...zs)):30;
 const r=await dlg('Pozemok','<p>Zadajte rozmery pozemku (obdĺžnik). V 3D sa zobrazí ako trávnik'+(st?'':', dom zostane na mieste')+'.</p><div class="grid2">'+fld('w','Šírka (m)',cw)+fld('d','Hĺbka (m)',cd)+'</div><label class="chk"><input type="checkbox" name="fence"'+(!p||p.fence?' checked':'')+'> Oplotenie po obvode</label>',
  st?[['Preskočiť','s','skip'],['Ďalej',1,'go','next']]:[...(p?[['Odstrániť pozemok','x','dang']]:[]),['Zrušiť',null],['Uložiť',1,'go','check']],st?{step:[st,stn]}:{});
 if(!r||r.v==='s')return r;snap();if(r.v==='x'){H.plot=null;save();fit();toast('Pozemok odstránený.','ok');return r;}
 const w=num(r.f.w,20),d=num(r.f.d,30),ws=H.walls.filter(q=>q.level===H.levels[0].name);let cx0=w/2,cz0=d/2;if(ws.length){const a=ws.flatMap(q=>[q.start[0],q.end[0]]),b=ws.flatMap(q=>[q.start[1],q.end[1]]);cx0=(Math.min(...a)+Math.max(...a))/2;cz0=(Math.min(...b)+Math.max(...b))/2;}else if(p){cx0=(Math.min(...xs)+Math.max(...xs))/2;cz0=(Math.min(...zs)+Math.max(...zs))/2;}
 const x0=r2(cx0-w/2),z0=r2(cz0-d/2);H.plot={pts:[[x0,z0],[x0+w,z0],[x0+w,z0+d],[x0,z0+d]],fence:r.f.fence?1:0};save();fit();toast('Pozemok '+w+' × '+d+' m'+(H.plot.fence?' s plotom':'')+'.','ok');return r;}
async function wizNew(){const n=await dlg('Ako sa bude projekt volať?','<input type="text" value="Nový dom" placeholder="napr. Rodinný dom Kováč">',[['Zrušiť',null],['Vytvoriť',1,'go','next']],{step:[0,3]});if(!n)return;
 newP(n.name||'Nový dom');let r=await plotDlg(1,3);if(!r)return;r=await houseDlg(2,3);if(r&&r.v==='s'&&!H.walls.length)toast('Ťahaním po ploche nakreslite prvú stenu.','info');}
$('imgs').onchange=async e=>{const fs=[...e.target.files].sort((a,b)=>a.name.localeCompare(b.name,'sk',{numeric:true}));if(!fs.length)return;const n=await askName(fs[0].name.replace(/[-_ ]*\d*\.[^.]+$/,'')||'Nový dom');if(!n)return;
 const srcs=[];for(let i=0;i<fs.length;i++){busy('Načítavam obrázok '+(i+1)+' / '+fs.length+'…');const s=await readImg(fs[i]);if(s)srcs.push(s);}busy(0);if(!srcs.length)return;
 newP(n,[],null);H.levels=srcs.map((_,i)=>({name:(i+1)+'NP',elevation:Math.round(i*3.05*100)/100,height:2.8}));
 for(let i=0;i<srcs.length;i++){lvl=H.levels[i].name;H.underlay={src:srcs[i],w:20};H.ulv=lvl;setBg();await new Promise(r=>bg.complete&&bg.width?r():bg.onload=r);fit();await recog(1,true);if(i<srcs.length-1){LV().ul=H.underlay;H.underlay=null;}}
 for(let i=0;i<H.levels.length-1;i++){const ws=H.walls.filter(w=>w.level===H.levels[i].name);if(ws.length){const xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]);(H.stairs=H.stairs||[]).push({level:H.levels[i].name,pos:[r2(Math.min(...xs)+.6),r2(Math.min(...zs)+.6)],dir:0,width:1,length:3.6});}}
 goLvl(H.levels[0].name);lvUI();save();toast(srcs.length+' podlažia, '+H.walls.length+' stien. Prepínajte podlažia vľavo hore.','ok',5000);};
$('ld').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t);if(!j.walls)throw 0;j.name=j.name||f.name.replace(/\.json$/,'');openP('p'+Date.now(),j);}catch(_){toast('Neplatný súbor projektu.','err');}});};
addEventListener('resize',()=>{if(H&&$('ed').classList.contains('on'))fit();});
// ---------- 3D (lazy) ----------
let V=null,roof='flat';const v3=async()=>{if(!V){$('sk3').hidden=false;V=await import('./v3.js?v=20261111zk');window.__vk={get m(){return V;},playCam:(k,s,e)=>V.playCam(k,s,e),scrub:(u)=>V.scrubCam&&V.scrubCam(u),count:()=>V.countFurn&&V.countFurn(),snap:()=>V.snapBuild&&V.snapBuild(),debug:()=>V.debugViz&&V.debugViz(),doll:on=>V.dollhouse(on),walk:v=>V.setWalk(v),jump:(x,z)=>V.jump&&V.jump(x,z,1.55),stop:()=>V.stopCam&&V.stopCam(),clearance:()=>V.checkClearances&&V.checkClearances(),bird:(x,z,h)=>V.birdCam&&V.birdCam(x,z,h),pause:on=>V.pauseCam&&V.pauseCam(on)};}return V;};
function modeUI(md){[['mExt','ext'],['doll','doll'],['walk','walk']].forEach(([id,k])=>{const b=$(id);if(b)b.classList.toggle('on',md===k);});
 $('st').textContent=md==='walk'?(TCH?'Joystick vľavo dole = chôdza, ťahajte prstom = rozhliadanie.':'W A S D / šípky = chôdza, ťahajte myšou = rozhliadanie.'):md==='doll'?(TCH?'Ťahajte = otáčanie, 2 prsty = zoom. Ťuknite na miestnosť hore a vojdete dnu.':'Ťahajte = otáčanie, koliesko = zoom. Kliknite na miestnosť hore a vojdete dnu.'):(TCH?'Ťahajte = otáčanie, 2 prsty = zoom.':'Ťahajte = otáčanie, koliesko = zoom.');}
function wUI(v){jumpsUI(v||DOLL_ON);modeUI(v?'walk':(DOLL_ON?'doll':'ext'));}
let genN=0;async function gen(anim){const n=++genN;$('sk3').hidden=false;$('emp3').hidden=true;try{const m=await v3();if(m.ensureKit)await m.ensureKit();if(n!==genN)return;m.setRoof(roof);if(m.setSun)m.setSun(16.5,false);extSides();rulesFix();try{const rr=rulesCheck();if(rr.length)console.info('[rules]',rr.filter(x=>x.sev==='hard').length,'hard',rr.filter(x=>x.sev==='soft').length,'soft',rr);}catch(e){console.warn('rules',e);}const ok=m.gen(H,anim);m.setMat(H.mat||{});const mt=H.mat||{};$('mwall').value=mt.wall||'#f4f1ec';$('mfloor').value=mt.floor||'dub';$('mfac').value=mt.fac||'#f7f5f0';$('mfasada').value=mt.fasada||'mix';$('mroof').value=mt.roof||'#5c6672';$('msty').value=H.style||'';['mwall','mfloor','mfac','mroof'].forEach(k=>{const e=$(k);if(e.selectedIndex<0&&e.value!==undefined){const v={mwall:mt.wall,mfloor:mt.floor,mfac:mt.fac,mroof:mt.roof}[k]||e.options[0].value;const o=document.createElement('option');o.value=v;o.textContent='vlastná';e.appendChild(o);e.value=v;}});{const A=H.atmo||{};const h=A.h!=null?A.h:14.5;$('mwx').value=A.w||'sun';$('sunh').value=h;hl(h);if(m.setAtmo)m.setAtmo({t:A.t||'day',w:A.w||'sun',h});}$('emp3').hidden=ok;if(ok)wUI(m.isWalk());const vb=$('VRButton');if(vb)vb.style.display=/NOT|ONLY/i.test(vb.textContent)?'none':'';}catch(e){console.warn(e);toast('3D sa nepodarilo načítať. Skontrolujte pripojenie.','err');}finally{if(n===genN)$('sk3').hidden=true;}}
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};
$('snap3').onclick=async()=>{const m=await v3();const u=m.snap&&m.snap();if(u){const b=await(await fetch(u)).blob();dl(b,(H.name||'dom')+'_3d.png');toast('3D snímka uložená (PNG).','ok');}};
$('glb').onclick=async()=>{const m=await v3();try{const b=await m.glb();if(b){dl(b,(H.name||'dom')+'.glb');toast('3D model stiahnutý (GLB).','ok');}}catch(e){toast('Export zlyhal.','err');}};
async function packH(){const j={...H,underlay:undefined,ulv:undefined,levels:H.levels.map(l=>({...l,ul:undefined})),roof};const st=new Blob([JSON.stringify(j)]).stream().pipeThrough(new CompressionStream('gzip'));const b=new Uint8Array(await new Response(st).arrayBuffer());let t='';b.forEach(c=>t+=String.fromCharCode(c));return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function unpackH(t){const b=Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
$('share').onclick=async()=>{const base=location.href.split('#')[0]+'#t='+await packH();let url=base+'&pres';
 const r=await dlg('Zdieľať prehliadku','<p>Odkaz otvorí 3D prehliadku bez editora. Pošlite ho klientovi.</p><label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="pr" checked style="width:auto" onchange="const i=this.closest(\'.dlg\').querySelector(\'input[readonly]\');i.value=this.checked?i.dataset.p:i.dataset.b"> Prezentácia pre klienta (auto-prehliadka, kontakt makléra)</label><input type="text" readonly data-b="'+esc(base)+'" data-p="'+esc(url)+'" value="'+esc(url)+'">',[['Zavrieť',null],['Stiahnuť ako súbor','f'],['Kopírovať odkaz','c','go']]);if(r&&r.f&&!r.f.pr)url=base;
 if(r&&r.v==='c'){try{await navigator.clipboard.writeText(url);toast('Odkaz skopírovaný.','ok');}catch(e){toast('Kopírovanie zlyhalo – označte odkaz ručne.','warn');}}
 if(r&&r.v==='f')dl(new Blob(['<!doctype html><meta charset="utf-8"><title>'+esc(H.name)+' – prehliadka</title><meta http-equiv="refresh" content="0;url='+esc(url)+'"><a href="'+esc(url)+'">Otvoriť prehliadku</a>'],{type:'text/html'}),(H.name||'dom')+' - prehliadka.html');};
$('roof').onchange=async e=>{const v=e.target.value,prev=roof;roof=v;if(H)H.roof=roof;if((v==='none')!==(prev==='none')&&prev&&v){const m=await v3();if(m.setRoof){m.setRoof(v,true);if(v!=='none')gen(false);else return;}}gen(false);};
function show(s,nopush){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.s===s));document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('on',x.id===s));
 $('tbed').classList.toggle('on',s==='ed');if(s==='home'){home();}$('tbvw').classList.toggle('on',s==='vw');document.querySelector('.seg').style.visibility=s==='home'?'hidden':'';$('pname').style.display=s==='home'?'none':'';const vb=$('VRButton');if(vb)vb.style.display=s==='vw'&&!/NOT|ONLY/i.test(vb.textContent)?'':'none';if(s==='vw'){if(!window.__mktBusy)gen(true);if(!localStorage.vkTut3&&!window.__mktBusy)tutWait(0,TUT3,'vkTut3');}else if(s==='ed'){requestAnimationFrame(fit);if(!localStorage.vkTut)tutWait();}
 if(H&&s!=='home')$('pname').textContent=H.name;
 if(s!=='vw')$('jumps').hidden=true;
 if(!nopush&&!TH){const h=s==='home'?'':'#p='+PID+(s==='vw'?'&v=3d':'');if(location.hash!==h)history.pushState(null,'',h||location.pathname);}}
function route(){const m=location.hash.match(/^#p=([^&]+)(&v=3d)?/);if(m&&localStorage.getItem('vks_p_'+m[1])){try{if(PID!==m[1]||!H){PID=m[1];H=JSON.parse(localStorage.getItem('vks_p_'+m[1]));if(!H.levels)H.levels=JSON.parse(JSON.stringify(DEMO.levels));lvl=H.levels[0].name;if(staleDemo())location.hash='#p='+PID+(m[2]||'');syncUl();lvUI();undo=[];setBg();banner();}show(m[2]?'vw':'ed',true);return;}catch(e){}}
 show('home',true);}
addEventListener('popstate',()=>{if($('ov').classList.contains('on'))$('ov').onclick({target:$('ov')});route();});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.s));$('gen').onclick=()=>show('vw');
$('walk').onclick=async()=>{stopTour();const m=await v3();if(m.isWalk())return;if(DOLL_ON){DOLL_ON=false;m.dollhouse&&m.dollhouse(false);}m.setWalk(true);wUI(true);};
$('mExt').onclick=async()=>{stopTour();const m=await v3();if(m.isWalk())m.setWalk(false);if(DOLL_ON||(m.isDoll&&m.isDoll())){DOLL_ON=false;m.dollhouse&&m.dollhouse(false);}wUI(false);};
$('mVR').onclick=()=>{const vb=$('VRButton');if(vb&&!/NOT|ONLY|INSECURE|ALLOWED/i.test(vb.textContent)){vb.click();}else toast('VR funguje v okuliaroch, napr. Meta Quest. Otvorte tento odkaz v prehliadači okuliarov a ťuknite na VR.');};
const TH=location.hash.match(/^#t=([^&]+)(&pres)?/);
if(TH){unpackH(TH[1]).then(j=>{H=j;PID=null;lvl=H.levels[0].name;if(j.roof){roof=j.roof;$('roof').value=roof;}document.body.classList.add('viewonly');show('vw',true);if(TH[2])presOn(true);window.__ok=true;}).catch(()=>{toast('Odkaz na prehliadku je poškodený.','err',6000);history.replaceState(null,'',location.pathname);load();window.__ok=true;});}
else{load();window.__ok=true;}
window.__dbg={get H(){return H},toS:p=>toS(p),get lvl(){return lvl},get undo(){return undo.length}};

{const h=document.getElementById('hint');let t;if(h&&matchMedia('(max-width:760px)').matches)new MutationObserver(()=>{h.style.opacity=1;clearTimeout(t);t=setTimeout(()=>h.style.opacity=0,5000);}).observe(h,{childList:true,characterData:true,subtree:true});}

{const d=document.documentElement;if(!navigator.xr)d.classList.add('novr');else navigator.xr.isSessionSupported('immersive-vr').then(o=>{if(!o)d.classList.add('novr')},()=>d.classList.add('novr'));}

cv.addEventListener('dblclick',async e=>{if(tool!=='move')return;const h=hitWall(toW(e));if(!h)return;const g=geo(h.w),r=await dlg('Dĺžka steny','<label>Dĺžka (m)<input type="number" name="L" step="0.01" value="'+g.L.toFixed(2)+'"></label>',[['Zrušiť',0],['Uložiť',1,'go','check']]);
 const L=r&&r.v?parseFloat(String(r.f.L).replace(',','.')):0;if(!(L>.1))return;snap();const o=[...h.w.end];h.w.end=[+(g.x0+g.u[0]*L).toFixed(3),+(g.z0+g.u[1]*L).toFixed(3)];WL().forEach(w=>{if(w===h.w)return;['start','end'].forEach(k=>{if(Math.hypot(w[k][0]-o[0],w[k][1]-o[1])<.02)w[k]=[...h.w.end];});});save();draw();toast('Dĺžka steny: '+L.toFixed(2)+' m','ok');});
function exportPng(){fit();draw();const d=devicePixelRatio,pad=70*d,o=document.createElement('canvas');o.width=cv.width;o.height=cv.height+pad;const c=o.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,o.width,o.height);c.drawImage(cv,0,pad);
 c.fillStyle='#0B0B0B';c.font=`800 ${22*d}px Archivo,Inter,sans-serif`;c.textAlign='left';c.fillText((H.name||'Pôdorys')+' — '+lvl,20*d,32*d);c.font=`500 ${13*d}px Inter,sans-serif`;c.fillStyle='#6B6B6B';c.fillText(($('area').textContent||'')+'  ·  Vkroč Štúdio',20*d,54*d);c.fillStyle='#E2552D';c.fillRect(0,pad-3*d,o.width,3*d);
 o.toBlob(b=>{dl(b,(H.name||'podorys')+'_'+lvl+'.png');toast('Pôdorys exportovaný (PNG).','ok');});}
window.__exportPng=()=>exportHi('png');
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||$('ov').classList.contains('on')||!$('ed').classList.contains('on'))return;
 const m={w:'wall',m:'move',d:'door',o:'window',s:'stair',x:'del',Delete:'del',r:'meas',n:'furn'}[e.key];if(m){setTool(m);return;}
 if(e.key==='f'){fit();draw();}else if(e.key==='3')$('gen').click();else if(e.key==='?')toast('Skratky: W stena · M posun · R meranie · N nábytok · D dvere · O okno · S schody · X mazať · F prispôsobiť · 3 = 3D · Ctrl+Z späť','info',6000);});

async function furnPick(p){const r=await dlg('Vložiť nábytok','<p>Vyberte kus nábytku. Presúvate ho nástrojom Posun, otáčate ťuknutím.</p>',Object.entries(FUR).map(([k,v])=>[v[0],k,'']));if(!r||!r.v)return;snap();(H.furn=H.furn||[]).push({t:r.v,p:[r2(p[0]),r2(p[1])],r:0,level:lvl});save();draw();}
const OPK={door:{single:['Jednokrídlové',.9,2.05,0],double:['Dvojkrídlové',1.4,2.05,0],sliding:['Posuvné',1,2.05,0],entrance:['Vchodové',1,2.1,0]},window:{standard:['Štandardné',1.2,1.4,.9],french:['Francúzske (po zem)',1,2.2,0],small:['Malé (kúpeľňa)',.6,.6,1.5],band:['Pásové',2.4,.9,1.2]}};
async function opDlg(op){const o=op.o,T=OPK[o.type],kd=o.kind||(o.type==='door'?'single':'standard'),c=v=>Math.round(v*100);
 const body='<label>Typ<select name="k">'+Object.entries(T).map(([k,v])=>'<option value="'+k+'"'+(k===kd?' selected':'')+'>'+v[0]+'</option>').join('')+'</select></label><div style="display:flex;gap:8px"><label>Šírka (cm)<input type="number" name="w" value="'+c(o.width)+'"></label><label>Výška (cm)<input type="number" name="h" value="'+c(o.height)+'"></label></div>'+
 (o.type==='window'?'<label>Parapet (cm)<input type="number" name="s" value="'+c(o.sill||0)+'"></label>':'<div style="display:flex;gap:8px"><label>Pánty<select name="g"><option value="L">vľavo</option><option value="R"'+(o.hinge==='R'?' selected':'')+'>vpravo</option></select></label><label>Otváranie<select name="o"><option value="0">dnu</option><option value="1"'+(o.out?' selected':'')+'>von</option></select></label></div>');
 const r=await dlg(o.type==='door'?'Dvere':'Okno',body,[['Odstrániť','del','dang'],['Zrušiť',0],['Uložiť',1,'go','check']]);if(!r||!r.v)return;snap();
 if(r.v==='del'){op.w.openings.splice(op.w.openings.indexOf(o),1);save();draw();return;}
 const f=r.f,nk=f.k||kd;let w=+f.w/100,h=+f.h/100,s=f.s!=null?+f.s/100:o.sill;if(nk!==kd&&Math.abs(w-o.width)<.005&&Math.abs(h-o.height)<.005){w=T[nk][1];h=T[nk][2];s=T[nk][3];}
 const L=geo(op.w).L;w=Math.max(.3,Math.min(L-.1,w||o.width));Object.assign(o,{kind:nk,width:w,height:Math.max(.3,h||o.height),sill:o.type==='window'?Math.max(0,s||0):0});if(o.type==='door'){o.hinge=f.g||'L';o.out=f.o==='1';}o.offset=Math.max(.05,Math.min(L-w-.05,o.offset));save();draw();toast((o.type==='door'?'Dvere':'Okno')+': '+T[nk][0]+', '+c(w)+' × '+c(o.height)+' cm','ok');}
cv.addEventListener('click',e=>{if(tool!=='move')return;const d=devicePixelRatio,r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*d,y=(e.clientY-r.top)*d;const rm=rooms().find(q=>q.sp&&Math.abs(q.sp[0]-x)<60*d&&Math.abs(q.sp[1]-y)<20*d);if(rm)nameDlg(rm);});
// every sample of the footprint must lie in this room's cells (not in a wall, not in another room, not outside)
function fitsRoom(id,x,z,w,d){const R=RC[lvl];if(!R||!R.g)return false;const nx=Math.max(2,Math.ceil(w/.15)),nz=Math.max(2,Math.ceil(d/.15));for(let i=0;i<=nx;i++)for(let k=0;k<=nz;k++){const px=x-w/2+.03+(w-.06)*i/nx,pz=z-d/2+.03+(d-.06)*k/nz;if(roomAt(R,[px,pz])!==id)return false;}return true;}
// prem8: every room furnished by its type like a lived-in home; items stand against walls, keep door swings and walking
// clearance free, never leave the room's cells (fitsRoom) and never overlap each other
const FDM8={sofa:[2.4,1],table:[1.8,1],ctable:[1.1,.7],kitch:[2.8,.62],fridge:[.65,.7],rug:[2.4,1.7],runner:[2.4,.7],nstand:[.45,.4],dresser:[1.2,.5],sideb:[1.6,.45],side:[.45,.45],mirror:[.7,.04],towel:[.55,.12],coat:[.5,.5],toy:[.55,.4],stool:[.38,.38]};
const fdm8=t=>FDM8[t]||(FUR[t]?[FUR[t][1],FUR[t][2]]:[.5,.5]);
const FRONT={sofa:.8,bed:.6,bed1:.5,bunk:.5,ward:.7,kitch:.9,fridge:.7,desk:.6,tv:.9,bath:.6,shower:.6,sink:.55,wc:.5,shoe:.5,coat:.5,bench:.5,dresser:.6,sideb:.6,shelf:.5};
const SOFT=new Set(['rug','runner']),LOW=new Set(['ctable','chair','nstand','stool','side','lamp','plant']);
const PLANS={
 'Obývačka':['sofa','tv','armch','ctable','sideb','shelf','plant','lamp','rug'],
 'Obývačka s kuchyňou':['kitch','fridge','sofa','tv','table','chair4','ctable','plant','lamp','rug'],
 'Kuchyňa':['kitch','fridge','table','chair4','shelf','plant'],
 'Jedáleň':['table','chair4','sideb','plant','lamp'],
 'Spálňa':['bed','nstand2','ward','dresser','plant','lamp','rug'],
 'Detská izba':['bed1','desk','chair','ward','toy','shelf','rug'],
 'Izba':['bed1','ward','desk','chair','plant','rug'],
 'Pracovňa':['desk','chair','shelf','shelf','armch','plant'],
 'Kúpeľňa':['bath|shower','sink','wc?','towel','plant'],
 'WC':['wc','sink','towel'],
 'Chodba':['shoe','coat','bench','mirror','plant','runner'],
 'Predsieň':['shoe','coat','bench','mirror','plant','runner'],
 'Šatník':['ward','ward','shelf','mirror'],'Špajza':['shelf','shelf','shelf'],'Komora':['shelf','shelf'],'Technická miestnosť':['shelf','shelf'],'Garáž':['shelf','shelf'],'Terasa':['otable','lounge','plant']};
// prem8: rule-based furnishing (layout.js). Every room gets the best valid template for its type; hard rules (door swing +
// clear zones, 80 cm walkways, clearances, windows, bed heads, wall/overlap) are never broken - optional items are dropped instead.
const ldim=t=>DIM3[t]||(FURX[t]?[FURX[t][1],FURX[t][2]]:[.5,.5]);
function layoutOps(R,L){const out=[];H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),nW=[-G.u[1],G.u[0]],t=w.thickness;(w.openings||[]).forEach(o=>{const e=t/2+.25,sd=o.out?-1:1,seen=new Set();/* prem8 v: sample along the opening, a window straddling a partition junction belongs to both rooms */
 for(const s of o.type==='window'?[o.offset+o.width/2,o.offset+Math.min(.2,o.width/4),o.offset+o.width-Math.min(.2,o.width/4)]:[o.offset+o.width/2]){const c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];
 const a=roomAt(R,[c[0]+nW[0]*e,c[1]+nW[1]*e]),b=roomAt(R,[c[0]-nW[0]*e,c[1]-nW[1]*e]);
 for(const[id,sg]of[[a,1],[b,-1]])if(id>1&&!seen.has(id)&&seen.add(id))/* side samples only guard wall decor (window_x), they never restrict furniture */out.push({room:id,type:s===o.offset+o.width/2?o.type:'window_x',p0:[G.x0,G.z0],u:G.u,n:[nW[0]*sg,nW[1]*sg],s0:o.offset,s1:o.offset+o.width,t,sill:o.sill||0,swingIn:o.type==='door'&&(o.kind||'single')!=='sliding'&&sd===sg});}});});return out;}
const layoutWalls=L=>H.walls.filter(w=>w.level===L).map(w=>{const g=geo(w);return{p0:[g.x0,g.z0],u:g.u,L:g.L,t:w.thickness};});
function roomType(r,T,R,L){return(r.auto?(T[r.id]||'Izba'):((H.rn||[]).find(e=>e.level===L&&roomAt(R,e.p)===r.id)||{}).n||T[r.id]||'Izba');}
function validateAll(L=lvl){const RS=rooms(L),R=RC[L];if(!R||!R.g)return[];const TT=assignTypes(R,L);const ids0=new Set(RS.map(q=>q.id));const OPS=layoutOps(R,L),WS=layoutWalls(L),out=[];
 RS.forEach(r=>{const G=makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim);validateRoom(G,(H.furn||[]).filter(f=>f.level===L&&(f.rid&&ids0.has(f.rid)?f.rid:roomAt(R,f.p))===r.id),roomType(r,TT,R,L)).forEach(v=>out.push({room:r.n,...v}));});
 (H.furn||[]).filter(f=>f.level===L&&!RS.some(r=>r.id===roomAt(R,f.p))&&roomAt(R,f.p)===-1&&!['art','curtain','pendant','mirror','towel'].includes(f.t)).forEach(f=>out.push({room:'-',t:f.t,p:f.p,rule:'in-wall'}));
 // door sanity: one door per room unless it is a hall / living area; never two leaves in (almost) the same opening
 const D=roomDoors(R,L);RS.forEach(r=>{if(!D.some(d=>d.a===r.id||d.b===r.id))out.push({room:r.n,t:'door',rule:'room-without-door'});});
 H.walls.filter(w=>w.level===L).forEach(w=>(w.openings||[]).forEach(o=>{if(o.type==='door'&&o.kind==='double')out.push({room:'-',t:'door',rule:'two-leaves-in-one-opening'});}));
 for(let i=0;i<D.length;i++)for(let j=i+1;j<D.length;j++)if(Math.abs(D[i].u[0]*D[j].u[0]+D[i].u[1]*D[j].u[1])>.95&&Math.hypot(D[i].c[0]-D[j].c[0],D[i].c[1]-D[j].c[1])<Math.max(.35,.6*Math.min(D[i].w,D[j].w)))out.push({room:'-',t:'door',p:D[i].c,rule:'two-leaves-in-one-opening'});
 doorViol().forEach(v=>out.push(v));window.__viol=out;return out;}
window.__validate=validateAll;window.__roomCenters=()=>rooms().map(r=>({n:r.n,a:r.a,c:[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2],bb:r.bb}));
// a room the plan gives no access gets exactly one door, on the wall it shares with a hall / living / other room (logged)
function addMissingDoors(R,L,RS,T,log){const D=roomDoors(R,L);const PR=t=>/^(Predsieň|Chodba|Hala|Zádverie)/.test(t||'')?3:/^Obývačka|^Jedáleň|^Kuchyňa/.test(t||'')?2:1;
 RS.forEach(r=>{if(D.some(d=>d.a===r.id||d.b===r.id))return;let best=null;
  H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=w.thickness/2+.25,st=.05;let run=null;const ops=(w.openings||[]);
   const flush=()=>{if(run&&run.s1-run.s0>=1.0){const nb=RS.find(q=>q.id===run.nb);const sc=PR(T[run.nb])*10+Math.min(run.s1-run.s0,3);if(!best||sc>best.sc)best={sc,w,s:(run.s0+run.s1)/2,nb:nb&&nb.n};}run=null;};
   for(let s=.1;s<=G.L-.1;s+=st){const c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);
    const nb=a===r.id&&b>1?b:b===r.id&&a>1?a:0;const busy=ops.some(o=>s>o.offset-.15&&s<o.offset+o.width+.15);
    if(nb&&!busy&&(!run||run.nb===nb)){if(!run)run={s0:s,s1:s,nb};else run.s1=s;}else{flush();if(nb&&!busy)run={s0:s,s1:s,nb};}}flush();});
  if(best){const wd=.8;(best.w.openings=best.w.openings||[]).push({type:'door',kind:'single',offset:+(best.s-wd/2).toFixed(3),width:wd,height:2.05,sill:0,hinge:'R'});log.push({fix:'door-added',room:r.n,to:best.nb});}});}
// small bathroom / WC: the leaf must not swing into the room (it would block the fixtures) -> swing out, or sliding if outside is a tight hall
function wetDoors(R,L,RS,T,log){const wet=new Set(RS.filter(r=>(/^(Kúpeľňa|WC)/.test(T[r.id]||'')&&r.a<6)||(/^(Komora|Špajza|Šatník|Technická|Predsieň|Zádverie)/.test(T[r.id]||'')&&r.a<3.5)).map(r=>r.id));if(!wet.size)return;
 H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=w.thickness/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door'||o.kind==='sliding'||o.kind==='entrance'||o.kind==='terrace')return;
  const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s],a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);
  const inA=wet.has(a),inB=wet.has(b);if(!inA&&!inB||inA&&inB){if(inA&&inB&&o.kind!=='sliding'){o.kind='sliding';log.push({fix:'wet-door-sliding'});}return;}
  // swing side: room a when !o.out (see layoutOps)
  const want=inA?1:0;const other=inA?b:a,oth=RS.find(r=>r.id===other);if(oth&&oth.a<3.5){o.kind='sliding';log.push({fix:'wet-door-sliding',room:T[inA?a:b]});return;}
  if((o.out?1:0)!==want){o.out=want;log.push({fix:'wet-door-swing-out',room:T[inA?a:b]});}});});}
// furniture drawn as closed boxes with a caption ("Bunk bed", "Wall locker") is read as walls. A caption that is not a room
// name, inside a furniture-sized cell (≤ ~2.5×1 m, ≤ 4.2 m²) -> cut that box's sides out of the thin interior walls they lie on
// (outline walls and thick walls are never touched; gaps in box lines are often misread as doors, so doors do not veto). Logged in H.boxFix.
// prem8 w: false interior walls. (1) lines hugging the outline (doubled outer-wall faces, furniture backs within 45 cm of the facade) fold into the outer wall;
// (2) small doorless pockets (< 2.5 m², narrow side < 80 cm) are furniture outlines: their thin non-outline sides are removed.
// prem8 x: thin interior lines with no wall ink under them (chains of furniture edges bridged across empty floor) or drawn much thinner than the
// outer walls without a parallel twin line (single furniture edge) are not walls. Reference = the outline walls' own ink on the same drawing.
function inkFilter(R,L){try{const cv0=R&&R.canvas;if(!cv0||!R.w)return;const Wp=cv0.width,Hp=cv0.height,k=Wp/R.w;if(k<25)return;const d=cv0.getContext('2d').getImageData(0,0,Wp,Hp).data;
 let TH=128;{const h=new Float64Array(256);let N=0;for(let i=0;i<d.length;i+=4*7){h[Math.round(.3*d[i]+.59*d[i+1]+.11*d[i+2])]++;N++;}let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];let sB=0,wB=0,best=-1;for(let t=0;t<256;t++){wB+=h[t];if(!wB)continue;const wF=N-wB;if(!wF)break;sB+=t*h[t];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;TH=t;}}}
 const lum=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=Wp||y>=Hp)return 255;const i=(y*Wp+x)*4;return .3*d[i]+.59*d[i+1]+.11*d[i+2];};
 const ax=q=>Math.abs(q.start[1]-q.end[1])<.01?'h':Math.abs(q.start[0]-q.end[0])<.01?'v':null;
 const A=H.walls.filter(q=>q.level===L&&q.auto);if(A.length<4)return;const X=A.flatMap(q=>[q.start[0],q.end[0]]),Z=A.flatMap(q=>[q.start[1],q.end[1]]),ob=[Math.min(...X),Math.min(...Z),Math.max(...X),Math.max(...Z)];
 const onOut=q=>{const o=ax(q);if(!o)return false;const c=o==='h'?q.start[1]:q.start[0];return o==='h'?(Math.abs(c-ob[1])<.3||Math.abs(c-ob[3])<.3):(Math.abs(c-ob[0])<.3||Math.abs(c-ob[2])<.3);};
 const prof=q=>{const o=ax(q),hz=o==='h',c=hz?q.start[1]:q.start[0],r=hz?[Math.min(q.start[0],q.end[0]),Math.max(q.start[0],q.end[0])]:[Math.min(q.start[1],q.end[1]),Math.max(q.start[1],q.end[1])];const len=r[1]-r[0];
  const out=[];const N=Math.max(5,Math.min(15,Math.round(len/.3)));for(let i=0;i<N;i++){const s=r[0]+.15+(len-.3)*(i+.5)/N;if(len<.5)break;const runs=[];let st=null;const R2=Math.round(.35*k);
   for(let j=-R2;j<=R2;j++){const v=c*k+j;const dk=(hz?lum(s*k,v):lum(v,s*k))<TH;if(dk&&st===null)st=j;if(!dk&&st!==null){runs.push([st,j-1]);st=null;}}if(st!==null)runs.push([st,R2]);
   const t=Math.max(2,Math.round(.06*k)+1),cen=runs.filter(u=>u[0]<=t&&u[1]>=-t);out.push({w:cen.reduce((m,u)=>Math.max(m,u[1]-u[0]+1),0),twin:runs.length-cen.length>0&&runs.some(u=>!(u[0]<=t&&u[1]>=-t)&&Math.abs((u[0]+u[1])/2)<=.3*k)});}
  return out;};
 const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b[b.length>>1]:0;};
 const OW=[];A.filter(onOut).forEach(q=>prof(q).forEach(p=>OW.push(p.w)));const Wo=med(OW);if(Wo<2||OW.filter(v=>v>0).length<.7*OW.length)return;{let wh=0,N=0;for(let i=0;i<d.length;i+=4*11){N++;if(.3*d[i]+.59*d[i+1]+.11*d[i+2]>235)wh++;}if(wh<.8*N)return;}/* clean line drawings only: photos/scans misalign ink */
 let n=0;const log=[];for(const q of A){if(onOut(q)||q.thickness>.16||!ax(q))continue;const P=prof(q);if(P.length<4)continue;const has=P.filter(p=>p.w>0).length/P.length,wc=med(P.filter(p=>p.w>0).map(p=>p.w)),tw=P.filter(p=>p.twin).length/P.length;
  if(has<=.25&&tw<.15){const keep=H.walls,n0=rooms(L).length;H.walls=H.walls.filter(o=>o!==q);if(rooms(L).length<n0){H.walls=keep;continue;}/* it bounded a room: keep */n++;log.push([ax(q),+(ax(q)==='h'?q.start[1]:q.start[0]).toFixed(2),+has.toFixed(2),wc,+tw.toFixed(2)]);}}
 if(n)H.inkFix={n,Wo,TH,log};}catch(e){console.warn('inkFilter',e);}}
function cleanOutline(L){const ax=q=>Math.abs(q.start[1]-q.end[1])<.01?'h':Math.abs(q.start[0]-q.end[0])<.01?'v':null;let drop=0,thick=0,pk=0;
 const all=()=>H.walls.filter(q=>q.level===L&&q.auto);const A=all();if(A.length<4)return;const X=A.flatMap(q=>[q.start[0],q.end[0]]),Z=A.flatMap(q=>[q.start[1],q.end[1]]),ob=[Math.min(...X),Math.min(...Z),Math.max(...X),Math.max(...Z)];
 const rng=(q,h)=>h?[Math.min(q.start[0],q.end[0]),Math.max(q.start[0],q.end[0])]:[Math.min(q.start[1],q.end[1]),Math.max(q.start[1],q.end[1])];
 for(const[h,edge,sg]of[[1,ob[1],1],[1,ob[3],-1],[0,ob[0],1],[0,ob[2],-1]]){const side=h?ob[2]-ob[0]:ob[3]-ob[1];
  const B=A.filter(q=>ax(q)===(h?'h':'v')&&H.walls.includes(q)&&Math.abs((h?q.start[1]:q.start[0])-edge)<=.45);if(B.length<2)continue;
  B.sort((a,b)=>Math.abs((h?a.start[1]:a.start[0])-edge)-Math.abs((h?b.start[1]:b.start[0])-edge));const O=B[0],ro=rng(O,h);if(ro[1]-ro[0]<.5*side)continue;
  let inner=null;for(const q of B.slice(1)){const r=rng(q,h),ov=Math.min(r[1],ro[1])-Math.max(r[0],ro[0]);if(ov<.8*(r[1]-r[0]))continue;
   if(q.thickness>.14&&(q.openings||[]).length)continue;H.walls=H.walls.filter(o=>o!==q);drop++;if(r[1]-r[0]>=.6*side){const c=h?q.start[1]:q.start[0];if(!inner||Math.abs(c-edge)>Math.abs(inner.c-edge))inner={c,t:q.thickness};}}
  if(inner){const co=h?O.start[1]:O.start[0],a=co-sg*O.thickness/2,b=inner.c+sg*inner.t/2,t=Math.abs(b-a);if(t<=.5){const m=+((a+b)/2).toFixed(3);O.thickness=+t.toFixed(3);if(h){O.start=[O.start[0],m];O.end=[O.end[0],m];}else{O.start=[m,O.start[1]];O.end=[m,O.end[1]];}thick++;}}}
 for(let pass=0;pass<6;pass++){rooms(L);const R=RC[L];if(!R||!R.g)break;const{g,W,Hh,x0,z0,c}=R;const D=roomDoors(R,L);const S=new Map();
  for(let i=0;i<g.length;i++){const v=g[i];if(v<=1)continue;let s=S.get(v);if(!s){s={k:0,b:[1e9,1e9,-1e9,-1e9]};S.set(v,s);}s.k++;const x=i%W,z=(i/W)|0;if(x<s.b[0])s.b[0]=x;if(z<s.b[1])s.b[1]=z;if(x>s.b[2])s.b[2]=x;if(z>s.b[3])s.b[3]=z;}
  let did=0;for(const[id,s]of S){const a=s.k*c*c;if(a>2.5||a<.15)continue;if(!s.b[0]||!s.b[1]||s.b[2]>=W-1||s.b[3]>=Hh-1)continue;const b=[x0+(s.b[0]-1)*c,z0+(s.b[1]-1)*c,x0+(s.b[2]+1)*c,z0+(s.b[3]+1)*c],bw=b[2]-b[0],bh=b[3]-b[1];
   if(Math.min(bw,bh)>.8||a<.7*bw*bh||Math.max(bw,bh)>3.5*Math.min(bw,bh))continue;/* long thin strips are wall cavities, not furniture */if(D.some(d=>d.a===id||d.b===id))continue;
   const nw=[];let hit=0;for(const q of H.walls){const o=ax(q);if(q.level!==L||!q.auto||q.thickness>.14||!o||(q.openings||[]).length){nw.push(q);continue;}const hz=o==='h',cc=hz?q.start[1]:q.start[0];
    const onOut=hz?(Math.abs(cc-ob[1])<.3||Math.abs(cc-ob[3])<.3):(Math.abs(cc-ob[0])<.3||Math.abs(cc-ob[2])<.3);const sides=hz?[b[1],b[3]]:[b[0],b[2]],span=hz?[b[0],b[2]]:[b[1],b[3]];
    if(onOut||!sides.some(v=>Math.abs(cc-v)<.15)){nw.push(q);continue;}const r=rng(q,hz);const c0=Math.max(r[0],span[0]-.1),c1=Math.min(r[1],span[1]+.1);if(c1-c0<.2){nw.push(q);continue;}
    hit++;const pt=v=>hz?[v,cc]:[cc,v];const fw=(hz?q.end[0]-q.start[0]:q.end[1]-q.start[1])>=0;for(const[p0,p1]of[[r[0],c0],[c1,r[1]]])if(p1-p0>=.3)nw.push({...q,id:q.id+'k'+Math.round(p0*100),start:pt(fw?p0:p1),end:pt(fw?p1:p0),openings:[]});}
   if(hit){H.walls=nw;pk++;did=1;(cleanOutline.pb=cleanOutline.pb||[]).push(b.map(v=>+v.toFixed(2)));break;}}
  if(!did)break;}
 if(drop||thick||pk)H.olFix={drop,thick,pockets:pk,pb:cleanOutline.pb};cleanOutline.pb=[];}
function dropFurnBoxes(words,L){let n=0,cut=0;dropFurnBoxes.ws=[];const seen=new Set();
 const all=H.walls.filter(q=>q.level===L);if(!all.length)return;const X=all.flatMap(q=>[q.start[0],q.end[0]]),Z=all.flatMap(q=>[q.start[1],q.end[1]]),ob=[Math.min(...X),Math.min(...Z),Math.max(...X),Math.max(...Z)];
 for(let pass=0;pass<8;pass++){rooms(L);const R=RC[L];if(!R||!R.g)return;const{g,W,Hh,x0,z0,c}=R;let did=0;
  const D0=null;for(const w of words){const nl=(w.t.match(/[A-Za-z]/g)||[]).length,lc=(w.t.match(/[a-z]/g)||[]).length;/* furniture captions are mixed case ("Bunk bed"); all-caps words are room labels ("BALCONY") */if(nl<3||nl<.75*w.t.length||lc<.6*nl)continue;const k0=w.t+w.p.join();if(seen.has(k0))continue;
   let id=roomAt(R,w.p);for(const o of[[0,.15],[0,-.15],[.15,0],[-.15,0],[0,.3],[0,-.3]]){if(id>1)break;id=roomAt(R,[w.p[0]+o[0],w.p[1]+o[1]]);}if(id<=1)continue;
   let k=0,b=[1e9,1e9,-1e9,-1e9];for(let i=0;i<g.length;i++)if(g[i]===id){k++;const x=i%W,z=(i/W)|0;if(x<b[0])b[0]=x;if(z<b[1])b[1]=z;if(x>b[2])b[2]=x;if(z>b[3])b[3]=z;}
   if(!k||!b[0]||!b[1]||b[2]>=W-1||b[3]>=Hh-1)continue;const a=k*c*c;b=[x0+(b[0]-1)*c,z0+(b[1]-1)*c,x0+(b[2]+1)*c,z0+(b[3]+1)*c];const bw=b[2]-b[0],bh=b[3]-b[1];
   if(a>4.2||Math.min(bw,bh)>1.45||Math.max(bw,bh)>3.2)continue;
   // a real small room has a door; a door-gap in a furniture box is accepted only for a clear caption (≥4 letters, e.g. "Bunk")
   if(nl<4&&roomDoors(R,L).some(d=>d.a===id||d.b===id))continue;seen.add(k0);
   const nw=[];let hit=0;
   for(const q of H.walls){if(q.level!==L||!q.auto||q.thickness>.14){nw.push(q);continue;}
    const hz=Math.abs(q.start[1]-q.end[1])<.01,vt=Math.abs(q.start[0]-q.end[0])<.01;if(!hz&&!vt){nw.push(q);continue;}
    const cc=hz?q.start[1]:q.start[0];const onOut=hz?(Math.abs(cc-ob[1])<.35||Math.abs(cc-ob[3])<.35):(Math.abs(cc-ob[0])<.35||Math.abs(cc-ob[2])<.35);
    const sides=hz?[b[1],b[3]]:[b[0],b[2]],span=hz?[b[0],b[2]]:[b[1],b[3]];
    if(onOut||!sides.some(s=>Math.abs(cc-s)<.2)){nw.push(q);continue;}
    const s0=hz?q.start[0]:q.start[1],s1=hz?q.end[0]:q.end[1],lo=Math.min(s0,s1),hi=Math.max(s0,s1),c0=Math.max(lo,span[0]-.1),c1=Math.min(hi,span[1]+.1);
    if(c1-c0<.25){nw.push(q);continue;}
    hit++;const dir=s1>=s0?1:-1;const pt=v=>hz?[v,cc]:[cc,v];
    for(const[p0,p1]of[[lo,c0],[c1,hi]]){if(p1-p0<.3)continue;const st=dir>0?p0:p1,en=dir>0?p1:p0,off0=Math.abs(st-s0);
     const op=(q.openings||[]).map(o=>({...o,offset:+(o.offset-off0).toFixed(3)})).filter(o=>o.offset>=-.01&&o.offset+o.width<=p1-p0+.01);
     nw.push({...q,id:q.id+'c'+Math.round(p0*100),start:pt(st),end:pt(en),openings:op});}}
   if(hit){H.walls=nw;n++;cut+=hit;did=1;(dropFurnBoxes.ws=dropFurnBoxes.ws||[]).push(w.t+'@'+bw.toFixed(1)+'x'+bh.toFixed(1));break;}}
  if(!did)break;}
 if(n)H.boxFix={boxes:n,walls:cut,ws:dropFurnBoxes.ws};}
// prem8 u: after recognition (and furniture-box cuts) tidy the wall graph: drop dead-end stubs, then close a room where a wall
// ends in front of another wall: gap ≤ 0.5 m -> extend the wall; 0.5–1.2 m -> a wall piece with a door. Logged in H.gapFix.
function closeGaps(L){closeGaps.log=[];const ws=()=>H.walls.filter(q=>q.level===L&&q.auto);const G=q=>{const dx=q.end[0]-q.start[0],dz=q.end[1]-q.start[1],l=Math.hypot(dx,dz)||1e-9;return{l,u:[dx/l,dz/l]};};
 const dist=(p,q)=>{const{l,u}=G(q),t=Math.max(0,Math.min(l,(p[0]-q.start[0])*u[0]+(p[1]-q.start[1])*u[1]));return Math.hypot(p[0]-q.start[0]-u[0]*t,p[1]-q.start[1]-u[1]*t)-q.thickness/2;};
 const free=(q,e)=>!H.walls.some(o=>o!==q&&o.level===L&&dist(e,o)<=.12);let st=0,ex=0,dr=0;
 for(const q of ws()){const fs=[q.start,q.end].filter(e=>free(q,e)).length,l=G(q).l;if(!fs||(q.openings||[]).length)continue;if((fs===2&&l<2)||(fs===1&&l<.8)){H.walls=H.walls.filter(o=>o!==q);st++;}}
 const add=[];
 for(const q of ws()){const{l,u}=G(q);for(const[e,sg]of[[q.end,1],[q.start,-1]]){if(!free(q,e))continue;const d0=[u[0]*sg,u[1]*sg];let hit=null;
   for(let s=.05;s<=1.25;s+=.05){const p=[e[0]+d0[0]*s,e[1]+d0[1]*s];const o=H.walls.find(o=>o!==q&&o.level===L&&dist(p,o)<=.02);if(o){hit={s,o};break;}}
   if(!hit)continue;(closeGaps.log=closeGaps.log||[]).push([+hit.s.toFixed(2),Math.abs(G(hit.o).u[0]*d0[0]+G(hit.o).u[1]*d0[1])>.9?'col':'perp',e.map(v=>+v.toFixed(2))]);/* only gaps in a straight wall line are closed: a wall stopping short of a perpendicular wall is usually a real opening (demo photo) */if(Math.abs(G(hit.o).u[0]*d0[0]+G(hit.o).u[1]*d0[1])<.9)continue;if(hit.s<=.5){e[0]=+(e[0]+d0[0]*(hit.s+hit.o.thickness/2)).toFixed(3);e[1]=+(e[1]+d0[1]*(hit.s+hit.o.thickness/2)).toFixed(3);ex++;continue;}
   const p1=[+(e[0]+d0[0]*(hit.s+hit.o.thickness/2)).toFixed(3),+(e[1]+d0[1]*(hit.s+hit.o.thickness/2)).toFixed(3)],len=hit.s+hit.o.thickness/2,w=Math.min(.9,len-.1);
   add.push({id:q.id+'g'+add.length,auto:1,level:L,start:[e[0],e[1]],end:p1,thickness:q.thickness,base:q.base||0,height:q.height,openings:[{type:'door',offset:+((len-w)/2).toFixed(3),width:+w.toFixed(2),height:2.05}]});dr++;}}
 H.walls=H.walls.concat(add);if(st||ex||dr)H.gapFix={stubs:st,ext:ex,doors:dr,log:closeGaps.log};}
function furnish(op){const dm=!!(op&&op.demo===1);const RS=rooms();if(!RS.length){if(!dm)toast('Najprv uzavrite steny miestností.','warn');return;}if(!dm)snap();const had=(H.furn||[]).some(f=>f.level===lvl);H.fv=dm?0:had?((H.fv||0)+1)%4:0;
 const R=RC[lvl],ids=new Set(RS.map(r=>r.id));const fixes=sanitizeOpenings(H.walls.filter(w=>w.level===lvl),p=>{const v=roomAt(R,p);return v===-1?-1:ids.has(v)?v:0;});H.fixLog=fixes;
 const T=assignTypes(R,lvl);addMissingDoors(R,lvl,RS,T,fixes);wetDoors(R,lvl,RS,T,fixes);if(!dm)try{rulesFix({noFix:1});}catch(e){console.warn('rulesFix',e);}/* door/opening fixes BEFORE layout so furniture respects the final door spots */H.furn=(H.furn||[]).filter(f=>f.level!==lvl||!ids.has(roomAt(R,f.p)));let n=0;const empty=[];
 const OPS=layoutOps(R,lvl),WS=layoutWalls(lvl),hasWC=RS.some(q=>/^WC/.test(T[q.id]||''));const t0=performance.now();
 RS.forEach(r=>{const G=makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim);const items=layoutRoom(G,roomType(r,T,R,lvl),{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC});
  items.forEach(it=>{H.furn.push({...it,level:lvl,rid:r.id});n++;});if(!items.length)empty.push(r.n);});
 if(!dm&&!window.__rfOff)try{rulesFix({noDoors:1});}catch(e){console.warn("rulesFix",e);}/* plausibility auto-fixes right after furnishing, so Kontrola shows what is really left */
 const V=validateAll();window.__furnMs=Math.round(performance.now()-t0);
 if(dm){window.__furnEmpty=empty;return V;}
 save();draw();toast('Zariadené – variant '+(H.fv+1)+'/4 ('+n+' ks).'+(fixes.filter(f=>!/^suggest/.test(f.fix)).length?' Opravené dvere/okná: '+fixes.filter(f=>!/^suggest/.test(f.fix)).length+'.':'')+(empty.length?' Bez nábytku: '+empty.join(', '):'')+(V.length?' Kontrola: '+V.length+' porušení.':' Kontrola pravidiel: OK.'),V.length?'warn':'ok',5000);window.__furnEmpty=empty;}
window.__roomFurn=()=>{const RS=rooms(),R=RC[lvl];return RS.map(r=>({n:r.n,a:+r.a.toFixed(1),k:(H.furn||[]).filter(f=>f.level===lvl&&roomAt(R,f.p)===r.id).map(f=>f.t)}));};
function mirror(){const ws=WL();if(!ws.length)return;snap();let a=1e9,b=-1e9;ws.forEach(w=>{a=Math.min(a,w.start[0],w.end[0]);b=Math.max(b,w.start[0],w.end[0]);});const m=x=>+(a+b-x).toFixed(3);
 ws.forEach(w=>{w.start=[m(w.start[0]),w.start[1]];w.end=[m(w.end[0]),w.end[1]];(w.openings||[]).forEach(o=>{if(o.type==='door')o.hinge=o.hinge==='R'?'L':'R';});});FL().forEach(f=>f.p=[m(f.p[0]),f.p[1]]);(H.rn||[]).forEach(e=>{if(e.level===lvl)e.p=[m(e.p[0]),e.p[1]];});
 (H.stairs||[]).filter(s=>s.level===lvl).forEach(s=>{const r=stairRect(s),t=[m(r[2]),m(r[0])];s.dir=Math.PI-(s.dir||0);const q=stairRect(s);s.pos=[s.pos[0]+t[0]-q[0],s.pos[1]];});save();fit();toast('Podlažie zrkadlené.','ok');}
function fitTo(W,Hh){cv.width=W;cv.height=Hh;let xs=[],zs=[];H.walls.filter(w=>w.level===lvl).forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});FL().forEach(f=>{xs.push(f.p[0]);zs.push(f.p[1]);});if(H.plot)H.plot.pts.forEach(p=>{xs.push(p[0]);zs.push(p[1]);});if(!xs.length){xs=[0,10];zs=[0,8];}
 const pd=1.2,x0=Math.min(...xs)-pd,x1=Math.max(...xs)+pd,z0=Math.min(...zs)-pd,z1=Math.max(...zs)+pd;view.s=Math.min(W/(x1-x0),Hh/(z1-z0));view.x=x0-(W/view.s-(x1-x0))/2;view.y=z0-(Hh/view.s-(z1-z0))/2;}
function renderPlan(L,W,Hh,k){const sl=lvl,st=tool;lvl=L;tool='none';EXP=1;const DD=Object.getOwnPropertyDescriptor(window,'devicePixelRatio');Object.defineProperty(window,'devicePixelRatio',{value:k,configurable:true});let o;try{fitTo(W,Hh);draw();o=document.createElement('canvas');o.width=W;o.height=Hh;o.getContext('2d').drawImage(cv,0,0);o.s=view.s;}finally{if(DD)Object.defineProperty(window,'devicePixelRatio',DD);else delete window.devicePixelRatio;EXP=0;lvl=sl;tool=st;fit();}return o;}
function page(L,PW,PH){const k=PW/1500,c=document.createElement('canvas');c.width=PW;c.height=PH;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,PW,PH);const m=40*k,tb=150*k;
 const pl=renderPlan(L,PW-2*m,PH-2*m-tb,k);x.drawImage(pl,m,m);x.strokeStyle='#0B0B0B';x.lineWidth=1.5*k;x.strokeRect(m/2,m/2,PW-m,PH-m);
 const y0=PH-m-tb+14*k,RS=rooms(L),tot=RS.reduce((s,r)=>s+r.a,0);x.fillStyle='#0B0B0B';x.fillRect(m,y0,330*k,tb-14*k);x.font=`800 ${34*k}px Archivo,Inter,sans-serif`;x.textAlign='left';x.fillStyle='#fff';x.fillText('VKRO',m+22*k,y0+52*k);const w1=x.measureText('VKRO').width;x.fillStyle='#E2552D';x.fillText('Č',m+22*k+w1,y0+52*k);
 x.fillStyle='#fff';x.font=`600 ${15*k}px Inter,sans-serif`;x.fillText((H.name||'Projekt').slice(0,32),m+22*k,y0+84*k);x.fillStyle='#bdbdbd';x.font=`400 ${12*k}px Inter,sans-serif`;x.fillText('Podlažie '+L+' · '+new Date().toLocaleDateString('sk-SK'),m+22*k,y0+106*k);
 x.fillStyle='#0B0B0B';x.font=`800 ${26*k}px Archivo,Inter,sans-serif`;x.fillText(tot.toFixed(1).replace('.',',')+' m²',m+360*k,y0+44*k);x.font=`500 ${11*k}px Inter,sans-serif`;x.fillStyle='#6B6B6B';x.fillText('ÚŽITKOVÁ PLOCHA · '+RS.length+' MIESTNOSTÍ',m+360*k,y0+64*k);
 x.font=`400 ${12*k}px Inter,sans-serif`;x.fillStyle='#0B0B0B';RS.slice(0,15).forEach((r,i)=>{const col=Math.floor(i/5),row=i%5;x.fillText(r.n+' — '+r.a.toFixed(1).replace('.',',')+' m²',m+620*k+col*230*k,y0+20*k+row*20*k);});
 const sb=pl.s,bx=PW-m-220*k,by=y0+70*k;x.fillStyle='#0B0B0B';x.font=`500 ${10*k}px Inter,sans-serif`;x.textAlign='center';for(let i=0;i<5;i++){x.fillStyle=i%2?'#fff':'#0B0B0B';x.fillRect(bx+i*sb,by,sb,6*k);x.strokeStyle='#0B0B0B';x.strokeRect(bx+i*sb,by,sb,6*k);x.fillStyle='#0B0B0B';x.fillText(i+'',bx+i*sb,by+20*k);}x.fillText('5 m',bx+5*sb,by+20*k);
 x.strokeStyle='#0B0B0B';x.beginPath();x.moveTo(PW-m-26*k,y0+20*k);x.lineTo(PW-m-36*k,y0+50*k);x.lineTo(PW-m-26*k,y0+43*k);x.lineTo(PW-m-16*k,y0+50*k);x.closePath();x.fill();x.fillText('S',PW-m-26*k,y0+66*k);
 x.fillStyle='#E2552D';x.fillRect(m,PH-m-3*k,PW-2*m,3*k);return c;}
async function exportHi(kind){const lv=H.levels.filter(l=>H.walls.some(w=>w.level===l.name)).map(l=>l.name);if(!lv.length){toast('Pôdorys je prázdny.','warn');return;}busy('Pripravujem export…');await new Promise(r=>setTimeout(r,30));
 try{if(kind==='png'){const c=page(lvl,4200,2970);await new Promise(r=>c.toBlob(b=>{dl(b,(H.name||'podorys')+'_'+lvl+'.png');r();}));toast('Pôdorys PNG (4200 × 2970 px).','ok');}
  else{if(!window.jspdf)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);});const{jsPDF}=window.jspdf;const A3=kind==='a3',mw=A3?420:297,mh=A3?297:210,doc=new jsPDF({orientation:'landscape',unit:'mm',format:A3?'a3':'a4'});
   lv.forEach((L,i)=>{if(i)doc.addPage();const c=page(L,A3?4961:3508,A3?3508:2480);doc.addImage(c.toDataURL('image/jpeg',.92),'JPEG',0,0,mw,mh);});dl(doc.output('blob'),(H.name||'podorys')+(A3?'_A3':'_A4')+'.pdf');toast('PDF '+(A3?'A3':'A4')+' · '+lv.length+' '+(lv.length>1?'strany':'strana')+'.','ok');}}
 catch(e){console.warn(e);toast('Export zlyhal. Skontrolujte pripojenie.','err');}finally{busy(false);}}
window.__exportHi=exportHi;

function roomPts(){const out=[];H.levels.forEach(l=>{const RS=rooms(l.name);RS.filter(r=>r.a>=2).forEach(r=>{const c=[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2],RR=RC[l.name];let p=c;if(roomAt(RR,c)!==r.id){p=null;for(let k=0;k<400&&!p;k++){const q=[r.bb[0]+Math.random()*(r.bb[2]-r.bb[0]),r.bb[1]+Math.random()*(r.bb[3]-r.bb[1])];if(roomAt(RR,q)===r.id)p=q;}}if(p)out.push({n:r.n+(H.levels.length>1?' · '+l.name:''),p,e:l.elevation});});});return out;}
async function panoDlg(){const P=roomPts();if(!P.length){toast('Najprv uzavrite steny miestností.','warn');return;}const r=await dlg('360° panoráma','<p>Equirektangulárny obrázok 4096×2048 pre realitné portály a 360° prehliadače.</p><label>Miestnosť<select name="i"><option value="all">Všetky miestnosti</option>'+P.map((q,i)=>'<option value="'+i+'">'+esc(q.n)+'</option>').join('')+'</select></label>',[['Zrušiť',0],['Stiahnuť',1,'pri','dl']]);if(!r||!r.v)return;const was=$('vw').classList.contains('on');if(!was)show('vw');const m=await v3();await new Promise(s=>setTimeout(s,was?200:1800));const L=r.f.i==='all'?P:[P[+r.f.i]];for(const q of L){const u=m.pano(q.p[0],q.p[1],q.e);if(!u)continue;const a=document.createElement('a');a.href=u;a.download=(H.name||'projekt')+' - '+q.n+' 360.jpg';a.click();await new Promise(s=>setTimeout(s,400));}toast(L.length>1?'Panorámy stiahnuté ('+L.length+').':'Panoráma stiahnutá.','ok');}
async function jumpsUI(v){const J=$('jumps');if(!v||!H){J.hidden=true;return;}const m=await v3();J.innerHTML='';H.levels.forEach(l=>{const RS=rooms(l.name);RS.filter(r=>r.a>=2).forEach(r=>{const c=[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2],RR=RC[l.name];let p=c;if(roomAt(RR,c)!==r.id){p=null;for(let k=0;k<400&&!p;k++){const q=[r.bb[0]+Math.random()*(r.bb[2]-r.bb[0]),r.bb[1]+Math.random()*(r.bb[3]-r.bb[1])];if(roomAt(RR,q)===r.id)p=q;}}if(!p)return;const b=document.createElement('button');b.dataset.n=r.n;b.textContent=r.n+(H.levels.length>1?' · '+l.name:'');b.onclick=()=>{DOLL_ON=false;m.jump(p[0],p[1],l.elevation);wUI(true);};J.appendChild(b);});});
 const cnt={};[...J.children].forEach(b=>cnt[b.dataset.n]=(cnt[b.dataset.n]||0)+1);const seen={};[...J.children].forEach(b=>{const n=b.dataset.n;if(cnt[n]>1){seen[n]=(seen[n]||0)+1;b.textContent=b.textContent.replace(n,n+' '+seen[n]);}});J.hidden=!J.children.length;}
const setM=async()=>{H.mat={wall:$('mwall').value,floor:$('mfloor').value,fac:$('mfac').value,roof:$('mroof').value,fasada:$('mfasada').value};save();(await v3()).setMat(H.mat);};['mwall','mfloor','mfac','mroof'].forEach(k=>$(k).onchange=setM);$('mfasada').onchange=()=>{H.mat=Object.assign(H.mat||{},{fasada:$('mfasada').value});save();gen();};const SP={minimal:['#f4f1ec','dub'],futur:['#f4f1ec','beton'],moderny:['#f4f1ec','beton'],skandi:['#f4f1ec','dub'],klasik:['#e8e0d2','orech']};$('msty').onchange=async e=>{const s=e.target.value;snap();H.style=s||undefined;if(SP[s]){H.mat={...(H.mat||{}),wall:SP[s][0],floor:SP[s][1]};}save();if((H.furn||[]).length||s){furnish({demo:1});save();}await gen();toast(s?'Štýl „'+e.target.selectedOptions[0].textContent+'“ použitý.':'Pôvodné farby.','ok');};
const PH=h=>h<5.6||h>=18.3?'noc':h<6.5?'svitanie':h<7.6?'ráno':h<15.7?'deň':h<16.9?'zlatá hodina':h<17.4?'západ':'súmrak',hl=h=>{const m=Math.round((h%1)*60);$('sunv').textContent=String(Math.floor(h)).padStart(2,'0')+':'+String(m).padStart(2,'0');$('sunp').textContent=PH(h);};
let v3m=null;let hRaf=0,hPend=null;
const setA=async()=>{const h=+$('sunh').value;H.atmo={w:$('mwx').value,h};save();(await v3()).setAtmo(H.atmo);};$('mwx').onchange=setA;
// live drag: coalesce to one update per animation frame; shadows throttled inside v3; full quality on release
$('sunh').oninput=e=>{const h=+e.target.value;hl(h);hPend=h;if(!v3m){v3().then(m=>{v3m=m;m.setHour(h,true);});return;}if(!hRaf)hRaf=requestAnimationFrame(()=>{hRaf=0;if(v3m&&hPend!=null)v3m.setHour(hPend,true);});};
$('sunh').onchange=e=>{const h=+e.target.value;hPend=null;if(hRaf){cancelAnimationFrame(hRaf);hRaf=0;}hl(h);H.atmo={...(H.atmo||{}),w:$('mwx').value,h};save();v3().then(m=>m.setHour(h,false));};

function extSides(){H.levels.forEach(l=>{rooms(l.name);const C=RC[l.name];H.walls.filter(w=>w.level===l.name).forEach(w=>{const g=geo(w),n=[-g.u[1],g.u[0]],m=[g.x0+g.u[0]*g.L/2,g.z0+g.u[1]*g.L/2],o=w.thickness/2+.15,A=C&&roomAt(C,[m[0]+n[0]*o,m[1]+n[1]*o]),B=C&&roomAt(C,[m[0]-n[0]*o,m[1]-n[1]*o]);const iA=C.r.some(q=>q.id===A),iB=C.r.some(q=>q.id===B);w._ext=iA===iB?0:iA?-1:1;});});}
// LOGIC RULE (doors must lead somewhere): an exterior door on an upper floor has to open onto something walkable:
// the lower floor's roof (deck), a balcony, or (if none fits) it becomes a French window with a railing. Balconies are auto-added:
// door width + 1 m wide, 1.3 m deep, glass railing; rejected if the slab would hit any wall of this or the floor below, or leave the plot.
function segHitsRect(a,b,R){const[x0,z0,x1,z1]=R;if(Math.max(a[0],b[0])<x0||Math.min(a[0],b[0])>x1||Math.max(a[1],b[1])<z0||Math.min(a[1],b[1])>z1)return false;
 for(let k=0;k<=20;k++){const x=a[0]+(b[0]-a[0])*k/20,z=a[1]+(b[1]-a[1])*k/20;if(x>x0&&x<x1&&z>z0&&z<z1)return true;}return false;}
function inPoly(p,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function doorLead(w,o,i){const g=geo(w),n=[-g.u[1]*w._ext,g.u[0]*w._ext],t=(w.thickness||.3)/2,s=o.offset+o.width/2,c=[g.x0+g.u[0]*s,g.z0+g.u[1]*s],p=[c[0]+n[0]*(t+.6),c[1]+n[1]*(t+.6)];
 const lo=H.levels[i-1];rooms(lo.name);const CL=RC[lo.name];if(CL&&CL.r&&CL.r.some(q=>q.id===roomAt(CL,p)))return'deck';
 if((H.balc||[]).some(b=>b.level===w.level&&p[0]>b.r[0]&&p[0]<b.r[2]&&p[1]>b.r[1]&&p[1]<b.r[3]))return'balcony';if(o.rail)return'french';return null;}
function upperDoors(){if(!H.levels||H.levels.length<2)return[];extSides();const log=[];H.balc=(H.balc||[]).filter(b=>!b.auto);H.decks=[];
 H.levels.forEach((l,i)=>{if(!i)return;H.walls.filter(w=>w.level===l.name&&w._ext).forEach(w=>(w.openings||[]).forEach(o=>{if(o.type!=='door')return;if(o.rail&&o.railAuto)delete o.rail;const ld=doorLead(w,o,i);if(ld==='deck'){const g=geo(w),n=[-g.u[1]*w._ext,g.u[0]*w._ext],q=o.offset+o.width/2;H.decks.push({level:H.levels[i-1].name,p:[g.x0+g.u[0]*q+n[0]*((w.thickness||.3)/2+.6),g.z0+g.u[1]*q+n[1]*((w.thickness||.3)/2+.6)]});}if(ld)return;
  const g=geo(w),n=[-g.u[1]*w._ext,g.u[0]*w._ext],t=(w.thickness||.3)/2,a=o.offset-.5,b=o.offset+o.width+.5,D=1.3;
  const P=[a,b].flatMap(s=>[0,D].map(d=>[g.x0+g.u[0]*s+n[0]*(t+d),g.z0+g.u[1]*s+n[1]*(t+d)]));const R=[Math.min(...P.map(q=>q[0])),Math.min(...P.map(q=>q[1])),Math.max(...P.map(q=>q[0])),Math.max(...P.map(q=>q[1]))];
  const Ri=[R[0]+.06,R[1]+.06,R[2]-.06,R[3]-.06];const lo=H.levels[i-1].name;
  const hit=H.walls.some(q=>q!==w&&(q.level===l.name||q.level===lo)&&segHitsRect(q.start,q.end,Ri));const off=H.plot&&H.plot.pts&&P.some(q=>!inPoly(q,H.plot.pts));
  if(hit||off){o.rail=1;o.railAuto=1;log.push({level:l.name,door:o.offset,fix:'french-window',why:hit?'balcony would hit a wall':'balcony would leave the plot'});return;}
  const m=H.balc.find(B=>B.auto&&B.wall===w.id&&B.level===l.name&&a<B.b+.8&&b>B.a-.8);
  if(m){m.a=Math.min(m.a,a);m.b=Math.max(m.b,b);const Q=[m.a,m.b].flatMap(s=>[0,D].map(d=>[g.x0+g.u[0]*s+n[0]*(t+d),g.z0+g.u[1]*s+n[1]*(t+d)]));m.r=[Math.min(...Q.map(q=>q[0])),Math.min(...Q.map(q=>q[1])),Math.max(...Q.map(q=>q[0])),Math.max(...Q.map(q=>q[1]))];}
  else H.balc.push({auto:1,level:l.name,wall:w.id,a,b,d:D,r:R,n,u:g.u,o:[g.x0+n[0]*t,g.z0+n[1]*t]});log.push({level:l.name,door:o.offset,fix:'balcony'});}));});
 H.balc.forEach(B=>{if(B.auto){const w=H.walls.find(q=>q.id===B.wall);if(w){const g=geo(w),t=(w.thickness||.3)/2;B.o=[g.x0+B.n[0]*t,g.z0+B.n[1]*t];}}});return log;}
function doorViol(){const out=[];if(!H.levels||H.levels.length<2)return out;extSides();H.levels.forEach((l,i)=>{if(!i)return;H.walls.filter(w=>w.level===l.name&&w._ext).forEach(w=>(w.openings||[]).forEach(o=>{if(o.type==='door'&&!doorLead(w,o,i))out.push({room:'-',t:'door',p:[w.id,o.offset],rule:'upper-door-to-nowhere'});}));});return out;}
window.__upperDoors=upperDoors;window.__doorViol=doorViol;
// ===== PLAUSIBILITY RULES CATALOGUE (what can / cannot exist). hard = physically/legally absurd, soft = unusual, worth a look.
// Each rule: id, sev, what it checks. Auto-fixes run before every 3D build (rulesFix); rulesCheck reports what is left.
const RULES=[
 ['opening-height','hard','a window/door must fit in its wall: sill ≥ 0, top ≤ wall height − 5 cm (auto-fix: clamp)'],
 ['door-into-wall','hard','both sides of a door must be walkable: a room or the outside (auto-fix: slide ≤0.6 m along the wall)'],
 ['door-between-nothing','hard','a door cannot have the outside on both sides (auto-fix: slide ≤1.2 m onto a room wall; a door on a stray wall stub is removed)'],
 ['carport-clear','hard','the carport keeps ≥1.2 m from every door/window, never touches the house or a balcony (auto: next candidate spot or no carport)'],
 ['door-inside-room','soft','a door with the same room on both sides is a leftover'],
 ['upper-door-to-nowhere','hard','an upper-floor exterior door must open onto a balcony / roof deck / railing (auto-fix: balcony or French window)'],
 ['room-unreachable','hard','every room must be reachable from an entrance door (via doors and stairs)'],
 ['no-entrance','hard','the ground floor needs at least one exterior door'],
 ['stair-landing','hard','stairs must start and land in a walkable room, never in a WC/bathroom/closet'],
 ['stair-landing-bedroom','soft','stairs normally land in a hall, not inside a bedroom'],
 ['fixture-missing','hard','furnished rooms need their key fixture: WC→toilet, bathroom→bath/shower, kitchen→counter, bedroom→bed (auto-fix: re-lay out the room; if it cannot fit, swap room types with a room where both fit)'],
 ['fixture-secondary','soft','bathroom→sink, kitchen→fridge'],
 ['kitchen-short','soft','a kitchen counter should be at least 1.8 m long (hard below 1.2 m)'],
 ['scale-guess','soft','scale was estimated (no readable dimensions): ask for one known length'],
 ['too-many-exterior-doors','soft','a family house has 1-3 exterior doors on the ground floor (auto-fix: >3 -> keep the 2 most plausible: hall/entrance, wide living/kitchen terrace door, utility; the rest become windows)'],
 ['furniture-on-stairs','hard','no furniture on the stair run or in the stair opening above it (auto-fix: remove the item)'],
 ['scale-implausible','hard','with an estimated scale, ≥2 rooms are too small/narrow for their type: propose the enlargement (one click), never apply silently'],
];window.__RULES=RULES;
// prem9: furniture standing on the stair run (its level) or floating in the stair opening (level above)
function stairFurn(){const out=[];(H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(l=>l.name===st.level);const lv=[st.level,(H.levels[li+1]||{}).name];const r=stairRect(st);(H.furn||[]).forEach((f,q)=>{if(!lv.includes(f.level)||!f.p)return;if(f.p[0]>r[0]-.05&&f.p[0]<r[2]+.05&&f.p[1]>r[1]-.05&&f.p[1]<r[3]+.05&&!out.includes(q))out.push(q);});});return out;}
function rulesFix(op){op=op||{};const log=[];H.walls.forEach(w=>{const wh=w.height||((H.levels||[]).find(l=>l.name===w.level)||{}).height||2.8;(w.openings||[]).forEach(o=>{if((o.sill||0)<0){o.sill=0;log.push('opening-height');}
 if((o.sill||0)+(o.height||0)>wh-.05){o.height=Math.max(.4,r2(wh-.05-(o.sill||0)));if((o.sill||0)+o.height>wh-.05)o.sill=Math.max(0,r2(wh-.05-o.height));log.push('opening-height');}});});
 // door-into-wall auto-fix: slide the door along its wall (≤ 0.6 m) to the nearest spot where both sides are walkable and it overlaps no other opening
 const blocked=[];
 if(!op.noDoors)(H.levels||[]).forEach((l,li)=>{const L=l.name,RS=rooms(L),R=RC[L];if(!R||!R.g)return;H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25,os=w.openings||[];
  const ids=new Set(RS.map(q=>q.id)),sd=(o,off)=>{const c=[G.x0+G.u[0]*(off+o.width/2),G.z0+G.u[1]*(off+o.width/2)];return[roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e])];};
  const bad=(o,off)=>{const v=sd(o,off);return v[0]===-1||v[1]===-1;},none=(o,off)=>{const v=sd(o,off);return !ids.has(v[0])&&!ids.has(v[1]);};
  const slide=(o,test,max,tag)=>{for(let k=1;k<=max*10;k++)for(const d of[k/10,-k/10]){const off=o.offset+d;if(off<.05||off+o.width>G.L-.05)continue;if(os.some(q=>q!==o&&off<q.offset+q.width+.05&&off+o.width>q.offset-.05))continue;if(!test(o,off)){o.offset=r2(off);log.push(tag);return true;}}return false;};
  // door-between-nothing auto-fix: slide ≤1.2 m to where a room is on at least one side; a door on a wall with no room along its whole length (stray stub) is removed
  const orphan=[];os.forEach(o=>{if(o.type!=='door')return;if(bad(o,o.offset)){const tq=(q,off)=>bad(q,off)||(li===0&&none(q,off)&&!none(q,q.offset));if(!slide(o,tq,.6,'door-into-wall')&&!slide(o,tq,1.2,'door-into-wall'))blocked.push([w,o]);}else if(none(o,o.offset)&&li===0&&!slide(o,(q,off)=>bad(q,off)||none(q,off),1.2,'door-between-nothing')){let any=false;for(let t=.2;t<G.L-.2&&!any;t+=.3){const c=[G.x0+G.u[0]*t,G.z0+G.u[1]*t];any=ids.has(roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]))||ids.has(roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]));}if(!any)orphan.push(o);else blocked.push([w,o]);}});
  if(orphan.length){w.openings=os.filter(o=>!orphan.includes(o));orphan.forEach(()=>log.push('door-between-nothing:removed'));}});});
 // prem9 LOGIC RULE (too many exterior doors): a family house has 1-3 doors to the outside (entrance, terrace, garage/utility). When the reader turned a
 // whole facade of windows into doors, only the 2 most plausible stay doors (hall/entrance first, then a wide living-room/kitchen terrace door, then utility rooms) - the rest become windows
 if(!op.noDoors&&H.levels&&H.levels.length){const L0=H.levels[0].name;extSides();const RS=rooms(L0),R=RC[L0];if(R&&R.g){const T=assignTypes(R,L0),ids=new Set(RS.map(q=>q.id)),ex=[];
  H.walls.filter(w=>w.level===L0).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door'||o.kind==='entrance'||o.kind==='terrace')return;/* doors the user/demo marked as entrance/terrace are intentional */const c=[G.x0+G.u[0]*(o.offset+o.width/2),G.z0+G.u[1]*(o.offset+o.width/2)];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);if(ids.has(a)===ids.has(b)||a===-1||b===-1)return;const id=ids.has(a)?a:b;const r=RS.find(q=>q.id===id);const nm=r?roomType(r,T,R,L0):'';
   const sc=(/Predsie|Chodba|Zádver|Vstup|Hala/.test(nm)?6:/Obýv|Jedál|Kuchy/.test(nm)?(o.width>=1.4?5:3):/Garáž|Techn|Komora|Sklad|Dielňa/.test(nm)?2:0)+(o.out?2:0)+(o.kind==='entrance'?3:0)-(o.width<.7?2:0);ex.push({w,o,sc,rid:id});});});
  const dc={};H.walls.filter(w=>w.level===L0).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const c=[G.x0+G.u[0]*(o.offset+o.width/2),G.z0+G.u[1]*(o.offset+o.width/2)];for(const v of[roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e])])if(ids.has(v))dc[v]=(dc[v]||0)+1;});});
  const reach0=()=>rulesCheck().filter(x=>x.id==='room-unreachable'||x.id==='no-entrance').length+validateAll(L0).filter(v=>v.rule==='room-without-door').length;
  if(ex.length>3){const r0=reach0(),undo=[];ex.sort((x,y)=>y.sc-x.sc);ex.slice(2).forEach(({w,o,rid})=>{if((dc[rid]||0)<2)return;dc[rid]--;undo.push([o,JSON.stringify(o)]);o.type='window';o.sill=o.width>=2?0:.9;o.height=o.width>=2?2.1:1.4;delete o.out;delete o.kind;delete o.hinge;log.push('too-many-exterior-doors');});if(undo.length&&reach0()>r0)undo.forEach(([o,j])=>{for(const k of Object.keys(o))delete o[k];Object.assign(o,JSON.parse(j));});}}}
 // prem9 LOGIC RULE (door into a wall): a door that cannot be slid ≤1.2 m off a wall right behind it opens onto nothing usable - it is removed, unless that would leave a room unreachable or the house without an entrance
 if(blocked.length&&!op.noDoors){const reach=()=>rulesCheck().filter(x=>x.id==='room-unreachable'||x.id==='no-entrance').length+H.levels.reduce((k,l)=>k+validateAll(l.name).filter(v=>v.rule==='room-without-door').length,0);const r0=reach();blocked.forEach(([w,o])=>{const k=w.openings.indexOf(o);if(k<0)return;w.openings.splice(k,1);if(reach()>r0)w.openings.splice(k,0,o);else log.push('door-into-wall:removed');});}
 // prem9 LOGIC RULE (every room reachable): a room no door leads to gets one 0.8 m door in the wall it shares with a reachable room (the reader missed it)
 if(!op.noDoors&&!window.__noReachFix)for(let it=0;it<4;it++){window.__reachSeen=null;const un=rulesCheck().filter(x=>x.id==='room-unreachable');const seen=window.__reachSeen;if(!un.length||!seen)break;let added=0;
  (H.levels||[]).forEach(l=>{const L=l.name,RS=rooms(L),R=RC[L];if(!R||!R.g)return;RS.forEach(r=>{if(added||seen.has(L+':'+r.id))return;let best=null;
   H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w);if(G.L<1)return;const n=[-G.u[1],G.u[0]],e=(w.thickness||.15)/2+.25,os=w.openings||[];
    for(let off=.15;off+.8<=G.L-.15;off+=.1){if(os.some(q=>off<q.offset+q.width+.1&&off+.8>q.offset-.1))continue;let ok=true,other=0;for(const f of[.1,.4,.7]){const c=[G.x0+G.u[0]*(off+f),G.z0+G.u[1]*(off+f)],A=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),B=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);const o2=A===r.id?B:B===r.id?A:-9;if(o2===-9||!seen.has(L+':'+o2)||(other&&o2!==other)){ok=false;break;}other=o2;}
     if(ok){const sc=Math.abs(off+.4-G.L/2);if(!best||sc<best.sc)best={w,off,sc};}}});
   if(best){(best.w.openings=best.w.openings||[]).push({type:'door',offset:r2(best.off),width:.8,sill:0,height:2.05,auto:1});added++;log.push('room-unreachable:door-added');}});});
  if(!added)break;}
 upperDoors().forEach(()=>log.push('upper-door-to-nowhere'));
 if(op.noFix)return log;
 // fixture-missing auto-fix: re-lay out just that room with the normal layout engine (other rooms untouched)
 const KEY=n=>/^WC/.test(n)?['wc']:/Kúpeľ/.test(n)?['bath','shower']:/Spálň|Detsk/.test(n)?['bed','bed1','bunk']:/Kuchyň/.test(n)?['kitch']:null;
 const hv=L=>validateAll(L).filter(v=>!/^read-error/.test(v.rule)).length;/* a fix may never add hard furniture violations: otherwise it is reverted */
 (H.levels||[]).forEach(l=>{const L=l.name;if(!(H.furn||[]).some(f=>f.level===L))return;const RS=rooms(L),R=RC[L];if(!R||!R.g)return;const T=assignTypes(R,L);const v0=hv(L),F0=JSON.stringify(H.furn),N0=JSON.stringify(H.rn||[]),lg0=log.length;let OPS=null,WS=null;const hasWC=RS.some(q=>/^WC/.test(roomType(q,T,R,L)));
  RS.forEach(r=>{const n=roomType(r,T,R,L),K=KEY(n);if(!K)return;const inR=f=>f.level===L&&(f.rid===r.id||roomAt(R,f.p)===r.id);if(H.furn.some(f=>inR(f)&&K.includes(f.t)))return;
   OPS=OPS||layoutOps(R,L);WS=WS||layoutWalls(L);const G=makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim);const it=layoutRoom(G,n,{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC});
   const opt={fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC},lay=(q,t)=>layoutRoom(makeRoom(R,q,OPS.filter(o=>o.room===q.id),WS,ldim),t,{...opt,fv:(H.fv||0)*13+q.id*7}),okK=(its,t)=>{const k=KEY(t);return!k||its.some(f=>k.includes(f.t));};
   if(!it.some(f=>K.includes(f.t))){
    // LOGIC RULE (type must fit the room): if the room cannot hold its key fixture, swap its type with another auto-named room on the floor
    // when BOTH rooms then hold their key fixtures (e.g. a 4 m² "Kuchyňa" and a 9 m² "Technická" trade names). Biggest plausible partner first.
    if(!r.auto)return;const C=RS.filter(q=>q!==r&&q.auto&&!/^(Chodba|Predsieň|Obývačka)/.test(roomType(q,T,R,L))).sort((a,b)=>b.a-a.a);
    const wet=t=>/^(WC|Kúpeľ)/.test(t),sto=t=>/^(Technick|Komora|Špajz|Šatník)/.test(t);for(const q of C){const tq=roomType(q,T,R,L);if(wet(n)?!(wet(tq)||sto(tq)):wet(tq)?!sto(n):false)continue;/* wet rooms trade only with wet/storage rooms */const a=lay(r,tq),b=lay(q,n);if(okK(a,tq)&&okK(b,n)){const inQ=f=>f.level===L&&(f.rid===q.id||roomAt(R,f.p)===q.id);H.furn=H.furn.filter(f=>!inR(f)&&!inQ(f));a.forEach(f=>H.furn.push({...f,level:L,rid:r.id}));b.forEach(f=>H.furn.push({...f,level:L,rid:q.id}));
     H.rn=(H.rn||[]).filter(e=>!(e.level===L&&(roomAt(R,e.p)===r.id||roomAt(R,e.p)===q.id)));H.rn.push({level:L,p:[...r.p],n:tq.replace(/ \d+$/,''),auto:1},{level:L,p:[...q.p],n:n.replace(/ \d+$/,''),auto:1});log.push('type-swap:'+L+':'+n+'<->'+tq);nameR(R,L);return;}}
    return;}
   H.furn=H.furn.filter(f=>!inR(f));it.forEach(f=>H.furn.push({...f,level:L,rid:r.id}));log.push('fixture-missing:'+L+':'+n);});if(log.length>lg0&&hv(L)>v0){H.furn=JSON.parse(F0);H.rn=JSON.parse(N0);log.length=lg0;log.push('fix-reverted:'+L);nameR(R,L);}});
 if(!op.noFix){const bad=stairFurn();if(bad.length){H.furn=H.furn.filter((f,q)=>!bad.includes(q));log.push('furniture-on-stairs');}}return log;}
function rulesCheck(){const out=[],P=(id,where,extra)=>{const R0=RULES.find(r=>r[0]===id);out.push({id,sev:R0?R0[1]:'soft',where,...(extra||{})});};
 if(!H.levels||!H.walls.length)return out;extSides();const nm={},graph={},ext=new Set();const L0=H.levels[0].name;
 H.levels.forEach((l,li)=>{const L=l.name,RS=rooms(L),R=RC[L];if(!R||!R.g||!RS.length)return;const ids=new Set(RS.map(q=>q.id)),T=assignTypes(R,L);RS.forEach(r=>{const k=L+':'+r.id;nm[k]=roomType(r,T,R,L);graph[k]=graph[k]||new Set();});
  const side=v=>v===-1?'wall':ids.has(v)?'room':'out';
  H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];
   const va=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),vb=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]),A=side(va),B=side(vb),wh={level:L,wall:w.id,at:r2(o.offset)};
   if(A==='wall'||B==='wall')P('door-into-wall',wh);else if(A==='out'&&B==='out')P('door-between-nothing',wh);else if(A==='room'&&B==='room'){if(va===vb)P('door-inside-room',wh);else{graph[L+':'+va].add(L+':'+vb);graph[L+':'+vb].add(L+':'+va);}}
   else if(li===0)ext.add(L+':'+(A==='room'?va:vb));});});
  // fixtures (only when this floor is furnished)
  const F=(H.furn||[]).filter(f=>f.level===L);if(F.length)RS.forEach(r=>{const n=nm[L+':'+r.id]||'',fs=F.filter(f=>roomAt(R,f.p)===r.id),has=(...t)=>fs.some(f=>t.includes(f.t)),wh={level:L,room:n};
   if(/^WC/.test(n)&&!has('wc'))P('fixture-missing',wh,{need:'wc'});
   if(/Kúpeľ/.test(n)){if(!has('bath','shower'))P('fixture-missing',wh,{need:'bath|shower'});if(!has('sink'))P('fixture-secondary',wh,{need:'sink'});}
   if(/Spálň|Detsk/.test(n)&&!has('bed','bed1','bunk'))P('fixture-missing',wh,{need:'bed'});
   if(/Kuchyň/.test(n)){const K=fs.filter(f=>f.t==='kitch'),len=K.reduce((a,f)=>a+(f.w||2.8),0);if(!K.length)P('fixture-missing',wh,{need:'kitch'});else if(len<1.8)out.push({id:'kitchen-short',sev:len<1.2?'hard':'soft',where:wh,len:r2(len)});if(!has('fridge'))P('fixture-secondary',wh,{need:'fridge'});}});});
 if(!ext.size&&Object.keys(nm).some(k=>k.startsWith(L0+':')))P('no-entrance',{level:L0});
 // stairs: bottom on st.level, top on the next level; link the two rooms for reachability
 (H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(l=>l.name===st.level);if(li<0)return;const Lc=st.length||3.6,Wd=st.width||1,d=st.dir||0,c=Math.cos(d),sn=Math.sin(d),mid=[-sn*Wd/2,c*Wd/2];
  const bot=[st.pos[0]+mid[0]-c*.5,st.pos[1]+mid[1]-sn*.5],top=[st.pos[0]+mid[0]+c*(Lc+.5),st.pos[1]+mid[1]+sn*(Lc+.5)],ends=[[H.levels[li].name,bot,'bottom']];if(H.levels[li+1])ends.push([H.levels[li+1].name,top,'top']);
  const ks=ends.map(([L,p,which])=>{rooms(L);const R=RC[L];const v=roomAt(R,p),k=L+':'+v,n=nm[k];if(!n){P('stair-landing',{level:L,end:which,p:p.map(r2)});return null;}
   if(/^WC|Kúpeľ|Šatn|Komora|Technick/.test(n))P('stair-landing',{level:L,end:which,room:n});else if(/Spálň/.test(n))P('stair-landing-bedroom',{level:L,end:which,room:n});return k;});
  if(ks[0]&&ks[1]){graph[ks[0]].add(ks[1]);graph[ks[1]].add(ks[0]);}});
 // reachability from entrance rooms
 if(ext.size){const seen=new Set(ext),q=[...ext];while(q.length){const k=q.pop();(graph[k]||[]).forEach(j=>{if(!seen.has(j)){seen.add(j);q.push(j);}});}
  window.__reachSeen=seen;Object.keys(nm).forEach(k=>{if(!seen.has(k))P('room-unreachable',{level:k.split(':')[0],room:nm[k]});});}
 doorViol().forEach(v=>P('upper-door-to-nowhere',{wall:v.p[0],at:v.p[1]}));
 // scale: a guessed scale is always flagged; if several rooms are too small/narrow for their type, the needed enlargement is proposed (never applied silently)
 if(H.underlay&&H.underlay.guess&&!H.underlay.cal){const sf=scaleCheck();if(sf&&sf.f>=1.1)P('scale-implausible',{level:L0},{f:sf.f,n:sf.n});else P('scale-guess',{level:L0});}
 window.__rulesOut=out;stairFurn().forEach(q=>{const f=H.furn[q];P('furniture-on-stairs',{level:f.level,t:f.t});});return out;}
// minimum plausible size per room type: [area m², shorter side m]
const RMIN=[[/^Obýva/,16,3.0],[/^Spálň/,9,2.7],[/^Detsk/,8,2.4],[/^Pracov/,6,2.1],[/^Kuchyň/,5,1.8],[/^Kúpeľ/,3.2,1.5],[/^Jedáleň/,7,2.4]];
function scaleCheck(){const L=H.levels[0].name,RS=rooms(L),R=RC[L];if(!R||!R.g||RS.length<3)return null;const T=assignTypes(R,L),need=[];
 RS.forEach(r=>{const n=roomType(r,T,R,L),m=RMIN.find(q=>q[0].test(n));if(!m)return;const mn=Math.min(r.bb[2]-r.bb[0],r.bb[3]-r.bb[1]),f=Math.max(Math.sqrt(m[1]/Math.max(.5,r.a)),m[2]/Math.max(.3,mn));if(f>1.05)need.push(f);});
 const sum=RS.reduce((a,r)=>a+r.a,0);if(RS.length>=5&&sum<45)need.push(Math.sqrt(60/sum),Math.sqrt(60/sum));
 if(need.length<2)return{f:1,n:need.length};need.sort((a,b)=>a-b);return{f:Math.min(1.5,Math.round(need[need.length>>1]*20)/20),n:need.length};}
window.__scaleCheck=scaleCheck;
// Kontrola panel: plain-Slovak list of rule findings (hard first), refreshed shortly after every plan change
const NEED={wc:'WC misa','bath|shower':'vaňa alebo sprcha',kitch:'kuchynská linka',bed:'posteľ',sink:'umývadlo',fridge:'chladnička'};
function chkMsg(x){const w=x.where||{},r=w.room||'',lv=w.level?w.level+' · ':'';return lv+({'opening-height':'Okno alebo dvere sú vyššie ako stena','door-into-wall':'Dvere vedú do steny','door-between-nothing':'Dvere nevedú do žiadnej miestnosti','door-inside-room':'Zbytočné dvere vnútri miestnosti','upper-door-to-nowhere':'Dvere na poschodí vedú do prázdna','no-entrance':'Prízemie nemá vchodové dvere','room-unreachable':r+' – nedá sa do nej prejsť','stair-landing':'Schody ústia mimo vhodnej miestnosti'+(r?' ('+r+')':''),'stair-landing-bedroom':'Schody ústia do spálne','furniture-on-stairs':'Nábytok stojí na schodoch alebo v otvore nad nimi','fixture-missing':r+' – chýba '+(NEED[x.need]||x.need),'fixture-secondary':r+' – chýba '+(NEED[x.need]||x.need),'kitchen-short':r+' – krátka linka ('+String(x.len).replace('.',',')+' m)','scale-guess':'Mierka je odhadnutá – overte jeden známy rozmer <button class="chkb" data-k="cal">Kalibrovať</button>','scale-implausible':'Mierka je asi malá: '+x.n+' miestnosti sú na svoj účel príliš malé. Zväčšiť ×'+String(x.f).replace('.',',')+'? <button class="chkb" data-k="sc" data-f="'+x.f+'">Zväčšiť</button> <button class="chkb" data-k="cal">Kalibrovať</button>'}[x.id]||x.id)+(/^(opening-height|door-into-wall|door-between-nothing|upper-door-to-nowhere)$/.test(x.id)?' <small>· opraví sa pri 3D</small>':'');}
let chkT=0;function chkSoon(){clearTimeout(chkT);chkT=setTimeout(chkUI,700);}
function chkUI(){const b=$('chk');if(!b)return;let o=[];try{o=H&&H.walls&&H.walls.length?rulesCheck():[];}catch(e){console.warn(e);}const h=o.filter(x=>x.sev==='hard'),s=o.filter(x=>x.sev!=='hard');
 b.hidden=!(H&&H.walls&&H.walls.length>2);b.classList.toggle('w',!!h.length);b.innerHTML='<i class="d"></i>'+(o.length?'Kontrola · '+o.length:'Kontrola: v poriadku');
 const L=$('chkl');L.innerHTML=o.length?(h.length?'<b>Treba opraviť</b>'+h.map(x=>'<p class="h">'+chkMsg(x)+'</p>').join(''):'')+(s.length?'<b>Na zváženie</b>'+s.map(x=>'<p class="s">'+chkMsg(x)+'</p>').join(''):'')+'<p><small>Pri generovaní 3D sa časť opraví automaticky.</small></p>':'<p><small>Dvere, schody, miestnosti a vybavenie dávajú zmysel.</small></p>';}
$('chk')&&($('chk').onclick=e=>{e.stopPropagation();$('chkl').hidden=!$('chkl').hidden;});$('chkl')&&($('chkl').onclick=e=>{const b=e.target.closest('.chkb');if(!b)return;$('chkl').hidden=true;if(b.dataset.k==='cal')$('cal').click();if(b.dataset.k==='sc'){const f=+b.dataset.f;scaleBy(f);H.walls.forEach(w=>(w.openings||[]).forEach(o=>{o.offset=Math.round(o.offset*f*100)/100;o.width=Math.round(o.width*f*100)/100;}));save();const had=(H.furn||[]).some(q=>q.level===lvl);if(had){H.fv=((H.fv||1)+3)%4;furnish();}draw();toast('Mierka zväčšená ×'+String(f).replace('.',',')+'. Späť ju vráti.','ok');}});document.addEventListener('pointerdown',e=>{const L=$('chkl');if(L&&!L.hidden&&!L.contains(e.target)&&e.target!==$('chk'))L.hidden=true;});
window.__rules=()=>{const o=rulesCheck();return{hard:o.filter(x=>x.sev==='hard'),soft:o.filter(x=>x.sev==='soft')};};window.__rulesFix=rulesFix;

// ---- look panel
$('lookb').onclick=e=>{e.stopPropagation();$('look').classList.toggle('open');};document.addEventListener('pointerdown',e=>{const L=$('look');if(L.classList.contains('open')&&!L.contains(e.target)&&e.target!==$('lookb')&&!$('lookb').contains(e.target))L.classList.remove('open');});
$('edmb').onclick=e=>{e.stopPropagation();$('edm').classList.toggle('open');};document.addEventListener('pointerdown',e=>{const L=$('edm');if(L.classList.contains('open')&&!L.contains(e.target)&&!$('edmb').contains(e.target))L.classList.remove('open');});
// ---- presentation
let TOUR=0,TON=false;
function agentHtml(){const g=H.agent||{};if(!g.name&&!g.phone&&!g.logo)return'';return(g.logo?'<img src="'+esc(g.logo)+'" alt="">':'')+'<div><b>'+esc(g.name||'')+'</b>'+(g.firm?'<span>'+esc(g.firm)+'</span>':'')+(g.phone?'<a href="tel:'+esc(g.phone.replace(/\s/g,''))+'">'+esc(g.phone)+'</a>':'')+(g.email?'<a href="mailto:'+esc(g.email)+'">'+esc(g.email)+'</a>':'')+'</div>';}
async function presOn(auto){document.body.classList.add('pres');$('prn').textContent=H.name||'';const ag=agentHtml();$('agent').innerHTML=ag;$('agent').hidden=!ag;$('look').classList.remove('open');dispatchEvent(new Event('resize'));if(!$('vw').classList.contains('on'))show('vw');await gen(false);const m=await v3();m.setWalk(false);wUI(false);jumpsUI(true);if(auto)tour();}
async function presOff(){stopTour();document.body.classList.remove('pres');dispatchEvent(new Event('resize'));const m=await v3();if(m.isWalk()){m.setWalk(false);wUI(false);}else jumpsUI(false);m.resize&&m.resize();}
function stopTour(){TOUR++;TON=false;$('ptour').innerHTML=I.next+'<span>Auto-prehliadka</span>';v3().then(m=>m.setAuto(false));}
async function tour(){const id=++TOUR,m=await v3(),wait=ms=>new Promise(r=>setTimeout(r,ms)),alive=()=>id===TOUR;TON=true;$('ptour').innerHTML=I.x+'<span>Zastaviť</span>';
 m.setWalk(false);wUI(false);jumpsUI(true);if(m.snapBuild)m.snapBuild();
 // slow exterior orbit intro
 if(m.setSun)m.setSun(16.5,false);if(m.playCam)m.playCam('orbit',0.55,{dur:10,loop:false});else m.setAuto(true,0.45);
 await wait(10000);if(m.stopCam)m.stopCam();m.setAuto(false);if(!alive())return;
 // room jumps with gentle spin
 const bs=[...$('jumps').querySelectorAll('button')];for(const b of bs){if(!alive())return;b.click();bs.forEach(x=>x.classList.toggle('on',x===b));const t0=performance.now();while(alive()&&performance.now()-t0<4800){m.spin(.008);await wait(16);}}
 if(!alive())return;
 // dollhouse peek then slow exterior finale
 if(m.dollhouse){m.dollhouse(true);await wait(4500);if(!alive())return;m.dollhouse(false);await wait(800);}
 if(!alive())return;m.setWalk(false);wUI(false);jumpsUI(true);
 if(m.playCam)m.playCam('orbit',0.4,{dur:14,loop:true});else m.setAuto(true,0.35);
 await wait(12000);if(!alive())return;if(m.stopCam)m.stopCam();stopTour();}
$('ptour').onclick=()=>TON?stopTour():tour();
$('pext').onclick=async()=>{stopTour();const m=await v3();if(m.dollhouse)m.dollhouse(false);m.setWalk(false);wUI(false);jumpsUI(true);};
var DOLL_ON=false;$('pdoll')&&($('pdoll').onclick=async()=>{stopTour();const m=await v3();DOLL_ON=!DOLL_ON;if(m.dollhouse)m.dollhouse(DOLL_ON);else{roof=DOLL_ON?'none':(H&&H.roof)||'gable';$('roof').value=roof;gen(false);}wUI(false);jumpsUI(true);});
$('doll')&&($('doll').onclick=async()=>{stopTour();const m=await v3();if(m.isWalk())m.setWalk(false);DOLL_ON=true;if(m.dollhouse)m.dollhouse(true);wUI(false);});
$('pexit').onclick=presOff;$('pres').onclick=()=>presOn(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('pres')&&!document.body.classList.contains('viewonly'))presOff();});
async function agentDlg(){const g=H.agent||{};const r=await dlg('Prezentácia – kontakt makléra','<p>Zobrazí sa v režime Prezentácia a v zdieľanom odkaze.</p><label>Meno<input name="name" value="'+esc(g.name||'')+'"></label><label>Realitná kancelária<input name="firm" value="'+esc(g.firm||'')+'"></label><label>Telefón<input name="phone" type="tel" value="'+esc(g.phone||'')+'"></label><label>E-mail<input name="email" type="email" value="'+esc(g.email||'')+'"></label><label>Logo (obrázok)<input name="logo" type="file" accept="image/*"></label>'+(g.logo?'<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="rmlogo" style="width:auto"> odstrániť logo</label>':''),[['Zrušiť',null],['Uložiť',1,'go','check']]);if(!r||!r.v)return;
 const f=r.f,fi=document.querySelector('.dlg input[name=logo]')?.files?.[0]||r.file;let logo=f.rmlogo?'':g.logo||'';const inp=window.__lastLogo;if(inp){logo=inp;window.__lastLogo=null;}
 H.agent={name:(f.name||'').trim().slice(0,60),firm:(f.firm||'').trim().slice(0,60),phone:(f.phone||'').trim().slice(0,30),email:(f.email||'').trim().slice(0,80),logo};save();toast('Kontakt makléra uložený.','ok');}
document.addEventListener('change',e=>{if(e.target.name!=='logo'||!e.target.files[0])return;const im=new Image();im.onload=()=>{const k=Math.min(1,96/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);window.__lastLogo=(()=>{const w=c.toDataURL('image/webp',.8);return w.startsWith('data:image/webp')?w:c.toDataURL('image/png');})();URL.revokeObjectURL(im.src);};im.src=URL.createObjectURL(e.target.files[0]);});

const TUT=[['.grp:has([data-t])','Nástroje',(matchMedia('(pointer:coarse)').matches?'Ťahaním prsta':'Ťahaním myši')+' nakreslíte stenu. Ďalej tu sú dvere, okná, schody, nábytok a meranie.'],['#upl','Nahrajte pôdorys','Vložte obrázok alebo PDF pôdorysu a Vkroč ho rozpozná za vás.'],['#edmb','Ďalšie možnosti','Hrúbka stien, šikmé steny, pozemok a mierka.'],['[data-s=vw]','3D prehliadka','Prepnite do 3D: prechádzajte sa po izbách, meňte vzhľad, spustite Prezentáciu a zdieľajte odkaz klientovi.'],['#menu','Projekt','Projekty, export do PDF, kontakt makléra a tento návod.']];
function tut(T=TUT,key='vkTut'){document.getElementById('tutx')?.remove();const st=T.filter(t=>{const e=document.querySelector(t[0]);if(!e)return 0;const r=e.getBoundingClientRect();return r.width>0&&r.right>0&&r.left<innerWidth;});if(!st.length)return;let i=0;
 const w=document.createElement('div');w.id='tutx';w.innerHTML='<div class="tdm"></div><div class="tsp"></div><div class="tbx"><b></b><p></p><div class="tft"><span></span><button class="ts">Preskočiť</button><button class="tn">Ďalej</button></div></div>';document.body.appendChild(w);
 const end=()=>{localStorage[key]=1;w.remove();removeEventListener('resize',show);};
 function show(){const t=st[i],e=document.querySelector(t[0]),r=e.getBoundingClientRect(),sp=w.querySelector('.tsp'),bx=w.querySelector('.tbx');
  Object.assign(sp.style,{left:r.left-6+'px',top:r.top-6+'px',width:r.width+12+'px',height:r.height+12+'px'});const X=r.left-6,Y=r.top-6,W=r.width+12,Hh=r.height+12,V=innerWidth,U=innerHeight;w.querySelector('.tdm').style.clipPath=`path(evenodd,'M0 0H${V}V${U}H0Z M${X} ${Y}H${X+W}V${Y+Hh}H${X}Z')`;
  bx.querySelector('b').textContent=t[1];bx.querySelector('p').textContent=t[2];bx.querySelector('span').textContent=(i+1)+' / '+st.length;w.querySelector('.tn').textContent=i===st.length-1?'Hotovo':'Ďalej';
  const bw=Math.min(300,innerWidth-24),below=r.bottom+170<innerHeight;bx.style.width=bw+'px';bx.style.left=Math.max(12,Math.min(innerWidth-bw-12,r.left+r.width/2-bw/2))+'px';bx.style.top=(below?r.bottom+16:Math.max(12,r.top-16-bx.offsetHeight))+'px';}
 w.querySelector('.tn').onclick=()=>{if(++i>=st.length)end();else show();};w.querySelector('.ts').onclick=end;addEventListener('resize',show);show();}
window.tut=tut;
function tutWait(n=0,T=TUT,key='vkTut'){if(localStorage[key]||document.getElementById('tutx')||n>60)return;if(H&&(H.underlay||H.walls.some(w=>w.auto)))return;/* prem8: never cover a recognised plan or its 3D result with onboarding (menu still opens it) */const ok=document.getElementById(T===TUT?'ed':'vw').classList.contains('on')&&!document.getElementById('sk3').offsetParent&&!document.getElementById('ov').classList.contains('on')&&!document.body.classList.contains('pres');if(ok&&n>2)tut(T,key);else setTimeout(()=>tutWait(n+1,T,key),400);}

/* Marketing / Social capture — URL params only (hidden from normal UI)
   ?clean=1          hide all UI, cursor, toasts
   &cam=orbit|dollhouse|walk|descend|interior|reveal
   &speed=0.5        camera path speed multiplier
   &w=1080&h=1920    fixed canvas (portrait 1080x1920 or 2160x3840)
   &demo=1           auto-open premium demo + 3D
   &tour=1           start auto-tour after load
   &door=closed      walk: front door starts shut, opens ~1.5 m from cam
*/
async function mktBoot(){
  const q=new URLSearchParams(location.search);if(![...q.keys()].some(k=>['clean','cam','w','h','demo','tour','speed','grow','door'].includes(k)))return;
  try{localStorage.vkTut=1;localStorage.vkTut3=1;document.getElementById('tutx')?.remove();}catch(e){}
  const clean=q.get('clean')==='1',cam=q.get('cam'),speed=+q.get('speed')||1,w=+q.get('w')||0,h=+q.get('h')||0;
  const doorClosed=q.get('door')==='closed';
  if(q.get('demo')==='1'||cam||clean||(w&&h)){
    window.__mktBusy=1;
    try{demoNew();}catch(e){console.error(e);}
    show('vw');
    const m0=await v3();
    if(m0.setDoorMode)m0.setDoorMode(doorClosed?'closed':'open');
    if(m0.setMktGlass)m0.setMktGlass(!!(clean||q.get('demo')==='1'));
    // Finished house for capture — never leave mid wall-growth
    await gen(false);
  }
  const m=await v3();
  if(m.setDoorMode)m.setDoorMode(doorClosed?'closed':'open');
  if(m.setMktGlass)m.setMktGlass(!!(clean||q.get('demo')==='1'));
  if(m.snapBuild)m.snapBuild();
  window.__mktBusy=0;
  // QA / Social capture hooks (URL marketing only)
  window.__vk={m,playCam:(k,s,e)=>m.playCam(k,s,e),scrub:(u)=>m.scrubCam&&m.scrubCam(u),count:()=>m.countFurn&&m.countFurn(),snap:()=>m.snapBuild&&m.snapBuild(),debug:()=>m.debugViz&&m.debugViz(),doll:on=>m.dollhouse(on),walk:v=>m.setWalk(v),jump:(x,z)=>m.jump&&m.jump(x,z,1.55),stop:()=>m.stopCam&&m.stopCam(),clearance:()=>m.checkClearances&&m.checkClearances(),bird:(x,z,h)=>m.birdCam&&m.birdCam(x,z,h),pause:on=>m.pauseCam&&m.pauseCam(on)};
  if(w&&h){m.setCanvasSize(w,h);document.documentElement.classList.add('mkt-fixed');
    let s=document.getElementById('mktcss');if(!s){s=document.createElement('style');s.id='mktcss';document.head.appendChild(s);}
    s.textContent=`html.mkt-fixed #v3{width:${w}px!important;height:${h}px!important;max-width:none!important;margin:0 auto;}html.mkt-fixed #vw{display:flex;align-items:center;justify-content:center;background:#0b0c0e;}`;
  }
  if(clean){try{document.querySelectorAll('.tut,#tut,#tutx,.tw').forEach(e=>e.remove());localStorage.vkTut=1;localStorage.vkTut3=1;}catch(e){}document.documentElement.classList.add('mkt-clean');
    let s=document.getElementById('mktcss2');if(!s){s=document.createElement('style');s.id='mktcss2';document.head.appendChild(s);}
    s.textContent=`html.mkt-clean #hdr,html.mkt-clean header,html.mkt-clean .seg,html.mkt-clean #tbed,html.mkt-clean #tbvw,html.mkt-clean #st,html.mkt-clean #joy,html.mkt-clean #jumps,html.mkt-clean #pbar,html.mkt-clean #agent,html.mkt-clean #look,html.mkt-clean .toast,html.mkt-clean #ov,html.mkt-clean #tut,html.mkt-clean #tutx,html.mkt-clean #sk3{display:none!important;opacity:0!important;pointer-events:none!important}
      html.mkt-clean,html.mkt-clean body,html.mkt-clean #vw{cursor:none!important;background:#0b0c0e;}html.mkt-clean #v3,html.mkt-clean canvas{cursor:none!important;}
      html.mkt-clean .toast,html.mkt-clean #hdr,html.mkt-clean #pname,html.mkt-clean #jumps button{visibility:hidden!important;display:none!important;}`;
    window.toast=()=>{};
  }
  try{document.querySelectorAll('.tut,.toast,#tut,#tutx').forEach(e=>e.remove());localStorage.vkTut=1;localStorage.vkTut3=1;}catch(e){}
  m.setWalk(false);wUI(false);jumpsUI(true);
  if(cam&&m.playCam){await new Promise(r=>setTimeout(r,900));
    if(cam==='interior'){const bed=q.get('room')==='bed';m.playCam('interior',speed,bed?{x:11.2,z:3.2,tx:12.5,tz:1.6}:{x:4.0,z:7.2,tx:6.2,tz:5.0});}
    else m.playCam(cam,speed,{loop:cam==='orbit',dur:cam==='orbit'?16:cam==='dollhouse'?4:cam==='reveal'?8:cam==='walk'?12:12});
  }
  else if(q.get('tour')==='1'){await new Promise(r=>setTimeout(r,800));tour();}
}
try{const _q=new URLSearchParams(location.search);if(_q.get('clean')==='1'||_q.get('demo')==='1'||_q.get('cam')){localStorage.vkTut=1;localStorage.vkTut3=1;}}catch(e){}
setTimeout(()=>mktBoot().catch(e=>console.warn('mkt',e)),200);

const TUT3=[['#modes','Režimy','Exteriér = dom zvonku, Bez strechy = vidno všetky izby, Prechádzka = kráčate po dome, VR = v okuliaroch Meta Quest.'],['#jumps','Miestnosti','Ťuknutím sa presuniete priamo do miestnosti.'],['#lookb','Vzhľad','Štýl interiéru jedným kliknutím, farby stien, fasády, strechy a podlahy.'],['#pres','Prezentácia','Čistý režim na celú obrazovku s automatickou prehliadkou a kontaktom makléra.'],['#share','Zdieľať','Odkaz pre klienta – otvorí sa rovno prezentácia.']];
