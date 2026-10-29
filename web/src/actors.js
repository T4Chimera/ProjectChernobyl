import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Classic R6 bind dimensions at 0.4 browser units per Roblox stud. Six primary
// rigid body parts use RootJoint/Neck/Shoulder/Hip transforms; equipment is welded
// to those parts. The outer root remains the floor/sole plane (feet y=0).
const materials = new Map();
let fabricMap, fabricNormal;
function textile() {
  if (fabricMap) return fabricMap;
  const size=128,data=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  const noise=(x,y)=>{let n=Math.imul(x+19,374761393)^Math.imul(y+41,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    // Broad, muted camouflage with close textile weave and irregular worn fibres.
    const patch=Math.sin(x*.11+Math.sin(y*.08)*2)+Math.cos(y*.12+Math.sin(x*.07)*3);
    const shade=(patch>.7?226:patch<-.55?169:199)+(noise(x,y)-.5)*20+((x+y)%2)*6;
    data[i]=data[i+1]=data[i+2]=shade;data[i+3]=255;
    normal[i]=123+(x%2)*10;normal[i+1]=123+(y%2)*10;normal[i+2]=255;normal[i+3]=255;
  }
  const map=data=>{const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;};
  fabricMap=map(data);fabricMap.colorSpace=THREE.SRGBColorSpace;fabricNormal=map(normal);
  return fabricMap;
}
function material(color,kind='fabric'){
  const key=`${color}:${kind}`;
  if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({
    color,roughness:kind==='metal'?.46:kind==='rubber'?.86:kind==='skin'?.69:.88,
    metalness:kind==='metal'?.48:.025,map:kind==='fabric'?textile():null,
    normalMap:kind==='fabric'?fabricNormal:null,normalScale:new THREE.Vector2(.2,.2),
    envMapIntensity:kind==='metal'?1.15:1,
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
  mesh.userData.rigType='R6';mesh.userData.studScale=.4;
  const rootPart=new THREE.Object3D();rootPart.name='HumanoidRootPart';rootPart.position.y=1.2;
  rootPart.userData.sizeStuds=[2,2,1];rootPart.userData.soleOffsetStuds=3;mesh.add(rootPart);
  const body=pivot(mesh,'RootJoint',[0,1.2,0]);
  body.userData.motor6D={part0:'HumanoidRootPart',part1:'Torso',c0:[0,0,0],c1:[0,0,0]};
  const colors={black:0x14202a,uniform:0x3a4c60,armor:0x29394b,edge:0x536479,steel:0x77838c,white:0xbcc3bf,red:0x6d242a,skin:0xb3a08a};
  const tactical=!['Nikolai','Novak','Katya','Infected'].includes(id);
  const nu7=['Felon','Sukhoi','Mikoyan'].includes(id);
  if(nu7){colors.uniform=0x2b3947;colors.armor=0x1d2c39;}
  if(id==='Mikoyan'||id==='Nikolai')colors.uniform=0xb7bdb6;
  if(id==='Novak'||id==='Katya')colors.uniform=0x141a1e;
  if(id==='Infected')colors.uniform=0x596052;
  const primaryParts={};
  function primary(parent,name,size,position,color,kind='fabric',rounded=true){
    const part=block(parent,name,size,position,color,kind,rounded);
    part.userData.keepSeparate=true;part.userData.r6BodyPart=true;
    part.userData.sizeStuds=size.map(value=>value/.4);primaryParts[name]=part;return part;
  }
  const torso=primary(body,'Torso',[.8,.8,.4],[0,0,0],colors.uniform);
  const head=pivot(body,'Neck',[0,.4,0]);
  head.userData.motor6D={part0:'Torso',part1:'Head',c0:[0,1,0],c1:[0,-.5,0]};
  const skull=new THREE.Mesh(new THREE.CylinderGeometry(.275,.275,.4,20),material(id==='Player'?colors.black:0x131a1c,id==='Player'?'fabric':'skin'));
  skull.scale.z=.9;skull.name='Head';skull.position.y=.2;skull.castShadow=skull.receiveShadow=true;
  skull.userData.keepSeparate=true;skull.userData.r6BodyPart=true;skull.userData.sizeStuds=[2,1,1];head.add(skull);primaryParts.Head=skull;
  const right=pivot(body,'Right Shoulder',[.4,.2,0]),left=pivot(body,'Left Shoulder',[-.4,.2,0]);
  const rHip=pivot(body,'Right Hip',[.2,-.4,0]),lHip=pivot(body,'Left Hip',[-.2,-.4,0]);
  const rHand=pivot(right,'RightGripAttachment',[.2,-.52,0]),lHand=pivot(left,'LeftGripAttachment',[-.2,-.52,0]);
  const rFoot=pivot(rHip,'RightSoleAttachment',[0,-.8,0]),lFoot=pivot(lHip,'LeftSoleAttachment',[0,-.8,0]);
  for(const[joint,side,name]of[[right,1,'Right Arm'],[left,-1,'Left Arm']]){
    joint.userData.motor6D={part0:'Torso',part1:name,c0:[side,.5,0],c1:[-side*.5,.5,0]};
    primary(joint,name,[.4,.8,.4],[side*.2,-.2,0],colors.uniform);
    // Gloves, sleeves and pads are welded surfaces on one rigid R6 arm.
    block(joint,'GloveShell',[.405,.2,.405],[side*.2,-.5,0],colors.black,'rubber',true);
    block(joint,'GloveKnuckles',[.3,.13,.045],[side*.2,-.49,-.22],colors.armor,'rubber',true);
    block(joint,'WristStrap',[.415,.06,.415],[side*.2,-.36,0],colors.black,'rubber');
    if(tactical){
      block(joint,'ShoulderArmor',[.46,.25,.45],[side*.21,.045,0],colors.armor,'rubber',true);
      block(joint,'ShoulderTrim',[.47,.025,.46],[side*.21,-.085,0],colors.edge,'rubber');
      block(joint,'ElbowPad',[.34,.22,.06],[side*.2,-.22,.23],colors.armor,'rubber',true);
      block(joint,'ArmPatch',[.024,.16,.24],[side*.425,-.04,0],colors.black,'fabric');
      for(let line=0;line<3;line++)block(joint,'PatchStitch',[.027,.008,.21],[side*.429,-.095+line*.055,0],colors.edge,'fabric');
    }
  }
  const trouser=id==='Mikoyan'?colors.uniform:id==='Infected'?0x424b42:0x2f4053;
  for(const[hip,foot,side,name]of[[rHip,rFoot,1,'Right Leg'],[lHip,lFoot,-1,'Left Leg']]){
    hip.userData.motor6D={part0:'Torso',part1:name,c0:[side*.5,-1,0],c1:[0,1,0]};
    primary(hip,name,[.4,.8,.4],[0,-.4,0],id==='Katya'?0x10181a:trouser);
    block(hip,'BootGaiter',[.405,.24,.41],[0,-.67,0],colors.black,'fabric',true);
    const boot=block(foot,side===1?'RightBoot':'LeftBoot',[.41,.17,.45],[0,.085,-.025],colors.black,'rubber',true);
    boot.userData.keepSeparate=true;
    block(foot,'BootSole',[.42,.03,.46],[0,.015,-.025],colors.black,'rubber');
    for(let row=0;row<4;row++)block(foot,'BootLace',[.24,.013,.02],[0,.175,-.15+row*.055],colors.edge,'fabric');
    if(tactical){
      block(hip,'CargoPocket',[.08,.27,.28],[side*.235,-.2,0],colors.uniform,'fabric',true);
      block(hip,'CargoPocketFlap',[.09,.065,.29],[side*.235,-.085,0],colors.edge,'fabric');
      block(hip,'KneePad',[.34,.27,.08],[0,-.43,-.23],colors.armor,'rubber',true);
      block(hip,'KneePadInset',[.23,.18,.025],[0,-.43,-.28],colors.edge,'rubber',true);
      for(const y of[-.34,-.51])block(hip,'LegStrap',[.41,.045,.42],[0,y,0],colors.black,'rubber');
      for(const x of[-.11,.11])cylinder(hip,'KneePadRivet',.012,.02,[x,-.43,-.3],colors.steel);
    }
  }
  // These are static weld groups, not additional body joints.
  const bodyGear=pivot(body,'TorsoEquipment',[0,-.4,0]);
  const headGear=pivot(head,'HeadEquipment',[0,.11,0]);
  let hair=null,jaw=null; const appendages=[];
  if (tactical) {
    block(bodyGear, 'TacticalVest', [.78,.56,.5], [0,.37,0], colors.armor, 'fabric',true);
    block(bodyGear, 'ChestArmorPlate', [.59,.34,.055], [0,.47,-.28], colors.edge, 'rubber',true);
    for(let col=0;col<4;col++)for(let row=0;row<3;row++)block(bodyGear,'CarrierMolleLoop',[.13,.018,.025],[-.255+col*.17,.48-row*.055,-.318],colors.armor,'fabric');
    for(const side of[-1,1]){
      block(bodyGear,'CarrierStitch',[.012,.5,.018],[side*.365,.37,-.26],colors.edge,'fabric');
      block(bodyGear,'HipUtilityPouch',[.19,.21,.19],[side*.4,.01,.12],colors.armor,'fabric',true);
      block(bodyGear,'PouchPullTab',[.055,.07,.02],[side*.4,.03,.225],colors.black,'rubber');
    }
    block(bodyGear,'GroinArmor',[.47,.2,.075],[0,-.12,-.23],colors.armor,'rubber',true);
    block(bodyGear, 'ChestVelcro', [.28,.065,.028], [0,.63,-.315], colors.black,'fabric');
    for (const side of [-1,1]) {
      block(bodyGear, 'ShoulderCarrierStrap', [.11,.2,.48], [side*.265,.7,0], colors.armor,'fabric');
      block(bodyGear, 'VestSideBuckle', [.08,.09,.06], [side*.37,.48,-.27], colors.steel,'metal');
    }
    for (let i=0;i<3;i++) {
      block(bodyGear, 'MagazinePouch', [.17,.25,.105], [-.2+i*.2,.225,-.31], colors.black,'fabric',true);
      block(bodyGear, 'MagazinePouchFlap', [.175,.065,.12], [-.2+i*.2,.34,-.315], colors.armor,'fabric');
      for(let row=0;row<2;row++) block(bodyGear,'MolleWebbing',[.14,.018,.02],[-.2+i*.2,.26-row*.07,-.372],colors.edge,'fabric');
    }
    block(bodyGear, 'FieldBelt', [.72,.09,.44], [0,-.055,0], colors.black,'rubber');
    block(bodyGear, 'BeltBuckle', [.11,.075,.035], [0,-.055,-.24], colors.steel,'metal');
    block(bodyGear, 'MedicalPouch', [.24,.23,.14], [.37,.04,-.12], colors.armor,'fabric',true);
    block(bodyGear, 'MedicalCrossHorizontal', [.1,.025,.012], [.37,.04,-.198], id==='Player'?0x7c3838:colors.edge,'fabric');
    block(bodyGear, 'MedicalCrossVertical', [.025,.1,.012], [.37,.04,-.2], id==='Player'?0x7c3838:colors.edge,'fabric');
    block(bodyGear, 'RadioPouch', [.15,.29,.12], [-.34,.39,.21], colors.black,'rubber',true);
    cylinder(bodyGear,'RadioAntenna',.008,.37,[-.34,.72,.22],colors.black,'y');
    block(bodyGear, 'Backpack', [.47,.46,.22], [0,.4,.34], colors.armor,'fabric',true);
    for(const side of [-1,1])block(bodyGear,'BackpackStrap',[.08,.41,.03],[side*.19,.4,.47],colors.black,'fabric');
    const helmet=new THREE.Mesh(new THREE.SphereGeometry(.335,20,10,0,Math.PI*2,0,Math.PI/2),material(colors.armor,'rubber'));
    helmet.name='HelmetShell';helmet.scale.set(1,.84,.94);helmet.position.set(0,.22,.015);helmet.castShadow=helmet.receiveShadow=true;headGear.add(helmet);
    const rim=cylinder(headGear,'HelmetRim',.336,.035,[0,.225,.015],colors.edge,'y');rim.scale.z=.94;
    for(const side of[-1,1]){
      block(headGear,'HelmetVelcro',[.08,.12,.23],[side*.29,.3,.035],colors.black,'fabric',true);
      for(let i=0;i<3;i++)block(headGear,'HelmetRailSlot',[.045,.022,.035],[side*.327,.23,-.08+i*.075],colors.edge,'metal');
    }
    block(headGear,'HelmetRailLeft',[.04,.09,.31],[-.31,.25,.04],colors.black,'metal');
    block(headGear,'HelmetRailRight',[.04,.09,.31],[.31,.25,.04],colors.black,'metal');
    for(const side of [-1,1])block(headGear,'HeadsetEarCup',[.1,.24,.22],[side*.29,.08,.025],colors.black,'rubber',true);
    block(headGear,'ChinStrap',[.51,.035,.04],[0,-.12,-.2],colors.black,'fabric');
    const human=id==='Player';
    if (human) {
      block(headGear,'Balaclava',[.505,.26,.455],[0,-.005,0],colors.black,'fabric',true);
      block(headGear,'VisibleEyeStrip',[.35,.07,.018],[0,.145,-.224],colors.skin,'skin');
      block(headGear,'BallisticGoggleFrame',[.49,.15,.05],[0,.15,-.26],colors.black,'rubber',true);
      block(headGear,'BallisticGoggleLens',[.43,.105,.025],[0,.15,-.291],0x475766,'metal',true);
      block(headGear,'GoggleNoseBridge',[.055,.08,.03],[0,.105,-.31],colors.black,'rubber');
      cylinder(headGear,'HeadsetMicrophoneBoom',.012,.28,[-.29,-.025,-.19],colors.black);
      block(headGear,'MicrophoneTip',[.06,.045,.06],[-.28,-.025,-.34],colors.black,'rubber',true);
      for(const side of [-1,1])block(headGear,'Eye',[.027,.026,.012],[side*.085,.145,-.237],colors.black,'rubber');
      block(headGear,'HelmetNVGMount',[.16,.16,.09],[0,.31,-.31],colors.black,'metal');
      const nvg=pivot(headGear,'FoldedNightVision',[0,.39,-.17]);nvg.rotation.x=-.5;
      nvg.position.y=.42;nvg.rotation.x=-1.2;
      for(const side of[-1,1]) {
        cylinder(nvg,'FoldedOpticTube',.049,.27,[side*.075,.04,-.07],colors.black);
        cylinder(nvg,'FoldedOpticRim',.053,.025,[side*.075,.04,-.206],colors.edge);
        cylinder(nvg,'FoldedOpticGlass',.036,.012,[side*.075,.04,-.221],0x657e77);
      }
    } else if(id==='John'||id==='Jayden') {
      block(bodyGear,'WhiteEquipmentMarker',[.36,.065,.02],[0,.61,-.32],colors.white,'fabric');
      block(headGear,'FaceCover',[.42,.22,.11],[0,-.005,-.225],colors.black,'rubber',true);
      for(const side of[-1,1]) {cylinder(headGear,'PurpleOpticTube',.065,.16,[side*.135,.13,-.27],colors.black);cylinder(headGear,'PurpleOpticLens',.051,.012,[side*.135,.13,-.356],0x7952a1);}
    } else {
      block(headGear,'GasMask',[.41,.29,.13],[0,-.005,-.235],0x222b2a,'rubber',true);
      for(const side of[-1,1]) {block(headGear,'MaskEyeSocket',[.13,.08,.035],[side*.115,.075,-.31],colors.black,'rubber',true);cylinder(headGear,'MaskFilter',.07,.11,[side*.165,-.105,-.325],colors.armor);}
      block(headGear,'BrokenOpticMount',[.13,.09,.12],[0,.31,-.3],colors.black,'metal');
      const optic=block(headGear,'BrokenNightVision',[.38,.07,.13],[.04,.36,-.3],colors.edge,'metal');optic.rotation.z=.22;
      block(bodyGear,'DamagedCarrierMark',[.2,.055,.012],[-.14,.52,-.314],0x111917,'rubber').rotation.z=.4;
      block(bodyGear,'DarkContamination',[.07,.19,.015],[.23,.41,-.318],0x101817,'rubber').rotation.z=-.2;
    }
    if(id==='Sukhoi') {
      jaw=pivot(headGear,'MaskJaw',[0,-.09,-.29]);
      block(jaw,'SplitMaskJaw',[.32,.13,.1],[0,-.035,-.03],colors.black,'rubber',true);
      for(let i=0;i<5;i++) {
        block(headGear,'MaskUpperTooth',[.025,.055,.025],[-.1+i*.05,-.075,-.33],colors.white,'skin');
        block(jaw,'MaskLowerTooth',[.025,.045,.025],[-.1+i*.05,.035,-.07],colors.white,'skin');
      }
      const tongue=block(jaw,'DarkTongue',[.055,.025,.25],[0,.015,-.18],colors.black,'skin',true);
      tongue.userData.keepSeparate=true;jaw.userData.tongue=tongue;
    }
  } else if (id==='Nikolai'||id==='Novak') {
    block(headGear,'HoodTop',[.6,.14,.54],[0,.33,.035],colors.uniform,'fabric',true);
    for(const side of[-1,1])block(headGear,'HoodSide',[.1,.49,.47],[side*.28,.08,.045],colors.uniform,'fabric',true);
    block(headGear,'HoodBack',[.51,.42,.09],[0,.09,.24],colors.uniform,'fabric');
    const rectangle=block(headGear,'PermanentFaceRectangle',[.57,.24,.055],[0,.1,-.25],0x010203,'rubber');rectangle.userData.keepSeparate=true;
    block(bodyGear,'HoodiePocket',[.46,.2,.035],[0,.12,-.23],colors.uniform,'fabric');
    for(const side of[-1,1]) {block(bodyGear,'HoodieDrawstring',[.012,.2,.013],[side*.095,.55,-.23],colors.white,'fabric');}
    if(id==='Nikolai') {block(headGear,'BlackCap',[.5,.1,.47],[0,.37,-.015],colors.black,'fabric');block(headGear,'CapBrim',[.49,.035,.16],[0,.33,-.32],colors.black,'rubber');}
  } else if(id==='Katya') {
    torso.material=material(0x10191b,'skin');
    const hairMat=material(0x0b0d0e,'skin').clone();
    hair=block(headGear,'Hair',[.58,.78,.18],[0,-.13,.24],0x0b0d0e,'skin');hair.material=hairMat;hair.userData.keepSeparate=true;
    for(const side of[-1,1]) {
      const strand=block(hair,'HairStrand',[.12,.75,.22],[side*.23,.03,-.1],0x0b0d0e,'skin');strand.material=hairMat;strand.rotation.z=side*.06;
      block(bodyGear,'TornClothingStrip',[.1,.33,.04],[side*.22,.25,-.22],0x080e11,'fabric').rotation.z=side*.12;
    }
    block(headGear,'RedEye',[.07,.075,.025],[-.13,.12,-.225],0xb0342c,'skin');
    block(headGear,'BlackEyeSocket',[.12,.1,.03],[.13,.12,-.225],0x030505,'skin');
    block(headGear,'WhitePupil',[.034,.034,.032],[.13,.12,-.242],0xdedacb,'skin');
    block(headGear,'MouthShadow',[.2,.045,.03],[0,-.055,-.23],0x030505,'skin');
    for(let i=0;i<5;i++)block(headGear,'InfectedTooth',[.022,.025,.012],[-.075+i*.038,-.045,-.25],colors.white,'skin');
  } else {
    block(bodyGear,'TornWorkShirtPlacket',[.045,.61,.025],[0,.34,-.215],0x333d35,'fabric');
    block(bodyGear,'WorkerPocket',[.18,.16,.035],[-.2,.46,-.225],0x6b705b,'fabric');
    block(headGear,'InfectedBrow',[.33,.05,.025],[0,.17,-.228],0x202b24,'skin');
    for(const side of[-1,1])block(headGear,'InfectedEye',[.055,.04,.025],[side*.12,.13,-.23],0x76816a,'skin');
    block(bodyGear,'StainedFabric',[.21,.13,.03],[.2,.12,-.22],0x28352d,'fabric').rotation.z=.24;
  }
  if(id==='Sukhoi'||id==='Katya')for(let i=0;i<(id==='Sukhoi'?3:2);i++){
    const p=pivot(bodyGear,`Appendage${i}`,[(i-(id==='Sukhoi'?1:.5))*.26,.5,.26]);
    const end=pivot(p,'AppendageEnd',[0,-.48,0]);
    block(p,'AppendageBase',[.09,.54,.09],[0,-.25,0],0x0a1112,'skin',true);
    block(end,'AppendageTip',[.055,.53,.055],[0,-.25,0],0x0a1112,'skin',true);
    p.userData.tip=end;appendages.push(p);
  }
  let weapon=null;
  if(settings.WeaponName){
    if(settings.WeaponName==='Axe'||settings.WeaponName==='Katana'){
      weapon=pivot(rHand,settings.WeaponName,[0,0,-.08]);
      if(settings.WeaponName==='Axe'){
        cylinder(weapon,'AxeShaft',.027,1.05,[0,-.05,0],0x5a4431,'y');
        block(weapon,'AxeHead',[.38,.22,.07],[.12,.38,0],colors.steel,'metal',true);
        block(weapon,'AxeCuttingEdge',[.025,.25,.075],[.32,.38,0],0xa2a9a6,'metal');
      } else {
        block(weapon,'KatanaGrip',[.07,.24,.065],[0,-.03,0],colors.black,'rubber');
        block(weapon,'KatanaBlade',[.055,.99,.035],[0,-.65,0],0xb7bfbe,'metal');
        block(weapon,'KatanaGuard',[.2,.035,.105],[0,-.13,0],colors.steel,'metal');
      }
    } else weapon=rifle(body,settings.WeaponName,colors);
  }
  batchJoint(body);
  const tag=definition&&nameSprite(definition.NameTag);if(tag)mesh.add(tag);
  const hitMeshes=[];mesh.traverse(object=>{if(object.isMesh)hitMeshes.push(object);});
  const rig={mesh,body,torso,head,right,left,rHip,lHip,rHand,lHand,rFoot,lFoot,hair,jaw,appendages,hitMeshes,tag,weapon,id,
    primaryParts,rootPart,rigType:'R6',armed:!!weapon&&!['Axe','Katana'].includes(settings.WeaponName),
    gaitDistance:0,gaitBlend:0,lastPosition:mesh.position.clone(),
    locomotion:{phase:0,stride:.58,runBlend:0,grounded:true,speed:0,
      feet:[{planted:false,anchor:new THREE.Vector3()},{planted:false,anchor:new THREE.Vector3()}]}};
  mesh.userData.rig=rig;
  animateActor(rig,'Idle',0,1,false,{speed:0,distance:0});
  return rig;
}

const poses={
  Idle:[.04,.04,0],Walk:[.04,.04,0],Run:[.04,.04,0],Sit:[.12,.12,.025],
  Guard:[.95,1.05,-.02],Windup:[2.15,.5,-.06],Strike:[.65,.4,.13],Attack:[1.2,.65,.08],
  Kick:[.65,.5,-.1],Grab:[1.2,1.2,.05],Lift:[2.1,2.1,-.03],Slam:[.75,.75,.22],
  Fire:[.82,1.05,0],Burst:[.88,1.08,-.025],Throw:[.55,1.8,.1],
  Stagger:[-.2,.5,-.11],Hit:[.25,.4,-.08],Down:[.15,.25,0],Death:[.15,.25,0],
};
const clamp=THREE.MathUtils.clamp;
const soleBounds=new THREE.Box3(),rootPosition=new THREE.Vector3(),legOrigin=new THREE.Vector3();
const footTarget=new THREE.Vector3(),footCenter=new THREE.Vector3(0,-.715,-.025),rotatedFoot=new THREE.Vector3();
const inverseBody=new THREE.Quaternion(),legRotation=new THREE.Quaternion(),legEuler=new THREE.Euler(0,0,0,'YXZ');
const TAU=Math.PI*2;

function holdRifle(rig,time,gait){
  const weapon=rig.weapon;
  if(weapon.parent!==rig.body)rig.body.add(weapon);
  weapon.position.set(0,0,0);weapon.rotation.set(-.07,1.08,-.12+Math.sin(time*1.8)*.008*gait);weapon.scale.setScalar(.75);weapon.updateMatrix();
  const rightGrip=new THREE.Vector3(0,-.23,.06).applyMatrix4(weapon.matrix);
  const leftGrip=new THREE.Vector3(0,0,-.63).applyMatrix4(weapon.matrix);
  const difference=rig.left.position.clone().sub(rig.right.position).sub(leftGrip.clone().sub(rightGrip));
  const length=rig.rHand.position.length(),d=difference.length();
  const direction=difference.clone().normalize();
  const preferred=new THREE.Vector3(0,-.05,-1);
  const perpendicular=preferred.addScaledVector(direction,-preferred.dot(direction)).normalize();
  // The two rigid R6 arms each end on a sphere around their shoulder. Their
  // sphere intersection fixes a mechanically valid pair of rifle grip points.
  const reach=difference.multiplyScalar(.5).addScaledVector(perpendicular,Math.sqrt(Math.max(0,length*length-d*d/4)));
  const hand=rig.right.position.clone().add(reach);
  weapon.position.copy(hand).sub(rightGrip);weapon.updateMatrix();
  for(const[shoulder,attachment,grip]of[[rig.right,rig.rHand,new THREE.Vector3(0,-.23,.06)],[rig.left,rig.lHand,new THREE.Vector3(0,0,-.63)]]){
    const target=grip.applyMatrix4(weapon.matrix).sub(shoulder.position).normalize();
    shoulder.quaternion.setFromUnitVectors(attachment.position.clone().normalize(),target);
  }
}

function plantLeg(rig,hip,lift){
  rig.body.updateWorldMatrix(true,true);
  soleBounds.setFromObject(hip);
  rig.mesh.getWorldPosition(rootPosition);
  hip.getWorldPosition(legOrigin);legOrigin.y+=rootPosition.y+lift-soleBounds.min.y;
  // Correct along world up, so a leaning RootJoint cannot push a planted boot
  // sideways when its Hip Motor6D is adjusted to the floor.
  rig.body.worldToLocal(legOrigin);hip.position.copy(legOrigin);
}

export function animateActor(rig,pose,time,dt,moving=false,motion=null){
  if(rig.disposed)return;
  const elapsed=Number.isFinite(dt)?clamp(dt,0,.1):0;
  const p=poses[pose]||poses.Idle,blend=1-Math.exp(-elapsed*13),state=rig.locomotion;
  const dx=rig.mesh.position.x-rig.lastPosition.x,dz=rig.mesh.position.z-rig.lastPosition.z;
  const actual=Math.hypot(dx,dz);rig.lastPosition.copy(rig.mesh.position);
  const speed=Number.isFinite(motion?.speed)?Math.max(0,motion.speed):(elapsed>0&&actual<2?actual/elapsed:0);
  const previousDistance=rig.gaitDistance;
  if(Number.isFinite(motion?.distance))rig.gaitDistance=Math.max(0,motion.distance);
  else if(actual<2)rig.gaitDistance+=actual||(Number.isFinite(motion?.speed)?speed*elapsed:0);
  // Integrate travelled distance, rather than recomputing phase from a changing
  // stride length. Sprint transitions cannot rewind a foot into its last step.
  const travelled=clamp(rig.gaitDistance-previousDistance,0,Math.max(.4,speed*elapsed*2));
  const grounded=motion?.grounded!==false;
  const locomotion=['Walk','Run','Idle'].includes(pose)&&moving&&speed>.04&&grounded;
  const running=pose==='Run'||(motion?.sprinting??speed>3.4);
  state.runBlend=THREE.MathUtils.lerp(state.runBlend,locomotion&&running?1:0,blend);
  rig.gaitBlend=THREE.MathUtils.lerp(rig.gaitBlend,locomotion?1:0,blend);
  const gait=rig.gaitBlend,run=state.runBlend;
  const walkStride=clamp(.58+(speed-1.5)*.11,.5,.87),runStride=clamp(1.08+(speed-3.4)*.07,1.02,1.34);
  const stride=THREE.MathUtils.lerp(walkStride,runStride,run);
  if(locomotion)state.phase+=travelled/stride*Math.PI;
  const phase=state.phase;
  Object.assign(state,{stride,grounded,speed,heading:Number.isFinite(motion?.heading)?motion.heading:actual>.0001?Math.atan2(-dx,-dz):rig.mesh.rotation.y});
  const relativeHeading=Math.atan2(Math.sin(state.heading-rig.mesh.rotation.y),Math.cos(state.heading-rig.mesh.rotation.y));
  const infected=rig.id==='Infected';
  // Uneven support time and recovery give workers a limp without replacing
  // genuine planted steps with a time-driven hover or changing boss identities.
  const gaitPhase=phase+(infected?Math.sin(phase)*.17:0);
  const fallen=pose==='Down'||pose==='Death',seated=pose==='Sit';
  const transfer=Math.sin(gaitPhase),compression=Math.sin(gaitPhase*2);
  rig.body.position.x=THREE.MathUtils.lerp(rig.body.position.x,fallen?0:transfer*(.018+run*.025)*gait,blend);
  rig.body.position.y=THREE.MathUtils.lerp(rig.body.position.y,fallen?.5:seated?.95:1.2+Math.sin(time*1.65)*.001-(.018+run*.065)*gait-Math.abs(compression)*(.018+run*.026)*gait,blend);
  rig.body.rotation.x=THREE.MathUtils.lerp(rig.body.rotation.x,fallen?.035:p[2]+(rig.id==='Katya'?.05:0)+(infected?.16:0)+(.045+run*.13)*gait,blend);
  rig.body.rotation.y=THREE.MathUtils.lerp(rig.body.rotation.y,fallen?0:transfer*(.025+run*.06)*gait,blend);
  rig.body.rotation.z=THREE.MathUtils.lerp(rig.body.rotation.z,fallen?-Math.PI/2:transfer*(infected?.045:.018+run*.023)*gait,blend);
  // Breathing moves the RootJoint; every primary part keeps its rigid size.
  rig.torso.scale.setScalar(1);
  const carrying=rig.armed&&['Idle','Walk','Run','Guard','Fire','Burst'].includes(pose);
  for(const[arm,side,target]of[[rig.right,1,p[0]],[rig.left,-1,p[1]]]){
    const reach=infected?.42+Math.sin(gaitPhase*.5+side)*.08:0;
    arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,target+reach-side*Math.sin(gaitPhase)*(infected?.32:.38+run*.39)*gait,blend);
    arm.rotation.y=THREE.MathUtils.lerp(arm.rotation.y,-side*run*.07*gait,blend);
    arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,-side*(infected?.085:.025+run*.04),blend);
  }
  rig.body.updateWorldMatrix(true,true);inverseBody.copy(rig.body.quaternion).invert();
  for(const[index,hip,offset]of[[0,rig.rHip,0],[1,rig.lHip,Math.PI]]){
    const foot=state.feet[index],side=index===0?1:-1;
    hip.position.set(hip===rig.rHip?.2:-.2,-.4,0);hip.rotation.set(0,0,0);
    if(fallen){foot.planted=false;hip.rotation.x=hip===rig.rHip?.08:-.08;continue;}
    if(seated){foot.planted=false;hip.rotation.x=Math.PI/2;continue;}
    const cycle=((gaitPhase+offset)%TAU+TAU)%TAU,stance=cycle<Math.PI;
    const t=stance?cycle/Math.PI:(cycle-Math.PI)/Math.PI;
    const recovery=t-Math.sin(t*TAU)/TAU;
    const z=(stance?-stride/2+t*stride:stride/2-recovery*stride)*gait;
    let theta=Math.atan2(-z,.72),lift=(stance?0:Math.sin(t*Math.PI)*(.14+run*.17)*(infected&&index===1?.72:1))*gait;
    if(!grounded){theta=index===0?.28:-.18;lift=.1;}
    if(pose==='Kick'&&hip===rig.rHip){theta=.95;lift=.28;}
    // RootJoint supplies weight shift and counterrotation while the six rigid
    // limbs keep their original geometry. Translate each Hip Motor6D to solve
    // the boot centre, and hold support feet in world space until toe-off.
    legEuler.set(theta,relativeHeading*gait,0,'YXZ');legRotation.setFromEuler(legEuler);
    hip.quaternion.copy(inverseBody).multiply(legRotation);
    footTarget.set(side*.2+Math.sin(relativeHeading)*z,0,-.025+Math.cos(relativeHeading)*z);
    rig.mesh.localToWorld(footTarget);
    const planted=locomotion&&stance;
    if(planted){if(!foot.planted)foot.anchor.copy(footTarget);footTarget.x=foot.anchor.x;footTarget.z=foot.anchor.z;}
    foot.planted=planted;foot.stance=stance;foot.lift=lift;
    rig.body.worldToLocal(footTarget);
    rotatedFoot.copy(footCenter).applyQuaternion(hip.quaternion);
    hip.position.x=footTarget.x-rotatedFoot.x;hip.position.z=footTarget.z-rotatedFoot.z;
    plantLeg(rig,hip,lift);
  }
  if(fallen){
    rig.body.updateWorldMatrix(true,true);soleBounds.setFromObject(rig.body);rig.mesh.getWorldPosition(rootPosition);
    rig.body.position.y+=Math.max(0,rootPosition.y-soleBounds.min.y);
  }
  rig.head.rotation.x=THREE.MathUtils.lerp(rig.head.rotation.x,rig.id==='Katya'?.08+Math.sin(time*.8)*.04:Math.sin(time*.7)*.012-(infected?.08:run*.06)*gait,blend);
  rig.head.rotation.y=THREE.MathUtils.lerp(rig.head.rotation.y,fallen?0:Math.sin(time*.43)*.025-transfer*.035*gait,blend);
  rig.head.rotation.z=fallen?0:Math.sin(time*1.2)*(rig.id==='Katya'?.04:.006);
  if(rig.weapon&&rig.armed){
    if(carrying)holdRifle(rig,time,gait);
    else{
      if(rig.weapon.parent!==rig.rHand)rig.rHand.add(rig.weapon);
      rig.weapon.position.set(0,0,0);rig.weapon.scale.setScalar(.75);
      rig.weapon.rotation.set(-rig.right.rotation.x-.09,.3,-rig.right.rotation.z);
    }
  }
  if(rig.jaw){
    const opening=['Attack','Grab','Strike','Slam'].includes(pose);
    rig.jaw.rotation.x=THREE.MathUtils.lerp(rig.jaw.rotation.x,opening?.65:0,blend);
    if(rig.jaw.userData.tongue)rig.jaw.userData.tongue.scale.z=THREE.MathUtils.lerp(rig.jaw.userData.tongue.scale.z,opening?1:.12,blend);
  }
  rig.appendages.forEach((joint,index)=>{
    joint.rotation.x=Math.sin(time*1.3+index)*.12+(['Grab','Strike','Slam'].includes(pose)?-1.12:.15);
    joint.rotation.z=Math.sin(time*.8+index)*.13;joint.userData.tip.rotation.x=Math.sin(time*1.6+index)*.22;
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
