import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {createActor,animateActor,disposeActor} from '../src/actors.js';
import canon from '../src/canon.js';
const PARTS=['Head','Left Arm','Left Leg','Right Arm','Right Leg','Torso'];
function boots(rig){rig.mesh.updateMatrixWorld(true);return ['RightBoot','LeftBoot'].map(name=>new THREE.Box3().setFromObject(rig.mesh.getObjectByName(name)));}

test('all figures use six rigid classic R6 parts, canonical proportions and grounded soles',()=>{
  for(const id of ['Player',...Object.keys(canon.Bosses),'Infected']){
    const rig=createActor(id,null,canon.Enemies.Bosses[id]||{});
    for(let i=0;i<30;i++)animateActor(rig,'Idle',i/60,1/60,false);
    assert.equal(rig.rigType,'R6');
    assert.deepEqual(Object.keys(rig.primaryParts).sort(),PARTS);
    const jointNames=[];rig.mesh.traverse(object=>{if(object.userData.motor6D)jointNames.push(object.name);});
    assert.deepEqual(jointNames.sort(),['Left Hip','Left Shoulder','Neck','Right Hip','Right Shoulder','RootJoint']);
    for(const name of ['Right Arm','Left Arm','Right Leg','Left Leg'])assert.deepEqual(rig.primaryParts[name].userData.sizeStuds,[1,2,1]);
    assert.deepEqual(rig.torso.userData.sizeStuds,[2,2,1]);
    assert.ok(!rig.mesh.getObjectByName('RightElbow')&&!rig.mesh.getObjectByName('RightKnee'),'R15 hinges survived R6 conversion');
    for(const bounds of boots(rig))assert.ok(Math.abs(bounds.min.y)<.003,`${id} idle sole left ground: ${bounds.min.y}`);
    assert.ok(rig.hitMeshes.length<75,`${id} equipment was not batched`);
    disposeActor(rig);
  }
});

test('R6 walking alternates rigid leg swings without tunnelling and settles when movement stops',()=>{
  const rig=createActor('Player',null,{WeaponName:'PrototypeRifle'});
  let rightSwings=0,leftSwings=0,planted=0;
  for(let i=0;i<160;i++){
    const distance=i*.025;rig.mesh.position.z=-distance;
    animateActor(rig,'Walk',i/60,1/60,true,{speed:1.5,distance});
    const[right,left]=boots(rig);
    assert.ok(right.min.y>-.002&&left.min.y>-.002,'sole passed through floor');
    if(right.min.y>.07)rightSwings++;if(left.min.y>.07)leftSwings++;
    if(Math.min(right.min.y,left.min.y)<.003)planted++;
    assert.deepEqual(rig.primaryParts['Right Leg'].scale.toArray(),[1,1,1],'rigid leg stretched');
  }
  assert.ok(rightSwings>15&&leftSwings>15);assert.ok(planted>155);
  for(let i=0;i<90;i++)animateActor(rig,'Idle',4+i/60,1/60,false,{speed:0,distance:3.975});
  for(const bound of boots(rig))assert.ok(Math.abs(bound.min.y)<.003);
  assert.ok(Math.abs(rig.rHip.rotation.x)<.001&&Math.abs(rig.lHip.rotation.x)<.001);
  disposeActor(rig);
});

test('classic R6 Motor6D translation keeps the stance boot planted in world space',()=>{
  const rig=createActor('Player',null,{});
  for(let i=0;i<100;i++)animateActor(rig,'Walk',i/60,1/60,true,{speed:1.5,distance:0});
  let plantedZ=null;
  for(let i=0;i<=35;i++){
    const distance=.1+i*.01;rig.mesh.position.z=-distance;
    animateActor(rig,'Walk',2+i/60,1/60,true,{speed:1.5,distance});
    rig.mesh.updateMatrixWorld(true);
    const boot=rig.mesh.getObjectByName('RightBoot'),position=boot.getWorldPosition(new THREE.Vector3());
    if(plantedZ===null)plantedZ=position.z;
    assert.ok(Math.abs(position.z-plantedZ)<.012,`stance boot slid ${position.z-plantedZ}`);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(boot).min.y)<.003);
  }
  disposeActor(rig);
});

test('rigid R6 arms retain both rifle grip contacts through idle, walking and firing',()=>{
  const rig=createActor('Player',null,{WeaponName:'PrototypeRifle'});
  for(const pose of ['Idle','Walk','Run','Guard','Fire','Strike','Idle']){
    const moving=['Walk','Run'].includes(pose),speed=pose==='Run'?5.7:1.5;
    for(let i=0;i<20;i++)animateActor(rig,pose,i/60,1/60,moving,{speed:moving?speed:0,distance:i*speed/60});
    rig.mesh.updateMatrixWorld(true);if(pose==='Strike')continue;
    for(const[hand,grip]of[[rig.rHand,new THREE.Vector3(0,-.23,.06)],[rig.lHand,new THREE.Vector3(0,0,-.63)]])assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(rig.weapon.localToWorld(grip))<.005,`${pose} hand missed grip`);
  }
  disposeActor(rig);
});

function gaitSample(id,speed,sprinting){
  const rig=createActor(id,null,{}),sample={minSwing:Infinity,maxSwing:-Infinity,clearance:0,leftClearance:0,contacts:0};
  for(let i=0;i<240;i++){
    const distance=i*speed/60;rig.mesh.position.z=-distance;
    animateActor(rig,'Walk',i/60,1/60,true,{speed,distance,sprinting});
    const[right,left]=boots(rig);
    assert.ok(Math.min(right.min.y,left.min.y)>-.002,`${id} moving sole tunnelled`);
    if(Math.min(right.min.y,left.min.y)<.006)sample.contacts++;
    if(i<60)continue;
    sample.minSwing=Math.min(sample.minSwing,rig.rHip.rotation.x);
    sample.maxSwing=Math.max(sample.maxSwing,rig.rHip.rotation.x);
    sample.clearance=Math.max(sample.clearance,right.min.y);sample.leftClearance=Math.max(sample.leftClearance,left.min.y);
    for(const name of ['Torso','Right Arm','Left Arm','Right Leg','Left Leg'])assert.deepEqual(rig.primaryParts[name].scale.toArray(),[1,1,1],`${name} stretched during gait`);
  }
  Object.assign(sample,{swing:sample.maxSwing-sample.minSwing,phase:rig.locomotion.phase,stride:rig.locomotion.stride,lean:rig.body.rotation.x,runBlend:rig.locomotion.runBlend});
  disposeActor(rig);return sample;
}

test('sprinting visibly lengthens rigid leg swings and foot clearance with a faster distance-driven cadence',()=>{
  const walk=gaitSample('Player',1.5,false),run=gaitSample('Player',5.7,true);
  assert.ok(run.swing>walk.swing*1.7,`sprint swing ${run.swing} barely exceeds walk ${walk.swing}`);
  assert.ok(run.clearance>.28&&run.clearance>walk.clearance*2,'sprint has no visible foot recovery');
  assert.ok(run.stride>walk.stride*2&&run.phase>walk.phase*1.5,'speed did not change stride and cadence');
  assert.ok(run.lean>walk.lean+.1&&run.runBlend>.99,'sprint has no forward weight transfer');
  assert.equal(run.contacts,240,'grounded runner hovered between steps');
});

test('infected run with two genuine unequal recovery steps and a hunched upper body',()=>{
  const sample=gaitSample('Infected',4.8,undefined);
  assert.ok(sample.runBlend>.99,'fast chase did not infer running');
  assert.ok(sample.swing>1.2&&sample.clearance>.28&&sample.leftClearance>.19,'infected legs barely moved');
  assert.ok(sample.clearance>sample.leftClearance*1.25,'infected lost uneven recovery');
  assert.ok(sample.lean>.3,'infected lost hunched chase posture');
  assert.equal(sample.contacts,240,'infected hovered instead of stepping');
});

test('phase follows horizontal travel, stays continuous across sprint changes and freezes in the air or at rest',()=>{
  const rig=createActor('Player',null,{});
  for(let i=0;i<120;i++){
    const distance=i*.04;rig.mesh.position.z=-distance;
    const phase=rig.locomotion.phase;
    animateActor(rig,'Walk',i/60,1/60,true,{speed:2.4,distance,sprinting:i>60});
    assert.ok(rig.locomotion.phase>=phase&&rig.locomotion.phase-phase<.3,'stride change rewound or jumped phase');
  }
  const phase=rig.locomotion.phase;
  for(let i=0;i<90;i++){
    rig.mesh.position.y=.5+Math.sin(i/90*Math.PI);
    animateActor(rig,'Run',3+i/60,1/60,true,{speed:5.7,distance:4.76,grounded:false});
    assert.equal(rig.locomotion.phase,phase,'air time drove a planted-foot cycle');
    assert.equal(rig.locomotion.grounded,false);
  }
  rig.mesh.position.y=0;
  for(let i=0;i<120;i++)animateActor(rig,'Idle',5+i/60,1/60,false,{speed:0,distance:4.76,grounded:true});
  assert.equal(rig.locomotion.phase,phase);
  assert.ok(rig.gaitBlend<.001&&rig.locomotion.runBlend<.001);
  for(const bounds of boots(rig))assert.ok(Math.abs(bounds.min.y)<.003,'resting foot remained raised');
  assert.ok(Math.abs(rig.rHip.rotation.x)<.001&&Math.abs(rig.lHip.rotation.x)<.001);
  disposeActor(rig);
});

test('support feet remain planted while the RootJoint shifts weight and the actor turns',()=>{
  const rig=createActor('Player',null,{});
  let anchor=null,weightMin=Infinity,weightMax=-Infinity;
  for(let i=0;i<28;i++){
    const distance=.08+i*.013;rig.mesh.position.z=-distance;rig.mesh.rotation.y=i*.006;
    animateActor(rig,'Walk',i/60,1/60,true,{speed:1.5,distance,heading:0,sprinting:false});
    rig.mesh.updateMatrixWorld(true);
    const center=rig.mesh.getObjectByName('RightBoot').getWorldPosition(new THREE.Vector3());
    if(!anchor)anchor=center.clone();
    assert.ok(Math.hypot(center.x-anchor.x,center.z-anchor.z)<.003,'support boot slid during body counterrotation');
    weightMin=Math.min(weightMin,rig.body.position.x);weightMax=Math.max(weightMax,rig.body.position.x);
  }
  assert.ok(weightMax-weightMin>.008,'body never transferred weight over its support leg');
  disposeActor(rig);
});

test('R6 equipment preserves canonical silhouettes and all intact execution poses',()=>{
  const player=createActor('Player',null,{});
  const helmetNames=[];player.mesh.traverse(o=>{helmetNames.push(o.name,...(o.userData.partNames||[]));});
  for(const name of ['HelmetShell','FoldedOpticTube','BallisticGoggleLens','MicrophoneTip','CarrierMolleLoop'])assert.ok(helmetNames.includes(name),`missing reference detail ${name}`);
  disposeActor(player);
  for(const id of Object.keys(canon.Bosses)){
    const rig=createActor(id,null,canon.Enemies.Bosses[id]),count=rig.hitMeshes.length;
    if(['Nikolai','Novak'].includes(id))assert.ok(rig.mesh.getObjectByName('PermanentFaceRectangle'));
    if(id==='Katya')assert.ok(rig.hair?.material);
    if(id==='Sukhoi')assert.ok(rig.jaw&&rig.appendages.length===3);
    const poses=new Set(canon.Executions.Bosses[id].flatMap(v=>v.Beats.flatMap(b=>[b.Pose,b.VictimPose]).filter(Boolean)));
    for(const pose of poses){
      for(let i=0;i<8;i++)animateActor(rig,pose,i/30,1/30,false);
      const bounds=new THREE.Box3().setFromObject(rig.mesh);
      assert.ok(Number.isFinite(bounds.min.y)&&Number.isFinite(bounds.max.y));
      assert.equal(rig.hitMeshes.length,count,'execution changed intact topology');
      assert.equal(Object.keys(rig.primaryParts).length,6);
    }
    disposeActor(rig);
  }
});
