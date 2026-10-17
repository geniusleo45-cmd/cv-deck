const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

function load(file, overrides = {}, env = { NODE_ENV: 'test', NEXTAUTH_SECRET: 'fixture-only-secret' }) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'process', source)((name) => {
    if (name in overrides) return overrides[name];
    if (['node:crypto', 'node:net', 'zod', 'bcryptjs'].includes(name)) return require(name);
    if (name === '@/lib/prisma') return { prisma: {} };
    if (name === '@/lib/validations/auth') return load('lib/validations/auth.ts');
    if (name === 'next-auth/providers/credentials') return (options) => options;
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports, { env });
  return exports;
}
const core = load('lib/authRateLimit.ts');

test('only Vercel platform address is trusted; malformed or missing values fail closed', () => {
  assert.equal(core.authClientAddress(new Headers({ 'x-vercel-forwarded-for': '192.0.2.1' }), { VERCEL: '1' }), '192.0.2.1');
  for (const headers of [{}, { 'x-forwarded-for': '192.0.2.1' }, { 'x-vercel-forwarded-for': '192.0.2.1, 192.0.2.2' }, { 'x-vercel-forwarded-for': ['192.0.2.1'] }]) assert.throws(() => core.authClientAddress(headers, { VERCEL: '1' }));
  assert.throws(() => core.authClientAddress({}, { NODE_ENV: 'production' }));
  assert.equal(core.authClientAddress({ 'x-forwarded-for': 'forged' }, { NODE_ENV: 'development' }), 'local-development');
  assert.equal(core.authClientAddress({ 'x-vercel-forwarded-for': '2001:0db8:0:0:0:0:0:1' }, { VERCEL: '1' }), core.authClientAddress({ 'x-vercel-forwarded-for': '2001:db8::1' }, { VERCEL: '1' }));
});

test('bucket keys hide identity, normalize casing and isolate endpoints', () => {
  const key = core.authBucketKey('login-email', ' Fixture@Example.Test ');
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(key, core.authBucketKey('login-email', 'fixture@example.test'));
  assert.notEqual(key, core.authBucketKey('register-email', 'fixture@example.test'));
  assert.notEqual(key, core.authBucketKey('login-email', 'fixture@example.test', 'other-fixture-secret'));
  assert.throws(() => core.authBucketKey('login-email', 'fixture@example.test', ''));
});

test('atomic counter permits threshold and rejects the next attempt with retry time', async () => {
  let count = 60;
  const limiter = load('lib/authRateLimit.ts', { '@/lib/prisma': { prisma: { $queryRaw: async (sql, ...values) => {
    assert.match(sql.join('?'), /ON CONFLICT/);
    assert.ok(values.includes(900)); assert.ok(values.includes(61));
    assert.ok(!values.includes('fixture@example.test'));
    return [{ count, expiresAt: new Date(Date.now() + 60_000) }];
  } } } });
  await limiter.consumeAuthLimit('login-ip', 'fixture@example.test');
  count = 61;
  await assert.rejects(limiter.consumeAuthLimit('login-ip', 'fixture@example.test'), (error) => error instanceof limiter.AuthRateLimitError && error.retryAfter > 0 && error.retryAfter <= 60);
});

for (const stage of ['login-ip', 'login-email']) test(`login stops before account lookup when ${stage} is blocked`, async () => {
  const calls = [];
  const { authOptions } = load('lib/auth.ts', { '@/lib/authRateLimit': { ...core, authClientAddress: () => 'fixture-ip', consumeAuthLimit: async (scope) => { calls.push(scope); if (scope === stage) throw new core.AuthRateLimitError(30); } } });
  await assert.rejects(authOptions.providers[0].authorize({ email: 'fixture@example.test', password: 'fixture-password' }, { headers: {} }), /TooManyAttempts/);
  assert.deepEqual(calls, stage === 'login-ip' ? ['login-ip'] : ['login-ip', 'login-email']);
});

test('limiter database failure does not allow sign-in', async () => {
  const { authOptions } = load('lib/auth.ts', { '@/lib/authRateLimit': { ...core, authClientAddress: () => 'fixture-ip', consumeAuthLimit: async () => { throw new Error('database unavailable'); } } });
  await assert.rejects(authOptions.providers[0].authorize({ email: 'fixture@example.test', password: 'fixture-password' }, { headers: {} }), /SignInUnavailable/);
});

for (const stage of ['register-ip', 'register-email']) test(`registration returns 429 before user creation when ${stage} is blocked`, async () => {
  const route = load('app/api/register/route.ts', { '@/lib/authRateLimit': { ...core, authClientAddress: () => 'fixture-ip', consumeAuthLimit: async (scope) => { if (scope === stage) throw new core.AuthRateLimitError(45); } } });
  const response = await route.POST(new Request('https://example.test/api/register', { method: 'POST', body: JSON.stringify({ name: 'Fixture', email: 'fixture@example.test', password: 'fixture-password' }) }));
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '45');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('registration returns 503 when limiter is unavailable', async () => {
  const route = load('app/api/register/route.ts', { '@/lib/authRateLimit': { ...core, authClientAddress: () => 'fixture-ip', consumeAuthLimit: async () => { throw new Error('private database details'); } } });
  const response = await route.POST(new Request('https://example.test/api/register', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private database details/);
});
