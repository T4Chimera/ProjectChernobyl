import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import canon from '../src/canon.js';
import { createGameplay } from '../src/gameplay.js';
import { createActor, disposeActor } from '../src/actors.js';
import { getExecutionClips, getExecutionCues, applyExecutionPose } from '../src/execution-choreography.js';

// Actual Three.js geometry/raycasting and exported game data run headlessly.
// Rendering, pointer lock, browser audio, and full-map navigation need browser tests.
function fixture(t, isolatedEncounters = false) {
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
  if (isolatedEncounters) {
    world.sectors = [{ id: 1, center: new THREE.Vector3(0, 0, -25), size: new THREE.Vector3(40, 6, 40) }];
    world.bossSpawns.Felon.set(0, 0, -20);
    world.bossEncounters = {
      Felon: { sector: 1, prerequisites: ['intake-logs', 'personnel-archive'], activationDistance: 18, leashRadius: 14 },
      Novak: { sector: 1, prerequisites: ['personnel-archive'], requiresBosses: ['Nikolai'], activationDistance: 18, leashRadius: 14 },
    };
    world.bossSpawns.Novak.set(8, 0, -25);
    world.interactables.push(
      { id: 'intake-logs', kind: 'terminal', position: new THREE.Vector3(0, 1, -9) },
      { id: 'personnel-archive', kind: 'terminal', position: new THREE.Vector3(0, 1, -13) },
    );
  }
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

test('NPC soles start on the floor and chase integrates between AI decisions', t => {
  const f = fixture(t);
  for (const actor of [...f.game.state.bosses.values(), ...f.game.state.infected]) {
    assert.equal(actor.position.y, 0, `${actor.id} must not spawn with a hover offset`);
  }
  const infected = f.game.state.infected[0];
  f.tick(2); // Establish the chasing destination at the bounded AI tick.
  const before = infected.position.clone();
  const previousDistance = infected.motion.distance;
  f.game.update(0.02, { position: new THREE.Vector3(), direction: new THREE.Vector3(-1, 0, 0), moving: false });
  const travelled = before.distanceTo(infected.position);
  assert(travelled > 0, 'root advances on a render frame without waiting for another AI tick');
  assert(travelled <= infected.settings.WalkSpeed * 0.25 * 0.02 + 1e-8, 'frame displacement respects walk speed');
  assert.equal(infected.position.y, 0);
  assert(Math.abs(infected.motion.distance - previousDistance - travelled) < 1e-8, 'gait distance tracks actual displacement');
  assert(Math.abs(infected.motion.speed - travelled / 0.02) < 1e-8);
  assert(infected.moving);
});

test('a blocked actor rests instead of advancing a walking cycle in place', t => {
  const f = fixture(t);
  const infected = f.game.state.infected[0];
  const before = infected.position.clone();
  f.world.colliders.push(new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 3, 30)));
  f.tick(4);
  assert(infected.position.equals(before));
  assert.equal(infected.moving, false);
  assert.equal(infected.motion.speed, 0);
  assert.equal(infected.motion.distance, 0);
});

test('distant render culling preserves boss state and authoritative ray hits', t => {
  const f = fixture(t);
  const felon = f.game.state.bosses.get('Felon');
  felon.position.set(0, 0, -70);
  f.game.update(0.01, { position: new THREE.Vector3(), direction: new THREE.Vector3(0, 0, -1), moving: false });
  assert.equal(felon.mesh.visible, false);
  assert.equal(felon.hp, 1500);
  assert(f.game.fire(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 0, -1)));
  assert.equal(felon.hp, 1460, 'omitting visual work must not remove the boss hit geometry');
  assert.equal(f.game.state.deadBosses.size, 0);
});

test('entrance introduces ordinary infected while unique encounters wait for their local mission prerequisites', t => {
  const f = fixture(t, true);
  const felon = f.game.state.bosses.get('Felon');
  const originalHome = felon.home.clone();
  assert.equal(felon.active, false);
  assert.equal(felon.mesh.visible, false);
  f.tick(100);
  assert(felon.position.equals(originalHome), 'dormant bosses do not patrol toward the entrance');
  assert.equal(felon.hp, 1500, 'canonical health remains available for the mission registry');
  assert(f.game.state.infected.some(actor => actor.active && !actor.dead));
  assert(!f.events.some(event => event.speaker === 'Felon'), 'dormant encounters do not announce themselves');

  assert(f.game.fire(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 0, -1)));
  assert.equal(felon.hp, 1500, 'unspawned encounters are excluded from authoritative shot candidates');
  f.setPosition(new THREE.Vector3(0, 0, -9)); f.tick(2);
  assert(f.game.interact('intake-logs'));
  assert.equal(felon.active, false, 'entering the hall and completing only one prerequisite is insufficient');
  f.setPosition(new THREE.Vector3(0, 0, -13)); f.tick(2);
  assert(f.game.interact('personnel-archive'));
  assert.equal(felon.active, true);
  assert.equal(felon.mesh.visible, true);
  assert(f.game.fire(new THREE.Vector3(0, 1.4, -13), new THREE.Vector3(0, 0, -1)));
  assert.equal(felon.hp, 1460, 'the isolated activated encounter accepts normal weapon damage');
  assert.equal(f.game.state.bosses.get('Novak').active, false, 'required preceding boss defeats also gate later encounters');
});

test('activated bosses stay within their encounter hall when the player retreats and activation survives respawn', t => {
  const f = fixture(t, true);
  f.setPosition(new THREE.Vector3(0, 0, -9)); f.tick(2); f.game.interact('intake-logs');
  f.setPosition(new THREE.Vector3(0, 0, -13)); f.tick(2); f.game.interact('personnel-archive');
  const felon = f.game.state.bosses.get('Felon');
  assert(felon.active);
  f.tick(10);
  f.setPosition(new THREE.Vector3(0, 0, -1)); f.tick(200);
  assert(felon.position.z <= -5.6, 'a boss cannot walk out of its hall toward insertion');
  assert(felon.position.distanceTo(felon.home) <= 14 + 1e-8, 'its isolated home leash also applies to each movement step');
  assert.notEqual(felon.target, 'player', 'retreating beyond the hall breaks player pursuit');
  f.game.respawn();
  assert(felon.active, 'player respawn does not rebuild the unique encounter');
  assert.equal(f.game.state.bosses.get('Felon'), felon);
  f.game.start('Nu-7', 'tour');
  assert.equal(f.game.state.bosses.get('Felon').active, false, 'starting a fresh run clears encounter prerequisites');
});

const rigTransforms = rig => ['mesh', 'body', 'head', 'right', 'left', 'rHip', 'lHip'].flatMap(name =>
  [...rig[name].position.toArray(), ...rig[name].quaternion.toArray()]);
function assertSamePose(actual, expected, message) {
  const a = rigTransforms(actual), b = rigTransforms(expected);
  assert(Math.max(...a.map((value, index) => Math.abs(value - b[index]))) < 1e-8, message);
}

test('all twenty executions use the shared performance, deliver cues once, and preserve their final victim pose until respawn', t => {
  const f = fixture(t);
  for (const [bossId, variants] of Object.entries(canon.Executions.Bosses)) {
    for (const [variantIndex, variant] of variants.entries()) {
      f.game.start('Nu-7', 'operative');
      // Keep this encounter isolated while the initial spawn immunity expires.
      for (const actor of [...f.game.state.bosses.values(), ...f.game.state.infected]) actor.active = false;
      f.tick(32);
      const boss = f.game.state.bosses.get(bossId);
      boss.active = true; boss.provoked = true;
      boss.position.set(0, 0, -1); boss.home.copy(boss.position);
      boss.nextAttack = -1; boss.pendingHit = null;
      // Mikoyan remains an encounter in his room; this fixture puts that room
      // around the isolated pair instead of making entry alone hostile.
      f.world.mikoyanRoom.set(new THREE.Vector3(-3, -1, -3), new THREE.Vector3(3, 4, 3));
      f.game.state.hp = 20;
      const eventStart = f.events.length;
      const random = Math.random;
      try {
        Math.random = () => (variantIndex + .5) / variants.length;
        f.tick(2);
      } finally {
        Math.random = random;
      }
      const execution = f.game.state.execution;
      assert(execution, `${variant.Id} did not start`);
      assert.equal(execution.variant, variant.Id);
      const clip = getExecutionClips(canon).find(item => item.id === variant.Id);
      assert.equal(execution.duration, clip.duration);
      assert(execution.duration > variant.Duration, 'gameplay must use the extended prototype choreography duration');
      assert.equal(boss.moving, false);
      assert.equal(boss.moveDestination, null);
      assert(!f.game.fire(new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 0, -1)));
      assert(!f.game.reload());
      const victim = execution.victim.userData.rig;
      const referenceAttacker = createActor(bossId, null, canon.Enemies.Bosses[bossId]);
      const referenceVictim = createActor('Player', null, { WeaponName: 'PrototypeRifle' });
      try {
        let frame = 0;
        while (f.game.state.execution && frame++ < 100) {
          f.tick();
          if (!f.game.state.execution || frame % 3 !== 0) continue;
          applyExecutionPose({ attackerRig: referenceAttacker, victimRig: referenceVictim, variant: clip,
            elapsed: execution.elapsed, origin: execution.origin, heading: execution.heading });
          assertSamePose(boss.rig, referenceAttacker, `${variant.Id} attacker pose was overwritten by locomotion`);
          assertSamePose(victim, referenceVictim, `${variant.Id} victim pose was overwritten`);
          assert(execution.focus.toArray().every(Number.isFinite));
        }
        assert.equal(f.game.state.phase, 'dead', `${variant.Id} did not finish in player death`);
        assert.equal(f.game.state.hp, 0);
        assert.equal(f.game.state.execution, null);
        assert.equal(f.game.state.deathExecution.variant, variant.Id);
        assert.equal(f.game.state.deathExecution.victim, victim.mesh);
        applyExecutionPose({ attackerRig: referenceAttacker, victimRig: referenceVictim, variant: clip,
          elapsed: clip.duration, origin: execution.origin, heading: execution.heading });
        assertSamePose(victim, referenceVictim, `${variant.Id} loses its final victim pose on completion`);
        const finalPose = rigTransforms(victim);
        f.tick(10);
        assert.deepEqual(rigTransforms(victim), finalPose, `${variant.Id} death updates replace the authored final pose`);
        const events = f.events.slice(eventStart);
        const delivered = events.filter(event => event.type === 'execution-cue').map(event => ({
          at: event.at, kind: event.kind, intensity: event.intensity, blood: event.blood, anchor: event.anchor,
        }));
        assert.deepEqual(delivered, getExecutionCues(clip, -.001, clip.duration), `${variant.Id} repeats or loses an execution cue`);
        assert.equal(events.filter(event => event.type === 'death').length, 1);
        assert(!events.some(event => event.type === 'shot' || event.type === 'blood'),
          'execution audio/effects must use the single execution-cue path');
        assert.equal(f.game.state.deadBosses.size, 0, 'player execution must not defeat its attacker');
        f.game.respawn();
        assert.equal(f.game.state.deathExecution, null);
        assert.equal(f.game.state.execution, null);
        assert.equal(victim.mesh.visible, false);
        assert.equal(f.game.state.phase, 'playing');
        assert.equal(f.game.state.hp, 100);
        assert(f.game.state.playerPosition.equals(f.world.spawn));
      } finally {
        disposeActor(referenceAttacker); disposeActor(referenceVictim);
      }
    }
  }
});

test('a narrow passage rejects unsafe execution staging and keeps ordinary melee available', t => {
  const f = fixture(t);
  f.game.start('Nu-7', 'operative');
  for (const actor of [...f.game.state.bosses.values(), ...f.game.state.infected]) actor.active = false;
  f.tick(32);
  // The 1.3m aisle admits normal actor collision capsules but cannot contain
  // the larger fallen-body footprint of any candidate cinematic stage.
  f.world.colliders.push(
    new THREE.Box3(new THREE.Vector3(-100, 0, -100), new THREE.Vector3(-.65, 3, 100)),
    new THREE.Box3(new THREE.Vector3(.65, 0, -100), new THREE.Vector3(100, 3, 100)),
  );
  const boss = f.game.state.bosses.get('Felon');
  boss.active = true; boss.position.set(0, 0, -1); boss.home.copy(boss.position);
  boss.nextAttack = -1; boss.pendingHit = null;
  f.game.state.hp = 20;
  f.tick(2);
  assert.equal(f.game.state.execution, null, 'an unsafe stage must not place actors through aisle walls');
  assert(!f.events.some(event => event.type === 'execution-start'));
  assert(boss.pendingHit?.targetIsPlayer, 'failure to stage should still allow the ordinary melee windup');
  const before = f.game.state.hp;
  f.tick(4);
  assert(f.game.state.hp < before, 'the ordinary melee contact still applies validated damage');
  assert.equal(f.game.state.execution, null);
});
