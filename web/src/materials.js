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
    const blotch=smooth(x/size,y/size,seed+7,3);
    let shade=145+(grain-.5)*23+(cloud-.5)*31,h=cloud*.06+grain*.025,r=.86;
    let rgb=[1,.99,.95];
    if(kind==='brick') {
      // A four-metre tile now contains ordinary 25cm masonry rather than the
      // previous half-metre blocks. Thin recessed mortar catches grazing light.
      const row=Math.floor(y/16),bx=(x+(row%2)*16)%32,by=y%16;
      const mortar=bx<1.1||by<1.1,edge=Math.min(bx,32-bx,by,16-by);
      const brick=hash(Math.floor((x+(row%2)*16)/32),row,seed);
      const verticalStain=smooth(x/size,y/size,seed+4,21)*smooth(x/size,.1,seed+2,14);
      const chip=grain>.984&&edge<3;
      shade=(mortar?102:136+brick*23)+(grain-.5)*20+(cloud-.5)*22-verticalStain*30-(chip?21:0);
      h=mortar?.06:.17+Math.min(edge/4,1)*.04+(grain-.5)*.025-(chip?.035:0);
      r=mortar?.98:.89;rgb=[1,.987,.955];
    } else if(kind==='asphalt') {
      const puddle=smooth(x/size,y/size,seed+3,5)>.57;
      const aggregate=hash(Math.floor(x/2),Math.floor(y/2),seed+12);
      const crack=Math.abs(x-size*.43-Math.sin(y*.044)*8-Math.sin(y*.12)*2)<.75&&y<size*.74;
      shade=84+(grain-.5)*22+(cloud-.5)*22+(aggregate>.9?20:0)-(puddle?17:0)-(crack?29:0);
      h=grain*.024+cloud*.024+(aggregate>.9?.012:0)-(crack?.04:0);
      r=puddle?.17:.75;rgb=[.98,1,1.01];
    } else if(kind==='metal') {
      const scratch=(hash(Math.floor(x/11),y,seed)>.991)?21:0;
      const brush=hash(x,0,seed+9)*3;
      const oxidation=blotch>.57?(blotch-.57)*45:0;
      shade=148+(grain-.5)*7+(cloud-.5)*22+scratch+brush-oxidation;
      h=grain*.009+scratch*.00045;r=.39+cloud*.28+oxidation*.005;
    } else if(kind==='paint') {
      const flake=cloud>.6&&grain>.28;
      const streak=smooth(x/size,.13,seed+9,37)*(y/size);
      shade=151+(grain-.5)*11-(flake?34:0)-streak*17;
      h=flake?.055:.095;r=flake?.94:.77;
      rgb=flake?[1,.88,.72]:[1,.99,.96];
    } else if(kind==='fabric') {
      const warp=(x%4<2?1:-1),weft=(y%4<2?1:-1);
      shade=187+warp*weft*9+(grain-.5)*9+(cloud-.5)*12;
      h=.06+warp*weft*.006+grain*.003;r=.94;rgb=[.98,.99,1];
    } else if(kind==='rubber') {
      shade=171+(grain-.5)*10+(cloud-.5)*10;
      h=grain*.009;r=.94;rgb=[.99,1,1];
    } else if(kind==='wood') {
      const growth=Math.sin(y*1.5+Math.sin(x*.026)*1.7+cloud*3);
      const split=Math.abs(Math.sin(y*.13+Math.sin(x*.011)*.3))<.035;
      shade=157+growth*12+(grain-.5)*12+(blotch-.5)*20-(split?20:0);
      h=.055+growth*.006+grain*.009-(split?.018:0);r=.93;rgb=[1,.95,.86];
    } else if(kind==='concrete') {
      const pore=grain>.973?-.055:0;
      const crack=Math.abs(x-size*.62-Math.sin(y*.031)*6-Math.sin(y*.14)*2)<.62&&y>size*.24;
      const joint=x%256<1.2||y%256<1.2;
      shade=149+(grain-.5)*20+(cloud-.5)*24+(blotch-.5)*20+(pore? -23:0)-(crack?29:0)-(joint?13:0);
      h=cloud*.035+grain*.018+pore-(crack?.035:0)-(joint?.022:0);
      r=.85+blotch*.12;rgb=[1,.995,.965];
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
    const nx=-dx*3.4,ny=-dy*3.4,length=Math.hypot(nx,ny,1);
    normal[i]=Math.round((nx/length*.5+.5)*255);normal[i+1]=Math.round((ny/length*.5+.5)*255);
    normal[i+2]=Math.round((1/length*.5+.5)*255);normal[i+3]=255;
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
  const brick=createSurface('brick'),concrete=createSurface('concrete',124),asphalt=createSurface('asphalt',26),metal=createSurface('metal',84),paint=createSurface('paint',41),timber=createSurface('wood',91);
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
    wood:surface(0x766049,timber,.01,.98),
    asphalt:surface(0x8c9491,asphalt,.035,.83),
    blue:surface(0x526268,metal,.4,.65),
    paper:new THREE.MeshStandardMaterial({color:0xbab7a5,roughness:.97}),
    deadTube:new THREE.MeshStandardMaterial({color:0x69706c,roughness:.6}),
    whitePaint:surface(0xc1c4b9,paint,.02,.9),
    cautionMat:new THREE.MeshBasicMaterial({color:0xb39e60,transparent:true,opacity:.48}),
    glass:new THREE.MeshStandardMaterial({color:0x1b292a,metalness:.65,roughness:.13}),
    rubber:new THREE.MeshStandardMaterial({color:0x131817,roughness:.94}),
  };
}

// Local translucent dirt decals, shared by many facade patches in one batch.
// Alpha tapers at every edge, so grime never resembles a rectangular overlay.
export function createGrimeMap(size=128) {
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/(size-1),v=y/(size-1),edge=Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
    const streak=Math.pow(smooth(u,.1,72,19),3);
    const mottled=smooth(u,v,16,8);
    const alpha=Math.max(0,(streak*.8+mottled*.24-.12))*edge*180;
    const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=alpha;
  }
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;return map;
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
