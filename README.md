# Project Chernobyl

**Browser game:** [GitHub Pages play address](https://t4chimera.github.io/ProjectChernobyl/).
**Execution review:** [Open all 20 animations](https://t4chimera.github.io/ProjectChernobyl/execution-viewer.html).
The standalone HTML viewer can be saved and opened offline; local builds write
`build/ExecutionViewer.html`.
See [WEB_README.md](WEB_README.md) for browser controls, local development, and
Pages activation if the repository has not enabled hosting yet. The browser
edition includes Overwatch's 22-step mission chain, a minimap, stamina,
third-person executions, detailed tactical R6 figures with grounded walking,
weathered industrial scenery, recorded firearm sounds and an eerie ambient score. Ordinary
infected appear first; bosses unlock in isolated sectors as field work progresses.
The Roblox Studio project below is preserved alongside it.

For the next Studio asset pass, see the [R6 handoff](R6_IMPORT_GUIDE.md) and
[voice recording guide](VOICE_RECORDING_GUIDE.md). Browser dialogue now uses
supplied human recordings; missing clips retain subtitles without TTS.

A playable **development prototype** built from the creator's [game design](GAME_DESIGN.md)
and [expanded request](EXPANSION_BRIEF.md). It uses asset-free industrial geometry,
placeholder character rigs, and procedural animations. Final modeling and recorded
audio remain to be supplied; Roblox Studio engine testing is still pending.

## Open the game

Download `build/ProjectChernobyl.rbxlx` and open it in Windows Roblox Studio using
**File > Open from File**, then press **Play (F5)**. Use Play rather than Run to
spawn a player. The server generates the facility and NPCs during startup.
No plugins, credentials, external models, or HTTP requests are needed to play the
generated place. A source ZIP includes the code and this guide.

You start at the Foundation checkpoint with 100 HP, a prototype rifle, and an
**always-on weapon-mounted flashlight**. Select Nu-7, Epsilon-11, Beta-7, or Zeta-9.
Task forces currently use a shared provisional loadout and labeled patches;
these are not final uniforms or abilities. The menu does not pause multiplayer.

## Controls

| Action | Mouse / keyboard | Gamepad |
| --- | --- | --- |
| Move / look / jump | WASD / mouse / Space | Roblox native controls |
| Fire | Hold Mouse1 | Right trigger |
| Aim | Hold RMB | Left trigger |
| Reload | R | X |
| Sprint | Hold Left Shift | Press left stick |
| Crouch posture | C | B |
| Task force / settings | M or HUD button | Select |
| Door / resupply | Roblox interaction prompt (normally E) | Prompt button |

Touch buttons are created for combat and movement. Crouch changes speed and
camera posture; it does not yet implement a smaller collision capsule.
The settings menu offers subtitles, reduced camera motion, and blood-effect
toggles. The flashlight has no off switch, battery, or extra item requirement.

## Six sectors

| Sector | Reactor area | Prototype encounters |
| --- | --- | --- |
| 1 | Reactor 1 / intake and personnel room | Felon; peaceful Mikoyan |
| 2 | Reactor 2 / turbine hall | Nikolai; Novak |
| 3 | Reactor 3 / control | John |
| 4 | Reactor 4 / damaged incident zone | Sukhoi |
| 5 | Unfinished Reactor 5 construction | Jayden |
| 6 | Unfinished Reactor 6 construction | Katya |

This is a fictionalized layout, not a survey of the real plant. Reactors 5–6 are
unfinished construction areas. Walkways connect all sectors; industrial halls,
control rooms, manually operated doors, reactor structures, and construction
frames distinguish them. All 25 facility light objects are disabled. Low ambient
night light preserves silhouettes while weapon flashlights illuminate navigation.
The seven supply crates (checkpoint plus each sector) refill ammunition.

The map is generated in Play, so the source-built place initially has no
facility in the edit viewport. To inspect the map **before Play**, run this in
Studio's edit-mode Command Bar:

```lua
require(game.ServerScriptService.Services.MapService).Build()
```

For playtesting afterward, remove that generated `Workspace.ChernobylMap` in edit
mode first; runtime generation deliberately rejects an existing same-named map
rather than overwrite unknown work. Back up any manual edits before removal.
The generated map's internal door connections are runtime state and must be
created again by the generator.

## Combat and character behavior

- The server owns raycasts from the character's head, firing cadence, ammunition,
  reload timing, damage, task-force selection, movement mode, hazards, and executions.
  Clients send aim direction, never damage values, hit targets, or shot origins.
- The shared rifle deals prototype damage only to enemies; player damage is
  cooperative for this prototype. Reloading conserves ammunition and supplies
  are checked for range and rate on the server.
- All eight bosses have their exact canonical HP, classifications, and red name
  tags. Defeat persists for the **current server session** through deaths,
  respawns, new players, and task-force changes. A new server resets encounters.
- Ordinary infected chase, strike, die, and respawn after a provisional 24 seconds.
  AI uses line-of-sight, footsteps/gunfire investigation, last-known positions,
  home bounds, and throttled pathfinding.
- Felon uses his HK416 and can attack ordinary infected. Sukhoi uses his axe
  and animated appendages/mask. Nikolai and Novak recognize one another; Novak is
  faster and stronger, with no speech. John and Jayden recognize their partnership.
- Mikoyan sits peacefully. Walking into his room does not provoke him.
  A server-confirmed shot while the shooter is inside his room provokes him;
  his combat stays within that room. His letter and the unidentified body are
  visibly labeled placeholders without invented identities or letter contents.
- Katya has black hair on spawn, blonde hair when calm, and black hair when
  alerted. Her puddles warn before damaging, then expire. Her larger prototype
  roaming bound allows players to lure her toward Sukhoi; their interaction
  supports his configurable flee/fight response without omniscient detection.
- All named characters have procedural idle/movement/combat/hit/death poses and
  **20 total execution variants**: Felon 2, Sukhoi 3, Mikoyan 3, Nikolai 2,
  Novak 2, John 2, Jayden 2, Katya 4. These adapt the requested choreography into
  intact-body staged strikes, grabs, knockdowns, and cutaways. Blood consists of
  short abstract specks; no severing, exposed wounds, or detached body parts.
- Executions require a living nearby victim at 25 HP or below and clear line of
  sight. The server locks participants during staging. Killing the attacker can
  interrupt the sequence and save the victim. Death, leave, respawn, and errors
  release locks, movement, immunity, and the cinematic camera.
- Normal play is first-person. Death and execution use a third-person camera
  with wall raycasts, then return to first-person on respawn.

All unconfirmed combat tuning is clearly provisional in configuration modules.
Default Roblox health regeneration and five-second respawning remain enabled.

## Voice recordings and animation assets

Exact approved dialogue already triggers as nearby subtitles with per-character
cooldowns. **No spoken recordings are included.** Novak remains silent; Mikoyan
has only "Leave me ALONE."; Sukhoi has no execution dialogue. John/Jayden's
proposed lines remain disabled until creator approval (`AllowProposed`).

To add a licensed recording, upload it to Roblox, grant this experience access,
and provide its real ID as the fourth argument to the corresponding `line`
entry in `VoiceLineConfig.luau`: `line(text, duration, cue, soundId)`.
The sound ID must use `rbxassetid://` followed by the actual uploaded numeric ID.
The system provides 3D rolloff, radio equalization, distortion, volume limits,
cooldowns, and cleanup. Empty slots continue to display subtitles without sound.

`WeaponConfig.SoundIds` has empty firearm/reload/footstep slots.
`AnimationConfig.Assets` has empty pose slots per character. Uploaded animations
can replace the procedural fallback through Animator/AnimationTracks. Final
rig-specific authored animations, lip sync, voice performances, environmental
soundscapes, and creator-reference models are **not** claimed as finished.

## Develop with Rojo on Windows

1. Download Rojo **7.5.1** from its [official release](https://github.com/rojo-rbx/rojo/releases/tag/v7.5.1).
   Extract the Windows executable and add its directory to PATH; check
   `rojo --version` in a new PowerShell window.
2. Open PowerShell in the repository folder containing `default.project.json`.
   With Studio closed, `rojo plugin install` installs the matching plugin.
   It replaces an existing Rojo plugin, so preserve another version if needed.
3. Build and open the place:
   ```powershell
   New-Item -ItemType Directory -Force build | Out-Null
   rojo build default.project.json --output build/ProjectChernobyl.rbxlx
   ```
4. For live editing, run `rojo serve default.project.json` on the **same Windows
   machine as Studio**. In Studio's Rojo plugin, connect on port 34872 and review
   synchronization changes. Use a separate test place; stop Play before syncing
   structural changes.
5. Play and follow [STUDIO_TESTING.md](STUDIO_TESTING.md).

There is no direct Studio connection in this Linux cloud environment. Its loopback
server cannot reach Studio on your PC. No public web preview is needed.

## Script placement

Rojo maps the whole source folders into these Roblox services:

| Source | Studio location and script type |
| --- | --- |
| `src/ReplicatedStorage/Shared/*.luau` | `ReplicatedStorage.Shared`, ModuleScripts |
| `src/ServerScriptService/Main.server.luau` | `ServerScriptService.Main`, Script |
| `src/ServerScriptService/Services/*.luau` | `ServerScriptService.Services`, ModuleScripts |
| `src/StarterPlayer/StarterPlayerScripts/ClientMain.client.luau` | `StarterPlayer.StarterPlayerScripts.ClientMain`, LocalScript |
| Other files in `StarterPlayerScripts` | CameraController, HUDController, WeaponView ModuleScripts |

Main creates the Remotes folder/events, then starts the map, presentation,
players, weapons, and enemies. No remote objects need manual insertion.
The client camera ModuleScript replaces the old Phase 1 camera LocalScript;
remove the old LocalScript if manually upgrading an existing place.
Keep native Roblox player controls and Animate. Tests stay outside the Rojo tree.

## Validation

With Python 3, [Luau 0.659](https://github.com/luau-lang/luau/releases/tag/0.659),
and Rojo 7.5.1 installed, run from the repository root:

```sh
python3 tools/test.py
mkdir -p build
rojo build default.project.json --output build/ProjectChernobyl.rbxlx
```

Set `LUAU_BIN` if Luau is not on PATH. In the prepared cloud, tools are under
`/workspace/.tools/luau-0.659/` and `/workspace/.tools/rojo-7.5.1/`.
There are no npm or Wally dependencies. Tests execute actual modules with narrow
API doubles; they cannot establish Roblox rendering, physics, navigation,
recorded asset permissions, or replication. See the development record for
completed checks and the Studio checklist for remaining acceptance.
