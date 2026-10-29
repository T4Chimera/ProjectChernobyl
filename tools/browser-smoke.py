#!/usr/bin/env python3
"""Exercise the built game in real Chromium; serve web/dist before running."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4173/")
parser.add_argument("--screenshots", default="/tmp/chernobyl-browser-check")
parser.add_argument("--quality", choices=["high", "balanced"], default="balanced",
    help="Balanced keeps full gameplay while reducing software-rendered shadow cost")
args = parser.parse_args()
output = Path(args.screenshots)
output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"])
    page = browser.new_page(viewport={"width": 1200, "height": 800})
    page.add_init_script("""window.__ttsCalls=0;
      if(window.speechSynthesis){const speak=speechSynthesis.speak;
        speechSynthesis.speak=function(...args){window.__ttsCalls++;return speak.apply(this,args);};}
    """)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    separator = "&" if "?" in args.url else "?"
    page.goto(args.url + separator + "test", wait_until="networkidle")
    page.get_by_role("button",name="BEGIN",exact=True).click()
    page.wait_for_function("__chernobyl.audio.getDebugState().introActive")
    assert page.evaluate("__chernobyl.intro.isActive")
    page.get_by_role("button",name="SKIP INTRO",exact=False).click()
    page.wait_for_function("!__chernobyl.intro.isActive")
    page.get_by_role("button", name="DEPLOY TO THE ZONE", exact=False).wait_for()
    page.screenshot(path=str(output / "intro.png"))
    page.locator(f'.intro-screen [data-quality="{args.quality}"]').click()
    page.get_by_role("button", name="RECON TOUR", exact=False).click()
    page.get_by_role("button", name="DEPLOY TO THE ZONE", exact=False).click()
    page.wait_for_function("__chernobyl.cameraMode === 'first-person' && !__chernobyl.paused")
    assert page.evaluate("[...__chernobyl.game.state.bosses.values()].every(b=>b.id==='Mikoyan'||!b.active)"), "Hostile bosses spawned at entrance"
    assert page.evaluate("__chernobyl.game.state.infected.some(b=>b.active&&!b.dead)"), "No ordinary infected available"
    audio = page.evaluate("__chernobyl.audio.getDebugState()")
    assert audio["initialized"] and audio["contextState"] == "running" and audio["musicActive"]
    page.evaluate("__chernobyl.audio.whenReady()")
    audio = page.evaluate("__chernobyl.audio.getDebugState()")
    assert audio["samplesLoaded"] > 0 and audio["samplesFailed"] == 0, audio
    assert audio["voiceMode"] == "recorded-only" and page.evaluate("__ttsCalls") == 0
    before = page.evaluate("__chernobyl.player.position.x")
    page.evaluate("{const p=__chernobyl.player.position;__chernobyl.lookAt([p.x+5,.2,p.z]);}")
    page.keyboard.down("Shift")
    page.keyboard.down("w")
    page.wait_for_function(f"__chernobyl.player.position.x > {before + .5}", timeout=20000)
    during = page.evaluate("__chernobyl.stamina")
    assert page.evaluate("__chernobyl.firstPersonBody.mesh.visible && __chernobyl.firstPersonBody.locomotion.runBlend>.2 && __chernobyl.firstPersonBody.locomotion.phase>.1"), "Visible sprint legs did not animate"
    page.keyboard.up("w")
    page.keyboard.up("Shift")
    page.evaluate("{const p=__chernobyl.player.position;__chernobyl.lookAt([p.x+10,1.8,p.z]);}")
    assert during < 100, "Sprinting did not consume stamina"
    assert page.evaluate("__chernobyl.game.state.hp") == 100
    page.screenshot(path=str(output / "playing.png"))
    print("PASS real intro/deploy, first-person movement, sprint stamina, and rendered HUD")
    page.mouse.down(button="left")
    page.wait_for_function("__chernobyl.game.state.ammo<30 && __chernobyl.audio.getDebugState().sampleShots>0",timeout=20000)
    page.mouse.up(button="left")
    assert page.evaluate("__chernobyl.audio.getDebugState().fallbackShots") == 0
    print("PASS real input fires a decoded gunshot recording; all audio samples load; no automatic TTS")

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

    # Discover Felon using real field interactions, then approach his isolated
    # area. Dormant bosses cannot be forced into executions at the entrance.
    discovered = page.evaluate("""() => {
      const h=__chernobyl;
      for(const id of ['intake-logs','personnel-archive']) {
        const t=h.world.interactables.find(t=>t.id===id);let accepted=false;
        for(let i=0;i<16&&!accepted;i++) {
          h.teleport([t.position.x+Math.cos(i*Math.PI/8)*1.6,0,t.position.z+Math.sin(i*Math.PI/8)*1.6]);
          accepted=h.game.interact(id);
        }
        if(!accepted)return false;
      }
      const b=h.game.state.bosses.get('Felon');
      h.teleport([b.home.x,0,b.home.z+1]);h.game.update(.01,h.player);
      return b.active;
    }""")
    assert discovered, "Field work failed to activate isolated Felon encounter"
    print("PASS ordinary infected first; boss activation requires later field work and approach")
    page.evaluate("""() => {
      const h=__chernobyl;
      for(let i=0;i<36;i++) h.game.update(.1,h.player);
      h.game.state.mode='operative';h.setHealth(20);
      const boss=h.game.state.bosses.get('Felon');
      h.teleport([boss.position.x,0,boss.position.z+1]);
      boss.nextAttack=-1;boss.pendingHit=null;
      h.game.update(.1,h.player);h.game.update(.1,h.player);
    }""")
    page.wait_for_function("__chernobyl.game.state.execution && __chernobyl.cameraMode === 'execution'", timeout=20000)
    page.screenshot(path=str(output / "execution.png"))
    page.evaluate("for(let i=0;i<65;i++)__chernobyl.game.update(.1,__chernobyl.player)")
    page.wait_for_function("__chernobyl.game.state.phase === 'dead' && __chernobyl.cameraMode === 'third-person-death'")
    page.get_by_role("button", name="REDEPLOY AT CHECKPOINT", exact=False).click()
    page.wait_for_function("__chernobyl.game.state.hp===100 && __chernobyl.cameraMode==='first-person' && !__chernobyl.paused")
    assert page.evaluate("__chernobyl.missions.index") == 1
    print("PASS execution switches to third-person, death staging, redeploy restores 100HP/first-person and retains mission")

    # Release the desktop WebGL context before opening the touch viewport. This
    # keeps headless software rendering from running two full scenes at once.
    page.close()
    mobile = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    mobile.on("pageerror", lambda error: errors.append(str(error)))
    mobile.goto(args.url, wait_until="networkidle")
    mobile.get_by_role("button",name="BEGIN",exact=True).click()
    mobile.get_by_role("button",name="SKIP INTRO",exact=False).click()
    assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Mobile horizontal overflow"
    mobile.get_by_role("button", name="DEPLOY TO THE ZONE", exact=False).scroll_into_view_if_needed()
    mobile.screenshot(path=str(output / "mobile.png"))
    print("PASS mobile intro layout without horizontal overflow")
    assert not errors, "Browser runtime errors: " + repr(errors)
    print("PASS zero browser runtime errors")
    browser.close()
