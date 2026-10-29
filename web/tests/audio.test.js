import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';

function fixture() {
  let now=0,nextTimer=1,cancelled=0;
  const timers=new Map(),intervals=new Map(),utterances=[],created=[];
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
  const node=()=>{const n={gain:param(),frequency:param(),detune:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){this.disconnected=true;},start(){},stop(){this.stopped=true;}};created.push(n);return n;};
  class AudioContext {
    constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination=node();}
    createGain(){return node();}createBiquadFilter(){return node();}createOscillator(){return node();}createBufferSource(){return node();}createDynamicsCompressor(){return node();}
    createBuffer(_,size){return {getChannelData:()=>new Float32Array(size)};}
    resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  }
  const host={AudioContext,performance:{now:()=>now},
    setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    setInterval(fn){const id=nextTimer++;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);},
    speechSynthesis:{getVoices:()=>[{name:'Generic',lang:'en-US'},{name:'Microsoft Ryan Natural',lang:'en-GB'},{name:'Microsoft Sonia Natural',lang:'en-GB'}],speak(u){utterances.push(u);},cancel(){cancelled++;},addEventListener(){},removeEventListener(){}},
    SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  };
  return {audio:createAudio(host),host,timers,intervals,utterances,created,get cancelled(){return cancelled;},advanceTime(value){now=value;}};
}

test('audio settings before a user gesture and unavailable browser audio are safe',()=>{
  const a=createAudio({});a.setMix({music:false,voice:false});a.setEnabled(false);a.start();
  assert.equal(a.getDebugState().initialized,false);assert.equal(a.speak('test'),false);a.stop();a.dispose();
});
test('start/resume creates one bounded score graph with independent music mixing',()=>{
  const f=fixture(),a=f.audio;a.start();const first=a.getDebugState();
  assert.equal(first.musicActive,true);assert.equal(f.intervals.size,1);assert.ok(first.sourceCount<=10);
  a.start();assert.equal(a.getDebugState().graphNodes,first.graphNodes);assert.equal(f.intervals.size,1);
  a.setMix({music:false});assert.equal(a.getDebugState().musicActive,false);assert.equal(a.getDebugState().mix.effects,1);
  a.setMix({music:true});a.setTension(2);assert.equal(a.getDebugState().tension,1);
  a.stop();assert.equal(a.getDebugState().contextState,'suspended');assert.equal(f.intervals.size,0);
  a.start();assert.equal(a.getDebugState().graphNodes,first.graphNodes);assert.equal(f.intervals.size,1);
  a.dispose();assert.equal(a.getDebugState().graphNodes,0);assert.equal(f.intervals.size,0);
});
test('silent characters and crying cues stay silent; character profiles choose appropriate voices',()=>{
  const f=fixture(),a=f.audio;a.start();
  assert.equal(a.speak('invented','Novak'),false);assert.equal(a.speak('[Crying]','Katya'),false);assert.equal(f.utterances.length,0);
  assert.equal(a.speak('COME HERE!!!','Sukhoi'),true);assert.equal(f.utterances[0].text,'COME HERE!!!');
  assert.equal(f.utterances[0].voice.name,'Microsoft Ryan Natural');assert.equal(f.utterances[0].pitch,.72);
  a.speak('How could you.... how could you..','Katya',true);
  assert.equal(f.utterances[1].voice.name,'Microsoft Sonia Natural');assert.ok(f.cancelled>0);
  a.setMix({voice:false});assert.equal(a.speak('ENEMY!!!','Felon'),false);assert.equal(a.getDebugState().speechQueue,0);a.dispose();
});
test('cooldowns and bounded queues prevent overlapping speech; Overwatch priority replaces stale barks',()=>{
  const f=fixture(),a=f.audio;a.start();assert.equal(a.speak('ENEMY!!!','Felon'),true);assert.equal(a.speak('NOT ENOUGH!!!','Felon'),false);
  f.advanceTime(3000);a.speak('COME HERE!!!','Sukhoi');a.speak('Sorry not sorry','Nikolai');a.speak('Leave me ALONE.','Mikoyan');a.speak('Another line','Katya');
  assert.ok(a.getDebugState().speechQueue<=3);assert.equal(f.utterances.length,1);
  a.speak('Overwatch to field operator. Confirm the channel. Keep the light forward.','Overwatch',true);
  assert.equal(f.utterances.length,2);assert.equal(f.utterances[1].text,'Overwatch to field operator.');assert.equal(a.getDebugState().speechQueue,2);
  a.stop();assert.equal(a.getDebugState().speechQueue,0);assert.equal(a.getDebugState().speaking,false);a.dispose();
});
