/* eslint-disable @typescript-eslint/no-require-imports -- Isolated component state and API tests. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(responses) {
  const states = [], effects = [], requests = [];
  let cursor = 0, mounted = false;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect(effect) { if (!mounted) effects.push(effect); },
  };
  const jsx = (type, props) => ({type, props});
  const source = fs.readFileSync(path.join(__dirname, '../src/app/admin/remote-config/page.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  const mod = {exports: {}};
  vm.runInNewContext(compiled, {
    module: mod, exports: mod.exports,
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return {jsx, jsxs: jsx};
      if (name === '@/components/AboutCreditsEditor' || name === '@/components/MobPreviewGallery') return {default: () => null};
      if (name === '@/lib/contentNames') return {UNITY_BOSS_NAMES: Array(10).fill('Boss'), MOB_TYPES: [{name:'Wolf'},{name:'Goblin'},{name:'Hammer Goblin'},{name:'Giant Troll'}]};
      throw new Error('Unexpected import: ' + name);
    },
    fetch: async (url, options) => {
      requests.push({url, options});
      assert.ok(responses.length, 'unexpected request');
      const [status, data] = responses.shift();
      return {status, ok: status >= 200 && status < 300, json: async () => data};
    },
  });
  function render() { cursor = 0; const tree = mod.exports.default(); mounted = true; return tree; }
  async function start() { render(); effects.forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve)); return render(); }
  return {render, start, requests};
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const form = tree => find(tree, n => n.type === 'form');
const event = {preventDefault() {}};


const sectionButton = (tree, label) => find(tree, n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[0] === label);
const inputs = tree => nodes(tree).filter(n => n.type === 'input' && n.props.type === 'text');
test('section switches preserve drafts and saving mobs excludes character changes', async () => {
  const h = harness([[200, {}], [200, {mobTypeNames:['Forest Wolf','Goblin','Hammer Goblin','Giant Troll']}]]);
  let tree = await h.start();
  assert.equal(form(tree), undefined);
  sectionButton(tree,'Characters').props.onClick(); tree = h.render();
  assert.equal(inputs(tree).length,2);
  inputs(tree)[0].props.onChange({target:{value:'Unsaved hero'}}); tree = h.render();
  sectionButton(tree,'Mobs').props.onClick(); tree = h.render();
  assert.equal(inputs(tree).length,4);
  inputs(tree)[0].props.onChange({target:{value:'Forest Wolf'}}); tree = h.render();
  await form(tree).props.onSubmit(event); tree = h.render();
  assert.deepEqual(JSON.parse(h.requests[1].options.body), {mobTypeNames:['Forest Wolf','Goblin','Hammer Goblin','Giant Troll']});
  sectionButton(tree,'Characters').props.onClick(); tree = h.render();
  assert.equal(inputs(tree)[0].props.value,'Unsaved hero');
});
test('boss section shows one arc at a time and retains drafts across arc changes', async () => {
  const h = harness([[200, {}]]);
  let tree = await h.start();
  sectionButton(tree,'Bosses').props.onClick(); tree = h.render();
  assert.equal(inputs(tree).length,1);
  inputs(tree)[0].props.onChange({target:{value:'First boss'}}); tree = h.render();
  find(tree,n=>n.type==='select').props.onChange({target:{value:'5'}}); tree = h.render();
  assert.equal(inputs(tree).length,1);
  assert.equal(inputs(tree)[0].props.value,'Boss');
  find(tree,n=>n.type==='select').props.onChange({target:{value:'0'}}); tree = h.render();
  assert.equal(inputs(tree)[0].props.value,'First boss');
});


test('mob counts preserve drafts, save only regular levels, and restore defaults', async () => {
  const h = harness([[200, {}], [200, {}], [200, {}]]);
  let tree = await h.start();
  sectionButton(tree, 'Mob counts').props.onClick(); tree = h.render();
  const numbers = tree => nodes(tree).filter(n => n.type === 'input' && n.props.type === 'number');
  assert.equal(numbers(tree).length, 20);
  assert.equal(numbers(tree)[0].props.placeholder, '4');
  assert.equal(numbers(tree)[8].props.placeholder, '15');
  numbers(tree)[0].props.onChange({target: {value: '0'}}); tree = h.render();
  numbers(tree)[19].props.onChange({target: {value: '25'}}); tree = h.render();
  sectionButton(tree, 'Bosses').props.onClick(); tree = h.render();
  sectionButton(tree, 'Mob counts').props.onClick(); tree = h.render();
  assert.equal(numbers(tree)[19].props.value, '25');
  await form(tree).props.onSubmit(event); tree = h.render();
  const payload = JSON.parse(h.requests[1].options.body);
  assert.deepEqual(Object.keys(payload), ['mobCounts']);
  assert.equal(payload.mobCounts.length, 20); assert.equal(payload.mobCounts[0], 0);
  assert.equal(payload.mobCounts[1], null); assert.equal(payload.mobCounts[19], 25);
  find(tree, n => n.type === 'button' && n.props.children === 'Restore all defaults').props.onClick(); tree = h.render();
  await form(tree).props.onSubmit(event);
  assert.deepEqual(JSON.parse(h.requests[2].options.body), {mobCounts: Array(20).fill(null)});
});
