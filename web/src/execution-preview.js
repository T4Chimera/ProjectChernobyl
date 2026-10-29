import * as THREE from 'three';
import {createActor,disposeActor} from './actors.js';
import {getExecutionClips,applyExecutionPose,getExecutionCues} from './execution-choreography.js';
import {createBloodEffects} from './blood-effects.js';
import './execution-preview.css';

export function createExecutionPreview({renderer,canon,audio,settings={},onClose=()=>{},standalone=false}){
  const clips=getExecutionClips(canon),scene=new THREE.Scene();scene.background=new THREE.Color(0x171e26);scene.fog=new THREE.Fog(0x171e26,20,42);
  const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,100);
  scene.add(new THREE.HemisphereLight(0xd2e3ef,0x55504b,1.8));
  const key=new THREE.DirectionalLight(0xffedda,3.2);key.position.set(-4,7,4);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:22});key.shadow.normalBias=.025;scene.add(key);
  const rim=new THREE.DirectionalLight(0x8fbde2,1.2);rim.position.set(3,4,-4);scene.add(rim);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(24,.2,24),new THREE.MeshStandardMaterial({color:0x777f82,roughness:.91,metalness:.04}));plate.position.y=-.1;plate.receiveShadow=true;scene.add(plate);
  const grid=new THREE.GridHelper(24,48,0x607178,0x899397);grid.position.y=.003;grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
  const boundary=new THREE.Mesh(new THREE.BoxGeometry(5,2.8,.22),new THREE.MeshStandardMaterial({color:0x525d65,roughness:.9}));boundary.position.set(0,1.4,-3.1);boundary.castShadow=boundary.receiveShadow=true;scene.add(boundary);
  const blood=createBloodEffects(scene),origin=new THREE.Vector3();
  const ui=document.createElement('section');ui.className='execution-preview';ui.hidden=true;ui.setAttribute('aria-label','Execution animation viewer');
  ui.innerHTML=`<header><h1>EXECUTION REVIEW<small>PROJECT CHERNOBYL · R6 ANIMATION BASEPLATE</small></h1><button type="button" data-lab="close">${standalone?'RESET VIEW':'RETURN TO GAME'}</button></header>
    <div class="lab-badge">20 VARIANTS / 8 BOSSES<br>DRAG TO ORBIT · SCROLL TO ZOOM</div><div class="lab-stage" aria-label="Drag to orbit the baseplate"></div>
    <div class="lab-controls"><div class="lab-selectors"><label><span>BOSS</span><select data-lab="boss" aria-label="Boss"></select></label><label><span>ANIMATION</span><select data-lab="variant" aria-label="Execution animation"></select></label></div>
    <div class="lab-timeline"><input type="range" data-lab="timeline" aria-label="Animation time" min="0" step=".01" value="0"><output data-lab="time">0.00 / 0.00</output></div>
    <div class="lab-transport"><button type="button" data-lab="play">PAUSE</button><button type="button" data-lab="replay">REPLAY</button><label><span>SPEED</span><select data-lab="speed" aria-label="Playback speed"><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1" selected>1×</option></select></label><label><input type="checkbox" data-lab="loop"><span>LOOP</span></label><span class="lab-status" data-lab="status">READY</span></div>
    <p class="lab-note">Intact-body staged animations · limited blood · character voice recordings pending. Scrubbing is silent.</p></div>`;
  document.body.append(ui);
  const ref=name=>ui.querySelector(`[data-lab="${name}"]`),bossSelect=ref('boss'),variantSelect=ref('variant'),timeline=ref('timeline'),timeText=ref('time'),playButton=ref('play'),status=ref('status');
  for(const bossId of new Set(clips.map(c=>c.bossId))){const option=document.createElement('option');option.value=bossId;option.textContent=bossId;bossSelect.append(option);}
  let active=false,clip=clips[0],attacker=null,victim=null,time=0,playing=true,speed=1,loop=false,azimuth=1.25,elevation=.22,distance=7.5,focus=new THREE.Vector3(0,1,0),pointer=null,lastPointer=null;
  const listeners=[];const listen=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);listeners.push(()=>target.removeEventListener(type,fn,opts));};
  function resetView(){azimuth=1.25;elevation=.22;distance=7.5;}
  function populateVariants(id){variantSelect.replaceChildren();for(const c of clips.filter(c=>c.bossId===id)){const o=document.createElement('option');o.value=c.id;o.textContent=c.label;variantSelect.append(o);}}
  function setClip(id){
    const next=clips.find(c=>c.id===id);if(!next)return false;
    audio.stop();audio.start();
    if(attacker)disposeActor(attacker);if(victim)disposeActor(victim);
    clip=next;attacker=createActor(clip.bossId,canon.Bosses[clip.bossId],canon.Enemies.Bosses[clip.bossId]);victim=createActor('Player',null,{WeaponName:'PrototypeRifle'});
    scene.add(attacker.mesh,victim.mesh);if(attacker.tag)attacker.tag.visible=false;
    bossSelect.value=clip.bossId;populateVariants(clip.bossId);variantSelect.value=clip.id;
    time=0;playing=true;timeline.max=clip.duration;blood.clear();drawPose();sync();return true;
  }
  function drawPose(){const result=applyExecutionPose({attackerRig:attacker,victimRig:victim,variant:clip,elapsed:time,origin,heading:0});focus.copy(result.focus);if(attacker.tag)attacker.tag.visible=false;return result;}
  function sync(){timeline.value=time;timeText.textContent=`${time.toFixed(2)} / ${clip.duration.toFixed(2)} s`;playButton.textContent=playing?'PAUSE':'PLAY';status.textContent=time>=clip.duration?'COMPLETE':playing?'PLAYING':'PAUSED';}
  function emitCues(from,to){
    for(const cue of getExecutionCues(clip,from,to)){
      const rig=cue.anchor==='attacker'?attacker:victim;
      const position=rig.torso.getWorldPosition(new THREE.Vector3());
      if(settings.sound!==false)audio.executionCue(cue.kind,{position,intensity:cue.intensity??1,indoor:false,own:cue.kind==='gunshot'});
      if(cue.blood&&settings.blood!==false)blood.emit(position,Math.min(.8,cue.intensity??1));
    }
  }
  listen(bossSelect,'change',()=>setClip(clips.find(c=>c.bossId===bossSelect.value).id));listen(variantSelect,'change',()=>setClip(variantSelect.value));
  listen(playButton,'click',()=>{if(time>=clip.duration){time=0;blood.clear();}playing=!playing;if(playing)audio.start();else audio.stop();sync();});
  listen(ref('replay'),'click',()=>{audio.stop();audio.start();time=0;playing=true;blood.clear();drawPose();sync();});
  listen(ref('speed'),'change',()=>speed=Number(ref('speed').value));listen(ref('loop'),'change',()=>loop=ref('loop').checked);
  listen(timeline,'input',()=>{playing=false;audio.stop();time=Number(timeline.value);blood.clear();drawPose();sync();});
  listen(ref('close'),'click',()=>{if(standalone){resetView();audio.stop();audio.start();time=0;playing=true;drawPose();sync();}else close();});
  const stage=ui.querySelector('.lab-stage');
  listen(stage,'pointerdown',e=>{pointer=e.pointerId;lastPointer=[e.clientX,e.clientY];stage.setPointerCapture(e.pointerId);});
  listen(stage,'pointermove',e=>{if(pointer!==e.pointerId)return;azimuth-=(e.clientX-lastPointer[0])*.008;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-lastPointer[1])*.004,-.08,.8);lastPointer=[e.clientX,e.clientY];});
  const release=()=>{pointer=null;lastPointer=null;};listen(stage,'pointerup',release);listen(stage,'pointercancel',release);
  listen(stage,'wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.006,3.5,13);},{passive:false});
  listen(document,'keydown',e=>{if(!active)return;if(e.code==='Escape'&&!standalone){e.preventDefault();e.stopImmediatePropagation();close();}if(e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();if(time>=clip.duration){time=0;blood.clear();}playing=!playing;if(playing)audio.start();else audio.stop();sync();}},true);
  function open(id=clip.id){active=true;ui.hidden=false;document.body.classList.add('execution-preview-open');audio.start();setClip(id);resetView();}
  function close(){if(!active)return;active=false;playing=false;ui.hidden=true;document.body.classList.remove('execution-preview-open');blood.clear();onClose();}
  return {scene,camera,clips,open,close,setClip,
    get isActive(){return active;},get currentClip(){return clip;},get elapsed(){return time;},
    seek(value){time=THREE.MathUtils.clamp(value,0,clip.duration);playing=false;audio.stop();blood.clear();drawPose();sync();},
    update(dt){
      if(!active)return;
      if(playing){const previous=time;time=Math.min(clip.duration,time+dt*speed);drawPose();emitCues(previous===0?-.001:previous,time);if(time>=clip.duration){if(loop){time=0;blood.clear();}else playing=false;}}
      else drawPose();blood.update(dt);sync();
      const target=focus.clone();target.y=Math.max(.65,target.y);
      camera.aspect=innerWidth/innerHeight;camera.position.copy(target).add(new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance+1,Math.cos(azimuth)*Math.cos(elevation)*distance));camera.lookAt(target);camera.updateProjectionMatrix();
      audio.setListener(camera.position,new THREE.Vector3().subVectors(target,camera.position).normalize());scene.updateMatrixWorld(true);renderer.render(scene,camera);
    },
    dispose(){listeners.forEach(fn=>fn());if(attacker)disposeActor(attacker);if(victim)disposeActor(victim);blood.dispose();scene.traverse(o=>{if(o.isMesh&&!o.userData.entity){o.geometry?.dispose();if(!Array.isArray(o.material))o.material?.dispose();}});ui.remove();}
  };
}
