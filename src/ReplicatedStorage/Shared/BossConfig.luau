--!strict
-- Canonical registry only. Phase 1 does not spawn or simulate bosses.
export type BossDefinition = {
	Name: string,
	Classification: "Miniboss" | "Megaboss",
	MaxHealth: number,
	NameTag: string,
	NameTagColor: Color3,
	RespawnsInSession: boolean,
}

local red = Color3.fromRGB(255, 0, 0)

local bosses: { [string]: BossDefinition } = {
	Felon = {
		Name = "Felon", Classification = "Miniboss", MaxHealth = 1500,
		NameTag = "____-FELON", NameTagColor = red, RespawnsInSession = false,
	},
	Sukhoi = {
		Name = "Sukhoi", Classification = "Megaboss", MaxHealth = 5000,
		NameTag = "____-#SUKHOI#", NameTagColor = red, RespawnsInSession = false,
	},
	Mikoyan = {
		Name = "Mikoyan", Classification = "Miniboss", MaxHealth = 1500,
		NameTag = "MIKOYAN___", NameTagColor = red, RespawnsInSession = false,
	},
	Nikolai = {
		Name = "Nikolai", Classification = "Miniboss", MaxHealth = 1000,
		NameTag = "___NIKOLAI##", NameTagColor = red, RespawnsInSession = false,
	},
	Novak = {
		Name = "Novak", Classification = "Miniboss", MaxHealth = 1000,
		NameTag = "##NOVAK___", NameTagColor = red, RespawnsInSession = false,
	},
	John = {
		Name = "John", Classification = "Miniboss", MaxHealth = 2000,
		NameTag = "CI_JOHN", NameTagColor = red, RespawnsInSession = false,
	},
	Jayden = {
		Name = "Jayden", Classification = "Megaboss", MaxHealth = 8000,
		NameTag = "CI_JAYDEN", NameTagColor = red, RespawnsInSession = false,
	},
	Katya = {
		Name = "Katya", Classification = "Megaboss", MaxHealth = 12000,
		NameTag = "###_:(KATYA--", NameTagColor = red, RespawnsInSession = false,
	},
}

for _, boss in bosses do
	table.freeze(boss)
end

return table.freeze(bosses)
