import * as THREE from 'three';
import canon from './canon.js';
import {createAudio} from './audio.js';
import {createExecutionPreview} from './execution-preview.js';

// A single offline HTML file supplies audio as data URLs. All model geometry,
// textures, animation and controls are bundled; no server is required.
const embedded=globalThis.__CHERNOBYL_AUDIO__||{};
const originalFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,options)=>{
  const name=String(typeof input==='string'?input:input.url).split('/').pop().split('?')[0];
  if(embedded[name])return originalFetch(embedded[name],options);
  return Promise.reject(new Error('This offline viewer only uses bundled assets.'));
};
const canvas=document.querySelector('#viewer-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const audio=createAudio(),settings={blood:true,sound:true,reducedMotion:false};
const preview=createExecutionPreview({renderer,canon,audio,settings,standalone:true});
const begin=document.querySelector('#viewer-begin');
begin.addEventListener('click',()=>{document.querySelector('#viewer-welcome').hidden=true;audio.start();preview.open();});
window.addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;preview.update(dt);}
requestAnimationFrame(frame);
document.querySelector('#viewer-credits-open').addEventListener('click',()=>document.querySelector('#viewer-credits').showModal());
document.querySelector('#viewer-credits-close').addEventListener('click',()=>document.querySelector('#viewer-credits').close());
// Review helpers stay local; this viewer has no combat/health/server state.
window.executionViewer={preview,audio,renderer};
