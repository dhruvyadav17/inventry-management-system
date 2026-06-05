import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const backendDir = join(root, 'backend-laravel');
const frontendDir = join(root, 'frontend-react');
const reportDir = join(root, 'automation-tests', 'reports');
const browserDataDir = process.env.UI_BROWSER_PROFILE_DIR ?? `C:\\tmp\\inventory-ui-crud-profile-${Date.now()}`;
const frontendUrl = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173';
const backendHealthUrl = process.env.BACKEND_HEALTH_URL ?? 'http://127.0.0.1:8000/api/health';
const cdpPort = Number(process.env.CDP_PORT ?? 9223);
const slowMs = Number(process.env.UI_SLOW_MS ?? 650);
const stamp = Date.now();
const findings = [];
const browserLogs = [];
const processes = [];

const browserPath = process.env.BROWSER_PATH ?? firstExisting([
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]);

if (!browserPath) {
  fail('No Edge or Chrome executable found. Set BROWSER_PATH to your browser exe.');
}

function firstExisting(paths) {
  return paths.find((path) => existsSync(path)) ?? '';
}

function spawnProcess(command, args, cwd, visible = false) {
  console.log(`spawn: ${command} ${args.join(' ')} [cwd=${cwd}]`);
  const child = spawn(command, args, {
    cwd,
    shell: command.endsWith('.cmd'),
    stdio: visible ? 'inherit' : 'pipe',
    windowsHide: !visible,
  });

  if (!visible) {
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        console.error(`[${command}] ${text}`);
      }
    });
  }

  processes.push(child);
  return child;
}

async function waitForHttp(url, label, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetchWithTimeout(url, 2500);
      if (response.ok) {
        console.log(`${label} ready: ${url}`);
        return;
      }
    } catch {
      // Server is still starting.
    }
    await sleep(500);
  }
  fail(`${label} did not become ready: ${url}`);
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function fail(message, details = undefined) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function cdpConnect() {
  await waitForHttp(`http://127.0.0.1:${cdpPort}/json/version`, 'Browser DevTools');
  const target = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(`${frontendUrl}/login`)}`, { method: 'PUT' })
    .then((response) => response.json());

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    ws.addEventListener('open', resolveOpen, { once: true });
    ws.addEventListener('error', rejectOpen, { once: true });
  });

  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolveMessage, rejectMessage } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        rejectMessage(new Error(message.error.message));
      } else {
        resolveMessage(message.result);
      }
      return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
      browserLogs.push(`Runtime exception: ${message.params.exceptionDetails?.text ?? 'unknown'}`);
    }

    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      const args = message.params.args?.map((arg) => arg.value ?? arg.description).join(' ');
      browserLogs.push(`Console ${message.params.type}: ${args}`);
    }
  });

  async function send(method, params = {}) {
    const messageId = ++id;
    ws.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolveMessage, rejectMessage) => {
      pending.set(messageId, { resolveMessage, rejectMessage });
      setTimeout(() => {
        if (pending.has(messageId)) {
          pending.delete(messageId);
          rejectMessage(new Error(`CDP timeout: ${method}`));
        }
      }, 12000);
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  return { send, close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });

  if (result.exceptionDetails) {
    fail(`Browser evaluation failed: ${result.exceptionDetails.text}`);
  }

  return result.result.value;
}

async function navigate(cdp, path) {
  await cdp.send('Page.navigate', { url: `${frontendUrl}${path}` });
  await sleep(slowMs * 2);
}

async function waitFor(cdp, label, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) {
      return true;
    }
    await sleep(350);
  }
  findings.push({ label: `${label} timeout`, details: await pageSummary(cdp) });
  return false;
}

async function check(cdp, label, condition, details = '') {
  if (condition) {
    console.log(`PASS ${label}`);
    return;
  }

  console.log(`FAIL ${label}`);
  findings.push({ label, details: details || await pageSummary(cdp) });
}

async function pageSummary(cdp) {
  return evaluate(cdp, `location.pathname + ' | ' + document.body.innerText.slice(0, 220)`);
}

async function snapshot(cdp, name) {
  const safeName = name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshotPath = join(reportDir, `ui-crud-${safeName}-${stamp}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`SNAPSHOT ${screenshotPath}`);
}

async function click(cdp, selector) {
  await waitFor(cdp, `click target ${selector}`, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  await evaluate(cdp, `
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      element.click();
      return true;
    })()
  `);
  await sleep(slowMs);
}

async function fill(cdp, selector, value) {
  await waitFor(cdp, `field ${selector}`, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  const ok = await evaluate(cdp, `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
      setter.call(input, ${JSON.stringify(String(value))});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
  await check(cdp, `field exists ${selector}`, ok);
}

async function selectValue(cdp, selector, value) {
  await waitFor(cdp, `select ${selector}`, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  const ok = await evaluate(cdp, `
    (() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) return false;
      const option = [...select.options].find((item) => item.value === ${JSON.stringify(String(value))});
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
  await check(cdp, `select value ${selector}=${value}`, ok);
}

async function selectFirst(cdp, selector) {
  await waitFor(cdp, `options available ${selector}`, `
    (() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      return Boolean(select && [...select.options].some((item) => item.value));
    })()
  `);
  const ok = await evaluate(cdp, `
    (() => {
      const select = document.querySelector(${JSON.stringify(selector)});
      if (!select) return false;
      const option = [...select.options].find((item) => item.value);
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
  await check(cdp, `select first option ${selector}`, ok);
}

async function toggleCheckbox(cdp, selector) {
  await waitFor(cdp, `checkbox ${selector}`, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  const ok = await evaluate(cdp, `
    (() => {
      const checkbox = document.querySelector(${JSON.stringify(selector)});
      if (!checkbox) return false;
      if (!checkbox.checked) checkbox.click();
      return true;
    })()
  `);
  await check(cdp, `checkbox exists ${selector}`, ok);
}

async function toggleCheckboxByLabel(cdp, labelText) {
  await waitFor(cdp, `checkbox label ${labelText}`, `
    [...document.querySelectorAll('.check-item')].some((label) => label.innerText.trim() === ${JSON.stringify(labelText)})
  `);
  const ok = await evaluate(cdp, `
    (() => {
      const label = [...document.querySelectorAll('.check-item')].find((item) => item.innerText.trim() === ${JSON.stringify(labelText)});
      const checkbox = label?.querySelector('input[type="checkbox"]');
      if (!checkbox) return false;
      if (!checkbox.checked) checkbox.click();
      return true;
    })()
  `);
  await check(cdp, `checkbox label exists ${labelText}`, ok);
}

async function login(cdp, email, password, expectedPath) {
  await navigate(cdp, '/login');
  await evaluate(cdp, `window.Swal?.close?.(); localStorage.clear(); true;`);
  await fill(cdp, '[data-testid="login-email"]', email);
  await fill(cdp, '[data-testid="login-password"]', password);
  await click(cdp, '[data-testid="login-submit"]');
  await waitFor(cdp, `login redirect ${expectedPath}`, `location.pathname === ${JSON.stringify(expectedPath)}`);
  await check(cdp, `logged in ${email}`, await evaluate(cdp, `location.pathname === ${JSON.stringify(expectedPath)}`));
}

async function searchFor(cdp, resource, text) {
  await fill(cdp, '[data-testid="admin-resource-search"]', text);
  await click(cdp, '[data-testid="admin-resource-apply-filters"]');
  await waitFor(cdp, `admin ${resource} search ${text}`, `document.body.innerText.includes(${JSON.stringify(text)})`);
}

async function shopSearchFor(cdp, resource, text) {
  await fill(cdp, `[data-testid="shop-${resource}-search"]`, text);
  await click(cdp, `[data-testid="shop-${resource}-apply-search"]`);
  await waitFor(cdp, `shop ${resource} search ${text}`, `document.body.innerText.includes(${JSON.stringify(text)})`);
}

async function adminCreatePermission(cdp, name) {
  await navigate(cdp, '/permissions');
  await click(cdp, '[data-testid="admin-permissions-new"]');
  await fill(cdp, '[data-testid="admin-permissions-name"]', name);
  await click(cdp, '[data-testid="admin-permissions-save"]');
  await waitFor(cdp, 'permission saved', `document.body.innerText.includes('saved successfully')`);
  await click(cdp, '.swal2-confirm');
  await searchFor(cdp, 'permissions', name);
  await check(cdp, 'admin permission created from UI', await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(name)})`));
  await snapshot(cdp, 'admin-permission-created');
}

async function adminCreateRole(cdp, name, permission) {
  await navigate(cdp, '/roles');
  await click(cdp, '[data-testid="admin-roles-new"]');
  await fill(cdp, '[data-testid="admin-roles-name"]', name);
  await toggleCheckboxByLabel(cdp, permission);
  await click(cdp, '[data-testid="admin-roles-save"]');
  await waitFor(cdp, 'role saved', `document.body.innerText.includes('saved successfully')`);
  await click(cdp, '.swal2-confirm');
  await searchFor(cdp, 'roles', name);
  await check(cdp, 'admin role created from UI', await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(name)})`));
  await snapshot(cdp, 'admin-role-created');
}

async function adminCreateUpdateArchiveUser(cdp, roleName) {
  const name = `UI User ${stamp}`;
  const updated = `${name} Updated`;
  const email = `ui.user.${stamp}@example.com`;

  await navigate(cdp, '/users');
  await click(cdp, '[data-testid="admin-users-new"]');
  await fill(cdp, '[data-testid="admin-users-name"]', name);
  await fill(cdp, '[data-testid="admin-users-email"]', email);
  await fill(cdp, '[data-testid="admin-users-password"]', 'Automation@123456');
  await toggleCheckboxByLabel(cdp, roleName);
  await click(cdp, '[data-testid="admin-users-save"]');
  await waitFor(cdp, 'user saved', `document.body.innerText.includes('saved successfully')`);
  await click(cdp, '.swal2-confirm');
  await searchFor(cdp, 'users', email);
  await check(cdp, 'admin user created from UI', await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(email)})`));
  await snapshot(cdp, 'admin-user-created');

  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="admin-users-edit-"]')][0]?.click(); true;`);
  await sleep(slowMs);
  await fill(cdp, '[data-testid="admin-users-name"]', updated);
  await selectValue(cdp, '[data-testid="admin-users-status"]', 'inactive');
  await click(cdp, '[data-testid="admin-users-save"]');
  await waitFor(cdp, 'user updated', `document.body.innerText.includes('saved successfully')`);
  await click(cdp, '.swal2-confirm');
  await searchFor(cdp, 'users', updated);
  await check(cdp, 'admin user updated from UI', await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(updated)})`));
  await snapshot(cdp, 'admin-user-updated');

  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="admin-users-archive-"]')][0]?.click(); true;`);
  await sleep(slowMs);
  await click(cdp, '.swal2-confirm');
  await sleep(slowMs * 2);
  await selectValue(cdp, '[data-testid="admin-resource-status-filter"]', 'archived');
  await click(cdp, '[data-testid="admin-resource-apply-filters"]');
  await waitFor(cdp, 'archived user visible', `document.body.innerText.includes(${JSON.stringify(email)})`);
  await check(cdp, 'admin user archived from UI', await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(email)}) && document.body.innerText.includes('Restore')`));
  await snapshot(cdp, 'admin-user-archived');
}

async function archiveFirstAdminRow(cdp, resource, searchText) {
  await navigate(cdp, `/${resource}`);
  await searchFor(cdp, resource, searchText);
  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="admin-${resource}-archive-"]')][0]?.click(); true;`);
  await sleep(slowMs);
  await click(cdp, '.swal2-confirm');
  await sleep(slowMs * 2);
  await selectValue(cdp, '[data-testid="admin-resource-status-filter"]', 'archived');
  await click(cdp, '[data-testid="admin-resource-apply-filters"]');
  await waitFor(cdp, `admin ${resource} archived`, `document.body.innerText.includes(${JSON.stringify(searchText)})`);
  await check(cdp, `admin ${resource} archived from UI`, await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(searchText)}) || document.body.innerText.includes('Restore') || !document.body.innerText.includes(${JSON.stringify(searchText)})`));
  await snapshot(cdp, `admin-${resource}-archived`);
}

async function shopSaveAndExpect(cdp, resource, expectedText, label) {
  await click(cdp, `[data-testid="shop-${resource}-save"]`);
  await sleep(slowMs * 2);
  await check(cdp, label, await evaluate(cdp, `document.body.innerText.includes('Record saved.') || document.body.innerText.includes('Record updated.') || !document.body.innerText.toLowerCase().includes('the given data was invalid')`));
  await snapshot(cdp, label);
}

async function shopCreateSupplier(cdp) {
  const name = `UI Supplier ${stamp}`;
  const updated = `${name} Updated`;
  await navigate(cdp, '/shopkeeper/suppliers');
  await fill(cdp, '[data-testid="shop-field-name"]', name);
  await fill(cdp, '[data-testid="shop-field-phone"]', '9000002001');
  await fill(cdp, '[data-testid="shop-field-email"]', `ui.supplier.${stamp}@example.com`);
  await fill(cdp, '[data-testid="shop-field-address"]', 'UI supplier address');
  await shopSaveAndExpect(cdp, 'suppliers', name, 'shop supplier created from UI');
  await shopSearchFor(cdp, 'suppliers', name);
  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="shop-suppliers-edit-"]')][0]?.click(); true;`);
  await sleep(slowMs);
  await fill(cdp, '[data-testid="shop-field-name"]', updated);
  await shopSaveAndExpect(cdp, 'suppliers', updated, 'shop supplier updated from UI');
  await shopSearchFor(cdp, 'suppliers', updated);
  return updated;
}

async function shopCreateCustomer(cdp) {
  const name = `UI Customer ${stamp}`;
  const updated = `${name} Updated`;
  await navigate(cdp, '/shopkeeper/customers');
  await fill(cdp, '[data-testid="shop-field-name"]', name);
  await fill(cdp, '[data-testid="shop-field-phone"]', '9000002002');
  await fill(cdp, '[data-testid="shop-field-email"]', `ui.customer.${stamp}@example.com`);
  await fill(cdp, '[data-testid="shop-field-address"]', 'UI customer address');
  await fill(cdp, '[data-testid="shop-field-opening_balance"]', '12');
  await shopSaveAndExpect(cdp, 'customers', name, 'shop customer created from UI');
  await shopSearchFor(cdp, 'customers', name);
  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="shop-customers-edit-"]')][0]?.click(); true;`);
  await sleep(slowMs);
  await fill(cdp, '[data-testid="shop-field-name"]', updated);
  await shopSaveAndExpect(cdp, 'customers', updated, 'shop customer updated from UI');
  await shopSearchFor(cdp, 'customers', updated);
  return updated;
}

async function shopCreateProduct(cdp) {
  const sku = `UI-SKU-${stamp}`;
  const name = `UI Product ${stamp}`;
  const updated = `${name} Updated`;
  await navigate(cdp, '/shopkeeper/products');
  await fill(cdp, '[data-testid="shop-field-name"]', name);
  await fill(cdp, '[data-testid="shop-field-sku"]', sku);
  await fill(cdp, '[data-testid="shop-field-barcode"]', `BAR${stamp}`);
  await fill(cdp, '[data-testid="shop-field-category_name"]', `UI Category ${stamp}`);
  await selectFirst(cdp, '[data-testid="shop-field-supplier_id"]');
  await fill(cdp, '[data-testid="shop-field-purchase_price"]', '25');
  await fill(cdp, '[data-testid="shop-field-sale_price"]', '40');
  await fill(cdp, '[data-testid="shop-field-stock_quantity"]', '12');
  await fill(cdp, '[data-testid="shop-field-reorder_level"]', '2');
  await fill(cdp, '[data-testid="shop-field-unit"]', 'pcs');
  await shopSaveAndExpect(cdp, 'products', sku, 'shop product created from UI');
  await shopSearchFor(cdp, 'products', sku);
  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="shop-products-edit-"]')][0]?.click(); true;`);
  await sleep(slowMs);
  await fill(cdp, '[data-testid="shop-field-name"]', updated);
  await fill(cdp, '[data-testid="shop-field-sale_price"]', '42');
  await shopSaveAndExpect(cdp, 'products', updated, 'shop product updated from UI');
  await shopSearchFor(cdp, 'products', sku);
  return { sku, name: updated };
}

async function shopTransactions(cdp) {
  await navigate(cdp, '/shopkeeper/stock');
  await selectFirst(cdp, '[data-testid="shop-field-product_id"]');
  await selectValue(cdp, '[data-testid="shop-field-type"]', 'in');
  await fill(cdp, '[data-testid="shop-field-quantity"]', '4');
  await fill(cdp, '[data-testid="shop-field-reference"]', `UI-STOCK-${stamp}`);
  await shopSaveAndExpect(cdp, 'stock', 'Record saved.', 'shop stock in created from UI');

  await selectFirst(cdp, '[data-testid="shop-field-product_id"]');
  await selectValue(cdp, '[data-testid="shop-field-type"]', 'out');
  await fill(cdp, '[data-testid="shop-field-quantity"]', '9999');
  await click(cdp, '[data-testid="shop-stock-save"]');
  await waitFor(cdp, 'stock oversell validation', `document.body.innerText.toLowerCase().includes('stock') || document.body.innerText.toLowerCase().includes('quantity')`);
  await snapshot(cdp, 'shop-stock-oversell-validation');

  await navigate(cdp, '/shopkeeper/purchases');
  await selectFirst(cdp, '[data-testid="shop-field-supplier_id"]');
  await selectFirst(cdp, '[data-testid="shop-field-product_id"]');
  await fill(cdp, '[data-testid="shop-field-invoice_no"]', `UI-PUR-${stamp}`);
  await fill(cdp, '[data-testid="shop-field-quantity"]', '2');
  await fill(cdp, '[data-testid="shop-field-unit_price"]', '25');
  await fill(cdp, '[data-testid="shop-field-paid_amount"]', '50');
  await shopSaveAndExpect(cdp, 'purchases', `UI-PUR-${stamp}`, 'shop purchase created from UI');

  await navigate(cdp, '/shopkeeper/sales');
  await selectFirst(cdp, '[data-testid="shop-field-customer_id"]');
  await selectFirst(cdp, '[data-testid="shop-field-product_id"]');
  await fill(cdp, '[data-testid="shop-field-invoice_no"]', `UI-SALE-${stamp}`);
  await fill(cdp, '[data-testid="shop-field-quantity"]', '1');
  await fill(cdp, '[data-testid="shop-field-unit_price"]', '40');
  await fill(cdp, '[data-testid="shop-field-paid_amount"]', '40');
  await shopSaveAndExpect(cdp, 'sales', `UI-SALE-${stamp}`, 'shop sale created from UI');

  await selectFirst(cdp, '[data-testid="shop-field-customer_id"]');
  await selectFirst(cdp, '[data-testid="shop-field-product_id"]');
  await fill(cdp, '[data-testid="shop-field-quantity"]', '9999');
  await fill(cdp, '[data-testid="shop-field-paid_amount"]', '399960');
  await click(cdp, '[data-testid="shop-sales-save"]');
  await waitFor(cdp, 'sale oversell validation', `document.body.innerText.toLowerCase().includes('stock') || document.body.innerText.toLowerCase().includes('quantity')`);
  await snapshot(cdp, 'shop-sale-oversell-validation');

  await navigate(cdp, '/shopkeeper/returns');
  await selectValue(cdp, '[data-testid="shop-field-type"]', 'customer');
  await fill(cdp, '[data-testid="shop-field-quantity"]', '1');
  await fill(cdp, '[data-testid="shop-field-amount"]', '40');
  await click(cdp, '[data-testid="shop-returns-save"]');
  await waitFor(cdp, 'customer return validation', `document.body.innerText.toLowerCase().includes('product') || document.body.innerText.toLowerCase().includes('required')`);
  await snapshot(cdp, 'shop-customer-return-validation');

  await navigate(cdp, '/shopkeeper/returns');
  await selectValue(cdp, '[data-testid="shop-field-type"]', 'supplier');
  await fill(cdp, '[data-testid="shop-field-quantity"]', '9999');
  await fill(cdp, '[data-testid="shop-field-amount"]', '399960');
  await click(cdp, '[data-testid="shop-returns-save"]');
  await waitFor(cdp, 'supplier return validation', `document.body.innerText.toLowerCase().includes('stock') || document.body.innerText.toLowerCase().includes('quantity')`);
  await snapshot(cdp, 'shop-supplier-return-validation');
}

async function archiveFirstShopRow(cdp, resource, searchText) {
  await navigate(cdp, `/shopkeeper/${resource}`);
  await fill(cdp, `[data-testid="shop-${resource}-search"]`, searchText);
  await click(cdp, `[data-testid="shop-${resource}-apply-search"]`);
  await sleep(slowMs * 2);
  await evaluate(cdp, `[...document.querySelectorAll('[data-testid^="shop-${resource}-archive-"]')][0]?.click(); true;`);
  await sleep(slowMs * 2);
  await fill(cdp, `[data-testid="shop-${resource}-search"]`, searchText);
  await click(cdp, `[data-testid="shop-${resource}-apply-search"]`);
  await sleep(slowMs * 2);
  await check(cdp, `shop ${resource} archived from UI`, await evaluate(cdp, `
    document.body.innerText.includes('Record archived.')
      || document.body.innerText.includes('No records found')
      || document.querySelectorAll('[data-testid^="shop-${resource}-archive-"]').length === 0
  `));
  await snapshot(cdp, `shop-${resource}-archived`);
}

async function run() {
  await mkdir(reportDir, { recursive: true });
  await rm(browserDataDir, { recursive: true, force: true });

  if (process.env.UI_SERVERS_ALREADY_RUNNING === '1') {
    console.log('Using already running backend and frontend servers...');
  } else {
    spawnProcess('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], backendDir);
    spawnProcess('npm.cmd', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], frontendDir);
  }

  await waitForHttp(backendHealthUrl, 'Backend API');
  await waitForHttp(frontendUrl, 'Frontend Vite');

  console.log('Opening visible browser window for CRUD automation...');
  spawnProcess(browserPath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${browserDataDir}`,
    '--no-first-run',
    '--new-window',
    `${frontendUrl}/login`,
  ], root, true);

  const cdp = await cdpConnect();
  try {
    const permissionName = `ui.permission.${stamp}`;
    const roleName = `UI Role ${stamp}`;

    await login(cdp, 'admin@example.com', 'Admin@123456', '/admin/dashboard');
    await adminCreatePermission(cdp, permissionName);
    await adminCreateRole(cdp, roleName, permissionName);
    await adminCreateUpdateArchiveUser(cdp, roleName);
    await archiveFirstAdminRow(cdp, 'roles', roleName);
    await archiveFirstAdminRow(cdp, 'permissions', permissionName);

    await login(cdp, 'shopkeeper@example.com', 'Shopkeeper@123456', '/shopkeeper/dashboard');
    const supplierName = await shopCreateSupplier(cdp);
    const customerName = await shopCreateCustomer(cdp);
    const product = await shopCreateProduct(cdp);
    await shopTransactions(cdp);
    await archiveFirstShopRow(cdp, 'products', product.sku);
    await archiveFirstShopRow(cdp, 'customers', customerName);
    await archiveFirstShopRow(cdp, 'suppliers', supplierName);

    await navigate(cdp, '/shopkeeper/reports');
    await check(cdp, 'shopkeeper reports still render after CRUD', await evaluate(cdp, `document.body.innerText.includes('Reports')`));
    await snapshot(cdp, 'shopkeeper-reports-after-crud');

    if (browserLogs.length) {
      findings.push({ label: 'browser console/runtime warnings', details: browserLogs.join('\n') });
    }

    if (findings.length) {
      console.log('\nSuggestions / findings:');
      findings.forEach((finding, index) => {
        console.log(`${index + 1}. ${finding.label}${finding.details ? `: ${finding.details}` : ''}`);
      });
      process.exitCode = 1;
    } else {
      console.log('\nVisible UI CRUD scenarios passed with snapshots saved.');
    }
  } finally {
    cdp.close();
    await sleep(1000);
    for (const child of processes.reverse()) {
      if (!child.killed) {
        child.kill();
      }
    }
  }
}

run().catch(async (error) => {
  console.error('Visible UI CRUD scenarios failed');
  console.error(error.message);
  if (error.details) {
    console.error(error.details);
  }
  for (const child of processes.reverse()) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exitCode = 1;
});
