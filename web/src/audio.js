// Original procedural score/effects; dialogue uses the listener's installed
// speech voices. No external recordings, copyrighted music, or asset requests.
const PROFILES = Object.freeze({
  Overwatch: { rate: 0.98, pitch: 0.94, volume: 0.72, gender: 'male' },
  Felon: { rate: 1.08, pitch: 0.88, volume: 0.77, gender: 'male' },
  Sukhoi: { rate: 0.91, pitch: 0.72, volume: 0.78, gender: 'male' },
  Mikoyan: { rate: 0.84, pitch: 0.89, volume: 0.47, gender: 'male' },
  Nikolai: { rate: 0.98, pitch: 1.03, volume: 0.65, gender: 'male' },
  Katya: { rate: 0.93, pitch: 1.08, volume: 0.7, gender: 'female' },
  John: { rate: 0.97, pitch: 0.86, volume: 0.68, gender: 'male' },
  Jayden: { rate: 1.04, pitch: 0.83, volume: 0.74, gender: 'male' },
});
const clamp = value => Math.max(0, Math.min(1, value));
const mixValue = value => typeof value === 'boolean' ? Number(value) : Number.isFinite(value) ? clamp(value) : 1;

export function createAudio(environment = globalThis) {
  const host = environment.window || environment;
  const clock = () => host.performance?.now?.() ?? Date.now();
  const speech = host.speechSynthesis;
  const timers = new Set(), nodes = new Set(), sources = new Set();
  const mix = { music: 1, voice: 1, effects: 1 };
  let ctx = null, master = null, music = null, effects = null, humFilter = null;
  let noise = null, started = false, enabled = true, disposed = false, tension = 0;
  let scheduler = null, nextNoteAt = 7, noteIndex = 0, voices = [], speechTimer = null;
  let speaking = null, speechGeneration = 0, speechWatchdog = null;
  const queue = [], lastBySpeaker = new Map();
  const gains = [];
  const interval = (callback, delay) => (host.setInterval || setInterval)(callback, delay);
  const clearIntervalSafe = timer => (host.clearInterval || clearInterval)(timer);
  const later = (callback, delay) => {
    const timer = (host.setTimeout || setTimeout)(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer); return timer;
  };
  const clearLater = timer => {
    if (timer !== null) { (host.clearTimeout || clearTimeout)(timer); timers.delete(timer); }
  };
  function keep(node) { nodes.add(node); return node; }
  function target(parameter, value, seconds = 0.18) {
    if (!parameter || !ctx) return;
    parameter.cancelScheduledValues(ctx.currentTime);
    parameter.setTargetAtTime(value, ctx.currentTime, seconds);
  }
  function release(node) {
    try { node.disconnect(); } catch { /* A removed source is already disconnected. */ }
    nodes.delete(node); sources.delete(node);
  }
  function source(node, endAt, cleanup = []) {
    sources.add(node);
    node.onended = () => { release(node); cleanup.forEach(release); };
    node.start();
    if (endAt !== undefined) node.stop(endAt);
  }
  function refreshVoices() {
    try { voices = speech?.getVoices?.() || []; } catch { voices = []; }
  }
  function chooseVoice(gender) {
    const english = voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang || ''));
    const score = voice => {
      const name = voice.name || '';
      let points = /Natural|Online|Neural|Google|Microsoft/i.test(name) ? 20 : 0;
      if (/Aria|Jenny|Sonia|Susan|Zira|female|English Female/i.test(name)) points += gender === 'female' ? 12 : -3;
      if (/Guy|Ryan|David|George|Daniel|male|English Male/i.test(name) && !/female/i.test(name)) points += gender === 'male' ? 12 : -3;
      if (/en-GB/i.test(voice.lang)) points += 2;
      if (voice.default) points += 1;
      return points;
    };
    return english.sort((a, b) => score(b) - score(a))[0];
  }
  function cancelSpeech() {
    speechGeneration++; queue.length = 0; speaking = null;
    clearLater(speechWatchdog); clearLater(speechTimer);
    speechWatchdog = speechTimer = null;
    try { speech?.cancel?.(); } catch { /* Some embedded browsers expose only part of this API. */ }
  }
  function pumpSpeech() {
    if (speaking || !started || !enabled || mix.voice === 0 || !queue.length || !speech) return;
    const item = queue.shift(), generation = speechGeneration;
    const Utterance = host.SpeechSynthesisUtterance;
    if (!Utterance) return;
    const utterance = new Utterance(item.text);
    const profile = PROFILES[item.speaker] || PROFILES.Overwatch;
    const voice = chooseVoice(profile.gender);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-GB';
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = profile.volume * mix.voice;
    speaking = utterance;
    const done = () => {
      if (generation !== speechGeneration || speaking !== utterance) return;
      clearLater(speechWatchdog); speechWatchdog = null; speaking = null;
      speechTimer = later(pumpSpeech, 120);
    };
    utterance.onend = done;
    utterance.onerror = done;
    // A failed OS voice must not permanently retain the whole speech channel.
    speechWatchdog = later(() => { cancelSpeech(); }, 18000);
    try { speech.speak(utterance); } catch { done(); }
  }
  function createGraph() {
    const Audio = host.AudioContext || host.webkitAudioContext;
    if (!Audio) return false;
    try { ctx = new Audio(); } catch { return false; }
    const limiter = keep(ctx.createDynamicsCompressor());
    limiter.threshold.value = -18; limiter.knee.value = 16;
    limiter.ratio.value = 3.5; limiter.attack.value = 0.008; limiter.release.value = 0.32;
    master = keep(ctx.createGain()); master.gain.value = 0;
    music = keep(ctx.createGain()); music.gain.value = 0;
    effects = keep(ctx.createGain()); effects.gain.value = mix.effects * 0.6;
    master.connect(limiter); limiter.connect(ctx.destination);
    music.connect(master); effects.connect(master);
    // One reusable noise buffer feeds weather, impacts, cloth, and shot transients.
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2.6), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 1986, smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 4294967295) * 2 - 1;
      smooth = smooth * 0.94 + white * 0.06;
      samples[i] = white * 0.42 + smooth * 1.4;
    }
    humFilter = keep(ctx.createBiquadFilter());
    humFilter.type = 'lowpass'; humFilter.frequency.value = 560; humFilter.Q.value = 0.45;
    humFilter.connect(music);
    // A slowly breathing minor/open-fifth choir, with no sampled or borrowed melody.
    for (const [frequency, detune, level, rate] of [
      [65.406, -4, 0.14, 0.047], [98, 5, 0.075, 0.061],
      [130.812, -7, 0.047, 0.036], [155.563, 3, 0.024, 0.027],
    ]) {
      const oscillator = keep(ctx.createOscillator()), gain = keep(ctx.createGain());
      oscillator.type = frequency > 130 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency; oscillator.detune.value = detune;
      gain.gain.value = level; oscillator.connect(gain); gain.connect(humFilter);
      const breath = keep(ctx.createOscillator()), breathGain = keep(ctx.createGain());
      breath.frequency.value = rate; breathGain.gain.value = level * 0.28;
      breath.connect(breathGain); breathGain.connect(gain.gain);
      source(oscillator); source(breath); gains.push({ gain, level });
    }
    const air = keep(ctx.createBufferSource()), airFilter = keep(ctx.createBiquadFilter()), airGain = keep(ctx.createGain());
    air.buffer = noise; air.loop = true;
    airFilter.type = 'bandpass'; airFilter.frequency.value = 650; airFilter.Q.value = 0.3;
    airGain.gain.value = 0.065;
    air.connect(airFilter); airFilter.connect(airGain); airGain.connect(music); source(air);
    return true;
  }
  function updateMix() {
    if (!ctx) return;
    target(master.gain, enabled ? 0.62 : 0, 0.14);
    target(music.gain, enabled ? mix.music * (0.24 + tension * 0.035) : 0, 0.6);
    target(effects.gain, mix.effects * 0.6, 0.14);
  }
  function tone(frequency = 330, duration = 0.09, type = 'sine', volume = 0.2, destination = effects) {
    if (!ctx || !started || !enabled || ctx.state === 'suspended' || !destination || sources.size > 38) return;
    const oscillator = keep(ctx.createOscillator()), gain = keep(ctx.createGain());
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain); gain.connect(destination);
    source(oscillator, ctx.currentTime + duration + 0.02, [gain]);
  }
  function noiseBurst(duration, frequency, volume, type = 'lowpass', delay = 0) {
    if (!ctx || !started || !enabled || mix.effects === 0 || ctx.state === 'suspended' || sources.size > 38) return;
    const node = keep(ctx.createBufferSource()), filter = keep(ctx.createBiquadFilter()), gain = keep(ctx.createGain());
    node.buffer = noise; filter.type = type; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    node.connect(filter); filter.connect(gain); gain.connect(effects);
    source(node, ctx.currentTime + delay + duration + 0.02, [filter, gain]);
  }
  function scheduleScore() {
    if (scheduler !== null) return;
    scheduler = interval(() => {
      if (!ctx || !started || !enabled || ctx.state !== 'running' || mix.music === 0 || ctx.currentTime < nextNoteAt) return;
      const notes = [196, 174.614, 146.832, 130.812, 155.563, 98];
      const note = notes[noteIndex++ % notes.length];
      // Quiet distant glass harmonics, separated by long, irregular rests.
      tone(note, 4.5, 'sine', 0.035, music);
      tone(note * 2.997, 2.3, 'sine', 0.006, music);
      nextNoteAt = ctx.currentTime + 8 + ((noteIndex * 7) % 6);
    }, 1000);
  }
  refreshVoices();
  speech?.addEventListener?.('voiceschanged', refreshVoices);

  const api = {
    start() {
      if (disposed) return;
      started = true;
      if (!ctx && !createGraph()) { refreshVoices(); return; }
      try { ctx.resume()?.catch?.(() => {}); } catch { /* Autoplay may await the next user gesture. */ }
      refreshVoices(); updateMix(); scheduleScore(); pumpSpeech();
    },
    setEnabled(value) {
      enabled = !!value; updateMix();
      if (!enabled) cancelSpeech();
    },
    setMix(patch = {}) {
      for (const key of ['music', 'voice', 'effects']) if (patch[key] !== undefined) mix[key] = mixValue(patch[key]);
      if (!mix.voice) cancelSpeech();
      updateMix();
    },
    setTension(value) {
      tension = Number.isFinite(value) ? clamp(value) : 0;
      if (humFilter) target(humFilter.frequency, 560 + tension * 280, 1.2);
      for (const record of gains) target(record.gain.gain, record.level * (1 + tension * 0.16), 1.2);
      updateMix();
    },
    tone,
    shot() {
      noiseBurst(0.14, 3100, 0.63);
      noiseBurst(0.23, 650, 0.28, 'lowpass', 0.025);
      tone(79, 0.11, 'triangle', 0.58);
      tone(142, 0.055, 'sine', 0.18);
    },
    hurt() { noiseBurst(0.16, 390, 0.19); tone(54, 0.28, 'sine', 0.22); },
    radio() { noiseBurst(0.11, 2100, 0.075, 'bandpass'); tone(960, 0.055, 'sine', 0.045); },
    reload() {
      noiseBurst(0.1, 1700, 0.13, 'bandpass');
      noiseBurst(0.07, 2600, 0.13, 'bandpass', 0.42);
      noiseBurst(0.11, 2100, 0.22, 'bandpass', 1.38);
    },
    footstep(surface = 'concrete', sprinting = false) {
      const metal = surface === 'metal';
      noiseBurst(sprinting ? 0.11 : 0.085, metal ? 1650 : 850, sprinting ? 0.19 : 0.105);
      tone(metal ? 112 : 68, 0.07, 'sine', sprinting ? 0.16 : 0.09);
      if (metal) tone(420, 0.12, 'sine', 0.023);
    },
    speak(text, speaker = 'Overwatch', priority = false) {
      if (!started || !enabled || !mix.voice || speaker === 'Novak' || !speech || !host.SpeechSynthesisUtterance || typeof text !== 'string') return false;
      // Crying descriptors are subtitle cues, never spoken as the word "crying".
      const clean = text.replace(/\[[^\]]*\]/g, '').trim();
      if (!clean) return false;
      const now = clock();
      if (!priority && now - (lastBySpeaker.get(speaker) ?? -Infinity) < 2200) return false;
      lastBySpeaker.set(speaker, now);
      if (priority) cancelSpeech();
      else if (queue.length >= 3) return false;
      const sentences = clean.match(/[^.!?]+[.!?]*|[^.!?]+$/g) || [clean];
      const chunks = [];
      for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/); let part = '';
        for (const word of words) {
          if (part.length + word.length > 170) { chunks.push(part); part = word; }
          else part += `${part ? ' ' : ''}${word}`;
        }
        if (part) chunks.push(part);
      }
      for (const chunk of chunks.slice(0, 5)) queue.push({ text: chunk, speaker });
      while (queue.length > 6) queue.pop();
      refreshVoices();
      if (!voices.length && !speaking) {
        clearLater(speechTimer); speechTimer = later(pumpSpeech, 250);
      } else pumpSpeech();
      return true;
    },
    stop() {
      started = false; cancelSpeech();
      if (scheduler !== null) { clearIntervalSafe(scheduler); scheduler = null; }
      try { ctx?.suspend()?.catch?.(() => {}); } catch { /* Already closed/suspended. */ }
    },
    dispose() {
      if (disposed) return;
      api.stop(); disposed = true;
      speech?.removeEventListener?.('voiceschanged', refreshVoices);
      for (const node of sources) { try { node.stop(); } catch { /* Stopped. */ } }
      for (const node of nodes) { try { node.disconnect(); } catch { /* Disconnected. */ } }
      sources.clear(); nodes.clear(); timers.forEach(clearLater); timers.clear();
      try { ctx?.close()?.catch?.(() => {}); } catch { /* Unsupported/closed context. */ }
    },
    getDebugState() {
      return { initialized: !!ctx, started, enabled, contextState: ctx?.state || 'unavailable',
        graphNodes: nodes.size, sourceCount: sources.size, speechQueue: queue.length,
        speaking: !!speaking, musicActive: !!ctx && ctx.state === 'running' && started && enabled && mix.music > 0,
        voiceCount: voices.length, mix: { ...mix }, tension };
    },
  };
  return api;
}
