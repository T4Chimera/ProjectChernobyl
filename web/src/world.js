import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {createIndustrialMaterials,createGrimeMap,scaleBoxUVs} from './materials.js';

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
  const {concrete,brick,lowerWall,steel,iron,rust,black,yellow,green,wood,paper,blue,deadTube,asphalt,cautionMat,whitePaint,glass,rubber,fabric,sandbag}=createIndustrialMaterials();
  const grime=new THREE.MeshBasicMaterial({map:createGrimeMap(),color:0x111615,transparent:true,opacity:.58,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});

  function grimePatch(position,width,height,angle=0) {
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),grime);
    mesh.name='WeatherRunoff';mesh.position.set(...position);mesh.rotation.y=angle;
    root.add(mesh);return mesh;
  }

  function box(name, size, position, material = concrete, solid = false, parent = root) {
    const key = size.join(',');
    if (!geometry.has(key)) geometry.set(key, scaleBoxUVs(new THREE.BoxGeometry(...size),size));
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
    const shape=new THREE.CylinderGeometry(radius,radius,height,segments);
    const uv=shape.getAttribute('uv');
    for(let i=0;i<(segments+1)*2;i++)uv.setXY(i,uv.getX(i)*Math.PI*radius/2,uv.getY(i)*height/4);
    const mesh = new THREE.Mesh(shape, material);
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
    const painted = name === 'ChernobylPlantLettering' || name === 'EntranceUnitMark';
    let material;
    if (surface) {
      const ctx = surface.getContext('2d');
      if (painted) ctx.clearRect(0, 0, 768, 192);
      else {
        ctx.fillStyle = '#121716';
        ctx.fillRect(0, 0, 768, 192);
        ctx.strokeStyle = '#6e746c';
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, 752, 176);
      }
      ctx.fillStyle = color;
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = text.split('\n');
      lines.forEach((line, index) => ctx.fillText(line, 384, 96 + (index - (lines.length - 1) / 2) * 54, 710));
      const texture = new THREE.CanvasTexture(surface);
      texture.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.MeshStandardMaterial({ map: texture, roughness:.93, side: THREE.FrontSide,
        transparent:painted, opacity:painted?.72:1, alphaTest:painted?.02:0, depthWrite:!painted });
    } else material = new THREE.MeshStandardMaterial({ color: 0x8d9c7d, roughness:.93, side: THREE.FrontSide });
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
  box('PlantApron', [205, 0.2, 130], [-5, -0.1, 27.5], asphalt);
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
    box('SectorFloor', [45, 0.1, 40], [x, -0.05, z], concrete);
    // Four generous entrances are cut out of each wall. Wall segments and
    // permanent passages are separate geometry, so minimap topology is honest.
    for (const side of [-1, 1]) {
      for (const half of [-1, 1]) {
        box('OuterWallEastWest', [0.5, 6, 18], [x + side * 22.5, 3, z + half * 11], brick, true);
        box('OuterWallNorthSouth', [20.5, 6, 0.5], [x + half * 12.25, 3, z + side * 20], brick, true);
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
        for(const side of[-1,1]) {
          const cap=cylinder('TurbineEndCap',.46,.07,[px+side*1.34,.86,pz],iron);cap.rotation.z=Math.PI/2;
          for(let bolt=0;bolt<8;bolt++)box('TurbineFlangeBolt',[.045,.065,.065],[px+side*1.39,.86+Math.cos(bolt*Math.PI/4)*.35,pz+Math.sin(bolt*Math.PI/4)*.35],steel);
        }
        box('TurbineInspectionPanel',[.95,.53,.025],[px,.65,pz+.814],iron);
        box('InspectionPanelHandle',[.22,.045,.05],[px,.65,pz+.84],steel);
        for(const side of[-1,1])box('TurbineMountingFoot',[.36,.14,1.84],[px+side*.86,.09,pz],iron);
      } else if (sector.id === 3) {
        box('ElectricalCabinet', [1.1, 2, 1.2], [px, 1, pz], blue, true);
        box('CabinetHandle', [0.06, 0.4, 0.08], [px + 0.3, 1.1, pz + 0.64], iron);
        box('CabinetDoorSeam',[.022,1.85,.012],[px,1.02,pz+.608],black);
        for(let vent=0;vent<7;vent++)box('CabinetVentSlot',[.67,.027,.016],[px,.29+vent*.055,pz+.614],black);
        for(const side of[-1,1])for(const y of[.12,1.89])box('CabinetDoorScrew',[.025,.025,.018],[px+side*.47,y,pz+.617],steel);
        box('CabinetIsolationPlate',[.23,.29,.018],[px-.26,1.37,pz+.619],yellow);
        box('CabinetWarningSymbol',[.026,.14,.025],[px-.26,1.38,pz+.632],black).rotation.z=-.35;
      } else {
        box('AbandonedWoodCrate', [1.3, 0.85, 1.3], [px, 0.425, pz], wood, true);
        for(const side of[-1,1]) {
          for(let slat=0;slat<5;slat++) {
            box('CrateSideSlat',[1.31,.019,.025],[px,.09+slat*.165,pz+side*.66],iron);
            box('CrateEndSlat',[.025,.019,1.31],[px+side*.66,.09+slat*.165,pz],iron);
          }
          for(const corner of[-1,1])box('CrateCornerStrap',[.075,.86,.075],[px+side*.63,.43,pz+corner*.63],rust);
          box('CrateTopBrace',[1.32,.055,.1],[px,.884,pz+side*.42],wood);
        }
        const brace=box('CrateDiagonalBrace',[1.28,.1,.075],[px,.46,pz+.7],wood);brace.rotation.z=.46;
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
    box('ConnectingWalkway', alongX ? [length, 0.12, 4] : [4, 0.12, length], [center.x, -0.06, center.z], steel);
    for (const side of [-1, 1]) {
      box('FadedWalkwayStripe', alongX ? [length, 0.01, 0.08] : [0.08, 0.01, length], [center.x + (alongX ? 0 : side * 1.8), 0.095, center.z + (alongX ? side * 1.8 : 0)], cautionMat);
    }
  }
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) walkway(new THREE.Vector3(-32.5 + col * 55, 0, row * 55), new THREE.Vector3(-22.5 + col * 55, 0, row * 55));
  for (let col = 0; col < 3; col++) walkway(new THREE.Vector3(-55 + col * 55, 0, 20), new THREE.Vector3(-55 + col * 55, 0, 35));
  walkway(new THREE.Vector3(-97.5, 0, 0), new THREE.Vector3(-77.5, 0, 0));

  const checkpoint = vector(canon.Map.Checkpoint);
  checkpoint.y = 0;
  box('CheckpointCanopy', [10.5, 0.22, 3.8], [checkpoint.x, 3.4, -4.75], iron);
  for (const depth of [-1, 1]) {
    box('CheckpointConcreteBarrier', [10.5, 0.85, 0.3], [checkpoint.x, 0.425, depth * 3.75], concrete, true);
    for (const side of [-1, 1]) box('CheckpointPost', [0.32, 3.5, 0.32], [checkpoint.x + side * 5, 1.75, depth * 3.6], steel, true);
  }
  box('CheckpointFloor', [11, 0.1, 8], [checkpoint.x, -0.05, 0], concrete);
  sign('CheckpointIdentification', 'SCP FOUNDATION\nCHERNOBYL FIELD CHECKPOINT', [checkpoint.x, 2.4, -3.55], 8.3, 1.35);
  sign('CheckpointReturnSign', 'FIELD CHECKPOINT\nEXTRACTION / WEST', [checkpoint.x + 5.5, 1.7, 3.6], 2.3, 0.65, Math.PI / 2);
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
  // Browser encounter staging: the intake opens with ordinary infected, while
  // unique contacts stay in deeper service areas until field work uncovers them.
  bossSpawns.Felon.set(-39, 0, -13);
  bossSpawns.John.set(70, 0, 9);
  const bossEncounters = {
    Felon: { sector: 1, prerequisites: ['intake-logs', 'personnel-archive'], activationDistance: 18, leashRadius: 13 },
    Nikolai: { sector: 2, prerequisites: ['turbine-valve'], requiresBosses: ['Felon'], activationDistance: 20, leashRadius: 16 },
    Novak: { sector: 2, prerequisites: ['turbine-valve'], requiresBosses: ['Nikolai'], activationDistance: 20, leashRadius: 16 },
    John: { sector: 3, prerequisites: ['control-backup'], requiresBosses: ['Novak'], activationDistance: 18, leashRadius: 14 },
    Sukhoi: { sector: 4, prerequisites: ['research-case'], requiresBosses: ['John'], activationDistance: 20, leashRadius: 16 },
    Jayden: { sector: 5, prerequisites: ['transmitter'], requiresBosses: ['Sukhoi'], activationDistance: 20, leashRadius: 16 },
    Katya: { sector: 6, prerequisites: ['uplink'], requiresBosses: ['Jayden'], activationDistance: 20, leashRadius: 16 },
  };
  const infectedSpawns = canon.Map.InfectedSpawns.map(point => { const location = vector(point); location.y = 0; return location; });
  infectedSpawns[0].set(-73, 0, 8);
  infectedSpawns[1].set(-70, 0, -6);
  const roomCenter = vector(canon.Map.MikoyanRoom.Center);
  const roomSize = vector(canon.Map.MikoyanRoom.Size);
  const mikoyanRoom = new THREE.Box3().setFromCenterAndSize(roomCenter, roomSize);

  // Reference-inspired industrial entrance: the facade is a layered physical
  // building shell, not a flat title board. The existing four-metre passage and
  // every mission coordinate remain clear beneath it.
  const gateX = -77.5;
  for (const side of [-1, 1]) {
    box('GatehouseBrickTower', [1.1, 11.5, 15], [gateX - 0.2, 5.75, side * 12], brick);
    box('FacadeConcreteFooting', [1.25, 1.05, 15], [gateX - 0.24, 0.525, side * 12], concrete);
    box('FacadeSteelPier', [0.48, 12.3, 0.48], [gateX - 0.85, 6.15, side * 4.8], iron);
    box('FacadeOuterPier', [0.55, 12.3, 0.55], [gateX - 0.8, 6.15, side * 19.4], steel);
    box('GateCanopyPost', [0.3, 4.1, 0.3], [gateX - 2.1, 2.05, side * 2.9], steel);
    box('EntryDoorFrame', [0.6, 3.8, 0.3], [gateX - 0.5, 1.9, side * 2.05], iron);
    for(let y=4.3;y<10.8;y+=2.35) {
      box('WindowConcreteSill',[0.38,0.18,8.5],[gateX-.9,y-.48,side*11.3],concrete);
      for(let bay=0;bay<4;bay++) {
        const z=side*11.3+(bay-1.5)*1.9;
        box('FactoryWindowFrame',[.26,.95,1.68],[gateX-.79,y,z],iron);
        box('DirtyFactoryWindow',[.045,.73,1.42],[gateX-.94,y,z],glass);
        box('WindowMullion',[.07,.77,.055],[gateX-.98,y,z],steel);
      }
    }
    pipe([gateX-1.03,.3,side*18],[gateX-1.03,11.6,side*18],.105,rust);
    for(let y=1;y<11.6;y+=2)box('DownpipeBracket',[.18,.07,.35],[gateX-1.03,y,side*18],iron);
    box('BlindFloodlightBracket',[.3,.2,.2],[gateX-1.15,6.2,side*6.1],steel);
    box('UnpoweredEntranceFloodlight',[.22,.48,.7],[gateX-1.35,6.2,side*6.1],black);
    box('UnpoweredFloodlightLens',[.025,.3,.5],[gateX-1.47,6.2,side*6.1],deadTube);
    sign('GateRadiationPlaque','☢\nRADIATION / RESTRICTED',[gateX-1.02,2.15,side*5.55],1.8,1.65,-Math.PI/2,'#c2aa6b');
  }
  box('EntranceFacadeHeader',[1.1,7.9,9],[gateX-.2,7.75,0],brick);
  box('EntranceStoneLintel',[1.45,.42,10.4],[gateX-.38,4.05,0],concrete);
  box('EntranceCanopyRoof',[3.2,.24,6.4],[gateX-1.3,4.25,0],concrete);
  box('EntranceCanopySteelLip',[.12,.24,6.45],[gateX-2.92,4.19,0],steel);
  box('GatehouseCornice',[1.5,.38,40.5],[gateX-.15,11.7,0],concrete);
  sign('ChernobylPlantLettering','CHERNOBYL NPP',[gateX-.79,9.5,0],14.2,2.1,-Math.PI/2,'#a9ada4');
  sign('EntranceUnitMark','UNIT 01  /  SECURITY ACCESS',[gateX-.84,5.45,0],7.3,.7,-Math.PI/2,'#b7b8a5');
  sign('EntranceSmallSecuritySign','AUTHORIZED PERSONNEL ONLY',[gateX-1.05,2.8,-3.1],2.4,.58,-Math.PI/2,'#b6ad8b');
  // Roller-shutter housing and tracks are visible with the slab raised. It never
  // becomes a new invisible gate that could block Overwatch's first objectives.
  box('RaisedRollerShutterHousing',[.65,.65,4.1],[gateX-.65,3.5,0],iron);
  for(let strip=0;strip<4;strip++)box('RaisedShutterSlat',[.68,.055,4.04],[gateX-.65,3.2+strip*.13,0],steel);
  for(const side of[-1,1]) {
    for(const z of[side*7,side*11.2,side*15.5]) {
      grimePatch([gateX-.768,4.0,z],3.1,5.8,-Math.PI/2);
      grimePatch([gateX-.768,9.4,z],2.1,3.8,-Math.PI/2);
    }
    for(const y of[.5,2.7,5.6,8.7,11.3]) {
      const bolt=cylinder('FacadePierAnchor',.045,.045,[gateX-1.105,y,side*4.8],steel,false,8);
      bolt.rotation.z=Math.PI/2;
    }
    pipe([gateX-1.0,.4,side*7.5],[gateX-1.0,3.35,side*7.5],.035,iron);
    pipe([gateX-1.0,3.35,side*7.5],[gateX-1.0,3.35,side*10.5],.035,iron);
    box('SealedExteriorJunctionBox',[.17,.52,.4],[gateX-1.08,1.73,side*7.5],iron);
    box('JunctionBoxDoor',[.025,.45,.34],[gateX-1.18,1.73,side*7.5],steel);
    for(const y of[1.57,1.88])for(const dz of[-.12,.12])box('JunctionDoorFastener',[.035,.025,.025],[gateX-1.2,y,side*7.5+dz],black);
  }

  function jerseyBarrier(x,z,length=2.2) {
    const profile=new THREE.Shape();
    profile.moveTo(-.4,0);profile.lineTo(.4,0);profile.lineTo(.4,.18);profile.lineTo(.24,.52);profile.lineTo(.16,.98);
    profile.lineTo(-.16,.98);profile.lineTo(-.24,.52);profile.lineTo(-.4,.18);profile.closePath();
    const shape=new THREE.ExtrudeGeometry(profile,{depth:length,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,steps:1});
    shape.setIndex(Array.from({length:shape.getAttribute('position').count},(_,index)=>index));
    const uv=shape.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/4,uv.getY(i)/4);
    const barrier=new THREE.Mesh(shape,concrete);barrier.name='CastConcreteJerseyBarrier';barrier.position.set(x,.02,z-length/2);barrier.castShadow=barrier.receiveShadow=true;root.add(barrier);occluders.push(barrier);
    // Keep the established collision footprint and open insertion lane.
    colliders.push(new THREE.Box3(new THREE.Vector3(x-.265,.14,z-(length-.14)/2),new THREE.Vector3(x+.265,.86,z+(length-.14)/2)));
    walls.push({x,z,w:.53,d:length-.14});
    for(const side of [-1,1]) {
      const patch=box('BarrierReflectivePatch',[.018,.14,.32],[x+side*.28,.68,z],yellow);
      patch.rotation.x=.08;
    }
  }
  // Lane furniture stays outside the checkpoint-to-door route (|z|<2m).
  for(const z of [-3.25,3.25])for(const x of [-86,-82.5])jerseyBarrier(x,z);
  for(const z of [-2.25,2.25]) {
    box('GateBollard',[.2,1.35,.2],[gateX-2.4,.675,z],yellow,true);
    for(let i=0;i<3;i++)box('BollardDarkBand',[.205,.15,.205],[gateX-2.4,.35+i*.35,z],black);
  }

  // Field vehicle: wheels, hubs, grille, bonnet, mirrors, bumper, storage and
  // cargo framing remain readable at first-person scale. Headlights stay off.
  function tacticalTransport(x,z) {
    box('TransportChassis',[2.65,.32,5.9],[x,.8,z],iron,true);
    box('TransportHood',[2.45,.68,1.45],[x,1.45,z-2],green);
    box('TransportCabShell',[2.52,1.62,1.9],[x,1.95,z-.5],green,true);
    box('TransportFrontGlass',[2.13,.67,.065],[x,2.25,z-1.49],glass);
    box('TransportWindowCenterBar',[.09,.75,.08],[x,2.25,z-1.52],iron);
    for(const side of [-1,1]) {
      box('TransportDoorWindow',[.055,.67,1.2],[x+side*1.28,2.25,z-.48],glass);
      box('TransportCabDoor',[.07,.65,1.52],[x+side*1.28,1.5,z-.48],green);
      box('TransportDoorHandle',[.12,.07,.25],[x+side*1.34,1.77,z+.05],iron);
      pipe([x+side*1.27,2.4,z-1.1],[x+side*1.6,2.4,z-1.1],.035,iron);
      box('TransportMirror',[.13,.35,.22],[x+side*1.62,2.35,z-1.1],black);
      box('TransportCargoRail',[.12,.62,3.1],[x+side*1.28,1.55,z+1.8],green);
      for(let i=0;i<4;i++)box('CargoBedUpright',[.11,1.4,.11],[x+side*1.25,2.05,z+.3+i*.85],steel);
      pipe([x+side*1.25,2.75,z+.3],[x+side*1.25,2.75,z+2.85],.06,steel);
      for(const axle of [-1.6,1.8]) {
        const tire=cylinder('TransportTire',.64,.36,[x+side*1.31,.65,z+axle],rubber);
        tire.rotation.z=Math.PI/2;
        const hub=cylinder('TransportWheelHub',.34,.39,[x+side*1.33,.65,z+axle],iron);
        hub.rotation.z=Math.PI/2;
        for(let bolt=0;bolt<6;bolt++)box('WheelHubBolt',[.055,.055,.055],[x+side*1.55,.65+Math.cos(bolt*Math.PI/3)*.2,z+axle+Math.sin(bolt*Math.PI/3)*.2],steel);
        box('WheelArchFender',[.45,.13,1.55],[x+side*1.17,1.36,z+axle],green);
      }
    }
    box('TransportCargoDeck',[2.5,.25,3.1],[x,1.15,z+1.75],wood);
    box('TransportRearTailgate',[2.55,.75,.13],[x,1.55,z+3.2],green);
    box('TransportFrontBumper',[2.85,.25,.3],[x,.95,z-2.85],iron);
    box('TransportFrontGrille',[1.38,.43,.06],[x,1.35,z-2.76],black);
    for(let i=0;i<8;i++)box('GrilleSlat',[.06,.36,.08],[x-.55+i*.16,1.35,z-2.8],steel);
    for(const side of [-1,1]) {
      const lamp=cylinder('UnpoweredVehicleHeadlight',.19,.08,[x+side*.94,1.44,z-2.76],deadTube, false,12);
      lamp.rotation.x=Math.PI/2;
    }
    sign('VehicleFoundationMark','SCP\nFIELD TRANSPORT',[x-1.32,1.6,z+.6],.7,.55,-Math.PI/2,'#bac2ad');
  }
  tacticalTransport(-84.4,-8.4);

  function pallet(x,z,levels=1) {
    for(let level=0;level<levels;level++) {
      for(let slat=0;slat<5;slat++)box('PalletSlat',[1.6,.08,.16],[x,.18+level*.24,z+(slat-2)*.22],wood);
      for(const dx of [-.62,0,.62])box('PalletRunner',[.12,.14,1.12],[x+dx,.08+level*.24,z],wood);
    }
  }
  for(let i=0;i<3;i++)pallet(-94.5+i*1.8,6.5,2+(i%2));
  // Small covered staging bay, sandbags, generator and fuel drums.
  // The field shelter is a tensioned canvas roof with a shallow sag between
  // poles. Woven cloth and folded hems distinguish it from painted machinery.
  const roofPositions=[],roofUV=[],roofIndices=[],roofColumns=12,roofRows=10;
  for(let row=0;row<=roofRows;row++)for(let column=0;column<=roofColumns;column++){
    const u=column/roofColumns,v=row/roofRows;
    const y=3.72-Math.abs(v-.5)*1.06-Math.sin(u*Math.PI)*.085+Math.sin(u*Math.PI*8)*.017;
    roofPositions.push(-91.6+u*5.8,y,6.1+v*4.6);roofUV.push(u*1.45,v*1.15);
    if(row<roofRows&&column<roofColumns){const a=row*(roofColumns+1)+column,b=a+roofColumns+1;roofIndices.push(a,b,a+1,b,b+1,a+1);}
  }
  const roofGeometry=new THREE.BufferGeometry();roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roofGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(roofUV,2));roofGeometry.setIndex(roofIndices);roofGeometry.computeVertexNormals();
  const tentRoof=new THREE.Mesh(roofGeometry,fabric);tentRoof.name='TensionedCanvasShelter';tentRoof.castShadow=tentRoof.receiveShadow=true;root.add(tentRoof);occluders.push(tentRoof);
  for(const side of[-1,1]){
    box('CanvasShelterHem',[5.8,.19,.035],[-88.7,3.1,8.4+side*2.3],fabric);
    pipe([-91.4,3.19,8.4+side*2.25],[-86,3.19,8.4+side*2.25],.027,steel);
  }
  for(const dx of [-2.7,2.7])for(const dz of [-2.1,2.1])pipe([-88.7+dx,.05,8.4+dz],[-88.7+dx,3.3,8.4+dz],.06,steel);
  box('GeneratorEngine',[1.35,.9,.8],[-88.8,.55,9],green,true);
  box('GeneratorFuelCap',[.2,.12,.2],[-88.8,1.06,9],iron);
  for(const side of [-1,1])pipe([-89.5,.25,9+side*.5],[-88.1,.25,9+side*.5],.06,iron);
  for(let i=0;i<6;i++)box('GeneratorCoolingFin',[.05,.65,.045],[-89.49,.58,8.72+i*.1],steel);
  pipe([-88.4,.8,9.25],[-88.4,1.4,9.25],.04,iron);
  for(let row=0;row<2;row++)for(let i=0;i<5;i++) {
    const bag=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),sandbag);
    bag.name='CheckpointSandbag';bag.scale.set(.44,.145,.23);bag.position.set(-90.4+i*.75+row*.35,.14+row*.23,6.3);
    bag.rotation.y=(i%2-.5)*.08;bag.castShadow=bag.receiveShadow=true;root.add(bag);occluders.push(bag);
  }
  for(const dz of [-1,1]) {
    cylinder('FuelDrum',.36,1.08,[-92,.55,8.5+dz*.5],green,false,12);
    for(const y of [.25,.84])cylinder('FuelDrumBand',.375,.055,[-92,y,8.5+dz*.5],iron,false,12);
  }
  sign('StagingAreaPlacard','FOUNDATION LOGISTICS\nNO OPEN FLAMES',[-89.8,1.9,6.25],3.8,.8,0,'#b1b6a5');

  // Rooftop plant silhouettes and far yard service lines give the compound
  // scale beyond identical room boxes. They remain outside traversable ground.
  for(const s of sectors) {
    const {x,z}=s.center;
    if(s.id<=4) {
      cylinder('PlantVentStack',.75,7.5,[x+14.5,9.8,z-12.5],brick,false,16);
      cylinder('VentStackCap',.87,.3,[x+14.5,13.6,z-12.5],iron,false,16);
      for(const y of [7.4,10.4])cylinder('StackStructuralBand',.79,.14,[x+14.5,y,z-12.5],steel,false,16);
      box('RooftopVentilationUnit',[4.5,1.4,3],[x-12,6.95,z-12],steel);
      for(let i=0;i<6;i++)box('VentLouvre',[4.2,.05,.08],[x-12,6.45+i*.18,z-13.55],black);
    }
    for(const side of [-1,1]) {
      for(let i=0;i<4;i++)box('FacadeExpansionRib',[.24,6.25,.16],[x+side*22.8,3.1,z-16+i*10.5],iron);
      for(let y=2.9;y<5.7;y+=1.35)pipe([x-21.9,y,z-18],[x-21.9,y,z+18],.045,steel);
      for(const depth of[-1,1])grimePatch([x+side*22.22,2.5,z+depth*11.5],5.1,4.8,-side*Math.PI/2);
    }
    // Weather-stained hazard plates and flaking numbered utility panels.
    sign('SectorSafetyBoard','DANGER\nHIGH VOLTAGE / LOCKED OUT',[x+21.9,2.3,z+12.2],1.9,1.1,-Math.PI/2,'#c1a66b');
    for(let line=0;line<3;line++)box('FloorDrainGrating',[3.2,.015,.07],[x+3.8,.015,z+12+line*.14],iron);
    // Realistic service tray and cable runs stay above head height or against
    // the wall; they add scale without narrowing a mission or combat route.
    box('OverheadCableTray',[.55,.085,32],[x-19.6,4.15,z],iron);
    for(let slot=0;slot<32;slot++)box('CableTrayRung',[.6,.055,.065],[x-19.6,4.1,z-15.5+slot],steel);
    for(const offset of[-.12,0,.12])pipe([x-19.6+offset,4.23,z-16],[x-19.6+offset,4.23,z+16],.018,black);
    for(let bracket=0;bracket<5;bracket++) {
      box('CableTrayHanger',[.035,1.5,.035],[x-19.6,4.91,z-14+bracket*7],steel);
      box('CableTrayWallBracket',[2.2,.055,.07],[x-20.7,4.1,z-14+bracket*7],iron);
    }
    for(let loose=0;loose<3;loose++) {
      const offset=loose*.045;
      pipe([x-20.2+offset,.025,z+2],[x-20.2+offset,.025,z+7],.012,black);
      pipe([x-20.2+offset,.025,z+7],[x-19.5+offset,.025,z+8.6],.012,black);
    }
    for(const depth of[-1,1])box('FloorExpansionJoint',[39,.006,.025],[x,.004,z+depth*10],iron);
    for(let dash=0;dash<9;dash++)box('EquipmentLaneMark',[.07,.008,.55],[x-12.8,.008,z+3.5+dash*1.05],yellow);
  }
  // Low-cost wet patches catch the weapon beam. No lights are added to fixtures.
  const wet=new THREE.MeshPhysicalMaterial({color:0x34413f,metalness:.025,roughness:.12,clearcoat:1,clearcoatRoughness:.055,transparent:true,opacity:.42,depthWrite:false});
  for(let i=0;i<26;i++) {
    const outline=new THREE.Shape(),radius=.7+(i%5)*.28;
    for(let edge=0;edge<24;edge++){
      const angle=edge/24*Math.PI*2,irregular=radius*(.84+.11*Math.sin(angle*3+i*1.7)+.08*Math.cos(angle*7+i*.9));
      const x=Math.cos(angle)*irregular,y=Math.sin(angle)*irregular;
      if(edge===0)outline.moveTo(x,y);else outline.lineTo(x,y);
    }
    outline.closePath();
    const puddle=new THREE.Mesh(new THREE.ShapeGeometry(outline),wet);
    puddle.name='RainPuddle';puddle.rotation.x=-Math.PI/2;
    puddle.scale.y=.4+(i%3)*.18;
    puddle.position.set(-98+(i*7.13)%26,.012,-12+(i*4.97)%27);
    root.add(puddle);
  }
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
    batch.castShadow = meshes.some(mesh=>mesh.castShadow);
    batch.receiveShadow = meshes.some(mesh=>mesh.receiveShadow);
    root.add(batch);
    finalOccluders.push(batch);
    for (const mesh of meshes) mesh.removeFromParent();
  }
  root.updateWorldMatrix(true, true);

  return {
    root, colliders, occluders: finalOccluders, sectors, spawn: checkpoint, bossSpawns, bossEncounters,
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
