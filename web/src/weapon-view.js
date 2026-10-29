import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createSurface} from './materials.js';

// A layered, mechanical prototype rifle. No external models or texture requests.
export function createWeaponView(camera) {
  const group=new THREE.Group();group.name='FirstPersonRifle';camera.add(group);
  group.scale.setScalar(.85);group.position.set(.28,-.42,-.8);
  const finish=createSurface('metal',416,128),cloth=createSurface('fabric',711,128);
  const metal=new THREE.MeshStandardMaterial({color:0x89949e,...finish,metalness:.8,roughness:.34,normalScale:new THREE.Vector2(.3,.3)});
  const receiver=new THREE.MeshStandardMaterial({color:0x596676,...finish,metalness:.65,roughness:.45,normalScale:new THREE.Vector2(.2,.2)});
  const black=new THREE.MeshStandardMaterial({color:0x29313b,...finish,metalness:.3,roughness:.63});
  const rubber=new THREE.MeshStandardMaterial({color:0x24262b,roughness:.93});
  const navy=new THREE.MeshStandardMaterial({color:0x344454,...cloth,roughness:.93});
  const cuff=new THREE.MeshStandardMaterial({color:0x3c4653,roughness:.9});
  for(const material of [metal,receiver,black,rubber,navy,cuff]){
    material.envMapIntensity=1.6;
    material.emissive=new THREE.Color(0x16202b);material.emissiveIntensity=.2;
  }
  const mag=new THREE.Group();group.add(mag);
  const support=new THREE.Group();group.add(support);
  function box(name,size,position,mat=black,parent=group,radius=.009){
    const m=new THREE.Mesh(new RoundedBoxGeometry(...size,1,Math.min(radius,Math.min(...size)/3)),mat);
    m.name=name;m.position.set(...position);parent.add(m);return m;
  }
  function cylinder(name,radius,length,pos,mat=metal,parent=group){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),mat);
    m.name=name;m.rotation.x=Math.PI/2;m.position.set(...pos);parent.add(m);return m;
  }
  box('Lower receiver',[.16,.18,.53],[0,-.015,.03],receiver);
  box('Upper receiver',[.17,.13,.62],[0,.12,-.015],receiver);
  box('Upper receiver wear line',[.176,.008,.46],[0,.184,-.035],metal,group,.002);
  box('Forward handguard',[.15,.16,.57],[0,.09,-.6],receiver);
  cylinder('Barrel',.025,.47,[0,.09,-1.08]);
  cylinder('Muzzle brake',.038,.1,[0,.09,-1.35],black);
  for(let i=0;i<3;i++)box('Brake vent',[.08,.016,.013],[0,.12,-1.32-i*.025],black);
  box('Buffer tube',[.08,.08,.38],[0,.09,.46],metal);
  box('Adjustable stock',[.16,.25,.37],[0,.015,.68],black);
  box('Rubber butt pad',[.18,.29,.04],[0,0,.88],rubber);
  for(let i=0;i<5;i++)box('Stock ribs',[.17,.017,.02],[0,-.08+i*.035,.89],cuff);
  const grip=box('Pistol grip',[.13,.29,.17],[0,-.22,.18],rubber);grip.rotation.x=-.24;
  box('Trigger guard bottom',[.1,.025,.18],[0,-.17,.01],black);
  box('Trigger guard front',[.1,.12,.025],[0,-.12,-.07],black);
  const trigger=box('Trigger',[.02,.08,.02],[0,-.1,.02],metal);trigger.rotation.x=.25;
  box('Magazine well',[.18,.1,.24],[0,-.12,-.13],receiver);
  box('Steel magazine',[.14,.36,.23],[0,-.34,-.14],black,mag);
  for(let i=0;i<4;i++)box('Magazine raised groove',[.148,.28,.012],[0,-.33,-.22+i*.045],metal,mag,.002);
  box('Magazine base plate',[.16,.035,.25],[0,-.52,-.14],rubber,mag);
  for(let i=0;i<17;i++)box('Picatinny rail',[.18,.023,.023],[0,.205,.2-i*.06],black);
  for(let i=0;i<7;i++){
    box('Handguard cooling slot',[.158,.035,.04],[0,.08,-.38-i*.065],black);
    box('Handguard lower rib',[.13,.018,.026],[0,-.005,-.38-i*.065],rubber);
  }
  for(let i=0;i<6;i++){
    box('Receiver engraved witness mark',[.003,.008,.038],[.092,.061,.18-i*.018],metal,group,.001);
    box('Handguard side screw',[.008,.018,.018],[.082,.125,-.38-i*.065],metal,group,.002);
  }
  box('Ejection port',[.012,.055,.19],[.09,.13,.015],black);
  box('Dust cover',[.012,.025,.21],[.1,.09,.015],metal);
  box('Bolt release',[.017,.042,.025],[-.09,.035,.08],metal);
  box('Forward assist',[.04,.055,.04],[.105,.12,.26],black).rotation.y=.4;
  box('Charging handle',[.25,.028,.06],[0,.171,.32],black);
  box('Selector lever',[.025,.02,.055],[-.1,.015,.18],black).rotation.x=.4;
  for(const z of [-.2,.25])cylinder('Receiver fastener',.016,.18,[0,.035,z],metal).rotation.set(0,0,Math.PI/2);
  cylinder('Rear aperture body',.06,.1,[0,.25,.16],black);
  const glass=new THREE.MeshPhysicalMaterial({color:0x839d98,roughness:.08,metalness:.15,transparent:true,opacity:.35});
  cylinder('Sight glass',.038,.012,[0,.25,.103],glass);
  box('Front post',[.026,.12,.025],[0,.24,-.82],black);
  for(const x of [-.045,.045])box('Front sight ears',[.015,.1,.025],[x,.23,-.82],black);
  cylinder('Flashlight housing',.045,.27,[.14,.07,-.65],black);
  cylinder('Flashlight head',.058,.07,[.14,.07,-.82],metal);
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.046,16),new THREE.MeshBasicMaterial({color:0xe6e6cf}));lens.position.set(.14,.07,-.86);group.add(lens);
  box('Light pressure switch',[.02,.04,.13],[.09,.13,-.48],rubber);
  const cablePath=new THREE.CatmullRomCurve3([new THREE.Vector3(.11,.14,-.42),new THREE.Vector3(.17,.15,-.47),new THREE.Vector3(.19,.12,-.56),new THREE.Vector3(.17,.08,-.62)]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(cablePath,12,.008,5,false),rubber));
  // Connected sleeves, cuffs, gloves and individual finger blocks keep hands on the rifle.
  box('Right forearm',[.21,.24,.53],[.22,-.28,.44],navy).rotation.y=-.25;
  box('Right cuff',[.2,.2,.12],[.13,-.21,.23],cuff);
  for(let i=0;i<5;i++)box('Sleeve cuff stitching',[.008,.008,.07],[.055+i*.032,-.108,.235],navy,group,.001);
  box('Right glove',[.16,.22,.19],[.105,-.2,.15],rubber);
  for(let i=0;i<4;i++)box('Trigger hand fingers',[.045,.035,.12],[.07,-.14-i*.039,.085],black);
  box('Left forearm',[.2,.22,.58],[-.26,-.23,-.29],navy,support).rotation.y=.34;
  box('Left cuff',[.2,.18,.13],[-.16,-.16,-.49],cuff,support);
  box('Support glove',[.18,.17,.2],[-.09,-.09,-.51],rubber,support);
  for(let i=0;i<4;i++)box('Support fingers',[.035,.055,.18],[-.12+i*.035,-.055,-.54],black,support);

  // Static detail merges by material, retaining independently moving hands/magazine.
  for(const parent of [group,mag,support]){
    parent.updateMatrixWorld(true);const batches=new Map();
    for(const child of [...parent.children])if(child.isMesh){const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);}
    for(const [mat,list]of batches){
      if(list.length<2)continue;
      const pieces=list.map(m=>m.geometry.clone().applyMatrix4(m.matrix));
      const merged=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());
      if(merged){const mesh=new THREE.Mesh(merged,mat);mesh.name='RifleDetailBatch';parent.add(mesh);list.forEach(m=>{m.removeFromParent();m.geometry.dispose();});}
    }
  }
  group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});
  const flash=new THREE.SpotLight(0xffedd2,125,44,.47,.65,1);
  flash.name='PermanentWeaponFlashlight';flash.position.set(.14,.07,-.85);flash.castShadow=true;
  flash.shadow.mapSize.set(1024,1024);flash.shadow.bias=-.0002;flash.shadow.normalBias=.018;group.add(flash);
  const target=new THREE.Object3D();target.position.set(.14,.07,-25);group.add(target);flash.target=target;
  const muzzle=new THREE.Mesh(new THREE.OctahedronGeometry(.065),new THREE.MeshBasicMaterial({color:0xffe0aa}));
  muzzle.position.set(0,.09,-1.41);muzzle.visible=false;group.add(muzzle);
  let aimAmount=0,wasReloading=false,reloadBegan=0;
  return {group,flash,muzzle,update(dt,{aiming,reloading,time,kick,moving,sprinting,reducedMotion,shotAge}){
    if(reloading&&!wasReloading)reloadBegan=time;wasReloading=reloading;
    const phase=reloading?Math.min(1,(time-reloadBegan)/2):0;
    const dip=Math.sin(phase*Math.PI);
    aimAmount+=((aiming?1:0)-aimAmount)*Math.min(1,dt*13);
    const sway=reducedMotion?0:moving*(1-aimAmount*.9);
    const bob=Math.sin(time*(sprinting?12:8))*.012*sway;
    group.position.lerp(new THREE.Vector3(.28*(1-aimAmount),-.42+aimAmount*.19-dip*.15+Math.abs(bob)*.6,-.8+kick),Math.min(1,dt*15));
    group.rotation.set(-dip*.25+(sprinting?.14:0),bob*.3,dip*.4+bob*.3);
    mag.position.set(-dip*.04,-dip*.32,dip*.08);
    support.position.set(dip*.06,-dip*.16,dip*.22);support.rotation.x=-dip*.2;
    muzzle.visible=shotAge<.04;flash.visible=true;
  }};
}
