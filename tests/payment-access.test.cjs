const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function load(path, user, prisma) {
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', path), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', 'process', 'fetch', source)((name) => {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
    if (name === 'next-auth') return { getServerSession: async () => user ? { user } : null };
    if (name === '@/lib/rbac') return { getCurrentUser: async () => user };
    if (name === '@/lib/auth') return { authOptions: {} };
    if (name === '@/lib/prisma') return { prisma };
    if (name === 'zod') return require('zod');
    if (name === '@/lib/validations/order') return {};
    if (name === '@/lib/orderNotifications') return { completeVerifiedOrderPayment: () => assert.fail('Unauthorized finalization') };
    throw new Error(`Unexpected import ${name}`);
  }, exports, { env: { PAYSTACK_SECRET_KEY: 'fixture-key', FLW_SECRET_KEY: 'fixture-key' } }, () => assert.fail('Unauthorized provider request'));
  return exports;
}

for (const provider of ['paystack', 'flutterwave']) {
  for (const action of ['initialize', 'verify']) {
    test(`${provider} ${action}: signed-out requests never access database`, async () => {
      const route = load(`app/api/payments/${provider}/${action}/route.ts`, null, {});
      const response = action === 'initialize'
        ? await route.POST(new Request('https://example.test/pay', { method: 'POST', body: JSON.stringify({ orderId: 'other-order' }) }))
        : await route.GET(new Request('https://example.test/pay?reference=other-ref&transactionId=123'));
      assert.equal(response.status, action === 'initialize' ? 401 : 400);
    });
    test(`${provider} ${action}: other customer identifiers remain inaccessible`, async () => {
      let lookups = 0;
      const lookup = async ({ where }) => {
        lookups++;
        if (action === 'initialize') assert.deepEqual(where, { id: 'other-order', userId: 'customer-a' });
        else assert.deepEqual(where, { reference: 'other-ref', provider: provider.toUpperCase(), order: { userId: 'customer-a' } });
        return null;
      };
      const route = load(`app/api/payments/${provider}/${action}/route.ts`, { id: 'customer-a', role: 'CUSTOMER' }, { order: { findFirst: lookup }, payment: { findFirst: lookup } });
      const response = action === 'initialize'
        ? await route.POST(new Request('https://example.test/pay', { method: 'POST', body: JSON.stringify({ orderId: 'other-order', userId: 'customer-b' }) }))
        : await route.GET(new Request('https://example.test/pay?reference=other-ref&transactionId=123&userId=customer-b'));
      assert.equal(response.status, 404); assert.equal(lookups, 1);
      assert.equal(JSON.stringify(await response.json()).includes('authorizationUrl'), false);
    });
  }
}

test('order details reject another customer without returning private fields', async () => {
  const route = load('app/api/orders/[id]/route.ts', { id: 'customer-a', role: 'CUSTOMER' }, {
    order: { findUnique: async () => ({ userId: 'customer-b', shippingAddress: 'private-address', payment: { reference: 'private-ref' }, items: [] }) },
  });
  const response = await route.GET(new Request('https://example.test/order'), { params: Promise.resolve({ id: 'other-order' }) });
  assert.equal(response.status, 403); assert.deepEqual(await response.json(), { error: 'Forbidden' });
});
test('order details allow the authenticated owner', async () => {
  const order = { userId: 'customer-a', items: [] };
  const route = load('app/api/orders/[id]/route.ts', { id: 'customer-a', role: 'CUSTOMER' }, { order: { findUnique: async () => order } });
  const response = await route.GET(new Request('https://example.test/order'), { params: Promise.resolve({ id: 'own-order' }) });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), order);
});
