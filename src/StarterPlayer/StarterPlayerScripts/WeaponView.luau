--!strict
-- A local procedural prototype rifle, not a replacement for creator weapon assets.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared:WaitForChild("WeaponConfig"))
local player = Players.LocalPlayer
local WeaponView = {}
WeaponView.__index = WeaponView

local function createPart(model: Model, name: string, size: Vector3, color: Color3): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = Enum.Material.Metal
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = false
	part.Parent = model
	return part
end

function WeaponView.new()
	local self = setmetatable({}, WeaponView)
	self.Model = Instance.new("Model")
	self.Model.Name = "ChernobylFirstPersonRifle"
	self.Parts = {}
	self.RecoilAmount = 0
	self.AimAlpha = 0
	self.ReloadStarted = 0
	self.WasReloading = false
	self.ReducedMotion = false
	self.Hidden = false
	local dark = Color3.fromRGB(34, 38, 37)
	local black = Color3.fromRGB(17, 20, 20)
	local function component(name: string, size: Vector3, offset: CFrame, color: Color3?)
		local part = createPart(self.Model, name, size, color or dark)
		table.insert(self.Parts, { Part = part, Offset = offset })
		return part
	end
	local receiver = component("Receiver", Vector3.new(0.22, 0.26, 0.9), CFrame.identity)
	self.Model.PrimaryPart = receiver
	component("Handguard", Vector3.new(0.2, 0.22, 0.63), CFrame.new(0, 0.01, -0.72))
	component("Barrel", Vector3.new(0.075, 0.075, 0.45), CFrame.new(0, 0.04, -1.22), black)
	component("Stock", Vector3.new(0.19, 0.3, 0.6), CFrame.new(0, 0, 0.67), black)
	component("Grip", Vector3.new(0.14, 0.35, 0.17), CFrame.new(0, -0.24, 0.28) * CFrame.Angles(math.rad(-15), 0, 0), black)
	component("Magazine", Vector3.new(0.17, 0.48, 0.26), CFrame.new(0, -0.3, -0.1) * CFrame.Angles(math.rad(7), 0, 0), black)
	component("RearSight", Vector3.new(0.035, 0.14, 0.065), CFrame.new(-0.065, 0.2, 0.18), black)
	component("RearSightRight", Vector3.new(0.035, 0.14, 0.065), CFrame.new(0.065, 0.2, 0.18), black)
	component("FrontSight", Vector3.new(0.035, 0.12, 0.045), CFrame.new(0, 0.2, -0.98), black)
	component("RightSleeve", Vector3.new(0.24, 0.29, 0.7), CFrame.new(0.27, -0.25, 0.52) * CFrame.Angles(0, math.rad(-20), 0), dark)
	component("LeftSleeve", Vector3.new(0.24, 0.29, 0.75), CFrame.new(-0.22, -0.24, -0.35) * CFrame.Angles(0, math.rad(22), 0), dark)
	local lamp = component("WeaponFlashlight", Vector3.new(0.12, 0.12, 0.29), CFrame.new(0.19, 0, -0.83), black)
	local beam = Instance.new("SpotLight")
	beam.Name = "PermanentFlashlight"
	beam.Face = Enum.NormalId.Front
	beam.Color = Color3.fromRGB(242, 248, 237)
	beam.Brightness = Config.FlashlightBrightness
	beam.Range = Config.FlashlightRange
	beam.Angle = Config.FlashlightAngle
	beam.Shadows = true
	beam.Enabled = true
	beam.Parent = lamp
	self.Beam = beam
	self.Muzzle = component("MuzzleFlash", Vector3.new(0.12, 0.12, 0.17), CFrame.new(0, 0.04, -1.49), Color3.fromRGB(255, 207, 121))
	self.Muzzle.Material = Enum.Material.Neon
	self.Muzzle.Transparency = 1
	return self
end

local function setWorldWeaponHidden(hidden: boolean)
	local character = player.Character
	if not character then return end
	for _, child in character:GetChildren() do
		if child:IsA("Tool") and (child:GetAttribute("WeaponId") == Config.Id or child.Name == Config.Id) then
			for _, descendant in child:GetDescendants() do
				if descendant:IsA("BasePart") then
					descendant.LocalTransparencyModifier = hidden and 1 or 0
				elseif descendant:IsA("SpotLight") and descendant.Name == "PermanentFlashlight" then
					-- The local first-person beam occupies the same weapon mount.
					-- Other clients still see the server's enabled world-weapon light.
					descendant.Enabled = not hidden
				end
			end
		end
	end
end

function WeaponView:Fire()
	self.RecoilAmount = math.min(self.RecoilAmount + 0.09, 0.2)
	self.MuzzleUntil = os.clock() + 0.035
end

function WeaponView:Step(delta: number, visible: boolean, aiming: boolean, reloading: boolean, moving: number)
	local camera = Workspace.CurrentCamera
	if not camera then return end
	if not visible then
		self.Model.Parent = nil
		setWorldWeaponHidden(false)
		self.Hidden = true
		return
	end
	self.Hidden = false
	if self.Model.Parent ~= camera then self.Model.Parent = camera end
	setWorldWeaponHidden(true)
	self.Beam.Enabled = true
	self.AimAlpha += ((aiming and 1 or 0) - self.AimAlpha) * math.min(1, delta * 12)
	if reloading and not self.WasReloading then self.ReloadStarted = os.clock() end
	self.WasReloading = reloading
	local reloadPhase = reloading and math.clamp((os.clock() - self.ReloadStarted) / Config.ReloadSeconds, 0, 1) or 0
	local reloadDip = math.sin(reloadPhase * math.pi)
	local time = os.clock()
	local sway = self.ReducedMotion and 0 or moving * (1 - self.AimAlpha * 0.8)
	local bob = CFrame.new(math.sin(time * 8) * 0.016 * sway, math.abs(math.cos(time * 8)) * 0.018 * sway, 0)
	local hip = CFrame.new(0.52, -0.53, -0.95)
	local aim = CFrame.new(0, -0.2, -0.85)
	local recoilOffset = self.ReducedMotion and 0 or self.RecoilAmount
	local base = camera.CFrame * hip:Lerp(aim, self.AimAlpha) * bob
		* CFrame.new(0, -reloadDip * 0.26, recoilOffset)
		* CFrame.Angles(math.rad(reloadDip * -18), 0, math.rad(reloadDip * 25))
	for _, entry in self.Parts do
		local offset = entry.Offset
		if entry.Part.Name == "Magazine" then offset *= CFrame.new(0, -reloadDip * 0.25, reloadDip * 0.08) end
		entry.Part.CFrame = base * offset
	end
	self.Muzzle.Transparency = os.clock() < (self.MuzzleUntil or 0) and 0.1 or 1
	self.RecoilAmount *= math.exp(-delta * 14)
end

function WeaponView:Destroy()
	setWorldWeaponHidden(false)
	self.Model:Destroy()
end

return WeaponView
