# Browser adaptation integration

Static single-player Three.js browser game in web/, Vite build, base './' for
GitHub Pages repository subpath. Existing Roblox source stays intact. GitHub Pages
cannot execute Luau/server authority; present this clearly as browser prototype.
Root owns package/index/main/assets export/deployment/testing. Agents own modules
below. Export canonical config from Luau to web/src/canon.js as `export default`
JSON; canon keys Bosses, Voices, Executions, Map, Weapon, Enemies, Game.
Vector3 export arrays, CFrame export {position:[x,y,z]}, Color3 RGB0–1 arrays.
World scale is0.25 (multiply all Map spawn/center/room coords); browser y-up,
root player position y=0 (feet), eye height1.6. Canon bossHP/tags/dialogue unchanged.

## Files and ownership

World agent: web/src/world.js only. `export function createWorld(scene, canon)`
returns `{colliders:THREE.Box3[], occluders:Mesh[], sectors:[{id,name,center:Vector3,
size:Vector3}], spawn:Vector3, bossSpawns:{id:Vector3}, infectedSpawns:Vector3[],
mikoyanRoom:Box3, interactables:[{id,label,position:Vector3,kind,sector}],
update(dt,time), minimap:{bounds:{minX,maxX,minZ,maxZ},walls:[{x,z,w,d}]}}`.
Generate6darkreactorsectors atsame .25mapcoords, collisionwalls-with-openings,
walkable routes, control rooms, offlightfixtures, industrialprops, signs with
CanvasTextures (no fetchedimages). Root scene Fog+ambient setup, flash by main.
Interactables: IDs radio(checkpoint), supply-checkpoint and supply-1..6 (kind supply),
intake-logs(sector1), personnel-archive(sector1Mikoyanroom), turbine-valve(sector2),
grid-isolator(sector3), control-backup(sector3), containment-gauge(sector4),
research-case(sector4), crane-lock(sector5), transmitter(sector5), anomaly-sample
(sector6), uplink(sector6), extraction(checkpoint). Kinds terminal/valve/sample/
radio/extraction/supply. Operational texts must not invent definitive lore.

Gameplay agent: web/src/gameplay.js, optionalweb/src/actors.js. Exports
`createGameplay({scene,world,canon,onEvent})`, returns object `.state`, `.start(force,
mode='operative')`, `.update(dt,player)`, `.fire(origin,direction)`, `.reload()`,
`.interact(id)`, `.respawn()`, `.reset()`, `.dispose()`. `.state` includes hp100,
maxHp100,ammo30,reserve240,reloading,force,phase('briefing'|'playing'|'dead'|'won'),
bosses Map(id->{id,hp,maxHp,mesh,position,dead}), infected[],deadBosses Set,
execution null or{attacker:Group,variant:string,duration,elapsed,victim:Group},
playerPosition Vector3, kills. player passed into update `{position:Vector3,
direction:Vector3,moving:boolean,sprinting:boolean,crouching:boolean,mode:string}`.
events `{type:'subtitle',speaker,text,duration}`, `{type:'shot',origin,position,hit,
own:boolean}`, `{type:'blood',position}`, `{type:'hurt',amount}`, `{type:'boss-defeated',id}`,
`{type:'execution-start',variant}`, `{type:'execution-end'}`, `{type:'death'}`,
`{type:'interaction',id}`, `{type:'mission',...}` optional. Parent handles mission
logic separately by observing accepted interaction/boss/sector signals.
Gameplay creates blockyrigs, all8canonHP/bossnames, ordinary infectedrespawn,
LOS/headshotnoPvP, covercollision, roomonlyMikoyanprovokedwhenshotinside,
Felonvsinfected/Katyapuddles/hair/Sukhoiflee/friends, optionalexactdialogue;
use canoncategories, no proposedspeech. Executions usecanonvarianttimelines,
intactblockyvictim and distinct proceduralposes; state.execution allows parent
cinematiccamera. Player at25HPorbelow andnear only, no firstperson whileexec.
Client audio synthesized nonverbalSFX by parent; no inventedrecordings.
`mode='tour'` prevents player damage and helps exploration, keepscanonHP.
Respawn preserves deadBosses + missionprogress, reset clearsrun.
Fire obeysserverequivalentruleslocalstate. Worldcollisionhelpers internally or
Box3/XZ tests, no complexnavmesh dependency; bounded simplepatharoundwalls.

UI agent: web/src/ui.js, web/src/style.css only. `createUI({canon,onAction})`
returns `.update(view)`, `.event(event)`, `.showScreen(name)`, `.dispose()`.
Approot existing HTML `<div id="app"></div>`; canvasrendererparentmain.
Full highquality darkindustrial warning/briefing/title,4forces,mode choices,
settingsblood/reducedmotion/subtitles/sound, deploybutton; pausemenu/continue,
death+respawn/newrun, won summary; cinematic letterbox execution indicator.
onAction strings or object? Standard `onAction({type,value})` types start(value
{force,mode}),resume,pause,respawn,restart,settings(valuepatch),interact,reload,
fire-start/fire-stop,aim(valuebool),move(value{name,active}),look(value{dx,dy}).
Main passes `.update({state,stamina,maxStamina,mission:{index,total,title,text,
targetId,targetPosition,complete},sector,nearestInteraction,aiming,paused,locked,
fps,settings,player:{position,yaw},world})`.
UI minimap canvas drawssector/walls/missionpointer/playerorientation northup.
KeyboardMtogglemap optional parent handles; UI minmap alwaysvisibleHUD.
HUD health/ammo/stamina/objectivecompass/sector/lowammo/subtitles; pointerlock
desktop introcontrols; touchmove/look/firebuttons byonAction. Intro warning
contains horror, gunfire, flashingeffects, stylizedblood+reducedmotion option.
No intrusiveunnecessaryhealthclaims. Accessible buttons, responsive phone.

Root: main.js firstpersonmovementcollision+sprintstamina,camera/death/execution
thirdpersoncollisionray, weaponview/mandatoryflash, pointerlock/input, generated
WebAudio SFX, missionchain>=15 operationaltasks+extraction, build/Pages/test.
Agentmodules import Three via `import * as THREE from 'three'` and canon root
passesdata. Avoid circular imports. No frameworks required. Localenv Node24+
Chromium+pythonPlaywrightavailable. Npmtoolinstall parenthandles.

## Browser 0.3 additions

- World additionally returns `bossEncounters`: per-ID `{sector, prerequisites:
  string[], requiresBosses?:string[], activationDistance, leashRadius}`. Browser
  encounter positions may override the exported prototype spawn coordinates.
- NPC records expose `active` and `encounter`. Dormant bosses cannot move, speak,
  receive hits or damage the player. UI threat bars/music exclude dormant records;
  mission objective markers can still guide the player to their encounter area.
- Actor roots use feet y=0. `animateActor` accepts optional sixth argument
  `{speed,distance,heading}` for continuous, distance-driven locomotion.
- `weapon-view.js` and `atmosphere.js` own the first-person rifle and weather.
  Graphics quality is `high` or `balanced`; all plant fixtures remain unpowered.
- Audio adds `setMix({music,voice,effects})`, `setTension(0..1)`, `reload()`,
  `footstep(surface,sprinting)`, `dispose()` and `getDebugState()`. Music/voice
  settings are independent booleans. Speech remains browser/OS synthesis.

## Browser 0.4 additions

- Actors now use strict six-part R6 body geometry and classic joint metadata;
  animated elbow/knee/ankle body joints have been removed. Read
  `R6_IMPORT_GUIDE.md` for the bind transforms and character/map scale distinction.
  Feet remain the gameplay root; primary parts are available as `rig.primaryParts`.
- Audio speech synthesis is removed. `voice-manifest.js` maps exact approved text
  to stable recording IDs; missing entries mean subtitle-only playback.
  `sound-assets.js` points to licensed local recordings with documented sources.
- `shot({position,distance,indoor,own})`, `setListener(position,direction)` and
  `whenReady()` support spatial playback and decoded-sample verification.
  Debug state includes samplesLoaded/samplesFailed/sampleShots/fallbackShots,
  voiceMode='recorded-only' and recordedVoiceMode=true.
