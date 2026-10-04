/* eslint-disable @typescript-eslint/no-require-imports */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const module = {exports:{}};
  vm.runInNewContext(code, {module,exports:module.exports,URL,Date,require:key=>{assert.ok(key in imports,key);return imports[key];}});
  return module.exports;
}
const lib = load('src/lib/resourcePacks.ts');
function arcOneRelease() {
  const r = release(); r.schema = 2;
  Object.assign(r.packs[0], { id:'arcs-2-6', fileName:'arcs-2-6.bundle',
    scenes:Array.from({length:15},(_,i)=>`Assets/Scenes/${2+Math.floor(i/3)}-${i%3+1}.unity`) });
  return r;
}
function release() {
  return {schema:1,buildId:'a'.repeat(32),platform:'Android',appVersion:'1.0',packs:[
    {id:'arcs-4-6',fileName:'arcs-4-6.bundle',bytes:123,sha256:'b'.repeat(64),scenes:Array.from({length:9},(_,i)=>`Assets/Scenes/${4+Math.floor(i/3)}-${i%3+1}.unity`)},
    {id:'arcs-7-10',fileName:'arcs-7-10.bundle',bytes:456,sha256:'c'.repeat(64),scenes:Array.from({length:12},(_,i)=>`Assets/${7+Math.floor(i/3)}-${i%3+1}.unity`)}]};
}
function harness(role='admin') {
  let stored=null, badHead=false; const uploads=[],writes=[];
  class Command {constructor(input){this.input=input;}}
  const ref={get:async()=>({exists:!!stored,data:()=>stored}),create:async data=>{if(stored)throw Error('exists');stored=data;writes.push(data);}};
  const imports={
    'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},
    '@/lib/auth':{getSessionUser:async()=>role?{role}:null,isAdminRole:r=>['admin','superadmin'].includes(r)},
    '@/lib/firebaseAdmin':{getAdminDb:()=>({collection:()=>({doc:()=>ref})})},
    '@/lib/resourcePacks':lib,
    '@/lib/r2':{getR2Bucket:()=> 'bucket',getR2PublicUrl:key=>'https://cdn.test/'+key,getR2Client:()=>({send:async command=>{
      const p=release().packs.find(p=>command.input.Key.includes(p.sha256));
      return {ContentLength:badHead?1:p.bytes,Metadata:{sha256:p.sha256}};
    }})},
    '@aws-sdk/client-s3':{HeadObjectCommand:Command,PutObjectCommand:Command},
    '@aws-sdk/s3-request-presigner':{getSignedUrl:async(client,command)=>{uploads.push(command.input);return 'https://signed.test/upload';}},
  };
  const admin=load('src/app/api/admin/resource-packs/route.ts',imports), game=load('src/app/api/game/resource-packs/route.ts',imports);
  return {admin,game,uploads,writes,badHead:()=>badHead=true,
    post:(action,r=release(),extra={})=>admin.POST(new Request('https://game.test/api/admin/resource-packs',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify({action,release:r})}))};
}
test('3/3/4 release accepts 9 and 12 remote scenes, including legacy 5-1(1)',()=>{
  const r=release();r.packs[0].scenes[3]='Assets/Scenes/5-1(1).unity'; assert.equal(lib.validateRelease(r).packs.length,2);
});
test('reject malformed ids, sizes, hashes, incomplete and misplaced scenes',()=>{
  const mutations=[r=>r.buildId='../x',r=>r.platform='Windows',r=>r.packs[0].bytes=0,r=>r.packs[0].bytes=2**32,
    r=>r.packs[0].sha256='x',r=>r.packs[0].scenes.pop(),r=>r.packs[0].scenes[0]='Assets/1-1.unity',
    r=>r.packs[0].scenes[0]='Assets/../4-1.unity',r=>r.packs[0].scenes[1]=r.packs[0].scenes[0],r=>r.packs[1]=r.packs[0]];
  for(const mutate of mutations){const r=release();mutate(r);assert.throws(()=>lib.validateRelease(r));}
});
test('admin upload/publish requires role and same origin',async()=>{
  for(const role of [null,'user','tester']){const h=harness(role);assert.equal((await h.post('upload')).status,role?403:401);assert.equal(h.uploads.length,0);}
  assert.equal((await harness().post('upload',release(),{Origin:'https://evil.test'})).status,403);
});
test('uploads use immutable release keys and expected size/hash metadata',async()=>{
  const h=harness();assert.equal((await h.post('upload')).status,200);assert.equal(h.writes.length,0);
  for(let i=0;i<2;i++){assert.equal(h.uploads[i].Key,lib.packKey(release(),release().packs[i]));assert.equal(h.uploads[i].ContentLength,release().packs[i].bytes);assert.equal(h.uploads[i].Metadata.sha256,release().packs[i].sha256);}
});
test('cannot publish absent or mismatched uploads',async()=>{
  const h=harness();h.badHead();assert.equal((await h.post('publish')).status,400);assert.equal(h.writes.length,0);
});
test('publish once; public lookup returns matching release and URLs only after publication',async()=>{
  const h=harness(), request=new Request('https://game.test/api/game/resource-packs?build='+release().buildId);
  assert.equal((await h.game.GET(request)).status,404);
  assert.equal((await h.post('publish')).status,200);
  const result=await h.game.GET(request);assert.equal(result.status,200);assert.equal(result.body.buildId,release().buildId);
  assert.ok(result.body.packs.every(p=>p.url.startsWith('https://cdn.test/chapters/')));
  assert.equal((await h.post('publish')).status,409);assert.equal((await h.post('upload')).status,409);assert.equal(h.writes.length,1);
});
test('public endpoint rejects traversal and missing build ids',async()=>{
  for(const suffix of ['', '?build=../x'])assert.equal((await harness().game.GET(new Request('https://game.test/api/game/resource-packs'+suffix))).status,400);
});
test('Arc 1 release includes all 15 scenes for Arcs 2-6 and all 12 for Arcs 7-10',()=>{
  const r=lib.validateRelease(arcOneRelease()); assert.equal(r.schema,2);
  assert.equal(r.packs[0].id,'arcs-2-6');assert.equal(r.packs[0].scenes.length,15);assert.equal(r.packs[1].scenes.length,12);
});
test('reject cross-version pack layouts and missing Arc 2 levels',()=>{
  const old=release();old.schema=2;assert.throws(()=>lib.validateRelease(old));
  const next=arcOneRelease();next.schema=1;assert.throws(()=>lib.validateRelease(next));
  const incomplete=arcOneRelease();incomplete.packs[0].scenes.shift();assert.throws(()=>lib.validateRelease(incomplete));
  const includesLocal=arcOneRelease();includesLocal.packs[0].scenes[0]='Assets/1-1.unity';assert.throws(()=>lib.validateRelease(includesLocal));
});
test('new release uploads and public response preserve schema 2 and new pack identity',async()=>{
  const h=harness(),r=arcOneRelease();assert.equal((await h.post('upload',r)).status,200);
  assert.equal((await h.post('publish',r)).status,200);
  const result=await h.game.GET(new Request('https://game.test/api/game/resource-packs?build='+r.buildId));
  assert.equal(result.body.schema,2);assert.equal(result.body.packs[0].id,'arcs-2-6');assert.equal(result.body.packs[0].scenes.length,15);
});
