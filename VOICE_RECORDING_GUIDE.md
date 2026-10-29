# Record voices for Project Chernobyl

Human recordings will replace the old browser TTS. Automatic speech synthesis
has been removed. Lines without a supplied recording keep their subtitles.

The complete current recording script, including Overwatch's operational orders,
is in [recording-script.csv](web/public/audio/voices/recording-script.csv).
Its filenames match the slots in [voice-manifest.js](web/src/voice-manifest.js).
The original character dialogue stays exactly as supplied by the creator.

## What to send

- One **mono WAV** per line, preferably **48 kHz**, 16-bit or 24-bit PCM.
  MP3/OGG can also be integrated, but send the clean WAV if available.
- Use the filename from the script, grouped into folders such as `Felon/` and
  `Overwatch/`. A ZIP containing those folders is convenient.
- Leave roughly 0.25 seconds of quiet before and after each line. Record in a
  quiet room, keep the microphone position steady, and avoid clipping.
- Send dry recordings with no added music, radio noise, reverb or distortion.
  The game adds those effects, and keeping a dry original helps the later Studio
  version. Two or three alternative takes are useful; suffix extras `-take2`.

Start with **Overwatch, Felon and regular movement/combat reactions** if you want
to hear a smaller batch in-game before recording the whole script. Additional
reaction sounds are optional non-verbal recordings; they do not create new lines.

## Performance direction

| Character | Existing direction |
| --- | --- |
| Overwatch | Calm, clear mission guidance; leave space between instructions. |
| Felon | Frightened, angry and paranoid; forceful delivery without clipping. |
| Sukhoi | Hostile, extremely aggressive; damaged-radio treatment is added later. |
| Mikoyan | Quiet and heavily obscured. His only confirmed line is “Leave me ALONE.” |
| Nikolai | Calling for Novak; use the exact existing lines. |
| Katya | Grief, crying and rage according to the current line category. |
| Novak | Silent. Do not record spoken dialogue. |
| John / Jayden | Their proposed lines remain disabled pending creator confirmation. |

Bracketed crying descriptions mean **perform that sound**, not read the bracketed
words aloud. Do not rewrite dialogue to make punctuation easier to perform.

## Integration and Roblox Studio

Place accepted browser clips under `web/public/audio/voices/<Speaker>/`, then add
their relative URLs to `VOICE_RECORDINGS` in `voice-manifest.js`. Recording slots
already have stable IDs, and the browser never requests an unconfigured slot.
Playback uses bounded queues, individual character processing, radio filtering,
voice/music/effects controls and no synthesized speech fallback.

Keep the original WAVs for Roblox Studio. They must later be uploaded through an
authorized Roblox account; actual approved audio IDs can then fill the existing
`VoiceLineConfig.luau` slots. No Roblox audio ID is fabricated by this browser
implementation. Share recordings you made or have permission to use.
