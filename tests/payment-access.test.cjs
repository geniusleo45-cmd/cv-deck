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
    if (name === '@/lib/premiumListings') return load('lib/premiumListings.ts', user, prisma);
    if (name === 'zod') return require('zod');
    if (name === '@/lib/validations/order') return load('lib/validations/order.ts', user, prisma);
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

for (const role of ['VENDOR', 'ADMIN']) {
  test(`${role}: order update returns only safe fields and still notifies customer`, async () => {
    let notified = false;
    let selected = false;
    const route = load('app/api/orders/[id]/route.ts', { id: 'seller', role }, {
      vendor: { findUnique: async () => ({ id: 'vendor-1' }) },
      order: {
        findUnique: async () => ({ id: 'order-1', status: 'PROCESSING', orderNumber: '12345678', items: [{ product: { vendorId: 'vendor-1' } }] }),
        update: async ({ select, include }) => {
          assert.equal(include, undefined);
          assert.deepEqual(select, { id: true, userId: true, orderNumber: true, status: true, trackingReference: true });
          selected = true;
          // Extra sensitive fields prove the response whitelist is independent
          // of Prisma's selection, protecting against future query expansion.
          return { id: 'order-1', userId: 'buyer', orderNumber: '12345678', status: 'SHIPPED', trackingReference: 'CVD-test', shippingAddress: 'private', user: { password: 'hash', email: 'private@example.test', phone: 'private' } };
        },
      },
      notification: { create: async ({ data }) => { assert.equal(data.userId, 'buyer'); assert.match(data.message, /CVD-test/); notified = true; } },
    });
    const response = await route.PUT(new Request('https://example.test/order', { method: 'PUT', body: JSON.stringify({ status: 'SHIPPED' }) }), { params: Promise.resolve({ id: 'order-1' }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 'order-1', orderNumber: '12345678', status: 'SHIPPED', trackingReference: 'CVD-test' });
    assert.equal(selected && notified, true);
  });
}

for (const role of ['CUSTOMER', 'VENDOR', 'ADMIN']) {
  test(`${role}: order detail query excludes private vendor and payment fields`, async () => {
    let checked = false;
    const route = load('app/api/orders/[id]/route.ts', { id: role === 'CUSTOMER' ? 'buyer' : 'staff', role }, {
      vendor: { findUnique: async () => ({ id: 'vendor-1' }) },
      order: { findUnique: async ({ select, include }) => {
        assert.equal(include, undefined);
        assert.deepEqual(select.user, { select: { name: true, email: true, phone: true } });
        assert.deepEqual(select.items.select.product.select.vendor, { select: { id: true, businessName: true } });
        assert.deepEqual(select.payment, { select: { provider: true, status: true, amount: true, verifiedAt: true } });
        assert.equal(select.items.select.adCampaignId, undefined);
        checked = true;
        return { userId: 'buyer', items: [{ product: { vendorId: 'vendor-1', vendor: { id: 'vendor-1', businessName: 'Public shop' } } }], payment: { provider: 'PAYSTACK', status: 'SUCCESS', amount: 100, verifiedAt: null } };
      } },
    });
    const response = await route.GET(new Request('https://example.test/order'), { params: Promise.resolve({ id: 'order-1' }) });
    assert.equal(response.status, 200); assert.equal(checked, true);
    const body = await response.json();
    assert.deepEqual(Object.keys(body.items[0].product.vendor).sort(), ['businessName', 'id']);
    assert.equal(body.payment.authorizationUrl, undefined); assert.equal(body.payment.reference, undefined);
  });
}

test('unrelated vendor cannot read an order', async () => {
  const route = load('app/api/orders/[id]/route.ts', { id: 'other-seller', role: 'VENDOR' }, {
    vendor: { findUnique: async () => ({ id: 'other-vendor' }) },
    order: { findUnique: async () => ({ userId: 'buyer', items: [{ product: { vendorId: 'vendor-1' } }] }) },
  });
  const response = await route.GET(new Request('https://example.test/order'), { params: Promise.resolve({ id: 'order-1' }) });
  assert.equal(response.status, 403); assert.deepEqual(await response.json(), { error: 'Forbidden' });
});

test('signed-out order list does not query the database', async () => {
  const route = load('app/api/orders/route.ts', null, {});
  assert.equal((await route.GET()).status, 401);
});
for (const role of ['CUSTOMER', 'RECRUITER', 'VENDOR', 'ADMIN']) {
  test(`${role}: order list limits relations and preserves role filters`, async () => {
    let checked = false;
    const route = load('app/api/orders/route.ts', { id: 'user-1', role }, {
      vendor: { findUnique: async ({ where, select }) => {
        assert.deepEqual(where, { userId: 'user-1' }); assert.deepEqual(select, { id: true }); return { id: 'vendor-1' };
      } },
      order: { findMany: async ({ where, select, include }) => {
        assert.equal(include, undefined);
        assert.deepEqual(select.payment, { select: { provider: true, status: true, verifiedAt: true } });
        assert.deepEqual(select.items.select.product.select.vendor, { select: { id: true, businessName: true } });
        if (role === 'ADMIN') assert.equal(where, undefined);
        else if (role === 'VENDOR') {
          assert.deepEqual(where, { items: { some: { product: { vendorId: 'vendor-1' } } } });
          assert.deepEqual(select.items.where, { product: { vendorId: 'vendor-1' } });
        } else assert.deepEqual(where, { userId: 'user-1' });
        checked = true;
        return [{ id: 'order-1', totalAmount: 9999, items: [{ price: 100, quantity: 2 }] }];
      } },
    });
    const response = await route.GET(); assert.equal(response.status, 200); assert.equal(checked, true);
    assert.equal((await response.json())[0].totalAmount, role === 'VENDOR' ? 200 : 9999);
  });
}
test('vendor without a shop receives no orders', async () => {
  const route = load('app/api/orders/route.ts', { id: 'user-1', role: 'VENDOR' }, { vendor: { findUnique: async () => null } });
  const response = await route.GET(); assert.equal(response.status, 200); assert.deepEqual(await response.json(), []);
});

test('premium cancellation requires vendor authentication and ownership', async () => {
  for (const user of [null, { id: 'buyer', role: 'CUSTOMER' }]) {
    const route = load('app/api/ad-campaigns/route.ts', user, {});
    assert.equal((await route.DELETE(new Request('https://example.test/ad', { method: 'DELETE', body: '{"id":"campaign"}' }))).status, 403);
  }
  const route = load('app/api/ad-campaigns/route.ts', { id: 'seller', role: 'VENDOR' }, {
    adCampaign: { findFirst: async ({ where }) => { assert.deepEqual(where, { id: 'campaign', vendor: { userId: 'seller' } }); return null; } },
  });
  assert.equal((await route.DELETE(new Request('https://example.test/ad', { method: 'DELETE', body: '{"id":"campaign"}' }))).status, 404);
});
test('premium cancellation condition preserves reserved checkout references', async () => {
  for (const count of [0, 1]) {
    const prisma = {
      adCampaign: {
        findFirst: async () => ({ id: 'campaign', status: 'PENDING_PAYMENT' }),
        findUniqueOrThrow: async () => ({ id: 'campaign', paymentReference: null }),
        updateMany: async ({ where, data }) => {
          assert.deepEqual(where, { id: 'campaign', vendor: { userId: 'seller' }, status: 'PENDING_PAYMENT' });
          assert.deepEqual(data, { status: 'CANCELLED', authorizationUrl: null }); return { count };
        },
      },
    };
    prisma.$transaction = async (work) => work(prisma);
    const route = load('app/api/ad-campaigns/route.ts', { id: 'seller', role: 'VENDOR' }, prisma);
    assert.equal((await route.DELETE(new Request('https://example.test/ad', { method: 'DELETE', body: '{"id":"campaign"}' }))).status, count ? 200 : 409);
  }
});

test('reserved premium cancellation opens review without deleting the reference', async () => {
  let reviews = 0; let notifications = 0;
  const prisma = {
    adCampaign: {
      findFirst: async () => ({ id: 'campaign', status: 'PENDING_PAYMENT' }),
      updateMany: async ({ data }) => { assert.deepEqual(data, { status: 'CANCELLED', authorizationUrl: null }); return { count: 1 }; },
      findUniqueOrThrow: async () => ({ id: 'campaign', paymentReference: 'preserved-reference' }),
    },
    adCampaignSupportRequest: { upsert: async ({ where, create, update }) => {
      assert.deepEqual(where, { campaignId: 'campaign' }); assert.equal(create.userId, 'seller');
      assert.equal(create.reason, 'CANCELLED_CHECKOUT'); assert.deepEqual(update, { status: 'OPEN' }); reviews++;
    } },
    user: { findMany: async () => [{ id: 'admin' }] },
    notification: { createMany: async ({ data }) => { assert.equal(data[0].userId, 'admin'); notifications += data.length; } },
  };
  prisma.$transaction = async (work) => work(prisma);
  const route = load('app/api/ad-campaigns/route.ts', { id: 'seller', role: 'VENDOR' }, prisma);
  assert.equal((await route.DELETE(new Request('https://example.test/ad', { method: 'DELETE', body: '{"id":"campaign"}' }))).status, 200);
  assert.equal(reviews, 1); assert.equal(notifications, 1);
});
