export const V3_ADMIN_ROUTE_BASE = '/v3/admin';
export const V1_ADMIN_ROUTE_BASE = '/admin';

export const getAdminRouteBase = (pathname = '') => (
  pathname === V1_ADMIN_ROUTE_BASE || pathname.startsWith(`${V1_ADMIN_ROUTE_BASE}/`)
    ? V1_ADMIN_ROUTE_BASE
    : V3_ADMIN_ROUTE_BASE
);

export const adminRoute = (path = '', pathname = typeof window === 'undefined' ? '' : window.location.pathname) => {
  const base = getAdminRouteBase(pathname);
  if (!path || path === '/') return base;
  if (path.startsWith(V3_ADMIN_ROUTE_BASE)) return path.replace(V3_ADMIN_ROUTE_BASE, base);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export const adminRouteWithBase = (base, path = '') => {
  if (!path || path === '/') return base;
  if (path.startsWith(V3_ADMIN_ROUTE_BASE)) return path.replace(V3_ADMIN_ROUTE_BASE, base);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export const V3_BRAND_ROUTE_BASE = '/v3/brand';
export const V1_BRAND_ROUTE_BASE = '/brand';

export const getBrandRouteBase = (pathname = '') => (
  pathname === V1_BRAND_ROUTE_BASE || pathname.startsWith(`${V1_BRAND_ROUTE_BASE}/`)
    ? V1_BRAND_ROUTE_BASE
    : V3_BRAND_ROUTE_BASE
);

export const brandRoute = (path = '', pathname = typeof window === 'undefined' ? '' : window.location.pathname) => {
  const base = getBrandRouteBase(pathname);
  if (!path || path === '/') return base;
  if (path.startsWith(V3_BRAND_ROUTE_BASE)) return path.replace(V3_BRAND_ROUTE_BASE, base);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};
