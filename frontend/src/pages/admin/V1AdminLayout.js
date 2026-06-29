import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Building2, BriefcaseBusiness, ChevronLeft, Home, LogIn, LogOut, Moon, Search, Settings, Sun } from 'lucide-react';
import Logo from '../../components/shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';

// Per Chioma's clarification: Connect + Framing (Alignment Snapshot,
// Brainstorm, Creator Selection, Creative Brief, Strategy Snapshot) belong
// to the "CRM Brands" area in the top nav, even though their routes live
// under /admin/business-cases/:id/connect/... and /admin/business-cases/:id/frame/...
// The Business Case tab only lights up for Planning, Delivery, and Reporting.
const CRM_BC_SUBPATH_RE = /^\/admin\/business-cases\/[^/]+\/(connect|frame)(\/|$)/;
const BC_BC_SUBPATH_RE = /^\/admin\/business-cases\/[^/]+\/(plan|delivery|reporting)(\/|$)/;

const navItems = [
  { path: '/admin', label: 'Overview', icon: Home, exact: true },
  {
    path: '/admin/crm-brands',
    label: 'CRM Brands',
    icon: Building2,
    aliases: ['/admin/crm'],
    // Framing sub-pages still live under /admin/business-cases/:id/(connect|frame)/...
    matchesPath: (pathname) => CRM_BC_SUBPATH_RE.test(pathname),
  },
  {
    path: '/admin/business-cases',
    label: 'Business Cases',
    icon: BriefcaseBusiness,
    // Only Planning, Delivery, and Reporting count as Business Case work.
    // The list page (/admin/business-cases) and the stage-home redirect
    // (/admin/business-cases/:id) also belong here.
    matchesPath: (pathname) => (
      pathname === '/admin/business-cases'
      || /^\/admin\/business-cases\/[^/]+\/?$/.test(pathname)
      || BC_BC_SUBPATH_RE.test(pathname)
    ),
    // Suppress the default startsWith match so /connect|/frame sub-paths
    // don't accidentally light this tab up.
    suppressDefaultStartsWith: true,
  },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

const isNavActive = (pathname, item) => {
  if (item.exact) return pathname === item.path;
  if (item.matchesPath && item.matchesPath(pathname)) return true;
  if (!item.suppressDefaultStartsWith && pathname.startsWith(item.path)) return true;
  return (item.aliases || []).some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
};

const navTestId = (label) => `v1-admin-nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const V1AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsBoxRef = useRef(null);

  const handleSessionButton = () => {
    if (isAuthenticated) {
      logout();
      navigate('/v1');
      return;
    }
    navigate('/v1');
  };

  // Sonner toast on every NEW brand/creator action (alignment approved,
  // strategy approved, contract signed, brief responded). Clicking the toast
  // opens the related page. Toasts only fire for ids the hook has not yet
  // announced - acknowledgement is stored in localStorage so the admin never
  // sees the same toast twice.
  const handleNewNotification = useCallback((item) => {
    toast(item.title || 'Brand action', {
      description: item.message,
      duration: 8000,
      action: item.link ? {
        label: 'Open',
        onClick: () => navigate(item.link),
      } : undefined,
    });
  }, [navigate]);

  const { items: notifications, unseen, markSeen, markAllSeen } = useAdminNotifications({ onNewItem: handleNewNotification });

  // Close the notifications dropdown when clicking elsewhere.
  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const handler = (event) => {
      if (notificationsBoxRef.current && !notificationsBoxRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  const formatNotificationWhen = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className={`v3-shell ${darkMode ? 'v3-dark' : ''}`} data-testid="v1-admin-layout">
      <aside className="v3-sidebar" data-testid="v1-admin-sidebar">
        <div className="p-5 pb-3">
          <div className="cursor-pointer" onClick={() => navigate('/select')}>
            <Logo variant="light" size="sm" />
          </div>
          <div className="mt-3 px-1">
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Admin Control Centre</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(location.pathname, item);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`v3-nav-item ${active ? 'v3-nav-item--active' : ''}`}
                data-testid={navTestId(item.label)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-[13px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8E4DB]">
          <button onClick={() => navigate('/v1')} className="v3-nav-item text-[#8A8A8A] hover:text-[#5C5C5C]" data-testid="v1-admin-exit">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[13px]">Exit Portal</span>
          </button>
        </div>
      </aside>

      <div className="v3-main">
        <div className="v3-topbar sticky top-0 z-20 bg-[#FAFAF7]/80 backdrop-blur-md border-b border-[#E8E4DB] px-6 py-2.5 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E8E4DB] bg-white min-w-0">
            <Search className="w-3.5 h-3.5 text-[#8A8A8A]" />
            <span className="text-[12px] text-[#D4CDBF]">Search CRM brands or business cases...</span>
          </div>
          <div className="flex-1" />
          {/* Bell + unseen badge + dropdown of recent brand/creator actions. */}
          <div className="relative" ref={notificationsBoxRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative p-2 rounded-lg hover:bg-[#F4F2EC] transition-colors"
              data-testid="v1-admin-notifications-toggle"
              title={unseen.length ? `${unseen.length} new` : 'Notifications'}
            >
              <Bell className="w-4 h-4 text-[#8A8A8A]" />
              {unseen.length > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#B54A37] text-white text-[10px] font-semibold flex items-center justify-center"
                  data-testid="v1-admin-notifications-count"
                >
                  {unseen.length > 9 ? '9+' : unseen.length}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-[10px] border border-[#E8E4DB] bg-white shadow-2xl z-50" data-testid="v1-admin-notifications-dropdown">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E4DB]">
                  <p className="text-[12px] font-semibold text-[#1A1A1A]">Recent actions</p>
                  {unseen.length > 0 && (
                    <button type="button" onClick={() => { markAllSeen(); }} className="text-[11px] text-[#1F4A3A] underline hover:no-underline" data-testid="v1-admin-notifications-mark-all">
                      Mark all seen
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-[12px] text-[#8A8A8A]">No brand or creator actions yet.</p>
                  ) : (
                    notifications.slice(0, 12).map((item) => {
                      const isUnseen = unseen.some((u) => u.id === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { markSeen(item.id); setNotificationsOpen(false); if (item.link) navigate(item.link); }}
                          className={`w-full text-left px-3 py-2 border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] ${isUnseen ? 'bg-[#FBF4E4]/60' : ''}`}
                          data-testid={`v1-admin-notification-${item.id}`}
                        >
                          <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{item.title}</p>
                          <p className="text-[11px] text-[#6E6657] truncate">{item.message}</p>
                          <p className="text-[10px] text-[#8A8A8A] mt-0.5">{formatNotificationWhen(item.when)}{isUnseen && ' · NEW'}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-[#F4F2EC] transition-colors" data-testid="v1-admin-dark-mode-toggle" title={darkMode ? 'Light mode' : 'Dark mode'}>
            {darkMode ? <Sun className="w-4 h-4 text-[#C49B5F]" /> : <Moon className="w-4 h-4 text-[#8A8A8A]" />}
          </button>
          <button onClick={handleSessionButton} className="v3-btn-secondary text-[12px]" data-testid="v1-admin-session-btn">
            {isAuthenticated ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {isAuthenticated ? 'Logout' : 'Login'}
          </button>
          <div className="w-7 h-7 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]">TB</div>
        </div>

        <main className="v3-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default V1AdminLayout;