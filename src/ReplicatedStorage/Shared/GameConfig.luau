--!strict
-- Confirmed health, factions, and respawn rules plus clearly provisional tuning.
local GameConfig = {
	DevelopmentName = "Project Chernobyl",
	Phase = 2,
	Milestone = "Six-sector gameplay prototype",
	InstanceWaitSeconds = 10,
	Player = table.freeze({
		MaxHealth = 100,
		WalkSpeed = 16,
		JumpPower = 50,
		RespawnTime = 5,
	}),
	Camera = table.freeze({
		FieldOfView = 75,
	}),
	Enemies = table.freeze({
		UniqueBossesRespawnInSession = false,
		OrdinaryInfectedRespawn = true,
	}),
	-- Names only: selection, uniforms, loadouts, and abilities are later work.
	TaskForces = table.freeze({ "Nu-7", "Epsilon-11", "Beta-7", "Zeta-9" }),
}

return table.freeze(GameConfig)
