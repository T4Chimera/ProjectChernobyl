--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("WeaponConfig"))
local Rules = require(Shared.CombatRules)
local DamageService = require(script.Parent.DamageService)
local RateLimiter = require(script.Parent.RateLimiter)
local WeaponService = {}
local states = {}
local started = false
local hitHandler = nil
local limiter = RateLimiter.new(20, 15)
local supplyLimiter = RateLimiter.new(1, 0.5)
local tracked = {}
local remotes

local function publish(player: Player, state)
	local patch = {
		Ammo = state.Ammo, Reserve = state.Reserve,
		Reloading = state.ReloadUntil > 0, Weapon = Config.Id,
	}
	for key, value in patch do player:SetAttribute(key, value) end
	remotes.State:FireClient(player, patch)
end

local function aliveEquipped(player: Player)
	local character = player.Character
	if not character or player:GetAttribute("ExecutionActive") then return nil end
	local h = character:FindFirstChildOfClass("Humanoid")
	local head = character:FindFirstChild("Head")
	local tool = character:FindFirstChild("PrototypeRifle")
	if not h or h.Health <= 0 or not head or not head:IsA("BasePart") then return nil end
	if not tool or not tool:IsA("Tool") or tool:GetAttribute("WeaponId") ~= Config.Id then return nil end
	return character, h, head
end

local function part(tool, name, size, offset, color, handle)
	local p = Instance.new("Part")
	p.Name, p.Size, p.Color = name, size, color
	p.Material = Enum.Material.Metal
	p.Massless = true
	p.CanCollide, p.CanTouch, p.CanQuery = false, false, false
	p.CFrame = if handle then handle.CFrame * offset else CFrame.new()
	p.Parent = tool
	if handle then
		local weld = Instance.new("WeldConstraint")
		weld.Part0, weld.Part1, weld.Parent = handle, p, p
	end
	return p
end

local function makeRifle(): Tool
	local tool = Instance.new("Tool")
	tool.Name = "PrototypeRifle"
	tool.ToolTip = "Prototype rifle / permanent weapon light"
	tool.CanBeDropped = false
	tool:SetAttribute("WeaponId", Config.Id)
	local dark = Color3.fromRGB(37, 41, 40)
	local handle = part(tool, "Handle", Vector3.new(0.55, 0.65, 1.8), CFrame.new(), dark, nil)
	part(tool, "Stock", Vector3.new(0.45, 0.55, 1), CFrame.new(0, 0, 1.25), dark, handle)
	local barrel = part(tool, "Barrel", Vector3.new(0.2, 0.2, 1.9), CFrame.new(0, 0.1, -1.6), dark, handle)
	part(tool, "Magazine", Vector3.new(0.4, 0.8, 0.55), CFrame.new(0, -0.55, 0), dark, handle)
	local lamp = part(tool, "WeaponLamp", Vector3.new(0.25, 0.25, 0.5), CFrame.new(0.4, 0.1, -0.8), dark, handle)
	local light = Instance.new("SpotLight")
	light.Name = "PermanentFlashlight"
	light.Face = Enum.NormalId.Front
	light.Brightness, light.Range, light.Angle = Config.FlashlightBrightness, Config.FlashlightRange, Config.FlashlightAngle
	light.Shadows, light.Enabled = true, true
	light.Color = Color3.fromRGB(225, 236, 218)
	light.Parent = lamp
	local muzzle = Instance.new("Attachment")
	muzzle.Name, muzzle.Position, muzzle.Parent = "Muzzle", Vector3.new(0, 0, -barrel.Size.Z / 2), barrel
	tool.Grip = CFrame.new(0, -0.2, -0.55)
	return tool
end

local function equip(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid", 10)
	local backpack = player:WaitForChild("Backpack", 10)
	if not humanoid or not humanoid:IsA("Humanoid") or humanoid.Health <= 0 then return end
	if player.Character ~= character or player.Parent ~= Players or not backpack then return end
	if states[player] and states[player].Character == character then return end
	for _, holder in { character, backpack } do
		local old = holder:FindFirstChild("PrototypeRifle")
		if old then old:Destroy() end
	end
	local state = Rules.New(Config.MagazineSize, Config.ReserveAmmo)
	state.Character = character
	states[player] = state
	local tool = makeRifle()
	tool.Parent = backpack
	humanoid:EquipTool(tool)
	DamageService.GrantImmunity(humanoid, 3)
	publish(player, state)
	local unequipped
	unequipped = tool.Unequipped:Connect(function()
		task.defer(function()
			if player.Character == character and humanoid.Health > 0 and tool.Parent == backpack
				and not player:GetAttribute("ExecutionActive") then humanoid:EquipTool(tool) end
		end)
	end)
	tool.Destroying:Once(function() if unequipped then unequipped:Disconnect() end end)
end

local function findEnemy(instance: Instance)
	local candidate: Instance? = instance
	while candidate and candidate ~= workspace do
		if candidate:IsA("Model") and candidate:GetAttribute("Enemy") then
			return candidate, candidate:FindFirstChildOfClass("Humanoid")
		end
		candidate = candidate.Parent
	end
	return nil
end

local function fire(player: Player, direction)
	if typeof(direction) ~= "Vector3" then return end
	for _, value in { direction.X, direction.Y, direction.Z } do
		if value ~= value or math.abs(value) == math.huge then return end
	end
	if direction.Magnitude < 0.8 or direction.Magnitude > 1.2 then return end
	local character, _, head = aliveEquipped(player)
	local state = states[player]
	if not character or not state or state.Character ~= character then return end
	if not Rules.TryFire(state, os.clock(), Config.FireInterval) then return end
	local origin = head.Position
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { character }
	local ray = workspace:Raycast(origin, direction.Unit * Config.Range, params)
	local position = if ray then ray.Position else origin + direction.Unit * Config.Range
	local blood = false
	if ray then
		local enemy, humanoid = findEnemy(ray.Instance)
		if enemy and humanoid and humanoid.Health > 0 then
			blood = DamageService.Damage(humanoid, Config.Damage) > 0
			if blood and hitHandler then hitHandler(player, enemy) end
		end
	end
	character:SetAttribute("LastNoiseAt", workspace:GetServerTimeNow())
	character:SetAttribute("NoisePosition", origin)
	remotes.Effect:FireAllClients({ Kind = "Shot", Origin = origin, Position = position, Blood = blood, ShooterUserId = player.UserId })
	if blood then remotes.Effect:FireAllClients({ Kind = "Blood", Position = position, Amount = 4 }) end
	publish(player, state)
end

local function reload(player: Player)
	local character = aliveEquipped(player)
	local state = states[player]
	if not character or not state or state.Character ~= character then return end
	if not Rules.BeginReload(state, os.clock(), Config.ReloadSeconds, Config.MagazineSize) then return end
	publish(player, state)
	task.delay(Config.ReloadSeconds + 0.02, function()
		if states[player] ~= state or player.Character ~= character or player.Parent ~= Players then return end
		if Rules.CompleteReload(state, os.clock(), Config.MagazineSize) then publish(player, state) end
	end)
end

function WeaponService.SetHitHandler(callback)
	hitHandler = callback
end

function WeaponService.BindSupplies(mapRoot: Instance)
	for _, object in mapRoot:GetDescendants() do
		if object:IsA("BasePart") and object:GetAttribute("AmmoSupply") then
			local prompt = object:FindFirstChild("Resupply")
			if prompt and prompt:IsA("ProximityPrompt") then
				prompt.Triggered:Connect(function(player)
					local character = aliveEquipped(player)
					local root = character and character:FindFirstChild("HumanoidRootPart")
					local state = states[player]
					if not root or not state or (root.Position - object.Position).Magnitude > 14 then return end
					local head = character:FindFirstChild("Head")
					if not head or not head:IsA("BasePart") then return end
					local params = RaycastParams.new()
					params.FilterType = Enum.RaycastFilterType.Exclude
					params.FilterDescendantsInstances = { character }
					local obstruction = workspace:Raycast(head.Position, object.Position - head.Position, params)
					if obstruction and obstruction.Instance ~= object then return end
					if not supplyLimiter.Take(player, os.clock()) then return end
					state.Ammo, state.Reserve, state.ReloadUntil = Config.MagazineSize, Config.ReserveAmmo, 0
					publish(player, state)
				end)
			end
		end
	end
end

function WeaponService.Start(events: Folder)
	if started then return end
	started, remotes = true, events
	remotes.Action.OnServerEvent:Connect(function(player, action, value)
		if action ~= "Fire" and action ~= "Reload" then return end
		if not limiter.Take(player, os.clock()) then return end
		if action == "Fire" then fire(player, value) else reload(player) end
	end)
	local function track(player)
		if tracked[player] then return end
		tracked[player] = player.CharacterAdded:Connect(function(character) task.defer(equip, player, character) end)
		if player.Character then task.defer(equip, player, player.Character) end
	end
	Players.PlayerAdded:Connect(track)
	Players.PlayerRemoving:Connect(function(player)
		if tracked[player] then tracked[player]:Disconnect() end
		tracked[player] = nil
		states[player] = nil
		limiter.Forget(player)
		supplyLimiter.Forget(player)
	end)
	for _, player in Players:GetPlayers() do track(player) end
end

return WeaponService
