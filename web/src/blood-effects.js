import * as THREE from 'three';

// Small, short-lived stylized contact effects. Bodies and clothing stay intact.
export function createBloodEffects(scene){
  const root=new THREE.Group();root.name='ContactEffects';scene.add(root);
  const count=128,positions=new Float32Array(count*3),particles=[];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setDrawRange(0,0);
  const material=new THREE.PointsMaterial({color:0x80322d,size:.045,transparent:true,opacity:.85,depthWrite:false});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;root.add(points);
  const splats=[];let seed=17;
  const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const splatGeometry=new THREE.CircleGeometry(1,11);
  function clear(){particles.length=0;geometry.setDrawRange(0,0);for(const s of splats){s.mesh.removeFromParent();s.mesh.material.dispose();}splats.length=0;}
  return {
    emit(position,intensity=1){
      const p=position?.clone?position.clone():new THREE.Vector3(...position);
      for(let i=0;i<Math.min(10,Math.ceil(5*intensity));i++){
        if(particles.length>=count)particles.shift();
        particles.push({p:p.clone(),v:new THREE.Vector3((random()-.5)*1.8,.45+random(),(random()-.5)*1.8),life:.22+random()*.3});
      }
      if(splats.length>=20){const s=splats.shift();s.mesh.removeFromParent();s.mesh.material.dispose();}
      const mesh=new THREE.Mesh(splatGeometry,new THREE.MeshBasicMaterial({color:0x542522,transparent:true,opacity:.44,depthWrite:false}));
      mesh.rotation.x=-Math.PI/2;mesh.rotation.z=random()*Math.PI;mesh.position.set(p.x,.012,p.z);
      mesh.scale.set(.08+random()*.08,.06+random()*.08,1);root.add(mesh);splats.push({mesh,life:5});
    },
    update(dt){
      for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.v.y-=5*dt;p.p.addScaledVector(p.v,dt);if(p.life<=0||p.p.y<.02)particles.splice(i,1);}
      for(let i=0;i<particles.length;i++)positions.set(particles[i].p.toArray(),i*3);
      geometry.attributes.position.needsUpdate=true;geometry.setDrawRange(0,particles.length);
      for(let i=splats.length-1;i>=0;i--){const s=splats[i];s.life-=dt;s.mesh.material.opacity=.44*Math.min(1,s.life);if(s.life<=0){s.mesh.removeFromParent();s.mesh.material.dispose();splats.splice(i,1);}}
    },clear,
    get activeParticles(){return particles.length;},
    dispose(){clear();root.removeFromParent();geometry.dispose();material.dispose();splatGeometry.dispose();}
  };
}
