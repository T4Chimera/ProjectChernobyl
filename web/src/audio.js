import { SOUND_ASSETS } from './sound-assets.js';
import { VOICE_RECORDINGS, findVoiceRecording } from './voice-manifest.js';

// Recorded weapon effects and upload-ready human voices. The slow ambient score
// and room impulse are original procedural audio; there is no speech synthesis.
const PROFILES = Object.freeze({
  Overwatch: { low: 3100, high: 280, drive: 1.6, gain: .75 },
  Felon: { low: 4200, high: 220, drive: 2.7, gain: .7 },
  Sukhoi: { low: 2800, high: 130, drive: 3.6, gain: .72 },
  Mikoyan: { low: 1800, high: 380, drive: 2.2, gain: .5 },
  Nikolai: { low: 11000, high: 90, drive: 1.05, gain: .7 },
  Katya: { low: 11000, high: 80, drive: 1.1, gain: .73 },
});
const clamp = value => Math.max(0, Math.min(1, value));
const mixValue = value => typeof value === 'boolean' ? Number(value) : Number.isFinite(value) ? clamp(value) : 1;
const vector = value => Array.isArray(value) ? value : [value?.x || 0, value?.y || 0, value?.z || 0];
const validAsset = asset => typeof asset === 'string' ? { url: asset, gain: 1 } : asset;
const MAX_TRANSIENTS = 20, MAX_DOWNLOADS = 3, MAX_CACHE = 64;
// Rifle sources have short peaks and quiet natural tails. Give those peaks room
// in the final limiter, raise their body, and keep the score behind action.
const LEVELS = Object.freeze({ master: .82, output: .86, music: .14, introMusic: .2, effects: .86,
  voice: .8, shot: 3.2, heartbeat: .58, shotDuck: .18 });
const CUE_GAINS = Object.freeze({ impact: 1.25, thud: 1.15, whoosh: .65, grab: .65,
  'cloth-tear': .7, slice: .7, pain: .95, scream: 1.05 });

export function createAudio(environment = globalThis, options = {}) {
  const host = environment.window || environment;
  const assets = options.soundAssets || SOUND_ASSETS;
  const recordings = options.voiceRecordings || VOICE_RECORDINGS;
  const clock = () => host.performance?.now?.() ?? Date.now();
  const nodes = new Set(), sources = new Set(), transients = new Set(), cache = new Map();
  const loading = new Set();
  const timers = new Set(), downloads = [], voiceQueue = [], lastBySpeaker = new Map();
  const mix = { music: 1, voice: 1, effects: 1 }, gains = [];
  const stats = { sampleShots: 0, fallbackShots: 0, recordedLinesPlayed: 0,
    executionCues: 0, sampledExecutionCues: 0, fallbackExecutionCues: 0, missingHumanCues: 0 };
  let ctx = null, master = null, music = null, musicDuck = null, heartbeat = null, effects = null, voiceBus = null, humFilter = null, room = null;
  let noise = null, started = false, enabled = true, disposed = false, tension = 0;
  let scheduler = null, nextNoteAt = 7, noteIndex = 0, activeDownloads = 0, shotIndex = 0, footIndex = 0;
  let voiceGeneration = 0, speaking = null, voiceLoading = false;
  let introActive = false, nextHeartbeatAt = 0, duckTimer = null, ducked = false, cueIndex = 0;
  let listener = [0, 0, 0], forward = [0, 0, -1], preloaded = [];
  const interval = (fn, delay) => (host.setInterval || setInterval)(fn, delay);
  const clearIntervalSafe = id => (host.clearInterval || clearInterval)(id);
  const later = (fn, delay) => {
    const id = (host.setTimeout || setTimeout)(() => { timers.delete(id); fn(); }, delay);
    timers.add(id); return id;
  };
  const cancelTimer = id => {
    if (id === null) return;
    (host.clearTimeout || clearTimeout)(id); timers.delete(id);
  };
  const keep = node => { nodes.add(node); return node; };
  function target(parameter, value, seconds = .18) {
    if (!parameter || !ctx) return;
    parameter.cancelScheduledValues(ctx.currentTime); parameter.setTargetAtTime(value, ctx.currentTime, seconds);
  }
  function release(node) {
    try { node.disconnect(); } catch { /* Already released. */ }
    nodes.delete(node); sources.delete(node);
  }
  function source(node, endAt, cleanup = [], done, transient = false, startAt = 0) {
    sources.add(node);
    const record = { node, finish: null };
    let ended = false;
    record.finish = () => {
      if (ended) return; ended = true;
      release(node); cleanup.forEach(release); transients.delete(record); done?.();
    };
    node.onended = record.finish;
    if (transient) transients.add(record);
    node.start(startAt); if (endAt !== undefined) node.stop(endAt);
    return record;
  }
  function stopRecord(record) {
    if (!record) return;
    try { record.node.stop(); } catch { /* Already ended. */ }
    record.finish();
  }
  const playable = () => !!ctx && started && enabled && !disposed && ctx.state === 'running';
  const effectRoom = () => playable() && mix.effects > 0 && transients.size < MAX_TRANSIENTS;

  function assetList() {
    return [...(assets.rifleShots || []), ...(assets.reload || []),
      ...Object.values(assets.footsteps || {}).flat(),
      ...Object.values(assets.executionCues || {}).flat()].map(validAsset).filter(item => item?.url);
  }
  function runDownloads() {
    while (!disposed && activeDownloads < MAX_DOWNLOADS && downloads.length) {
      const entry = downloads.shift(); activeDownloads++; loading.add(entry);
      (async () => {
        let deadline;
        try {
          if (!host.fetch || !ctx) throw new Error('Audio fetch unavailable');
          const base = host.document?.baseURI || host.location?.href || 'http://localhost/';
          entry.controller = host.AbortController ? new host.AbortController() : null;
          const timeout = new Promise((_, reject) => { deadline = later(() => {
            entry.controller?.abort(); reject(new Error('Audio loading timed out'));
          }, 15000); });
          const buffer = await Promise.race([timeout, (async () => {
            const response = await host.fetch(new URL(entry.url, base).href,
              entry.controller ? { signal: entry.controller.signal } : undefined);
            if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
            const bytes = await response.arrayBuffer();
            if (bytes.byteLength > 4 * 1024 * 1024) throw new Error('Audio file exceeds asset budget');
            if (disposed) return null;
            return ctx.decodeAudioData(bytes);
          })()]);
          if (!buffer) return null;
          if (!disposed) { entry.buffer = buffer; entry.state = 'ready'; }
          return buffer;
        } catch { entry.state = 'failed'; return null; }
        finally {
          if (deadline !== undefined) { (host.clearTimeout || clearTimeout)(deadline); timers.delete(deadline); }
        }
      })().then(buffer => {
        entry.resolve(buffer); loading.delete(entry); activeDownloads = Math.max(0, activeDownloads - 1); runDownloads();
      });
    }
  }
  function load(url) {
    if (!url || disposed) return Promise.resolve(null);
    if (cache.has(url)) return cache.get(url).promise;
    if (cache.size >= MAX_CACHE) {
      const stale = [...cache].find(([, entry]) => entry.state !== 'loading');
      if (stale) cache.delete(stale[0]); else return Promise.resolve(null);
    }
    const entry = { url, state: 'loading', buffer: null };
    entry.promise = new Promise(resolve => { entry.resolve = resolve; });
    cache.set(url, entry); downloads.push(entry); runDownloads(); return entry.promise;
  }
  function preload() {
    if (!ctx || disposed) return [];
    return assetList().map(asset => load(asset.url));
  }
  function readyAsset(list, index = 0) {
    if (!Array.isArray(list) || !list.length) return null;
    for (let i = 0; i < list.length; i++) {
      const asset = validAsset(list[(index + i) % list.length]);
      const buffer = cache.get(asset?.url)?.buffer;
      if (buffer) return { ...asset, buffer };
    }
    return null;
  }
  function acoustic(options = {}) {
    const position = options.position ? vector(options.position) : listener;
    const dx = position[0] - listener[0], dz = position[2] - listener[2];
    const distance = options.own === false ? Math.max(0, options.distance ?? Math.hypot(dx, dz)) : 0;
    const attenuation = options.own === false ? 1 / (1 + (distance / 6) ** 1.35) : 1;
    const pan = options.own === false ? Math.max(-.85, Math.min(.85, (dx * -forward[2] + dz * forward[0]) / Math.max(1, distance))) : 0;
    return { attenuation, pan, cutoff: Math.max(1100, 18000 / (1 + distance / 6)), wet: options.indoor ? .23 : .035 };
  }
  function playBuffer(asset, { destination = effects, gain = 1, rate = 1, spatial = {}, profile = null, done, delay = 0 } = {}) {
    if (!playable() || !asset?.buffer || transients.size >= MAX_TRANSIENTS) return null;
    const cleanup = [], node = keep(ctx.createBufferSource()), level = keep(ctx.createGain());
    cleanup.push(level); node.buffer = asset.buffer;
    if (node.playbackRate) node.playbackRate.value = rate;
    const environment = acoustic(spatial);
    level.gain.value = Math.max(0, gain * (asset.gain ?? 1) * environment.attenuation);
    let tail = node;
    const filter = (type, frequency) => {
      const f = keep(ctx.createBiquadFilter()); f.type = type; f.frequency.value = frequency;
      f.Q.value = .5; tail.connect(f); tail = f; cleanup.push(f);
    };
    if (profile) {
      filter('highpass', profile.high); filter('lowpass', profile.low);
      if (ctx.createWaveShaper) {
        const distortion = keep(ctx.createWaveShaper()), curve = new Float32Array(1024);
        for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 511.5 - 1) * profile.drive) / Math.tanh(profile.drive);
        distortion.curve = curve; distortion.oversample = '2x'; tail.connect(distortion); tail = distortion; cleanup.push(distortion);
      }
    } else if (spatial.own === false) filter('lowpass', environment.cutoff);
    tail.connect(level);
    if (ctx.createStereoPanner && environment.pan) {
      const pan = keep(ctx.createStereoPanner()); pan.pan.value = environment.pan;
      cleanup.push(pan); level.connect(pan); pan.connect(destination);
    } else level.connect(destination);
    if (room && destination === effects && environment.wet) {
      const wet = keep(ctx.createGain()); wet.gain.value = environment.wet;
      cleanup.push(wet); level.connect(wet); wet.connect(room);
    }
    return source(node, ctx.currentTime + delay + asset.buffer.duration / rate + .04,
      cleanup, done, true, ctx.currentTime + delay);
  }
  function cancelVoice() {
    voiceGeneration++; voiceQueue.length = 0; voiceLoading = false;
    const current = speaking; speaking = null; stopRecord(current?.record);
  }
  async function pumpVoice() {
    if (speaking || voiceLoading || !playable() || !mix.voice || !voiceQueue.length) return;
    const item = voiceQueue.shift(), generation = voiceGeneration;
    voiceLoading = true;
    const buffer = await load(item.url);
    if (generation !== voiceGeneration || !playable() || !mix.voice) return;
    voiceLoading = false;
    if (!buffer) { pumpVoice(); return; }
    const profile = PROFILES[item.speaker] || PROFILES.Overwatch;
    const current = { id: item.id, record: null }; speaking = current;
    current.record = playBuffer({ ...item, buffer }, { destination: voiceBus, profile, gain: profile.gain, done() {
      if (speaking === current) { speaking = null; later(pumpVoice, 100); }
    } });
    if (current.record) stats.recordedLinesPlayed++;
    else { speaking = null; pumpVoice(); }
  }
  function createGraph() {
    const Audio = host.AudioContext || host.webkitAudioContext;
    if (!Audio) return false;
    try { ctx = new Audio(); } catch { return false; }
    const limiter = keep(ctx.createDynamicsCompressor());
    limiter.threshold.value = -3; limiter.knee.value = 2; limiter.ratio.value = 16;
    limiter.attack.value = .001; limiter.release.value = .12;
    master = keep(ctx.createGain()); master.gain.value = 0;
    music = keep(ctx.createGain()); musicDuck = keep(ctx.createGain()); heartbeat = keep(ctx.createGain());
    effects = keep(ctx.createGain()); voiceBus = keep(ctx.createGain());
    music.gain.value = 0; musicDuck.gain.value = 1; heartbeat.gain.value = 0;
    effects.gain.value = LEVELS.effects; voiceBus.gain.value = LEVELS.voice;
    master.connect(limiter);
    const output = keep(ctx.createGain()); output.gain.value = LEVELS.output; limiter.connect(output);
    if (ctx.createWaveShaper) {
      // The compressor is not a hard ceiling: its attack and automatic makeup
      // gain can overshoot. Preserve quiet signals and soften only loud peaks.
      const ceiling = keep(ctx.createWaveShaper()), curve = new Float32Array(4096);
      for (let i = 0; i < curve.length; i++) {
        const x = i / (curve.length - 1) * 2 - 1, magnitude = Math.abs(x);
        curve[i] = Math.sign(x) * (magnitude <= .8 ? magnitude : .8 + .15 * (1 - Math.exp(-(magnitude - .8) / .15)));
      }
      ceiling.curve = curve; ceiling.oversample = '2x'; output.connect(ceiling); ceiling.connect(ctx.destination);
    } else output.connect(ctx.destination);
    music.connect(musicDuck); musicDuck.connect(master); heartbeat.connect(master);
    effects.connect(master); voiceBus.connect(master);
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2.6), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 1986, smooth = 0;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967295 * 2 - 1; };
    for (let i = 0; i < samples.length; i++) { const white = random(); smooth = smooth * .94 + white * .06; samples[i] = white * .42 + smooth * 1.4; }
    // Shared room response: pre-delayed early reflections and a diffuse tail,
    // synthesized once. No convolver or impulse allocation for every shot.
    if (ctx.createConvolver) {
      room = keep(ctx.createConvolver());
      const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 1.65), ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          const time = i / ctx.sampleRate;
          data[i] = time < .026 ? 0 : random() * Math.exp(-time * 4.5) * .12;
        }
        for (const [at, volume] of [[.043,.18],[.087,.12],[.137,.07]]) data[Math.floor(ctx.sampleRate * (at + channel * .004))] += volume;
      }
      room.buffer = impulse; room.connect(effects);
    }
    humFilter = keep(ctx.createBiquadFilter()); humFilter.type = 'lowpass'; humFilter.frequency.value = 560; humFilter.Q.value = .45; humFilter.connect(music);
    for (const [frequency, detune, level, rate] of [[65.406,-4,.14,.047],[98,5,.075,.061],[130.812,-7,.047,.036],[155.563,3,.024,.027]]) {
      const oscillator = keep(ctx.createOscillator()), gain = keep(ctx.createGain());
      oscillator.type = frequency > 130 ? 'sine' : 'triangle'; oscillator.frequency.value = frequency; oscillator.detune.value = detune;
      gain.gain.value = level; oscillator.connect(gain); gain.connect(humFilter);
      const breath = keep(ctx.createOscillator()), breathGain = keep(ctx.createGain());
      breath.frequency.value = rate; breathGain.gain.value = level * .28; breath.connect(breathGain); breathGain.connect(gain.gain);
      source(oscillator); source(breath); gains.push({ gain, level });
    }
    const air = keep(ctx.createBufferSource()), airFilter = keep(ctx.createBiquadFilter()), airGain = keep(ctx.createGain());
    air.buffer = noise; air.loop = true; airFilter.type = 'bandpass'; airFilter.frequency.value = 650; airFilter.Q.value = .3;
    airGain.gain.value = .065; air.connect(airFilter); airFilter.connect(airGain); airGain.connect(music); source(air);
    return true;
  }
  function updateMix() {
    if (!ctx) return;
    target(master.gain, enabled ? LEVELS.master : 0, .1);
    target(music.gain, enabled ? mix.music * ((introActive ? LEVELS.introMusic : LEVELS.music) + tension * .025) : 0, .6);
    target(musicDuck.gain, ducked ? LEVELS.shotDuck : 1, .025);
    target(heartbeat.gain, enabled && introActive ? mix.music * LEVELS.heartbeat : 0, .3);
    target(effects.gain, mix.effects * LEVELS.effects, .1); target(voiceBus.gain, mix.voice * LEVELS.voice, .1);
  }
  function duckScore() {
    ducked = true; cancelTimer(duckTimer); target(musicDuck.gain, LEVELS.shotDuck, .008);
    duckTimer = later(() => { duckTimer = null; ducked = false; target(musicDuck.gain, 1, .18); }, 260);
  }
  function tone(frequency = 330, duration = .09, type = 'sine', volume = .2, destination = effects, delay = 0) {
    if (!playable() || !destination || (destination === effects && !mix.effects) || transients.size >= MAX_TRANSIENTS) return false;
    const oscillator = keep(ctx.createOscillator()), gain = keep(ctx.createGain());
    oscillator.type = type; oscillator.frequency.value = frequency;
    const at = ctx.currentTime + delay;
    gain.gain.setValueAtTime(Math.max(.0001, volume), at); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain); gain.connect(destination); source(oscillator, at + duration + .02, [gain], null, true, at); return true;
  }
  function noiseBurst(duration, frequency, volume, delay = 0, spatial = {}) {
    if (!effectRoom()) return false;
    const node = keep(ctx.createBufferSource()), filter = keep(ctx.createBiquadFilter()), gain = keep(ctx.createGain());
    const environment = acoustic(spatial), cleanup = [filter,gain];
    node.buffer = noise; filter.type = 'lowpass'; filter.frequency.value = Math.min(frequency, environment.cutoff);
    gain.gain.setValueAtTime(.0001, ctx.currentTime); gain.gain.setValueAtTime(Math.max(.0001, volume * environment.attenuation), ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + duration);
    node.connect(filter); filter.connect(gain);
    if (ctx.createStereoPanner && environment.pan) {
      const pan = keep(ctx.createStereoPanner()); pan.pan.value = environment.pan;
      gain.connect(pan); pan.connect(effects); cleanup.push(pan);
    } else gain.connect(effects);
    if (room && environment.wet) {
      const wet = keep(ctx.createGain()); wet.gain.value = environment.wet;
      gain.connect(wet); wet.connect(room); cleanup.push(wet);
    }
    source(node, ctx.currentTime + delay + duration + .02, cleanup, null, true); return true;
  }
  function heartbeatPair() {
    if (!playable() || !introActive || !mix.music) return;
    // Original low percussion, not a claimed recording of a human heartbeat.
    tone(48, .19, 'sine', .29, heartbeat);
    tone(41, .15, 'sine', .2, heartbeat, .24);
    nextHeartbeatAt = ctx.currentTime + 1.15;
  }
  function scheduleScore() {
    if (scheduler !== null) return;
    scheduler = interval(() => {
      if (!playable() || !mix.music) return;
      if (introActive && ctx.currentTime >= nextHeartbeatAt) heartbeatPair();
      if (ctx.currentTime < nextNoteAt) return;
      const notes = [196,174.614,146.832,130.812,155.563,98], note = notes[noteIndex++ % notes.length];
      tone(note, introActive ? 6 : 4.5, 'sine', .035, music); tone(note * 2.997, 2.3, 'sine', .006, music);
      nextNoteAt = ctx.currentTime + (introActive ? 11 : 8) + ((noteIndex * 7) % 6);
    }, 250);
  }
  const api = {
    start() {
      if (disposed) return;
      started = true;
      if (!ctx && !createGraph()) return;
      try { ctx.resume()?.catch?.(() => {}); } catch { /* Await another user gesture. */ }
      updateMix(); scheduleScore(); preloaded = preload(); pumpVoice();
    },
    beginIntro() {
      if (disposed) return false;
      const wasActive = introActive; introActive = true; api.start();
      if (!wasActive && ctx) { nextNoteAt = ctx.currentTime + .35; heartbeatPair(); }
      updateMix(); return !!ctx;
    },
    endIntro() { introActive = false; updateMix(); },
    setEnabled(value) { enabled = !!value; updateMix(); if (!enabled) cancelVoice(); },
    setMix(patch = {}) {
      for (const key of ['music','voice','effects']) if (patch[key] !== undefined) mix[key] = mixValue(patch[key]);
      if (!mix.voice) cancelVoice(); updateMix();
    },
    setListener(position, direction) { listener = vector(position); if (direction) forward = vector(direction); },
    setTension(value) {
      tension = Number.isFinite(value) ? clamp(value) : 0;
      if (humFilter) target(humFilter.frequency, 560 + tension * 280, 1.2);
      for (const record of gains) target(record.gain.gain, record.level * (1 + tension * .16), 1.2);
      updateMix();
    },
    tone,
    shot(spatial = {}) {
      if (!effectRoom()) return false;
      const intensity = Number.isFinite(spatial.intensity) ? Math.max(0, Math.min(1.5, spatial.intensity)) : 1;
      if (!intensity) return false;
      const asset = readyAsset(assets.rifleShots, shotIndex++);
      if (asset) {
        const result = playBuffer(asset, { gain: LEVELS.shot * intensity, rate: .99 + (shotIndex % 5) * .005, spatial });
        if (result) { stats.sampleShots++; duckScore(); } return !!result;
      }
      stats.fallbackShots++; duckScore();
      noiseBurst(.055, 11000, 1.5 * intensity, 0, spatial);
      noiseBurst(.2, 750, .7 * intensity, .015, spatial); return true;
    },
    executionCue(kind, { position, intensity = 1, indoor = true, own = false } = {}) {
      if (kind === 'gunshot') {
        const result = api.shot({ position, intensity, indoor, own });
        if (result) stats.executionCues++; return result;
      }
      if (!effectRoom() || !Object.hasOwn(CUE_GAINS, kind)) return false;
      intensity = Number.isFinite(intensity) ? Math.max(0, Math.min(1.5, intensity)) : 1;
      if (!intensity) return false;
      const spatial = { position, intensity, indoor, own };
      const asset = readyAsset(assets.executionCues?.[kind], cueIndex++);
      if (asset) {
        const result = playBuffer(asset, { gain: CUE_GAINS[kind] * intensity, spatial });
        if (result) { stats.executionCues++; stats.sampledExecutionCues++; }
        return !!result;
      }
      // A missing actor scream/pain recording stays silent. Nonverbal movement
      // Foley has an explicitly procedural fallback while samples load.
      if (kind === 'pain' || kind === 'scream') { stats.missingHumanCues++; return false; }
      const [duration, cutoff, level] = {
        impact: [.13, 900, .8], thud: [.2, 340, 1], whoosh: [.2, 1800, .23],
        grab: [.12, 750, .3], 'cloth-tear': [.26, 3800, .34], slice: [.09, 4800, .28],
      }[kind];
      const result = noiseBurst(duration, cutoff, level * intensity, 0, spatial);
      if (result) { stats.executionCues++; stats.fallbackExecutionCues++; }
      return result;
    },
    hurt() { noiseBurst(.14, 490, .2); noiseBurst(.07, 170, .18); },
    radio() { noiseBurst(.06, 2600, .065); noiseBurst(.04, 1900, .04, .1); },
    reload() {
      if (!effectRoom()) return false;
      const handling = (assets.reload || []).slice(0, 2).map(asset => readyAsset([asset])).filter(Boolean);
      if (handling.length) {
        handling.forEach((asset, i) => playBuffer(asset, { gain: .55, delay: i * 1.3 }));
        return true;
      }
      noiseBurst(.08, 1900, .12); noiseBurst(.06, 3000, .12, .42); noiseBurst(.09, 2300, .2, 1.38); return true;
    },
    reloadComplete() {
      if (!effectRoom()) return false;
      const asset = readyAsset(assets.reload, 1);
      return asset ? !!playBuffer(asset, { gain: .2, rate: 1.12 }) : noiseBurst(.045, 2700, .07);
    },
    footstep(surface = 'concrete', sprinting = false) {
      if (!effectRoom()) return false;
      const surfaceAssets = assets.footsteps?.[surface];
      const asset = readyAsset(surfaceAssets?.length ? surfaceAssets : surface === 'metal' ? [] : assets.footsteps?.concrete, footIndex++);
      if (asset) return !!playBuffer(asset, { gain: sprinting ? .75 : .5, rate: .97 + footIndex % 4 * .015, spatial: { indoor: surface === 'metal' } });
      return noiseBurst(sprinting ? .11 : .08, surface === 'metal' ? 1650 : 850, sprinting ? .16 : .095);
    },
    speak(text, speaker = 'Overwatch', priority = false) {
      if (!playable() || !mix.voice || typeof text !== 'string') return false;
      const recording = findVoiceRecording(speaker, text, recordings);
      if (!recording) return false;
      const now = clock();
      if (!priority && now - (lastBySpeaker.get(speaker) ?? -Infinity) < 2200) return false;
      if (priority) cancelVoice(); else if (voiceQueue.length >= 3) return false;
      lastBySpeaker.set(speaker, now); voiceQueue.push(recording); pumpVoice(); return true;
    },
    whenReady() { return Promise.all(preloaded); },
    stop() {
      started = false; cancelVoice();
      cancelTimer(duckTimer); duckTimer = null; ducked = false;
      if (musicDuck) target(musicDuck.gain, 1, .01);
      for (const record of [...transients]) stopRecord(record);
      if (scheduler !== null) { clearIntervalSafe(scheduler); scheduler = null; }
      try { ctx?.suspend()?.catch?.(() => {}); } catch { /* Closed context. */ }
    },
    dispose() {
      if (disposed) return;
      api.stop(); disposed = true;
      introActive = false;
      downloads.splice(0).forEach(entry => { entry.state = 'failed'; entry.resolve(null); });
      for (const entry of loading) { entry.controller?.abort(); entry.resolve(null); }
      loading.clear(); activeDownloads = 0;
      for (const node of sources) { try { node.stop(); } catch { /* Stopped. */ } }
      for (const node of [...nodes]) release(node);
      sources.clear(); cache.clear(); timers.forEach(id => (host.clearTimeout || clearTimeout)(id)); timers.clear();
      try { ctx?.close()?.catch?.(() => {}); } catch { /* Unsupported/closed. */ }
    },
    getDebugState() {
      const states = [...cache.values()];
      return { initialized: !!ctx, started, enabled, contextState: ctx?.state || 'unavailable',
        graphNodes: nodes.size, sourceCount: sources.size, transientSources: transients.size,
        speechQueue: voiceQueue.length, speaking: !!speaking, currentVoiceId: speaking?.id || null,
        voiceMode: 'recorded-only', recordedVoiceMode: true, voiceCount: Object.keys(recordings).length,
        musicActive: !!ctx && ctx.state === 'running' && started && enabled && mix.music > 0,
        samplesLoaded: states.filter(entry => entry.state === 'ready').length,
        samplesFailed: states.filter(entry => entry.state === 'failed').length,
        pendingDownloads: downloads.length + activeDownloads, ...stats, cueCount: stats.executionCues,
        shotGain: LEVELS.shot, introActive, heartbeatActive: introActive && playable() && mix.music > 0,
        scoreDucked: ducked, mixLevels: { master: master?.gain.value ?? 0, output: LEVELS.output,
          music: music?.gain.value ?? 0, musicDuck: musicDuck?.gain.value ?? 1,
          heartbeat: heartbeat?.gain.value ?? 0, effects: effects?.gain.value ?? 0,
          voice: voiceBus?.gain.value ?? 0 }, mix: { ...mix }, tension };
    },
  };
  return api;
}
