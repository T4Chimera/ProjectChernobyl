import * as THREE from 'three';

function createMoistureBeam(scene){
  // Many faint radial slices integrate suspended moisture. Each slice tests
  // against the scene depth, so walls, characters and props cut the beam off.
  // Feathering every rim avoids the solid luminous cone produced by cone skins.
  const positions=[],uvs=[],depths=[],segments=32,layers=28;
  for(let layer=0;layer<layers;layer++){
    const depth=.6+layer*.49,radius=depth*.48;
    for(let segment=0;segment<segments;segment++){
      const a=segment/segments*Math.PI*2,b=(segment+1)/segments*Math.PI*2;
      positions.push(0,0,depth,Math.cos(a)*radius,Math.sin(a)*radius,depth,Math.cos(b)*radius,Math.sin(b)*radius,depth);
      uvs.push(.5,.5,.5+Math.cos(a)*.5,.5+Math.sin(a)*.5,.5+Math.cos(b)*.5,.5+Math.sin(b)*.5);
      depths.push(depth,depth,depth);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('beamDepth',new THREE.Float32BufferAttribute(depths,1));
  const material=new THREE.ShaderMaterial({
    uniforms:{strength:{value:0},time:{value:0}},
    vertexShader:`attribute float beamDepth;varying vec2 vUv;varying float vDepth;void main(){vUv=uv;vDepth=beamDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform float strength;uniform float time;varying vec2 vUv;varying float vDepth;
      void main(){
        float radial=length(vUv-.5)*2.0;
        float feather=pow(1.0-smoothstep(.08,1.0,radial),1.7);
        float axial=smoothstep(.4,2.0,vDepth)*(1.0-smoothstep(9.0,14.0,vDepth));
        float drifting=.92+.08*sin(vDepth*1.8+time*.45+vUv.x*5.0);
        gl_FragColor=vec4(vec3(.31,.345,.36),feather*axial*exp(-vDepth*.095)*drifting*strength*.0065);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='FlashlightMoistureScattering';mesh.frustumCulled=false;mesh.renderOrder=4;mesh.visible=false;scene.add(mesh);
  const from=new THREE.Vector3(),to=new THREE.Vector3(),direction=new THREE.Vector3(),axis=new THREE.Vector3(0,0,1);
  let light=null;
  return {
    setLight(value){light=value;},
    update(time,quality){
      let visible=!!light;
      for(let object=light;object&&visible;object=object.parent)visible=object.visible;
      mesh.visible=visible;if(!visible)return;
      light.getWorldPosition(from);light.target.getWorldPosition(to);direction.subVectors(to,from).normalize();
      mesh.position.copy(from);mesh.quaternion.setFromUnitVectors(axis,direction);
      material.uniforms.time.value=time;material.uniforms.strength.value=Math.min(1.2,light.intensity/125);
      const radiusScale=Math.tan(light.angle)/.48;mesh.scale.set(radiusScale,radiusScale,1);
      geometry.setDrawRange(0,(quality==='balanced'?14:layers)*segments*3);
    },
    dispose(){geometry.dispose();material.dispose();mesh.removeFromParent();},
  };
}

// Original real-time weather. No video, large decoded messages or remote assets.
export function createAtmosphere(scene,world,renderer){
  const beam=createMoistureBeam(scene);
  const count=1050,geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(count*6),seeds=new Float32Array(count*4);
  let random=19860426;const rand=()=>((random=(1664525*random+1013904223)>>>0)/4294967296);
  for(let i=0;i<count;i++){seeds[i*4]=(rand()-.5)*62;seeds[i*4+1]=(rand()-.5)*62;seeds[i*4+2]=rand()*17;seeds[i*4+3]=.18+rand()*.23;}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.LineBasicMaterial({color:0xabb8be,transparent:true,opacity:.12,depthWrite:false});
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
  scene.environmentIntensity=.65;sky.dispose();pmrem.dispose();
  let quality='high';
  const shelters=[
    {x:world.spawn.x,z:-4.75,w:10.5,d:3.8,y:3.6},
    {x:-88.7,z:8.4,w:5.8,d:4.6,y:3.5},
    {x:-78.8,z:0,w:3.2,d:6.4,y:4.5},
  ];
  return {setFlashlight(light){beam.setLight(light);},
    setQuality(value){quality=value;geometry.setDrawRange(0,value==='balanced'?count:count*2);},
    update(dt,time,position,{reducedMotion=false}={}){
      beam.update(time,quality);
      const budget=quality==='balanced'?Math.ceil(count/2):count;
      for(let i=0;i<budget;i++){
        const s=i*4,j=i*6;
        const gust=Math.sin(time*.31)*.23+Math.sin(time*.77)*.07;
        const x=position.x+seeds[s]+gust,z=position.z+seeds[s+1];
        let y=((seeds[s+2]-time*10)%17+17)%17;
        const roof=world.sectors.some(sector=>sector.id<=3&&Math.abs(x-sector.center.x)<sector.size.x/2&&Math.abs(z-sector.center.z)<sector.size.z/2);
        if(roof&&y<6.5)y=-15;
        // Actual canopy footprints leave the open insertion lane rainy while
        // keeping the logistics tent and checkpoint radio bay sheltered.
        if(shelters.some(roof=>Math.abs(x-roof.x)<roof.w/2&&Math.abs(z-roof.z)<roof.d/2&&y<roof.y))y=-15;
        positions[j]=x;positions[j+1]=y;positions[j+2]=z;
        positions[j+3]=x-.025-gust*.06;positions[j+4]=y+seeds[s+3];positions[j+5]=z+.015;
      }
      rain.visible=!reducedMotion;geometry.attributes.position.needsUpdate=true;
      dust.position.set(position.x,1.8,position.z);dust.rotation.y=time*.008;dust.rotation.z=Math.sin(time*.08)*.08;
      dust.visible=!reducedMotion;
    },dispose(){beam.dispose();geometry.dispose();material.dispose();dustGeometry.dispose();dust.material.dispose();environment.dispose();rain.removeFromParent();dust.removeFromParent();}
  };
}
