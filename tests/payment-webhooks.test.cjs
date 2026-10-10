const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

function fixture(provider, options = {}) {
  const calls = { lookups: 0, fetches: 0, finalized: 0, activated: 0 };
  const secret = 'fixture-secret-not-a-real-key';
  const payment = options.campaign ? null : { id: 'payment-1', amount: 100, status: options.duplicate ? 'SUCCESS' : 'PENDING', order: { status: 'PENDING' } };
  const campaign = options.campaign ? { id: 'campaign-1', amount: 100, status: 'PENDING_PAYMENT' } : null;
  const prisma = {
    payment: { findFirst: async ({ where }) => { calls.lookups++; assert.equal(where.provider, provider.toUpperCase()); return payment; } },
    adCampaign: { findFirst: async () => campaign },
  };
  const source = ts.transpileModule(readFileSync(join(__dirname, `../app/api/webhooks/${provider}/route.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', 'process', 'fetch', source)((name) => {
    if (name === 'crypto') return crypto;
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/orderNotifications') return { completeVerifiedOrderPayment: async () => { calls.finalized++; return 'processed'; } };
    if (name === '@/lib/adCampaignNotifications') return { activateVerifiedPremiumListing: async () => { calls.activated++; } };
    throw new Error(`Unexpected import ${name}`);
  }, exports, { env: { PAYSTACK_SECRET_KEY: secret, FLW_WEBHOOK_SECRET_HASH: secret, FLW_SECRET_KEY: secret } }, async () => {
    calls.fetches++;
    if (options.networkError) throw new Error('Provider unreachable');
    const data = provider === 'paystack'
      ? { status: 'success', reference: 'ref-1', currency: 'NGN', amount: 10000 }
      : { status: 'successful', tx_ref: 'ref-1', currency: 'NGN', amount: 100 };
    return Response.json({ status: options.providerFailure ? false : provider === 'paystack' ? true : 'success', data: { ...data, ...options.data } }, { status: options.httpStatus || 200 });
  });
  const body = JSON.stringify(provider === 'paystack' ? { event: 'charge.success', data: { reference: 'ref-1' } } : { event: 'charge.completed', data: { id: 123, tx_ref: 'ref-1', status: 'successful' } });
  return {
    calls,
    post: (invalidSignature = false) => exports.POST(new Request('https://example.test/webhook', {
      method: 'POST', body,
      headers: provider === 'paystack' ? { 'x-paystack-signature': invalidSignature ? 'invalid' : crypto.createHmac('sha512', secret).update(body).digest('hex') } : { 'verif-hash': invalidSignature ? 'invalid' : secret },
    })),
  };
}

for (const provider of ['paystack', 'flutterwave']) {
  test(`${provider}: invalid signature rejected before lookup or verification`, async () => {
    const f = fixture(provider); assert.equal((await f.post(true)).status, 401);
    assert.deepEqual(f.calls, { lookups: 0, fetches: 0, finalized: 0, activated: 0 });
  });
  test(`${provider}: verified order and campaign use the correct finalizer`, async () => {
    for (const campaign of [false, true]) {
      const f = fixture(provider, { campaign }); assert.equal((await f.post()).status, 200);
      assert.equal(f.calls.finalized, campaign ? 0 : 1); assert.equal(f.calls.activated, campaign ? 1 : 0);
    }
  });
  test(`${provider}: underpayment, wrong currency/reference and failed payment cannot finalize`, async () => {
    for (const campaign of [false, true]) {
      for (const data of [{ amount: 1 }, { currency: 'USD' }, { reference: 'wrong', tx_ref: 'wrong' }, { status: 'failed' }]) {
        const f = fixture(provider, { campaign, data }); assert.equal((await f.post()).status, 200);
        assert.equal(f.calls.finalized + f.calls.activated, 0);
      }
    }
  });
  test(`${provider}: provider HTTP and API failures return retryable responses`, async () => {
    for (const campaign of [false, true]) {
      for (const failure of [{ httpStatus: 503 }, { providerFailure: true }]) {
        const f = fixture(provider, { campaign, ...failure }); assert.equal((await f.post()).status, 503);
        assert.equal(f.calls.finalized + f.calls.activated, 0);
      }
    }
  });
  test(`${provider}: network failure propagates without finalizing`, async () => {
    const f = fixture(provider, { networkError: true }); await assert.rejects(f.post(), /Provider unreachable/);
    assert.equal(f.calls.finalized + f.calls.activated, 0);
  });
  test(`${provider}: already successful payment skips verification and finalization`, async () => {
    const f = fixture(provider, { duplicate: true }); assert.equal((await f.post()).status, 200);
    assert.equal(f.calls.fetches + f.calls.finalized + f.calls.activated, 0);
  });
}
