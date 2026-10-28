import * as THREE from 'three';
import { createActor, animateActor, disposeActor } from './actors.js';

const SCALE = 0.25;
const up = new THREE.Vector3(0, 1, 0);
const validVector = value => value?.isVector3 && [value.x, value.y, value.z].every(Number.isFinite);
const distanceXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const randomItem = array => array[Math.floor(Math.random() * array.length)];

/** Single-player simulation. GitHub Pages does not provide a Roblox/server runtime. */
export function createGameplay({ scene, world, canon, onEvent = () => {} }) {
  const gun = canon.Weapon;
  const enemyConfig = canon.Enemies;
  const state = {
    hp: 100, maxHp: 100, ammo: gun.MagazineSize, reserve: gun.ReserveAmmo,
    reloading: false, force: 'Nu-7', mode: 'operative', phase: 'briefing',
    bosses: new Map(), infected: [], deadBosses: new Set(), execution: null,
    playerPosition: world.spawn.clone(), kills: 0, bossKills: 0,
  };
  let clock = 0, aiAccumulator = 0, nextFire = 0, reloadUntil = 0;
  let lastHurt = -100, immunityUntil = 0, nextPathJob = 0;
  let lastNoise = -100, lastNoisePosition = new THREE.Vector3();
  let playerData = { position: state.playerPosition, direction: new THREE.Vector3(0, 0, -1), moving: false, sprinting: false };
  let records = [], hazards = [], pendingRespawns = [], victimRig = null;
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(), origin = new THREE.Vector3();
  const eye = position => position.clone().addScaledVector(up, 1.35);
  const emit = event => onEvent(event);
  const sceneRoot = new THREE.Group(); sceneRoot.name = 'EncounterActors'; scene.add(sceneRoot);

  function clearLine(from, to, padding = 0.08) {
    const delta = direction.subVectors(to, from);
    const distance = delta.length();
    if (distance < 0.01) return true;
    raycaster.set(from, delta.normalize()); raycaster.near = 0.02; raycaster.far = Math.max(0, distance - padding);
    return raycaster.intersectObjects(world.occluders, false).length === 0;
  }

  function walkable(x, z, radius = 0.3) {
    for (const box of world.colliders) {
      if (box.max.y < 0.38 || box.min.y > 1.6) continue;
      if (x + radius > box.min.x && x - radius < box.max.x && z + radius > box.min.z && z - radius < box.max.z) return false;
    }
    const bounds = world.minimap.bounds;
    return x >= bounds.minX + 0.5 && x <= bounds.maxX - 0.5 && z >= bounds.minZ + 0.5 && z <= bounds.maxZ - 0.5;
  }

  // A bounded grid search is used only when an actor cannot walk straight toward
  // its target. Nodes are cached against the static map; diagonal corner cutting
  // is rejected. One search may begin every 0.12 seconds for the whole simulation.
  const CELL = 1.35, walkCache = new Map();
  const key = (x, z) => `${x},${z}`;
  const cellWalkable = (x, z) => {
    const cell = key(x, z);
    if (!walkCache.has(cell)) walkCache.set(cell, walkable(x * CELL, z * CELL, 0.33));
    return walkCache.get(cell);
  };
  function findPath(start, destination) {
    const sx = Math.round(start.x / CELL), sz = Math.round(start.z / CELL);
    let gx = Math.round(destination.x / CELL), gz = Math.round(destination.z / CELL);
    if (!cellWalkable(gx, gz)) {
      let best = Infinity;
      for (let x = gx - 2; x <= gx + 2; x++) for (let z = gz - 2; z <= gz + 2; z++) {
        const distance = (x * CELL - destination.x) ** 2 + (z * CELL - destination.z) ** 2;
        if (cellWalkable(x, z) && distance < best) { best = distance; gx = x; gz = z; }
      }
    }
    const startKey = key(sx, sz), goalKey = key(gx, gz);
    const open = [{ x: sx, z: sz, g: 0, f: Math.hypot(gx - sx, gz - sz), parent: null }];
    const bestCosts = new Map([[startKey, 0]]);
    let iterations = 0;
    while (open.length && iterations++ < 1100) {
      let nearest = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[nearest].f) nearest = i;
      const current = open.splice(nearest, 1)[0];
      if (key(current.x, current.z) === goalKey) {
        const result = [];
        for (let node = current; node?.parent; node = node.parent) result.unshift(new THREE.Vector3(node.x * CELL, 0, node.z * CELL));
        return result;
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const x = current.x + dx, z = current.z + dz;
        if (!cellWalkable(x, z)) continue;
        if (dx && dz && (!cellWalkable(current.x + dx, current.z) || !cellWalkable(current.x, current.z + dz))) continue;
        const g = current.g + (dx && dz ? 1.414 : 1), id = key(x, z);
        if ((bestCosts.get(id) ?? Infinity) <= g) continue;
        bestCosts.set(id, g);
        open.push({ x, z, g, f: g + Math.hypot(gx - x, gz - z), parent: current });
      }
    }
    return [];
  }

  function speak(record, category) {
    const voices = canon.Voices;
    const voice = voices.Voices[record.id];
    if (!voice || (voice.Proposed && !voices.AllowProposed)) return;
    const lines = voice.Lines[category];
    if (!Array.isArray(lines) || !lines.length) return;
    if (distanceXZ(record.position, state.playerPosition) > voices.MaxDistance * SCALE) return;
    if (clock < (record.voiceTimes[category] || 0) || (category !== 'Execution' && clock < record.voiceBusy)) return;
    const line = randomItem(lines);
    record.voiceTimes[category] = clock + (voices.CategoryCooldowns[category] || voices.DefaultCooldown);
    record.voiceBusy = clock + line.Duration;
    emit({ type: 'subtitle', speaker: record.id, text: line.Text, duration: line.Duration });
  }

  function spawnActor(id, position, ordinaryIndex = null) {
    const definition = canon.Bosses[id];
    const settings = definition ? enemyConfig.Bosses[id] : enemyConfig.Infected;
    const rig = createActor(id, definition, settings);
    rig.mesh.position.copy(position); rig.mesh.position.y = 0.24;
    sceneRoot.add(rig.mesh);
    const record = {
      id, rig, mesh: rig.mesh, position: rig.mesh.position, home: position.clone(),
      hp: definition?.MaxHealth || settings.MaxHealth, maxHp: definition?.MaxHealth || settings.MaxHealth,
      dead: false, settings, boss: !!definition, ordinaryIndex,
      state: id === 'Mikoyan' ? 'Peaceful' : 'Patrol', provoked: false,
      pose: id === 'Mikoyan' ? 'Sit' : 'Idle', poseUntil: 0, target: null,
      lastSeen: -100, lastKnown: null, voiceTimes: {}, voiceBusy: 0,
      nextAttack: clock + 1, nextPuddle: clock + 8, nextNearby: clock + 5 + Math.random() * 9,
      nextPatrol: clock + Math.random() * 4, patrol: position.clone(), nextPath: 0, path: [],
      moving: false, deathAt: null, hairSpawnUntil: clock + 3,
    };
    rig.hitMeshes.forEach(mesh => { mesh.userData.entity = record; });
    records.push(record);
    if (record.boss) state.bosses.set(id, record); else state.infected.push(record);
    return record;
  }

  function kill(record) {
    if (record.dead) return;
    record.dead = true; record.hp = 0; record.deathAt = clock; record.pose = 'Death'; record.state = 'Dead';
    if (state.execution?.record === record) endExecution(false);
    state.kills++;
    if (record.boss) {
      state.deadBosses.add(record.id); state.bossKills = state.deadBosses.size;
      emit({ type: 'boss-defeated', id: record.id });
      speak(record, 'Death');
    } else {
      pendingRespawns.push({ at: clock + enemyConfig.Infected.RespawnSeconds, index: record.ordinaryIndex });
    }
  }

  function damageActor(record, amount, shooterIsPlayer = false) {
    if (record.dead || !Number.isFinite(amount) || amount <= 0) return false;
    record.hp = Math.max(0, record.hp - amount);
    if (shooterIsPlayer) {
      if (record.id !== 'Mikoyan' || world.mikoyanRoom.containsPoint(eye(state.playerPosition))) {
        record.provoked = true;
        record.lastKnown = state.playerPosition.clone(); record.lastSeen = clock;
        record.state = 'Alert';
        speak(record, 'PlayerDetected');
      }
    }
    if (record.hp <= 0) kill(record);
    else {
      if (record.id !== 'Mikoyan' || record.provoked) { record.pose = 'Hit'; record.poseUntil = clock + 0.22; }
      speak(record, 'Damaged');
    }
    return true;
  }

  function hurtPlayer(amount) {
    if (state.phase !== 'playing' || state.mode === 'tour' || state.execution || clock < immunityUntil) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.hp = Math.max(0, state.hp - amount); lastHurt = clock;
    emit({ type: 'hurt', amount });
    if (state.hp <= 0) {
      state.phase = 'dead';
      showVictim();
      emit({ type: 'death' });
    }
  }

  function showVictim() {
    if (!victimRig) { victimRig = createActor('Player', null, { WeaponName: 'PrototypeRifle' }); sceneRoot.add(victimRig.mesh); }
    victimRig.mesh.visible = true; victimRig.mesh.position.copy(state.playerPosition);
    victimRig.mesh.rotation.y = Math.atan2(-playerData.direction.x, -playerData.direction.z);
  }

  function beginExecution(record) {
    const choices = canon.Executions.Bosses[record.id];
    if (!choices?.length || state.execution || state.mode === 'tour' || clock < immunityUntil) return false;
    if (state.hp <= 0 || state.hp > canon.Executions.MaxVictimHealth) return false;
    if (distanceXZ(record.position, state.playerPosition) > canon.Executions.Range * SCALE) return false;
    if (!clearLine(eye(record.position), eye(state.playerPosition))) return false;
    const variant = randomItem(choices);
    showVictim();
    record.mesh.rotation.y = Math.atan2(record.position.x - state.playerPosition.x, record.position.z - state.playerPosition.z);
    victimRig.mesh.rotation.y = Math.atan2(state.playerPosition.x - record.position.x, state.playerPosition.z - record.position.z);
    state.execution = { attacker: record.mesh, variant: variant.Id, duration: variant.Duration, elapsed: 0,
      victim: victimRig.mesh, record, timeline: variant.Beats, beatIndex: 0, victimPose: 'Guard' };
    record.state = 'Executing'; record.moving = false;
    speak(record, 'Execution');
    emit({ type: 'execution-start', variant: variant.Id });
    return true;
  }

  function endExecution(completed) {
    const execution = state.execution;
    if (!execution) return;
    state.execution = null;
    execution.record.pose = execution.record.dead ? 'Death' : 'Idle';
    execution.record.state = execution.record.dead ? 'Dead' : 'Search';
    if (completed && state.phase === 'playing') {
      state.hp = 0; state.phase = 'dead';
      emit({ type: 'death' });
    } else if (victimRig && state.phase !== 'dead') {
      victimRig.mesh.visible = false; immunityUntil = clock + 1;
    }
    emit({ type: 'execution-end', completed });
  }

  function updateExecution(dt) {
    const execution = state.execution;
    if (!execution) return;
    if (execution.record.dead) { endExecution(false); return; }
    execution.elapsed += dt;
    while (execution.beatIndex < execution.timeline.length && execution.elapsed >= execution.timeline[execution.beatIndex].At) {
      const beat = execution.timeline[execution.beatIndex++];
      execution.record.pose = beat.Pose;
      execution.victimPose = beat.VictimPose || execution.victimPose;
      if (beat.Effect === 'Blood') emit({ type: 'blood', position: eye(state.playerPosition).addScaledVector(up, -0.35) });
      if (beat.Effect === 'Shot') emit({ type: 'shot', origin: eye(execution.record.position), position: eye(state.playerPosition), hit: true, own: false });
    }
    animateActor(victimRig, execution.victimPose, clock, dt, false);
    if (execution.elapsed >= execution.duration) endExecution(true);
  }

  function move(record, destination, dt, flee = false) {
    let desired = destination.clone(); desired.y = record.position.y;
    if (record.id === 'Mikoyan') {
      desired.x = THREE.MathUtils.clamp(desired.x, world.mikoyanRoom.min.x + 0.6, world.mikoyanRoom.max.x - 0.6);
      desired.z = THREE.MathUtils.clamp(desired.z, world.mikoyanRoom.min.z + 0.6, world.mikoyanRoom.max.z - 0.6);
    }
    const tether = (record.settings.HomeTether || enemyConfig.HomeTether) * SCALE;
    const fromHome = desired.clone().sub(record.home); fromHome.y = 0;
    if (fromHome.length() > tether) desired.copy(record.home).add(fromHome.setLength(tether));
    let difference = desired.clone().sub(record.position); difference.y = 0;
    if (difference.length() < 0.25) { record.moving = false; return; }
    const stepDistance = record.settings.WalkSpeed * SCALE * dt * (flee ? 1.1 : 1);
    const step = difference.clone().normalize().multiplyScalar(Math.min(stepDistance, difference.length()));
    const directlyWalkable = clearLine(record.position.clone().setY(0.8), desired.clone().setY(0.8), 0.25)
      && walkable(record.position.x + step.x, record.position.z + step.z);
    if (!directlyWalkable) {
      if (clock >= record.nextPath && clock >= nextPathJob) {
        record.path = findPath(record.position, desired);
        record.nextPath = clock + 1.6; nextPathJob = clock + 0.12;
      }
      while (record.path.length && distanceXZ(record.position, record.path[0]) < 0.45) record.path.shift();
      if (record.path.length) {
        difference.subVectors(record.path[0], record.position); difference.y = 0;
        step.copy(difference).normalize().multiplyScalar(Math.min(stepDistance, difference.length()));
      }
    } else record.path = [];
    const before = record.position.clone();
    if (walkable(record.position.x + step.x, record.position.z)) record.position.x += step.x;
    if (walkable(record.position.x, record.position.z + step.z)) record.position.z += step.z;
    record.moving = distanceXZ(before, record.position) > 0.005;
    if (record.moving) {
      const yaw = Math.atan2(-step.x, -step.z);
      record.mesh.rotation.y += Math.atan2(Math.sin(yaw - record.mesh.rotation.y), Math.cos(yaw - record.mesh.rotation.y)) * Math.min(1, dt * 11);
    }
  }

  function addPuddle(record) {
    const settings = enemyConfig.KatyaPuddle;
    if (clock < record.nextPuddle) return;
    record.nextPuddle = clock + settings.Cooldown;
    const material = new THREE.MeshStandardMaterial({ color: 0x9b332f, roughness: 0.5, transparent: true, opacity: 0.48 });
    const part = new THREE.Mesh(new THREE.CylinderGeometry(settings.Radius * SCALE, settings.Radius * SCALE, 0.035, 24), material);
    part.position.copy(state.playerPosition); part.position.y = 0.27;
    sceneRoot.add(part);
    hazards.push({ mesh: part, active: clock + settings.WarningSeconds, expires: clock + settings.WarningSeconds + settings.Lifetime, nextTick: 0 });
    emit({ type: 'hazard', position: part.position.clone(), duration: settings.WarningSeconds });
  }

  function eligible(record) {
    if (state.execution || state.phase !== 'playing') return false;
    if (record.id === 'Mikoyan' && (!record.provoked || !world.mikoyanRoom.containsPoint(eye(state.playerPosition)))) return false;
    return distanceXZ(record.home, state.playerPosition) < (record.settings.HomeTether || enemyConfig.HomeTether) * SCALE;
  }

  function ai(record, dt) {
    if (record.dead || state.execution?.record === record) return;
    record.moving = false;
    if (record.id === 'Mikoyan' && !record.provoked) { record.pose = 'Sit'; record.state = 'Peaceful'; return; }
    let targetPosition = null, targetRecord = null, targetIsPlayer = false;
    const playerDistance = distanceXZ(record.position, state.playerPosition);
    const canTarget = eligible(record);
    const seesPlayer = canTarget && playerDistance <= record.settings.DetectionRange * SCALE
      && clearLine(eye(record.position), eye(state.playerPosition));
    if (seesPlayer) { targetPosition = state.playerPosition; targetIsPlayer = true; }
    if (record.id === 'Felon' && !targetPosition) {
      const infected = state.infected.filter(other => !other.dead && distanceXZ(other.position, record.position) < 9 && clearLine(eye(record.position), eye(other.position)));
      infected.sort((a, b) => distanceXZ(a.position, record.position) - distanceXZ(b.position, record.position));
      if (infected[0]) { targetRecord = infected[0]; targetPosition = targetRecord.position; }
    }
    if (record.id === 'Katya' || record.id === 'Sukhoi') {
      const partner = state.bosses.get(record.id === 'Katya' ? 'Sukhoi' : 'Katya');
      if (partner && !partner.dead && distanceXZ(partner.position, record.position) < enemyConfig.RelationshipRange * SCALE
        && clearLine(eye(record.position), eye(partner.position))) {
        if (record.id === 'Sukhoi' && enemyConfig.KatyaSukhoiResponse === 'Flee') {
          const away = record.position.clone().sub(partner.position).normalize().multiplyScalar(7).add(record.position);
          record.state = 'Flee'; move(record, away, dt, true); return;
        }
        targetRecord = partner; targetPosition = partner.position; targetIsPlayer = false;
      }
    }
    if (record.settings.Partner) {
      const partner = state.bosses.get(record.settings.Partner);
      if (partner && !partner.dead && distanceXZ(partner.position, record.position) < 6) record.recognizedPartner = record.settings.Partner;
    }
    if (targetPosition) {
      if (record.target !== (targetRecord || 'player')) speak(record, 'PlayerDetected');
      record.target = targetRecord || 'player'; record.lastSeen = clock; record.lastKnown = targetPosition.clone();
      record.state = 'Chase';
      const distance = distanceXZ(record.position, targetPosition);
      if (record.id === 'Katya' && targetIsPlayer && distance < 8.5) addPuddle(record);
      const meleeRange = record.settings.MeleeRange * SCALE;
      const ranged = !!record.settings.Ranged && distance > meleeRange;
      const attackRange = ranged ? record.settings.Range * SCALE : meleeRange;
      if (distance <= attackRange && clock >= record.nextAttack) {
        record.nextAttack = clock + record.settings.AttackSeconds;
        record.mesh.rotation.y = Math.atan2(record.position.x - targetPosition.x, record.position.z - targetPosition.z);
        if (!ranged && record.boss && targetIsPlayer && beginExecution(record)) return;
        record.pose = ranged ? 'Fire' : 'Attack'; record.poseUntil = clock + 0.55; record.state = 'Attack';
        const damage = ranged ? record.settings.Damage : (record.settings.MeleeDamage || record.settings.Damage);
        if (ranged) {
          emit({ type: 'shot', origin: eye(record.position), position: eye(targetPosition), hit: true, own: false });
          if (targetIsPlayer) hurtPlayer(damage); else damageActor(targetRecord, damage);
        } else {
          // Recheck range/cover after a visible wind-up; moving away can evade it.
          record.pendingHit = { at: clock + 0.3, targetRecord, targetIsPlayer, damage };
        }
      }
      if (distance > (ranged ? Math.min(attackRange * 0.7, 12) : meleeRange * 0.76)) move(record, targetPosition, dt);
    } else {
      if (record.target) { speak(record, 'LostTarget'); record.target = null; }
      let heard = null;
      if (canTarget) {
        const hearing = (playerData.sprinting ? enemyConfig.SprintHearingDistance : enemyConfig.HearingDistance) * SCALE;
        if (playerData.moving && playerDistance < hearing) heard = state.playerPosition;
        if (clock - lastNoise < 1.5 && distanceXZ(record.position, lastNoisePosition) < enemyConfig.GunHearingDistance * SCALE) heard = lastNoisePosition;
      }
      if (heard) { record.lastKnown = heard.clone(); record.lastSeen = clock - 1; record.state = 'Investigate'; }
      if (record.lastKnown && clock - record.lastSeen < enemyConfig.SearchSeconds) {
        record.state = 'Search'; move(record, record.lastKnown, dt);
      } else if (distanceXZ(record.position, record.home) > 2.5) {
        record.state = 'Return'; move(record, record.home, dt);
      } else {
        record.state = record.id === 'Mikoyan' ? 'Peaceful' : 'Patrol';
        if (record.id === 'Mikoyan') record.pose = 'Sit';
        else {
          if (clock >= record.nextPatrol) {
            record.nextPatrol = clock + 5 + Math.random() * 4;
            record.patrol = record.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
          }
          move(record, record.patrol, dt);
        }
      }
    }
    if (record.rig.hair) record.rig.hair.material.color.setHex(clock < record.hairSpawnUntil || ['Alert', 'Chase', 'Attack', 'Executing'].includes(record.state) ? 0x0b0d0e : 0xcbb46c);
    if (record.boss && clock >= record.nextNearby) { record.nextNearby = clock + 13 + Math.random() * 8; speak(record, 'Nearby'); }
  }

  function populate() {
    for (const [id, position] of Object.entries(world.bossSpawns)) spawnActor(id, position);
    world.infectedSpawns.forEach((position, index) => spawnActor('Infected', position, index));
  }

  function reset() {
    if (state.execution) endExecution(false);
    records.forEach(record => disposeActor(record.rig));
    hazards.forEach(hazard => { hazard.mesh.removeFromParent(); hazard.mesh.geometry.dispose(); hazard.mesh.material.dispose(); });
    if (victimRig) { disposeActor(victimRig); victimRig = null; }
    records = []; hazards = []; pendingRespawns = []; state.bosses.clear(); state.infected = [];
    state.deadBosses.clear(); state.kills = 0; state.bossKills = 0; state.execution = null;
    state.hp = 100; state.ammo = gun.MagazineSize; state.reserve = gun.ReserveAmmo; state.reloading = false;
    state.phase = 'briefing'; clock = 0; nextFire = 0; reloadUntil = 0; immunityUntil = 0;
    lastHurt = -100; lastNoise = -100; nextPathJob = 0; aiAccumulator = 0;
    state.playerPosition.copy(world.spawn);
    populate();
  }

  function start(force, mode = 'operative') {
    reset(); state.force = canon.Game.TaskForces.includes(force) ? force : 'Nu-7';
    state.mode = mode === 'tour' ? 'tour' : 'operative'; state.phase = 'playing'; immunityUntil = clock + 3;
    return state;
  }

  function fire(from, aim) {
    if (state.phase !== 'playing' || state.execution || state.reloading || state.ammo <= 0 || clock < nextFire) return false;
    if (!validVector(from) || !validVector(aim) || aim.lengthSq() < 0.8 || aim.lengthSq() > 1.2) return false;
    nextFire = clock + gun.FireInterval; state.ammo--;
    lastNoise = clock; lastNoisePosition.copy(state.playerPosition);
    scene.updateMatrixWorld(true);
    raycaster.set(from, aim.clone().normalize()); raycaster.near = 0.02; raycaster.far = gun.Range * SCALE;
    const candidates = world.occluders.concat(records.filter(record => !record.dead).flatMap(record => record.rig.hitMeshes));
    const hits = raycaster.intersectObjects(candidates, false);
    const first = hits[0];
    let didHit = false;
    if (first?.object.userData.entity) {
      didHit = damageActor(first.object.userData.entity, gun.Damage, true);
      if (didHit) emit({ type: 'blood', position: first.point.clone() });
    }
    emit({ type: 'shot', origin: from.clone(), position: first?.point.clone() || from.clone().addScaledVector(aim, gun.Range * SCALE), hit: didHit, own: true });
    return true;
  }

  function reload() {
    if (state.phase !== 'playing' || state.execution || state.reloading || state.reserve <= 0 || state.ammo >= gun.MagazineSize) return false;
    state.reloading = true; reloadUntil = clock + gun.ReloadSeconds;
    emit({ type: 'reload' }); return true;
  }

  function interact(id) {
    if (state.phase !== 'playing' || state.execution) return false;
    const target = world.interactables.find(item => item.id === id);
    if (!target || distanceXZ(target.position, state.playerPosition) > 2.8) return false;
    if (!clearLine(eye(state.playerPosition), target.position.clone().setY(Math.max(0.9, target.position.y)), 0.65)) return false;
    if (target.kind === 'supply') {
      state.ammo = gun.MagazineSize; state.reserve = gun.ReserveAmmo;
      state.reloading = false; reloadUntil = 0;
      emit({ type: 'resupply' });
    }
    emit({ type: 'interaction', id }); return true;
  }

  function respawn() {
    if (state.execution) endExecution(false);
    state.hp = 100; state.ammo = gun.MagazineSize; state.reserve = gun.ReserveAmmo;
    state.reloading = false; reloadUntil = 0; state.phase = 'playing'; immunityUntil = clock + 3;
    state.playerPosition.copy(world.spawn); lastHurt = clock;
    if (victimRig) victimRig.mesh.visible = false;
    // Actor defeat state and caller-owned mission progress intentionally survive.
    return state.playerPosition.clone();
  }

  function update(dt, player) {
    dt = Math.max(0, Math.min(dt, 0.1));
    if (player) {
      playerData = player;
      if (!state.execution && state.phase === 'playing') state.playerPosition.copy(player.position);
    }
    clock += dt;
    if (state.phase === 'playing') {
      if (state.reloading && clock >= reloadUntil) {
        const transferred = Math.min(gun.MagazineSize - state.ammo, state.reserve);
        state.ammo += transferred; state.reserve -= transferred; state.reloading = false; reloadUntil = 0;
        emit({ type: 'reload-complete' });
      }
      if (!state.execution && clock - lastHurt > 6 && state.hp < 100) state.hp = Math.min(100, state.hp + dt * 1.5);
      if (state.execution) updateExecution(dt);
      for (const record of records) if (record.pendingHit && clock >= record.pendingHit.at) {
        const hit = record.pendingHit; record.pendingHit = null;
        if (record.dead || state.execution?.record === record) continue;
        const target = hit.targetIsPlayer ? state.playerPosition : hit.targetRecord.position;
        if (hit.targetIsPlayer ? !eligible(record) : hit.targetRecord.dead) continue;
        if (distanceXZ(record.position, target) > record.settings.MeleeRange * SCALE + 0.2 || !clearLine(eye(record.position), eye(target))) continue;
        const previousHp = hit.targetIsPlayer ? state.hp : hit.targetRecord.hp;
        if (hit.targetIsPlayer) hurtPlayer(hit.damage); else damageActor(hit.targetRecord, hit.damage);
        if ((hit.targetIsPlayer ? state.hp : hit.targetRecord.hp) < previousHp) speak(record, 'MeleeHit');
      }
      aiAccumulator += dt;
      if (aiAccumulator >= 0.16) {
        const tick = aiAccumulator; aiAccumulator = 0;
        // Actors outside the active vicinity remain in their fixed encounter area.
        for (const record of records) if (!record.dead && distanceXZ(record.position, state.playerPosition) < 48) ai(record, tick);
      }
      for (let i = pendingRespawns.length - 1; i >= 0; i--) if (clock >= pendingRespawns[i].at) {
        const ticket = pendingRespawns.splice(i, 1)[0];
        // A regular infected respawns at one of the existing configured points.
        // Avoid materializing directly beside the player.
        const options = world.infectedSpawns.filter(position => distanceXZ(position, state.playerPosition) > 7);
        const position = options.length ? randomItem(options) : world.infectedSpawns[ticket.index];
        spawnActor('Infected', position, ticket.index);
      }
      for (let i = hazards.length - 1; i >= 0; i--) {
        const hazard = hazards[i];
        if (clock >= hazard.expires) {
          hazard.mesh.removeFromParent(); hazard.mesh.geometry.dispose(); hazard.mesh.material.dispose(); hazards.splice(i, 1); continue;
        }
        if (clock >= hazard.active) {
          hazard.mesh.material.color.setHex(0x0c1112); hazard.mesh.material.opacity = 0.87;
          if (clock >= hazard.nextTick && distanceXZ(hazard.mesh.position, state.playerPosition) <= enemyConfig.KatyaPuddle.Radius * SCALE) {
            hazard.nextTick = clock + enemyConfig.KatyaPuddle.TickSeconds; hurtPlayer(enemyConfig.KatyaPuddle.Damage);
          }
        } else hazard.mesh.material.opacity = 0.35 + Math.sin(clock * 10) * 0.13;
      }
    }
    for (const record of records) {
      if (record.dead && record.deathAt !== null && clock - record.deathAt > enemyConfig.CorpseSeconds) {
        if (!record.disposed) { disposeActor(record.rig); record.disposed = true; }
        continue;
      }
      let pose = record.dead ? 'Death' : record.pose;
      if (!record.dead && state.execution?.record !== record && clock >= record.poseUntil && record.pose !== 'Sit') pose = record.moving ? 'Walk' : 'Idle';
      if (record.id === 'Mikoyan' && record.state === 'Peaceful') pose = 'Sit';
      animateActor(record.rig, pose, clock, dt, record.moving);
      if (record.rig.tag) record.rig.tag.visible = !record.dead && distanceXZ(record.position, state.playerPosition) < 24;
    }
    records = records.filter(record => !(record.disposed && !record.boss));
    state.infected = state.infected.filter(record => !record.disposed);
    if (victimRig && state.phase === 'dead') animateActor(victimRig, 'Death', clock, dt);
  }

  function dispose() {
    records.forEach(record => disposeActor(record.rig));
    hazards.forEach(hazard => { hazard.mesh.geometry.dispose(); hazard.mesh.material.dispose(); });
    if (victimRig) disposeActor(victimRig);
    sceneRoot.removeFromParent(); records = []; hazards = [];
  }

  populate();
  return { state, start, update, fire, reload, interact, respawn, reset, dispose };
}
