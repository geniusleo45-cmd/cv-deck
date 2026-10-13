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

function load(path, userId, role = 'CUSTOMER') {
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', path), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/rbac') return { getCurrentUser: async () => ({ id: userId, role }) };
    if (name === '@prisma/client') return require('@prisma/client');
    if (name === '@/lib/premiumListings') return load('lib/premiumListings.ts');
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

async function campaignFixture() {
  const suffix = randomUUID();
  const seller = await prisma.user.create({ data: { email: `ad-${suffix}@example.test`, password: 'not-a-login', role: 'VENDOR' } });
  const vendor = await prisma.vendor.create({ data: { userId: seller.id, businessName: 'Campaign fixture', officeAddress: 'Fixture', status: 'VERIFIED' } });
  const category = await prisma.category.create({ data: { name: suffix, slug: suffix } });
  const product = await prisma.product.create({ data: { name: 'Campaign product', description: 'Fixture', price: 100, stock: 8, status: 'ACTIVE', vendorId: vendor.id, categoryId: category.id } });
  const campaign = await prisma.adCampaign.create({ data: { vendorId: vendor.id, productId: product.id, package: 'DAILY', status: 'PENDING_PAYMENT', amount: 420, paymentReference: suffix, paymentProvider: 'PAYSTACK', authorizationUrl: 'https://example.test/old' }, include: { vendor: true, product: true } });
  const finalize = load('lib/adCampaignNotifications.ts').activateVerifiedPremiumListing;
  const cancel = load('app/api/ad-campaigns/route.ts', seller.id, 'VENDOR').DELETE;
  return {
    finalize: () => finalize(campaign, 'PAYSTACK', suffix),
    cancel: () => cancel(new Request('https://example.test/ad', { method: 'DELETE', body: JSON.stringify({ id: campaign.id }) })),
    verify: async (status) => {
      const current = await prisma.adCampaign.findUniqueOrThrow({ where: { id: campaign.id }, include: { supportRequest: true } });
      assert.equal(current.status, status); assert.equal(current.paymentReference, suffix); assert.equal(current.authorizationUrl, null);
      const notices = await prisma.notification.findMany({ where: { userId: seller.id } });
      if (status === 'CANCELLED') {
        assert.equal(current.startsAt, null); assert.equal(current.supportRequest.reason, 'CANCELLED_PAYMENT_CONFIRMED');
        assert.equal(notices.filter(n => n.title === 'Payment received for cancelled listing').length, 1);
        assert.equal(notices.filter(n => n.title === 'Premium Listing is live').length, 0);
      } else assert.equal(notices.filter(n => n.title === 'Premium Listing is live').length, 1);
    },
  };
}

test('cancelled campaign keeps its reference and concurrent late payments notify once', async () => {
  const f = await campaignFixture(); assert.equal((await f.cancel()).status, 200);
  assert.deepEqual(await Promise.all([f.finalize(), f.finalize()]), ['cancelled-payment', 'cancelled-payment']);
  await f.verify('CANCELLED');
});

test('activated campaign cannot be cancelled', async () => {
  const f = await campaignFixture(); assert.equal(await f.finalize(), 'activated');
  assert.equal((await f.cancel()).status, 409); await f.verify('ACTIVE');
});

test('campaign cancellation races verification without resurrecting cancelled placement', async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const f = await campaignFixture();
    const [response] = await Promise.all([f.cancel(), f.finalize(), f.finalize()]);
    assert.ok([200, 409].includes(response.status));
    await f.verify(response.status === 200 ? 'CANCELLED' : 'ACTIVE');
  }
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
