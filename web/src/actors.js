import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Articulated, block-proportioned field rigs. The root is the sole-contact plane
// (feet y=0), while armor, clothing and equipment remain original stand-ins.
const materials = new Map();
let fabricMap;
function textile() {
  if (fabricMap) return fabricMap;
  const data = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4;
    const value = 202 + ((x + y) % 2) * 21 + ((x * 13 + y * 7) % 9);
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  fabricMap = new THREE.DataTexture(data, 32, 32, THREE.RGBAFormat);
  fabricMap.wrapS = fabricMap.wrapT = THREE.RepeatWrapping;
  fabricMap.repeat.set(5, 5); fabricMap.colorSpace = THREE.SRGBColorSpace; fabricMap.needsUpdate = true;
  return fabricMap;
}
function material(color, kind = 'fabric') {
  const key = `${color}:${kind}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
    color, roughness: kind === 'metal' ? .43 : kind === 'rubber' ? .9 : kind === 'skin' ? .64 : .83,
    metalness: kind === 'metal' ? .68 : .05, map: kind === 'fabric' ? textile() : null,
  }));
  return materials.get(key);
}
function block(parent, name, size, position, color, kind = 'fabric', bevel = false) {
  const geometry = bevel ? new RoundedBoxGeometry(...size, 1, Math.min(.025, Math.min(...size) * .2)) : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, material(color, kind));
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, name, radius, length, position, color, axis = 'z') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material(color, 'metal'));
  mesh.name = name; mesh.position.set(...position);
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function pivot(parent, name, position) {
  const group = new THREE.Group(); group.name = name; group.position.set(...position); parent.add(group); return group;
}

// Merge accessories only within their animated joint. This retains articulated
// geometry and hit registration without hundreds of draw calls per operative.
function batchJoint(group) {
  const bins = new Map();
  for (const child of [...group.children]) {
    if (child.isGroup) batchJoint(child);
    if (!child.isMesh || child.userData.keepSeparate) continue;
    const key = child.material;
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(child);
  }
  for (const [mat, meshes] of bins) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      mesh.updateMatrix();
      // Rounded boxes are non-indexed; normalize ordinary boxes/cylinders too.
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    const result = new THREE.Mesh(merged, mat);
    result.name = `${group.name}Equipment`; result.castShadow = result.receiveShadow = true;
    result.userData.partNames = meshes.map(mesh => mesh.name);
    for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    group.add(result);
  }
}
function nameSprite(text) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d'); ctx.font = 'bold 29px monospace'; ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff3d38'; ctx.fillText(text, 256, 49);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, toneMapped: false }));
  sprite.position.set(0, 2.45, 0); sprite.scale.set(2.9, .45, 1); return sprite;
}

function rifle(parent, name, colors) {
  const group = pivot(parent, name, [-.18, -.34, -.03]);
  block(group, 'RifleUpperReceiver', [.145, .15, .53], [0, .015, -.17], colors.steel, 'metal', true);
  block(group, 'RifleLowerReceiver', [.135, .14, .3], [0, -.09, -.12], colors.armor, 'metal');
  block(group, 'RifleHandguard', [.135, .14, .43], [0, .025, -.63], colors.armor, 'metal', true);
  for (let i = 0; i < 5; i++) {
    block(group, 'HandguardVent', [.14, .024, .035], [0, .032, -.47 - i * .071], colors.black, 'rubber');
    block(group, 'PicatinnyRail', [.15, .026, .028], [0, .13, -.11 - i * .11], colors.black, 'metal');
  }
  cylinder(group, 'RifleBarrel', .026, .42, [0, .04, -1.02], colors.black);
  cylinder(group, 'FlashSuppressor', .038, .1, [0, .04, -1.26], colors.steel);
  block(group, 'RifleStockTube', [.07, .07, .32], [0, .04, .25], colors.black, 'metal');
  block(group, 'AdjustableStock', [.15, .21, .27], [0, -.025, .43], colors.armor, 'rubber', true);
  block(group, 'RifleStockPad', [.16, .24, .035], [0, -.02, .58], colors.black, 'rubber');
  const magazine = block(group, 'RifleMagazine', [.105, .29, .16], [0, -.27, -.22], colors.armor, 'metal', true); magazine.rotation.x = -.12;
  const grip = block(group, 'RifleGrip', [.105, .23, .1], [0, -.23, .06], colors.black, 'rubber'); grip.rotation.x = -.24;
  block(group, 'RifleSightMount', [.1, .055, .12], [0, .15, -.2], colors.black, 'metal');
  cylinder(group, 'RifleOptic', .055, .14, [0, .22, -.2], colors.black);
  cylinder(group, 'OpticGlass', .041, .008, [0, .22, -.275], 0x648b8a);
  block(group, 'FrontIronSight', [.035, .1, .04], [0, .15, -.82], colors.black, 'metal');
  cylinder(group, 'WeaponLightBody', .035, .16, [.115, .01, -.68], colors.black);
  return group;
}

export function createActor(id, definition, settings = {}) {
  const mesh = new THREE.Group(); mesh.name = id; mesh.userData.groundedRig = true;
  const body = pivot(mesh, 'Body', [0, .96, 0]);
  const colors = { black:0x0e151b, uniform:0x34404e, armor:0x26313e, edge:0x4a5967, steel:0x738088, white:0xbcc3bf, red:0x6d242a, skin:0xb3a08a };
  const tactical = !['Nikolai','Novak','Katya','Infected'].includes(id);
  const nu7 = ['Felon','Sukhoi','Mikoyan'].includes(id);
  if (nu7) { colors.uniform = 0x252f39; colors.armor = 0x1a232c; }
  if (id === 'Mikoyan' || id === 'Nikolai') colors.uniform = 0xb7bdb6;
  if (id === 'Novak' || id === 'Katya') colors.uniform = 0x141a1e;
  if (id === 'Infected') colors.uniform = 0x596052;
  const torsoWidth = id === 'Katya' ? .61 : .74;
  const torso = block(body, 'Torso', [torsoWidth, .72, .4], [0, .35, 0], colors.uniform, 'fabric', true);
  torso.userData.keepSeparate = true;
  block(body, 'Waist', [.66, .23, .38], [0, -.02, 0], colors.uniform, 'fabric', true);
  const head = pivot(body, 'Neck', [0, .74, 0]);
  block(head, 'Head', [.49, .43, .43], [0, .09, 0], id === 'Player' ? colors.skin : 0x0f1415, 'skin', true);
  const right = pivot(body, 'RightShoulder', [.47, .57, 0]);
  const left = pivot(body, 'LeftShoulder', [-.47, .57, 0]);
  const rElbow = pivot(right, 'RightElbow', [0, -.34, 0]);
  const lElbow = pivot(left, 'LeftElbow', [0, -.34, 0]);
  const rHip = pivot(body, 'RightHip', [.205, -.02, 0]);
  const lHip = pivot(body, 'LeftHip', [-.205, -.02, 0]);
  const rKnee = pivot(rHip, 'RightKnee', [0, -.43, 0]);
  const lKnee = pivot(lHip, 'LeftKnee', [0, -.43, 0]);
  const rFoot = pivot(rKnee, 'RightAnkle', [0, -.43, 0]);
  const lFoot = pivot(lKnee, 'LeftAnkle', [0, -.43, 0]);
  for (const [joint, elbow, side] of [[right,rElbow,1],[left,lElbow,-1]]) {
    block(joint, 'UpperSleeve', [.29, .36, .34], [0, -.15, 0], colors.uniform, 'fabric', true);
    block(elbow, 'ForearmSleeve', [.265, .31, .3], [0, -.13, -.005], colors.uniform, 'fabric', true);
    block(elbow, 'Glove', [.265, .18, .29], [0, -.34, -.012], colors.black, 'rubber', true);
    block(elbow, 'GloveKnuckles', [.24, .075, .15], [0, -.31, -.15], colors.armor, 'rubber');
    if (tactical) {
      block(joint, 'ShoulderArmor', [.36, .2, .4], [side*.035, -.015, -.005], colors.armor, 'rubber', true);
      block(joint, 'ShoulderTrim', [.375, .035, .405], [side*.035, -.115, -.005], colors.armor, 'rubber');
      block(elbow, 'ElbowPad', [.28, .18, .1], [0, .005, .16], colors.armor, 'rubber', true);
      block(elbow, 'WristStrap', [.28, .06, .32], [0, -.235, 0], colors.black, 'rubber');
      if (id === 'Player') block(joint, 'ShoulderReferenceAccent', [.025, .16, .3], [side*.195, -.035, -.005], colors.red, 'fabric');
    }
  }
  const trouser = id === 'Mikoyan' ? colors.uniform : id === 'Infected' ? 0x373d37 : 0x26313c;
  for (const [hip,knee,foot,side] of [[rHip,rKnee,rFoot,1],[lHip,lKnee,lFoot,-1]]) {
    block(hip, 'TrouserThigh', [.315, .43, .36], [0, -.215, 0], id === 'Katya' ? 0x10181a : trouser, 'fabric', true);
    block(knee, 'TrouserShin', [.3, .37, .34], [0, -.18, 0], id === 'Katya' ? 0x10181a : trouser, 'fabric', true);
    if (tactical) {
      block(hip, 'CargoPocket', [.1, .22, .28], [side*.19, -.18, .01], colors.uniform, 'fabric', true);
      block(knee, 'KneePad', [.31, .24, .1], [0, -.025, -.2], colors.armor, 'rubber', true);
      block(knee, 'KneePadInset', [.19, .14, .025], [0, -.025, -.26], colors.armor, 'rubber');
      block(knee, 'LowerLegStrap', [.315, .055, .355], [0, -.22, 0], colors.black, 'rubber');
    }
    const boot = block(foot, side===1?'RightBoot':'LeftBoot', [.34, .2, .48], [0, 0, -.065], colors.black, 'rubber', true);
    boot.userData.keepSeparate = true;
    block(foot, 'BootSole', [.35, .035, .49], [0, -.084, -.065], colors.black, 'rubber');
    block(foot, 'BootToeCap', [.3, .07, .15], [0, .025, -.25], colors.black, 'rubber', true);
    for (let i=0;i<3;i++) block(foot, 'BootLace', [.2, .012, .018], [0,.105,.01-i*.045], colors.black, 'rubber');
  }
  let hair=null,jaw=null; const appendages=[];
  if (tactical) {
    block(body, 'TacticalVest', [.78,.56,.5], [0,.37,0], colors.armor, 'fabric',true);
    block(body, 'ChestArmorPlate', [.59,.34,.055], [0,.47,-.28], colors.edge, 'rubber',true);
    block(body, 'ChestVelcro', [.28,.065,.028], [0,.63,-.315], colors.black,'fabric');
    for (const side of [-1,1]) {
      block(body, 'ShoulderCarrierStrap', [.11,.2,.48], [side*.265,.7,0], colors.armor,'fabric');
      block(body, 'VestSideBuckle', [.08,.09,.06], [side*.37,.48,-.27], colors.steel,'metal');
    }
    for (let i=0;i<3;i++) {
      block(body, 'MagazinePouch', [.17,.25,.105], [-.2+i*.2,.225,-.31], colors.black,'fabric',true);
      block(body, 'MagazinePouchFlap', [.175,.065,.12], [-.2+i*.2,.34,-.315], colors.armor,'fabric');
      for(let row=0;row<2;row++) block(body,'MolleWebbing',[.14,.018,.02],[-.2+i*.2,.26-row*.07,-.372],colors.edge,'fabric');
    }
    block(body, 'FieldBelt', [.72,.09,.44], [0,-.055,0], colors.black,'rubber');
    block(body, 'BeltBuckle', [.11,.075,.035], [0,-.055,-.24], colors.steel,'metal');
    block(body, 'MedicalPouch', [.24,.23,.14], [.37,.04,-.12], colors.armor,'fabric',true);
    block(body, 'MedicalCrossHorizontal', [.1,.025,.012], [.37,.04,-.198], id==='Player'?0x7c3838:colors.edge,'fabric');
    block(body, 'MedicalCrossVertical', [.025,.1,.012], [.37,.04,-.2], id==='Player'?0x7c3838:colors.edge,'fabric');
    block(body, 'RadioPouch', [.15,.29,.12], [-.34,.39,.21], colors.black,'rubber',true);
    cylinder(body,'RadioAntenna',.008,.37,[-.34,.72,.22],colors.black,'y');
    block(body, 'Backpack', [.47,.46,.22], [0,.4,.34], colors.armor,'fabric',true);
    for(const side of [-1,1])block(body,'BackpackStrap',[.08,.41,.03],[side*.19,.4,.47],colors.black,'fabric');
    block(head,'HelmetShell',[.58,.23,.53],[0,.28,.015],colors.armor,'rubber',true);
    block(head,'HelmetRim',[.6,.045,.55],[0,.18,.015],colors.armor,'rubber',true);
    block(head,'HelmetRailLeft',[.04,.09,.31],[-.31,.25,.04],colors.black,'metal');
    block(head,'HelmetRailRight',[.04,.09,.31],[.31,.25,.04],colors.black,'metal');
    for(const side of [-1,1])block(head,'HeadsetEarCup',[.1,.24,.22],[side*.29,.08,.025],colors.black,'rubber',true);
    block(head,'ChinStrap',[.51,.035,.04],[0,-.12,-.2],colors.black,'fabric');
    const human=id==='Player';
    if (human) {
      block(head,'Balaclava',[.505,.26,.455],[0,-.005,0],colors.black,'fabric',true);
      block(head,'VisibleEyeStrip',[.35,.07,.018],[0,.145,-.224],colors.skin,'skin');
      for(const side of [-1,1])block(head,'Eye',[.027,.026,.012],[side*.085,.145,-.237],colors.black,'rubber');
      block(head,'HelmetNVGMount',[.16,.16,.09],[0,.31,-.31],colors.black,'metal');
      const nvg=pivot(head,'FoldedNightVision',[0,.39,-.17]);nvg.rotation.x=-.5;
      for(const side of[-1,1]) {cylinder(nvg,'FoldedOpticTube',.045,.2,[side*.07,.04,-.07],colors.black);cylinder(nvg,'FoldedOpticGlass',.035,.012,[side*.07,.04,-.177],0x658475);}
    } else if(id==='John'||id==='Jayden') {
      block(body,'WhiteEquipmentMarker',[.36,.065,.02],[0,.61,-.32],colors.white,'fabric');
      block(head,'FaceCover',[.42,.22,.11],[0,-.005,-.225],colors.black,'rubber',true);
      for(const side of[-1,1]) {cylinder(head,'PurpleOpticTube',.065,.16,[side*.135,.13,-.27],colors.black);cylinder(head,'PurpleOpticLens',.051,.012,[side*.135,.13,-.356],0x7952a1);}
    } else {
      block(head,'GasMask',[.41,.29,.13],[0,-.005,-.235],0x222b2a,'rubber',true);
      for(const side of[-1,1]) {block(head,'MaskEyeSocket',[.13,.08,.035],[side*.115,.075,-.31],colors.black,'rubber',true);cylinder(head,'MaskFilter',.07,.11,[side*.165,-.105,-.325],colors.armor);}
      block(head,'BrokenOpticMount',[.13,.09,.12],[0,.31,-.3],colors.black,'metal');
      const optic=block(head,'BrokenNightVision',[.38,.07,.13],[.04,.36,-.3],colors.edge,'metal');optic.rotation.z=.22;
      block(body,'DamagedCarrierMark',[.2,.055,.012],[-.14,.52,-.314],0x111917,'rubber').rotation.z=.4;
      block(body,'DarkContamination',[.07,.19,.015],[.23,.41,-.318],0x101817,'rubber').rotation.z=-.2;
    }
    if(id==='Sukhoi') {
      jaw=pivot(head,'MaskJaw',[0,-.09,-.29]);
      block(jaw,'SplitMaskJaw',[.32,.13,.1],[0,-.035,-.03],colors.black,'rubber',true);
      for(let i=0;i<5;i++) {
        block(head,'MaskUpperTooth',[.025,.055,.025],[-.1+i*.05,-.075,-.33],colors.white,'skin');
        block(jaw,'MaskLowerTooth',[.025,.045,.025],[-.1+i*.05,.035,-.07],colors.white,'skin');
      }
      const tongue=block(jaw,'DarkTongue',[.055,.025,.25],[0,.015,-.18],colors.black,'skin',true);
      tongue.userData.keepSeparate=true;jaw.userData.tongue=tongue;
    }
  } else if (id==='Nikolai'||id==='Novak') {
    block(head,'HoodTop',[.6,.14,.54],[0,.33,.035],colors.uniform,'fabric',true);
    for(const side of[-1,1])block(head,'HoodSide',[.1,.49,.47],[side*.28,.08,.045],colors.uniform,'fabric',true);
    block(head,'HoodBack',[.51,.42,.09],[0,.09,.24],colors.uniform,'fabric');
    const rectangle=block(head,'PermanentFaceRectangle',[.57,.24,.055],[0,.1,-.25],0x010203,'rubber');rectangle.userData.keepSeparate=true;
    block(body,'HoodiePocket',[.46,.2,.035],[0,.12,-.23],colors.uniform,'fabric');
    for(const side of[-1,1]) {block(body,'HoodieDrawstring',[.012,.2,.013],[side*.095,.55,-.23],colors.white,'fabric');}
    if(id==='Nikolai') {block(head,'BlackCap',[.5,.1,.47],[0,.37,-.015],colors.black,'fabric');block(head,'CapBrim',[.49,.035,.16],[0,.33,-.32],colors.black,'rubber');}
  } else if(id==='Katya') {
    torso.material=material(0x10191b,'skin');
    const hairMat=material(0x0b0d0e,'skin').clone();
    hair=block(head,'Hair',[.58,.78,.18],[0,-.13,.24],0x0b0d0e,'skin');hair.material=hairMat;hair.userData.keepSeparate=true;
    for(const side of[-1,1]) {
      const strand=block(hair,'HairStrand',[.12,.75,.22],[side*.23,.03,-.1],0x0b0d0e,'skin');strand.material=hairMat;strand.rotation.z=side*.06;
      block(body,'TornClothingStrip',[.1,.33,.04],[side*.22,.25,-.22],0x080e11,'fabric').rotation.z=side*.12;
    }
    block(head,'RedEye',[.07,.075,.025],[-.13,.12,-.225],0xb0342c,'skin');
    block(head,'BlackEyeSocket',[.12,.1,.03],[.13,.12,-.225],0x030505,'skin');
    block(head,'WhitePupil',[.034,.034,.032],[.13,.12,-.242],0xdedacb,'skin');
    block(head,'MouthShadow',[.2,.045,.03],[0,-.055,-.23],0x030505,'skin');
    for(let i=0;i<5;i++)block(head,'InfectedTooth',[.022,.025,.012],[-.075+i*.038,-.045,-.25],colors.white,'skin');
  } else {
    block(body,'TornWorkShirtPlacket',[.045,.61,.025],[0,.34,-.215],0x333d35,'fabric');
    block(body,'WorkerPocket',[.18,.16,.035],[-.2,.46,-.225],0x6b705b,'fabric');
    block(head,'InfectedBrow',[.33,.05,.025],[0,.17,-.228],0x202b24,'skin');
    for(const side of[-1,1])block(head,'InfectedEye',[.055,.04,.025],[side*.12,.13,-.23],0x76816a,'skin');
    block(body,'StainedFabric',[.21,.13,.03],[.2,.12,-.22],0x28352d,'fabric').rotation.z=.24;
  }
  if(id==='Sukhoi'||id==='Katya')for(let i=0;i<(id==='Sukhoi'?3:2);i++){
    const p=pivot(body,`Appendage${i}`,[(i-(id==='Sukhoi'?1:.5))*.26,.5,.26]);
    const end=pivot(p,'AppendageEnd',[0,-.48,0]);
    block(p,'AppendageBase',[.09,.54,.09],[0,-.25,0],0x0a1112,'skin',true);
    block(end,'AppendageTip',[.055,.53,.055],[0,-.25,0],0x0a1112,'skin',true);
    p.userData.tip=end;appendages.push(p);
  }
  let weapon=null;
  if(settings.WeaponName){
    if(settings.WeaponName==='Axe'||settings.WeaponName==='Katana'){
      weapon=pivot(rElbow,settings.WeaponName,[0,-.34,-.08]);
      if(settings.WeaponName==='Axe'){
        cylinder(weapon,'AxeShaft',.027,1.05,[0,-.05,0],0x5a4431,'y');
        block(weapon,'AxeHead',[.38,.22,.07],[.12,.38,0],colors.steel,'metal',true);
        block(weapon,'AxeCuttingEdge',[.025,.25,.075],[.32,.38,0],0xa2a9a6,'metal');
      } else {
        block(weapon,'KatanaGrip',[.07,.24,.065],[0,-.03,0],colors.black,'rubber');
        block(weapon,'KatanaBlade',[.055,.99,.035],[0,-.65,0],0xb7bfbe,'metal');
        block(weapon,'KatanaGuard',[.2,.035,.105],[0,-.13,0],colors.steel,'metal');
      }
    } else weapon=rifle(rElbow,settings.WeaponName,colors);
  }
  batchJoint(body);
  const tag=definition&&nameSprite(definition.NameTag);if(tag)mesh.add(tag);
  const hitMeshes=[];mesh.traverse(object=>{if(object.isMesh)hitMeshes.push(object);});
  const rig={mesh,body,torso,head,right,left,rHip,lHip,rElbow,lElbow,rKnee,lKnee,rFoot,lFoot,hair,jaw,appendages,hitMeshes,tag,weapon,id,
    armed:!!weapon&&!['Axe','Katana'].includes(settings.WeaponName),gaitDistance:0,gaitBlend:0,lastPosition:mesh.position.clone()};
  mesh.userData.rig=rig;
  // Resolve a relaxed knee bend before the first frame; boots already touch y0.
  animateActor(rig,'Idle',0,1,false,{speed:0,distance:0});
  return rig;
}

const poses={
  Idle:[.08,.08,.12,.12,0],Walk:[.08,.08,.12,.12,0],Sit:[.2,.2,.5,.5,0],
  Guard:[1.0,1.0,.65,.65,-.02],Windup:[2.15,.5,.6,.65,-.06],
  Strike:[.65,.4,.25,.65,.13],Attack:[1.2,.65,.4,.6,.08],
  Kick:[.65,.5,.6,.6,-.1],Grab:[1.2,1.2,.25,.25,.05],
  Lift:[2.1,2.1,.25,.25,-.03],Slam:[.75,.75,.4,.4,.22],
  Fire:[.82,1.05,.72,.3,0],Burst:[.88,1.08,.75,.3,-.025],
  Throw:[.55,1.8,.5,.3,.1],Stagger:[-.2,.5,.35,.4,-.11],
  Hit:[.25,.4,.35,.4,-.08],Down:[.15,.25,.2,.3,0],Death:[.15,.25,.2,.3,0],
};
const clamp=THREE.MathUtils.clamp;
function solveLeg(hip,knee,foot,z,lift,hipHeight,weight=1){
  // Two-link IK in the local sagittal plane; stance boot stays on the floor.
  const ankleY=.1+lift;
  const y=ankleY-hipHeight;
  const d=clamp(Math.hypot(z,y),.1,.859);
  const bend=-Math.acos(clamp((d*d-.43*.43-.43*.43)/(2*.43*.43),-1,1));
  const upper=Math.atan2(-z,-y)-Math.atan2(.43*Math.sin(bend),.43+.43*Math.cos(bend));
  hip.rotation.x=upper*weight;knee.rotation.x=bend*weight;
  foot.rotation.x=-(upper+bend)*weight;
}

const downAxis=new THREE.Vector3(0,-1,0);
function holdRifle(rig,time,gait){
  // The two grips define the pose. Solving both elbows keeps the support hand
  // on the handguard instead of swinging beside a floating oversized rifle.
  const weapon=rig.weapon;
  if(weapon.parent!==rig.body)rig.body.add(weapon);
  weapon.position.set(.05,.34+Math.sin(time*1.65)*.002,-.15);
  weapon.rotation.set(-.09,.45,Math.sin(time*2)*.006*gait);weapon.scale.setScalar(.6);
  weapon.updateMatrix();
  const grips=[new THREE.Vector3(0,-.23,.06),new THREE.Vector3(0,0,-.63)];
  for(const [index,shoulder,elbow,side]of[[0,rig.right,rig.rElbow,1],[1,rig.left,rig.lElbow,-1]]){
    const target=grips[index].applyMatrix4(weapon.matrix);
    const delta=target.clone().sub(shoulder.position);
    const distance=clamp(delta.length(),.08,.675),direction=delta.normalize();
    const bend=new THREE.Vector3(side,0,.1).addScaledVector(direction,-new THREE.Vector3(side,0,.1).dot(direction)).normalize();
    const elbowPosition=shoulder.position.clone().addScaledVector(direction,distance/2).addScaledVector(bend,Math.sqrt(.34*.34-distance*distance/4));
    const upper=elbowPosition.clone().sub(shoulder.position).normalize();
    shoulder.quaternion.setFromUnitVectors(downAxis,upper);
    const forearm=target.sub(elbowPosition).normalize().applyQuaternion(shoulder.quaternion.clone().invert());
    elbow.quaternion.setFromUnitVectors(downAxis,forearm);
  }
}

export function animateActor(rig,pose,time,dt,moving=false,motion=null){
  if(rig.disposed)return;
  const p=poses[pose]||poses.Idle;
  const blend=1-Math.exp(-Math.min(.1,dt)*13);
  const actual=rig.mesh.position.distanceTo(rig.lastPosition);rig.lastPosition.copy(rig.mesh.position);
  const speed=motion?.speed??(dt>0?actual/dt:0);
  if(Number.isFinite(motion?.distance))rig.gaitDistance=motion.distance;
  else if(actual<2)rig.gaitDistance+=actual;
  const locomotion=(pose==='Walk'||pose==='Idle')&&moving&&speed>.04;
  rig.gaitBlend=THREE.MathUtils.lerp(rig.gaitBlend,locomotion?1:0,blend);
  const fallen=pose==='Down'||pose==='Death';
  const seated=pose==='Sit';
  // Keep the stride within the two-link leg's reach. A longer stride forces
  // the stance ankle upward when the knee reaches full extension.
  const step=.52;
  const phase=rig.gaitDistance/(step*2)*Math.PI*2;
  const gait=rig.gaitBlend;
  const breath=Math.sin(time*1.65)*.003;
  const bodyY=fallen?.66:seated?.56:.935-Math.abs(Math.sin(phase*2))*.008*gait;
  rig.body.position.y=THREE.MathUtils.lerp(rig.body.position.y,bodyY,blend);
  rig.body.rotation.x=THREE.MathUtils.lerp(rig.body.rotation.x,fallen?.035:p[4]+(rig.id==='Katya'?.06:0),blend);
  rig.body.rotation.z=THREE.MathUtils.lerp(rig.body.rotation.z,fallen?-Math.PI/2:Math.sin(phase)*.012*gait,blend);
  rig.torso.scale.y=1+(fallen?0:breath);
  const armSwing=Math.sin(phase)*.32*gait;
  const carrying=rig.armed&&(pose==='Idle'||pose==='Walk');
  const shoulders=carrying?[.65,1.0,.78,.32]:p;
  rig.right.rotation.x=THREE.MathUtils.lerp(rig.right.rotation.x,shoulders[0]-(carrying?.08:1)*armSwing,blend);
  rig.left.rotation.x=THREE.MathUtils.lerp(rig.left.rotation.x,shoulders[1]+(carrying?.08:1)*armSwing,blend);
  rig.rElbow.rotation.x=THREE.MathUtils.lerp(rig.rElbow.rotation.x,shoulders[2],blend);
  rig.lElbow.rotation.x=THREE.MathUtils.lerp(rig.lElbow.rotation.x,shoulders[3],blend);
  rig.right.rotation.z=THREE.MathUtils.lerp(rig.right.rotation.z,carrying||pose==='Fire'||pose==='Burst'?-.18:-.025,blend);
  rig.left.rotation.z=THREE.MathUtils.lerp(rig.left.rotation.z,carrying||pose==='Fire'||pose==='Burst'?.6:.025,blend);
  if(fallen){
    rig.rHip.rotation.x=.08;rig.lHip.rotation.x=-.05;rig.rKnee.rotation.x=-.15;rig.lKnee.rotation.x=-.1;
    rig.rFoot.rotation.x=rig.lFoot.rotation.x=0;
  }else if(seated){
    rig.rHip.rotation.x=rig.lHip.rotation.x=Math.PI/2;
    rig.rKnee.rotation.x=rig.lKnee.rotation.x=-Math.PI/2;
    rig.rFoot.rotation.x=rig.lFoot.rotation.x=0;
  }else{
    for(const [hip,knee,foot,offset]of[[rig.rHip,rig.rKnee,rig.rFoot,0],[rig.lHip,rig.lKnee,rig.lFoot,Math.PI]]){
      const cycle=((phase+offset)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      const stance=cycle<Math.PI;
      const t=stance?cycle/Math.PI:(cycle-Math.PI)/Math.PI;
      const z=(stance?-step/2+t*step:step/2-t*step)*gait;
      const lift=(stance?0:Math.sin(t*Math.PI)*.14)*gait;
      solveLeg(hip,knee,foot,z,lift,rig.body.position.y-.02);
    }
    if(pose==='Kick')solveLeg(rig.rHip,rig.rKnee,rig.rFoot,-.68,.32,rig.body.position.y-.02);
  }
  rig.head.rotation.x=THREE.MathUtils.lerp(rig.head.rotation.x,rig.id==='Katya'?.08+Math.sin(time*.8)*.04:Math.sin(time*.7)*.012,blend);
  rig.head.rotation.y=THREE.MathUtils.lerp(rig.head.rotation.y,fallen?0:Math.sin(time*.43)*.025,blend);
  rig.head.rotation.z=fallen?0:Math.sin(time*1.2)*(rig.id==='Katya'?.04:.006);
  if(rig.weapon&&rig.armed&&(carrying||['Guard','Fire','Burst'].includes(pose))){
    holdRifle(rig,time,gait);
  }else if(rig.weapon&&rig.armed){
    if(rig.weapon.parent!==rig.rElbow)rig.rElbow.add(rig.weapon);
    rig.weapon.position.set(-.18,-.34,-.03);rig.weapon.scale.setScalar(.6);
    // Counter-rotate the held receiver so the barrel remains forward, not vertical.
    rig.weapon.rotation.set(-(rig.right.rotation.x+rig.rElbow.rotation.x)-.09,0,-rig.right.rotation.z);
  }
  if(rig.jaw){
    const opening=['Attack','Grab','Strike','Slam'].includes(pose);
    rig.jaw.rotation.x=THREE.MathUtils.lerp(rig.jaw.rotation.x,opening?.65:0,blend);
    if(rig.jaw.userData.tongue)rig.jaw.userData.tongue.scale.z=THREE.MathUtils.lerp(rig.jaw.userData.tongue.scale.z,opening?1:.12,blend);
  }
  rig.appendages.forEach((joint,index)=>{
    joint.rotation.x=Math.sin(time*1.3+index)*.12+(['Grab','Strike','Slam'].includes(pose)?-1.12:.15);
    joint.rotation.z=Math.sin(time*.8+index)*.13;
    joint.userData.tip.rotation.x=Math.sin(time*1.6+index)*.22;
  });
  if(rig.tag)rig.tag.visible=pose!=='Death';
}

export function disposeActor(rig){
  if(rig.disposed)return;rig.disposed=true;rig.mesh.removeFromParent();
  rig.mesh.traverse(object=>{
    if(object.isMesh)object.geometry.dispose();
    if(object.isSprite){object.material.map?.dispose();object.material.dispose();}
  });
  if(rig.hair)rig.hair.material.dispose();
}
