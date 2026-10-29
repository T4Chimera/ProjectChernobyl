# R6 character handoff to Roblox Studio

The browser character preview now uses six rigid R6 body parts. Clothing,
armor, masks, helmets, optics, pouches, gloves, boots and weapons are accessories
attached to those parts. Detailed accessories do not turn the skeleton into R15;
there are no articulated elbow, knee or ankle body joints.

The browser is a Three.js preview. Its JavaScript is not a Roblox model or an
Animation asset. Reuse its proportions, equipment layout and pose intent when
building the Studio assets, then use the existing Luau services to run them.

## Body dimensions and coordinates

For character proportions, one Roblox stud corresponds to **0.4 browser units**.
The browser map separately uses a 0.25 scale of the prototype map; do not apply
that map scale to this character dimension table.

| Body part | Roblox size in studs | Browser logical size | Browser resting center above the floor |
| --- | --- | --- | --- |
| `Torso` | 2 × 2 × 1 | 0.8 × 0.8 × 0.4 | (0, 1.2, 0) |
| `Head` | 2 × 1 × 1 | 0.8 × 0.4 × 0.4 | (0, 1.8, 0) |
| `Right Arm` | 1 × 2 × 1 | 0.4 × 0.8 × 0.4 | (0.6, 1.2, 0) |
| `Left Arm` | 1 × 2 × 1 | 0.4 × 0.8 × 0.4 | (−0.6, 1.2, 0) |
| `Right Leg` | 1 × 2 × 1 | 0.4 × 0.8 × 0.4 | (0.2, 0.4, 0) |
| `Left Leg` | 1 × 2 × 1 | 0.4 × 0.8 × 0.4 | (−0.2, 0.4, 0) |

These are the logical body dimensions. A rounded head surface, clothing folds,
helmet, soles and other equipment can extend beyond them. Both renderers use
Y up and characters face local −Z. The browser scene root represents the floor
under the feet; the Roblox `HumanoidRootPart` represents the torso center.
For a standing character, place the Studio root **3 studs above the floor**.
The current Luau `RigService.Create` accepts that root CFrame, not a feet CFrame.

## Existing Studio rig and joints

[RigService.luau](src/ServerScriptService/Services/RigService.luau) already creates
the six named parts, an invisible `HumanoidRootPart`, a `Humanoid`, an `Animator`
and the six joints below. Its `HumanoidRootPart` is the model's `PrimaryPart`.
The following are the current Luau bind transforms, in studs; unspecified
rotation is identity.

| Motor6D | Part0 → Part1 | C0 position | C1 position |
| --- | --- | --- | --- |
| `RootJoint` | `HumanoidRootPart` → `Torso` | (0, 0, 0) | (0, 0, 0) |
| `Neck` | `Torso` → `Head` | (0, 1, 0) | (0, −0.5, 0) |
| `Right Shoulder` | `Torso` → `Right Arm` | (1, 0.5, 0) | (−0.5, 0.5, 0) |
| `Left Shoulder` | `Torso` → `Left Arm` | (−1, 0.5, 0) | (0.5, 0.5, 0) |
| `Right Hip` | `Torso` → `Right Leg` | (0.5, −1, 0) | (0, 1, 0) |
| `Left Hip` | `Torso` → `Left Leg` | (−0.5, −1, 0) | (0, 1, 0) |

Browser groups have the matching joint names and scaled classic bind anchors:
the torso/root is at y=1.2, shoulders at (±0.4, 1.4, 0), neck at (0, 1.6, 0)
and hips at (±0.2, 0.8, 0). Limb geometry retains the corresponding C1 offset
from each pivot. Port the resulting part transforms relative to each rig's bind
pose rather than copying an animated group position into a Motor6D C0.
The general joint relation is:

```text
Part0.CFrame × C0 × Transform = Part1.CFrame × C1
```

Keep the Studio bind C0/C1 values and solve the animation offset in that frame.
Convert character translation distances by dividing by 0.4. Convert radians to
degrees only where a configuration field expects degrees; Roblox CFrame APIs
accept radians. Browser walking also compensates for the rigid leg's sole
contact. Recreate that contact behavior in the authored R6 animation or its root
and hip motion; a simple angle copy does not establish planted feet in physics.

[AnimationService.luau](src/ServerScriptService/Services/AnimationService.luau)
recognizes the existing R6 joint names and applies procedural offsets relative
to saved bind transforms. [AnimationConfig.luau](src/ReplicatedStorage/Shared/AnimationConfig.luau)
contains pose/style tuning and empty per-character uploaded animation slots.
Uploaded animations must be authored for the final R6 rig and owned or usable
by the experience. Keep procedural fallback and uploaded tracks from fighting
over the same joints. Monster jaw/appendage joints are accessory joints, not
additional humanoid limbs.

## Bringing the equipment into Studio

1. Open the source-built place or connect Rojo using
   [default.project.json](default.project.json). Keep the six part names and
   the root, Humanoid and Animator structure above.
2. Set the experience's **Avatar Type to R6** in Studio's avatar settings for
   matching player characters. The current project mapping locks the camera
   to first person; it does not force player avatar type. Existing task-force
   code accepts both R6 and R15 players, while generated enemy rigs are R6.
3. Attach equipment with `Accessory` attachments or noncolliding, massless
   parts welded to the corresponding body part. Decorative equipment should
   not introduce new walk collisions or enlarge authoritative hit targets.
   Existing `RigService.adorn` uses this noncolliding welded-part approach.
4. Rebuild the rifle grip against the final R6 arms, and verify its muzzle and
   permanent flashlight attachment. The preview weapon/loadout remains
   provisional except for weapons already confirmed in the canonical configs.
5. Preserve boss names, HP, red name tags, appearance distinctions and all
   execution timelines. Keep Mikoyan's peaceful room behavior, Novak's silence
   and session-owned boss defeat state. Browser staging does not replace those
   server-side systems.

The supplied operative pictures guide equipment and proportions. They do not
silently finalize every task-force uniform or merge S.T.O lore into this game.

## Recorded voices and weapon sounds

Follow [VOICE_RECORDING_GUIDE.md](VOICE_RECORDING_GUIDE.md) for clean per-line
recordings and browser filenames. Keep the approved text unchanged; crying cues
are performances rather than spoken bracket labels. Missing recordings retain
subtitles. Novak has no voice lines, and John/Jayden proposal material stays
disabled unless separately approved.

For Studio, upload recordings and licensed sound effects through the experience
owner's Roblox account/group, then use the actual permitted asset IDs:

- [VoiceLineConfig.luau](src/ReplicatedStorage/Shared/VoiceLineConfig.luau) has
  empty per-line `SoundId` slots and exact text.
- [VoiceService.luau](src/ServerScriptService/Services/VoiceService.luau) already
  supplies distance/cooldown/subtitle behavior and character/radio processing.
- [WeaponConfig.luau](src/ReplicatedStorage/Shared/WeaponConfig.luau) has Fire,
  Reload and FootstepMetal sound slots.

A GitHub audio path is not a Roblox asset ID. Populate slots only with real
`rbxassetid://` IDs after upload, permission checks and moderation. Keep the source
license/attribution with any third-party effects. Do not bake radio distortion
into a supplied raw voice take if the runtime will apply it again.

## Studio acceptance

Use [STUDIO_TESTING.md](STUDIO_TESTING.md), including R6 spawn height, real foot
contact, idle/walk/aim/reload, animation priority, camera clipping, multiplayer
replication, execution interruption and death/respawn cleanup. Check that gear
does not detach, hands stay on the weapon and the flashlight stays on. Verify
each uploaded recording plays for the published experience and retains subtitle
timing. Browser tests, CLI logic tests and a Rojo build do not establish those
Studio engine results.
