import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import canon from '../src/canon.js';
import { createGameplay } from '../src/gameplay.js';

// Actual Three.js geometry/raycasting and exported game data run headlessly.
// Rendering, pointer lock, browser audio, and full-map navigation need browser tests.
function fixture(t) {
  const scene = new THREE.Scene();
  const events = [];
  const bossSpawns = Object.fromEntries(Object.keys(canon.Bosses).map((id, index) => [id, new THREE.Vector3(40 + index * 5, 0, 40)]));
  bossSpawns.Felon.set(0, 0, -5);
  bossSpawns.Mikoyan.set(-10, 0, -5);
  const world = {
    spawn: new THREE.Vector3(), colliders: [], occluders: [],
    minimap: { bounds: { minX: -120, maxX: 120, minZ: -80, maxZ: 100 } },
    bossSpawns, infectedSpawns: [new THREE.Vector3(8, 0, 0)],
    mikoyanRoom: new THREE.Box3(new THREE.Vector3(-13, -1, -8), new THREE.Vector3(-7, 4, -2)),
    interactables: [{ id: 'supply-checkpoint', kind: 'supply', position: new THREE.Vector3(1, 0, 0) }],
  };
  const game = createGameplay({ scene, world, canon, onEvent: event => events.push(event) });
  t.after(() => game.dispose());
  game.start('Nu-7', 'tour');
  let position = new THREE.Vector3();
  const tick = (count = 1) => {
    for (let index = 0; index < count; index++) {
      game.update(0.1, { position, direction: new THREE.Vector3(0, 0, -1), moving: false, sprinting: false });
    }
  };
  return { game, scene, world, events, tick, setPosition: value => { position = value; } };
}

test('raycast damage, fire cadence, reload conservation, and boss defeat persist through respawn', t => {
  const f = fixture(t);
  assert.equal(f.game.state.bosses.size, 8);
  assert.equal(f.game.state.bosses.get('Katya').hp, 12000);
  assert.equal(f.game.state.infected.length, 1);
  const origin = new THREE.Vector3(0, 1.4, 0);
  const aim = new THREE.Vector3(0, 0, -1);
  let felonDisposals = 0;
  f.game.state.bosses.get('Felon').rig.hitMeshes[0].geometry.addEventListener('dispose', () => felonDisposals++);
  assert(f.game.fire(origin, aim));
  assert.equal(f.game.state.ammo, 29);
  assert.equal(f.game.state.bosses.get('Felon').hp, 1460);
  assert(!f.game.fire(origin, aim));
  assert.equal(f.game.state.ammo, 29);
  assert(f.game.reload());
  assert(!f.game.fire(origin, aim));
  f.tick(21);
  assert.equal(f.game.state.ammo, 30);
  assert.equal(f.game.state.reserve, 239);

  for (let index = 0; index < 100 && !f.game.state.deadBosses.has('Felon'); index++) {
    f.game.interact('supply-checkpoint');
    f.game.fire(origin, aim);
    f.tick(2);
  }
  assert(f.game.state.deadBosses.has('Felon'));
  const count = f.game.state.bosses.size;
  f.game.respawn();
  f.tick(300);
  assert.equal(f.game.state.bosses.size, count);
  assert(f.game.state.bosses.get('Felon').dead);
  assert(f.game.state.deadBosses.has('Felon'));
  assert.equal(f.game.state.hp, 100, 'tour mode prevents enemy damage');
  assert.equal(felonDisposals, 1, 'a defeated boss corpse releases geometry while its encounter record persists');
  f.game.start('Nu-7');
  assert(!f.game.state.deadBosses.has('Felon'), 'a new run creates fresh unique encounters');
  assert.equal(felonDisposals, 1, 'starting a new run must not release an expired boss corpse twice');
});

test('Mikoyan is provoked only by a shot made from inside his room', t => {
  const f = fixture(t);
  const mikoyan = f.game.state.bosses.get('Mikoyan');
  assert(f.game.fire(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(-10, 0, -5).normalize()));
  assert.equal(mikoyan.provoked, false);
  f.setPosition(new THREE.Vector3(-10, 0, -3));
  f.tick(2);
  assert.equal(mikoyan.provoked, false, 'entering the room alone remains peaceful');
  assert(f.game.fire(new THREE.Vector3(-10, 1.4, -3), new THREE.Vector3(0, 0, -1)));
  assert.equal(mikoyan.provoked, true);
});

test('ordinary infected respawn independently of unique boss state', t => {
  const f = fixture(t);
  const direction = new THREE.Vector3(1, 0, 0);
  const origin = new THREE.Vector3(0, 1.4, 0);
  for (let index = 0; index < 3; index++) {
    assert(f.game.fire(origin, direction));
    f.tick(2);
  }
  assert(f.game.state.infected.every(actor => actor.dead));
  f.tick(250);
  assert(f.game.state.infected.some(actor => !actor.dead));
});

test('repeated ordinary respawns release corpses once and keep retained actors bounded', t => {
  const f = fixture(t);
  const origin = new THREE.Vector3(0, 1.4, 0);
  const direction = new THREE.Vector3(1, 0, 0);
  const disposed = [];
  for (let cycle = 0; cycle < 5; cycle++) {
    const infected = f.game.state.infected.find(actor => !actor.dead);
    assert(infected, `cycle ${cycle} has its respawned infected`);
    let disposalCount = 0;
    infected.rig.hitMeshes[0].geometry.addEventListener('dispose', () => disposalCount++);
    disposed.push(() => disposalCount);
    f.game.interact('supply-checkpoint');
    for (let shot = 0; shot < 4 && !infected.dead; shot++) {
      assert(f.game.fire(origin, direction));
      f.tick(2);
    }
    assert(infected.dead);
    f.tick(60); // The corpse expires before its replacement is allowed to spawn.
    assert.equal(f.game.state.infected.length, 0, 'expired ordinary records leave the public actor array');
    assert.equal(disposalCount, 1, 'corpse geometry is released exactly once');
    assert.equal(f.scene.getObjectByName('EncounterActors').children.length, 8, 'only the eight unique bosses remain');
    f.tick(190);
    assert.equal(f.game.state.infected.length, 1, 'exactly one replacement is retained per configured spawn');
    assert.equal(f.game.state.bosses.size, 8, 'unique boss bookkeeping is retained');
  }
  f.game.reset();
  for (const count of disposed) assert.equal(count(), 1, 'reset must not release a retired corpse twice');
  assert.equal(f.game.state.infected.length, 1);
});

test('execution stages intact third-person actors, blocks fire, completes death, and releases on respawn', t => {
  const f = fixture(t);
  f.game.start('Nu-7', 'operative');
  f.tick(32); // Let the initial spawn immunity expire.
  const boss = f.game.state.bosses.get('Felon');
  boss.position.set(0, 0.24, -1);
  boss.nextAttack = -1;
  boss.pendingHit = null;
  f.game.state.hp = 20;
  f.tick(2);
  assert(f.game.state.execution);
  assert(f.game.state.execution.attacker.isGroup);
  assert(f.game.state.execution.victim.isGroup);
  assert(!f.game.fire(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 0, -1)));
  f.tick(40);
  assert.equal(f.game.state.phase, 'dead');
  assert.equal(f.game.state.hp, 0);
  assert.equal(f.game.state.execution, null);
  f.game.respawn();
  assert.equal(f.game.state.phase, 'playing');
  assert.equal(f.game.state.hp, 100);
});
