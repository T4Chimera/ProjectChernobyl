--!strict
-- Generates this prototype's own map only. No downloaded models or asset IDs.
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Config = require(ReplicatedStorage.Shared.MapConfig)
local MapService = {}
local context: any = nil

local concrete = Color3.fromRGB(67, 71, 71)
local steel = Color3.fromRGB(46, 52, 54)
local rust = Color3.fromRGB(91, 60, 43)
local black = Color3.fromRGB(19, 23, 24)
local paper = Color3.fromRGB(177, 170, 138)

local function part(parent: Instance, name: string, size: Vector3, cf: CFrame, color: Color3?, material: Enum.Material?): Part
	local object = Instance.new("Part")
	object.Name = name
	object.Size = size
	object.CFrame = cf
	object.Color = color or concrete
	object.Material = material or Enum.Material.Concrete
	object.Anchored = true
	object.TopSurface = Enum.SurfaceType.Smooth
	object.BottomSurface = Enum.SurfaceType.Smooth
	object.Parent = parent
	return object
end

local function sign(parent: Instance, name: string, cf: CFrame, size: Vector3, text: string, accent: Color3?)
	local plate = part(parent, name, size, cf, black, Enum.Material.Metal)
	plate.CanCollide = false
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 35
	gui.LightInfluence = 0.2
	gui.AlwaysOnTop = false
	gui.Parent = plate
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.TextColor3 = accent or paper
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextWrapped = true
	label.Text = text
	label.Parent = gui
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 6)
	padding.PaddingBottom = UDim.new(0, 6)
	padding.PaddingLeft = UDim.new(0, 9)
	padding.PaddingRight = UDim.new(0, 9)
	padding.Parent = label
	return plate
end

local function ammoSupply(parent: Instance, position: Vector3)
	local crate = part(parent, "AmmoSupply", Vector3.new(5, 3, 4), CFrame.new(position + Vector3.new(0, 1.5, 0)), Color3.fromRGB(64, 78, 55), Enum.Material.Metal)
	crate:SetAttribute("AmmoSupply", true)
	local band = part(parent, "CrateBand", Vector3.new(5.1, 0.3, 4.1), crate.CFrame, steel, Enum.Material.Metal)
	band.CanCollide, band.CanQuery = false, false
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "Resupply"
	prompt.ActionText = "Resupply"
	prompt.ObjectText = "Prototype ammunition"
	prompt.HoldDuration = 0.5
	prompt.MaxActivationDistance = 10
	prompt.RequiresLineOfSight = true
	prompt.Parent = crate
	-- WeaponService owns server-validated resupply behavior.
	return crate
end

local function fixture(parent: Instance, position: Vector3)
	local housing = part(parent, "UnpoweredFixture", Vector3.new(5, 0.5, 2), CFrame.new(position), steel, Enum.Material.Metal)
	local tube = part(parent, "DeadTube", Vector3.new(4.4, 0.2, 1.4), CFrame.new(position - Vector3.new(0, 0.3, 0)), Color3.fromRGB(81, 84, 79), Enum.Material.Glass)
	tube.CanCollide = false
	local light = Instance.new("SurfaceLight")
	light.Name = "FacilityLightOff"
	light.Face = Enum.NormalId.Bottom
	light.Enabled = false
	light.Brightness = 0
	light.Range = 18
	light.Parent = housing
end

local function slidingDoor(parent: Instance, cf: CFrame, startsOpen: boolean?)
	local door = part(parent, "MaintenanceDoor", Vector3.new(1.2, 12, 12), cf, steel, Enum.Material.Metal)
	door:SetAttribute("MapDoor", true)
	door:SetAttribute("Locked", false)
	local closed = cf
	local opened = cf + Vector3.new(0, 0, 13)
	local isOpen = startsOpen == true
	door.CFrame = if isOpen then opened else closed
	door.CanCollide = not isOpen
	door:SetAttribute("Open", isOpen)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = if isOpen then "Close" else "Open"
	prompt.ObjectText = "Unpowered manual door"
	prompt.HoldDuration = 0.3
	prompt.MaxActivationDistance = 10
	prompt.RequiresLineOfSight = false
	prompt.Parent = door
	-- The handle stays at the doorway even when the slab slides aside.
	local handle = part(parent, "DoorHandle", Vector3.new(0.4, 1, 0.4), cf + Vector3.new(-1, -1, -5), rust, Enum.Material.Metal)
	handle.Transparency = 1
	handle.CanCollide = false
	prompt.Parent = handle
	local busy = false
	prompt.Triggered:Connect(function(player: Player)
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if busy or door:GetAttribute("Locked") or player:GetAttribute("ExecutionActive") then return end
		if not root or not root:IsA("BasePart") or not humanoid or humanoid.Health <= 0 then return end
		if (root.Position - handle.Position).Magnitude > 13 then return end
		if isOpen then
			-- Do not shut a solid slab on a character standing in the opening.
			local overlap = OverlapParams.new()
			overlap.FilterType = Enum.RaycastFilterType.Exclude
			overlap.FilterDescendantsInstances = { parent }
			for _, touching in workspace:GetPartBoundsInBox(closed, Vector3.new(5, 12, 14), overlap) do
				local model = touching:FindFirstAncestorOfClass("Model")
				if model and model:FindFirstChildOfClass("Humanoid") then return end
			end
		end
		busy = true
		isOpen = not isOpen
		door.CanCollide = false
		door:SetAttribute("Open", isOpen)
		prompt.ActionText = if isOpen then "Close" else "Open"
		local tween = TweenService:Create(door, TweenInfo.new(0.65, Enum.EasingStyle.Quad), { CFrame = if isOpen then opened else closed })
		tween:Play()
		tween.Completed:Once(function()
			if door.Parent then door.CanCollide = not isOpen end
			busy = false
		end)
	end)
	return door
end

local function controlRoom(parent: Instance, center: Vector3, sectorId: number)
	local c = center + Vector3.new(62, 0, 40)
	part(parent, "ControlNorthWall", Vector3.new(44, 16, 1), CFrame.new(c + Vector3.new(0, 8, -26)), concrete)
	part(parent, "ControlSouthWall", Vector3.new(44, 16, 1), CFrame.new(c + Vector3.new(0, 8, 26)), concrete)
	part(parent, "ControlEastWall", Vector3.new(1, 16, 52), CFrame.new(c + Vector3.new(22, 8, 0)), concrete)
	-- East edge joins the outer wall; west side has a twelve-stud doorway.
	part(parent, "ControlWestWallA", Vector3.new(1, 16, 20), CFrame.new(c + Vector3.new(-22, 8, -16)), concrete)
	part(parent, "ControlWestWallB", Vector3.new(1, 16, 20), CFrame.new(c + Vector3.new(-22, 8, 16)), concrete)
	part(parent, "ControlDoorLintel", Vector3.new(1, 4, 12), CFrame.new(c + Vector3.new(-22, 14, 0)), concrete)
	part(parent, "ControlRoomCeiling", Vector3.new(44, 1, 52), CFrame.new(c + Vector3.new(0, 16.5, 0)), concrete)
	slidingDoor(parent, CFrame.new(c + Vector3.new(-22, 6, 0)), sectorId == 1)
	sign(parent, "ControlRoomSign", CFrame.new(c + Vector3.new(-23, 12, 0)) * CFrame.Angles(0, math.rad(90), 0), Vector3.new(12, 2, 0.2), if sectorId == 1 then "PERSONNEL ROOM" else "CONTROL ROOM")
	if sectorId == 1 then
		local desk = part(parent, "MikoyanDesk", Vector3.new(9, 0.6, 5), CFrame.new(c + Vector3.new(10, 3, -15)), rust, Enum.Material.Wood)
		for _, offset in { Vector3.new(-3, -1.5, -1), Vector3.new(3, -1.5, -1), Vector3.new(-3, -1.5, 1), Vector3.new(3, -1.5, 1) } do
			part(parent, "DeskLeg", Vector3.new(0.4, 3, 0.4), desk.CFrame + offset, steel, Enum.Material.Metal)
		end
		local letter = part(parent, "UntranscribedLetter", Vector3.new(1.6, 0.05, 1.1), desk.CFrame + Vector3.new(0, 0.35, 0), paper, Enum.Material.SmoothPlastic)
		letter:SetAttribute("LorePlaceholder", "Mikoyan's wife's letter: canonical contents await creator.")
		part(parent, "Seat", Vector3.new(3, 1, 3), CFrame.new(c + Vector3.new(0, 1, 4)), steel, Enum.Material.Metal)
		part(parent, "SeatBack", Vector3.new(3, 3, 0.5), CFrame.new(c + Vector3.new(0, 2.3, 5.3)), steel, Enum.Material.Metal)
		local memorial = Instance.new("Model")
		memorial.Name = "UnidentifiedPersonPlaceholder"
		memorial:SetAttribute("Identity", "Unresolved; do not assign an identity.")
		memorial.Parent = parent
		part(memorial, "CoveredSilhouette", Vector3.new(2.2, 0.8, 5.5), CFrame.new(c + Vector3.new(13, 0.7, 16)), Color3.fromRGB(43, 45, 42), Enum.Material.Fabric).CanCollide = false
	else
		for index = 1, 4 do
			local console = part(parent, "ControlConsole", Vector3.new(7, 4, 3), CFrame.new(c + Vector3.new(-12 + index * 8, 2, -21)), steel, Enum.Material.Metal)
			part(parent, "UnpoweredScreen", Vector3.new(5.8, 2.3, 0.2), console.CFrame + Vector3.new(0, 0.6, 1.6), black, Enum.Material.Glass).CanCollide = false
		end
		part(parent, "AbandonedTable", Vector3.new(10, 1, 5), CFrame.new(c + Vector3.new(8, 3, 14)), rust, Enum.Material.Wood)
	end
	fixture(parent, c + Vector3.new(0, 15.5, 0))
end

local function reactor(parent: Instance, center: Vector3, id: number)
	local core = center + Vector3.new(0, 0, -28)
	if id <= 4 then
		local base = part(parent, "Reactor" .. id, Vector3.new(7, 36, 36), CFrame.new(core + Vector3.new(0, 3.6, 0)) * CFrame.Angles(0, 0, math.pi / 2), steel, Enum.Material.Metal)
		base.Shape = Enum.PartType.Cylinder
		base:SetAttribute("ReactorNumber", id)
		local cap = part(parent, "ReactorLid", Vector3.new(1, 31, 31), CFrame.new(core + Vector3.new(0, 7.6, 0)) * CFrame.Angles(0, 0, math.pi / 2), if id == 4 then black else concrete, Enum.Material.Metal)
		cap.Shape = Enum.PartType.Cylinder
		for x = -2, 2 do
			for z = -2, 2 do
				if x * x + z * z < 6 then
					part(parent, "ControlChannel", Vector3.new(1.5, 0.4, 1.5), CFrame.new(core + Vector3.new(x * 4.5, 8.3, z * 4.5)), black, Enum.Material.Metal)
				end
			end
		end
		for _, side in { -1, 1 } do
			part(parent, "CoolantPipe", Vector3.new(3, 3, 30), CFrame.new(core + Vector3.new(side * 22, 2.2, -12)), rust, Enum.Material.Metal)
			part(parent, "ServicePlatform", Vector3.new(12, 1, 30), CFrame.new(core + Vector3.new(side * 29, 0.7, 5)), steel, Enum.Material.DiamondPlate)
		end
		if id == 4 then
			cap.CFrame = cap.CFrame * CFrame.Angles(math.rad(15), 0, math.rad(10))
			local random = Random.new(1986)
			for index = 1, 22 do
				local offset = Vector3.new(random:NextNumber(-34, 34), random:NextNumber(0.4, 2), random:NextNumber(-19, 19))
				local rubble = part(parent, "IncidentDebris", Vector3.new(random:NextNumber(1, 4), random:NextNumber(1, 3), random:NextNumber(1, 4)), CFrame.new(core + offset) * CFrame.Angles(random:NextNumber(), random:NextNumber(), random:NextNumber()), black)
				rubble.CanCollide = false
			end
			part(parent, "BentRoofBeam", Vector3.new(2, 2, 50), CFrame.new(core + Vector3.new(0, 18, 0)) * CFrame.Angles(math.rad(16), 0, math.rad(8)), rust, Enum.Material.Metal)
		end
	else
		local ring = part(parent, "UnfinishedReactor" .. id, Vector3.new(1, 36, 36), CFrame.new(core + Vector3.new(0, 0.8, 0)) * CFrame.Angles(0, 0, math.pi / 2), concrete)
		ring.Shape = Enum.PartType.Cylinder
		ring:SetAttribute("ReactorNumber", id)
		ring:SetAttribute("Unfinished", true)
		for _, offset in { Vector3.new(-20, 12, -20), Vector3.new(20, 12, -20), Vector3.new(-20, 12, 20), Vector3.new(20, 12, 20) } do
			part(parent, "UnfinishedSupport", Vector3.new(2, 24, 2), CFrame.new(core + offset), rust, Enum.Material.Metal)
		end
		part(parent, "CraneCrossbeam", Vector3.new(54, 3, 3), CFrame.new(core + Vector3.new(0, 25, 0)), Color3.fromRGB(111, 89, 43), Enum.Material.Metal)
		part(parent, "CraneCable", Vector3.new(0.2, 12, 0.2), CFrame.new(core + Vector3.new(id == 5 and -8 or 8, 18, 0)), black, Enum.Material.Metal).CanCollide = false
		for index = 1, 5 do
			part(parent, "ConstructionStack", Vector3.new(5, 1, 18), CFrame.new(center + Vector3.new(-55, index, -40)), concrete)
		end
	end
	sign(parent, "ReactorIdentifier", CFrame.new(center + Vector3.new(0, 14, -78.7)) * CFrame.Angles(0, math.pi, 0), Vector3.new(24, 5, 0.3), "REACTOR " .. id .. (id >= 5 and "\nUNFINISHED" or "\nOFFLINE"))
end

local function sector(parent: Instance, definition: any)
	local model = Instance.new("Model")
	model.Name = "Sector" .. definition.Id
	model:SetAttribute("SectorId", definition.Id)
	model:SetAttribute("SectorName", definition.Name)
	model:SetAttribute("SectorCenter", definition.Center)
	model:SetAttribute("SectorSize", Config.SectorSize)
	model:SetAttribute("Reactor", definition.Reactor)
	model:SetAttribute("Status", definition.Status)
	model.Parent = parent
	local center = definition.Center
	part(model, "SectorFloor", Vector3.new(180, 0.2, 160), CFrame.new(center + Vector3.new(0, 0.1, 0)), concrete)
	-- All four boundaries have central 16-stud openings. No sector is a sealed box.
	for _, side in { -1, 1 } do
		for _, half in { -1, 1 } do
			part(model, "OuterWallEW", Vector3.new(2, 24, 72), CFrame.new(center + Vector3.new(side * 90, 12, half * 44)), concrete)
			part(model, "OuterWallNS", Vector3.new(82, 24, 2), CFrame.new(center + Vector3.new(half * 49, 12, side * 80)), concrete)
		end
		part(model, "DoorwayLintelEW", Vector3.new(2, 10, 16), CFrame.new(center + Vector3.new(side * 90, 19, 0)), steel, Enum.Material.Metal)
		part(model, "DoorwayLintelNS", Vector3.new(16, 10, 2), CFrame.new(center + Vector3.new(0, 19, side * 80)), steel, Enum.Material.Metal)
	end
	if definition.Id <= 3 then
		part(model, "MainRoof", Vector3.new(180, 1, 160), CFrame.new(center + Vector3.new(0, 24.5, 0)), concrete)
	elseif definition.Id == 4 then
		part(model, "BrokenRoofWest", Vector3.new(42, 1, 160), CFrame.new(center + Vector3.new(-69, 24.5, 0)), concrete)
		part(model, "BrokenRoofEast", Vector3.new(42, 1, 160), CFrame.new(center + Vector3.new(69, 24.5, 0)), concrete)
	else
		for _, x in { -70, -35, 0, 35, 70 } do
			part(model, "OpenRoofFrame", Vector3.new(2, 2, 160), CFrame.new(center + Vector3.new(x, 24, 0)), rust, Enum.Material.Metal)
		end
	end
	for _, x in { -72, 72 } do
		for _, z in { -58, 58 } do
			part(model, "SupportColumn", Vector3.new(3, 24, 3), CFrame.new(center + Vector3.new(x, 12, z)), steel, Enum.Material.Metal)
		end
	end
	for _, x in { -40, 0, 40 } do
		fixture(model, center + Vector3.new(x, 22.8, 22))
	end
	controlRoom(model, center, definition.Id)
	reactor(model, center, definition.Id)
	for _, index in { 1, 2, 3 } do
		local position = center + Vector3.new(-66, 1.5, 14 + index * 9)
		if definition.Id == 2 then
			part(model, "TurbineHousing", Vector3.new(10, 5, 6), CFrame.new(position + Vector3.new(0, 1, 0)), steel, Enum.Material.Metal)
		elseif definition.Id == 3 then
			part(model, "RelayCabinet", Vector3.new(4, 6, 5), CFrame.new(position + Vector3.new(0, 1.5, 0)), steel, Enum.Material.Metal)
		else
			part(model, "AbandonedCrate", Vector3.new(5, 3, 5), CFrame.new(position), rust, Enum.Material.WoodPlanks)
		end
	end
	-- Signs are reflective text panels, not emissive or active light sources.
	sign(model, "SectorEntranceSign", CFrame.new(center + Vector3.new(0, 12, 81.2)) * CFrame.Angles(0, math.pi, 0), Vector3.new(24, 4, 0.3), "SECTOR " .. definition.Id .. "\n" .. definition.Name, definition.Accent)
	sign(model, "SectorInteriorSign", CFrame.new(center + Vector3.new(0, 12, 77.8)), Vector3.new(22, 3, 0.3), "SECTOR " .. definition.Id .. " / ALL LIGHTS OFF", definition.Accent)
	ammoSupply(model, center + Vector3.new(-18, 0.3, 67))
	return model
end

local function walkway(parent: Instance, from: Vector3, to: Vector3)
	local delta = to - from
	local length = delta.Magnitude
	local center = (from + to) / 2
	part(parent, "ConnectingWalkway", Vector3.new(16, 0.2, length), CFrame.lookAt(center + Vector3.new(0, 0.1, 0), to + Vector3.new(0, 0.1, 0)), steel, Enum.Material.DiamondPlate)
	-- Floor stripes and low barriers leave all junctions and entrances open.
	local right = delta.Unit:Cross(Vector3.yAxis)
	for _, side in { -1, 1 } do
		local offset = right * (side * 7.5)
		part(parent, "WalkwayStripe", Vector3.new(0.3, 0.03, length), CFrame.lookAt(center + offset + Vector3.new(0, 0.23, 0), to + offset + Vector3.new(0, 0.23, 0)), Color3.fromRGB(129, 112, 65), Enum.Material.SmoothPlastic).CanCollide = false
	end
end

function MapService.Build()
	if context and context.Root.Parent then return context end
	assert(not workspace:FindFirstChild(Config.Name), "[MapService] ChernobylMap already exists outside this generator; rename it before generating the prototype.")
	local root = Instance.new("Model")
	root.Name = Config.Name
	root:SetAttribute("GeneratedPrototype", true)
	root:SetAttribute("SectorCount", 6)
	root:SetAttribute("FacilityLightsOn", false)
	part(root, "PlantGround", Vector3.new(820, 2, 520), CFrame.new(-20, -1, 110), Color3.fromRGB(39, 43, 39), Enum.Material.Asphalt)
	for _, definition in Config.Sectors do sector(root, definition) end
	for row = 0, 1 do
		for column = 0, 1 do
			walkway(root, Vector3.new(-130 + column * 220, 0, row * 220), Vector3.new(-90 + column * 220, 0, row * 220))
		end
	end
	for column = 0, 2 do
		walkway(root, Vector3.new(-220 + column * 220, 0, 80), Vector3.new(-220 + column * 220, 0, 140))
	end
	walkway(root, Vector3.new(-390, 0, 0), Vector3.new(-310, 0, 0))
	local checkpoint = Instance.new("Model")
	checkpoint.Name = "FoundationCheckpoint"
	checkpoint.Parent = root
	part(checkpoint, "CheckpointCanopy", Vector3.new(42, 1, 34), CFrame.new(-365, 13, 0), steel, Enum.Material.Metal)
	for _, z in { -15, 15 } do
		part(checkpoint, "CheckpointWall", Vector3.new(42, 12, 1), CFrame.new(-365, 6, z), concrete)
	end
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "FoundationSpawn"
	spawn.Size = Vector3.new(8, 0.3, 8)
	spawn.Position = Vector3.new(-365, 0.35, 0)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Material = Enum.Material.Metal
	spawn.Color = steel
	spawn.TopSurface = Enum.SurfaceType.Smooth
	spawn.BottomSurface = Enum.SurfaceType.Smooth
	spawn.Parent = checkpoint
	sign(checkpoint, "CheckpointBriefing", CFrame.new(-365, 6, -14.3) * CFrame.Angles(0, math.pi, 0), Vector3.new(32, 6, 0.3), "SCP FOUNDATION / FIELD CHECKPOINT\n6 SECTORS / REACTORS 1-6\nFACILITY POWER OFF / WEAPON LIGHT REQUIRED")
	sign(checkpoint, "PrototypeNotice", CFrame.new(-365, 3, 14.3), Vector3.new(30, 3, 0.3), "FICTIONALIZED PROTOTYPE\nREACTORS 5-6: UNFINISHED CONSTRUCTION")
	ammoSupply(checkpoint, Vector3.new(-354, 0.2, -8))
	fixture(checkpoint, Vector3.new(-365, 12, 0))
	-- Low ambient provides silhouettes; no facility luminaire emits light.
	Lighting.ClockTime = 0
	Lighting.Brightness = 0
	Lighting.Ambient = Color3.fromRGB(12, 14, 18)
	Lighting.OutdoorAmbient = Color3.fromRGB(18, 21, 27)
	Lighting.EnvironmentDiffuseScale = 0.1
	Lighting.EnvironmentSpecularScale = 0.1
	Lighting.ExposureCompensation = -0.1
	Lighting.GlobalShadows = true
	Lighting.FogColor = Color3.fromRGB(15, 19, 24)
	Lighting.FogStart = 130
	Lighting.FogEnd = 480
	root.Parent = workspace
	context = {
		Root = root,
		BossSpawns = Config.BossSpawns,
		InfectedSpawns = Config.InfectedSpawns,
		MikoyanRoom = Config.MikoyanRoom,
	}
	print("[MapService] Generated six connected dark sectors; reactors 5/6 are unfinished prototype construction zones.")
	return context
end

return MapService
