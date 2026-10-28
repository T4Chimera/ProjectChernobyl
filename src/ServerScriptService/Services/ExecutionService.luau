--!strict
-- Server-only staged takedowns. No client may request one or supply its damage.
-- Both bodies stay intact and remain at their existing, validated positions.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Config = require(ReplicatedStorage.Shared.ExecutionConfig)
local DamageService = require(script.Parent.DamageService)
local AnimationService = require(script.Parent.AnimationService)
local VoiceService = require(script.Parent.VoiceService)
local ExecutionService = {}
local remotes = nil
local activePlayers = {}
local activeAttackers = {}
local random = Random.new()

local function body(model)
	if not model or not model:IsA("Model") then return nil, nil end
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local root = model:FindFirstChild("HumanoidRootPart")
	if not humanoid or not root or not root:IsA("BasePart") then return nil, nil end
	return humanoid, root
end

local function protected(character)
	for _, child in character:GetDescendants() do
		if child:IsA("ForceField") then return true end
	end
	return false
end

local function saveAndLock(humanoid, root)
	local saved = {
		Anchored = root.Anchored, WalkSpeed = humanoid.WalkSpeed,
		JumpPower = humanoid.JumpPower, JumpHeight = humanoid.JumpHeight,
		AutoRotate = humanoid.AutoRotate, PlatformStand = humanoid.PlatformStand,
	}
	root.AssemblyLinearVelocity = Vector3.zero
	root.AssemblyAngularVelocity = Vector3.zero
	root.Anchored = true
	humanoid.WalkSpeed = 0
	humanoid.JumpPower = 0
	humanoid.JumpHeight = 0
	humanoid.AutoRotate = false
	humanoid.PlatformStand = true
	return saved
end

local function restore(humanoid, root, saved)
	if root.Parent then
		root.AssemblyLinearVelocity = Vector3.zero
		root.AssemblyAngularVelocity = Vector3.zero
		root.Anchored = saved.Anchored
	end
	if humanoid.Parent then
		humanoid.WalkSpeed = saved.WalkSpeed
		humanoid.JumpPower = saved.JumpPower
		humanoid.JumpHeight = saved.JumpHeight
		humanoid.AutoRotate = saved.AutoRotate
		humanoid.PlatformStand = saved.PlatformStand
	end
end

local function face(root, target)
	local flatTarget = Vector3.new(target.Position.X, root.Position.Y, target.Position.Z)
	if (flatTarget - root.Position).Magnitude > 0.1 then
		root.CFrame = CFrame.lookAt(root.Position, flatTarget)
	end
end

function ExecutionService.Start(events)
	if remotes then return end
	remotes = events
	Players.PlayerRemoving:Connect(function(player)
		local session = activePlayers[player]
		if session then session.Finish(false) end
	end)
end

function ExecutionService.TryStart(attacker: Model, player: Player, bossId: string, variantIndex: number?): boolean
	if not remotes or not player:IsDescendantOf(Players) then return false end
	local choices = Config.Bosses[bossId]
	if not choices or #choices == 0 or activePlayers[player] or activeAttackers[attacker] then return false end
	local character = player.Character
	local victimHumanoid, victimRoot = body(character)
	local attackHumanoid, attackRoot = body(attacker)
	if not victimHumanoid or not attackHumanoid or not character then return false end
	if victimHumanoid.Health <= 0 or victimHumanoid.Health > Config.MaxVictimHealth or attackHumanoid.Health <= 0 then return false end
	if protected(character) or player:GetAttribute("ExecutionActive") or attacker:GetAttribute("Executing") then return false end
	if not attacker:IsDescendantOf(Workspace) or not character:IsDescendantOf(Workspace) then return false end
	if (attackRoot.Position - victimRoot.Position).Magnitude > Config.Range then return false end
	local rayParams = RaycastParams.new()
	rayParams.FilterType = Enum.RaycastFilterType.Exclude
	rayParams.FilterDescendantsInstances = { attacker }
	local ray = Workspace:Raycast(attackRoot.Position, victimRoot.Position - attackRoot.Position, rayParams)
	if ray and not ray.Instance:IsDescendantOf(character) then return false end

	-- Deterministic preview is server-side and Studio-only. Normal AI calls use
	-- three arguments and retain random selection; clients cannot choose scenes.
	local chosenIndex = random:NextInteger(1, #choices)
	if variantIndex ~= nil and typeof(variantIndex) == "number"
		and variantIndex >= 1 and variantIndex <= #choices and variantIndex % 1 == 0
		and game:GetService("RunService"):IsStudio() then
		chosenIndex = variantIndex
	end
	local variant = choices[chosenIndex]
	local session = { Done = false, Completing = false, Connections = {} }
	activePlayers[player] = session
	activeAttackers[attacker] = session
	local victimSaved, attackSaved = nil, nil
	local animate = character:FindFirstChild("Animate")
	local animateWasDisabled = if animate and animate:IsA("LocalScript") then animate.Disabled else nil
	local victimWasTracked = AnimationService.IsTracked(character)

	local function finish(completed)
		if session.Done then return end
		session.Done = true
		for _, connection in session.Connections do connection:Disconnect() end
		if activePlayers[player] == session then activePlayers[player] = nil end
		if activeAttackers[attacker] == session then activeAttackers[attacker] = nil end
		-- Each cleanup operation is isolated so an externally removed rig cannot
		-- leave a different surviving participant anchored or camera-locked.
		local function clean(label, callback)
			local ok, problem = pcall(callback)
			if not ok then warn("[ExecutionService] " .. label .. ": " .. tostring(problem)) end
		end
		clean("victim restore", function()
			if victimSaved then restore(victimHumanoid, victimRoot, victimSaved) end
			DamageService.RevokeImmunity(victimHumanoid)
			if victimWasTracked then AnimationService.Reset(character) else AnimationService.Untrack(character) end
			if animate and animate.Parent and animateWasDisabled ~= nil then animate.Disabled = animateWasDisabled end
			character:SetAttribute("ExecutionActive", nil)
		end)
		clean("attacker restore", function()
			if attackSaved then restore(attackHumanoid, attackRoot, attackSaved) end
			attacker:SetAttribute("Executing", nil)
			if attackHumanoid.Health > 0 then AnimationService.Reset(attacker) end
		end)
		clean("camera release", function()
			player:SetAttribute("ExecutionActive", false)
			if player:IsDescendantOf(Players) then remotes.Execution:FireClient(player, { Active = false, Completed = completed }) end
		end)
	end
	session.Finish = finish

	local function alive()
		return not session.Done and player.Character == character and player:IsDescendantOf(Players)
			and attacker:IsDescendantOf(Workspace) and character:IsDescendantOf(Workspace)
			and victimRoot.Parent ~= nil and attackRoot.Parent ~= nil
			and victimHumanoid.Health > 0 and attackHumanoid.Health > 0
	end

	-- Register cancellation hooks before performing any stateful staging.
	table.insert(session.Connections, attackHumanoid.Died:Connect(function() finish(false) end))
	table.insert(session.Connections, victimHumanoid.Died:Connect(function()
		if not session.Completing then finish(false) end
	end))
	table.insert(session.Connections, player.CharacterRemoving:Connect(function(oldCharacter)
		if oldCharacter == character then finish(false) end
	end))
	table.insert(session.Connections, attacker.AncestryChanged:Connect(function()
		if not attacker:IsDescendantOf(Workspace) then finish(false) end
	end))

	local ok, problem = pcall(function()
		player:SetAttribute("ExecutionActive", true)
		character:SetAttribute("ExecutionActive", true)
		attacker:SetAttribute("Executing", true)
		victimSaved = saveAndLock(victimHumanoid, victimRoot)
		attackSaved = saveAndLock(attackHumanoid, attackRoot)
		face(attackRoot, victimRoot)
		face(victimRoot, attackRoot)
		if animate and animate:IsA("LocalScript") then animate.Disabled = true end
		local animator = victimHumanoid:FindFirstChildOfClass("Animator")
		if animator then
			for _, track in animator:GetPlayingAnimationTracks() do track:Stop(0.1) end
		end
		DamageService.GrantImmunity(victimHumanoid, variant.Duration + 0.5)
		remotes.Execution:FireClient(player, {
			Active = true, Attacker = attacker, Variant = variant.Id, Duration = variant.Duration,
		})
		VoiceService.Play(attacker, bossId, "Execution")
	end)
	if not ok then
		warn("[ExecutionService] Could not stage " .. bossId .. ": " .. tostring(problem))
		finish(false)
		return false
	end

	task.spawn(function()
		local success, err = xpcall(function()
			local began = os.clock()
			local function waitUntil(at)
				while alive() and os.clock() - began < at do task.wait(0.05) end
				return alive()
			end
			for index, step in variant.Beats do
				if not waitUntil(step.At) then return end
				local nextAt = if variant.Beats[index + 1] then variant.Beats[index + 1].At else variant.Duration
				local duration = math.max(0.15, nextAt - step.At + 0.15)
				AnimationService.Play(attacker, step.Pose, duration)
				if step.VictimPose then AnimationService.Play(character, step.VictimPose, duration) end
				if step.Effect == "Blood" then
					remotes.Effect:FireAllClients({ Kind = "Blood", Position = victimRoot.Position + Vector3.new(0, 0.5, 0) })
				elseif step.Effect == "Shot" then
					local origin = attacker:FindFirstChild("Head")
					remotes.Effect:FireAllClients({ Kind = "Shot", Origin = (origin and origin.Position or attackRoot.Position),
						Position = victimRoot.Position + Vector3.new(0, 0.5, 0), Blood = true })
				end
			end
			if waitUntil(variant.Duration) then
				session.Completing = true
				-- Damage is deferred to the end of the staged sequence; an ally
				-- killing the attacker first interrupts and saves the victim.
				victimHumanoid.Health = 0
				finish(true)
			end
		end, debug.traceback)
		if not success then warn("[ExecutionService] " .. bossId .. ": " .. tostring(err)) end
		finish(false)
	end)
	return true
end

return table.freeze(ExecutionService)
