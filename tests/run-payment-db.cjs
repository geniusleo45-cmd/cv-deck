const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

// Fail closed BEFORE invoking Prisma (which can otherwise load a local .env).
const url = new URL(process.env.DATABASE_URL || 'https://invalid');
if (process.env.GITHUB_ACTIONS !== 'true' || url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.pathname !== '/cvdeck_payment_test' || process.env.DIRECT_URL !== process.env.DATABASE_URL) {
  throw new Error('Database tests require the dedicated loopback GitHub Actions service. Production URLs are forbidden.');
}
for (const args of [
  [join(__dirname, '../node_modules/prisma/build/index.js'), 'generate'],
  [join(__dirname, '../node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'],
  ['--test', join(__dirname, 'payment-database.test.cjs')],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
