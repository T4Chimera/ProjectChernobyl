import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// All dimensions derive from the Luau prototype at one-quarter scale. This is
// a fictionalized industrial site, with operational units 1–4 and unfinished 5–6.
const SCALE = 0.25;
const UP = new THREE.Vector3(0, 1, 0);

function vector(value, scale = SCALE) {
  const data = value?.position ?? value;
  return new THREE.Vector3(data?.[0] ?? data?.x ?? 0, data?.[1] ?? data?.y ?? 0, data?.[2] ?? data?.z ?? 0).multiplyScalar(scale);
}

function canvas(width, height) {
  if (typeof document !== 'undefined') {
    const result = document.createElement('canvas');
    result.width = width;
    result.height = height;
    return result;
  }
  return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : null;
}

function noiseTexture(seed, base) {
  let current = seed;
  const data = new Uint8Array(64 * 64 * 4);
  for (let index = 0; index < 64 * 64; index++) {
    current = (current * 1664525 + 1013904223) >>> 0;
    const shade = ((current >>> 24) / 255 - 0.5) * 21;
    for (let channel = 0; channel < 3; channel++) data[index * 4 + channel] = Math.max(0, Math.min(255, base[channel] + shade));
    data[index * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 64, 64, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createWorld(scene, canon) {
  const root = new THREE.Group();
  root.name = 'ChernobylMap';
  root.userData.generatedPrototype = true;
  scene.add(root);
  const colliders = [];
  const occluders = [];
  const walls = [];
  const interactables = [];
  const animated = [];
  const geometry = new Map();
  const concreteMap = noiseTexture(1986, [111, 119, 116]);
  const asphaltMap = noiseTexture(26, [69, 77, 72]);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x66746d, map: concreteMap, roughness: 0.95 });
  const lowerWall = new THREE.MeshStandardMaterial({ color: 0x3b5148, roughness: 0.98 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x45514f, metalness: 0.55, roughness: 0.6 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x242d2b, metalness: 0.58, roughness: 0.7 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x614a36, roughness: 0.93, metalness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x131b1b, roughness: 0.73 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xa58c45, roughness: 0.8 });
  const green = new THREE.MeshStandardMaterial({ color: 0x526745, roughness: 0.84 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x574c3c, roughness: 1 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xb5b39c, roughness: 1 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x3a5661, metalness: 0.3, roughness: 0.7 });
  const deadTube = new THREE.MeshStandardMaterial({ color: 0x818b80, roughness: 0.5 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x414b41, map: asphaltMap, roughness: 1 });
  const cautionMat = new THREE.MeshBasicMaterial({ color: 0xa18b4d, transparent: true, opacity: 0.48 });
  const whitePaint = new THREE.MeshStandardMaterial({ color: 0xa3aca0, roughness: 1 });

  function box(name, size, position, material = concrete, solid = false, parent = root) {
    const key = size.join(',');
    if (!geometry.has(key)) geometry.set(key, new THREE.BoxGeometry(...size));
    const mesh = new THREE.Mesh(geometry.get(key), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    // Geometry remains static. Bounds are independent of the mesh array so the
    // first-person controller can slide against walls without physics middleware.
    mesh.updateWorldMatrix(true, false);
    if (solid) {
      const bounds = new THREE.Box3().setFromObject(mesh);
      colliders.push(bounds);
      if (size[1] > 0.45 && position[1] - size[1] / 2 < 2.5) walls.push({ x: position[0], z: position[2], w: size[0], d: size[2] });
    }
    occluders.push(mesh);
    return mesh;
  }

  function cylinder(name, radius, height, position, material, solid = false, segments = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    mesh.updateWorldMatrix(true, false);
    if (solid) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
      walls.push({ x: position[0], z: position[2], w: radius * 2, d: radius * 2 });
    }
    occluders.push(mesh);
    return mesh;
  }

  function sign(name, text, position, width = 4.8, height = 1.1, angle = 0, color = '#b9c6a3') {
    const surface = canvas(768, 192);
    let material;
    if (surface) {
      const ctx = surface.getContext('2d');
      ctx.fillStyle = '#101b17';
      ctx.fillRect(0, 0, 768, 192);
      ctx.strokeStyle = '#637164';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, 752, 176);
      ctx.fillStyle = color;
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = text.split('\n');
      lines.forEach((line, index) => ctx.fillText(line, 384, 96 + (index - (lines.length - 1) / 2) * 54, 710));
      const texture = new THREE.CanvasTexture(surface);
      texture.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
    } else material = new THREE.MeshBasicMaterial({ color: 0x8d9c7d, side: THREE.FrontSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.y = angle;
    root.add(mesh);
    // Two front faces keep text readable from both approaches. A single
    // DoubleSide plane shows mirrored lettering from its rear face.
    const reverse = new THREE.Mesh(mesh.geometry, material);
    reverse.name = `${name}Reverse`;
    reverse.position.copy(mesh.position);
    reverse.rotation.y = angle + Math.PI;
    const normal = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    mesh.position.addScaledVector(normal, 0.003);
    reverse.position.addScaledVector(normal, -0.003);
    root.add(reverse);
    return mesh;
  }

  function stripes(position, length, alongX = false) {
    const count = Math.max(1, Math.floor(length / 0.6));
    for (let i = 0; i < count; i++) {
      const stripe = box('FadedCautionStripe', alongX ? [0.3, 0.012, 0.26] : [0.26, 0.012, 0.3],
        [position[0] + (alongX ? (i - count / 2) * 0.6 : 0), position[1], position[2] + (alongX ? 0 : (i - count / 2) * 0.6)], yellow);
      stripe.castShadow = false;
    }
  }

  function pipe(from, to, radius = 0.13, material = rust) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const delta = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), material);
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(UP, delta.normalize());
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = 'ServicePipe';
    root.add(mesh);
    occluders.push(mesh);
    return mesh;
  }

  function fixture(x, y, z) {
    box('UnpoweredLightHousing', [1.6, 0.15, 0.5], [x, y, z], iron);
    box('UnpoweredFluorescentTube', [1.35, 0.06, 0.35], [x, y - 0.11, z], deadTube);
    // Intentionally no Three.js Light object: all plant fixtures remain off.
  }

  function supply(id, x, z, sector = 0) {
    box('SupplyCase', [1.4, 0.75, 0.9], [x, 0.4, z], green, true);
    box('CaseBandA', [1.44, 0.12, 0.94], [x, 0.4, z], iron);
    box('CaseBandB', [0.12, 0.78, 0.94], [x - 0.4, 0.4, z], iron);
    sign('AmmunitionCaseLabel', 'AMMUNITION\nFIELD SUPPLY', [x, 0.65, z + 0.46], 1.2, 0.38);
    interactables.push({ id, label: 'Resupply ammunition', position: new THREE.Vector3(x, 0.8, z), kind: 'supply', sector });
  }

  function terminal(id, title, x, z, sector, facing = 0) {
    // The mission position is in front of the screen, never inside its collision.
    const panel = new THREE.Group();
    panel.name = `Terminal-${id}`;
    panel.position.set(x, 0, z);
    panel.rotation.y = facing;
    root.add(panel);
    box('ConsoleBase', [1.8, 0.9, 0.7], [0, 0.45, 0], iron, false, panel);
    box('ConsoleHood', [1.9, 0.75, 0.18], [0, 1.25, -0.22], steel, false, panel);
    box('BlankMonitor', [1.45, 0.49, 0.04], [0, 1.28, -0.115], black, false, panel);
    box('Keyboard', [1.25, 0.06, 0.32], [0, 0.94, 0.16], steel, false, panel);
    for (let index = 0; index < 5; index++) box('MechanicalSwitch', [0.055, 0.055, 0.055], [-0.62 + index * 0.18, 1.04, 0.2], index === 0 ? yellow : concrete, false, panel);
    panel.updateWorldMatrix(true, true);
    colliders.push(new THREE.Box3().setFromObject(panel));
    const front = new THREE.Vector3(0, 1.2, 0.7).applyAxisAngle(UP, facing).add(new THREE.Vector3(x, 0, z));
    sign(`TerminalLabel-${id}`, title.toUpperCase(), [front.x, 1.72, front.z], 2.0, 0.38, facing);
    interactables.push({ id, label: title, position: front, kind: id === 'radio' ? 'radio' : 'terminal', sector });
    return panel;
  }

  function sample(id, title, x, z, sector) {
    box('SealedEvidenceCase', [1.25, 0.7, 0.9], [x, 0.4, z], blue, true);
    box('EvidenceSeal', [0.1, 0.75, 0.95], [x, 0.4, z], whitePaint);
    sign(`CaseLabel-${id}`, 'SEALED / FIELD RECOVERY', [x, 0.65, z + 0.46], 1.1, 0.25);
    interactables.push({ id, label: title, position: new THREE.Vector3(x, 1, z + 0.7), kind: 'sample', sector });
  }

  function valve(id, title, x, z, sector) {
    box('ValveMount', [0.9, 1.5, 0.45], [x, 0.8, z], rust, true);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 6, 12), yellow);
    wheel.position.set(x, 1.15, z + 0.3);
    root.add(wheel);
    const spokes = box('ValveSpoke', [0.8, 0.07, 0.07], [x, 1.15, z + 0.3], yellow);
    const spoke2 = box('ValveSpoke', [0.07, 0.8, 0.07], [x, 1.15, z + 0.3], yellow);
    wheel.userData.dynamicWorldVisual = true;
    spokes.userData.dynamicWorldVisual = true;
    spoke2.userData.dynamicWorldVisual = true;
    sign(`ValveLabel-${id}`, title.toUpperCase(), [x, 2.2, z + 0.3], 2.8, 0.5);
    interactables.push({ id, label: title, position: new THREE.Vector3(x, 1.1, z + 0.9), kind: 'valve', sector });
    animated.push({ kind: 'valve', id, wheel, spokes, spoke2, at: 0 });
  }

  // A level asphalt apron joins all interior floors. It provides a real route
  // between the halls instead of empty gaps or invisible traversal barriers.
  box('PlantApron', [205, 0.2, 130], [-5, -0.13, 27.5], asphalt);
  box('WesternPerimeter', [0.6, 3.6, 130], [-107.5, 1.8, 27.5], concrete, true);
  box('EasternPerimeter', [0.6, 3.6, 130], [97.5, 1.8, 27.5], concrete, true);
  box('NorthernPerimeter', [205, 3.6, 0.6], [-5, 1.8, -37.5], concrete, true);
  box('SouthernPerimeter', [205, 3.6, 0.6], [-5, 1.8, 92.5], concrete, true);
  for (let x = -101; x < 96; x += 8) {
    box('PerimeterPost', [0.25, 4.4, 0.25], [x, 2.2, -37.5], iron);
    box('PerimeterPost', [0.25, 4.4, 0.25], [x, 2.2, 92.5], iron);
  }

  const sectors = canon.Map.Sectors.map(definition => ({
    id: definition.Id,
    name: definition.Name,
    status: definition.Status,
    center: vector(definition.Center),
    size: vector(canon.Map.SectorSize),
  }));

  function room(sector) {
    const x = sector.center.x + 15.5;
    const z = sector.center.z + 10;
    box('ControlRoomNorth', [11, 4, 0.25], [x, 2, z - 6.5], concrete, true);
    box('ControlRoomSouth', [11, 4, 0.25], [x, 2, z + 6.5], concrete, true);
    box('ControlRoomEast', [0.25, 4, 13], [x + 5.5, 2, z], concrete, true);
    box('ControlRoomWestA', [0.25, 4, 5], [x - 5.5, 2, z - 4], concrete, true);
    box('ControlRoomWestB', [0.25, 4, 5], [x - 5.5, 2, z + 4], concrete, true);
    box('ControlRoomLintel', [0.25, 1, 3], [x - 5.5, 3.5, z], steel);
    box('ControlRoomCeiling', [11, 0.25, 13], [x, 4.1, z], concrete);
    // Slab is visibly parked beside an open 3m passage; no invisible door lock.
    box('ParkedManualDoor', [0.18, 2.9, 2.8], [x - 5.55, 1.45, z + 3.1], iron);
    sign('ControlRoomDoorSign', sector.id === 1 ? 'PERSONNEL\nMANUAL ACCESS' : 'CONTROL ROOM\nMANUAL ACCESS', [x - 5.7, 3.45, z], 2.6, 0.7, -Math.PI / 2);
    fixture(x, 3.85, z);
    if (sector.id === 1) {
      box('MikoyanDesk', [2.25, 0.15, 1.25], [x + 2.5, 0.9, z - 3.75], wood, true);
      for (const dx of [-0.8, 0.8]) for (const dz of [-0.4, 0.4]) box('DeskLeg', [0.1, 0.9, 0.1], [x + 2.5 + dx, 0.45, z - 3.75 + dz], iron);
      box('UntranscribedLetter', [0.4, 0.02, 0.28], [x + 2.5, 1, z - 3.75], paper);
      box('MikoyanSeat', [0.75, 0.2, 0.75], [x, 0.45, z + 1], steel);
      box('SeatBack', [0.75, 0.8, 0.12], [x, 0.85, z + 1.35], iron);
      box('UnidentifiedCoveredSilhouette', [0.6, 0.24, 1.5], [x + 3.3, 0.17, z + 4], black);
      // The archive is operational metadata, not an invented canonical letter.
      terminal('personnel-archive', 'Secure personnel archive', x + 1.9, z + 5.7, sector.id, Math.PI);
    } else {
      for (let i = 0; i < 3; i++) {
        box('ControlConsole', [1.9, 1, 0.8], [x - 3.1 + i * 2.6, 0.5, z - 5.5], steel, true);
        box('PoweredOffMonitor', [1.5, 0.55, 0.08], [x - 3.1 + i * 2.6, 1.1, z - 5.81], black);
        for (let j = 0; j < 4; j++) box('ConsoleButton', [0.08, 0.03, 0.08], [x - 3.6 + i * 2.6 + j * 0.24, 1.03, z - 5.32], j === 1 ? yellow : black);
      }
      box('AbandonedRoomDesk', [2.6, 0.16, 1.2], [x + 2, 0.9, z + 3.5], wood, true);
    }
  }

  function reactor(sector) {
    const x = sector.center.x;
    const z = sector.center.z - 7;
    if (sector.id <= 4) {
      cylinder(`Reactor${sector.id}`, 4.5, 1.8, [x, 0.9, z], steel, true, 16);
      const lid = cylinder('ReactorLid', 3.9, 0.25, [x, 1.96, z], sector.id === 4 ? black : concrete, false, 16);
      if (sector.id === 4) lid.rotation.z = 0.15;
      for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) {
        if (ix * ix + iz * iz < 6) cylinder('ReactorControlChannel', 0.17, 0.13, [x + ix * 1.05, 2.16, z + iz * 1.05], black, false, 6);
      }
      for (const side of [-1, 1]) {
        pipe([x + side * 5.7, 0.85, z - 4], [x + side * 5.7, 0.85, z + 3.5], 0.34);
        box('ReactorServicePlatform', [2.2, 0.2, 7.5], [x + side * 7.25, 0.3, z + 1.3], iron);
        for (const dz of [-2, 0, 2, 4]) box('PlatformRailPost', [0.08, 0.8, 0.08], [x + side * 8.2, 0.8, z + dz], yellow);
        pipe([x + side * 8.2, 1.2, z - 2], [x + side * 8.2, 1.2, z + 4], 0.035, yellow);
      }
      stripes([x, 0.08, z + 5.4], 10.5, true);
      if (sector.id === 4) {
        for (let i = 0; i < 26; i++) {
          const angle = i * 2.399963;
          const radius = 5.5 + (i % 5) * 0.9;
          const rubble = box('Reactor4Debris', [0.3 + (i % 3) * 0.17, 0.18 + (i % 4) * 0.08, 0.6], [x + Math.cos(angle) * radius, 0.2, z + Math.sin(angle) * radius], i % 2 ? black : concrete);
          rubble.rotation.set(i * 0.1, angle, i * 0.08);
        }
        const beam = box('CollapsedRoofBeam', [12.5, 0.4, 0.4], [x, 4.6, z], rust);
        beam.rotation.z = 0.19;
        sign('IncidentZoneWarning', 'REACTOR 4\nINCIDENT ZONE / KEEP CLEAR', [x, 2.9, z + 4.9], 5.8, 1.3, 0, '#c49a77');
      }
    } else {
      cylinder(`UnfinishedReactor${sector.id}`, 4.5, 0.24, [x, 0.15, z], concrete, false, 16);
      for (const side of [-1, 1]) for (const depth of [-1, 1]) {
        box('ReactorConstructionSupport', [0.45, 6.2, 0.45], [x + side * 5.1, 3.1, z + depth * 5.1], rust, true);
      }
      box('CraneGantry', [14, 0.65, 0.6], [x, 6.5, z], yellow);
      for (const side of [-1, 1]) box('CraneEndFrame', [0.8, 0.8, 1.1], [x + side * 6.4, 6.4, z], iron);
      box('CraneTrolley', [1.1, 0.5, 1], [x - 2, 6.6, z], rust);
      pipe([x - 2, 6.2, z], [x - 2, 3.9, z], 0.035, black);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 5, 9, Math.PI * 1.5), iron);
      hook.position.set(x - 2, 3.7, z);
      root.add(hook);
      for (let i = 0; i < 5; i++) box('PrecastConstructionSlab', [4.2, 0.18, 1.4], [x - 13.5, 0.2 + i * 0.2, z - 2.8], concrete, i === 4);
      sign('ConstructionWarning', `REACTOR ${sector.id}\nUNFINISHED / CONSTRUCTION`, [x, 2.3, z + 5.2], 5.6, 1.1);
    }
  }

  sectors.forEach(sector => {
    const { x, z } = sector.center;
    const group = new THREE.Group();
    group.name = `Sector${sector.id}`;
    root.add(group);
    box('SectorFloor', [45, 0.1, 40], [x, 0, z], concrete);
    // Four generous entrances are cut out of each wall. Wall segments and
    // permanent passages are separate geometry, so minimap topology is honest.
    for (const side of [-1, 1]) {
      for (const half of [-1, 1]) {
        box('OuterWallEastWest', [0.5, 6, 18], [x + side * 22.5, 3, z + half * 11], concrete, true);
        box('OuterWallNorthSouth', [20.5, 6, 0.5], [x + half * 12.25, 3, z + side * 20], concrete, true);
        // Muted green lower wall paint gives the flashlight more surface detail.
        box('WallPaintEastWest', [0.52, 1.6, 18], [x + side * 22.5, 0.8, z + half * 11], lowerWall);
        box('WallPaintNorthSouth', [20.5, 1.6, 0.52], [x + half * 12.25, 0.8, z + side * 20], lowerWall);
      }
      box('DoorLintelEastWest', [0.5, 2.5, 4], [x + side * 22.5, 4.75, z], steel);
      box('DoorLintelNorthSouth', [4, 2.5, 0.5], [x, 4.75, z + side * 20], steel);
      // Caution posts sit outside the clear opening and leave a visible route.
      box('EntranceGuard', [0.3, 1.7, 0.3], [x + side * 21.8, 0.85, z + 2.25], yellow, true);
      box('EntranceGuard', [0.3, 1.7, 0.3], [x + side * 21.8, 0.85, z - 2.25], yellow, true);
    }
    if (sector.id <= 3) box('ReactorHallRoof', [45, 0.25, 40], [x, 6.15, z], concrete);
    else if (sector.id === 4) for (const side of [-1, 1]) box('BrokenRoofWing', [10.5, 0.25, 40], [x + side * 17.25, 6.15, z], concrete);
    else for (const dx of [-17.5, -8.75, 0, 8.75, 17.5]) box('ConstructionRoofBeam', [0.4, 0.45, 40], [x + dx, 6.2, z], rust);
    for (const side of [-1, 1]) for (const depth of [-1, 1]) {
      box('HallSupportColumn', [0.75, 6, 0.75], [x + side * 18, 3, z + depth * 14.5], steel, true);
      box('ColumnPaintBand', [0.79, 0.45, 0.79], [x + side * 18, 1.5, z + depth * 14.5], yellow);
    }
    for (const dx of [-10, 0, 10]) fixture(x + dx, 5.65, z + 5.5);
    for (const side of [-1, 1]) {
      pipe([x + side * 20.5, 4.6, z - 18], [x + side * 20.5, 4.6, z + 18], 0.12, side < 0 ? rust : blue);
      for (const depth of [-1, 1]) box('PipeBracket', [0.1, 0.7, 0.6], [x + side * 20.5, 4.5, z + depth * 11], iron);
    }
    sign('SectorInteriorSign', `SECTOR 0${sector.id} / ${sector.name}\nFACILITY POWER OFF`, [x, 3.1, z + 19.7], 8.8, 1.6, Math.PI);
    sign('SectorEntranceSign', `SECTOR 0${sector.id}\n${sector.name}`, [x, 3.8, z - 20.28], 7, 1.35, Math.PI);
    sign('WestEntrance', `SECTOR 0${sector.id} / REACTOR ${sector.id}`, [x - 22.78, 3.4, z], 4.7, 0.9, -Math.PI / 2);
    room(sector);
    reactor(sector);
    supply(`supply-${sector.id}`, x - 4.5, z + 16.75, sector.id);
    for (let i = 0; i < 3; i++) {
      const px = x - 16.5;
      const pz = z + 5.75 + i * 2.4;
      if (sector.id === 2) {
        box('TurbineHousing', [2.6, 1.6, 1.6], [px, 0.8, pz], steel, true);
        pipe([px - 1.1, 1.4, pz], [px + 1.1, 1.4, pz], 0.58, iron);
      } else if (sector.id === 3) {
        box('ElectricalCabinet', [1.1, 2, 1.2], [px, 1, pz], blue, true);
        box('CabinetHandle', [0.06, 0.4, 0.08], [px + 0.3, 1.1, pz + 0.64], iron);
      } else {
        box('AbandonedWoodCrate', [1.3, 0.85, 1.3], [px, 0.425, pz], wood, true);
        box('CrateBrace', [1.35, 0.12, 1.35], [px, 0.6, pz], rust);
      }
    }
  });

  // Clear marked corridors between the halls. They stay unobstructed all the
  // way to the matching 4m openings in each sector boundary.
  function walkway(a, b) {
    const center = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const delta = b.clone().sub(a);
    const alongX = Math.abs(delta.x) > Math.abs(delta.z);
    const length = delta.length();
    box('ConnectingWalkway', alongX ? [length, 0.12, 4] : [4, 0.12, length], [center.x, 0.02, center.z], steel);
    for (const side of [-1, 1]) {
      box('FadedWalkwayStripe', alongX ? [length, 0.01, 0.08] : [0.08, 0.01, length], [center.x + (alongX ? 0 : side * 1.8), 0.095, center.z + (alongX ? side * 1.8 : 0)], cautionMat);
    }
  }
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) walkway(new THREE.Vector3(-32.5 + col * 55, 0, row * 55), new THREE.Vector3(-22.5 + col * 55, 0, row * 55));
  for (let col = 0; col < 3; col++) walkway(new THREE.Vector3(-55 + col * 55, 0, 20), new THREE.Vector3(-55 + col * 55, 0, 35));
  walkway(new THREE.Vector3(-97.5, 0, 0), new THREE.Vector3(-77.5, 0, 0));

  const checkpoint = vector(canon.Map.Checkpoint);
  checkpoint.y = 0;
  box('CheckpointCanopy', [10.5, 0.3, 8.5], [checkpoint.x, 3.4, 0], iron);
  for (const depth of [-1, 1]) {
    box('CheckpointConcreteBarrier', [10.5, 2.9, 0.3], [checkpoint.x, 1.45, depth * 3.75], concrete, true);
    for (const side of [-1, 1]) box('CheckpointPost', [0.32, 3.5, 0.32], [checkpoint.x + side * 5, 1.75, depth * 3.6], steel, true);
  }
  box('CheckpointFloor', [11, 0.1, 8], [checkpoint.x, 0, 0], concrete);
  sign('CheckpointIdentification', 'SCP FOUNDATION\nCHERNOBYL FIELD CHECKPOINT', [checkpoint.x, 2.4, -3.55], 8.3, 1.35);
  sign('CheckpointReturnSign', 'FIELD CHECKPOINT\nEXTRACTION / WEST', [checkpoint.x + 5.5, 2.8, 0], 4.8, 1.1, Math.PI / 2);
  sign('WarningPlacard', 'RADIATION HAZARD\nWEAPON LIGHT REQUIRED', [checkpoint.x - 4.2, 1.7, -3.5], 1.6, 1.4, 0, '#bba462');
  fixture(checkpoint.x, 3.15, 0);
  terminal('radio', 'Establish Overwatch radio link', checkpoint.x - 1.5, -2.6, 0);
  // Radio aerial and transport silhouette make the insertion area recognizable.
  pipe([checkpoint.x - 2.4, 1.5, -2.6], [checkpoint.x - 2.4, 3.2, -2.6], 0.025, iron);
  box('FieldRadioCase', [0.7, 0.45, 0.5], [checkpoint.x - 2.4, 1.2, -2.6], green);
  supply('supply-checkpoint', checkpoint.x + 2.75, -2.0);
  const truckX = checkpoint.x - 9;
  box('FieldTransportBody', [3, 1.7, 6.6], [truckX, 1.25, 5.2], green, true);
  box('TransportCab', [3, 1.4, 2.1], [truckX, 2.0, 2.5], black, true);
  box('TransportWindscreen', [2.55, 0.65, 0.08], [truckX, 2.0, 1.42], blue);
  for (const side of [-1, 1]) for (const dz of [-1.6, 1.9]) {
    const wheel = cylinder('TransportWheel', 0.65, 0.4, [truckX + side * 1.55, 0.65, 5.2 + dz], black);
    wheel.rotation.z = Math.PI / 2;
  }
  box('ExtractionZone', [7, 0.01, 4.4], [checkpoint.x - 1, 0.12, 1.2], new THREE.MeshBasicMaterial({ color: 0x4e6653, transparent: true, opacity: 0.2 }));
  interactables.push({ id: 'extraction', label: 'Request extraction', position: checkpoint.clone().add(new THREE.Vector3(0, 0.9, 1.6)), kind: 'extraction', sector: 0 });

  terminal('intake-logs', 'Download intake logs', -70.0, -16.5, 1);
  valve('turbine-valve', 'Close turbine isolation valve', -8.0, 15.0, 2);
  terminal('grid-isolator', 'Isolate the damaged power grid', 40.0, -15.0, 3);
  terminal('control-backup', 'Recover control backup', 71.5, 13.0, 3, Math.PI / 2);
  valve('containment-gauge', 'Record containment readings', -68.0, 68.0, 4);
  sample('research-case', 'Recover sealed research case', -38.0, 69.0, 4);
  terminal('crane-lock', 'Secure construction crane', -13.0, 63.0, 5);
  terminal('transmitter', 'Restore field transmitter', 16.0, 68.0, 5, Math.PI / 2);
  sample('anomaly-sample', 'Secure the anomaly sample', 42.0, 66.0, 6);
  terminal('uplink', 'Transmit field recovery manifest', 72.5, 68.5, 6, Math.PI / 2);

  const bossSpawns = Object.fromEntries(Object.entries(canon.Map.BossSpawns).map(([id, point]) => {
    const location = vector(point); location.y = 0; return [id, location];
  }));
  const infectedSpawns = canon.Map.InfectedSpawns.map(point => { const location = vector(point); location.y = 0; return location; });
  const roomCenter = vector(canon.Map.MikoyanRoom.Center);
  const roomSize = vector(canon.Map.MikoyanRoom.Size);
  const mikoyanRoom = new THREE.Box3().setFromCenterAndSize(roomCenter, roomSize);
  root.updateWorldMatrix(true, true);

  // Most details repeat one of a handful of surfaces. Bake their world matrices
  // and merge by material, keeping mission valves separate. This turns hundreds
  // of industrial details into a few dozen draw calls without simplifying the
  // collision topology or changing ray visibility.
  const batches = new Map();
  root.traverse(object => {
    if (!object.isMesh || object.userData.dynamicWorldVisual || Array.isArray(object.material)) return;
    const list = batches.get(object.material) ?? [];
    list.push(object);
    batches.set(object.material, list);
  });
  const finalOccluders = occluders.filter(object => object.userData.dynamicWorldVisual);
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) {
      finalOccluders.push(...meshes);
      continue;
    }
    const pieces = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const merged = mergeGeometries(pieces, false);
    for (const piece of pieces) piece.dispose();
    if (!merged) {
      finalOccluders.push(...meshes);
      continue;
    }
    const batch = new THREE.Mesh(merged, material);
    batch.name = 'BatchedIndustrialGeometry';
    batch.castShadow = batch.receiveShadow = true;
    root.add(batch);
    finalOccluders.push(batch);
    for (const mesh of meshes) mesh.removeFromParent();
  }
  root.updateWorldMatrix(true, true);

  return {
    root, colliders, occluders: finalOccluders, sectors, spawn: checkpoint, bossSpawns,
    infectedSpawns, mikoyanRoom, interactables,
    minimap: { bounds: { minX: -108, maxX: 98, minZ: -38, maxZ: 93 }, walls },
    update(dt, time) {
      // Mission flags may be placed on an interactable by main; a mechanical
      // valve turns without restoring any facility illumination.
      for (const item of animated) {
        const target = interactables.find(entry => entry.id === item.id);
        if (target?.completed && item.at < Math.PI * 2) {
          const increment = Math.min(dt * 2.5, Math.PI * 2 - item.at);
          item.at += increment;
          item.wheel.rotation.z = item.at;
          item.spokes.rotation.z = item.at;
          item.spoke2.rotation.z = item.at;
        }
      }
    },
  };
}
