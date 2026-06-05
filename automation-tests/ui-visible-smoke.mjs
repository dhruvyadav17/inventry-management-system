import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const backendDir = join(root, 'backend-laravel');
const frontendDir = join(root, 'frontend-react');
const reportDir = join(root, 'automation-tests', 'reports');
const browserDataDir = process.env.UI_BROWSER_PROFILE_DIR ?? `C:\\tmp\\inventory-ui-visible-profile-${Date.now()}`;
const frontendUrl = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173';
const backendHealthUrl = process.env.BACKEND_HEALTH_URL ?? 'http://127.0.0.1:8000/api/health';
const cdpPort = Number(process.env.CDP_PORT ?? 9222);
const browserPath = process.env.BROWSER_PATH ?? firstExisting([
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]);

const slowMs = Number(process.env.UI_SLOW_MS ?? 700);
const findings = [];
const browserLogs = [];
const processes = [];

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

  child.on('error', (error) => {
    console.error(`process error (${command}): ${error.message}`);
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
      }, 10000);
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
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

async function waitFor(cdp, label, expression, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) {
      return true;
    }
    await sleep(350);
  }

  console.log(`WAIT timeout: ${label}`);
  return false;
}

async function check(label, condition, details = '') {
  if (condition) {
    console.log(`PASS ${label}`);
    return;
  }

  console.log(`FAIL ${label}`);
  findings.push({ label, details });
}

async function checkRoute(cdp, label, path, expectedText) {
  await navigate(cdp, path);
  await waitFor(cdp, `${label} content`, `document.body.innerText.includes(${JSON.stringify(expectedText)})`);
  await check(label, await evaluate(cdp, `location.pathname === ${JSON.stringify(path)} && document.body.innerText.includes(${JSON.stringify(expectedText)})`), await evaluate(cdp, `location.pathname + ' | ' + document.body.innerText.slice(0, 120)`));
}

async function login(cdp, email, password) {
  await navigate(cdp, '/login');
  await evaluate(cdp, `window.Swal?.close?.(); localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); true;`);
  await evaluate(cdp, `
    (() => {
      const email = document.querySelector('input[type="email"]');
      const password = document.querySelector('input[type="password"]');
      const setValue = (input, value) => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setValue(email, ${JSON.stringify(email)});
      setValue(password, ${JSON.stringify(password)});
      email.dispatchEvent(new Event('input', { bubbles: true }));
      password.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('button.btn-primary').click();
      return true;
    })()
  `);
  await sleep(slowMs);
}

async function run() {
  await mkdir(reportDir, { recursive: true });
  await rm(browserDataDir, { recursive: true, force: true });

  if (process.env.UI_SERVERS_ALREADY_RUNNING === '1') {
    console.log('Using already running backend and frontend servers...');
  } else {
    console.log('Starting backend and frontend servers...');
    spawnProcess('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], backendDir);
    spawnProcess('npm.cmd', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], frontendDir);
  }

  await waitForHttp(backendHealthUrl, 'Backend API');
  await waitForHttp(frontendUrl, 'Frontend Vite');

  console.log('Opening visible browser window...');
  spawnProcess(browserPath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${browserDataDir}`,
    '--no-first-run',
    '--new-window',
    `${frontendUrl}/login`,
  ], root, true);

  const cdp = await cdpConnect();

  try {
    await navigate(cdp, '/login');
    await check('login page renders', await evaluate(cdp, `document.body.innerText.includes('Inventory Admin')`));
    await checkRoute(cdp, 'register page renders', '/register', 'Create Account');
    await checkRoute(cdp, 'forgot password page renders', '/forgot-password', 'Forgot Password');
    await checkRoute(cdp, 'reset password page renders', '/reset-password', 'Reset Password');

    await login(cdp, 'admin@example.com', 'wrong-password');
    await waitFor(cdp, 'bad login modal', `document.body.innerText.includes('Login failed')`);
    await check('bad login shows error modal', await evaluate(cdp, `document.body.innerText.includes('Login failed')`));
    await evaluate(cdp, `document.querySelector('.swal2-confirm')?.click(); true;`);
    await sleep(slowMs);

    await login(cdp, 'admin@example.com', 'Admin@123456');
    await waitFor(cdp, 'admin dashboard redirect', `location.pathname === '/admin/dashboard'`);
    await check('admin redirects to admin dashboard', await evaluate(cdp, `location.pathname === '/admin/dashboard'`), await evaluate(cdp, `location.pathname`));
    await waitFor(cdp, 'admin dashboard content', `document.body.innerText.includes('Total Users') || document.body.innerText.includes('Recent Audits')`);
    await check('admin dashboard content visible', await evaluate(cdp, `document.body.innerText.includes('Total Users') || document.body.innerText.includes('Recent Audits')`));

    for (const route of [
      ['/dashboard', 'Total Users'],
      ['/admin/dashboard', 'Total Users'],
      ['/users', 'Users List'],
      ['/roles', 'Roles List'],
      ['/permissions', 'Permissions List'],
      ['/reports', 'Total Users'],
      ['/settings', 'Settings'],
      ['/activity-logs', 'Activity'],
      ['/audit-logs', 'Audit'],
    ]) {
      await checkRoute(cdp, `admin route ${route[0]} renders`, route[0], route[1]);
    }

    await evaluate(cdp, `document.querySelector('.profile-trigger')?.click(); true;`);
    await sleep(slowMs);
    await evaluate(cdp, `[...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Profile')?.click(); true;`);
    await sleep(slowMs * 2);
    await check('admin profile menu opens /profile', await evaluate(cdp, `location.pathname === '/profile'`), await evaluate(cdp, `location.pathname`));

    await navigate(cdp, '/login');
    await login(cdp, 'shopkeeper@example.com', 'Shopkeeper@123456');
    await waitFor(cdp, 'shopkeeper dashboard redirect', `location.pathname === '/shopkeeper/dashboard'`);
    await check('shopkeeper redirects to shopkeeper dashboard', await evaluate(cdp, `location.pathname === '/shopkeeper/dashboard'`), await evaluate(cdp, `location.pathname`));
    await check('shopkeeper dashboard content visible', await evaluate(cdp, `document.body.innerText.toLowerCase().includes('shopkeeper') || document.body.innerText.toLowerCase().includes('inventory')`));

    for (const route of [
      ['/shopkeeper/dashboard', 'Dashboard'],
      ['/shopkeeper/products', 'Products'],
      ['/shopkeeper/stock', 'Stock Movement'],
      ['/shopkeeper/purchases', 'Purchases'],
      ['/shopkeeper/sales', 'Sales Billing'],
      ['/shopkeeper/customers', 'Customers'],
      ['/shopkeeper/suppliers', 'Suppliers'],
      ['/shopkeeper/returns', 'Returns'],
      ['/shopkeeper/reports', 'Reports'],
    ]) {
      await checkRoute(cdp, `shopkeeper route ${route[0]} renders`, route[0], route[1]);
    }

    await evaluate(cdp, `document.querySelector('.profile-trigger')?.click(); true;`);
    await sleep(slowMs);
    await evaluate(cdp, `[...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Profile')?.click(); true;`);
    await sleep(slowMs * 2);
    await check('shopkeeper profile menu opens /shopkeeper/profile', await evaluate(cdp, `location.pathname === '/shopkeeper/profile'`), await evaluate(cdp, `location.pathname`));

    await navigate(cdp, '/users');
    await check('shopkeeper cannot view admin users page', await evaluate(cdp, `document.body.innerText.includes('You do not have permission')`));

    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const screenshotPath = join(reportDir, `ui-visible-${Date.now()}.png`);
    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Screenshot saved: ${screenshotPath}`);

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
      console.log('\nVisible UI smoke passed with no findings.');
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
  console.error('Visible UI smoke failed');
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
