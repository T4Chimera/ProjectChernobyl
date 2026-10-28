--!strict
-- One owner for camera changes. Normal play retains Roblox's native camera/input.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local WeaponConfig = require(Shared:WaitForChild("WeaponConfig"))
local ClientConfig = require(Shared:WaitForChild("ClientConfig"))
local player = Players.LocalPlayer
local CameraController = {}

local humanoid: Humanoid? = nil
local character: Model? = nil
local execution: any = nil
local aiming = false
local crouching = false
local reducedMotion = ClientConfig.DefaultReducedMotion
local recoil = 0
local wasCinematic = false
local cinematicSince = 0
local lastFocus: Vector3? = nil
local deathConnection: RBXScriptConnection? = nil
local connections: { RBXScriptConnection } = {}
local started = false

local function currentHumanoid(): Humanoid?
	if humanoid and character == player.Character then
		return humanoid
	end
	return nil
end

function CameraController.IsCinematic(): boolean
	local body = currentHumanoid()
	return execution ~= nil or player:GetAttribute("ExecutionActive") == true or (body ~= nil and body.Health <= 0)
end

function CameraController.IsAlive(): boolean
	local body = currentHumanoid()
	return body ~= nil and body.Health > 0
end

function CameraController.SetAiming(value: boolean)
	aiming = value
end

function CameraController.SetCrouching(value: boolean)
	crouching = value
end

function CameraController.SetReducedMotion(value: boolean)
	reducedMotion = value
end

function CameraController.Recoil()
	if not reducedMotion and not CameraController.IsCinematic() then
		recoil = math.min(recoil + math.rad(ClientConfig.RecoilDegrees), math.rad(2.5))
	end
end

local function showLocalCharacter()
	if not character then return end
	for _, part in character:GetDescendants() do
		if part:IsA("BasePart") then
			part.LocalTransparencyModifier = 0
		end
	end
end

local function restoreCamera()
	local camera = Workspace.CurrentCamera
	local body = currentHumanoid()
	if camera and body and body.Health > 0 and not CameraController.IsCinematic() then
		player.CameraMode = Enum.CameraMode.LockFirstPerson
		camera.CameraType = Enum.CameraType.Custom
		camera.CameraSubject = body
		camera.FieldOfView = GameConfig.Camera.FieldOfView
	end
end

local function onCharacterAdded(newCharacter: Model)
	if player.Character ~= newCharacter then return end
	if deathConnection then deathConnection:Disconnect() end
	character = newCharacter
	humanoid = nil
	execution = nil
	lastFocus = nil
	wasCinematic = false
	aiming = false
	crouching = false
	recoil = 0
	local body = newCharacter:WaitForChild("Humanoid", GameConfig.InstanceWaitSeconds)
	if player.Character ~= newCharacter then return end
	if not body or not body:IsA("Humanoid") then
		warn("[CameraController] Missing local Humanoid; check the character rig.")
		return
	end
	humanoid = body
	deathConnection = body.Died:Connect(function()
		aiming = false
		cinematicSince = os.clock()
	end)
	restoreCamera()
end

local function cinematicCamera(camera: Camera, delta: number)
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if humanoid and humanoid.Health <= 0 and character then
		root = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso") or character:FindFirstChild("Head") or root
	end
	local focus = lastFocus or camera.CFrame.Position + camera.CFrame.LookVector * 6
	if root and root:IsA("BasePart") then
		focus = root.Position + Vector3.new(0, 1.2, 0)
		lastFocus = focus
	end
	local attacker = execution and execution.Attacker
	local attackerRoot = attacker and attacker.Parent and attacker:FindFirstChild("HumanoidRootPart")
	local duration = execution and execution.Duration or 4
	local progress = math.clamp((os.clock() - cinematicSince) / math.max(1, duration), 0, 1)
	local facing = root and root:IsA("BasePart") and root.CFrame.LookVector or Vector3.new(0, 0, -1)
	if attackerRoot and attackerRoot:IsA("BasePart") then
		focus = (focus + attackerRoot.Position + Vector3.new(0, 1.5, 0)) * 0.5
		local separation = attackerRoot.Position - (root and root:IsA("BasePart") and root.Position or focus)
		if separation.Magnitude > 0.1 then facing = separation.Unit end
	end
	local side = Vector3.new(-facing.Z, 0, facing.X)
	if side.Magnitude < 0.1 then side = Vector3.new(1, 0, 0) end
	local angle = reducedMotion and 0 or math.sin(progress * math.pi) * 0.18
	local desired = focus + side.Unit * ClientConfig.DeathCameraDistance
		+ Vector3.new(0, ClientConfig.DeathCameraHeight, 0) - facing * (3 + angle * 6)
	local exclusions: { Instance } = {}
	if character then table.insert(exclusions, character) end
	if attacker and typeof(attacker) == "Instance" then table.insert(exclusions, attacker) end
	local localEffects = Workspace:FindFirstChild("ChernobylLocalEffects")
	if localEffects then table.insert(exclusions, localEffects) end
	local parameters = RaycastParams.new()
	parameters.FilterType = Enum.RaycastFilterType.Exclude
	parameters.FilterDescendantsInstances = exclusions
	local hit = Workspace:Raycast(focus, desired - focus, parameters)
	if hit then desired = hit.Position + hit.Normal * ClientConfig.CameraWallPadding end
	if (desired - focus).Magnitude < 0.2 then desired = focus + Vector3.new(0, 0.5, 0) end
	camera.CameraType = Enum.CameraType.Scriptable
	player.CameraMode = Enum.CameraMode.Classic
	showLocalCharacter()
	local target = CFrame.lookAt(desired, focus)
	local blended = camera.CFrame:Lerp(target, 1 - math.exp(-delta * 9))
	-- Smoothing can cross a corner even when the destination is unobstructed.
	-- Check the actual interpolated position too, then frame from the safe side.
	local blendHit = Workspace:Raycast(focus, blended.Position - focus, parameters)
	if blendHit then
		local safePosition = blendHit.Position + blendHit.Normal * ClientConfig.CameraWallPadding
		if (safePosition - focus).Magnitude > 0.2 then blended = CFrame.lookAt(safePosition, focus) end
	end
	camera.CFrame = blended
	camera.FieldOfView += (65 - camera.FieldOfView) * math.min(1, delta * 7)
end

function CameraController.Start(executionRemote: RemoteEvent)
	if started then return end
	started = true
	table.insert(connections, player.CharacterAdded:Connect(onCharacterAdded))
	table.insert(connections, player.CharacterRemoving:Connect(function(oldCharacter)
		if character == oldCharacter then
			if deathConnection then deathConnection:Disconnect() end
			humanoid = nil
			character = nil
			execution = nil
		end
	end))
	table.insert(connections, Workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(restoreCamera))
	table.insert(connections, player:GetAttributeChangedSignal("ExecutionActive"):Connect(function()
		-- The replicated lock is a second completion path if the end event is
		-- missed during character teardown or a cinematic is interrupted.
		if player:GetAttribute("ExecutionActive") ~= true then
			execution = nil
			restoreCamera()
		end
	end))
	table.insert(connections, executionRemote.OnClientEvent:Connect(function(payload)
		if typeof(payload) ~= "table" then return end
		if payload.Active then
			execution = payload
			execution.LocalReceivedAt = os.clock()
			cinematicSince = os.clock()
			aiming = false
		else
			execution = nil
			restoreCamera()
		end
	end))
	RunService:BindToRenderStep("ChernobylCamera", Enum.RenderPriority.Camera.Value + 1, function(delta)
		local camera = Workspace.CurrentCamera
		if not camera then return end
		if execution and player:GetAttribute("ExecutionActive") ~= true
			and os.clock() - execution.LocalReceivedAt > (tonumber(execution.Duration) or 5) + 2 then
			execution = nil
		end
		local cinematic = CameraController.IsCinematic()
		if cinematic then
			if not wasCinematic then cinematicSince = os.clock() end
			cinematicCamera(camera, math.min(delta, 0.1))
		elseif wasCinematic then
			restoreCamera()
		else
			local body = currentHumanoid()
			if body and body.Health > 0 then
				local targetFov = aiming and WeaponConfig.AimFieldOfView or GameConfig.Camera.FieldOfView
				camera.FieldOfView += (targetFov - camera.FieldOfView) * math.min(1, delta * 12)
				local offset = Vector3.new(0, crouching and -0.8 or 0, 0)
				body.CameraOffset = body.CameraOffset:Lerp(offset, math.min(1, delta * 12))
				if recoil > 0.00001 then
					camera.CFrame *= CFrame.Angles(recoil * math.min(delta * 12, 1), 0, 0)
					recoil *= math.exp(-delta * 14)
				end
			end
		end
		wasCinematic = cinematic
	end)
	if player.Character then task.spawn(onCharacterAdded, player.Character) end
end

function CameraController.Destroy()
	RunService:UnbindFromRenderStep("ChernobylCamera")
	for _, connection in connections do connection:Disconnect() end
	if deathConnection then deathConnection:Disconnect() end
	if humanoid then humanoid.CameraOffset = Vector3.zero end
	execution = nil
	restoreCamera()
	started = false
end

return CameraController
