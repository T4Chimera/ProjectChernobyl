#!/usr/bin/env python3
"""Evaluate the actual shared Luau configs and export data for the browser port."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "Bosses": "BossConfig", "Voices": "VoiceLineConfig",
    "Executions": "ExecutionConfig", "Map": "MapConfig",
    "Weapon": "WeaponConfig", "Enemies": "EnemyConfig", "Game": "GameConfig",
}
PRELUDE = '''local Vector3 = {new = function(x,y,z) return {x,y,z} end}
local CFrame = {new = function(x,y,z) return {position={x,y,z}} end}
local Color3 = {fromRGB = function(r,g,b) return {r/255,g/255,b/255} end}
local result = {}
'''
SERIALIZER = '''
local function quote(s)
    return '"' .. string.gsub(s, '[%c\\\\"]', function(c)
        if c == '"' then return '\\\\"' end
        if c == '\\\\' then return '\\\\\\\\' end
        return string.format('\\\\u%04x', string.byte(c))
    end) .. '"'
end
local function encode(value)
    local kind = type(value)
    if kind == "string" then return quote(value) end
    if kind == "number" or kind == "boolean" then return tostring(value) end
    if kind == "nil" then return "null" end
    assert(kind == "table", "Unsupported canonical value: " .. kind)
    local parts = {}
    if #value > 0 then
        for _, item in value do table.insert(parts, encode(item)) end
        return "[" .. table.concat(parts, ",") .. "]"
    end
    local keys = {}
    for key in value do table.insert(keys,key) end
    table.sort(keys)
    for _, key in keys do table.insert(parts, quote(key) .. ":" .. encode(value[key])) end
    return "{" .. table.concat(parts, ",") .. "}"
end
print(encode(result))
'''

def main():
    cli = os.environ.get("LUAU_BIN") or shutil.which("luau") or "/workspace/.tools/luau-0.659/luau"
    chunks = [PRELUDE]
    for key, filename in SOURCES.items():
        source = (ROOT / "src/ReplicatedStorage/Shared" / f"{filename}.luau").read_text()
        chunks.append(f"result.{key} = (function()\n{source}\nend)()\n")
    chunks.append(SERIALIZER)
    with tempfile.TemporaryDirectory(prefix="chernobyl-canon-") as folder:
        path = Path(folder)/"export.luau"
        path.write_text("\n".join(chunks))
        result = subprocess.run([cli,str(path)],capture_output=True,text=True,check=True)
    data = json.loads(result.stdout)
    target = ROOT / "web/src/canon.js"
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text("// Generated from actual Luau configurations by tools/export-web-canon.py.\nexport default " + json.dumps(data,indent=2,ensure_ascii=False) + ";\n")
    print(f"Exported {len(data['Bosses'])} canonical bosses and all shared configuration to {target.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
