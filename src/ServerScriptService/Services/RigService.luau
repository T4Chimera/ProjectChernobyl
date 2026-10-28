--!strict
-- Asset-free R6 stand-ins. These are silhouette guides, not final character art.
local RigService = {}
local dark = Color3.fromRGB(22, 24, 28)
local black = Color3.fromRGB(8, 9, 11)
local white = Color3.fromRGB(190, 190, 180)

local function part(parent: Instance, name: string, size: Vector3, color: Color3, cf: CFrame): Part
	local object = Instance.new("Part")
	object.Name = name
	object.Size = size
	object.Color = color
	object.CFrame = cf
	object.TopSurface = Enum.SurfaceType.Smooth
	object.BottomSurface = Enum.SurfaceType.Smooth
	object.CanCollide = false
	object.Massless = true
	object.Parent = parent
	return object
end

local function joint(parent: Instance, name: string, p0: BasePart, p1: BasePart, c0: CFrame, c1: CFrame): Motor6D
	local motor = Instance.new("Motor6D")
	motor.Name = name
	motor.Part0 = p0
	motor.Part1 = p1
	motor.C0 = c0
	motor.C1 = c1
	motor.Parent = parent
	return motor
end

local function adorn(model: Model, body: BasePart, name: string, size: Vector3, offset: CFrame, color: Color3): Part
	local object = part(model, name, size, color, body.CFrame * offset)
	object.CanQuery = false
	object.CanTouch = false
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = body
	weld.Part1 = object
	weld.Parent = object
	return object
end

local function weapon(model: Model, arm: BasePart, kind: string)
	if kind == "Axe" then
		adorn(model, arm, "AxeHandle", Vector3.new(0.16, 3.6, 0.16), CFrame.new(0, -1, -0.35), Color3.fromRGB(68, 53, 37))
		adorn(model, arm, "AxeBlade", Vector3.new(1.05, 0.9, 0.2), CFrame.new(0.35, 0.5, -0.35), Color3.fromRGB(105, 105, 100))
	elseif kind == "Katana" then
		adorn(model, arm, "KatanaGrip", Vector3.new(0.18, 0.8, 0.2), CFrame.new(0, -0.9, -0.35), dark)
		adorn(model, arm, "KatanaBlade", Vector3.new(0.16, 3.1, 0.08), CFrame.new(0, -2.8, -0.35), Color3.fromRGB(165, 168, 170))
	else
		adorn(model, arm, kind, Vector3.new(0.45, 0.5, 2.8), CFrame.new(0, -0.65, -1.25), dark)
		adorn(model, arm, "RifleMagazine", Vector3.new(0.32, 0.7, 0.45), CFrame.new(0, -1.1, -1), black)
	end
end

function RigService.Create(id: string, spawn: CFrame, maxHealth: number, walkSpeed: number, weaponName: string?): Model
	local model = Instance.new("Model")
	model.Name = id
	model:SetAttribute("Enemy", true)
	model:SetAttribute("PlaceholderRig", true)
	local uniform = dark
	if id == "Mikoyan" or id == "Nikolai" then uniform = white end
	if id == "Infected" then uniform = Color3.fromRGB(60, 66, 54) end
	local root = part(model, "HumanoidRootPart", Vector3.new(2, 2, 1), dark, spawn)
	root.Transparency = 1
	root.Massless = false
	local torso = part(model, "Torso", Vector3.new(2, 2, 1), uniform, spawn)
	torso.CanCollide = true
	torso.Material = Enum.Material.Fabric
	local head = part(model, "Head", Vector3.new(2, 1, 1), black, spawn * CFrame.new(0, 1.5, 0))
	local rightArm = part(model, "Right Arm", Vector3.new(1, 2, 1), uniform, spawn * CFrame.new(1.5, 0, 0))
	local leftArm = part(model, "Left Arm", Vector3.new(1, 2, 1), uniform, spawn * CFrame.new(-1.5, 0, 0))
	local rightLeg = part(model, "Right Leg", Vector3.new(1, 2, 1), id == "Mikoyan" and white or dark, spawn * CFrame.new(0.5, -2, 0))
	local leftLeg = part(model, "Left Leg", Vector3.new(1, 2, 1), id == "Mikoyan" and white or dark, spawn * CFrame.new(-0.5, -2, 0))
	joint(root, "RootJoint", root, torso, CFrame.identity, CFrame.identity)
	joint(torso, "Neck", torso, head, CFrame.new(0, 1, 0), CFrame.new(0, -0.5, 0))
	joint(torso, "Right Shoulder", torso, rightArm, CFrame.new(1, 0.5, 0), CFrame.new(-0.5, 0.5, 0))
	joint(torso, "Left Shoulder", torso, leftArm, CFrame.new(-1, 0.5, 0), CFrame.new(0.5, 0.5, 0))
	joint(torso, "Right Hip", torso, rightLeg, CFrame.new(0.5, -1, 0), CFrame.new(0, 1, 0))
	joint(torso, "Left Hip", torso, leftLeg, CFrame.new(-0.5, -1, 0), CFrame.new(0, 1, 0))
	local humanoid = Instance.new("Humanoid")
	humanoid.Name = "Humanoid"
	humanoid.MaxHealth = maxHealth
	humanoid.Health = maxHealth
	humanoid.WalkSpeed = walkSpeed
	humanoid.BreakJointsOnDeath = false
	humanoid.HipHeight = 0
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	humanoid.Parent = model
	local animator = Instance.new("Animator")
	animator.Parent = humanoid
	model.PrimaryPart = root

	if id == "Nikolai" or id == "Novak" then
		adorn(model, head, "PermanentFaceRectangle", Vector3.new(2.16, 0.65, 0.12), CFrame.new(0, 0, -0.58), black)
		adorn(model, head, "Hood", Vector3.new(2.2, 0.4, 1.2), CFrame.new(0, 0.55, 0.1), uniform)
		if id == "Nikolai" then adorn(model, head, "BlackCap", Vector3.new(2.1, 0.2, 1.25), CFrame.new(0, 0.65, -0.15), black) end
	elseif id == "Katya" then
		head.Color = black
		torso.Color = black
		adorn(model, head, "Hair", Vector3.new(2.15, 2.3, 1.3), CFrame.new(0, -0.55, 0.3), black)
		adorn(model, head, "RedEye", Vector3.new(0.18, 0.18, 0.08), CFrame.new(-0.4, 0.1, -0.56), Color3.fromRGB(170, 28, 28))
		adorn(model, head, "WhitePupil", Vector3.new(0.1, 0.1, 0.08), CFrame.new(0.4, 0.1, -0.56), white)
		for side = -1, 1, 2 do
			local tentacle = part(model, "Tentacle" .. tostring(side), Vector3.new(0.25, 3.6, 0.25), black, torso.CFrame * CFrame.new(side * 1.1, -0.5, 0.75))
			joint(torso, "Tentacle" .. tostring(side), torso, tentacle, CFrame.new(side * 1.1, 0.5, 0.75), CFrame.new(0, 1, 0))
		end
	elseif id ~= "Infected" then
		adorn(model, torso, "TacticalVestPlaceholder", Vector3.new(2.15, 1.7, 1.25), CFrame.new(0, 0, 0), black)
		adorn(model, head, "HelmetPlaceholder", Vector3.new(2.12, 0.45, 1.2), CFrame.new(0, 0.4, 0), dark)
		if id == "John" or id == "Jayden" then
			adorn(model, torso, "WhiteEquipmentMarker", Vector3.new(0.8, 0.3, 0.08), CFrame.new(0, 0.45, -0.66), white)
			for side = -1, 1, 2 do
				adorn(model, head, "PurpleOptic", Vector3.new(0.3, 0.28, 0.3), CFrame.new(side * 0.4, 0.16, -0.63), Color3.fromRGB(125, 55, 160))
			end
		else
			adorn(model, head, "GasMaskPlaceholder", Vector3.new(1.15, 0.65, 0.35), CFrame.new(0, -0.18, -0.6), Color3.fromRGB(34, 38, 35))
			adorn(model, head, "DamagedOptic", Vector3.new(1.7, 0.18, 0.18), CFrame.new(0.1, 0.42, -0.65) * CFrame.Angles(0, 0, 0.14), dark)
		end
		if id == "Sukhoi" then
			local jaw = part(model, "MaskJaw", Vector3.new(0.95, 0.32, 0.35), dark, head.CFrame * CFrame.new(0, -0.4, -0.6))
			joint(head, "MaskJaw", head, jaw, CFrame.new(0, -0.25, -0.6), CFrame.new(0, 0.15, 0))
			for index = 1, 3 do
				local tentacle = part(model, "Tentacle" .. index, Vector3.new(0.28, 3.3, 0.28), black, torso.CFrame * CFrame.new((index - 2) * 0.65, -0.3, 0.8))
				joint(torso, "Tentacle" .. index, torso, tentacle, CFrame.new((index - 2) * 0.65, 0.7, 0.8), CFrame.new(0, 1, 0))
			end
		end
	end
	if weaponName then weapon(model, rightArm, weaponName) end
	return model
end

function RigService.SetHairAlert(model: Model, alert: boolean)
	local hair = model:FindFirstChild("Hair")
	if hair and hair:IsA("BasePart") then
		hair.Color = alert and black or Color3.fromRGB(203, 174, 97)
	end
end

return table.freeze(RigService)
