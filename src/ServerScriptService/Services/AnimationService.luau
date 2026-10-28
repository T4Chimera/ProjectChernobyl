--!strict
-- Procedural Motor6D.C0 motion replicates from the server. AnimationTrack slots
-- can replace individual poses later without inventing animation asset IDs.
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Shared.AnimationConfig)
local AnimationService = {}
local tracked = {}
local started = false

local jointNames = {
	["RootJoint"] = "Root", ["Root"] = "Root", ["Waist"] = "Root",
	["Neck"] = "Neck",
	["Right Shoulder"] = "RightShoulder", ["RightShoulder"] = "RightShoulder",
	["Left Shoulder"] = "LeftShoulder", ["LeftShoulder"] = "LeftShoulder",
	["Right Hip"] = "RightHip", ["RightHip"] = "RightHip",
	["Left Hip"] = "LeftHip", ["LeftHip"] = "LeftHip",
	["MaskJaw"] = "MaskJaw",
}

local function reset(record)
	for joint, base in record.Bases do
		local tween = record.Tweens[joint]
		if tween then tween:Cancel() end
		if joint.Parent then joint.C0 = base end
	end
	for _, track in record.Tracks do
		pcall(function() track:Stop(0.1); track:Destroy() end)
	end
end

function AnimationService.Track(model: Model)
	if tracked[model] then return end
	local joints, bases = {}, {}
	for _, instance in model:GetDescendants() do
		if instance:IsA("Motor6D") then
			local key = jointNames[instance.Name]
			if string.match(instance.Name, "^Tentacle%-?%d+$") then key = instance.Name end
			if key and (not joints[key] or (key == "Root" and joints[key].Name == "Waist" and instance.Name ~= "Waist")) then
				joints[key] = instance
				bases[instance] = instance.C0
			end
		end
	end
	tracked[model] = { Joints = joints, Bases = bases, Tweens = {}, Tracks = {},
		Pose = nil, Until = 0, AssetPlaying = false }
end

function AnimationService.IsTracked(model: Model): boolean
	return tracked[model] ~= nil
end

function AnimationService.Untrack(model: Model)
	local record = tracked[model]
	if not record then return end
	reset(record)
	tracked[model] = nil
end

function AnimationService.Reset(model: Model)
	local record = tracked[model]
	if not record then return end
	reset(record)
	record.Tracks = {}
	record.Tweens = {}
	record.Pose = nil
	record.Until = 0
	record.AssetPlaying = false
end

function AnimationService.Play(model: Model, pose: string, duration: number?)
	AnimationService.Track(model)
	local record = tracked[model]
	local persistent = pose == "Idle" or pose == "Walk" or pose == "Sit" or pose == "Death"
	if record.Pose == pose and record.Until > os.clock() then
		record.Until = math.max(record.Until, os.clock() + (duration or (if persistent then math.huge else Config.DefaultActionSeconds)))
		return
	end
	record.Pose = pose
	record.Until = os.clock() + (duration or (if persistent then math.huge else Config.DefaultActionSeconds))
	for _, track in record.Tracks do
		pcall(function() track:Stop(0.08); track:Destroy() end)
	end
	record.Tracks = {}
	record.AssetPlaying = false
	local id = model:GetAttribute("BossId") or (if model:GetAttribute("Enemy") then "Infected" else "Player")
	local slots = Config.Assets[id]
	local assetId = slots and slots[pose]
	if type(assetId) == "string" and string.match(assetId, "^rbxassetid://%d+$") then
		local humanoid = model:FindFirstChildOfClass("Humanoid")
		if humanoid then
			local animator = humanoid:FindFirstChildOfClass("Animator")
			if not animator then animator = Instance.new("Animator"); animator.Parent = humanoid end
			local animation = Instance.new("Animation")
			animation.AnimationId = assetId
			local ok, track = pcall(function() return animator:LoadAnimation(animation) end)
			animation:Destroy()
			if ok then
				track.Priority = Enum.AnimationPriority.Action
				track.Looped = persistent and pose ~= "Death"
				track:Play(0.1)
				table.insert(record.Tracks, track)
				record.AssetPlaying = true
			else
				warn("[AnimationService] Could not load " .. id .. "/" .. pose .. "; using procedural motion.")
			end
		end
	end
end

local function update(model, record, now)
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local root = model:FindFirstChild("HumanoidRootPart")
	if not humanoid or not root then return end
	local pose = record.Pose
	if record.Until <= now then
		AnimationService.Reset(model)
		pose = nil
	end
	if record.AssetPlaying then return end
	local moving = root.AssemblyLinearVelocity.Magnitude > 1.3 and humanoid.Health > 0 and not model:GetAttribute("Executing")
	if not pose or pose == "Idle" or pose == "Walk" then
		pose = if humanoid.Health <= 0 then "Death" elseif moving then "Walk" else "Idle"
	end
	local id = model:GetAttribute("BossId") or "Infected"
	local style = Config.Styles[id] or Config.Styles.Infected
	local phase = now * 7 * style.Cadence
	local offsets = Config.Poses[pose] or Config.Poses.Idle
	for name, joint in record.Joints do
		if joint.Parent then
			local angles = offsets[name] or { 0, 0, 0 }
			local x, y, z = angles[1], angles[2], angles[3]
			if string.match(name, "^Tentacle") then
				local tentacleIndex = tonumber(string.match(name, "%-?%d+")) or 1
				local extended = pose == "Attack" or pose == "Grab" or pose == "Strike" or pose == "Slam" or pose == "Lift"
				x = (if extended then -75 else 8) + math.sin(now * 3 + tentacleIndex) * 12
				z = math.sin(now * 2 + tentacleIndex * 2) * 14
			elseif name == "MaskJaw" then
				x = if pose == "Attack" or pose == "Grab" or pose == "Strike" or pose == "Slam" then 50 else 0
			end
			if pose == "Walk" then
				local swing = math.sin(phase) * 32 * style.Stride
				if name == "RightHip" or name == "LeftShoulder" then x += swing end
				if name == "LeftHip" or name == "RightShoulder" then x -= swing end
				if name == "Root" then z += math.sin(phase * 0.5) * 3 * style.Sway end
			elseif pose == "Idle" then
				if name == "Neck" then z += math.sin(now * 1.3) * 2 * style.Sway end
				if id == "Katya" and name == "Root" then x += 7 + math.sin(now * 2) * 3 end
			end
			local drop = if name == "Root" and (pose == "Down" or pose == "Death") then -1.5 else 0
			local goal = CFrame.new(0, drop, 0) * record.Bases[joint] * CFrame.Angles(math.rad(x), math.rad(y), math.rad(z))
			local old = record.Tweens[joint]
			if old then old:Cancel() end
			local tween = TweenService:Create(joint, TweenInfo.new(Config.BlendSeconds), { C0 = goal })
			record.Tweens[joint] = tween
			tween:Play()
		end
	end
end

function AnimationService.Start()
	if started then return end
	started = true
	local elapsed = 0
	RunService.Heartbeat:Connect(function(dt)
		elapsed += dt
		if elapsed < Config.UpdateSeconds then return end
		elapsed = 0
		local now = os.clock()
		for model, record in tracked do
			if not model.Parent then
				AnimationService.Untrack(model)
			else
				update(model, record, now)
			end
		end
	end)
end

return table.freeze(AnimationService)
