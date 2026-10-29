import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from '../web/node_modules/rolldown/dist/index.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=await build({input:path.join(root,'web/src/execution-viewer-entry.js'),platform:'browser',write:false,
  plugins:[{name:'viewer-css-in-html',resolveId(source){if(source.endsWith('.css'))return '\0viewer-css';},load(id){if(id==='\0viewer-css')return 'export default undefined;';}}],
  output:{format:'iife',minify:true,codeSplitting:false},
});
const script=result.output.filter(output=>output.type==='chunk').map(output=>output.code).join('\n').replace(/<\/script/gi,'<\\/script');
const directory=path.join(root,'web/public/audio/sfx'),embedded={};
for(const file of await readdir(directory))if(/\.(wav|ogg|mp3)$/i.test(file)){
  const bytes=await readFile(path.join(directory,file));embedded[file]=`data:audio/${file.endsWith('.wav')?'wav':file.endsWith('.ogg')?'ogg':'mpeg'};base64,${bytes.toString('base64')}`;
}
const css=await readFile(path.join(root,'web/src/execution-preview.css'),'utf8');
let credits='Execution Viewer — Project Chernobyl\n\nThree.js is used under its MIT license.\n\n'+await readFile(path.join(root,'web/node_modules/three/LICENSE'),'utf8');
credits+='\n\n'+await readFile(path.join(root,'web/public/audio/SOURCES.md'),'utf8');
for(const file of await readdir(directory))if(/license|CC0|CC-BY/i.test(file)&&/\.(txt|md)$/i.test(file))credits+='\n\n'+file+'\n'+await readFile(path.join(directory,file),'utf8');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><base href="https://execution-viewer.invalid/"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Project Chernobyl — Execution Viewer</title>
<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101820;color:#dde6e8;font-family:system-ui,sans-serif}canvas{position:fixed;inset:0;display:block}button{cursor:pointer}#viewer-welcome{position:fixed;inset:0;z-index:200;display:grid;place-content:center;text-align:center;background:#080d13;padding:24px}#viewer-welcome[hidden]{display:none}#viewer-welcome h1{letter-spacing:3px;font-size:26px}#viewer-welcome p{color:#abbcc5;max-width:560px;line-height:1.7}#viewer-begin{background:#c3d0c3;color:#101820;border:0;padding:18px;font-weight:700;letter-spacing:2px;margin:16px auto;min-width:260px}#viewer-credits-open{position:fixed;right:20px;top:76px;z-index:120;background:#101d27d9;border:1px solid #73888f;color:#c9d6d9;padding:6px 10px;font-size:10px}dialog{max-width:min(900px,90vw);max-height:80vh;background:#17232d;color:#e1eaed;border:1px solid #6b808b}dialog pre{white-space:pre-wrap;font:12px/1.6 monospace}dialog button{float:right;padding:10px}dialog::backdrop{background:#000b}${css}</style>
<canvas id="viewer-canvas"></canvas><section id="viewer-welcome"><h1>EXECUTION REVIEW</h1><p>All 20 boss variants on an R6 baseplate. Play, pause, scrub, slow down and orbit the camera. Includes staged violence, screams, gunfire and limited blood; bodies remain intact.</p><button id="viewer-begin">OPEN EXECUTION VIEWER</button><p>This file works offline. Character voice lines will be added when recordings are supplied.</p></section>
<button id="viewer-credits-open">ASSET CREDITS</button><dialog id="viewer-credits"><button id="viewer-credits-close">CLOSE</button><pre>${escape(credits)}</pre></dialog>
<script>globalThis.__CHERNOBYL_AUDIO__=${JSON.stringify(embedded)};<\/script><script>${script}<\/script></html>`;
const target=path.join(root,'web/dist/execution-viewer.html');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,html);
await mkdir(path.join(root,'build'),{recursive:true});await writeFile(path.join(root,'build/ExecutionViewer.html'),html);
process.stdout.write(`Built offline ExecutionViewer.html (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MiB, ${Object.keys(embedded).length} bundled audio files).\n`);
