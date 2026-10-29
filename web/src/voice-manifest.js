import canon from './canon.js';
import { MISSIONS } from './missions.js';

// Stable recording slots, generated from the existing words rather than a new
// script. Browser files and future Roblox uploads remain independent assets.
const slug = value => value.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const entries = [];
for (const [speaker, voice] of Object.entries(canon.Voices.Voices)) {
  if (speaker === 'Novak' || voice.Proposed) continue;
  for (const [category, lines] of Object.entries(voice.Lines)) {
    if (!Array.isArray(lines)) continue;
    lines.forEach((line, index) => entries.push(Object.freeze({
      id: `${slug(speaker)}-${slug(category)}-${String(index + 1).padStart(2, '0')}`,
      speaker, category, text: line.Text,
      filename: `${slug(speaker)}-${slug(category)}-${String(index + 1).padStart(2, '0')}.wav`,
      robloxSoundId: null,
    })));
  }
}
for (const mission of MISSIONS) entries.push(Object.freeze({
  id: `overwatch-${mission.id}`, speaker: 'Overwatch', category: 'Mission',
  text: mission.text, filename: `overwatch-${mission.id}.wav`, robloxSoundId: null,
}));
export const VOICE_LINES = Object.freeze(entries);

// Populate only after the creator supplies recordings. An absent entry means
// subtitles only; it never triggers a 404 or falls back to synthesized speech.
// Example after uploading a real file:
// 'felon-nearby-01': { url: 'audio/voices/Felon/felon-nearby-01.wav', gain: .8 }
export const VOICE_RECORDINGS = Object.freeze({});

export function findVoiceLine(speaker, text) {
  return VOICE_LINES.find(line => line.speaker === speaker && line.text === text);
}

export function findVoiceRecording(speaker, text, recordings = VOICE_RECORDINGS) {
  const line = findVoiceLine(speaker, text);
  if (!line) return null;
  const entry = recordings[line.id];
  const asset = typeof entry === 'string' ? { url: entry } : entry;
  return asset?.url ? { ...line, ...asset } : null;
}
