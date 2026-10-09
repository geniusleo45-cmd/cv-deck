const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync(require('node:path').join(__dirname, '../app/api/admin/payment-review/resolutions/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture(role = 'ADMIN') {
  const records = new Map();
  let exists = true;
  const prisma = {
    paymentReviewEntry: { findUnique: async ({ where }) => records.get(where.id), create: async ({ data }) => { records.set(data.id, data); return data; } },
    // Intentionally no payment/order update methods: any mutation fails the test.
    payment: { findUnique: async () => exists ? { reference: 'order-ref' } : null },
    adCampaign: { findUnique: async () => exists ? { paymentReference: 'campaign-ref' } : null },
  };
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    if (name === 'next/server') return { NextResponse: { json: (data, options) => Response.json(data, options) } };
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/rbac') return { getCurrentUser: async () => role ? { id: 'admin-1', name: 'Admin', role } : null };
    if (name === 'zod') return require('zod');
    throw new Error(`Unexpected import ${name}`);
  }, exports);
  return { records, missing: () => { exists = false; }, post: (body) => exports.POST(new Request('https://example.test/api', { method: 'POST', body: JSON.stringify(body) })) };
}
const input = { requestId: '59802493-3951-4741-9159-976f3cc14c59', kind: 'order', targetId: 'payment-1', status: 'IN_REVIEW', note: 'Contacted the provider for review.', externalReference: '' };

test('unauthenticated and non-admin requests are forbidden', async () => {
  for (const role of [null, 'CUSTOMER', 'VENDOR']) {
    const f = fixture(role); assert.equal((await f.post(input)).status, 403); assert.equal(f.records.size, 0);
  }
});
test('rejects invalid input and external refund without a reference', async () => {
  const f = fixture();
  for (const value of [{ ...input, note: 'short' }, { ...input, status: 'PAID' }, { ...input, status: 'REFUND_RECORDED' }]) assert.equal((await f.post(value)).status, 400);
  assert.equal(f.records.size, 0);
});
test('saves audit snapshots, not financial state', async () => {
  const f = fixture(); assert.equal((await f.post(input)).status, 200);
  const saved = f.records.get(input.requestId);
  assert.equal(saved.adminId, 'admin-1'); assert.equal(saved.paymentReference, 'order-ref'); assert.equal(saved.status, 'IN_REVIEW');
});
test('retry is idempotent and changed payload conflicts', async () => {
  const f = fixture(); await f.post(input); assert.equal((await f.post(input)).status, 200);
  assert.equal((await f.post({ ...input, note: 'A different resolution note.' })).status, 409); assert.equal(f.records.size, 1);
});
test('campaign reviews and external refund records are supported', async () => {
  const f = fixture(); assert.equal((await f.post({ ...input, kind: 'campaign', status: 'REFUND_RECORDED', externalReference: 'provider-refund-123' })).status, 200);
  assert.equal(f.records.get(input.requestId).paymentReference, 'campaign-ref');
});
test('missing payment cannot receive a review', async () => {
  const f = fixture(); f.missing(); assert.equal((await f.post(input)).status, 404); assert.equal(f.records.size, 0);
});
