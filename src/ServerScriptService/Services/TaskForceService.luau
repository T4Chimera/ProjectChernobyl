--!strict
-- Placeholder armbands identify selections; these are not final S.T.O-based uniforms.
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared.GameConfig)
local RateLimiter = require(script.Parent.RateLimiter)
local TaskForceService = {}
local started = false
local forceLimiter = RateLimiter.new(2, 0.5)
local moveLimiter = RateLimiter.new(8, 4)
local tracked = {}

local function applyBand(player: Player, character: Model)
	local torso = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
	if not torso or not torso:IsA("BasePart") then return end
	local old = character:FindFirstChild("TaskForcePatch")
	if old then old:Destroy() end
	local band = Instance.new("Part")
	band.Name = "TaskForcePatch"
	band.Size = Vector3.new(1.3, 0.5, 0.12)
	band.Color = Color3.fromRGB(65, 76, 70)
	band.CanCollide = false
	band.CanTouch = false
	band.CanQuery = false
	band.Massless = true
	band.CFrame = torso.CFrame * CFrame.new(0, 0.45, -torso.Size.Z / 2 - 0.08)
	band.Parent = character
	local weld = Instance.new("WeldConstraint")
	weld.Part0, weld.Part1, weld.Parent = torso, band, band
	local surface = Instance.new("SurfaceGui")
	surface.Face = Enum.NormalId.Front
	surface.CanvasSize = Vector2.new(260, 100)
	surface.Parent = band
	local text = Instance.new("TextLabel")
	text.Size = UDim2.fromScale(1, 1)
	text.BackgroundTransparency = 1
	text.TextColor3 = Color3.new(1, 1, 1)
	text.TextScaled = true
	text.Font = Enum.Font.Code
	text.Text = player:GetAttribute("TaskForce") or "Nu-7"
	text.Parent = surface
	character:SetAttribute("TaskForce", text.Text)
end

function TaskForceService.Start(remotes: Folder)
	if started then return end
	started = true
	local function track(player: Player)
		if tracked[player] then return end
		local state = {}
		tracked[player] = state
		if player:GetAttribute("TaskForce") == nil then player:SetAttribute("TaskForce", "Nu-7") end
		player:SetAttribute("MoveMode", "Walk")
		local function configure(character)
			local humanoid = character:WaitForChild("Humanoid", 10)
			if not humanoid or not humanoid:IsA("Humanoid") then return end
			local torsoName = if humanoid.RigType == Enum.HumanoidRigType.R15 then "UpperTorso" else "Torso"
			character:WaitForChild(torsoName, 10)
			if tracked[player] == state and player.Character == character then
				player:SetAttribute("MoveMode", "Walk")
				applyBand(player, character)
			end
		end
		state.Connection = player.CharacterAdded:Connect(configure)
		if player.Character then task.spawn(configure, player.Character) end
	end
	remotes.Action.OnServerEvent:Connect(function(player, action, value)
		if action == "SelectTaskForce" then
			if typeof(value) ~= "string" or not table.find(GameConfig.TaskForces, value) then return end
			if player:GetAttribute("ExecutionActive") or not forceLimiter.Take(player, os.clock()) then return end
			player:SetAttribute("TaskForce", value)
			if player.Character then applyBand(player, player.Character) end
			remotes.State:FireClient(player, { TaskForce = value })
		elseif action == "MoveMode" then
			if value ~= "Walk" and value ~= "Sprint" and value ~= "Crouch" then return end
			if not moveLimiter.Take(player, os.clock()) or player:GetAttribute("ExecutionActive") then return end
			local h = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
			if not h or h.Health <= 0 then return end
			player:SetAttribute("MoveMode", value)
			h.WalkSpeed = if value == "Sprint" then 22 elseif value == "Crouch" then 8 else GameConfig.Player.WalkSpeed
			h.JumpPower = if value == "Crouch" then 0 else GameConfig.Player.JumpPower
			remotes.State:FireClient(player, { MoveMode = value })
		end
	end)
	Players.PlayerAdded:Connect(track)
	Players.PlayerRemoving:Connect(function(player)
		if tracked[player] then tracked[player].Connection:Disconnect() end
		tracked[player] = nil
		forceLimiter.Forget(player)
		moveLimiter.Forget(player)
	end)
	for _, player in Players:GetPlayers() do track(player) end
end

return TaskForceService
