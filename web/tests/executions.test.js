import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import canon from '../src/canon.js';
import { createActor, disposeActor } from '../src/actors.js';
import {
  getExecutionClips, sampleExecution, applyExecutionPose, getExecutionCues,
} from '../src/execution-choreography.js';

const joints = ['head', 'right', 'left', 'rHip', 'lHip'];
const clips = () => getExecutionClips(canon);
const numbers = sample => ['attacker', 'victim'].flatMap(role => {
  const actor = sample[role];
  return [...actor.position, ...actor.rotation, ...actor.body.position,
    ...actor.body.rotation, ...joints.flatMap(joint => actor[joint])];
});
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

test('the review library preserves all twenty canonical IDs, source timings and configuration', () => {
  const before = JSON.stringify(canon);
  const expected = Object.entries(canon.Executions.Bosses).flatMap(([bossId, variants]) =>
    variants.map(variant => ({ bossId, id: variant.Id, duration: variant.Duration })));
  const library = clips();
  assert.equal(library.length, 20);
  assert.equal(new Set(library.map(clip => clip.id)).size, 20);
  for (const variant of expected) {
    const clip = library.find(item => item.id === variant.id);
    assert(clip, `missing ${variant.id}`);
    assert.equal(clip.bossId, variant.bossId);
    assert.equal(clip.sourceDuration, variant.duration);
    assert(clip.duration >= clip.sourceDuration, 'prototype extensions must retain source timing metadata');
    assert(clip.label.length > 0);
    assert(clip.beats.length > 0);
    assert(clip.keyframes.length >= 3, `${clip.id} needs continuous authored motion`);
  }
  assert.equal(JSON.stringify(canon), before, 'building the library must not rewrite exported canon');
});

test('each paired performance has deterministic, distinct root and joint trajectories', () => {
  const signatures = new Set();
  for (const clip of clips()) {
    const samples = Array.from({ length: 61 }, (_, i) => sampleExecution(clip, clip.duration * i / 60));
    for (const [i, sample] of samples.entries()) {
      assert(numbers(sample).every(Number.isFinite), `${clip.id} sample ${i} contains an invalid transform`);
      assert.deepEqual(sampleExecution(clip.id, clip.duration * i / 60), sample,
        'ID and clip sampling must give the same deterministic result');
    }
    for (const role of ['attacker', 'victim']) {
      const rootTravel = samples.slice(1).reduce((sum, sample, i) =>
        sum + distance(sample[role].position, samples[i][role].position), 0);
      assert(rootTravel > .05, `${clip.id} ${role} root remains static`);
      const jointMotion = samples.slice(1).reduce((sum, sample, i) => sum + joints.reduce((total, joint) =>
        total + distance(sample[role][joint], samples[i][role][joint]), 0), 0);
      assert(jointMotion > .35, `${clip.id} ${role} lacks an articulated performance`);
    }
    const signature = samples.filter((_, i) => i % 5 === 0).flatMap(numbers).map(value => value.toFixed(3)).join(',');
    assert(!signatures.has(signature), `${clip.id} duplicates another performance`);
    signatures.add(signature);
    assert.deepEqual(sampleExecution(clip, -10), sampleExecution(clip, 0), 'negative time clamps to the start');
    assert.deepEqual(sampleExecution(clip, clip.duration + 10), sampleExecution(clip, clip.duration),
      'completed performances retain their final pose');
  }
});

test('interpolation remains continuous through every authored keyframe and at render-frame cadence', () => {
  for (const clip of clips()) {
    for (const keyframe of clip.keyframes) {
      const at = keyframe.at ?? keyframe.time;
      assert(Number.isFinite(at), `${clip.id} has a keyframe without a time`);
      const before = numbers(sampleExecution(clip, Math.max(0, at - .00001)));
      const after = numbers(sampleExecution(clip, Math.min(clip.duration, at + .00001)));
      assert(distance(before, after) < .02, `${clip.id} snaps at ${at}s`);
    }
    let previous = numbers(sampleExecution(clip, 0));
    for (let time = 1 / 120; time <= clip.duration; time += 1 / 120) {
      const next = numbers(sampleExecution(clip, time));
      assert(Math.max(...next.map((value, i) => Math.abs(value - previous[i]))) < .7,
        `${clip.id} makes a discontinuous transform jump at ${time}s`);
      previous = next;
    }
  }
});

test('application keeps intact rigid R6 bodies above the floor at arbitrary staging headings', () => {
  const origin = new THREE.Vector3(13, .4, -7);
  const heading = .83;
  for (const clip of clips()) {
    const attacker = createActor(clip.bossId, null, canon.Enemies.Bosses[clip.bossId]);
    const victim = createActor('Player', null, { WeaponName: 'PrototypeRifle' });
    const parents = [attacker, victim].map(rig => Object.values(rig.primaryParts).map(part => part.parent));
    const bindScales = [attacker, victim].map(rig => Object.values(rig.primaryParts).map(part => part.scale.toArray()));
    try {
      for (let i = 0; i <= 8; i++) {
        const result = applyExecutionPose({ attackerRig: attacker, victimRig: victim, variant: clip,
          elapsed: clip.duration * i / 8, origin, heading });
        assert(result.focus.isVector3 && result.attackerPosition.isVector3 && result.victimPosition.isVector3);
        assert(result.attackerPosition.distanceTo(attacker.mesh.position) < 1e-8);
        assert(result.victimPosition.distanceTo(victim.mesh.position) < 1e-8);
        assert.equal(typeof result.cutaway, 'boolean');
        for (const [index, rig] of [attacker, victim].entries()) {
          rig.mesh.updateMatrixWorld(true);
          assert.equal(Object.keys(rig.primaryParts).length, 6, `${clip.id} changes body topology`);
          for (const [partIndex, part] of Object.values(rig.primaryParts).entries()) {
            assert.equal(part.parent, parents[index][partIndex], `${clip.id} detaches a body part`);
            assert.deepEqual(part.scale.toArray(), bindScales[index][partIndex], `${clip.id} stretches a rigid R6 body part`);
            const bounds = new THREE.Box3().setFromObject(part);
            assert(bounds.min.y >= origin.y - .025, `${clip.id} ${rig.id} ${part.name} passes through the floor (${bounds.min.y})`);
          }
        }
      }
      const arrayOrigin = applyExecutionPose({ attackerRig: attacker, victimRig: victim, variant: clip.id,
        elapsed: clip.duration, origin: origin.toArray(), heading });
      assert(arrayOrigin.focus.toArray().every(Number.isFinite));
    } finally {
      disposeActor(attacker); disposeActor(victim);
    }
  }
});

test('cue crossings survive skipped frames and emit exactly once while time advances', () => {
  const kinds = new Set(['impact', 'thud', 'whoosh', 'grab', 'cloth-tear', 'slice', 'pain', 'scream', 'gunshot']);
  for (const clip of clips()) {
    const expected = getExecutionCues(clip, -.001, clip.duration);
    assert(expected.length > 0, `${clip.id} has no synchronized effects`);
    assert(expected.some(cue => cue.kind === 'pain' || cue.kind === 'scream'), `${clip.id} has no victim reaction`);
    assert(expected.some(cue => ['impact', 'thud', 'slice', 'gunshot'].includes(cue.kind)), `${clip.id} has no contact effect`);
    for (const cue of expected) {
      assert(kinds.has(cue.kind), `unhandled effect ${cue.kind}`);
      assert(cue.at >= 0 && cue.at <= clip.duration);
      assert(cue.intensity > 0 && cue.intensity <= 1);
      assert(['attacker', 'victim'].includes(cue.anchor));
    }
    const emitted = [];
    let previous = -.001;
    for (let time = 0; time < clip.duration; time += .113) {
      emitted.push(...getExecutionCues(clip.id, previous, time));
      assert.deepEqual(getExecutionCues(clip, time, time), [], 'a paused frame must not replay audio or blood');
      previous = time;
    }
    emitted.push(...getExecutionCues(clip, previous, clip.duration));
    assert.deepEqual(emitted, expected, `${clip.id} loses or repeats a cue across render frames`);
    assert.deepEqual(getExecutionCues(clip, clip.duration, clip.duration + 10), []);
  }
});

test('staged grabs maintain the declared hand contact on the moving victim', () => {
  let verified = 0;
  for (const clip of clips()) {
    const attacker = createActor(clip.bossId, null, canon.Enemies.Bosses[clip.bossId]);
    const victim = createActor('Player', null, {});
    try {
      for (let i = 0; i <= 60; i++) {
        const time = clip.duration * i / 60;
        const contacts = (sampleExecution(clip, time).contacts || []).filter(contact => contact.weight > .99);
        if (!contacts.length) continue;
        applyExecutionPose({ attackerRig: attacker, victimRig: victim, variant: clip,
          elapsed: time, origin: [4, 0, -3], heading: -.57 });
        attacker.mesh.updateMatrixWorld(true); victim.mesh.updateMatrixWorld(true);
        for (const contact of contacts) {
          assert.equal(contact.actor, 'attacker'); assert.equal(contact.targetActor, 'victim');
          const hand = contact.hand === 'left' ? attacker.lHand : attacker.rHand;
          const target = victim.body.localToWorld(new THREE.Vector3(...contact.target));
          const error = hand.getWorldPosition(new THREE.Vector3()).distanceTo(target);
          assert(error <= .16, `${clip.id} ${contact.hand} grip misses the moving victim by ${error}m`);
          verified++;
        }
      }
    } finally {
      disposeActor(attacker); disposeActor(victim);
    }
  }
  assert(verified > 10, 'the library must contain sustained paired contacts for its staged holds');
});

test('rifle executions carry the weapon through strikes and keep both grips attached while aiming', () => {
  for (const clip of clips().filter(item => ['Felon', 'Jayden'].includes(item.bossId))) {
    const attacker = createActor(clip.bossId, null, canon.Enemies.Bosses[clip.bossId]);
    const victim = createActor('Player', null, {});
    const relativeTransforms = [];
    let aimed = 0, carried = 0;
    try {
      assert(attacker.armed && attacker.weapon, `${clip.id} requires its configured rifle`);
      for (let i = 0; i <= 120; i++) {
        const elapsed = clip.duration * i / 120;
        const sample = sampleExecution(clip, elapsed);
        applyExecutionPose({ attackerRig: attacker, victimRig: victim, variant: clip,
          elapsed, origin: [-3, .2, 4], heading: .41 });
        attacker.mesh.updateMatrixWorld(true);
        assert.equal(attacker.weapon.parent, attacker.body);
        relativeTransforms.push([...attacker.weapon.position.toArray(), ...attacker.weapon.quaternion.toArray()]);
        if (sample.contacts.length || sample.attacker.weaponStow > .001) continue;
        const rightGrip = attacker.weapon.localToWorld(new THREE.Vector3(0, -.23, .06));
        const rightHand = attacker.rHand.getWorldPosition(new THREE.Vector3());
        if (sample.attacker.weaponAim >= .99) {
          const leftGrip = attacker.weapon.localToWorld(new THREE.Vector3(0, 0, -.63));
          const leftHand = attacker.lHand.getWorldPosition(new THREE.Vector3());
          assert(rightHand.distanceTo(rightGrip) <= .035, `${clip.id} aimed right hand leaves its rifle grip`);
          assert(leftHand.distanceTo(leftGrip) <= .035, `${clip.id} aimed left hand leaves its rifle grip`);
          aimed++;
        } else if (sample.attacker.weaponAim <= .01) {
          assert(rightHand.distanceTo(rightGrip) <= .035, `${clip.id} striking right hand leaves its rifle grip`);
          carried++;
        }
      }
      assert(aimed > 2 && carried > 2, `${clip.id} must contain both aiming and carried-strike motion`);
      assert(relativeTransforms.some(transform => distance(transform, relativeTransforms[0]) > .2),
        `${clip.id} rifle remains static against the torso through its performance`);
    } finally {
      disposeActor(attacker); disposeActor(victim);
    }
  }
});

test('fallen victims rest their torso and head near the floor without burying hands, boots or equipment', () => {
  const origin = new THREE.Vector3(-7, .35, 5);
  const fallen = actor => Math.max(Math.abs(actor.body.rotation[0]), Math.abs(actor.body.rotation[2])) > 1.2
    && actor.position[1] < .1;
  let restingSamples = 0;
  for (const clip of clips()) {
    const attacker = createActor(clip.bossId, null, canon.Enemies.Bosses[clip.bossId]);
    const victim = createActor('Player', null, { WeaponName: 'PrototypeRifle' });
    try {
      const times = [clip.duration];
      for (let index = 0; index < clip.keyframes.length - 1; index++) {
        const start = clip.keyframes[index], end = clip.keyframes[index + 1];
        if (fallen(start.victim) && fallen(end.victim)) {
          times.push(start.at, (start.at + end.at) / 2, end.at);
        }
      }
      for (const elapsed of new Set(times)) {
        applyExecutionPose({ attackerRig: attacker, victimRig: victim, variant: clip,
          elapsed, origin, heading: -.72 });
        victim.mesh.updateMatrixWorld(true);
        const torsoHeight = victim.body.getWorldPosition(new THREE.Vector3()).y - origin.y;
        // A ground roll can briefly rest on the lower rigid R6 arm; its final
        // torso must settle lower, independently of the dropped weapon.
        const maximumHeight = elapsed === clip.duration ? .53 : .7;
        assert(torsoHeight >= .18 && torsoHeight <= maximumHeight,
          `${clip.id} at ${elapsed.toFixed(2)}s rests its torso ${torsoHeight.toFixed(3)}m above the floor`);
        const headHeight = victim.primaryParts.Head.getWorldPosition(new THREE.Vector3()).y - origin.y;
        assert(headHeight <= .85,
          `${clip.id} at ${elapsed.toFixed(2)}s leaves the fallen head floating ${headHeight.toFixed(3)}m above the floor`);
        const geometry = new THREE.Box3().setFromObject(victim.body);
        assert(geometry.min.y >= origin.y - .025,
          `${clip.id} at ${elapsed.toFixed(2)}s puts a hand, boot or equipped rifle below the floor`);
        restingSamples++;
      }
    } finally {
      disposeActor(attacker); disposeActor(victim);
    }
  }
  assert(restingSamples > 60, 'the resting-height check must cover sustained knockdowns as well as every final pose');
});

test('execution application preserves caller-controlled name-tag visibility', () => {
  const attacker = createActor('Felon', null, canon.Enemies.Bosses.Felon);
  const victim = createActor('Player', null, {});
  // Headless actors omit canvas sprites; these stand-ins exercise the same
  // visibility ownership as the review lab without requiring a DOM renderer.
  attacker.tag = new THREE.Object3D(); attacker.mesh.add(attacker.tag);
  victim.tag = new THREE.Object3D(); victim.mesh.add(victim.tag);
  try {
    for (const visible of [false, true]) {
      attacker.tag.visible = visible; victim.tag.visible = visible;
      applyExecutionPose({ attackerRig: attacker, victimRig: victim,
        variant: 'Felon_KickAndShot', elapsed: 1.5 });
      assert.equal(attacker.tag.visible, visible, 'animation must preserve the attacker tag choice');
      assert.equal(victim.tag.visible, visible, 'animation must preserve the victim tag choice');
    }
  } finally {
    disposeActor(attacker); disposeActor(victim);
  }
});
