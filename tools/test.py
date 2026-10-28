#!/usr/bin/env python3
"""Run real Luau module code with small Roblox API doubles, not a Studio emulator."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MODULES = {
    "loadGameConfig": ("src/ReplicatedStorage/Shared/GameConfig.luau", ""),
    "loadBossConfig": ("src/ReplicatedStorage/Shared/BossConfig.luau", "Color3"),
    "loadDamageService": ("src/ServerScriptService/Services/DamageService.luau", "os"),
    "loadPlayerService": ("src/ServerScriptService/Services/PlayerService.luau", "game, task, warn"),
    "loadCombatRules": ("src/ReplicatedStorage/Shared/CombatRules.luau", ""),
    "loadRateLimiter": ("src/ServerScriptService/Services/RateLimiter.luau", ""),
    "loadSessionRegistry": ("src/ReplicatedStorage/Shared/SessionRegistry.luau", ""),
    "loadExecutionConfig": ("src/ReplicatedStorage/Shared/ExecutionConfig.luau", ""),
    "loadAnimationConfig": ("src/ReplicatedStorage/Shared/AnimationConfig.luau", ""),
    "loadVoiceConfig": ("src/ReplicatedStorage/Shared/VoiceLineConfig.luau", ""),
    "loadMapConfig": ("src/ReplicatedStorage/Shared/MapConfig.luau", "Vector3, CFrame, Color3"),
    "loadExecutionService": (
        "src/ServerScriptService/Services/ExecutionService.luau",
        "game, require, script, Random, Enum, RaycastParams, Vector3, CFrame, os, task, warn",
    ),
}


def main():
    executable = os.environ.get("LUAU_BIN") or shutil.which("luau")
    if not executable:
        cloud_cli = Path("/workspace/.tools/luau-0.659/luau")
        if cloud_cli.is_file():
            executable = str(cloud_cli)
        else:
            raise SystemExit("Install Luau 0.659, add luau to PATH, or set LUAU_BIN to its executable.")
    loaders = []
    for name, (path, parameters) in MODULES.items():
        source = (ROOT / path).read_text(encoding="utf-8")
        loaders.append(f"local function {name}({parameters})\n{source}\nend\n")
    marker = "-- INSERT_ACTUAL_MODULE_LOADERS"
    with tempfile.TemporaryDirectory(prefix="chernobyl-tests-") as directory:
        for name in ("phase1", "expanded", "execution"):
            suite = (ROOT / f"tests/{name}.spec.luau").read_text(encoding="utf-8")
            if suite.count(marker) != 1:
                raise SystemExit(f"Expected one module insertion marker in tests/{name}.spec.luau")
            bundled = suite.replace(marker, "\n".join(loaders))
            path = Path(directory) / f"{name}-bundle.luau"
            path.write_text(bundled, encoding="utf-8")
            result = subprocess.run([executable, str(path)], cwd=ROOT, check=False)
            if result.returncode:
                raise SystemExit(result.returncode)
    raise SystemExit(0)


if __name__ == "__main__":
    main()
