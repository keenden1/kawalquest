const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const backend = process.env.VERIFICATION_TEST_ROOT || (fs.existsSync(path.resolve(__dirname, '../node_modules/typescript'))
  ? path.resolve(__dirname, '..') : path.resolve(__dirname, '../../../kawal-quest-admin'));
const ts = require(path.join(backend, 'node_modules/typescript'));

function harness(options = {}) {
  let nextSendAt = options.nextSendAt || 0;
  let queue = Promise.resolve();
  const calls = { mail: [], link: [], verified: [] };
  const snapshot = () => ({ data: () => ({ nextSendAt }) });
  const ref = { get: async () => snapshot() };
  const stubs = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, ...init }) } },
    '@/lib/firebaseAdmin': {
      getAdminAuth: () => ({
        verifyIdToken: async (token, revoked) => {
          calls.verified.push([token, revoked]);
          if (options.invalid) throw Error('private auth error');
          return { uid: 'account-1' };
        },
        getUser: async () => ({ uid: 'account-1', email: 'owner@gmail.com', emailVerified: !!options.verified, disabled: !!options.disabled }),
        generateEmailVerificationLink: async email => { calls.link.push(email); return 'https://auth.test/?oobCode=secret&mode=verifyEmail'; },
      }),
      getAdminDb: () => ({ collection: name => {
        assert.equal(name, 'emailVerificationRequests');
        return { doc: uid => { assert.equal(uid, 'account-1'); return ref; } };
      }, runTransaction: callback => {
        const result = queue.then(() => callback({ get: async () => snapshot(), set: (_, data) => { nextSendAt = data.nextSendAt; } }));
        queue = result.catch(() => {}); return result;
      } }),
    },
    '@/lib/mailer': { sendMail: async mail => { calls.mail.push(mail); if (options.smtpFailure) throw Error('smtp credentials'); } },
  };
  const route = fs.existsSync(path.join(__dirname, 'route.ts')) ? path.join(__dirname, 'route.ts')
    : path.join(backend, 'src/app/api/game/email-verification/route.ts');
  const code = ts.transpileModule(fs.readFileSync(route, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Date, require: id => { assert.ok(stubs[id]); return stubs[id]; } });
  const request = (auth = 'Bearer test-token') => ({ headers: { get: () => auth }, json: async () => ({ email: 'victim@gmail.com', uid: 'victim' }) });
  return { api: exports, calls, request };
}
test('missing, malformed, revoked and disabled identities cannot send', async () => {
  for (const auth of [null, '', 'Basic token', 'Bearer two tokens']) {
    const h = harness(); assert.equal((await h.api.POST(h.request(auth))).status, 401); assert.equal(h.calls.mail.length, 0);
  }
  for (const options of [{ invalid: true }, { disabled: true }]) {
    const h = harness(options); assert.equal((await h.api.POST(h.request())).status, 401); assert.equal(h.calls.mail.length, 0);
  }
});
test('delivery uses Auth email and escapes the generated verification link', async () => {
  const h = harness(); const response = await h.api.POST(h.request());
  assert.equal(response.status, 200); assert.equal(response.body.retryAfterSeconds, 300);
  assert.equal(h.calls.mail[0].to, 'owner@gmail.com'); assert.equal(h.calls.link[0], 'owner@gmail.com');
  assert.ok(h.calls.mail[0].html.includes('&amp;mode=verifyEmail'));
  assert.equal(h.calls.verified[0][1], true); assert.equal(response.headers['Cache-Control'], 'no-store');
});
test('simultaneous requests and retries send only once per five minutes', async () => {
  const h = harness(); const results = await Promise.all([h.api.POST(h.request()), h.api.POST(h.request())]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 429]); assert.equal(h.calls.mail.length, 1);
  const retry = await h.api.POST(h.request()); assert.equal(retry.status, 429); assert.ok(retry.body.retryAfterSeconds >= 299);
});
test('status restores cooldown without sending mail', async () => {
  const h = harness({ nextSendAt: Date.now() + 180000 }); const response = await h.api.GET(h.request());
  assert.equal(response.status, 200); assert.ok(response.body.retryAfterSeconds >= 179); assert.equal(h.calls.mail.length, 0);
});
test('expired cooldown permits delivery', async () => {
  const h = harness({ nextSendAt: Date.now() - 1 }); assert.equal((await h.api.POST(h.request())).status, 200);
  assert.equal(h.calls.mail.length, 1);
});
test('verified users get current Auth status and no new mail', async () => {
  const h = harness({ verified: true }); const response = await h.api.POST(h.request());
  assert.equal(response.body.verified, true); assert.equal(h.calls.mail.length, 0);
});
test('SMTP failures do not expose credentials or permit repeated delivery', async () => {
  const h = harness({ smtpFailure: true }); const response = await h.api.POST(h.request());
  assert.equal(response.status, 503); assert.equal(response.body.retryAfterSeconds, 300);
  assert.ok(!JSON.stringify(response).includes('credentials'));
  assert.equal((await h.api.POST(h.request())).status, 429); assert.equal(h.calls.mail.length, 1);
});
