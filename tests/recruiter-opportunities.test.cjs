const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

class KnownError extends Error { constructor(code) { super(code); this.code = code; } }
function load(path, user = null, prisma = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', path), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', source)((name) => {
    if (name === 'zod') return require('zod');
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    if (name === '@prisma/client') return { Prisma: { PrismaClientKnownRequestError: KnownError } };
    if (name === '@/lib/rbac') return { getCurrentUser: async () => user };
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/recruiterOpportunities') return load('lib/recruiterOpportunities.ts');
    throw new Error(`Unexpected import ${name}`);
  }, exports);
  return exports;
}
const verified = { role: 'VENDOR', vendorProfile: { status: 'VERIFIED' } };
const message = 'I can meet the requirements and am available to discuss the details.';
const params = { params: Promise.resolve({ id: 'listing' }) };
const request = (body, method = 'POST') => new Request('https://example.test/opportunity', { method, body: JSON.stringify(body) });

test('response visibility limits non-owners to their own response', () => {
  const { responseVisibility } = load('lib/recruiterOpportunities.ts');
  assert.deepEqual(responseVisibility('listing', 'owner', 'owner'), { opportunityId: 'listing' });
  assert.deepEqual(responseVisibility('listing', 'applicant', 'owner'), { opportunityId: 'listing', applicantId: 'applicant' });
  assert.deepEqual(responseVisibility('listing', 'other-recruiter', 'owner'), { opportunityId: 'listing', applicantId: 'other-recruiter' });
});

test('eligibility requires current verification on the matching account role', () => {
  const { isVerifiedApplicant } = load('lib/recruiterOpportunities.ts');
  for (const user of [null, { role: 'ADMIN' }, { role: 'CUSTOMER', verified: true }, { role: 'VENDOR', vendorProfile: { status: 'PENDING' } }, { role: 'VENDOR', vendorProfile: { status: 'REJECTED' } }, { ...verified, role: 'CUSTOMER' }, { role: 'RECRUITER', recruiterProfile: { verified: false } }]) assert.equal(isVerifiedApplicant(user), false);
  assert.equal(isVerifiedApplicant(verified), true);
  assert.equal(isVerifiedApplicant({ role: 'RECRUITER', recruiterProfile: { verified: true } }), true);
});

test('listing validation requires a future deadline and procurement quantity', () => {
  const { opportunitySchema, responseSchema } = load('lib/recruiterOpportunities.ts');
  const listing = { kind: 'JOB', title: 'Laptop technician', description: message, location: 'Ikeja', closesAt: new Date(Date.now() + 86400000).toISOString() };
  assert.equal(opportunitySchema.safeParse(listing).success, true);
  assert.equal(opportunitySchema.safeParse({ ...listing, closesAt: '2020-01-01T00:00:00.000Z' }).success, false);
  assert.equal(opportunitySchema.safeParse({ ...listing, kind: 'PROCUREMENT' }).success, false);
  assert.equal(opportunitySchema.safeParse({ ...listing, kind: 'PROCUREMENT', quantity: 10 }).success, true);
  for (const amount of [0, -1, 1.001, Infinity, '100']) assert.equal(responseSchema.safeParse({ message, quoteAmount: amount }).success, false);
});

for (const [path, method] of [['app/api/recruiter-opportunities/route.ts', 'POST'], ['app/api/recruiter-opportunities/[id]/responses/route.ts', 'POST'], ['app/api/recruiter-opportunities/[id]/route.ts', 'PATCH']]) {
  test(`${path}: anonymous requests cannot touch database`, async () => {
    assert.equal((await load(path)[method](request({ message }, method), params)).status, 401);
  });
}

test('publishing checks database role and company profile, not a forged session role', async () => {
  for (const [owner, status] of [[{ role: 'CUSTOMER' }, 403], [{ role: 'RECRUITER', recruiterProfile: null }, 400]]) {
    const route = load('app/api/recruiter-opportunities/route.ts', { id: 'user', role: 'RECRUITER' }, { user: { findUnique: async () => owner } });
    assert.equal((await route.POST(request({}))).status, status);
  }
});

function responseFixture({ user = verified, kind = 'JOB', claimed = true, duplicate = false } = {}) {
  const calls = { saved: 0, notices: 0 };
  const tx = {
    user: { findUnique: async ({ where }) => { assert.deepEqual(where, { id: 'applicant' }); return user; } },
    recruiterOpportunity: {
      updateMany: async ({ where }) => {
        assert.equal(where.id, 'listing'); assert.equal(where.ownerId.not, 'applicant');
        assert.equal(where.status, 'OPEN'); assert.ok(where.closesAt.gt instanceof Date);
        assert.ok(user.vendorProfile?.status === 'VERIFIED' || user.recruiterProfile?.verified); return { count: claimed ? 1 : 0 };
      },
      findUniqueOrThrow: async () => ({ kind, ownerId: 'owner', title: 'Fixture' }),
    },
    opportunityResponse: { create: async ({ data, select }) => {
      if (duplicate) throw new KnownError('P2002');
      assert.equal(data.applicantId, 'applicant'); assert.equal(data.opportunityId, 'listing');
      assert.equal(data.quoteAmount, kind === 'JOB' ? null : 420); assert.deepEqual(select, { id: true });
      calls.saved++; return { id: 'response' };
    } },
    notification: { create: async ({ data }) => { assert.equal(data.userId, 'owner'); calls.notices++; } },
  };
  const route = load('app/api/recruiter-opportunities/[id]/responses/route.ts', { id: 'applicant', verified: true }, { $transaction: (work) => work(tx) });
  return { calls, post: (body = { message, quoteAmount: 420, applicantId: 'forged', verified: true }) => route.POST(request(body), params) };
}

test('unverified and revoked accounts cannot bypass application restrictions', async () => {
  for (const user of [{ role: 'CUSTOMER' }, { role: 'VENDOR', vendorProfile: { status: 'PENDING' } }, null]) {
    const f = responseFixture({ user }); assert.equal((await f.post()).status, 403); assert.equal(f.calls.saved + f.calls.notices, 0);
  }
});
for (const kind of ['JOB', 'PROCUREMENT']) {
  test(`${kind}: verified response uses session owner and notifies recruiter`, async () => {
    const f = responseFixture({ kind }); assert.equal((await f.post()).status, 201); assert.equal(f.calls.saved, 1); assert.equal(f.calls.notices, 1);
  });
}
test('closed, expired or self-owned opportunities cannot receive responses', async () => {
  const f = responseFixture({ claimed: false }); assert.equal((await f.post()).status, 409); assert.equal(f.calls.saved, 0);
});
test('procurement requires a quotation and duplicate responses never notify twice', async () => {
  const missing = responseFixture({ kind: 'PROCUREMENT' }); assert.equal((await missing.post({ message })).status, 400); assert.equal(missing.calls.saved, 0);
  const duplicate = responseFixture({ duplicate: true }); assert.equal((await duplicate.post()).status, 409); assert.equal(duplicate.calls.notices, 0);
});
test('only the owner with a current recruiter role may close or review', async () => {
  const prisma = { $transaction: (work) => work({ recruiterOpportunity: { updateMany: async ({ where }) => {
    assert.deepEqual(where, { id: 'listing', ownerId: 'other-user', owner: { role: 'RECRUITER' } }); return { count: 0 };
  } } }) };
  const route = load('app/api/recruiter-opportunities/[id]/route.ts', { id: 'other-user' }, prisma);
  assert.equal((await route.PATCH(request({ action: 'close' }, 'PATCH'), params)).status, 404);
});
test('a revoked applicant cannot be selected and no notification is sent', async () => {
  const prisma = { $transaction: (work) => work({ recruiterOpportunity: { updateMany: async () => ({ count: 1 }) }, opportunityResponse: { findFirst: async ({ where }) => {
    assert.deepEqual(where, { id: 'response', opportunityId: 'listing' });
    return { id: 'response', applicant: { role: 'VENDOR', vendorProfile: { status: 'PENDING' } } };
  } } }) };
  const route = load('app/api/recruiter-opportunities/[id]/route.ts', { id: 'owner' }, prisma);
  assert.equal((await route.PATCH(request({ responseId: 'response', status: 'SELECTED' }, 'PATCH'), params)).status, 409);
});
