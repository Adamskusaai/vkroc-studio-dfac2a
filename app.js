import {detectWalls,gapMerge} from './cv.js?v=20261112j';
import {readPlan} from './plan.js?v=20261121r';
import {makeRoom,layoutRoom,validateRoom,sanitizeOpenings,DIM3} from './layout.js?v=20261121t';
import {I,paint} from './icons.js?v=20261112j';
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
let H,undo=[],tool='wall',bg=null,bgW=12,view={x:-1,y:-1,s:50},drag=null,PID=null,obl=false;window.__getH=()=>H;window.__view=()=>view;window.__rooms=()=>rooms().map(r=>({n:r.n,a:+r.a.toFixed(1),p:r.p}));
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
function fit(){const r=cv.getBoundingClientRect();view.u=0;cv.width=Math.round(r.width*devicePixelRatio);cv.height=Math.round(r.height*devicePixelRatio);
 let xs=[0,10],zs=[0,8];if(bg&&bg.width){xs.push(0,bgW);zs.push(0,bgW*bg.height/bg.width);}H.walls.forEach(w=>{xs.push(w.start[0],w.end[0]);zs.push(w.start[1],w.end[1]);});if(H.plot)H.plot.pts.forEach(p=>{xs.push(p[0]);zs.push(p[1]);});
 const pd=1.2,x0=Math.min(...xs)-pd,x1=Math.max(...xs)+pd,z0=Math.min(...zs)-pd,z1=Math.max(...zs)+pd;view.s=Math.min(cv.width/(x1-x0),cv.height/(z1-z0));view.x=x0-(cv.width/view.s-(x1-x0))/2;view.y=z0-(cv.height/view.s-(z1-z0))/2;draw();}
const toS=p=>[(p[0]-view.x)*view.s,(p[1]-view.y)*view.s],toW=e=>{const r=cv.getBoundingClientRect(),kx=r.width?cv.width/r.width:devicePixelRatio,ky=r.height?cv.height/r.height:devicePixelRatio;return[(e.clientX-r.left)*kx/view.s+view.x,(e.clientY-r.top)*ky/view.s+view.y];};
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
function rooms(L=lvl){const ws=H.walls.filter(w=>w.level===L),k=JSON.stringify([ws.map(w=>[w.start,w.end,w.thickness]),H.rlab||[],H.rarea||[],!!(globalThis.__PF||{}).noOpenZones]);const C=RC[L];if(C&&C.k===k)return nameR(C,L);const R={k,r:[]};RC[L]=R;if(ws.length<3)return R.r;
 const c=.1;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;ws.forEach(w=>[w.start,w.end].forEach(p=>{x0=Math.min(x0,p[0]);z0=Math.min(z0,p[1]);x1=Math.max(x1,p[0]);z1=Math.max(z1,p[1]);}));x0-=.5;z0-=.5;
 const W=Math.ceil((x1-x0+.5)/c)+1,Hh=Math.ceil((z1-z0+.5)/c)+1;if(W*Hh>4e6)return R.r;const g=new Int32Array(W*Hh);Object.assign(R,{g,W,Hh,x0,z0,c});
 ws.forEach(w=>{const G=geo(w),t=Math.max(w.thickness/2,.06),n=Math.ceil(G.L/(c/2))+1;for(let i=0;i<=n;i++){const s=G.L*i/n;for(let q=-t;q<=t+1e-9;q+=c/2){const x=G.x0+G.u[0]*s-G.u[1]*q,z=G.z0+G.u[1]*s+G.u[0]*q,ix=Math.round((x-x0)/c),iz=Math.round((z-z0)/c);if(ix>=0&&iz>=0&&ix<W&&iz<Hh)g[iz*W+ix]=-1;}}});
 const fl=(s,id)=>{const st=[s];g[s]=id;let n=0,sx=0,sz=0,edge=false,b=[1e9,1e9,-1e9,-1e9];while(st.length){const i=st.pop(),x=i%W,z=(i/W)|0;n++;sx+=x;sz+=z;if(x<b[0])b[0]=x;if(z<b[1])b[1]=z;if(x>b[2])b[2]=x;if(z>b[3])b[3]=z;if(!x||!z||x===W-1||z===Hh-1)edge=true;for(const j of[x>0?i-1:-1,x<W-1?i+1:-1,z>0?i-W:-1,z<Hh-1?i+W:-1])if(j>=0&&!g[j]){g[j]=id;st.push(j);}}return{n,sx,sz,edge,b};};
 let id=1;R.out=new Set();for(let i=0;i<g.length;i++)if(!g[i]){const r=fl(i,++id);if(r.edge)R.out.add(id);if(!r.edge&&(r.n*c*c>=1.5||(r.n*c*c>=.6&&Math.min(r.b[2]-r.b[0],r.b[3]-r.b[1])*c>=.45&&smallHasDoor(ws,[x0+r.b[0]*c,z0+r.b[1]*c,x0+r.b[2]*c,z0+r.b[3]*c],L)))){let px=x0+r.sx/r.n*c,pz=z0+r.sz/r.n*c;const ci=Math.round((pz-z0)/c)*W+Math.round((px-x0)/c);if(g[ci]!==id){const q=cellIn(R,id);px=q[0];pz=q[1];}R.r.push({id,a:r.n*c*c,p:[px,pz],bb:[x0+r.b[0]*c,z0+r.b[1]*c,x0+r.b[2]*c,z0+r.b[3]*c]});}}
 splitOpenZones(R,L,ws);return nameR(R,L);}
// LOGIC RULE (tiny rooms): an enclosed pocket of 0.6–1.5 m² (≥0.45 m wide inside) that has its own door (a narrow WC, a pantry) is a room, not a hole/outside — only when a room name/label (WC, komora…) sits inside it, so wall-tracing artefacts stay ignored
function smallHasDoor(ws,bb,L){const inb=e=>e.level===L&&e.p[0]>bb[0]&&e.p[0]<bb[2]&&e.p[1]>bb[1]&&e.p[1]<bb[3];if(!(H.rn||[]).some(inb)&&!(H.rlab||[]).some(e=>inb(e)&&/WC|Komora|Šatn|Špajz|Sklad/i.test(e.n||'')))return false;return ws.some(w=>{const G=geo(w);return(w.openings||[]).some(o=>{if(o.type!=='door')return false;const s=o.offset+o.width/2,x=G.x0+G.u[0]*s,z=G.z0+G.u[1]*s;return x>bb[0]-.35&&x<bb[2]+.35&&z>bb[1]-.35&&z<bb[3]+.35;});});}
function cellIn(R,id){let best=null,bd=-1;const{g,W,Hh,x0,z0,c}=R;for(let z=1;z<Hh-1;z+=2)for(let x=1;x<W-1;x+=2){const i=z*W+x;if(g[i]!==id)continue;let d=0;while(d<40&&g[i-d]===id&&g[i+d]===id&&g[i-d*W]===id&&g[i+d*W]===id)d++;if(d>bd){bd=d;best=[x0+x*c,z0+z*c];}}return best||[x0,z0];}
/* v18i: a printed label drawn over a (spurious) wall belongs to the nearest room cell (<= 0.5 m) */
function roomAtL(R,p){const id=roomAt(R,p);if(id!==-1||!R)return id;for(let d=.1;d<=.5;d+=.1)for(const[dx,dz]of[[d,0],[-d,0],[0,d],[0,-d],[d,d],[-d,-d],[d,-d],[-d,d]]){const q=roomAt(R,[p[0]+dx,p[1]+dz]);if(q>1)return q;}return id;}
function roomAt(R,p){if(!R||!R.g)return 0;const ix=Math.round((p[0]-R.x0)/R.c),iz=Math.round((p[1]-R.z0)/R.c);if(ix<0||iz<0||ix>=R.W||iz>=R.Hh)return 0;return R.g[iz*R.W+ix];}
const RN=['Obývačka','Obývačka s kuchyňou','Kuchyňa','Jedáleň','Spálňa','Detská izba','Izba','Pracovňa','Kúpeľňa','WC','Chodba','Predsieň','Šatník','Komora','Technická miestnosť','Garáž','Terasa'];
// prem8: house-level room types. Priority: user name > label read from the plan > one consistent assignment for the whole
// floor (≤1 kitchen per unit, bathroom next to the WC, corridor-like rooms = hall, largest = living, entrance room = predsieň)
function roomDoors(R,L){const out=[];H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w);(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s],n=[-G.u[1],G.u[0]],e=w.thickness/2+.25;
 const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);out.push({c,w:o.width,u:G.u,a:a>0?a:0,b:b>0?b:0});});});return out;}

/* RULE (open-zones): an open-plan space read as one room (2+ printed living/dining/kitchen
   labels, or a large room holding 2+ printed areas that sum to its polygon) is split into
   virtual zones. Seeds are the label / area positions; wall stubs and columns steer the cut;
   zone areas follow the printed targets. No wall is added - the 3D stays open; naming, floor
   area and furnishing follow the zones. PF.noOpenZones. audit: open-zones */
function openKind(n){return /^Obýva/.test(n||'')?'liv':/^Kuchyň/.test(n||'')?'kit':/^Jedáleň/.test(n||'')?'din':'';}
function openZoneCands(R,L){if(!R||!R.g||!R.r)return[];const out=[];
 R.r.forEach(r=>{const labs=(H.rlab||[]).filter(l=>l.level===L&&l.p&&openKind(l.n)&&roomAtL(R,l.p)===r.id);
  const raw=(H.rarea||[]).filter(a=>a.level===L&&a.p&&a.v>=3&&a.v<200&&roomAtL(R,a.p)===r.id);
  const seeds=[];const take=(p,v,n)=>{if(!seeds.some(s=>Math.hypot(s.p[0]-p[0],s.p[1]-p[1])<.45&&Math.abs((s.v||0)-(v||0))<.3&&(s.n||'')===(n||'')))seeds.push({p:[p[0],p[1]],v:v||0,n:n||''});};
  labs.forEach(l=>{const a=raw.map(q=>({q,d:Math.hypot(q.p[0]-l.p[0],q.p[1]-l.p[1])})).sort((x,y)=>x.d-y.d)[0];take(l.p,a&&a.d<2.2?a.q.v:0,l.n);});
  const used=new Set(seeds.map(s=>seeds.indexOf(s)));
  /* unnamed printed areas: keep substantial ones (a stray 1.6 m² dimension is not a zone) */
  const rest=raw.filter(a=>!seeds.some(s=>Math.hypot(s.p[0]-a.p[0],s.p[1]-a.p[1])<.8&&Math.abs((s.v||0)-a.v)<.4)).filter(a=>a.v>=5);
  rest.forEach(a=>take(a.p,a.v,''));
  if(seeds.length<2)return;
  const named=seeds.filter(s=>openKind(s.n)).length;
  const withA=seeds.filter(s=>s.v>=5);
  let pick=seeds;
  if(withA.length>=2){let best=null;const n=withA.length;
   for(let m=2;m<=n;m++){const idx=[...Array(n).keys()];const rec=(i,cur)=>{if(cur.length===m){const sum=cur.reduce((s,j)=>s+withA[j].v,0),e=Math.abs(sum-r.a)/Math.max(r.a,1);if(e<=.3&&(!best||e<best.e-1e-6||(Math.abs(e-best.e)<1e-6&&m>best.m)))best={e,m,cur:cur.slice()};return;}for(let j=i;j<n;j++){cur.push(j);rec(j+1,cur);cur.pop();}};rec(0,[]);if(m===n)break;}
   if(best){const keep=new Set(best.cur.map(j=>withA[j]));pick=seeds.filter(s=>openKind(s.n)||(s.v>=5&&[...keep].some(k=>k===s||(Math.abs(k.v-s.v)<.05&&Math.hypot(k.p[0]-s.p[0],k.p[1]-s.p[1])<.2))));}}
  if(pick.length<2)return;
  const vs=pick.filter(s=>s.v>=5).map(s=>s.v).sort((a,b)=>b-a);
  const openN=pick.filter(s=>openKind(s.n)).map(s=>openKind(s.n));
  const uniq=[...new Set(openN)];
  const hasKit=pick.some(s=>openKind(s.n)==='kit'||(s.v>=5&&s.v<=14));
  const ratio=vs.length>=2?vs[0]/vs[vs.length-1]:1;
  const livish=r.a>=18||/^Obýva|^Kuchyň/.test(r.n||'');
  if(!(uniq.length>=2||(livish&&pick.length>=2&&(uniq.length>=1||(hasKit&&(ratio>=1.3||pick.length>=3))||(vs.length>=3)))))return;
  out.push({r,seeds:pick});});
 return out;}
function zoneAdj(R){const pairs=[],seen=new Set(),zg={};(R.r||[]).forEach(q=>{if(q.zg)zg[q.id]=q.zg;});if(!R||!R.g||!Object.keys(zg).length)return pairs;
 const{g,W,Hh}=R;for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){const a=g[z*W+x];if(!zg[a])continue;for(const[dx,dz]of[[1,0],[0,1]]){const x2=x+dx,z2=z+dz;if(x2>=W||z2>=Hh)continue;const b=g[z2*W+x2];if(!zg[b]||b===a||zg[b]!==zg[a])continue;const k=a<b?a+','+b:b+','+a;if(seen.has(k))continue;seen.add(k);pairs.push([a,b]);}}return pairs;}
function zoneTouch(R,id){return zoneAdj(R).some(([a,b])=>a===id||b===id);}
function openZoneCell(R,id,p){const{g,W,Hh,x0,z0,c}=R;let ix=Math.round((p[0]-x0)/c),iz=Math.round((p[1]-z0)/c);
 if(ix>=0&&iz>=0&&ix<W&&iz<Hh&&g[iz*W+ix]===id)return iz*W+ix;let best=-1,bd=1e9;
 for(let d=1;d<=16;d++){for(let dz=-d;dz<=d;dz++)for(let dx=-d;dx<=d;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==d)continue;const x=ix+dx,z=iz+dz;if(x<0||z<0||x>=W||z>=Hh)continue;const i=z*W+x;if(g[i]!==id)continue;const dd=dx*dx+dz*dz;if(dd<bd){bd=dd;best=i;}}if(best>=0)return best;}return -1;}
function stubBarriers(R,id,ws){const{g,W,Hh,x0,z0,c}=R,bar=new Uint8Array(g.length);
 const dist=(p,w)=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l=Math.hypot(dx,dz)||1e-9,t=Math.max(0,Math.min(l,(p[0]-w.start[0])*dx/l+(p[1]-w.start[1])*dz/l));return Math.hypot(p[0]-w.start[0]-dx/l*t,p[1]-w.start[1]-dz/l*t)-(w.thickness||.2)/2;};
 const paint=(x,z)=>{const ix=Math.round((x-x0)/c),iz=Math.round((z-z0)/c);if(ix<0||iz<0||ix>=W||iz>=Hh)return 0;const i=iz*W+ix;if(g[i]===-1)return -1;if(g[i]!==id)return 0;bar[i]=1;return 1;};
 ws.forEach(w=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l=Math.hypot(dx,dz);if(l<.2)return;const u=[dx/l,dz/l];
  /* a short wall / column: extend both along and across, so a pillar steers the cut */
  const col=l<.55;[[w.end,u],[w.start,[-u[0],-u[1]]]].forEach(([e,d])=>{const free=!ws.some(o=>o!==w&&dist(e,o)<=.12);
   if(!free&&!col)return;const dirs=col?[[d[0],d[1]],[-d[1],d[0]],[d[1],-d[0]]]:[[d[0],d[1]]];
   dirs.forEach(dir=>{for(let s=.1;s<=(col?3.5:6);s+=c){const h=paint(e[0]+dir[0]*s,e[1]+dir[1]*s);if(h<=0)break;}});});});
 return bar;}
function nameOpenSeeds(seeds,R,L,RS,room){const used=new Set(seeds.map(s=>openKind(s.n)).filter(Boolean));
 const wetPts=[];(H.rlab||[]).forEach(l=>{if(l.level===L&&/Kúpeľ|WC|Kúpel/.test(l.n||''))wetPts.push(l.p);});
 RS.forEach(q=>{if(q.id!==room.id&&q.a>=2&&q.a<=12&&(q.bb[0]<room.bb[2]+.4&&q.bb[2]>room.bb[0]-.4&&q.bb[1]<room.bb[3]+.4&&q.bb[3]>room.bb[1]-.4))wetPts.push(q.p);});
 const dW=s=>{if(!wetPts.length)return 9;return Math.min(...wetPts.map(p=>Math.hypot(p[0]-s.p[0],p[1]-s.p[1])));};
 const rest=()=>seeds.filter(s=>!openKind(s.n));
 if(!used.has('kit')){const c=rest().filter(s=>!s.v||(s.v>=4.5&&s.v<=16)).sort((a,b)=>dW(a)-dW(b)||(a.v||9)-(b.v||9))[0];if(c)c.n='Kuchyňa';}
 if(!used.has('liv')){const c=rest().slice().sort((a,b)=>(b.v||0)-(a.v||0))[0];if(c)c.n='Obývačka';}
 if(!used.has('din')){const c=rest().filter(s=>!s.v||s.v>=7).sort((a,b)=>(b.v||0)-(a.v||0))[0]||rest()[0];if(c)c.n='Jedáleň';}
 seeds.forEach(s=>{if(!s.n)s.n='Miestnosť';});}
function roomFromCells(R,id){const{g,W,Hh,x0,z0,c}=R;let n=0,sx=0,sz=0,b=[1e9,1e9,-1e9,-1e9];
 for(let i=0;i<g.length;i++){if(g[i]!==id)continue;const x=i%W,z=(i/W)|0;n++;sx+=x;sz+=z;if(x<b[0])b[0]=x;if(z<b[1])b[1]=z;if(x>b[2])b[2]=x;if(z>b[3])b[3]=z;}
 if(!n)return null;let px=x0+sx/n*c,pz=z0+sz/n*c;const ci=Math.round((pz-z0)/c)*W+Math.round((px-x0)/c);if(g[ci]!==id){const q=cellIn(R,id);px=q[0];pz=q[1];}
 return{id,a:n*c*c,p:[px,pz],bb:[x0+b[0]*c,z0+b[1]*c,x0+b[2]*c,z0+b[3]*c]};}
function splitOneZone(R,room,seeds,bar){const{g,W,Hh,c}=R,id0=room.id,nS=seeds.length;
 const sc=seeds.map(s=>openZoneCell(R,id0,s.p));if(sc.some(i=>i<0))return 0;
 const INF=1e9,dist=new Float64Array(g.length),own=new Int32Array(g.length);dist.fill(INF);own.fill(-1);
 const Q=[];sc.forEach((i,si)=>{dist[i]=0;own[i]=si;Q.push(i);});
 for(let qi=0;qi<Q.length;qi++){const i=Q[qi],x=i%W,z=(i/W)|0,d0=dist[i];
  for(const j of[x>0?i-1:-1,x<W-1?i+1:-1,z>0?i-W:-1,z<Hh-1?i+W:-1]){if(j<0||g[j]!==id0)continue;const nd=d0+1+(bar[j]?14:0);if(nd<dist[j]-1e-9){dist[j]=nd;own[j]=own[i];Q.push(j);}}}
 /* if stubs fenced a seed off, relax barriers for unreached cells */
 let missed=0;for(let i=0;i<g.length;i++)if(g[i]===id0&&own[i]<0){missed=1;break;}
 if(missed){const Q2=[];for(let i=0;i<g.length;i++)if(g[i]===id0&&own[i]>=0)Q2.push(i);
  for(let qi=0;qi<Q2.length;qi++){const i=Q2[qi],x=i%W,z=(i/W)|0;for(const j of[x>0?i-1:-1,x<W-1?i+1:-1,z>0?i-W:-1,z<Hh-1?i+W:-1]){if(j<0||g[j]!==id0||own[j]>=0)continue;own[j]=own[i];dist[j]=dist[i]+1;Q2.push(j);}}}
 /* nudge the border so each zone matches its printed area (scaled to the real polygon; keep 4-connected) */
 const tgt=seeds.map(s=>s.v>=5?s.v:0);if(tgt.some(v=>v)&&tgt.filter(v=>v).length>=2){
  const cells=[[],[],[],[],[],[],[],[]];let tot=0;for(let i=0;i<g.length;i++)if(g[i]===id0&&own[i]>=0){(cells[own[i]]=cells[own[i]]||[]).push(i);tot++;}
  const sumT=tgt.reduce((s,v)=>s+v,0);if(sumT>0){const sc=tot*c*c/sumT;for(let i=0;i<tgt.length;i++)if(tgt[i])tgt[i]*=sc;}
  const area=si=>(cells[si]||[]).length*c*c;
  const nbrs=i=>{const x=i%W,z=(i/W)|0,o=[];if(x>0)o.push(i-1);if(x<W-1)o.push(i+1);if(z>0)o.push(i-W);if(z<Hh-1)o.push(i+W);return o;};
  const connected=(si,skip)=>{const arr=cells[si].filter(i=>i!==skip);if(!arr.length)return false;const set=new Set(arr),st=[arr[0]],seen=new Set([arr[0]]);
   while(st.length){const i=st.pop();for(const j of nbrs(i))if(set.has(j)&&!seen.has(j)){seen.add(j);st.push(j);}}return seen.size===arr.length;};
  for(let it=0;it<5000;it++){let moved=0;for(let a=0;a<nS;a++)for(let b=0;b<nS;b++){if(a===b||!tgt[a]||!tgt[b])continue;if(area(a)<=tgt[a]+c*c*.5||area(b)>=tgt[b]-c*c*.5)continue;
   let best=null;for(const i of cells[a]){if(!nbrs(i).some(j=>own[j]===b))continue;if(!connected(a,i))continue;const sc=dist[i];if(best==null||sc>best.sc)best={i,sc};}
   if(!best)continue;own[best.i]=b;cells[a]=cells[a].filter(i=>i!==best.i);cells[b].push(best.i);moved=1;}if(!moved)break;}}
 let nid=2;for(let i=0;i<g.length;i++)if(g[i]>nid)nid=g[i];nid++;
 const ids=seeds.map((_,i)=>i===0?id0:nid++);
 const zg=(R._zg=(R._zg||1),R._zg++);
 for(let i=0;i<g.length;i++)if(g[i]===id0&&own[i]>=0)g[i]=ids[own[i]];
 const neu=[];ids.forEach((id,i)=>{const rec=roomFromCells(R,id);if(!rec)return;rec.zone=1;rec.zg=zg;rec.zn=seeds[i].n||'';neu.push(rec);});
 if(neu.length<2){/* revert */for(let i=0;i<g.length;i++)if(ids.includes(g[i]))g[i]=id0;return 0;}
 R.r=R.r.filter(q=>q.id!==id0).concat(neu);return neu.length;}
function splitOpenZones(R,L,ws){if((globalThis.__PF||{}).noOpenZones||!R||!R.g)return 0;let n=0;
 openZoneCands(R,L).forEach(c=>{nameOpenSeeds(c.seeds,R,L,R.r,c.r);const bar=stubBarriers(R,c.r.id,ws||[]);n+=splitOneZone(R,c.r,c.seeds,bar);});
 return n;}
window.__rcClear=()=>{for(const k of Object.keys(RC))delete RC[k];};
window.__openZoneCands=(L=lvl)=>openZoneCands(RC[L]||(rooms(L),RC[L]),L).map(c=>({n:c.r.n,a:+c.r.a.toFixed(1),seeds:c.seeds.map(s=>({v:s.v,n:s.n,p:s.p.map(v=>+v.toFixed(2))}))}));
window.__zoneAdj=L=>{rooms(L||lvl);return zoneAdj(RC[L||lvl]);};
window.__roomAt=(p,L)=>{rooms(L||lvl);const R=RC[L||lvl];return {id:roomAt(R,p),n:(R.r.find(q=>q.id===roomAt(R,p))||{}).n,bb:(R.r.find(q=>q.id===roomAt(R,p))||{}).bb};};

function assignTypes(R,L){const RS=R.r;if(!RS.length)return {};const key=R.k+'|'+JSON.stringify(H.rlab||[]);if(R.tk===key&&R.T)return R.T;
 const T={},D=roomDoors(R,L),adj={};RS.forEach(r=>adj[r.id]=new Set());let ext=new Set();zoneAdj(R).forEach(([a,b])=>{if(adj[a]&&adj[b]){adj[a].add(b);adj[b].add(a);}});
 /* v21d: a door into an enclosed non-room pocket (a misread cupboard/void inside the house) is not an exterior door - only the true outside (grid-edge region) makes a room an entrance candidate */const sd=v=>adj[v]?v:(!v||!R.out||R.out.has(v))?0:-2;D.forEach(d=>{d.a=sd(d.a);d.b=sd(d.b);if(d.a>0&&d.b>0&&d.a!==d.b){adj[d.a].add(d.b);adj[d.b].add(d.a);}else if((d.a===0&&d.b>0)||(d.b===0&&d.a>0))ext.add(d.a||d.b);});
 const info=r=>{const w=r.bb[2]-r.bb[0],d=r.bb[3]-r.bb[1];return{mn:Math.min(w,d),asp:Math.max(w,d)/Math.max(.1,Math.min(w,d)),fill:r.a/Math.max(.1,w*d)};};
 const dist=(a,b)=>Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]);
 const nD=r=>D.filter(d=>d.a===r.id||d.b===r.id).length>1?60:0; // a bathroom is not a walk-through room
 // labels read from the plan
 /* v12b: a room carrying several captions (open plan 'Obývacia izba' + 'Jedáleň' + 'Kuchyňa') takes the strongest one, living+kitchen = 'Obývačka s kuchyňou' */const LP=n=>/^Obýva/.test(n)?5:/^Kuchyň/.test(n)?4:/^(Spálňa|Detská|Izba|Pracovňa)/.test(n)?3:/^Jedáleň/.test(n)?1:2;const LB={};(H.rlab||[]).filter(l=>l.level===L).forEach(l=>{const id=roomAt(R,l.p);(LB[id]=LB[id]||[]).push(l.n);});
 (H.rlab||[]).filter(l=>l.level===L).slice().sort((x,y)=>LP(y.n)-LP(x.n)).forEach(l=>{const id=roomAt(R,l.p);const r=RS.find(q=>q.id===id);const noLiv=!(H.rlab||[]).some(q=>q.level===L&&/^Obýva/.test(q.n)&&roomAt(R,q.p)!==id);if(r&&!T[id]&&r.a>=18&&(LB[id]||[]).some(n=>/^Kuchyň/.test(n))&&((LB[id]||[]).some(n=>/^(Obýva|Jedáleň)/.test(n))||(r.a>=24&&noLiv))){T[id]='Obývačka s kuchyňou';return;}/* a label that cannot be true for the room size (bedroom in 3 m2) is a misread: leave it to the auto rules */if(r&&!T[id]&&!(r.a<5.5&&/^(Spálňa|Detská|Izba|Obývačka|Pracovňa|Jedáleň)/.test(l.n))&&!(r.a<3.5&&/^Kuchyňa/.test(l.n)))T[id]=l.n;});
 RS.forEach(r=>{if(r.zn&&!T[r.id])T[r.id]=r.zn;});
 // units: groups of rooms joined by interior doors; two big separate groups = two dwellings (one kitchen each)
 const comp={};let cid=0;RS.forEach(r=>{if(comp[r.id])return;cid++;const st=[r.id];comp[r.id]=cid;while(st.length){const i=st.pop();adj[i].forEach(j=>{if(!comp[j]){comp[j]=cid;st.push(j);}});}});
 const units=[...new Set(Object.values(comp))].filter(c=>{const m=RS.filter(r=>comp[r.id]===c);return m.length>=3&&m.reduce((s,r)=>s+r.a,0)>=30;});
 const unitOf=r=>{if(units.length<2)return 0;if(units.includes(comp[r.id]))return comp[r.id];let b=units[0],bd=1e9;units.forEach(u=>{RS.filter(q=>comp[q.id]===u).forEach(q=>{const d=dist(r,q);if(d<bd){bd=d;b=u;}});});return b;};
 const U={};RS.forEach(r=>{const u=unitOf(r);(U[u]=U[u]||[]).push(r);});
 for(const M of Object.values(U)){const free=()=>M.filter(r=>!T[r.id]).sort((a,b)=>b.a-a.a),has=n=>M.some(r=>T[r.id]&&T[r.id].startsWith(n));
  // corridors / entrance
  const hall=r=>{if(Object.values(T).filter(n=>n==='Chodba'||n==='Predsieň').length>=3)return;/* max 3 halls per house */T[r.id]=ext.has(r.id)&&!has('Predsieň')?'Predsieň':!has('Chodba')?'Chodba':!has('Predsieň')?'Predsieň':'Chodba';};
  free().forEach(r=>{const I=info(r);if(I.asp>2.2&&I.mn<2.1&&r.a<26)hall(r);});/* v12i: an L-shaped/irregular room opening to 3+ rooms is a hallway */const nbr=r=>RS.filter(q=>{if(q===r)return false;const A=r.bb,B=q.bb,ox=Math.min(A[2],B[2])-Math.max(A[0],B[0]),oz=Math.min(A[3],B[3])-Math.max(A[1],B[1]);return(ox>=.6&&oz>-.6)||(oz>=.6&&ox>-.6);}).length;free().forEach(r=>{if(!has('Chodba')&&(adj[r.id].size>=3||nbr(r)>=6)&&info(r).fill<.7&&r.a<16)hall(r);});
  free().filter(r=>ext.has(r.id)&&r.a<9).slice(0,1).forEach(r=>{if(!has('Predsieň'))T[r.id]='Predsieň';});
  // tiny rooms
  free().filter(r=>r.a<2.8).sort((a,b)=>a.a-b.a).forEach(r=>{T[r.id]=!has('WC')?'WC':!has('Špajza')?'Špajza':'Komora';});
  // living
  let liv=M.find(r=>T[r.id]&&T[r.id].startsWith('Obýva'));if(!liv){liv=free().find(r=>r.a>=11);if(liv)T[liv.id]='Obývačka';}
  // kitchen next to living
  const hasKL=(H.rlab||[]).some(l=>l.level===L&&/^Kuchyň/.test(l.n));/* v12g: the plan captions its kitchen somewhere (open plan) -> never move 'Kuchyňa' onto another room */if(!has('Kuchyňa')&&!hasKL&&!(liv&&T[liv.id]==='Obývačka s kuchyňou')){const c=free().filter(r=>r.a>=4.5&&r.a<=18).sort((a,b)=>((liv&&adj[liv.id].has(a.id))?-50:0)+(liv?dist(a,liv):0)-(((liv&&adj[liv.id].has(b.id))?-50:0)+(liv?dist(b,liv):0)))[0];
   const smallRest=free().filter(r=>r.a>=8).length;/* v21e: a living room holding 2+ printed room areas is an open plan read as one room - its kitchen is inside it, not next door */const livN=liv?(H.rarea||[]).filter(q=>q.level===L&&q.p&&q.v>=1&&roomAtL(R,q.p)===liv.id).length:0;if(c&&!(liv&&liv.a>=26&&smallRest<3)&&!(livN>=2&&liv.a>=26&&!(globalThis.__PF||{}).noOpenKit))T[c.id]='Kuchyňa';else if(liv)T[liv.id]='Obývačka s kuchyňou';}
  // bathroom next to the WC (or the smallest wet-size room)
  if(!has('Kúpeľňa')){const wc=M.find(r=>T[r.id]==='WC');const c=free().filter(r=>r.a>=2.8&&r.a<=11).sort((a,b)=>(wc?dist(a,wc):a.a)+nD(a)-(wc?dist(b,wc):b.a)-nD(b))[0];if(c)T[c.id]='Kúpeľňa';}
  free().forEach(r=>{const I=info(r);if((r.a<10&&adj[r.id].size>=3)||(I.fill<.6&&I.mn<2.4&&r.a<20))hall(r);});
  if(!has('WC')){const c=free().filter(r=>r.a<4).sort((a,b)=>a.a-b.a)[0];if(c)T[c.id]='WC';}
  if(!has('Kúpeľňa')&&M.length>=3){/* a home always has a bathroom: smallest free room up to 14 m2 */const wc=M.find(r=>T[r.id]==='WC');const c=free().filter(r=>r.a>=2.5&&r.a<=14).sort((a,b)=>a.a-b.a+(wc?.3*(dist(a,wc)-dist(b,wc)):0)+nD(a)-nD(b))[0];if(c)T[c.id]='Kúpeľňa';}
  // bedrooms and the rest
  /* v12g: a plan that captions its bedrooms plainly 'IZBA' keeps them 'Izba' (no invented Spálňa/Detská/Pracovňa) */const LBN=(H.rlab||[]).filter(l=>l.level===L).map(l=>l.n),izP=LBN.includes('Izba')&&!LBN.some(n=>/^(Spálňa|Detská|Pracovňa)/.test(n));
  const BIG=izP?['Izba']:['Spálňa','Detská izba','Detská izba','Pracovňa','Izba'],MID=['Pracovňa','Detská izba','Šatník','Izba'],SM=['Technická miestnosť','Šatník','Komora','Špajza'];let bi=0,mi=0,si=0;
  if(has('Spálňa'))bi=1;
  free().forEach(r=>{if(ext.has(r.id)&&r.a<9&&!has('Predsieň')){T[r.id]='Predsieň';return;}/* v12g: small room behind an exterior door = entrance, not a technical room */if(r.a>=9||(izP&&r.a>=7))T[r.id]=BIG[Math.min(bi++,BIG.length-1)];else if(r.a>=5)T[r.id]=MID[Math.min(mi++,MID.length-1)];else T[r.id]=SM[Math.min(si++,SM.length-1)];});}
 // unique names: second "Detská izba" -> "Detská izba 2"
 const cnt={},seen={};Object.values(T).forEach(n=>cnt[n]=(cnt[n]||0)+1);
 RS.slice().sort((a,b)=>b.a-a.a).forEach(r=>{const n=T[r.id];if(cnt[n]>1){seen[n]=(seen[n]||0)+1;if(seen[n]>1||n==='Izba')T[r.id]=n+' '+seen[n];}/* Izba 1..n */});
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
cv.addEventListener('wheel',e=>{e.preventDefault();view.u=1;const p=toW(e),f=e.deltaY<0?1.15:1/1.15;view.s*=f;view.x=p[0]-(p[0]-view.x)/f;view.y=p[1]-(p[1]-view.y)/f;draw();},{passive:false});
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
 if(pinch&&ptrs.size>=2){view.u=1;const t=two(),k=t.d/pinch.d,r=cv.getBoundingClientRect();view.s=pinch.v0.s*k;view.x=pinch.w0[0]-(t.c[0]-r.left)*devicePixelRatio/view.s;view.y=pinch.w0[1]-(t.c[1]-r.top)*devicePixelRatio/view.s;draw();return;}
 if(!drag)return;const p=toW(e);
 if(drag.k==='pan'){view.u=1;view.x=drag.v0.x-(e.clientX-drag.e0[0])*devicePixelRatio/view.s;view.y=drag.v0.y-(e.clientY-drag.e0[1])*devicePixelRatio/view.s;}
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
const shrink=(im,M=2000,jp)=>{const D=Math.max(im.width,im.height),k=D<=2400?1:Math.min(1,M/D),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);/* v21b: a sheet that is not downscaled keeps its pixels - small screenshots were re-encoded as JPEG .85, which blurred the room-area digits the reader needs (app read worse than the file) */if(!jp){const p=c.toDataURL('image/png');if(p.length<2.8e6)return p;}return c.toDataURL('image/jpeg',k===1?.92:.85);};/* v12i: no downscale -> lossless PNG (browser JPEG encoders differ, so the read differed per device) *//* v12g: big sheets (2000-2400 px) are neither downscaled nor heavily compressed; sheets up to 2400 px are not downscaled (keeps 10 px captions readable) */
let pdfjs=null;
function mul(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function apply(m,x,y){return[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
function rgbOf(a){
  if(a==null)return null;
  const n=a.length;
  if(n>=3 && (a instanceof Uint8ClampedArray || (typeof a[0]==='number' && a[0]>1))) return [a[0]/255,a[1]/255,a[2]/255];
  if(n>=3) return [+a[0],+a[1],+a[3]===undefined?+a[2]:+a[2]];
  if(n===1 || typeof a==='number'){const v=typeof a==='number'?a:a[0]; return [v>1?v/255:v, v>1?v/255:v, v>1?v/255:v];}
  if(n===4){const c=1-a[0],m=1-a[1],y=1-a[2],k=1-a[3];return [c*(1-k),m*(1-k),y*(1-k)];}
  return null;
}
function isDark(c,thr){return c && (c[0]+c[1]+c[2])/3<(thr||.35);}
function wallish(poly,W,H,sc){
  if(!poly||poly.length<3)return false;
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  const w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
  if(w*h<20*sc*sc)return false;
  if(w>0.85*W&&h>0.85*H)return false;
  const a=Math.max(w,h),b=Math.min(w,h);
  if(b>80*sc&&a/b<3)return false;
  if(b>40*sc&&a/b<2)return false;
  return a>=15*sc;
}
function seglen(poly){const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);return Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));}
function clusterMain(polys,gap){
  const n=polys.length;if(n<=1)return polys;
  const parent=polys.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  const bb=polys.map(p=>{const xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];});
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=bb[i],b=bb[j];if(a[0]-gap<=b[2]&&b[0]-gap<=a[2]&&a[1]-gap<=b[3]&&b[1]-gap<=a[3])parent[find(j)]=find(i);}
  const groups={};for(let i=0;i<n;i++)(groups[find(i)]=groups[find(i)]||[]).push(i);
  let best=null,bs=-1;for(const g of Object.values(groups)){const s=g.reduce((a,i)=>a+seglen(polys[i]),0);if(s>bs){bs=s;best=g;}}
  return best.map(i=>polys[i]);
}
function pathsFrom(ops,coords,ctm){
  const polys=[],cur=[];let i=0;
  const take=n=>{const o=[];for(let k=0;k<n;k++)o.push(coords[i++]);return o;};
  const P=(x,y)=>apply(ctm,x,y);
  const flush=()=>{if(cur.length>=3)polys.push(cur.slice());cur.length=0;};
  for(const op of ops){
    if(op===19){flush();const[x,y,w,h]=take(4);polys.push([P(x,y),P(x+w,y),P(x+w,y+h),P(x,y+h)]);}
    else if(op===13){flush();const[x,y]=take(2);cur.push(P(x,y));}
    else if(op===14){const[x,y]=take(2);cur.push(P(x,y));}
    else if(op===15){const[x1,y1,x2,y2,x3,y3]=take(6);cur.push(P(x1,y1),P(x2,y2),P(x3,y3));}
    else if(op===16){const[x2,y2,x3,y3]=take(4);cur.push(P(x2,y2),P(x3,y3));}
    else if(op===17){const[x1,y1,x3,y3]=take(4);cur.push(P(x1,y1),P(x3,y3));}
    else if(op===18){if(cur.length)cur.push(cur[0]);flush();}
  }
  flush();return polys;
}
async function extractPdfVec(pg,vp){
  const ol=await pg.getOperatorList();
  const fn=ol.fnArray,args=ol.argsArray;
  let ctm=vp.transform.slice(),stack=[],fill=[0,0,0],stroke=[0,0,0],lw=1,path=[],pathBbox=null;
  const W=vp.width,H=vp.height,sc=Math.hypot(vp.transform[0],vp.transform[1])||1;
  const raw=[];
  const emit=(polys,ok)=>{if(!ok)return;const one=pathBbox||((polys&&polys.length===1)?polys[0]:null);const list=one?[one]:(polys||[]);for(const p of list){if(wallish(p,W,H,sc))raw.push(p.map(q=>[+q[0].toFixed(2),+q[1].toFixed(2)]));}};
  for(let i=0;i<fn.length;i++){
    const op=fn[i],a=args[i];
    if(op===10)stack.push({ctm:ctm.slice(),fill:fill&&fill.slice(),stroke:stroke&&stroke.slice(),lw});
    else if(op===11){const s=stack.pop();if(s){ctm=s.ctm;fill=s.fill;stroke=s.stroke;lw=s.lw;}}
    else if(op===12&&a)ctm=mul(ctm,a);
    else if(op===2&&a)lw=a[0]??a;
    else if(op===57||op===56){const c=rgbOf(a);if(op===57)fill=c;else stroke=c;}
    else if(op===59||op===54||op===55){const c=rgbOf(a);if(c)fill=c;}
    else if(op===58||op===52||op===53){const c=rgbOf(a);if(c)stroke=c;}
    else if(op===61){const c=rgbOf(a);if(c)fill=c;}
    else if(op===60){const c=rgbOf(a);if(c)stroke=c;}
    else if(op===91&&a){path=pathsFrom(a[0]||[],a[1]||[],ctm);const bb=a[2];if(bb&&bb.length>=4){const[x0,y0,x1,y1]=bb;pathBbox=[apply(ctm,x0,y0),apply(ctm,x1,y0),apply(ctm,x1,y1),apply(ctm,x0,y1)];}else pathBbox=null;}
    else if(op===13||op===14||op===15||op===18||op===19){ /* loose path ops: ignore, pdf.js 4 bundles them */ }
    else if(op===22||op===23||op===26||op===27)emit(path,isDark(fill));
    else if(op===24||op===25){emit(path,isDark(fill)); if(isDark(stroke)&&lw>=2)emit(path,true);}
    else if(op===20||op===21){if(isDark(stroke)&&lw>=2)emit(path,true);}
  }
  const polys=raw.length?clusterMain(raw,Math.max(40,0.03*Math.max(W,H))):[];
  return {w:Math.round(W),h:Math.round(H),n:polys.length,nRaw:raw.length,sc,polys};
}
async function readPdf(f){busy('Načítavam PDF…');try{if(!pdfjs){pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';}
 const doc=await pdfjs.getDocument({data:await f.arrayBuffer()}).promise;let n=1;busy(0);
 if(doc.numPages>1){const r=await dlg('PDF má '+doc.numPages+' strán','<p>Ktorú stranu použiť ako výkres?</p>',[['Zrušiť',null],...Array.from({length:Math.min(doc.numPages,12)},(_,i)=>['Strana '+(i+1),i+1,i?'':'go'])]);if(!r||!r.v)return null;n=r.v;}
 busy('Vykresľujem stranu '+n+'…');const pg=await doc.getPage(n),v0=pg.getViewport({scale:1}),sc=2400/Math.max(v0.width,v0.height),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 await pg.render({canvasContext:x,viewport:vp}).promise;
 let txts=[];try{const tc=await pg.getTextContent();const U=pdfjs.Util||(typeof pdfjsLib!=='undefined'&&pdfjsLib.Util);
  for(const it of (tc.items||[])){const s=String(it.str||'').trim();if(!s||!it.transform)continue;
   let x0,y0,x1,y1;
   if(U&&U.transform){const m=U.transform(vp.transform,it.transform),sx=Math.hypot(m[0],m[1])||sc,sy=Math.hypot(m[2],m[3])||sc;
    x0=m[4];y0=m[5]-(it.height||0)*sy;x1=x0+(it.width||0)*sx;y1=m[5];}
   else{const p=vp.convertToViewportPoint(it.transform[4],it.transform[5]),q=vp.convertToViewportPoint(it.transform[4]+(it.width||0),it.transform[5]-(it.height||8));
    x0=Math.min(p[0],q[0]);y0=Math.min(p[1],q[1]);x1=Math.max(p[0],q[0]);y1=Math.max(p[1],q[1]);}
   txts.push({txt:s,b:[+x0.toFixed(1),+y0.toFixed(1),+x1.toFixed(1),+y1.toFixed(1)]});}
 }catch(e){txts=[];}
 window.__vkPdfText=txts.length?{txts,w:c.width,h:c.height}:null;let vec=null;try{vec=await extractPdfVec(pg,vp);}catch(e){vec=null;}window.__vkPdfVec=vec&&vec.polys&&vec.polys.length?{polys:vec.polys,w:c.width,h:c.height}:null;busy(0);return shrink(c);}catch(e){busy(0);console.warn(e);dlg('PDF sa nepodarilo otvoriť','<p>Skúste výkres uložiť ako obrázok (JPG/PNG) alebo urobiť snímku obrazovky.</p>',[['OK',1,'go']]);return null;}}
function readImg(f){try{window.vkA&&window.vkA('upload_start')}catch(e){};if(/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name))return readPdf(f);
 return new Promise(res=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{const jp=/jpe?g/i.test(f.type)||/\.jpe?g$/i.test(f.name);/* v21b: a JPEG that needs no downscale is kept byte for byte (no second lossy encode) */if(jp&&Math.max(im.width,im.height)<=2400&&f.size<2.6e6){const fr=new FileReader();fr.onload=()=>{res(fr.result);URL.revokeObjectURL(u);};fr.onerror=()=>{res(shrink(im,2000,jp));URL.revokeObjectURL(u);};fr.readAsDataURL(f);return;}res(shrink(im,2000,jp));URL.revokeObjectURL(u);};
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
 if(!(H.underlay.site&&!man)&&!/[?&]cv=old/.test(location.search)){try{const PO={rect:H.underlay.rect||man,mW:(H.underlay.cal||man)?bgW:null,pdfText:H.underlay.pdfText,pdfVec:H.underlay.pdfVec,pdfW:H.underlay.pdfW,pdfH:H.underlay.pdfH},P=readPlan(bg,PO);window.__lastP={o:PO,bgw:bg.width,bgh:bg.height,labels:P&&P.labels,words:P&&P.dbg&&P.dbg.words,nw:P&&P.walls.length,ppm:P&&P.dbg&&P.dbg.ppm,t:P&&P.dbg&&P.dbg.t,paper:P&&P.dbg&&P.dbg.paper,dk:P&&P.dbg&&Object.fromEntries(['cands','pick','Q','Qs','scale','dimVia','dimN','nS','nR','cm','thin','lw','kOpen','kInt','tone','wk','est','solidOK','lpF','skew','frame','crop','cropFail','bridge35','bridge50','tie','roomDim'].map(k=>[k,P.dbg[k]]))};if(P&&P.walls.length>=4&&(P.conf>=.45||(P.dbg&&P.dbg.nR>=2))){R=P;if(man)R.guess=false;const lvn=LV().name;H.rlab=(H.rlab||[]).filter(l=>l.level!==lvn).concat((P.labels||[]).map(l=>({level:lvn,p:l.p,n:l.n})));H.rarea=(H.rarea||[]).filter(l=>l.level!==lvn).concat(((P.dbg&&P.dbg.areas)||[]).map(l=>({level:lvn,p:l.p,v:l.v})));}window.__plan=P?{n:P.walls.length,conf:+P.conf.toFixed(2),scale:P.scaleSrc,dims:P.dbg&&P.dbg.dims,log:P.dbg&&P.dbg.dimLog,pick:P.dbg&&P.dbg.pick,nR:P.dbg&&P.dbg.nR,sw:P.dbg&&P.dbg.stackWin,ops:P.dbg&&P.dbg.ops,lab:P.dbg&&P.dbg.labels,wlog:P.dbg&&P.dbg.wlog}:null;}catch(e){console.warn(e);}}
 if(!R)try{R=detectWalls(bg,{sens:+$('sens').value,mW:H.underlay.cal||man?bgW:null,rect:H.underlay.rect||man,site:H.underlay.site&&!man,w:bgW});if(man)R.guess=false;}catch(e){console.warn(e);}
 const ws=R?R.walls:[];busy(0);recBusy=0;if(!nosnap)snap();const lv=LV();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lv.name));
 if(R&&!H.underlay.rect&&!man){H.underlay={src:R.mode==='plan'?R.canvas.toDataURL('image/jpeg',.85):H.underlay.src,w:R.w,rect:1,guess:R.guess,site:R.mode==='site'?1:0,pdfText:H.underlay.pdfText,pdfVec:H.underlay.pdfVec,pdfW:H.underlay.pdfW,pdfH:H.underlay.pdfH};}else if(R&&R.guess&&!H.underlay.cal){H.underlay.w=R.w;H.underlay.guess=true;}
 H.walls=H.walls.concat(gapMerge(ws,R&&R.mode==='plan').map((w,i)=>({id:'a'+Date.now()+i,auto:1,level:lv.name,start:w.start,end:w.end,thickness:w.thickness,base:0,height:lv.height,openings:w.op||[]})));
 if(R&&R.mode==='plan'&&R.dbg&&R.dbg.wordsP&&R.dbg.wordsP.length)dropFurnBoxes(R.dbg.wordsP,lv.name);
 if(R&&R.mode==='plan')inkFilter(R,lv.name);
 if(R&&R.mode==='plan')cleanOutline(lv.name);
 if(R&&R.mode==='plan')closeGaps(lv.name);
 if(R&&R.mode==='plan')try{closeSlots(lv.name);}catch(e){console.warn('closeSlots',e);}
 if(R&&R.mode==='plan')try{labelHull(lv.name);}catch(e){console.warn('labelHull',e);}
 if(R&&R.mode==='plan')try{labelMerge(lv.name);}catch(e){console.warn('labelMerge',e);}
 if(R&&R.mode==='plan')try{labelSplit(lv.name);}catch(e){console.warn('labelSplit',e);}
 if(R&&R.mode==='plan')setTimeout(()=>{/* v21a: after the scale referee (a closed-in front must not sway the area fit) */try{if(closeEnvelope(lv.name,(H.envLog=[]))){save();draw();}}catch(e){console.warn('env',e);}try{if(bandMerge(lv.name,(H.envLog=H.envLog||[]))){save();draw();}}catch(e){console.warn('band',e);}try{carGarage(lv.name);}catch(e){console.warn('carGarage',e);}try{terrInk(lv.name);}catch(e){console.warn('terrInk',e);}},60);
 save();const u=H.underlay;bgW=u.w;$('imw').value=bgW;if(!bg.src.endsWith(u.src.slice(-40))){bg=new Image();bg.onload=()=>{fit();};bg.src=u.src;}else fit();banner();
 const md=R?R.mode:'none';window.__mode=md;
 const nAuto=H.walls.filter(w=>w.auto&&w.level===lv.name).length,nOp=H.walls.filter(w=>w.auto&&w.level===lv.name).reduce((s,w)=>s+(w.openings||[]).length,0);
 const hm=md==='site'?(R&&R.parcel?'Toto vyzerá ako situácia pozemku – nakreslil som obvod domu a pozemok. Vnútorné steny dokreslite alebo nahrajte pôdorys.':'Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokreslite alebo nahrajte pôdorys.'):ws.length?'Rozpoznaných '+nAuto+' stien'+(nOp?' a '+nOp+(nOp==1?' otvor':nOp<5?' otvory':' otvorov')+' (dvere/okná)':'')+'. Ak niečo chýba alebo prebýva, posuňte „Citlivosť“. Opravy: Posunúť, Zmazať, Späť.':(R&&R.needTrace)?'Pôdorys sa nepodarilo spoľahlivo prečítať. Označte 4 rohy domu, alebo steny nakreslite ručne.':'Na obrázku sme nenašli steny ani obrys domu. Výkres zostáva ako podklad – steny nakreslite ručne alebo nahrajte pôdorys.';
 /* v18g: raster uploads with a guessed scale get the customer hint (original PDF is exact; on a screenshot zoom so the room areas / area table are readable) */
 const hm2=(md==='plan'&&ws.length&&u&&!u.pdfW&&u.guess)?hm+' Tip: najpresnejšie je pôvodné PDF. Ak nahrávate snímku obrazovky, priblížte pôdorys aj tabuľku plôch, aby boli čísla čitateľné.':hm;
 $('hint').textContent=hm2;if(!quiet||md!=='plan')toast(hm.split('. ')[0]+'.',ws.length?'ok':'warn');
 if(R&&R.needTrace&&!quiet){setTimeout(()=>offerTrace(!!ws.length),200);}
 if(md==='site'&&!H.plot&&ws.length){
  if(R&&R.parcel&&R.parcel.pts&&R.parcel.pts.length>=3){H.plot={pts:R.parcel.pts.map(p=>[p[0],p[1]]),fence:R.parcel.fence!==0?1:0};window.__parcel=1;window.__parcelConf=R.parcel.conf||0;}
  else{const xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]);H.plot=plotAround(Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));window.__parcel=0;}
  save();fit();}
 if(md==='site'&&!quiet2.v&&!H.underlay.cal&&!man){quiet2.v=1;dlg('Situácia pozemku','<p>Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokresli alebo nahraj pôdorys.</p><p>Aká dlhá je dlhšia strana domu (v metroch)? Nájdete ju na kóte, napr. „14400“ = 14,4 m.</p><input type="text" inputmode="decimal" placeholder="napr. 14,4">',[['Neskôr',null],['Nastaviť','ok','go']]).then(r=>{quiet2.v=0;const v=parseFloat(((r&&r.name)||'').replace(',','.'));if(r&&v>2&&v<100)scaleBy(v/(R.longPx/R.ppm));});}
 /* v18h: a guessed scale (no scaleSrc) is also refereed by the printed room areas */if(md==='plan'&&(R.scaleSrc||areaFit())&&!quiet2.v&&!H.underlay.cal&&!H.underlay.asked&&!man&&ws.length){H.underlay.asked=1;save();banner();const xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]),lx=Math.max(...xs)-Math.min(...xs),lz=Math.max(...zs)-Math.min(...zs),L=Math.max(lx,lz)+ (ws[0].thickness||.3),f1=v=>(Math.round(v*100)/100).toFixed(2).replace('.',',');
  const afD=R.scaleSrc==='dims'&&areaFit();/* v18h referee: dimension text misread vs >=5 printed room areas that agree with each other -> the areas win */
  if(afD&&(afD.n>=5&&Math.abs(afD.f-1)>.12||afD.n>=3&&Math.abs(afD.f-1)>.25)){scaleBy(afD.f);toast('Mierka podľa plôch miestností z výkresu ('+afD.n+' miestností, kóty nesedeli): dom '+f1(L*afD.f)+' m. Ak nesedí, použite Mierka.','ok',5000);}
  else if(R.scaleSrc==='dims'){toast('Mierka podľa kót na výkrese: dom '+f1(L)+' m.','ok');}
  else if(areaFit()){const af=areaFit();scaleBy(af.f);toast('Mierka podľa plôch miestností z výkresu ('+af.n+' miestností): dom '+f1(L*af.f)+' m. Ak nesedí, použite Mierka.','ok',5000);}
  else{quiet2.v=1;/* scale hint from the doors: interior leaves are 80-90 cm in practice */const DW=ws.flatMap(w=>(w.openings||[]).filter(o=>o.type==='door'&&o.kind!=='entrance'&&o.kind!=='terrace'&&o.width>.5&&o.width<1.3).map(o=>o.width)).sort((a,b)=>a-b),dm=DW.length?DW[DW.length>>1]:0,dOff=dm&&(dm<.78||dm>.95);
  const dTxt=dm?'<p>Pomôcka: vnútorné dvere teraz merajú asi <b>'+Math.round(dm*100)+' cm</b> (bežne 80–90 cm)'+(dOff?' – mierka asi nesedí, dom podľa dverí by mal <b>'+f1(L*.85/dm)+' m</b>.':' – mierka vyzerá v poriadku.')+'</p>':'';
  dlg('Skontrolujte mierku','<p>Na výkrese som nenašiel čitateľné kóty, mierku som odhadol: dlhšia strana domu má asi <b>'+f1(L)+' m</b>.</p>'+dTxt+'<p>Aká dlhá je naozaj (v metroch, z vonkajšej strany)?</p><input type="text" inputmode="decimal" value="'+f1(L)+'">',[['Ponechať',null]].concat(dOff?[['Podľa dverí (85 cm)','door']]:[]).concat([['Nastaviť','ok','go']])).then(r=>{quiet2.v=0;if(r&&r.v==='door'){scaleBy(.85/dm);return;}const v=parseFloat(((r&&r.name)||'').replace(',','.'));if(r&&v>2&&v<100&&Math.abs(v/L-1)>.005)scaleBy(v/L);});}}
 window.__rec=ws.length;try{window.vkA&&window.vkA(ws.length?'plan_read_ok':'plan_read_fail',ws.length?rooms().length:undefined)}catch(e){};window.__nw=H.walls.length;window.__ops=H.walls.reduce((s,w)=>s+(w.openings||[]).length,0);window.__need=!!(R&&R.needTrace);}
const quiet2={v:0};
/* v12b: Slovak plans print every room's net area ('12,10 m²'). Rooms whose own printed area agrees (±6 %) with the others fix the scale: f = sqrt(printed/detected), median of the agreeing ones */
function areaFit(){const R=RC[lvl];const RS=rooms();if(!R||RS.length<3)return null;const A=(H.rarea||[]).filter(a=>a.level===lvl);const by={};A.forEach(a=>{const id=roomAt(R,a.p);if(id>1)(by[id]=by[id]||[]).push(a.v);});const fs=[];RS.forEach(r=>{const v=by[r.id];if(v&&v.length===1&&r.a>=1.5)fs.push(Math.sqrt(v[0]/r.a));});if(fs.length<3)return null;fs.sort((a,b)=>a-b);let best=null;for(const c of fs){const g=fs.filter(x=>Math.abs(x/c-1)<.06);if(!best||g.length>best.length)best=g;}if(best.length<Math.max(3,Math.ceil(fs.length*.5)))return null;const f=best[Math.floor((best.length-1)*.25)];/* low quartile: detected partitions are drawn thicker than printed, so rooms read small and ratios run high */if(f<.5||f>2||Math.abs(f-1)<.02)return null;return{f,f50:best[best.length>>1],n:best.length,all:fs.map(x=>+x.toFixed(3))};}
window.__areaFit=areaFit;
/* v18i: label/room statistics for the private catalogue soft bench */
window.__labStat=(L=lvl)=>{const RS=rooms(L),R=RC[L];if(!R)return null;const A=(H.rarea||[]).filter(a=>a.level===L&&a.p&&a.v>=.8&&a.v<400),by={};let lost=0;A.forEach(a=>{const id=roomAtL(R,a.p);if(RS.some(r=>r.id===id))(by[id]=by[id]||[]).push(a.v);else lost++;});
 const ids=Object.keys(by);let ok=0;const rs=RS.filter(r=>by[r.id]&&by[r.id].length===1).map(r=>Math.log(r.a/by[r.id][0])).sort((a,b)=>a-b),mu=rs.length?rs[rs.length>>1]:0;
 RS.forEach(r=>{const v=by[r.id];if(v&&v.length===1&&Math.abs(Math.log(r.a/v[0])-mu)<.2)ok++;});
 return{det:A.map(a=>{const id=roomAtL(R,a.p),r=RS.find(r=>r.id===id);return [a.v,r?r.n:id,r?+r.a.toFixed(1):null];}),mu:+mu.toFixed(2),lab:A.length,rooms:RS.length,single:ids.filter(k=>by[k].length===1).length,merged:ids.filter(k=>by[k].length>1).length,lost,ok};};
function scaleBy(f){snap();bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);});if(H.plot&&H.plot.pts)H.plot.pts=H.plot.pts.map(p=>[Math.round(p[0]*f*100)/100,Math.round(p[1]*f*100)/100]);const sp=o=>{o.p=[Math.round(o.p[0]*f*100)/100,Math.round(o.p[1]*f*100)/100];};(H.rlab||[]).forEach(sp);(H.rn||[]).forEach(sp);(H.rarea||[]).forEach(o=>{if(o.p)sp(o);});(H.furn||[]).forEach(sp);save();fit();banner();}
$('rec').onclick=()=>recog();$('recx').onclick=()=>{const n=H.walls.filter(w=>w.auto&&w.level===lvl).length;if(!n)return;snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));save();draw();$('hint').textContent='Rozpoznané steny vymazané ('+n+'). Späť ich vráti.';toast('Vymazaných '+n+' rozpoznaných stien.','ok');};let sT;$('sens').oninput=()=>{clearTimeout(sT);sT=setTimeout(()=>H.underlay&&recog(1),350);};$('banc').onclick=()=>$('cal').click();
function afterImg(ns){const go=()=>{fit();recog(1,ns===2);};bg.complete&&bg.width?go():bg.onload=()=>{draw();go();};}
const pickImg=m=>{imgMode=m;$('img').value='';$('img').click();};
$('upl').onclick=()=>pickImg('ask');
$('img').onchange=async e=>{const f=e.target.files[0];if(!f)return;const src=await readImg(f);if(!src)return;let m=imgMode;
 if(m==='ask'&&H.walls.length){const r=await dlg('Nahrali ste výkres','<p>Tento projekt už má nakreslené steny. Čo chcete urobiť?</p>',[['Zrušiť',null],['Vymeniť podklad v tomto projekte','swap'],['Nový projekt z tohto výkresu','new','go']]);if(!r||!r.v)return;m=r.v;}
 if(m==='new'||m==='site'){const n=await askName(f.name.replace(/\.[^.]+$/,''));if(n){newP(n,[],{src,w:20,site:m==='site'?1:0});afterImg();}}
 else{snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));H.underlay={src,w:20,...((()=>{const t=window.__vkPdfText,v=window.__vkPdfVec;window.__vkPdfText=null;window.__vkPdfVec=null;return {...(t?{pdfText:t.txts,pdfW:t.w,pdfH:t.h}:{}),...(v?{pdfVec:v.polys,pdfW:v.w,pdfH:v.h}:{})};})())};H.ulv=lvl;setBg();save();afterImg(2);}};
// prem8: the demo house is furnished by the same rule engine (0 rule violations), named rooms, unique kids rooms, garden set kept
const DEMO_V='20261112j';
// ukážka 2: operator-traced two-storey plan (Schmidt-Lademann House 1958 plan from the benchmark set), auto-furnished + QA-curated; ?demo=2 opens it
async function demo3(){try{const j=await(await fetch('assets/ukazka3_20261117l.json?v=20261117l')).json();openP('p'+Date.now(),j);try{rulesFix();save();draw();}catch(e){}toast('Ukážka 3 – vila Lipa. Kliknite Vygenerovať 3D.','ok');}catch(e){toast('Ukážku 3 sa nepodarilo načítať.','err');}}
window.__demo3=demo3;
async function demo2(){try{const j=await(await fetch('assets/ukazka2_20261117a.json?v=20261117a')).json();openP('p'+Date.now(),j);try{rulesFix();save();draw();}catch(e){}toast('Ukážka 2 – poschodový dom. Kliknite Vygenerovať 3D.','ok');}catch(e){toast('Ukážku 2 sa nepodarilo načítať.','err');}}
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
$('logo').onclick=()=>show('home');$('hNew').onclick=()=>act('new');$('hImg').onclick=()=>act('newimg');$('hDemo').onclick=()=>act('demo');$('hDemo2').onclick=()=>demo2();$('hDemo3')&&($('hDemo3').onclick=()=>demo3());$('hSite').onclick=()=>pickImg('site');$('hMulti').onclick=()=>{$('imgs').value='';$('imgs').click();};$('eRect').onclick=()=>houseDlg();$('eImg').onclick=()=>pickImg('ask');$('e3go').onclick=()=>show('ed');$('plotb').onclick=()=>plotDlg();$('pname').onclick=rename;
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
/* v20261117a: keep the canvas bitmap in sync with its CSS box. The header grows when the editor toolbar appears (main = 100% - --hh), which shrank the canvas without a refit, so the bitmap was squeezed vertically and every click landed lower than the cursor. */
new ResizeObserver(()=>{if(!H||!$('ed').classList.contains('on'))return;const r=cv.getBoundingClientRect();if(!r.width||!r.height)return;const W=Math.round(r.width*devicePixelRatio),Hh=Math.round(r.height*devicePixelRatio);if(Math.abs(cv.width-W)<2&&Math.abs(cv.height-Hh)<2)return;if(!view.u){fit();return;}const cx0=view.x+cv.width/2/view.s,cy0=view.y+cv.height/2/view.s;cv.width=W;cv.height=Hh;view.x=cx0-W/2/view.s;view.y=cy0-Hh/2/view.s;draw();}).observe(cv);
// ---------- 3D (lazy) ----------
let V=null,roof='flat';const v3=async()=>{if(!V){$('sk3').hidden=false;V=await import('./v3.js?v=20261121s');window.__vk={get m(){return V;},playCam:(k,s,e)=>V.playCam(k,s,e),scrub:(u)=>V.scrubCam&&V.scrubCam(u),count:()=>V.countFurn&&V.countFurn(),snap:()=>V.snapBuild&&V.snapBuild(),debug:()=>V.debugViz&&V.debugViz(),doll:on=>V.dollhouse(on),walk:v=>V.setWalk(v),jump:(x,z)=>V.jump&&V.jump(x,z,1.55),stop:()=>V.stopCam&&V.stopCam(),clearance:()=>V.checkClearances&&V.checkClearances(),bird:(x,z,h)=>V.birdCam&&V.birdCam(x,z,h),pause:on=>V.pauseCam&&V.pauseCam(on)};}return V;};
// prem10 storey picker (Bez strechy): Všetko / 1NP / 2NP …; only for multi-storey houses. Picking a storey = it becomes the top cut (upper storeys hidden, lower ones ghosted).
let LVSEL=-1;function lvPickUI(md){const P=$('lvpick');if(!P)return;const ok=md==='doll'&&H&&H.levels&&H.levels.length>1;P.hidden=!ok;if(!ok)return;
 P.innerHTML='';[['Všetko',-1],...H.levels.map((l,i)=>[l.name,i])].forEach(([t,i])=>{const b=document.createElement('button');b.textContent=t;b.dataset.l=t;b.setAttribute('aria-pressed',LVSEL===i?'true':'false');if(LVSEL===i)b.classList.add('on');
  b.onclick=async()=>{LVSEL=i;const m=await v3();m.setLevelCut&&m.setLevelCut(i<0?null:i);lvPickUI('doll');};P.appendChild(b);});}
function modeUI(md){lvPickUI(md);[['mExt','ext'],['doll','doll'],['walk','walk']].forEach(([id,k])=>{const b=$(id);if(b)b.classList.toggle('on',md===k);});
 $('st').textContent=md==='walk'?(TCH?'Joystick vľavo dole = chôdza, ťahajte prstom = rozhliadanie.':'W A S D / šípky = chôdza, ťahajte myšou = rozhliadanie.'):md==='doll'?(TCH?'Ťahajte = otáčanie, 2 prsty = zoom. Ťuknite na miestnosť hore a vojdete dnu.':'Ťahajte = otáčanie, koliesko = zoom. Kliknite na miestnosť hore a vojdete dnu.'):(TCH?'Ťahajte = otáčanie, 2 prsty = zoom.':'Ťahajte = otáčanie, koliesko = zoom.');}
function wUI(v){jumpsUI(v||DOLL_ON);modeUI(v?'walk':(DOLL_ON?'doll':'ext'));}
let genN=0;async function gen(anim){const n=++genN;$('sk3').hidden=false;$('emp3').hidden=true;try{const m=await v3();if(m.ensureKit)await m.ensureKit();if(n!==genN)return;m.setRoof(roof);if(m.setSun)m.setSun(16.5,false);extSides();rulesFix();try{const rr=rulesCheck();if(rr.length)console.info('[rules]',rr.filter(x=>x.sev==='hard').length,'hard',rr.filter(x=>x.sev==='soft').length,'soft',rr);}catch(e){console.warn('rules',e);}const ok=m.gen(H,anim);m.setMat(H.mat||{});const mt=H.mat||{};$('mwall').value=mt.wall||'#f4f1ec';$('mfloor').value=mt.floor||'dub';$('mfac').value=mt.fac||'#f7f5f0';$('mfasada').value=mt.fasada||'mix';$('mroof').value=mt.roof||'#5c6672';$('msty').value=H.style||'';['mwall','mfloor','mfac','mroof'].forEach(k=>{const e=$(k);if(e.selectedIndex<0&&e.value!==undefined){const v={mwall:mt.wall,mfloor:mt.floor,mfac:mt.fac,mroof:mt.roof}[k]||e.options[0].value;const o=document.createElement('option');o.value=v;o.textContent='vlastná';e.appendChild(o);e.value=v;}});{const A=H.atmo||{};const h=A.h!=null?A.h:14.5;$('mwx').value=A.w||'sun';$('sunh').value=h;hl(h);if(m.setAtmo)m.setAtmo({t:A.t||'day',w:A.w||'sun',h});}$('emp3').hidden=ok;if(ok)wUI(m.isWalk());const vb=$('VRButton');if(vb)vb.style.display=/NOT|ONLY/i.test(vb.textContent)?'none':'';}catch(e){console.warn(e);toast('3D sa nepodarilo načítať. Skontrolujte pripojenie.','err');}finally{if(n===genN)$('sk3').hidden=true;}}
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};
$('snap3').onclick=async()=>{try{window.vkA&&window.vkA('export_png')}catch(e){};const m=await v3();const u=m.snap&&m.snap();if(u){const b=await(await fetch(u)).blob();dl(b,(H.name||'dom')+'_3d.png');toast('3D snímka uložená (PNG).','ok');}};
$('glb').onclick=async()=>{try{window.vkA&&window.vkA('export_glb')}catch(e){};const m=await v3();try{const b=await m.glb();if(b){dl(b,(H.name||'dom')+'.glb');toast('3D model stiahnutý (GLB).','ok');}}catch(e){toast('Export zlyhal.','err');}};
async function packH(){const j={...H,underlay:undefined,ulv:undefined,levels:H.levels.map(l=>({...l,ul:undefined})),roof};const st=new Blob([JSON.stringify(j)]).stream().pipeThrough(new CompressionStream('gzip'));const b=new Uint8Array(await new Response(st).arrayBuffer());let t='';b.forEach(c=>t+=String.fromCharCode(c));return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function unpackH(t){const b=Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
$('share').onclick=async()=>{try{window.vkA&&window.vkA('share')}catch(e){};const base=location.href.split('#')[0]+'#t='+await packH();let url=base+'&pres';
 const r=await dlg('Zdieľať prehliadku','<p>Odkaz otvorí 3D prehliadku bez editora. Pošlite ho klientovi.</p><label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="pr" checked style="width:auto" onchange="const i=this.closest(\'.dlg\').querySelector(\'input[readonly]\');i.value=this.checked?i.dataset.p:i.dataset.b"> Prezentácia pre klienta (auto-prehliadka, kontakt makléra)</label><input type="text" readonly data-b="'+esc(base)+'" data-p="'+esc(url)+'" value="'+esc(url)+'">',[['Zavrieť',null],['Stiahnuť ako súbor','f'],['Kopírovať odkaz','c','go']]);if(r&&r.f&&!r.f.pr)url=base;
 if(r&&r.v==='c'){try{await navigator.clipboard.writeText(url);toast('Odkaz skopírovaný.','ok');}catch(e){toast('Kopírovanie zlyhalo – označte odkaz ručne.','warn');}}
 if(r&&r.v==='f')dl(new Blob(['<!doctype html><meta charset="utf-8"><title>'+esc(H.name)+' – prehliadka</title><meta http-equiv="refresh" content="0;url='+esc(url)+'"><a href="'+esc(url)+'">Otvoriť prehliadku</a>'],{type:'text/html'}),(H.name||'dom')+' - prehliadka.html');};
$('roof').onchange=async e=>{const v=e.target.value,prev=roof;roof=v;if(H)H.roof=roof;if((v==='none')!==(prev==='none')&&prev&&v){const m=await v3();if(m.setRoof){m.setRoof(v,true);if(v!=='none')gen(false);else return;}}gen(false);};
function show(s,nopush){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.s===s));document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('on',x.id===s));
 $('tbed').classList.toggle('on',s==='ed');if(s==='home'){home();}$('tbvw').classList.toggle('on',s==='vw');document.body.classList.toggle('in3d',s==='vw');document.querySelector('.seg').style.visibility=s==='home'?'hidden':'';$('pname').style.display=s==='home'?'none':'';const vb=$('VRButton');if(vb)vb.style.display=s==='vw'&&!/NOT|ONLY/i.test(vb.textContent)?'':'none';if(s==='vw'){try{window.vkA&&window.vkA('view_3d')}catch(e){};try{autoFurn();}catch(e){console.warn('autoFurn',e);}if(!window.__mktBusy)gen(true);if(!localStorage.vkTut3&&!window.__mktBusy)tutWait(0,TUT3,'vkTut3');}else if(s==='ed'){requestAnimationFrame(fit);if(!localStorage.vkTut)tutWait();}
 if(H&&s!=='home')$('pname').textContent=H.name;
 if(s!=='vw'){$('jumps').hidden=true;if($('lvpick'))$('lvpick').hidden=true;}
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
 RS.forEach(r=>{const G=stairNoGo(makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim),L);validateRoom(G,(H.furn||[]).filter(f=>f.level===L&&(f.rid&&ids0.has(f.rid)?f.rid:roomAt(R,f.p))===r.id),roomType(r,TT,R,L)).forEach(v=>out.push({room:r.n,...v}));});
 (H.furn||[]).filter(f=>f.level===L&&!RS.some(r=>r.id===roomAt(R,f.p))&&roomAt(R,f.p)===-1&&!['art','curtain','pendant','mirror','towel'].includes(f.t)).forEach(f=>out.push({room:'-',t:f.t,p:f.p,rule:'in-wall'}));
 // door sanity: one door per room unless it is a hall / living area; never two leaves in (almost) the same opening
 const D=roomDoors(R,L);RS.forEach(r=>{if(!D.some(d=>d.a===r.id||d.b===r.id)&&!zoneTouch(R,r.id))out.push({room:r.n,t:'door',rule:'room-without-door'});});
 H.walls.filter(w=>w.level===L).forEach(w=>(w.openings||[]).forEach(o=>{if(o.type==='door'&&o.kind==='double')out.push({room:'-',t:'door',rule:'two-leaves-in-one-opening'});}));
 for(let i=0;i<D.length;i++)for(let j=i+1;j<D.length;j++)if(Math.abs(D[i].u[0]*D[j].u[0]+D[i].u[1]*D[j].u[1])>.95&&Math.hypot(D[i].c[0]-D[j].c[0],D[i].c[1]-D[j].c[1])<Math.max(.35,.6*Math.min(D[i].w,D[j].w)))out.push({room:'-',t:'door',p:D[i].c,rule:'two-leaves-in-one-opening'});
 doorViol().forEach(v=>out.push(v));window.__viol=out;return out;}
window.__validate=validateAll;window.__roomCenters=()=>rooms().map(r=>({n:r.n,a:r.a,c:[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2],bb:r.bb}));
// a room the plan gives no access gets exactly one door, on the wall it shares with a hall / living / other room (logged)
function addMissingDoors(R,L,RS,T,log){const D=roomDoors(R,L);const PR=t=>/^(Predsieň|Chodba|Hala|Zádverie)/.test(t||'')?3:/^Obývačka|^Jedáleň|^Kuchyňa/.test(t||'')?2:1;
 RS.forEach(r=>{if(D.some(d=>d.a===r.id||d.b===r.id)||zoneTouch(R,r.id))return;let best=null;
  H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=w.thickness/2+.25,st=.05;let run=null;const ops=(w.openings||[]);
   const flush=()=>{if(run&&run.s1-run.s0>=1.0){const nb=RS.find(q=>q.id===run.nb);const sc=PR(T[run.nb])*10+Math.min(run.s1-run.s0,3);if(!best||sc>best.sc)best={sc,w,s:(run.s0+run.s1)/2,nb:nb&&nb.n};}run=null;};
   for(let s=.1;s<=G.L-.1;s+=st){const c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);
    const nb=a===r.id&&b>1?b:b===r.id&&a>1?a:0;const busy=ops.some(o=>s>o.offset-.15&&s<o.offset+o.width+.15);
    if(nb&&!busy&&(!run||run.nb===nb)){if(!run)run={s0:s,s1:s,nb};else run.s1=s;}else{flush();if(nb&&!busy)run={s0:s,s1:s,nb};}}flush();});
  if(best){const wd=.8;(best.w.openings=best.w.openings||[]).push({type:'door',kind:'single',offset:+(best.s-wd/2).toFixed(3),width:wd,height:2.05,sill:0,hinge:'R'});log.push({fix:'door-added',room:r.n,to:best.nb});}});}
/* v20261118v: every house needs a way in. When the ground floor has no exterior door (plan reading missed it), add a 1 m entrance on the
   longest free exterior wall run of the best room (hall > living/kitchen > other), keeping 15 cm from other openings; last resort: turn the widest
   exterior window of that room into the entrance. Same rule for demo, re-generated and uploaded houses. */
/* v21o: exterior doors of the ground floor that lead into a non-garage room (the house entrance candidates). audit: entrance-present */
function entDoorsN(L){const R=RC[L],RS=rooms(L)||[];if(!R||!RS.length)return -1;const ids=new Set(RS.map(q=>q.id)),out=v=>v!==-1&&!ids.has(v),T=assignTypes(R,L);let n=0;
 H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),nn=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door'||o.kind==='garage')return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];const a=roomAt(R,[c[0]+nn[0]*e,c[1]+nn[1]*e]),b=roomAt(R,[c[0]-nn[0]*e,c[1]-nn[1]*e]);const ra=ids.has(a)&&out(b)?a:ids.has(b)&&out(a)?b:0;if(ra&&!/^Garáž/.test(T[ra]||''))n++;});});return n;}
function addEntrance(R,L,RS,log){if(!H.levels||!H.levels.length||L!==H.levels[0].name||!RS.length)return;const ids=new Set(RS.map(q=>q.id)),out=v=>v!==-1&&!ids.has(v),T=assignTypes(R,L);
 const PR=t=>/^(Predsieň|Chodba|Hala|Zádverie)/.test(t||'')?3:/^Obývačka|^Jedáleň|^Kuchyňa/.test(t||'')?2:/^(Kúpeľňa|WC|Komora|Špajza|Technická)/.test(t||'')?0:1;
 const W=H.walls.filter(w=>w.level===L);let has=false;
 W.forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);const ra=ids.has(a)&&out(b)?a:ids.has(b)&&out(a)?b:0;/* v21o RULE (entrance-present): a door into the garage (or a garage gate) is not the house entrance */if(ra&&(o.kind==='garage'||(/^Garáž/.test(T[ra]||'')&&!(globalThis.__PF||{}).noEntGar)))return;if(ra)has=true;});});
 if(has)return;let best=null,bw=null;
 W.forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25,st=.05,ops=w.openings||[];let run=null;
  const flush=()=>{if(run&&run.s1-run.s0>=1.3){const rr=RS.find(q=>q.id===run.r),sc=PR(T[run.r])*10+Math.min(run.s1-run.s0,4)+Math.min((rr&&rr.a)||0,60)/20;/* bigger room of the same kind wins (main living space, not a side room) */if(!best||sc>best.sc)best={sc,w,s:(run.s0+run.s1)/2,r:run.r};}run=null;};
  for(let s=.15;s<=G.L-.15;s+=st){const c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);
   let r=ids.has(a)&&out(b)?a:ids.has(b)&&out(a)?b:0;if(r&&/^Garáž/.test(T[r]||''))r=0;const busy=ops.some(o=>s>o.offset-.2&&s<o.offset+o.width+.2);
   if(r&&!busy&&(!run||run.r===r)){if(!run)run={s0:s,s1:s,r};else run.s1=s;}else{flush();if(r&&!busy)run={s0:s,s1:s,r};}}flush();
  ops.forEach(o=>{if(o.type!=='window'||o.width<.9)return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);const r=ids.has(a)&&out(b)?a:ids.has(b)&&out(a)?b:0;if(!r||/^Garáž/.test(T[r]||''))return;const sc=PR(T[r])*10+o.width;if(!bw||sc>bw.sc)bw={sc,w,o,r};});});
 const wd=1;if(best&&best.sc>=10){(best.w.openings=best.w.openings||[]).push({type:'door',kind:'entrance',offset:+(best.s-wd/2).toFixed(3),width:wd,height:2.1,sill:0,hinge:'R'});log.push({fix:'entrance-added',room:T[best.r]||best.r});return;}
 if(bw&&(!best||bw.sc>=best.sc)){const o=bw.o,c=o.offset+o.width/2,ww=Math.min(o.width,1.2);Object.assign(o,{type:'door',kind:'entrance',offset:+(c-ww/2).toFixed(3),width:ww,height:2.1,sill:0,hinge:'R'});log.push({fix:'entrance-from-window',room:T[bw.r]||bw.r});return;}
 if(best){(best.w.openings=best.w.openings||[]).push({type:'door',kind:'entrance',offset:+(best.s-wd/2).toFixed(3),width:wd,height:2.1,sill:0,hinge:'R'});log.push({fix:'entrance-added',room:T[best.r]||best.r});}}
// small bathroom / WC: the leaf must not swing into the room (it would block the fixtures) -> swing out, or sliding if outside is a tight hall
function wetDoors(R,L,RS,T,log){const wet=new Set(RS.filter(r=>(/^(Kúpeľňa|WC)/.test(T[r.id]||'')&&r.a<6)||(/^(Komora|Špajza|Šatník|Technická|Predsieň|Zádverie)/.test(T[r.id]||'')&&r.a<3.5)).map(r=>r.id));if(!wet.size)return;
 H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=w.thickness/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door'||o.kind==='sliding'||o.kind==='entrance'||o.kind==='terrace')return;
  const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s],a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);
  const inA=wet.has(a),inB=wet.has(b);if(!inA&&!inB||inA&&inB){if(inA&&inB&&o.kind!=='sliding'){o.kind='sliding';log.push({fix:'wet-door-sliding'});}return;}
  // swing side: room a when !o.out (see layoutOps)
  const want=inA?1:0;const other=inA?b:a,oth=RS.find(r=>r.id===other);const hall=t=>/^(Predsieň|Chodba|Hala|Zádverie|Schodisko)/.test(t||'');
  if(oth&&hall(T[other]))return;/* v20261117t: never force a wet door into a hall/landing; doorChoose keeps the walkway clear */
  if(oth&&oth.a<3.5){o.kind='sliding';log.push({fix:'wet-door-sliding',room:T[inA?a:b]});return;}
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
/* v18h RULE (one printed area = one room): a room polygon holding two or more different printed areas lost a wall piece - usually a door
   gap where a wall stops short of another. Try closing each short gap (wall end -> nearest wall straight ahead, <= 1.3 m) inside that room
   with a door; keep the one that separates the labels with room sizes closest to the printed areas. audit: room-merged */
/* v18h RULE (garage from the drawing): catalogue plans print no room names - a room on the outside wall, 13-45 m2, at least 2.6 x 4.6 m,
   holding one drawn car outline (ink component about 1.5-2.5 x 3.6-5.6 m) is a garage: it is named Garáž, which gives it the
   sectional door, driveway and car (rules garage-door, garage-drive). */
/* v18k RULE (drawn terrace): catalogue plans draw the terrace as a paved/tiled area against the facade (often with an unreadable area label on the
   hatch). A band 0.4-3.2 m outside one facade whose ink is densely textured over >= 2 m is that terrace: H.terrInk {s:side 0 N,1 W,2 S,3 E, a,b along}.
   v3 puts the deck there (audit terrace-placed). Plain margins, colour fills and single dimension lines stay below the density bar. */
function terrInk(L){if((globalThis.__PF||{}).noTerrInk||!bg||!H.underlay)return;if(!bg.complete||!bg.naturalWidth){bg.addEventListener('load',()=>terrInk(L),{once:true});return;}
 const W=H.walls.filter(w=>w.level===L);if(W.length<4)return;const iw=bg.naturalWidth,ih=bg.naturalHeight,ppm=iw/bgW;if(ppm<8)return;const xs=W.flatMap(w=>[w.start[0],w.end[0]]),zs=W.flatMap(w=>[w.start[1],w.end[1]]),X0=Math.min(...xs),X1=Math.max(...xs),Z0=Math.min(...zs),Z1=Math.max(...zs);
 const cv=document.createElement('canvas');cv.width=iw;cv.height=ih;const cx=cv.getContext('2d');cx.drawImage(bg,0,0);const D=cx.getImageData(0,0,iw,ih).data,g=(x,y)=>{const i=(y*iw+x)*4;return D[i]*.3+D[i+1]*.59+D[i+2]*.11;};
 const res=[];for(let s=0;s<4;s++){const hz=s%2===0,a0=hz?X0:Z0,a1=hz?X1:Z1,bins=[];for(let a=a0;a<a1-.25;a+=.5){let n=0,e=0;for(let d=.4;d<3.2;d+=1/ppm*1.5)for(let t=a;t<a+.5;t+=1/ppm*1.5){const x=hz?t:(s===1?X0-d:X1+d),z=hz?(s===0?Z0-d:Z1+d):t;const px=Math.round(x*ppm),py=Math.round(z*ppm);if(px<1||py<1||px>=iw-1||py>=ih-1)continue;n++;const v=g(px,py);if(Math.abs(v-g(px+1,py))>35||Math.abs(v-g(px,py+1))>35)e++;}bins.push(n>20?e/n:0);}
  let best=null,st=-1;bins.concat([0]).forEach((v,i)=>{if(v>.07){if(st<0)st=i;}else if(st>=0){const L2=(i-st)*.5,m=bins.slice(st,i).reduce((p,q)=>p+q,0)/(i-st);if(L2>=2&&(!best||L2*m>best.L*best.m))best={a:a0+st*.5,b:a0+i*.5,L:L2,m};st=-1;}});
  const avg=bins.reduce((p,q)=>p+q,0)/Math.max(1,bins.length);if(best)res.push({s,a:+best.a.toFixed(2),b:+best.b.toFixed(2),m:+best.m.toFixed(3),avg:+avg.toFixed(3)});}
 window.__terrInk=res;res.sort((p,q)=>q.m*(q.b-q.a)-p.m*(p.b-p.a));const r=res[0];H.terrInk=r&&r.m>=.1&&(!res[1]||r.m*(r.b-r.a)>1.8*res[1].m*(res[1].b-res[1].a))?{level:L,s:r.s,a:r.a,b:r.b}:null;
 /* v21c RULE (terrace off the living room, audit terrace-pergola): when the drawn terrace lies against the living/dining room and that facade has no door in the terrace span,
    its widest window there (>= 0.9 m) becomes the glazed terrace door; the deck is flagged liv so it gets the pergola even without a door */
 const k=H.terrInk;if(k){try{const RS=rooms(L),R0=RC[L];if(R0&&R0.g){const T=assignTypes(R0,L),hz=k.s%2===0,e=[Z0,X0,Z1,X1][k.s],n=[[0,-1],[-1,0],[0,1],[1,0]][k.s];let hasD=false,best=null,livS=0;
  W.forEach(w=>{const G=geo(w);if(hz?Math.abs(G.u[1])>.05||Math.abs(G.z0-e)>.45:Math.abs(G.u[0])>.05||Math.abs(G.x0-e)>.45)return;const ti=(w.thickness||.3)/2+.3;(w.openings||[]).forEach(o=>{const m=o.offset+o.width/2,p=hz?G.x0+G.u[0]*m:G.z0+G.u[1]*m;if(p<k.a-.3||p>k.b+.3)return;const c=[G.x0+G.u[0]*m-n[0]*ti,G.z0+G.u[1]*m-n[1]*ti],id=roomAt(R0,c),rr=RS.find(q=>q.id===id),nm=rr?roomType(rr,T,R0,L):'';const lv=/Obýv|Jedál/.test(nm);if(lv)livS=1;
   if(o.type==='door'&&o.kind!=='garage')hasD=true;else if(o.type==='window'&&lv&&o.width>=.9&&(!best||o.width>best.width))best=o;});});
  for(let p=k.a+.3;p<=k.b-.3&&!livS;p+=.4){const c=hz?[p,e-n[1]*.6]:[e-n[0]*.6,p],id=roomAt(R0,c),rr=RS.find(q=>q.id===id);if(rr&&/Obýv|Jedál/.test(roomType(rr,T,R0,L)))livS=1;}/* the room behind the drawn terrace, sampled along its span */
  if(livS)k.liv=1;if(!hasD&&best){best.type='door';best.kind='terrace';best.sill=0;best.height=2.15;k.door=1;H.terrDoorFix=1;}}}catch(e){console.warn('terrDoor',e);}}}
function carGarage(L){if((globalThis.__PF||{}).noCar||!bg||!H.underlay)return;if(!bg.complete||!bg.naturalWidth){bg.addEventListener('load',()=>carGarage(L),{once:true});return;}
 const RS=rooms(L),R=RC[L];if(!R||RS.some(r=>/gar/i.test(r.n||'')))return;const iw=bg.naturalWidth,ih=bg.naturalHeight,ppm=iw/bgW;if(ppm<8)return;
 const cv=document.createElement('canvas');cv.width=iw;cv.height=ih;const cx=cv.getContext('2d');cx.drawImage(bg,0,0);const D=cx.getImageData(0,0,iw,ih).data;
 const hits=[];for(const r of RS){const bb=r.bb;if(!bb)continue;const bw=bb[2]-bb[0],bh=bb[3]-bb[1];if(r.a<13||r.a>45||Math.min(bw,bh)<2.6||Math.max(bw,bh)<4.6)continue;
  const m=.3,x0=Math.max(0,Math.floor((bb[0]+m)*ppm)),y0=Math.max(0,Math.floor((bb[1]+m)*ppm)),x1=Math.min(iw,Math.ceil((bb[2]-m)*ppm)),y1=Math.min(ih,Math.ceil((bb[3]-m)*ppm)),W=x1-x0,Hh=y1-y0;if(W<10||Hh<10)continue;
  const ink=new Uint8Array(W*Hh);for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const k=((y+y0)*iw+x+x0)*4,g=(D[k]+D[k+1]+D[k+2])/3,sat=Math.max(D[k],D[k+1],D[k+2])-Math.min(D[k],D[k+1],D[k+2]);
   const wx=(x+x0)/ppm,wz=(y+y0)/ppm;if(g<205&&sat<60&&roomAt(R,[wx,wz])===r.id)ink[y*W+x]=1;}
  /* components with 1 px dilation (outlines are thin and broken) */const lab=new Int32Array(W*Hh);let n=0;const comps=[];
  for(let i=0;i<W*Hh;i++){if(!ink[i]||lab[i])continue;n++;const st=[i];lab[i]=n;let a=0,mx=1e9,my=1e9,Mx=-1,My=-1;while(st.length){const j=st.pop(),x=j%W,y=(j/W)|0;a++;if(x<mx)mx=x;if(x>Mx)Mx=x;if(y<my)my=y;if(y>My)My=y;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=Hh)continue;const q=yy*W+xx;if(ink[q]&&!lab[q]){lab[q]=n;st.push(q);}}}
   comps.push({a,w:(Mx-mx+1)/ppm,h:(My-my+1)/ppm});}
    const car=comps.filter(c=>{const s=Math.min(c.w,c.h),l=Math.max(c.w,c.h);return s>=1.5&&s<=2.5&&l>=3.6&&l<=5.6&&c.a/(c.w*c.h*ppm*ppm)<.45;});
  const big=comps.filter(c=>Math.max(c.w,c.h)>=1.2);if(car.length===1&&big.length<=3)hits.push({r,c:car[0]});}
 if(hits.length!==1)return;const r=hits[0].r,p=[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2];const id=roomAt(R,p)===r.id?p:null;if(!id)return;
 H.rn=(H.rn||[]).filter(e=>!(e.level===L&&roomAt(R,e.p)===r.id));H.rn.push({level:L,p,n:'Garáž'});delete RC[L];H.carFix=[r.a,hits[0].c];save();try{draw();}catch(e){}}
/* v18i RULE (a printed room area lies in a room): an area label OUTSIDE every room means an open-plan room leaks out through its
   glazing / terrace front. Close the building envelope (morphological closing of the wall mask, radius 1-4 m, holes filled) and take the
   label's region inside it: it must hold only this label, be closed mostly by real walls (open front <= 45 % of its outline - a terrace
   in a notch is mostly open and stays outside), and match the printed area at the plan's own area scale (median of the labelled rooms,
   within 22 %). The open front becomes wall runs with a terrace door; never one that adds a hard rule problem. */
function labelHull(L){if((globalThis.__PF||{}).noHull)return;const A=(H.rarea||[]).filter(a=>a.level===L&&a.p&&a.v>=4&&a.v<150);if(A.length<4)return;const log=[];
 const hard=()=>{try{return (window.__rulesCheck()||[]).filter(p=>p.sev==='hard').length;}catch(e){return 1e9;}};
 for(let it=0;it<4;it++){const RS=rooms(L),R=RC[L];if(!R||!R.g)break;const{c}=R,P=Math.round(4.5/c)+2,W=R.W+2*P,Hh=R.Hh+2*P,N=W*Hh,x0=R.x0-P*c,z0=R.z0-P*c,g=new Int32Array(N);for(let z=0;z<R.Hh;z++)for(let x=0;x<R.W;x++)g[(z+P)*W+x+P]=R.g[z*R.W+x];const by={};A.forEach(a=>{const id=roomAtL(R,a.p);(by[id]=by[id]||[]).push(a);});
  const rs=RS.filter(r=>by[r.id]&&by[r.id].length===1&&r.a>=2).map(r=>Math.log(r.a/by[r.id][0].v)).sort((a,b)=>a-b);if(rs.length<3)break;const mu=rs[rs.length>>1];
  const cell=p=>{const ix=Math.round((p[0]-x0)/c),iz=Math.round((p[1]-z0)/c);return ix>=0&&iz>=0&&ix<W&&iz<Hh?iz*W+ix:-1;};
  const lost=A.filter(a=>!RS.some(r=>r.id===roomAtL(R,a.p))&&cell(a.p)>=0&&g[cell(a.p)]!==-1).sort((a,b)=>b.v-a.v);if(!lost.length)break;
  const wm=new Uint8Array(N);for(let i=0;i<N;i++)wm[i]=g[i]===-1?1:0;
  const box=(src,r,mx)=>{/* separable square dilation (mx=1) / erosion (mx=0) */const t=new Uint8Array(N),o=new Uint8Array(N);
   for(let z=0;z<Hh;z++){let run=0;const row=z*W;for(let x=0;x<W;x++){let v=mx?0:1;for(let k=-r;k<=r;k++){const xx=x+k;const s=xx<0||xx>=W?(mx?0:1):src[row+xx];if(mx?s:!s){v=mx?1:0;break;}}t[row+x]=v;}}
   for(let x=0;x<W;x++)for(let z=0;z<Hh;z++){let v=mx?0:1;for(let k=-r;k<=r;k++){const zz=z+k;const s=zz<0||zz>=Hh?(mx?0:1):t[zz*W+x];if(mx?s:!s){v=mx?1:0;break;}}o[z*W+x]=v;}return o;};
  let HC=null;const HULL=()=>{if(HC)return HC;/* convex envelope of the walls (monotone chain) rasterised */const pts=[];H.walls.filter(w=>w.level===L).forEach(w=>[w.start,w.end].forEach(p=>pts.push([p[0],p[1]])));pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
   const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(const p of pts.slice().reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
   const hp=lo.slice(0,-1).concat(up.slice(0,-1));HC=new Uint8Array(N);for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){const p=[x0+x*c,z0+z*c];let inn=hp.length>=3;for(let k=0;k<hp.length&&inn;k++){if(cr(hp[k],hp[(k+1)%hp.length],p)<-1e-9)inn=false;}if(inn)HC[z*W+x]=1;}return HC;};
  let done=0;
  for(const a of lost){const s0=cell(a.p);let best=null;
   for(const rm of[1,1.5,2,2.5,3,4,'hull']){let F;const st=[];if(rm==='hull'){F=HULL();}else{const r=Math.round(rm/c);if(r*2>Math.min(W,Hh))break;const D=box(wm,r,1);/* fill holes: outside = border-connected non-D */const out=new Uint8Array(N);
    for(let x=0;x<W;x++){st.push(x,(Hh-1)*W+x);}for(let z=0;z<Hh;z++){st.push(z*W,z*W+W-1);}while(st.length){const i=st.pop();if(out[i]||D[i])continue;out[i]=1;const x=i%W;if(x>0)st.push(i-1);if(x<W-1)st.push(i+1);if(i>=W)st.push(i-W);if(i<N-W)st.push(i+W);}
    const Fd=new Uint8Array(N);for(let i=0;i<N;i++)Fd[i]=out[i]?0:1;F=box(Fd,r,0);}for(let i=0;i<N;i++)if(wm[i])F[i]=1;if(!F[s0]){continue;}
    const cm=new Uint8Array(N);st.push(s0);let n=0,edge=0;while(st.length){const i=st.pop();if(cm[i]||wm[i]||!F[i])continue;cm[i]=1;n++;const x=i%W;if(x===0||x===W-1||i<W||i>=N-W){edge=1;break;}st.push(i-1,i+1,i-W,i+W);}if(edge||!n){continue;}
    let ow=0,op=0;for(let i=0;i<N;i++){if(!cm[i])continue;for(const j of[i-1,i+1,i-W,i+W]){if(cm[j])continue;if(wm[j])ow++;else if(!F[j])op++;}}
    if(!op||op>.45*(op+ow))continue;
    const others=A.filter(b=>b!==a&&Math.abs(b.v-a.v)>.05&&cell(b.p)>=0&&cm[cell(b.p)]);if(others.length)continue;
    const err=Math.abs(Math.log(n*c*c/a.v)-mu);if(err<.22&&(!best||err<best.err))best={err,cm,F,rm,op:+(op/(op+ow)).toFixed(2)};}
   if(!best)continue;
   /* open front -> wall runs on the cell edges between the region and the outside */const{cm,F}=best,segs=[];
   const runs=(isH)=>{const A1=isH?Hh:W,A2=isH?W:Hh;for(let u=0;u<A1;u++)for(const dir of[-1,1]){let st0=-1;for(let v=0;v<=A2;v++){let on=0;if(v<A2){const i=isH?u*W+v:v*W+u,j=isH?i+dir*W:i+dir;on=cm[i]&&j>=0&&j<N&&!cm[j]&&!wm[j]&&!F[j]?1:0;}
     if(on&&st0<0)st0=v;if(!on&&st0>=0){const len=(v-st0)*c;if(len>=.3){const e=(u+dir*.5);segs.push(isH?[[x0+(st0-.5)*c,z0+e*c],[x0+(v-.5)*c,z0+e*c]]:[[x0+e*c,z0+(st0-.5)*c],[x0+e*c,z0+(v-.5)*c]]);}st0=-1;}}}};
   runs(true);runs(false);if(!segs.length||segs.length>6)continue;
   const t0=(H.walls.find(w=>w.level===L)||{}).thickness||.3,hh=(H.walls.find(w=>w.level===L)||{}).height||2.8,k0=H.walls.length;let li=0,lm=0;segs.forEach((q,i)=>{const l=Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1]);if(l>lm){lm=l;li=i;}});
   segs.forEach((q,i)=>{const dx=q[1][0]-q[0][0],dz=q[1][1]-q[0][1],l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,ex=t0/2;/* extend into the walls it meets */const p0=[+(q[0][0]-ux*ex).toFixed(3),+(q[0][1]-uz*ex).toFixed(3)],p1=[+(q[1][0]+ux*ex).toFixed(3),+(q[1][1]+uz*ex).toFixed(3)],L2=l+2*ex;
    const ops=[];if(i===li&&L2>=1.4){const dw=Math.min(2.4,L2-.8);ops.push({type:'door',kind:'terrace',offset:+((L2-dw)/2).toFixed(3),width:+dw.toFixed(2),height:2.2,auto:1});}
    else if(L2>=1.6){const ww=Math.min(3,L2-.8);ops.push({type:'window',offset:+((L2-ww)/2).toFixed(3),width:+ww.toFixed(2),sill:.5,height:1.7,auto:1});}
    H.walls.push({id:'lh'+Date.now().toString(36)+i,auto:1,level:L,start:p0,end:p1,thickness:Math.min(t0,.3),base:0,height:hh,openings:ops});});
   const add=H.walls.splice(k0);const h0=hard();H.walls.push(...add);const RS2=rooms(L),R2=RC[L],id=roomAtL(R2,a.p),rr=RS2.find(r=>r.id===id);const h1=hard();
   const okA=rr&&Math.abs(Math.log(rr.a/a.v)-mu)<.25&&RS.every(r=>!by[r.id]||RS2.some(q=>q.id===roomAtL(R2,by[r.id][0].p)));
   if(okA&&h1<=h0){log.push([a.v,best.rm,+best.err.toFixed(2),best.op,add.length]);done=1;break;}H.walls.splice(k0);}
  if(!done)break;}
 if(log.length)H.hullFix=log;}
/* v18i RULE (one printed area = one room, the other way): a labelled room clearly SMALLER than its printed area (at the plan's own
   area scale) next to an unlabelled room was cut by furniture read as walls (table, chairs, counters). Remove the wall piece between
   them when the joined room matches the printed area better (within 25 %) and takes in no other label; never one that adds a hard
   rule problem. */
function labelMerge(L){if((globalThis.__PF||{}).noMerge)return;const A=(H.rarea||[]).filter(a=>a.level===L&&a.p&&a.v>=1&&a.v<150);if(A.length<4)return;const log=[];
 const hard=()=>{try{return (window.__rulesCheck()||[]).filter(p=>p.sev==='hard').length;}catch(e){return 1e9;}};
 const st=()=>{const RS=rooms(L),R=RC[L],by={};A.forEach(a=>{const id=roomAtL(R,a.p);if(RS.some(r=>r.id===id))(by[id]=by[id]||[]).push(a);});return{RS,R,by};};
 for(let it=0;it<12;it++){const{RS,R,by}=st();const rs=RS.filter(r=>by[r.id]&&by[r.id].length===1&&r.a>=1).map(r=>Math.log(r.a/by[r.id][0].v)).sort((a,b)=>a-b);if(rs.length<3)break;const mu=rs[rs.length>>1];
  const small=RS.filter(r=>by[r.id]&&by[r.id].length===1&&Math.log(r.a/by[r.id][0].v)-mu<-.22);if(!small.length)break;let done=0;
  for(const r of small){const v=by[r.id][0].v,e0=Math.abs(Math.log(r.a/v)-mu);let best=null;const h0=hard();
   H.walls.forEach((w,wi)=>{if(w.level!==L||best&&best.wi===wi)return;const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l=Math.hypot(dx,dz);if(l<.2||l>6)return;const nx=-dz/l,nz=dx/l,off=w.thickness/2+.15;
    let side=null;for(const f of[.25,.5,.75]){const m=[w.start[0]+dx*f,w.start[1]+dz*f],a=roomAtL(R,[m[0]+nx*off,m[1]+nz*off]),b=roomAtL(R,[m[0]-nx*off,m[1]-nz*off]);if(a===r.id&&b!==r.id)side=b;else if(b===r.id&&a!==r.id)side=a;if(side!=null)break;}
    if(side==null)return;const q=RS.find(x=>x.id===side);if(!q||by[q.id]||q.a>v*1.2+2)return;
    const k=H.walls.splice(wi,1)[0];const T=st();const id=roomAtL(T.R,by[r.id][0].p),rr=T.RS.find(x=>x.id===id);
    if(rr&&(T.by[id]||[]).length===1){const e=Math.abs(Math.log(rr.a/v)-mu);/* step by step (a table + chairs cut the room into several pieces): any clear improvement that does not overshoot */if(Math.log(rr.a/v)-mu<.25&&e<e0-.05&&(!best||e<best.e))best={wi,e,w:k};}
    H.walls.splice(wi,0,k);});
   if(best){const k=H.walls.splice(best.wi,1)[0];const h=hard();if(h<=h0){log.push([v,+best.e.toFixed(2)]);done=1;break;}H.walls.splice(best.wi,0,k);}}
  if(!done)break;}
 if(log.length)H.mergeFix=log;}
function labelSplit(L){if((globalThis.__PF||{}).noSplit)return;const A=(H.rarea||[]).filter(a=>a.level===L&&a.p&&a.v>=.8&&a.v<200);if(A.length<3)return;const log=[];
 const G=q=>{const dx=q.end[0]-q.start[0],dz=q.end[1]-q.start[1],l=Math.hypot(dx,dz)||1e-9;return{l,u:[dx/l,dz/l]};};
 const dist=(p,q)=>{const{l,u}=G(q),t=Math.max(0,Math.min(l,(p[0]-q.start[0])*u[0]+(p[1]-q.start[1])*u[1]));return Math.hypot(p[0]-q.start[0]-u[0]*t,p[1]-q.start[1]-u[1]*t)-q.thickness/2;};
 const multi=()=>{const RS=rooms(L),R=RC[L],by={};A.forEach(a=>{const id=roomAtL(R,a.p);if(RS.some(q=>q.id===id))(by[id]=by[id]||[]).push(a);});return {RS,R,by};};
 for(let it=0;it<6;it++){const {RS,R,by}=multi();const bad=RS.filter(r=>by[r.id]&&new Set(by[r.id].map(a=>a.v.toFixed(1))).size>=2);if(!bad.length)break;let done=0;
  for(const r of bad){if(/kuchy|obýv/i.test(r.n||''))continue;/* open-plan kitchen+living: the dashed boundary is no wall */const la=by[r.id],bb=r.bb;const cand=[];
   for(const q of H.walls.filter(w=>w.level===L)){const{u}=G(q);for(const[e,sg]of[[q.end,1],[q.start,-1]]){if(e[0]<bb[0]-.4||e[0]>bb[2]+.4||e[1]<bb[1]-.4||e[1]>bb[3]+.4)continue;const free=!H.walls.some(o=>o!==q&&o.level===L&&dist(e,o)<=.06);
     /* free end: straight ahead (door gap); any end: also both perpendicular directions (a whole missing partition, up to 5 m) */
     for(const[d0,mx]of[[[u[0]*sg,u[1]*sg],free?1.3:0],[[-u[1],u[0]],5],[[u[1],-u[0]],5]]){if(!mx)continue;for(let s=.1;s<=mx;s+=.05){const p=[e[0]+d0[0]*s,e[1]+d0[1]*s];const o=H.walls.find(o=>o!==q&&o.level===L&&dist(p,o)<=.02);if(o){cand.push({q,e:[...e],d0,len:s+o.thickness/2});break;}}}}}
   let best=null;const k0=H.walls.length,oks=[];const hard=()=>{try{return (window.__rulesCheck()||[]).filter(p=>p.sev==='hard').length;}catch(e){return 1e9;}},h0=hard();
   for(const c of cand){const p1=[+(c.e[0]+c.d0[0]*c.len).toFixed(3),+(c.e[1]+c.d0[1]*c.len).toFixed(3)],w=Math.min(.9,c.len-.1);
    const nw={id:'ls'+Date.now().toString(36)+cand.indexOf(c),auto:1,level:L,start:c.e,end:p1,thickness:Math.min(.15,c.q.thickness),base:0,height:c.q.height,openings:w>=.6?[{type:'door',offset:+((c.len-w)/2).toFixed(3),width:+w.toFixed(2),height:2.05,auto:1}]:[]};
    H.walls.push(nw);const T=multi();const ids=la.map(a=>roomAtL(T.R,a.p));if(new Set(ids).size>=2&&ids.every(i=>T.RS.some(q=>q.id===i))){/* sizes vs printed */let err=0;/* scale-free: per new room, its area vs the sum of the printed areas it holds; spread of those ratios */const gs={};la.forEach((a,j)=>{gs[ids[j]]=(gs[ids[j]]||0)+a.v;});const rs=Object.keys(gs).map(k=>Math.log(T.RS.find(q=>q.id===+k).a/gs[k])),mu=rs.reduce((x,y)=>x+y,0)/rs.length;rs.forEach(v=>err+=Math.abs(v-mu));err/=rs.length;err+=.01*c.len;oks.push({nw,err});}
    H.walls.splice(k0);}
   /* the new partition must not create a hard problem (a door into the wall, an unreachable room) */oks.sort((a,b)=>a.err-b.err);for(const ok of oks.filter(o=>o.err<.25).slice(0,4)){H.walls.push(ok.nw);const h=hard();H.walls.splice(k0);if(h<=h0){best=ok;break;}}
   if(best&&best.err<.25){H.walls.push(best.nw);log.push([r.n,la.map(a=>a.v),+best.err.toFixed(2)]);done=1;break;}}
  if(!done)break;}
 if(log.length)H.splitFix=log;}
/* v21a RULE (closed envelope): a house never has a hole in its outer wall. When the reader misses a wall piece, two wall ends are left free
   with the rooms behind them open to the outside. envHoles(L) finds every free wall end - or pair of free ends (straight or around a corner) - whose
   bridge (<= 4.5 m) closes >= 2 m2 of floor off from the outside; closeEnvelope(L) adds those bridges as plain walls (greedy, biggest gain first).
   Notches, porches and loggias are bounded by continuous walls (no free ends) and are left alone. hard rule envelope-closed. */
function envGrid(L,extra){const W=H.walls.filter(w=>w.level===L).concat(extra||[]);if(W.length<3)return null;const c=.1,xs=W.flatMap(w=>[w.start[0],w.end[0]]),zs=W.flatMap(w=>[w.start[1],w.end[1]]);
 const x0=Math.min(...xs)-1,z0=Math.min(...zs)-1,nx=Math.ceil((Math.max(...xs)+1-x0)/c),nz=Math.ceil((Math.max(...zs)+1-z0)/c);if(nx*nz>4e6)return null;const g=new Uint8Array(nx*nz);
 for(const w of W){const t=(w.thickness||.2)/2+.04,dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l2=dx*dx+dz*dz||1e-9;const i0=Math.max(0,Math.floor((Math.min(w.start[0],w.end[0])-t-x0)/c)),i1=Math.min(nx-1,Math.ceil((Math.max(w.start[0],w.end[0])+t-x0)/c)),j0=Math.max(0,Math.floor((Math.min(w.start[1],w.end[1])-t-z0)/c)),j1=Math.min(nz-1,Math.ceil((Math.max(w.start[1],w.end[1])+t-z0)/c));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const px=x0+(i+.5)*c,pz=z0+(j+.5)*c;let s=((px-w.start[0])*dx+(pz-w.start[1])*dz)/l2;s=s<0?0:s>1?1:s;const ex=px-w.start[0]-dx*s,ez=pz-w.start[1]-dz*s;if(ex*ex+ez*ez<=t*t)g[j*nx+i]=1;}}
 const st=[];for(let i=0;i<nx;i++){st.push(i,(nz-1)*nx+i);}for(let j=0;j<nz;j++){st.push(j*nx,j*nx+nx-1);}while(st.length){const k=st.pop();if(g[k])continue;g[k]=2;const i=k%nx,j=(k-i)/nx;if(i>0)st.push(k-1);if(i<nx-1)st.push(k+1);if(j>0)st.push(k-nx);if(j<nz-1)st.push(k+nx);}
 let inn=0;for(let k=0;k<g.length;k++)if(!g[k])inn++;return inn*c*c;}
function envHoles(L){const W=H.walls.filter(w=>w.level===L);if(W.length<3)return[];const key=L+'|'+W.map(w=>w.start.join(',')+';'+w.end.join(',')+';'+w.thickness).join('|');envHoles.m=envHoles.m||{};if(envHoles.m[L]&&envHoles.m[L].k===key)return envHoles.m[L].v;const v=envHoles0(L,W);envHoles.m[L]={k:key,v};return v;}
function envHoles0(L,W){const base=envGrid(L);if(base==null)return[];
 const dist=(p,q)=>{const dx=q.end[0]-q.start[0],dz=q.end[1]-q.start[1],l=Math.hypot(dx,dz)||1e-9,u=[dx/l,dz/l],t=Math.max(0,Math.min(l,(p[0]-q.start[0])*u[0]+(p[1]-q.start[1])*u[1]));return Math.hypot(p[0]-q.start[0]-u[0]*t,p[1]-q.start[1]-u[1]*t)-(q.thickness||.2)/2;};
 const E=[];W.forEach(w=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l=Math.hypot(dx,dz);if(l<.3)return;const u=[dx/l,dz/l];[[w.end,u],[w.start,[-u[0],-u[1]]]].forEach(([e,d])=>{if(!W.some(o=>o!==w&&dist(e,o)<=.12))E.push({w,e,d});});});if(!E.length||E.length>40)return[];
 const C=[],seg=(a,b,w)=>({level:L,start:[+a[0].toFixed(3),+a[1].toFixed(3)],end:[+b[0].toFixed(3),+b[1].toFixed(3)],thickness:w.thickness||.3,base:w.base||0,height:w.height,openings:[],auto:1,env:1});
 const cross=(a,b)=>W.some(o=>{const p=a,q=b,A=o.start,B=o.end,d=(B[0]-A[0])*(q[1]-p[1])-(B[1]-A[1])*(q[0]-p[0]);if(Math.abs(d)<1e-9)return false;const t=((p[0]-A[0])*(q[1]-p[1])-(p[1]-A[1])*(q[0]-p[0]))/d,u=((p[0]-A[0])*(B[1]-A[1])-(p[1]-A[1])*(B[0]-A[0]))/d;return t>.02&&t<.98&&u>.05&&u<.95;});
 for(let i=0;i<E.length;i++){const a=E[i];
  // single end running straight on into a wall
  for(let s=.3;s<=4.5;s+=.1){const p=[a.e[0]+a.d[0]*s,a.e[1]+a.d[1]*s];const o=W.find(o=>o!==a.w&&dist(p,o)<=0);if(o){C.push({ws:[seg(a.e,[a.e[0]+a.d[0]*(s+(o.thickness||.2)/2),a.e[1]+a.d[1]*(s+(o.thickness||.2)/2)],a.w)],len:s,ends:[a]});break;}}
  for(let j=i+1;j<E.length;j++){const b=E[j];if(b.w===a.w)continue;const v=[b.e[0]-a.e[0],b.e[1]-a.e[1]],D=Math.hypot(v[0],v[1]);if(D<.25)continue;
   const dot=a.d[0]*b.d[0]+a.d[1]*b.d[1];
   if(dot<-.97&&D<=4.5){const off=Math.abs(v[0]*a.d[1]-v[1]*a.d[0]);if(off<.2&&v[0]*a.d[0]+v[1]*a.d[1]>0&&!cross(a.e,b.e))C.push({ws:[seg(a.e,b.e,a.w)],len:D,ends:[a,b]});}
   else if(Math.abs(dot)<.1){const den=a.d[0]*(-b.d[1])-a.d[1]*(-b.d[0]);if(Math.abs(den)<1e-6)continue;const t=(v[0]*(-b.d[1])-v[1]*(-b.d[0]))/den,s=(a.d[0]*v[1]-a.d[1]*v[0])/den;if(t>.1&&s>.1&&t+s<=6){const c=[a.e[0]+a.d[0]*t,a.e[1]+a.d[1]*t];if(!cross(a.e,c)&&!cross(c,b.e))C.push({ws:[seg(a.e,c,a.w),seg(c,b.e,b.w)],len:t+s,ends:[a,b]});}}}}
 const out=[];C.forEach(c=>{const g=envGrid(L,c.ws);if(g!=null&&g-base>=2)out.push({...c,gain:g-base});});return out.sort((x,y)=>y.gain/Math.sqrt(y.len)-x.gain/Math.sqrt(x.len));}
/* v21h RULE (band-room): a strip under ~0.85 m deep that runs along the outer wall for the full side of one big room, with no printed area in it, is not a
   room - it is a second drawn line (a garage door leaf, a sill, a porch edge) read as a wall. bandRooms(L) finds such strips; bandMerge(L) removes the
   inner wall so the strip goes back to the room it belongs to (the room then reaches its real outer wall and its door). hard rule band-room. */
function bandRooms(L){const RS=rooms(L),R=RC[L];if(!R||!R.g||!RS.length)return[];const ids=new Set(RS.map(r=>r.id)),out=[],isOut=v=>R.out?R.out.has(v):!ids.has(v)&&v>0;
 const lab=(p,dx,dz)=>{for(const o of[.4,.55,.7,.85]){const v=roomAt(R,[p[0]+dx*o,p[1]+dz*o]);if(ids.has(v)||isOut(v))return v;}return null;};
 RS.forEach(r=>{const bb=r.bb;if(!bb)return;const w=bb[2]-bb[0],h=bb[3]-bb[1],hz=w>=h,d=hz?h:w,len=hz?w:h;if(d>.85||len<2.4||len/d<3||r.a>5.5)return;
  if((H.rarea||[]).some(q=>q.level===L&&q.p&&roomAt(R,q.p)===r.id))return;
  const side=sg=>{const v=[];for(let t=.15;t<=.851;t+=.1){const u=hz?bb[0]+w*t:bb[1]+h*t,e=sg<0?(hz?bb[1]:bb[0]):(hz?bb[3]:bb[2]);v.push(lab(hz?[u,e]:[e,u],hz?0:sg,hz?sg:0));}return v;};
  for(const sg of[-1,1]){const a=side(sg),b=side(-sg);if(!b.every(isOut))continue;const A=a[0];if(!ids.has(A)||!a.every(v=>v===A))continue;const RA=RS.find(q=>q.id===A);if(!RA||RA.a<8)continue;
   const e=sg<0?(hz?bb[1]:bb[0]):(hz?bb[3]:bb[2]),s0=hz?bb[0]:bb[1],s1=hz?bb[2]:bb[3];let bad=false;const ws=H.walls.filter(q=>{if(q.level!==L)return false;const qh=Math.abs(q.start[1]-q.end[1])<.02,qv=Math.abs(q.start[0]-q.end[0])<.02;if(hz?!qh:!qv)return false;
    const c=hz?q.start[1]:q.start[0],t=(q.thickness||.3)/2;if(Math.abs(c-(e+sg*t))>.3)return false;const lo=Math.min(hz?q.start[0]:q.start[1],hz?q.end[0]:q.end[1]),hi=Math.max(hz?q.start[0]:q.start[1],hz?q.end[0]:q.end[1]);if(hi<s0+.2||lo>s1-.2)return false;if(lo<s0-.5||hi>s1+.5)bad=true;return true;});
   const cov=ws.reduce((s,q)=>s+Math.min(s1,Math.max(q.start[hz?0:1],q.end[hz?0:1]))-Math.max(s0,Math.min(q.start[hz?0:1],q.end[hz?0:1])),0);
   if(!bad&&ws.length&&cov>=.8*len)out.push({r:r.id,n:r.n,a:r.a,into:RA.n,ws,len,d});break;}});return out;}
function bandMerge(L,log){if((globalThis.__PF||{}).noBand)return 0;let n=0;for(let it=0;it<4;it++){const B=bandRooms(L);if(!B.length)break;const s=new Set(B[0].ws);H.walls=H.walls.filter(q=>!s.has(q));n++;if(log)log.push('band-room:'+B[0].a.toFixed(1)+'m2->'+B[0].into);}if(n)H.bandFix=(H.bandFix||0)+n;return n;}
window.__bandRooms=L=>bandRooms(L||H.levels[0].name).map(b=>({n:b.n,a:+b.a.toFixed(1),into:b.into,d:+b.d.toFixed(2),len:+b.len.toFixed(2)}));window.__bandMerge=L=>bandMerge(L||H.levels[0].name,[]);
function closeEnvelope(L,log){if((globalThis.__PF||{}).noEnv)return 0;let n=0;for(let it=0;it<6;it++){const hs=envHoles(L);if(!hs.length)break;const h=hs[0];h.ws.forEach((w,k)=>{w.id='env'+Date.now().toString(36)+n+k;H.walls.push(w);});n++;if(log)log.push('envelope-closed:'+h.len.toFixed(1)+'m/'+h.gain.toFixed(1)+'m2');}if(n)H.envFix=(H.envFix||0)+n;return n;}
window.__closeEnv=L=>closeEnvelope(L||H.levels[0].name,[]);window.__envHoles=L=>envHoles(L||H.levels[0].name).map(h=>({len:+h.len.toFixed(2),gain:+h.gain.toFixed(1),n:h.ws.length,at:h.ends.map(e=>e.e.map(v=>+v.toFixed(2)))}));
/* v21t RULE (no open slot in the outer wall): a narrow slot of outside space cut into the house (< 1.8 m wide) that two or more ordinary doors (<= 1.25 m, no terrace / sliding / garage)
   open into is an entrance hall whose outer wall was not read (plan arrow / thin line). Close its mouth with a wall holding the entrance
   door, so the house has no hole and the hall becomes a room. PF.noSlot. audit: envelope-closed, entrance-present */
function closeSlots(L){closeSlots.log=[];if((globalThis.__PF||{}).noSlot)return;const ws=H.walls.filter(q=>q.level===L);if(ws.length<4)return;
 const C=.1,r=.9,pad=r+1.2;let X0=1e9,Z0=1e9,X1=-1e9,Z1=-1e9;ws.forEach(w=>{[w.start,w.end].forEach(p=>{X0=Math.min(X0,p[0]);X1=Math.max(X1,p[0]);Z0=Math.min(Z0,p[1]);Z1=Math.max(Z1,p[1]);});});
 const ox=X0-pad,oz=Z0-pad,nx=Math.ceil((X1-X0+2*pad)/C),nz=Math.ceil((Z1-Z0+2*pad)/C);if(nx*nz>800000)return;const N=nx*nz,B=new Uint8Array(N);
 ws.forEach(w=>{const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l=Math.hypot(dx,dz);if(l<.05)return;const t=(w.thickness||.2)/2+.03,st=Math.max(1,Math.ceil(l/(C*.5)));
  for(let k=0;k<=st;k++){const x=w.start[0]+dx*k/st,z=w.start[1]+dz*k/st,i0=Math.floor((x-t-ox)/C),i1=Math.floor((x+t-ox)/C),j0=Math.floor((z-t-oz)/C),j1=Math.floor((z+t-oz)/C);for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(i>=0&&j>=0&&i<nx&&j<nz)B[j*nx+i]=1;}});
 const E=new Uint8Array(N),q=[];for(let i=0;i<nx;i++){q.push(i,(nz-1)*nx+i);}for(let j=0;j<nz;j++){q.push(j*nx,j*nx+nx-1);}q.forEach(k=>{if(!B[k])E[k]=1;});
 for(let h=0;h<q.length;h++){const k=q[h];if(!E[k])continue;const i=k%nx,j=(k/nx)|0;for(const [a,b] of[[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=nz)continue;const kk=jj*nx+ii;if(!E[kk]&&!B[kk]){E[kk]=1;q.push(kk);}}}
 // chamfer distance (in cells) from non-exterior; core = exterior farther than r; opened = within r of core
 const dist=(M)=>{const D=new Float32Array(N);for(let k=0;k<N;k++)D[k]=M[k]?1e9:0;for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(!D[k])continue;let v=D[k];if(i>0)v=Math.min(v,D[k-1]+1);if(j>0){v=Math.min(v,D[k-nx]+1);if(i>0)v=Math.min(v,D[k-nx-1]+1.414);if(i<nx-1)v=Math.min(v,D[k-nx+1]+1.414);}D[k]=v;}
  for(let j=nz-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const k=j*nx+i;if(!D[k])continue;let v=D[k];if(i<nx-1)v=Math.min(v,D[k+1]+1);if(j<nz-1){v=Math.min(v,D[k+nx]+1);if(i<nx-1)v=Math.min(v,D[k+nx+1]+1.414);if(i>0)v=Math.min(v,D[k+nx-1]+1.414);}D[k]=v;}return D;};
 const R=r/C,D1=dist(E),core=new Uint8Array(N);for(let k=0;k<N;k++)core[k]=D1[k]>R?0:1;/* core[k]=1 means NOT core */const D2=dist(core),O=new Uint8Array(N);for(let k=0;k<N;k++)O[k]=E[k]&&D2[k]<=R+.5?1:0;
 const P=new Uint8Array(N);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=ox+(i+.5)*C,z=oz+(j+.5)*C;if(E[k]&&!O[k]&&x>X0&&x<X1&&z>Z0&&z<Z1)P[k]=1;}
 const lab=new Int32Array(N).fill(-1),comps=[];for(let k0=0;k0<N;k0++){if(!P[k0]||lab[k0]>=0)continue;const id=comps.length,st=[k0],cs=[];lab[k0]=id;while(st.length){const k=st.pop();cs.push(k);const i=k%nx,j=(k/nx)|0;for(const [a,b] of[[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=nx||jj>=nz)continue;const kk=jj*nx+ii;if(P[kk]&&lab[kk]<0){lab[kk]=id;st.push(kk);}}}comps.push(cs);}
 comps.forEach((cs,id)=>{const area=cs.length*C*C;if(area<1.2||area>14)return;
  const dw=new Set();ws.forEach((w,wi)=>(w.openings||[]).forEach(o=>{if(o.type!=='door'||o.width>1.25||(o.kind&&o.kind!=='entrance'))return;const dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],l=Math.hypot(dx,dz)||1,u=[dx/l,dz/l],m=o.offset+o.width/2,cx=w.start[0]+u[0]*m,cz=w.start[1]+u[1]*m,t=(w.thickness||.2)/2+.2;
   for(const s of[1,-1]){const x=cx-u[1]*s*t,z=cz+u[0]*s*t,i=Math.floor((x-ox)/C),j=Math.floor((z-oz)/C);if(i>=0&&j>=0&&i<nx&&j<nz&&lab[j*nx+i]===id)dw.add(wi+':'+o.offset+':'+(o.kind||'')+':'+o.width);}}));
  if(dw.size<2){closeSlots.log.push({area:+area.toFixed(1),doors:dw.size});return;}
  const M=cs.filter(k=>{const i=k%nx,j=(k/nx)|0;return[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const ii=i+a,jj=j+b;return ii>=0&&jj>=0&&ii<nx&&jj<nz&&O[jj*nx+ii];});});if(!M.length)return;
  let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;M.forEach(k=>{const x=ox+((k%nx)+.5)*C,z=oz+(((k/nx)|0)+.5)*C;a0=Math.min(a0,x);a1=Math.max(a1,x);b0=Math.min(b0,z);b1=Math.max(b1,z);});
  const vert=(a1-a0)<=.45&&(b1-b0)>(a1-a0),hor=(b1-b0)<=.45&&(a1-a0)>(b1-b0);if(!vert&&!hor){closeSlots.log.push({area:+area.toFixed(1),doors:dw.size,mouth:'shape'});return;}
  const len=vert?b1-b0:a1-a0;if(len<.7||len>2.6){closeSlots.log.push({area:+area.toFixed(1),doors:dw.size,len:+len.toFixed(2)});return;}
  const th=ws.filter(w=>w._ext||w.thickness>=.25).map(w=>w.thickness).sort((x,y)=>x-y),T=th.length?th[th.length>>1]:.3,c=vert?(a0+a1)/2:(b0+b1)/2,e0=(vert?b0:a0)-C/2-.25,e1=(vert?b1:a1)+C/2+.25,L2=e1-e0;
  const st=vert?[+c.toFixed(2),+e0.toFixed(2)]:[+e0.toFixed(2),+c.toFixed(2)],en=vert?[+c.toFixed(2),+e1.toFixed(2)]:[+e1.toFixed(2),+c.toFixed(2)],dW=Math.min(1.0,Math.max(.8,len-.3));
  H.walls.push({id:'slot'+Date.now()+id,auto:1,level:L,start:st,end:en,thickness:T,base:0,height:ws[0].height||2.85,openings:[{type:'door',offset:+((L2-dW)/2).toFixed(2),width:dW,height:2.05,out:1}],slot:1});
  closeSlots.log.push({area:+area.toFixed(1),doors:dw.size,dk:[...dw],wall:[st,en],T});});
 try{window.__slots=closeSlots.log;}catch(e){}}
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
/* v12b: an uploaded plan must never open as an empty house - every level with rooms and no furniture is furnished once (H.autoF), the user can still clear or re-roll it */
function autoFurn(){if(!H||!H.levels)return;H.autoF=H.autoF||{};const L0=lvl;let did=0;for(const lv of H.levels){const L=lv.name;if(H.autoF[L]||(H.furn||[]).some(f=>f.level===L))continue;if(!H.walls.some(w=>w.level===L))continue;H.autoF[L]=1;if(!rooms(L).length)continue;lvl=L;furnish({auto:1});did++;}if(lvl!==L0){lvl=L0;draw();}if(did)save();}
window.__autoFurn=autoFurn;
function furnish(op){const dm=!!(op&&op.demo===1);const RS=rooms();if(!RS.length){if(!dm)toast('Najprv uzavrite steny miestností.','warn');return;}const rt=!!(op&&op.__rt);if(!dm&&!rt)snap();const had=(H.furn||[]).some(f=>f.level===lvl);if(!rt)H.fv=dm?0:had?((H.fv||0)+1)%4:0;
 const R=RC[lvl],ids=new Set(RS.map(r=>r.id));const fixes=sanitizeOpenings(H.walls.filter(w=>w.level===lvl),p=>{const v=roomAt(R,p);return v===-1?-1:ids.has(v)?v:0;});H.fixLog=fixes;
 const T=assignTypes(R,lvl);addMissingDoors(R,lvl,RS,T,fixes);try{addEntrance(R,lvl,RS,fixes);}catch(e){console.warn('entrance',e);}wetDoors(R,lvl,RS,T,fixes);if(!dm)try{rulesFix({noFix:1});}catch(e){console.warn('rulesFix',e);}/* door/opening fixes BEFORE layout so furniture respects the final door spots */H.furn=(H.furn||[]).filter(f=>f.level!==lvl||!ids.has(roomAt(R,f.p)));let n=0;const empty=[];
 const OPS=layoutOps(R,lvl),WS=layoutWalls(lvl),hasWC=RS.some(q=>/^WC/.test(T[q.id]||''));const t0=performance.now();
 /* v21k RULE (open plan, kitchen-aisle): kitchens are furnished first; a kitchen too small to hold a table outside its work aisle hands the dining table to the living room. audit: kitchen-aisle */
 const isK=r=>/^Kuchyň/.test(roomType(r,T,R,lvl)||'');const hasDin=RS.some(r=>/^Jedáleň/.test(roomType(r,T,R,lvl)||''));let dine=0;
 /* a separate dining room/zone holds the table; the kitchen keeps the work aisle free for the counter */
 const retype=[];RS.slice().sort((a,b)=>isK(b)-isK(a)).forEach(r=>{const G=stairNoGo(makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim),lvl);const ty=roomType(r,T,R,lvl);const items=layoutRoom(G,ty,{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC,noTable:hasDin&&isK(r),dine:dine&&/^Obývačka/.test(ty||'')&&!/kuchyň|jedál/i.test(ty||''),needTable:(isK(r)&&!hasDin)||(dine&&/^Obývačka/.test(ty||''))||/^Jedáleň|^Obývačka s (kuchyň|jedál)/.test(ty||'')});if(isK(r)&&items.some(i=>i.t==='kitch')&&!items.some(i=>i.t==='table')&&!hasDin)dine=1;
  let its=items;/* v12b fallback: a room whose own template found no valid spot gets the most fitting generic set that does fit */if(!its.length&&r.a>=1.5){const tq=roomType(r,T,R,lvl);for(const alt of r.a>=7?['Izba','Pracovňa','Chodba','Komora']:/^(WC|Kúpeľ)/.test(tq)?['WC','Komora']:['Komora','Chodba']){if(alt===tq)continue;its=layoutRoom(G,alt,{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC});if(its.length)break;}}
  /* v21u RULE (guessed room that cannot hold its key fixture): a kitchen without room for a kitchen run, whose name was only guessed (no plan label inside), becomes a study / storage room; the names are re-assigned and the level is furnished
     again once, so the kitchen goes to a room that fits it (often the living room as an open-plan kitchen). PF.noRetype. audit: fixture-missing */
  if(!(globalThis.__PF||{}).noRetype&&!(op&&op.__rt)&&!r.zone){const tq=roomType(r,T,R,lvl)||'',need=/^Kuchyň/.test(tq)?['kitch']:null;
   if(need&&!its.some(i=>need.includes(i.t))&&!(H.rlab||[]).some(l=>l.level===lvl&&roomAt(R,l.p)===r.id)){for(const alt of r.a>=5?['Pracovňa','Komora']:['Komora','Šatník']){const it2=layoutRoom(G,alt,{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC});if(it2.length){its=it2;retype.push([r,alt]);break;}}}}
  its.forEach(it=>{H.furn.push({...it,level:lvl,rid:r.id});n++;});if(!its.length)empty.push(r.n);});
 if(retype.length){const pin=r=>{const b=r.bb,c=[(b[0]+b[2])/2,(b[1]+b[3])/2];if(roomAt(R,c)===r.id)return c;let best=null,bd=1e9;for(let x=b[0]+.1;x<b[2];x+=.2)for(let z=b[1]+.1;z<b[3];z+=.2){if(roomAt(R,[x,z])!==r.id)continue;const d=Math.hypot(x-c[0],z-c[1]);if(d<bd){bd=d;best=[x,z];}}return best;};
  let k=0;retype.forEach(([r,alt])=>{const p=pin(r);if(p){H.rlab=(H.rlab||[]).concat([{level:lvl,p,n:alt,rt:1}]);k++;}});window.__retype=retype.map(([r,alt])=>[r.n,alt]);if(k)return furnish({...(op||{}),__rt:1});}
 /* v21u RULE (dining fallback): a storey whose kitchen run fits but whose dining table fits nowhere tries the living rooms again with the table required, then a
    study / room whose name was only guessed (no plan label inside, largest first) as a dining room. PF.noDinFb. audit: dining-present */
 if(!dm&&!hasDin&&!(globalThis.__PF||{}).noDinFb){const FL=()=>H.furn.filter(f=>f.level===lvl&&ids.has(roomAt(R,f.p)));if(FL().some(f=>f.t==='kitch')&&!FL().some(f=>f.t==='table')){const sty=({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod';
  const lab=r=>(H.rlab||[]).some(l=>l.level===lvl&&!l.rt&&roomAt(R,l.p)===r.id);const cand=RS.map(r=>({r,ty:roomType(r,T,R,lvl)||''})).filter(c=>c.r.a>=5&&(/^Obývačka/.test(c.ty)||(!lab(c.r)&&/^(Pracovňa|Izba)$/.test(c.ty)))).sort((a,b)=>/^Obývačka/.test(b.ty)-/^Obývačka/.test(a.ty)||b.r.a-a.r.a);
  for(const c of cand){const G=stairNoGo(makeRoom(R,c.r,OPS.filter(o=>o.room===c.r.id),WS,ldim),lvl);const liv=/^Obývačka/.test(c.ty),old=H.furn.filter(f=>f.level===lvl&&f.rid===c.r.id);
   const its=liv?layoutRoom(G,c.ty,{fv:(H.fv||0)*13+c.r.id*7,style:sty,hasWC,dine:1,needTable:1}):layoutRoom(G,'Jedáleň',{fv:(H.fv||0)*13+c.r.id*7,style:sty,hasWC,needTable:1});
   if(!its.some(i=>i.t==='table'))continue;if(liv&&old.some(f=>f.t==='sofa')&&!its.some(i=>i.t==='sofa'))continue;
   H.furn=H.furn.filter(f=>!(f.level===lvl&&f.rid===c.r.id));its.forEach(it=>H.furn.push({...it,level:lvl,rid:c.r.id}));
   if(!liv){const b=c.r.bb;let p=null,bd=1e9;for(let x=b[0]+.1;x<b[2];x+=.2)for(let z=b[1]+.1;z<b[3];z+=.2){if(roomAt(R,[x,z])!==c.r.id)continue;const d=Math.hypot(x-(b[0]+b[2])/2,z-(b[1]+b[3])/2);if(d<bd){bd=d;p=[x,z];}}
    H.rlab=(H.rlab||[]).filter(l=>!(l.level===lvl&&l.rt&&roomAt(R,l.p)===c.r.id));if(p)H.rlab.push({level:lvl,p,n:'Jedáleň',rt:1});}
   window.__dinFb=[c.r.n,liv?c.ty:'Jedáleň'];break;}}}
 H.dinAuto=Object.assign({},H.dinAuto||{},{[lvl]:1});if(!dm&&!window.__rfOff)try{rulesFix({noDoors:1});}catch(e){console.warn("rulesFix",e);}/* plausibility auto-fixes right after furnishing, so Kontrola shows what is really left */
 const V=validateAll();window.__furnMs=Math.round(performance.now()-t0);
 if(dm){window.__furnEmpty=empty;return V;}
 save();draw();toast('Zariadené – variant '+(H.fv+1)+'/4 ('+n+' ks).'+(fixes.filter(f=>!/^suggest/.test(f.fix)).length?' Opravené dvere/okná: '+fixes.filter(f=>!/^suggest/.test(f.fix)).length+'.':'')+(empty.length?' Bez nábytku: '+empty.join(', '):'')+(V.length?' Kontrola: '+V.length+' porušení.':' Kontrola pravidiel: OK.'),V.length?'warn':'ok',5000);window.__furnEmpty=empty;}
window.__roomsAll=()=>(H.levels||[]).flatMap(l=>{const RS=rooms(l.name),R=RC[l.name];return RS.map(r=>({L:l.name,e:l.elevation||0,n:r.n,bb:r.bb,c:[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2],k:(H.furn||[]).filter(f=>f.level===l.name&&roomAt(R,f.p)===r.id).map(f=>f.t+'@'+f.p.map(v=>v.toFixed(2)).join(',')+'r'+(f.r||0))}));});window.__roomFurn=()=>{const RS=rooms(),R=RC[lvl];return RS.map(r=>({n:r.n,a:+r.a.toFixed(1),k:(H.furn||[]).filter(f=>f.level===lvl&&roomAt(R,f.p)===r.id).map(f=>f.t)}));};
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
async function jumpsUI(v){const J=$('jumps');if(!v||!H){J.hidden=true;return;}const m=await v3();J.innerHTML='';H.levels.forEach(l=>{const RS=rooms(l.name);RS.filter(r=>r.a>=2).forEach(r=>{const c=[(r.bb[0]+r.bb[2])/2,(r.bb[1]+r.bb[3])/2],RR=RC[l.name];let p=c;if(roomAt(RR,c)!==r.id){p=null;for(let k=0;k<400&&!p;k++){const q=[r.bb[0]+Math.random()*(r.bb[2]-r.bb[0]),r.bb[1]+Math.random()*(r.bb[3]-r.bb[1])];if(roomAt(RR,q)===r.id)p=q;}}if(!p)return;const b=document.createElement('button');b.dataset.n=r.n;b.textContent=r.n+(H.levels.length>1?' · '+l.name:'');b.onclick=()=>{DOLL_ON=false;if(H.levels.length>1){LVSEL=H.levels.indexOf(l);m.setLevelCut&&m.setLevelCut(LVSEL);}m.jump(p[0],p[1],l.elevation);wUI(true);};J.appendChild(b);});});
 const cnt={};[...J.children].forEach(b=>cnt[b.dataset.n]=(cnt[b.dataset.n]||0)+1);const seen={};[...J.children].forEach(b=>{const n=b.dataset.n;if(cnt[n]>1){seen[n]=(seen[n]||0)+1;b.textContent=b.textContent.replace(n,n+' '+seen[n]);}});J.hidden=!J.children.length;}
const setM=async()=>{H.mat={wall:$('mwall').value,floor:$('mfloor').value,fac:$('mfac').value,roof:$('mroof').value,fasada:$('mfasada').value};save();(await v3()).setMat(H.mat);};['mwall','mfloor','mfac','mroof'].forEach(k=>$(k).onchange=setM);$('mfasada').onchange=()=>{H.mat=Object.assign(H.mat||{},{fasada:$('mfasada').value});save();gen();};const SP={'':['#f4f1ec','dub'],minimal:['#f4f1ec','dub'],futur:['#f4f1ec','beton'],moderny:['#eeece8','dub'],skandi:['#f6f4f0','dub'],klasik:['#e8e0d2','orech'],indus:['#dcd8d2','beton']};
/* v12e: switching style only re-skins (materials, colours, floor, walls) - furniture positions stay exactly where the rules put them */
$('msty').onchange=async e=>{const s=e.target.value;snap();H.style=s||undefined;try{window.vkA&&window.vkA('style_change')}catch(e){};if(SP[s]){H.mat={...(H.mat||{}),wall:SP[s][0],floor:SP[s][1]};}save();if(!(H.furn||[]).length)try{autoFurn();}catch(x){}const dl=$('doll').classList.contains('on'),wk=$('walk').classList.contains('on');await gen();/* keep the view mode the user was in (no roof / walk) */if(dl)$('doll').onclick();else if(wk)$('walk').onclick();document.querySelectorAll('#stypick button').forEach(b=>b.classList.toggle('on',b.dataset.s===s));toast('Štýl „'+e.target.selectedOptions[0].textContent+'“ použitý.','ok');};
const PH=h=>h<5.6||h>=18.3?'noc':h<6.5?'svitanie':h<7.6?'ráno':h<15.7?'deň':h<16.9?'zlatá hodina':h<17.4?'západ':'súmrak',hl=h=>{const m=Math.round((h%1)*60);$('sunv').textContent=String(Math.floor(h)).padStart(2,'0')+':'+String(m).padStart(2,'0');$('sunp').textContent=PH(h);};
let v3m=null;let hRaf=0,hPend=null;
const setA=async()=>{const h=+$('sunh').value;H.atmo={w:$('mwx').value,h};save();(await v3()).setAtmo(H.atmo);};$('mwx').onchange=setA;
// live drag: coalesce to one update per animation frame; shadows throttled inside v3; full quality on release
$('sunh').oninput=e=>{const h=+e.target.value;hl(h);hPend=h;if(!v3m){v3().then(m=>{v3m=m;m.setHour(h,true);});return;}if(!hRaf)hRaf=requestAnimationFrame(()=>{hRaf=0;if(v3m&&hPend!=null)v3m.setHour(hPend,true);});};
$('sunh').onchange=e=>{const h=+e.target.value;hPend=null;if(hRaf){cancelAnimationFrame(hRaf);hRaf=0;}hl(h);H.atmo={...(H.atmo||{}),w:$('mwx').value,h};save();v3().then(m=>m.setHour(h,false));};

function extSides(){H.levels.forEach(l=>{rooms(l.name);const C=RC[l.name];H.walls.filter(w=>w.level===l.name).forEach(w=>{/* v20261117b: sample the midpoint first, but when it lands in a crossing wall (no room on either side) try other points along the wall - a long facade wall whose middle meets a partition was read as interior (no facade cladding, plinth, parapet) */const g=geo(w),n=[-g.u[1],g.u[0]],o=w.thickness/2+.15;let iA=false,iB=false;for(const f of[.5,.35,.65,.2,.8]){const m=[g.x0+g.u[0]*g.L*f,g.z0+g.u[1]*g.L*f],A=C&&roomAt(C,[m[0]+n[0]*o,m[1]+n[1]*o]),B=C&&roomAt(C,[m[0]-n[0]*o,m[1]-n[1]*o]);iA=C.r.some(q=>q.id===A);iB=C.r.some(q=>q.id===B);if(iA||iB)break;}w._ext=iA===iB?0:iA?-1:1;});});}
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
 ['door-stair-clear','hard','no stair run or stair opening within 1 m of either face of a door (auto-fix: slide the door ≤1.5 m; else exterior door → French window, interior door removed, only if every room stays reachable)'],
 ['furniture-on-stairs','hard','no furniture on the stair run or in the stair opening above it (auto-fix: remove the item)'],
 ['walkability','hard','from the entrance and each stair arrival every room is reachable on a clear path at least 80 cm wide; each door has approach space on both sides (auto-fix: change door swing or relocate furniture, never delete furniture)'],
 ['ext-material','hard','no interior floor or ceiling material is visible on an exterior face (copings and storey ledges use metal flashing or plaster)'],
 ['downpipe-connected','hard','a downpipe starts at a gutter or hopper on the roof edge and runs continuously to the ground'],
 ['room-merged','soft','one room polygon contains two different printed area numbers: a wall (or a door gap) was missed and two rooms merged'],
 ['area-label-mismatch','soft','the printed area inside a room differs from the room polygon area by more than 25 % (and 1 m²)'],
 ['rooms-vs-labels','soft','the plan prints more room areas than rooms were found'],
 ['lintel-floating','hard','a wall piece above an opening (lintel/header) rests on wall at both ends - never a block floating across a room'],
 ['furn-from-kit','hard','all furniture (interior + terrace) comes from the shared furniture kit / asset pack, never placeholder boxes'],
 ['terrace-furnished','hard','every terrace deck carries the demo villa set from the kit: outdoor table, 2+ seats, 2+ potted plants (planters), edge + step, light; pergola in front of a terrace door'],
 ['terrace-pergola','hard','a deck off the living room carries a pergola (also when no terrace door was read)'],
 ['car-clear','hard','the car stands inside the garage or on the drive, never in front of the garage door'],
 ['terrace-placed','hard','a terrace printed outside the walls gets the deck on the wall facing it (at that wall\'s door when there is one)'],
 ['terrace-clear','hard','terrace furniture never reaches into a wall or the 1.2 m path out of the terrace door'],
 ['site-present','hard','every house stands on a plot with lawn, fence, paths, trees and street (one shared site generator)'],
 ['site-clear','hard','trees and neighbouring houses never stand on the house or the driveway'],
 ['garage-door','hard','a room labelled Garáž has a sectional garage door on an outside wall'],
 ['garage-drive','hard','a garage door has a driveway to the street and a car in or in front of the garage'],
 ['downpipe-eave','hard','a downpipe starts at the eave/gutter height of the roof directly above it, never higher (a bungalow pipe never starts at 2nd-floor height)'],
 ['downpipe-pierce','hard','a downpipe never passes through a roof slab or coping; it is offset outside the cornice'],
 ['floor-present','hard','every room on every storey has an opaque floor mesh covering at least 95% of its area, in exterior, cutaway (each floor filter) and walk'],
 ['ceiling-present','hard','every room has a ceiling above it (top storey: ceiling or roof), except over the stair void'],
 ['street-side','hard','the auto plot puts the street on the side the house is driven into (garage door) or entered from (entrance door), and the 3D site is built with the street there'],['entrance-present','hard','the ground floor has at least one outside door into a room other than the garage (derived from the hall / living side or the widest street window if none was read)'],['dining-present','hard','a storey with a kitchen run has a dining table (kitchen, open living room or dining room; smaller 2-4 seat table if needed, decor moved out first)'],['kitchen-aisle','hard','a 1.0 m work aisle in front of every kitchen run stays free of the dining table and its chairs'],['band-room','hard','no strip under 0.85 m deep along the outer wall, spanning one big room and carrying no printed area, is left as a separate room'],['kitchen-open-plan','hard','a living room that holds two or more printed room areas (an open plan read as one room) is named living-with-kitchen; the kitchen name is not pushed onto a separate room'],['open-zones','hard','an open-plan room that holds two or more printed living/dining/kitchen labels, or a large room whose printed areas sum to its polygon, is split into virtual zones matching those labels and area targets; no wall is added'],['envelope-closed','hard','the outer wall runs all the way round: no missed wall piece leaves rooms open to the outside'],
 ['walls-closed','hard','no hole in an exterior wall outside its doors and windows'],
 ['opening-mesh','hard','every window opening has glass/frame and every door opening has a door leaf'],
 ['stair-connects','hard','every stair exists and rises continuously from its floor to the next storey'],
 ['room-empty','hard','every habitable room of 4 m² or more has furniture'],
 ['audit-crash','hard','the 3D checks themselves ran without an error (a crashing check is a failed check)'],
 ['scale-implausible','hard','with an estimated scale, ≥2 rooms are too small/narrow for their type: propose the enlargement (one click), never apply silently'],
];window.__RULES=RULES;window.__rulesCheck=()=>rulesCheck();
// prem9: furniture standing on the stair run (its level) or floating in the stair opening (level above)
/* v20261117r RULE: on the floor above a stair, furniture keeps a 60 cm walkway around the stair opening (Adam: kids' desk + chair against the railing).
   The layout treats the opening + 60 cm as no-go; stairFurn/rulesCheck flag any footprint inside it. audit: furniture-on-stairs (walkway) */
const WALK_SOFT=new Set(['rug','runner','art','curtain','mirror','towel','tvw','hooks','wshelf','pendant']);
function stairVoids(L){const li=(H.levels||[]).findIndex(l=>l.name===L);if(li<1)return[];return (H.stairs||[]).filter(st=>st.level===H.levels[li-1].name).map(stairRect);}
function stairNoGo(G,L){const V=stairVoids(L);if(V.length)G.noGo=V.map(r=>[r[0]-.6,r[1]-.6,r[2]+.6,r[3]+.6]);return G;}
/* v20261117r: a chair/stool whose table or desk was removed goes too (no lone chair by the railing). audit: lone-chair */
function lonelySeats(log){const sz=f=>{const D=DIM3[f.t]||[.5,.5],w=f.w||D[0],d=f.d||D[1];return (f.r||0)%2?[d,w]:[w,d];},gp=(a,b)=>{const A=sz(a),B=sz(b);return Math.hypot(Math.max(0,Math.abs(a.p[0]-b.p[0])-(A[0]+B[0])/2),Math.max(0,Math.abs(a.p[1]-b.p[1])-(A[1]+B[1])/2));};
 const n0=H.furn.length;H.furn=H.furn.filter(f=>!(f.t==='chair'||f.t==='stool')||H.furn.some(o=>o.level===f.level&&['table','desk','otable','island','kitch'].includes(o.t)&&gp(f,o)<.4));if(H.furn.length<n0&&log)log.push('lone-chair');}
/* v20261117s RULE: the furniture check relocates before it deletes - a non-decor piece (bed, desk + chair, wardrobe, WC, basin ...) that breaks a rule makes its whole room
   re-laid by the same layout engine (which honours the stair walkway, door zones, WC clearance); only decor is ever dropped. audit: fixture-missing, lone-chair */
const DECOR_DROP=new Set(['plant','toy','side','lamp','art','rug','runner','shelf','wshelf','mirror','towel','curtain','pendant','dresser','sideb','armch','nstand','bench','coat','shoe','ctable','hooks','tvw']);
function relayRoom(L,rid,ex){const RS=rooms(L),R=RC[L];if(!R)return null;const r=RS.find(q=>q.id===rid);if(!r)return null;const T=assignTypes(R,L),n=roomType(r,T,R,L),OPS=layoutOps(R,L),WS=layoutWalls(L),hasWC=RS.some(q=>/^WC/.test(roomType(q,T,R,L)));
 const G=stairNoGo(makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim),L);const it=layoutRoom(G,n,{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC,...(ex||{})});
 H.furn=H.furn.filter(f=>!(f.level===L&&roomAt(R,f.p)===rid));it.forEach(f=>H.furn.push({...f,level:L,rid}));return it;}
window.__relay=(L,x,z,ex)=>{rooms(L);return relayRoom(L,roomAt(RC[L],[x,z]),ex);};
function dropOrRelay(list,log,tag){const relay=new Map();list.forEach(f=>{if(DECOR_DROP.has(f.t)){H.furn=H.furn.filter(o=>o!==f);log.push(tag+':'+f.t);return;}const R=RC[f.level]||(rooms(f.level),RC[f.level]);if(!R)return;const rid=roomAt(R,f.p);const k=f.level+':'+rid;if(!relay.has(k))relay.set(k,[f.level,rid,{needWC:H.furn.some(o=>o.level===f.level&&o.t==='wc'&&roomAt(R,o.p)===rid)}]);});
 relay.forEach(([L,rid,ex])=>{if(relayRoom(L,rid,ex)){log.push(tag+'-relayout:'+L+':'+rid);}});}
function stairFurn(){const out=[];(H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(l=>l.name===st.level);const lv=[st.level,(H.levels[li+1]||{}).name];const r=stairRect(st);(H.furn||[]).forEach((f,q)=>{if(!lv.includes(f.level)||!f.p)return;if(f.p[0]>r[0]-.05&&f.p[0]<r[2]+.05&&f.p[1]>r[1]-.05&&f.p[1]<r[3]+.05&&!out.includes(q))out.push(q);
  else if(f.level===lv[1]&&!WALK_SOFT.has(f.t)&&!out.includes(q)){const D=DIM3[f.t]||[.5,.5],w=f.w||D[0],d=f.d||D[1],e=(f.r||0)%2?[d,w]:[w,d];if(f.p[0]+e[0]/2>r[0]-.58&&f.p[0]-e[0]/2<r[2]+.58&&f.p[1]+e[1]/2>r[1]-.58&&f.p[1]-e[1]/2<r[3]+.58)out.push(q);}});});return out;}
// door clearance zone: door width + 10 cm each side, 1 m deep on both faces of the wall; overlaps the stair run on its level and the stair opening on the level above
function doorStairHit(w,o,L,off){const G=geo(w),n=[-G.u[1],G.u[0]],t=(w.thickness||.3)/2+1,s0=(off??o.offset)-.1,s1=(off??o.offset)+o.width+.1,P=[[s0,-t],[s1,-t],[s1,t],[s0,t]].map(([a,b])=>[G.x0+G.u[0]*a+n[0]*b,G.z0+G.u[1]*a+n[1]*b]);const zx=[Math.min(...P.map(p=>p[0])),Math.min(...P.map(p=>p[1])),Math.max(...P.map(p=>p[0])),Math.max(...P.map(p=>p[1]))];const li=H.levels.findIndex(l=>l.name===L);
 return (H.stairs||[]).some(st=>{const sl=H.levels.findIndex(l=>l.name===st.level);if(sl!==li&&sl!==li-1)return false;const r=stairRect(st),m=.02;if(!(zx[0]<r[2]-m&&zx[2]>r[0]+m&&zx[1]<r[3]-m&&zx[3]>r[1]+m))return false;
  /* exact test in the wall frame (walls may be oblique) */const C=[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]].map(p=>[(p[0]-G.x0)*G.u[0]+(p[1]-G.z0)*G.u[1],(p[0]-G.x0)*n[0]+(p[1]-G.z0)*n[1]]);const a0=Math.min(...C.map(c=>c[0])),a1=Math.max(...C.map(c=>c[0])),b0=Math.min(...C.map(c=>c[1])),b1=Math.max(...C.map(c=>c[1]));return a0<s1-m&&a1>s0+m&&b0<t-m&&b1>-t+m;});}
function doorStairHits(){const out=[];(H.levels||[]).forEach(l=>{rooms(l.name);H.walls.filter(w=>w.level===l.name).forEach(w=>(w.openings||[]).forEach(o=>{if(o.type==='door'&&doorStairHit(w,o,l.name))out.push({w,o,L:l.name});}));});return out;}
/* v18e RULE (same surroundings for every house): a house without a designed plot gets an automatic one in the demo's proportions, so lawn, fence,
   street, neighbours, trees, paths and terrace come from the one shared site generator in v3.js (demo and uploaded houses use the same code).
   A room labelled Garáž gets a sectional garage door on its best outside wall (street side first), the plot records it for the driveway + car. audit: site-present, garage-door */
/* v18k: exterior doors of a level with the room they serve and their outward normal */
function extDoors(L0){const RS=rooms(L0),R=RC[L0];if(!R||!R.g)return[];const T=assignTypes(R,L0),ids=new Set(RS.map(q=>q.id)),out=[];
 H.walls.filter(w=>w.level===L0).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const m=o.offset+o.width/2,c=[G.x0+G.u[0]*m,G.z0+G.u[1]*m];const a=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),b=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);if(ids.has(a)===ids.has(b)||a===-1||b===-1)return;const r=RS.find(q=>q.id===(ids.has(a)?a:b));out.push({w,o,c,nm:r?roomType(r,T,R,L0):'',n:ids.has(a)?[-n[0],-n[1]]:n});});});return out;}
function garageDoor(log){const L0=H.levels[0].name;const RS=rooms(L0);/* v18k: the garage opens to the side the house is entered from (the drive side) */let EN=null;{const X=extDoors(L0).filter(x=>x.o.kind!=='garage'&&!/Garáž/.test(x.nm)).map(x=>({x,s:(x.o.kind==='entrance'?9:0)+(/Predsie|Chodba|Zádver|Vstup|Hala/.test(x.nm)?6:0)+(x.o.out?2:0)})).sort((a,b)=>b.s-a.s);if(X.length&&X[0].s>0){const x=X[0].x;EN={hz:Math.abs(x.n[1])>.7,c:Math.abs(x.n[1])>.7?x.c[1]:x.c[0]};}window.__gEN=EN;}const gs=RS.filter(r=>/^Garáž/i.test(r.n||'')&&r.bb);if(!gs.length)return null;
 const ar=r=>(r.bb[2]-r.bb[0])*(r.bb[3]-r.bb[1]);const g=gs.sort((x,y)=>ar(y)-ar(x))[0],bb=g.bb,cx=(bb[0]+bb[2])/2,cz=(bb[1]+bb[3])/2;const C=[];
 H.walls.filter(w=>w.level===L0&&w._ext).forEach(w=>{const G=geo(w),t=(w.thickness||.3)/2+.15,hz=Math.abs(G.u[1])<.05,vt=Math.abs(G.u[0])<.05;if(!hz&&!vt)return;let ed,lo,hi;
  if(hz){const c=G.z0;if(Math.abs(c-bb[1])<t)ed=0;else if(Math.abs(c-bb[3])<t)ed=2;else return;lo=Math.max(bb[0],Math.min(w.start[0],w.end[0]));hi=Math.min(bb[2],Math.max(w.start[0],w.end[0]));}
  else{const c=G.x0;if(Math.abs(c-bb[0])<t)ed=1;else if(Math.abs(c-bb[2])<t)ed=3;else return;lo=Math.max(bb[1],Math.min(w.start[1],w.end[1]));hi=Math.min(bb[3],Math.max(w.start[1],w.end[1]));}
  /* v18j: a garage front read as a short piece around a wide opening still counts (>= 2.3 m, or it already holds a >= 1.6 m opening) */const wide=(w.openings||[]).some(q=>q.width>=1.6);if(hi-lo<(wide?1.9:2.3))return;C.push({w,G,lo,hi,hz,n:ed===0?[0,-1]:ed===2?[0,1]:ed===1?[-1,0]:[1,0],sc:(ed===0?3:ed===2?0:1)+(hi-lo)/10+(EN&&EN.hz===hz&&((ed===0&&EN.c<cz)||(ed===2&&EN.c>cz)||(ed===1&&EN.c<cx)||(ed===3&&EN.c>cx))?5:0)+(((ed%2===0)?(bb[2]-bb[0]):(bb[3]-bb[1]))<Math.max(bb[2]-bb[0],bb[3]-bb[1])-.6?4:0)/* v18j: a car drives in lengthwise - the door sits on a SHORT side of the garage */});});
 if(!C.length)return null;C.sort((x,y)=>y.sc-x.sc);const c=C[0],w=c.w,G=c.G,sOf=v=>c.hz?(v-G.x0)/G.u[0]:(v-G.z0)/G.u[1];let s0=sOf(c.lo),s1=sOf(c.hi);if(s0>s1)[s0,s1]=[s1,s0];
 let o=(w.openings||[]).find(q=>q.offset<s1&&q.offset+q.width>s0&&q.width>=1.6);if(o&&o.type!=='door'){o.type='door';delete o.sill;o.height=2.1;}if(o&&o.width<2.2){const W=Math.min(2.5,s1-s0-.2);if(W>o.width){o.offset=Math.round(((s0+s1)/2-W/2)*100)/100;o.width=Math.round(W*100)/100;}}
 if(!o){const W=Math.min(2.5,s1-s0-.4),off=(s0+s1)/2-W/2;w.openings=(w.openings||[]).filter(q=>!(q.offset<off+W+.15&&q.offset+q.width>off-.15));o={type:'door',offset:Math.round(off*100)/100,width:Math.round(W*100)/100,height:2.1,kind:'garage',auto:1};w.openings.push(o);w.openings.sort((x,y)=>x.offset-y.offset);if(log)log.push('garage-door');}
 else o.kind='garage';const m=o.offset+o.width/2,q=v=>Math.round(v*100)/100;return{x:q(G.x0+G.u[0]*m),z:q(G.z0+G.u[1]*m),n:c.n,w:o.width,c:[q(cx),q(cz)],bb:bb.map(q)};}
function streetSide(GA,raw){const card=n=>Math.abs(n[0])>Math.abs(n[1])?[Math.sign(n[0]),0]:[0,Math.sign(n[1])||-1];if(!raw&&(globalThis.__PF||{}).northSt)return[0,-1];if(GA&&GA.n)return card(GA.n);const L0=H.levels[0].name;const X=extDoors(L0).filter(x=>x.o.kind!=='garage'&&!/Garáž/.test(x.nm)).map(x=>({x,s:(x.o.kind==='entrance'?9:0)+(/Predsie|Chodba|Zádver|Vstup|Hala/.test(x.nm)?6:0)+(x.o.out?2:0)})).sort((a,b)=>b.s-a.s);return X.length&&X[0].s>0?card(X[0].x.n):[0,-1];}
function sitePlot(log){if(!H.levels||!H.levels.length||(H.plot&&!H.plot.auto))return;const L0=H.levels[0].name,W=H.walls.filter(w=>w.level===L0);if(W.length<3)return;
 const GA=garageDoor(log),xs=W.flatMap(w=>[w.start[0],w.end[0]]),zs=W.flatMap(w=>[w.start[1],w.end[1]]),q=v=>Math.round(v*100)/100,x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
 /* v21g RULE (street side): the street lies on the side the house is driven into (garage door) or, without a garage, entered from (entrance door); front yard 6.5 m there, back garden 8 m opposite, 6.5 m on the street's right and 4 m on its left (a garage on a side gets 8 m). audit: street-side */
 const st=streetSide(GA);const sb=d=>{const[dx,dz]=d;if(dx===st[0]&&dz===st[1])return 6.5;if(dx===-st[0]&&dz===-st[1])return 8;if(GA&&Math.abs(GA.n[0]-dx)<.5&&Math.abs(GA.n[1]-dz)<.5)return 8;return(dx===-st[1]&&dz===st[0])?6.5:4;};
 const sN=sb([0,-1]),sS=sb([0,1]),sW=sb([-1,0]),sE=sb([1,0]);const np={pts:[[q(x0-sW),q(z0-sN)],[q(x1+sE),q(z0-sN)],[q(x1+sE),q(z1+sS)],[q(x0-sW),q(z1+sS)]],fence:1,auto:1};if(st[1]!==-1)np.st=st;if(GA){np.garage=GA;np.carport=false;}
 if(JSON.stringify(np)!==JSON.stringify(H.plot||null)){H.plot=np;if(log)log.push('auto-plot');}}
function rulesFix(op){op=op||{};const log=[];try{sitePlot(log);}catch(e){console.warn('sitePlot',e);}/* v20261117q: the same furniture rules for every house - demo JSON, uploaded plan or re-generated: a side table needs a seat/bed next to it, plants keep 0.7 m apart, a chair never stands inside its table (rules lone-side / plant-cluster / chair-in-table in audit) */
 if(H.furn&&H.furn.length){const FD=window.__FUR3||{},sz=f=>{const D=DIM3[f.t]||[.5,.5],w=f.w||D[0],d=f.d||D[1];return (f.r||0)%2?[d,w]:[w,d];},gap=(a,b)=>{const A=sz(a),B=sz(b);return Math.hypot(Math.max(0,Math.abs(a.p[0]-b.p[0])-(A[0]+B[0])/2),Math.max(0,Math.abs(a.p[1]-b.p[1])-(A[1]+B[1])/2));};void FD;
  const keep=[];for(const f of H.furn){const same=keep.filter(o=>o.level===f.level);
   if(f.t==='side'&&!H.furn.some(o=>o!==f&&o.level===f.level&&['sofa','armch','lounge','bed','bed1','bunk'].includes(o.t)&&gap(f,o)<.35)){log.push('lone-side');continue;}
   if(f.t==='plant'&&same.some(o=>o.t==='plant'&&Math.hypot(o.p[0]-f.p[0],o.p[1]-f.p[1])<.7)){log.push('plant-cluster');continue;}
   if(f.t==='chair'||f.t==='stool'){const T=H.furn.find(o=>o.level===f.level&&['table','desk','otable'].includes(o.t)&&Math.abs(o.p[0]-f.p[0])<sz(o)[0]/2-.02&&Math.abs(o.p[1]-f.p[1])<sz(o)[1]/2-.02);if(T){log.push('chair-in-table');continue;}}
   keep.push(f);}if(keep.length!==H.furn.length)H.furn=keep;
  {const b=stairFurn();if(b.length){dropOrRelay(b.map(q=>H.furn[q]),log,'furniture-on-stairs');const b2=stairFurn();if(b2.length)H.furn=H.furn.filter((f,q)=>!b2.includes(q));}}lonelySeats(log);
  /* v20261117r: no two pieces may overlap (demo JSON had a shelf inside the bunk bed, a shelf inside the desk) - the lower-priority piece goes; chairs/stools may tuck under tables/desks.
     WC keeps 20 cm from any neighbour (centre >= 40 cm from side obstacles): it slides along its wall if the room allows, else the WC is dropped. audit: furn-overlap3d, wc-clearance */
  const SOFTF=new Set(['rug','runner','art','curtain','mirror','towel','tvw','hooks','wshelf','pendant','lamp']),TU=new Set(['chair','stool']),UN=new Set(['table','desk','island','otable','kitch']),PRI=['plant','toy','side','lamp','shelf','armch','dresser','sideb','nstand','bench','coat','shoe','washer','tv','ctable','chair','stool'];
  const rq=f=>{const e=sz(f);return[f.p[0]-e[0]/2,f.p[1]-e[1]/2,f.p[0]+e[0]/2,f.p[1]+e[1]/2];},ovq=(A,B,m)=>Math.min(A[2],B[2])-Math.max(A[0],B[0])>m&&Math.min(A[3],B[3])-Math.max(A[1],B[1])>m;
  for(let pass=0;pass<3;pass++){let ch=0;const F=H.furn.filter(f=>!SOFTF.has(f.t));for(let i=0;i<F.length&&!ch;i++)for(let j=i+1;j<F.length&&!ch;j++){const a=F[i],b=F[j];if(a.level!==b.level)continue;if((TU.has(a.t)&&UN.has(b.t))||(TU.has(b.t)&&UN.has(a.t)))continue;if(!ovq(rq(a),rq(b),.03))continue;
    const pa=PRI.indexOf(a.t),pb=PRI.indexOf(b.t),drop=pa<0&&pb<0?b:pa<0?b:pb<0?a:(pa<=pb?a:b);if(DECOR_DROP.has(drop.t)){H.furn=H.furn.filter(f=>f!==drop);log.push('furn-overlap:'+drop.t);}else dropOrRelay([drop],log,'furn-overlap');ch=1;}if(!ch)break;}
  H.furn.filter(f=>f.t==='wc').forEach(wc=>{const L=wc.level,RS=rooms(L),R=RC[L];if(!R)return;const rid=roomAt(R,wc.p),nb=()=>H.furn.filter(o=>o!==wc&&o.level===L&&!SOFTF.has(o.t)&&gap(o,wc)<.195);let bad=nb();if(!bad.length)return;
    const ax=(wc.r||0)%2?[0,1]:[1,0],p0=[...wc.p];for(const dd of[.05,.1,.15,.2,.25,.3,-.05,-.1,-.15,-.2,-.25,-.3]){wc.p=[p0[0]+ax[0]*dd,p0[1]+ax[1]*dd];const q=rq(wc);if([[q[0]+.02,q[1]+.02],[q[2]-.02,q[1]+.02],[q[0]+.02,q[3]-.02],[q[2]-.02,q[3]-.02]].every(c=>roomAt(R,c)===rid)&&!nb().length){wc.p=wc.p.map(v=>Math.round(v*100)/100);log.push('wc-clearance-slide');return;}}
    wc.p=p0;const it=relayRoom(L,rid,{needWC:1});if(it&&it.some(f=>f.t==='wc')){log.push('wc-clearance-relayout');return;}H.furn=H.furn.filter(f=>f!==wc);log.push('wc-clearance-drop');});}H.walls.forEach(w=>{const wh=w.height||((H.levels||[]).find(l=>l.name===w.level)||{}).height||2.8;(w.openings||[]).forEach(o=>{if((o.sill||0)<0){o.sill=0;log.push('opening-height');}
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
  if(ex.length>3){const r0=reach0(),undo=[];ex.sort((x,y)=>y.sc-x.sc);ex.slice(2).forEach(({w,o,rid})=>{if(o.kind==='garage')return;/* v18j: the garage door is never demoted to a window */if((dc[rid]||0)<2)return;dc[rid]--;undo.push([o,JSON.stringify(o)]);o.type='window';o.sill=o.width>=2?0:.9;o.height=o.width>=2?2.1:1.4;delete o.out;delete o.kind;delete o.hinge;log.push('too-many-exterior-doors');});if(undo.length&&reach0()>r0)undo.forEach(([o,j])=>{for(const k of Object.keys(o))delete o[k];Object.assign(o,JSON.parse(j));});}}}
 // v18k LOGIC RULE (terrace door): when no door is marked as the terrace door, the exterior door of the living room (else dining/kitchen) is it, as
 // long as the house keeps another exterior door to enter by. The deck, pergola and glazing follow that door (v3 terrace + audit terrace-placed).
 if(!op.noDoors&&H.levels&&H.levels.length){const L0=H.levels[0].name;const X=extDoors(L0);window.__extD=X.map(x=>[x.nm,x.o.kind||'',x.o.width,x.n]);if(X.length>=2&&!X.some(x=>x.o.kind==='terrace')){let best=null;const WL=H.walls.filter(w=>w.level===L0),bx=[Math.min(...WL.flatMap(w=>[w.start[0],w.end[0]])),Math.min(...WL.flatMap(w=>[w.start[1],w.end[1]])),Math.max(...WL.flatMap(w=>[w.start[0],w.end[0]])),Math.max(...WL.flatMap(w=>[w.start[1],w.end[1]]))];/* only a door on the outer facade (a wing face counts if nothing stands 3 m in front of it) */const face=x=>{const p=[x.c[0]+x.n[0]*.5,x.c[1]+x.n[1]*.5],q=[x.c[0]+x.n[0]*3.2,x.c[1]+x.n[1]*3.2];return !WL.some(w=>{if(w===x.w)return false;const a=w.start,b=w.end,d=(b[0]-a[0])*(q[1]-p[1])-(b[1]-a[1])*(q[0]-p[0]);if(Math.abs(d)<1e-9)return false;const t=((p[0]-a[0])*(q[1]-p[1])-(p[1]-a[1])*(q[0]-p[0]))/d,u=((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))/d;return t>=0&&t<=1&&u>=0&&u<=1;});};X.forEach(x=>{if(x.o.kind==='entrance'||x.o.kind==='garage'||x.o.width<.75||!face(x))return;const sc=/Obýv/.test(x.nm)?3:/Jedál/.test(x.nm)?2:/Kuchy/.test(x.nm)?1:0;if(!sc)return;const v=sc+x.o.width/10;if(!best||v>best.v)best={x,v};});
  if(best){best.x.o.kind='terrace';log.push('terrace-door');}}}
 // prem9 LOGIC RULE (door into a wall): a door that cannot be slid ≤1.2 m off a wall right behind it opens onto nothing usable - it is removed, unless that would leave a room unreachable or the house without an entrance
 if(blocked.length&&!op.noDoors){const reach=()=>rulesCheck().filter(x=>x.id==='room-unreachable'||x.id==='no-entrance').length+H.levels.reduce((k,l)=>k+validateAll(l.name).filter(v=>v.rule==='room-without-door').length,0);const r0=reach();blocked.forEach(([w,o])=>{const k=w.openings.indexOf(o);if(k<0)return;w.openings.splice(k,1);if(reach()>r0)w.openings.splice(k,0,o);else log.push('door-into-wall:removed');});}
 // v20261117a LOGIC RULE (door-stair-clear): no stair run (nor the stair opening on the floor above) within 1 m of either face of a door - you must never walk through a door straight into steps or a stairwell.
 // auto-fix: slide the door along its wall (≤1.5 m) to a clear spot with the same rooms on both sides; else an exterior door becomes a French window and an interior one is removed (both only if every room stays reachable and the house keeps an entrance)
 if(!op.noDoors&&(H.stairs||[]).length){const reach=()=>rulesCheck().filter(x=>x.id==='room-unreachable'||x.id==='no-entrance').length;let r0=null;
  doorStairHits().forEach(({w,o,L})=>{const G=geo(w),os=w.openings||[],R=RC[L],n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;const sides=off=>{const c=[G.x0+G.u[0]*(off+o.width/2),G.z0+G.u[1]*(off+o.width/2)];return roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e])+'|'+roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]);};const s0=sides(o.offset);
   for(let k=1;k<=15;k++)for(const d of[k/10,-k/10]){const off=o.offset+d;if(off<.1||off+o.width>G.L-.1)continue;if(os.some(q=>q!==o&&off<q.offset+q.width+.05&&off+o.width>q.offset-.05))continue;if(sides(off)!==s0||doorStairHit(w,o,L,off))continue;o.offset=r2(off);log.push('door-stair-clear');return;}
   if(r0===null)r0=reach();const j=JSON.stringify(o),i=os.indexOf(o);if(o.out||o.kind){o.type='window';o.sill=0;o.height=Math.min(o.height||2.1,2.1);delete o.out;delete o.kind;delete o.hinge;}else os.splice(i,1);
   if(reach()>r0){if(os.indexOf(o)<0)os.splice(i,0,o);for(const k of Object.keys(o))delete o[k];Object.assign(o,JSON.parse(j));}else log.push('door-stair-clear:'+(os.includes(o)?'window':'removed'));});}
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
   OPS=OPS||layoutOps(R,L);WS=WS||layoutWalls(L);const G=stairNoGo(makeRoom(R,r,OPS.filter(o=>o.room===r.id),WS,ldim),L);const it=layoutRoom(G,n,{fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC});
   const opt={fv:(H.fv||0)*13+r.id*7,style:({minimal:'min',moderny:'mod',futur:'mod'})[H.style]||'rod',hasWC},lay=(q,t)=>layoutRoom(makeRoom(R,q,OPS.filter(o=>o.room===q.id),WS,ldim),t,{...opt,fv:(H.fv||0)*13+q.id*7}),okK=(its,t)=>{const k=KEY(t);return!k||its.some(f=>k.includes(f.t));};
   if(!it.some(f=>K.includes(f.t))){
    // LOGIC RULE (type must fit the room): if the room cannot hold its key fixture, swap its type with another auto-named room on the floor
    // when BOTH rooms then hold their key fixtures (e.g. a 4 m² "Kuchyňa" and a 9 m² "Technická" trade names). Biggest plausible partner first.
    if(!r.auto)return;/* v12h: a name printed on the plan inside this room is ground truth, never traded away */if(/^(WC|Kúpeľ)/.test(n)&&(H.rlab||[]).some(l=>l.level===L&&roomAt(R,l.p)===r.id&&n.replace(/ \d+$/,'').startsWith(l.n)))return;const C=RS.filter(q=>q!==r&&q.auto&&!/^(Chodba|Predsieň|Obývačka)/.test(roomType(q,T,R,L))).sort((a,b)=>b.a-a.a);
    const wet=t=>/^(WC|Kúpeľ)/.test(t),sto=t=>/^(Technick|Komora|Špajz|Šatník)/.test(t);for(const q of C){const tq=roomType(q,T,R,L);if(wet(n)?!(wet(tq)||sto(tq)):wet(tq)?!sto(n):false)continue;/* wet rooms trade only with wet/storage rooms */const a=lay(r,tq),b=lay(q,n);if(okK(a,tq)&&okK(b,n)){const inQ=f=>f.level===L&&(f.rid===q.id||roomAt(R,f.p)===q.id);H.furn=H.furn.filter(f=>!inR(f)&&!inQ(f));a.forEach(f=>H.furn.push({...f,level:L,rid:r.id}));b.forEach(f=>H.furn.push({...f,level:L,rid:q.id}));
     H.rn=(H.rn||[]).filter(e=>!(e.level===L&&(roomAt(R,e.p)===r.id||roomAt(R,e.p)===q.id)));H.rn.push({level:L,p:[...r.p],n:tq.replace(/ \d+$/,''),auto:1},{level:L,p:[...q.p],n:n.replace(/ \d+$/,''),auto:1});log.push('type-swap:'+L+':'+n+'<->'+tq);nameR(R,L);return;}}
    return;}
   H.furn=H.furn.filter(f=>!inR(f));it.forEach(f=>H.furn.push({...f,level:L,rid:r.id}));log.push('fixture-missing:'+L+':'+n);});if(log.length>lg0&&hv(L)>v0){H.furn=JSON.parse(F0);H.rn=JSON.parse(N0);log.length=lg0;log.push('fix-reverted:'+L);nameR(R,L);}});
 if(!op.noFix){const bad=stairFurn();if(bad.length){dropOrRelay(bad.map(q=>H.furn[q]),log,'furniture-on-stairs');const b2=stairFurn();if(b2.length){H.furn=H.furn.filter((f,q)=>!b2.includes(q));}lonelySeats(log);}}return log;}
function rulesCheck(){const out=[],P=(id,where,extra)=>{const R0=RULES.find(r=>r[0]===id);out.push({id,sev:R0?R0[1]:'soft',where,...(extra||{})});};
 if(!H.levels||!H.walls.length)return out;extSides();H.levels.forEach(l=>{try{bandRooms(l.name).forEach(b=>P('band-room',{level:l.name,room:b.n},{a:+b.a.toFixed(1),into:b.into}));}catch(e){}});try{const L0=H.levels[0].name;if(H.walls.some(w=>w.level===L0)&&entDoorsN(L0)===0)P('entrance-present',{level:L0},{});}catch(e){}H.levels.forEach(l=>{if(!(H.dinAuto||{})[l.name])return;/* only storeys furnished automatically (a saved / hand-made layout is the user's choice) */const F=(H.furn||[]).filter(f=>f.level===l.name);if(F.some(f=>f.t==='kitch')&&!F.some(f=>f.t==='table'))P('dining-present',{level:l.name},{n:F.length});});try{if(H.plot&&H.plot.auto){const L0n=H.levels[0].name,ws=H.walls.filter(w=>w.level===L0n);if(ws.length>=3){const want=streetSide(H.plot.garage||null,1),got=H.plot.st||[0,-1];if(want[0]!==got[0]||want[1]!==got[1])P('street-side',{level:L0n},{want,got});}}}catch(e){}H.levels.forEach(l=>{try{const rs=rooms(l.name)||[],R=RC[l.name],hasKL=(H.rlab||[]).some(q=>q.level===l.name&&/^Kuchyň/.test(q.n));if(R&&R.r&&!hasKL){const lv=rs.find(r=>r.n==='Obývačka'&&r.a>=26);const n=lv?(H.rarea||[]).filter(q=>q.level===l.name&&q.p&&q.v>=1&&roomAtL(R,q.p)===lv.id).length:0;if(n>=2&&rs.some(r=>r.n==='Kuchyňa'))P('kitchen-open-plan',{level:l.name},{labels:n});}}catch(e){}});H.levels.forEach(l=>{try{const RS=rooms(l.name),R=RC[l.name];if(!R||!R.g)return;openZoneCands(R,l.name).forEach(c=>P('open-zones',{level:l.name,room:c.r.n},{areas:c.seeds.map(s=>s.v||0),labels:c.seeds.map(s=>s.n||'')}));}catch(e){}});H.levels.forEach(l=>{try{envHoles(l.name).slice(0,3).forEach(h=>P('envelope-closed',{level:l.name},{len:+h.len.toFixed(2),gain:+h.gain.toFixed(1)}));}catch(e){}});const nm={},graph={},ext=new Set();const L0=H.levels[0].name;
 H.levels.forEach((l,li)=>{const L=l.name,RS=rooms(L),R=RC[L];if(!R||!R.g||!RS.length)return;const ids=new Set(RS.map(q=>q.id)),T=assignTypes(R,L);RS.forEach(r=>{const k=L+':'+r.id;nm[k]=roomType(r,T,R,L);graph[k]=graph[k]||new Set();});
  const side=v=>v===-1?'wall':ids.has(v)?'room':'out';
  H.walls.filter(w=>w.level===L).forEach(w=>{const G=geo(w),n=[-G.u[1],G.u[0]],e=(w.thickness||.3)/2+.25;(w.openings||[]).forEach(o=>{if(o.type!=='door')return;const s=o.offset+o.width/2,c=[G.x0+G.u[0]*s,G.z0+G.u[1]*s];
   const va=roomAt(R,[c[0]+n[0]*e,c[1]+n[1]*e]),vb=roomAt(R,[c[0]-n[0]*e,c[1]-n[1]*e]),A=side(va),B=side(vb),wh={level:L,wall:w.id,at:r2(o.offset)};
   if(A==='wall'||B==='wall')P('door-into-wall',wh);else if(A==='out'&&B==='out')P('door-between-nothing',wh);else if(A==='room'&&B==='room'){if(va===vb)P('door-inside-room',wh);else{graph[L+':'+va].add(L+':'+vb);graph[L+':'+vb].add(L+':'+va);}}
   else if(li===0)ext.add(L+':'+(A==='room'?va:vb));});});
  zoneAdj(R).forEach(([a,b])=>{const ka=L+':'+a,kb=L+':'+b;if(graph[ka]&&graph[kb]){graph[ka].add(kb);graph[kb].add(ka);}});
  // fixtures (only when this floor is furnished)
  const F=(H.furn||[]).filter(f=>f.level===L);if(F.length)RS.forEach(r=>{const n=nm[L+':'+r.id]||'',fs=F.filter(f=>roomAt(R,f.p)===r.id),has=(...t)=>fs.some(f=>t.includes(f.t)),wh={level:L,room:n};
   if(/^WC/.test(n)&&!has('wc'))P('fixture-missing',wh,{need:'wc'});
   if(/Kúpeľ/.test(n)){if(!has('bath','shower'))P('fixture-missing',wh,{need:'bath|shower'});if(!has('sink'))P('fixture-missing',wh,{need:'sink'});/* v20261117s: wet rooms keep their fixtures */}
   if(/Spálň|Detsk/.test(n)&&!has('bed','bed1','bunk'))P('fixture-missing',wh,{need:'bed'});
   if(/Kuchyň/.test(n)){const K=fs.filter(f=>f.t==='kitch'),len=K.reduce((a,f)=>a+(f.w||2.8),0);if(!K.length)P('fixture-missing',wh,{need:'kitch'});else if(len<1.8)out.push({id:'kitchen-short',sev:len<1.2?'hard':'soft',where:wh,len:r2(len)});if(!has('fridge'))P('fixture-secondary',wh,{need:'fridge'});}});});
 if(!ext.size&&Object.keys(nm).some(k=>k.startsWith(L0+':')))P('no-entrance',{level:L0});
 /* v20261117s: a house with a bathroom always has a WC somewhere (a bathroom WC is never dropped when it is the only one) */if((H.furn||[]).some(f=>f.t==='bath'||f.t==='shower')&&!(H.furn||[]).some(f=>f.t==='wc'))P('fixture-missing',{level:L0},{need:'wc'});
 // stairs: bottom on st.level, top on the next level; link the two rooms for reachability
 (H.stairs||[]).forEach(st=>{const li=H.levels.findIndex(l=>l.name===st.level);if(li<0)return;const Lc=st.length||3.6,Wd=st.width||1,d=st.dir||0,c=Math.cos(d),sn=Math.sin(d),mid=[-sn*Wd/2,c*Wd/2];
  const bot=[st.pos[0]+mid[0]-c*.5,st.pos[1]+mid[1]-sn*.5],top=[st.pos[0]+mid[0]+c*(Lc+.5),st.pos[1]+mid[1]+sn*(Lc+.5)],ends=[[H.levels[li].name,bot,'bottom']];if(H.levels[li+1])ends.push([H.levels[li+1].name,top,'top']);
  const ks=ends.map(([L,p,which])=>{rooms(L);const R=RC[L];const v=roomAt(R,p),k=L+':'+v,n=nm[k];if(!n){P('stair-landing',{level:L,end:which,p:p.map(r2)});return null;}
   if(/^WC|Kúpeľ|Šatn|Komora|Technick/.test(n))P('stair-landing',{level:L,end:which,room:n});else if(/Spálň/.test(n))P('stair-landing-bedroom',{level:L,end:which,room:n});return k;});
  if(ks[0]&&ks[1]){graph[ks[0]].add(ks[1]);graph[ks[1]].add(ks[0]);}});
 doorStairHits().forEach(({w,o,L})=>P('door-stair-clear',{level:L,wall:w.id,at:r2(o.offset)}));
 // reachability from entrance rooms
 if(ext.size){const seen=new Set(ext),q=[...ext];while(q.length){const k=q.pop();(graph[k]||[]).forEach(j=>{if(!seen.has(j)){seen.add(j);q.push(j);}});}
  window.__reachSeen=seen;Object.keys(nm).forEach(k=>{if(!seen.has(k))P('room-unreachable',{level:k.split(':')[0],room:nm[k]});});}
 doorViol().forEach(v=>P('upper-door-to-nowhere',{wall:v.p[0],at:v.p[1]}));
 // scale: a guessed scale is always flagged; if several rooms are too small/narrow for their type, the needed enlargement is proposed (never applied silently)
 /* v18d RULES (ATL-1): the printed area numbers are matched to the room polygon that contains them - two different printed areas in one
    room = a missing wall (merged rooms), one printed area far from the polygon area = wrong split / wrong label, more printed areas than rooms = lost rooms.
    audit: room-merged, area-label-mismatch, rooms-vs-labels */
 H.levels.forEach(l=>{const L=l.name,RS=rooms(L),R=RC[L];if(!R||!R.g||!RS.length)return;const A=(H.rarea||[]).filter(a=>a.level===L&&a.p&&a.p[0]>-1e5&&a.v>=.8&&a.v<400);if(A.length<3)return;const by={},gs=H.underlay&&H.underlay.guess&&!H.underlay.cal;
  A.forEach(a=>{const id=roomAt(R,a.p);if(!RS.some(q=>q.id===id))return;(by[id]=by[id]||[]).push(a.v);});
  RS.forEach(r=>{const v=by[r.id];if(!v)return;const k=L+':'+r.id,u=[...new Set(v.map(x=>x.toFixed(1)))].map(Number);if(u.length>=2&&!/kuchyň/i.test(nm[k]||''))/* open-plan living + kitchen legitimately prints two areas (dashed boundary) */P('room-merged',{level:L,room:nm[k]},{areas:u});else if(!gs&&!(/kuchyň/i.test(nm[k]||'')&&r.a>u[0])&&Math.abs(r.a-u[0])>Math.max(1,.25*u[0]))P('area-label-mismatch',{level:L,room:nm[k]},{printed:u[0],got:r2(r.a)});});
  const nA=new Set(A.map(a=>a.v.toFixed(1)+'@'+roomAt(R,a.p))).size,nR=RS.filter(r=>r.a>=.8).length;if(nA>nR)P('rooms-vs-labels',{level:L},{labels:nA,rooms:nR});});
 if(H.underlay&&H.underlay.guess&&!H.underlay.cal){const sf=scaleCheck();if(sf&&sf.f>=1.1)P('scale-implausible',{level:L0},{f:sf.f,n:sf.n});else P('scale-guess',{level:L0});}
 {const SF=new Set(['rug','runner','art','curtain','mirror','towel','tvw','hooks','wshelf','pendant','lamp']),sz=f=>{const D=DIM3[f.t]||[.5,.5],w=f.w||D[0],d=f.d||D[1];return (f.r||0)%2?[d,w]:[w,d];};(H.furn||[]).filter(f=>f.t==='wc').forEach(wc=>{const A=sz(wc);(H.furn||[]).forEach(o=>{if(o===wc||o.level!==wc.level||SF.has(o.t)||(o.rid!=null&&wc.rid!=null&&o.rid!==wc.rid))return;/* v20261117s: only same-room neighbours (a shelf behind the wall is not a clearance problem) */const B=sz(o),g=Math.hypot(Math.max(0,Math.abs(o.p[0]-wc.p[0])-(A[0]+B[0])/2),Math.max(0,Math.abs(o.p[1]-wc.p[1])-(A[1]+B[1])/2));if(g<.19)out.push({id:'wc-clearance',sev:'hard',where:{level:wc.level},t:o.t,gap:r2(g)});});});}
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
function chkMsg(x){const w=x.where||{},r=w.room||'',lv=w.level?w.level+' · ':'';return lv+({'opening-height':'Okno alebo dvere sú vyššie ako stena','door-into-wall':'Dvere vedú do steny','downpipe-eave':'Odkvapová rúra začína vyššie ako odkvap strechy','site-present':'Pozemok bez trávnika / okolia','furn-from-kit':'Nábytok mimo knižnice (náhradný kváder)','dining-present':'Pri kuchyni chýba jedálenský stôl','entrance-present':'Dom nemá vchodové dvere (okrem garáže)','terrace-furnished':'Terasa bez nábytku / rastlín','terrace-pergola':'Terasa pri obývačke nemá pergolu','car-clear':'Auto stojí pred garážovou bránou','terrace-placed':'Terasa nie je tam, kde je na výkrese','terrace-clear':'Nábytok na terase zasahuje do steny alebo pred dvere','site-clear':'Strom alebo susedný dom stojí na dome alebo príjazde','garage-door':'Garáž nemá garážovú bránu','garage-drive':'Ku garáži nevedie príjazd (alebo chýba auto)','lintel-floating':'Nadpražie nad otvorom visí vo vzduchu (bez steny po stranách)','room-merged':r+' – obsahuje 2 popísané plochy ('+(x.areas||[]).map(v=>String(v).replace('.',',')).join(' + ')+' m²) – chýba stena?','area-label-mismatch':r+' – na pláne '+String(x.printed).replace('.',',')+' m², nakreslené '+String(x.got).replace('.',',')+' m²','rooms-vs-labels':'Na pláne je '+x.labels+' plôch miestností, nájdených '+x.rooms+' miestností','door-between-nothing':'Dvere nevedú do žiadnej miestnosti','door-inside-room':'Zbytočné dvere vnútri miestnosti','upper-door-to-nowhere':'Dvere na poschodí vedú do prázdna','no-entrance':'Prízemie nemá vchodové dvere','room-unreachable':r+' – nedá sa do nej prejsť','stair-landing':'Schody ústia mimo vhodnej miestnosti'+(r?' ('+r+')':''),'stair-landing-bedroom':'Schody ústia do spálne','furniture-on-stairs':'Nábytok stojí na schodoch alebo v otvore nad nimi','walkability':'Chýba 80 cm prechod do miestnosti','ext-material':'Na fasáde je vidieť podlahový materiál','downpipe-connected':'Zvody nie sú napojené na odkvap alebo nesiahajú na zem','downpipe-pierce':'Zvod pretína rímsu alebo dosku strechy','floor-present':'V miestnosti chýba podlaha','ceiling-present':'V miestnosti chýba strop','walls-closed':'V obvodovej stene je diera','street-side':'Ulica nie je na strane vjazdu alebo vchodu do domu','kitchen-aisle':'Jedálenský stôl zasahuje do uličky pred kuchynskou linkou','band-room':'Úzky pás pri obvodovej stene je prečítaný ako samostatná miestnosť','kitchen-open-plan':'Kuchyňa je pomenovaná vo vedľajšej izbe, hoci je v otvorenej obývačke','open-zones':r+' – otvorený priestor s viacerými popísanými plochami nie je rozdelený na zóny (obývačka / jedáleň / kuchyňa)','envelope-closed':'Chýba kus obvodovej steny – dom je otvorený','opening-mesh':'V otvore chýba okno alebo dvere','stair-connects':'Schody nespájajú podlažia','room-empty':r+' – izba je prázdna','audit-crash':'Kontrola 3D zlyhala','basics-crash':'Kontrola 3D zlyhala','fixture-missing':r+' – chýba '+(NEED[x.need]||x.need),'fixture-secondary':r+' – chýba '+(NEED[x.need]||x.need),'kitchen-short':r+' – krátka linka ('+String(x.len).replace('.',',')+' m)','scale-guess':'Mierka je odhadnutá – overte jeden známy rozmer <button class="chkb" data-k="cal">Kalibrovať</button>','scale-implausible':'Mierka je asi malá: '+x.n+' miestnosti sú na svoj účel príliš malé. Zväčšiť ×'+String(x.f).replace('.',',')+'? <button class="chkb" data-k="sc" data-f="'+x.f+'">Zväčšiť</button> <button class="chkb" data-k="cal">Kalibrovať</button>'}[x.id]||x.id)+(/^(opening-height|door-into-wall|door-between-nothing|upper-door-to-nowhere)$/.test(x.id)?' <small>· opraví sa pri 3D</small>':'');}
let chkT=0;function chkSoon(){clearTimeout(chkT);chkT=setTimeout(chkUI,700);}
function chkUI(){const b=$('chk');if(!b)return;let o=[];try{o=H&&H.walls&&H.walls.length?rulesCheck():[];}catch(e){console.warn(e);}const h=o.filter(x=>x.sev==='hard'),s=o.filter(x=>x.sev!=='hard');
 b.hidden=!(H&&H.walls&&H.walls.length>2);b.classList.toggle('w',!!h.length);b.innerHTML='<i class="d"></i>'+(o.length?'Kontrola · '+o.length:'Kontrola: v poriadku');
 const L=$('chkl');L.innerHTML=o.length?(h.length?'<b>Treba opraviť</b>'+h.map(x=>'<p class="h">'+chkMsg(x)+'</p>').join(''):'')+(s.length?'<b>Na zváženie</b>'+s.map(x=>'<p class="s">'+chkMsg(x)+'</p>').join(''):'')+'<p><small>Pri generovaní 3D sa časť opraví automaticky.</small></p>':'<p><small>Dvere, schody, miestnosti a vybavenie dávajú zmysel.</small></p>';}
$('chk')&&($('chk').onclick=e=>{e.stopPropagation();$('chkl').hidden=!$('chkl').hidden;});$('chkl')&&($('chkl').onclick=e=>{const b=e.target.closest('.chkb');if(!b)return;$('chkl').hidden=true;if(b.dataset.k==='cal')$('cal').click();if(b.dataset.k==='sc'){const f=+b.dataset.f;scaleBy(f);H.walls.forEach(w=>(w.openings||[]).forEach(o=>{o.offset=Math.round(o.offset*f*100)/100;o.width=Math.round(o.width*f*100)/100;}));save();const had=(H.furn||[]).some(q=>q.level===lvl);if(had){H.fv=((H.fv||1)+3)%4;furnish();}draw();toast('Mierka zväčšená ×'+String(f).replace('.',',')+'. Späť ju vráti.','ok');}});document.addEventListener('pointerdown',e=>{const L=$('chkl');if(L&&!L.hidden&&!L.contains(e.target)&&e.target!==$('chk'))L.hidden=true;});
window.__rules=()=>{const o=rulesCheck();try{const m=window.__vk&&window.__vk.m;if(m&&m.audit)m.audit().forEach(x=>o.push({id:x.rule,sev:'hard',where:x.level||'',...x}));}catch(e){o.push({id:'audit-crash',sev:'hard',err:String(e)});}try{const m=window.__vk&&window.__vk.m;if(m&&m.basics)m.basics().forEach(x=>o.push({id:x.rule,sev:'hard',where:x.where||x.level||'',...x}));}catch(e){o.push({id:'basics-crash',sev:'hard',err:String(e)});}return{hard:o.filter(x=>x.sev==='hard'),soft:o.filter(x=>x.sev==='soft')};};window.__rulesFix=rulesFix;

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
  /* v20261117c: ?demo=ukazka3 (or 3) = direct share link straight into the finished villa showcase in 3D */
  if(q.get('demo')==='ukazka3'||q.get('demo')==='3'){window.__mktBusy=1;try{await demo3();show('vw');await v3();await gen(false);}catch(e){console.error(e);}window.__mktBusy=0;return;}
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
  window.__vk={m,playCam:(k,s,e)=>m.playCam(k,s,e),scrub:(u)=>m.scrubCam&&m.scrubCam(u),count:()=>m.countFurn&&m.countFurn(),snap:()=>m.snapBuild&&m.snapBuild(),debug:()=>m.debugViz&&m.debugViz(),doll:on=>m.dollhouse(on),walk:v=>m.setWalk(v),jump:(x,z)=>m.jump&&m.jump(x,z,1.55),stop:()=>m.stopCam&&m.stopCam(),clearance:()=>m.checkClearances&&m.checkClearances(),bird:(x,z,h)=>m.birdCam&&m.birdCam(x,z,h),pause:on=>m.pauseCam&&m.pauseCam(on),cam:(...a)=>m.qaCam&&m.qaCam(...a)};
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

const TUT3=[['#modes','Režimy','Exteriér = dom zvonku, Bez strechy = vidno všetky izby, Prechádzka = kráčate po dome, VR = v okuliaroch Meta Quest.'],['#jumps','Miestnosti','Ťuknutím sa presuniete priamo do miestnosti.'],['#dock3','Nastavenia','Ikony dole: nábytok, počasie, čas dňa, steny, fasáda, podlahy a strecha – ťuknite a vyberte.'],['#pres','Prezentácia','Čistý režim na celú obrazovku s automatickou prehliadkou a kontaktom makléra.'],['#share','Zdieľať','Odkaz pre klienta – otvorí sa rovno prezentácia.']];

/* v12d: 3D settings dock - one recognizable icon per setting, each opens only its own controls (the old ✦ Vzhľad menu was too hidden on phones) */
(function dock3(){const L=$('look'),V=$('vw');if(!L||!V||$('dock3'))return;
 const PK=[['','Rodinný',['#6a5644','#d4b48a','#bea07d']],['moderny','Moderný',['#5d6470','#3b3b3b','#bea07d']],['skandi','Škandinávsky',['#d8cfc0','#c4a07a','#e9e4da']],['indus','Industriálny',['#7a4a2e','#2a2c2e','#b0aea8']],['klasik','Klasický',['#6b3f35','#5a3a26','#8a6448']],['minimal','Minimalistický',['#d9d6cf','#d8c8ae','#f3f2ef']]];
 const sp=document.createElement('div');sp.className='lkx';sp.id='stypick';sp.dataset.f='furn';sp.innerHTML=PK.map(([k,t,c])=>'<button data-s="'+k+'" class="sw'+((H&&(H.style||''))===k?' on':'')+'"><span class="dots">'+c.map(x=>'<i style="background:'+x+'"></i>').join('')+'</span>'+t+'</button>').join('');L.appendChild(sp);sp.onclick=e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();const S=$('msty');S.value=b.dataset.s;S.dispatchEvent(new Event('change'));};
 const xb=document.createElement('div');xb.className='lkx';xb.dataset.f='furn';xb.innerHTML='<button class="go" id="refurn">Iný variant nábytku</button><button id="refurn0">Vyprázdniť</button>';L.appendChild(xb);
 const IT=[['furn','sofa','Nábytok',[]],['wx','sun','Počasie',['mwx']],['time','clock','Čas dňa',['sunh']],['wall','brush','Steny dnu',['mwall']],['fac','facade','Fasáda',['mfac','mfasada']],['floor','floor','Podlahy',['mfloor']],['roof','roof','Strecha',['roof','mroof']]];
 const d=document.createElement('div');d.id='dock3';d.setAttribute('role','toolbar');d.setAttribute('aria-label','Nastavenia 3D');d.innerHTML=IT.map(([k,ic,t])=>'<button data-k="'+k+'" title="'+t+'"><i data-i="'+ic+'"></i><span>'+t+'</span></button>').join('');V.appendChild(d);paint(d);
 const close=()=>{L.classList.remove('open','one');d.querySelectorAll('button').forEach(b=>b.classList.remove('on'));};
 d.onclick=e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();const it=IT.find(x=>x[0]===b.dataset.k);if(b.classList.contains('on')){close();return;}close();
  L.querySelectorAll('label').forEach(l=>l.classList.toggle('sel',it[3].some(id=>l.contains($(id)))));xb.classList.toggle('sel',it[0]==='furn');sp.classList.toggle('sel',it[0]==='furn');sp.querySelectorAll('button').forEach(q=>q.classList.toggle('on',q.dataset.s===((H&&H.style)||'')));L.classList.add('open','one');b.classList.add('on');};
 document.addEventListener('pointerdown',e=>{if(L.classList.contains('one')&&!L.contains(e.target)&&!d.contains(e.target))close();});
 $('refurn').onclick=()=>{try{furnish();gen(true);}catch(e){console.warn(e);}};
 $('refurn0').onclick=()=>{snap();H.furn=(H.furn||[]).filter(f=>f.level!==lvl);H.autoF=H.autoF||{};H.autoF[lvl]=1;save();gen(true);toast('Nábytok na tomto podlaží odstránený.','ok');};
 window.__dock3=1;})();
