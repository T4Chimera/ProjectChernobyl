# PROJECT CHERNOBYL — MASTER CODEX DEVELOPMENT PROMPT
## Roblox First-Person Horror Shooter
### Complete Game Design, Lore, Characters, Gameplay, AI, Audio, Animation, Map Architecture and Development Instructions

**IMPORTANT: READ THIS ENTIRE DOCUMENT BEFORE WRITING CODE.**

You are Codex, acting as the lead Roblox Luau programmer, technical architect, gameplay engineer, AI engineer, environmental systems developer and technical animation assistant for an original Roblox horror shooter.

The project is being developed by an independent creator with assistance from ChatGPT.

Your responsibility is to help transform the following game design into a playable, technically stable, expandable Roblox experience.

This is a serious long-term game-development project. Treat the information below as the authoritative design specification.

Do not invent or change established character lore, character appearances, names, dialogue, HP values, affiliations or important gameplay rules without permission.

You may recommend new mechanics, technical improvements and design ideas, but distinguish suggestions from confirmed canon.

---

# PART 1 — PROJECT OVERVIEW

## 1.1 Game identity

**Game title:** Undecided

**Temporary development name:** Project Chernobyl

**Platform:** Roblox

**Development environment:** Roblox Studio

**Programming language:** Luau

**Primary genre:** First-person horror shooter

**Secondary genres:**
- Tactical FPS
- Survival horror
- Psychological horror
- Mystery
- Environmental storytelling
- Exploration
- Science-fiction horror
- Paranormal horror

**Setting:** Chernobyl Nuclear Power Plant and surrounding areas, following the 1986 Reactor 4 disaster.

**Player organization:** SCP Foundation

**Opposing organization:** Chaos Insurgency

**Main threats:** Mutated humans, infected personnel, anomalous creatures and unique infected bosses.

**Perspective:** First-person during normal gameplay, transitioning to third-person during death or special execution sequences.

**Target experience:** An atmospheric, immersive horror shooter with dangerous enemies, discoverable lore, tactical combat, intelligent enemy behavior and unique boss encounters.

## 1.2 Core premise

The player is a member of the SCP Foundation deployed to Chernobyl following the explosion of Reactor 4.

The official explanation for the disaster involves the nuclear reactor.

However, this explanation conceals a much larger catastrophe.

Unknown to the public, Chernobyl was also being used as an undercover SCP Foundation research facility.

The facility was involved in experiments concerning:

- Highly dangerous and forbidden materials.
- Anomalous substances.
- Experimental technology.
- Time travel.
- Parallel-universe travel.
- Research into phenomena that should not exist.
- Other classified activities whose details have not yet been revealed.

When the disaster occurred, containment systems failed.

Radioactive contamination, anomalous materials and experimental phenomena contributed to the transformation of personnel into infected creatures.

Other entities and phenomena also escaped containment.

Some of these threats may not originate from the player's universe.

The SCP Foundation has dispatched specialized task forces to contain the disaster, eliminate dangerous threats and investigate what happened.

However, the player is not told the complete truth.

The full story must be discovered through exploration.

## 1.3 Narrative philosophy

This game must not reveal its complete story through introductory exposition.

Instead, players should discover the truth themselves.

Environmental storytelling is extremely important.

Possible evidence sources include:

- Classified documents.
- Research notes.
- Security logs.
- Audio recordings.
- Radio transmissions.
- Computer terminals.
- Handwritten messages.
- Damaged photographs.
- Abandoned equipment.
- Personnel records.
- Unusual environmental details.
- Hidden rooms.
- Anomalous architecture.
- Evidence of failed experiments.
- Conflicting official reports.

The player should gradually realize that the reactor explosion was only part of a much larger incident.

Some clues should be obvious.

Others should require careful observation and deduction.

Not every mystery must have an immediately available explanation.

Do not generate a definitive explanation for the entire disaster without creator approval.

---

# PART 2 — PLAYABLE SCP FOUNDATION TASK FORCES

Players can choose between four task forces.

1. Nu-7
2. Epsilon-11
3. Beta-7
4. Zeta-9

These are the four confirmed playable task forces.

## 2.1 Important visual design requirement

The creator has a separate fictional universe called S.T.O (Scandinavian Treaty Organization).

For this Roblox game, the visual appearance of Nu-7, Epsilon-11 and Beta-7 operatives should be based on their established S.T.O designs.

**This is a visual reference only.**

Do not merge S.T.O lore, history, leadership, factions or organizations into this SCP game.

The Chernobyl game and S.T.O universe are separate.

Do not assume that the SCP Foundation is secretly S.T.O.

### Nu-7

Use the creator's established S.T.O Nu-7 operative appearance as the reference.

Nu-7 is also the former task force of Felon, Sukhoi and Mikoyan.

Detailed model references should be supplied by the creator before finalizing character assets.

### Epsilon-11

Use the established S.T.O Epsilon-11 appearance.

Known reference details include:

- Orange, grey and black camouflage.
- Full-body coverage.
- Medium-heavy black tactical equipment.
- Heavily equipped helmet.
- Four green night-vision optics.
- M4A1 as a known standard weapon in the reference universe.

These are visual and equipment references, not automatic confirmation of the Chernobyl game's loadout.

### Beta-7

Use the established S.T.O Beta-7 operative appearance.

Request visual reference material before creating the final model.

### Zeta-9

The exact appearance and equipment have not been established by the creator.

Do not invent a definitive design.

A temporary placeholder is acceptable.

## 2.2 Task force selection system

Create a modular task force selection system.

Requirements:

- A player can select one of the four task forces.
- The selected task force determines their character appearance.
- The system should support different loadouts later.
- The system should support future class-specific abilities.
- The system should be server-authoritative.
- Task force selection should be accessible through a graphical interface.
- Character appearance should be replicated correctly to other players.
- Selected equipment should be applied reliably when spawning.

Do not invent permanent special abilities for each task force yet.

Build the architecture so abilities can be added later.

---

# PART 3 — PLAYER SYSTEMS

## 3.1 Player health

Every standard player has:

**Maximum HP: 100**

Player health must be controlled by the server.

The health system should support:

- Damage.
- Healing.
- Death.
- Enemy attacks.
- Environmental damage.
- Special attacks.
- Temporary damage immunity where needed.
- Future armor and protection mechanics.

Do not invent final armor values.

## 3.2 First-person camera

Normal gameplay is exclusively first-person.

Requirements:

- Smooth first-person camera.
- Mouse-controlled looking.
- Stable camera behavior.
- First-person weapon presentation.
- Compatible with character animations.
- Compatible with aiming and recoil.
- Appropriate movement feedback.
- No accidental clipping into the character model.
- Support for camera effects during anomalous encounters.

The camera should feel responsive and appropriate for a tactical horror shooter.

Avoid excessive camera shaking that makes gameplay uncomfortable.

## 3.3 Third-person death system

When a player dies, the camera transitions from first-person to third-person.

Requirements:

- The player can see their character.
- The camera transitions smoothly.
- The camera must not clip through walls.
- The camera must work during ordinary deaths.
- Special execution sequences may use custom camera positions.
- The camera must return to normal after respawning.
- Death camera behavior must not interfere with other players.

Execution animations should be cinematic but appropriate for Roblox's content standards.

Avoid graphic injury depictions.

## 3.4 Player movement

Implement a modular movement controller supporting:

- Walking.
- Sprinting.
- Crouching.
- Jumping.
- Optional stamina mechanics.
- Movement speed modifiers.
- Movement animations.
- Footstep sounds.
- Future injury-related movement changes.

Exact speeds and stamina values have not been confirmed.

Use configurable prototype values.

## 3.5 Weapons

The game requires a tactical firearm system.

Initial architecture should support:

- Firing.
- Reloading.
- Ammunition.
- Damage.
- Weapon switching.
- Aiming.
- Recoil.
- Weapon animations.
- Gunshot sounds.
- Muzzle effects.
- Hit detection.
- Server-side damage validation.
- Future attachments.
- Different weapons for different characters.

The HK416 is specifically confirmed as Felon's weapon.

Other player weapon assignments should remain configurable until confirmed.

---

# PART 4 — INFECTED ENEMY SYSTEM

There are two main enemy categories.

## 4.1 Ordinary infected

Ordinary infected are recurring enemies.

**They respawn after being eliminated.**

Their exact appearances, health, damage and abilities have not yet been specified.

Create a flexible ordinary infected system supporting:

- Spawn points.
- Respawn delays.
- Patrol behavior.
- Player detection.
- Chasing.
- Attacking.
- Death animations.
- Sound effects.
- Navigation.
- Multiple enemy variants.
- Future infection mechanics.

Do not invent final infected species or classifications.

## 4.2 Unique infected bosses

There are eight named infected bosses.

They are unique enemies with specific identities, personalities, histories and combat behaviors.

**They spawn in different locations.**

**After a unique boss is defeated, it does not respawn during that game server's current session.**

This rule is extremely important.

A boss must not respawn because:

- A player dies.
- A player leaves.
- A new player joins.
- A player changes task force.
- A player respawns.
- The boss's original spawn point becomes available.

For the initial prototype, boss defeat persistence should apply to the current server session.

Cross-server or permanent persistence has not been requested.

The system should support fixed or configurable spawn locations.

Random spawning is not confirmed.

## 4.3 Boss registry

| Boss | Classification | HP |
|---|---|---:|
| Felon | Miniboss | 1,500 |
| Sukhoi | Megaboss | 5,000 |
| Mikoyan | Miniboss | 1,500 |
| Nikolai | Miniboss | 1,000 |
| Novak | Miniboss | 1,000 |
| John | Miniboss | 2,000 |
| Jayden | Megaboss | 8,000 |
| Katya | Megaboss | 12,000 |

These values are confirmed.

Do not rebalance them without permission.

---

# PART 5 — FELON

## 5.1 Identity

**Name:** Felon

**Former task force:** Nu-7

**Classification:** Miniboss

**HP:** 1,500

**Name tag:** `____-FELON`

**Name tag color:** Red

**Weapon:** HK416

## 5.2 Backstory

Felon belonged to the same Nu-7 squad as Sukhoi and Mikoyan.

He was frightened throughout the mission.

He suspected that something was wrong.

His squadmates frequently mocked him for being afraid.

He was called weak and cowardly.

He felt excluded from the group.

These experiences contributed to his resentment.

During the Chernobyl incident, an infected creature bit him in the throat.

He subsequently became infected.

However, he retains a significant degree of control over himself.

He is a controlled infected.

He remains aggressive toward ordinary infected creatures as well as SCP Foundation players.

His behavior is influenced by his resentment and fear.

## 5.3 Appearance

Felon retains his Nu-7 tactical uniform.

However, the equipment is severely damaged.

Important features:

- Damaged tactical armor.
- Damaged military equipment.
- Broken night-vision goggles.
- Gas mask still covering his face.
- Gas mask heavily stained with dark infected fluid.
- Thick black infected blood.
- Visible signs of contamination and deterioration.
- Recognizable Nu-7 silhouette.

His design should communicate that he was once a Foundation operative.

Use stylized textures and damage effects rather than graphic injuries.

## 5.4 Personality

Felon is:

- Angry.
- Paranoid.
- Easily startled.
- Loud.
- Resentful.
- Defensive.
- Aggressive.
- Emotionally unstable under pressure.

He frequently shouts at potential enemies.

## 5.5 Voice characteristics

His voice is:

- Very loud.
- Heavily distorted.
- Glitchy.
- Aggressive.
- Occasionally interrupted by electronic interference.

## 5.6 Exact voice lines

**Nearby:**

"Footsteps? WHO IS THERE!!!!"

"If anyone is here step out you cowards!!"

**Detects player:**

"ENEMY!!!"

"LAY DOWN!!!! I SAID LAY DOWN!"

**Takes damage:**

"IM HIT!!"

"NOT ENOUGH!!!"

**Successful melee attack:**

"BAHAHA WEAKLING!!!"

"THATS ALL YOU GOT???!"

**Execution:**

"GOOD LUCK NEXT TIME KID!!"

"YOU SHOULD NOT TRUST THEM! YOUR FAULT!"

## 5.7 Suggested AI

Felon should be capable of:

- Patrolling.
- Hearing footsteps.
- Detecting players.
- Using his HK416.
- Chasing.
- Performing melee attacks.
- Searching for lost targets.
- Attacking ordinary infected.
- Playing context-specific voice lines.

Use a modular AI state machine.

Suggested states:

Idle, Patrol, Suspicious, Investigate, Alert, Chase, Attack, Search, Stunned, Dead.

These are implementation suggestions, not final lore.

---

# PART 6 — SUKHOI

## 6.1 Identity

**Name:** Sukhoi

**Former task force:** Nu-7

**Classification:** Megaboss

**HP:** 5,000

**Name tag:** `____-#SUKHOI#`

**Name tag color:** Red

**Primary weapon:** Axe

**Additional attacks:** Teeth and infected appendages.

## 6.2 Personality

Sukhoi is extremely aggressive.

He is angry, hostile and dangerous.

The creator describes him as having a serious antisocial personality disorder, specifically an unsuccessful sociopathic variant.

Treat this as a fictional character description.

His dangerous behavior should not be presented as representative of real people with mental health diagnoses.

Sukhoi is:

- Hostile.
- Self-preserving.
- Unpredictable.
- Cruel.
- Aggressive.
- Selfish.
- Easily provoked.

## 6.3 Backstory

Sukhoi was married.

During the incident, he and his wife encountered infected creatures.

Instead of helping her, he abandoned her to save himself.

His wife was subsequently infected.

Later, Mikoyan became infected and bit Sukhoi in the stomach.

Sukhoi was infected as a result.

**Continuity note:** The creator initially called Sukhoi's wife Alisa but later identified her as Katya. Katya is the currently developed boss character. Do not create a separate Alisa character or resolve the discrepancy without confirmation.

## 6.4 Appearance

Sukhoi resembles Felon in his original Nu-7 tactical equipment.

Differences include:

- A modified gas mask.
- The mouth/filter section of the mask separates into two parts.
- The mask can open during attacks.
- Sharp teeth are visible behind the mask.
- Black tentacle-like appendages.
- An elongated black tongue.
- Heavily damaged equipment.
- Dark infected textures.

Use non-graphic monster animation and stylized infected materials.

## 6.5 Voice characteristics

His voice is:

- Extremely loud.
- Aggressive.
- Distorted.
- Similar to an old damaged radio.

## 6.6 Exact voice lines

**Nearby:**

"Gamma radiation warning"

"WHOS THERE!!!"

**Detects player:**

"COME HERE!!!"

"HAHHAHAA YOU CANT RUN!!!!!"

**Takes damage:**

"IM NOT DEAD YET!!!"

"PFFTTT YOU'RE PATHETIC!!!!!!!!!!!!"

**Execution:**

No dialogue.

## 6.7 Special relationship with Katya

Katya is searching for Sukhoi.

When they encounter each other, special behavior can occur.

Possible confirmed outcomes:

- Katya attacks Sukhoi.
- Sukhoi flees from Katya.

Do not assume which outcome always occurs.

Create a configurable interaction system.

Sukhoi and Katya should be able to recognize each other as unique NPCs.

---

# PART 7 — MIKOYAN

## 7.1 Identity

**Name:** Mikoyan

**Former task force:** Nu-7

**Classification:** Miniboss

**HP:** 1,500

**Name tag:** `MIKOYAN___`

**Name tag color:** Red

## 7.2 Personality

Mikoyan was quiet, shy and kind.

He rarely spoke.

He preferred blending in with his squad rather than attracting attention.

He was not naturally aggressive.

He wanted to return to his family.

## 7.3 Backstory

Mikoyan was deployed to Chernobyl shortly before the expected birth of his daughter.

His wife had written him a final letter before his deployment.

He wanted nothing more than to return home.

After becoming infected, he remained in a room.

He sits beside the letter.

There is also an unidentified deceased person in the room.

The identity of that person remains unknown.

Do not invent the identity.

## 7.4 Appearance

Mikoyan resembles the other Nu-7 operatives.

However:

- His main uniform is white rather than black.
- His tactical vest remains dark.
- His helmet remains dark.
- His weapon retains its original appearance.
- His equipment is stained with dark infected fluid.

He should look visibly different from Felon and Sukhoi.

## 7.5 Special AI behavior

**Mikoyan is not automatically hostile.**

He should remain in his room.

He should not actively hunt players.

The creator specified that he becomes hostile if a player enters his room and shoots him.

Implement this as an encounter-specific hostility trigger.

Entering the room alone must not automatically cause combat.

If the player leaves him alone, he should remain peaceful.

## 7.6 Voice

Mikoyan's voice is difficult to understand.

It is audible but heavily obscured.

Players may need to listen more than once to understand his words.

## 7.7 Only confirmed voice line

**Execution:**

"Leave me ALONE."

Do not invent additional dialogue without permission.

## 7.8 Environmental storytelling

His room should eventually include:

- A seated Mikoyan.
- His wife's letter.
- A nearby unidentified body.
- Appropriate environmental lighting.
- A quiet, sorrowful atmosphere.

The exact letter text has not been written.

Do not invent its canonical contents.

---

# PART 8 — NIKOLAI

## 8.1 Identity

**Name:** Nikolai

**Classification:** Miniboss

**HP:** 1,000

**Name tag:** `___NIKOLAI##`

**Name tag color:** Red

**Weapon:** Axe

## 8.2 Backstory

Nikolai was a young adult who secretly explored Chernobyl with his childhood friend Novak.

They were present during the incident.

Both became infected.

Their friendship dates back to childhood.

Nikolai continues searching for Novak.

**Continuity note:** An earlier description also associated Nikolai with Felon's Nu-7 squad. The later description identifies him as an explorer with Novak. Treat his exact affiliation as unresolved rather than inventing an explanation.

## 8.3 Appearance

Nikolai wears:

- White hoodie.
- White hood.
- Black cap.
- Black pants.

His face is always covered by a black rectangular visual obstruction.

This is an important design feature.

Do not remove the rectangle.

His infected skin is pitch black.

He has sharp teeth.

Use stylized dark textures.

## 8.4 Voice lines

**Nearby:**

"Novak???? ARE YOU THERE???? NOVAK!!"

**Execution:**

"Sorry not sorry"

No additional lines are confirmed.

## 8.5 Suggested behavior

Nikolai may wander while searching for Novak.

He should recognize Novak if they encounter each other.

The exact outcome of that interaction has not been confirmed.

Do not invent permanent hostility between them.

---

# PART 9 — NOVAK

## 9.1 Identity

**Name:** Novak

**Classification:** Miniboss

**HP:** 1,000

**Name tag:** `##NOVAK___`

**Name tag color:** Red

**Weapon:** Katana

## 9.2 Backstory

Novak was Nikolai's childhood best friend.

They explored Chernobyl together.

Both became infected during the incident.

Novak is stronger and faster than Nikolai.

## 9.3 Appearance

Novak wears clothing similar to Nikolai's.

However, his clothing is black.

His face is also concealed by a black rectangle.

His infected skin is pitch black.

He carries a katana.

## 9.4 Voice lines

**None.**

Novak does not speak.

Do not automatically generate voice dialogue for him.

## 9.5 AI characteristics

Novak should be:

- Faster than Nikolai.
- Stronger than Nikolai.
- Silent.
- Dangerous at close range.

Exact movement speeds and attack damage have not been confirmed.

Use temporary configurable values.

---

# PART 10 — JOHN

## 10.1 Identity

**Name:** John

**Faction:** Chaos Insurgency

**Classification:** Miniboss

**HP:** 2,000

**Name tag:** `CI_JOHN`

**Name tag color:** Red

## 10.2 Backstory

John was a Chaos Insurgency operative.

He and Jayden were deployed to Chernobyl to disrupt SCP Foundation operations.

Their mission was to increase the chaos and help dangerous creatures escape.

They wanted the Foundation's containment efforts to fail.

However, Sukhoi attacked John after becoming infected.

Sukhoi bit John in the throat.

John subsequently became infected.

## 10.3 Appearance

John uses the Chaos Insurgency design provided by the creator in a reference image.

Required modifications:

- Red equipment elements become black and white.
- Night-vision optics are purple.
- Retain the general structure of the reference model.

Do not invent an unrelated appearance.

If the reference image is not available in the current project, request it from the creator.

## 10.4 Proposed personality

The following is an assistant proposal, not creator-confirmed canon.

John is:

- Calculating.
- Sarcastic.
- Hostile toward Foundation personnel.
- Methodical.
- Distrustful.
- Aware of his former Chaos Insurgency mission.

## 10.5 Proposed voice lines

**Nearby:**

"Foundation personnel... I can hear you."

"You shouldn't have come back."

"Jayden? Respond. Where the hell are you?"

**Detects player:**

"FOUNDATION!"

"Oh, look who finally showed up."

"YOU'RE NOT LEAVING!"

**Takes damage:**

"That was a mistake."

"STILL STANDING!"

"I've survived worse!"

**Loses sight:**

"Running away? Typical Foundation."

"Come out. We have unfinished business."

"Where did you go?!"

**Execution:**

"Your Foundation lied to you."

"You never knew what happened here."

"Mission failed, soldier."

These lines may be changed by the creator.

---

# PART 11 — JAYDEN

## 11.1 Identity

**Name:** Jayden

**Faction:** Chaos Insurgency

**Classification:** Megaboss

**HP:** 8,000

**Name tag:** `CI_JAYDEN`

**Name tag color:** Red

## 11.2 Appearance

Jayden uses the same supplied Chaos Insurgency visual reference family as John.

Required details:

- Black-and-white equipment.
- Purple night-vision optics.
- Tactical equipment based on the reference image.

## 11.3 Proposed backstory

The creator authorized ChatGPT to propose Jayden's backstory.

The following is a proposal.

Jayden was John's operational partner.

He was more reckless than John.

He believed the disaster could be exploited to damage the SCP Foundation.

During the mission, Jayden discovered evidence that the facility had opened a connection to another world.

He attempted to transmit his discovery to Chaos Insurgency command.

The transmission never arrived.

Jayden disappeared.

His exact infection circumstances remain unknown.

He later reappeared as an extremely powerful infected entity.

Do not treat this proposed backstory as permanently confirmed until the creator approves it.

## 11.4 Proposed voice characteristics

- Distorted.
- Aggressive.
- Multiple overlapping radio-like effects.
- Occasionally unstable.

## 11.5 Proposed voice lines

**Nearby:**

"John...? Status report."

"Something's wrong with this place..."

"I KNOW YOU'RE THERE."

**Detects player:**

"NO WITNESSES!"

"THE FOUNDATION SENT MORE?!"

"YOU HAVE NO IDEA WHAT YOU'VE WALKED INTO!"

**Takes damage:**

"IS THAT SUPPOSED TO STOP ME?!"

"YOU'RE TOO LATE!"

"I'M NOT FINISHED!"

**Loses sight:**

"COME BACK HERE!"

"YOU CAN'T HIDE FOREVER!"

"I CAN STILL HEAR YOU!"

**Execution:**

"You should've stayed outside."

"The reactor was never the problem."

"They sent you here to disappear."

These are proposed lines.

---

# PART 12 — KATYA

## 12.1 Identity

**Name:** Katya

**Classification:** Megaboss

**HP:** 12,000

**Name tag:** `###_:(KATYA--`

**Name tag color:** Red

Katya has the highest confirmed health of any current boss.

## 12.2 Personality before infection

Katya was:

- Kind.
- Softhearted.
- Caring.
- Encouraging.
- Emotionally sensitive.
- Supportive of others.

She frequently tried to encourage people.

She was married to Sukhoi.

## 12.3 Backstory

Katya was abandoned by Sukhoi during an infected attack.

Sukhoi prioritized his own survival.

Katya subsequently became infected.

She now wanders Chernobyl searching for Sukhoi.

Her behavior is driven by betrayal, anger and grief.

She frequently mistakes other people, including players, for Sukhoi.

This causes her to attack them.

## 12.4 Appearance

Katya is a distinctive humanoid infected creature.

Important features:

- Long blonde hair in her passive state.
- Hair becomes black when she detects a player.
- Hair is also black when she initially spawns.
- Pitch-black skin.
- Lean humanoid silhouette.
- Glossy, dark infected surface.
- Damaged black military clothing.
- No tactical vest.
- No conventional heavy tactical equipment.
- One human-looking eye, red and tearful.
- One black eye with a small white pupil.
- Minimal visible facial features.
- Sharp white teeth visible when her mouth opens.
- Muscular arms.
- A somewhat broader lower-body silhouette.
- Black tentacle-like appendages.

Her infection also affects her digestive system.

For Roblox implementation, represent her mutations through non-graphic, stylized infected anatomy, dark textures, appendages and particle effects.

Do not create detailed exposed organs or graphic injuries.

## 12.5 Environmental attack

Katya can produce black infected liquid that creates dangerous puddles.

Gameplay requirements:

- A puddle can appear during a special attack.
- Players walking into it take damage.
- The puddle should have a visible warning.
- It should disappear after a configurable duration.
- Damage must be handled by the server.
- Effects should be optimized.

Use a stylized corrosive or anomalous liquid effect.

The exact damage and duration are not confirmed.

## 12.6 Voice characteristics

Katya frequently cries.

Her voice changes depending on her emotional state.

She may sound:

- Quiet.
- Sad.
- Distressed.
- Furious.
- Unstable.
- Desperate.

Her idle animations and sounds should convey grief and agitation.

## 12.7 Exact voice lines

**Nearby:**

*Crying*

"How could you.... how could you.."

**Detects player:**

"THERE YOU ARE!!!!!!!!!!!! COWARD!!!!!!!!!!"

"HOW DARE YOU??!!!!!!!!! GET BACK!!!"

"I'LL KILL YOU!!!!!!!!"

**Takes damage:**

"YOU THINK THAT DID ANYTHING?????????"

"I WILL NOT ALLOW YOU TO HIT ME ANYMORE!!!!!!"

"I'LL KILL YOU!!!"

**Loses sight:**

"COWARD WHERE ARE YOU!"

*Intense crying*

"COME BACK!!!"

"SUKHOI DONT HIDE AGAIN!!!!"

**Execution:**

"THIS IS HOW IT FEELS LIKE!!!!!"

"I GOT YOU!!!!!!!!!! I HATE YOU!!!!"

"I HATE YOU, I HATE YOU, DIEEEEEEEE!!!!!!!!!"

## 12.8 Special AI requirements

Katya should support:

- Wandering.
- Crying.
- Detecting players.
- Pursuing targets.
- Losing targets.
- Searching.
- Special attacks.
- Environmental hazards.
- Hair-color transformation.
- Special interactions with Sukhoi.
- Unique death and execution animations.

Katya must not be treated as an ordinary zombie.

She is a unique megaboss with a recognizable personality.

---

# PART 13 — UNIVERSAL BOSS AI

All bosses should share a common technical AI framework while retaining unique behaviors.

Recommended states:

1. Idle
2. Patrol
3. Suspicious
4. Investigate
5. Alert
6. Chase
7. Attack
8. Search
9. LostTarget
10. SpecialAttack
11. Stunned
12. Dead

Not every boss must use every state.

For example, Mikoyan should not patrol aggressively.

## 13.1 Detection

Support:

- Vision detection.
- Hearing.
- Line-of-sight checks.
- Distance checks.
- Noise investigation.
- Last-known player position.
- Target memory.

## 13.2 Losing sight

All relevant bosses should have a lost-target behavior.

When a boss loses sight of a player:

- Stop direct pursuit when appropriate.
- Search the last known location.
- Play an appropriate voice line if one exists.
- Investigate nearby sounds.
- Return to the appropriate AI state if the player cannot be found.

Do not invent dialogue for characters without confirmed or proposed lines.

## 13.3 Navigation

Use Roblox PathfindingService where appropriate.

Avoid:

- Enemies walking into walls.
- Enemies getting permanently stuck.
- Constant unnecessary path recalculations.
- Excessive server load.
- Enemies targeting players through solid walls without a justified ability.

## 13.4 Combat

Boss combat should support:

- Melee attacks.
- Ranged attacks where applicable.
- Attack cooldowns.
- Hit detection.
- Server-authoritative damage.
- Animation synchronization.
- Special attacks.
- Player death triggers.
- Boss-versus-boss interactions.

## 13.5 Boss relationships

Implement a configurable relationship system.

Important known relationships:

**Katya → Sukhoi:** Hostile.

**Sukhoi → Katya:** May fight or flee.

**Nikolai → Novak:** Childhood friends.

**Novak → Nikolai:** Childhood friends.

**John → Jayden:** Former Chaos Insurgency partners.

**Felon → Ordinary infected:** Hostile.

Other relationships are not fully confirmed.

Do not invent permanent alliances or rivalries without permission.

---

# PART 14 — VOICE AND SOUND SYSTEM

Create a reusable voice-line manager.

Voice categories:

- Idle
- Nearby
- Suspicious
- PlayerDetected
- Damaged
- MeleeHit
- LostTarget
- SpecialAttack
- Execution
- Death

Each boss should have its own voice-line configuration.

Requirements:

- Random selection among valid lines.
- Cooldowns.
- No overlapping spam.
- Distance-based audio.
- Optional subtitles.
- Voice distortion effects.
- Configurable volume.
- Different voice styles.
- Support for future uploaded Roblox audio assets.

Do not invent Roblox audio asset IDs.

If audio files are unavailable, create placeholder sound slots.

Use Roblox Sound objects and appropriate audio effects.

### Environmental audio

Support:

- Wind.
- Distant machinery.
- Electrical buzzing.
- Geiger-counter effects.
- Radio static.
- Metallic footsteps.
- Distant creature sounds.
- Ambient facility noises.
- Alarms.
- Environmental anomalies.

Do not use copyrighted audio without permission or appropriate licensing.

---

# PART 15 — ANIMATION SYSTEM

The game requires animations for players, infected and bosses.

## 15.1 Player animations

Support:

- Idle.
- Walk.
- Sprint.
- Crouch.
- Jump.
- Landing.
- Weapon equip.
- Weapon firing.
- Reload.
- Aiming.
- Death.
- Special execution victim animations.

## 15.2 Ordinary infected animations

Support:

- Idle.
- Walk.
- Run.
- Attack.
- Search.
- Hit reaction.
- Death.

## 15.3 Boss animations

Each boss should have unique animations.

**Felon:** Aggressive weapon handling, startled reactions, erratic movements.

**Sukhoi:** Heavy aggressive movements, axe attacks, mask-opening animation, appendage motion.

**Mikoyan:** Sitting, looking at the letter, subtle movement, reluctant hostility.

**Nikolai:** Axe attacks, searching movements.

**Novak:** Fast movement, katana attacks, silent pursuit.

**John:** Tactical movements with infected characteristics.

**Jayden:** Distinctive megaboss movements, exact style to be determined.

**Katya:** Crying, searching, hair transformation, unusual infected movement, special attacks.

## 15.4 Animation implementation

Use Roblox Animator and AnimationTrack systems.

Use keyframe markers to synchronize:

- Attack hitboxes.
- Footsteps.
- Sound effects.
- Camera transitions.
- Special effects.

Do not fabricate animation asset IDs.

Where final animations do not exist, use functional placeholder animations or procedural movement.

Explain clearly which animations must be created or uploaded in Roblox Studio.

---

# PART 16 — MAP DEVELOPMENT

The game takes place in and around Chernobyl.

The exact complete map layout has not yet been established.

Build a modular environment system.

Possible map sections include:

- Reactor facility.
- Industrial corridors.
- Control rooms.
- Maintenance areas.
- Security checkpoints.
- Underground research laboratories.
- Abandoned offices.
- Storage rooms.
- Ventilation systems.
- Restricted experimental chambers.
- Exterior contaminated areas.
- Secret anomalous sections.

These are suggested development areas, not all confirmed final map locations.

## 16.1 Environmental style

The environment should feel:

- Abandoned.
- Industrial.
- Dangerous.
- Mysterious.
- Oppressive.
- Atmospheric.
- Unpredictable.

Use:

- Realistic proportions.
- Appropriate industrial materials.
- Atmospheric lighting.
- Shadows.
- Fog.
- Damaged equipment.
- Warning signs.
- Environmental storytelling props.

Avoid making every room identical.

## 16.2 Lighting

Create a lighting system supporting:

- Flickering lights.
- Emergency lights.
- Dark corridors.
- Flashlight illumination.
- Power outages.
- Triggered lighting changes.
- Anomalous visual effects.

Keep the environment playable.

Darkness should create tension without making navigation impossible.

## 16.3 Doors

Create reusable doors supporting:

- Opening.
- Closing.
- Locked states.
- Access permissions.
- Sound effects.
- Animations.
- Future keycard systems.

## 16.4 Map generation

Where useful, create Luau scripts that generate prototype rooms, corridors, doors and environmental objects.

The creator should be able to paste scripts into Roblox Studio and see actual results.

However, do not assume code generation can replace all detailed modeling.

Use placeholders for custom assets when necessary.

---

# PART 17 — HORROR DESIGN

The horror should not depend exclusively on jumpscares.

Focus on:

- Suspense.
- Uncertainty.
- Environmental storytelling.
- Distant sounds.
- Enemy unpredictability.
- Limited visibility.
- Character tragedy.
- Exploration.
- Strange discoveries.
- Sudden encounters.
- Psychological tension.

Examples:

A player hears Felon shouting somewhere in a distant corridor.

A player enters a room and discovers Mikoyan sitting quietly.

A player hears Nikolai calling for Novak.

A player discovers evidence that the reactor explosion was not the entire story.

A player hears Katya crying before seeing her.

The horror should emerge naturally from gameplay.

---

# PART 18 — USER INTERFACE

Create a modular user interface.

Required initial systems:

- Main menu.
- Task force selection.
- Player health display.
- Ammunition display.
- Interaction prompts.
- Death screen.
- Boss name tags.
- Boss health indicators.
- Optional subtitles.
- Lore document viewer.

## 18.1 Boss name tags

Preserve the exact names and punctuation specified in the boss registry.

All confirmed boss name tags are red.

Do not automatically sanitize, shorten or rewrite them for aesthetic reasons.

The game should display each name tag clearly.

## 18.2 Boss health display

Create a configurable boss health display.

It should support:

- Current HP.
- Maximum HP.
- Boss name.
- Health changes.
- Boss defeat.
- Different boss classifications.

The exact visual layout is not confirmed.

Use a clean prototype design.

---

# PART 19 — TECHNICAL ARCHITECTURE

The project must use organized, maintainable Luau code.

Avoid placing the entire game in one enormous script.

Recommended structure:

```text
ProjectChernobyl/
│
├── AGENTS.md
├── GAME_DESIGN.md
├── default.project.json
│
└── src/
    ├── ReplicatedStorage/
    │   ├── Shared/
    │   │   ├── GameConfig.luau
    │   │   ├── BossConfig.luau
    │   │   ├── TaskForceConfig.luau
    │   │   ├── WeaponConfig.luau
    │   │   └── VoiceLineConfig.luau
    │   │
    │   └── Remotes/
    │
    ├── ServerScriptService/
    │   ├── Main.server.luau
    │   ├── Services/
    │   │   ├── PlayerService.luau
    │   │   ├── DamageService.luau
    │   │   ├── BossService.luau
    │   │   ├── SpawnService.luau
    │   │   ├── EnemyAIService.luau
    │   │   ├── WeaponService.luau
    │   │   └── TaskForceService.luau
    │   │
    │   └── AI/
    │       ├── BaseEnemyAI.luau
    │       ├── BossAI.luau
    │       └── BossBehaviors/
    │
    ├── StarterPlayer/
    │   └── StarterPlayerScripts/
    │       ├── CameraController.client.luau
    │       ├── InputController.client.luau
    │       └── DeathCamera.client.luau
    │
    └── StarterGui/
        └── UIController.client.luau
```

This is a proposed architecture.

Adjust it where technically necessary.

Ensure the Rojo configuration maps files into the correct Roblox services.

Do not create an enormous number of empty files merely to match the proposed tree.

Implement functional modules incrementally.

## 19.1 Networking

Use RemoteEvents and RemoteFunctions only where appropriate.

Never trust client-provided damage values.

Validate:

- Weapon usage.
- Fire rate.
- Ammunition.
- Target distance.
- Hit registration.
- Task force selection.
- Boss damage.
- Special attack requests.

The server must remain authoritative.

## 19.2 Performance

The game may eventually contain numerous infected NPCs.

Optimize:

- AI update frequency.
- Pathfinding.
- Particle effects.
- Sound playback.
- Physics.
- NPC spawning.
- Network replication.
- Animation playback.

Avoid unnecessary loops running every frame on the server.

Use appropriate cleanup systems.

## 19.3 Debugging

Provide useful development logging.

Errors should identify:

- The relevant system.
- The failing object.
- The expected state.
- The likely cause.

Avoid excessive console spam.

## 19.4 Maintainability

Use:

- Clear naming conventions.
- ModuleScripts.
- Centralized configuration.
- Reusable functions.
- Comments where useful.
- Consistent file organization.
- Typed Luau where beneficial.

Avoid unnecessary complexity.

---

# PART 20 — ROJO AND CODEX WORKFLOW

The creator is using Windows and Roblox Studio.

The project may be developed using Codex with Rojo.

If Rojo is not installed, explain how to install and configure it.

The expected workflow is:

1. Codex edits local Luau project files.
2. Rojo synchronizes supported files with Roblox Studio.
3. The creator tests the game in Roblox Studio.
4. Errors and feedback are returned to Codex.
5. Codex updates the relevant files.
6. Development continues iteratively.

Do not claim direct control over Roblox Studio unless an actual supported integration is configured and working.

Do not claim to have tested the game inside Roblox Studio if you have not.

For tasks that require manual Studio actions, provide exact instructions.

Whenever code is generated, explain:

- Which file it belongs in.
- Which Roblox service receives it.
- Whether it is a Script, LocalScript or ModuleScript.
- Any required objects.
- How to test it.
- What successful behavior should look like.

---

# PART 21 — DEVELOPMENT ROADMAP

Do not attempt to build the entire game in one operation.

Build a playable vertical slice first.

## Phase 1 — Project foundation

Create:

- Basic project structure.
- Rojo configuration, if applicable.
- Core shared configuration.
- Server initialization.
- Player health system.
- Basic first-person camera.

**Goal:** A player can spawn and move around in first-person.

## Phase 2 — Basic combat

Create:

- One prototype firearm.
- Firing system.
- Reloading.
- Ammunition.
- Server-validated damage.
- Basic shooting effects.

**Goal:** A player can shoot a target and deal damage.

## Phase 3 — Ordinary infected

Create:

- One placeholder infected NPC.
- Basic enemy AI.
- Chasing.
- Attacking.
- Death.
- Respawning.

**Goal:** The player can fight ordinary infected enemies.

## Phase 4 — Boss framework

Create:

- Boss registry.
- Boss HP configuration.
- Unique boss spawning.
- Boss death tracking.
- Boss health UI.
- Basic boss AI.

**Goal:** Unique bosses can spawn and be defeated without respawning during the same server session.

## Phase 5 — First boss

Implement Felon as the first playable boss prototype.

Include:

- 1,500 HP.
- Red name tag.
- Basic HK416 combat.
- Player detection.
- Pursuit.
- Voice-line triggers.
- Death handling.

Use placeholder assets where necessary.

**Goal:** Felon is a functional miniboss.

## Phase 6 — Camera and animation

Implement:

- Third-person death camera.
- Basic death animations.
- Animation synchronization.
- First-person weapon animations.
- Execution camera framework.

## Phase 7 — Environment

Build a prototype Chernobyl facility.

Include:

- Corridors.
- Rooms.
- Doors.
- Lighting.
- Environmental sounds.
- Enemy spawn locations.
- A basic lore discovery system.

## Phase 8 — Additional bosses

Add the remaining bosses one at a time.

Do not implement all eight simultaneously.

Preserve their unique behaviors.

## Phase 9 — Narrative systems

Implement:

- Collectible documents.
- Audio logs.
- Terminals.
- Environmental clues.
- Lore progression.
- Hidden discoveries.

## Phase 10 — Polish and optimization

Improve:

- Animation quality.
- Sound design.
- Lighting.
- Performance.
- UI.
- Boss behavior.
- Multiplayer stability.
- Bug handling.

---

# PART 22 — IMPORTANT CREATOR RULES

These rules are mandatory.

### Rule 1 — Preserve lore

Do not rewrite established lore without permission.

### Rule 2 — Preserve character identity

Every boss must retain their established personality, appearance, affiliations and story.

### Rule 3 — Preserve HP

Do not change the specified boss HP values.

### Rule 4 — Preserve names

Do not alter the exact boss name tags.

### Rule 5 — Respect voice-line canon

Do not invent additional canonical dialogue for characters whose lines are established.

Proposed dialogue for John and Jayden may be revised.

### Rule 6 — No unique boss respawning

Unique bosses remain defeated for the current server session.

Ordinary infected respawn.

### Rule 7 — First-person gameplay

Normal gameplay must remain first-person.

Death and execution sequences may use third-person cameras.

### Rule 8 — Do not merge fictional universes

S.T.O visual references are permitted.

S.T.O lore must not automatically become part of the SCP Foundation game's story.

### Rule 9 — Ask about missing critical details

If a feature depends on a major unresolved design decision, ask the creator.

For minor implementation decisions, use configurable placeholders.

### Rule 10 — Build incrementally

Prioritize functional, testable systems.

### Rule 11 — Roblox compatibility

Use legitimate Roblox Studio APIs and Luau.

Avoid unsupported APIs and fabricated asset identifiers.

### Rule 12 — Maintain a development record

Keep a record of completed features, current tasks, unresolved questions and known bugs.

### Rule 13 — Do not fabricate testing

Clearly distinguish written code from code actually tested in Roblox Studio.

### Rule 14 — Multiplayer correctness

Design shared gameplay systems to work correctly with multiple players.

### Rule 15 — Keep horror platform-appropriate

Maintain the game's dark atmosphere using suspense, audio, animation, stylized mutations and environmental effects without relying on graphic depictions.

---

# PART 23 — UNRESOLVED DESIGN DECISIONS

The following details are not finalized:

- Final game title.
- Exact map size.
- Complete map layout.
- Whether the game is exclusively cooperative multiplayer.
- Maximum players per server.
- Difficulty settings.
- Player respawn rules.
- Exact player weapons.
- Task force abilities.
- Task force loadouts.
- Ordinary infected appearances.
- Ordinary infected HP.
- Boss attack damage.
- Boss movement speeds.
- Boss spawn coordinates.
- Whether boss locations are randomized.
- Exact boss execution animations.
- Final boss models.
- Final sound assets.
- Final animation assets.
- Complete lore documents.
- The full explanation for the Chernobyl experiments.
- Jayden's final approved backstory.
- The Alisa/Katya naming discrepancy.
- Nikolai's exact original affiliation.
- Whether defeated bosses remain defeated across future server sessions.

Do not silently turn these unknowns into permanent canon.

Use configurable prototype values where needed.

---

# PART 24 — YOUR FIRST TASK AS CODEX

Before writing the complete game, inspect the current project directory.

Determine whether a Roblox project already exists.

If the directory is empty, create a minimal, functional Rojo-compatible Roblox project.

Then:

1. Create a clear project structure.
2. Create a `GAME_DESIGN.md` file containing this specification.
3. Create an `AGENTS.md` file summarizing the mandatory development rules.
4. Create a shared game configuration module.
5. Create a boss configuration module containing all eight bosses and their exact HP values and name tags.
6. Create a basic first-person player setup.
7. Create a simple server initialization script.
8. Explain how to synchronize the project into Roblox Studio.
9. Provide instructions for testing the initial setup.

Do not attempt to implement every boss, animation, weapon and map feature immediately.

Start with a stable foundation.

If you cannot directly create or edit files in the current environment, explain the limitation and provide the necessary files and instructions.

## Required first milestone

The initial milestone is complete when:

- The project opens in Roblox Studio.
- The player can spawn.
- The camera operates in first-person.
- The player has 100 maximum HP.
- The boss registry contains all eight named bosses.
- The project runs without initialization errors.

Once this milestone is complete, wait for the creator's feedback before beginning the next major phase.

---

# FINAL INSTRUCTION

You are not creating a generic Roblox zombie shooter.

You are helping develop a story-driven SCP Foundation horror game set in Chernobyl, featuring a concealed experimental disaster, multiple playable task forces, unique infected characters, discoverable lore and tactical first-person gameplay.

The individual boss characters are central to the experience.

Their histories and personalities must influence their gameplay behavior.

The technical foundation should support a long-term project with additional locations, enemies, weapons, animations, sound effects and narrative content.

Prioritize stability, modularity, atmosphere and faithfulness to the creator's vision.

**Begin by inspecting the project, explaining your intended implementation approach, and completing Phase 1 only.**
