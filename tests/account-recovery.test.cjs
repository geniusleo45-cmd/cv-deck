const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function load(file, overrides = {}, env = process.env) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'process', source)((name) => {
    if (name in overrides) return overrides[name];
    if (['node:crypto', 'zod', 'bcryptjs'].includes(name)) return require(name);
    if (name === '@/lib/prisma') return { prisma: {} };
    if (name === '@/lib/authRateLimit') return { authClientAddress: () => 'fixture-ip', consumeAuthLimit: async () => {}, AuthRateLimitError: class extends Error {} };
    if (name === '@/lib/validations/auth') return load('lib/validations/auth.ts', overrides, env);
    if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init) } };
    throw new Error(`Unexpected import ${name}`);
  }, exports, { env });
  return exports;
}
const core = load('lib/accountRecovery.ts');
const local = { NODE_ENV: 'development', ACCOUNT_EMAIL_PREVIEW: 'true', DATABASE_URL: 'postgresql://fixture@127.0.0.1/cvdeck_account_dev', DIRECT_URL: 'postgresql://fixture@localhost/cvdeck_account_dev' };

test('preview fails closed for production, hosted previews and remote/live databases', () => {
  assert.equal(core.emailPreviewEnabled(local), true);
  for (const override of [{ NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { VERCEL: '1' }, { ACCOUNT_EMAIL_PREVIEW: 'false' }, { DATABASE_URL: 'postgresql://fixture@remote.test/cvdeck_account_dev' }, { DIRECT_URL: 'postgresql://fixture@localhost/live' }, { DIRECT_URL: '' }, { DATABASE_URL: 'invalid' }]) {
    assert.equal(core.emailPreviewEnabled({ ...local, ...override }), false);
  }
});

test('token validation and bcrypt byte limit', () => {
  const value = { purpose: 'RESET_PASSWORD', token: 'a'.repeat(64), password: 'a long test password' };
  assert.equal(core.consumeSchema.safeParse(value).success, true);
  for (const override of [{ token: 'short' }, { purpose: 'OTHER' }, { password: undefined }, { password: 'short' }, { password: '🙂'.repeat(30) }]) assert.equal(core.consumeSchema.safeParse({ ...value, ...override }).success, false);
  assert.equal(core.hashAccountToken(value.token).length, 64);
  assert.notEqual(core.hashAccountToken(value.token), value.token);
});

function fixture() {
  const user = { email: 'fixture@example.test', emailVerifiedAt: null, sessionVersion: 0 };
  let record = null;
  const tx = {
    user: { update: async ({ data }) => { if (data.password) user.password = data.password; if (data.emailVerifiedAt) user.emailVerifiedAt = data.emailVerifiedAt; if (data.sessionVersion) user.sessionVersion++; return user; } },
    accountToken: {
      findUnique: async ({ where }) => where.tokenHash ? (record?.tokenHash === where.tokenHash ? record : null) : record,
      upsert: async ({ create }) => { record = { id: 'token-row', ...create }; return record; },
      updateMany: async ({ where, data }) => {
        assert.equal(where.email, user.email);
        assert.equal(where.consumedAt, null);
        if (!record || record.tokenHash !== where.tokenHash || record.consumedAt || record.expiresAt <= where.expiresAt.gt || record.purpose !== where.purpose) return { count: 0 };
        record.consumedAt = data.consumedAt; return { count: 1 };
      },
    },
  };
  const api = load('lib/accountRecovery.ts', { '@/lib/prisma': { prisma: { ...tx, $transaction: async (fn) => fn(tx) } }, bcryptjs: { hash: async (value) => `hashed:${value}` } });
  return { api, user, record: () => record };
}

test('reset token is hashed, expiring, rate limited and usable exactly once', async () => {
  const f = fixture();
  const issued = await f.api.issueAccountToken('user', 'RESET_PASSWORD');
  assert.match(issued.token, /^[a-f0-9]{64}$/);
  assert.notEqual(f.record().tokenHash, issued.token);
  assert.ok(issued.expiresAt.getTime() - Date.now() <= 30 * 60_000);
  assert.equal(await f.api.issueAccountToken('user', 'RESET_PASSWORD'), null);
  const input = { purpose: 'RESET_PASSWORD', token: issued.token, password: 'a new test password' };
  assert.equal(await f.api.consumeAccountToken(input), true);
  assert.equal(f.user.sessionVersion, 1);
  assert.equal(f.user.password, 'hashed:a new test password');
  assert.equal(await f.api.consumeAccountToken(input), false);
  assert.equal(f.user.sessionVersion, 1);
});

for (const invalid of ['expired', 'purpose', 'changed-email', 'replaced']) test(`reject ${invalid} token`, async () => {
  const f = fixture();
  const issued = await f.api.issueAccountToken('user', 'RESET_PASSWORD');
  if (invalid === 'expired') f.record().expiresAt = new Date(0);
  if (invalid === 'changed-email') f.user.email = 'different@example.test';
  if (invalid === 'replaced') { f.record().issuedAt = new Date(0); await f.api.issueAccountToken('user', 'RESET_PASSWORD'); }
  assert.equal(await f.api.consumeAccountToken({ purpose: invalid === 'purpose' ? 'VERIFY_EMAIL' : 'RESET_PASSWORD', token: issued.token, password: 'a test password' }), false);
  assert.equal(f.user.sessionVersion, 0);
  assert.equal(f.user.emailVerifiedAt, null);
});

test('email verification does not update password, role, business approval or session version', async () => {
  const f = fixture();
  const issued = await f.api.issueAccountToken('user', 'VERIFY_EMAIL');
  assert.equal(await f.api.consumeAccountToken({ purpose: 'VERIFY_EMAIL', token: issued.token }), true);
  assert.ok(f.user.emailVerifiedAt instanceof Date);
  assert.equal(f.user.password, undefined);
  assert.equal(f.user.sessionVersion, 0);
  assert.equal(await f.api.issueAccountToken('user', 'VERIFY_EMAIL'), null);
});

test('public requests cannot look up accounts or reveal previews when disabled', async () => {
  const route = load('app/api/account/recovery/route.ts', { '@/lib/rbac': {}, '@/lib/accountRecovery': { localPreviewRequest: () => false } });
  for (const method of ['POST', 'PATCH']) {
    const response = await route[method](new Request('https://example.test/api/account/recovery', { method, body: '{}' }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).preview, undefined);
  }
});

test('verification requests use authenticated identity, not a submitted email', async () => {
  const route = load('app/api/account/recovery/route.ts', {
    '@/lib/rbac': { getCurrentUser: async () => ({ id: 'signed-in-user' }) },
    '@/lib/accountRecovery': { ...core, localPreviewRequest: () => true, issueAccountToken: async (id, purpose) => { assert.equal(id, 'signed-in-user'); assert.equal(purpose, 'VERIFY_EMAIL'); return null; } },
  });
  const response = await route.POST(new Request('http://localhost/api/account/recovery', { method: 'POST', body: JSON.stringify({ purpose: 'VERIFY_EMAIL', email: 'someone-else@example.test' }) }));
  assert.equal(response.status, 200);
});

test('existing versionless sessions work until reset; stale sessions and forged updates are rejected', async () => {
  let version = 0;
  const { authOptions } = load('lib/auth.ts', {
    'next-auth/providers/credentials': (options) => options,
    '@/lib/prisma': { prisma: { user: { findUnique: async () => ({ sessionVersion: version }) } } },
  });
  const token = { id: 'user', role: 'CUSTOMER' };
  assert.equal((await authOptions.callbacks.jwt({ token })).id, 'user');
  version = 1;
  await assert.rejects(authOptions.callbacks.jwt({ token, trigger: 'update', session: { sessionVersion: 1 } }), /revoked/);
  assert.equal((await authOptions.callbacks.jwt({ token: { ...token, sessionVersion: 1 } })).id, 'user');
});

test('public registration cannot request ADMIN', () => {
  const { registerSchema } = load('lib/validations/auth.ts');
  const input = { name: 'Fixture', email: 'fixture@example.test', password: 'fixture-password', role: 'ADMIN' };
  assert.equal(registerSchema.safeParse(input).success, false);
  assert.equal(registerSchema.safeParse({ ...input, role: 'CUSTOMER' }).success, true);
});

test('login rejects malformed and oversized credentials before database access', async () => {
  const { authOptions } = load('lib/auth.ts', { 'next-auth/providers/credentials': (options) => options });
  const authorize = authOptions.providers[0].authorize;
  for (const credentials of [undefined, {}, { email: {}, password: 'test' }, { email: 'invalid', password: 'test' }, { email: 'fixture@example.test', password: '' }, { email: 'fixture@example.test', password: 'a'.repeat(4097) }, { email: 'fixture@example.test', password: ['test'] }]) {
    assert.equal(await authorize(credentials), null);
  }
});

test('normal credentials preserve exact password and obtain identity from database', async () => {
  const password = '  valid password with spaces  ';
  const account = { id: 'real-user', email: 'fixture@example.test', name: 'Fixture', password: 'stored-hash', role: 'CUSTOMER', sessionVersion: 2 };
  const { authOptions } = load('lib/auth.ts', {
    'next-auth/providers/credentials': (options) => options,
    '@/lib/prisma': { prisma: { user: { findUnique: async ({ where }) => { assert.deepEqual(where, { email: account.email }); return account; } } } },
    bcryptjs: { compare: async (received, hash) => { assert.equal(received, password); assert.equal(hash, 'stored-hash'); return true; } },
  });
  const result = await authOptions.providers[0].authorize({ email: account.email, password, role: 'ADMIN', id: 'forged' });
  assert.equal(result.id, 'real-user');
  assert.equal(result.role, 'CUSTOMER');
  assert.equal(result.sessionVersion, 2);
  assert.equal(result.password, undefined);
});

test('missing account and incorrect password fail authentication', async () => {
  for (const account of [null, { password: 'stored-hash' }]) {
    const { authOptions } = load('lib/auth.ts', {
      'next-auth/providers/credentials': (options) => options,
      '@/lib/prisma': { prisma: { user: { findUnique: async () => account } } },
      bcryptjs: { compare: async () => false },
    });
    assert.equal(await authOptions.providers[0].authorize({ email: 'fixture@example.test', password: 'wrong' }), null);
  }
});

test('authentication has no hard-coded secret fallback', () => {
  const mocks = { 'next-auth/providers/credentials': (options) => options };
  assert.equal(load('lib/auth.ts', mocks, {}).authOptions.secret, undefined);
  assert.equal(load('lib/auth.ts', mocks, { NEXTAUTH_SECRET: 'fixture-only-secret' }).authOptions.secret, 'fixture-only-secret');
});

test('retired login endpoint performs no credential or database checks', async () => {
  const route = load('app/api/login/route.ts');
  const response = await route.POST();
  assert.equal(response.status, 410);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).user, undefined);
});
