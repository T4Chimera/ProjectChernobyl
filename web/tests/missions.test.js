import test from 'node:test';
import assert from 'node:assert/strict';
import {MISSIONS,MissionDirector} from '../src/missions.js';
import canon from '../src/canon.js';

test('Overwatch has 22 unique operational steps ending at extraction',()=>{
  assert.equal(MISSIONS.length,22);assert.equal(new Set(MISSIONS.map(m=>m.id)).size,22);
  assert.equal(MISSIONS.at(-1).targetId,'extraction');
  assert.ok(!MISSIONS.some(m=>m.bossId==='Mikoyan'));
});
test('future completed encounters are retained without skipping unsatisfied orders',()=>{
  const d=new MissionDirector();d.observe({type:'boss-defeated',id:'Felon'});assert.equal(d.index,0);
  for(const m of MISSIONS){if(m.bossId==='Felon')continue;d.observe({type:m.type==='interact'?'interaction':m.type==='boss'?'boss-defeated':'sector',id:m.type==='sector'?m.sector:m.targetId??m.bossId});}
  assert.equal(d.complete,true);assert.equal(d.index,22);
});
test('duplicate interactions do not advance unrelated missions',()=>{
  const d=new MissionDirector();d.observe({type:'interaction',id:'radio'});d.observe({type:'interaction',id:'radio'});assert.equal(d.index,1);
  d.observe({type:'interaction',id:'nonsense'});assert.equal(d.index,1);
});
test('new run resets mission observations while ordinary respawn need not',()=>{
  const d=new MissionDirector();d.observe({type:'interaction',id:'radio'});assert.equal(d.index,1);
  d.reset();assert.equal(d.index,0);assert.equal(d.bosses.size,0);assert.equal(d.interactions.size,0);
});
test('exported browser canon retains exact HP, tags, silence and all execution counts',()=>{
  const expected={Felon:[1500,'____-FELON',2],Sukhoi:[5000,'____-#SUKHOI#',3],Mikoyan:[1500,'MIKOYAN___',3],Nikolai:[1000,'___NIKOLAI##',2],Novak:[1000,'##NOVAK___',2],John:[2000,'CI_JOHN',2],Jayden:[8000,'CI_JAYDEN',2],Katya:[12000,'###_:(KATYA--',4]};
  for(const [id,[hp,tag,count]]of Object.entries(expected)){assert.equal(canon.Bosses[id].MaxHealth,hp);assert.equal(canon.Bosses[id].NameTag,tag);assert.equal(canon.Executions.Bosses[id].length,count);assert.equal(canon.Bosses[id].RespawnsInSession,false);}
  assert.deepEqual(canon.Voices.Voices.Novak.Lines,{});assert.equal(canon.Voices.AllowProposed,false);
});
