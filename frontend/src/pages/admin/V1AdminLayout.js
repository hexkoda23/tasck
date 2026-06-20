import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, BriefcaseBusiness, ChevronLeft, Home, LogIn, LogOut, Moon, Search, Settings, Sun } from 'lucide-react';
import Logo from '../../components/shared/Logo';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/admin', label: 'Overview', icon: Home, exact: true },
  { path: '/admin/crm-brands', label: 'CRM Brands', icon: Building2, aliases: ['/admin/crm'] },
  { path: '/admin/business-cases', label: 'Business Cases', icon: BriefcaseBusiness },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

const isNavActive = (pathname, item) => {
  if (item.exact) return pathname === item.path;
  if (pathname.startsWith(item.path)) return true;
  return (item.aliases || []).some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
};

const navTestId = (label) => `v1-admin-nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const V1AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  const handleSessionButton = () => {
    if (isAuthenticated) {
      logout();
      navigate('/v1');
      return;
    }
    navigate('/v1');
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