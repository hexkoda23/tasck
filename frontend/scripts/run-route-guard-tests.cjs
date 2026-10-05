/* Renders the route-guard scenarios in jsdom and checks where each one lands.
 *
 *   node scripts/run-route-guard-tests.cjs
 *
 * The project has no test runner wired up - no @testing-library - and adding
 * one would mean changing dependencies for a bug fix. This uses only what is
 * already installed (jsdom and @babel/core, both via react-scripts), so the
 * guard is exercised for real rather than reasoned about.
 */
process.env.NODE_ENV = 'test';
process.env.BABEL_ENV = 'test';
process.env.REACT_APP_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://tasck.test';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules/@babel/core'));

// --- compile the app's own JSX/ESM on require, leaving node_modules alone ----
const compile = (module_, filename) => {
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    presets: [require.resolve(path.join(ROOT, 'node_modules/babel-preset-react-app'))],
    babelrc: false,
    configFile: false,
  });
  return module_._compile(code, filename);
};

const plainJs = Module._extensions['.js'];
Module._extensions['.js'] = (module_, filename) => (
  filename.includes('node_modules') ? plainJs(module_, filename) : compile(module_, filename)
);
Module._extensions['.jsx'] = compile;
// Style imports have no meaning here.
Module._extensions['.css'] = (module_) => { module_.exports = {}; };

// --- a DOM to render into ---------------------------------------------------
const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://tasck.test/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require(path.join(ROOT, 'node_modules/react'));
const { createRoot } = require(path.join(ROOT, 'node_modules/react-dom/client'));
const { act } = React;

// The brand login page calls the API and stores a portal session; stand in
// for both so the real page can be driven here. Records what it was sent.
const loginCalls = [];
const stub = (relPath, exports_) => {
  const file = path.join(ROOT, relPath);
  const m = new Module(file);
  m.filename = file;
  m.loaded = true;
  m.exports = exports_;
  require.cache[file] = m;
};
stub('src/lib/v3api.js', {
  v3BrandLogin: async (payload) => {
    loginCalls.push(payload);
    return { user: { role: 'brand', brand_id: 'brand-1' }, token: 'brand-token', account: { brand_id: 'brand-1' } };
  },
});
stub('src/lib/v3brandPortal.js', { setBrandPortalSession: () => {} });

const {
  makeApp, makeLoginFlowApp, SIGNED_OUT, STILL_LOADING, BRAND, ADMIN, CREATIVE,
} = require('./routeGuard.cases.jsx');

let failures = 0;

function render(auth, entry) {
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const seen = {};
  const root = createRoot(container);
  act(() => { root.render(makeApp(auth, entry, seen)); });
  const text = container.textContent;
  act(() => { root.unmount(); });
  container.remove();
  return { text, seen };
}

function check(label, condition, detail) {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS  ' : 'FAIL  '}${label}`);
  if (!ok) {
    failures += 1;
    if (detail !== undefined) console.log(`        got: ${JSON.stringify(detail)}`);
  }
}

console.log('--- signed out: every guarded page must offer a way to log in');

let r = render(SIGNED_OUT, '/brand/approvals');
check('brand email link -> brand login page', r.text.includes('BRAND_LOGIN_PAGE'), r.text);
check('  ...not the landing page', !r.text.includes('LANDING_PAGE'), r.text);
check('  ...not the portal itself', !r.text.includes('BRAND_PORTAL'), r.text);
check('  ...and remembers where they were going', r.seen.from === '/brand/approvals', r.seen);

r = render(SIGNED_OUT, '/brand');
check('brand portal root -> brand login page', r.text.includes('BRAND_LOGIN_PAGE'), r.text);

r = render(SIGNED_OUT, '/admin/crm-brands');
check('admin link -> role selector (where an admin signs in)',
  r.text.includes('ROLE_SELECTOR_PAGE'), r.text);
check('  ...not the landing page', !r.text.includes('LANDING_PAGE'), r.text);
check('  ...and remembers where they were going', r.seen.from === '/admin/crm-brands', r.seen);

console.log('\n--- signed in: nothing changes for people already through the door');

r = render(BRAND, '/brand/approvals');
check('brand sees the brand portal',
  r.text.includes('BRAND_PORTAL') && r.text.includes('APPROVALS'), r.text);

r = render(ADMIN, '/admin/crm-brands');
check('admin sees the admin portal',
  r.text.includes('ADMIN_PORTAL') && r.text.includes('CRM'), r.text);

r = render(ADMIN, '/brand/approvals');
check('admin pasting a copied snapshot link -> brand login page',
  r.text.includes('BRAND_LOGIN_PAGE'), r.text);
check('  ...not a brand portal with no brand behind it', !r.text.includes('BRAND_PORTAL'), r.text);
check('  ...and remembers where they were going', r.seen.from === '/brand/approvals', r.seen);

r = render(CREATIVE, '/brand/alignment-snapshot?x=1');
check('any other non-brand session -> brand login, query kept',
  r.text.includes('BRAND_LOGIN_PAGE') && r.seen.from === '/brand/alignment-snapshot?x=1', r.seen);

r = render(BRAND, '/admin/crm-brands');
check('wrong role still goes to the landing page, as before',
  r.text.includes('LANDING_PAGE'), r.text);
check('  ...and is not sent to a login page it cannot use',
  !r.text.includes('ROLE_SELECTOR_PAGE'), r.text);

console.log('\n--- the refresh trap');

r = render(STILL_LOADING, '/brand/approvals');
check('while auth is still being read, nobody is redirected',
  r.text.includes('Loading...'), r.text);
check('  ...so a hard refresh does not eject a signed-in brand',
  !r.text.includes('BRAND_LOGIN_PAGE'), r.text);

// React tracks input values itself; set them through the native setter so
// the change it listens for is seen.
const typeInto = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
};

async function loginJourney(label, initialUser) {
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(makeLoginFlowApp(initialUser, '/brand/approvals')); });
  const q = (id) => container.querySelector(`[data-testid="${id}"]`);
  check(`${label}: link -> brand login form`, q('v1-brand-login') && !container.textContent.includes('BRAND_PORTAL'),
    container.textContent);
  loginCalls.length = 0;
  await act(async () => {
    typeInto(q('v1-brand-login-email'), 'brand@example.test');
    typeInto(q('v1-brand-login-password'), 'test-only');
  });
  await act(async () => { q('v1-brand-login-submit').click(); });
  check(`${label}:   ...signs in with the brand's email and password`,
    loginCalls.length === 1 && loginCalls[0].email === 'brand@example.test', loginCalls);
  check(`${label}:   ...and lands on the page the link named`,
    container.textContent.includes('BRAND_PORTAL') && container.textContent.includes('APPROVALS'), container.textContent);
  await act(async () => { root.unmount(); });
  container.remove();
}

// The scenarios above mirror App.js. These assert the mirror is honest - that
// the real routes are wrapped in the guard with the login pages used above,
// so the tests cannot quietly drift away from what ships.
console.log('\n--- App.js is actually wired to those guards');

const app = fs.readFileSync(path.join(ROOT, 'src/App.js'), 'utf8');
check('/brand is guarded, sending signed-out visitors to the brand login',
  /path="\/brand"[\s\S]{0,600}?<ProtectedRoute allowedRoles=\{\['brand'\]\} wrongRoleToLogin loginPath="\/brand\/login">/.test(app));
check('/admin is guarded, sending signed-out visitors to the role selector',
  /path="\/admin"[\s\S]{0,400}?loginPath="\/v1"/.test(app));

const brandLogin = fs.readFileSync(path.join(ROOT, 'src/pages/brand/V1BrandLogin.js'), 'utf8');
check('the brand login returns people to the page they asked for',
  /safeDestination\(location\.state\?\.from/.test(brandLogin));

const selector = fs.readFileSync(path.join(ROOT, 'src/pages/v1/V1RoleSelector.js'), 'utf8');
check('the role selector carries that destination through',
  /location\.state\?\.from/.test(selector) && /startsWith\(card\.path\)/.test(selector));

(async () => {
  console.log('\n--- a copied snapshot link, end to end through the real brand login');
  await loginJourney('signed out', null);
  await loginJourney('admin session', { role: 'admin' });
  console.log(`\n${failures ? `FAILURES: ${failures}` : 'all passed'}`);
  process.exit(failures ? 1 : 0);
})();
