// ProtectedRoute
// ---------------------------------------------------------------------------
// Guards a portal. Its own module rather than a helper inside App.js so the
// real component - the one the routes use - can be rendered in a test.
//
// The decision itself lives in lib/routeGuard, which keeps this file to the
// React wiring: wait while auth is still being read, send people who are not
// signed in to the right login page carrying where they were headed, and
// otherwise get out of the way.
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { RENDER, WAIT, resolveGuard } from '../../lib/routeGuard';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.allowedRoles] restrict to these roles
 * @param {string} [props.loginPath] where to send someone who is not signed in
 * @param {boolean} [props.wrongRoleToLogin] send the wrong role to loginPath too
 */
const ProtectedRoute = ({ children, allowedRoles, loginPath = '/', wrongRoleToLogin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  const decision = resolveGuard({
    loading,
    isAuthenticated,
    role: user?.role,
    allowedRoles,
    loginPath,
    pathname: location.pathname,
    search: location.search,
    wrongRoleToLogin,
  });

  if (decision.action === WAIT) {
    return (
      <div className="dashboard-bg min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (decision.action !== RENDER) {
    return (
      <Navigate
        to={decision.to}
        replace
        state={decision.from ? { from: decision.from } : undefined}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
