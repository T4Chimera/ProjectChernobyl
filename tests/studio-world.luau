-- Run in Studio's SERVER Command Bar during Play after [Main] initialized.
local RunService = game:GetService("RunService")
assert(RunService:IsRunning() and RunService:IsServer(), "Use the Server context during Play.")
local shared = game:GetService("ReplicatedStorage").Shared
local services = game:GetService("ServerScriptService").Services
local mapConfig = require(shared.MapConfig)
local bosses = require(shared.BossConfig)
local executions = require(shared.ExecutionConfig)
local weapon = require(shared.WeaponConfig)
local enemies = require(services.EnemyService)
local map = workspace:FindFirstChild("ChernobylMap")
assert(map and map:GetAttribute("SectorCount") == 6, "Six-sector map did not initialize.")
local sectors, reactors, supplies, fixtures = 0, {}, 0, 0
for _, item in map:GetDescendants() do
	if item:IsA("Model") and item:GetAttribute("SectorId") then sectors += 1 end
	local number = item:GetAttribute("ReactorNumber")
	if number then
		assert(not reactors[number], "Duplicate reactor number.")
		reactors[number] = true
	end
	if item:IsA("Light") then
		fixtures += 1
		assert(not item.Enabled, "A facility light is on: " .. item:GetFullName())
	end
	if item:IsA("BasePart") and item:GetAttribute("AmmoSupply") then supplies += 1 end
end
assert(sectors == 6 and supplies == 7 and fixtures == 25, "Map sectors, supplies, or fixtures missing.")
for number = 1, 6 do assert(reactors[number], "Missing reactor " .. number) end
assert(mapConfig.Sectors[5].Status == "UNFINISHED" and mapConfig.Sectors[6].Status == "UNFINISHED")
local spawn = map:FindFirstChild("FoundationSpawn", true)
assert(spawn and spawn:IsA("SpawnLocation"), "Checkpoint spawn missing.")
local executionCount = 0
for id, definition in bosses do
	local state = enemies.GetSessionState(id)
	assert(state == "Spawned" or state == "Defeated", "Boss was never registered: " .. id)
	if state == "Spawned" then
		local model = enemies.GetBoss(id)
		assert(model and model.Humanoid.MaxHealth == definition.MaxHealth, "Boss HP differs: " .. id)
		assert(model:GetAttribute("PlaceholderRig"), "Expected explicit prototype rig label.")
	else
		assert(enemies.GetBoss(id) == nil, "Defeated boss returned as living: " .. id)
	end
	executionCount += #executions.Bosses[id]
end
assert(executionCount == 20, "Expected 20 execution variants.")
for _, player in game:GetService("Players"):GetPlayers() do
	local char = player.Character
	local h = char and char:FindFirstChildOfClass("Humanoid")
	assert(h and h.MaxHealth == 100 and not h.BreakJointsOnDeath, "Player health/body settings incorrect.")
	assert(player.RespawnLocation == spawn, "Player checkpoint respawn not registered.")
	if h.Health > 0 and not player:GetAttribute("ExecutionActive") then
		local rifle = char:FindFirstChild("PrototypeRifle")
		local lamp = rifle and rifle:FindFirstChild("PermanentFlashlight", true)
		assert(lamp and lamp:IsA("SpotLight") and lamp.Enabled, "Always-on world weapon light missing.")
		assert(player:GetAttribute("Weapon") == weapon.Id, "Weapon state missing.")
	end
end
print("[Studio world] PASS: six sectors/reactors, 25 lights off, seven supplies, eight boss states, 20 executions, player rifle lights.")
