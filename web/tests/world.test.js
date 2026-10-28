import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import canon from '../src/canon.js';
import {createWorld} from '../src/world.js';
import {createGameplay} from '../src/gameplay.js';
import {MISSIONS} from '../src/missions.js';

test('six connected sector definitions contain every mission interaction',()=>{
  const world=createWorld(new THREE.Scene(),canon);
  assert.equal(world.sectors.length,6);
  const ids=new Set(world.interactables.map(t=>t.id));
  for(const mission of MISSIONS)if(mission.targetId)assert.ok(ids.has(mission.targetId),mission.targetId);
  assert.equal(ids.size,world.interactables.length);
  for(const p of [world.spawn,...Object.values(world.bossSpawns),...world.infectedSpawns]){
    assert.ok(!world.colliders.some(b=>b.max.y>.38&&b.min.y<1.6&&p.x+.3>b.min.x&&p.x-.3<b.max.x&&p.z+.3>b.min.z&&p.z-.3<b.max.z),'spawn intersects a wall');
  }
});

test('every supply and mission object accepts a real nearby unobstructed interaction',()=>{
  const scene=new THREE.Scene(),world=createWorld(scene,canon),game=createGameplay({scene,world,canon});
  game.start('Nu-7','tour');scene.updateMatrixWorld(true);
  for(const target of world.interactables){
    let accepted=false;
    for(const radius of [1.4,1.9,2.4])for(let i=0;i<16&&!accepted;i++){
      const p=new THREE.Vector3(target.position.x+Math.cos(i*Math.PI/8)*radius,0,target.position.z+Math.sin(i*Math.PI/8)*radius);
      if(world.colliders.some(b=>b.max.y>.38&&b.min.y<1.6&&p.x+.3>b.min.x&&p.x-.3<b.max.x&&p.z+.3>b.min.z&&p.z-.3<b.max.z))continue;
      game.update(.001,{position:p,direction:new THREE.Vector3(0,0,-1),moving:false,sprinting:false});
      accepted=game.interact(target.id);
    }
    assert.ok(accepted,`Interaction unusable: ${target.id}`);
  }
  game.dispose();
});
