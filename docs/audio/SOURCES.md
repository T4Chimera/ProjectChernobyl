# Audio sources and licenses

These small files are committed locally and shipped with the game. Runtime audio
never hotlinks third-party hosts. Nonverbal human vocalizations are included as
generic execution effects. Character dialogue performances and Roblox audio
asset IDs remain unsupplied.

## Rifle recordings — Still North Media

The three `rifle-*.wav` files are isolated real gunshots from **Still North
Media's The Free Firearm Sound Effects Library**, dedicated to **CC0 1.0**.
These are recorded AR-15/M4-family 5.56 mm gunshots, not synthesized white noise.
They are representative prototype rifle audio, not a claim that the recording is
an exact HK416, loadout assignment, or final character asset.

Original pack: https://opengameart.org/content/the-free-firearm-sound-library

Licensing/provenance mirror: https://github.com/PanderMusubi/sound-effects-library-weapons
The mirror's README credits Still North Media, identifies the CC0 release, and
describes field-recorded near/far gunshots and microphone positions. The exact
CC0 license text is preserved in [sfx/CC0-1.0.txt](sfx/CC0-1.0.txt).

License evidence: https://github.com/PanderMusubi/sound-effects-library-weapons/blob/e58b20e350765ebc3e0c54e80cf6b285fb28e470/README.md

Source recordings: https://github.com/petroulacl/fps-asset-kit/tree/a19b7458a593598211c95ec46ef4eb4b6d1f94d7/sfx/firearm_sfx/Prepared%20SFX%20Library/AR-15

The source file metadata identifies AR-15, M4, rifle/carbine, .223/5.56x45,
gunshot, stereo, and front-of-shooter positions. `D_32P.wav` is marked near
distance; `D_24P.wav` is marked mid distance. Both source files are stereo,
96 kHz, 24-bit PCM and each contains two separated shots.

| Local file | Original file | Start | Retained duration |
| --- | --- | ---: | ---: |
| rifle-near-01.wav | D_32P.wav | 0.699 s | 1.200 s |
| rifle-near-02.wav | D_32P.wav | 5.643 s | 1.200 s |
| rifle-mid-01.wav | D_24P.wav | 0.544 s | 1.600 s |

## Footsteps and handling Foley — Kenney

Four concrete footstep samples and two metal impact samples are from
**Kenney's Impact Sounds**, **CC0 1.0**. The metal samples are adapted as handling
Foley during reloads; they are not claimed to be a recording of a real rifle's
reload mechanism. The footsteps are concrete recordings used on the plant's
concrete/asphalt surfaces. Other surfaces can use the existing fallback effects.

Original pack: https://kenney.nl/assets/impact-sounds

Source mirror: https://github.com/Boyquotes/kenney-impact-sounds-for-godot/tree/999dd1684873f8b020a3aa5b26e713da21688924

License evidence: https://github.com/Boyquotes/kenney-impact-sounds-for-godot/blob/999dd1684873f8b020a3aa5b26e713da21688924/LICENSE

| Local file | Original file |
| --- | --- |
| concrete-step-01.wav | footstep_concrete_000.ogg |
| concrete-step-02.wav | footstep_concrete_001.ogg |
| concrete-step-03.wav | footstep_concrete_002.ogg |
| concrete-step-04.wav | footstep_concrete_003.ogg |
| gear-metal-light.wav | impact_metal_light_000.ogg |
| gear-metal-latch.wav | impact_metal_medium_001.ogg |

## Nonverbal human vocalizations — Wildfire Games

`human-pain-01.wav`, `human-scream-01.wav` and `human-scream-02.wav` are
adapted from the **0 A.D.** project's human death vocalizations. They are
nonverbal performance samples used for generic prototype pain/scream cues;
they remain generic samples rather than character dialogue or final character
voices. The upstream project classifies them as human actor death sounds.

**Original author: Wildfire Games** — http://www.wildfiregames.com/

**License: Creative Commons Attribution-Share Alike 3.0 Unported
(CC BY-SA 3.0)** — https://creativecommons.org/licenses/by-sa/3.0/

These three modified WAV files are distributed under **CC BY-SA 3.0**, including
this project's downmixing, filtering, resampling, fades and normalization. This
asset license applies to these recordings and their modifications. The other
audio assets retain their individually stated licenses. Preserve this attribution
and license when redistributing the recordings.

The upstream audio license and redistribution instructions are retained exactly
in [sfx/Wildfire-Games-LICENSE.txt](sfx/Wildfire-Games-LICENSE.txt).

Pinned official source revision:
https://github.com/0ad/0ad/tree/61a3b9507d974084e6badb88a0826bd89a6d5b8b/binaries/data/mods/public/audio/actor/human/death

License evidence:
https://github.com/0ad/0ad/blob/61a3b9507d974084e6badb88a0826bd89a6d5b8b/binaries/data/mods/public/audio/LICENSE.txt

| Local cue file | Unmodified upstream recording | Duration |
| --- | --- | ---: |
| human-pain-01.wav | male_death_11.ogg | 1.500 s |
| human-scream-01.wav | male_death_24.ogg | 2.500 s |
| human-scream-02.wav | female_death_04.ogg | 2.322 s |

## Execution impacts — Kenney

`body-impact-01.wav` and `body-thud-01.wav` adapt Kenney's **CC0 1.0**
Impact Sounds Foley from the same pinned mirror and license identified above.
They provide sampled Foley for staged, stylized body/ground impact cues.

| Local file | Unmodified upstream recording | Duration |
| --- | --- | ---: |
| body-impact-01.wav | impact_punch_heavy_000.ogg | 0.649 s |
| body-thud-01.wav | impact_soft_heavy_000.ogg | 0.527 s |

These five new files were decoded with FFmpeg, passed through a 35 Hz high-pass
filter, resampled to mono 48 kHz signed 16-bit PCM, given a 25 ms end fade, then
linearly peak-normalized to at most 0.72 full scale. They total **720,034 bytes**
(about 703 KiB); no source recording was synthesized.

Source and production SHA-256 hashes for the added recordings:

| Original source file | Source SHA-256 |
| --- | --- |
| male_death_11.ogg | `97847ede681046de3a8a059aca1edbb5e66eb9b60159e0c8f30247a8cea5ba5a` |
| male_death_24.ogg | `92a5fc47c7e42b541a102d6e7c8545b38973859e674c02a3271372744e406cce` |
| female_death_04.ogg | `305940f89b59ba5282bcc78717bdcfae3a35685684f25fa41cd92f01fb3b9fb0` |
| impact_punch_heavy_000.ogg | `b33a8f14068aec24ec69ba85e5e87fdc41228975f6a1a3e44a6e7d6fc3d9f8d8` |
| impact_soft_heavy_000.ogg | `49e7ca88743fca974bb8676ea138b751cfd8f9033b5e7af8736c2a215d6edbc1` |

| Local production file | Production SHA-256 |
| --- | --- |
| human-pain-01.wav | `417f69ec594249779617f5982dad2605ed25f6e69eeea7574a534bd9eada2720` |
| human-scream-01.wav | `e68482bc410af7c2273a862cb8b2bb244a8f8d8186cd6795bb13992773561a23` |
| human-scream-02.wav | `595d519937963e52362dabb518f60ad8552e68aabd9e971af1e593f0d13b13f4` |
| body-impact-01.wav | `e83b3ea32350afb009adc297c8af3f4c0724889b9fb3b0638e238b7ac5fa1fdb` |
| body-thud-01.wav | `f36084cdbd9297bd850107e5d5e48763c4017feb70c4fdb3f56655aaf098f0cf` |

## Original firearm/footstep edits and verification

The original nine production files are mono, 48 kHz, signed 16-bit PCM WAV. Their conversion
uses FFmpeg's 35 Hz high-pass filter, downmixing and resampling, then linear
peak normalization and a short fade at the end. The transient and the real
recorded tail remain intact. No synthetic shot was substituted for a recording.
Shot peaks are at most 0.76 full-scale, footstep peaks at most 0.70, and handling
Foley peaks at most 0.65. The nine audio files total 474,522 bytes (about 464 KiB).
The game's mixer/limiter controls final playback level.

Unmodified source file SHA-256 hashes (for reproducible source identification):

| Original | SHA-256 |
| --- | --- |
| AR-15/D_24P.wav | `4c6a54ca0583150bbb32b7f658bc64da9ad9ba42fd3aca769c6120b44af8d3f0` |
| AR-15/D_32P.wav | `acee9d2106b68fe5956225a19d7aedf943d97793817f9bda9d486a2b74b0a812` |
| footstep_concrete_000.ogg | `d7267e183067757c92c169de2a379abea592cfca6b39bb2e8feea15221ad79fe` |
| footstep_concrete_001.ogg | `507a75eb19b897087855a3be3cf11a12d7fa37d143ad535eeebe0b8031c7325d` |
| footstep_concrete_002.ogg | `b21fa546d74941196b25da8a20b7010abd8c05c4fcf93545d1f344e66a664e13` |
| footstep_concrete_003.ogg | `8b513c2f0316324060b9174b8f28df6c2147418c506e6a53b77f18e149a5547b` |
| impact_metal_light_000.ogg | `33b5e6e37c6e9d54e07bf5a89b12c76e879f40c1ea83cdd82714df1d6f9fec6d` |
| impact_metal_medium_001.ogg | `e8a9eaba7c4d27422e4eeb3e6c7100d5d7dc0f83e005efc98c960adcc5265337` |

Production file SHA-256 hashes:

| File | SHA-256 |
| --- | --- |
| rifle-near-01.wav | `fe6a0e97e230939bed5768287e56b3c5ee8c8805045f48b7c0c823d8fd25441b` |
| rifle-near-02.wav | `4007ad35466f750decb2059ff19e6735c5164e2d934a0f265572bfee523cd203` |
| rifle-mid-01.wav | `7a576f31c67c85ed2cf11449033eb6bf800e1c5ac3b5a2b2c47e87eb60e8deb7` |
| concrete-step-01.wav | `d7ff6d8ff1d3f03d9dc13b1da9603a6946fd74e72674e3179ae84f901f61b4f7` |
| concrete-step-02.wav | `3b8b7517367419fdc9a08e69c9dbb8a15251e0259fced33f3f49e374d12225cb` |
| concrete-step-03.wav | `2a8c3f8a741d8569ed81d24759511fc63070c2a1f9252d2682bfaf431ea8f47c` |
| concrete-step-04.wav | `b46850da4a77aba921c6d9ab77427bcbe67ff0cbbdb1219e18399d68b0d8f4a2` |
| gear-metal-light.wav | `5a19fe1732272089d2c05877338949949f05f924638a372ed7c7fea1007f1006` |
| gear-metal-latch.wav | `6b2c126fc06323965b057243b626ae7df90438085c83dfd60d2f7092ee699c30` |

CC0 permits modification and redistribution, including commercial use. Credits
are retained here for provenance even though attribution is not required by CC0.
The original procedural ambient score remains original project code; this import
does not add borrowed music or generated speech.
