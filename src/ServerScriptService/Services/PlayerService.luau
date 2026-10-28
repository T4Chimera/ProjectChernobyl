--!strict
local Players = game:GetService("Players")
local PlayerService = {}

type Settings = {
	MaxHealth: number,
	WalkSpeed: number,
	JumpPower: number,
	RespawnTime: number,
}

type PlayerState = {
	Connection: RBXScriptConnection?,
	ConfiguredCharacter: Model?,
}

local started = false
local tracked: { [Player]: PlayerState } = {}

function PlayerService.Start(settings: Settings, waitSeconds: number, spawn: SpawnLocation?)
	if started then
		return
	end
	started = true
	Players.RespawnTime = settings.RespawnTime

	local function track(player: Player)
		if tracked[player] then
			return
		end
		local state: PlayerState = { Connection = nil, ConfiguredCharacter = nil }
		tracked[player] = state
		if spawn then player.RespawnLocation = spawn end

		local function configureCharacter(character: Model)
			local humanoid = character:WaitForChild("Humanoid", waitSeconds)
			-- A leave or another respawn can happen while WaitForChild yields.
			if tracked[player] ~= state or player.Character ~= character then
				return
			end
			if not humanoid or not humanoid:IsA("Humanoid") then
				warn(string.format(
					"[PlayerService] %s: expected Humanoid in %s within %ds; check the character rig.",
					player.Name, character.Name, waitSeconds
				))
				return
			end
			-- Prevent two initialization paths from resetting a living player's HP.
			if state.ConfiguredCharacter == character then
				return
			end
			state.ConfiguredCharacter = character
			if humanoid.Health <= 0 then
				return
			end
			humanoid.MaxHealth = settings.MaxHealth
			humanoid.Health = settings.MaxHealth
			humanoid.BreakJointsOnDeath = false
			humanoid.WalkSpeed = settings.WalkSpeed
			humanoid.UseJumpPower = true
			humanoid.JumpPower = settings.JumpPower
			-- Correct a character that auto-spawned before procedural map generation.
			if spawn and spawn.Parent then character:PivotTo(spawn.CFrame * CFrame.new(0, 4, 0)) end
		end

		state.Connection = player.CharacterAdded:Connect(configureCharacter)
		if player.Character then
			task.spawn(configureCharacter, player.Character)
		end
	end

	Players.PlayerAdded:Connect(track)
	Players.PlayerRemoving:Connect(function(player: Player)
		local state = tracked[player]
		tracked[player] = nil
		if state and state.Connection then
			state.Connection:Disconnect()
		end
	end)
	for _, player in Players:GetPlayers() do
		track(player)
	end
end

return table.freeze(PlayerService)
