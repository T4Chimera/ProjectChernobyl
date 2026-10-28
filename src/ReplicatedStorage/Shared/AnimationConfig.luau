--!strict
-- Prototype procedural poses. Add creator-owned uploaded animation IDs later.
-- Angles are local Motor6D offsets in degrees, preserving each rig's bind pose.
local AnimationConfig = {
	UpdateSeconds = 0.1,
	BlendSeconds = 0.12,
	DefaultActionSeconds = 0.45,
	Styles = {
		Felon = { Stride = 0.75, Sway = 1.2, Cadence = 1.25 },
		Sukhoi = { Stride = 1.05, Sway = 0.7, Cadence = 0.85 },
		Mikoyan = { Stride = 0.55, Sway = 0.4, Cadence = 0.8 },
		Nikolai = { Stride = 0.8, Sway = 0.8, Cadence = 1 },
		Novak = { Stride = 1.15, Sway = 0.3, Cadence = 1.6 },
		John = { Stride = 0.7, Sway = 0.35, Cadence = 1.1 },
		Jayden = { Stride = 1, Sway = 0.65, Cadence = 0.9 },
		Katya = { Stride = 0.9, Sway = 1.5, Cadence = 1.1 },
		Infected = { Stride = 0.85, Sway = 1.1, Cadence = 1 },
	},
	Poses = {
		Idle = { Neck = { -4, 0, 0 } },
		Guard = { RightShoulder = { -65, 0, 15 }, LeftShoulder = { -50, 0, -20 } },
		Attack = { RightShoulder = { -115, -20, 20 }, LeftShoulder = { -25, 0, -10 }, Root = { 10, 15, 0 } },
		Fire = { RightShoulder = { -85, 0, 6 }, LeftShoulder = { -75, 30, -12 }, Root = { -5, 0, 0 } },
		Hit = { Root = { -18, 0, 12 }, Neck = { 15, 0, -10 } },
		Sit = { RightHip = { -90, 0, 0 }, LeftHip = { -90, 0, 0 }, Neck = { 18, -8, 0 }, RightShoulder = { -20, 0, 10 }, LeftShoulder = { -25, 0, -10 } },
		Windup = { RightShoulder = { 80, -20, 30 }, LeftShoulder = { -35, 0, -25 }, Root = { -12, -28, 0 } },
		Strike = { RightShoulder = { -100, 0, -15 }, LeftShoulder = { -35, 0, -15 }, Root = { 18, 25, 0 } },
		Kick = { RightHip = { -80, 0, 8 }, LeftHip = { 12, 0, 0 }, Root = { -15, 0, -8 } },
		Grab = { RightShoulder = { -90, -12, 15 }, LeftShoulder = { -90, 12, -15 }, Root = { 10, 0, 0 } },
		Lift = { RightShoulder = { -145, 0, 12 }, LeftShoulder = { -145, 0, -12 }, Root = { -12, 0, 0 } },
		Slam = { RightShoulder = { -55, 0, 20 }, LeftShoulder = { -55, 0, -20 }, Root = { 35, 0, 0 } },
		Burst = { RightShoulder = { -92, 0, 5 }, LeftShoulder = { -80, 20, -10 }, Root = { -10, 0, 0 } },
		Throw = { RightShoulder = { -80, 55, 0 }, LeftShoulder = { -75, 55, 0 }, Root = { 10, 65, 0 } },
		Stagger = { RightShoulder = { 10, 0, 25 }, LeftShoulder = { 10, 0, -25 }, Root = { -25, 0, 8 }, Neck = { 10, 0, -5 } },
		Down = { Root = { 75, 0, 0 }, RightHip = { -10, 0, 15 }, LeftHip = { -15, 0, -15 }, RightShoulder = { -20, 0, 45 }, LeftShoulder = { -20, 0, -45 } },
		Death = { Root = { 65, 0, -15 }, RightShoulder = { 5, 0, 30 }, LeftShoulder = { 5, 0, -30 }, Neck = { 15, 0, 10 } },
	},
	-- Empty slots are deliberate, not fabricated Roblox asset identifiers.
	Assets = {
		Felon = {}, Sukhoi = {}, Mikoyan = {}, Nikolai = {},
		Novak = {}, John = {}, Jayden = {}, Katya = {}, Player = {}, Infected = {},
	},
}

local function freezeDeep(value)
	for _, child in value do
		if type(child) == "table" then freezeDeep(child) end
	end
	table.freeze(value)
end
freezeDeep(AnimationConfig)
return AnimationConfig
