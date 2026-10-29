import * as THREE from 'three';

// Original real-time weather. No video, large decoded messages or remote assets.
export function createAtmosphere(scene,world,renderer){
  const count=1050,geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(count*6),seeds=new Float32Array(count*4);
  let random=19860426;const rand=()=>((random=(1664525*random+1013904223)>>>0)/4294967296);
  for(let i=0;i<count;i++){seeds[i*4]=(rand()-.5)*62;seeds[i*4+1]=(rand()-.5)*62;seeds[i*4+2]=rand()*17;seeds[i*4+3]=.18+rand()*.23;}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.LineBasicMaterial({color:0xb9c9d2,transparent:true,opacity:.19,depthWrite:false});
  const rain=new THREE.LineSegments(geometry,material);rain.name='Rain';rain.frustumCulled=false;scene.add(rain);
  const dustGeometry=new THREE.BufferGeometry(),dustPositions=new Float32Array(180*3);
  for(let i=0;i<dustPositions.length;i++)dustPositions[i]=(rand()-.5)*12;
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xb4b9ad,size:.017,transparent:true,opacity:.24,depthWrite:false}));
  dust.name='SuspendedMoisture';dust.frustumCulled=false;scene.add(dust);
  // A dim, neutral reflection environment gives rough wet surfaces depth while
  // all facility fixtures remain off. It is ambient sky, not plant illumination.
  const skyPixels=new Uint8Array(256*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<256;x++){
    const n=rand()*3,light=Math.max(0,Math.sin((1-y/127)*Math.PI))*.25;
    const index=(y*256+x)*4;skyPixels[index]=30+light*80+n;skyPixels[index+1]=36+light*85+n;skyPixels[index+2]=43+light*95+n;skyPixels[index+3]=255;
  }
  const sky=new THREE.DataTexture(skyPixels,256,128,THREE.RGBAFormat);
  sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping;sky.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(sky);scene.environment=environment.texture;
  scene.environmentIntensity=.55;sky.dispose();pmrem.dispose();
  let quality='high';
  return {setQuality(value){quality=value;geometry.setDrawRange(0,value==='balanced'?count:count*2);},
    update(dt,time,position,{reducedMotion=false}={}){
      const budget=quality==='balanced'?Math.ceil(count/2):count;
      for(let i=0;i<budget;i++){
        const s=i*4,j=i*6,x=position.x+seeds[s],z=position.z+seeds[s+1];
        let y=((seeds[s+2]-time*10)%17+17)%17;
        const roof=world.sectors.some(sector=>sector.id<=3&&Math.abs(x-sector.center.x)<sector.size.x/2&&Math.abs(z-sector.center.z)<sector.size.z/2);
        if(roof&&y<6.5)y=-15;
        // The checkpoint shelter and adjacent staging tent also shield rain.
        if(Math.abs(x-world.spawn.x)<5.5&&Math.abs(z)<4.3&&y<3.6)y=-15;
        positions[j]=x;positions[j+1]=y;positions[j+2]=z;
        positions[j+3]=x-.025;positions[j+4]=y+seeds[s+3];positions[j+5]=z+.015;
      }
      rain.visible=!reducedMotion;geometry.attributes.position.needsUpdate=true;
      dust.position.set(position.x,1.8,position.z);dust.rotation.y=time*.008;dust.rotation.z=Math.sin(time*.08)*.08;
      dust.visible=!reducedMotion;
    },dispose(){geometry.dispose();material.dispose();dustGeometry.dispose();dust.material.dispose();environment.dispose();rain.removeFromParent();dust.removeFromParent();}
  };
}
