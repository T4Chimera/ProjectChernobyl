// Real firearm recordings and sampled Foley, served locally without hotlinks.
// Source authors, CC0 dedication, source hashes and edits: public/audio/SOURCES.md.
const firearm = (file, gain = 1) => Object.freeze({
  url: `./audio/sfx/${file}`, gain, license: 'CC0-1.0', author: 'Still North Media', kind: 'recording',
});
const foley = (file, gain) => Object.freeze({
  url: `./audio/sfx/${file}`, gain, license: 'CC0-1.0', author: 'Kenney', kind: 'sampled-foley',
});
// Generic nonverbal actor performances, separately licensed from the CC0 pack.
// They do not supply, replace, or establish any named character's dialogue.
const human = (file, gain = 1) => Object.freeze({
  url: `./audio/sfx/${file}`, gain, license: 'CC-BY-SA-3.0', author: 'Wildfire Games', kind: 'human-recording',
});

export const SOUND_ASSETS = Object.freeze({
  rifleShots: Object.freeze([
    firearm('rifle-near-01.wav'), firearm('rifle-near-02.wav'), firearm('rifle-mid-01.wav', .9),
  ]),
  // These are adapted metal handling Foley, not a claimed HK416 reload recording.
  reload: Object.freeze([
    foley('gear-metal-light.wav', .32), foley('gear-metal-latch.wav', .42),
  ]),
  footsteps: Object.freeze({
    concrete: Object.freeze([1, 2, 3, 4].map(number => foley(`concrete-step-0${number}.wav`, .22))),
    gravel: Object.freeze([]), metal: Object.freeze([]),
  }),
  executionCues: Object.freeze({
    impact: Object.freeze([foley('body-impact-01.wav', .9)]),
    thud: Object.freeze([foley('body-thud-01.wav', .95)]),
    whoosh: Object.freeze([]), grab: Object.freeze([]),
    'cloth-tear': Object.freeze([]), slice: Object.freeze([]),
    pain: Object.freeze([human('human-pain-01.wav', .85)]),
    scream: Object.freeze([human('human-scream-01.wav'), human('human-scream-02.wav')]),
  }),
});
