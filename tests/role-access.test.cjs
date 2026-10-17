const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
function load(file, user = null, prisma = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', js)((name) => {
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/rbac') return { getCurrentUser: async () => user };
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name === 'next-auth/providers/credentials') return (options) => options;
    if (name === '@/lib/authRateLimit') return {};
    if (name === 'zod' || name === 'bcryptjs') return require(name);
    if (name.startsWith('@/lib/')) return load(name.replace('@/', '') + '.ts', user, prisma);
    throw Error(name);
  }, exports);
  return exports;
}
const req = (body) => new Request('https://example.test/api/test', { method: 'POST', body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: 'product', conversationId: 'thread' }) };
const publicSelect = load('lib/publicVendor.ts').publicVendorSelect;

test('public vendor allowlist excludes financial, identity and private user fields', () => {
  for (const field of ['bankDetails', 'governmentId', 'businessRegNumber', 'verifications']) assert.equal(publicSelect[field], undefined);
  for (const field of ['password', 'email', 'phone', 'sessionVersion']) assert.equal(publicSelect.user.select[field], undefined);
  assert.equal(publicSelect.businessName, true);
});

test('public vendor directory cannot select rejected shops or private fields', async () => {
  const route = load('app/api/vendors/route.ts', null, { vendor: { findMany: async (query) => {
    assert.equal(query.where.status, 'VERIFIED'); assert.equal(query.include, undefined);
    assert.deepEqual(query.select, { ...publicSelect, _count: { select: { products: { where: { status: 'ACTIVE' } }, reviews: true } } });
    return [{ id: 'shop', businessName: 'Fixture shop' }];
  } } });
  assert.equal((await route.GET(new Request('https://example.test/api/vendors?status=REJECTED'))).status, 200);
});

for (const role of [null, 'CUSTOMER', 'VENDOR', 'RECRUITER', 'ADMIN']) test(`product detail visibility for ${role || 'anonymous'}`, async () => {
  const route = load('app/api/products/[id]/route.ts', role ? { id: 'viewer', role } : null, { product: { findFirst: async (query) => {
    assert.deepEqual(query.where, role === 'ADMIN' ? { id: 'product' } : { id: 'product', status: 'ACTIVE', vendor: { status: 'VERIFIED' } });
    assert.deepEqual(query.include.vendor, { select: publicSelect });
    return null;
  } } });
  assert.equal((await route.GET(new Request('https://example.test/product'), params)).status, 404);
});

test('public active product remains readable with no-store response', async () => {
  const route = load('app/api/products/[id]/route.ts', null, { product: { findFirst: async () => ({ id: 'product', vendor: { businessName: 'Fixture' } }) } });
  const response = await route.GET(new Request('https://example.test/product'), params);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('demoted admin session is rejected even if changed outside the role-update API', async () => {
  const { authOptions } = load('lib/auth.ts', null, { user: { findUnique: async () => ({ role: 'CUSTOMER', sessionVersion: 0 }) } });
  await assert.rejects(authOptions.callbacks.jwt({ token: { id: 'user', role: 'ADMIN', sessionVersion: 0 } }), /revoked/);
});

test('current vendor profile replaces stale token ownership information', async () => {
  const { authOptions } = load('lib/auth.ts', null, { user: { findUnique: async () => ({ role: 'VENDOR', sessionVersion: 0, vendorProfile: { id: 'current-shop' } }) } });
  const token = await authOptions.callbacks.jwt({ token: { id: 'user', role: 'VENDOR', sessionVersion: 0, vendorId: 'old-shop', recruiterId: 'old-company' } });
  assert.equal(token.vendorId, 'current-shop'); assert.equal(token.recruiterId, undefined);
});

for (const role of [null, 'CUSTOMER', 'VENDOR', 'RECRUITER']) test(`role updates deny ${role || 'anonymous'} before writes`, async () => {
  const route = load('app/api/admin/users/route.ts', role ? { id: 'caller', role } : null);
  assert.equal((await route.PUT(req({ userId: 'other', role: 'ADMIN' }))).status, role ? 403 : 401);
});

test('admin role update atomically increments session version and cannot change own role', async () => {
  let writes = 0;
  const route = load('app/api/admin/users/route.ts', { id: 'admin', role: 'ADMIN' }, { user: { update: async (query) => {
    assert.deepEqual(query.data, { role: 'CUSTOMER', sessionVersion: { increment: 1 } });
    assert.deepEqual(query.select, { id: true, role: true }); writes++; return { id: 'other', role: 'CUSTOMER' };
  } } });
  assert.equal((await route.PUT(req({ userId: 'admin', role: 'CUSTOMER' }))).status, 400);
  assert.equal((await route.PUT(req({ userId: 'other', role: 'CUSTOMER' }))).status, 200);
  assert.equal(writes, 1);
});

for (const [userId, receiverId, allowed] of [['alice', 'bob', true], ['bob', 'alice', true], ['alice', 'third', false], ['third', 'alice', false], ['alice', 'alice', false]]) test(`chat ${userId} to ${receiverId} respects original pair`, async () => {
  let writes = 0;
  const route = load('app/api/messages/[conversationId]/route.ts', { id: userId }, {
    message: { findFirst: async (query) => { assert.deepEqual(query.where, { conversationId: 'thread' }); assert.deepEqual(query.orderBy, [{ createdAt: 'asc' }, { id: 'asc' }]); return { senderId: 'alice', receiverId: 'bob' }; },
      create: async ({ data }) => { writes++; assert.equal(data.receiverId, receiverId); assert.equal(data.senderId, userId); return data; } },
    conversation: { update: async () => ({}) }, notification: { create: async () => ({}) },
  });
  const response = await route.POST(req({ content: 'Fixture reply', receiverId, senderId: 'forged' }), params);
  assert.equal(response.status, allowed ? 201 : 403); assert.equal(writes, allowed ? 1 : 0);
});

test('chat rejects anonymous and malformed replies before database access', async () => {
  assert.equal((await load('app/api/messages/[conversationId]/route.ts').POST(req({}), params)).status, 401);
  for (const content of ['', {}, 'x'.repeat(2001)]) assert.equal((await load('app/api/messages/[conversationId]/route.ts', { id: 'alice' }).POST(req({ content, receiverId: 'bob' }), params)).status, 400);
});

test('admin vendor approval does not return a password-bearing User relation', async () => {
  const route = load('app/api/admin/vendors/route.ts', { id: 'admin', role: 'ADMIN' }, {
    vendor: { update: async (query) => { assert.equal(query.include, undefined); assert.deepEqual(query.select, { id: true, userId: true, businessName: true, status: true, verifiedAt: true }); return { id: 'shop', userId: 'owner', businessName: 'Fixture', status: 'VERIFIED' }; } },
    vendorVerification: { updateMany: async () => ({ count: 1 }) }, notification: { create: async () => ({}) },
  });
  assert.equal((await route.PUT(req({ vendorId: 'shop', status: 'APPROVED' }))).status, 200);
});
