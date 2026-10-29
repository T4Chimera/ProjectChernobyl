import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import canon from '../src/canon.js';
import { createWorld } from '../src/world.js';
import { createGameplay } from '../src/gameplay.js';
import { MISSIONS } from '../src/missions.js';

test('the real six-sector layout has reachable isolated encounters in Overwatch order', t => {
  const scene = new THREE.Scene();
  const world = createWorld(scene, canon);
  const game = createGameplay({ scene, world, canon });
  t.after(() => game.dispose());
  game.start('Nu-7', 'tour');
  scene.updateMatrixWorld(true);
  const player = { position: world.spawn.clone(), direction: new THREE.Vector3(1, 0, 0), moving: false, sprinting: false };
  const setPosition = (position, dt = 0.001) => {
    player.position.copy(position);
    game.update(dt, player);
  };
  const free = position => !world.colliders.some(box => box.max.y > 0.38 && box.min.y < 1.6
    && position.x + 0.36 > box.min.x && position.x - 0.36 < box.max.x
    && position.z + 0.36 > box.min.z && position.z - 0.36 < box.max.z);

  function interactActual(id) {
    const target = world.interactables.find(item => item.id === id);
    assert(target, `configured prerequisite ${id} has a real map object`);
    for (const radius of [1.4, 1.9, 2.4]) for (let index = 0; index < 16; index++) {
      const position = new THREE.Vector3(target.position.x + Math.cos(index * Math.PI / 8) * radius, 0,
        target.position.z + Math.sin(index * Math.PI / 8) * radius);
      if (!free(position)) continue;
      setPosition(position);
      if (game.interact(id)) return;
    }
    assert.fail(`prerequisite ${id} has no reachable unobstructed interaction point`);
  }

  setPosition(world.spawn);
  const orderedBosses = MISSIONS.filter(mission => mission.type === 'boss').map(mission => mission.bossId);
  assert.deepEqual(orderedBosses, Object.keys(world.bossEncounters));
  for (const id of orderedBosses) {
    const boss = game.state.bosses.get(id);
    assert.equal(boss.active, false, `${id} waits at insertion`);
    assert.equal(boss.mesh.visible, false);
    assert(boss.home.distanceTo(world.spawn) > 40, `${id} is isolated from the entrance`);
  }
  assert(game.state.infected.some(actor => actor.active && actor.home.distanceTo(world.spawn) < 25),
    'ordinary infected introduce combat before the first boss');
  assert.equal(game.state.bosses.get('Mikoyan').state, 'Peaceful');

  for (const id of orderedBosses) {
    const encounter = world.bossEncounters[id];
    const boss = game.state.bosses.get(id);
    assert(free(boss.home), `${id} has a valid grounded spawn`);
    for (const prerequisite of encounter.prerequisites) interactActual(prerequisite);
    assert(encounter.requiresBosses?.every(required => game.state.deadBosses.has(required)) ?? true);
    // Use an actual collision-free position near this encounter; prerequisites
    // alone must not require spawning a boss back at the entrance.
    const approach = [3, 5, 7].flatMap(radius => Array.from({ length: 16 }, (_, index) =>
      boss.home.clone().add(new THREE.Vector3(Math.cos(index * Math.PI / 8) * radius, 0, Math.sin(index * Math.PI / 8) * radius))))
      .find(position => free(position) && world.sectors.some(sector => sector.id === encounter.sector
        && Math.abs(position.x - sector.center.x) < sector.size.x / 2 - 0.6
        && Math.abs(position.z - sector.center.z) < sector.size.z / 2 - 0.6));
    assert(approach, `${id} has a reachable local approach`);
    setPosition(approach);
    assert.equal(boss.active, true, `${id} activates after its reachable local prerequisites and prior defeats`);
    assert.equal(boss.hp, canon.Bosses[id].MaxHealth, `${id} retains canonical health`);

    // This is an activation/order audit. Record the authoritative prerequisite
    // defeat as a fixture; damage, real raycasts and corpse persistence are
    // separately exercised by gameplay.test.js.
    boss.dead = true; boss.hp = 0;
    game.state.deadBosses.add(id);
  }
  game.respawn();
  for (const id of orderedBosses) assert(game.state.bosses.get(id).dead, `${id} stays defeated after player respawn`);
  assert.equal(game.state.bosses.get('Mikoyan').provoked, false);
});
