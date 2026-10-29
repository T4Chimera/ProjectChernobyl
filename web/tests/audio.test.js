import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAudio} from '../src/audio.js';
import {SOUND_ASSETS} from '../src/sound-assets.js';
import {VOICE_LINES, findVoiceRecording} from '../src/voice-manifest.js';

const soundAssets = {
  rifleShots:[{url:'audio/sfx/shot-a.wav',gain:.6},{url:'audio/sfx/shot-b.wav',gain:.7}],
  reload:[{url:'audio/sfx/reload.wav',gain:.5}],
  footsteps:{concrete:[{url:'audio/sfx/step-a.wav'},{url:'audio/sfx/step-b.wav'}],metal:[{url:'audio/sfx/metal.wav'}]},
};
const emptyAssets = {rifleShots:[],reload:[],footsteps:{}};
const flush = async () => {for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(options={}) {
  let now=0,nextTimer=1,decodes=0,speechCalls=0,activeFetches=0,peakFetches=0;
  const timers=new Map(),intervals=new Map(),created=[],requests=[],held=[];
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
  const node=kind=>{const n={kind,gain:param(),frequency:param(),detune:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:param(),pan:param(),connections:[],connect(to){this.connections.push(to);},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};created.push(n);return n;};
  class AudioContext {
    constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination=node('destination');}
    createGain(){return node('gain');}createBiquadFilter(){return node('filter');}createOscillator(){return node('oscillator');}createBufferSource(){return node('buffer');}createDynamicsCompressor(){return node('compressor');}createConvolver(){return node('convolver');}createWaveShaper(){return node('distortion');}createStereoPanner(){return node('pan');}
    createBuffer(channels,size,rate){const data=Array.from({length:channels},()=>new Float32Array(size));return {duration:size/rate,getChannelData:i=>data[i]};}
    async decodeAudioData(bytes){decodes++;if(options.decodeFails)throw new Error('Invalid file');return {duration:.4,sampled:true,byteLength:bytes.byteLength};}
    resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  }
  const host={AudioContext,document:{baseURI:'https://example.test/ProjectChernobyl/'},performance:{now:()=>now},
    setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    setInterval(fn){const id=nextTimer++;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);},
    speechSynthesis:{speak(){speechCalls++;}},SpeechSynthesisUtterance:class{},
    fetch(url){requests.push(url);activeFetches++;peakFetches=Math.max(peakFetches,activeFetches);
      const response=()=>{activeFetches--;return {ok:!options.fetchFails,status:options.fetchFails?404:200,arrayBuffer:async()=>new ArrayBuffer(32)};};
      if(options.holdFetches)return new Promise(resolve=>held.push(()=>resolve(response())));
      return Promise.resolve(response());
    },
  };
  const audio=createAudio(host,{soundAssets:options.soundAssets||soundAssets,voiceRecordings:options.voiceRecordings||{}});
  return {audio,host,timers,intervals,created,requests,held,get decodes(){return decodes;},get speechCalls(){return speechCalls;},get peakFetches(){return peakFetches;},advanceTime(value){now=value;},finishSamples(){created.filter(n=>n.kind==='buffer'&&n.buffer?.sampled&&!n.disconnected).forEach(n=>n.onended?.());},async runTimers(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());await flush();}};
}

test('missing recordings remain subtitles-only and no code invokes browser TTS',async()=>{
  const unavailable=createAudio({});unavailable.setMix({music:false,voice:false});unavailable.start();assert.equal(unavailable.getDebugState().initialized,false);unavailable.dispose();
  const f=fixture(),a=f.audio;a.start();await a.whenReady();const downloaded=f.requests.length;
  assert.equal(a.speak('ENEMY!!!','Felon'),false);assert.equal(a.speak('[Crying]','Katya'),false);assert.equal(a.speak('Invented','Novak'),false);
  assert.equal(f.requests.length,downloaded,'unconfigured voices must not request missing files');
  assert.equal(f.speechCalls,0);assert.equal(a.getDebugState().voiceMode,'recorded-only');a.dispose();
});

test('recording manifest preserves exact canon, quiet characters and stable upload filenames',()=>{
  assert.equal(VOICE_LINES.filter(line=>line.speaker==='Overwatch').length,22);
  assert.equal(new Set(VOICE_LINES.map(line=>line.id)).size,VOICE_LINES.length);
  assert.equal(VOICE_LINES.some(line=>['Novak','John','Jayden'].includes(line.speaker)),false);
  assert.deepEqual(VOICE_LINES.filter(line=>line.speaker==='Mikoyan').map(line=>line.text),['Leave me ALONE.']);
  const record=findVoiceRecording('Felon','ENEMY!!!',{'felon-player-detected-01':'audio/voices/Felon/felon-player-detected-01.wav'});
  assert.equal(record.id,'felon-player-detected-01');assert.equal(record.text,'ENEMY!!!');
  assert.equal(findVoiceRecording('Felon','Enemy!!!',{'felon-player-detected-01':'wrong.wav'}),null);
});

test('sample fetch/decode cache is shared and loading concurrency stays bounded',async()=>{
  const f=fixture({holdFetches:true}),a=f.audio;a.start();assert.equal(f.requests.length,3);
  a.start();assert.equal(f.requests.length,3,'resume must not duplicate pending downloads');
  while(f.held.length){f.held.splice(0).forEach(release=>release());await flush();}
  await a.whenReady();assert.equal(f.peakFetches,3);assert.equal(f.decodes,6);assert.equal(a.getDebugState().samplesLoaded,6);
  a.start();await a.whenReady();assert.equal(f.requests.length,6);assert.equal(f.decodes,6);a.dispose();
});

test('recorded shots use decoded samples, acoustic routing and bounded transient sources',async()=>{
  const f=fixture(),a=f.audio;a.start();await a.whenReady();const baseline=a.getDebugState();
  a.setListener([0,0,0],[0,0,-1]);assert(a.shot({own:false,position:[9,0,-3],distance:10,indoor:true}));
  assert.equal(a.getDebugState().sampleShots,1);assert.equal(a.getDebugState().fallbackShots,0);
  assert(f.created.some(n=>n.kind==='buffer'&&n.started&&n.buffer?.sampled));assert(f.created.some(n=>n.kind==='pan'&&n.pan.value>0));
  for(let i=0;i<100;i++)a.shot({own:true,indoor:true});
  assert.equal(a.getDebugState().transientSources,20);assert(a.getDebugState().sourceCount<=baseline.sourceCount+20);
  assert.equal(f.created.filter(n=>n.kind==='convolver').length,1,'one shared room impulse, not one per shot');
  assert.equal(a.shot(),false,'over-budget shots must be dropped');
  f.finishSamples();assert.equal(a.getDebugState().transientSources,0);assert.equal(a.getDebugState().graphNodes,baseline.graphNodes);
  a.setMix({effects:false});assert.equal(a.shot(),false);a.dispose();
});

test('failed recordings use bounded nonverbal effects but never synthesized dialogue',async()=>{
  const f=fixture({fetchFails:true}),a=f.audio;a.start();await a.whenReady();
  assert.equal(a.getDebugState().samplesFailed,6);assert(a.shot());assert.equal(a.getDebugState().fallbackShots,1);
  assert.equal(a.speak('ENEMY!!!','Felon'),false);assert.equal(f.speechCalls,0);a.dispose();
});

test('uploaded lines use exact-ID lookup, character processing, cooldowns and priority cancellation',async()=>{
  const voiceRecordings={
    'felon-player-detected-01':{url:'audio/voices/Felon/felon-player-detected-01.wav',gain:.8},
    'sukhoi-player-detected-01':{url:'audio/voices/Sukhoi/sukhoi-player-detected-01.wav'},
    'overwatch-contact':{url:'audio/voices/Overwatch/overwatch-contact.wav'},
  };
  const f=fixture({voiceRecordings,soundAssets:emptyAssets}),a=f.audio;a.start();
  assert(a.speak('ENEMY!!!','Felon'));await flush();assert.equal(a.getDebugState().currentVoiceId,'felon-player-detected-01');
  assert(f.created.some(n=>n.kind==='distortion'&&n.curve?.length===1024));
  assert.equal(a.speak('ENEMY!!!','Felon'),false,'one speaker cannot spam queued lines');
  assert(a.speak('COME HERE!!!','Sukhoi'));assert.equal(a.getDebugState().speechQueue,1);
  const order=VOICE_LINES.find(line=>line.id==='overwatch-contact');assert(a.speak(order.text,'Overwatch',true));await flush();
  assert.equal(a.getDebugState().currentVoiceId,'overwatch-contact');assert.equal(a.getDebugState().speechQueue,0);
  assert.equal(a.getDebugState().recordedLinesPlayed,2);assert.equal(f.speechCalls,0);
  a.setMix({voice:false});assert.equal(a.getDebugState().speaking,false);assert.equal(a.getDebugState().transientSources,0);a.dispose();
});

test('independent mixes, suspend/resume and disposal release pending voices and sample nodes',async()=>{
  const f=fixture(),a=f.audio;a.start();await a.whenReady();const initial=a.getDebugState();
  assert(initial.musicActive);assert.equal(f.intervals.size,1);a.setMix({music:false});assert.equal(a.getDebugState().musicActive,false);assert.equal(a.getDebugState().mix.voice,1);assert.equal(a.getDebugState().mix.effects,1);
  a.reload();a.footstep('metal',true);assert(a.getDebugState().transientSources>0);
  a.stop();assert.equal(a.getDebugState().contextState,'suspended');assert.equal(a.getDebugState().transientSources,0);assert.equal(f.intervals.size,0);
  a.start();await a.whenReady();assert.equal(a.getDebugState().graphNodes,initial.graphNodes);assert.equal(f.intervals.size,1);
  a.setTension(2);assert.equal(a.getDebugState().tension,1);a.dispose();assert.equal(a.getDebugState().graphNodes,0);assert.equal(a.getDebugState().sourceCount,0);assert.equal(f.intervals.size,0);
});

test('dispose settles queued sample loads and ignores late decode completions',async()=>{
  const f=fixture({holdFetches:true}),a=f.audio;a.start();const pending=a.whenReady();
  assert.equal(a.getDebugState().pendingDownloads,6);a.dispose();await pending;
  assert.equal(a.getDebugState().pendingDownloads,0);assert.equal(a.getDebugState().graphNodes,0);
  f.held.splice(0).forEach(release=>release());await flush();
  assert.equal(a.getDebugState().samplesLoaded,0);assert.equal(a.getDebugState().pendingDownloads,0);
  assert.equal(f.decodes,0,'closed audio contexts must not decode late network responses');
});

test('rifle gain dominates the ambient bed, ducks it briefly, and retains output headroom',async()=>{
  const f=fixture(),a=f.audio;a.start();await a.whenReady();
  const before=a.getDebugState(),oldNominalShot=.62*.6*.8;
  assert(before.shotGain*before.mixLevels.effects*before.mixLevels.master*before.mixLevels.output>oldNominalShot*6,
    'quiet rifle tails need a substantially stronger playback path');
  assert(before.shotGain*before.mixLevels.effects/before.mixLevels.music>18,
    'rifle bus must remain well above the slow ambient score');
  const limiter=f.created.find(node=>node.kind==='compressor');
  assert.equal(limiter.threshold.value,-3);assert(limiter.ratio.value>=12);assert(limiter.attack.value<=.001);
  assert(before.mixLevels.master<1,'the master leaves output headroom');
  const ceiling=f.created.find(node=>node.kind==='distortion'&&node.curve?.length===4096);
  assert(ceiling&&Math.max(...ceiling.curve)<.93,'loud overlapping peaks have a final soft ceiling');
  assert(a.shot({own:true}));const active=a.getDebugState();
  assert(active.scoreDucked);assert.equal(active.mixLevels.musicDuck,.18);
  for(let i=0;i<8;i++)a.shot({own:true});
  assert.equal(f.timers.size,1,'rapid fire extends one duck release timer');
  await f.runTimers();assert.equal(a.getDebugState().scoreDucked,false);assert.equal(a.getDebugState().mixLevels.musicDuck,1);
  a.dispose();
});

test('intro heartbeat starts on demand, fades at the end and survives pause without extra schedulers',async()=>{
  const f=fixture(),a=f.audio;assert.equal(a.getDebugState().initialized,false);
  assert(a.beginIntro());await a.whenReady();const initial=a.getDebugState();
  assert(initial.introActive);assert(initial.heartbeatActive);assert(initial.mixLevels.heartbeat>0);
  assert.equal(initial.transientSources,2,'one original double heartbeat, not a voice imitation');
  a.beginIntro();assert.equal(a.getDebugState().transientSources,2);assert.equal(f.intervals.size,1);
  a.stop();assert.equal(a.getDebugState().heartbeatActive,false);assert.equal(a.getDebugState().transientSources,0);
  a.start();assert(a.getDebugState().heartbeatActive);assert.equal(f.intervals.size,1);
  a.endIntro();const ended=a.getDebugState();assert.equal(ended.introActive,false);assert.equal(ended.mixLevels.heartbeat,0);
  assert(ended.mixLevels.music<initial.mixLevels.music);a.endIntro();
  a.setMix({music:false});a.beginIntro();assert.equal(a.getDebugState().heartbeatActive,false);
  a.dispose();assert.equal(a.getDebugState().graphNodes,0);assert.equal(f.intervals.size,0);
});

test('execution cues preload recorded humans, route in space, and clean up on pause and replay',async()=>{
  const cueAssets={...emptyAssets,executionCues:{
    pain:[{url:'audio/sfx/human-pain.wav',kind:'human-recording',gain:.8}],
    scream:[{url:'audio/sfx/human-scream.wav',kind:'human-recording'}],
    thud:[{url:'audio/sfx/thud.wav',kind:'sampled-foley'}],
  }};
  const f=fixture({soundAssets:cueAssets}),a=f.audio;a.start();await a.whenReady();const initial=a.getDebugState();
  assert.equal(initial.samplesLoaded,3);a.setListener([0,0,0],[0,0,-1]);
  for(const kind of ['pain','scream','thud'])assert(a.executionCue(kind,{position:[2,0,-2],intensity:.8}));
  assert.equal(a.getDebugState().sampledExecutionCues,3);assert.equal(a.getDebugState().cueCount,3);
  assert(f.created.some(node=>node.kind==='pan'&&node.pan.value>0));
  a.stop();assert.equal(a.getDebugState().transientSources,0);assert.equal(a.executionCue('pain'),false);
  a.start();await a.whenReady();assert.equal(f.decodes,3,'replay reuses decoded human and Foley samples');
  assert(a.executionCue('scream',{own:true}));f.finishSamples();assert.equal(a.getDebugState().graphNodes,initial.graphNodes);
  a.setMix({effects:false});assert.equal(a.executionCue('pain'),false);assert.equal(f.speechCalls,0);a.dispose();
});

test('unavailable human cues remain silent while procedural movement Foley stays bounded',async()=>{
  const f=fixture({soundAssets:emptyAssets}),a=f.audio;a.start();await a.whenReady();
  const initial=a.getDebugState();assert.equal(a.executionCue('pain'),false);assert.equal(a.executionCue('scream'),false);
  assert.equal(a.getDebugState().sourceCount,initial.sourceCount,'no oscillators may imitate missing human recordings');
  assert.equal(a.getDebugState().missingHumanCues,2);
  for(const kind of ['impact','thud','whoosh','grab','cloth-tear','slice'])assert(a.executionCue(kind,{position:[3,0,-1]}));
  assert.equal(a.getDebugState().fallbackExecutionCues,6);
  assert.equal(a.executionCue('unknown'),false);assert.equal(a.executionCue('thud',{intensity:0}),false);
  for(let i=0;i<100;i++)a.executionCue('impact');assert.equal(a.getDebugState().transientSources,20);
  a.stop();assert.equal(a.getDebugState().transientSources,0);assert.equal(f.timers.size,0);a.dispose();
});

test('production human and impact samples ship locally with their asset licenses',()=>{
  const cues=SOUND_ASSETS.executionCues;
  for(const kind of ['pain','scream','impact','thud']) {
    assert(cues[kind].length>0,`${kind} must have a shipped recording`);
    for(const asset of cues[kind]) {
      const bytes=readFileSync(new URL(`../public/${asset.url.replace(/^\.\//,'')}`,import.meta.url));
      assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
      assert(bytes.length>1000&&bytes.length<400000,'each local cue stays within the small audio budget');
      if(kind==='pain'||kind==='scream') {
        assert.equal(asset.kind,'human-recording');assert.equal(asset.license,'CC-BY-SA-3.0');assert.equal(asset.author,'Wildfire Games');
      } else assert.equal(asset.license,'CC0-1.0');
    }
  }
  const attribution=readFileSync(new URL('../public/audio/SOURCES.md',import.meta.url),'utf8');
  assert(attribution.includes('Wildfire Games'));assert(attribution.includes('creativecommons.org/licenses/by-sa/3.0'));
});
