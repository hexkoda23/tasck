import { resolveGuard } from './routeGuard';

test('a demo brand session without a real CRM account goes to login with the document preserved', () => {
  expect(resolveGuard({ loading: false, isAuthenticated: true, role: 'brand',
    requireBrandAccount: true, allowedRoles: ['brand'], loginPath: '/brand/login',
    pathname: '/brand/alignment-snapshot', search: '?doc=snap-1' })).toEqual({
    action: 'redirect', to: '/brand/login', from: '/brand/alignment-snapshot?doc=snap-1',
  });
});

test('a real signed-in brand can open its portal', () => {
  expect(resolveGuard({ loading: false, isAuthenticated: true, role: 'brand', brandId: 'brand-1',
    requireBrandAccount: true, allowedRoles: ['brand'] }).action).toBe('render');
});
