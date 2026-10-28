--!strict
-- Pure server-session state machine. Never bind its lifetime to a player.
-- A claimed unique boss cannot be claimed again, even before its defeat.
local SessionRegistry = {}

function SessionRegistry.new(ids: { string })
	local states: { [string]: string } = {}
	for _, id in ids do
		assert(typeof(id) == "string" and id ~= "", "Boss IDs must be nonempty strings.")
		assert(states[id] == nil, "Duplicate boss ID: " .. id)
		states[id] = "Unspawned"
	end
	local registry = {}

	function registry:TrySpawn(id: string): boolean
		if states[id] ~= "Unspawned" then
			return false
		end
		states[id] = "Spawned"
		return true
	end

	function registry:MarkDefeated(id: string): boolean
		if states[id] ~= "Spawned" then
			return false
		end
		states[id] = "Defeated"
		return true
	end

	function registry:IsDefeated(id: string): boolean
		return states[id] == "Defeated"
	end

	function registry:GetState(id: string): string?
		return states[id]
	end

	function registry:GetDefeatedIds(): { string }
		local result = {}
		for id, state in states do
			if state == "Defeated" then
				table.insert(result, id)
			end
		end
		table.sort(result)
		return result
	end

	return table.freeze(registry)
end

return table.freeze(SessionRegistry)
