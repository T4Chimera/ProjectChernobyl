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
  for(const pose of ['Idle','Walk','Guard','Fire','Strike','Idle']){
    for(let i=0;i<20;i++)animateActor(rig,pose,i/60,1/60,pose==='Walk',{speed:pose==='Walk'?1.5:0,distance:i*.025});
    rig.mesh.updateMatrixWorld(true);if(pose==='Strike')continue;
    for(const[hand,grip]of[[rig.rHand,new THREE.Vector3(0,-.23,.06)],[rig.lHand,new THREE.Vector3(0,0,-.63)]])assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(rig.weapon.localToWorld(grip))<.005,`${pose} hand missed grip`);
  }
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
