import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

// Moisture, decals and glass must not become opaque shapes in the normal/depth
// prepass. Their visible color still comes from the ordinary scene render.
class IndustrialGTAOPass extends GTAOPass {
  _overrideVisibility() {
    super._overrideVisibility();
    this.scene.traverse(object=>{
      if(object.isMesh&&object.visible&&!Array.isArray(object.material)&&object.material.transparent&&!object.material.depthWrite){
        object.visible=false;this._visibilityCache.push(object);
      }
    });
  }
}

const GradeShader={
  uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
    uniform sampler2D tDiffuse;varying vec2 vUv;
    void main(){
      vec4 sampleColor=texture2D(tDiffuse,vUv);
      float luma=dot(sampleColor.rgb,vec3(.2126,.7152,.0722));
      // A restrained gray night palette retains warm flashlight highlights.
      vec3 color=mix(vec3(luma),sampleColor.rgb,.91);
      color=mix(color,color*vec3(.97,.995,1.025),.24*(1.0-smoothstep(.03,.6,luma)));
      vec2 centered=(vUv-.5)*1.18;
      color*=1.0-.09*smoothstep(.12,.68,dot(centered,centered));
      gl_FragColor=vec4(color,sampleColor.a);
    }`,
};

// High uses bounded half-resolution contact AO. Balanced keeps the direct
// renderer path, including native MSAA, for mobile and software WebGL contexts.
export function createRenderPipeline(renderer,scene,camera){
  let quality='high',composer=null,ao=null,fxaa=null;
  let width=1,height=1,pixelRatio=renderer.getPixelRatio();
  const passes=[];
  const size=renderer.getSize(new THREE.Vector2());width=size.x;height=size.y;
  function ensureComposer(){
    if(composer)return;
    composer=new EffectComposer(renderer);
    ao=new IndustrialGTAOPass(scene,camera,1,1);
    ao.updateGtaoMaterial({radius:.55,thickness:.7,distanceExponent:1.25,distanceFallOff:1.3,scale:.9,samples:8});
    ao.updatePdMaterial({radius:5,rings:2,samples:8});
    ao.blendIntensity=.48;
    fxaa=new ShaderPass(FXAAShader);
    passes.push(new RenderPass(scene,camera),ao,new OutputPass(),new ShaderPass(GradeShader),fxaa);
    for(const pass of passes)composer.addPass(pass);
    updateSize();
  }
  function updateSize(){
    if(!composer)return;
    composer.setPixelRatio(pixelRatio);composer.setSize(width,height);
    // Limit AO to 720p even on large desktop screens. Color remains native.
    const scale=Math.min(.5,720/(height*pixelRatio));
    ao.setSize(Math.max(1,Math.round(width*pixelRatio*scale)),Math.max(1,Math.round(height*pixelRatio*scale)));
    fxaa.uniforms.resolution.value.set(1/(width*pixelRatio),1/(height*pixelRatio));
  }
  return {
    render(dt){
      if(quality==='balanced'){renderer.render(scene,camera);return;}
      ensureComposer();composer.render(dt);
    },
    setQuality(value){quality=value==='balanced'?'balanced':'high';},
    resize(nextWidth,nextHeight,nextPixelRatio=renderer.getPixelRatio()){
      width=Math.max(1,nextWidth);height=Math.max(1,nextHeight);pixelRatio=Math.max(.5,nextPixelRatio);updateSize();
    },
    dispose(){
      for(const pass of passes)pass.dispose?.();
      composer?.dispose();composer=null;passes.length=0;
    },
  };
}
