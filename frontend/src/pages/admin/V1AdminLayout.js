import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useThemeMode } from '../../lib/useThemeMode';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Building2, BriefcaseBusiness, ChevronLeft, ChevronRight, Home, Loader2, LogIn, LogOut, MessageSquare, Moon, PanelLeftClose, Search, Settings, Sun, Trash2, X } from 'lucide-react';
import Logo from '../../components/shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { AssistantProvider } from '../../assistant/AssistantProvider';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { v3AdminMessagesUnreadCount, v3BusinessCaseDuplicatesCount, v3GetBrands, v3ListBusinessCases } from '../../lib/v3api';
import AssistantWidget from '../../assistant/AssistantWidget';

// Per Chioma's clarification: Connect + Framing (Alignment Snapshot,
// Brainstorm, Creator Selection, Creative Brief, Strategy Snapshot) belong
// to the "CRM Brands" area in the top nav, even though their routes live
// under /admin/business-cases/:id/connect/... and /admin/business-cases/:id/frame/...
// The Business Case tab only lights up for Planning, Delivery, and Reporting.
const CRM_BC_SUBPATH_RE = /^\/admin\/business-cases\/[^/]+\/(connect|frame)(\/|$)/;
const BC_BC_SUBPATH_RE = /^\/admin\/business-cases\/[^/]+\/(plan|delivery|reporting)(\/|$)/;

const navItems = [
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
      || pathname === '/admin/import-project'
      || pathname === '/admin/duplicates'
      || /^\/admin\/business-cases\/[^/]+\/?$/.test(pathname)
      || BC_BC_SUBPATH_RE.test(pathname)
    ),
    // Suppress the default startsWith match so /connect|/frame sub-paths
    // don't accidentally light this tab up.
    suppressDefaultStartsWith: true,
  },
  { path: '/admin/overview', label: 'Overview', icon: Home, exact: true },
  {
    path: '/admin/brand-communications',
    label: 'Messages',
    icon: MessageSquare,
    aliases: ['/admin/brand-messages', '/admin/brand-review'],
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
const notificationToastId = (id) => `v1-admin-notification:${id}`;

const V1AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useThemeMode();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const notificationsBoxRef = useRef(null);
  // Topbar search. The box used to be a plain <span>, so it looked like a
  // search field but could not be typed into. It is now a real input over a
  // small client-side index of CRM brands + business cases, loaded once on
  // first focus so it costs nothing on pages the admin never searches from.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(null); // { brands, cases }
  const [searchLoading, setSearchLoading] = useState(false);
  const searchBoxRef = useRef(null);
  const searchInputRef = useRef(null);

  const loadSearchIndex = useCallback(async () => {
    if (searchIndex || searchLoading) return;
    setSearchLoading(true);
    try {
      const [brands, cases] = await Promise.all([
        v3GetBrands().catch(() => []),
        v3ListBusinessCases().catch(() => []),
      ]);
      setSearchIndex({
        brands: Array.isArray(brands) ? brands : [],
        cases: Array.isArray(cases) ? cases : [],
      });
    } finally {
      setSearchLoading(false);
    }
  }, [searchIndex, searchLoading]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !searchIndex) return [];
    const brandNameById = new Map(
      searchIndex.brands.map((b) => [b.id, b.company || b.name || 'Brand']),
    );
    const matches = [];
    for (const brand of searchIndex.brands) {
      const label = brand.company || brand.name || 'Brand';
      const contact = brand.primary_contact || brand.contact_name || '';
      if (label.toLowerCase().includes(q) || String(contact).toLowerCase().includes(q)) {
        matches.push({
          key: `brand-${brand.id}`,
          kind: 'Brand',
          icon: Building2,
          label,
          sub: contact || 'CRM brand',
          path: `/admin/crm-brands/${brand.id}`,
        });
      }
    }
    for (const bc of searchIndex.cases) {
      const label = bc.title || 'Business case';
      const brandLabel = brandNameById.get(bc.brand_id) || '';
      if (label.toLowerCase().includes(q) || brandLabel.toLowerCase().includes(q)) {
        matches.push({
          key: `case-${bc.id}`,
          kind: 'Business case',
          icon: BriefcaseBusiness,
          label,
          sub: brandLabel || 'Business case',
          path: `/admin/business-cases/${bc.id}`,
        });
      }
    }
    return matches.slice(0, 10);
  }, [searchQuery, searchIndex]);

  const openSearchResult = (result) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(result.path);
  };

  // Poll the admin unread-messages count + duplicate-flagger count every 45s
  // so the sidebar badges stay fresh without hammering the API. Also refresh
  // whenever the admin navigates to a new route (fast route-change refresh
  // keeps the badge in sync after opening Messages).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [msg, dupe] = await Promise.all([
          v3AdminMessagesUnreadCount().catch(() => null),
          v3BusinessCaseDuplicatesCount().catch(() => null),
        ]);
        if (cancelled) return;
        if (msg && typeof msg.count === 'number') setMessagesUnread(msg.count);
        if (dupe && typeof dupe.count === 'number') setDuplicatesCount(dupe.count);
      } catch (_) {
        // Silent - badges are best-effort.
      }
    };
    load();
    const timer = setInterval(load, 45000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [location.pathname]);

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
  const handleNewNotification = useCallback((item, markSeen) => {
    toast(item.title || 'Brand action', {
      id: notificationToastId(item.id),
      description: item.message,
      closeButton: true,
      duration: 5000,
      action: item.link ? {
        label: 'Open',
        onClick: () => {
          markSeen(item.id);
          toast.dismiss(notificationToastId(item.id));
          navigate(item.link);
        },
      } : undefined,
    });
  }, [navigate]);

  const { unseen, markSeen, markAllSeen, dismiss } = useAdminNotifications({ onNewItem: handleNewNotification });

  // Close the notifications dropdown on outside pointer input or Escape.
  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const handler = (event) => {
      if (notificationsBoxRef.current && !notificationsBoxRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handler);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notificationsOpen]);

  // Same for the search results dropdown.
  useEffect(() => {
    if (!searchOpen) return undefined;
    const handler = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  const formatNotificationWhen = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <AssistantProvider>
    <div className={`v3-shell ${darkMode ? 'v3-dark' : ''}`} data-testid="v1-admin-layout">
      <aside className={`v3-sidebar ${sidebarCollapsed ? 'v3-sidebar--collapsed' : ''}`} data-testid="v1-admin-sidebar">
        <div className={sidebarCollapsed ? 'p-3 pb-2 flex flex-col items-center' : 'p-5 pb-3'}>
          {/* Retract / expand toggle sits at the very top of the sidebar. */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex items-center justify-center rounded-md border border-[#E8E4DB] bg-white text-[#8A8A8A] hover:text-[#1A1A1A] hover:border-[#D4CDBF] transition-colors ${sidebarCollapsed ? 'w-8 h-8 mb-3' : 'w-7 h-7 mb-3 ml-auto'}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-testid="v1-admin-sidebar-toggle"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> : <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />}
          </button>
          <div className="cursor-pointer" onClick={() => navigate('/v1')}>
            <Logo variant="light" size="sm" showText={!sidebarCollapsed} />
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 px-1">
              <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Admin Control Centre</span>
            </div>
          )}
        </div>

        <nav className={`flex-1 space-y-0.5 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(location.pathname, item);
            let badge = 0;
            if (item.label === 'Messages') badge = messagesUnread;
            if (item.label === 'Business Cases') badge = duplicatesCount;
            const badgeLabel = badge > 9 ? '9+' : String(badge);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`v3-nav-item relative ${active ? 'v3-nav-item--active' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`}
                data-testid={navTestId(item.label)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="relative flex-shrink-0">
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {badge > 0 && sidebarCollapsed && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-[#B54A37] text-white text-[9px] font-semibold flex items-center justify-center leading-none"
                      data-testid={`${navTestId(item.label)}-badge`}
                    >
                      {badgeLabel}
                    </span>
                  )}
                </span>
                {!sidebarCollapsed && <span className="text-[13px]">{item.label}</span>}
                {!sidebarCollapsed && badge > 0 && (
                  <span
                    className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#B54A37] text-white text-[10px] font-semibold flex items-center justify-center leading-none"
                    data-testid={`${navTestId(item.label)}-badge`}
                  >
                    {badgeLabel}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-[#E8E4DB] ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <button onClick={() => navigate('/v1')} className={`v3-nav-item text-[#8A8A8A] hover:text-[#5C5C5C] ${sidebarCollapsed ? 'justify-center' : ''}`} data-testid="v1-admin-exit" title={sidebarCollapsed ? 'Exit Portal' : undefined}>
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            {!sidebarCollapsed && <span className="text-[13px]">Exit Portal</span>}
          </button>
        </div>
      </aside>

      <div className={`v3-main ${sidebarCollapsed ? 'v3-main--collapsed' : ''}`}>
        <div className="v3-topbar sticky top-0 z-20 bg-[#FAFAF7]/80 backdrop-blur-md border-b border-[#E8E4DB] px-6 py-2.5 flex items-center gap-3 min-w-0">
          <div className="relative min-w-0" ref={searchBoxRef}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E8E4DB] bg-white min-w-0 focus-within:border-[#1F4A3A] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#8A8A8A] flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => { setSearchOpen(true); loadSearchIndex(); }}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setSearchOpen(false); searchInputRef.current?.blur(); }
                  if (e.key === 'Enter' && searchResults.length > 0) openSearchResult(searchResults[0]);
                }}
                placeholder="Search CRM brands or business cases..."
                aria-label="Search CRM brands or business cases"
                className="w-[260px] max-w-full min-w-0 bg-transparent text-[12px] text-[#1A1A1A] outline-none placeholder:text-[#D4CDBF]"
                data-testid="v1-admin-search-input"
              />
              {searchLoading && <Loader2 className="w-3.5 h-3.5 text-[#8A8A8A] animate-spin flex-shrink-0" />}
              {!searchLoading && searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  className="flex-shrink-0 text-[#8A8A8A] hover:text-[#1A1A1A]"
                  aria-label="Clear search"
                  data-testid="v1-admin-search-clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchOpen && searchQuery.trim() && (
              <div
                className="absolute left-0 top-full mt-2 w-[320px] max-w-[80vw] rounded-[10px] border border-[#E8E4DB] bg-white shadow-2xl z-50 overflow-hidden"
                data-testid="v1-admin-search-results"
              >
                {searchLoading ? (
                  <p className="px-3 py-4 text-[12px] text-[#8A8A8A]">Loading…</p>
                ) : searchResults.length === 0 ? (
                  <p className="px-3 py-4 text-[12px] text-[#8A8A8A]">No brands or business cases match “{searchQuery.trim()}”.</p>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto">
                    {searchResults.map((result) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={result.key}
                          type="button"
                          onClick={() => openSearchResult(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7]"
                          data-testid={`v1-admin-search-result-${result.key}`}
                        >
                          <Icon className="w-3.5 h-3.5 text-[#1F4A3A] flex-shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-medium text-[#1A1A1A] truncate">{result.label}</span>
                            <span className="block text-[11px] text-[#6E6657] truncate">{result.sub}</span>
                          </span>
                          <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-[#8A8A8A]">{result.kind}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
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
                  <div className="flex items-center gap-3">
                    {unseen.length > 0 && (
                      <button type="button" onClick={() => { unseen.forEach((item) => toast.dismiss(notificationToastId(item.id))); markAllSeen(); }} className="text-[11px] text-[#1F4A3A] underline hover:no-underline" data-testid="v1-admin-notifications-mark-all">
                        Mark all seen
                      </button>
                    )}
                    <button type="button" onClick={() => setNotificationsOpen(false)} className="p-1 rounded text-[#8A8A8A] hover:text-[#1A1A1A] hover:bg-[#F4F2EC]" title="Close notifications" aria-label="Close notifications" data-testid="v1-admin-notifications-close">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {unseen.length === 0 ? (
                    <p className="px-3 py-4 text-[12px] text-[#8A8A8A]">No new brand or creator actions.</p>
                  ) : (
                    unseen.slice(0, 12).map((item) => (
                      <div
                        key={item.id}
                        className="w-full flex items-stretch border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] bg-[#FBF4E4]/60"
                        data-testid={`v1-admin-notification-${item.id}`}
                      >
                        <button
                          type="button"
                          onClick={() => { markSeen(item.id); toast.dismiss(notificationToastId(item.id)); setNotificationsOpen(false); if (item.link) navigate(item.link); }}
                          className="flex-1 text-left px-3 py-2 min-w-0"
                          data-testid={`v1-admin-notification-open-${item.id}`}
                        >
                          <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{item.title}</p>
                          <p className="text-[11px] text-[#6E6657] truncate">{item.message}</p>
                          <p className="text-[10px] text-[#8A8A8A] mt-0.5">{formatNotificationWhen(item.when)} · NEW</p>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toast.dismiss(notificationToastId(item.id)); dismiss(item.id); }}
                          className="px-2 flex items-center text-[#8A8A8A] hover:text-[#B54A37] hover:bg-[#FBEDEA] border-l border-[#F4F2EC]"
                          title="Dismiss this notification"
                          aria-label="Dismiss notification"
                          data-testid={`v1-admin-notification-dismiss-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
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
      <AssistantWidget />
    </div>
    </AssistantProvider>
  );
};

export default V1AdminLayout;
