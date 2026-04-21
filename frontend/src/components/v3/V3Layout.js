import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../../components/shared/Logo';
import {
  LayoutDashboard, GitBranch, FolderOpen, Building2, Users, FileText,
  BookOpen, BarChart3, Wallet, Settings, Receipt, Layers,
  CheckSquare, FileCheck, MessageSquare, User, Upload, Briefcase
} from 'lucide-react';

const navConfig = {
  admin: {
    label: 'Admin Control Centre',
    items: [
      { path: '/v3/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/v3/admin/pipeline', label: 'Pipeline', icon: GitBranch },
      { path: '/v3/admin/projects', label: 'Projects', icon: FolderOpen },
      { path: '/v3/admin/crm', label: 'CRM — Brands', icon: Building2 },
      { path: '/v3/admin/creators', label: 'Creators', icon: Users },
      { path: '/v3/admin/contracts', label: 'Contracts', icon: FileText },
      { path: '/v3/admin/templates', label: 'Templates', icon: BookOpen },
      { path: '/v3/admin/insights', label: 'Insights', icon: BarChart3 },
      { path: '/v3/admin/reports', label: 'Reports', icon: Layers },
      { path: '/v3/admin/wallet', label: 'Wallet', icon: Wallet },
      { path: '/v3/admin/fees', label: 'Fees', icon: Receipt },
      { path: '/v3/admin/settings', label: 'Settings', icon: Settings },
    ]
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
    ]
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
    ]
  }
};

const V3Layout = ({ portal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = navConfig[portal];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="v3-shell" data-testid="v3-layout">
      {/* Sidebar — always expanded, 240px */}
      <aside className="v3-sidebar" data-testid="v3-sidebar">
        <div className="p-5 pb-3">
          <div className="cursor-pointer" onClick={() => navigate('/select')}><Logo variant="light" size="sm" /></div>
          <div className="mt-3 px-1">
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">{config.label}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {config.items.map(item => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`v3-nav-item ${active ? 'v3-nav-item--active' : ''}`}
                data-testid={`v3-nav-${item.label.toLowerCase().replace(/[\s—]/g, '-')}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-[13px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E8E4DB]">
          <button onClick={() => navigate('/v3')} className="v3-nav-item text-[#8A8A8A] hover:text-[#5C5C5C]" data-testid="v3-exit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[13px]">Exit Portal</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="v3-main">
        <main className="v3-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default V3Layout;
