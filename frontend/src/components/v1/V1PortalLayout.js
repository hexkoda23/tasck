import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { getBrandPortalBrand, getBrandPortalSession } from '../../lib/v3brandPortal';
import {
  Briefcase,
  FileCheck,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  Upload,
  User,
  Wallet,
} from 'lucide-react';

const portalConfig = {
  brand: {
    label: 'Brand Portal',
    // Brand portal users must never get bounced back to the V1 role selector
    // (which exposes Admin login). The logo click and the bottom nav button
    // stay inside /brand. Logout is reachable via the top-bar Logout button.
    exitPath: '/brand',
    loginPath: '/brand/login',
    homePath: '/brand',
    // On sign out, send the brand straight to the V1 entry page so the tester
    // can immediately log back in as admin for an easy end-to-end flow.
    signOutUrl: 'https://thcodemo.space/v1',
    items: [
      { path: '/brand', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/brand/projects', label: 'Projects', icon: FolderOpen },
      { path: '/brand/alignment-snapshot', label: 'Alignment Snapshot', icon: FileCheck },
      { path: '/brand/strategy-snapshot', label: 'Strategy Snapshot', icon: Briefcase },
      { path: '/brand/contracts', label: 'Contracts', icon: FileCheck },
      { path: '/brand/reports-feedback', label: 'Reports & Feedback', icon: Upload },
      { path: '/brand/messages', label: 'Messages', icon: MessageSquare },
      { path: '/brand/settings', label: 'Settings', icon: Settings },
    ],
  },
  creator: {
    label: 'Creator Portal',
    // Same lock-down as the brand portal - creators should not be able to
    // bounce out to the role selector and see Admin login.
    exitPath: '/creator',
    loginPath: '/creator/login',
    homePath: '/creator',
    items: [
      { path: '/creator', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/creator/briefs', label: 'Briefs', icon: Briefcase },
      { path: '/creator/projects', label: 'Projects', icon: FolderOpen },
      { path: '/creator/deliverables', label: 'Deliverables', icon: Upload },
      { path: '/creator/wallet', label: 'Wallet', icon: Wallet },
      { path: '/creator/profile', label: 'Profile', icon: User },
      { path: '/creator/messages', label: 'Messages', icon: MessageSquare },
      { path: '/creator/settings', label: 'Settings', icon: Settings },
    ],
  },
};

const navTestId = (portal, label) => `v1-${portal}-nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const V1PortalLayout = ({ portal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const config = portalConfig[portal] || portalConfig.brand;
  const brandSession = portal === 'brand' ? getBrandPortalSession() : null;
  const brand = portal === 'brand' ? getBrandPortalBrand() : null;
  const title = portal === 'brand' && brand ? brand.company : config.label;
  const initials = portal === 'brand' ? brandSession?.initials || 'BR' : 'CR';

  // Sign out, then either redirect to the configured external entry page
  // (brand portal → /v1 for easy admin re-login) or fall back to the portal's
  // own login page.
  const handleSignOut = () => {
    logout();
    if (config.signOutUrl) {
      window.location.href = config.signOutUrl;
      return;
    }
    navigate(config.loginPath);
  };

  const handleSessionButton = () => {
    if (isAuthenticated) {
      handleSignOut();
      return;
    }
    navigate(config.loginPath);
  };

  return (
    <div className={`v3-shell ${darkMode ? 'v3-dark' : ''}`} data-testid={`v1-${portal}-layout`}>
      <aside className="v3-sidebar" data-testid={`v1-${portal}-sidebar`}>
        <div className="p-5 pb-3">
          {/* Logo click stays inside this portal so brand/creator users can't
              bounce out to the V1 role selector (which exposes Admin login). */}
          <div className="cursor-pointer" onClick={() => navigate(config.homePath || '/')}>
            <Logo variant="light" size="sm" />
          </div>
          <div className="mt-3 px-1">
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">{title}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {config.items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <button key={item.path} onClick={() => navigate(item.path)} className={`v3-nav-item ${active ? 'v3-nav-item--active' : ''}`} data-testid={navTestId(portal, item.label)}>
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-[13px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8E4DB]">
          {/* Sign out instead of "Exit Portal" so brand/creator users have a
              clear logout action that returns them to their OWN login page,
              not the V1 role selector. */}
          <button
            onClick={handleSignOut}
            className="v3-nav-item text-[#8A8A8A] hover:text-[#5C5C5C]"
            data-testid={`v1-${portal}-exit`}
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[13px]">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="v3-main">
        <div className="v3-topbar sticky top-0 z-20 bg-[#FAFAF7]/80 backdrop-blur-md border-b border-[#E8E4DB] px-6 py-2.5 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E8E4DB] bg-white min-w-0">
            <Search className="w-3.5 h-3.5 text-[#8A8A8A]" />
            <span className="text-[12px] text-[#D4CDBF]">Search...</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-[#F4F2EC] transition-colors" title={darkMode ? 'Light mode' : 'Dark mode'} data-testid={`v1-${portal}-dark-mode-toggle`}>
            {darkMode ? <Sun className="w-4 h-4 text-[#C49B5F]" /> : <Moon className="w-4 h-4 text-[#8A8A8A]" />}
          </button>
          <button onClick={handleSessionButton} className="v3-btn-secondary text-[12px]" data-testid={`v1-${portal}-session-btn`}>
            {isAuthenticated ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {isAuthenticated ? 'Logout' : 'Login'}
          </button>
          <div className="w-7 h-7 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]" title={user?.name || title}>{initials}</div>
        </div>
        <main className="v3-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default V1PortalLayout;
