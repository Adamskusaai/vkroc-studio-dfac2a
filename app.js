import {detectWalls} from './cv.js';
import {I,paint} from './icons.js';
paint();
const hh=()=>document.documentElement.style.setProperty('--hh',document.getElementById('hdr').offsetHeight+'px');new ResizeObserver(hh).observe(document.getElementById('hdr'));
function stairRect(st){const L=st.length||3.6,W=st.width||1,d=st.dir||0,c=Math.cos(d),s=Math.sin(d),xs=[0,L*c,-W*s,L*c-W*s].map(v=>v+st.pos[0]),zs=[0,L*s,W*c,L*s+W*c].map(v=>v+st.pos[1]);return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];}
function toast(m,k='info',ms=3800){const t=document.createElement('div');t.className='toast '+k;t.innerHTML=I[k==='ok'?'check':k==='err'||k==='warn'?'warn':'info']+'<div>'+m+'</div>';$('toasts').appendChild(t);while($('toasts').children.length>3)$('toasts').firstChild.remove();setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},ms);}
window.__toast=()=>[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | ');
const $=id=>document.getElementById(id),KEY='vkroc_studio_project';
const DEMO={name:'Ukážkový dom',units:'m',levels:[{name:'1NP',elevation:0,height:2.8}],walls:[],plot:{pts:[[-5,-6],[15,-6],[15,15],[-5,15]],fence:1}};
(()=>{const W=(a,b,o=[],t=.3)=>DEMO.walls.push({id:'w'+DEMO.walls.length,level:'1NP',start:a,end:b,thickness:t,base:0,height:2.8,openings:o});
 W([0,0],[10,0],[{type:'window',offset:2,width:1.5,sill:.9,height:1.4},{type:'window',offset:6.5,width:1.5,sill:.9,height:1.4}]);
 W([10,0],[10,8],[{type:'window',offset:3,width:2,sill:.9,height:1.4}]);W([10,8],[0,8],[{type:'door',offset:4.5,width:1,sill:0,height:2.1}]);
 W([0,8],[0,0],[{type:'window',offset:3,width:1.2,sill:.9,height:1.4}]);W([6,0],[6,5],[{type:'door',offset:2,width:.9,sill:0,height:2.05}],.15);W([6,5],[10,5],[{type:'door',offset:1.5,width:.9,sill:0,height:2.05}],.15);})();
let H,undo=[],tool='wall',bg=null,bgW=12,view={x:-1,y:-1,s:50},drag=null,PID=null,obl=false;
const IDX='vks_idx',idx=()=>{try{return JSON.parse(localStorage.getItem(IDX))||[]}catch(e){return[]}};
function thumb(h){const ws=h.walls.filter(w=>w.level===h.levels[0].name),pp=h.plot?h.plot.pts:[];const P=[...ws.flatMap(w=>[w.start,w.end]),...pp];if(!P.length)return'';const xs=P.map(p=>p[0]),zs=P.map(p=>p[1]),x0=Math.min(...xs),z0=Math.min(...zs),S=Math.max(Math.max(...xs)-x0,Math.max(...zs)-z0,1),k=100/S,f=v=>(v*k).toFixed(1);
 return '<svg viewBox="-6 -6 112 112" preserveAspectRatio="xMidYMid meet">'+(pp.length?'<path d="M'+pp.map(p=>f(p[0]-x0)+' '+f(p[1]-z0)).join('L')+'Z" fill="#E4EED9" stroke="#7a9a5a" stroke-dasharray="3 2"/>':'')+'<path d="'+ws.map(w=>'M'+f(w.start[0]-x0)+' '+f(w.start[1]-z0)+'L'+f(w.end[0]-x0)+' '+f(w.end[1]-z0)).join('')+'" stroke="#0B0B0B" stroke-width="'+Math.max(1.5,.3*k).toFixed(1)+'" stroke-linecap="square" fill="none"/></svg>';}
function save(){if(!PID)return;const L=idx().filter(p=>p.id!==PID);L.unshift({id:PID,name:H.name,date:Date.now(),th:thumb(H),nl:H.levels.length,nw:H.walls.length});$('pname').textContent=H.name;try{localStorage.setItem('vks_p_'+PID,JSON.stringify(H));localStorage.setItem(IDX,JSON.stringify(L));window.__full=0;}catch(e){window.__full=(window.__full||0)+1;if(window.__full===1)dlg('Úložisko prehliadača je plné','<p>Posledné zmeny sa nepodarilo uložiť v prehliadači. Stiahnite projekt ako súbor (Projekt → Uložiť / stiahnuť) alebo zmažte staré projekty na úvodnej obrazovke.</p>',[['OK',1,'go']]);}}
function syncUl(){const cur=H.ulv||H.levels[0].name;if(cur===lvl)return;const a=H.levels.find(l=>l.name===cur);if(a)a.ul=H.underlay||null;const b=LV();H.underlay=b.ul||null;delete b.ul;H.ulv=lvl;}
function goLvl(n){if(n===lvl)return;lvl=n;syncUl();setBg();banner();lvUI();fit();}
function setBg(){bg=null;bgW=H.underlay?H.underlay.w:12;$('imw').value=bgW;if(H.underlay){bg=new Image();bg.onload=draw;bg.src=H.underlay.src;}}
function openP(id,data){PID=id;H=data||JSON.parse(localStorage.getItem('vks_p_'+id));if(!H.levels)H.levels=JSON.parse(JSON.stringify(DEMO.levels));lvl=H.levels[0].name;syncUl();lvUI();undo=[];setBg();save();show('ed');banner();if(H.underlay&&!H.walls.length)afterImg(1);}
const newP=(name,walls=[],ul=null,plot)=>openP('p'+Date.now(),{...JSON.parse(JSON.stringify(DEMO)),name,walls,underlay:ul,plot:plot===undefined?null:plot});
function load(){route(true);}
const snap=()=>{undo.push(JSON.stringify(H));if(undo.length>80)undo.shift();};
// ---------- editor ----------
const cv=$('cv'),cx=cv.getContext('2d');
const TCH=matchMedia('(pointer:coarse)').matches;
const HINT0={wall:'Ťahaj myšou = nová stena (prichytáva sa ku koncom stien). Koliesko/2 prsty = zoom a posun.',move:'Ťahaj koniec steny (bodku) alebo celú stenu. Dvere/okno ťahaj po stene.',door:'Klikni na stenu = vložia sa dvere.',window:'Klikni na stenu = vloží sa okno.',del:'Klikni na stenu, dvere alebo okno = zmaže sa.'};
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
let RC={k:'',r:[]};
function rooms(){const ws=WL(),k=JSON.stringify(ws.map(w=>[w.start,w.end,w.thickness]));if(k===RC.k)return RC.r;RC.k=k;RC.r=[];if(ws.length<3)return RC.r;
 const c=.1;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;ws.forEach(w=>[w.start,w.end].forEach(p=>{x0=Math.min(x0,p[0]);z0=Math.min(z0,p[1]);x1=Math.max(x1,p[0]);z1=Math.max(z1,p[1]);}));x0-=.5;z0-=.5;
 const W=Math.ceil((x1-x0+.5)/c)+1,Hh=Math.ceil((z1-z0+.5)/c)+1;if(W*Hh>4e6)return RC.r;const g=new Int32Array(W*Hh);
 ws.forEach(w=>{const G=geo(w),t=Math.max(w.thickness/2,.06),n=Math.ceil(G.L/(c/2))+1;for(let i=0;i<=n;i++){const s=G.L*i/n;for(let q=-t;q<=t+1e-9;q+=c/2){const x=G.x0+G.u[0]*s-G.u[1]*q,z=G.z0+G.u[1]*s+G.u[0]*q,ix=Math.round((x-x0)/c),iz=Math.round((z-z0)/c);if(ix>=0&&iz>=0&&ix<W&&iz<Hh)g[iz*W+ix]=-1;}}});
 const fl=(s,id)=>{const st=[s];g[s]=id;let n=0,sx=0,sz=0,edge=false;while(st.length){const i=st.pop(),x=i%W,z=(i/W)|0;n++;sx+=x;sz+=z;if(!x||!z||x===W-1||z===Hh-1)edge=true;for(const j of[x>0?i-1:-1,x<W-1?i+1:-1,z>0?i-W:-1,z<Hh-1?i+W:-1])if(j>=0&&!g[j]){g[j]=id;st.push(j);}}return{n,sx,sz,edge};};
 let id=1;for(let i=0;i<g.length;i++)if(!g[i]){const r=fl(i,++id);if(!r.edge&&r.n*c*c>=1.5){let cx_=r.sx/r.n,cz=r.sz/r.n;RC.r.push({a:r.n*c*c,p:[x0+cx_*c,z0+cz*c]});}}
 return RC.r;}
function WC(){const ws=WL();let x=0,z=0;ws.forEach(w=>{x+=w.start[0]+w.end[0];z+=w.start[1]+w.end[1];});const n=ws.length*2||1;return[x/n,z/n];}
let WLB=[];
function draw(){WLB=[];cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#FAF9F6';cx.fillRect(0,0,cv.width,cv.height);
 if(bg){const P=toS([0,0]),w=bgW*view.s;cx.globalAlpha=.6;cx.drawImage(bg,P[0],P[1],w,w*bg.height/bg.width);cx.globalAlpha=1;}
 cx.lineWidth=1;const gs=i=>cx.strokeStyle=i%5?'#EEEBE5':'#E0DBD2';const x0=Math.floor(view.x),y0=Math.floor(view.y);for(let i=x0;i<x0+cv.width/view.s+1;i++){gs(i);const a=toS([i,0])[0];cx.beginPath();cx.moveTo(a,0);cx.lineTo(a,cv.height);cx.stroke();}
 for(let i=y0;i<y0+cv.height/view.s+1;i++){gs(i);const a=toS([0,i])[1];cx.beginPath();cx.moveTo(0,a);cx.lineTo(cv.width,a);cx.stroke();}
 if(H.plot&&H.plot.pts.length>2){cx.beginPath();H.plot.pts.forEach((p,i)=>{const P=toS(p);i?cx.lineTo(...P):cx.moveTo(...P);});cx.closePath();cx.fillStyle='rgba(122,154,90,.13)';cx.fill();cx.setLineDash([8*devicePixelRatio,6*devicePixelRatio]);cx.strokeStyle=H.plot.fence?'#5f7f42':'#7a9a5a';cx.lineWidth=(H.plot.fence?2.5:1.5)*devicePixelRatio;cx.stroke();cx.setLineDash([]);
  const pp=H.plot.pts;cx.font=`500 ${11*devicePixelRatio}px Inter,system-ui`;cx.fillStyle='#5f7f42';cx.textAlign='center';pp.forEach((p,i)=>{const q=pp[(i+1)%pp.length],m=toS([(p[0]+q[0])/2,(p[1]+q[1])/2]);cx.fillText(Math.hypot(q[0]-p[0],q[1]-p[1]).toFixed(1)+' m',m[0],m[1]-6*devicePixelRatio);});}
 H.walls.filter(w=>w.level!==lvl).forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='rgba(11,11,11,.12)';quad(w,0,g.L,-t,t);});
 (H.stairs||[]).filter(st=>st.level===lvl||H.levels[H.levels.indexOf(LV())-1]?.name===st.level).forEach(st=>{const r=stairRect(st),a=toS([r[0],r[1]]),b=toS([r[2],r[3]]);cx.globalAlpha=st.level===lvl?1:.35;cx.fillStyle='#EADFCF';cx.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);cx.strokeStyle='#B08D64';cx.lineWidth=1.5*devicePixelRatio;cx.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);const d=st.dir||0,c=Math.cos(d),sn=Math.sin(d),L=st.length||3.6,W=st.width||1;for(let k=1;k<12;k++){const f=k/12,p1=toS([st.pos[0]+c*L*f,st.pos[1]+sn*L*f]),p2=toS([st.pos[0]+c*L*f-sn*W,st.pos[1]+sn*L*f+c*W]);cx.beginPath();cx.moveTo(...p1);cx.lineTo(...p2);cx.stroke();}const m0=toS([st.pos[0]-sn*W/2+c*.3,st.pos[1]+c*W/2+sn*.3]),m1=toS([st.pos[0]-sn*W/2+c*(L-.3),st.pos[1]+c*W/2+sn*(L-.3)]);cx.strokeStyle='#E2552D';cx.lineWidth=2*devicePixelRatio;cx.beginPath();cx.moveTo(...m0);cx.lineTo(...m1);cx.stroke();cx.fillStyle='#E2552D';cx.beginPath();cx.arc(...m1,4*devicePixelRatio,0,7);cx.fill();cx.globalAlpha=1;});
 WL().forEach(w=>{const g=geo(w),t=w.thickness/2;cx.fillStyle='#1F1F1F';quad(w,0,g.L,-t,t);
  (w.openings||[]).forEach(o=>{cx.fillStyle=o.type==='door'?'#E2552D':'#8EC3E6';quad(w,o.offset,o.offset+o.width,-t-.03,t+.03);});
  cx.fillStyle='#6B6B6B';cx.font=`500 ${11.5*devicePixelRatio}px Inter,system-ui`;const mx=g.x0+g.u[0]*g.L/2,mz=g.z0+g.u[1]*g.L/2,C=WC(),sg=((mx-g.u[1]-C[0])**2+(mz+g.u[0]-C[1])**2)>((mx+g.u[1]-C[0])**2+(mz-g.u[0]-C[1])**2)?1:-1,M0=toS([mx,mz]),off=(t*view.s+(Math.abs(g.u[1])>.7?cx.measureText(g.L.toFixed(2)+' m').width/2+8*devicePixelRatio:14*devicePixelRatio))*sg,m=[M0[0]-g.u[1]*off,M0[1]+g.u[0]*off+4*devicePixelRatio];WLB.push(m);cx.textAlign='center';cx.fillText(g.L.toFixed(2)+' m',...m);
  if(tool==='move')['start','end'].forEach(k=>{const P=toS(w[k]);cx.fillStyle='#fff';cx.strokeStyle='#E2552D';cx.lineWidth=2;cx.beginPath();cx.arc(...P,6*devicePixelRatio,0,7);cx.fill();cx.stroke();});});
 calPts.forEach((q,i)=>{const P=toS(q);cx.fillStyle='#E2552D';cx.beginPath();cx.arc(...P,7*devicePixelRatio,0,7);cx.fill();if(i)( cx.strokeStyle='#E2552D',cx.lineWidth=3,cx.beginPath(),cx.moveTo(...toS(calPts[0])),cx.lineTo(...P),cx.stroke());});
 if(drag&&drag.k==='new'){const t=+$('th').value/100*view.s;cx.strokeStyle='rgba(226,85,45,.85)';cx.lineWidth=Math.max(3,t);cx.lineCap='square';cx.beginPath();cx.moveTo(...toS(drag.a));cx.lineTo(...toS(drag.b));cx.stroke();cx.lineCap='butt';const L=Math.hypot(drag.b[0]-drag.a[0],drag.b[1]-drag.a[1]),P=toS(drag.b);cx.font=`600 ${12*devicePixelRatio}px Inter,system-ui`;const tx=L.toFixed(2)+' m',tw=cx.measureText(tx).width+14*devicePixelRatio;cx.fillStyle='#0B0B0B';cx.fillRect(P[0]+10*devicePixelRatio,P[1]-26*devicePixelRatio,tw,20*devicePixelRatio);cx.fillStyle='#fff';cx.textAlign='left';cx.fillText(tx,P[0]+17*devicePixelRatio,P[1]-12*devicePixelRatio);}
 const RS=rooms();let tot=0;RS.forEach(r=>{tot+=r.a;const P=toS(r.p),d=devicePixelRatio;if(WLB.some(q=>Math.abs(q[0]-P[0])<60*d&&Math.abs(q[1]-P[1]-4*d)<18*d))P[1]+=22*d;cx.font=`700 ${13*d}px Archivo,Inter,system-ui`;cx.textAlign='center';cx.fillStyle='rgba(11,11,11,.78)';cx.fillText(r.a.toFixed(1).replace('.',',')+' m²',P[0],P[1]+4*d);});
 const ta=$('area');if(ta){ta.hidden=!RS.length;ta.textContent='Plocha '+lvl+': '+tot.toFixed(1).replace('.',',')+' m² · '+RS.length+' miest.';}
 $('empE').hidden=!!(H.walls.length||bg||H.plot);}
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
 else if(tool==='door'||tool==='window'){const h=hitWall(p);if(!h)return;const d=tool==='door',wd=d?.9:1.2,g=geo(h.w);if(g.L<wd+.1){const m='Stena je príliš krátka na '+(d?'dvere (min. 1 m).':'okno (min. 1,3 m).');$('hint').textContent=m;toast(m,'warn');return;}snap();
  (h.w.openings=h.w.openings||[]).push(d?{type:'door',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:0,height:2.05}:{type:'window',offset:Math.max(.05,Math.min(g.L-wd-.05,r2(h.s-wd/2))),width:wd,sill:.9,height:1.4});save();draw();}
 else if(tool==='stair'){const ex=(H.stairs||[]).find(st=>{const r=stairRect(st);return st.level===lvl&&p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3];});if(ex){snap();ex.dir=((ex.dir||0)+Math.PI/2)%(2*Math.PI);if(ex.dir<1e-6)ex.dir=0;save();draw();toast('Schody otočené o 90°.','ok',1800);return;}snap();(H.stairs=H.stairs||[]).push({level:lvl,pos:[r2(p[0]),r2(p[1])],dir:0,width:1,length:3.6});save();draw();}
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
$('undo').onclick=()=>{if(undo.length){H=JSON.parse(undo.pop());if(!H.levels.find(l=>l.name===lvl))lvl=H.levels[0].name;syncUl();const u=H.underlay;if((u&&u.src)!==(bg&&bg.src))setBg();else{bgW=u?u.w:bgW;$('imw').value=bgW;}lvUI();banner();save();draw();}};
addEventListener('keydown',e=>{if(e.target.tagName!=='INPUT'&&(e.ctrlKey||e.metaKey)&&e.key==='z')$('undo').onclick();});
$('th').oninput=()=>{$('thv').textContent=$('th').value+' cm';};
$('th').onchange=()=>{snap();const t=+$('th').value/100;H.walls.forEach(w=>{if(w.thickness>=.2||t<.2)w.thickness=t;});save();draw();};
$('imw').oninput=()=>{bgW=+$('imw').value||12;if(H.underlay){H.underlay.w=bgW;save();}draw();};
$('obl').onclick=()=>{obl=!obl;$('obl').innerHTML=I.skew+'Šikmé: '+(obl?'ZAP':'VYP');$('obl').classList.toggle('on',obl);};
let dlgRes=null;
function dlg(title,body,btns,o={}){if(dlgRes)dlgRes(null);return new Promise(res=>{dlgRes=res;$('ovb').innerHTML=(o.step?'<div class="steps">'+Array.from({length:o.step[1]},(_,i)=>'<i class="'+(i<=o.step[0]?'on':'')+'"></i>').join('')+'</div>':'')+'<h3>'+title+'</h3>'+(body||'')+'<div class="bt"></div>';const bs=$('ovb').querySelector('.bt');
 btns.forEach(([t,v,c,ic])=>{const b=document.createElement('button');b.innerHTML=(ic?I[ic]:'')+esc(t);if(c)b.className=c;b.onclick=()=>{const f={};$('ovb').querySelectorAll('input').forEach(i=>f[i.name||'_']=i.type==='checkbox'?i.checked:i.value.trim());const i=$('ovb').querySelector('input[type=text],input:not([type])');dlgRes=null;$('ov').classList.remove('on');res(v===null?null:{v,name:i&&i.value.trim(),f});};bs.appendChild(b);});
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
function setTool(t){const b=document.querySelector('[data-t='+t+']');tool=t;document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===b));$('hint').textContent=HINT[t];calPts=[];draw();}
$('cal').onclick=()=>{if(!H.underlay){toast('Najprv nahrajte výkres pre toto podlažie.','warn');return;}setTool('cal');};
async function calDone(){const d=Math.hypot(calPts[1][0]-calPts[0][0],calPts[1][1]-calPts[0][1]);
 const r=await dlg('Aká dlhá je označená úsečka?','<input type="text" inputmode="decimal" placeholder="napr. 8,5"> <p class="note">Zadajte v metroch.</p>',[['Zrušiť',null],['Nastaviť mierku',1,'go']]);
 const v=r&&parseFloat((r.name||'').replace(',','.'));setTool('wall');if(!v||!d)return;const f=v/d;snap();
 bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;banner();$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);w.thickness=Math.max(.1,Math.round(w.thickness*f*20)/20);(w.openings||[]).forEach(o=>{o.offset*=f;o.width=Math.min(o.width,o.width*f>.5?o.width:o.width);});});save();fit();
 if(!H.walls.length)recog(1);}
function busy(t){let b=$('busy');if(!t){if(b)b.remove();return;}if(!b){b=document.createElement('div');b.id='busy';b.className='busy';document.body.appendChild(b);}b.innerHTML='<div><span class="spin"></span><b>'+t+'</b></div>';}
function banner(){$('ban').hidden=!(H.underlay&&H.underlay.guess&&!H.underlay.cal&&H.walls.length);}
let recBusy=0;
async function recog(quiet,nosnap){if(!bg||!bg.complete||!bg.width){if(!quiet)toast('Najprv nahrajte výkres pre toto podlažie.','warn');return;}if(recBusy)return;recBusy=1;busy('Rozpoznávam steny…');await new Promise(r=>setTimeout(r,40));
 let R=null;const man=H.walls.some(w=>!w.auto);try{R=detectWalls(bg,{sens:+$('sens').value,mW:H.underlay.cal||man?bgW:null,rect:H.underlay.rect||man,site:H.underlay.site&&!man,w:bgW});if(man)R.guess=false;}catch(e){console.warn(e);}
 const ws=R?R.walls:[];busy(0);recBusy=0;if(!nosnap)snap();const lv=LV();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lv.name));
 if(R&&!H.underlay.rect&&!man){H.underlay={src:R.mode==='plan'?R.canvas.toDataURL('image/jpeg',.85):H.underlay.src,w:R.w,rect:1,guess:R.guess,site:R.mode==='site'?1:0};}else if(R&&R.guess&&!H.underlay.cal){H.underlay.w=R.w;H.underlay.guess=true;}
 H.walls=H.walls.concat(ws.map((w,i)=>({id:'a'+Date.now()+i,auto:1,level:lv.name,start:w.start,end:w.end,thickness:w.thickness,base:0,height:lv.height,openings:[]})));
 save();const u=H.underlay;bgW=u.w;$('imw').value=bgW;if(!bg.src.endsWith(u.src.slice(-40))){bg=new Image();bg.onload=()=>{fit();};bg.src=u.src;}else fit();banner();
 const md=R?R.mode:'none';window.__mode=md;
 const hm=md==='site'?'Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokreslite alebo nahrajte pôdorys.':ws.length?'Rozpoznaných '+ws.length+' stien. Ak niečo chýba alebo prebýva, posuňte „Citlivosť“. Opravy: Posunúť, Zmazať, Späť.':'Na obrázku sme nenašli steny ani obrys domu. Výkres zostáva ako podklad – steny nakreslite ručne alebo nahrajte pôdorys.';$('hint').textContent=hm;if(!quiet||md!=='plan')toast(hm.split('. ')[0]+'.',ws.length?'ok':'warn');
 if(md==='site'&&!H.plot&&ws.length){const xs=ws.flatMap(w=>[w.start[0],w.end[0]]),zs=ws.flatMap(w=>[w.start[1],w.end[1]]);H.plot=plotAround(Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));save();fit();}
 if(md==='site'&&!quiet2.v&&!H.underlay.cal&&!man){quiet2.v=1;dlg('Situácia pozemku','<p>Toto vyzerá ako situácia pozemku – nakreslil som obvod domu. Vnútorné steny dokresli alebo nahraj pôdorys.</p><p>Aká dlhá je dlhšia strana domu (v metroch)? Nájdete ju na kóte, napr. „14400“ = 14,4 m.</p><input type="text" inputmode="decimal" placeholder="napr. 14,4">',[['Neskôr',null],['Nastaviť','ok','go']]).then(r=>{quiet2.v=0;const v=parseFloat(((r&&r.name)||'').replace(',','.'));if(r&&v>2&&v<100)scaleBy(v/(R.longPx/R.ppm));});}
 window.__rec=ws.length;}
const quiet2={v:0};
function scaleBy(f){snap();bgW=Math.round(bgW*f*100)/100;H.underlay.w=bgW;H.underlay.cal=1;$('imw').value=bgW;H.walls.forEach(w=>{w.start=w.start.map(c=>Math.round(c*f*100)/100);w.end=w.end.map(c=>Math.round(c*f*100)/100);});save();fit();banner();}
$('rec').onclick=()=>recog();$('recx').onclick=()=>{const n=H.walls.filter(w=>w.auto&&w.level===lvl).length;if(!n)return;snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));save();draw();$('hint').textContent='Rozpoznané steny vymazané ('+n+'). Späť ich vráti.';toast('Vymazaných '+n+' rozpoznaných stien.','ok');};let sT;$('sens').oninput=()=>{clearTimeout(sT);sT=setTimeout(()=>H.underlay&&recog(1),350);};$('banc').onclick=()=>$('cal').click();
function afterImg(ns){const go=()=>{fit();recog(1,ns===2);};bg.complete&&bg.width?go():bg.onload=()=>{draw();go();};}
const pickImg=m=>{imgMode=m;$('img').value='';$('img').click();};
$('upl').onclick=()=>pickImg('ask');
$('img').onchange=async e=>{const f=e.target.files[0];if(!f)return;const src=await readImg(f);if(!src)return;let m=imgMode;
 if(m==='ask'&&H.walls.length){const r=await dlg('Nahrali ste výkres','<p>Tento projekt už má nakreslené steny. Čo chcete urobiť?</p>',[['Zrušiť',null],['Vymeniť podklad v tomto projekte','swap'],['Nový projekt z tohto výkresu','new','go']]);if(!r||!r.v)return;m=r.v;}
 if(m==='new'||m==='site'){const n=await askName(f.name.replace(/\.[^.]+$/,''));if(n){newP(n,[],{src,w:20,site:m==='site'?1:0});afterImg();}}
 else{snap();H.walls=H.walls.filter(w=>!(w.auto&&w.level===lvl));H.underlay={src,w:20};H.ulv=lvl;setBg();save();afterImg(2);}};
async function act(m){$('dd').classList.remove('on');if(m==='png'){exportPng();return;}
 if(m==='new')wizNew();
 if(m==='newimg')pickImg('new');if(m==='open')$('ld').click();if(m==='mine')show('home');
 if(m==='demo')newP('Ukážkový dom',JSON.parse(JSON.stringify(DEMO.walls)),null,JSON.parse(JSON.stringify(DEMO.plot)));
 if(m==='dl'){save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(H,null,1)],{type:'application/json'}));a.download=(H.name||'dom')+'.json';a.click();toast('Projekt stiahnutý.','ok');}}
$('menu').onclick=e=>{e.stopPropagation();$('dd').classList.toggle('on');};document.addEventListener('click',()=>$('dd').classList.remove('on'));
document.querySelectorAll('#dd a').forEach(a=>a.onclick=()=>act(a.dataset.m));
$('logo').onclick=()=>show('home');$('hNew').onclick=()=>act('new');$('hImg').onclick=()=>act('newimg');$('hDemo').onclick=()=>act('demo');$('hSite').onclick=()=>pickImg('site');$('hMulti').onclick=()=>{$('imgs').value='';$('imgs').click();};$('eRect').onclick=()=>houseDlg();$('eImg').onclick=()=>pickImg('ask');$('e3go').onclick=()=>show('ed');$('plotb').onclick=()=>plotDlg();$('pname').onclick=rename;
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
let V=null,roof='flat';const v3=async()=>{if(!V){$('sk3').hidden=false;V=await import('./v3.js');}return V;};
function wUI(v){$('walk').innerHTML=v?I.out+'<span>Pohľad zvonka</span>':I.walk+'<span>Prechádzka</span>';$('walk').classList.toggle('on',v);$('st').textContent=v?(TCH?'Joystick vľavo dole = chôdza, ťahajte prstom = rozhliadanie.':'W A S D / šípky = chôdza, ťahajte myšou = rozhliadanie, Shift = rýchlejšie.'):(TCH?'Ťahajte = otáčanie, 2 prsty = zoom.':'Ťahajte = otáčanie, koliesko = zoom.');}
let genN=0;async function gen(anim){const n=++genN;$('sk3').hidden=false;$('emp3').hidden=true;try{const m=await v3();if(n!==genN)return;m.setRoof(roof);const ok=m.gen(H,anim);$('emp3').hidden=ok;if(ok)wUI(m.isWalk());const vb=$('VRButton');if(vb)vb.style.display=/NOT|ONLY/i.test(vb.textContent)?'none':'';}catch(e){console.warn(e);toast('3D sa nepodarilo načítať. Skontrolujte pripojenie.','err');}finally{if(n===genN)$('sk3').hidden=true;}}
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};
$('snap3').onclick=async()=>{const m=await v3();const u=m.snap&&m.snap();if(u){const b=await(await fetch(u)).blob();dl(b,(H.name||'dom')+'_3d.png');toast('3D snímka uložená (PNG).','ok');}};
$('glb').onclick=async()=>{const m=await v3();try{const b=await m.glb();if(b){dl(b,(H.name||'dom')+'.glb');toast('3D model stiahnutý (GLB).','ok');}}catch(e){toast('Export zlyhal.','err');}};
async function packH(){const j={...H,underlay:undefined,ulv:undefined,levels:H.levels.map(l=>({...l,ul:undefined})),roof};const st=new Blob([JSON.stringify(j)]).stream().pipeThrough(new CompressionStream('gzip'));const b=new Uint8Array(await new Response(st).arrayBuffer());let t='';b.forEach(c=>t+=String.fromCharCode(c));return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function unpackH(t){const b=Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
$('share').onclick=async()=>{const url=location.href.split('#')[0]+'#t='+await packH();
 const r=await dlg('Zdieľať prehliadku','<p>Odkaz otvorí iba 3D prehliadku (bez editora). Pošlite ho klientovi.</p><input type="text" readonly value="'+esc(url)+'">',[['Zavrieť',null],['Stiahnuť ako súbor','f'],['Kopírovať odkaz','c','go']]);
 if(r&&r.v==='c'){try{await navigator.clipboard.writeText(url);toast('Odkaz skopírovaný.','ok');}catch(e){toast('Kopírovanie zlyhalo – označte odkaz ručne.','warn');}}
 if(r&&r.v==='f')dl(new Blob(['<!doctype html><meta charset="utf-8"><title>'+esc(H.name)+' – prehliadka</title><meta http-equiv="refresh" content="0;url='+esc(url)+'"><a href="'+esc(url)+'">Otvoriť prehliadku</a>'],{type:'text/html'}),(H.name||'dom')+' - prehliadka.html');};
$('roof').onchange=e=>{roof=e.target.value;if(H)H.roof=roof;gen(false);};
function show(s,nopush){document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.s===s));document.querySelectorAll('.scr').forEach(x=>x.classList.toggle('on',x.id===s));
 $('tbed').classList.toggle('on',s==='ed');if(s==='home'){home();}$('tbvw').classList.toggle('on',s==='vw');document.querySelector('.seg').style.visibility=s==='home'?'hidden':'';$('pname').style.display=s==='home'?'none':'';const vb=$('VRButton');if(vb)vb.style.display=s==='vw'&&!/NOT|ONLY/i.test(vb.textContent)?'':'none';if(s==='vw')gen(true);else if(s==='ed')requestAnimationFrame(fit);
 if(H&&s!=='home')$('pname').textContent=H.name;
 if(!nopush&&!TH){const h=s==='home'?'':'#p='+PID+(s==='vw'?'&v=3d':'');if(location.hash!==h)history.pushState(null,'',h||location.pathname);}}
function route(){const m=location.hash.match(/^#p=([^&]+)(&v=3d)?/);if(m&&localStorage.getItem('vks_p_'+m[1])){try{if(PID!==m[1]||!H){PID=m[1];H=JSON.parse(localStorage.getItem('vks_p_'+m[1]));if(!H.levels)H.levels=JSON.parse(JSON.stringify(DEMO.levels));lvl=H.levels[0].name;syncUl();lvUI();undo=[];setBg();banner();}show(m[2]?'vw':'ed',true);return;}catch(e){}}
 show('home',true);}
addEventListener('popstate',()=>{if($('ov').classList.contains('on'))$('ov').onclick({target:$('ov')});route();});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.s));$('gen').onclick=()=>show('vw');
$('walk').onclick=async()=>{const m=await v3();m.setWalk(!m.isWalk());wUI(m.isWalk());};
const TH=location.hash.match(/^#t=(.+)/);
if(TH){unpackH(TH[1]).then(j=>{H=j;PID=null;lvl=H.levels[0].name;if(j.roof){roof=j.roof;$('roof').value=roof;}document.body.classList.add('viewonly');show('vw',true);window.__ok=true;}).catch(()=>{toast('Odkaz na prehliadku je poškodený.','err',6000);history.replaceState(null,'',location.pathname);load();window.__ok=true;});}
else{load();window.__ok=true;}
window.__dbg={get H(){return H},toS:p=>toS(p),get lvl(){return lvl},get undo(){return undo.length}};

{const h=document.getElementById('hint');let t;if(h&&matchMedia('(max-width:760px)').matches)new MutationObserver(()=>{h.style.opacity=1;clearTimeout(t);t=setTimeout(()=>h.style.opacity=0,5000);}).observe(h,{childList:true,characterData:true,subtree:true});}

{const d=document.documentElement;if(!navigator.xr)d.classList.add('novr');else navigator.xr.isSessionSupported('immersive-vr').then(o=>{if(!o)d.classList.add('novr')},()=>d.classList.add('novr'));}

cv.addEventListener('dblclick',async e=>{if(tool!=='move')return;const h=hitWall(toW(e));if(!h)return;const g=geo(h.w),r=await dlg('Dĺžka steny','<label>Dĺžka (m)<input type="number" name="L" step="0.01" value="'+g.L.toFixed(2)+'"></label>',[['Zrušiť',0],['Uložiť',1,'go','check']]);
 const L=r&&r.v?parseFloat(String(r.f.L).replace(',','.')):0;if(!(L>.1))return;snap();const o=[...h.w.end];h.w.end=[+(g.x0+g.u[0]*L).toFixed(3),+(g.z0+g.u[1]*L).toFixed(3)];WL().forEach(w=>{if(w===h.w)return;['start','end'].forEach(k=>{if(Math.hypot(w[k][0]-o[0],w[k][1]-o[1])<.02)w[k]=[...h.w.end];});});save();draw();toast('Dĺžka steny: '+L.toFixed(2)+' m','ok');});
function exportPng(){fit();draw();const d=devicePixelRatio,pad=70*d,o=document.createElement('canvas');o.width=cv.width;o.height=cv.height+pad;const c=o.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,o.width,o.height);c.drawImage(cv,0,pad);
 c.fillStyle='#0B0B0B';c.font=`800 ${22*d}px Archivo,Inter,sans-serif`;c.textAlign='left';c.fillText((H.name||'Pôdorys')+' — '+lvl,20*d,32*d);c.font=`500 ${13*d}px Inter,sans-serif`;c.fillStyle='#6B6B6B';c.fillText(($('area').textContent||'')+'  ·  Vkroč Štúdio',20*d,54*d);c.fillStyle='#E2552D';c.fillRect(0,pad-3*d,o.width,3*d);
 o.toBlob(b=>{dl(b,(H.name||'podorys')+'_'+lvl+'.png');toast('Pôdorys exportovaný (PNG).','ok');});}
window.__exportPng=exportPng;
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||$('ov').classList.contains('on')||!$('ed').classList.contains('on'))return;
 const m={w:'wall',m:'move',d:'door',o:'window',s:'stair',x:'del',Delete:'del'}[e.key];if(m){setTool(m);return;}
 if(e.key==='f'){fit();draw();}else if(e.key==='3')$('gen').click();else if(e.key==='?')toast('Skratky: W stena · M posun · D dvere · O okno · S schody · X mazať · F prispôsobiť · 3 = 3D · Ctrl+Z späť','info',6000);});
