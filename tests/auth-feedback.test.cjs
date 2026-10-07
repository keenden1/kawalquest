/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function harness(component, response, reject = false) {
  const states = [], navigation = [], requests = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const credential = { user: { getIdToken: async () => 'token' } };
  const imports = {
    react: { useState: initial => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    }, useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ replace: url => navigation.push(url), refresh: () => navigation.push('refresh') }) },
    '@/components/AuthSuccessModal': { default: 'AuthSuccessModal' },
    '@/components/PasswordField': { default: 'PasswordField' },
    '@/lib/firebaseClient': { hasFirebaseClientConfig: () => true, getClientAuth: () => ({ signOut: async () => {} }) },
    'firebase/auth': { setPersistence: async () => {}, signInWithEmailAndPassword: async () => credential },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/components', component + '.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, {
    module: mod, exports: mod.exports, require: name => { assert.ok(name in imports, name); return imports[name]; },
    FormData: class { get(key) { return { email: 'player@example.test', password: 'password' }[key]; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (reject) throw new Error('network failure');
      return { ok: response.ok, json: async () => response.body };
    },
  });
  return { navigation, requests, render: () => { cursor = 0; return mod.exports.default({}); } };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, type) => nodes(tree).find(node => node.type === type);

test('login shows success before navigating to the correct role destination', async () => {
  for (const role of ['user', 'tester', 'admin', 'superadmin']) {
    const h = harness('AuthForm', { ok: true, body: { user: { role } } });
    await find(h.render(), 'form').props.onSubmit({ preventDefault() {}, currentTarget: {} });
    const modal = find(h.render(), 'AuthSuccessModal');
    assert.equal(modal.props.title, 'Login successful!');
    assert.equal(h.navigation.length, 0);
    modal.props.onContinue();
    assert.deepEqual(h.navigation, [role === 'admin' || role === 'superadmin' ? '/admin' : '/account', 'refresh']);
  }
});

test('failed login never displays success or navigates', async () => {
  const h = harness('AuthForm', { ok: false, body: { error: 'Invalid session' } });
  await find(h.render(), 'form').props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.equal(find(h.render(), 'AuthSuccessModal'), undefined);
  assert.equal(h.navigation.length, 0);
  assert.ok(nodes(h.render()).some(n => n.props?.role === 'alert'));
});

test('successful logout waits for confirmation before opening login', async () => {
  const h = harness('LogoutButton', { ok: true });
  await find(h.render(), 'button').props.onClick();
  const modal = find(h.render(), 'AuthSuccessModal');
  assert.equal(modal.props.title, 'Logout successful!');
  assert.equal(h.requests[0].options.method, 'DELETE');
  assert.equal(h.navigation.length, 0);
  modal.props.onContinue();
  assert.deepEqual(h.navigation, ['/login', 'refresh']);
});

test('failed logout shows an error, permits retry, and never displays success', async () => {
  for (const reject of [false, true]) {
    const h = harness('LogoutButton', { ok: false }, reject);
    await find(h.render(), 'button').props.onClick();
    const tree = h.render();
    assert.equal(find(tree, 'AuthSuccessModal'), undefined);
    assert.equal(find(tree, 'button').props.disabled, false);
    assert.ok(nodes(tree).some(n => n.props?.role === 'alert'));
    assert.equal(h.navigation.length, 0);
  }
});
