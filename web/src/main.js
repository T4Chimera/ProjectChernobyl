import * as THREE from 'three';
import canon from './canon.js';
import {createWorld} from './world.js';
import {createGameplay} from './gameplay.js';
import {createUI} from './ui.js';
import {MissionDirector} from './missions.js';
import {createAudio} from './audio.js';
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
scene.background=new THREE.Color(0x080e0d);
scene.fog=new THREE.FogExp2(0x101c18,.009);
scene.add(new THREE.HemisphereLight(0x8da99e,0x27342b,.9));
const moon=new THREE.DirectionalLight(0x9ebcbd,.45);moon.position.set(-50,90,20);scene.add(moon);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.045,260);
camera.rotation.order='YXZ';scene.add(camera);
const world=createWorld(scene,canon);
const audio=createAudio();
const settings={blood:true,subtitles:true,sound:true,reducedMotion:false};
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
  if(event.type==='subtitle'&&settings.sound)audio.speak(event.text,event.speaker);
  if(event.type==='interaction'||event.type==='boss-defeated')missionDirector.observe(event);
  if(event.type==='shot'){trace(event.origin,event.position);if(!event.own)audio.tone(100,.07,'triangle',.15);}
  if(event.type==='blood'&&settings.blood)specks(event.position);
  if(event.type==='hurt'){lastHurt=runtime;audio.hurt();}
  if(event.type==='reload'){reloadStart=runtime;audio.tone(190,.1,'triangle',.3);}
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
  audio.speak(mission.text,'Overwatch',true);
}

const weapon=new THREE.Group();camera.add(weapon);
const gunMat=new THREE.MeshStandardMaterial({color:0x26322d,roughness:.55,metalness:.7});
const darkMat=new THREE.MeshStandardMaterial({color:0x121a16,roughness:.75});
const sleeveMat=new THREE.MeshStandardMaterial({color:0x454d37,roughness:1});
const magazine=new THREE.Group();weapon.add(magazine);
function gunPart(name,size,pos,mat=gunMat,parent=weapon){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.name=name;mesh.position.set(...pos);mesh.castShadow=false;parent.add(mesh);return mesh;
}
gunPart('receiver',[.15,.19,.67],[0,0,0]);
gunPart('handguard',[.14,.16,.54],[0,.01,-.55]);
gunPart('barrel',[.045,.045,.43],[0,.04,-1.02],darkMat);
gunPart('stock',[.14,.21,.42],[0,0,.48],darkMat);
gunPart('grip',[.12,.26,.14],[0,-.2,.18],darkMat).rotation.x=-.2;
gunPart('magazine',[.13,.32,.2],[0,-.25,-.1],darkMat,magazine);
gunPart('front-sight',[.025,.1,.045],[0,.15,-.8],darkMat);
gunPart('rear-sight-left',[.02,.11,.055],[-.045,.15,.07],darkMat);
gunPart('rear-sight-right',[.02,.11,.055],[.045,.15,.07],darkMat);
gunPart('right-sleeve',[.17,.21,.6],[.16,-.22,.4],sleeveMat).rotation.y=-.2;
gunPart('left-sleeve',[.17,.21,.58],[-.16,-.21,-.31],sleeveMat).rotation.y=.25;
const lamp=gunPart('permanent-weapon-lamp',[.11,.11,.23],[.15,.015,-.65],darkMat);
const lens=new THREE.Mesh(new THREE.CircleGeometry(.043,12),new THREE.MeshBasicMaterial({color:0xe1efc5}));lens.position.set(.15,.015,-.77);weapon.add(lens);
const flash=new THREE.SpotLight(0xe3efd0,140,canon.Weapon.FlashlightRange*.55,.5,.65,1);
flash.position.set(.15,.015,-.76);flash.castShadow=true;flash.shadow.mapSize.set(768,768);
flash.shadow.bias=-.00025;weapon.add(flash);
const beamTarget=new THREE.Object3D();beamTarget.position.set(.15,.015,-20);weapon.add(beamTarget);flash.target=beamTarget;
const muzzle=new THREE.Mesh(new THREE.OctahedronGeometry(.075),new THREE.MeshBasicMaterial({color:0xffde97}));muzzle.position.set(0,.04,-1.27);weapon.add(muzzle);muzzle.visible=false;

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
  paused=true;releaseControls();ui.showScreen('pause');document.exitPointerLock?.();
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
    case'settings':Object.assign(settings,action.value);audio.setEnabled(settings.sound);break;
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
  if(weapon.visible){
    const dip=game.state.reloading?Math.sin(Math.min(1,(runtime-reloadStart)/canon.Weapon.ReloadSeconds)*Math.PI):0;
    const aim=aiming?1:0;
    weapon.position.lerp(new THREE.Vector3(.38*(1-aim),-.35+aim*.20-dip*.17,-.58+shotKick),Math.min(1,dt*14));
    weapon.rotation.set(-dip*.25,0,dip*.33);magazine.position.y=-dip*.12;
    muzzle.visible=runtime-lastShot<.045;shotKick*=Math.exp(-dt*16);
    flash.visible=true;
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
  window.__chernobyl={game,world,player,missions:missionDirector,get cameraMode(){return cameraMode;},get stamina(){return stamina;},get paused(){return paused;},settings,
    start:(force='Nu-7',mode='tour')=>newRun(force,mode),
    teleport(position){player.position.set(...position);game.state.playerPosition.copy(player.position);},
    lookAt(position){const delta=new THREE.Vector3(...position).sub(camera.position);yaw=Math.atan2(-delta.x,-delta.z);pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));},
    setHealth(value){game.state.hp=value;},interact,
  };
}
