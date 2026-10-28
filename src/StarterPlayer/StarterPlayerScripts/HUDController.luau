--!strict
local Players = game:GetService("Players")
local GuiService = game:GetService("GuiService")
local UserInputService = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local BossConfig = require(Shared:WaitForChild("BossConfig"))
local ClientConfig = require(Shared:WaitForChild("ClientConfig"))

local HUDController = {}
HUDController.__index = HUDController
local pale = Color3.fromRGB(211, 222, 209)
local green = Color3.fromRGB(119, 161, 130)
local red = Color3.fromRGB(211, 82, 73)

local function label(parent: Instance, text: string, position: UDim2, size: UDim2, fontSize: number): TextLabel
	local object = Instance.new("TextLabel")
	object.BackgroundTransparency = 1
	object.Text = text
	object.Position = position
	object.Size = size
	object.Font = Enum.Font.Code
	object.TextSize = fontSize
	object.TextColor3 = pale
	object.TextXAlignment = Enum.TextXAlignment.Left
	object.TextWrapped = true
	object.Parent = parent
	return object
end

local function panel(parent: Instance, position: UDim2, size: UDim2): Frame
	local object = Instance.new("Frame")
	object.Position = position
	object.Size = size
	object.BackgroundColor3 = Color3.fromRGB(12, 17, 16)
	object.BackgroundTransparency = 0.17
	object.BorderSizePixel = 0
	object.Parent = parent
	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(58, 75, 64)
	stroke.Transparency = 0.3
	stroke.Parent = object
	return object
end

local function button(parent: Instance, text: string, position: UDim2, size: UDim2): TextButton
	local object = Instance.new("TextButton")
	object.Text = text
	object.Position = position
	object.Size = size
	object.BackgroundColor3 = Color3.fromRGB(36, 49, 42)
	object.TextColor3 = pale
	object.Font = Enum.Font.Code
	object.TextSize = 15
	object.TextWrapped = true
	object.AutoButtonColor = true
	object.BorderSizePixel = 0
	object.Parent = parent
	return object
end

function HUDController.new(onSelectTaskForce: (string) -> (), onSettings: (any) -> ())
	local self = setmetatable({}, HUDController)
	self.Settings = {
		Blood = ClientConfig.DefaultBloodEnabled,
		Subtitles = ClientConfig.DefaultSubtitlesEnabled,
		ReducedMotion = ClientConfig.DefaultReducedMotion,
	}
	self.State = {}
	self.SubtitleToken = 0
	self.NoticeToken = 0
	self.Connections = {}
	local gui = Instance.new("ScreenGui")
	gui.Name = "ChernobylHUD"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = false
	gui.DisplayOrder = 20
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")
	self.Gui = gui

	local top = panel(gui, UDim2.fromOffset(16, 12), UDim2.new(0.55, 0, 0, 62))
	label(top, "PROJECT CHERNOBYL  /  DEVELOPMENT PROTOTYPE", UDim2.fromOffset(12, 5), UDim2.new(1, -24, 0, 20), 13)
	self.Sector = label(top, "CHECKPOINT  /  FACILITY POWER OFF", UDim2.fromOffset(12, 29), UDim2.new(1, -24, 0, 23), 16)
	local menuButton = button(gui, "TASK FORCE / SETTINGS  [M]", UDim2.new(1, -250, 0, 12), UDim2.fromOffset(234, 38))
	self.MenuButton = menuButton
	table.insert(self.Connections, menuButton.Activated:Connect(function() self:ToggleMenu() end))

	local bottom = panel(gui, UDim2.new(0, 16, 1, -116), UDim2.fromOffset(270, 100))
	self.Health = label(bottom, "HEALTH  -- / 100", UDim2.fromOffset(12, 8), UDim2.new(1, -24, 0, 28), 20)
	local barBackground = panel(bottom, UDim2.fromOffset(12, 43), UDim2.new(1, -24, 0, 6))
	local fill = Instance.new("Frame")
	fill.BorderSizePixel = 0
	fill.BackgroundColor3 = green
	fill.Size = UDim2.fromScale(1, 1)
	fill.Parent = barBackground
	self.HealthFill = fill
	self.Force = label(bottom, "UNASSIGNED", UDim2.fromOffset(12, 60), UDim2.new(1, -24, 0, 28), 14)

	local ammoPanel = panel(gui, UDim2.new(1, -286, 1, -116), UDim2.fromOffset(270, 100))
	self.Ammo = label(ammoPanel, "-- / --", UDim2.fromOffset(12, 7), UDim2.new(1, -24, 0, 32), 28)
	self.Reload = label(ammoPanel, "R RELOAD  /  RMB AIM", UDim2.fromOffset(12, 44), UDim2.new(1, -24, 0, 23), 13)
	label(ammoPanel, "WEAPON LIGHT: ALWAYS ON", UDim2.fromOffset(12, 69), UDim2.new(1, -24, 0, 20), 12)

	self.Crosshair = label(gui, "+", UDim2.new(0.5, -10, 0.5, -13), UDim2.fromOffset(20, 26), 23)
	self.Crosshair.TextXAlignment = Enum.TextXAlignment.Center
	self.Crosshair.TextTransparency = 0.2
	self.HitMarker = label(gui, "×", UDim2.new(0.5, -13, 0.5, -15), UDim2.fromOffset(26, 30), 29)
	self.HitMarker.TextXAlignment = Enum.TextXAlignment.Center
	self.HitMarker.Visible = false

	local bossPanel = panel(gui, UDim2.new(0.5, -210, 0, 85), UDim2.fromOffset(420, 66))
	self.BossPanel = bossPanel
	self.BossName = label(bossPanel, "", UDim2.fromOffset(12, 5), UDim2.new(1, -24, 0, 25), 19)
	self.BossName.TextColor3 = Color3.fromRGB(255, 0, 0)
	self.BossHealth = label(bossPanel, "", UDim2.fromOffset(12, 31), UDim2.new(1, -24, 0, 23), 14)
	bossPanel.Visible = false

	self.Subtitle = label(gui, "", UDim2.new(0.17, 0, 1, -210), UDim2.new(0.66, 0, 0, 77), 18)
	self.Subtitle.TextXAlignment = Enum.TextXAlignment.Center
	self.Subtitle.TextStrokeTransparency = 0.25
	self.Subtitle.Visible = false
	self.Notice = label(gui, "", UDim2.new(0.25, 0, 0.28, 0), UDim2.new(0.5, 0, 0, 60), 19)
	self.Notice.TextXAlignment = Enum.TextXAlignment.Center
	self.Notice.TextStrokeTransparency = 0.25
	self.Notice.Visible = false

	self.Death = label(gui, "OPERATOR DOWN\nRespawning…", UDim2.new(0.2, 0, 0.68, 0), UDim2.new(0.6, 0, 0, 75), 24)
	self.Death.TextXAlignment = Enum.TextXAlignment.Center
	self.Death.TextColor3 = red
	self.Death.Visible = false

	-- A modal GuiButton releases the mouse while the menu is open, preserving
	-- the first-person camera mode behind it.
	local shade = Instance.new("TextButton")
	shade.Name = "MenuShade"
	shade.Text = ""
	shade.AutoButtonColor = false
	shade.Modal = true
	shade.BackgroundColor3 = Color3.new(0, 0, 0)
	shade.BackgroundTransparency = 0.2
	shade.Size = UDim2.fromScale(1, 1)
	shade.ZIndex = 10
	shade.Parent = gui
	self.Menu = shade
	local menu = panel(shade, UDim2.fromScale(0.5, 0.5), UDim2.new(0.9, 0, 0, 440))
	menu.AnchorPoint = Vector2.new(0.5, 0.5)
	menu.ZIndex = 11
	local constraint = Instance.new("UISizeConstraint")
	constraint.MaxSize = Vector2.new(580, 440)
	constraint.Parent = menu
	label(menu, "FOUNDATION DEPLOYMENT", UDim2.fromOffset(22, 15), UDim2.new(1, -44, 0, 32), 23)
	label(menu, "Choose a task force. Uniforms and rifle are provisional.\nFacility lights are off. Your weapon flashlight stays on.", UDim2.fromOffset(22, 52), UDim2.new(1, -44, 0, 58), 14)
	for index, force in GameConfig.TaskForces do
		local row = math.floor((index - 1) / 2)
		local column = (index - 1) % 2
		local forceButton = button(menu, force, UDim2.new(column * 0.48 + 0.04, 0, 0, 125 + row * 50), UDim2.new(0.44, 0, 0, 40))
		if index == 1 then self.DefaultSelection = forceButton end
		table.insert(self.Connections, forceButton.Activated:Connect(function()
			onSelectTaskForce(force)
			self:SetMenuVisible(false)
		end))
	end
	local settingKeys = { "Blood", "Subtitles", "ReducedMotion" }
	local settingNames = { Blood = "BLOOD FX", Subtitles = "SUBTITLES", ReducedMotion = "REDUCED MOTION" }
	for index, key in settingKeys do
		local settingButton = button(menu, "", UDim2.new(0.04 + (index - 1) * 0.315, 0, 0, 240), UDim2.new(0.29, 0, 0, 44))
		settingButton.TextSize = 12
		local function redraw()
			settingButton.Text = settingNames[key] .. "\n" .. (self.Settings[key] and "ON" or "OFF")
		end
		redraw()
		table.insert(self.Connections, settingButton.Activated:Connect(function()
			self.Settings[key] = not self.Settings[key]
			if key == "Subtitles" and not self.Settings[key] then self.Subtitle.Visible = false end
			redraw()
			onSettings(self.Settings)
		end))
	end
	label(menu, "WASD move · SPACE jump · SHIFT sprint · C crouch\nMOUSE1 fire · RMB aim · R reload · M menu\nTouch buttons and gamepad controls are also supported.", UDim2.fromOffset(22, 302), UDim2.new(1, -44, 0, 64), 13)
	local close = button(menu, "RETURN TO FACILITY", UDim2.new(0.04, 0, 0, 383), UDim2.new(0.92, 0, 0, 37))
	table.insert(self.Connections, close.Activated:Connect(function() self:SetMenuVisible(false) end))
	if UserInputService.GamepadEnabled then GuiService.SelectedObject = self.DefaultSelection end
	return self
end

function HUDController:SetState(patch)
	for key, value in patch do self.State[key] = value end
	self.Ammo.Text = string.format("%s / %s", tostring(self.State.Ammo or "--"), tostring(self.State.Reserve or "--"))
	self.Force.Text = tostring(self.State.TaskForce or "UNASSIGNED") .. "  /  " .. tostring(self.State.MoveMode or "Walk")
	self.Reload.Text = self.State.Reloading and "RELOADING…" or "R RELOAD  /  RMB AIM"
end

function HUDController:SetHealth(health: number, maximum: number)
	self.Health.Text = string.format("HEALTH  %d / %d", math.ceil(health), math.ceil(maximum))
	self.HealthFill.Size = UDim2.fromScale(math.clamp(health / math.max(maximum, 1), 0, 1), 1)
	self.HealthFill.BackgroundColor3 = health <= 30 and red or green
end

function HUDController:SetBoss(model: Model?)
	local id = model and model:GetAttribute("BossId")
	local definition = id and BossConfig[id]
	local body = model and model:FindFirstChildOfClass("Humanoid")
	self.BossPanel.Visible = definition ~= nil and body ~= nil and body.Health > 0
	if definition and body then
		self.BossName.Text = definition.NameTag
		self.BossHealth.Text = string.format("%s  /  %d / %d HP", definition.Classification, math.ceil(body.Health), body.MaxHealth)
	end
end

function HUDController:SetSector(name: string?)
	self.Sector.Text = (name or "CONNECTING CORRIDOR") .. "  /  POWER OFF"
end

function HUDController:ShowSubtitle(payload)
	if not self.Settings.Subtitles then return end
	if typeof(payload.Text) ~= "string" then return end
	self.SubtitleToken += 1
	local token = self.SubtitleToken
	self.Subtitle.Text = tostring(payload.Speaker or "") .. ": " .. payload.Text
	self.Subtitle.Visible = true
	task.delay(math.clamp(tonumber(payload.Duration) or 4, 1, 10), function()
		if self.Gui.Parent and self.SubtitleToken == token then self.Subtitle.Visible = false end
	end)
end

function HUDController:Notify(text: string, seconds: number?)
	self.NoticeToken += 1
	local token = self.NoticeToken
	self.Notice.Text = text
	self.Notice.Visible = true
	task.delay(seconds or 3, function()
		if self.Gui.Parent and self.NoticeToken == token then self.Notice.Visible = false end
	end)
end

function HUDController:ConfirmHit()
	self.HitMarker.Visible = true
	task.delay(0.09, function()
		if self.Gui.Parent then self.HitMarker.Visible = false end
	end)
end

function HUDController:SetCinematic(active: boolean, alive: boolean)
	self.Crosshair.Visible = not active and alive and not self:IsMenuOpen()
	self.Death.Visible = active
	self.Death.Text = alive and "CAPTURED" or "OPERATOR DOWN\nRespawning…"
end

function HUDController:IsMenuOpen(): boolean
	return self.Menu.Visible
end

function HUDController:SetMenuVisible(visible: boolean)
	self.Menu.Visible = visible
	if UserInputService.GamepadEnabled then GuiService.SelectedObject = visible and self.DefaultSelection or nil end
end

function HUDController:ToggleMenu()
	self:SetMenuVisible(not self.Menu.Visible)
end

function HUDController:Destroy()
	for _, connection in self.Connections do connection:Disconnect() end
	self.Gui:Destroy()
end

return HUDController
