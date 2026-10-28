# Project Chernobyl development rules

Read `GAME_DESIGN.md` before changing gameplay or narrative. It is the creator's
complete specification; this file summarizes the mandatory rules.

- The creator has approved expansion beyond Phase 1: build a playable prototype
  with six sectors/reactors, lights off, mandatory weapon flashlights, combat,
  all boss behavior, dialogue support, and procedural execution variants.
  Work incrementally within that authorized scope; final assets remain pending.
- The creator also authorizes a browser adaptation in `web/`, GitHub repository
  publication, and GitHub Pages deployment. Preserve Roblox source alongside it.
  The browser version is a static, single-player simulation with an authoritative
  local game state; GitHub Pages cannot host Roblox or a multiplayer game server.
  Include warning/briefing, Overwatch missions, minimap, stamina, regular infected
  respawns, persistent boss defeats within a run, and third-person executions.
- Preserve established lore, identities, appearances, affiliations, dialogue,
  relationships, boss HP, and exact name tags (including punctuation). All boss
  name tags are red. Do not invent canonical dialogue or asset IDs.
- Unique bosses stay defeated for the current server session; ordinary infected
  respawn. Future boss state must belong to the server, never a player's lifecycle.
  Cross-server persistence is unconfirmed.
- Mikoyan is peaceful unless shot by a player in his room. Entry alone must not
  trigger combat. Novak has no dialogue.
- John/Jayden's proposed material remains a proposal. Keep the Alisa/Katya
  discrepancy, Nikolai's original affiliation, and other unknowns unresolved.
- S.T.O references are visual only. Do not merge fictional universes or invent
  final task-force models, loadouts, or abilities.
- Normal living gameplay is first-person. Third-person death/execution cameras
  are authorized. Execution variants must keep bodies intact: use staged hits,
  knockdowns, cutaways, and limited stylized blood instead of dismemberment,
  exposed wounds, or detailed head/neck injury.
- The server owns player health (100 max HP), damage, future ammunition,
  weapon validation, task-force choice, NPCs, and hazards. Never accept damage
  values or authoritative gameplay state from clients.
- Use real Roblox APIs, modular Luau, centralized configuration, bounded waits,
  useful diagnostics, and connection cleanup. Avoid per-frame server polling.
- Label prototype values and assets clearly; major unresolved design choices
  need creator input. Do not replace detailed modeling with claimed final assets.
- Keep horror stylized and platform-appropriate, without graphic injuries.
- Preserve user changes. Use the existing isolated checkout; do not create a Git
  worktree unless explicitly requested.
- Update `DEVELOPMENT.md` with completed work, validation, bugs, and open questions.
  Never claim Studio testing unless Studio was actually used. CLI builds and
  mocked tests cannot establish camera/physics/multiplayer behavior in Studio.
- Keep `default.project.json`, import instructions, and `tests/studio-smoke.luau`
  aligned with code. Run relevant tests and the Rojo build before handing off.
