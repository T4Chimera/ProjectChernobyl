# Play Project Chernobyl in a browser

GitHub Pages address: **https://t4chimera.github.io/ProjectChernobyl/**

This is the browser adaptation of the Roblox prototype. GitHub Pages hosts the
static single-player simulation; the original Luau project stays in `src/` for
Roblox Studio. It does not connect to a Roblox server or provide multiplayer.

## Game features

- Warning/briefing, four task forces, operative and damage-free recon modes.
- Six connected dark sectors with Reactors 1–4 and unfinished 5–6.
- Permanent weapon-mounted flashlight, movement, jumping, sprint stamina,
  crouch posture, aiming, firing, reloading, and supply crates.
- Eight canonical bosses, regular infected that respawn, and unique bosses that
  remain defeated through player redeployment within that run.
- Ordinary infected introduce the intake route. Hostile bosses remain dormant
  until the corresponding field objectives and previous encounters are complete;
  approach their isolated sector to activate them. They cannot chase to insertion.
- Weathered brick/concrete/metal surfaces, wet ground, rain, industrial entrance,
  tactical transport, staging equipment, and sky/flashlight shadows.
- Layered tactical armor, helmets/NVG, masks, gloves and pouches. Characters use
  planted-foot walking, articulated knees/elbows, idle breathing and rifle grips.
- Twenty intact-body execution variants with third-person staging/cameras;
  ordinary death also uses third-person, returning to first-person after redeploy.
- Overwatch guides a 22-step mission chain ending in extraction. Mikoyan can be
  left peaceful and does not have to be killed to complete the operation.
- Minimap, objective marker, health/ammunition/stamina, boss indicators,
  subtitles, sound/blood/reduced-motion settings, and touch controls.
- Original procedural eerie humming/drone score, weather and mechanical sounds,
  footsteps, weapon/reload effects, and individually profiled speech. Dialogue
  uses installed browser/OS voices where available; actor recordings are pending.
- Independent music and voice toggles, plus High/Balanced graphics settings.
  Balanced reduces rain and shadows for less powerful devices.

Boss HP, exact names, voice text, and execution timeline data are exported from
the existing Luau modules into `web/src/canon.js`. A full new run resets bosses
and objectives; player redeployment preserves completed objectives and boss defeats.
Progress is memory-only and resets on a full page reload.

## Controls

WASD move; mouse look; Space jump; Shift sprint; C crouch; Mouse1 fire; RMB aim;
R reload; E interact; Escape or M pause. Deploy/Resume captures the mouse on
desktop. Mobile has move/look/action controls. Browser WebGL2 is required.

## GitHub Pages deployment

The repository includes two supported publication paths:

1. **GitHub Actions:** `.github/workflows/deploy-pages.yml` tests/builds `web/`
   and deploys its artifact on pushes to `main`. Pages requires one-time
   administrative activation: open repository **Settings > Pages > Build and
   deployment > Source**, choose **GitHub Actions**, then rerun the deployment
   workflow. GitHub's default workflow token can deploy an enabled site; it
   cannot enable a new Pages site. An authorized administrator can also perform
   this activation through GitHub's Pages API.
2. **Branch deployment:** the committed `docs/` contains the production build.
   In **Settings > Pages**, choose **Deploy from a branch**, branch `main`,
   folder `/docs`, then Save. The root `index.html` also redirects to this build
   for an existing `main` `/root` Pages configuration.

The address above becomes playable only after GitHub completes an enabled Pages
deployment. A Git commit or successful local build alone does not establish that
the public URL is live. Private repository plan/Pages restrictions, if any, are
controlled by GitHub; do not change repository visibility to work around them.

## Local development and checks

Use Node 24 (or >=22.12), then from the repository root:

```sh
npm ci --prefix web
npm test --prefix web
npm run dev --prefix web
```

To refresh the committed Pages distribution after edits:

```sh
python3 tools/build-web-pages.py
```

The generator protects an unknown existing `docs/` directory. To re-export
canonical shared data, first install Luau 0.659 and run
`python3 tools/export-web-canon.py`; commit the generated canon file so CI does
not need a Roblox/Luau installation.

The test-only `?test` URL enables local inspection hooks for automated browser
testing. These are absent from normal play. The static game has no server-side
anti-cheat boundary; local state is a simulation, not production multiplayer.
