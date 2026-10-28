-- Paste into Studio's CLIENT Command Bar during Play with a living character.
local RunService = game:GetService("RunService")
assert(RunService:IsRunning() and RunService:IsClient(), "Run in the Client context during Play.")
local player = game:GetService("Players").LocalPlayer
local camera = workspace.CurrentCamera
local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
assert(humanoid and humanoid.Health > 0, "Wait for a living local character.")
assert(camera and camera.CameraSubject == humanoid, "Camera is not following the local Humanoid.")
assert(camera.CameraType == Enum.CameraType.Custom, "Native camera is not active.")
assert(player.CameraMode == Enum.CameraMode.LockFirstPerson, "First-person is not locked.")
local config = require(game:GetService("ReplicatedStorage").Shared.GameConfig)
assert(math.abs(camera.FieldOfView - config.Camera.FieldOfView) < 0.01, "Configured FOV was not applied.")
print("[Studio client] PASS: local camera subject, native camera, first-person mode, and FOV.")
