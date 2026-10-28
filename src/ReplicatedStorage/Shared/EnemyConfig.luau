--!strict
-- Combat values and ordinary-infected design are configurable PROTOTYPE tuning.
-- Confirmed boss identity/HP remain exclusively in BossConfig.
local config = {
	UpdateSeconds = 0.2,
	PathInterval = 2.2,
	MaxConcurrentPaths = 2,
	TargetMemorySeconds = 5,
	SearchSeconds = 8,
	HearingDistance = 18,
	SprintHearingDistance = 30,
	GunHearingDistance = 85,
	HomeTether = 145,
	CorpseSeconds = 5,
	KatyaSukhoiResponse = "Flee", -- "Fight" also supported; neither is universal canon.
	RelationshipRange = 45,
	KatyaPuddle = table.freeze({ Radius = 6, WarningSeconds = 1.2, Lifetime = 7, Damage = 6, TickSeconds = 0.8, Cooldown = 13 }),
	Infected = table.freeze({ MaxHealth = 90, WalkSpeed = 10, Damage = 12, AttackSeconds = 1.4, DetectionRange = 48, MeleeRange = 5, RespawnSeconds = 24 }),
	Bosses = {
		Felon = { WalkSpeed = 13, Damage = 8, AttackSeconds = 0.65, DetectionRange = 78, MeleeRange = 5, Ranged = true, WeaponName = "HK416", Range = 90, MeleeDamage = 18 },
		Sukhoi = { WalkSpeed = 14, Damage = 25, AttackSeconds = 1.6, DetectionRange = 62, MeleeRange = 6, WeaponName = "Axe" },
		Mikoyan = { WalkSpeed = 10, Damage = 22, AttackSeconds = 1.5, DetectionRange = 38, MeleeRange = 5, PeacefulUntilShotInRoom = true },
		Nikolai = { WalkSpeed = 11, Damage = 18, AttackSeconds = 1.5, DetectionRange = 52, MeleeRange = 6, WeaponName = "Axe", Partner = "Novak" },
		Novak = { WalkSpeed = 17, Damage = 24, AttackSeconds = 1.1, DetectionRange = 58, MeleeRange = 6, WeaponName = "Katana", Partner = "Nikolai" },
		John = { WalkSpeed = 12, Damage = 23, AttackSeconds = 1.5, DetectionRange = 64, MeleeRange = 5, Partner = "Jayden" },
		Jayden = { WalkSpeed = 13, Damage = 10, AttackSeconds = 0.9, DetectionRange = 72, MeleeRange = 5, Ranged = true, WeaponName = "Prototype firearm", Range = 80, MeleeDamage = 25, Partner = "John" },
		Katya = { WalkSpeed = 12, Damage = 27, AttackSeconds = 1.8, DetectionRange = 68, MeleeRange = 6, HasPuddle = true, HomeTether = 500 },
	},
}

for _, boss in config.Bosses do
	table.freeze(boss)
end
table.freeze(config.Bosses)
return table.freeze(config)
