import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const backendDir = join(root, 'backend-laravel');
const frontendDir = join(root, 'frontend-react');
const reportDir = join(root, 'automation-tests', 'reports');
const browserDataDir = process.env.UI_BROWSER_PROFILE_DIR ?? `C:\\tmp\\inventory-ui-responsive-profile-${Date.now()}`;
const frontendUrl = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173';
const backendHealthUrl = process.env.BACKEND_HEALTH_URL ?? 'http://127.0.0.1:8000/api/health';
const cdpPort = Number(process.env.CDP_PORT ?? 9224);
const stamp = Date.now();
const findings = [];
const checks = [];
const processes = [];
const viewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'tablet', width: 820, height: 1180, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

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

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function fail(message) {
  throw new Error(message);
}

function spawnProcess(command, args, cwd, visible = false) {
  const child = spawn(command, args, {
    cwd,
    shell: command.endsWith('.cmd'),
    stdio: visible ? 'inherit' : 'pipe',
    windowsHide: !visible,
  });
  processes.push(child);
  return child;
}

async function waitForHttp(url, label, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (response.ok) {
        console.log(`${label} ready: ${url}`);
        return;
      }
    } catch {
      // Starting.
    }
    await sleep(500);
  }
  fail(`${label} did not become ready: ${url}`);
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
      message.error ? rejectMessage(new Error(message.error.message)) : resolveMessage(message.result);
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

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
  });
  await sleep(500);
}

async function navigate(cdp, path) {
  await cdp.send('Page.navigate', { url: `${frontendUrl}${path}` });
  await sleep(1400);
  await waitFor(cdp, `
    !document.body.innerText.includes('Loading API data...')
      && !document.body.innerText.includes('Loading records...')
      && document.body.innerText.trim() !== 'Loading...'
  `, 10000);
}

async function waitFor(cdp, expression, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) return true;
    await sleep(300);
  }
  return false;
}

async function snapshot(cdp, name) {
  const safeName = name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshotPath = join(reportDir, `ui-responsive-${safeName}-${stamp}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`SNAPSHOT ${screenshotPath}`);
}

async function fill(cdp, selector, value) {
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  await evaluate(cdp, `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
      setter.call(input, ${JSON.stringify(String(value))});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
}

async function click(cdp, selector) {
  await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)})?.click(); true;`);
  await sleep(700);
}

async function login(cdp, email, password, expectedPath) {
  await navigate(cdp, '/login');
  await evaluate(cdp, `localStorage.clear(); window.Swal?.close?.(); true;`);
  await fill(cdp, '[data-testid="login-email"]', email);
  await fill(cdp, '[data-testid="login-password"]', password);
  await click(cdp, '[data-testid="login-submit"]');
  await waitFor(cdp, `location.pathname === ${JSON.stringify(expectedPath)}`);
}

async function recordCheck(cdp, label, expression, detailsExpression = 'location.pathname') {
  const ok = await evaluate(cdp, expression);
  checks.push({ label, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) {
    findings.push({ label, details: await evaluate(cdp, detailsExpression) });
  }
}

function sidebarBoundsCheck(shellSelector, sidebarSelector) {
  return `
    (() => {
      const shell = document.querySelector(${JSON.stringify(shellSelector)});
      const sidebar = document.querySelector(${JSON.stringify(sidebarSelector)});
      const rect = sidebar?.getBoundingClientRect();
      return Boolean(
        shell?.classList.contains('sidebar-open')
          && rect
          && rect.left >= -2
          && rect.right <= window.innerWidth + 2
          && rect.width >= Math.min(220, window.innerWidth - 60)
      );
    })()
  `;
}

async function responsiveChecks(cdp, label) {
  await recordCheck(cdp, `${label} no body horizontal overflow`, `
    document.documentElement.scrollWidth <= window.innerWidth + 4
  `, `JSON.stringify({ path: location.pathname, innerWidth, scrollWidth: document.documentElement.scrollWidth })`);
  await recordCheck(cdp, `${label} visible buttons have usable size`, `
    [...document.querySelectorAll('button,a.btn,.icon-btn,.profile-trigger')]
      .filter((el) => el.offsetParent !== null)
      .every((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width >= 30 && rect.height >= 30;
      })
  `);
  await recordCheck(cdp, `${label} header is inside viewport`, `
    (() => {
      const header = document.querySelector('.content-header,.shopkeeper-topbar');
      if (!header) return true;
      const rect = header.getBoundingClientRect();
      return rect.left >= -2 && rect.right <= window.innerWidth + 2;
    })()
  `);
}

async function auditViewport(cdp, viewport) {
  await setViewport(cdp, viewport);
  await navigate(cdp, '/login');
  await snapshot(cdp, `${viewport.name}-login`);
  await responsiveChecks(cdp, `${viewport.name} login`);

  await fill(cdp, '[data-testid="login-email"]', 'admin@example.com');
  await fill(cdp, '[data-testid="login-password"]', 'wrong-password');
  await click(cdp, '[data-testid="login-submit"]');
  await waitFor(cdp, `document.body.innerText.includes('Login failed')`);
  await snapshot(cdp, `${viewport.name}-bad-login-popup`);
  await recordCheck(cdp, `${viewport.name} bad login popup visible`, `document.body.innerText.includes('Login failed')`);
  await click(cdp, '.swal2-confirm');

  await login(cdp, 'admin@example.com', 'Admin@123456', '/admin/dashboard');
  for (const route of ['/admin/dashboard', '/users', '/roles', '/permissions', '/settings']) {
    await navigate(cdp, route);
    await snapshot(cdp, `${viewport.name}-admin-${route.replaceAll('/', '-')}`);
    await responsiveChecks(cdp, `${viewport.name} ${route}`);
  }

  if (viewport.width <= 991) {
    await navigate(cdp, '/users');
    await click(cdp, '[data-testid="admin-menu-toggle"]');
    await snapshot(cdp, `${viewport.name}-admin-sidebar-open`);
    await recordCheck(cdp, `${viewport.name} admin sidebar opens within viewport`, sidebarBoundsCheck('.app-shell', '.app-sidebar'));
  }

  await navigate(cdp, '/users');
  await click(cdp, '[data-testid="admin-users-new"]');
  await snapshot(cdp, `${viewport.name}-admin-user-modal`);
  await recordCheck(cdp, `${viewport.name} admin modal within viewport`, `
    (() => {
      const rect = document.querySelector('.admin-modal .modal-dialog')?.getBoundingClientRect();
      return Boolean(rect && rect.left >= -2 && rect.right <= window.innerWidth + 2);
    })()
  `);
  await click(cdp, '.btn-close');

  await click(cdp, '.profile-trigger');
  await snapshot(cdp, `${viewport.name}-admin-profile-dropdown`);
  await recordCheck(cdp, `${viewport.name} profile dropdown within viewport`, `
    (() => {
      const rect = document.querySelector('.profile-dropdown')?.getBoundingClientRect();
      return Boolean(rect && rect.left >= -2 && rect.right <= window.innerWidth + 2);
    })()
  `);

  await login(cdp, 'shopkeeper@example.com', 'Shopkeeper@123456', '/shopkeeper/dashboard');
  for (const route of ['/shopkeeper/dashboard', '/shopkeeper/products', '/shopkeeper/sales', '/shopkeeper/reports']) {
    await navigate(cdp, route);
    await snapshot(cdp, `${viewport.name}-shop-${route.replaceAll('/', '-')}`);
    await responsiveChecks(cdp, `${viewport.name} ${route}`);
  }

  if (viewport.width <= 991) {
    await navigate(cdp, '/shopkeeper/products');
    await click(cdp, '[data-testid="shop-menu-toggle"]');
    await snapshot(cdp, `${viewport.name}-shop-sidebar-open`);
    await recordCheck(cdp, `${viewport.name} shop sidebar opens within viewport`, sidebarBoundsCheck('.shopkeeper-shell', '.shopkeeper-rail'));
  }

  await navigate(cdp, '/shopkeeper/products');
  await snapshot(cdp, `${viewport.name}-shop-product-form`);
  await recordCheck(cdp, `${viewport.name} shop product form visible`, `Boolean(document.querySelector('[data-testid="shop-products-form"]'))`);
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
  spawnProcess(browserPath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${browserDataDir}`,
    '--no-first-run',
    '--new-window',
    `${frontendUrl}/login`,
  ], root, true);

  const cdp = await cdpConnect();
  try {
    for (const viewport of viewports) {
      await auditViewport(cdp, viewport);
    }

    const failed = checks.filter((check) => !check.ok);
    const report = {
      generated_at: new Date().toISOString(),
      summary: { passed: checks.length - failed.length, failed: failed.length, total: checks.length },
      findings,
      checks,
    };
    const reportPath = join(reportDir, `ui-responsive-audit-${stamp}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`REPORT ${reportPath}`);

    if (failed.length) {
      console.log('\nSuggestions / findings:');
      findings.forEach((finding, index) => console.log(`${index + 1}. ${finding.label}: ${finding.details}`));
      process.exitCode = 1;
    } else {
      console.log(`\nResponsive UI audit passed: ${checks.length}/${checks.length}`);
    }
  } finally {
    cdp.close();
    await sleep(1000);
    for (const child of processes.reverse()) {
      if (!child.killed) child.kill();
    }
  }
}

run().catch((error) => {
  console.error('Responsive UI audit failed');
  console.error(error.message);
  for (const child of processes.reverse()) {
    if (!child.killed) child.kill();
  }
  process.exitCode = 1;
});
