--!strict
local RateLimiter = {}

function RateLimiter.new(capacity: number, refillPerSecond: number)
	local buckets = {}
	local limiter = {}
	function limiter.Take(key, now: number, cost: number?): boolean
		local wanted = cost or 1
		local bucket = buckets[key]
		if not bucket then
			bucket = { Tokens = capacity, At = now }
			buckets[key] = bucket
		end
		bucket.Tokens = math.min(capacity, bucket.Tokens + math.max(0, now - bucket.At) * refillPerSecond)
		bucket.At = now
		if wanted <= 0 or wanted > capacity or bucket.Tokens < wanted then
			return false
		end
		bucket.Tokens -= wanted
		return true
	end
	function limiter.Forget(key)
		buckets[key] = nil
	end
	return limiter
end

return table.freeze(RateLimiter)
