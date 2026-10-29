// Real firearm recordings and sampled Foley, served locally without hotlinks.
// Source authors, CC0 dedication, source hashes and edits: public/audio/SOURCES.md.
const firearm = (file, gain = 1) => Object.freeze({
  url: `./audio/sfx/${file}`, gain, license: 'CC0-1.0', author: 'Still North Media', kind: 'recording',
});
const foley = (file, gain) => Object.freeze({
  url: `./audio/sfx/${file}`, gain, license: 'CC0-1.0', author: 'Kenney', kind: 'sampled-foley',
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
});
