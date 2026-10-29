import * as THREE from 'three';

// Original deterministic tiled surfaces. No downloaded textures or image URLs.
// Height-derived normal and roughness maps make the flashlight reveal real
// material response rather than a flat color/noise overlay.
function hash(x, y, seed) {
  let h=Math.imul(x+seed*13,374761393)^Math.imul(y+seed*7,668265263);
  h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
function smooth(x,y,seed,frequency) {
  const px=x*frequency,py=y*frequency,ix=Math.floor(px),iy=Math.floor(py);
  const fx=px-ix,fy=py-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const wrap=n=>((n%frequency)+frequency)%frequency;
  const noise=(a,b)=>hash(wrap(a),wrap(b),seed);
  const a=THREE.MathUtils.lerp(noise(ix,iy),noise(ix+1,iy),u);
  const b=THREE.MathUtils.lerp(noise(ix,iy+1),noise(ix+1,iy+1),u);
  return THREE.MathUtils.lerp(a,b,v);
}

export function createSurface(kind, seed=1986, size=512) {
  const color=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  const normal=new Uint8Array(size*size*4),height=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=y*size+x,index=i*4,grain=hash(x,y,seed),cloud=smooth(x/size,y/size,seed,8);
    let shade=133+(grain-.5)*20+(cloud-.5)*33,h=cloud*.06+grain*.025,r=.86;
    let rgb=[1,.99,.95];
    if(kind==='brick') {
      const row=Math.floor(y/32),bx=(x+(row%2)*32)%64,by=y%32;
      const mortar=bx<2.8||by<2.8,edge=Math.min(bx,64-bx,by,32-by);
      const brick=hash(Math.floor((x+(row%2)*32)/64),row,seed);
      const verticalStain=smooth(x/size,y/size,seed+4,21)*smooth(x/size,.1,seed+2,14);
      shade=(mortar?83:116+brick*26)+(grain-.5)*18+(cloud-.5)*28-verticalStain*30;
      h=mortar?.06:.2+Math.min(edge/8,1)*.065+(grain-.5)*.04;
      r=mortar?.97:.91;rgb=[1,.985,.94];
    } else if(kind==='asphalt') {
      const puddle=smooth(x/size,y/size,seed+3,5)>.57;
      shade=79+(grain-.5)*23+(cloud-.5)*22-(puddle?14:0);h=grain*.04+cloud*.035;
      r=puddle?.19:.67;rgb=[.98,1,1.01];
    } else if(kind==='metal') {
      const scratch=(hash(x,Math.floor(y/3),seed)>.986)?29:0;
      shade=145+(grain-.5)*8+(cloud-.5)*29+scratch;h=grain*.012+scratch*.0008;r=.43+cloud*.3;
    } else if(kind==='paint') {
      const flake=cloud>.62;
      shade=135+(grain-.5)*13-(flake?35:0);h=flake?.05:.1;r=.82;
    }
    const pores=grain>.986?-.09:0;height[i]=h+pores;
    for(let c=0;c<3;c++)color[index+c]=Math.max(0,Math.min(255,shade*rgb[c]));
    color[index+3]=255;
    roughness[index]=roughness[index+1]=roughness[index+2]=Math.round(r*255);roughness[index+3]=255;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4;
    const dx=height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size];
    const dy=height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x];
    const n=new THREE.Vector3(-dx*3.4,-dy*3.4,1).normalize();
    normal[i]=Math.round((n.x*.5+.5)*255);normal[i+1]=Math.round((n.y*.5+.5)*255);
    normal[i+2]=Math.round((n.z*.5+.5)*255);normal[i+3]=255;
  }
  function texture(data,colorSpace=THREE.NoColorSpace) {
    const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=colorSpace;
    map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
    map.generateMipmaps=true;map.anisotropy=4;map.needsUpdate=true;return map;
  }
  return {map:texture(color,THREE.SRGBColorSpace),normalMap:texture(normal),roughnessMap:texture(roughness)};
}

export function createIndustrialMaterials() {
  const brick=createSurface('brick'),concrete=createSurface('concrete',124),asphalt=createSurface('asphalt',26),metal=createSurface('metal',84),paint=createSurface('paint',41);
  const surface=(color,maps,metalness,roughness)=>new THREE.MeshStandardMaterial({color,...maps,metalness,roughness,normalScale:new THREE.Vector2(.55,.55)});
  return {
    concrete:surface(0xc1c0b4,concrete,.04,.94),
    brick:surface(0xa1a59c,brick,.03,.95),
    lowerWall:surface(0x53615c,paint,.03,.85),
    steel:surface(0x737a76,metal,.68,.5),
    iron:surface(0x363c3b,metal,.72,.58),
    rust:surface(0x77543d,metal,.32,.87),
    black:surface(0x232a29,metal,.3,.71),
    yellow:surface(0xb19b5b,paint,.12,.81),
    green:surface(0x59644c,paint,.15,.8),
    wood:surface(0x766049,concrete,.01,.98),
    asphalt:surface(0x8c9491,asphalt,.16,.64),
    blue:surface(0x526268,metal,.4,.65),
    paper:new THREE.MeshStandardMaterial({color:0xbab7a5,roughness:.97}),
    deadTube:new THREE.MeshStandardMaterial({color:0x69706c,roughness:.6}),
    whitePaint:surface(0xc1c4b9,paint,.02,.9),
    cautionMat:new THREE.MeshBasicMaterial({color:0xb39e60,transparent:true,opacity:.48}),
    glass:new THREE.MeshStandardMaterial({color:0x1b292a,metalness:.65,roughness:.13}),
    rubber:new THREE.MeshStandardMaterial({color:0x131817,roughness:.94}),
  };
}

// BoxGeometry groups are px/nx/py/ny/pz/nz. UV density follows world dimensions
// so long walls retain brick proportions instead of stretching one tile.
export function scaleBoxUVs(geometry,size,tile=4) {
  const uv=geometry.getAttribute('uv');
  const dimensions=[[size[2],size[1]],[size[2],size[1]],[size[0],size[2]],[size[0],size[2]],[size[0],size[1]],[size[0],size[1]]];
  for(let face=0;face<6;face++)for(let j=0;j<4;j++) {
    const i=face*4+j;uv.setXY(i,uv.getX(i)*dimensions[face][0]/tile,uv.getY(i)*dimensions[face][1]/tile);
  }
  uv.needsUpdate=true;return geometry;
}
