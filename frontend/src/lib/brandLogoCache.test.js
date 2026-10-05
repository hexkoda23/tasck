// Modules are reset per test (the cache is read once at import), so React,
// react-dom and the component are all required fresh inside each test to
// keep a single React copy.

const PINTEREST_FAVICON = 'https://www.google.com/s2/favicons?sz=256&domain=pinterest.com';
const GUCCI_FAVICON = 'https://www.google.com/s2/favicons?sz=256&domain=gucci.com';

// The cache as an earlier build left it in an admin's browser: Gucci's
// website was a Pinterest pin, so Pinterest's favicon loaded and was cached
// under the brand name.
const seedCache = (entries) => {
  window.localStorage.setItem('tasck_brand_logo_cache', JSON.stringify({ version: 3, entries }));
};

const load = () => {
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { act } = require('react-dom/test-utils');
  const { BrandLogo } = require('./brandLogo');
  const render = (props) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => { root.render(React.createElement(BrandLogo, props)); });
    return { container, unmount: () => act(() => root.unmount()) };
  };
  return { render };
};

describe('BrandLogo cache', () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  it('ignores a cached logo that is no longer one of the brand candidates', () => {
    seedCache({ gucci: PINTEREST_FAVICON });
    const { container, unmount } = load().render({ name: 'Gucci', candidates: [] });
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('G');
    unmount();
  });

  it('still uses a cached logo that is a current candidate, ahead of the others', () => {
    seedCache({ gucci: GUCCI_FAVICON });
    const { container, unmount } = load().render({
      name: 'Gucci', candidates: ['https://www.gucci.com/favicon.ico', GUCCI_FAVICON],
    });
    expect(container.querySelector('img').getAttribute('src')).toBe(GUCCI_FAVICON);
    unmount();
  });

  it('never lets the cache displace a stored logo', () => {
    seedCache({ gucci: GUCCI_FAVICON });
    const stored = 'data:image/svg+xml;base64,PHN2Zy8+';
    const { container, unmount } = load().render({ name: 'Gucci', storedLogo: stored, candidates: [GUCCI_FAVICON] });
    expect(container.querySelector('img').getAttribute('src')).toBe(stored);
    unmount();
  });
});
