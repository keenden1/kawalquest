/* eslint-disable @typescript-eslint/no-require-imports -- Isolated editor state tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const catalog=require('../src/lib/npcQuestionDefaults.json');
const rows=catalog.map(row=>({...row,content:row.defaults,revision:0,overridden:false}));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(responses) {
  const states=[],effects=[],requests=[];let cursor=0,mounted=false;
  const jsx=(type,props)=>({type,props});
  const compiledModule={exports:{}};
  const source=fs.readFileSync(require('node:path').join(__dirname,'../src/components/NPCQuestionsEditor.tsx'),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,AbortController,
    require:name=>{
      if(name==='react')return {useState:value=>{const i=cursor++;if(!(i in states))states[i]=value;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next];},useEffect:effect=>{if(!mounted)effects.push(effect);}};
      if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
      if(name==='@/lib/npcQuestions')return {validateQuestion:()=>{}};
      throw Error(name);
    },fetch:async(url,options)=>{requests.push({url,options});assert.ok(responses.length);const[status,data]=responses.shift();return{ok:status===200,json:async()=>data};}
  });
  const render=()=>{cursor=0;const tree=compiledModule.exports.default();mounted=true;return tree;};
  return {render,requests,start:async()=>{render();effects.forEach(effect=>effect());await tick();return render();}};
}
function nodes(tree){if(!tree||typeof tree!=='object')return[];if(Array.isArray(tree))return tree.flatMap(nodes);return[tree,...nodes(tree.props?.children)];}
const find=(tree,predicate)=>nodes(tree).find(predicate);
const inputs=(tree,type)=>nodes(tree).filter(node=>node.type===type);
const button=(tree,label)=>find(tree,node=>node.type==='button'&&node.props.children===label);
test('switching NPCs preserves separate drafts and saves the selected NPC only',async()=>{
  const h=harness([[200,{questions:rows}],[200,{content:{...rows[0].content,questionEN:'Draft A'},revision:1,overridden:true}]]);
  let tree=await h.start();inputs(tree,'textarea')[0].props.onChange({target:{value:'Draft A'}});tree=h.render();
  inputs(tree,'select')[2].props.onChange({target:{value:rows[1].id}});tree=h.render();
  assert.equal(inputs(tree,'textarea')[0].props.value,rows[1].content.questionEN);
  inputs(tree,'textarea')[0].props.onChange({target:{value:'Draft B'}});tree=h.render();
  inputs(tree,'select')[2].props.onChange({target:{value:rows[0].id}});tree=h.render();
  assert.equal(inputs(tree,'textarea')[0].props.value,'Draft A');button(tree,'Save this NPC').props.onClick();await tick();
  assert.equal(JSON.parse(h.requests[1].options.body).id,rows[0].id);
  tree=h.render();inputs(tree,'select')[2].props.onChange({target:{value:rows[1].id}});tree=h.render();
  assert.equal(inputs(tree,'textarea')[0].props.value,'Draft B');
});
test('save conflicts and expired authentication retain draft and original revision',async()=>{
  for(const status of [401,409,503]) {
    const h=harness([[200,{questions:rows}],[status,{error:'Save failed'}]]);let tree=await h.start();
    inputs(tree,'textarea')[0].props.onChange({target:{value:'Keep me'}});tree=h.render();button(tree,'Save this NPC').props.onClick();await tick();tree=h.render();
    assert.equal(inputs(tree,'textarea')[0].props.value,'Keep me');assert.ok(find(tree,node=>node.props.role==='alert'));
    assert.equal(JSON.parse(h.requests[1].options.body).revision,0);
  }
});
test('restore default stages a reset and needs explicit save',async()=>{
  const h=harness([[200,{questions:rows}],[200,{content:rows[0].defaults,revision:1,overridden:false}]]);let tree=await h.start();
  button(tree,'Restore game default').props.onClick();tree=h.render();assert.equal(h.requests.length,1);
  button(tree,'Save this NPC').props.onClick();await tick();assert.equal(JSON.parse(h.requests[1].options.body).reset,true);
});
test('level without NPCs has no edit or save controls',async()=>{
  const h=harness([[200,{questions:rows}]]);let tree=await h.start();inputs(tree,'select')[1].props.onChange({target:{value:'3'}});tree=h.render();
  assert.equal(inputs(tree,'textarea').length,0);assert.equal(button(tree,'Save this NPC'),undefined);
});
test('load failure supports retry without enabling blank saves',async()=>{
  const h=harness([[503,{error:'Offline'}],[200,{questions:rows}]]);let tree=await h.start();assert.equal(button(tree,'Save this NPC'),undefined);
  button(tree,'Retry loading').props.onClick();await tick();tree=h.render();assert.equal(inputs(tree,'textarea').length,2);
});
