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
  const source = fs.readFileSync(path.join(__dirname, '../src/components/AboutCreditsEditor.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  const mod = {exports: {}};
  vm.runInNewContext(compiled, {
    module: mod, exports: mod.exports,
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return {jsx, jsxs: jsx};
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
const field = (tree, id) => find(tree, n => n.props.id === id);
const form = tree => find(tree, n => n.type === 'form');
const event = {preventDefault() {}};

test('expired save preserves all drafts and supports saving after signing in again', async () => {
  const content = {aboutTextEnglish:'My English text', aboutTextFilipino:'Aking teksto', aboutCredits:'Team'};
  const h = harness([[200, {}], [401, {error:'Authentication required.'}], [200, content]]);
  let tree = await h.start();
  for (const [id, value] of [['about-english', content.aboutTextEnglish], ['about-filipino', content.aboutTextFilipino], ['about-credits', content.aboutCredits]]) {
    field(tree, id).props.onChange({target:{value}}); tree = h.render();
  }
  await form(tree).props.onSubmit(event); tree = h.render();
  assert.equal(field(tree,'about-english').props.value, content.aboutTextEnglish);
  assert.equal(field(tree,'about-filipino').props.value, content.aboutTextFilipino);
  assert.equal(field(tree,'about-credits').props.value, content.aboutCredits);
  assert.match(find(tree,n => n.props.role === 'alert').props.children, /sign-in session/);
  const login = find(tree,n => n.type === 'a');
  assert.equal(login.props.href,'/login'); assert.equal(login.props.target,'_blank');
  await form(tree).props.onSubmit(event); tree = h.render();
  assert.ok(find(tree,n => n.props.role === 'status'));
  assert.equal(find(tree,n => n.type === 'a'), undefined);
  assert.deepEqual(JSON.parse(h.requests[2].options.body), content);
});

test('initial authentication failure exposes sign-in and retry without enabling an empty save', async () => {
  const h = harness([[401, {}], [200, {aboutCredits:'Existing credits'}]]);
  let tree = await h.start();
  assert.equal(field(tree,'about-credits').props.disabled, true);
  assert.ok(find(tree,n => n.type === 'a' && n.props.href === '/login'));
  find(tree,n => n.type === 'button' && n.props.children === 'Retry loading').props.onClick();
  await new Promise(resolve => setImmediate(resolve)); tree = h.render();
  assert.equal(field(tree,'about-credits').props.value,'Existing credits');
  assert.equal(field(tree,'about-credits').props.disabled,false);
});

test('permission failure keeps draft and explains admin access', async () => {
  const h = harness([[200, {}], [403, {}]]);
  let tree = await h.start();
  field(tree,'about-credits').props.onChange({target:{value:'Unsaved'}}); tree = h.render();
  await form(tree).props.onSubmit(event); tree = h.render();
  assert.equal(field(tree,'about-credits').props.value,'Unsaved');
  assert.match(find(tree,n => n.props.role === 'alert').props.children,/admin or superadmin/);
});
