--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local ContextActionService = game:GetService("ContextActionService")
local UserInputService = game:GetService("UserInputService")
local StarterGui = game:GetService("StarterGui")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")
local Workspace = game:GetService("Workspace")
local player = Players.LocalPlayer

local function requiredChild(parent: Instance, name: string): Instance
	local child = parent:WaitForChild(name, 20)
	assert(child, string.format("[ClientMain] Missing %s.%s; check project synchronization and server Output.", parent.Name, name))
	return child
end

local Shared = requiredChild(ReplicatedStorage, "Shared")
local Remotes = requiredChild(ReplicatedStorage, "Remotes")
local WeaponConfig = require(requiredChild(Shared, "WeaponConfig") :: ModuleScript)
local ClientConfig = require(requiredChild(Shared, "ClientConfig") :: ModuleScript)
local BossConfig = require(requiredChild(Shared, "BossConfig") :: ModuleScript)
local CameraController = require(script.Parent.CameraController)
local HUDController = require(script.Parent.HUDController)
local WeaponView = require(script.Parent.WeaponView)
local actionRemote = requiredChild(Remotes, "Action") :: RemoteEvent
local stateRemote = requiredChild(Remotes, "State") :: RemoteEvent
local effectRemote = requiredChild(Remotes, "Effect") :: RemoteEvent
local subtitleRemote = requiredChild(Remotes, "Subtitle") :: RemoteEvent
local executionRemote = requiredChild(Remotes, "Execution") :: RemoteEvent

local connections: { RBXScriptConnection } = {}
local state: { [string]: any } = {}
local firing = false
local aiming = false
local sprinting = false
local crouching = false
local nextFire = 0
local scanAt = 0
local stepAt = 0
local effectCount = 0
local destroyed = false
local view = WeaponView.new()
local effects = Instance.new("Folder")
effects.Name = "ChernobylLocalEffects"
effects.Parent = Workspace
local hud: any

local function setMoveMode()
	local mode = crouching and "Crouch" or (sprinting and "Sprint" or "Walk")
	actionRemote:FireServer("MoveMode", mode)
	CameraController.SetCrouching(crouching)
end

local function canAct(): boolean
	return CameraController.IsAlive() and not CameraController.IsCinematic()
		and not hud:IsMenuOpen() and UserInputService:GetFocusedTextBox() == nil
end

hud = HUDController.new(function(force)
	firing = false
	aiming = false
	CameraController.SetAiming(false)
	actionRemote:FireServer("SelectTaskForce", force)
end, function(settings)
	view.ReducedMotion = settings.ReducedMotion
	CameraController.SetReducedMotion(settings.ReducedMotion)
end)
CameraController.Start(executionRemote)

-- The equipped rifle cannot be dropped or switched in this prototype.
task.spawn(function()
	for _ = 1, 8 do
		if pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false) end) then return end
		task.wait(0.25)
	end
	warn("[ClientMain] Could not hide the default Backpack UI; the server still maintains the rifle.")
end)

local function playSound(assetId: string, volume: number)
	if assetId == "" then return end
	local camera = Workspace.CurrentCamera
	if not camera then return end
	local sound = Instance.new("Sound")
	sound.SoundId = assetId
	sound.Volume = volume
	sound.Parent = camera
	sound:Play()
	Debris:AddItem(sound, 6)
end

local function patchState(patch)
	if typeof(patch) ~= "table" then return end
	local wasReloading = state.Reloading
	for key, value in patch do state[key] = value end
	if state.Reloading and not wasReloading then playSound(WeaponConfig.SoundIds.Reload, 0.5) end
	hud:SetState(patch)
end

local attributeNames = { "Ammo", "Reserve", "Reloading", "Weapon", "TaskForce", "MoveMode" }
for _, name in attributeNames do
	local value = player:GetAttribute(name)
	if value ~= nil then state[name] = value end
	table.insert(connections, player:GetAttributeChangedSignal(name):Connect(function()
		local current = player:GetAttribute(name)
		if current ~= nil then patchState({ [name] = current }) end
	end))
end
hud:SetState(state)
table.insert(connections, stateRemote.OnClientEvent:Connect(patchState))
table.insert(connections, subtitleRemote.OnClientEvent:Connect(function(payload)
	if typeof(payload) == "table" then hud:ShowSubtitle(payload) end
end))

local function visualPart(size: Vector3, color: Color3, position: CFrame, lifetime: number): Part?
	if effectCount >= ClientConfig.MaximumLocalEffects then return nil end
	effectCount += 1
	local part = Instance.new("Part")
	part.Name = "LocalEffect"
	part.Size = size
	part.Color = color
	part.CFrame = position
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.CastShadow = false
	part.Material = Enum.Material.Neon
	part.Parent = effects
	Debris:AddItem(part, lifetime)
	task.delay(lifetime, function() effectCount = math.max(0, effectCount - 1) end)
	return part
end

local function inEffectRange(position: Vector3): boolean
	local camera = Workspace.CurrentCamera
	return camera ~= nil and (position - camera.CFrame.Position).Magnitude <= ClientConfig.EffectDisplayDistance
end

local function bloodSpecks(position: Vector3)
	if not hud.Settings.Blood or not inEffectRange(position) then return end
	-- Brief abstract red specks only: no wounds, body alteration, or gore decals.
	for _ = 1, 5 do
		local spread = Vector3.new((math.random() - 0.5) * 0.8, math.random() * 0.7, (math.random() - 0.5) * 0.8)
		local part = visualPart(Vector3.new(0.07, 0.07, 0.07), Color3.fromRGB(125, 33, 31), CFrame.new(position + spread * 0.2), 0.25)
		if part then
			part.Material = Enum.Material.SmoothPlastic
			TweenService:Create(part, TweenInfo.new(0.22), { Position = position + spread - Vector3.new(0, 0.5, 0), Transparency = 1 }):Play()
		end
	end
end

table.insert(connections, effectRemote.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then return end
	if payload.Kind == "Shot" and typeof(payload.Origin) == "Vector3" and typeof(payload.Position) == "Vector3" then
		if not inEffectRange(payload.Origin) then return end
		local length = (payload.Position - payload.Origin).Magnitude
		if length > 0.1 and length < 1000 then
			visualPart(Vector3.new(0.035, 0.035, length), Color3.fromRGB(240, 208, 128), CFrame.lookAt((payload.Position + payload.Origin) * 0.5, payload.Position), 0.055)
		end
		if payload.Blood then bloodSpecks(payload.Position) end
		if payload.ShooterUserId == player.UserId and payload.Blood then hud:ConfirmHit() end
	elseif payload.Kind == "Blood" and typeof(payload.Position) == "Vector3" then
		bloodSpecks(payload.Position)
	elseif payload.Kind == "Hazard" and typeof(payload.Position) == "Vector3" then
		if inEffectRange(payload.Position) then hud:Notify("ANOMALOUS LIQUID  /  KEEP CLEAR", 2) end
	elseif payload.Kind == "BossDefeated" and typeof(payload.BossId) == "string" then
		local boss = BossConfig[payload.BossId]
		if boss then hud:Notify(boss.NameTag .. "  /  DEFEATED FOR THIS SERVER SESSION", 5) end
	end
end))

local function bind(name: string, title: string, touch: boolean, position: UDim2, callback, ...)
	ContextActionService:BindAction(name, callback, touch, ...)
	if touch then
		ContextActionService:SetTitle(name, title)
		ContextActionService:SetPosition(name, position)
	end
end

bind("ChernobylFire", "FIRE", true, UDim2.new(1, -90, 1, -280), function(_, inputState)
	if hud:IsMenuOpen() then firing = false; return Enum.ContextActionResult.Pass end
	if inputState == Enum.UserInputState.Begin then firing = canAct()
	elseif inputState == Enum.UserInputState.End or inputState == Enum.UserInputState.Cancel then firing = false end
	return Enum.ContextActionResult.Sink
end, Enum.UserInputType.MouseButton1, Enum.KeyCode.ButtonR2)

bind("ChernobylAim", "AIM", true, UDim2.new(1, -170, 1, -225), function(_, inputState, input)
	if hud:IsMenuOpen() then aiming = false; CameraController.SetAiming(false); return Enum.ContextActionResult.Pass end
	if inputState == Enum.UserInputState.Begin and canAct() then
		if input.UserInputType == Enum.UserInputType.Touch then aiming = not aiming else aiming = true end
		if aiming then sprinting = false; setMoveMode() end
	elseif inputState == Enum.UserInputState.End and input.UserInputType ~= Enum.UserInputType.Touch then
		aiming = false
	elseif inputState == Enum.UserInputState.Cancel then aiming = false end
	CameraController.SetAiming(aiming)
	return Enum.ContextActionResult.Sink
end, Enum.UserInputType.MouseButton2, Enum.KeyCode.ButtonL2)

bind("ChernobylReload", "RELOAD", true, UDim2.new(1, -90, 1, -190), function(_, inputState)
	if inputState == Enum.UserInputState.Begin and canAct() and not state.Reloading then
		actionRemote:FireServer("Reload")
	end
	return Enum.ContextActionResult.Sink
end, Enum.KeyCode.R, Enum.KeyCode.ButtonX)

bind("ChernobylSprint", "SPRINT", true, UDim2.new(1, -245, 1, -185), function(_, inputState, input)
	if inputState == Enum.UserInputState.Begin and canAct() then
		if input.UserInputType == Enum.UserInputType.Touch then sprinting = not sprinting else sprinting = true end
		if sprinting then crouching = false; aiming = false; CameraController.SetAiming(false) end
	elseif inputState == Enum.UserInputState.End and input.UserInputType ~= Enum.UserInputType.Touch then sprinting = false
	elseif inputState == Enum.UserInputState.Cancel then sprinting = false end
	setMoveMode()
	return Enum.ContextActionResult.Sink
end, Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3)

bind("ChernobylCrouch", "CROUCH", true, UDim2.new(1, -170, 1, -145), function(_, inputState)
	if inputState == Enum.UserInputState.Begin and canAct() then
		crouching = not crouching
		if crouching then sprinting = false end
		setMoveMode()
	end
	return Enum.ContextActionResult.Sink
end, Enum.KeyCode.C, Enum.KeyCode.ButtonB)

bind("ChernobylMenu", "MENU", false, UDim2.new(), function(_, inputState)
	if inputState == Enum.UserInputState.Begin and not UserInputService:GetFocusedTextBox() then
		firing = false
		aiming = false
		sprinting = false
		CameraController.SetAiming(false)
		setMoveMode()
		hud:ToggleMenu()
	end
	return Enum.ContextActionResult.Sink
end, Enum.KeyCode.M, Enum.KeyCode.ButtonSelect)

table.insert(connections, UserInputService.WindowFocusReleased:Connect(function()
	firing = false
	aiming = false
	sprinting = false
	CameraController.SetAiming(false)
	setMoveMode()
end))

table.insert(connections, player.CharacterAdded:Connect(function()
	firing = false
	aiming = false
	sprinting = false
	crouching = false
	nextFire = 0
	view.WasReloading = false
	CameraController.SetAiming(false)
	CameraController.SetCrouching(false)
end))

local function scanWorld()
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root or not root:IsA("BasePart") then hud:SetBoss(nil); return end
	local closest: Model? = nil
	local distance = ClientConfig.BossDisplayDistance
	local enemies = Workspace:FindFirstChild("Enemies")
	local camera = Workspace.CurrentCamera
	if enemies and camera then
		local parameters = RaycastParams.new()
		parameters.FilterType = Enum.RaycastFilterType.Exclude
		parameters.FilterDescendantsInstances = { character, effects, view.Model }
		for _, model in enemies:GetChildren() do
			local body = model:FindFirstChildOfClass("Humanoid")
			local enemyRoot = model:FindFirstChild("HumanoidRootPart")
			if model:IsA("Model") and model:GetAttribute("BossId") and body and body.Health > 0 and enemyRoot and enemyRoot:IsA("BasePart") then
				local separation = (enemyRoot.Position - root.Position).Magnitude
				if separation < distance then
					local _, onScreen = camera:WorldToViewportPoint(enemyRoot.Position)
					local hit = Workspace:Raycast(camera.CFrame.Position, enemyRoot.Position - camera.CFrame.Position, parameters)
					if onScreen and (not hit or hit.Instance:IsDescendantOf(model)) then closest = model; distance = separation end
				end
			end
		end
	end
	hud:SetBoss(closest)
	local name = nil
	local map = Workspace:FindFirstChild("ChernobylMap")
	if map then
		for _, sector in map:GetChildren() do
			local center = sector:GetAttribute("SectorCenter")
			local size = sector:GetAttribute("SectorSize")
			if typeof(center) == "Vector3" and typeof(size) == "Vector3" then
				local relative = root.Position - center
				if math.abs(relative.X) <= size.X * 0.5 and math.abs(relative.Z) <= size.Z * 0.5 then
					name = tostring(sector:GetAttribute("SectorName"))
					break
				end
			end
		end
	end
	hud:SetSector(name)
end

RunService:BindToRenderStep("ChernobylPresentation", Enum.RenderPriority.Camera.Value + 2, function(delta)
	if destroyed then return end
	local camera = Workspace.CurrentCamera
	local character = player.Character
	local body = character and character:FindFirstChildOfClass("Humanoid")
	local alive = CameraController.IsAlive()
	local cinematic = CameraController.IsCinematic()
	local canFire = firing and canAct() and not state.Reloading and (tonumber(state.Ammo) or 0) > 0
	if canFire and camera and os.clock() >= nextFire then
		nextFire = os.clock() + WeaponConfig.FireInterval
		-- A direction is the only client hit data. Server owns origin, cast,
		-- rate limit, ammunition, damage, and all affected targets.
		actionRemote:FireServer("Fire", camera.CFrame.LookVector)
		view:Fire()
		CameraController.Recoil()
		playSound(WeaponConfig.SoundIds.Fire, 0.6)
	end
	if cinematic or not alive or hud:IsMenuOpen() then
		firing = false
		if aiming then aiming = false; CameraController.SetAiming(false) end
	end
	local moving = body and body.MoveDirection.Magnitude or 0
	view:Step(math.min(delta, 0.1), alive and not cinematic, aiming, state.Reloading == true, moving)
	hud:SetCinematic(cinematic, alive)
	if body then hud:SetHealth(body.Health, body.MaxHealth) end
	if body and alive and moving > 0.5 and body.FloorMaterial ~= Enum.Material.Air and os.clock() >= stepAt then
		stepAt = os.clock() + (state.MoveMode == "Sprint" and 0.3 or 0.48)
		playSound(WeaponConfig.SoundIds.FootstepMetal, 0.16)
	end
	if os.clock() >= scanAt then scanAt = os.clock() + 0.2; scanWorld() end
end)

script.Destroying:Connect(function()
	destroyed = true
	RunService:UnbindFromRenderStep("ChernobylPresentation")
	for _, name in { "Fire", "Aim", "Reload", "Sprint", "Crouch", "Menu" } do
		ContextActionService:UnbindAction("Chernobyl" .. name)
	end
	for _, connection in connections do connection:Disconnect() end
	CameraController.Destroy()
	view:Destroy()
	hud:Destroy()
	effects:Destroy()
	pcall(function() StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, true) end)
end)
