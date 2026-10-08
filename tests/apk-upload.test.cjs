/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

test('APK browser upload sends all signed headers and saves only after storage succeeds', async () => {
  const client = new S3Client({ region: 'auto', endpoint: 'https://example.r2.cloudflarestorage.com',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
  try {
    const imports = {
      'next/server': { NextResponse: { json: body => body } },
      'node:crypto': { randomUUID: () => 'test-id' },
      '@aws-sdk/client-s3': { PutObjectCommand, HeadObjectCommand },
      '@/lib/firebaseAdmin': { getAdminDb: () => { throw new Error('Unexpected database access'); } },
      '@aws-sdk/s3-request-presigner': { getSignedUrl },
      '@/lib/r2': { getR2Bucket: () => 'bucket', getR2Client: () => client, getR2PublicUrl: key => `https://cdn.test/${key}` },
      '@/lib/auth': { getSessionUser: async () => ({ role: 'admin' }), isAdminRole: () => true },
    };
    const module = { exports: {} };
    const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(compile(fs.readFileSync('src/app/api/admin/apk-upload/route.ts', 'utf8')),
      { module, exports: module.exports, require: name => { assert.ok(name in imports, name); return imports[name]; } });
    const payload = await module.exports.POST({ json: async () => ({ fileName: 'test.apk', size: 123, contentType: '' }) });
    const page = fs.readFileSync('src/app/admin/remote-config/page.tsx', 'utf8');
    const handler = page.slice(page.indexOf('  async function handleFileSelected('), page.indexOf('  const sectionDirty ='));
    for (const status of [200, 403]) {
      const sent = {}, requests = [], errors = [];
      let saved = false;
      const context = {
        fetch: async (url, options) => { requests.push(url); return { ok: true, json: async () => JSON.parse(options.body).action === 'complete' ? { apkDownloadUrl: payload.publicUrl } : payload }; },
        XMLHttpRequest: class {
          upload = {};
          open(method, url) { assert.equal(method, 'PUT'); assert.equal(url, payload.uploadUrl); }
          setRequestHeader(name, value) { sent[name.toLowerCase()] = value; }
          send() { this.status = status; this.onload(); }
        },
        setUploading() {}, setUploadProgress() {}, setUploadFileName() {}, setApkDownloadUrl() {},
        setApkLinkSaved() {}, setApkLinkInput() {},
        setUploadError: error => errors.push(error), setApkUrlSaved: value => { saved = value; },
      };
      vm.createContext(context);
      vm.runInContext(compile(handler), context);
      await context.handleFileSelected({ name: 'test.apk', size: 123, type: '' });
      const signed = new URL(payload.uploadUrl).searchParams.get('X-Amz-SignedHeaders').split(';');
      assert.ok(signed.includes('content-disposition'));
      for (const header of signed.filter(name => name !== 'host')) assert.ok(sent[header], `Missing signed header: ${header}`);
      assert.equal(sent['content-disposition'], 'attachment; filename="Kawal-Quest.apk"');
      assert.equal(sent['content-type'], payload.contentType);
      assert.equal(saved, status === 200);
      assert.equal(requests.length, status === 200 ? 2 : 1);
      if (status === 403) assert.match(errors.at(-1), /403/);
    }
  } finally { client.destroy(); }
});
