--!strict
-- Exact dialogue from GAME_DESIGN.md. Empty SoundId slots need creator-owned or
-- licensed recordings uploaded to Roblox; subtitles work before audio exists.
export type Line = { Text: string, SoundId: string, Duration: number, Cue: boolean? }

-- Optional fourth argument accepts a creator-owned recording after upload.
-- For example, add your real asset URI to an existing line without changing text.
local function line(text: string, duration: number?, cue: boolean?, soundId: string?): Line
	return table.freeze({ Text = text, SoundId = soundId or "", Duration = duration or 3.5, Cue = cue })
end

local voices = {
	Felon = {
		Volume = 0.9, Distortion = 0.45, Radio = true,
		Lines = {
			Nearby = { line("Footsteps? WHO IS THERE!!!!"), line("If anyone is here step out you cowards!!", 4) },
			PlayerDetected = { line("ENEMY!!!", 2), line("LAY DOWN!!!! I SAID LAY DOWN!") },
			Damaged = { line("IM HIT!!", 2), line("NOT ENOUGH!!!", 2) },
			MeleeHit = { line("BAHAHA WEAKLING!!!"), line("THATS ALL YOU GOT???!") },
			Execution = { line("GOOD LUCK NEXT TIME KID!!"), line("YOU SHOULD NOT TRUST THEM! YOUR FAULT!", 4.5) },
		},
	},
	Sukhoi = {
		Volume = 1, Distortion = 0.6, Radio = true,
		Lines = {
			Nearby = { line("Gamma radiation warning"), line("WHOS THERE!!!", 2.5) },
			PlayerDetected = { line("COME HERE!!!", 2.5), line("HAHHAHAA YOU CANT RUN!!!!!") },
			Damaged = { line("IM NOT DEAD YET!!!"), line("PFFTTT YOU'RE PATHETIC!!!!!!!!!!!!") },
			Execution = {}, -- Explicitly no execution dialogue.
		},
	},
	Mikoyan = {
		Volume = 0.55, Distortion = 0.7, Radio = true,
		Lines = { Execution = { line("Leave me ALONE.") } },
	},
	Nikolai = {
		Volume = 0.75, Distortion = 0.2, Radio = false,
		Lines = {
			Nearby = { line("Novak???? ARE YOU THERE???? NOVAK!!", 4.5) },
			Execution = { line("Sorry not sorry", 2.5) },
		},
	},
	Novak = {
		Volume = 0, Distortion = 0, Radio = false,
		Lines = {}, -- Novak never speaks.
	},
	John = {
		Proposed = true, Volume = 0.75, Distortion = 0.3, Radio = true,
		Lines = {
			Nearby = {
				line("Foundation personnel... I can hear you.", 4),
				line("You shouldn't have come back."),
				line("Jayden? Respond. Where the hell are you?", 4.5),
			},
			PlayerDetected = { line("FOUNDATION!", 2), line("Oh, look who finally showed up."), line("YOU'RE NOT LEAVING!", 2.5) },
			Damaged = { line("That was a mistake.", 2.5), line("STILL STANDING!", 2), line("I've survived worse!", 2.5) },
			LostTarget = { line("Running away? Typical Foundation."), line("Come out. We have unfinished business.", 4), line("Where did you go?!", 2.5) },
			Execution = { line("Your Foundation lied to you."), line("You never knew what happened here.", 4), line("Mission failed, soldier.") },
		},
	},
	Jayden = {
		Proposed = true, Volume = 0.9, Distortion = 0.55, Radio = true,
		Lines = {
			Nearby = { line("John...? Status report."), line("Something's wrong with this place..."), line("I KNOW YOU'RE THERE.") },
			PlayerDetected = { line("NO WITNESSES!", 2.5), line("THE FOUNDATION SENT MORE?!"), line("YOU HAVE NO IDEA WHAT YOU'VE WALKED INTO!", 4.5) },
			Damaged = { line("IS THAT SUPPOSED TO STOP ME?!"), line("YOU'RE TOO LATE!", 2.5), line("I'M NOT FINISHED!", 2.5) },
			LostTarget = { line("COME BACK HERE!", 2.5), line("YOU CAN'T HIDE FOREVER!"), line("I CAN STILL HEAR YOU!") },
			Execution = { line("You should've stayed outside."), line("The reactor was never the problem."), line("They sent you here to disappear.") },
		},
	},
	Katya = {
		Volume = 0.8, Distortion = 0.2, Radio = false,
		Lines = {
			Nearby = { line("[Crying]", 4, true), line("How could you.... how could you..", 4.5) },
			PlayerDetected = {
				line("THERE YOU ARE!!!!!!!!!!!! COWARD!!!!!!!!!!", 4),
				line("HOW DARE YOU??!!!!!!!!! GET BACK!!!"), line("I'LL KILL YOU!!!!!!!!", 2.5),
			},
			Damaged = {
				line("YOU THINK THAT DID ANYTHING?????????"),
				line("I WILL NOT ALLOW YOU TO HIT ME ANYMORE!!!!!!", 4.5), line("I'LL KILL YOU!!!", 2.5),
			},
			LostTarget = {
				line("COWARD WHERE ARE YOU!"), line("[Intense crying]", 4, true),
				line("COME BACK!!!", 2.5), line("SUKHOI DONT HIDE AGAIN!!!!"),
			},
			Execution = {
				line("THIS IS HOW IT FEELS LIKE!!!!!"),
				line("I GOT YOU!!!!!!!!!! I HATE YOU!!!!"),
				line("I HATE YOU, I HATE YOU, DIEEEEEEEE!!!!!!!!!", 4.5),
			},
		},
	},
}

for _, voice in voices do
	for _, lines in voice.Lines do
		table.freeze(lines)
	end
	table.freeze(voice.Lines)
	table.freeze(voice)
end

return table.freeze({
	AllowProposed = false,
	MaxDistance = 100,
	MinDistance = 8,
	DefaultCooldown = 5,
	CategoryCooldowns = table.freeze({ Nearby = 18, Damaged = 8, PlayerDetected = 9, LostTarget = 12, MeleeHit = 8, Execution = 3 }),
	Voices = table.freeze(voices),
})
