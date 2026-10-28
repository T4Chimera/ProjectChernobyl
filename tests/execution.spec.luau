-- ExecutionService lifecycle tests with actual service source and narrow API
-- doubles. This checks locks/timing/cleanup, not engine animation or collision.
-- INSERT_ACTUAL_MODULE_LOADERS

local passed = 0
local function test(name, callback)
	local ok, message = pcall(callback)
	assert(ok, string.format("FAIL %s: %s", name, tostring(message)))
	passed += 1
	print("PASS " .. name)
end
local function equal(actual, expected)
	assert(actual == expected, string.format("expected %s, got %s", tostring(expected), tostring(actual)))
end

local function signal()
	local event = { Connections = {} }
	function event:Connect(callback)
		local connection = { Connected = true, Callback = callback }
		function connection:Disconnect() self.Connected = false end
		table.insert(self.Connections, connection)
		return connection
	end
	function event:Fire(...)
		for _, connection in table.clone(self.Connections) do
			if connection.Connected then connection.Callback(...) end
		end
	end
	function event:Count()
		local count = 0
		for _, connection in self.Connections do if connection.Connected then count += 1 end end
		return count
	end
	return event
end

-- Only addition/subtraction/Magnitude are needed by the actual service.
local vectors = {}
local vectorMeta = {}
function vectors.new(x, y, z) return setmetatable({ X = x, Y = y, Z = z }, vectorMeta) end
function vectorMeta.__sub(a, b) return vectors.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
function vectorMeta.__add(a, b) return vectors.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
function vectorMeta.__index(value, key)
	if key == "Magnitude" then return math.sqrt(value.X ^ 2 + value.Y ^ 2 + value.Z ^ 2) end
end
vectors.zero = vectors.new(0, 0, 0)

local function fixture()
	local f = { Now = 100, Threads = {}, Events = {}, Effects = {}, Warnings = {}, Revoked = 0, Poses = {} }
	local world = {}
	function world:Raycast() return f.BlockingRay end
	local players = { PlayerRemoving = signal() }
	local function model(name, position, health)
		local object = { Name = name, Attributes = {}, Parent = world, AncestryChanged = signal(), Descendants = {} }
		local humanoid = {
			Health = health, WalkSpeed = 8, JumpPower = 40, JumpHeight = 6,
			AutoRotate = true, PlatformStand = false, Died = signal(), Parent = object,
		}
		function humanoid:FindFirstChildOfClass() return nil end
		local root = { Parent = object, Position = position, Anchored = false }
		function root:IsA(className) return className == "BasePart" end
		object.Humanoid, object.Root = humanoid, root
		function object:IsA(className) return className == "Model" end
		function object:FindFirstChildOfClass(className)
			if className == "Humanoid" then return self.Humanoid end
			return nil
		end
		function object:FindFirstChild(childName)
			if childName == "HumanoidRootPart" or childName == "Head" then return self.Root end
			if childName == "Animate" then return self.Animate end
			return nil
		end
		function object:GetDescendants() return self.Descendants end
		function object:IsDescendantOf(ancestor) return self.Parent == ancestor end
		function object:GetAttribute(key) return self.Attributes[key] end
		function object:SetAttribute(key, value) self.Attributes[key] = value end
		return object
	end
	f.Attacker = model("Felon", vectors.new(3, 3, 0), 1500)
	f.Character = model("Victim", vectors.new(0, 3, 0), 20)
	f.Character.Animate = { Disabled = false, Parent = f.Character }
	function f.Character.Animate:IsA(className) return className == "LocalScript" end
	f.Player = { Character = f.Character, Parent = players, Attributes = {}, CharacterRemoving = signal() }
	function f.Player:IsDescendantOf(ancestor) return self.Parent == ancestor end
	function f.Player:GetAttribute(key) return self.Attributes[key] end
	function f.Player:SetAttribute(key, value) self.Attributes[key] = value end
	f.Players, f.World = players, world
	local damage = {}
	function damage.GrantImmunity() f.Immune = true end
	function damage.RevokeImmunity() f.Immune = false; f.Revoked += 1 end
	local animation = {}
	function animation.IsTracked() return false end
	function animation.Reset() end
	function animation.Untrack() end
	function animation.Play(target, pose) table.insert(f.Poses, { target, pose }) end
	local voice = {}
	function voice.Play() if f.ThrowVoice then error("Injected voice staging failure") end end
	local replicated = { Shared = { ExecutionConfig = "ExecutionConfig" } }
	local dependencies = { ExecutionConfig = loadExecutionConfig(), DamageService = damage, AnimationService = animation, VoiceService = voice }
	local gameMock = {}
	function gameMock:GetService(name)
		return ({ Players = players, ReplicatedStorage = replicated, Workspace = world })[name]
	end
	local remotes = { Execution = {}, Effect = {} }
	function remotes.Execution:FireClient(player, payload)
		equal(player, f.Player)
		table.insert(f.Events, payload)
	end
	function remotes.Effect:FireAllClients(payload) table.insert(f.Effects, payload) end
	local taskMock = {}
	function taskMock.spawn(callback) table.insert(f.Threads, coroutine.create(callback)) end
	function taskMock.wait(seconds) f.Now += seconds; coroutine.yield() end
	local random = { new = function() return { NextInteger = function() return 1 end } end }
	f.Service = loadExecutionService(gameMock, function(name) return assert(dependencies[name]) end,
		{ Parent = { DamageService = "DamageService", AnimationService = "AnimationService", VoiceService = "VoiceService" } },
		random, { RaycastFilterType = { Exclude = "Exclude" } }, { new = function() return {} end }, vectors,
		{ lookAt = function(position, target) return { Position = position, Target = target } end },
		{ clock = function() return f.Now end }, taskMock,
		function(message) table.insert(f.Warnings, message) end)
	f.Service.Start(remotes)
	function f.Step()
		for _, thread in f.Threads do
			if coroutine.status(thread) ~= "dead" then
				local ok, message = coroutine.resume(thread)
				assert(ok, tostring(message))
			end
		end
	end
	function f.RunAll()
		for _ = 1, 1000 do
			local pending = false
			for _, thread in f.Threads do if coroutine.status(thread) ~= "dead" then pending = true end end
			if not pending then return end
			f.Step()
		end
		error("Execution scheduler failed to settle")
	end
	return f
end

local function assertReleased(f)
	equal(f.Character.Root.Anchored, false)
	equal(f.Attacker.Root.Anchored, false)
	for _, humanoid in { f.Character.Humanoid, f.Attacker.Humanoid } do
		equal(humanoid.WalkSpeed, 8)
		equal(humanoid.JumpPower, 40)
		equal(humanoid.JumpHeight, 6)
		equal(humanoid.AutoRotate, true)
		equal(humanoid.PlatformStand, false)
	end
	equal(f.Player:GetAttribute("ExecutionActive"), false)
	equal(f.Character:GetAttribute("ExecutionActive"), nil)
	equal(f.Attacker:GetAttribute("Executing"), nil)
	equal(f.Character.Animate.Disabled, false)
	equal(f.Immune, false)
	equal(f.Revoked, 1)
	equal(f.Character.Humanoid.Died:Count(), 0)
	equal(f.Attacker.Humanoid.Died:Count(), 0)
	equal(f.Player.CharacterRemoving:Count(), 0)
	equal(f.Attacker.AncestryChanged:Count(), 0)
end

test("execution denial gates cannot lock or damage a victim", function()
	local mutations = {
		function(f) f.Character.Humanoid.Health = 26 end,
		function(f) f.Character.Humanoid.Health = 0 end,
		function(f) f.Attacker.Humanoid.Health = 0 end,
		function(f) f.Attacker.Root.Position = vectors.new(100, 3, 0) end,
		function(f) f.BlockingRay = { Instance = { IsDescendantOf = function() return false end } } end,
		function(f) f.Character.Descendants = { { IsA = function(_, name) return name == "ForceField" end } } end,
		function(f) f.Player:SetAttribute("ExecutionActive", true) end,
		function(f) f.Attacker:SetAttribute("Executing", true) end,
		function(f) f.Attacker.Parent = nil end,
	}
	for _, mutate in mutations do
		local f = fixture()
		mutate(f)
		local health = f.Character.Humanoid.Health
		equal(f.Service.TryStart(f.Attacker, f.Player, "Felon"), false)
		equal(f.Character.Humanoid.Health, health)
		equal(f.Character.Root.Anchored, false)
		equal(f.Attacker.Root.Anchored, false)
		equal(#f.Events, 0)
		equal(#f.Threads, 0)
	end
end)

test("execution stages once then killing the attacker rescues and releases victim", function()
	local f = fixture()
	equal(f.Service.TryStart(f.Attacker, f.Player, "Felon"), true)
	equal(f.Character.Root.Anchored, true)
	equal(f.Attacker.Root.Anchored, true)
	equal(f.Character.Humanoid.WalkSpeed, 0)
	equal(f.Player:GetAttribute("ExecutionActive"), true)
	equal(f.Character.Animate.Disabled, true)
	equal(f.Service.TryStart(f.Attacker, f.Player, "Felon"), false)
	f.Attacker.Humanoid.Health = 0
	f.Attacker.Humanoid.Died:Fire()
	f.RunAll()
	assertReleased(f)
	equal(f.Character.Humanoid.Health, 20)
	equal(f.Events[#f.Events].Active, false)
	equal(f.Events[#f.Events].Completed, false)
end)

test("character removal, player departure, and rig removal each clean execution locks", function()
	for _, cancel in {
		function(f) f.Player.CharacterRemoving:Fire(f.Character) end,
		function(f) f.Players.PlayerRemoving:Fire(f.Player); f.Player.Parent = nil end,
		function(f) f.Attacker.Parent = nil; f.Attacker.AncestryChanged:Fire() end,
	} do
		local f = fixture()
		assert(f.Service.TryStart(f.Attacker, f.Player, "Felon"))
		cancel(f)
		f.RunAll()
		assertReleased(f)
		equal(f.Character.Humanoid.Health, 20)
	end
end)

test("victim death cancels without retaining anchors or camera state", function()
	local f = fixture()
	assert(f.Service.TryStart(f.Attacker, f.Player, "Felon"))
	f.Character.Humanoid.Health = 0
	f.Character.Humanoid.Died:Fire()
	f.RunAll()
	assertReleased(f)
	equal(f.Events[#f.Events].Completed, false)
end)

test("voice staging failure releases both actors and reports camera cancellation", function()
	local f = fixture()
	f.ThrowVoice = true
	equal(f.Service.TryStart(f.Attacker, f.Player, "Felon"), false)
	assertReleased(f)
	equal(f.Character.Humanoid.Health, 20)
	equal(#f.Threads, 0)
	equal(#f.Warnings, 1)
	equal(f.Events[#f.Events].Active, false)
	equal(f.Events[#f.Events].Completed, false)
end)

test("execution applies fatal damage only after the timeline and restores participants", function()
	local f = fixture()
	assert(f.Service.TryStart(f.Attacker, f.Player, "Felon"))
	equal(f.Character.Humanoid.Health, 20)
	while f.Now < 102.5 do f.Step() end
	equal(f.Character.Humanoid.Health, 20)
	f.RunAll()
	assert(f.Now >= 102.6)
	equal(f.Character.Humanoid.Health, 0)
	assertReleased(f)
	equal(f.Events[#f.Events].Active, false)
	equal(f.Events[#f.Events].Completed, true)
	assert(#f.Poses > 0 and #f.Effects > 0)
end)

print(string.format("%d execution lifecycle tests passed (API doubles; Studio staging remains unverified).", passed))
