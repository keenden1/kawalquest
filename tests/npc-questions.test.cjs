/* eslint-disable @typescript-eslint/no-require-imports -- Execute server code with isolated service mocks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const catalog = require('../src/lib/npcQuestionDefaults.json');
function load(file, stubs) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const compiledModule = {exports:{}};
  vm.runInNewContext(code, {module:compiledModule,exports:compiledModule.exports,URL,require:name=>{
    assert.ok(name in stubs, `Unexpected import ${name}`); return stubs[name];
  }});
  return compiledModule.exports;
}
const library = load('src/lib/npcQuestions.ts', {'./npcQuestionDefaults.json':{default:catalog}});
const copy = value => JSON.parse(JSON.stringify(value));
function harness(role='admin', initial={}) {
  const state=copy(initial), writes=[];
  let broken=false;
  const ref={get:async()=>{if(broken)throw Error('offline');return {data:()=>copy(state)};}};
  const db={collection:()=>({doc:()=>ref}),runTransaction:async fn=>fn({get:ref.get,set:(reference, update, options)=>{
    assert.equal(reference,ref); writes.push(copy({update,options}));Object.assign(state,update);
  }})};
  const api=load('src/app/api/npc-questions/route.ts', {
    'next/server':{NextResponse:{json:(body,options={})=>({body:copy(body),status:options.status??200})}},
    '@/lib/auth':{getSessionUser:async()=>role?{role}:null,isAdminRole:value=>['admin','superadmin'].includes(value)},
    '@/lib/firebaseAdmin':{getAdminDb:()=>db}, '@/lib/npcQuestions':library,
  });
  return {api,writes,state,fail:()=>{broken=true;},post:(body,headers={})=>api.POST(new Request('https://game.test/api/npc-questions', {
    method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),
  }))};
}
const npc=catalog.find(row=>row.kind==='choice'&&row.configured);
const ordering=catalog.find(row=>row.kind==='order');
test('catalog covers all arcs with stable unique per-NPC ids',()=>{
  assert.equal(catalog.length,58);
  assert.equal(new Set(catalog.map(row=>row.id)).size,58);
  assert.equal(new Set(catalog.map(row=>row.arc)).size,10);
  assert.equal(catalog.filter(row=>!row.configured).length,33);
  for(const row of catalog.filter(row=>row.configured)) assert.doesNotThrow(()=>library.validateQuestion(row.defaults,row));
});
test('GET and POST enforce admin roles',async()=>{
  for(const role of [null,'user','tester']) {
    const h=harness(role), expected=role?403:401;
    assert.equal((await h.api.GET()).status,expected);
    assert.equal((await h.post({id:npc.id,revision:0,content:npc.defaults})).status,expected);
    assert.equal(h.writes.length,0);
  }
});
test('GET returns effective defaults including unconfigured NPCs',async()=>{
  const response=await harness().api.GET();
  assert.equal(response.status,200);assert.equal(response.body.questions.length,58);
  const row=response.body.questions.find(row=>row.id===npc.id);
  assert.deepEqual(row.content,npc.defaults);assert.equal(row.revision,0);
});
test('save changes only selected NPC and retains unrelated flags',async()=>{
  const h=harness('superadmin',{aboutCredits:'Team'});
  const content={...npc.defaults,questionEN:'Updated question?'};
  assert.equal((await h.post({id:npc.id,revision:0,content})).status,200);
  assert.equal(h.state.aboutCredits,'Team');assert.equal(Object.keys(h.writes[0].update).length,1);
  assert.deepEqual(h.writes[0].options,{merge:true});
  const rows=(await h.api.GET()).body.questions;
  assert.equal(rows.find(row=>row.id===npc.id).content.questionEN,'Updated question?');
  assert.deepEqual(rows.find(row=>row.id!==npc.id).content,catalog.find(row=>row.id!==npc.id).defaults);
});
test('stale revision cannot overwrite another admin save',async()=>{
  const h=harness(); const body={id:npc.id,revision:0,content:npc.defaults};
  assert.equal((await h.post(body)).status,200);
  assert.equal((await h.post(body)).status,409);assert.equal(h.writes.length,1);
});
test('reset restores defaults with a revision tombstone',async()=>{
  const h=harness();await h.post({id:npc.id,revision:0,content:npc.defaults});
  const result=await h.post({id:npc.id,revision:1,reset:true});
  assert.equal(result.status,200);assert.equal(result.body.revision,2);assert.equal(result.body.overridden,false);
  assert.deepEqual(result.body.content,npc.defaults);
  assert.equal((await h.post({id:npc.id,revision:1,content:npc.defaults})).status,409);
});
test('invalid text and answer indices reject without writes',async()=>{
  for(const patch of [{questionEN:''},{questionTL:'<b>markup</b>'},{questionEN:'x'.repeat(1501)},{choices:['a','a','b']},{choices:['a']},{correctIndex:3},{correctIndex:1.5},{questionEN:'bad\0text'}]) {
    const h=harness();assert.equal((await h.post({id:npc.id,revision:0,content:{...npc.defaults,...patch}})).status,400);
    assert.equal(h.writes.length,0);
  }
});
test('ordering requires exactly one of each answer, supports edited choices',async()=>{
  const h=harness();
  const content={...ordering.defaults,choices:['One','Two','Three','Four'],answerOrder:[3,2,1,0]};
  assert.equal((await h.post({id:ordering.id,revision:0,content})).status,200);
  assert.equal((await h.post({id:ordering.id,revision:1,content:{...content,answerOrder:[0,0,1,2]}})).status,400);
});
test('unconfigured NPC can be configured and reset without creating new NPCs',async()=>{
  const row=catalog.find(row=>!row.configured);const h=harness();
  assert.equal((await h.post({id:row.id,revision:0,content:npc.defaults})).status,200);
  const reset=await h.post({id:row.id,revision:1,reset:true});assert.equal(reset.body.content.questionEN,'');
});
test('unknown NPC, cross-origin, oversized payload and malformed JSON are rejected',async()=>{
  const h=harness();assert.equal((await h.post({id:'unknown',revision:0,content:npc.defaults})).status,400);
  assert.equal((await h.post({id:npc.id,revision:0,content:npc.defaults},{origin:'https://evil.test'})).status,403);
  assert.equal((await h.post({large:'x'.repeat(15000)})).status,413);
  assert.equal((await h.api.POST(new Request('https://game.test/api/npc-questions',{method:'POST',headers:{'Content-Type':'application/json'},body:'bad'}))).status,400);
  assert.equal(h.writes.length,0);
});
test('invalid stored content falls back and failures return safe errors',async()=>{
  const h=harness('admin',{[library.questionField(npc.id)]:'broken'});
  assert.deepEqual((await h.api.GET()).body.questions[0].content,catalog[0].defaults);
  h.fail();assert.equal((await h.api.GET()).status,503);
  assert.equal((await h.post({id:npc.id,revision:0,content:npc.defaults})).status,503);
});
