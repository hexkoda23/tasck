// routeGuard
// ---------------------------------------------------------------------------
// The decision behind ProtectedRoute, kept apart from the JSX so it can be
// tested directly: given who is signed in and where they were going, do we
// wait, send them to a login page, or let them through?
//
// The bug this fixes: a brand following the "Alignment Snapshot ready for
// review" email link to /brand/approvals reached no login form. The brand
// portal had no guard at all, and the guarded admin area sent anyone who was
// not signed in to the marketing landing page - a dead end with nothing to log
// in to. Now every guarded area names its own login page, and the page the
// person actually asked for travels with them so the login screen can finish
// the journey.

export const WAIT = 'wait';
export const REDIRECT = 'redirect';
export const RENDER = 'render';

/**
 * @param {object} args
 * @param {boolean} args.loading        auth state still being read from storage
 * @param {boolean} args.isAuthenticated
 * @param {string}  [args.role]         the signed-in user's role
 * @param {string[]} [args.allowedRoles] roles allowed here, if restricted
 * @param {string}  [args.loginPath]    where to send someone not signed in
 * @param {string}  [args.pathname]     where they were trying to go
 * @param {string}  [args.search]
 * @param {boolean} [args.wrongRoleToLogin] send a wrong-role session to
 *   `loginPath` (keeping `from`) instead of the landing page
 */
export const resolveGuard = ({
  loading,
  isAuthenticated,
  role,
  allowedRoles,
  loginPath = '/',
  pathname = '',
  search = '',
  wrongRoleToLogin = false,
  requireBrandAccount = false,
  brandId = null,
}) => {
  // Auth is read from localStorage in an effect, so the first render of a
  // signed-in visitor still looks signed out. Redirecting here would bounce
  // every logged-in person to the login page on a hard refresh.
  if (loading) return { action: WAIT };

  if (!isAuthenticated || (requireBrandAccount && !brandId)) {
    return { action: REDIRECT, to: loginPath, from: `${pathname}${search}` };
  }

  // Signed in but wrong role: usually a different problem from "please log
  // in", so it returns to the landing page. A portal whose own login is the
  // way in (the brand portal, entered with the brand's email and password)
  // opts to send them to that login instead, still carrying the destination.
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (wrongRoleToLogin) {
      return { action: REDIRECT, to: loginPath, from: `${pathname}${search}` };
    }
    return { action: REDIRECT, to: '/', from: null };
  }

  return { action: RENDER };
};

/**
 * Where to land after signing in.
 *
 * Only paths inside `prefix` are honoured, so a stale or crafted `from` cannot
 * redirect someone out of the portal they just signed in to, and the login
 * page itself is never a destination (that would loop).
 */
export const safeDestination = (from, prefix, fallback = prefix, loginPath = null) => {
  if (typeof from !== 'string' || !from.startsWith(prefix)) return fallback;
  if (loginPath && from.startsWith(loginPath)) return fallback;
  return from;
};

export default resolveGuard;
