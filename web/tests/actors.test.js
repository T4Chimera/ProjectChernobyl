import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createActor, animateActor, disposeActor } from '../src/actors.js';
import canon from '../src/canon.js';

function bootBounds(rig) {
  rig.mesh.updateMatrixWorld(true);
  return ['RightBoot', 'LeftBoot'].map(name => new THREE.Box3().setFromObject(rig.mesh.getObjectByName(name)));
}

test('every articulated character stands with soles on the root ground plane', () => {
  for (const id of ['Player', ...Object.keys(canon.Bosses), 'Infected']) {
    const rig = createActor(id, null, canon.Enemies.Bosses[id] || {});
    for (let i = 0; i < 30; i++) animateActor(rig, 'Idle', i / 60, 1 / 60, false);
    for (const bounds of bootBounds(rig)) assert.ok(Math.abs(bounds.min.y) < .02, `${id} boot y=${bounds.min.y}`);
    assert.ok(rig.rElbow && rig.lElbow && rig.rKnee && rig.lKnee && rig.rFoot && rig.lFoot);
    assert.ok(rig.hitMeshes.length < 65, `${id} accessory geometry was not batched`);
    disposeActor(rig);
  }
});

test('walk uses actual distance, alternates planted feet and flexes the knees', () => {
  const rig = createActor('Player', null, { WeaponName: 'PrototypeRifle' });
  let rightSwings = 0, leftSwings = 0, planted = 0;
  for (let i = 0; i < 120; i++) {
    const distance = i * .025;
    rig.mesh.position.z = -distance;
    animateActor(rig, 'Walk', i / 60, 1 / 60, true, { speed: 1.5, distance });
    const [right, left] = bootBounds(rig);
    assert.ok(right.min.y > -.025 && left.min.y > -.025, 'walking feet penetrated ground');
    if (right.min.y > .07) rightSwings++;
    if (left.min.y > .07) leftSwings++;
    if (Math.min(right.min.y, left.min.y) < .025) planted++;
    assert.ok(rig.rKnee.rotation.x < -.05 && rig.lKnee.rotation.x < -.05, 'knees are rigid');
  }
  assert.ok(rightSwings > 10 && leftSwings > 10, 'feet did not alternate swings');
  assert.ok(planted > 105, 'stance foot does not stay grounded');
  for (let i = 0; i < 90; i++) animateActor(rig, 'Idle', 3 + i / 60, 1 / 60, false, { speed: 0, distance: 2.975 });
  for (const bounds of bootBounds(rig)) assert.ok(Math.abs(bounds.min.y) < .01, 'stopped foot failed to settle');
  disposeActor(rig);
});

test('the stance boot stays planted in world space throughout a forward step', () => {
  const rig = createActor('Player', null, { WeaponName: 'PrototypeRifle' });
  for(let i=0;i<90;i++)animateActor(rig,'Walk',i/60,1/60,true,{speed:1.5,distance:0});
  let plantedZ=null;
  for(let i=0;i<=32;i++) {
    const distance=.1+i*.01;
    rig.mesh.position.z=-distance;
    animateActor(rig,'Walk',2+i/60,1/60,true,{speed:1.5,distance});
    rig.mesh.updateMatrixWorld(true);
    const boot=rig.mesh.getObjectByName('RightBoot');
    const position=boot.getWorldPosition(new THREE.Vector3());
    const sole=new THREE.Box3().setFromObject(boot).min.y;
    if(plantedZ===null)plantedZ=position.z;
    assert.ok(Math.abs(position.z-plantedZ)<.005,'stance boot slid with the body');
    assert.ok(Math.abs(sole)<.006,`stance sole left the ground: ${sole}`);
  }
  disposeActor(rig);
});

test('armed idle, walking and firing keep both gloves on the rifle grips', () => {
  const rig=createActor('Player',null,{WeaponName:'PrototypeRifle'});
  for(const pose of ['Idle','Walk','Guard','Fire','Strike','Idle']){
    for(let i=0;i<20;i++)animateActor(rig,pose,i/60,1/60,pose==='Walk',{speed:pose==='Walk'?1.5:0,distance:i*.025});
    rig.mesh.updateMatrixWorld(true);
    if(pose==='Strike')continue;
    for(const[elbow,grip]of[[rig.rElbow,new THREE.Vector3(0,-.23,.06)],[rig.lElbow,new THREE.Vector3(0,0,-.63)]]){
      const glove=elbow.localToWorld(new THREE.Vector3(0,-.34,-.012));
      const target=rig.weapon.localToWorld(grip);
      assert.ok(glove.distanceTo(target)<.025,`${pose} hand missed rifle grip`);
    }
  }
  disposeActor(rig);
});

test('canonical silhouettes retain masks, silent hood figures, hair material and intact execution poses', () => {
  const nikolai = createActor('Nikolai', null, { WeaponName: 'Axe' });
  const novak = createActor('Novak', null, { WeaponName: 'Katana' });
  assert.ok(nikolai.mesh.getObjectByName('PermanentFaceRectangle'));
  assert.ok(novak.mesh.getObjectByName('PermanentFaceRectangle'));
  disposeActor(nikolai); disposeActor(novak);
  for (const id of ['Felon', 'Sukhoi', 'Mikoyan', 'Katya']) {
    const rig = createActor(id, null, canon.Enemies.Bosses[id]);
    const count = rig.hitMeshes.length;
    if (id === 'Katya') assert.ok(rig.hair?.material && !rig.mesh.getObjectByName('TacticalVest'));
    if (id === 'Sukhoi') assert.ok(rig.jaw && rig.appendages.length === 3);
    const poses = new Set(canon.Executions.Bosses[id].flatMap(variant => variant.Beats.flatMap(beat => [beat.Pose, beat.VictimPose]).filter(Boolean)));
    for (const pose of poses) {
      for (let i = 0; i < 6; i++) animateActor(rig, pose, i / 30, 1 / 30, false);
      const bounds = new THREE.Box3().setFromObject(rig.mesh);
      assert.ok(Number.isFinite(bounds.min.y) && Number.isFinite(bounds.max.y));
      assert.equal(rig.hitMeshes.length, count, 'execution altered body topology');
    }
    disposeActor(rig);
  }
});
