/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(ids) {
  const docs = ids.map((id, index) => ({ id, data: () => ({ username: id, points: 1000 - index }) }));
  const query = (offset = 0) => ({
    orderBy: () => query(offset), limit: () => query(offset),
    startAfter: doc => query(docs.indexOf(doc) + 1),
    get: async () => ({ docs: docs.slice(offset, offset + 100) }),
  });
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/rankedPlayers.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: () => ({ getAdminDb: () => ({ collection: () => query() }) }) });
  return mod.exports;
}

test('known sample accounts are excluded before applying the ranking limit', async () => {
  const ids = [...Array.from({ length: 20 }, (_, i) => `seed-${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 30 }, (_, i) => `player-${i}`)];
  for (const limit of [5, 25]) {
    const players = await load(ids).getRankedPlayers(limit);
    assert.equal(players.length, limit);
    assert.equal(players[0].id, 'player-0');
    assert.equal(players.at(-1).id, `player-${limit - 1}`);
    assert.ok(players.every(player => !player.id.startsWith('seed-')));
  }
});

test('sample-only rankings are empty and real accounts are not guessed from names', async () => {
  assert.equal((await load(['seed-01', 'seed-20']).getRankedPlayers(25)).length, 0);
  const players = await load(['test', 'seed-21', 'real-player']).getRankedPlayers(25);
  assert.equal(players.length, 3);
});

test('ranking pagination preserves score order across batches', async () => {
  const players = await load(Array.from({ length: 120 }, (_, i) => `player-${i}`)).getRankedPlayers(110);
  assert.equal(players.length, 110);
  assert.equal(players[100].id, 'player-100');
  assert.equal(players[109].points, 891);
});
