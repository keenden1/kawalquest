/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test harness also loads the compiled route with mocked server dependencies. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.TOPUP_TEST_ROOT || path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));

function harness(options = {}) {
  const calls = { verify: [], checkout: [], players: [] };
  const env = { XSOLLA_PROJECT_ID: '1234', XSOLLA_WEBHOOK_SECRET: 'test-secret', ...options.env };
  const catalog = [{ id: 'single_gold', gold: 1, name: '1 Gold', displayPrice: 'PHP 1' }];
  const stubs = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200, headers: init.headers }) } },
    '@/lib/firebaseAdmin': {
      getAdminAuth: () => ({ verifyIdToken: async (...args) => {
        calls.verify.push(args);
        if (options.invalidToken) throw Error('revoked');
        return { uid: 'game-user', email: 'game@example.test' };
      } }),
      getAdminDb: () => ({ collection: () => ({ doc: uid => {
        calls.players.push(uid);
        return { get: async () => ({ exists: options.playerExists !== false }) };
      } }) }),
    },
    '@/lib/xsolla': { XSOLLA_TOPUP_PACKAGES: catalog, getXsollaPackage: id => catalog.find(item => item.id === id) },
    '@/lib/xsollaServer': {
      isXsollaConfigured: () => options.configured !== false,
      createXsollaToken: async args => {
        calls.checkout.push(args);
        if (options.providerError) throw Error('private payment details');
        return { token: 'payment-token', paymentUrl: 'unused' };
      },
    },
  };
  const source = fs.readFileSync(path.join(root, 'src/app/api/game/top-up/route.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => {
    assert.ok(stubs[id], `Unexpected import ${id}`);
    return stubs[id];
  }, process: { env }, console: { error() {} } });
  const request = (body = { packageId: 'single_gold' }, authorization = 'Bearer game-token') => ({
    headers: { get: name => name === 'authorization' ? authorization : null },
    json: async () => body,
  });
  return { api: exports, request, calls, catalog };
}

test('catalog shares packages, defaults to sandbox, and is not cached', async () => {
  const h = harness(); const result = await h.api.GET();
  assert.equal(result.body.packages, h.catalog);
  assert.equal(result.body.sandbox, true);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('missing and malformed credentials never reach Xsolla', async () => {
  for (const auth of [null, '', 'Basic token', 'Bearer two tokens']) {
    const h = harness(); assert.equal((await h.api.POST(h.request(undefined, auth))).status, 401);
    assert.equal(h.calls.checkout.length, 0);
  }
});
test('revoked Firebase identity is rejected', async () => {
  const h = harness({ invalidToken: true });
  assert.equal((await h.api.POST(h.request())).status, 401);
  assert.equal(h.calls.verify[0][1], true);
  assert.equal(h.calls.checkout.length, 0);
});
test('missing webhook secret or invalid project disables checkout', async () => {
  for (const env of [{ XSOLLA_WEBHOOK_SECRET: '' }, { XSOLLA_PROJECT_ID: 'oops' }, { XSOLLA_PROJECT_ID: '2147483648' }]) {
    const h = harness({ env });
    assert.equal((await h.api.GET()).body.configured, false);
    assert.equal((await h.api.POST(h.request())).status, 503);
    assert.equal(h.calls.checkout.length, 0);
  }
});
test('unknown packages and malformed bodies are rejected', async () => {
  for (const body of [null, [], { packageId: 'free_gold' }, { packageId: { gold: 999 } }]) {
    const h = harness(); assert.equal((await h.api.POST(h.request(body))).status, 400);
    assert.equal(h.calls.checkout.length, 0);
  }
});
test('account without a player record cannot purchase', async () => {
  const h = harness({ playerExists: false });
  assert.equal((await h.api.POST(h.request())).status, 403);
  assert.equal(h.calls.checkout.length, 0);
});
test('checkout identity and package come from verified identity and server catalog', async () => {
  const h = harness({ env: { XSOLLA_SANDBOX: 'false' } });
  const result = await h.api.POST(h.request({ packageId: 'single_gold', uid: 'victim', email: 'other@example.test', gold: 999999, returnUrl: 'https://evil.test' }));
  assert.equal(result.status, 200);
  assert.equal(result.body.sandbox, false);
  assert.equal(result.body.token, 'payment-token');
  assert.equal(h.calls.players[0], 'game-user');
  const purchase = h.calls.checkout[0];
  assert.equal(purchase.uid, 'game-user'); assert.equal(purchase.email, 'game@example.test');
  assert.equal(purchase.sku, 'single_gold'); assert.equal(purchase.gold, undefined);
  assert.equal(purchase.returnUrl, 'https://www.kawalquest.online/game/top-up-return');
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('provider failure never exposes raw details', async () => {
  const h = harness({ providerError: true });
  const result = await h.api.POST(h.request());
  assert.equal(result.status, 502);
  assert.ok(!JSON.stringify(result).includes('private payment details'));
});
