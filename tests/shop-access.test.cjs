/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => {
    assert.ok(name in imports, name);
    return imports[name];
  } });
  return mod.exports;
}

function api(role) {
  const writes = [];
  const snapshot = { id: 'item', exists: true, data: () => ({ name: 'Sword' }) };
  const ref = { get: async () => snapshot, set: async () => writes.push('set'), delete: async () => writes.push('delete') };
  const handlers = load('src/app/api/admin/shop/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } },
    '@/lib/auth': { getSessionUser: async () => role ? { role } : null, isAdminRole: r => ['admin', 'superadmin'].includes(r) },
    '@/lib/firebaseAdmin': { getAdminDb: () => ({ collection: () => ({ doc: () => ref }) }) },
    '@/lib/shopItems': { parseShopItemInput: () => ({ data: { name: 'Sword' } }) },
  });
  return { writes, request: method => handlers[method]({ json: async () => ({ id: 'item', name: 'Sword' }) }) };
}

test('only superadmins can create or delete shop items', async () => {
  for (const method of ['POST', 'DELETE']) {
    for (const role of [null, 'user', 'tester', 'admin', 'superadmin']) {
      const h = api(role);
      assert.equal((await h.request(method)).status, role === 'superadmin' ? 200 : role ? 403 : 401);
      assert.equal(h.writes.length, role === 'superadmin' ? 1 : 0);
    }
  }
});

test('admins and superadmins can still edit existing shop items', async () => {
  for (const role of [null, 'user', 'tester', 'admin', 'superadmin']) {
    const h = api(role);
    const allowed = ['admin', 'superadmin'].includes(role);
    assert.equal((await h.request('PATCH')).status, allowed ? 200 : role ? 403 : 401);
    assert.equal(h.writes.length, allowed ? 1 : 0);
  }
});

test('shop hides creation and deletion controls unless explicitly permitted', () => {
  const jsx = (type, props) => ({ type, props });
  const component = load('src/components/ShopManager.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState: value => [value, () => {}], useEffect: () => {} },
    'next/image': { default: 'Image' },
    '@/components/Pagination': { default: 'Pagination' },
    '@/components/SearchInput': { default: 'SearchInput' },
    '@/lib/shopItems': {},
  }).default;
  for (const canCreateDelete of [undefined, false, true]) {
    const rendered = JSON.stringify(component({ initialItems: [{ id: 'item', name: 'Sword', price: 10 }], canCreateDelete }));
    assert.match(rendered, /"Edit"/);
    if (canCreateDelete) {
      assert.match(rendered, /\+ Add item/);
      assert.match(rendered, /"Delete"/);
    } else {
      assert.doesNotMatch(rendered, /\+ Add item|"Delete"/);
      assert.doesNotMatch(JSON.stringify(component({ initialItems: [], canCreateDelete })), /\+ Add item/);
    }
  }
});
