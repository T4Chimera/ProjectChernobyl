--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local shared = ReplicatedStorage:WaitForChild("Shared", 10)
assert(shared, "[Main] Shared is missing; sync default.project.json.")
local GameConfig = require(shared.GameConfig)
local BossConfig = require(shared.BossConfig)
local Services = script.Parent.Services

local remotes = ReplicatedStorage:FindFirstChild("Remotes")
if not remotes then
	remotes = Instance.new("Folder")
	remotes.Name, remotes.Parent = "Remotes", ReplicatedStorage
end
for _, name in { "Action", "State", "Effect", "Subtitle", "Execution" } do
	local event = remotes:FindFirstChild(name)
	if not event then
		event = Instance.new("RemoteEvent")
		event.Name, event.Parent = name, remotes
	end
	assert(event:IsA("RemoteEvent"), "[Main] Remotes." .. name .. " must be a RemoteEvent.")
end

-- Map generation precedes NPC spawning and player equipment.
local context = require(Services.MapService).Build()
local VoiceService = require(Services.VoiceService)
local AnimationService = require(Services.AnimationService)
local ExecutionService = require(Services.ExecutionService)
local WeaponService = require(Services.WeaponService)
local EnemyService = require(Services.EnemyService)
VoiceService.Start(remotes)
AnimationService.Start()
ExecutionService.Start(remotes)
local spawn = context.Root:FindFirstChild("FoundationSpawn", true)
assert(spawn and spawn:IsA("SpawnLocation"), "[Main] Map is missing FoundationSpawn.")
require(Services.PlayerService).Start(GameConfig.Player, GameConfig.InstanceWaitSeconds, spawn)
require(Services.TaskForceService).Start(remotes)
WeaponService.SetHitHandler(EnemyService.OnShot)
WeaponService.Start(remotes)
WeaponService.BindSupplies(context.Root)
EnemyService.Start(context, remotes)

local count = 0
for _, boss in BossConfig do
	assert(boss.RespawnsInSession == false, "[Main] Unique bosses cannot respawn in this session.")
	count += 1
end
assert(count == 8, "[Main] Expected eight canonical bosses.")
print(string.format("[Main] %s initialized: six sectors, %d unique bosses, weapon lights enabled.", GameConfig.Milestone, count))
