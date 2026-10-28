--!nonstrict
-- Server-owned, bounded prototype AI. Unique encounter lifetime is independent
-- of every player's spawn/leave/task-force lifecycle.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local PathfindingService = game:GetService("PathfindingService")
local Shared = ReplicatedStorage:WaitForChild("Shared", 10)
assert(Shared, "[EnemyService] Missing Shared modules; sync the Rojo project.")
local BossConfig = require(Shared.BossConfig)
local Config = require(Shared.EnemyConfig)
local SessionRegistry = require(Shared.SessionRegistry)
local RigService = require(script.Parent.RigService)
local DamageService = require(script.Parent.DamageService)
local VoiceService = require(script.Parent.VoiceService)
local AnimationService = require(script.Parent.AnimationService)
local ExecutionService = require(script.Parent.ExecutionService)

local EnemyService = {}
local bossIds = { "Felon", "Sukhoi", "Mikoyan", "Nikolai", "Novak", "John", "Jayden", "Katya" }
local registry = SessionRegistry.new(bossIds)
local records = {}
local byModel = {}
local bosses = {}
local hazards = {}
local started = false
local pathJobs = 0
local context = nil
local remotes = nil
local container = nil
local rng = Random.new()

local function isInsideRoom(position)
	local room = context.MikoyanRoom
	local delta = position - room.Center
	return math.abs(delta.X) <= room.Size.X / 2
		and math.abs(delta.Y) <= room.Size.Y / 2
		and math.abs(delta.Z) <= room.Size.Z / 2
end

local function living(model)
	if not model or not model.Parent then return nil, nil end
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local root = model:FindFirstChild("HumanoidRootPart")
	if not humanoid or humanoid.Health <= 0 or not root then return nil, nil end
	return humanoid, root
end

local function rayParameters(exclusions)
	local parameters = RaycastParams.new()
	parameters.FilterType = Enum.RaycastFilterType.Exclude
	parameters.FilterDescendantsInstances = exclusions
	return parameters
end

local function canSee(record, target)
	local _, targetRoot = living(target)
	if not targetRoot then return false end
	local head = record.Model:FindFirstChild("Head")
	local targetHead = target:FindFirstChild("Head")
	local origin = head and head.Position or record.Root.Position
	local destination = targetHead and targetHead.Position or targetRoot.Position
	local delta = destination - origin
	if delta.Magnitude < 0.01 then return true end
	local result = Workspace:Raycast(origin, delta, rayParameters({ record.Model }))
	return result == nil or result.Instance:IsDescendantOf(target)
end

local function setState(record, state)
	if record.State == state then return end
	local previous = record.State
	record.State = state
	record.Model:SetAttribute("State", state)
	if record.Id == "Mikoyan" then
		if state == "Peaceful" then
			AnimationService.Play(record.Model, "Sit", 3600)
		elseif previous == "Peaceful" then
			AnimationService.Play(record.Model, "Idle", 0.15)
		end
	end
	if record.Id == "Katya" then
		RigService.SetHairAlert(record.Model, state ~= "Idle" and state ~= "Patrol" and state ~= "Search")
	end
end

local function blood(position)
	remotes.Effect:FireAllClients({ Kind = "Blood", Position = position, Blood = "Stylized" })
end

local function walkIsUnobstructed(record, destination)
	local delta = Vector3.new(destination.X - record.Root.Position.X, 0, destination.Z - record.Root.Position.Z)
	if delta.Magnitude < 0.1 then return true end
	local right = Vector3.new(-delta.Z, 0, delta.X).Unit * 0.7
	local exclusions = { record.Model }
	if record.Target then table.insert(exclusions, record.Target) end
	local parameters = rayParameters(exclusions)
	parameters.RespectCanCollide = true
	-- Head-level vision can see over crates; knee/body rays test walk clearance.
	for _, offset in { Vector3.new(0, -1.4, 0), right, -right } do
		if Workspace:Raycast(record.Root.Position + offset, delta, parameters) then return false end
	end
	return true
end

local function move(record, destination, direct)
	if record.Model:GetAttribute("Executing") or record.Humanoid.Health <= 0 then return end
	if record.Id == "Mikoyan" then
		local room = context.MikoyanRoom
		local low = room.Center - room.Size / 2 + Vector3.new(3, 1, 3)
		local high = room.Center + room.Size / 2 - Vector3.new(3, 1, 3)
		destination = Vector3.new(math.clamp(destination.X, low.X, high.X), record.Home.Position.Y, math.clamp(destination.Z, low.Z, high.Z))
	else
		local delta = destination - record.Home.Position
		local tether = record.Settings.HomeTether or Config.HomeTether
		if delta.Magnitude > tether then destination = record.Home.Position + delta.Unit * tether end
	end
	record.DesiredPosition = destination
	local now = os.clock()
	if (record.Root.Position - record.ProgressPosition).Magnitude > 1.5 then
		record.ProgressPosition = record.Root.Position
		record.ProgressAt = now
	elseif direct and (record.Root.Position - destination).Magnitude > 5 and now - record.ProgressAt > 1.6 then
		record.ForcePathUntil = now + 3.5
		record.ProgressAt = now
	end
	if direct and (now < record.ForcePathUntil or not walkIsUnobstructed(record, destination)) then direct = false end
	if direct then
		record.Waypoints = nil
		record.Humanoid:MoveTo(destination)
		return
	end
	if not record.PathPending and now >= record.NextPath and pathJobs < Config.MaxConcurrentPaths then
		record.PathPending = true
		record.NextPath = now + Config.PathInterval
		pathJobs += 1
		local origin = record.Root.Position
		local token = record.PathToken + 1
		record.PathToken = token
		task.spawn(function()
			local path = PathfindingService:CreatePath({ AgentRadius = 2.1, AgentHeight = 6, AgentCanJump = true, WaypointSpacing = 5 })
			local ok = pcall(function() path:ComputeAsync(origin, destination) end)
			local points = ok and path.Status == Enum.PathStatus.Success and path:GetWaypoints() or nil
			path:Destroy()
			pathJobs -= 1
			record.PathPending = false
			if record.Dead or not record.Model.Parent or record.PathToken ~= token
				or record.Model:GetAttribute("Executing") then return end
			if (record.DesiredPosition - destination).Magnitude > 18 then return end
			if points then
				record.Waypoints = points
				record.WaypointIndex = 2
			else
				record.Waypoints = nil
			end
		end)
	end
	local points = record.Waypoints
	local point = points and points[record.WaypointIndex]
	if point and (record.Root.Position - point.Position).Magnitude < 3 then
		record.WaypointIndex += 1
		point = points[record.WaypointIndex]
	end
	if point then
		if point.Action == Enum.PathWaypointAction.Jump then record.Humanoid.Jump = true end
		record.Humanoid:MoveTo(point.Position)
	else
		-- Waiting for a path must not supply a through-wall target to the NPC.
		record.Humanoid:MoveTo(record.Root.Position)
	end
end

local function eligiblePlayer(record, player)
	if player:GetAttribute("ExecutionActive") then return nil, nil end
	local humanoid, root = living(player.Character)
	if not humanoid or player.Character:FindFirstChildOfClass("ForceField") then return nil, nil end
	if record.Id == "Mikoyan" then
		if not record.ProvokedPlayers[player.UserId] or not isInsideRoom(root.Position) then return nil, nil end
	end
	if (root.Position - record.Home.Position).Magnitude > (record.Settings.HomeTether or Config.HomeTether) then return nil, nil end
	return humanoid, root
end

local function findPlayerTarget(record, players)
	local best, bestPlayer, bestDistance, heard = nil, nil, record.Settings.DetectionRange, nil
	for _, player in players do
		local humanoid, root = eligiblePlayer(record, player)
		if root then
			local delta = root.Position - record.Root.Position
			local distance = delta.Magnitude
			local noiseAt = player.Character:GetAttribute("LastNoiseAt")
			local noisePosition = player.Character:GetAttribute("NoisePosition")
			if typeof(noiseAt) == "number" and typeof(noisePosition) == "Vector3"
				and Workspace:GetServerTimeNow() - noiseAt < 2
				and (noisePosition - record.Root.Position).Magnitude < Config.GunHearingDistance then
				heard = noisePosition
			end
			if distance < bestDistance and distance > 0.01 then
				local inView = distance < 12 or record.Root.CFrame.LookVector:Dot(delta.Unit) > -0.15
				if inView and canSee(record, player.Character) then
					best, bestPlayer, bestDistance = player.Character, player, distance
				else
					local hearing = player:GetAttribute("MoveMode") == "Sprint" and Config.SprintHearingDistance or Config.HearingDistance
					local velocity = root.AssemblyLinearVelocity
					local moving = Vector2.new(velocity.X, velocity.Z).Magnitude > 2 or humanoid.MoveDirection.Magnitude > 0.1
					if moving and distance < hearing then heard = root.Position end
				end
			end
		end
	end
	return best, bestPlayer, heard
end

local function nearestOrdinary(record)
	local best, distance = nil, 35
	for _, other in records do
		if not other.Boss and not other.Dead then
			local delta = (other.Root.Position - record.Root.Position).Magnitude
			if delta < distance and canSee(record, other.Model) then best, distance = other.Model, delta end
		end
	end
	return best
end

local function attack(record, target, targetPlayer, distance)
	local now = os.clock()
	if now < record.NextAttack then return end
	local targetHumanoid, targetRoot = living(target)
	if not targetHumanoid or (targetPlayer and not eligiblePlayer(record, targetPlayer)) then return end
	if not canSee(record, target) then return end
	local ranged = record.Settings.Ranged and distance > record.Settings.MeleeRange
	if ranged and distance > record.Settings.Range then return end
	if not ranged and distance > record.Settings.MeleeRange then return end
	record.NextAttack = now + record.Settings.AttackSeconds
	setState(record, "Attack")
	if not ranged and record.Boss and targetPlayer and ExecutionService.TryStart(record.Model, targetPlayer, record.Id) then
		return
	end
	if ranged then
		local facing = Vector3.new(targetRoot.Position.X, record.Root.Position.Y, targetRoot.Position.Z)
		if (facing - record.Root.Position).Magnitude > 0.1 then record.Root.CFrame = CFrame.lookAt(record.Root.Position, facing) end
		AnimationService.Play(record.Model, "Fire", 0.3)
		local origin = record.Model.Head.Position
		local desired = target:FindFirstChild("Head")
		local direction = ((desired and desired.Position or targetRoot.Position) - origin).Unit
		local result = Workspace:Raycast(origin, direction * record.Settings.Range, rayParameters({ record.Model }))
		local position = result and result.Position or origin + direction * record.Settings.Range
		remotes.Effect:FireAllClients({ Kind = "Shot", Origin = origin, Position = position, BossId = record.Id })
		if result and result.Instance:IsDescendantOf(target) then
			if DamageService.Damage(targetHumanoid, record.Settings.Damage) > 0 then blood(position) end
		end
	else
		AnimationService.Play(record.Model, "Attack", 0.6)
		-- Wind-up gives the victim time to evade; validate again when the hit lands.
		task.delay(0.32, function()
			if record.Dead or record.Model:GetAttribute("Executing") then return end
			local humanoid, root = living(target)
			if not humanoid or (targetPlayer and not eligiblePlayer(record, targetPlayer)) then return end
			if (root.Position - record.Root.Position).Magnitude > record.Settings.MeleeRange + 0.8 or not canSee(record, target) then return end
			local damage = record.Settings.MeleeDamage or record.Settings.Damage
			if DamageService.Damage(humanoid, damage) > 0 then
				blood(root.Position)
				if record.Boss then VoiceService.Play(record.Model, record.Id, "MeleeHit") end
			end
		end)
	end
end

local function puddle(record, destination)
	local settings = Config.KatyaPuddle
	if os.clock() < record.NextPuddle then return end
	record.NextPuddle = os.clock() + settings.Cooldown
	local exclusions = { container }
	for _, player in Players:GetPlayers() do
		if player.Character then table.insert(exclusions, player.Character) end
	end
	local hit = Workspace:Raycast(destination + Vector3.new(0, 4, 0), Vector3.new(0, -14, 0), rayParameters(exclusions))
	if not hit then return end
	local position = hit.Position + Vector3.new(0, 0.08, 0)
	local object = Instance.new("Part")
	object.Name = "KatyaPuddleWarning"
	object.Shape = Enum.PartType.Cylinder
	object.Size = Vector3.new(0.12, settings.Radius * 2, settings.Radius * 2)
	object.CFrame = CFrame.new(position) * CFrame.Angles(0, 0, math.pi / 2)
	object.Anchored = true
	object.CanCollide = false
	object.CanQuery = false
	object.CanTouch = false
	object.Color = Color3.fromRGB(120, 35, 35)
	object.Material = Enum.Material.Neon
	object.Transparency = 0.4
	object:SetAttribute("Hazard", true)
	object.Parent = context.Root
	local now = os.clock()
	table.insert(hazards, { Part = object, Position = position, ActiveAt = now + settings.WarningSeconds,
		ExpiresAt = now + settings.WarningSeconds + settings.Lifetime, NextTick = now + settings.WarningSeconds, Active = false })
	remotes.Effect:FireAllClients({ Kind = "Hazard", Position = position, Duration = settings.WarningSeconds })
	AnimationService.Play(record.Model, "Attack", 0.9)
	VoiceService.Play(record.Model, record.Id, "SpecialAttack")
end

local function updateHazards(players)
	local now = os.clock()
	for index = #hazards, 1, -1 do
		local hazard = hazards[index]
		if now >= hazard.ExpiresAt or not hazard.Part.Parent then
			hazard.Part:Destroy()
			table.remove(hazards, index)
		else
			if now >= hazard.ActiveAt and not hazard.Active then
				hazard.Active = true
				hazard.Part.Name = "KatyaInfectedLiquid"
				hazard.Part.Color = Color3.fromRGB(8, 8, 10)
				hazard.Part.Material = Enum.Material.SmoothPlastic
				hazard.Part.Transparency = 0.15
			end
			if hazard.Active and now >= hazard.NextTick then
				hazard.NextTick = now + Config.KatyaPuddle.TickSeconds
				for _, player in players do
					local humanoid, root = living(player.Character)
					if humanoid and not player:GetAttribute("ExecutionActive") then
						local delta = root.Position - hazard.Position
						if math.abs(delta.Y) <= 6 and Vector2.new(delta.X, delta.Z).Magnitude <= Config.KatyaPuddle.Radius then
							DamageService.Damage(humanoid, Config.KatyaPuddle.Damage)
						end
					end
				end
			end
		end
	end
end

local function relationTarget(record)
	if record.Id == "Katya" then
		local sukhoi = bosses.Sukhoi
		if sukhoi and not sukhoi.Dead and (sukhoi.Root.Position - record.Root.Position).Magnitude < Config.RelationshipRange and canSee(record, sukhoi.Model) then
			return sukhoi.Model
		end
	elseif record.Id == "Sukhoi" then
		local katya = bosses.Katya
		if katya and not katya.Dead and (katya.Root.Position - record.Root.Position).Magnitude < Config.RelationshipRange and canSee(record, katya.Model) then
			if Config.KatyaSukhoiResponse == "Fight" then return katya.Model end
			local away = record.Root.Position - katya.Root.Position
			local direction = away.Magnitude > 0.01 and away.Unit or record.Root.CFrame.LookVector
			setState(record, "Flee")
			move(record, record.Root.Position + direction * 20, false)
			return false
		end
	end
	return nil
end

local function update(record, players)
	if record.Dead or not record.Model.Parent or record.Humanoid.Health <= 0 then return end
	if record.Model:GetAttribute("Executing") then return end
	local now = os.clock()
	if record.Id == "Katya" and record.SpawnHairAt and now >= record.SpawnHairAt then
		record.SpawnHairAt = nil
		RigService.SetHairAlert(record.Model, false)
	end
	if record.Settings.Partner then
		local partner = bosses[record.Settings.Partner]
		if partner and not partner.Dead and (partner.Root.Position - record.Root.Position).Magnitude < 24 and canSee(record, partner.Model) then
			record.Model:SetAttribute("RecognizedPartner", record.Settings.Partner)
		end
	end
	if record.Id == "Mikoyan" and next(record.ProvokedPlayers) == nil then
		setState(record, "Peaceful")
		record.Humanoid:MoveTo(record.Root.Position)
		return
	end
	local relation = relationTarget(record)
	if relation == false then return end
	local target, targetPlayer, heard = findPlayerTarget(record, players)
	if relation then target, targetPlayer = relation, nil end
	if record.Id == "Felon" and not target then target = nearestOrdinary(record) end
	if target then
		local _, targetRoot = living(target)
		if record.Target ~= target then
			record.Target = target
			record.TargetPlayer = targetPlayer
			if record.Boss then VoiceService.Play(record.Model, record.Id, "PlayerDetected") end
		end
		record.TargetPlayer = targetPlayer
		record.LastSeen = now
		record.LastKnown = targetRoot.Position
		record.LostVoicePlayed = false
		local distance = (targetRoot.Position - record.Root.Position).Magnitude
		if record.Settings.HasPuddle and distance < 34 then puddle(record, targetRoot.Position) end
		local attackRange = record.Settings.Ranged and record.Settings.Range or record.Settings.MeleeRange
		if distance <= attackRange then
			attack(record, target, targetPlayer, distance)
			if distance > record.Settings.MeleeRange + 1 and record.Settings.Ranged then
				record.Humanoid:MoveTo(record.Root.Position)
			else
				move(record, targetRoot.Position, true)
			end
		else
			setState(record, "Chase")
			move(record, targetRoot.Position, true)
		end
		return
	end
	if record.Target then
		local stillEligible = not record.TargetPlayer or eligiblePlayer(record, record.TargetPlayer)
		local targetAlive = living(record.Target)
		if not targetAlive or not stillEligible or now - record.LastSeen > Config.TargetMemorySeconds then
			record.Target = nil
			record.TargetPlayer = nil
		end
		if not record.LostVoicePlayed and record.Boss then
			VoiceService.Play(record.Model, record.Id, "LostTarget")
			record.LostVoicePlayed = true
		end
	end
	if record.LastKnown and now - record.LastSeen < Config.SearchSeconds then
		setState(record, "Search")
		move(record, record.LastKnown, false)
		return
	end
	if heard then
		record.LastKnown = heard
		record.LastSeen = now - Config.TargetMemorySeconds
		setState(record, "Investigate")
		move(record, heard, false)
		return
	end
	if (record.Root.Position - record.Home.Position).Magnitude > 12 then
		setState(record, "Return")
		move(record, record.Home.Position, false)
	else
		setState(record, record.Id == "Mikoyan" and "Peaceful" or "Patrol")
		if record.Id ~= "Mikoyan" and now >= record.NextPatrol then
			record.NextPatrol = now + rng:NextNumber(5, 9)
			local destination = record.Home.Position + Vector3.new(rng:NextNumber(-8, 8), 0, rng:NextNumber(-8, 8))
			record.PatrolPosition = destination
		end
		if record.PatrolPosition then move(record, record.PatrolPosition, false) end
	end
	if record.Boss and now >= record.NextNearby then
		record.NextNearby = now + rng:NextNumber(12, 20)
		VoiceService.Play(record.Model, record.Id, "Nearby")
	end
end

local function addNameTag(model, definition)
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "BossNameTag"
	billboard.Size = UDim2.fromOffset(210, 42)
	billboard.StudsOffset = Vector3.new(0, 3.8, 0)
	billboard.MaxDistance = 72
	billboard.AlwaysOnTop = false
	billboard.Adornee = model.Head
	billboard.Parent = model.Head
	local text = Instance.new("TextLabel")
	text.Name = "ExactNameTag"
	text.Size = UDim2.fromScale(1, 1)
	text.BackgroundTransparency = 1
	text.Text = definition.NameTag
	text.TextColor3 = definition.NameTagColor
	text.TextStrokeTransparency = 0.25
	text.TextSize = 16
	text.Font = Enum.Font.Code
	text.Parent = billboard
end

local spawnOrdinary
local function spawn(id, cf, ordinaryIndex)
	local definition = BossConfig[id]
	local boss = definition ~= nil
	local settings = boss and Config.Bosses[id] or Config.Infected
	local model = RigService.Create(id, cf, boss and definition.MaxHealth or settings.MaxHealth, settings.WalkSpeed, settings.WeaponName)
	if boss then
		model:SetAttribute("BossId", id)
		model:SetAttribute("Classification", definition.Classification)
		addNameTag(model, definition)
	end
	model:SetAttribute("State", "Idle")
	model.Parent = container
	model.HumanoidRootPart:SetNetworkOwner(nil)
	local now = os.clock()
	local record = {
		Id = id, Boss = boss, Model = model, Humanoid = model.Humanoid,
		Root = model.HumanoidRootPart, Home = cf, Settings = settings, State = "Idle",
		Dead = false, NextAttack = 0, NextPath = now + rng:NextNumber(0, 1.5),
		PathPending = false, PathToken = 0, WaypointIndex = 1, DesiredPosition = cf.Position,
		ProgressAt = now, ProgressPosition = cf.Position, ForcePathUntil = 0,
		LastSeen = -math.huge, NextPatrol = now + rng:NextNumber(1, 3),
		NextNearby = now + rng:NextNumber(4, 12), NextPuddle = now + 6,
		ProvokedPlayers = {}, LastHealth = model.Humanoid.Health,
	}
	if id == "Katya" then record.SpawnHairAt = now + 3 end
	table.insert(records, record)
	byModel[model] = record
	if boss then bosses[id] = record end
	AnimationService.Track(model)
	if id == "Mikoyan" then AnimationService.Play(model, "Sit", 3600) end
	record.HealthConnection = record.Humanoid.HealthChanged:Connect(function(health)
		if health > 0 and health < record.LastHealth and not model:GetAttribute("Executing")
			and not (id == "Mikoyan" and next(record.ProvokedPlayers) == nil) then
			AnimationService.Play(model, "Hit", 0.25)
			if boss then VoiceService.Play(model, id, "Damaged") end
		end
		record.LastHealth = health
	end)
	record.DeathConnection = record.Humanoid.Died:Connect(function()
		if record.Dead then return end
		record.Dead = true
		record.PathToken += 1
		setState(record, "Dead")
		if boss then
			-- Set persistence before any effect, cleanup, delayed work, or player event.
			registry:MarkDefeated(id)
			Workspace:SetAttribute("BossesDefeated", #registry:GetDefeatedIds())
			remotes.Effect:FireAllClients({ Kind = "BossDefeated", BossId = id })
			VoiceService.Play(model, id, "Death")
		end
		AnimationService.Play(model, "Death", Config.CorpseSeconds)
		record.HealthConnection:Disconnect()
		record.DeathConnection:Disconnect()
		task.delay(Config.CorpseSeconds, function()
			AnimationService.Untrack(model)
			byModel[model] = nil
			model:Destroy()
		end)
		if not boss then
			task.delay(settings.RespawnSeconds, function()
				if container.Parent and context.Root.Parent then spawnOrdinary(ordinaryIndex) end
			end)
		end
	end)
	return model
end

spawnOrdinary = function(index)
	local cf = context.InfectedSpawns[index]
	if cf then spawn("Infected", cf, index) end
end

function EnemyService.Start(mapContext, events)
	if started then return end
	started = true
	context = mapContext
	remotes = events
	assert(context and context.Root and context.MikoyanRoom, "[EnemyService] Expected MapService.Build context.")
	container = Instance.new("Folder")
	container.Name = "Enemies"
	container.Parent = Workspace
	Workspace:SetAttribute("BossesDefeated", #registry:GetDefeatedIds())
	for _, id in bossIds do
		local cf = context.BossSpawns[id]
		assert(cf, "[EnemyService] Missing map spawn for " .. id)
		if registry:TrySpawn(id) then spawn(id, cf) end
	end
	for index in context.InfectedSpawns do spawnOrdinary(index) end
	task.spawn(function()
		while container.Parent and context.Root.Parent do
			local players = Players:GetPlayers()
			for index = #records, 1, -1 do
				local record = records[index]
				if record.Dead and not record.Model.Parent then
					table.remove(records, index)
				else
					local ok, problem = pcall(update, record, players)
					if not ok and not record.ReportedError then
						record.ReportedError = true
						warn("[EnemyService] " .. record.Id .. ": " .. tostring(problem))
					end
				end
			end
			updateHazards(players)
			task.wait(Config.UpdateSeconds)
		end
	end)
end

function EnemyService.OnShot(player, model)
	local record = byModel[model]
	if not record or record.Dead then return end
	local _, root = living(player.Character)
	if not root then return end
	if record.Id == "Mikoyan" then
		if not isInsideRoom(root.Position) then return end
		record.ProvokedPlayers[player.UserId] = true
		AnimationService.Play(model, "Idle", 0.2)
	end
	record.Target = player.Character
	record.TargetPlayer = player
	record.LastKnown = root.Position
	record.LastSeen = os.clock()
	setState(record, "Alert")
	if record.Boss then VoiceService.Play(model, record.Id, "PlayerDetected") end
end

function EnemyService.GetBoss(id)
	local record = bosses[id]
	return record and not record.Dead and record.Model or nil
end

function EnemyService.GetSessionState(id)
	return registry:GetState(id)
end

return table.freeze(EnemyService)
