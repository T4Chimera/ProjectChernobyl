# Review the execution animations

Open [the standalone viewer](https://t4chimera.github.io/ProjectChernobyl/execution-viewer.html),
or save that page as **ExecutionViewer.html** and open it in a current desktop
browser. A local production build writes `build/ExecutionViewer.html` directly.
The single HTML file contains the models, textures, animations, sounds and credits.

1. Press **OPEN EXECUTION VIEWER** to enable sound.
2. Choose a boss and animation. Drag across the stage to orbit; scroll to zoom.
3. Use **PAUSE**, **REPLAY**, the timeline, 0.25×/0.5× speed, or **LOOP** to review it.
   Seeking pauses animation and sound. Space toggles playback.

| Boss | Variants |
| --- | ---: |
| Felon | 2 |
| Sukhoi | 3 |
| Mikoyan | 3 |
| Nikolai | 2 |
| Novak | 2 |
| John | 2 |
| Jayden | 2 |
| Katya | 4 |

The **EXECUTION LAB** button in the game's briefing or pause screen opens the
same baseplate and animation library. Gameplay uses the same paired choreography,
with local collision checks, third-person cameras and persistent final poses.
Bodies remain intact. Blood is a restrained contact effect. Licensed nonverbal
cries, impacts and gunshots play at the animation contacts; named character voice
lines still await the creator's recordings.

Timings are prototype values and several sequences have been lengthened to make
anticipation, holds, contact and recovery readable. Canonical variant IDs and
source dialogue remain unchanged. The HTML is a browser review artifact; the
later Roblox Studio version should use the R6 part/joint and pose data described
in [R6_IMPORT_GUIDE.md](R6_IMPORT_GUIDE.md).

The source is `web/src/execution-choreography.js`; `tools/build-execution-viewer.mjs`
bundles the offline file during `npm run build --prefix web`. Open ASSET CREDITS
inside the viewer for the included recording and rendering-library licenses.
