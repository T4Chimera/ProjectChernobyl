# Expanded prototype Studio acceptance

These checks have not been run in Roblox Studio by Codex. CLI compilation and
mocked logic tests do not establish engine readiness. Use a private test place.
Open Output before Play. If an error occurs, copy its complete message/stack and
the steps that caused it rather than disabling assertions or gameplay systems.

## Startup, world and flashlight

1. Open `build/ProjectChernobyl.rbxlx`, press Play (not Run), select a task force.
   Expect `[Main] Six-sector gameplay prototype initialized: six sectors, 8 unique bosses, weapon lights enabled.`
   There should be no red initialization errors.
2. Confirm you spawn at the western Foundation checkpoint, not the origin.
   Expect 100/100 HP, 30/240 ammunition, a rifle and a bright mounted beam.
   Look and aim up/down: the first-person beam must follow the weapon/camera.
   There is no flashlight-off control. Reset and confirm the same equipment.
3. In Play's Server Command Bar, paste `tests/studio-smoke.luau`, then
   `tests/studio-world.luau`. Expect both PASS messages. World checks examine
   server light state; a client hides its world beam locally when using the
   viewmodel, while other players still see that world light.
4. In the Client Command Bar, paste `tests/studio-client.luau` while alive,
   not aiming/crouching/executing, with the menu closed. Expect PASS.
5. Walk through all six sectors and their connections. Confirm no sealed route,
   intersecting floor, stuck door or spawn embedded in geometry. Inspect the
   intact/damaged/unfinished reactor areas. Every fixture must stay off.
6. Approach a control-room door and use its prompt. Open/close it from either
   side; do not get trapped. Mikoyan's room starts open. Approach each supply
   crate after shooting/reloading and confirm it restores 30/240 ammunition.

## Combat, movement and encounters

1. Shoot an ordinary infected. A valid hit removes 40 prototype HP; muzzle/tracer,
   optional red specks and hit confirmation appear. Walls block shots. Holding
   fire obeys cadence, consumes one round per accepted shot, and stops at zero.
   R reloads after two seconds; it cannot fire or add ammunition during reload.
2. Confirm infected approach around obstacles, attack only nearby visible
   targets, die and respawn after approximately 24 seconds. Test crates, doorways,
   corners, moving targets, and lost-target searches. Report navigation defects.
3. Test aim, sprint and crouch posture; check that reset restores normal camera
   and movement. Try touch and controller controls on their actual devices.
4. Observe each boss and exact red name tag/HP. Confirm Felon's HK416 behavior,
   silent faster/stronger Novak, and no invented Mikoyan/Nikolai dialogue.
5. Enter Mikoyan's room without firing: he must stay peaceful/seated. Shoot him
   while inside: only then should he retaliate. Leave the room: he must not
   pursue combat outside it. Test a second peaceful player entering afterward.
6. Observe Katya's black spawn hair, calm blonde hair, alerted black hair, and
   warning puddles. Warning time precedes server damage, then liquid expires.
   Lure her across sectors toward Sukhoi to test his configured Flee response;
   change `KatyaSukhoiResponse` to `Fight` in a separate test if desired.
7. Subtitles should trigger with distance/cooldown limits. No spoken audio is
   expected until real recordings are assigned. Novak stays silent, Sukhoi has
   no execution line, and proposed John/Jayden dialogue is disabled by default.

## Executions and recovery

Natural executions start only at 25 HP or less, nearby, with clear line of sight.
There are 2/3/3/2/2/2/2/4 variants for Felon/Sukhoi/Mikoyan/Nikolai/Novak/John/
Jayden/Katya. Procedural choreography is deliberately a prototype; inspect both
R6 and R15 player rigs. Bodies must stay intact; only limited abstract specks appear.

For deterministic previews, use the following **Server Command Bar** snippet in
Studio Play. It affects your test player's health and can kill that player at the
end. Change `bossId` and `variantIndex` for each variant. It is Studio-only; clients
cannot request an execution, and live servers ignore the optional variant index.

```lua
local bossId, variantIndex = "Felon", 1
local player = game.Players:GetPlayers()[1]
local services = game.ServerScriptService.Services
local enemy = require(services.EnemyService).GetBoss(bossId)
assert(player and player.Character and enemy, "Use an alive player and living boss.")
local character = player.Character
local humanoid = character:FindFirstChildOfClass("Humanoid")
local root = enemy.HumanoidRootPart
-- Pick a boss with clear ground around it; verify this position before running.
character:PivotTo(root.CFrame * CFrame.new(0, 0, -4))
humanoid.Health = 20
require(services.DamageService).RevokeImmunity(humanoid)
assert(require(services.ExecutionService).TryStart(enemy, player, bossId, variantIndex), "Execution rejected; check range/LOS/locks/ForceFields.")
```

1. Observe third-person staging without camera penetration through adjacent walls.
   Try another variant after respawn; lower HP/teleport only for deliberate tests.
2. During a sequence, kill the attacker **from the server** or have a second
   player shoot it. The victim should survive interruption, roots must unanchor,
   movement and first-person must return, and the attacker must stay defeated.
3. Reset/leave during staging. Respawn/join again. Check that no surviving player
   or NPC remains anchored or has stale `ExecutionActive`/`Executing` attributes.
4. Complete an execution and an ordinary death. Expect an intact-body third-person
   death camera followed by a new 100-HP first-person character with rifle/light.
5. Turn blood effects off and reduced motion on. Confirm settings affect only
   that client's presentation and do not disable the flashlight or server damage.

## Session and multiplayer

1. Defeat Felon (or set his Humanoid.Health to zero from the Server Command Bar).
   Wait at least 30 seconds, reset, change task force, and add a second client.
   He must never reappear in this server. `EnemyService.GetSessionState("Felon")`
   must remain `Defeated`; `GetBoss("Felon")` returns nil.
2. Restart the entire Play server. A new session should spawn all bosses again.
3. In Server & Clients mode with two clients, verify separate cameras/settings,
   replicated rifle flashlights/task-force patches, shared boss HP/defeat state,
   no player-to-player weapon damage, and independent ammo/reload/resupply state.
4. Repeat the execution rescue and disconnect checks with both clients. Confirm
   remote spam, impossible aim vectors, and invalid task-force names cannot create
   damage, ammunition, executions, or boss respawns (CLI negative tests cover the
   state rules; live networking still needs Studio validation).

## Asset review

Upload and authorize real recordings before checking audio playback. Replace
placeholder silhouettes only after supplying creator references. Test authored
AnimationTrack slots on the final rigs and tune procedural fallback timings after
visual review. The map, lighting, performance, choreography, audio permissions and
multiplayer acceptance remain pending until these checks actually run in Studio.
