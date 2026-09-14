'use strict';
// Simulation is independent of the browser so combat and travel can be checked directly.
(function(root){
const SIZE=48, HEIGHT=28, DRAGON_HP=6666666666666;
const BLOCKS=['air','grass','dirt','stone','wood','leaves','sand','glass','brick','gold'];
const ITEMS=['staff','portal','dragon_spawn_egg','herobrine_axe','gun','bomb','ice_boomerang','sword','herobrine','bow','hand',...BLOCKS.slice(1)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function terrain(x,z){return 6+Math.floor(Math.sin(x*.18)*1.5+Math.cos(z*.23)*1.5)}
function realm(id){
 const blocks=new Uint8Array(SIZE*SIZE*HEIGHT),r={id,blocks,entities:[],portals:[],revision:0};
 for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++){
  const h=terrain(x,z);
  for(let y=0;y<=h;y++)blocks[(y*SIZE+z)*SIZE+x]=y===h?(id?3:1):y>h-3?2:3;
 }
 for(let x=5;x<SIZE-4;x+=9)for(let z=5;z<SIZE-4;z+=11){
  if(Math.hypot(x-24,z-24)<7)continue;
  const h=terrain(x,z);
  for(let y=h+1;y<h+5;y++)blocks[(y*SIZE+z)*SIZE+x]=4;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=5;dy++)
   if(Math.abs(dx)+Math.abs(dz)<4)blocks[((h+dy)*SIZE+z+dz)*SIZE+x+dx]=id?9:5;
 }
 return r;
}
class Game {
 constructor(){
  this.realms=[realm(0),realm(1)];this.realm=0;
  this.player={x:24.5,y:terrain(24,24)+1.02,z:24.5,vy:0,yaw:0,pitch:-.12};
  this.mode='creative';this.flying=false;this.health=20;this.item='staff';this.block=1;
  this.inventory=Array(10).fill(0);this.time=6000;this.dayCycle=true;
  this.shots=[];this.effects=[];this.cooldown=0;this.hurt=0;this.portalCooldown=0;this.spawnClock=0;this.elapsed=0;this.nextId=1;
  this.message=()=>{};
  this.spawn('pig',21,terrain(21,19)+1,19);
  this.spawn('sheep',27,terrain(27,20)+1,20);
 }
 get world(){return this.realms[this.realm]}
 get(x,y,z,r=this.world){
  x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);
  if(x<0||z<0||x>=SIZE||z>=SIZE||y<0)return 3;
  return y>=HEIGHT?0:r.blocks[(y*SIZE+z)*SIZE+x];
 }
 set(x,y,z,b,r=this.world){
  if(![x,y,z,b].every(Number.isInteger)||x<0||x>=SIZE||z<0||z>=SIZE||y<1||y>=HEIGHT||b<0||b>=BLOCKS.length)return false;
  r.blocks[(y*SIZE+z)*SIZE+x]=b;r.revision++;return true;
 }
 floor(x,z,r=this.world){for(let y=HEIGHT-1;y>=0;y--)if(this.get(x,y,z,r))return y+1;return 1}
 occupied(x,y,z){
  for(const dx of [-.28,.28])for(const dz of [-.28,.28])for(const dy of [.05,.9,1.75])
   if(this.get(x+dx,y+dy,z+dz))return true;
  return false;
 }
 direction(){const p=this.player,c=Math.cos(p.pitch);return {x:-Math.sin(p.yaw)*c,y:Math.sin(p.pitch),z:-Math.cos(p.yaw)*c}}
 eye(){const p=this.player;return {x:p.x,y:p.y+1.6,z:p.z}}
 center(e){return {x:e.x,y:e.y+(e.type==='dragon'?1:e.type==='pig'||e.type==='sheep'?.45:.8),z:e.z}}
 contains(e,p,pad=0){const c=this.center(e),r=e.type==='dragon'?1.5:e.type==='pig'||e.type==='sheep'?.55:.4,h=e.type==='dragon'?1:e.type==='pig'||e.type==='sheep'?.45:.9;return Math.abs(p.x-c.x)<=r+pad&&Math.abs(p.z-c.z)<=r+pad&&Math.abs(p.y-c.y)<=h+pad}
 trace(origin,dir,range,entities=false){
  let previous={x:Math.floor(origin.x),y:Math.floor(origin.y),z:Math.floor(origin.z)};
  for(let t=.04;t<=range;t+=.06){
   const p={x:origin.x+dir.x*t,y:origin.y+dir.y*t,z:origin.z+dir.z*t};
   if(this.get(p.x,p.y,p.z))return {point:p,block:{x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)},previous};
   if(entities){const entity=this.world.entities.find(e=>e.hp>0&&this.contains(e,p));if(entity)return {point:p,entity}}
   previous={x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)};
  }
  return {point:{x:origin.x+dir.x*range,y:origin.y+dir.y*range,z:origin.z+dir.z*range}};
 }
 clear(a,b){const d=distance(a,b);if(d<.08)return true;return !this.trace(a,{x:(b.x-a.x)/d,y:(b.y-a.y)/d,z:(b.z-a.z)/d},d).block}
 spawn(type,x,y,z){
  if(!['pig','sheep','cow','chicken','zombie','slime','herobrine','dragon'].includes(type))throw Error('Unknown creature.');
  if(this.world.entities.length>=40)throw Error('Creature limit reached (40).');
  const hp=type==='dragon'?DRAGON_HP:type==='herobrine'?40:type==='pig'?10:type==='zombie'?12:8;
  const e={id:this.nextId++,type,x:clamp(x,2,SIZE-3),y:clamp(y,1,HEIGHT-4),z:clamp(z,2,SIZE-3),hp,maxHp:hp,frozen:0,phase:0};
  this.world.entities.push(e);return e;
 }
 select(item){if(!ITEMS.includes(item))throw Error('Unknown item.');this.item=item;const b=BLOCKS.indexOf(item);if(b>0)this.block=b}
 cleanup(){this.world.entities=this.world.entities.filter(e=>e.hp>0)}
 use(build=false){
  if(this.mode==='spectator')return;
  const o=this.eye(),d=this.direction(),hit=this.trace(o,d,7);
  if(build||BLOCKS.includes(this.item)||this.item==='hand'){
   if(!hit.block)return;
   if(!build&&this.item==='hand'){const b=this.get(hit.block.x,hit.block.y,hit.block.z);if(this.set(hit.block.x,hit.block.y,hit.block.z,0))this.inventory[b]++;return}
   const p=hit.previous;
   if(this.mode==='survival'&&this.inventory[this.block]<=0){this.message('Mine blocks first, or use /give.');return}
   if(this.set(p.x,p.y,p.z,this.block)){
    if(this.occupied(this.player.x,this.player.y,this.player.z))this.set(p.x,p.y,p.z,0);
    else if(this.mode==='survival')this.inventory[this.block]--;
   }
   return;
  }
  if(this.cooldown>0)return;
  const item=this.item;
  if(item==='portal'){this.placePortal();this.cooldown=.6;return}
  if(item==='dragon_spawn_egg'||item==='herobrine'){
   const x=clamp(this.player.x+d.x*7,3,SIZE-4),z=clamp(this.player.z+d.z*7,3,SIZE-4),y=item==='dragon_spawn_egg'?Math.max(this.floor(x,z)+4,11):this.floor(x,z);
   try{const e=this.spawn(item==='dragon_spawn_egg'?'dragon':'herobrine',x,y,z);if(item==='dragon_spawn_egg')this.player.pitch=Math.atan2(e.y+1-this.eye().y,Math.hypot(e.x-this.player.x,e.z-this.player.z));this.message(item==='dragon_spawn_egg'?'Dragon summoned · 6,666,666,666,666 HP':'Herobrine summoned!')}catch(e){this.message(e.message)}
   this.cooldown=.7;return;
  }
  if(item==='ice_boomerang'&&this.shots.some(s=>s.kind===item))return;
  this.cooldown=item==='gun'?.18:item==='staff'?.35:.65;
  if(['herobrine_axe','gun','bow','sword'].includes(item)){
   const h=this.trace(o,d,item==='sword'?3:35,true),damage={herobrine_axe:99,gun:12,bow:8,sword:6}[item];
   if(h.entity)h.entity.hp-=damage;
   this.effects.push({kind:'beam',a:o,b:h.point,color:item==='herobrine_axe'?[1,1,1]:item==='sword'?[.8,.9,1]:[1,.85,.3],life:.16});
   this.cleanup();return;
  }
  const speed=item==='bomb'?12:item==='staff'?22:16;
  this.shots.push({kind:item,x:o.x,y:o.y,z:o.z,vx:d.x*speed,vy:d.y*speed+(item==='bomb'?4:0),vz:d.z*speed,life:item==='bomb'?1.2:4,age:0,returning:false,hits:[]});
 }
 pad(r,x,z){
  const y=terrain(Math.floor(x),Math.floor(z))+1;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=-1;dy<=4;dy++)
   this.set(Math.floor(x)+dx,y+dy,Math.floor(z)+dz,dy===-1?8:0,r);
  return {x:Math.floor(x)+.5,y,z:Math.floor(z)+.5};
 }
 placePortal(){
  const d=this.direction(),p=this.player,x=clamp(p.x+d.x*5,4,SIZE-5),z=clamp(p.z+d.z*5,4,SIZE-5);
  const here=this.pad(this.world,x,z),other=this.realms[1-this.realm];
  const there=this.pad(other,24,24);
  // One linked gateway per realm. Replacing it always updates both ends.
  this.world.portals=[{...here}];other.portals=[{...there}];
  this.message('Portal opened! Walk into the violet doorway to travel.');
 }
 travel(){
  const target=this.realms[1-this.realm].portals[0];if(!target)return false;
  this.realm=1-this.realm;Object.assign(this.player,{x:target.x,y:target.y+.05,z:target.z+1.8,vy:0,yaw:Math.PI,pitch:0});
  this.shots=[];this.effects=[];this.portalCooldown=2.5;
  this.message(this.realm?'Welcome to the dragon realm. The portal takes you home.':'Back in the meadow.');return true;
 }
 update(dt,keys={}){
  dt=clamp(dt,0,.05);this.elapsed+=dt;
  if(this.dayCycle)this.time=(this.time+dt*160)%24000;
  this.cooldown=Math.max(0,this.cooldown-dt);this.hurt=Math.max(0,this.hurt-dt);this.portalCooldown=Math.max(0,this.portalCooldown-dt);
  const p=this.player,fly=this.flying||this.mode==='spectator';
  let forward=(keys.w||keys.ArrowUp?1:0)-(keys.s||keys.ArrowDown?1:0),side=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0);
  const norm=Math.max(1,Math.hypot(forward,side)),speed=fly?8:5;
  const dx=(-Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)*speed*dt/norm,dz=(-Math.cos(p.yaw)*forward-Math.sin(p.yaw)*side)*speed*dt/norm;
  for(const [axis,delta]of [['x',dx],['z',dz]]){const v=p[axis];p[axis]=clamp(v+delta,.4,SIZE-.4);if(this.mode!=='spectator'&&this.occupied(p.x,p.y,p.z))p[axis]=v}
  if(fly)p.vy=((keys[' ']?1:0)-(keys.Shift?1:0))*7;
  else {if(keys[' ']&&this.occupied(p.x,p.y-.09,p.z))p.vy=8;p.vy=Math.max(-22,p.vy-22*dt)}
  const steps=Math.max(1,Math.ceil(Math.abs(p.vy*dt)/.1));
  for(let i=0;i<steps;i++){const y=clamp(p.y+p.vy*dt/steps,1,HEIGHT+10);if(this.mode!=='spectator'&&this.occupied(p.x,y,p.z)){p.vy=0;break}p.y=y}
  for(const portal of this.world.portals)if(this.portalCooldown===0&&Math.abs(p.x-portal.x)<1.05&&Math.abs(p.z-portal.z)<.65&&p.y>=portal.y-.2&&p.y<portal.y+3){this.travel();break}
  for(const e of this.world.entities){
   e.phase+=dt;
   if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);continue}
   if(e.type==='dragon'){e.x=clamp(e.x+Math.cos(e.phase*.4)*dt*1.8,3,SIZE-4);e.z=clamp(e.z+Math.sin(e.phase*.4)*dt*1.8,3,SIZE-4);e.y=Math.max(this.floor(e.x,e.z)+3,11+Math.sin(e.phase)*1.5)}
   else{
    const hostile=['zombie','slime','herobrine'].includes(e.type)&&this.mode==='survival';
    const a=hostile?Math.atan2(p.z-e.z,p.x-e.x):e.id+Math.sin(e.phase*.4);
    const speed=hostile?1.6:.35,nx=clamp(e.x+Math.cos(a)*dt*speed,1,SIZE-2),nz=clamp(e.z+Math.sin(a)*dt*speed,1,SIZE-2),ground=this.floor(nx,nz);
    if(ground<=e.y+1.1){e.x=nx;e.z=nz;e.y=Math.max(ground,e.y-dt*5)}
   }
   if(this.mode==='survival'&&['zombie','slime','herobrine','dragon'].includes(e.type)&&distance(this.center(e),this.eye())<(e.type==='dragon'?3:1.5)&&this.hurt===0&&this.clear(this.center(e),this.eye())){
    this.health-=e.type==='dragon'?8:e.type==='herobrine'?5:3;this.hurt=1;
    if(this.health<=0){this.health=20;p.x=24.5;p.z=30.5;p.y=this.floor(p.x,p.z);p.vy=0;this.message('Back at spawn. Your items are safe.')}
   }
  }
  this.updateShots(dt);this.cleanup();
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  if(this.mode==='survival'&&this.time>12500&&this.time<23000){this.spawnClock+=dt;if(this.spawnClock>8&&this.world.entities.length<18){this.spawnClock=0;const x=clamp(p.x+10,2,SIZE-3),z=clamp(p.z-8,2,SIZE-3);this.spawn('zombie',x,this.floor(x,z),z)}}
 }
 updateShots(dt){
  for(const s of this.shots){
   s.life-=dt;s.age+=dt;
   if(s.kind==='bomb'&&s.life<=0){
    for(const e of this.world.entities)if(distance(s,this.center(e))<3&&this.clear(s,this.center(e)))e.hp-=24;
    this.effects.push({kind:'burst',a:{x:s.x,y:s.y,z:s.z},color:[1,.5,.08],life:.45});continue;
   }
   if(s.kind==='bomb')s.vy-=18*dt;
   if(s.kind==='ice_boomerang'){
    if(s.age>.55)s.returning=true;
    if(s.returning){const to=this.eye(),dist=distance(s,to);if(dist<.5+20*dt){s.life=0;continue}s.vx=(to.x-s.x)/dist*20;s.vy=(to.y-s.y)/dist*20;s.vz=(to.z-s.z)/dist*20}
   }
   const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy,s.vz)*dt/.1));
   for(let i=0;i<steps&&s.life>0;i++){
    const n={x:s.x+s.vx*dt/steps,y:s.y+s.vy*dt/steps,z:s.z+s.vz*dt/steps};
    if(this.get(n.x,n.y,n.z)&&!s.returning){
     if(s.kind==='bomb'){s.vx=s.vy=s.vz=0;break}
     if(s.kind==='ice_boomerang'){s.returning=true;break}
     s.life=0;this.effects.push({kind:'burst',a:{x:s.x,y:s.y,z:s.z},color:[.5,.3,1],life:.25});break;
    }
    Object.assign(s,n);
    if(s.kind==='bomb')continue;
    const hit=this.world.entities.find(e=>e.hp>0&&!s.hits.includes(e.id)&&this.contains(e,s,.1)&&this.clear(s,this.center(e)));
    if(hit){hit.hp-=s.kind==='staff'?30:6;s.hits.push(hit.id);if(s.kind==='ice_boomerang')hit.frozen=3;else{s.life=0;this.effects.push({kind:'burst',a:{...n},color:[.6,.3,1],life:.3})}}
   }
  }
  this.shots=this.shots.filter(s=>s.life>0);
 }
 snapshot(){return JSON.stringify({version:1,realms:this.realms.map(r=>({...r,blocks:Array.from(r.blocks)})),realm:this.realm,player:this.player,mode:this.mode,flying:this.flying,health:this.health,item:this.item,block:this.block,inventory:this.inventory,time:this.time,dayCycle:this.dayCycle,nextId:this.nextId})}
 restore(raw){
  const d=JSON.parse(raw);
  if(d.version!==1||![0,1].includes(d.realm)||!Array.isArray(d.realms)||d.realms.length!==2||!d.player||!['x','y','z','yaw','pitch','vy'].every(k=>Number.isFinite(d.player[k]))||!ITEMS.includes(d.item)||!['creative','survival','spectator'].includes(d.mode))throw Error('Invalid 3D save.');
  for(const r of d.realms){
   if(!Array.isArray(r.blocks)||r.blocks.length!==SIZE*SIZE*HEIGHT||!r.blocks.every(b=>Number.isInteger(b)&&b>=0&&b<BLOCKS.length)||!Array.isArray(r.entities)||r.entities.length>40||!r.entities.every(e=>['x','y','z','hp','maxHp','id','phase','frozen'].every(k=>Number.isFinite(e[k]))&&e.hp>0)||!Array.isArray(r.portals)||r.portals.length>1||!r.portals.every(p=>['x','y','z'].every(k=>Number.isFinite(p[k]))))throw Error('Invalid world data.');
  }
  if(!Array.isArray(d.inventory)||d.inventory.length!==10||!d.inventory.every(n=>Number.isInteger(n)&&n>=0)||!Number.isInteger(d.block)||d.block<1||d.block>9||!Number.isFinite(d.health)||d.health<=0||!Number.isFinite(d.time)||!Number.isSafeInteger(d.nextId))throw Error('Invalid player data.');
  this.realms=d.realms.map(r=>({...r,blocks:Uint8Array.from(r.blocks),revision:r.revision+1}));
  for(const k of ['realm','player','mode','flying','health','item','block','inventory','time','dayCycle','nextId'])this[k]=d[k];
  this.shots=[];this.effects=[];this.cooldown=0;this.portalCooldown=2;
 }
 command(input){
  const a=input.trim().replace(/^\//,'').split(/\s+/),cmd=a.shift().toLowerCase();
  if(['@s','@p'].includes(a[0]))a.shift();
  const coordinate=(v,base)=>{const n=v&&v.startsWith('~')?base+Number(v.slice(1)||0):Number(v);if(v===undefined||!Number.isFinite(n))throw Error('Use x y z coordinates.');return n};
  if(cmd==='give'){const name=(a[0]||'').replace('minecraft:','');this.select(name==='dragen_spawn_egg'?'dragon_spawn_egg':name);const b=BLOCKS.indexOf(this.item);if(b>0){const n=Number(a[1]||64);if(!Number.isInteger(n)||n<1||n>9999)throw Error('Count must be 1–9999.');this.inventory[b]+=n}}
  else if(cmd==='summon'){const p=this.player,d=this.direction(),x=a.length>1?coordinate(a[1],p.x):clamp(p.x+d.x*6,3,SIZE-4),z=a.length>1?coordinate(a[3],p.z):clamp(p.z+d.z*6,3,SIZE-4);this.spawn(a[0]==='dragen'?'dragon':a[0],x,a.length>1?coordinate(a[2],p.y):this.floor(x,z)+(a[0]==='dragon'||a[0]==='dragen'?4:0),z)}
  else if(cmd==='gamemode'){if(!['creative','survival','spectator'].includes(a[0]))throw Error('Use creative, survival, or spectator.');if(a[0]!=='spectator'&&this.occupied(this.player.x,this.player.y,this.player.z))throw Error('Move out of the blocks first.');this.mode=a[0];this.health=20}
  else if(cmd==='fly')this.flying=!this.flying;
  else if(cmd==='heal')this.health=20;
  else if(cmd==='kill'&&a[0]==='@e'){this.world.entities=[];this.shots=[]}
  else if(cmd==='clear')this.inventory.fill(0);
  else if(cmd==='time'&&a[0]==='set'){const n=({day:6000,night:18000,noon:6000,midnight:18000})[a[1]]??Number(a[1]);if(!Number.isFinite(n))throw Error('Use day, night or a number.');this.time=((n%24000)+24000)%24000}
  else if(cmd==='gamerule'&&a[0]==='doDaylightCycle'&&['true','false'].includes(a[1]))this.dayCycle=a[1]==='true';
  else if(cmd==='tp'||cmd==='teleport'){const p=this.player,x=coordinate(a[0],p.x),y=coordinate(a[1],p.y),z=coordinate(a[2],p.z);if(x<1||x>SIZE-1||z<1||z>SIZE-1||y<1||y>HEIGHT+8||(this.mode!=='spectator'&&this.occupied(x,y,z)))throw Error('Choose open space inside the world.');Object.assign(p,{x,y,z,vy:0})}
  else if(cmd==='setblock'){const p=this.player,x=Math.floor(coordinate(a[0],p.x)),y=Math.floor(coordinate(a[1],p.y)),z=Math.floor(coordinate(a[2],p.z)),b=BLOCKS.indexOf(a[3]),old=this.get(x,y,z);if(!this.set(x,y,z,b))throw Error('Invalid block or coordinates.');if(this.mode!=='spectator'&&this.occupied(p.x,p.y,p.z)){this.set(x,y,z,old);throw Error('That block would trap you.')}}
  else if(cmd==='say'){this.message(a.join(' '));return}
  else throw Error('Open Commands to see the supported 3D commands.');
  this.message('✓ '+input);
 }
}
root.BlockMeadow3D={Game,SIZE,HEIGHT,DRAGON_HP,BLOCKS,ITEMS,terrain};
})(typeof globalThis!=='undefined'?globalThis:this);
