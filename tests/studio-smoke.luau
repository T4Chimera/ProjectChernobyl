-- Paste into Studio's SERVER Command Bar during Play, after a player spawns.
-- This file is deliberately outside the Rojo tree; it never runs in production.
local RunService = game:GetService("RunService")
assert(RunService:IsRunning() and RunService:IsServer(), "Run in the Server context during Play.")

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared", 10)
assert(Shared, "Shared is missing; sync the project.")
local BossConfig = require(Shared.BossConfig)
local GameConfig = require(Shared.GameConfig)
local DamageService = require(game:GetService("ServerScriptService").Services.DamageService)
local expected = {
	Felon = { 1500, "____-FELON", "Miniboss" },
	Sukhoi = { 5000, "____-#SUKHOI#", "Megaboss" },
	Mikoyan = { 1500, "MIKOYAN___", "Miniboss" },
	Nikolai = { 1000, "___NIKOLAI##", "Miniboss" },
	Novak = { 1000, "##NOVAK___", "Miniboss" },
	John = { 2000, "CI_JOHN", "Miniboss" },
	Jayden = { 8000, "CI_JAYDEN", "Megaboss" },
	Katya = { 12000, "###_:(KATYA--", "Megaboss" },
}

local count = 0
for id, boss in BossConfig do
	local canon = expected[id]
	assert(canon and boss.Name == id and boss.MaxHealth == canon[1], "Wrong boss identity/HP: " .. id)
	assert(boss.NameTag == canon[2] and boss.Classification == canon[3], "Wrong tag/class: " .. id)
	assert(boss.NameTagColor == Color3.fromRGB(255, 0, 0), "Wrong tag color: " .. id)
	assert(boss.RespawnsInSession == false, "Boss respawn rule violated: " .. id)
	count += 1
end
assert(count == 8 and GameConfig.Player.MaxHealth == 100, "Registry count or player HP differs from canon.")
assert(#Players:GetPlayers() > 0, "Use Play, not Run; wait for a player to spawn.")
for _, player in Players:GetPlayers() do
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	assert(humanoid and humanoid.MaxHealth == 100, player.Name .. " is missing a 100-max-HP Humanoid.")
end

local rig = Instance.new("Model")
rig.Name = "Phase1SmokeTestRig"
local humanoid = Instance.new("Humanoid")
humanoid.RequiresNeck = false
humanoid.BreakJointsOnDeath = false
humanoid.MaxHealth = 100
humanoid.Health = 100
humanoid.Parent = rig
rig.Parent = workspace

local ok, problem = pcall(function()
	assert(DamageService.Damage(humanoid, 25) == 25 and humanoid.Health == 75, "Damage failed.")
	assert(DamageService.Heal(humanoid, 1000) == 25 and humanoid.Health == 100, "Healing cap failed.")
	assert(DamageService.Damage(humanoid, -1) == 0, "Negative damage accepted.")
	assert(DamageService.Damage(humanoid, math.huge) == 0, "Infinite damage accepted.")
	assert(DamageService.Damage(humanoid, 0 / 0) == 0, "NaN damage accepted.")
	local forceField = Instance.new("ForceField")
	forceField.Parent = rig
	assert(DamageService.Damage(humanoid, 10) == 0 and humanoid.Health == 100, "ForceField bypassed.")
	forceField:Destroy()
	assert(DamageService.GrantImmunity(humanoid, 0.1), "Immunity grant failed.")
	assert(DamageService.Damage(humanoid, 10) == 0, "Immunity failed.")
	task.wait(0.2)
	assert(DamageService.Damage(humanoid, 1000) == 100 and humanoid.Health == 0, "Lethal damage failed.")
	assert(DamageService.Heal(humanoid, 100) == 0 and humanoid.Health == 0, "Healing revived a dead Humanoid.")
end)
rig:Destroy()
assert(ok, tostring(problem))
print("[Studio smoke] PASS: 8 bosses, live player max HP, damage/healing/immunity, and ForceFields.")
