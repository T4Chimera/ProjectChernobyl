import * as THREE from 'three';
import canon from './canon.js';
import {createWorld} from './world.js';
import {createGameplay} from './gameplay.js';
import {createUI} from './ui.js';
import {MissionDirector} from './missions.js';
import {createAudio} from './audio.js';
import {createWeaponView} from './weapon-view.js';
import {createAtmosphere} from './atmosphere.js';
import {createActor,animateActor} from './actors.js';
import './style.css';

const canvas=document.querySelector('#game-canvas');
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
} catch(error) {
  document.querySelector('#app').innerHTML='<main style="padding:40px;color:#dedbca;background:#101714;font:18px monospace"><h1>PROJECT CHERNOBYL</h1><p>WebGL2 is unavailable. Enable hardware acceleration or open this game in a current browser.</p><button onclick="location.reload()">TRY AGAIN</button></main>';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x11151b);
scene.fog=new THREE.FogExp2(0x1b2128,.012);
scene.add(new THREE.HemisphereLight(0x9ba7b7,0x252323,.74));
const moon=new THREE.DirectionalLight(0xc2cbd7,.85);
moon.position.set(-95,42,18);moon.target.position.set(-75,0,0);scene.add(moon,moon.target);
moon.shadow.mapSize.set(1536,1536);moon.shadow.camera.left=-42;moon.shadow.camera.right=42;
moon.shadow.camera.top=42;moon.shadow.camera.bottom=-42;moon.shadow.camera.near=1;moon.shadow.camera.far=120;
moon.shadow.normalBias=.045;moon.shadow.bias=-.0001;
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.045,260);
camera.rotation.order='YXZ';scene.add(camera);
const world=createWorld(scene,canon);
const audio=createAudio();
const settings={blood:true,subtitles:true,sound:true,reducedMotion:false,music:true,voice:true,quality:matchMedia('(pointer: coarse)').matches?'balanced':'high'};
const keys=new Set(),touch={forward:0,right:0};
const player={position:world.spawn.clone(),direction:new THREE.Vector3(1,0,0),moving:false,sprinting:false,crouching:false,mode:'operative'};
player.position.y=0;
let yaw=-Math.PI/2,pitch=0,stamina=100,staminaDelay=0,exhausted=false,verticalVelocity=0;
let paused=true,firing=false,aiming=false,started=false,cameraMode='briefing',lastMode='briefing';
let nearest=null,currentSector=null,recoil=0,reloadStart=0,shotKick=0,lastShot=-10,lastHurt=-10;
let runtime=0,fps=60,ui;
const fx=[],raycaster=new THREE.Raycaster();
const marker=new THREE.Group();
const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.4,32),new THREE.MeshBasicMaterial({color:0xc5ab6c,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));
ring.rotation.x=-Math.PI/2;marker.add(ring);scene.add(marker);
const missionDirector=new MissionDirector((mission,complete)=>{
  if(complete){
    game.state.phase='won';paused=true;document.exitPointerLock?.();ui.showScreen('won');audio.radio();
  } else announceMission(mission);
});
const game=createGameplay({scene,world,canon,onEvent:event=>{
  if(!ui)return;
  ui.event(event);
  if(event.type==='subtitle'&&settings.sound&&settings.voice)audio.speak(event.text,event.speaker);
  if(event.type==='interaction'||event.type==='boss-defeated')missionDirector.observe(event);
  if(event.type==='shot'){trace(event.origin,event.position);if(!event.own)audio.tone(100,.07,'triangle',.15);}
  if(event.type==='blood'&&settings.blood)specks(event.position);
  if(event.type==='hurt'){lastHurt=runtime;audio.hurt();}
  if(event.type==='reload'){reloadStart=runtime;audio.reload();}
  if(event.type==='reload-complete')audio.tone(260,.08,'triangle',.25);
  if(event.type==='resupply'){audio.radio();ui.event({type:'notice',text:'AMMUNITION RESUPPLIED',duration:2});}
  if(event.type==='boss-defeated')ui.event({type:'notice',text:`${canon.Bosses[event.id].NameTag} / CONTAINED FOR THIS RUN`,duration:5});
  if(event.type==='execution-start'){firing=false;aiming=false;audio.hurt();}
  if(event.type==='death'){firing=false;aiming=false;document.exitPointerLock?.();ui.showScreen('dead');}
}});

function announceMission(mission){
  if(!mission||!ui)return;
  audio.radio();
  ui.event({type:'subtitle',speaker:'Overwatch',text:mission.text,duration:10});
  if(settings.voice)audio.speak(mission.text,'Overwatch',true);
}

const weaponView=createWeaponView(camera);
const weapon=weaponView.group,flash=weaponView.flash;
const firstPersonBody=createActor('Player',null,{});
firstPersonBody.mesh.name='LocalOperatorLegs';scene.add(firstPersonBody.mesh);
for(const child of firstPersonBody.body.children)child.visible=child===firstPersonBody.rHip||child===firstPersonBody.lHip;
const checkpointOperator=createActor('Player',null,{WeaponName:'PrototypeRifle'});
checkpointOperator.mesh.name='FoundationCheckpointOperator';
checkpointOperator.mesh.position.set(world.spawn.x+5.5,0,-1.45);checkpointOperator.mesh.rotation.y=1.7;
scene.add(checkpointOperator.mesh);
world.colliders.push(new THREE.Box3(new THREE.Vector3(world.spawn.x+5.05,0,-1.8),new THREE.Vector3(world.spawn.x+5.95,1.8,-1.1)));
const atmosphere=createAtmosphere(scene,world,renderer);
// The operator's light remains visible during takedowns after the first-person
// viewmodel is hidden. It catches both intact silhouettes in the dark hall.
const stagedLight=new THREE.SpotLight(0xffedd2,70,14,.95,.8,1);
stagedLight.visible=false;scene.add(stagedLight,stagedLight.target);
let appliedQuality=null,lastShadowCenter=new THREE.Vector3(Infinity,0,0),stepDistance=0;
function applyQuality(){
  if(appliedQuality===settings.quality)return;
  appliedQuality=settings.quality;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,settings.quality==='balanced'?1:1.7));
  renderer.setSize(innerWidth,innerHeight);
  moon.castShadow=settings.quality==='high';
  const resolution=settings.quality==='high'?1024:512;
  flash.shadow.mapSize.set(resolution,resolution);
  if(flash.shadow.map){flash.shadow.map.dispose();flash.shadow.map=null;}
  flash.shadow.needsUpdate=true;atmosphere.setQuality(settings.quality);
}
applyQuality();
// Gameplay owns the single intact victim rig for executions and ordinary death.

function trace(from,to){
  if(!from||!to||fx.length>100)return;
  const geo=new THREE.BufferGeometry().setFromPoints([from.clone(),to.clone()]);
  const mesh=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xc6ad75,transparent:true,opacity:.65}));scene.add(mesh);fx.push({mesh,life:.065,total:.065});
}
function specks(position){
  if(fx.length>90)return;
  for(let i=0;i<4;i++){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.035),new THREE.MeshBasicMaterial({color:0x8e3733,transparent:true}));
    mesh.position.copy(position);scene.add(mesh);fx.push({mesh,life:.3,total:.3,velocity:new THREE.Vector3(Math.random()-.5,Math.random()*.7,Math.random()-.5)});
  }
}

function blocked(position){
  const radius=.29;
  if(position.x<world.minimap.bounds.minX+.6||position.x>world.minimap.bounds.maxX-.6||position.z<world.minimap.bounds.minZ+.6||position.z>world.minimap.bounds.maxZ-.6)return true;
  return world.colliders.some(box=>position.y+1.45>box.min.y&&position.y<box.max.y-.12&&position.x+radius>box.min.x&&position.x-radius<box.max.x&&position.z+radius>box.min.z&&position.z-radius<box.max.z);
}
function movePlayer(dt){
  const from=player.position.clone();
  const forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+touch.forward;
  const right=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.right;
  const moving=Math.hypot(forward,right)>.05;
  const sprint=keys.has('ShiftLeft')&&moving&&!player.crouching&&!aiming&&stamina>0&&!exhausted;
  player.sprinting=sprint;player.moving=moving;
  if(sprint){stamina=Math.max(0,stamina-22*dt);staminaDelay=.85;if(stamina===0)exhausted=true;}
  else{staminaDelay=Math.max(0,staminaDelay-dt);if(staminaDelay===0)stamina=Math.min(100,stamina+17*dt);if(stamina>24)exhausted=false;}
  const speed=player.crouching?2:sprint?5.7:aiming?2.8:4;
  const vector=new THREE.Vector3(Math.cos(yaw)*right-Math.sin(yaw)*forward,0,-Math.sin(yaw)*right-Math.cos(yaw)*forward);
  if(vector.length()>1)vector.normalize();vector.multiplyScalar(speed*dt);
  const next=player.position.clone();next.x+=vector.x;if(!blocked(next))player.position.x=next.x;
  next.copy(player.position);next.z+=vector.z;if(!blocked(next))player.position.z=next.z;
  player.moving=Math.hypot(player.position.x-from.x,player.position.z-from.z)>.0001;
  player.sprinting=sprint&&player.moving;
  verticalVelocity-=15*dt;
  const nextY=Math.max(0,player.position.y+verticalVelocity*dt);
  if(verticalVelocity>0){next.copy(player.position);next.y=nextY;if(blocked(next))verticalVelocity=0;else player.position.y=nextY;}
  else player.position.y=nextY;
  if(player.position.y===0)verticalVelocity=0;
}
function look(dx,dy){yaw-=dx*.0022;pitch=THREE.MathUtils.clamp(pitch-dy*.0022,-1.45,1.45);}
function releaseControls(){keys.clear();firing=false;aiming=false;touch.forward=touch.right=0;player.sprinting=false;}
function lock(){
  if(matchMedia('(pointer: coarse)').matches)return;
  const request=canvas.requestPointerLock?.();request?.catch?.(()=>{});
}
function pause(){
  if(!started||game.state.phase!=='playing')return;
  paused=true;releaseControls();audio.stop();ui.showScreen('pause');document.exitPointerLock?.();
}
function resume(){
  if(game.state.phase!=='playing')return;
  paused=false;ui.showScreen('playing');audio.start();lock();
}
function newRun(force='Nu-7',mode='operative'){
  audio.start();missionDirector.reset();game.start(force,mode);
  started=true;paused=false;player.mode=mode;player.position.copy(world.spawn);player.position.y=0;
  yaw=-Math.PI/2;pitch=0;stamina=100;exhausted=false;verticalVelocity=0;player.crouching=false;
  releaseControls();ui.showScreen('playing');lock();
  announceMission(missionDirector.current());
}
function interact(){
  if(paused||game.state.execution||game.state.phase!=='playing')return;
  if(!nearest)return;
  if(nearest.id==='extraction'&&missionDirector.current()?.targetId!=='extraction'){
    ui.event({type:'notice',text:'OVERWATCH / COMPLETE YOUR FIELD ORDERS BEFORE EXTRACTION',duration:4});return;
  }
  if(!game.interact(nearest.id))ui.event({type:'notice',text:'MOVE CLOSER / CLEAR LINE OF SIGHT REQUIRED',duration:2});
}
ui=createUI({canon,onAction:action=>{
  switch(action.type){
    case'start':newRun(action.value.force,action.value.mode);break;
    case'resume':resume();break;
    case'pause':pause();break;
    case'respawn':game.respawn();player.position.copy(world.spawn);player.position.y=0;player.crouching=false;stamina=100;exhausted=false;verticalVelocity=0;recoil=shotKick=0;releaseControls();resume();announceMission(missionDirector.current());break;
    case'restart':newRun(game.state.force,game.state.mode);break;
    case'settings':Object.assign(settings,action.value);audio.setEnabled(settings.sound);audio.setMix({music:settings.music,voice:settings.voice});applyQuality();break;
    case'interact':interact();break;
    case'reload':if(!paused)game.reload();break;
    case'fire-start':firing=true;break;
    case'fire-stop':firing=false;break;
    case'aim':aiming=!!action.value;break;
    case'move':{
      const {name,active}=action.value;
      if(name==='forward')touch.forward=active?1:0;
      if(name==='backward')touch.forward=active?-1:0;
      if(name==='left')touch.right=active?-1:0;
      if(name==='right')touch.right=active?1:0;
      if(name==='sprint'){if(active)keys.add('ShiftLeft');else keys.delete('ShiftLeft');}
      if(name==='crouch'&&active)player.crouching=!player.crouching;
      break;
    }
    case'look':look(action.value.dx,action.value.dy);break;
  }
}});
ui.showScreen('intro');

document.addEventListener('keydown',event=>{
  if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='Escape'){if(!paused)pause();return;}
  if(event.code==='KeyM'&&started){paused?resume():pause();return;}
  if(paused||game.state.phase!=='playing')return;
  keys.add(event.code);
  if(event.code==='KeyR'&&!event.repeat)game.reload();
  if(event.code==='KeyE'&&!event.repeat)interact();
  if(event.code==='KeyC'&&!event.repeat)player.crouching=!player.crouching;
  if(event.code==='Space'&&player.position.y===0&&!player.crouching)verticalVelocity=5;
});
document.addEventListener('keyup',event=>keys.delete(event.code));
canvas.addEventListener('mousedown',event=>{
  if(paused||!started)return;
  if(document.pointerLockElement!==canvas&&!matchMedia('(pointer: coarse)').matches){lock();return;}
  if(event.button===0)firing=true;if(event.button===2)aiming=true;
});
document.addEventListener('mouseup',event=>{if(event.button===0)firing=false;if(event.button===2)aiming=false;});
document.addEventListener('mousemove',event=>{if(!paused&&document.pointerLockElement===canvas)look(event.movementX,event.movementY);});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&started&&game.state.phase==='playing'&&!paused)pause();});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur',()=>{if(started&&!paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)pause();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function cinematicCamera(dt){
  const ex=game.state.execution;
  const focus=player.position.clone().add(new THREE.Vector3(0,.85,0));
  const facing=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  if(ex){
    focus.lerp(ex.attacker.position.clone().add(new THREE.Vector3(0,.85,0)),.45);
    facing.subVectors(ex.attacker.position,player.position).setY(0).normalize();
  }
  const side=new THREE.Vector3(-facing.z,0,facing.x);
  if(side.length()<.1)side.set(1,0,0);
  const desired=focus.clone().addScaledVector(side,3.3).add(new THREE.Vector3(0,1.8,0)).addScaledVector(facing,-1.5);
  function clampWall(point){
    const delta=point.clone().sub(focus),length=delta.length();
    if(length<.01)return point;
    raycaster.set(focus,delta.normalize());raycaster.near=.03;raycaster.far=length;
    const hit=raycaster.intersectObjects(world.occluders,false)[0];
    return hit?focus.clone().addScaledVector(delta,Math.max(.12,hit.distance-.15)):point;
  }
  const goal=clampWall(desired),interpolated=camera.position.clone().lerp(goal,1-Math.exp(-dt*8));
  camera.position.copy(clampWall(interpolated));camera.lookAt(focus);camera.fov=65;camera.updateProjectionMatrix();
}

let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;runtime+=dt;fps+=((1/dt)-fps)*.03;
  const playing=started&&!paused&&game.state.phase==='playing';
  const previousPosition=player.position.clone();
  if(playing&&!game.state.execution){movePlayer(dt);}
  player.direction.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
  if(started&&(!paused||game.state.phase==='dead'))game.update(dt,player);
  if(!started){
    cameraMode='briefing';camera.position.set(-96,6.2,11);camera.lookAt(-49,3.4,-5);
  }else if(game.state.execution||game.state.phase==='dead'){
    cameraMode=game.state.execution?'execution':'third-person-death';cinematicCamera(dt);
  }else{
    cameraMode='first-person';
    const bob=settings.reducedMotion||!player.moving||!playing?0:Math.sin(runtime*(player.sprinting?13:9))*.025;
    camera.position.copy(player.position).add(new THREE.Vector3(0,player.crouching?1.12:1.6,0));camera.position.y+=bob;
    camera.rotation.set(pitch+recoil,yaw,0,'YXZ');recoil*=Math.exp(-dt*14);
    const targetFov=aiming?canon.Weapon.AimFieldOfView:75;
    camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*12);camera.updateProjectionMatrix();
  }
  weapon.visible=started&&cameraMode==='first-person'&&game.state.phase==='playing';
  stagedLight.visible=cameraMode==='execution'||cameraMode==='third-person-death';
  if(stagedLight.visible){
    stagedLight.position.copy(player.position).add(new THREE.Vector3(.35,.45,.25));
    const contact=game.state.execution?.attacker.position??player.position;
    stagedLight.target.position.copy(contact).add(new THREE.Vector3(0,1.05,0));
    stagedLight.target.updateMatrixWorld();
  }
  if(weapon.visible){
    weaponView.update(dt,{aiming,reloading:game.state.reloading,time:runtime,kick:shotKick,moving:playing&&player.moving?1:0,sprinting:player.sprinting,reducedMotion:settings.reducedMotion,shotAge:runtime-lastShot});
    shotKick*=Math.exp(-dt*16);
  }
  firstPersonBody.mesh.visible=weapon.visible&&pitch<-.4;
  firstPersonBody.mesh.position.copy(player.position);firstPersonBody.mesh.rotation.y=yaw;
  animateActor(firstPersonBody,playing&&player.moving?'Walk':'Idle',runtime,dt,playing&&player.moving);
  animateActor(checkpointOperator,'Guard',runtime,dt,false);
  atmosphere.update(dt,runtime,started?player.position:world.spawn,settings);
  if(player.position.distanceTo(lastShadowCenter)>6){
    lastShadowCenter.copy(player.position);moon.position.copy(player.position).add(new THREE.Vector3(-23,42,18));
    moon.target.position.copy(player.position);moon.target.updateMatrixWorld();
  }
  if(playing){
    stepDistance+=player.position.distanceTo(previousPosition);
    if(player.position.y<.03&&stepDistance>(player.sprinting?1.1:.88)){
      audio.footstep(currentSector?'concrete':'gravel',player.sprinting);stepDistance=0;
    }
    let threat=0;for(const b of game.state.bosses.values())if(b.active&&!b.dead)threat=Math.max(threat,Math.max(0,1-b.position.distanceTo(player.position)/20));
    audio.setTension(Math.max(threat,game.state.execution?.9:0));
  }
  if(playing&&!game.state.execution&&firing&&runtime-lastShot>=canon.Weapon.FireInterval){
    if(game.fire(camera.position,camera.getWorldDirection(new THREE.Vector3()))){
      lastShot=runtime;shotKick=.055;audio.shot();if(!settings.reducedMotion)recoil=Math.min(.025,recoil+.012);
    }
  }
  nearest=null;let nearestDistance=2.75;
  for(const target of world.interactables){const d=Math.hypot(target.position.x-player.position.x,target.position.z-player.position.z);if(d<nearestDistance){nearest=target;nearestDistance=d;}}
  const sector=world.sectors.find(s=>Math.abs(player.position.x-s.center.x)<=s.size.x/2&&Math.abs(player.position.z-s.center.z)<=s.size.z/2);
  if(playing&&sector?.id!==currentSector){currentSector=sector?.id;if(currentSector)missionDirector.observe({type:'sector',id:currentSector});}
  const mission=missionDirector.view(world,game.state);
  marker.visible=started&&!!mission.targetPosition&&!mission.complete;
  if(marker.visible){marker.position.copy(mission.targetPosition);marker.position.y=.27;marker.scale.setScalar(1+Math.sin(runtime*2)*.1);}
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;if(f.velocity)f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.material.opacity=Math.max(0,f.life/f.total);if(f.life<=0){f.mesh.removeFromParent();f.mesh.geometry.dispose();f.mesh.material.dispose();fx.splice(i,1);}}
  world.update?.(dt,runtime);
  ui.update({state:game.state,stamina,maxStamina:100,mission,sector:sector?.name??'FOUNDATION CHECKPOINT / CONNECTING ROUTE',nearestInteraction:playing&&!game.state.execution?nearest:null,aiming,paused,locked:document.pointerLockElement===canvas,fps,settings,player:{position:player.position,yaw},world,hurt:runtime-lastHurt<.25});
  if(lastMode!==cameraMode){lastMode=cameraMode;document.documentElement.dataset.camera=cameraMode;}
  scene.updateMatrixWorld();renderer.render(scene,camera);
}
requestAnimationFrame(frame);

// Query-gated test hooks are absent from normal play and never confer server authority.
if(new URLSearchParams(location.search).has('test')){
  window.__chernobyl={game,world,player,missions:missionDirector,audio,checkpointOperator,renderer,get cameraMode(){return cameraMode;},get stamina(){return stamina;},get paused(){return paused;},settings,
    start:(force='Nu-7',mode='tour')=>newRun(force,mode),
    teleport(position){player.position.set(...position);game.state.playerPosition.copy(player.position);},
    lookAt(position){const delta=new THREE.Vector3(...position).sub(camera.position);yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));},
    setHealth(value){game.state.hp=value;},interact,
  };
}
