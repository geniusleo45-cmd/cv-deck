const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');

const url = new URL(process.env.DATABASE_URL || 'https://invalid');
if (process.env.GITHUB_ACTIONS !== 'true' || url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.pathname !== '/cvdeck_payment_test' || process.env.DIRECT_URL !== process.env.DATABASE_URL) throw new Error('Only the disposable CI test database is allowed.');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
after(async () => { await prisma.$disconnect(); });

function load(path, userId) {
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', path), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/rbac') return { getCurrentUser: async () => ({ id: userId, role: 'CUSTOMER' }) };
    if (name === 'next/server') return { NextResponse: { json: (body, options) => Response.json(body, options) } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports);
  return exports;
}

async function fixture() {
  const suffix = randomUUID();
  const buyer = await prisma.user.create({ data: { email: `buyer-${suffix}@example.test`, password: 'not-a-login' } });
  const seller = await prisma.user.create({ data: { email: `seller-${suffix}@example.test`, password: 'not-a-login', role: 'VENDOR' } });
  const vendor = await prisma.vendor.create({ data: { userId: seller.id, businessName: 'Test vendor', officeAddress: 'Test address' } });
  const category = await prisma.category.create({ data: { name: suffix, slug: suffix } });
  const product = await prisma.product.create({ data: { name: 'Test product', description: 'Fixture only', price: 100, stock: 8, vendorId: vendor.id, categoryId: category.id } });
  const order = await prisma.order.create({ data: { userId: buyer.id, totalAmount: 200, items: { create: { productId: product.id, quantity: 2, price: 100 } }, payment: { create: { provider: 'PAYSTACK', reference: suffix, amount: 200 } } }, include: { payment: true } });
  const finalize = load('lib/orderNotifications.ts').completeVerifiedOrderPayment;
  const cancel = load('app/api/orders/[id]/cancel/route.ts', buyer.id).POST;
  return {
    finalize: () => finalize(order.payment.id),
    cancel: () => cancel(new Request('http://localhost/cancel', { method: 'POST' }), { params: Promise.resolve({ id: order.id }) }),
    verify: async (expected) => {
      const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true } });
      assert.equal(current.status, expected);
      assert.equal(current.payment.status, 'SUCCESS');
      assert.ok(current.payment.verifiedAt);
      const stock = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
      assert.equal(stock.stock, expected === 'CANCELLED' ? 10 : 8);
      const notices = await prisma.notification.findMany({ where: { userId: { in: [buyer.id, seller.id] } } });
      assert.equal(notices.filter(n => n.userId === seller.id).length, expected === 'CANCELLED' ? 0 : 1);
      assert.equal(notices.filter(n => n.title === 'Order cancelled').length, expected === 'CANCELLED' ? 1 : 0);
      assert.equal(notices.filter(n => n.title === 'Payment received — needs review').length, expected === 'CANCELLED' ? 1 : 0);
    },
  };
}

test('concurrent confirmations finalize once in PostgreSQL', async () => {
  const f = await fixture();
  const results = await Promise.all(Array.from({ length: 5 }, () => f.finalize()));
  assert.equal(results.filter(r => r === 'processed').length, 1);
  assert.equal(results.filter(r => r === 'already-processed').length, 4);
  await f.verify('PROCESSING');
});
test('cancel first, then concurrent late confirmations: stock restored once', async () => {
  const f = await fixture(); assert.equal((await f.cancel()).status, 200);
  assert.deepEqual(await Promise.all([f.finalize(), f.finalize()]), ['cancelled', 'cancelled']);
  await f.verify('CANCELLED');
});
test('payment first prevents cancellation and stock release', async () => {
  const f = await fixture(); assert.equal(await f.finalize(), 'processed');
  assert.equal((await f.cancel()).status, 400); await f.verify('PROCESSING');
});
test('overlapping cancellation and confirmations preserve either valid outcome', async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const f = await fixture();
    const [cancelled] = await Promise.all([f.cancel(), f.finalize(), f.finalize()]);
    assert.ok([200, 400, 409].includes(cancelled.status));
    await f.verify(cancelled.status === 200 ? 'CANCELLED' : 'PROCESSING');
  }
});
