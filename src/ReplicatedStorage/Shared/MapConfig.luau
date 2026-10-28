--!strict
-- Fictionalized, walkable prototype; not an architectural survey of the plant.
-- Reactor 5 and 6 are unfinished construction zones rather than operating units.
local MapConfig = {
	Name = "ChernobylMap",
	SectorSize = Vector3.new(180, 24, 160),
	Checkpoint = CFrame.new(-365, 4, 0),
	Sectors = {
		{ Id = 1, Name = "REACTOR 1 / INTAKE", Reactor = 1, Status = "OFFLINE", Center = Vector3.new(-220, 0, 0), Accent = Color3.fromRGB(91, 126, 116) },
		{ Id = 2, Name = "REACTOR 2 / TURBINE HALL", Reactor = 2, Status = "OFFLINE", Center = Vector3.new(0, 0, 0), Accent = Color3.fromRGB(139, 123, 75) },
		{ Id = 3, Name = "REACTOR 3 / CONTROL", Reactor = 3, Status = "OFFLINE", Center = Vector3.new(220, 0, 0), Accent = Color3.fromRGB(91, 113, 145) },
		{ Id = 4, Name = "REACTOR 4 / INCIDENT ZONE", Reactor = 4, Status = "DESTROYED", Center = Vector3.new(-220, 0, 220), Accent = Color3.fromRGB(150, 75, 62) },
		{ Id = 5, Name = "REACTOR 5 / CONSTRUCTION", Reactor = 5, Status = "UNFINISHED", Center = Vector3.new(0, 0, 220), Accent = Color3.fromRGB(151, 111, 57) },
		{ Id = 6, Name = "REACTOR 6 / CONSTRUCTION", Reactor = 6, Status = "UNFINISHED", Center = Vector3.new(220, 0, 220), Accent = Color3.fromRGB(120, 101, 145) },
	},
	-- Root positions are four studs above the common ground/floor.
	BossSpawns = {
		Felon = CFrame.new(-250, 4, -45),
		Mikoyan = CFrame.new(-158, 4, 44),
		Nikolai = CFrame.new(-40, 4, 35),
		Novak = CFrame.new(55, 4, -50),
		John = CFrame.new(195, 4, 35),
		Sukhoi = CFrame.new(-250, 4, 265),
		Jayden = CFrame.new(-25, 4, 255),
		Katya = CFrame.new(195, 4, 255),
	},
	InfectedSpawns = {
		CFrame.new(-268, 4, 25), CFrame.new(-175, 4, -42),
		CFrame.new(35, 4, 38), CFrame.new(-55, 4, -48),
		CFrame.new(250, 4, 25), CFrame.new(170, 4, -45),
		CFrame.new(-195, 4, 240), CFrame.new(-270, 4, 170),
		CFrame.new(25, 4, 240), CFrame.new(-48, 4, 170),
		CFrame.new(245, 4, 240), CFrame.new(170, 4, 170),
	},
	MikoyanRoom = {
		Center = Vector3.new(-158, 10, 40),
		Size = Vector3.new(44, 20, 52),
	},
}

for _, sector in MapConfig.Sectors do table.freeze(sector) end
table.freeze(MapConfig.Sectors)
table.freeze(MapConfig.BossSpawns)
table.freeze(MapConfig.InfectedSpawns)
table.freeze(MapConfig.MikoyanRoom)
return table.freeze(MapConfig)
