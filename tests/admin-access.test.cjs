/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadPage(file, role, records = [], failLookup = false) {
  const jsx = (type, props) => ({ type, props });
  const calls = [];
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { redirect: url => { throw new Error('redirect:' + url); } },
    '@/components/PlayersTable': { default: 'PlayersTable' },
    '@/components/ResourcePacksEditor': { default: 'ResourcePacksEditor' },
    '@/components/RoleManager': { default: 'RoleManager' },
    '@/lib/rankedPlayers': { isSamplePlayer: id => /^seed-(?:0[1-9]|1[0-9]|20)$/.test(id) },
    '@/lib/auth': {
      getSessionUser: async () => role ? { role, uid: 'viewer' } : null,
      isAdminRole: value => ['admin', 'superadmin'].includes(value),
      normalizeRole: value => value ?? 'user',
    },
    '@/lib/firebaseAdmin': {
      getAdminDb: () => ({ collection: () => ({ orderBy: () => ({ get: async () => ({
        docs: records.map(record => ({ id: record.uid, data: () => ({ username: record.uid, points: 10 }) })),
      }) }) }) }),
      getAdminAuth: () => ({
        getUsers: async ids => {
          calls.push(ids);
          if (failLookup) throw new Error('lookup failed');
          return { users: records.filter(record => ids.some(id => id.uid === record.uid)) };
        },
        listUsers: async () => { calls.push('listUsers'); return { users: records }; },
      }),
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => {
    assert.ok(name in imports, name); return imports[name];
  } });
  return { render: mod.exports.default, calls };
}

test('resource pack page redirects all non-superadmins before rendering editor', async () => {
  for (const role of [null, 'user', 'tester', 'admin']) {
    await assert.rejects(loadPage('src/app/admin/resource-packs/page.tsx', role).render,
      new RegExp('redirect:' + (role ? '/admin' : '/login')));
  }
  assert.match(JSON.stringify(await loadPage('src/app/admin/resource-packs/page.tsx', 'superadmin').render()), /ResourcePacksEditor/);
});

test('admins can open Roles but receive no superadmin accounts', async () => {
  const records = [{ uid: 'ordinary-admin', customClaims: { role: 'admin' } }, { uid: 'hidden-superadmin', customClaims: { role: 'superadmin' } }];
  const page = loadPage('src/app/admin/users/page.tsx', 'admin', records);
  const rendered = JSON.stringify(await page.render());
  assert.match(rendered, /ordinary-admin/);
  assert.doesNotMatch(rendered, /hidden-superadmin/);
  assert.match(rendered, /"canManageSuperadmins":false/);
  const all = JSON.stringify(await loadPage('src/app/admin/users/page.tsx', 'superadmin', records).render());
  assert.match(all, /hidden-superadmin/);
  assert.match(all, /"canManageSuperadmins":true/);
  for (const role of [null, 'user', 'tester']) {
    const denied = loadPage('src/app/admin/users/page.tsx', role);
    await assert.rejects(denied.render, /redirect:/);
    assert.equal(denied.calls.length, 0);
  }
});

function roleApi(role, targetRole = 'user') {
  const writes = [];
  const imports = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    '@/lib/auth': {
      getSessionUser: async () => role ? { uid: 'viewer', role } : null,
      isAdminRole: value => ['admin', 'superadmin'].includes(value),
      normalizeRole: value => value ?? 'user',
      canUseCheatButton: value => ['tester', 'admin', 'superadmin'].includes(value),
      ROLES: ['user', 'tester', 'admin', 'superadmin'],
    },
    '@/lib/firebaseAdmin': {
      getAdminAuth: () => ({
        getUser: async () => ({ customClaims: { role: targetRole, otherClaim: true } }),
        setCustomUserClaims: async (uid, claims) => writes.push({ uid, claims }),
      }),
      getAdminDb: () => ({ collection: () => ({ doc: () => ({ set: async data => writes.push(data) }) }) }),
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/admin/users/role/route.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => imports[name] });
  return { writes, patch: (newRole, uid = 'target') => mod.exports.PATCH({ json: async () => ({ uid, role: newRole }) }) };
}

test('admins can assign user, tester and admin roles while preserving other claims and role mirror', async () => {
  for (const current of ['user', 'tester', 'admin']) {
    for (const desired of ['user', 'tester', 'admin']) {
      const h = roleApi('admin', current);
      assert.equal((await h.patch(desired)).status, 200);
      assert.equal(h.writes.length, 2);
      assert.equal(h.writes[0].claims.role, desired);
      assert.equal(h.writes[0].claims.otherClaim, true);
      assert.equal(h.writes[1].role, desired);
    }
  }
});

test('admins cannot assign superadmin or modify existing superadmin accounts', async () => {
  for (const current of ['user', 'tester', 'admin', 'superadmin']) {
    for (const desired of ['user', 'tester', 'admin', 'superadmin']) {
      if (current !== 'superadmin' && desired !== 'superadmin') continue;
      const h = roleApi('admin', current);
      assert.equal((await h.patch(desired)).status, 403);
      assert.equal(h.writes.length, 0);
    }
  }
  assert.equal((await roleApi('superadmin', 'admin').patch('superadmin')).status, 200);
  assert.equal((await roleApi('superadmin', 'superadmin').patch('admin')).status, 200);
});

test('role updates reject non-admins and self-role changes', async () => {
  for (const role of [null, 'user', 'tester']) {
    const h = roleApi(role);
    assert.equal((await h.patch('admin')).status, role ? 403 : 401);
    assert.equal(h.writes.length, 0);
  }
  for (const role of ['admin', 'superadmin']) {
    const h = roleApi(role);
    assert.equal((await h.patch('user', 'viewer')).status, 400);
    assert.equal(h.writes.length, 0);
  }
});

test('admin roster excludes superadmins server-side and batches Auth lookups', async () => {
  const records = Array.from({ length: 101 }, (_, i) => ({ uid: 'player-' + i }));
  records.push({ uid: 'hidden-superadmin', customClaims: { role: 'superadmin' } });
  const page = loadPage('src/app/admin/players/page.tsx', 'admin', records);
  const rendered = JSON.stringify(await page.render());
  assert.doesNotMatch(rendered, /hidden-superadmin/);
  assert.match(rendered, /player-100/);
  assert.deepEqual(page.calls.map(batch => batch.length), [100, 2]);
  const superadmin = loadPage('src/app/admin/players/page.tsx', 'superadmin', records);
  assert.match(JSON.stringify(await superadmin.render()), /hidden-superadmin/);
  assert.equal(superadmin.calls.length, 0);
});

test('failed role lookup does not expose unfiltered player data', async () => {
  const page = loadPage('src/app/admin/players/page.tsx', 'admin', [{ uid: 'hidden-superadmin' }], true);
  assert.doesNotMatch(JSON.stringify(await page.render()), /hidden-superadmin/);
});
