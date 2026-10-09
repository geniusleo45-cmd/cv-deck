const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync(require('node:path').join(__dirname, '../lib/orderNotifications.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

// Stateful unit-test double, not a substitute for PostgreSQL concurrency tests.
function fixture({ status = 'PENDING', paymentStatus = 'PENDING', cancelBeforeClaim = false, missing = false, failNotification = false } = {}) {
  let state = { status, paymentStatus, notifications: [], verifiedAt: null, authorizationUrl: 'checkout-link' };
  const tx = {
    payment: {
      findUnique: async () => missing ? null : { id: 'payment-1', status: state.paymentStatus, orderId: 'order-1', order: { status: state.status, orderNumber: '123', userId: 'buyer', items: [1, 2].map(quantity => ({ quantity, attributedQuantity: 0, adCampaignId: null, product: { vendor: { userId: 'vendor' } } })) } },
      updateMany: async ({ where, data }) => {
        assert.deepEqual(where, { id: 'payment-1', status: { not: 'SUCCESS' } });
        if (state.paymentStatus === 'SUCCESS') return { count: 0 };
        state.paymentStatus = data.status; state.verifiedAt = data.verifiedAt;
        if ('authorizationUrl' in data) state.authorizationUrl = data.authorizationUrl;
        return { count: 1 };
      },
    },
    order: {
      updateMany: async ({ where, data }) => {
        assert.deepEqual(where, { id: 'order-1', status: 'PENDING' });
        assert.equal(data.status, 'PROCESSING');
        if (cancelBeforeClaim) state.status = 'CANCELLED';
        if (state.status !== 'PENDING') return { count: 0 };
        state.status = data.status; return { count: 1 };
      },
      findUnique: async () => ({ status: state.status, payment: { status: state.paymentStatus } }),
    },
    user: { findMany: async () => [{ id: 'admin' }] },
    notification: { createMany: async ({ data }) => {
      if (failNotification) throw new Error('notification failure');
      state.notifications.push(...data);
    } },
  };
  const prisma = { $transaction: async (work) => {
    const snapshot = structuredClone(state);
    try { return await work(tx); } catch (error) { state = snapshot; throw error; }
  } };
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    assert.equal(name, '@/lib/prisma'); return { prisma };
  }, exports);
  return { finalize: () => exports.completeVerifiedOrderPayment('payment-1'), state: () => state };
}

test('verified payment processes pending order and groups vendor quantities', async () => {
  const f = fixture(); assert.equal(await f.finalize(), 'processed');
  assert.equal(f.state().status, 'PROCESSING'); assert.equal(f.state().paymentStatus, 'SUCCESS');
  assert.ok(f.state().verifiedAt instanceof Date);
  assert.equal(f.state().notifications.length, 1);
  assert.equal(f.state().notifications[0].userId, 'vendor');
  assert.match(f.state().notifications[0].message, /3 items/);
});
test('repeated confirmation does not duplicate fulfillment notifications', async () => {
  const f = fixture(); await f.finalize();
  assert.equal(await f.finalize(), 'already-processed'); assert.equal(f.state().notifications.length, 1);
});
test('late payment leaves cancelled order cancelled and alerts buyer/admin once', async () => {
  const f = fixture({ status: 'CANCELLED' });
  assert.equal(await f.finalize(), 'cancelled'); assert.equal(await f.finalize(), 'cancelled');
  assert.equal(f.state().status, 'CANCELLED'); assert.equal(f.state().paymentStatus, 'SUCCESS');
  assert.equal(f.state().authorizationUrl, null);
  assert.deepEqual(f.state().notifications.map(item => item.userId), ['buyer', 'admin']);
});
test('cancellation winning before conditional claim does not reopen order', async () => {
  const f = fixture({ cancelBeforeClaim: true }); assert.equal(await f.finalize(), 'cancelled');
  assert.equal(f.state().status, 'CANCELLED'); assert.equal(f.state().paymentStatus, 'SUCCESS');
  assert.equal(f.state().notifications.some(item => item.userId === 'vendor'), false);
});
test('missing payment is a no-op', async () => {
  const f = fixture({ missing: true }); assert.equal(await f.finalize(), 'missing');
  assert.equal(f.state().paymentStatus, 'PENDING'); assert.equal(f.state().notifications.length, 0);
});
test('inconsistent non-pending order fails rather than silently finalizing', async () => {
  const f = fixture({ status: 'SHIPPED' }); await assert.rejects(f.finalize(), /not pending/);
  assert.equal(f.state().paymentStatus, 'PENDING');
});
test('notification failure propagates through transaction without partial mocked state', async () => {
  const f = fixture({ failNotification: true }); await assert.rejects(f.finalize(), /notification failure/);
  assert.equal(f.state().status, 'PENDING'); assert.equal(f.state().paymentStatus, 'PENDING');
});
