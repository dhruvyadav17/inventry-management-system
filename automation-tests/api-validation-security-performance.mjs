import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reportDir = join(root, 'automation-tests', 'reports');
const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';
const stamp = Date.now();
const results = [];
const timings = [];

async function request(path, options = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const durationMs = Math.round(performance.now() - started);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 500) };
  }
  const headers = Object.fromEntries(response.headers.entries());
  timings.push({ path, method: options.method ?? 'GET', status: response.status, durationMs });
  return { status: response.status, payload, headers, durationMs };
}

async function check(name, promise, expectedStatus, validate = () => true) {
  const result = await promise;
  const ok = result.status === expectedStatus && validate(result);
  results.push({
    name,
    ok,
    status: result.status,
    expectedStatus,
    durationMs: result.durationMs,
    message: result.payload?.message,
  });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${result.status}, expected ${expectedStatus}, ${result.durationMs}ms)`);
  return result;
}

async function login(email, password) {
  const result = await check(
    `login ${email}`,
    request('/auth/login', { method: 'POST', body: { email, password } }),
    200,
    ({ payload }) => Boolean(payload?.data?.token),
  );
  return result.payload.data.token;
}

async function timedGet(name, path, token, budgetMs) {
  await check(name, request(path, { token }), 200, ({ durationMs, payload }) => durationMs <= budgetMs && Boolean(payload?.data));
}

async function run() {
  await mkdir(reportDir, { recursive: true });
  console.log(`Validation/security/performance audit started: ${baseUrl}`);

  const health = await fetch(baseUrl.replace('/api/v1', '/api/health'));
  results.push({ name: 'health outside v1', ok: health.ok, status: health.status, expectedStatus: 200, durationMs: 0 });
  console.log(`${health.ok ? 'PASS' : 'FAIL'} health outside v1 (${health.status})`);

  await check('security headers present', request('/auth/login', { method: 'POST', body: { email: 'missing@example.com', password: 'bad' } }), 422, ({ headers }) => (
    headers['x-content-type-options'] === 'nosniff'
    && headers['x-frame-options'] === 'SAMEORIGIN'
    && Boolean(headers['referrer-policy'])
    && Boolean(headers['permissions-policy'])
  ));

  await check('empty login validation', request('/auth/login', { method: 'POST', body: { email: '', password: '' } }), 422);
  await check('weak registration validation', request('/auth/register', {
    method: 'POST',
    body: { name: 'A', email: 'bad-email', password: '123', password_confirmation: '456' },
  }), 422);
  await check('reset password invalid token validation', request('/auth/reset-password', {
    method: 'POST',
    body: { email: 'admin@example.com', token: 'invalid', password: 'Reset@123456', password_confirmation: 'Reset@123456' },
  }), 422);

  const adminToken = await login('admin@example.com', 'Admin@123456');
  const shopkeeperToken = await login('shopkeeper@example.com', 'Shopkeeper@123456');

  await check('unauthenticated admin blocked', request('/users'), 401);
  await check('shopkeeper admin boundary blocked', request('/users', { token: shopkeeperToken }), 403);
  await check('invalid bearer token blocked', request('/users', { token: 'invalid-token' }), 401);
  await check('readonly reports post blocked', request('/shopkeeper/reports', { method: 'POST', token: shopkeeperToken, body: {} }), 404);
  await check('sql-like search does not error users', request('/users?search=%27%20OR%201%3D1%20--&per_page=10', { token: adminToken }), 200);
  await check('sql-like search does not error products', request('/shopkeeper/products?search=%27%20OR%201%3D1%20--&per_page=10', { token: shopkeeperToken }), 200);
  await check('admin per_page capped', request('/users?per_page=1000', { token: adminToken }), 200, ({ payload }) => payload?.data?.meta?.per_page <= 100);
  await check('shopkeeper per_page capped', request('/shopkeeper/products?per_page=1000', { token: shopkeeperToken }), 200, ({ payload }) => payload?.data?.meta?.per_page <= 100);

  await check('negative customer balance rejected', request('/shopkeeper/customers', {
    method: 'POST',
    token: shopkeeperToken,
    body: { name: 'Bad Balance', email: `bad.balance.${stamp}@example.com`, opening_balance: -1, status: 'active' },
  }), 422);
  await check('negative stock quantity rejected', request('/shopkeeper/stock', {
    method: 'POST',
    token: shopkeeperToken,
    body: { product_id: 1, type: 'in', quantity: -10 },
  }), 422);
  await check('bad status rejected', request('/shopkeeper/products', {
    method: 'POST',
    token: shopkeeperToken,
    body: { name: 'Bad Status', sku: `BAD-${stamp}`, category_name: 'Bad', purchase_price: 1, sale_price: 2, stock_quantity: 1, reorder_level: 1, unit: 'pcs', status: 'unknown' },
  }), 422);
  await check('xss-like name accepted safely as data', request('/shopkeeper/customers', {
    method: 'POST',
    token: shopkeeperToken,
    body: { name: `<script>alert(${stamp})</script>`, email: `xss.${stamp}@example.com`, opening_balance: 0, status: 'active' },
  }), 201, ({ payload }) => payload?.data?.name?.includes('<script>'));

  await timedGet('admin users list under 800ms', '/users?per_page=100&sort_by=id&sort_dir=desc', adminToken, 800);
  await timedGet('admin roles list under 800ms', '/roles?per_page=100', adminToken, 800);
  await timedGet('shopkeeper products list under 900ms', '/shopkeeper/products?per_page=100', shopkeeperToken, 900);
  await timedGet('shopkeeper customers list under 900ms', '/shopkeeper/customers?per_page=100', shopkeeperToken, 900);
  await timedGet('shopkeeper sales list under 1100ms', '/shopkeeper/sales?per_page=100', shopkeeperToken, 1100);
  await timedGet('shopkeeper reports under 1200ms', '/shopkeeper/reports', shopkeeperToken, 1200);

  const slowest = [...timings].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10);
  const failed = results.filter((result) => !result.ok);
  const report = {
    generated_at: new Date().toISOString(),
    baseUrl,
    summary: {
      passed: results.length - failed.length,
      failed: failed.length,
      total: results.length,
    },
    failed,
    slowest,
    results,
  };
  const reportPath = join(reportDir, `api-validation-security-performance-${stamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`REPORT ${reportPath}`);

  if (failed.length) {
    console.log('\nSuggestions / findings:');
    failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: expected ${result.expectedStatus}, got ${result.status}, ${result.durationMs}ms`);
    });
    process.exitCode = 1;
  } else {
    console.log(`\nValidation/security/performance audit passed: ${results.length}/${results.length}`);
  }
}

run().catch((error) => {
  console.error('Validation/security/performance audit failed');
  console.error(error.message);
  process.exitCode = 1;
});
