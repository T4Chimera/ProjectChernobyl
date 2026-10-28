import * as THREE from 'three';

// Asset-free articulated block figures. Original identities remain placeholders
// until the creator supplies approved uniforms, meshes, and authored animations.
const materials = new Map();
function material(color, metalness = 0.05) {
  const key = `${color}:${metalness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.83, metalness }));
  return materials.get(key);
}
function block(parent, name, size, position, color, metalness) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, metalness));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function pivot(parent, name, position) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  parent.add(group);
  return group;
}

function nameSprite(text) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 31px monospace'; ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 7;
  ctx.fillStyle = '#ff3d38'; ctx.fillText(text, 256, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, toneMapped: false }));
  sprite.position.set(0, 2.2, 0); sprite.scale.set(3.25, 0.5, 1);
  sprite.userData.disposeTexture = texture;
  return sprite;
}

export function createActor(id, definition, settings = {}) {
  const mesh = new THREE.Group(); mesh.name = id;
  const body = pivot(mesh, 'Body', [0, 0.9, 0]);
  const colors = { black: 0x0e1316, uniform: 0x35413c, white: 0xc1c3b5, metal: 0x737b75 };
  let uniform = colors.uniform;
  if (id === 'Mikoyan' || id === 'Nikolai') uniform = colors.white;
  if (id === 'Novak' || id === 'Katya') uniform = 0x121719;
  if (id === 'Infected') uniform = 0x5a6550;
  const torso = block(body, 'Torso', [0.7, 0.65, 0.36], [0, 0.25, 0], uniform);
  const headPivot = pivot(body, 'Neck', [0, 0.69, 0]);
  block(headPivot, 'Head', [0.51, 0.46, 0.44], [0, 0.08, 0], id === 'Player' ? 0x6b6859 : 0x111715);
  const right = pivot(body, 'RightShoulder', [0.47, 0.5, 0]);
  const left = pivot(body, 'LeftShoulder', [-0.47, 0.5, 0]);
  block(right, 'RightArm', [0.25, 0.67, 0.29], [0, -0.26, 0], uniform);
  block(left, 'LeftArm', [0.25, 0.67, 0.29], [0, -0.26, 0], uniform);
  const rHip = pivot(body, 'RightHip', [0.2, -0.08, 0]);
  const lHip = pivot(body, 'LeftHip', [-0.2, -0.08, 0]);
  const trouser = id === 'Mikoyan' ? colors.white : 0x202728;
  block(rHip, 'RightLeg', [0.3, 0.77, 0.34], [0, -0.42, 0], trouser);
  block(lHip, 'LeftLeg', [0.3, 0.77, 0.34], [0, -0.42, 0], trouser);
  block(rHip, 'RightBoot', [0.33, 0.2, 0.45], [0, -0.77, -0.04], colors.black);
  block(lHip, 'LeftBoot', [0.33, 0.2, 0.45], [0, -0.77, -0.04], colors.black);
  let hair = null, jaw = null;
  const appendages = [];
  if (id === 'Nikolai' || id === 'Novak') {
    block(headPivot, 'Hood', [0.58, 0.13, 0.49], [0, 0.33, 0.04], uniform);
    block(headPivot, 'PermanentFaceRectangle', [0.59, 0.24, 0.055], [0, 0.09, -0.25], 0x020404);
    if (id === 'Nikolai') block(headPivot, 'BlackCap', [0.58, 0.08, 0.58], [0, 0.39, -0.03], colors.black);
  } else if (id === 'Katya') {
    hair = block(headPivot, 'Hair', [0.61, 0.8, 0.22], [0, -0.1, 0.25], 0x0b0d0e);
    // Hair needs a private material because its alert state changes color.
    hair.material = hair.material.clone();
    block(headPivot, 'RedEye', [0.065, 0.065, 0.025], [-0.12, 0.12, -0.23], 0xae2924);
    block(headPivot, 'WhitePupil', [0.045, 0.045, 0.025], [0.12, 0.12, -0.23], 0xdedbc8);
  } else if (id !== 'Infected') {
    block(body, 'TacticalVest', [0.76, 0.55, 0.43], [0, 0.27, 0], colors.black);
    block(headPivot, 'Helmet', [0.56, 0.18, 0.5], [0, 0.29, 0], 0x252f2d);
    if (id === 'John' || id === 'Jayden') {
      block(body, 'WhiteEquipment', [0.29, 0.08, 0.05], [0, 0.43, -0.24], colors.white);
      for (const side of [-1, 1]) block(headPivot, 'PurpleOptic', [0.08, 0.08, 0.1], [side * 0.13, 0.17, -0.26], 0x794ba0);
    } else {
      block(headPivot, 'Mask', [0.32, 0.22, 0.12], [0, -0.02, -0.24], 0x252e29);
      block(headPivot, 'BrokenOptic', [0.45, 0.06, 0.09], [0.02, 0.32, -0.26], 0x38413b).rotation.z = 0.12;
    }
    if (id === 'Sukhoi') {
      jaw = pivot(headPivot, 'MaskJaw', [0, -0.07, -0.26]);
      block(jaw, 'Jaw', [0.29, 0.12, 0.1], [0, -0.04, 0], 0x1a231e);
    }
  }
  if (id === 'Sukhoi' || id === 'Katya') {
    const count = id === 'Sukhoi' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const tentacle = pivot(body, `Appendage${i}`, [(i - (count - 1) / 2) * 0.25, 0.5, 0.23]);
      block(tentacle, 'Appendage', [0.085, 1.1, 0.085], [0, -0.5, 0], 0x0b1110);
      appendages.push(tentacle);
    }
  }
  let weapon = null;
  if (settings.WeaponName) {
    weapon = pivot(right, settings.WeaponName, [0, -0.38, -0.13]);
    if (settings.WeaponName === 'Axe') {
      block(weapon, 'AxeHandle', [0.065, 1.15, 0.065], [0, -0.12, 0], 0x604a34);
      block(weapon, 'AxeBlade', [0.38, 0.3, 0.08], [0.11, 0.36, 0], colors.metal, 0.4);
    } else if (settings.WeaponName === 'Katana') {
      block(weapon, 'Blade', [0.06, 1.15, 0.045], [0, -0.63, 0], 0xb1b8b4, 0.65);
      block(weapon, 'Guard', [0.22, 0.045, 0.11], [0, -0.05, 0], 0x747b71, 0.4);
    } else {
      weapon.rotation.x = Math.PI / 2;
      block(weapon, 'Receiver', [0.15, 0.19, 0.68], [0, 0, -0.18], 0x242c2a, 0.4);
      block(weapon, 'Barrel', [0.065, 0.065, 0.5], [0, 0.04, -0.73], 0x171e1c, 0.5);
      block(weapon, 'Magazine', [0.12, 0.28, 0.18], [0, -0.18, -0.13], 0x151c1a);
    }
  }
  const tag = definition && nameSprite(definition.NameTag);
  if (tag) mesh.add(tag);
  const hitMeshes = [];
  mesh.traverse(object => { if (object.isMesh) hitMeshes.push(object); });
  const rig = { mesh, body, torso, head: headPivot, right, left, rHip, lHip, hair, jaw, appendages, hitMeshes, tag, weapon, id };
  mesh.userData.rig = rig;
  return rig;
}

const DEG = Math.PI / 180;
const poseAngles = {
  Idle: [0, 0, 0, 0, 0], Walk: [0, 0, 0, 0, 0], Sit: [-70, -70, 15, 10, 0],
  Guard: [0, 0, -65, -60, 0], Windup: [0, 0, -145, -25, -10],
  Strike: [0, 0, -65, -35, 15], Attack: [0, 0, -80, -50, 12],
  Kick: [-75, 10, -45, -30, -10], Grab: [0, 0, -85, -85, 8],
  Lift: [0, 0, -145, -145, -10], Slam: [10, 10, -40, -40, 45],
  Fire: [0, 0, -85, -85, 0], Burst: [0, 0, -100, -80, -5],
  Throw: [0, 0, -40, -135, 20], Stagger: [5, -10, 40, -30, -22],
  Hit: [10, -5, 30, -25, -15], Down: [0, 0, 20, -25, -85],
  Death: [0, 0, 15, -20, -88],
};

export function animateActor(rig, pose, time, dt, moving = false) {
  const p = poseAngles[pose] || poseAngles.Idle;
  const blend = Math.min(1, dt * (pose === 'Walk' ? 10 : 15));
  const stride = rig.id === 'Novak' ? 1.25 : rig.id === 'Sukhoi' ? 0.8 : 1;
  const walk = (pose === 'Walk' || (pose === 'Idle' && moving)) ? Math.sin(time * 8 * stride) * 0.42 : 0;
  rig.rHip.rotation.x = THREE.MathUtils.lerp(rig.rHip.rotation.x, p[0] * DEG + walk, blend);
  rig.lHip.rotation.x = THREE.MathUtils.lerp(rig.lHip.rotation.x, p[1] * DEG - walk, blend);
  rig.right.rotation.x = THREE.MathUtils.lerp(rig.right.rotation.x, p[2] * DEG - walk * 0.65, blend);
  rig.left.rotation.x = THREE.MathUtils.lerp(rig.left.rotation.x, p[3] * DEG + walk * 0.65, blend);
  rig.body.rotation.x = THREE.MathUtils.lerp(rig.body.rotation.x, p[4] * DEG, blend);
  rig.body.rotation.z = THREE.MathUtils.lerp(rig.body.rotation.z, moving ? Math.sin(time * 4) * 0.025 : Math.sin(time * 1.4) * 0.013, blend);
  const lowered = pose === 'Down' || pose === 'Death';
  rig.body.position.y = THREE.MathUtils.lerp(rig.body.position.y, lowered ? 0.35 : pose === 'Sit' ? 0.67 : 0.9, blend);
  rig.head.rotation.z = Math.sin(time * 1.5) * (rig.id === 'Katya' ? 0.085 : 0.017);
  if (rig.jaw) rig.jaw.rotation.x = THREE.MathUtils.lerp(rig.jaw.rotation.x, ['Attack', 'Grab', 'Strike', 'Slam'].includes(pose) ? 0.65 : 0, blend);
  rig.appendages.forEach((appendage, index) => {
    appendage.rotation.x = Math.sin(time * 2 + index) * 0.18 + (['Grab', 'Strike', 'Slam'].includes(pose) ? -1.1 : 0.2);
    appendage.rotation.z = Math.sin(time + index * 2) * 0.15;
  });
  if (rig.tag) rig.tag.visible = pose !== 'Death';
}

export function disposeActor(rig) {
  // Boss records deliberately survive their corpse for session bookkeeping.
  // Reset/dispose may revisit them, so release each GPU resource only once.
  if (rig.disposed) return;
  rig.disposed = true;
  rig.mesh.removeFromParent();
  rig.mesh.traverse(object => {
    if (object.isMesh) object.geometry.dispose();
    if (object.isSprite) { object.material.map?.dispose(); object.material.dispose(); }
  });
  if (rig.hair) rig.hair.material.dispose();
}
