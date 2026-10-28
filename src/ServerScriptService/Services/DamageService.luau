--!strict
-- Server-only API for future enemies, weapons, healing, and hazards.
-- No client remotes: callers must be trusted server code.
local DamageService = {}
local immuneUntil: { [Humanoid]: number } = setmetatable({}, { __mode = "k" }) :: any

local function isPositiveFinite(value: number): boolean
	return typeof(value) == "number" and value > 0 and value < math.huge
end

function DamageService.GrantImmunity(humanoid: Humanoid, seconds: number): boolean
	if not isPositiveFinite(seconds) or humanoid.Health <= 0 then
		return false
	end
	immuneUntil[humanoid] = math.max(immuneUntil[humanoid] or 0, os.clock() + seconds)
	return true
end

function DamageService.RevokeImmunity(humanoid: Humanoid)
	immuneUntil[humanoid] = nil
end

function DamageService.Damage(humanoid: Humanoid, amount: number): number
	if not isPositiveFinite(amount) or humanoid.Health <= 0 then
		return 0
	end
	if (immuneUntil[humanoid] or 0) > os.clock() then
		return 0
	end
	local before = humanoid.Health
	-- TakeDamage also respects Roblox ForceFields; do not bypass spawn protection.
	humanoid:TakeDamage(amount)
	return math.max(0, before - humanoid.Health)
end

function DamageService.Heal(humanoid: Humanoid, amount: number): number
	if not isPositiveFinite(amount) or humanoid.Health <= 0 then
		return 0
	end
	local before = humanoid.Health
	humanoid.Health = math.min(humanoid.MaxHealth, before + amount)
	return math.max(0, humanoid.Health - before)
end

return table.freeze(DamageService)
