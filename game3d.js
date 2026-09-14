'use strict';
(()=>{
const $=id=>document.getElementById(id),canvas=$('world');
const gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){$('error').hidden=false;$('error').textContent='This 3D game needs WebGL. Enable hardware acceleration or open it in another browser.';return}
const {Game,SIZE,HEIGHT,BLOCKS,ITEMS}=BlockMeadow3D;
const game=new Game(),SAVE='block-meadow-3d-v1';
const names={staff:'Magic staff',portal:'Portal',dragon_spawn_egg:'Dragon egg',herobrine_axe:'Herobrine axe',gun:'Gun',bomb:'Bomb',ice_boomerang:'Ice boomerang',sword:'Sword',herobrine:'Herobrine',bow:'Bow',hand:'Mine'};
const symbols={staff:'✦',portal:'◉',dragon_spawn_egg:'◈',herobrine_axe:'⚒',gun:'▰',bomb:'●',ice_boomerang:'❄',sword:'⚔',herobrine:'◌',bow:'➶',hand:'⛏'};
const tints={staff:'#bb9bff',portal:'#bd7dff',dragon_spawn_egg:'#a9dc8b',herobrine_axe:'#fff',gun:'#aebecd',bomb:'#f6b274',ice_boomerang:'#a8f1ff'};
const descriptions={staff:'Fire a magic bolt · 30 damage',portal:'Create a gateway · Walk through to travel',dragon_spawn_egg:'Summon a dragon · 6,666,666,666,666 HP',herobrine_axe:'White laser · 99 damage',gun:'Aim and fire · Unlimited ammo',bomb:'Throw · 1.2-second fuse · 24 blast damage',ice_boomerang:'Throw and return · Freezes enemies for 3 seconds',sword:'Swing at nearby creatures',herobrine:'Summon Herobrine',bow:'Shoot an arrow',hand:'Left click mine · Right click build'};
const palette=[[0,0,0],[.40,.64,.29],[.49,.32,.21],[.43,.48,.53],[.41,.27,.16],[.23,.49,.28],[.82,.74,.48],[.56,.83,.87],[.65,.34,.29],[.87,.68,.24]];
function notify(text){$('notice').textContent=text;noticeUntil=performance.now()+5500}
let noticeUntil=0;
game.message=notify;
try{const raw=localStorage.getItem(SAVE);if(raw)game.restore(raw)}catch{notify('Could not load the 3D save. Starting a fresh meadow.')}
function save(quiet=false){try{localStorage.setItem(SAVE,game.snapshot());if(!quiet)notify('3D world saved.')}catch{if(!quiet)notify('Saving is unavailable in this browser window.')}}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();
try{
gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 color;uniform mat4 vp;uniform vec3 eye;varying vec3 tint;varying float depth;void main(){gl_Position=vp*vec4(position,1.0);tint=color;depth=distance(position,eye);}'));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 tint;varying float depth;uniform vec3 fog;uniform float light;void main(){float f=smoothstep(22.0,66.0,depth);gl_FragColor=vec4(mix(tint*light,fog,f),1.0);}'));
gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
}catch(e){$('error').hidden=false;$('error').textContent='The 3D renderer could not start: '+e.message;return}
gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
const loc={position:gl.getAttribLocation(program,'position'),color:gl.getAttribLocation(program,'color'),vp:gl.getUniformLocation(program,'vp'),eye:gl.getUniformLocation(program,'eye'),fog:gl.getUniformLocation(program,'fog'),light:gl.getUniformLocation(program,'light')};
gl.enableVertexAttribArray(loc.position);gl.enableVertexAttribArray(loc.color);
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function matrix(){
 const e=game.eye(),d=game.direction(),p=game.player;
 const rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw),ux=Math.sin(p.yaw)*Math.sin(p.pitch),uy=Math.cos(p.pitch),uz=Math.cos(p.yaw)*Math.sin(p.pitch);
 const view=new Float32Array([rx,ux,-d.x,0,0,uy,-d.y,0,rz,uz,-d.z,0,-rx*e.x-rz*e.z,-ux*e.x-uy*e.y-uz*e.z,d.x*e.x+d.y*e.y+d.z*e.z,1]);
 const f=1/Math.tan(Math.PI/5),near=.06,far=100;
 const proj=new Float32Array([f/(canvas.width/canvas.height),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
 return multiply(proj,view);
}
// Each face carries a little directional shading, preserving the voxel style.
const faces=[
 {n:[1,0,0],s:.80,v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},
 {n:[-1,0,0],s:.65,v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
 {n:[0,1,0],s:1,v:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]]},
 {n:[0,-1,0],s:.5,v:[[0,0,1],[0,0,0],[1,0,0],[1,0,1]]},
 {n:[0,0,1],s:.9,v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},
 {n:[0,0,-1],s:.72,v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}
];
function face(out,x,y,z,w,h,d,c,f){for(const i of [0,1,2,0,2,3]){const v=f.v[i];out.push(x+v[0]*w,y+v[1]*h,z+v[2]*d,c[0]*f.s,c[1]*f.s,c[2]*f.s)}}
function box(out,x,y,z,w,h,d,c){for(const f of faces)face(out,x,y,z,w,h,d,c,f)}
function upload(vertices){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);return {buffer,count:vertices.length/6}}
const meshes=new Map();
function terrainMesh(){
 const r=game.world,cache=meshes.get(r);
 if(cache&&cache.revision===r.revision)return cache;
 if(cache)gl.deleteBuffer(cache.buffer);
 const out=[];
 for(let y=0;y<HEIGHT;y++)for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
  const b=game.get(x,y,z);if(!b)continue;
  let c=palette[b],variation=.92+((x*17+y*13+z*29)%11)*.014;
  if(r.id&&b===3)c=[.30,.23,.43];
  for(const f of faces)if(!game.get(x+f.n[0],y+f.n[1],z+f.n[2])){
   const color=b===1&&f.n[1]!==1?palette[2]:c;
   face(out,x,y,z,1,1,1,color.map(v=>v*variation),f);
  }
 }
 const mesh={...upload(out),revision:r.revision};meshes.set(r,mesh);return mesh;
}
function drawMesh(mesh){
 gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(loc.color,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
function beam(out,a,b,color,width=.04){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dy,dz)/.13));
 for(let i=0;i<=n;i++){const t=i/n;box(out,a.x+dx*t-width,a.y+dy*t-width,a.z+dz*t-width,width*2,width*2,width*2,color)}
}
function creature(out,e){
 const {x,y,z,type}=e,ice=e.frozen>0;
 const skin=ice?[.55,.87,1]:type==='pig'?[.93,.58,.57]:type==='herobrine'?[.72,.52,.36]:[.44,.64,.35];
 if(type==='dragon'){
  const dark=ice?[.43,.78,.95]:[.18,.12,.25],purple=[.48,.22,.66],flap=Math.sin(game.elapsed*5)*.65;
  box(out,x-1.2,y,z-1.6,2.4,1.5,3.4,dark);box(out,x-.7,y+.2,z-3,1.4,1,1.5,dark);
  box(out,x-.64,y+1.2,z-2.8,.2,.7,.3,[.8,.75,.9]);box(out,x+.44,y+1.2,z-2.8,.2,.7,.3,[.8,.75,.9]);
  box(out,x-.72,y+.85,z-3.03,.25,.2,.15,[.8,.3,1]);box(out,x+.47,y+.85,z-3.03,.25,.2,.15,[.8,.3,1]);
  for(let i=0;i<4;i++){
   box(out,x+1+i*.85,y+.7+flap*i*.35,z-.6+i*.2,.95,.18,2.7-i*.45,purple);
   box(out,x-1.95-i*.85,y+.7+flap*i*.35,z-.6+i*.2,.95,.18,2.7-i*.45,purple);
   box(out,x-.3+i*.08,y+.2+i*.08,z+1.5+i*.65,.6-i*.08,.5-i*.07,.8,dark);
  }
  for(const dx of [-.8,.5])for(const dz of [-.8,1])box(out,x+dx,y-.5,z+dz,.35,.65,.5,dark);
  return;
 }
 if(['pig','sheep','cow','chicken'].includes(type)){
  const c=ice?skin:type==='pig'?skin:type==='cow'?[.52,.37,.27]:[.92,.91,.82];
  box(out,x-.5,y+.25,z-.35,1,.55,.75,c);box(out,x-.3,y+.5,z-.65,.6,.55,.45,c);
  box(out,x-.2,y+.55,z-.76,.4,.2,.14,type==='pig'?[.8,.4,.44]:[.45,.4,.37]);
  for(const dx of [-.33,.2])for(const dz of [-.24,.2])box(out,x+dx,y,z+dz,.16,.3,.16,c);
  box(out,x-.23,y+.82,z-.67,.08,.08,.04,[.08,.09,.1]);box(out,x+.15,y+.82,z-.67,.08,.08,.04,[.08,.09,.1]);return;
 }
 box(out,x-.3,y+.9,z-.2,.6,.55,.4,type==='herobrine'?[.12,.65,.64]:[.33,.29,.5]);
 box(out,x-.27,y+1.45,z-.27,.54,.5,.54,skin);
 if(type==='herobrine')box(out,x-.28,y+1.83,z-.28,.56,.16,.56,[.22,.15,.12]);
 for(const dx of [-.2,.09]){box(out,x+dx,y,z-.15,.16,.9,.3,[.23,.27,.4]);box(out,x+dx,y+1.66,z-.29,.12,.08,.04,type==='herobrine'?[1,1,1]:[1,.2,.2])}
 box(out,x-.43,y+.7,z-.14,.15,.7,.3,skin);box(out,x+.28,y+.7,z-.14,.15,.7,.3,skin);
}
const dynamic=gl.createBuffer();
function draw(){
 const scale=Math.min(devicePixelRatio||1,1.5),w=Math.floor(innerWidth*scale),h=Math.floor(innerHeight*scale);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 gl.viewport(0,0,w,h);
 const night=game.time>12500&&game.time<23000,fog=game.realm?[.13,.08,.23]:night?[.075,.12,.22]:[.48,.73,.82];
 gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3fv(loc.fog,fog);gl.uniform1f(loc.light,night?.6:1);
 const eye=game.eye();gl.uniform3f(loc.eye,eye.x,eye.y,eye.z);gl.uniformMatrix4fv(loc.vp,false,matrix());drawMesh(terrainMesh());
 const out=[];
 for(const e of game.world.entities)creature(out,e);
 for(const p of game.world.portals){
  const frame=[.20,.12,.29],glow=[.59+.12*Math.sin(game.elapsed*3),.24,.92];
  box(out,p.x-1.4,p.y,p.z-.25,.35,3.4,.5,frame);box(out,p.x+1.05,p.y,p.z-.25,.35,3.4,.5,frame);
  box(out,p.x-1.4,p.y+3.05,p.z-.25,2.8,.35,.5,frame);
  box(out,p.x-1.02,p.y+.05,p.z-.03,2.04,2.95,.06,glow);
  for(let i=0;i<7;i++)box(out,p.x+Math.sin(game.elapsed+i*2)*.8,p.y+.3+(i*.4+game.elapsed*.5)%2.5,p.z-.09,.08,.12,.16,[.87,.67,1]);
 }
 for(const s of game.shots){
  const c=s.kind==='staff'?[.67,.35,1]:s.kind==='bomb'?[.16,.18,.23]:[.5,.9,1];
  box(out,s.x-.12,s.y-.12,s.z-.12,.24,.24,.24,c);
  if(s.kind==='bomb')box(out,s.x-.025,s.y+.12,s.z-.025,.05,.12,.05,[1,.6,.2]);
  if(s.kind==='ice_boomerang'){box(out,s.x-.3,s.y-.06,s.z-.05,.6,.12,.12,c);box(out,s.x+.18,s.y-.06,s.z-.05,.12,.12,.3,c)}
 }
 for(const e of game.effects){
  if(e.kind==='beam')beam(out,e.a,e.b,e.color);
  else for(let i=0;i<12;i++){const a=i*Math.PI/6,r=(.5-e.life)*5;box(out,e.a.x+Math.cos(a)*r,e.a.y+Math.sin(i*7)*r,e.a.z+Math.sin(a)*r,.15,.15,.15,e.color)}
 }
 const mesh={buffer:dynamic,count:out.length/6};gl.bindBuffer(gl.ARRAY_BUFFER,dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(out),gl.DYNAMIC_DRAW);drawMesh(mesh);
 updateHUD();
}
let keys={},started=false,paused=true,last=0,touchLook=null;
const coarse=matchMedia('(pointer: coarse)').matches;
function refreshBar(){
 $('bar').replaceChildren();
 ITEMS.forEach((item,i)=>{
  const b=document.createElement('button');b.className='slot'+(game.item===item?' active':'');b.title=descriptions[item]||'Place '+item;b.setAttribute('aria-label',names[item]||item);
  const icon=document.createElement('span');icon.className='icon';icon.textContent=symbols[item]||'■';icon.style.color=tints[item]||(BLOCKS.includes(item)?'rgb('+palette[BLOCKS.indexOf(item)].map(v=>Math.floor(v*255)).join(',')+')':'#cadbc0');
  const label=document.createElement('span');label.textContent=names[item]||item;
  const key=document.createElement('small');key.textContent=i<9?String(i+1):'';
  b.append(key,icon,label);b.onclick=()=>{game.select(item);refreshBar()};$('bar').append(b);
 });
 const active=$('bar').querySelector('.active');if(active)active.scrollIntoView({block:'nearest',inline:'nearest'});
 const icon=$('held');icon.textContent=symbols[game.item]||'■';icon.style.color=tints[game.item]||'#cfddb4';
 if(game.item==='staff')icon.innerHTML='<svg width="90" height="200" viewBox="0 0 90 200" aria-hidden="true"><path d="M42 65h12v135H42z" fill="#866045"/><path d="M40 100h16v9H40zm0 45h16v9H40z" fill="#d1a557"/><path d="m48 7 24 31-24 36-24-36z" fill="#b989ff"/><path d="m48 7 0 67-24-36z" fill="#e0c2ff"/><path d="M20 47v23l28 16 28-16V47h-9v17L48 75 29 64V47z" fill="#dbb76b"/></svg>';
 if(game.item==='herobrine_axe')icon.innerHTML='<svg width="120" height="180" viewBox="0 0 120 180" aria-hidden="true"><path d="M53 30h14v150H53z" fill="#65516c"/><path d="M18 5 44 24h32l26-19 8 60-28-8H38L10 65z" fill="#e0dce9"/><path d="m18 5-8 60 14-9 3-43zm84 0 8 60-14-9-3-43z" fill="#fff"/><path d="M40 32h16v9H40zm25 0h16v9H65z" fill="#fff"/></svg>';
 $('itemname').textContent=names[game.item]||game.item;$('itemhelp').textContent=descriptions[game.item]||'Left / right click to place · Select Mine to dig';
}
function updateHUD(){
 $('realm').textContent=game.realm?'THE DRAGON REALM':'BLOCK MEADOW / 3D';
 $('status').textContent=game.mode.toUpperCase()+(game.flying?' · FLYING':'')+' · '+Math.floor(game.player.x)+', '+Math.floor(game.player.y)+', '+Math.floor(game.player.z)+(game.mode==='survival'?' · ♥ '+game.health+'/20':'');
 const target=game.trace(game.eye(),game.direction(),40,true).entity;
 $('target').textContent=target?(target.type==='dragon'?'DRAGON':target.type.toUpperCase())+' · '+target.hp.toLocaleString('en-US')+' / '+target.maxHp.toLocaleString('en-US')+' HP':'';
 const dragon=game.world.entities.find(e=>e.type==='dragon');$('boss').hidden=!dragon;
 if(dragon){$('bosshp').textContent=dragon.hp.toLocaleString('en-US')+' / '+dragon.maxHp.toLocaleString('en-US')+' HP';$('bossfill').style.width=100*dragon.hp/dragon.maxHp+'%'}
 if(performance.now()>noticeUntil)$('notice').textContent='';
}
function unlock(){keys={};if(document.pointerLockElement)document.exitPointerLock()}
function start(){
 started=true;$('welcome').close();$('pause').hidden=true;
 if(coarse){paused=false;return}
 if(canvas.requestPointerLock){try{const result=canvas.requestPointerLock();if(result&&result.catch)result.catch(()=>{paused=false;notify('Mouse lock unavailable. Drag the world to look around.');$('pause').hidden=true})}catch{paused=false;notify('Drag to look around.')}}else paused=false;
}
function openCommands(){unlock();paused=true;$('commandDialog').showModal();$('command').focus()}
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===canvas){paused=false;$('pause').hidden=true}else if(started&&!coarse){paused=true;keys={};$('pause').hidden=false}});
document.addEventListener('pointerlockerror',()=>{if(started){paused=false;$('pause').hidden=true;notify('Drag to look around; use the Use button to fire.')}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(!started||paused)return;
 if(document.pointerLockElement===canvas){game.use(e.button===2);return}
 touchLook={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(paused)return;
 let dx=0,dy=0;
 if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY}
 else if(touchLook){dx=e.clientX-touchLook.x;dy=e.clientY-touchLook.y;touchLook.x=e.clientX;touchLook.y=e.clientY;if(Math.abs(dx)+Math.abs(dy)>2)touchLook.moved=true}
 else return;
 game.player.yaw-=dx*.003;game.player.pitch=Math.max(-1.5,Math.min(1.5,game.player.pitch-dy*.003));
});
canvas.addEventListener('pointerup',e=>{if(touchLook&&!touchLook.moved&&!paused)game.use(e.button===2);touchLook=null});
canvas.addEventListener('pointercancel',()=>touchLook=null);
window.addEventListener('keydown',e=>{
 if(e.target.tagName==='INPUT')return;
 if(e.key==='Escape'){keys={};return}
 if(paused)return;
 const k=e.key.length===1?e.key.toLowerCase():e.key;
 if(k==='/'||k==='t'){e.preventDefault();openCommands();return}
 keys[k]=true;
 if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault();
 if(e.repeat)return;
 if(k==='f'){game.flying=!game.flying;notify(game.flying?'Flight on · Space up / Shift down':'Flight off')}
 if(k>='1'&&k<='9'){game.select(ITEMS[Number(k)-1]);refreshBar()}
 if(k==='q'){game.select(ITEMS[(ITEMS.indexOf(game.item)+1)%ITEMS.length]);refreshBar()}
 if(k==='b'){game.select(BLOCKS[game.block%9+1]);refreshBar()}
});
window.addEventListener('keyup',e=>delete keys[e.key.length===1?e.key.toLowerCase():e.key]);
window.addEventListener('blur',()=>{keys={};if(started){paused=true;$('pause').hidden=false}});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys[button.dataset.key]=true});
 const release=()=>delete keys[button.dataset.key];button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);
}
$('use').onclick=()=>{if(!paused)game.use()};
$('build').onclick=()=>{if(!paused)game.use(true)};
$('fly').onclick=()=>game.flying=!game.flying;
$('play').onclick=start;$('resume').onclick=start;
$('save').onclick=()=>save();$('commands').onclick=openCommands;
$('help').onclick=()=>{unlock();paused=true;$('welcome').showModal()};
$('closeCommands').onclick=()=>{$('commandDialog').close();start()};
const examples=['/give staff','/give portal','/give dragon_spawn_egg','/give herobrine_axe','/give bomb','/give ice_boomerang','/give gold 64','/summon pig','/summon dragon','/summon herobrine','/gamemode creative','/gamemode survival','/gamemode spectator','/fly','/heal','/time set night','/time set day','/gamerule doDaylightCycle false','/tp ~ ~3 ~','/setblock ~3 ~ ~ stone','/kill @e','/clear','/save','/load'];
for(const text of examples){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{$('command').value=text;$('command').focus()};$('examples').append(b)}
$('commandForm').onsubmit=e=>{
 e.preventDefault();const text=$('command').value.trim();
 try{
  if(text==='/save')save();
  else if(text==='/load'){const raw=localStorage.getItem(SAVE);if(!raw)throw Error('No 3D save yet.');game.restore(raw);for(const mesh of meshes.values())gl.deleteBuffer(mesh.buffer);meshes.clear();notify('3D world restored.')}
  else game.command(text);
  refreshBar();$('commandResult').textContent=$('notice').textContent;
 }catch(error){$('commandResult').textContent=error.message}
};
for(const dialog of [$('welcome'),$('commandDialog')])dialog.addEventListener('cancel',()=>{keys={};paused=true;$('pause').hidden=false});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;$('error').hidden=false;$('error').textContent='The 3D graphics context was interrupted. Refresh to resume from your last save.'});
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused)game.update(dt,keys);draw();requestAnimationFrame(frame)}
setInterval(()=>save(true),30000);window.addEventListener('pagehide',()=>save(true));
refreshBar();$('welcome').showModal();requestAnimationFrame(frame);
})();
