#!/usr/bin/env python3
"""Exercise the built game in real Chromium; serve web/dist before running."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4173/")
parser.add_argument("--screenshots", default="/tmp/chernobyl-browser-check")
args = parser.parse_args()
output = Path(args.screenshots)
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"])
    page = browser.new_page(viewport={"width": 1200, "height": 800})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    separator = "&" if "?" in args.url else "?"
    page.goto(args.url + separator + "test", wait_until="networkidle")
    page.get_by_role("button", name="DEPLOY TO THE ZONE", exact=False).wait_for()
    page.screenshot(path=str(output / "intro.png"))
    page.get_by_role("button", name="RECON TOUR", exact=False).click()
    page.get_by_role("button", name="DEPLOY TO THE ZONE", exact=False).click()
    page.wait_for_function("__chernobyl.cameraMode === 'first-person' && !__chernobyl.paused")
    before = page.evaluate("__chernobyl.player.position.x")
    page.keyboard.down("Shift")
    page.keyboard.down("w")
    page.wait_for_function(f"__chernobyl.player.position.x > {before + .5}", timeout=20000)
    during = page.evaluate("__chernobyl.stamina")
    page.keyboard.up("w")
    page.keyboard.up("Shift")
    assert during < 100, "Sprinting did not consume stamina"
    assert page.evaluate("__chernobyl.game.state.hp") == 100
    page.screenshot(path=str(output / "playing.png"))
    print("PASS real intro/deploy, first-person movement, sprint stamina, and rendered HUD")

    # Use the actual range/LOS-validated interaction; test hooks move only the
    # operator so the mission integration can be checked without a long walk.
    accepted = page.evaluate("""() => {
      const h=__chernobyl,t=h.world.interactables.find(t=>t.id==='radio');
      for(let i=0;i<16;i++){
        h.teleport([t.position.x+Math.cos(i*Math.PI/8)*1.6,0,t.position.z+Math.sin(i*Math.PI/8)*1.6]);
        if(h.game.interact('radio')) return true;
      } return false;
    }""")
    assert accepted and page.evaluate("__chernobyl.missions.index") == 1
    print("PASS real radio interaction advances Overwatch mission")

    page.evaluate("""() => {
      const h=__chernobyl;
      for(let i=0;i<36;i++) h.game.update(.1,h.player);
      h.game.state.mode='operative';h.setHealth(20);
      const boss=h.game.state.bosses.get('Felon');
      boss.position.copy(h.player.position);boss.position.z-=1;
      boss.nextAttack=-1;boss.pendingHit=null;
      h.game.update(.1,h.player);h.game.update(.1,h.player);
    }""")
    page.wait_for_function("__chernobyl.game.state.execution && __chernobyl.cameraMode === 'execution'", timeout=20000)
    page.screenshot(path=str(output / "execution.png"))
    page.evaluate("for(let i=0;i<45;i++)__chernobyl.game.update(.1,__chernobyl.player)")
    page.wait_for_function("__chernobyl.game.state.phase === 'dead' && __chernobyl.cameraMode === 'third-person-death'")
    page.get_by_role("button", name="REDEPLOY AT CHECKPOINT", exact=False).click()
    page.wait_for_function("__chernobyl.game.state.hp===100 && __chernobyl.cameraMode==='first-person' && !__chernobyl.paused")
    assert page.evaluate("__chernobyl.missions.index") == 1
    print("PASS execution switches to third-person, death staging, redeploy restores 100HP/first-person and retains mission")

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    mobile.on("pageerror", lambda error: errors.append(str(error)))
    mobile.goto(args.url, wait_until="networkidle")
    assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Mobile horizontal overflow"
    mobile.get_by_role("button", name="DEPLOY TO THE ZONE", exact=False).scroll_into_view_if_needed()
    mobile.screenshot(path=str(output / "mobile.png"), full_page=True)
    print("PASS mobile intro layout without horizontal overflow")
    assert not errors, "Browser runtime errors: " + repr(errors)
    print("PASS zero browser runtime errors")
    browser.close()
