const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';
const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
const shopkeeperEmail = process.env.SHOPKEEPER_EMAIL ?? 'shopkeeper@example.com';
const shopkeeperPassword = process.env.SHOPKEEPER_PASSWORD ?? 'Shopkeeper@123456';

const unique = Date.now();

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    method: options.method ?? 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return { response, payload };
}

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function expectStatus(label, promise, expectedStatus) {
  const result = await promise;
  assert(
    result.response.status === expectedStatus,
    `${label} expected HTTP ${expectedStatus}, got ${result.response.status}`,
    result.payload,
  );
  return result.payload;
}

async function login(label, email, password) {
  const payload = await expectStatus(
    label,
    request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
    200,
  );

  assert(payload?.success === true, `${label} did not return success=true`, payload);
  assert(payload?.data?.token, `${label} did not return an API token`, payload);

  return payload.data.token;
}

async function run() {
  console.log(`API smoke started: ${baseUrl}`);

  await expectStatus(
    'bad login',
    request('/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'wrong-password' },
    }),
    422,
  );

  const adminToken = await login('admin login', adminEmail, adminPassword);
  const shopkeeperToken = await login('shopkeeper login', shopkeeperEmail, shopkeeperPassword);

  const me = await expectStatus('admin /auth/me', request('/auth/me', { token: adminToken }), 200);
  assert(Array.isArray(me?.data?.roles), 'admin /me roles must be an array', me);

  const dashboard = await expectStatus(
    'shopkeeper dashboard',
    request('/shopkeeper/dashboard', { token: shopkeeperToken }),
    200,
  );
  assert(dashboard?.data?.stats, 'shopkeeper dashboard missing stats', dashboard);

  const list = await expectStatus(
    'large per_page cap',
    request('/shopkeeper/products?per_page=1000', { token: shopkeeperToken }),
    200,
  );
  assert(list?.data?.meta?.per_page <= 100, 'per_page cap is not enforced', list);

  const product = await expectStatus(
    'create product',
    request('/shopkeeper/products', {
      method: 'POST',
      token: shopkeeperToken,
      body: {
        name: `Automation Product ${unique}`,
        sku: `AUTO-${unique}`,
        category_name: 'Automation',
        purchase_price: 25,
        sale_price: 40,
        stock_quantity: 3,
        reorder_level: 1,
        unit: 'pcs',
        status: 'active',
      },
    }),
    201,
  );

  const productId = product?.data?.id;
  assert(productId, 'created product did not include an id', product);

  await expectStatus(
    'oversell rejected',
    request('/shopkeeper/sales', {
      method: 'POST',
      token: shopkeeperToken,
      body: {
        product_id: productId,
        sale_date: new Date().toISOString().slice(0, 10),
        quantity: 99,
        unit_price: 40,
        paid_amount: 3960,
        payment_status: 'paid',
      },
    }),
    422,
  );

  await expectStatus(
    'valid sale',
    request('/shopkeeper/sales', {
      method: 'POST',
      token: shopkeeperToken,
      body: {
        product_id: productId,
        sale_date: new Date().toISOString().slice(0, 10),
        quantity: 1,
        unit_price: 40,
        paid_amount: 40,
        payment_status: 'paid',
      },
    }),
    201,
  );

  await expectStatus(
    'archive product',
    request(`/shopkeeper/products/${productId}`, {
      method: 'DELETE',
      token: shopkeeperToken,
    }),
    200,
  );

  console.log('API smoke passed');
}

run().catch((error) => {
  console.error('API smoke failed');
  console.error(error.message);

  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }

  process.exitCode = 1;
});
