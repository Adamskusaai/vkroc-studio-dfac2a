// layout.js (prem8) - rule-based furniture placement, furnishing validator and door/window sanity fixes.
// Pure module: works on the room grid built by app.js rooms() (R={g,W,Hh,x0,z0,c}, g: room id >1, -1 wall, 0/1 outside)
// Furniture convention: r=0 back to z0 (faces +z), 1 back to x0 (faces +x), 2 back to z1 (faces -z), 3 back to x1 (faces -x).
// footprints as built in 3D (v3.js FUR) so plan, validator and 3D agree; rugs carry their own size
export const DIM3={wshelf:[.8,.25],tvw:[1.2,.1],hooks:[.6,.1],bed:[1.6,2.05],bed1:[.9,2],bunk:[.9,2],sofa:[2.4,1],armch:[.85,.85],table:[1.8,1],ctable:[1.1,.7],desk:[1.2,.6],tv:[1.8,.42],ward:[1.8,.62],kitch:[2.8,.62],fridge:[.65,.7],bath:[1.7,.75],shower:[.9,.9],sink:[.6,.45],wc:[.4,.65],shelf:[.9,.35],plant:[.45,.45],rug:[2.4,1.7],runner:[2.4,.7],lamp:[.35,.35],chair:[.45,.5],art:[.9,.04],curtain:[1.4,.08],shoe:[1,.4],bench:[1.2,.4],nstand:[.45,.4],dresser:[1.2,.5],sideb:[1.6,.45],side:[.45,.45],stool:[.38,.38],mirror:[.7,.04],towel:[.55,.12],coat:[.5,.5],toy:[.55,.4],otable:[1.4,.8],lounge:[1.6,.85],washer:[.6,.6]};
export const FRONT={washer:.7,sofa:.45,bed:.6,bed1:.6,bunk:.6,ward:.7,dresser:.6,sideb:.6,kitch:.9,fridge:.7,wc:.6,sink:.6,bath:.6,shower:.6,desk:.6,shelf:.5,shoe:.5,coat:.5,bench:.5,armch:.4,toy:.4,lounge:.5};
export const TALL=new Set(['washer','ward','shelf','fridge','kitch','coat','mirror','tv','bunk','towel','art']);
const SEAT=new Set(['chair','stool']),SOFT=new Set(['rug','runner','art','curtain','pendant']),FREE=new Set(['table','ctable','rug','runner','otable','lounge','sofa','armch']);
const NOACC=new Set(['wshelf','plant','lamp','rug','runner','towel','mirror','nstand','chair','stool','toy','side','tv','ctable','curtain','art','pendant']);
const CORNER={washer:1,bath:2,shower:2,ward:1,fridge:1,shelf:.5,kitch:1,plant:.8,lamp:.6,coat:.6,toy:.4,wc:.5,dresser:.3};
const DECOR=new Set(['plant','lamp','rug','toy','sideb','dresser','armch','shelf','runner','bench','coat','towel']);
const FV=[[0,1],[1,0],[0,-1],[-1,0]];
export const TPL={
 'Obývačka':[['seating!','reading','sideb','shelf','plant','plant','art','curtains'],['sofa!','tv!','ctable','armch','plant','lamp'],['sofa!','tv','armch','plant']],
 'Obývačka s kuchyňou':[['kitch!','fridge!','seating!','table','chair4','reading','sideb','shelf','plant','plant','art','art','curtains'],['kitch!','fridge!','sofa!','tv','ctable','table','chair4','plant','armch'],['kitch!','sofa','tv','plant']],
 'Kuchyňa':[['kitch!','fridge!','table','chair4','shelf','plant'],['kitch!','fridge!','plant'],['kitch!','plant']],
 'Jedáleň':[['table!','chair4','sideb','plant','lamp'],['table!','chair4','plant']],
 'Spálňa':[['bed!','nstand2','ward!','dresser','plant','lamp','rug','art','curtains'],['bed!','nstand2','ward','plant'],['bed1!','nstand','ward','plant']],
 'Detská izba B':[['desk!','chair1','bunk!','dresser','shelf','toy','rug','art','curtains'],['bunk!','desk','chair1','toy','shelf','curtains'],['bed1!','toy','shelf','curtains']],
 'Detská izba':[['bed1!','desk!','chair1','ward!','toy','shelf','rug','art','curtains'],['bed1!','desk','chair1','ward','toy'],['bed1!','ward','toy']],
 'Izba':[['bed1!','ward!','desk','chair1','plant','rug'],['bed1!','ward','plant']],
 'Pracovňa':[['desk!','chair1','shelf','shelf','armch','plant'],['desk!','chair1','shelf','plant']],
 'Kúpeľňa':[['bath!','sink!','wc?','towel','plant'],['shower!','sink!','wc?','towel','plant'],['shower~!','sink~!','wc?','towel','plant'],['shower!','sink','wc?','towel'],['sink!','towel']],
 'WC':[['wc!','sink','towel'],['wc!','towel']],
 'Chodba':[['shoe','coat','bench','mirror','plant','runner'],['shoe','mirror','plant'],['plant','mirror']],
 'Predsieň':[['shoe!','coat','bench','mirror','plant','runner'],['shoe','mirror','plant'],['plant','mirror']],
 'Šatník':[['ward!','ward','shelf','mirror'],['shelf!','mirror']],'Špajza':[['shelf!','shelf','shelf']],'Komora':[['washer','shelf!','shelf']],
 'Technická miestnosť':[['washer!','shelf','shelf']],'Garáž':[['shelf!','shelf']],'Terasa':[['otable','lounge','plant']]};
export const tplKey=(typ,alt)=>{const b=(typ||'Izba').replace(/ \d+$/,'');if(alt&&/^Detsk/.test(b)&&TPL['Detská izba B'])return 'Detská izba B';if(TPL[b])return b;const K=Object.keys(TPL).sort((x,y)=>y.length-x.length);return K.find(k=>b.toLowerCase().startsWith(k.toLowerCase()))||K.find(k=>b.toLowerCase().startsWith(k.toLowerCase().slice(0,5)))||'Izba';};
// ---------- geometry ----------
const ov=(a,b,e=0)=>a[0]<b[2]-e&&b[0]<a[2]-e&&a[1]<b[3]-e&&b[1]<a[3]-e;
const rP=q=>[[q[0],q[1]],[q[2],q[1]],[q[2],q[3]],[q[0],q[3]]];
// ONE door clear-zone definition, used by the layout and by the validator (both read G.doorZ):
// swing side = leaf width + 10 cm (90-130 cm), other side 80 cm (60 cm in rooms under 4.5 m2), 10 cm past each jamb
export const doorZoneDepth=(o,area)=>o.type==='door'&&o.swingIn?Math.min(1.3,Math.max(.9,o.s1-o.s0+.1)):(area<4.5?.6:.8);
export function doorZones(doors,area){return doors.map(o=>opPoly(o,o.s0-.1,o.s1+.1,0,o.t/2+doorZoneDepth(o,area)));}
function polyOv(P,Q,e=.005){for(const S of[P,Q])for(let i=0;i<S.length;i++){const a=S[i],b=S[(i+1)%S.length],ax=-(b[1]-a[1]),az=b[0]-a[0],L=Math.hypot(ax,az)||1;const nx=ax/L,nz=az/L;let p0=1e9,p1=-1e9,q0=1e9,q1=-1e9;for(const p of P){const v=p[0]*nx+p[1]*nz;p0=Math.min(p0,v);p1=Math.max(p1,v);}for(const p of Q){const v=p[0]*nx+p[1]*nz;q0=Math.min(q0,v);q1=Math.max(q1,v);}if(p1-e<=q0||q1-e<=p0)return false;}return true;}
export function rectOf(t,x,z,r,dims){const[fw,fd]=dims(t);const w=r%2?fd:fw,d=r%2?fw:fd;return[x-w/2,z-d/2,x+w/2,z+d/2];}
const frontR=(q,r,D)=>r===0?[q[0],q[3],q[2],q[3]+D]:r===1?[q[2],q[1],q[2]+D,q[3]]:r===2?[q[0],q[1]-D,q[2],q[1]]:[q[0]-D,q[1],q[0],q[3]];
const backR=(q,r,a,b)=>r===0?[q[0],q[1]-b,q[2],q[1]-a]:r===1?[q[0]-b,q[1],q[0]-a,q[3]]:r===2?[q[0],q[3]+a,q[2],q[3]+b]:[q[2]+a,q[1],q[2]+b,q[3]];
const endsR=(q,r,a,b)=>r%2===0?[[q[0]-b,q[1],q[0]-a,q[3]],[q[2]+a,q[1],q[2]+b,q[3]]]:[[q[0],q[1]-b,q[2],q[1]-a],[q[0],q[3]+a,q[2],q[3]+b]];
// bed side strips (along the length), starting `from` metres away from the headboard
const sidesR=(q,r,D,from)=>r===0?[[q[0]-D,q[1]+from,q[0],q[3]],[q[2],q[1]+from,q[2]+D,q[3]]]:r===2?[[q[0]-D,q[1],q[0],q[3]-from],[q[2],q[1],q[2]+D,q[3]-from]]:r===1?[[q[0]+from,q[1]-D,q[2],q[1]],[q[0]+from,q[3],q[2],q[3]+D]]:[[q[0],q[1]-D,q[2]-from,q[1]],[q[0],q[3],q[2]-from,q[3]+D]];
function opPoly(o,a0,a1,d0,d1){const p=o.p0,u=o.u,n=o.n,P=(s,d)=>[p[0]+u[0]*s+n[0]*d,p[1]+u[1]*s+n[1]*d];return[P(a0,d0),P(a1,d0),P(a1,d1),P(a0,d1)];}
const wallPoly=w=>{const n=[-w.u[1],w.u[0]],t=w.t/2,e=[w.p0[0]+w.u[0]*w.L,w.p0[1]+w.u[1]*w.L];return[[w.p0[0]+n[0]*t,w.p0[1]+n[1]*t],[e[0]+n[0]*t,e[1]+n[1]*t],[e[0]-n[0]*t,e[1]-n[1]*t],[w.p0[0]-n[0]*t,w.p0[1]-n[1]*t]];};
const hsh=(...a)=>{let h=2166136261;for(const v of a){h^=(v*1000|0)&0xffffffff;h=Math.imul(h,16777619);}return((h>>>0)%1000)/1000;};
// ---------- room context ----------
// ops: [{type,p0,u,n (unit normal pointing INTO this room),s0,s1 (opening span along the wall),t,swingIn,sill,c}]
export function makeRoom(R,room,ops,walls,dims){const c=R.c,bb=room.bb;const i0=Math.max(0,Math.floor((bb[0]-R.x0)/c)-3),j0=Math.max(0,Math.floor((bb[1]-R.z0)/c)-3),i1=Math.min(R.W-1,Math.ceil((bb[2]-R.x0)/c)+3),j1=Math.min(R.Hh-1,Math.ceil((bb[3]-R.z0)/c)+3);
 const w=i1-i0+1,h=j1-j0+1,inR=new Uint8Array(w*h),wall=new Uint8Array(w*h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=R.g[(j0+j)*R.W+i0+i];inR[j*w+i]=v===room.id?1:0;wall[j*w+i]=v===-1?1:0;}
 const G={R,id:room.id,room,i0,j0,w,h,c,inR,wall,dims,walls:walls.map(q=>({...q,P:wallPoly(q)})),ops,X:i=>R.x0+(i0+i)*c,Z:j=>R.z0+(j0+j)*c,li:x=>Math.round((x-R.x0)/c)-i0,lj:z=>Math.round((z-R.z0)/c)-j0};
 G.doors=ops.filter(o=>o.type==='door'||(o.type==='window'&&(o.sill||0)<.4));G.wins=ops.filter(o=>o.type==='window');
 // nothing may stand in a door's swing + clear zone (swing side: leaf width + 10 cm, at least 90 cm; other side 80 cm)
 G.doorZ=doorZones(G.doors,G.room.a);
 G.winZ=G.wins.map(o=>opPoly(o,o.s0-.05,o.s1+.05,0,o.t/2+.6));G.winB=G.wins.map(o=>opPoly(o,o.s0-.05,o.s1+.05,-o.t/2-.05,o.t/2+.35));
 G.seeds=G.doors.filter(o=>o.type==='door').map(o=>{const s=(o.s0+o.s1)/2;return[o.p0[0]+o.u[0]*s+o.n[0]*(o.t/2+.45),o.p0[1]+o.u[1]*s+o.n[1]*(o.t/2+.45)];});
 G.thr=4;const e=pathInfo(G,[]);if(!e.ok){for(const t of[3,2,1]){G.thr=t;if(pathInfo(G,[]).ok)break;}}
 if(!G.seeds.length){/* no door (open plan): seed at the most open cell */const P=pathInfo(G,[]);G.seeds=[P.best];}
 return G;}
function cellsIn(G,q,fn){const i0=Math.ceil((q[0]-G.X(0))/G.c-1e-6),i1=Math.floor((q[2]-G.X(0))/G.c+1e-6),j0=Math.ceil((q[1]-G.Z(0))/G.c-1e-6),j1=Math.floor((q[3]-G.Z(0))/G.c+1e-6);let n=0;
 for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){n++;if(fn(i,j,(i<0||j<0||i>=G.w||j>=G.h)?-1:j*G.w+i)===false)return -1;}if(!n){const i=G.li((q[0]+q[2])/2),j=G.lj((q[1]+q[3])/2);if(fn(i,j,(i<0||j<0||i>=G.w||j>=G.h)?-1:j*G.w+i)===false)return -1;n=1;}return n;}
const inRoomR=(G,q0,frac=1)=>{/* the wall raster overshoots the true wall face by up to ~1 cell; exact wall overlap is wallHit() */const m=Math.min(.08,(q0[2]-q0[0])/2-.01,(q0[3]-q0[1])/2-.01),q=[q0[0]+m,q0[1]+m,q0[2]-m,q0[3]-m];let n=0,k=0;const r=cellsIn(G,q,(i,j,x)=>{n++;if(x>=0&&G.inR[x])k++;else if(frac>=1)return false;});return r>0&&k>=frac*n;};
const wallFrac=(G,q)=>{let n=0,k=0;cellsIn(G,q,(i,j,x)=>{n++;if(x>=0&&G.wall[x])k++;});return n?k/n:0;};
const wallHit=(G,q)=>{const P=rP([q[0]+.005,q[1]+.005,q[2]-.005,q[3]-.005]);return G.walls.some(w=>polyOv(w.P,P));};
// ---------- walking paths: >=80 cm wide (cells farther than thr from any obstacle), all doors connected, items reachable ----------
function pathInfo(G,items){const N=G.w*G.h,obs=new Uint8Array(N);for(let i=0;i<N;i++)obs[i]=G.inR[i]?0:1;
 for(const it of items){if(SOFT.has(it.t)||SEAT.has(it.t))continue;cellsIn(G,[it.q[0]-.04,it.q[1]-.04,it.q[2]+.04,it.q[3]+.04],(i,j,x)=>{if(x>=0)obs[x]=1;});}
 const D=new Int16Array(N).fill(-1),Q=new Int32Array(N);let qh=0,qt=0;for(let i=0;i<N;i++)if(obs[i]){D[i]=0;Q[qt++]=i;}
 while(qh<qt){const i=Q[qh++],x=i%G.w;for(const j of[x>0?i-1:-1,x<G.w-1?i+1:-1,i-G.w,i+G.w])if(j>=0&&j<N&&D[j]<0){D[j]=D[i]+1;Q[qt++]=j;}}
 const P=i=>!obs[i]&&D[i]>=G.thr;let best=-1,bd=-1;for(let i=0;i<N;i++)if(!obs[i]&&D[i]>bd){bd=D[i];best=i;}
 const seedC=[];for(const s of G.seeds||[]){let i=G.li(s[0]),j=G.lj(s[1]),f=-1;for(let r=0;r<=4&&f<0;r++)for(let dj=-r;dj<=r&&f<0;dj++)for(let di=-r;di<=r&&f<0;di++){const a=i+di,b=j+dj;if(a>=0&&b>=0&&a<G.w&&b<G.h&&P(b*G.w+a))f=b*G.w+a;}seedC.push(f);}
 const out={best:best>=0?[G.X(best%G.w),G.Z((best/G.w)|0)]:[0,0],ok:true,near:null};if(seedC.some(v=>v<0)){out.ok=false;return out;}
 const reach=new Uint8Array(N);qh=qt=0;if(seedC.length){reach[seedC[0]]=1;Q[qt++]=seedC[0];}else if(best>=0&&P(best)){reach[best]=1;Q[qt++]=best;}
 while(qh<qt){const i=Q[qh++],x=i%G.w;for(const j of[x>0?i-1:-1,x<G.w-1?i+1:-1,i-G.w,i+G.w])if(j>=0&&j<N&&!reach[j]&&P(j)){reach[j]=1;Q[qt++]=j;}}
 out.ok=seedC.every(v=>reach[v]);
 // cells within 50 cm of the walkway (an item's clearance strip must touch this)
 const near=new Int8Array(N).fill(-1);qh=qt=0;for(let i=0;i<N;i++)if(reach[i]){near[i]=0;Q[qt++]=i;}
 while(qh<qt){const i=Q[qh++],x=i%G.w;if(near[i]>=5)continue;for(const j of[x>0?i-1:-1,x<G.w-1?i+1:-1,i-G.w,i+G.w])if(j>=0&&j<N&&near[j]<0&&!obs[j]){near[j]=near[i]+1;Q[qt++]=j;}}
 out.near=near;return out;}
const accessOK=(G,it,near)=>{if(NOACC.has(it.t))return true;const Z=(it.clr&&it.clr.length?it.clr:[frontR(it.q,it.r,.3)]);return Z.some(z=>{let hit=false;cellsIn(G,[z[0]-.1,z[1]-.1,z[2]+.1,z[3]+.1],(i,j,x)=>{if(x>=0&&near[x]>=0){hit=true;return false;}});return hit;});};
// ---------- hard rules for one item against the rest ----------
// layout checks with a slightly stricter tolerance than the validator, so rounding of saved positions can never flip a result
let EPS=.005;
function hard(G,it,items,why){const t=it.t,q=it.q;const no=k=>{if(why)why.push(k);return false;};
 if(!inRoomR(G,q))return no('outside-room');if(wallHit(G,EPS<.005?[q[0]-.004,q[1]-.004,q[2]+.004,q[3]+.004]:q))return no('wall-overlap');
 if(G.doorZ.some((P,i)=>!(MOUNT.has(t)&&!G.doors[i].swingIn)&&polyOv(P,rP(q),EPS)))return no('door-zone');
 if(MOUNT.has(t)&&t!=='curtain'&&onOpening(G,it,['window','door']))return no('decor-over-opening');
 if(TALL.has(t)){const sq=rP([q[0]+.08,q[1]+.08,q[2]-.08,q[3]-.08]);let nu=0;for(let i=0;i<G.winZ.length;i++)if(polyOv(G.winZ[i],sq,EPS)){if(t==='kitch'&&(G.wins[i].sill||0)>=.85)nu=1;else return no('tall-at-window');}it.nu=nu;}
 if(!SOFT.has(t))for(const o of items){if(o===it||SOFT.has(o.t))continue;/* wall TV hangs above low furniture */if((t==='tvw'&&LOWW.has(o.t))||(o.t==='tvw'&&LOWW.has(t)))continue;if(ov(o.q,q,EPS))return no('overlap:'+o.t);
  if(!SEAT.has(t)&&t!=='tvw'&&o.clr&&o.clr.some(z=>ov(z,q,EPS))&&!(it.partner===o))return no('in-clearance:'+o.t);
  if(SEAT.has(t)&&o.clr&&o.clr.some(z=>ov(z,q,EPS))&&!(o.t==='table'||o.t==='desk'||o.t==='otable'))return no('seat-in-clearance:'+o.t);}
 if(it.clr)for(const z of it.clr){if(!inRoomR(G,z,.85)||wallHit(G,z))return no('clearance-blocked');for(const o of items){if(o===it||SOFT.has(o.t)||o.t==='tvw'||(SEAT.has(o.t)&&(t==='table'||t==='desk'||t==='otable'))||o.partner===it||it.partner===o)continue;if(ov(o.q,z,EPS))return no('clearance-blocked:'+o.t);}}
 if(!FREE.has(t)&&!SEAT.has(t)&&t!=='nstand'&&t!=='plant'&&t!=='lamp'&&wallFrac(G,backR(q,it.r,.02,.14))<.6)return no('not-against-wall');
 if(WALLSTAND.has(t)&&t!=='curtain'&&backGap(G,it).gap>.03)return no('not-flush-to-wall');
 if(t==='art'){const F=frontR(q,it.r,.5);if(items.some(o=>o!==it&&TALL.has(o.t)&&o.t!=='art'&&ov(o.q,F)))return no('art-hidden');if(items.some(o=>o!==it&&o.t==='art'&&Math.hypot(o.p[0]-it.p[0],o.p[1]-it.p[1])<1.5))return no('art-crowded');}
 if(t==='bed'||t==='bed1'||t==='bunk'){const B=rP(backR(q,it.r,-.05,.35));if(G.winB.some(P=>polyOv(P,B)))return no('bed-head-at-window');}
 return true;}
function mkItem(G,t,x,z,r,extra){const q=extra&&extra.sz?rectOf(t,x,z,r,()=>extra.sz):rectOf(t,x,z,r,G.dims),it={t,p:[x,z],r,q,...extra};const D=FRONT[t]||0;it.clr=D?[frontR(q,r,D)]:[];
 if(t==='bed'||t==='bed1'||t==='bunk'){const S=sidesR(q,r,.7,.45);it.sides=S;it.clr=[frontR(q,r,.6)];}
 if(t==='table'||t==='otable'){it.clr=[[q[0]-.75,q[1]-.75,q[2]+.75,q[3]+.75]];}return it;}
function bedSides(G,it,items){return it.sides.filter(z=>inRoomR(G,z,.9)&&!wallHit(G,z)&&!items.some(o=>o!==it&&!SOFT.has(o.t)&&o.t!=='nstand'&&ov(o.q,z,.005)));}
// ---------- candidates ----------
function wallCands(G,t,rs=[0,1,2,3]){const out=[],seen=new Set(),[fw,fd]=G.dims(t);
 for(const r of rs){const f=FV[r],b=[-f[0],-f[1]],d=r%2?fw:fd;for(let j=0;j<G.h;j++)for(let i=0;i<G.w;i++){const k=j*G.w+i;if(!G.inR[k])continue;const a=i+b[0],bj=j+b[1];if(a<0||bj<0||a>=G.w||bj>=G.h||!G.wall[bj*G.w+a])continue;
  let x=G.X(i),z=G.Z(j),best=null;for(const w of G.walls){const nw=[-w.u[1],w.u[0]];const dp=nw[0]*f[0]+nw[1]*f[1];if(Math.abs(dp)<.95)continue;const s=(x-w.p0[0])*w.u[0]+(z-w.p0[1])*w.u[1];if(s<-.1||s>w.L+.1)continue;const dd=((x-w.p0[0])*nw[0]+(z-w.p0[1])*nw[1])*Math.sign(dp);if(dd>0&&dd<w.t/2+.25&&(!best||dd<best.dd))best={dd,t:w.t};}
  if(best){const off=best.dd-best.t/2;x-=f[0]*off;z-=f[1]*off;}else{x-=f[0]*G.c/2;z-=f[1]*G.c/2;}x+=f[0]*(d/2+.005);z+=f[1]*(d/2+.005);const key=r+':'+Math.round(x*20)+':'+Math.round(z*20);if(seen.has(key))continue;seen.add(key);out.push([x,z,r]);}}return out;}
function freeCands(G,rs=[0,1],step=2){const out=[];for(let j=0;j<G.h;j+=step)for(let i=0;i<G.w;i+=step)if(G.inR[j*G.w+i])for(const r of rs)out.push([G.X(i),G.Z(j),r]);return out;}
const dDoor=(G,p)=>Math.min(9,...G.doors.map(o=>{const s=(o.s0+o.s1)/2;return Math.hypot(o.p0[0]+o.u[0]*s-p[0],o.p0[1]+o.u[1]*s-p[1]);}));
const dWin=(G,p)=>Math.min(9,...G.wins.map(o=>{const s=(o.s0+o.s1)/2;return Math.hypot(o.p0[0]+o.u[0]*s-p[0],o.p0[1]+o.u[1]*s-p[1]);}));
function rayWall(G,p,f,max=6){for(let s=.2;s<=max;s+=.1){const i=G.li(p[0]+f[0]*s),j=G.lj(p[1]+f[1]*s);if(i<0||j<0||i>=G.w||j>=G.h||!G.inR[j*G.w+i])return s;}return max;}
function scoreOf(G,it,S){const t=it.t;let s=.25*Math.min(dDoor(G,it.p),4);const cw=CORNER[t];if(cw){const E=endsR(it.q,it.r,.02,.14);s+=cw*E.filter(z=>wallFrac(G,z)>.5).length;}
 if(t==='bed'||t==='bed1'||t==='bunk'){const B=rP(backR(it.q,it.r,-.05,.3));if(G.doors.some(o=>polyOv(opPoly(o,o.s0,o.s1,-o.t/2,o.t/2),B)))s-=2;const k=bedSides(G,it,S.items).length;s+=k>1?(t==='bed'?2:.3):0;if(t!=='bed'&&k===1)s+=.6;}
 if(t==='desk')s+=2*Math.max(0,1.6-dWin(G,it.p));if(t==='wc'){const f=FV[it.r];for(let d=.4;d<3;d+=.2){const P=[it.p[0]+f[0]*d,it.p[1]+f[1]*d];if(G.doorZ.some(Z=>polyOv(Z,rP([P[0]-.05,P[1]-.05,P[0]+.05,P[1]+.05])))){s-=2;break;}}}
 if(t==='bath'||t==='shower')s+=.4*Math.min(dDoor(G,it.p),3);
 if(t==='sofa'){const D=rayWall(G,it.p,FV[it.r]);s+=D>=2.2&&D<=5.5?2.5:-1;}
 if(t==='kitch')s-=G.wins.length&&dWin(G,it.p)<1?.5:0;
 if(t==='table'&&S.last.kitch)s-=.4*Math.hypot(it.p[0]-S.last.kitch.p[0],it.p[1]-S.last.kitch.p[1]);
 if(t==='table'||t==='ctable'||t==='rug'||t==='runner'){const rm=G.room.bb;s-=.3*Math.hypot(it.p[0]-(rm[0]+rm[2])/2,it.p[1]-(rm[1]+rm[3])/2);}
 if((t==='armch')&&S.last.sofa)s-=.5*Math.hypot(it.p[0]-S.last.sofa.p[0],it.p[1]-S.last.sofa.p[1]);
 return s+.8*hsh(S.fv,it.p[0],it.p[1],it.r);}

// density: fill items per room type until ~25-40 % of the floor carries furniture (halls less: they are walkways)
export const FILL={'Obývačka':['armch','plant','shelf','sideb','lamp','plant','art','side','armch'],'Obývačka s kuchyňou':['armch','plant','shelf','sideb','lamp','plant','art','side'],
 'Kuchyňa':['shelf','plant','table','chair4','sideb'],'Jedáleň':['sideb','plant','shelf','art','lamp'],'Spálňa':['dresser','desk','chair1','armch','plant','shelf','art','lamp','rug'],
 'Detská izba':['shelf','toy','desk','chair1','plant','art','armch','rug'],'Detská izba B':['shelf','toy','ward','plant','art','armch','rug'],'Izba':['desk','chair1','shelf','plant','dresser','armch','art','rug'],
 'Pracovňa':['shelf','armch','plant','side','sideb','art','lamp'],'Kúpeľňa':['washer','towel','plant','shelf'],'WC':['towel','plant'],'Chodba':['shoe','coat','mirror','runner','plant','bench','art'],
 'Predsieň':['shoe','coat','mirror','runner','bench','plant','art'],'Šatník':['ward','shelf','dresser'],'Špajza':['shelf','shelf'],'Komora':['shelf','washer','shelf'],'Technická miestnosť':['shelf','shelf'],'Garáž':['shelf','shelf']};
export const TARGET={'Obývačka':.25,'Obývačka s kuchyňou':.25,'Kuchyňa':.3,'Jedáleň':.25,'Spálňa':.28,'Detská izba':.25,'Detská izba B':.25,'Izba':.25,'Pracovňa':.25,'Kúpeľňa':.3,'WC':.2,'Chodba':.08,'Predsieň':.1,'Šatník':.35,'Špajza':.3,'Komora':.3,'Technická miestnosť':.25,'Garáž':.12,'Terasa':0};
// minimum sets (each entry: one of) - missing ones make the room 'too sparse'
export const REQ={'Obývačka':[['sofa'],['tv'],['ctable','armch']],'Obývačka s kuchyňou':[['kitch'],['sofa'],['tv'],['table','ctable']],'Kuchyňa':[['kitch'],['fridge']],'Jedáleň':[['table']],
 'Spálňa':[['bed','bed1'],['ward','dresser']],'Detská izba':[['bed1','bunk','bed'],['desk','toy','shelf']],'Detská izba B':[['bunk','bed1','bed'],['desk','toy','shelf']],'Izba':[['bed1','bed','sofa'],['ward','desk','shelf','dresser']],
 'Pracovňa':[['desk'],['shelf','sideb']],'Kúpeľňa':[['bath','shower'],['sink']],'WC':[['wc']],'Chodba':[['shoe','coat','mirror','bench','runner','plant']],'Predsieň':[['shoe','coat','bench'],['mirror','runner','plant']],
 'Šatník':[['ward','shelf']],'Špajza':[['shelf']],'Komora':[['shelf','washer']],'Technická miestnosť':[['shelf','washer']],'Garáž':[['shelf']]};
// small rooms: a living room under 12 m2 needs a sofa, not the full TV group
export const reqFor=(key,a)=>(REQ[key]||[]).filter(g=>!(a<12&&/^Obývačka/.test(key)&&(g.includes('tv')||g.includes('ctable')))).map(g=>a<18&&key==='Obývačka s kuchyňou'&&g.includes('ctable')?g.concat(['side']):g).map(g=>g.includes('tv')?g.concat(['tvw']):g.includes('coat')?g.concat(['hooks']):g.includes('shelf')?g.concat(['wshelf']):g);
const AREA_SKIP=new Set(['wshelf','tvw','hooks','rug','runner','art','curtain','pendant','mirror','towel']);
export const fillRatio=(G,items)=>items.filter(i=>!AREA_SKIP.has(i.t)).reduce((a,i)=>a+(i.q[2]-i.q[0])*(i.q[3]-i.q[1]),0)/Math.max(.5,G.room.a);
// living: TV on a wall, sofa facing it at 2.2-3.5 m (flush to the opposite wall in small rooms, free-standing in big ones),
// coffee table, armchairs at its sides, floor lamp at the sofa end, rug under the group
function seating(G,S){const tvs=[];for(const[x,z,r]of wallCands(G,'tv')){const it=mkItem(G,'tv',x,z,r);if(!hard(G,it,S.items))continue;const D=rayWall(G,it.p,FV[r],7);if(D<2.75)continue;it.D=D;it.sc=(D>=3.3?1.5:0)+(D>=4?.5:0)+.25*Math.min(dDoor(G,it.p),4)+.8*hsh(S.fv,x,z,r)-(Math.abs(D-3.6)>2.5?.5:0);tvs.push(it);}
 tvs.sort((a,b)=>b.sc-a.sc);const big=G.room.a>=24;
 for(const tv of tvs.slice(0,60)){const f=FV[tv.r],tan=[f[1],-f[0]];if(!place(G,S,'tv',[[tv.p[0],tv.p[1],tv.r]],{},1))continue;const sr=(tv.r+2)%4,[sw,sd]=G.dims('sofa');const Dw=rayWall(G,tv.p,f,7)-.05;
  const ds=[];const flush=Dw+(tv.q[2]-tv.q[0]>tv.q[3]-tv.q[1]?(tv.q[3]-tv.q[1]):(tv.q[2]-tv.q[0]))/2-sd/2-.06;if(flush>=2.2&&flush<=3.5&&!big)ds.push(flush);for(const d of big?[2.6,2.9,2.4,3.2,2.3]:[2.6,2.9,2.3,3.2,3.5,2.2])ds.push(d);if(flush>=2.2&&flush<=3.5&&big)ds.push(flush);const dMax=Dw+.21-sd/2-.04;for(let i=ds.length-1;i>=0;i--)if(ds[i]>dMax+1e-6)ds.splice(i,1);if(!ds.length){S.items.splice(S.items.indexOf(S.last.tv),1);S.last.tv=null;continue;}
  let so=null;for(const d of ds){for(const l of[0,.3,-.3]){const x=tv.p[0]+f[0]*d+tan[0]*l,z=tv.p[1]+f[1]*d+tan[1]*l;so=place(G,S,'sofa',[[x,z,sr]],{},1);if(so)break;}if(so)break;}
  if(!so){S.items.splice(S.items.indexOf(S.last.tv),1);S.last.tv=null;continue;}
  const[cw,cd]=G.dims('ctable');const dd=sd/2+.46+cd/2;const ct=place(G,S,'ctable',[[so.p[0]-f[0]*dd,so.p[1]-f[1]*dd,tv.r%2]],{},1);const c0=ct?ct.p:[so.p[0]-f[0]*dd,so.p[1]-f[1]*dd];
  const[aw]=G.dims('armch');for(const sg of[1,-1]){const off=cw/2+.4+aw/2,x=c0[0]+tan[0]*sg*off,z=c0[1]+tan[1]*sg*off,dir=[-tan[0]*sg,-tan[1]*sg],r=FV.findIndex(v=>v[0]*dir[0]+v[1]*dir[1]>.9);place(G,S,'armch',[[x,z,r]],{},1);}
  for(const sg of[1,-1]){const x=so.p[0]+tan[0]*sg*(sw/2+.25)+f[0]*(sd/2-.2),z=so.p[1]+tan[1]*sg*(sw/2+.25)+f[1]*(sd/2-.2);if(place(G,S,'lamp',[[x,z,0]],{},1))break;}
  const dist=Math.hypot(so.p[0]-tv.p[0],so.p[1]-tv.p[1]),rl=Math.min(3,Math.max(1.4,dist-sd/2-.15)),rw=Math.min(3,sw+.5),mid=[(so.p[0]+tv.p[0])/2-f[0]*.0,(so.p[1]+tv.p[1])/2];const rc=[so.p[0]-f[0]*(sd/2+rl/2-.25),so.p[1]-f[1]*(sd/2+rl/2-.25)];void mid;
  for(const[k1,k2]of[[1,1],[.85,.85],[.7,.8],[.6,.7]]){const a=rw*k1,b=Math.max(1.2,rl*k2);const c=[so.p[0]-f[0]*(sd/2+b/2-.25),so.p[1]-f[1]*(sd/2+b/2-.25)];if(place(G,S,'rug',[[c[0],c[1],0]],{sz:tv.r%2?[b,a]:[a,b]},1))break;}void rc;return true;}
 return false;}
// try candidates best-first; accept the first that passes every hard rule and keeps the walkways
// compact variants of real products, tried when the standard size does not fit (small baths)
const COMPACT={shower:[.8,.8],sink:[.5,.38],bath:[1.5,.7],wc:[.37,.6]};
function place(G,S,t,C,extra={},lim=30){const e0=EPS;EPS=.002;try{return place0(G,S,t,C,extra,lim);}finally{EPS=e0;}}
function place0(G,S,t,C,extra={},lim=30){const L=[];for(const[x,z,r]of C){const it=mkItem(G,t,x,z,r,extra);if(it.q[0]<G.X(0)||it.q[1]<G.Z(0)||it.q[2]>G.X(G.w-1)||it.q[3]>G.Z(G.h-1))continue;if(!hard(G,it,S.items,globalThis.__LDBG?(globalThis.__LDBG[t]=globalThis.__LDBG[t]||[]):null))continue;
  if(it.sides){const k=bedSides(G,it,S.items);if(!k.length)continue;it.clr=it.clr.concat(t==='bed'?k:[k[0]]);if(!hard(G,it,S.items))continue;}it.sc=scoreOf(G,it,S);if(S.spread&&S.items.length){let dn=9;for(const o of S.items)dn=Math.min(dn,Math.hypot(o.p[0]-it.p[0],o.p[1]-it.p[1]));it.sc+=.9*Math.min(dn,3);}L.push(it);}
 L.sort((a,b)=>b.sc-a.sc);let n=0;for(const it of L){if(n++>=lim)break;const A=S.items.concat([it]);const P=pathInfo(G,A);if(!P.ok){if(globalThis.__LDBG)(globalThis.__LDBG[t]=globalThis.__LDBG[t]||[]).push('path');continue;}if(!A.every(o=>accessOK(G,o,P.near))){if(globalThis.__LDBG)(globalThis.__LDBG[t]=globalThis.__LDBG[t]||[]).push('access');continue;}S.items.push(it);S.last[t]=it;S.score+=it.sc*.05;return it;}return null;}
function rel(G,ref,t,sg,back=true){const[rw,rd]=[ref.q[2]-ref.q[0],ref.q[3]-ref.q[1]],[tw,td]=G.dims(t),f=FV[ref.r],tan=ref.r%2?[0,1]:[1,0];const W=ref.r%2?rd:rw,Dp=ref.r%2?rw:rd;
 const off=back?-(Dp/2-td/2):0;return[ref.p[0]+tan[0]*sg*(W/2+tw/2+.03)+f[0]*off,ref.p[1]+tan[1]*sg*(W/2+tw/2+.03)+f[1]*off,ref.r];}
// smaller real products tried when the standard size cannot be placed under the hard rules
const SHRINK={coat:[[.4,.4]],bench:[[.8,.35]],ctable:[[.8,.5],[.6,.6]],kitch:[[2,.6],[1.5,.6]],fridge:[[.6,.6]],sofa:[[2,.9],[1.7,.85]],seating:[[2,.9],[1.7,.85]],ward:[[1.2,.6],[.9,.55]],dresser:[[.9,.45],[.7,.42]],sideb:[[1.2,.42],[.8,.4]],bed:[[1.4,2]],desk:[[1,.55]],table:[[1.4,.85],[1.1,.75],[.8,.8]],shoe:[[.8,.35]],shelf:[[.6,.3],[.45,.3]],washer:[[.6,.55]],tv:[[1.2,.35]],sink:[[.45,.35],[.4,.3]],shower:[[.8,.8]]};
function entry(G,S,e,opt){const base=e.replace(/[!~]/g,''),Z=SHRINK[base];if(!Z){entry0(G,S,e,opt);return;}
 const n0=S.items.length,st={req:S.req,reqOk:S.reqOk,score:S.score,last:{...S.last}};entry0(G,S,e,opt);
 const failed=e.endsWith('!')?S.reqOk===st.reqOk:S.items.length===n0;if(!failed)return;const tt=base==='seating'?'sofa':base;
 for(const z of Z){S.items.length=n0;Object.assign(S,{req:st.req,reqOk:st.reqOk,score:st.score,last:{...st.last}});const d0=G.dims;G.dims=t=>t===tt?z:d0(t);
  try{entry0(G,S,e,opt);}finally{G.dims=d0;}S.items.slice(n0).forEach(i=>{if(i.t===tt){i.sz=z;}});
  if(e.endsWith('!')?S.reqOk>st.reqOk:S.items.length>n0)return;}}
function entry0(G,S,e,opt){const req=e.endsWith('!');e=e.replace('!','');const cmp=e.endsWith('~');e=e.replace('~','');const ok=x=>{if(req){S.req++;if(x)S.reqOk++;}S.score+=x?(req?10:1):0;return x;};
 if(e==='nstand2'||e==='nstand'){const b=S.last.bed||S.last.bed1;if(!b)return;let k=0;for(const sg of[-1,1]){if(e==='nstand'&&k)break;if(place(G,S,'nstand',[rel(G,b,'nstand',sg)],{partner:b}))k++;}ok(k>0);return;}
 if(e==='chair4'){const T=S.last.table;if(!T)return;const w=T.q[2]-T.q[0],d=T.q[3]-T.q[1],[cw,cd]=G.dims('chair');const P=w>=d?[[-w/4,-(d/2+cd/2+.05),0],[w/4,-(d/2+cd/2+.05),0],[-w/4,d/2+cd/2+.05,2],[w/4,d/2+cd/2+.05,2]]:[[-(w/2+cd/2+.05),-d/4,1],[-(w/2+cd/2+.05),d/4,1],[w/2+cd/2+.05,-d/4,3],[w/2+cd/2+.05,d/4,3]];
  let k=0;for(const[dx,dz,r]of P)if(place(G,S,'chair',[[T.p[0]+dx,T.p[1]+dz,r]],{partner:T}))k++;ok(k>=2);return;}
 if(e==='chair1'){const D=S.last.desk;if(!D)return;const f=FV[D.r],dd=(D.r%2?D.q[2]-D.q[0]:D.q[3]-D.q[1])/2+.28;ok(place(G,S,'chair',[[D.p[0]+f[0]*dd,D.p[1]+f[1]*dd,(D.r+2)%4]],{partner:D}));return;}
 if(e==='seating'){ok(seating(G,S));return;}
 if(e==='reading'){if(G.room.a<20)return;/* second zone in big rooms: armchair + side table + floor lamp in the emptiest wall spot */const C=wallCands(G,'armch').map(c=>{let dn=9;for(const o of S.items)dn=Math.min(dn,Math.hypot(o.p[0]-c[0],o.p[1]-c[1]));return[c,dn];}).filter(x=>x[1]>=1.6).sort((a,b)=>b[1]-a[1]).slice(0,40).map(x=>x[0]);
  for(const c of C){const a=place(G,S,'armch',[c],{},1);if(!a)continue;const tan=a.r%2?[0,1]:[1,0];let k=0;for(const sg of[1,-1]){const x=a.p[0]+tan[0]*sg*.68,z=a.p[1]+tan[1]*sg*.68;if(!k&&place(G,S,'side',[[x,z,a.r]],{},1)){k++;continue;}if(place(G,S,'lamp',[[x,z,0]],{},1))break;}ok(true);return;}return;}
 if(e==='curtains'){let k=0;for(const o of G.wins){const sm=(o.s0+o.s1)/2,r=FV.findIndex(f=>f[0]*o.n[0]+f[1]*o.n[1]>.9);if(r<0)continue;const[,cd]=G.dims('curtain');const x=o.p0[0]+o.u[0]*sm+o.n[0]*(o.t/2+cd/2+.003),z=o.p0[1]+o.u[1]*sm+o.n[1]*(o.t/2+cd/2+.003);const it=mkItem(G,'curtain',x,z,r);it.clr=[];if(inRoomR(G,it.q,.5)){S.items.push(it);k++;}}ok(k>0);return;}
 if(e==='wc?'){if(opt.hasWC||G.room.a<3)return;ok(place(G,S,'wc',wallCands(G,'wc')));return;}
 if(e==='fridge'&&S.last.kitch){const k=S.last.kitch;let got=place(G,S,'fridge',[rel(G,k,'fridge',-1),rel(G,k,'fridge',1)])||place(G,S,'fridge',wallCands(G,'fridge'));
  for(const fz of[null,[.55,.6]]){if(got)break;const d0=G.dims;if(fz)G.dims=t=>t==='fridge'?fz:d0(t);try{got=place(G,S,'fridge',[rel(G,k,'fridge',-1),rel(G,k,'fridge',1)])||place(G,S,'fridge',wallCands(G,'fridge'));
   // still nothing: shorten the kitchen run by the fridge width and put the fridge column at its end
   if(!got){const kw=Math.max(k.q[2]-k.q[0],k.q[3]-k.q[1]),kd=Math.min(k.q[2]-k.q[0],k.q[3]-k.q[1]),fw=G.dims('fridge')[0],tan=k.r%2?[0,1]:[1,0];if(kw-fw>=.9){const i0=S.items.indexOf(k);S.items.splice(i0,1);const dk=G.dims;
     for(const sg of[1,-1]){const kz=[kw-fw,kd];G.dims=t=>t==='kitch'?kz:dk(t);const nk=place(G,S,'kitch',[[k.p[0]-tan[0]*sg*fw/2,k.p[1]-tan[1]*sg*fw/2,k.r]],{},1);if(nk){nk.sz=kz;nk.nu=k.nu;got=place(G,S,'fridge',[rel(G,nk,'fridge',sg)]);if(got)break;S.items.splice(S.items.indexOf(nk),1);}G.dims=dk;}
     G.dims=dk;if(!got){S.items.splice(i0,0,k);S.last.kitch=k;}}}
   if(got&&fz)got.sz=fz;}finally{G.dims=d0;}}
  ok(got);return;}
 const tvFor=s=>{const f=FV[s.r],opp=(s.r+2)%4;const C=wallCands(G,'tv',[opp]).filter(([x,z])=>{const v=[x-s.p[0],z-s.p[1]],al=v[0]*f[0]+v[1]*f[1],lat=Math.abs(v[0]*f[1]-v[1]*f[0]);return al>=1.8&&al<=6&&lat<1.2;});return place(G,S,'tv',C)||place(G,S,'tv',wallCands(G,'tv',[opp]).filter(([x,z])=>{const v=[x-s.p[0],z-s.p[1]],al=v[0]*f[0]+v[1]*f[1],lat=Math.abs(v[0]*f[1]-v[1]*f[0]);return al>=1.5&&al<=6&&lat<2.2;}));};
 if(e==='sofa'){/* sofa + TV wall as a pair: try the best sofa spots until the TV fits opposite */const tried=new Set();let got=null;for(let k=0;k<30&&!got;k++){const C=wallCands(G,'sofa').filter(c=>!tried.has(c.join()));const it=place(G,S,'sofa',C);if(!it)break;tried.add([it.p[0],it.p[1],it.r].join());if(tvFor(it)){got=it;break;}S.items.splice(S.items.indexOf(it),1);S.last.sofa=null;S.score-=it.sc*.05;}
  if(!got)got=place(G,S,'sofa',wallCands(G,'sofa'));ok(got);return;}
 if(e==='tv'&&S.last.sofa){ok(S.last.tv||tvFor(S.last.sofa));return;}
 if(e==='ctable'){const s=S.last.sofa;if(!s)return;const f=FV[s.r],[,cd]=G.dims('ctable'),dd=(s.r%2?s.q[2]-s.q[0]:s.q[3]-s.q[1])/2+.46+cd/2;ok(place(G,S,'ctable',[[s.p[0]+f[0]*dd,s.p[1]+f[1]*dd,s.r%2?1:0]]));return;}
 if(e==='rug'){const a=S.last.ctable||S.last.bed||S.last.table;const C=a?[[a.p[0],a.p[1],a.r%2],[a.p[0],a.p[1],(a.r+1)%2]]:[];ok(place(G,S,'rug',C.concat(freeCands(G,[0,1],3)),{},12));return;}
 if(e==='runner'){const b=G.room.bb,r=(b[2]-b[0])>=(b[3]-b[1])?0:1;ok(place(G,S,'runner',freeCands(G,[r],2),{},12));return;}
 if(e==='table'||e==='otable'||e==='lounge'){ok(place(G,S,e,freeCands(G)));return;}
 if(e==='armch'){ok(place(G,S,'armch',wallCands(G,'armch')));return;}
 if(e.includes('|')){const[a,b]=e.split('|');ok(place(G,S,a,wallCands(G,a))||place(G,S,b,wallCands(G,b)));return;}
 if(COMPACT[e]){let got=cmp?null:place(G,S,e,wallCands(G,e));if(!got){const d0=G.dims,z=COMPACT[e];G.dims=t=>t===e?z:d0(t);got=place(G,S,e,wallCands(G,e),{sz:z});G.dims=d0;}ok(got);return;}
 ok(place(G,S,e,wallCands(G,e)));}
// ---------- repair: a required item is missing -> drop optional items (least important first) until it fits; then top the room up again ----------
const DROP=['art','plant','lamp','side','toy','runner','rug','armch','chair','shelf','sideb','dresser','desk','bench','coat','mirror','towel','washer','ward','table','ctable'];
const REPAIR={side:['side'],tv:['tv','seating'],tvw:['tvw'],wshelf:['wshelf'],hooks:['hooks'],sofa:['seating','sofa'],ctable:['ctable'],table:['table','chair4'],fridge:['fridge'],bed:['bed','nstand2'],bed1:['bed1'],bunk:['bunk'],desk:['desk','chair1'],sink:['sink'],bath:['bath'],shower:['shower','shower~'],wc:['wc']};
function relast(S){S.last={};for(const it of S.items)S.last[it.t]=it;}
function tryReq(G,S,g,opt){for(const t of g){const n0=S.items.length;for(const e of REPAIR[t]||[t]){if(e==='tv'&&!S.last.sofa)continue;entry(G,S,e,opt);relast(S);}if(S.items.some(i=>g.includes(i.t)))return true;S.items.length=Math.max(S.items.length,0);void n0;}return false;}
function repair(G,S,key,opt){const R=reqFor(key,G.room.a);const reqT=new Set(R.flat());
 for(const g of R){if(S.items.some(i=>g.includes(i.t)))continue;relast(S);const keep=S.items.slice();if(tryReq(G,S,g,opt))continue;
  // remove optional items one by one, least important first, newest first
  const opt2=S.items.filter(i=>!reqT.has(i.t)&&DROP.includes(i.t)).sort((a,b)=>DROP.indexOf(a.t)-DROP.indexOf(b.t)||S.items.indexOf(b)-S.items.indexOf(a));let ok=false;
  for(const it of opt2){const k=S.items.indexOf(it);if(k<0)continue;S.items.splice(k,1);if(it.partner)continue;
   // a removed table/desk takes its chairs along
   for(let j=S.items.length-1;j>=0;j--)if(S.items[j].partner===it)S.items.splice(j,1);relast(S);if(tryReq(G,S,g,opt)){ok=true;break;}}
  if(!ok){S.items=keep;relast(S);
   const wq=q=>q.some(t=>['kitch','bath','shower','wc','bed','bed1','bunk','fridge','sink'].includes(t))?3:1,sat=X=>R.filter(q=>X.items.some(i=>q.includes(i.t))).reduce((a,q)=>a+wq(q),0),base=sat(S);let bestX=null;
   for(const t of g){const X={items:[],last:{},score:0,req:0,reqOk:0,fv:S.fv};for(const e of REPAIR[t]||[t]){if(e==='tv')continue;entry(G,X,e,opt);relast(X);}if(!X.items.some(i=>g.includes(i.t)))continue;
    for(const e0 of S.tp||[]){const e=e0.replace(/[!~]/g,'');const prod=e==='seating'?'sofa':e;if(reqT.has(prod)&&X.items.some(i=>i.t===prod))continue;entry(G,X,e0,opt);relast(X);}
    fillRoom(G,X,key,opt);if(sat(X)>base&&(!bestX||sat(X)>sat(bestX)))bestX=X;}
   if(bestX){S.items=bestX.items;relast(S);}}}
 // top-up: keep adding small items until the room clears the sparse limit with margin
 const tg=TARGET[key]??.2,F=(FILL[key]||[]).concat(['shelf','side','plant','lamp','plant','dresser~','sideb~','armch~','desk~','shelf~']);let guard=0;
 while(fillRatio(G,S.items)<.62*tg&&guard++<4){let prog=false;for(const e of F){if(fillRatio(G,S.items)>=.62*tg)break;if(S.items.filter(i=>i.t===e).length>=6)continue;const n0=S.items.length;entry(G,S,e,opt);relast(S);if(S.items.length>n0)prog=true;}if(!prog)break;}
 if(!S.items.length){const d0=G.dims;for(const[t,z]of[['shelf',[.45,.3]],['plant',null],['wshelf',null],['mirror',null],['art',null]]){if(z)G.dims=q=>q===t?z:d0(q);const it=place(G,S,t,wallCands(G,t));G.dims=d0;if(it){if(z)it.sz=z;break;}}}}
function fillRoom(G,S,key,opt){const tg=TARGET[key]??.2,F=FILL[key]||[];let prog=true,guard=0;S.spread=G.room.a>=20;while(prog&&guard++<(G.room.a>40?5:3)&&fillRatio(G,S.items)<tg){prog=false;const CAP={plant:3,art:2,lamp:2,armch:2,shelf:2,side:1,rug:1,runner:1,desk:1,chair1:1,toy:1,dresser:1,sideb:1,washer:1,table:1,chair4:1,ward:2,shoe:1,coat:1,mirror:1,bench:1,towel:1};const cnt=t=>S.items.filter(i=>i.t===t||(t==='chair1'&&i.t==='chair')).length;for(const e of F){if(fillRatio(G,S.items)>=Math.min(.4,tg+.08))break;if(cnt(e)>=(CAP[e]||2)*Math.max(1,Math.round(G.room.a/28)))continue;const n0=S.items.length;entry(G,S,e,opt);if(S.items.length>n0)prog=true;}}}
export function layoutRoom(G,typ,opt={}){const key=tplKey(typ,/ [2468]$/.test(typ||''));let T=TPL[key]||TPL['Izba'];const sty=opt.style||'rod';
 T=T.map(tp=>{if(sty==='min'){let dk=0;return tp.filter(e=>e.endsWith('!')||!DECOR.has(e)||(dk++<1));}if(sty==='mod')return tp.filter(e=>e!=='toy'&&e!=='lamp');return tp;});
 let best=null;for(const tp of T){const S={items:[],last:{},score:0,req:0,reqOk:0,fv:opt.fv||0,tp};for(const e of tp)entry(G,S,e,opt);
  fillRoom(G,S,key,opt);
  if(S.items.length<2)for(const f of['plant','shelf','lamp','side']){if(S.items.length>=2)break;place(G,S,f,wallCands(G,f));}
  if(/^(Komora|Špajza|Technická|Šatník|Garáž|Chodba|Predsieň|Hala|Zádverie)/.test(key)&&!S.items.some(i=>['shelf','washer','ward','shoe','coat','bench'].includes(i.t))){const d0=G.dims;
   for(const[t,z]of[['shelf',null],['shoe',null],['shelf',[.6,.3]],['shoe',[.6,.3]],['shelf',[.45,.3]]]){if(z)G.dims=q=>q===t?z:d0(q);const it=place(G,S,t,wallCands(G,t));G.dims=d0;if(it){if(z)it.sz=z;S.score+=8;break;}}}
  S.score-=10*(S.req-S.reqOk);for(const g of reqFor(key,G.room.a))if(!S.items.some(i=>g.includes(i.t)))S.score-=(g.includes('bath')||g.includes('bed')||g.includes('kitch')||g.includes('wc'))?12:8;S.score+=10*Math.min(fillRatio(G,S.items),TARGET[key]??.2);if(!best||S.score>best.score+1e-6)best=S;if(S.req===S.reqOk&&tp===T[0])break;}
 repair(G,best,key,opt);
 return best.items.map(it=>{const o={t:it.t,p:[+it.p[0].toFixed(3),+it.p[1].toFixed(3)],r:it.r};if(it.nu)o.nu=1;if(it.sz||(SOFT.has(it.t)&&it.t!=='art'&&it.t!=='curtain')){const z=it.sz||G.dims(it.t);o.w=z[0];o.d=z[1];}return o;});}

// ---------- wall snap (exact geometry): gap between the item's back and the nearest solid wall face it stands against ----------
export const WALLSTAND=new Set(['wshelf','tvw','hooks','washer','ward','dresser','shelf','bed','bed1','bunk','kitch','fridge','bath','shower','sink','wc','desk','tv','sideb','shoe','bench','towel','mirror','art','curtain']);
const LOWW=new Set(['sideb','side','dresser','shoe','bench']);
export const MOUNT=new Set(['art','mirror','towel','curtain','wshelf','tvw','hooks']);
export function backGap(G,it){const f=FV[it.r],q=it.q,tan=it.r%2?[0,1]:[1,0];const bx=it.r===1?q[0]:it.r===3?q[2]:(q[0]+q[2])/2,bz=it.r===0?q[1]:it.r===2?q[3]:(q[1]+q[3])/2;const half=(it.r%2?q[3]-q[1]:q[2]-q[0])/2;let best=9,bw=null;
 for(const w of G.walls){const nw=[-w.u[1],w.u[0]];const dp=nw[0]*f[0]+nw[1]*f[1];if(Math.abs(dp)<.95)continue;const sg=Math.sign(dp);
  const s=(bx-w.p0[0])*w.u[0]+(bz-w.p0[1])*w.u[1],tu=Math.abs(tan[0]*w.u[0]+tan[1]*w.u[1]);const lo=Math.max(0,s-half*tu),hi=Math.min(w.L,s+half*tu);if(hi-lo<Math.min(.6*2*half,2*half-.02)&&!(half<.15&&s>=0&&s<=w.L))continue;
  const gap=((bx-w.p0[0])*nw[0]+(bz-w.p0[1])*nw[1])*sg-w.t/2;if(gap>=-.03&&gap<best){best=gap;bw=w;}}return{gap:best,w:bw};}
// item span projected on the wall it hangs on overlaps a window/door opening on that wall
function onOpening(G,it,types){const bg=backGap(G,it);if(!bg.w)return false;const w=bg.w,q=it.q,a=(q[0]-w.p0[0])*w.u[0]+(q[1]-w.p0[1])*w.u[1],b=(q[2]-w.p0[0])*w.u[0]+(q[3]-w.p0[1])*w.u[1],lo=Math.min(a,b),hi=Math.max(a,b);
 return G.ops.some(o=>(types.includes(o.type)||o.type==='window_x'&&types.includes('window'))&&Math.abs(o.p0[0]-w.p0[0])<1e-6&&Math.abs(o.p0[1]-w.p0[1])<1e-6&&Math.abs(o.u[0]-w.u[0])<1e-6&&lo<o.s1-.02&&hi>o.s0+.02);}
// ---------- validator: re-checks every rule for the furniture now in the room ----------
// can this item stand in the EMPTY room at all (standard or compact size)? if not, the room shape / openings were misread
function fitsAlone(G,t){const S0={items:[],last:{},score:0};const zs=[null].concat(SHRINK[t]||[],COMPACT[t]?[COMPACT[t]]:[]);const d0=G.dims;
 for(const z of zs){if(z)G.dims=q=>q===t?z:d0(q);try{if(place(G,S0,t,wallCands(G,t).concat(FREE.has(t)?freeCands(G):[]),{},40))return true;}finally{G.dims=d0;}}return false;}
export function validateRoom(G,furn,typ){const items=furn.map(f=>mkItem(G,f.t,f.p[0],f.p[1],f.r||0,f.w&&f.d?{sz:[f.w,f.d]}:undefined));const V=[];
 // re-derive partners (chairs belong to the nearest table/desk; nightstands to the bed)
 items.forEach(it=>{if(SEAT.has(it.t)||it.t==='nstand'){let b=null,bd=9;items.forEach(o=>{if(['table','desk','otable','bed','bed1','bunk'].includes(o.t)){const d=Math.hypot(o.p[0]-it.p[0],o.p[1]-it.p[1]);if(d<bd){bd=d;b=o;}}});it.partner=b;}});
 items.forEach(it=>{if(it.sides){const k=bedSides(G,it,items);if(!k.length)V.push({t:it.t,p:it.p,rule:'bed-no-side-access'});it.clr=it.clr.concat(it.t==='bed'?k:k.slice(0,1));}});
 items.forEach(it=>{if(WALLSTAND.has(it.t)){const g=backGap(G,it).gap;if(g>.03)V.push({t:it.t,p:it.p,rule:'not-flush-to-wall:'+(g>8?'none':g.toFixed(2))});}
  if(MOUNT.has(it.t)){if(it.t==='curtain'){if(!onOpening(G,it,['window','door']))V.push({t:it.t,p:it.p,rule:'curtain-not-at-window'});}else if(onOpening(G,it,['window','door']))V.push({t:it.t,p:it.p,rule:'decor-over-opening'});return;}
  const w=[];if(!hard(G,it,items,w))V.push({t:it.t,p:it.p,rule:w[0]});});
 const P=pathInfo(G,items);if(!P.ok)V.push({t:'-',rule:'doors-not-connected'});else items.forEach(it=>{if(!accessOK(G,it,P.near))V.push({t:it.t,p:it.p,rule:'no-access-path'});});
 if(!items.length){const anyFit=['shelf','plant','shoe'].some(t=>fitsAlone(G,t));V.push({t:'-',rule:anyFit?'empty-room':'read-error:room has no free wall/floor outside its door zones (walk-through or misread)'});}
 else if(typ){const key=tplKey(typ,/ [2468]$/.test(typ));const miss=reqFor(key,G.room.a).filter(g=>!items.some(i=>g.includes(i.t)));const imp=miss.filter(g=>!g.some(t=>fitsAlone(G,t)));let rest=miss.filter(g=>!imp.includes(g));
 const nd=(G.doors||[]).filter(o=>o.type==='door').length,passage=nd>=2&&G.room.a<2.5;{if(rest.length&&((nd>=3&&G.room.a/nd<3)||(nd>=5&&G.room.a/nd<4.5)||(nd>=2&&G.room.a<2.5))){V.push({t:'-',rule:'read-error:walk-through room ('+nd+' doors on '+G.room.a.toFixed(1)+' m²) cannot hold '+rest.map(g=>g.join('|')).join(',')+' (plan doors misread?)'});rest=[];}}
if(imp.length)V.push({t:'-',rule:'read-error:room cannot hold '+imp.map(g=>g.join('|')).join(',')+' even when empty (plan geometry/openings misread?)'});if(rest.length)V.push({t:'-',rule:'too-sparse:missing '+rest.map(g=>g.join('|')).join(',')});const fr=fillRatio(G,items),tg=TARGET[key]??.2;if(fr<.5*tg&&!imp.length&&G.room.a>45&&!/^(Obývačka|Garáž|Chodba|Predsieň|Hala)/.test(key))V.push({t:'-',rule:'read-error:implausible room size '+G.room.a.toFixed(0)+' m² for '+key+' (walls misread?)'});else if(fr<.5*tg&&!imp.length&&!passage)V.push({t:'-',rule:'too-sparse:fill '+Math.round(fr*100)+'%<'+Math.round(.5*tg*100)+'%'});}
 return V;}
// ---------- door / window sanity ----------
// walls: app walls (start,end,thickness,openings); info(p) -> room id at p (>1 room, -1 wall, else outside). Returns a log of fixes.
export function sanitizeOpenings(walls,info){const log=[];const G=w=>{const L=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1])||1e-9;return{p0:w.start,L,u:[(w.end[0]-w.start[0])/L,(w.end[1]-w.start[1])/L]};};
 walls.forEach((w,wi)=>{const g=G(w),n=[-g.u[1],g.u[0]],t=w.thickness/2;const J=[];
  walls.forEach((v,vi)=>{if(vi===wi||v.level!==w.level)return;const gv=G(v);if(Math.abs(gv.u[0]*g.u[0]+gv.u[1]*g.u[1])>.9)return;
   for(const p of[v.start,v.end]){const s=(p[0]-g.p0[0])*g.u[0]+(p[1]-g.p0[1])*g.u[1],d=Math.abs((p[0]-g.p0[0])*n[0]+(p[1]-g.p0[1])*n[1]);if(d<=t+v.thickness/2+.05&&s>-.05&&s<g.L+.05)J.push([s-v.thickness/2-.1,s+v.thickness/2+.1]);}
   /* crossing */const den=g.u[0]*gv.u[1]-g.u[1]*gv.u[0];if(Math.abs(den)>1e-6){const dx=v.start[0]-g.p0[0],dz=v.start[1]-g.p0[1],s=(dx*gv.u[1]-dz*gv.u[0])/den,sv=(dx*g.u[1]-dz*g.u[0])/den;if(s>.05&&s<g.L-.05&&sv>.05&&sv<gv.L-.05)J.push([s-v.thickness/2-.1,s+v.thickness/2+.1]);}});
  J.push([-1e9,.1]);J.push([g.L-.1,1e9]);
  const ops=(w.openings||[]);const bad=(a,b,skip)=>J.some(j=>a<j[1]&&b>j[0])||ops.some(o=>o!==skip&&a<o.offset+o.width+.05&&b>o.offset-.05);
  const fit=(o)=>{if(!bad(o.offset,o.offset+o.width,o))return 0;let bestS=null;for(let d=.05;d<=.8;d+=.05)for(const sg of[1,-1]){const s=o.offset+sg*d;if(s>=0&&s+o.width<=g.L&&!bad(s,s+o.width,o)){bestS=s;break;}if(bestS!=null)break;}if(bestS==null)return -1;const d=bestS-o.offset;o.offset=+bestS.toFixed(3);return d;};
  // windows in interior walls (a room on both sides) are removed
  for(const o of ops.slice()){if(o.type!=='window')continue;const s=o.offset+o.width/2,c=[g.p0[0]+g.u[0]*s,g.p0[1]+g.u[1]*s],e=t+.3,A=info([c[0]+n[0]*e,c[1]+n[1]*e]),B=info([c[0]-n[0]*e,c[1]-n[1]*e]);if(A>1&&B>1){ops.splice(ops.indexOf(o),1);log.push({w:wi,fix:'window-interior-removed',s:+s.toFixed(2)});}}
  for(const o of ops.slice()){const d=fit(o);if(d===0)continue;if(d===-1){if(o.type==='window'&&ops.some(p=>p!==o&&p.type==='door'&&o.offset<p.offset+p.width&&o.offset+o.width>p.offset)){ops.splice(ops.indexOf(o),1);log.push({w:wi,fix:'window-over-door-removed'});}else log.push({w:wi,fix:'suggest:'+o.type+'-near-junction',s:+o.offset.toFixed(2)});}else log.push({w:wi,fix:o.type+'-moved-from-junction',d:+d.toFixed(2)});}});
 // one leaf per opening: a second door at (almost) the same spot on a coincident wall is the same opening read twice -> drop it
 {const A=[];walls.forEach(w=>{const g=G(w);(w.openings||[]).forEach(o=>{if(o.type==='door'){const s=o.offset+o.width/2;A.push({w,o,g,c:[g.p0[0]+g.u[0]*s,g.p0[1]+g.u[1]*s]});}});});
  for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){const a=A[i],b=A[j];if(a.dead||b.dead||a.w.level!==b.w.level)continue;if(Math.abs(a.g.u[0]*b.g.u[0]+a.g.u[1]*b.g.u[1])<.9)continue;if(Math.hypot(a.c[0]-b.c[0],a.c[1]-b.c[1])<Math.max(.35,Math.min(a.o.width,b.o.width)*.6)){const k=b.w.openings.indexOf(b.o);if(k>=0){b.w.openings.splice(k,1);b.dead=1;log.push({fix:'duplicate-leaf-removed'});}}}
  A.forEach(d=>{if(d.dead)return;if(d.o.kind==='double'){d.o.kind=d.o.width<1.25?'single':'sliding';log.push({fix:'double-leaf-to-'+d.o.kind});}else if((d.o.kind||'single')==='single'&&d.o.width>=1.3){d.o.kind='sliding';log.push({fix:'wide-leaf-to-sliding',w:d.o.width});}});}
 // door leaves: flip hinge / swing side when the leaf would hit another door's leaf or a wall
 const DS=[];walls.forEach(w=>{const g=G(w);(w.openings||[]).forEach(o=>{if(o.type==='door'&&(!o.kind||o.kind==='single'||o.kind==='entrance'))DS.push({w,g,o});});});
 const sector=d=>{const{g,o}=d,t=d.w.thickness/2,sd=o.out?-1:1,v=[-g.u[1]*sd,g.u[0]*sd],R=o.hinge==='R',hs=R?o.offset+o.width:o.offset,H=[g.p0[0]+g.u[0]*hs+v[0]*t,g.p0[1]+g.u[1]*hs+v[1]*t],a=R?[-g.u[0],-g.u[1]]:g.u,P=[];
  for(let k=2;k<=6;k++)for(let m=1;m<=6;m++){const ang=(.12+m/6*.88)*Math.PI/2,rr=o.width*(k/6-.04);P.push([H[0]+(a[0]*Math.cos(ang)+v[0]*Math.sin(ang))*rr,H[1]+(a[1]*Math.cos(ang)+v[1]*Math.sin(ang))*rr]);}return P;};
 const inSec=(d,p)=>{const{g,o}=d,t=d.w.thickness/2,sd=o.out?-1:1,v=[-g.u[1]*sd,g.u[0]*sd],R=o.hinge==='R',hs=R?o.offset+o.width:o.offset,H=[g.p0[0]+g.u[0]*hs+v[0]*t,g.p0[1]+g.u[1]*hs+v[1]*t],a=R?[-g.u[0],-g.u[1]]:g.u,x=p[0]-H[0],z=p[1]-H[1];return Math.hypot(x,z)<=o.width&&x*v[0]+z*v[1]>=0&&x*a[0]+z*a[1]>=0;};
 const cost=d=>{const P=sector(d);let c=0;for(const p of P){const r=info(p);if(r===-1)c+=1;for(const e of DS)if(e!==d&&e.w.level===d.w.level&&inSec(e,p))c+=1;}return c;};
 DS.forEach(d=>{const c0=cost(d);if(c0<4)return;const o=d.o,h0=o.hinge||'L',s0=!!o.out;let best=[c0,h0,s0];for(const h of['L','R'])for(const s of[false,true]){if(d.o.kind==='entrance'&&s!==s0)continue;o.hinge=h;o.out=s;const c=cost(d);if(c<best[0]-2&&c<=.5*c0)best=[c,h,s];}o.hinge=best[1];o.out=best[2];if(best[1]!==h0||best[2]!==s0)log.push({fix:'door-flipped',from:h0+(s0?'o':'i'),to:best[1]+(best[2]?'o':'i'),hits:c0+'->'+best[0]});});
 return log;}
