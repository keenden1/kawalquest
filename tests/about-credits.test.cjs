/* eslint-disable @typescript-eslint/no-require-imports -- Tests load route code with isolated server mocks. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, stubs = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const routeModule = { exports: {} };
  vm.runInNewContext(compiled, { module: routeModule, exports: routeModule.exports, require: name => {
    assert.ok(name in stubs, 'Unexpected import: ' + name); return stubs[name];
  } });
  return routeModule.exports;
}
const defaults = load('src/lib/contentNames.ts');
function harness(role = 'admin', data = {}) {
  const writes = [];
  const api = load('src/app/api/remote-config/route.ts', {
    '@/lib/contentNames': defaults,
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200 }) } },
    '@/lib/auth': { getSessionUser: async () => role ? { role } : null, isAdminRole: role => ['admin', 'superadmin'].includes(role) },
    '@/lib/firebaseAdmin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({
      get: async () => ({ exists: true, data: () => data }),
      set: async (update, options) => writes.push(JSON.parse(JSON.stringify({ update, options }))),
    }) }) }) },
  });
  return { api, writes, post: body => api.POST({ json: async () => body }) };
}
test('credits access requires admin', async () => {
  for (const role of [null, 'user', 'tester']) {
    const h = harness(role);
    assert.equal((await h.post({aboutCredits: 'Name'})).status, role ? 403 : 401);
    assert.equal(h.writes.length, 0);
  }
});
test('credits load, normalize line breaks, preserve settings, and clear', async () => {
  const h = harness('admin', {aboutCredits: 'Team\nName'});
  assert.equal((await h.api.GET()).body.aboutCredits, 'Team\nName');
  assert.equal((await h.post({aboutCredits: ' Team\r\nName '})).body.aboutCredits, 'Team\nName');
  assert.deepEqual(h.writes[0], {update: {aboutCredits: 'Team\nName'}, options: {merge:true}});
  assert.equal((await h.post({aboutCredits: ''})).status, 200);
  assert.equal(h.writes[1].update.aboutCredits, '');
  assert.equal((await harness().api.GET()).body.aboutCredits, '');
});
test('invalid credits never write', async () => {
  for (const value of [null, 4, [], {}, 'x'.repeat(2001), '<b>Name</b>', 'Name\u0000']) {
    const h = harness();
    assert.equal((await h.post({aboutCredits: value})).status, 400);
    assert.equal(h.writes.length, 0);
  }
});