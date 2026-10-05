/* eslint-disable @typescript-eslint/no-require-imports */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const compiledModule = {exports:{}};
  vm.runInNewContext(code, {module:compiledModule,exports:compiledModule.exports,URL,Date,console:{error:()=>{}},...globals,require:key=>{assert.ok(key in imports,key);return imports[key];}});
  return compiledModule.exports;
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
class R2ConfigurationError extends Error {}
function harness(role='admin', failures={}) {
  let stored=null, badHead=false; const uploads=[],writes=[],signing=[],drafts=new Map();
  class Command {constructor(input){this.input=input;}}
  class ListCommand extends Command {}
  const ref={get:async()=>{if(failures.lookup)throw failures.lookup;return {exists:!!stored,data:()=>stored};},create:async data=>{if(failures.create)throw failures.create;if(stored)throw Error('exists');stored=data;writes.push(data);}};
  const imports={
    'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},
    '@/lib/auth':{getSessionUser:async()=>role?{role}:null,isAdminRole:r=>['admin','superadmin'].includes(r)},
    '@/lib/firebaseAdmin':{getAdminDb:()=>({collection:name=>{
      const collection={
        doc:id=>name==='chapterReleaseDrafts'?{get:async()=>({exists:drafts.has(id),data:()=>drafts.get(id)}),set:async data=>{if(failures.draft)throw failures.draft;drafts.set(id,data);}}:
          (id===release().buildId?ref:{get:async()=>({exists:false})}),
        orderBy:()=>collection,limit:()=>collection,
        get:async()=>({docs:name==='chapterReleaseDrafts'?[...drafts].map(([id,data])=>({id,data:()=>data})):stored?[{id:stored.buildId,data:()=>stored}]:[]})
      };return collection;
    }})},
    '@/lib/resourcePacks':lib,
    '@/lib/r2':{R2ConfigurationError,getR2Bucket:()=> 'bucket',getR2PublicUrl:key=>'https://cdn.test/'+key,getR2Client:()=>({send:async command=>{
      if(command instanceof ListCommand){if(failures.list)throw failures.list;return {CommonPrefixes:(failures.folders??[]).map(id=>({Prefix:`chapters/${id}/`})),IsTruncated:!!failures.truncated};}
      if(failures.head)throw failures.head;
      const p=release().packs.find(p=>command.input.Key.includes(p.sha256));
      return {ContentLength:badHead?1:p.bytes,Metadata:failures.metadata ?? {sha256:p.sha256}};
    }})},
    '@aws-sdk/client-s3':{HeadObjectCommand:Command,PutObjectCommand:Command,ListObjectsV2Command:ListCommand},
    '@aws-sdk/s3-request-presigner':{getSignedUrl:async(client,command,options)=>{if(failures.sign)throw failures.sign;uploads.push(command.input);signing.push(options);return 'https://signed.test/upload';}},
  };
  const admin=load('src/app/api/admin/resource-packs/route.ts',imports), game=load('src/app/api/game/resource-packs/route.ts',imports);
  return {admin,game,uploads,writes,signing,drafts,badHead:()=>badHead=true,
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

test('missing configuration names are actionable and never include configured secrets',()=>{
  const r2=load('src/lib/r2.ts',{'@aws-sdk/client-s3':{S3Client:class {}}},
    {process:{env:{R2_ACCOUNT_ID:'account',R2_SECRET_ACCESS_KEY:'private-secret',R2_BUCKET_NAME:'bucket',R2_ACCESS_KEY_ID:'   '}}});
  assert.throws(()=>r2.getR2Bucket(),error=>{
    assert.ok(error instanceof r2.R2ConfigurationError);
    assert.match(error.message,/R2_ACCESS_KEY_ID, R2_PUBLIC_BASE_URL/);
    assert.match(error.message,/redeploy/);assert.ok(!error.message.includes('private-secret'));return true;
  });
});

test('reports configuration failure rather than generic upload failure',async()=>{
  const result=await harness('admin',{sign:new R2ConfigurationError('Missing website settings: R2_PUBLIC_BASE_URL.')}).post('upload');
  assert.equal(result.status,503);assert.equal(result.body.code,'R2_CONFIGURATION');assert.match(result.body.error,/R2_PUBLIC_BASE_URL/);
});

test('distinguishes database failure, rejected storage access, and missing pack without exposing SDK details',async()=>{
  for(const [failures,action,code,pattern] of [
    [{lookup:Error('private-secret')},'upload','RELEASE_LOOKUP',/database/],
    [{sign:Error('private-secret')},'upload','UPLOAD_PREPARATION',/upload preparation/],
    [{head:{$metadata:{httpStatusCode:403},message:'private-secret'}},'publish','STORAGE_VERIFICATION',/Storage rejected access/],
    [{head:{name:'NotFound',message:'private-secret'}},'publish','STORAGE_VERIFICATION',/not found/],
    [{create:Error('private-secret')},'publish','RELEASE_PUBLICATION',/database/],
  ]){
    const result=await harness('admin',failures).post(action);
    assert.equal(result.status,503);assert.equal(result.body.code,code);assert.match(result.body.error,pattern);
    assert.ok(!JSON.stringify(result).includes('private-secret'));
  }
});

test('concurrent publication conflict tells admin to refresh',async()=>{
  const result=await harness('admin',{create:{code:6}}).post('publish');
  assert.equal(result.status,409);assert.match(result.body.error,/already published/);
});

test('browser upload contract sends matching signed metadata and cache headers',async()=>{
  const h=harness(),result=await h.post('upload');
  for(let i=0;i<2;i++){
    const headers=result.body.uploads[i].headers;
    assert.equal(headers['x-amz-meta-sha256'],h.uploads[i].Metadata.sha256);
    assert.equal(headers['Cache-Control'],h.uploads[i].CacheControl);
    assert.equal(headers['Content-Type'],h.uploads[i].ContentType);
    assert.ok(h.signing[i].unhoistableHeaders.has('x-amz-meta-sha256'));
    assert.ok(h.signing[i].signableHeaders.has('cache-control'));
  }
});

test('real SDK keeps SHA metadata in signed headers instead of URL parameters',async()=>{
  const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
  const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');
  const h=harness();await h.post('upload');
  const client=new S3Client({region:'auto',endpoint:'https://example.r2.cloudflarestorage.com',
    credentials:{accessKeyId:'test-access-key',secretAccessKey:'test-secret'}});
  try{
    const url=new URL(await getSignedUrl(client,new PutObjectCommand(h.uploads[0]),h.signing[0]));
    assert.equal(url.searchParams.has('x-amz-meta-sha256'),false);
    const signed=url.searchParams.get('X-Amz-SignedHeaders').split(';');
    for(const name of ['x-amz-meta-sha256','content-type','cache-control'])assert.ok(signed.includes(name));
  }finally{client.destroy();}
});

test('publication distinguishes wrong size from missing or incorrect metadata',async()=>{
  const h=harness();h.badHead();
  const size=await h.post('publish');assert.equal(size.body.code,'PACK_SIZE_MISMATCH');assert.match(size.body.error,/1 bytes; expected 123/);
  for(const metadata of [{},{sha256:'wrong'}]){
    const h=harness('admin',{metadata}),result=await h.post('publish');
    assert.equal(result.status,400);assert.equal(result.body.code,'PACK_METADATA_MISMATCH');assert.match(result.body.error,/arcs-4-6.bundle/);assert.equal(h.writes.length,0);
  }
});

test('uploaded draft survives reload, can be published later, and then leaves draft list',async()=>{
  const h=harness();assert.equal((await h.post('upload')).status,200);
  const list=await h.admin.GET();assert.equal(list.status,200);assert.equal(list.body.drafts.length,1);
  assert.equal(list.body.drafts[0].release.buildId,release().buildId);
  assert.ok(list.body.drafts[0].packs.every(p=>p.state==='ready'));
  assert.equal((await h.game.GET(new Request('https://game.test/api/game/resource-packs?build='+release().buildId))).status,404);
  assert.equal((await h.post('publish',list.body.drafts[0].release)).status,200);
  const published=await h.admin.GET();assert.equal(published.body.drafts.length,0);assert.equal(published.body.releases.length,1);
  assert.equal((await h.post('upload')).status,409);assert.equal((await h.post('inspect')).status,409);
});

test('older storage folders appear and linking a manifest needs no bundle upload',async()=>{
  const h=harness('admin',{folders:[release().buildId,'not-a-build-id']});
  const before=await h.admin.GET();assert.equal(before.body.storageOnly.length,1);assert.equal(before.body.storageOnly[0],release().buildId);
  assert.equal((await h.post('inspect')).status,200);assert.equal(h.uploads.length,0);assert.equal(h.writes.length,0);
  const after=await h.admin.GET();assert.equal(after.body.storageOnly.length,0);assert.equal(after.body.drafts.length,1);
});

test('draft registration persists even when signing fails, and replacement keeps one draft',async()=>{
  const failures={sign:Error('signing failed')},h=harness('admin',failures);
  assert.equal((await h.post('upload')).status,503);assert.equal(h.drafts.size,1);
  delete failures.sign;
  assert.equal((await h.post('upload')).status,200);assert.equal(h.drafts.size,1);
  const changed=release();changed.packs[0].sha256='d'.repeat(64);
  assert.equal((await h.post('upload',changed)).status,409);assert.equal(h.drafts.size,1);
});

test('draft statuses distinguish missing, mismatched and unavailable objects',async()=>{
  for(const [failures,state] of [
    [{head:{name:'NotFound'}},'missing'],[{head:{name:'AccessDenied'}},'unavailable'],[{metadata:{}},'metadata-mismatch']
  ]){
    const h=harness('admin',failures);const result=await h.post('inspect');assert.equal(result.status,200);
    assert.ok(result.body.packs.every(p=>p.state===state));
    const list=await h.admin.GET();assert.ok(list.body.drafts[0].packs.every(p=>p.state===state));
    assert.notEqual((await h.post('publish')).status,200);assert.equal(h.writes.length,0);
  }
  const h=harness();h.badHead();assert.ok((await h.post('inspect')).body.packs.every(p=>p.state==='size-mismatch'));
});

test('storage scan failures preserve saved drafts and report a warning',async()=>{
  const h=harness('admin',{list:Error('private-secret')});await h.post('inspect');
  const result=await h.admin.GET();assert.equal(result.status,200);assert.equal(result.body.drafts.length,1);
  assert.match(result.body.storageWarning,/Could not scan storage/);assert.ok(!JSON.stringify(result).includes('private-secret'));
  const truncated=await harness('admin',{truncated:true}).admin.GET();assert.match(truncated.body.storageWarning,/first 100/);
});

test('listing and registering drafts require admin access and same origin',async()=>{
  for(const role of [null,'user','tester']){
    const h=harness(role);assert.equal((await h.admin.GET()).status,role?403:401);
    assert.equal((await h.post('inspect')).status,role?403:401);assert.equal(h.drafts.size,0);
  }
  const h=harness();assert.equal((await h.post('inspect',release(),{Origin:'https://evil.test'})).status,403);assert.equal(h.drafts.size,0);
});
