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
    '@/lib/aboutDefaults.json': { default: require('../src/lib/aboutDefaults.json') },
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200 }) } },
    '@/lib/auth': { getSessionUser: async () => role ? { role } : null, isAdminRole: role => ['admin', 'superadmin'].includes(role) },
    '@/lib/firebaseAdmin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({
      get: async () => ({ exists: true, data: () => data }),
      set: async (update, options) => writes.push(JSON.parse(JSON.stringify({ update, options }))),
    }) }) }) },
  });
  return { api, writes, post: body => api.POST({ json: async () => body }) };
}
const names = () => Array.from({ length: 10 }, (_, i) => `Mob ${i + 1}`);
test('read and write require admin permissions', async () => {
  for (const [role, status] of [[null, 401], ['user', 403], ['tester', 403]]) {
    const h = harness(role); assert.equal((await h.api.GET()).status, status);
    assert.equal((await h.post({ mobNames: names() })).status, status); assert.equal(h.writes.length, 0);
  }
});
test('GET provides defaults and saved overrides without replacing boss settings', async () => {
  const h = harness('admin', { mobNameArc5: 'Kawal', bossNameArc5: 'Boss Custom' });
  const response = await h.api.GET();
  assert.equal(response.body.mobNames.length, 10); assert.equal(response.body.mobNames[4], 'Kawal');
  assert.equal(response.body.mobNames[0], 'Testdummy'); assert.equal(response.body.bossNames[4], 'Boss Custom');
  assert.equal(response.body.bossNames[9], 'Bantay ng Pighati');
});
test('saves all ten mob names trimmed using merge without changing boss or character fields', async () => {
  const h = harness('superadmin'); const list = names().map(n => ` ${n} `);
  assert.equal((await h.post({ mobNames: list })).status, 200);
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].options.merge, true);
  assert.deepEqual(h.writes[0].update, Object.fromEntries(names().map((n, i) => [`mobNameArc${i + 1}`, n])));
});
test('rejects malformed, blank, long, markup and control-character names before any write', async () => {
  const invalid = [null, 'name', [], names().slice(1), [...names(), 'Extra'], names().map((n,i) => i===9 ? 12 : n)];
  for (const name of ['', ' ', 'A', 'x'.repeat(41), '<b>Name</b>', 'bad\nname', 'bad\u007fname']) {
    const list = names(); list[9] = name; invalid.push(list);
  }
  for (const mobNames of invalid) {
    const h = harness(); assert.equal((await h.post({ mobNames, showCheatButton: true })).status, 400);
    assert.equal(h.writes.length, 0);
  }
});
test('allows Unicode and preserves unrelated-field updates', async () => {
  const h = harness(); const list = names(); list[0] = 'Mandirigmang Pilipino'; list[1] = 'Niño';
  assert.equal((await h.post({ mobNames: list })).status, 200);
  const other = harness(); assert.equal((await other.post({ showCheatButton: false })).status, 200);
  assert.deepEqual(other.writes[0].update, { showCheatButton: false });
});
test('rejects non-object payloads', async () => {
  for (const body of [null, [], 12, 'bad']) assert.equal((await harness().post(body)).status, 400);
});

test('chase distance GET preserves defaults and accepts numeric overrides including zero', async () => {
  const h = harness('admin', { mobChaseDistanceArc1: 12.5, mobChaseDistanceArc2: 0, mobChaseDistanceArc3: '20', mobChaseDistanceArc4: 101 });
  const values = (await h.api.GET()).body.mobChaseDistances;
  assert.equal(values.length, 10);
  assert.equal(values[0], 12.5); assert.equal(values[1], 0);
  assert.equal(values[2], null); assert.equal(values[3], null); assert.equal(values[9], null);
});
test('chase distances save with merge and null restores the game default', async () => {
  const values = [0, 1, 12.5, 100, null, 5, 6, 7, 8, 9];
  const h = harness('superadmin');
  const response = await h.post({ mobChaseDistances: values });
  assert.equal(response.status, 200);
  assert.deepEqual(h.writes[0], { update: Object.fromEntries(values.map((v,i) => [`mobChaseDistanceArc${i+1}`,v])), options: {merge:true} });
  assert.equal(response.body.mobChaseDistances[4], null);
});
test('chase distances reject malformed arrays and non-finite or out-of-range numbers atomically', async () => {
  const bad = [null, [], Array(9).fill(10), Array(11).fill(10), '10'];
  for (const value of [-1, 100.01, NaN, Infinity, '5', false, {}, undefined]) {
    const list = Array(10).fill(5); list[9] = value; bad.push(list);
  }
  for (const mobChaseDistances of bad) {
    const h = harness();
    assert.equal((await h.post({ mobNames: names(), mobChaseDistances })).status, 400);
    assert.equal(h.writes.length, 0);
  }
});
test('chase changes require administrator permission', async () => {
  for (const [role,status] of [[null,401],['user',403],['tester',403]]) {
    const h = harness(role);
    assert.equal((await h.post({mobChaseDistances:Array(10).fill(5)})).status,status);
    assert.equal(h.writes.length,0);
  }
});

test('type names default independently of legacy arc names and preserve other settings', async () => {
  const h = harness('admin', { mobNameArc1: 'Old mixed name', mobNameTypeWolf: 'Forest Wolf', bossNameArc1: 'Boss' });
  const body = (await h.api.GET()).body;
  assert.deepEqual(Array.from(body.mobTypeNames), ['Forest Wolf', 'Goblin', 'Hammer Goblin', 'Giant Troll']);
  assert.equal(body.bossNames[0], 'Boss');
});
test('saves type names using stable model keys only', async () => {
  const h = harness();
  const result = await h.post({mobTypeNames: [' White Wolf ', 'Goblin', 'Hammer Goblin', 'Giant Troll']});
  assert.equal(result.status, 200);
  assert.deepEqual(h.writes, [{update: {mobNameTypeWolf: 'White Wolf', mobNameTypeGoblin: 'Goblin', mobNameTypeHammerGoblin: 'Hammer Goblin', mobNameTypeGiantTroll: 'Giant Troll'}, options: {merge: true}}]);
});
test('invalid type names reject the whole save, including unrelated settings', async () => {
  for (const mobTypeNames of [null, [], names(), ['Wolf', 'Goblin', 'Hammer Goblin', '<b>Troll</b>'], ['Wolf', 'Goblin', 'Hammer Goblin', ''], ['Wolf', 'Goblin', 'Hammer Goblin', 3], ['Wolf', 'Goblin', 'Hammer Goblin', 'x'.repeat(41)]]) {
    const h = harness();
    assert.equal((await h.post({mobTypeNames, showCheatButton: true})).status, 400);
    assert.equal(h.writes.length, 0);
  }
});
test('type names require admin authorization', async () => {
  for (const [role, status] of [[null,401], ['user',403], ['tester',403]]) {
    const h = harness(role);
    assert.equal((await h.post({mobTypeNames:['Wolf','Goblin','Hammer Goblin','Giant Troll']})).status, status);
    assert.equal(h.writes.length, 0);
  }
});
