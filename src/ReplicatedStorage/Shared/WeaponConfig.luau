--!strict
-- Prototype player rifle; this is not a final task-force loadout assignment.
return table.freeze({
	Id = "PrototypeRifle",
	MagazineSize = 30,
	ReserveAmmo = 240,
	Damage = 40,
	FireInterval = 0.12,
	ReloadSeconds = 2,
	Range = 350,
	AimFieldOfView = 55,
	FlashlightRange = 75,
	FlashlightBrightness = 4,
	FlashlightAngle = 65,
	-- Populate only with licensed, uploaded Roblox assets accessible to the game.
	SoundIds = table.freeze({ Fire = "", Reload = "", FootstepMetal = "" }),
})
