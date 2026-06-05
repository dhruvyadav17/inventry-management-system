const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';
const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
const shopkeeperEmail = process.env.SHOPKEEPER_EMAIL ?? 'shopkeeper@example.com';
const shopkeeperPassword = process.env.SHOPKEEPER_PASSWORD ?? 'Shopkeeper@123456';
const stamp = Date.now();
const results = [];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { status: response.status, payload };
}

async function check(name, promise, expectedStatus, validate = () => true) {
  const result = await promise;
  const ok = result.status === expectedStatus && validate(result.payload);
  results.push({ name, ok, status: result.status, expectedStatus, payload: result.payload });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${result.status}, expected ${expectedStatus})`);
  return result.payload;
}

function assertSummary() {
  const failed = results.filter((result) => !result.ok);
  if (failed.length === 0) {
    console.log(`\nFull API scenarios passed: ${results.length}/${results.length}`);
    return;
  }

  console.log('\nSuggestions / findings:');
  failed.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: expected ${result.expectedStatus}, got ${result.status}`);
    console.log(JSON.stringify(result.payload, null, 2));
  });
  process.exitCode = 1;
}

async function login(label, email, password, expectedRedirect) {
  const payload = await check(
    label,
    request('/auth/login', { method: 'POST', body: { email, password } }),
    200,
    (body) => body?.success === true && body?.data?.token && body?.data?.redirect_path === expectedRedirect,
  );
  return payload.data.token;
}

async function run() {
  console.log(`Full API scenarios started: ${baseUrl}`);

  await check('health route outside v1', fetch(baseUrl.replace('/api/v1', '/api/health')).then(async (response) => ({ status: response.status, payload: await response.json() })), 200);
  await check('bad login rejected', request('/auth/login', { method: 'POST', body: { email: adminEmail, password: 'wrong-password' } }), 422);
  await check('register validation rejects weak payload', request('/auth/register', {
    method: 'POST',
    body: { name: '', email: 'bad-email', password: 'short', password_confirmation: 'different' },
  }), 422);
  const registeredEmail = `registered.${stamp}@example.com`;
  const registered = await check('public registration creates user', request('/auth/register', {
    method: 'POST',
    body: { name: `Registered ${stamp}`, email: registeredEmail, password: 'Registered@123456', password_confirmation: 'Registered@123456' },
  }), 201, (body) => body?.data?.token && body?.data?.user?.email === registeredEmail);
  await check('forgot password accepts existing email', request('/auth/forgot-password', {
    method: 'POST',
    body: { email: registeredEmail },
  }), 200);
  await check('reset password rejects invalid token', request('/auth/reset-password', {
    method: 'POST',
    body: { email: registeredEmail, token: 'invalid-token', password: 'Reset@123456', password_confirmation: 'Reset@123456' },
  }), 422);

  const adminToken = await login('admin login redirect', adminEmail, adminPassword, '/admin/dashboard');
  const shopkeeperToken = await login('shopkeeper login redirect', shopkeeperEmail, shopkeeperPassword, '/shopkeeper/dashboard');

  await check('unauthenticated admin users blocked', request('/users'), 401);
  await check('shopkeeper cannot access admin users', request('/users', { token: shopkeeperToken }), 403);
  await check('admin dashboard loads', request('/dashboard', { token: adminToken }), 200, (body) => Boolean(body?.data?.stats));
  await check('admin reports loads', request('/reports', { token: adminToken }), 200, (body) => Boolean(body?.data?.stats));
  await check('admin rbac options loads', request('/options/rbac', { token: adminToken }), 200, (body) => Array.isArray(body?.data?.roles) && Array.isArray(body?.data?.permissions));
  await check('admin me loads permissions', request('/auth/me', { token: adminToken }), 200, (body) => Array.isArray(body?.data?.permissions));
  await check('admin profile update', request('/profile', {
    method: 'PUT',
    token: adminToken,
    body: { name: 'Admin User' },
  }), 200);
  await check('admin change password rejects wrong current password', request('/auth/change-password', {
    method: 'POST',
    token: adminToken,
    body: { current_password: 'wrong-current', password: 'NewAdmin@123456', password_confirmation: 'NewAdmin@123456' },
  }), 422);
  await check('users list active filter', request('/users?status=active&per_page=5&sort_by=name&sort_dir=asc', { token: adminToken }), 200, (body) => body?.data?.meta?.per_page === 5);
  await check('roles list search', request('/roles?search=Admin&per_page=5', { token: adminToken }), 200);
  await check('permissions list search', request('/permissions?search=users&per_page=5', { token: adminToken }), 200);

  const permissionName = `automation.permission.${stamp}`;
  const permission = await check('admin permission create', request('/permissions', {
    method: 'POST',
    token: adminToken,
    body: { name: permissionName, status: 'active' },
  }), 201, (body) => body?.data?.name === permissionName);
  await check('duplicate permission rejected', request('/permissions', {
    method: 'POST',
    token: adminToken,
    body: { name: permissionName, status: 'active' },
  }), 422);

  const roleName = `Automation Role ${stamp}`;
  const role = await check('admin role create', request('/roles', {
    method: 'POST',
    token: adminToken,
    body: { name: roleName, status: 'active', permissions: [permissionName] },
  }), 201, (body) => body?.data?.name === roleName);
  await check('admin role update', request(`/roles/${role.data.id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { name: `${roleName} Updated`, status: 'active', permissions: [permissionName] },
  }), 200, (body) => body?.data?.name.endsWith('Updated'));

  const userEmail = `automation.user.${stamp}@example.com`;
  const user = await check('admin user create', request('/users', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Automation User ${stamp}`,
      email: userEmail,
      password: 'Automation@123456',
      password_confirmation: 'Automation@123456',
      status: 'active',
      roles: [`${roleName} Updated`],
    },
  }), 201, (body) => body?.data?.email === userEmail);
  await check('duplicate user email rejected', request('/users', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Automation User Duplicate ${stamp}`,
      email: userEmail,
      password: 'Automation@123456',
      password_confirmation: 'Automation@123456',
      status: 'active',
      roles: [`${roleName} Updated`],
    },
  }), 422);
  await check('admin user archive', request(`/users/${user.data.id}`, { method: 'DELETE', token: adminToken }), 200);
  await check('archived users filter includes archived rows', request('/users?status=archived&per_page=10', { token: adminToken }), 200, (body) => body?.data?.data?.some((row) => row.id === user.data.id));
  await check('admin user restore', request(`/users/${user.data.id}/restore`, { method: 'POST', token: adminToken }), 200);
  await check('admin settings update', request('/settings', {
    method: 'PUT',
    token: adminToken,
    body: { settings: { app_name: 'Inventory Admin Panel', timezone: 'Asia/Kolkata' } },
  }), 200);
  await check('admin activity logs load', request('/logs/activities?per_page=5', { token: adminToken }), 200);
  await check('admin audit logs load', request('/logs/audits?per_page=5', { token: adminToken }), 200);

  await check('shopkeeper dashboard loads', request('/shopkeeper/dashboard', { token: shopkeeperToken }), 200, (body) => Boolean(body?.data?.stats));
  await check('shopkeeper options capped payload loads', request('/shopkeeper/options', { token: shopkeeperToken }), 200, (body) => Array.isArray(body?.data?.products));
  await check('shopkeeper products per_page capped', request('/shopkeeper/products?per_page=1000', { token: shopkeeperToken }), 200, (body) => body?.data?.meta?.per_page <= 100);

  const supplier = await check('shopkeeper supplier create', request('/shopkeeper/suppliers', {
    method: 'POST',
    token: shopkeeperToken,
    body: { name: `Automation Supplier ${stamp}`, phone: '9000000001', email: `supplier.${stamp}@example.com`, address: 'Automation address', status: 'active' },
  }), 201, (body) => body?.data?.name?.includes('Automation Supplier'));
  const customer = await check('shopkeeper customer create', request('/shopkeeper/customers', {
    method: 'POST',
    token: shopkeeperToken,
    body: { name: `Automation Customer ${stamp}`, phone: '9000000002', email: `customer.${stamp}@example.com`, address: 'Automation address', opening_balance: 0, status: 'active' },
  }), 201, (body) => body?.data?.name?.includes('Automation Customer'));
  await check('invalid customer email rejected', request('/shopkeeper/customers', {
    method: 'POST',
    token: shopkeeperToken,
    body: { name: `Bad Customer ${stamp}`, email: 'not-email', status: 'active' },
  }), 422);
  await check('shopkeeper supplier update', request(`/shopkeeper/suppliers/${supplier.data.id}`, {
    method: 'PATCH',
    token: shopkeeperToken,
    body: { name: `${supplier.data.name} Updated`, phone: '9000000003', email: `supplier.updated.${stamp}@example.com`, address: 'Updated address', status: 'active' },
  }), 200, (body) => body?.data?.name?.endsWith('Updated'));
  await check('shopkeeper customer update', request(`/shopkeeper/customers/${customer.data.id}`, {
    method: 'PATCH',
    token: shopkeeperToken,
    body: { name: `${customer.data.name} Updated`, phone: '9000000004', email: `customer.updated.${stamp}@example.com`, address: 'Updated customer address', opening_balance: 10, status: 'active' },
  }), 200, (body) => body?.data?.name?.endsWith('Updated'));

  const sku = `AUTO-SKU-${stamp}`;
  const product = await check('shopkeeper product create', request('/shopkeeper/products', {
    method: 'POST',
    token: shopkeeperToken,
    body: {
      name: `Automation Product ${stamp}`,
      sku,
      category_name: `Automation Category ${stamp}`,
      supplier_id: supplier.data.id,
      purchase_price: 25,
      sale_price: 40,
      stock_quantity: 5,
      reorder_level: 1,
      unit: 'pcs',
      status: 'active',
    },
  }), 201, (body) => body?.data?.sku === sku);
  await check('shopkeeper product update', request(`/shopkeeper/products/${product.data.id}`, {
    method: 'PATCH',
    token: shopkeeperToken,
    body: {
      name: `${product.data.name} Updated`,
      sku,
      category_name: `Automation Category ${stamp}`,
      supplier_id: supplier.data.id,
      purchase_price: 26,
      sale_price: 41,
      stock_quantity: 5,
      reorder_level: 2,
      unit: 'pcs',
      status: 'active',
    },
  }), 200, (body) => body?.data?.name?.endsWith('Updated'));
  await check('duplicate shopkeeper sku rejected', request('/shopkeeper/products', {
    method: 'POST',
    token: shopkeeperToken,
    body: {
      name: `Automation Product Duplicate ${stamp}`,
      sku,
      category_name: `Automation Category ${stamp}`,
      purchase_price: 25,
      sale_price: 40,
      stock_quantity: 5,
      reorder_level: 1,
      unit: 'pcs',
      status: 'active',
    },
  }), 422);
  await check('stock oversell rejected', request('/shopkeeper/stock', {
    method: 'POST',
    token: shopkeeperToken,
    body: { product_id: product.data.id, type: 'out', quantity: 99, reference: `AUTO-STOCK-${stamp}` },
  }), 422);
  await check('stock in accepted', request('/shopkeeper/stock', {
    method: 'POST',
    token: shopkeeperToken,
    body: { product_id: product.data.id, type: 'in', quantity: 5, reference: `AUTO-STOCK-IN-${stamp}` },
  }), 201);
  await check('purchase overpaid rejected', request('/shopkeeper/purchases', {
    method: 'POST',
    token: shopkeeperToken,
    body: { supplier_id: supplier.data.id, product_id: product.data.id, purchase_date: today(), quantity: 2, unit_price: 25, paid_amount: 100, status: 'received' },
  }), 422);
  await check('purchase received accepted', request('/shopkeeper/purchases', {
    method: 'POST',
    token: shopkeeperToken,
    body: { supplier_id: supplier.data.id, product_id: product.data.id, invoice_no: `PUR-AUTO-${stamp}`, purchase_date: today(), quantity: 2, unit_price: 25, paid_amount: 50, status: 'received' },
  }), 201);
  await check('sale overpaid rejected', request('/shopkeeper/sales', {
    method: 'POST',
    token: shopkeeperToken,
    body: { customer_id: customer.data.id, product_id: product.data.id, sale_date: today(), quantity: 1, unit_price: 40, paid_amount: 41, payment_status: 'paid' },
  }), 422);
  await check('sale oversell rejected', request('/shopkeeper/sales', {
    method: 'POST',
    token: shopkeeperToken,
    body: { customer_id: customer.data.id, product_id: product.data.id, sale_date: today(), quantity: 999, unit_price: 40, paid_amount: 39960, payment_status: 'paid' },
  }), 422);
  await check('sale accepted', request('/shopkeeper/sales', {
    method: 'POST',
    token: shopkeeperToken,
    body: { customer_id: customer.data.id, product_id: product.data.id, invoice_no: `SALE-AUTO-${stamp}`, sale_date: today(), quantity: 2, unit_price: 40, paid_amount: 80, payment_status: 'paid' },
  }), 201);
  await check('customer return accepted', request('/shopkeeper/returns', {
    method: 'POST',
    token: shopkeeperToken,
    body: { product_id: product.data.id, type: 'customer', quantity: 1, amount: 40, return_date: today() },
  }), 201);
  await check('supplier return too much rejected', request('/shopkeeper/returns', {
    method: 'POST',
    token: shopkeeperToken,
    body: { product_id: product.data.id, type: 'supplier', quantity: 999, amount: 24975, return_date: today() },
  }), 422);
  await check('shopkeeper reports load', request('/shopkeeper/reports', { token: shopkeeperToken }), 200, (body) => Boolean(body?.data?.summary));
  await check('shopkeeper products search', request(`/shopkeeper/products?search=${encodeURIComponent(sku)}&per_page=10`, { token: shopkeeperToken }), 200, (body) => body?.data?.data?.some((row) => row.sku === sku));
  await check('shopkeeper customers search', request(`/shopkeeper/customers?search=${encodeURIComponent('Updated')}&per_page=10`, { token: shopkeeperToken }), 200);
  await check('shopkeeper suppliers search', request(`/shopkeeper/suppliers?search=${encodeURIComponent('Updated')}&per_page=10`, { token: shopkeeperToken }), 200);
  await check('shopkeeper stock list loads', request('/shopkeeper/stock?per_page=10', { token: shopkeeperToken }), 200);
  await check('shopkeeper purchases list loads', request('/shopkeeper/purchases?per_page=10', { token: shopkeeperToken }), 200);
  await check('shopkeeper sales list loads', request('/shopkeeper/sales?per_page=10', { token: shopkeeperToken }), 200);
  await check('shopkeeper returns list loads', request('/shopkeeper/returns?per_page=10', { token: shopkeeperToken }), 200);
  await check('shopkeeper product archive', request(`/shopkeeper/products/${product.data.id}`, { method: 'DELETE', token: shopkeeperToken }), 200);
  await check('shopkeeper customer archive', request(`/shopkeeper/customers/${customer.data.id}`, { method: 'DELETE', token: shopkeeperToken }), 200);
  await check('shopkeeper supplier archive', request(`/shopkeeper/suppliers/${supplier.data.id}`, { method: 'DELETE', token: shopkeeperToken }), 200);
  await check('shopkeeper read-only reports post rejected', request('/shopkeeper/reports', { method: 'POST', token: shopkeeperToken, body: {} }), 404);

  await check('role archive', request(`/roles/${role.data.id}`, { method: 'DELETE', token: adminToken }), 200);
  await check('role restore', request(`/roles/${role.data.id}/restore`, { method: 'POST', token: adminToken }), 200);
  await check('permission archive', request(`/permissions/${permission.data.id}`, { method: 'DELETE', token: adminToken }), 200);
  await check('permission restore', request(`/permissions/${permission.data.id}/restore`, { method: 'POST', token: adminToken }), 200);
  await check('registered user logout', request('/auth/logout', { method: 'POST', token: registered.data.token }), 200);

  assertSummary();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

run().catch((error) => {
  console.error('Full API scenarios failed');
  console.error(error.message);
  process.exitCode = 1;
});
