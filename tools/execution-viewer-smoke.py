#!/usr/bin/env python3
"""Open the actual standalone file and review every execution without a server."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--file',default='build/ExecutionViewer.html')
parser.add_argument('--screenshots',default='/tmp/chernobyl-execution-viewer')
args=parser.parse_args()
target=Path(args.file).resolve();output=Path(args.screenshots);output.mkdir(parents=True,exist_ok=True)
assert target.is_file(),target
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
        args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    page=browser.new_page(viewport={'width':1100,'height':760})
    errors=[];network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda request:network.append(request.url) if request.url.startswith(('http:','https:')) else None)
    # The managed browser blocks file:// navigation. Load the exact artifact
    # bytes directly; the embedded base is inert and all audio uses data URLs.
    page.set_content(target.read_text(),wait_until='load')
    page.get_by_role('button',name='OPEN EXECUTION VIEWER',exact=True).click()
    page.evaluate('executionViewer.audio.whenReady()')
    results=page.evaluate('''() => {
      const h=executionViewer,results=[];
      for(const clip of h.preview.clips){
        h.preview.setClip(clip.id);
        const actors=[h.preview.scene.getObjectByName(clip.bossId),h.preview.scene.getObjectByName('Player')];
        const primaryCounts=actors.map(a=>Object.keys(a.userData.rig.primaryParts).length);
        let minY=100,finite=true;
        for(const fraction of [0,.17,.35,.53,.76,1]){
          h.preview.seek(clip.duration*fraction);
          for(const actor of actors){actor.updateMatrixWorld(true);actor.traverse(o=>{
            if(!o.isMesh)return;
            if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
            const bounds=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
            minY=Math.min(minY,bounds.min.y);finite=finite&&Number.isFinite(bounds.min.y)&&Number.isFinite(bounds.max.y);
          });}
        }
        results.push({id:clip.id,finite,minY,primaryCounts});
      }
      return {results,samples:h.audio.getDebugState(),bosses:new Set(h.preview.clips.map(c=>c.bossId)).size};
    }''')
    assert len(results['results'])==20 and results['bosses']==8
    for result in results['results']:
        assert result['finite'] and result['minY']>-.04 and result['primaryCounts']==[6,6],result
    assert results['samples']['samplesLoaded']>=14 and results['samples']['samplesFailed']==0,results['samples']
    print('PASS offline file loads all20 variants/eight bosses, rigid intact bodies, finite grounded animation and every bundled recording',flush=True)
    for clip_id in ['Felon_RifleAndBurst','Sukhoi_LiftAndStrikes','Novak_RapidBladeFlurry','Katya_PinAndKick']:
        page.evaluate('''id=>{const p=executionViewer.preview;p.setClip(id);p.seek(p.currentClip.duration*.55);p.update(0);}''',clip_id)
        page.screenshot(path=str(output/(clip_id+'.png')))
    page.get_by_role('button',name='REPLAY',exact=True).click()
    page.wait_for_function('executionViewer.audio.getDebugState().sampledExecutionCues>0',timeout=30000)
    assert page.evaluate('executionViewer.audio.getDebugState().sampledExecutionCues')>0
    page.get_by_role('button',name='PAUSE',exact=True).click()
    page.get_by_label('Playback speed',exact=True).select_option('.25')
    page.get_by_label('Animation time',exact=True).fill('1')
    assert abs(page.evaluate('executionViewer.preview.elapsed')-1)<.02
    assert not network,network
    assert not errors,errors
    print('PASS controls, sampled execution audio, timeline seeking, screenshots, zero runtime errors and no network requests',flush=True)
    browser.close()
