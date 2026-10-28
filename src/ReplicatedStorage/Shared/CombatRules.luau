--!strict
-- Engine-independent ammunition rules. All timestamps and settings come from server code.
local CombatRules = {}

function CombatRules.New(magazineSize: number, reserve: number)
	return { Ammo = magazineSize, Reserve = reserve, LastShot = -math.huge, ReloadUntil = 0 }
end

function CombatRules.TryFire(state, now: number, interval: number): boolean
	if state.ReloadUntil > 0 or state.Ammo <= 0 or now - state.LastShot < interval then
		return false
	end
	state.Ammo -= 1
	state.LastShot = now
	return true
end

function CombatRules.BeginReload(state, now: number, seconds: number, capacity: number): boolean
	if state.ReloadUntil > 0 or state.Ammo >= capacity or state.Reserve <= 0 then
		return false
	end
	state.ReloadUntil = now + seconds
	return true
end

function CombatRules.CompleteReload(state, now: number, capacity: number): boolean
	if state.ReloadUntil <= 0 or now < state.ReloadUntil then
		return false
	end
	local transfer = math.min(capacity - state.Ammo, state.Reserve)
	state.Ammo += transfer
	state.Reserve -= transfer
	state.ReloadUntil = 0
	return true
end

return table.freeze(CombatRules)
