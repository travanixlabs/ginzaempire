/**
 * Test helper — loads source files in a sandboxed browser-like environment.
 * Uses Node's vm module to evaluate JS in a context with DOM stubs.
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');

function createTestContext(files, overrides = {}) {
  const storage = {};
  const localStorageStub = {
    getItem: (k) => storage[k] ?? null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  };

  const elements = {};
  const createElement = (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    id: '',
    innerHTML: '',
    textContent: '',
    style: { setProperty(){}, getPropertyValue(){ return ''; } },
    dataset: {},
    children: [],
    classList: {
      _cls: new Set(),
      add(...c) { c.forEach(x => this._cls.add(x)); },
      remove(...c) { c.forEach(x => this._cls.delete(x)); },
      toggle(c, f) { if (f === undefined) f = !this._cls.has(c); f ? this._cls.add(c) : this._cls.delete(c); return f; },
      contains(c) { return this._cls.has(c); },
    },
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {},
    remove() {},
    insertBefore(c) { return c; },
    addEventListener() {},
    removeEventListener() {},
    scrollIntoView() {},
    focus() {},
    click() {},
    closest() { return null; },
    matches() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; },
    offsetWidth: 0,
    offsetHeight: 0,
    offsetTop: 0,
    offsetLeft: 0,
  });

  const documentStub = {
    getElementById: (id) => {
      if (!elements[id]) {
        const el = createElement('div');
        el.id = id;
        elements[id] = el;
      }
      return elements[id];
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement,
    body: { classList: { _cls: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } }, style: {}, appendChild() {} },
    documentElement: { classList: { add() {}, remove() {} }, style: { setProperty() {}, removeProperty() {} } },
    head: { appendChild() {} },
    addEventListener() {},
    activeElement: null,
    cookie: '',
  };

  // Pre-populate commonly needed elements
  ['toast', 'a11yAnnouncer', 'particles', 'homePage', 'rosterPage', 'listPage',
   'girlsGrid', 'rosterGrid', 'favoritesGrid', 'homeImages', 'homeAnnounce',
   'homeAvailNow', 'compareOverlay', 'compareGrid', 'formOverlay', 'deleteOverlay',
   'authOverlay', 'compareBar', 'compareBarCount', 'compareOpen', 'compareClear',
   'compareClose', 'compareDone', 'filterToggle', 'filterBackdrop',
   'navMenuBtn', 'navDropdown', 'loginIconBtn', 'userDropdown', 'langBtn', 'langDropdown',
   'fabToggle', 'fabMenu', 'backToTop', 'lfUser', 'lfPass', 'lfError',
   'navFavorites', 'bnFavorites', 'navCalendar', 'navAnalytics',
   'notifToggleBtn', 'notifPrefsDropdown',
   'notifPrefPush', 'notifPrefEmail', 'cardHoverPreview',
   'gridResultsLive', 'homeSkeleton', 'homeSearchInput',
   'profilePage', 'calendarPage', 'kbHelpOverlay',
  ].forEach(id => {
    const el = createElement('div');
    el.id = id;
    elements[id] = el;
  });

  const ctx = {
    window: {},
    document: documentStub,
    localStorage: localStorageStub,
    sessionStorage: localStorageStub,
    navigator: { onLine: true, userAgent: 'test', serviceWorker: { register: () => Promise.resolve(), ready: Promise.resolve({ pushManager: { subscribe: () => Promise.resolve(), getSubscription: () => Promise.resolve(null) } }) }, language: 'en' },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    setTimeout: (fn, ms) => { fn(); return 0; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => fn(),
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    history: { scrollRestoration: 'auto', pushState() {}, replaceState() {}, back() {}, go() {} },
    location: { href: 'https://sydneyginza.github.io/', pathname: '/', search: '', hash: '', origin: 'https://sydneyginza.github.io', replace() {}, assign() {} },
    Notification: { permission: 'default', requestPermission: async () => 'default' },
    PushManager: class {},
    alert() {},
    confirm() { return false; },
    scrollTo() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    RegExp,
    Error,
    Map,
    Set,
    Promise,
    URL,
    URLSearchParams,
    isNaN,
    isFinite,
    parseInt,
    parseFloat,
    decodeURIComponent,
    encodeURIComponent,
    escape: globalThis.escape || ((s) => s),
    unescape: globalThis.unescape || ((s) => s),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    innerWidth: 1024,
    innerHeight: 768,
    scrollY: 0,
    devicePixelRatio: 1,
    performance: { now: () => Date.now() },
    ...overrides,
  };

  // Make window reference itself
  ctx.window = ctx;

  const sandbox = vm.createContext(ctx);

  for (const file of files) {
    const filePath = path.resolve(__dirname, '../../js', file);
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }

  // Helper to run arbitrary code inside the sandbox
  const run = (code) => vm.runInContext(code, sandbox);

  return { ctx: sandbox, elements, storage, run };
}

module.exports = { createTestContext };
