import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../components/shared/Logo';
import V3NotificationCenter from './V3NotificationCenter';
import V3CommandK from './V3CommandK';
import { getBrandPortalBrand, getBrandPortalSession } from '../../lib/v3brandPortal';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  FileCheck,
  FileText,
  FolderOpen,
  GitBranch,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Receipt,
  Search,
  Settings,
  Sun,
  Upload,
  User,
  Users,
  Wallet,
} from 'lucide-react';

const navConfig = {
  admin: {
    label: 'Admin Control Centre',
    items: [
      { path: '/v3/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/v3/admin/crm', label: 'CRM Brands', icon: Building2 },
      { path: '/v3/admin/meetings', label: 'Meetings', icon: Calendar },
      { path: '/v3/admin/pipeline', label: 'Pipeline', icon: GitBranch },
      { path: '/v3/admin/projects', label: 'Projects', icon: FolderOpen },
      { path: '/v3/admin/creators', label: 'Creators', icon: Users },
      { path: '/v3/admin/contracts', label: 'Contracts', icon: FileText },
      { path: '/v3/admin/business-cases', label: 'Business Cases', icon: Briefcase },
      { path: '/v3/admin/templates', label: 'Templates', icon: BookOpen },
      { path: '/v3/admin/tasks', label: 'Tasks', icon: CheckSquare },
      { path: '/v3/admin/users', label: 'Users', icon: User },
      { path: '/v3/admin/reports', label: 'Reports', icon: Layers },
      { path: '/v3/admin/insights', label: 'Insights', icon: BarChart3 },
      { path: '/v3/admin/wallet', label: 'Wallet', icon: Wallet },
      { path: '/v3/admin/fees', label: 'Fees', icon: Receipt },
      { path: '/v3/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  brand: {
    label: 'Brand Portal',
    items: [
      { path: '/v3/brand', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/v3/brand/projects', label: 'Projects', icon: FolderOpen },
      { path: '/v3/brand/approvals', label: 'Approvals', icon: CheckSquare },
      { path: '/v3/brand/documents', label: 'Documents', icon: FileCheck },
      { path: '/v3/brand/invoices', label: 'Invoices', icon: Receipt },
      { path: '/v3/brand/messages', label: 'Messages', icon: MessageSquare },
      { path: '/v3/brand/settings', label: 'Settings', icon: Settings },
    ],
  },
  creator: {
    label: 'Creator Portal',
    items: [
      { path: '/v3/creator', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/v3/creator/briefs', label: 'Briefs', icon: Briefcase },
      { path: '/v3/creator/projects', label: 'Projects', icon: FolderOpen },
      { path: '/v3/creator/deliverables', label: 'Deliverables', icon: Upload },
      { path: '/v3/creator/wallet', label: 'Wallet', icon: Wallet },
      { path: '/v3/creator/profile', label: 'Profile', icon: User },
      { path: '/v3/creator/messages', label: 'Messages', icon: MessageSquare },
      { path: '/v3/creator/settings', label: 'Settings', icon: Settings },
    ],
  },
};

class V3RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="v3-card p-6" data-testid="v3-route-error">
          <p className="text-[12px] uppercase tracking-wider text-[#B54A37] mb-2">Route error</p>
          <p className="text-[13px] text-[#1A1A1A]">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const V3Layout = ({ portal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = navConfig[portal];
  const [darkMode, setDarkMode] = useState(false);
  const brandSession = portal === 'brand' ? getBrandPortalSession() : null;
  const brand = portal === 'brand' ? getBrandPortalBrand() : null;

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const navTestId = (label) => `v3-nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className={`v3-shell ${darkMode ? 'v3-dark' : ''}`} data-testid="v3-layout">
      <V3CommandK />

      <aside className="v3-sidebar" data-testid="v3-sidebar">
        <div className="p-5 pb-3">
          <div className="cursor-pointer" onClick={() => navigate('/select')}>
            <Logo variant="light" size="sm" />
          </div>
          <div className="mt-3 px-1">
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">
              {portal === 'brand' && brand ? brand.company : config.label}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {config.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
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
          <button onClick={() => navigate('/v3')} className="v3-nav-item text-[#8A8A8A] hover:text-[#5C5C5C]" data-testid="v3-exit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13px]">Exit Portal</span>
          </button>
        </div>
      </aside>

      <div className="v3-main">
        <div className="v3-topbar sticky top-0 z-20 bg-[#FAFAF7]/80 backdrop-blur-md border-b border-[#E8E4DB] px-6 py-2.5 flex items-center gap-3 min-w-0 overflow-hidden">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E8E4DB] bg-white hover:border-[#D4CDBF] transition-colors cursor-text min-w-0"
            data-testid="search-trigger"
          >
            <Search className="w-3.5 h-3.5 text-[#8A8A8A]" />
            <span className="text-[12px] text-[#D4CDBF]">Search...</span>
            <kbd className="text-[9px] text-[#8A8A8A] bg-[#F4F2EC] px-1 py-0.5 rounded border border-[#E8E4DB] ml-4">Ctrl K</kbd>
          </button>
          <div className="flex-1" />
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-[#F4F2EC] transition-colors" data-testid="dark-mode-toggle" title={darkMode ? 'Light mode' : 'Dark mode'}>
            {darkMode ? <Sun className="w-4 h-4 text-[#C49B5F]" /> : <Moon className="w-4 h-4 text-[#8A8A8A]" />}
          </button>
          <V3NotificationCenter />
          <div className="w-7 h-7 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]">
            {portal === 'admin' ? 'TB' : portal === 'brand' ? brandSession?.initials || 'BR' : 'RE'}
          </div>
        </div>

        <main className="v3-content">
          <V3RouteErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </V3RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default V3Layout;
