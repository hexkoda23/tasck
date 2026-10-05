/* The route-guard scenarios, as a renderable tree.
 *
 * Lives in scripts/ rather than src/__tests__/ on purpose: Create React App's
 * jest collects everything under __tests__, and this file exports helpers
 * instead of declaring jest tests, so it would be reported as an empty suite
 * on `yarn test`. It is driven by scripts/run-route-guard-tests.cjs.
 *
 * It renders the REAL ProtectedRoute against a real router, because the bug it
 * covers was in the wiring, not in the decision: the brand portal had no guard
 * at all, and the guarded admin area sent signed-out visitors to the marketing
 * landing page - so a brand following the "Alignment Snapshot ready for review"
 * email link to /brand/approvals had nothing to log in to.
 */
import React, { useState } from 'react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import AuthContext from '../src/context/AuthContext';
import ProtectedRoute from '../src/components/shared/ProtectedRoute';
import V1BrandLogin from '../src/pages/brand/V1BrandLogin';

const LOGIN_MARKERS = {
  '/brand/login': 'BRAND_LOGIN_PAGE',
  '/v1': 'ROLE_SELECTOR_PAGE',
  '/': 'LANDING_PAGE',
};

/** Landing page stand-in that records the `from` it was handed. */
const Spy = ({ marker, seen }) => {
  const location = useLocation();
  seen.marker = marker;
  seen.from = location.state?.from ?? null;
  return <div>{marker}</div>;
};

export const makeApp = (auth, entry, seen) => (
  <AuthContext.Provider value={auth}>
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        {Object.entries(LOGIN_MARKERS).map(([path, marker]) => (
          <Route key={path} path={path} element={<Spy marker={marker} seen={seen} />} />
        ))}
        {/* Mirrors App.js: brand is brand-only, sending any other session to
            the brand login; admin is role-gated. */}
        <Route
          path="/brand"
          element={(
            <ProtectedRoute allowedRoles={['brand']} wrongRoleToLogin loginPath="/brand/login">
              <div>BRAND_PORTAL<Outlet /></div>
            </ProtectedRoute>
          )}
        >
          <Route path="approvals" element={<span>APPROVALS</span>} />
          <Route path="alignment-snapshot" element={<span>SNAPSHOT</span>} />
        </Route>
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={['admin']} loginPath="/v1">
              <div>ADMIN_PORTAL<Outlet /></div>
            </ProtectedRoute>
          )}
        >
          <Route path="crm-brands" element={<span>CRM</span>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </AuthContext.Provider>
);

export const SIGNED_OUT = { user: null, isAuthenticated: false, loading: false };
export const STILL_LOADING = { user: null, isAuthenticated: false, loading: true };
export const BRAND = { user: { role: 'brand' }, isAuthenticated: true, loading: false };
export const ADMIN = { user: { role: 'admin' }, isAuthenticated: true, loading: false };
export const CREATIVE = { user: { role: 'creative' }, isAuthenticated: true, loading: false };

/* The whole journey of a copied snapshot link, with the REAL brand login page
 * (only its network call is stubbed by the runner): whoever opens the link
 * signs in with the brand's details and lands on the page the link names. */
const StatefulAuth = ({ initialUser, children }) => {
  const [user, setUser] = useState(initialUser);
  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading: false,
    completeLogin: ({ user: next }) => setUser(next),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const makeLoginFlowApp = (initialUser, entry) => (
  <StatefulAuth initialUser={initialUser}>
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/brand/login" element={<V1BrandLogin />} />
        <Route
          path="/brand"
          element={(
            <ProtectedRoute allowedRoles={['brand']} wrongRoleToLogin loginPath="/brand/login">
              <div>BRAND_PORTAL<Outlet /></div>
            </ProtectedRoute>
          )}
        >
          <Route path="approvals" element={<span>APPROVALS</span>} />
        </Route>
        <Route path="/" element={<div>LANDING_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  </StatefulAuth>
);
