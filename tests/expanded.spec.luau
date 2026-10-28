-- Actual module source is inserted by tools/test.py. These are logic/data tests,
-- not Roblox simulation: physics, raycasts, replication, and cameras need Studio.
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

local rules = loadCombatRules()

test("server fire cadence consumes exactly one round only for an accepted shot", function()
	local state = rules.New(3, 20)
	equal(rules.TryFire(state, 0, 0.12), true)
	equal(state.Ammo, 2)
	equal(rules.TryFire(state, 0.1, 0.12), false)
	equal(state.Ammo, 2)
	equal(state.LastShot, 0)
	equal(rules.TryFire(state, 0.13, 0.12), true)
	equal(rules.TryFire(state, 0.26, 0.12), true)
	equal(state.Ammo, 0)
	equal(rules.TryFire(state, 1, 0.12), false)
	equal(state.Ammo, 0)
	equal(state.Reserve, 20)
end)

test("reload prevents firing and cannot finish before its server deadline", function()
	local state = rules.New(30, 50)
	equal(rules.TryFire(state, 0, 0.12), true)
	equal(rules.BeginReload(state, 1, 2, 30), true)
	equal(state.ReloadUntil, 3)
	equal(rules.TryFire(state, 2, 0.12), false)
	equal(rules.BeginReload(state, 2, 2, 30), false)
	equal(state.ReloadUntil, 3)
	equal(rules.CompleteReload(state, 2.99, 30), false)
	equal(state.Ammo, 29)
	equal(state.Reserve, 50)
	equal(rules.CompleteReload(state, 3, 30), true)
	equal(state.Ammo, 30)
	equal(state.Reserve, 49)
	equal(state.ReloadUntil, 0)
	equal(rules.CompleteReload(state, 4, 30), false)
	equal(rules.TryFire(state, 4, 0.12), true)
end)

test("reload respects empty reserve, full magazines, and partial reserve", function()
	local full = rules.New(30, 60)
	equal(rules.BeginReload(full, 0, 2, 30), false)
	local empty = rules.New(30, 0)
	empty.Ammo = 0
	equal(rules.BeginReload(empty, 0, 2, 30), false)
	local partial = rules.New(30, 3)
	partial.Ammo = 4
	equal(rules.BeginReload(partial, 0, 2, 30), true)
	equal(rules.CompleteReload(partial, 2, 30), true)
	equal(partial.Ammo, 7)
	equal(partial.Reserve, 0)
end)

test("reload conserves ammunition across capacity and reserve boundaries", function()
	for _, initialAmmo in { 0, 1, 15, 29 } do
		for _, reserve in { 1, 10, 30, 240 } do
			local state = rules.New(30, reserve)
			state.Ammo = initialAmmo
			local total = state.Ammo + state.Reserve
			equal(rules.BeginReload(state, 5, 2, 30), true)
			equal(rules.CompleteReload(state, 7, 30), true)
			equal(state.Ammo + state.Reserve, total)
			assert(state.Ammo <= 30 and state.Ammo > initialAmmo and state.Reserve >= 0)
		end
	end
end)

local rateLimiter = loadRateLimiter()
test("remote rate limiter enforces burst limits and time-based refill", function()
	local limiter = rateLimiter.new(3, 2)
	equal(limiter.Take("player", 0, 3), true)
	equal(limiter.Take("player", 0), false)
	equal(limiter.Take("player", 0.25), false)
	equal(limiter.Take("player", 0.5), true)
	equal(limiter.Take("player", 0.5), false)
	equal(limiter.Take("player", 20, 3), true)
	equal(limiter.Take("player", 20), false)
end)

test("rate limiter isolates users and cleanup releases their retained bucket", function()
	local limiter = rateLimiter.new(2, 1)
	equal(limiter.Take("first", 0, 2), true)
	equal(limiter.Take("second", 0, 2), true)
	equal(limiter.Take("first", 0), false)
	limiter.Forget("first")
	equal(limiter.Take("first", 0, 2), true)
	equal(limiter.Take("second", 0), false)
	equal(limiter.Take("third", 0, 0), false)
	equal(limiter.Take("third", 0, 3), false)
	equal(limiter.Take("third", 0, 2), true)
end)

test("execution cleanup can revoke temporary damage immunity", function()
	local target = { Health = 100, MaxHealth = 100 }
	function target:TakeDamage(amount) self.Health = math.max(0, self.Health - amount) end
	local damage = loadDamageService({ clock = function() return 10 end })
	equal(damage.GrantImmunity(target, 100), true)
	equal(damage.Damage(target, 20), 0)
	damage.RevokeImmunity(target)
	equal(damage.Damage(target, 20), 20)
	equal(target.Health, 80)
	damage.RevokeImmunity(target)
	equal(damage.Damage(target, 10), 10)
end)

local registryFactory = loadSessionRegistry()
test("unique bosses have one-way server-session spawn and defeat transitions", function()
	local registry = registryFactory.new({ "Felon", "Katya" })
	equal(registry:GetState("Felon"), "Unspawned")
	equal(registry:MarkDefeated("Felon"), false)
	equal(registry:TrySpawn("Felon"), true)
	equal(registry:GetState("Felon"), "Spawned")
	equal(registry:TrySpawn("Felon"), false)
	equal(registry:MarkDefeated("Felon"), true)
	equal(registry:GetState("Felon"), "Defeated")
	equal(registry:IsDefeated("Felon"), true)
	-- Repeated requests cannot reset the server state after any player lifecycle event.
	for _ = 1, 50 do
		equal(registry:TrySpawn("Felon"), false)
		equal(registry:MarkDefeated("Felon"), false)
	end
	equal(registry:GetState("Katya"), "Unspawned")
	equal(registry:TrySpawn("Katya"), true)
end)

test("session registry rejects unknown IDs and invalid registry membership", function()
	local registry = registryFactory.new({ "Felon" })
	equal(registry:TrySpawn("Unknown"), false)
	equal(registry:MarkDefeated("Unknown"), false)
	equal(registry:IsDefeated("Unknown"), false)
	equal(registry:GetState("Unknown"), nil)
	equal(pcall(function() registryFactory.new({ "Felon", "Felon" }) end), false)
	equal(pcall(function() registryFactory.new({ "" }) end), false)
	equal(pcall(function() registryFactory.new({ 5 }) end), false)
end)

test("defeated IDs are sorted defensive copies and new server sessions start fresh", function()
	local registry = registryFactory.new({ "Katya", "Felon" })
	for _, id in { "Katya", "Felon" } do
		assert(registry:TrySpawn(id) and registry:MarkDefeated(id))
	end
	local ids = registry:GetDefeatedIds()
	equal(table.concat(ids, ","), "Felon,Katya")
	ids[1] = "Changed"
	equal(table.concat(registry:GetDefeatedIds(), ","), "Felon,Katya")
	local nextServer = registryFactory.new({ "Katya", "Felon" })
	equal(nextServer:IsDefeated("Felon"), false)
	equal(nextServer:TrySpawn("Felon"), true)
end)

local executions = loadExecutionConfig()
local animations = loadAnimationConfig()
test("all 20 execution variants have unique IDs and valid supported pose timelines", function()
	local expected = { Felon = 2, Sukhoi = 3, Mikoyan = 3, Nikolai = 2, Novak = 2, John = 2, Jayden = 2, Katya = 4 }
	local ids, bossCount, variantCount = {}, 0, 0
	for bossId, variants in executions.Bosses do
		bossCount += 1
		equal(#variants, expected[bossId])
		assert(animations.Styles[bossId], "Missing animation style for " .. bossId)
		for _, variant in variants do
			variantCount += 1
			assert(type(variant.Id) == "string" and variant.Id ~= "" and not ids[variant.Id], "Duplicate/empty execution ID")
			ids[variant.Id] = true
			assert(variant.Duration > 0 and variant.Duration <= 10)
			assert(#variant.Beats >= 2)
			equal(variant.Beats[1].At, 0)
			local last = -1
			for _, beat in variant.Beats do
				assert(beat.At >= last and beat.At < variant.Duration, "Execution beat outside duration/order: " .. variant.Id)
				assert(animations.Poses[beat.Pose], "Unsupported attacker pose: " .. tostring(beat.Pose))
				assert(not beat.VictimPose or animations.Poses[beat.VictimPose], "Unsupported victim pose")
				assert(not beat.Effect or beat.Effect == "Blood" or beat.Effect == "Shot", "Unknown execution effect")
				last = beat.At
			end
		end
	end
	equal(bossCount, 8)
	equal(variantCount, 20)
	equal(executions.Range, 7)
	equal(executions.MaxVictimHealth, 25)
end)

local voices = loadVoiceConfig()
test("voice configuration preserves silent and restricted dialogue characters", function()
	equal(next(voices.Voices.Novak.Lines), nil)
	equal(voices.Voices.Novak.Volume, 0)
	local mikoyan = voices.Voices.Mikoyan.Lines
	equal(#mikoyan.Execution, 1)
	equal(mikoyan.Execution[1].Text, "Leave me ALONE.")
	local categoryCount = 0
	for _ in mikoyan do categoryCount += 1 end
	equal(categoryCount, 1)
	equal(#voices.Voices.Sukhoi.Lines.Execution, 0)
	equal(voices.Voices.Felon.Lines.Nearby[1].Text, "Footsteps? WHO IS THERE!!!!")
	equal(voices.Voices.Nikolai.Lines.Nearby[1].Text, "Novak???? ARE YOU THERE???? NOVAK!!")
	equal(voices.Voices.Katya.Lines.Execution[3].Text, "I HATE YOU, I HATE YOU, DIEEEEEEEE!!!!!!!!!")
end)

test("proposed dialogue stays opt-in and all recorded audio slots are explicit", function()
	equal(voices.AllowProposed, false)
	equal(voices.Voices.John.Proposed, true)
	equal(voices.Voices.Jayden.Proposed, true)
	for _, voice in voices.Voices do
		for _, lines in voice.Lines do
			for _, line in lines do
				assert(type(line.Text) == "string" and #line.Text > 0)
				assert(line.Duration > 0 and line.Duration <= 10)
				assert(line.SoundId == "" or string.match(line.SoundId, "^rbxassetid://[1-9]%d*$"), "Invalid audio slot")
			end
		end
	end
end)

test("execution and animation configuration tables are deeply immutable", function()
	local function check(value)
		assert(table.isfrozen(value))
		for _, child in value do
			if type(child) == "table" then check(child) end
		end
	end
	check(executions)
	check(animations)
	equal(pcall(function() executions.Bosses.Katya[1].Beats[1].At = 10 end), false)
end)

local map = loadMapConfig(
	{ new = function(x, y, z) return { X = x, Y = y, Z = z } end },
	{ new = function(x, y, z) return { Position = { X = x, Y = y, Z = z } } end },
	{ fromRGB = function(r, g, b) return { R = r, G = g, B = b } end })

test("map has six distinct reactor sectors with construction units five and six", function()
	equal(#map.Sectors, 6)
	local ids = {}
	for _, sector in map.Sectors do
		assert(sector.Id >= 1 and sector.Id <= 6 and not ids[sector.Id])
		equal(sector.Reactor, sector.Id)
		ids[sector.Id] = true
		if sector.Id >= 5 then equal(sector.Status, "UNFINISHED") end
	end
end)

test("all boss and infected spawn coordinates belong to a unique sector", function()
	local bossCount = 0
	local function checkSpawn(cf)
		local inside = 0
		for _, sector in map.Sectors do
			if math.abs(cf.Position.X - sector.Center.X) < map.SectorSize.X / 2
				and math.abs(cf.Position.Z - sector.Center.Z) < map.SectorSize.Z / 2 then inside += 1 end
		end
		equal(inside, 1)
		equal(cf.Position.Y, 4)
	end
	for bossId, cf in map.BossSpawns do
		assert(executions.Bosses[bossId], "Unknown boss map spawn")
		checkSpawn(cf)
		bossCount += 1
	end
	equal(bossCount, 8)
	equal(#map.InfectedSpawns, 12)
	for _, cf in map.InfectedSpawns do checkSpawn(cf) end
end)

test("Mikoyan starts inside his quiet room and checkpoint starts outside sector one", function()
	local position, center, size = map.BossSpawns.Mikoyan.Position, map.MikoyanRoom.Center, map.MikoyanRoom.Size
	assert(math.abs(position.X - center.X) < size.X / 2)
	assert(math.abs(position.Y - center.Y) < size.Y / 2)
	assert(math.abs(position.Z - center.Z) < size.Z / 2)
	assert(map.Checkpoint.Position.X < map.Sectors[1].Center.X - map.SectorSize.X / 2)
end)

print(string.format("%d expanded tests passed (actual Luau logic/configuration; Studio behavior unverified).", passed))
