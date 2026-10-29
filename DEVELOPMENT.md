# Development record

## 2026-10-29 — Execution review, intro, sprinting and rendering

- Authored 20 distinct continuous paired R6 performances with root/joint motion,
  grabs, anticipation, readable holds, weapon handling and follow-through. The
  canonical variant IDs/source data remain; prototype durations now allow the
  requested two-second holds. Bodies stay intact with staged camera cutaways.
- Integrated the same clips into gameplay with local collision-safe staging,
  once-only sound/blood cues, third-person focus and final victim poses retained
  until redeployment. Ordinary melee remains available in cramped passages.
- Added an orbitable baseplate Execution Lab to briefing/pause menus and an
  independent single-file HTML viewer with play/pause/replay, time seeking,
  quarter/half speed, looping, embedded recordings and asset credits. The build
  emits web/dist/execution-viewer.html and build/ExecutionViewer.html (~2.15 MiB).
- Visual review caught weapon/appendage bounds lifting fallen bodies. Separated
  humanoid support, equipment floor handling and quaternion body rolls; all 20
  final torso heights now measure 0.472–0.495 m. Added floor/rest/grip regression
  checks and kept caller-owned name-tag visibility.
- Added a credited local SCP emblem, initial black-screen ident with heartbeat
  and low music, Skip/reduced-motion support, and a covered deployment fade.
  The first click enables browser audio. No automatic TTS was reintroduced.
- Increased rifle attack loudness by a measured 9.1 dB versus the previous mix,
  with ambient ducking and output peak control. Real Chromium OfflineAudioContext
  checks measured peaks below full scale for rapid and overlapping shot trains.
- Added three licensed Wildfire Games nonverbal human performances plus two
  Kenney impact recordings, with pinned provenance/license/modification records.
  Character dialogue recordings remain pending. Contact blood is bounded and
  short-lived; no severed parts, exposed wounds or detailed injury effects.
- Visible sprint strides, foot clearance, torso counterrotation and ground
  planting now follow actual local movement; infected use an uneven hunched gait
  and their chase animation. R6's six rigid body parts and grip contacts remain.
- High graphics now use bounded contact AO/FXAA/grading plus soft depth-tested
  flashlight moisture scattering. Improved damp surfaces, pitched cloth shelter,
  sandbags, barriers and puddles; facility fixtures remain off. Fixed incompatible
  indexed/nonindexed first-person weapon batches discovered by console checks.
- Validation: all 51 browser/actual-Three tests and production build pass; all
  36 preserved Luau CLI tests and Rojo build pass. Standalone artifact bytes render
  in Chromium with all 20/eight-boss variants, grounded intact bodies, 14 decoded
  recordings, functional controls and zero runtime errors/external requests.
  Managed Chromium blocks file:// navigation, so this check loads the exact HTML
  bytes directly. The artifact embeds all required assets. Studio engine and
  final uploaded Roblox animation-asset acceptance remain pending.
- Integrated Chromium checks pass for the SCP intro, visible sprint legs, actual
  recorded firing, radio/mission progression, isolated boss activation, execution,
  death/respawn, retained progress and 390px layout. High AO/grade/FXAA renders
  with zero console/runtime errors; real pause-menu Lab access/return also pass.
- Published release `f0abcb9`; Pages run `40921958003` built and deployed
  successfully. Public game chunks, emblem and execution-viewer.html return HTTP
  200. The public HTML viewer matches the tested 2,258,004-byte local artifact
  byte-for-byte. Chromium verifies public viewer selectors/seeking and game
  intro/deployment, all 14 decoded samples, the increased gun mix, no hostile
  bosses at insertion and zero runtime errors. Play/view:
  https://t4chimera.github.io/ProjectChernobyl/?v=0.5.0 and
  https://t4chimera.github.io/ProjectChernobyl/execution-viewer.html

## 2026-10-29 — R6 reference models and recorded audio

- Replaced the browser's segmented limbs with six rigid R6 primary parts,
  classic shoulder/hip/neck/root anchors, joint bind metadata and a nonrendering
  HumanoidRootPart reference. Accessories remain attached to the body parts.
  Walking keeps rigid soles grounded; both hands meet the carried rifle grips.
- Used the supplied operative references for rounded helmets, raised dual NVG,
  goggles, balaclavas, headset microphones, layered armor, MOLLE/pouches and
  straps. Added woven/camouflage surfaces and worn metal; raised the standing
  camera to the R6 eye line. Preserved canonical boss distinctions and poses.
- Corrected masonry scale and added material cracks/pores/grain/wear, facade
  conduits/grime, manufactured equipment detail and cable trays. Fixed rain
  shelter bounds and solid shadows cast by formerly transparent decals.
- Added three real CC0 Still North Media rifle recordings, four Kenney concrete
  footsteps and two metal Foley clips. Files ship locally (474,522 bytes total)
  with pinned source/production hashes and license text. Handling Foley is not
  presented as a recording of a particular rifle's reload mechanism.
- Audio now caches decoded clips with bounded concurrency/transients, distance
  filtering/panning and shared indoor reflections. Removed automatic TTS.
  Missing human clips retain subtitles. Added 56 exact recording slots, CSV
  script, upload guide and character/radio processing for supplied voices.
- Added R6_IMPORT_GUIDE.md for the existing Studio R6 rig/joints and real Roblox
  audio upload handoff. Separated Three.js into a stable cached production chunk.
- Validation: 31 browser tests pass, covering strict R6 structure/ground contact,
  grips, real sample playback/cache/disposal, recorded-only dialogue and existing
  combat/mission/encounter rules. Chromium verifies actual-input recorded firing,
  all nine clips decoding, no TTS, mission activation, third-person execution,
  respawn and 390px layout with zero runtime errors. All 36 existing Luau CLI
  tests and the Rojo build pass; Studio engine acceptance remains pending.
- Published release `0784461`; Pages run `40864629680` built and deployed
  successfully. The public index, split engine/game chunks, rifle WAV files and
  56-row CSV return HTTP 200. Chromium rendered the public responses, verified
  the six R6 primary parts, decoded all nine samples without failures, played
  recorded gunfire from real input, and reported zero TTS/runtime errors. No
  hostile bosses are active at insertion. Play:
  https://t4chimera.github.io/ProjectChernobyl/?v=0.4.0

## 2026-10-29 — Browser visual, movement, audio and encounter upgrade

- Rebuilt tactical figures with segmented elbows/knees/ankles, layered armor,
  masks, helmet optics, pouches, gloves and proportionate carried rifles. Leg IK
  plants stance feet; arm IK aligns both hands to the rifle. Idle breathing and
  smooth collision-swept locomotion use actual movement instead of AI tick jumps.
- Added weathered albedo/normal/roughness surfaces, a tall industrial entrance,
  detailed transport/staging equipment, wet ground, rain, moisture and sky
  reflections. Facility fixtures stay off; the permanent weapon light remains.
- Rebuilt the first-person rifle/hands/reload presentation and added visible
  operator legs when looking down and an idle Foundation checkpoint guard.
- Added an original procedural humming/drone score, weather/harmonic layers,
  bounded audio graphs, footsteps and weapon handling effects. Improved installed
  system voice selection, character profiles and dialogue scheduling; exact
  canonical text remains unchanged. These are not recorded actor performances.
- Added circular radar, compact Overwatch orders, restrained vitals/subtitles,
  mobile layout corrections, independent music/voice and High/Balanced settings.
- Moved Felon deeper into intake and John into control. All hostile bosses now
  wait for local field work, prior required defeats, sector entry and approach;
  they stay tethered to their encounter hall. Regular infected introduce intake.
  Mikoyan remains peaceful unless shot from his room. Defeats persist on redeploy.
- Validation: all 27 browser logic/real-Three tests and the production build pass.
  Chromium verifies intro/deploy, real movement/stamina, running ambient audio,
  actual radio/objective interaction, staged boss discovery, third-person
  execution/death/redeployment, retained progress and 390px layout; no runtime
  errors. Closed the desktop WebGL context before mobile screenshots to prevent
  competing software renderers from stalling capture.
- All 36 existing Luau CLI tests pass and Rojo builds the preserved Studio
  project. This does not claim Roblox Studio engine testing or final art/acting.
- Published release `5e78993`; Pages workflow `40860917907` built and deployed
  successfully. Public index and new JS/CSS return HTTP 200. Chromium rendered
  those live responses and entered play with 12 ordinary infected, no active
  hostile bosses at insertion, a grounded guard and running ambient music.
  Public music mute preserves voice/effects; pause/resume and zero runtime errors
  are verified. Play: https://t4chimera.github.io/ProjectChernobyl/?v=0.3.0

## 2026-10-28 — Public Pages deployment verified

- Repository is public and Pages is enabled with the GitHub Actions source.
- Dispatched deployment run `40774124766`; build and deploy both succeeded.
- Verified `https://t4chimera.github.io/ProjectChernobyl/` and its JavaScript/CSS
  assets return HTTP 200.
- Opened the actual public site in Chromium: the game intro and Deploy button
  loaded without JavaScript runtime errors. The previous hosting 404 is resolved.

## 2026-10-28 — Diagnose Pages 404

- Confirmed all game code and production assets are on GitHub `main`.
- Found an invalid initial-hosting assumption: `configure-pages@v5` cannot
  enable a new site using the default `GITHUB_TOKEN`. Removed `enablement: true`
  and added explicit workflow failure guidance for one-time Pages activation.
- The game and its relative asset paths already pass local production checks;
  the root 404 is a hosting issue, not a missing built game entry point.
- Direct Pages administration remains blocked: the environment proxy rejects
  `https://api.github.com/repos/T4Chimera/ProjectChernobyl/pages` before an API
  response. The allowed-domain additions are saved in the environment draft
  but are not applied to the running environment. No new token is requested;
  existing injected authentication must be tested after network access works.
- Public hosting activation/deployment remains unverified. Do not change the
  repository's visibility or claim the public play address is live.

## 2026-10-28 — Browser adaptation and GitHub Pages

- Added an asset-free Three.js browser simulation with the six-sector facility,
  articulated blocky figures, weapon flashlight, combat, ordinary infected,
  all eight canonical bosses, and 20 intact-body execution timelines.
- Exported canonical HP, names, dialogue, map coordinates and prototype tuning
  directly from the evaluated Luau modules; Roblox source remains intact.
- Added warning/briefing, force selection, damage-free recon option, Overwatch's
  22 operational objectives and extraction, minimap, sprint stamina, supplies,
  subtitles, synthesized placeholder audio, and mouse/touch controls.
- Boss defeats and objective progress survive player redeployment within a run;
  regular infected return. A full new run or page reload resets the session.
- Fixed test fixture sector IDs, sandbox-compatible Node test execution, duplicate
  death model, recoil/crosshair hit alignment, mirrored signs, crouch reset, and
  repeated actor GPU cleanup. Added range/LOS interaction and respawn regression tests.
- Twelve browser logic/actual-Three tests pass; Vite production build passes.
  Initial Chromium checks show no runtime errors, valid deployment/first-person
  controls, real movement and sprint stamina. Full smoke script is
  `tools/browser-smoke.py`; browser checks do not imply Roblox Studio acceptance.
- Added a GitHub Actions Pages deployment, committed `/docs` distribution and
  root redirect for branch-based Pages hosting. Remote publication and public
  deployment status must be verified separately from this local record.

The browser is single-player static hosting, not a Roblox runtime or a multiplayer
server. Spoken audio uses browser speech when available; actor recordings and
final models/animation assets are still absent. See `WEB_README.md`.

## 2026-10-28 — Six-sector gameplay prototype

The creator approved expansion beyond the first milestone. The original brief is
unchanged; `EXPANSION_BRIEF.md` records the new scope and non-graphic adaptations.
All implementation in this entry is prototype code, not a claim of Studio acceptance.

Implemented:

- Six connected generated sectors, Reactor 1–4 structures, damaged Reactor 4,
  unfinished Reactor 5–6 construction, industrial rooms/doors, seven supply crates,
  and a Foundation checkpoint. All 25 fixture lights are off.
- First-person procedural rifle with a permanently enabled mounted flashlight;
  replicated world rifle/light, aim/recoil/reload/movement presentation, server
  hitscan, finite direction/cadence/ammunition checks, and trusted resupply.
- Four task-force selections with replicated placeholder patches, shared temporary
  loadout, sprint and crouch posture. Final uniforms/abilities remain unassigned.
- Server-only health/damage/healing/immunity, 100 max HP, intact bodies on death,
  and checkpoint correction for players who spawned before map generation.
- Ordinary infected, all eight exact canonical bosses, server-owned R6 stand-ins,
  vision/hearing/search, body-obstacle/stuck-path fallback, bounded pathfinding,
  melee/ranged attacks, death cleanup, and ordinary-infected respawns.
- Unique boss registry whose lifetime is independent of players; no unique boss
  respawns after defeat in that server. `workspace.BossesDefeated` tracks the count.
- Mikoyan's peaceful sitting and room-only retaliation, Felon's hostility toward
  infected, partner recognition, Katya hair states/puddle warnings and damage,
  and configurable Sukhoi flee/fight behavior. Katya's prototype tether allows
  players to lure her between sectors without omniscient targeting.
- Exact dialogue categories and subtitles, per-speaker cooldowns, empty recording
  slots, and optional spatial recorded audio/radio filtering. Proposed John/Jayden
  dialogue remains off. Novak is silent; Mikoyan/Sukhoi restrictions are preserved.
- Character-specific procedural idle/walk/combat/hit/death/sitting/appendage/mask
  motion and optional uploaded Animator slots. All 20 requested execution variants
  have intact-body timeline adaptations.
- Server-validated low-health executions, staged poses, third-person wall-checked
  camera, interruption/rescue, error/death/leave/respawn lock cleanup, and a
  Studio-only deterministic variant preview selector.
- HUD health/ammo/boss/sector/subtitles/menu, blood/reduced-motion settings,
  mouse/touch/gamepad action bindings, bounded local shot/blood effects.
- Updated Rojo mappings, Windows guide, Studio smoke scripts and full engine
  acceptance checklist.

Validation completed in the cloud:

- **36 tests passed** using actual Luau module source with narrow explicit API
  doubles: 13 foundation, 17 expanded rules/configuration, 6 execution lifecycle.
- Negative cases include malformed damage inputs, reload timing/conservation,
  rate limits, invalid registry states, one-way boss defeat, execution distance,
  health/LOS/ForceField/lock gates, interruption/leave/removal, staging failure,
  delayed lethal completion, and full anchor/movement/immunity/camera cleanup.
- Map configuration checks confirm six unique sectors/reactors, valid fixed boss
  spawns, Mikoyan's room bounds, and unfinished 5/6 status.
- All production/test Luau files compile with Luau 0.659; Rojo 7.5.1 builds the
  generated place. The build packages scripts; the map is created at runtime.
- Full original design text remains preserved byte-for-byte from the upload.

## Remaining acceptance and limitations

Roblox Studio is unavailable in this Linux environment. Engine initialization,
actual spawning and avatar loading, map geometry/navigation, flashlight rendering,
camera clipping, performance, execution choreography, and multiplayer replication
have **not** been tested in Studio. Run `STUDIO_TESTING.md` and report Output errors.

Audio recordings, environmental soundscapes, final character/model references,
authored rig-specific animations and lip sync are not supplied. All SoundId and
AnimationId slots are empty. Runtime procedural animations are placeholders with
character distinctions, not final cinematic acting. No asset identifiers were invented.

The layout is fictionalized. R6 NPC stand-ins, player weapon/loadouts, movement,
damage, ranges, reload values, health regeneration and respawn timing are temporary.
Crouch lowers the camera/slows movement without reducing the collision capsule.
No final keycard system, attachments, cross-server persistence, complete lore
collection system, infection progression, mission campaign, or full final art is
claimed. The unidentified body/letter and disputed backstories stay unresolved.

Bodies remain intact. Requested dismemberment/detailed injury references became
short staged takedowns with cutaways and limited stylized specks. Final animation
timing, contact alignment, and custom rig compatibility need visual Studio review.

## Next work

First run the Studio checklist, fix observed engine issues, and tune map traversal,
lighting and encounters with creator feedback. Then replace approved placeholders
with supplied visual references, uploaded recordings and animation assets.
See original Part 23 for unresolved canon/design decisions; this implementation
does not silently finalize them.

## Earlier milestone — Phase 1 foundation

Created Rojo layout, complete preserved brief, mandatory rules, canonical registry,
100-HP player initialization, server health API, first-person camera and a test
platform. Thirteen initial logic tests and the CLI build passed. The subsequent
creator request authorized replacing that small platform with the six-sector
prototype above. The old Phase-1-only restriction is superseded.
