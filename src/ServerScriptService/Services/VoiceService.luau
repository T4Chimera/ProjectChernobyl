--!strict
-- Recorded audio is optional. With empty asset slots this sends exact subtitles.
local Players = game:GetService("Players")
local Debris = game:GetService("Debris")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Shared.VoiceLineConfig)

local VoiceService = {}
local remotes: Folder? = nil
type VoiceState = { BusyUntil: number, Categories: { [string]: number }, Sound: Sound? }
local states: { [Model]: VoiceState } = setmetatable({}, { __mode = "k" }) :: any
local random = Random.new()

function VoiceService.Start(folder: Folder)
	remotes = folder
end

function VoiceService.Play(model: Model, bossId: string, category: string): boolean
	local voice = Config.Voices[bossId]
	if not remotes or not model.Parent or not voice or (voice.Proposed and not Config.AllowProposed) then
		return false
	end
	local lines = voice.Lines[category]
	if not lines or #lines == 0 then
		return false
	end
	local emitter = model:FindFirstChild("Head") or model:FindFirstChild("HumanoidRootPart")
	if not emitter or not emitter:IsA("BasePart") then
		return false
	end
	local now = os.clock()
	local state = states[model]
	if not state then
		state = { BusyUntil = 0, Categories = {}, Sound = nil }
		states[model] = state
	end
	-- Execution dialogue may replace the actor's previous nearby/combat line,
	-- but always stops that sound first, so two lines never overlap.
	if category ~= "Execution" and (state.BusyUntil > now or (state.Sound and state.Sound.IsPlaying)) then
		return false
	end
	if (state.Categories[category] or 0) > now then
		return false
	end
	local listeners = {}
	for _, player in Players:GetPlayers() do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root and root:IsA("BasePart") and (root.Position - emitter.Position).Magnitude <= Config.MaxDistance then
			table.insert(listeners, player)
		end
	end
	if #listeners == 0 then
		return false
	end
	if state.Sound then
		state.Sound:Stop()
		state.Sound:Destroy()
		state.Sound = nil
	end
	local chosen = lines[random:NextInteger(1, #lines)]
	local duration = math.clamp(chosen.Duration, 1, 12)
	state.BusyUntil = now + duration
	state.Categories[category] = now + (Config.CategoryCooldowns[category] or Config.DefaultCooldown)
	for _, player in listeners do
		(remotes :: Folder).Subtitle:FireClient(player, {
			Speaker = bossId, Text = chosen.Text, Duration = duration,
		})
	end
	if chosen.SoundId ~= "" and string.match(chosen.SoundId, "^rbxassetid://%d+$") then
		local sound = Instance.new("Sound")
		sound.Name = "BossVoice"
		sound.SoundId = chosen.SoundId
		sound.Volume = math.clamp(voice.Volume, 0, 1.2)
		sound.RollOffMinDistance = Config.MinDistance
		sound.RollOffMaxDistance = Config.MaxDistance
		sound.RollOffMode = Enum.RollOffMode.InverseTapered
		if voice.Distortion > 0 then
			local effect = Instance.new("DistortionSoundEffect")
			effect.Level = math.clamp(voice.Distortion, 0, 1)
			effect.Parent = sound
		end
		if voice.Radio then
			local equalizer = Instance.new("EqualizerSoundEffect")
			equalizer.LowGain = -12
			equalizer.MidGain = 2
			equalizer.HighGain = -8
			equalizer.Parent = sound
		end
		sound.Parent = emitter
		state.Sound = sound
		sound.Ended:Once(function()
			if state and state.Sound == sound then
				state.Sound = nil
			end
			sound:Destroy()
		end)
		-- Bounded cleanup for inaccessible, never-loading, or overlong assets.
		Debris:AddItem(sound, math.max(duration + 2, 15))
		sound:Play()
	end
	return true
end

return table.freeze(VoiceService)
