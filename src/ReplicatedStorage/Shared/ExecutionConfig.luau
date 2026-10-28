--!strict
-- Intact-body adaptations of the creator's requested takedowns. Blood is only
-- a small stylized effect: no body splitting, severing, wounds, or injury detail.
-- All timings are prototype values. Each beat has a distinct procedural pose.
local function beat(at, pose, victimPose, effect)
	return { At = at, Pose = pose, VictimPose = victimPose, Effect = effect }
end
local function variant(id, duration, beats)
	return { Id = id, Duration = duration, Beats = beats }
end

local ExecutionConfig = {
	MaxVictimHealth = 25,
	Range = 7,
	Bosses = {
		Felon = {
			variant("Felon_KickAndShot", 2.6, {
				beat(0, "Windup", "Guard"), beat(0.45, "Strike", "Stagger", "Blood"),
				beat(1.0, "Kick", "Down"), beat(1.65, "Fire", "Down", "Shot"),
			}),
			variant("Felon_RifleAndBurst", 2.8, {
				beat(0, "Guard", "Guard"), beat(0.4, "Strike", "Stagger", "Blood"),
				beat(1.1, "Burst", "Stagger", "Shot"), beat(1.35, "Fire", "Stagger", "Shot"),
				beat(1.6, "Burst", "Down", "Shot"),
			}),
		},
		Sukhoi = {
			variant("Sukhoi_AppendageAndSlam", 3.6, {
				beat(0, "Windup", "Guard"), beat(0.55, "Grab", "Stagger", "Blood"),
				beat(1.0, "Slam", "Down"), beat(1.4, "Grab", "Down"),
				beat(2.9, "Kick", "Down"),
			}),
			variant("Sukhoi_LiftAndStrikes", 3.7, {
				beat(0, "Grab", "Stagger"), beat(0.5, "Lift", "Stagger"), beat(1.0, "Slam", "Down"),
				beat(1.5, "Strike", "Down", "Blood"), beat(1.85, "Windup", "Down"),
				beat(2.0, "Strike", "Down"), beat(2.25, "Windup", "Down"),
				beat(2.4, "Strike", "Down"), beat(2.65, "Windup", "Down"), beat(2.8, "Strike", "Down"),
			}),
			variant("Sukhoi_KnockdownAndPin", 3.5, {
				beat(0, "Windup", "Guard"), beat(0.45, "Strike", "Down", "Blood"),
				beat(0.9, "Grab", "Down"), beat(2.55, "Windup", "Down"), beat(2.85, "Strike", "Down"),
			}),
		},
		Mikoyan = {
			variant("Mikoyan_TwoStrikes", 2.1, {
				beat(0, "Windup", "Guard"), beat(0.45, "Strike", "Stagger", "Blood"),
				beat(0.95, "Windup", "Stagger"), beat(1.35, "Strike", "Down"),
			}),
			variant("Mikoyan_GrabAndCollapse", 2.6, {
				beat(0, "Grab", "Guard"), beat(0.7, "Lift", "Stagger"),
				beat(1.25, "Slam", "Down", "Blood"), beat(1.85, "Guard", "Down"),
			}),
			variant("Mikoyan_KickAndStrike", 2.4, {
				beat(0, "Guard", "Guard"), beat(0.4, "Kick", "Down"),
				beat(1.0, "Windup", "Down"), beat(1.5, "Strike", "Down", "Blood"),
			}),
		},
		Nikolai = {
			variant("Nikolai_AxeCombination", 2.5, {
				beat(0, "Windup", "Guard"), beat(0.6, "Strike", "Stagger", "Blood"),
				beat(1.15, "Windup", "Stagger"), beat(1.7, "Strike", "Down"),
			}),
			variant("Nikolai_KickAndAxe", 2.7, {
				beat(0, "Guard", "Guard"), beat(0.5, "Kick", "Down"),
				beat(1.2, "Windup", "Down"), beat(1.85, "Strike", "Down", "Blood"),
			}),
		},
		Novak = {
			variant("Novak_BladeAndStrike", 1.9, {
				beat(0, "Guard", "Guard"), beat(0.35, "Strike", "Stagger", "Blood"),
				beat(0.8, "Windup", "Stagger"), beat(1.15, "Strike", "Down"),
			}),
			variant("Novak_RapidBladeFlurry", 2.0, {
				beat(0, "Windup", "Guard"), beat(0.25, "Strike", "Stagger", "Blood"),
				beat(0.45, "Throw", "Stagger"), beat(0.65, "Strike", "Stagger"),
				beat(0.85, "Throw", "Stagger"), beat(1.05, "Strike", "Down"),
			}),
		},
		John = {
			variant("John_HeavyStrike", 1.9, {
				beat(0, "Windup", "Guard"), beat(0.65, "Strike", "Down", "Blood"),
				beat(1.2, "Guard", "Down"),
			}),
			variant("John_StrikeAndThrow", 2.8, {
				beat(0, "Windup", "Guard"), beat(0.45, "Strike", "Stagger", "Blood"),
				beat(1.0, "Grab", "Stagger"), beat(1.6, "Throw", "Down"),
			}),
		},
		Jayden = {
			variant("Jayden_ShotAndKnockdown", 2.5, {
				beat(0, "Fire", "Stagger", "Shot"), beat(0.65, "Strike", "Down"),
				beat(1.45, "Fire", "Down", "Shot"),
			}),
			variant("Jayden_StrikeAndDoubleShot", 2.7, {
				beat(0, "Windup", "Guard"), beat(0.5, "Strike", "Stagger", "Blood"),
				beat(1.2, "Fire", "Stagger", "Shot"), beat(1.55, "Burst", "Down", "Shot"),
			}),
		},
		Katya = {
			variant("Katya_GrabAndCollapse", 2.7, {
				beat(0, "Grab", "Guard"), beat(0.7, "Lift", "Stagger"),
				beat(1.4, "Throw", "Down", "Blood"),
			}),
			variant("Katya_PinAndKick", 3.5, {
				beat(0, "Strike", "Down"), beat(0.55, "Grab", "Down"),
				beat(1.1, "Slam", "Down", "Blood"), beat(2.2, "Grab", "Down"), beat(2.8, "Kick", "Down"),
			}),
			variant("Katya_RestraintAndCollapse", 2.5, {
				beat(0, "Grab", "Guard"), beat(0.65, "Guard", "Stagger"),
				beat(1.25, "Throw", "Down"), beat(1.8, "Idle", "Down"),
			}),
			variant("Katya_StrikeAndKick", 2.6, {
				beat(0, "Windup", "Guard"), beat(0.55, "Strike", "Stagger", "Blood"),
				beat(1.2, "Kick", "Down"), beat(1.85, "Guard", "Down"),
			}),
		},
	},
}

local function freezeDeep(value)
	for _, child in value do
		if type(child) == "table" then freezeDeep(child) end
	end
	table.freeze(value)
end
freezeDeep(ExecutionConfig)
return ExecutionConfig
