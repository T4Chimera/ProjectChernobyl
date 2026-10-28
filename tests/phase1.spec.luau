-- Run through python3 tools/test.py. The runner inserts the actual production
-- modules into factories so the CLI can supply explicit Roblox API doubles.
-- This validates module logic; camera, engine physics, and replication need Studio.
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

local Color3Mock = {
	fromRGB = function(r, g, b)
		return table.freeze({ R = r / 255, G = g / 255, B = b / 255 })
	end,
}
local config = loadGameConfig()
local bosses = loadBossConfig(Color3Mock)

test("canonical eight-boss registry and session policy", function()
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
	for name, boss in bosses do
		count += 1
		local canonical = expected[name]
		assert(canonical, "unexpected boss " .. name)
		equal(boss.Name, name)
		equal(boss.MaxHealth, canonical[1])
		equal(boss.NameTag, canonical[2])
		equal(boss.Classification, canonical[3])
		equal(boss.NameTagColor.R, 1)
		equal(boss.NameTagColor.G, 0)
		equal(boss.NameTagColor.B, 0)
		equal(boss.RespawnsInSession, false)
	end
	equal(count, 8)
	equal(config.Player.MaxHealth, 100)
	equal(config.Enemies.UniqueBossesRespawnInSession, false)
	equal(config.Enemies.OrdinaryInfectedRespawn, true)
	equal(table.concat(config.TaskForces, ","), "Nu-7,Epsilon-11,Beta-7,Zeta-9")
end)

test("canonical configuration is immutable", function()
	for _, value in { config, config.Player, config.Camera, config.Enemies, config.TaskForces, bosses } do
		assert(table.isfrozen(value))
	end
	for _, boss in bosses do
		assert(table.isfrozen(boss))
	end
	equal(pcall(function() bosses.Felon.MaxHealth = 1 end), false)
	equal(pcall(function() config.Player.MaxHealth = 1 end), false)
end)

local function humanoid(health)
	local object = { Health = health or 100, MaxHealth = 100, Protected = false }
	function object:IsA(className)
		return className == "Humanoid"
	end
	function object:TakeDamage(amount)
		-- Roblox itself owns ForceField behavior; the double models that contract.
		if not self.Protected then
			self.Health = math.max(0, self.Health - amount)
		end
	end
	return object
end

local now = 100
local damage = loadDamageService({ clock = function() return now end })

test("damage reports actual loss and heal caps at maximum", function()
	local target = humanoid()
	equal(damage.Damage(target, 30), 30)
	equal(target.Health, 70)
	equal(damage.Heal(target, 20), 20)
	equal(damage.Heal(target, 1000), 10)
	equal(target.Health, 100)
	equal(damage.Heal(target, 1), 0)
end)

test("invalid damage, heal, and immunity inputs do not alter health", function()
	local target = humanoid(80)
	for _, invalid in { 0, -1, math.huge, -math.huge, 0 / 0, "10", false } do
		equal(damage.Damage(target, invalid), 0)
		equal(damage.Heal(target, invalid), 0)
		equal(damage.GrantImmunity(target, invalid), false)
		equal(target.Health, 80)
	end
	equal(damage.Damage(target, nil), 0)
	equal(damage.Heal(target, nil), 0)
	equal(damage.GrantImmunity(target, nil), false)
end)

test("lethal damage clamps loss and healing cannot revive", function()
	local target = humanoid(30)
	equal(damage.Damage(target, 1000), 30)
	equal(target.Health, 0)
	equal(damage.Heal(target, 100), 0)
	equal(damage.Damage(target, 1), 0)
	equal(damage.GrantImmunity(target, 2), false)
	equal(target.Health, 0)
end)

test("damage uses TakeDamage and respects ForceField contract", function()
	local target = humanoid()
	target.Protected = true
	equal(damage.Damage(target, 80), 0)
	equal(target.Health, 100)
	target.Protected = false
	equal(damage.Damage(target, 80), 80)
end)

test("temporary immunity is isolated, expires, and cannot be shortened", function()
	local first, second = humanoid(), humanoid()
	now = 200
	equal(damage.GrantImmunity(first, 10), true)
	now = 201
	equal(damage.GrantImmunity(first, 1), true)
	now = 203
	equal(damage.Damage(first, 20), 0)
	equal(damage.Damage(second, 20), 20)
	now = 210
	equal(damage.Damage(first, 20), 20)
end)

local function signal()
	local event = { Connections = {} }
	function event:Connect(callback)
		local connection = { Connected = true, Callback = callback }
		function connection:Disconnect() self.Connected = false end
		table.insert(self.Connections, connection)
		return connection
	end
	function event:Fire(value)
		for _, connection in table.clone(self.Connections) do
			if connection.Connected then connection.Callback(value) end
		end
	end
	function event:ActiveCount()
		local count = 0
		for _, connection in self.Connections do
			if connection.Connected then count += 1 end
		end
		return count
	end
	return event
end

local function character(target)
	local model = { Name = "TestCharacter", Humanoid = target }
	function model:WaitForChild(name, timeout)
		equal(name, "Humanoid")
		equal(timeout, config.InstanceWaitSeconds)
		if self.BeforeWaitReturns then self.BeforeWaitReturns() end
		return self.Humanoid
	end
	return model
end

local function player(name, model)
	return { Name = name, Character = model, CharacterAdded = signal() }
end

local function playerEnvironment(existing)
	local players = { PlayerAdded = signal(), PlayerRemoving = signal() }
	function players:GetPlayers() return existing or {} end
	local fakeGame = {}
	function fakeGame:GetService(name)
		equal(name, "Players")
		return players
	end
	local warnings = {}
	local service = loadPlayerService(fakeGame, {
		spawn = function(callback, ...) callback(...) end,
	}, function(message) table.insert(warnings, message) end)
	return service, players, warnings
end

test("existing and newly joined players receive 100 HP and prototype movement", function()
	local firstBody, secondBody = humanoid(40), humanoid(60)
	firstBody.MaxHealth = 200
	local first = player("Existing", character(firstBody))
	local service, players = playerEnvironment({ first })
	service.Start(config.Player, config.InstanceWaitSeconds)
	equal(firstBody.MaxHealth, 100)
	equal(firstBody.Health, 100)
	equal(firstBody.WalkSpeed, config.Player.WalkSpeed)
	equal(firstBody.JumpPower, config.Player.JumpPower)
	equal(firstBody.UseJumpPower, true)
	equal(players.RespawnTime, config.Player.RespawnTime)
	local second = player("Joined", nil)
	players.PlayerAdded:Fire(second)
	second.Character = character(secondBody)
	second.CharacterAdded:Fire(second.Character)
	equal(secondBody.Health, 100)
end)

test("duplicate initialization never heals a living character", function()
	local body = humanoid()
	local user = player("Duplicate", character(body))
	local service, players = playerEnvironment({ user })
	service.Start(config.Player, config.InstanceWaitSeconds)
	body.Health = 45
	service.Start(config.Player, config.InstanceWaitSeconds)
	players.PlayerAdded:Fire(user)
	user.CharacterAdded:Fire(user.Character)
	equal(body.Health, 45)
	equal(user.CharacterAdded:ActiveCount(), 1)
	equal(players.PlayerAdded:ActiveCount(), 1)
end)

test("respawn initializes new body and leave disconnects character listener", function()
	local oldBody = humanoid()
	local user = player("Respawn", character(oldBody))
	local service, players = playerEnvironment({ user })
	service.Start(config.Player, config.InstanceWaitSeconds)
	oldBody.Health = 0
	local newBody = humanoid(30)
	user.Character = character(newBody)
	user.CharacterAdded:Fire(user.Character)
	equal(newBody.Health, 100)
	equal(oldBody.Health, 0)
	players.PlayerRemoving:Fire(user)
	equal(user.CharacterAdded:ActiveCount(), 0)
	local afterLeave = humanoid(25)
	user.Character = character(afterLeave)
	user.CharacterAdded:Fire(user.Character)
	equal(afterLeave.Health, 25)
end)

test("missing or wrong Humanoid warns; dead characters are not revived", function()
	local missing = player("Missing", character(nil))
	local wrong = player("Wrong", character({ IsA = function() return false end }))
	local deadBody = humanoid(0)
	local dead = player("Dead", character(deadBody))
	local service, _, warnings = playerEnvironment({ missing, wrong, dead })
	service.Start(config.Player, config.InstanceWaitSeconds)
	equal(#warnings, 2)
	assert(string.find(warnings[1], "Missing", 1, true))
	assert(string.find(warnings[2], "Wrong", 1, true))
	equal(deadBody.Health, 0)
end)

test("leave during Humanoid wait prevents stale character initialization", function()
	local body = humanoid(35)
	local user = player("Leaving", character(body))
	local service, players = playerEnvironment({ user })
	user.Character.BeforeWaitReturns = function() players.PlayerRemoving:Fire(user) end
	service.Start(config.Player, config.InstanceWaitSeconds)
	equal(body.Health, 35)
	equal(user.CharacterAdded:ActiveCount(), 0)
end)

test("respawn during Humanoid wait only initializes the current character", function()
	local oldBody, newBody = humanoid(35), humanoid(25)
	local oldCharacter, newCharacter = character(oldBody), character(newBody)
	local user = player("Racing", oldCharacter)
	local service = playerEnvironment({ user })
	oldCharacter.BeforeWaitReturns = function()
		user.Character = newCharacter
		user.CharacterAdded:Fire(newCharacter)
	end
	service.Start(config.Player, config.InstanceWaitSeconds)
	equal(oldBody.Health, 35)
	equal(newBody.Health, 100)
end)

print(string.format("%d tests passed (Luau CLI with Roblox API doubles; Studio checks still required).", passed))
