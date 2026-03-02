import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../shared/Logo';
import Avatar from '../shared/Avatar';
import { 
  Home, GitBranch, Handshake, FolderOpen, Target, Users, Building2,
  BarChart3, MessageSquare, Calendar, FileText, Settings, Bell, Search,
  LogOut, Plus, Command, ChevronRight, Wallet, Briefcase, CheckSquare,
  Shield, AlertTriangle, Activity, Sparkles, Star, Layout
} from 'lucide-react';

const navigationConfig = {
  staff: [
    { icon: Home, label: 'Overview', path: '/staff' },
    { icon: GitBranch, label: 'Pipeline', path: '/staff/pipeline' },
    { icon: Handshake, label: 'Deals', path: '/staff/deals' },
    { icon: FolderOpen, label: 'Projects', path: '/staff/projects' },
    { icon: Target, label: 'Opportunities', path: '/staff/opportunities' },
    { icon: Users, label: 'Roster', path: '/staff/roster' },
    { icon: Building2, label: 'Brands', path: '/staff/brands' },
    { icon: BarChart3, label: 'Revenue', path: '/staff/revenue' },
    { divider: true },
    { icon: MessageSquare, label: 'Messages', path: '/staff/messages' },
    { icon: Calendar, label: 'Calendar', path: '/staff/calendar' },
    { icon: FileText, label: 'Reports', path: '/staff/reports' },
    { icon: Settings, label: 'Settings', path: '/staff/settings' }
  ],
  brand: [
    { icon: Home, label: 'Overview', path: '/brand' },
    { icon: Star, label: 'Discover Talent', path: '/brand/discover' },
    { icon: FolderOpen, label: 'My Campaigns', path: '/brand/campaigns' },
    { icon: CheckSquare, label: 'Approvals', path: '/brand/approvals' },
    { icon: BarChart3, label: 'Analytics', path: '/brand/analytics' },
    { icon: Wallet, label: 'Spend Tracking', path: '/brand/spend' },
    { divider: true },
    { icon: MessageSquare, label: 'Messages', path: '/brand/messages' },
    { icon: FileText, label: 'Reports', path: '/brand/reports' },
    { icon: Settings, label: 'Settings', path: '/brand/settings' }
  ],
  super_creative: [
    { icon: Home, label: 'Overview', path: '/super-creative' },
    { icon: Layout, label: 'Portfolio', path: '/super-creative/portfolio' },
    { icon: FolderOpen, label: 'Projects', path: '/super-creative/projects' },
    { icon: Target, label: 'Opportunities', path: '/super-creative/opportunities' },
    { icon: FileText, label: 'Applications', path: '/super-creative/applications' },
    { icon: Wallet, label: 'Wallet', path: '/super-creative/wallet' },
    { divider: true },
    { icon: Calendar, label: 'Calendar', path: '/super-creative/calendar' },
    { icon: MessageSquare, label: 'Messages', path: '/super-creative/messages' },
    { icon: Settings, label: 'Settings', path: '/super-creative/settings' }
  ],
  creative: [
    { icon: Home, label: 'Overview', path: '/creative' },
    { icon: Target, label: 'Opportunities', path: '/creative/opportunities' },
    { icon: FolderOpen, label: 'My Projects', path: '/creative/projects' },
    { icon: CheckSquare, label: 'Tasks', path: '/creative/tasks' },
    { icon: Wallet, label: 'Wallet', path: '/creative/wallet' },
    { icon: Layout, label: 'Portfolio', path: '/creative/portfolio' },
    { divider: true },
    { icon: MessageSquare, label: 'Messages', path: '/creative/messages' },
    { icon: Settings, label: 'Settings', path: '/creative/settings' }
  ],
  admin: [
    { icon: Home, label: 'Overview', path: '/admin' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: AlertTriangle, label: 'Disputes', path: '/admin/disputes' },
    { icon: FileText, label: 'Contracts', path: '/admin/contracts' },
    { icon: Activity, label: 'Audit Logs', path: '/admin/audit' },
    { icon: Shield, label: 'Permissions', path: '/admin/permissions' },
    { icon: Wallet, label: 'Wallets', path: '/admin/wallets' },
    { divider: true },
    { icon: Settings, label: 'Settings', path: '/admin/settings' }
  ]
};

const roleLabels = {
  staff: 'Staff Portal',
  brand: 'Brand Portal',
  super_creative: 'Super Creative',
  creative: 'Creative Portal',
  admin: 'Admin Portal'
};

export const DashboardLayout = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCopilot, setShowCopilot] = useState(role === 'staff');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const navItems = navigationConfig[role] || navigationConfig.staff;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') setShowCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="dashboard-bg flex min-h-screen" data-testid={`${role}-dashboard`}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar w-[220px] fixed h-screen flex flex-col z-40">
        {/* Logo + Role */}
        <div className="px-5 pt-6 pb-2 mb-2">
          <Logo variant="dark" size="sm" />
        </div>
        <div className="px-5 mb-5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#6BFF9A]/60 font-medium">
            {roleLabels[role]}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {navItems.map((item, idx) => {
            if (item.divider) return <div key={`div-${idx}`} className="h-px bg-white/5 my-3 mx-2"></div>;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}` || item.path === '/staff' || item.path === '/brand' || item.path === '/creative' || item.path === '/admin' || item.path === '/super-creative'}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80 truncate">{user?.name}</div>
              <div className="text-[11px] text-white/30 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="sidebar-item w-full text-white/40 hover:text-white/70"
            data-testid="logout-btn"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ml-[220px] ${showCopilot && role === 'staff' ? 'mr-80' : ''}`}>
        {/* Top Bar */}
        <header className="h-14 border-b border-white/5 bg-[#0B1221]/90 backdrop-blur-xl sticky top-0 z-30 px-6 flex items-center justify-between">
          <button 
            onClick={() => setShowCommandPalette(true)}
            className="search-bar flex items-center gap-2.5 px-4 py-2 text-white/30 hover:text-white/50 transition-all"
            data-testid="search-trigger"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-sm">Search...</span>
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded ml-8 font-mono tracking-wider">
              ⌘K
            </span>
          </button>

          <div className="flex items-center gap-3">
            {role === 'staff' && (
              <button className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-[0_0_20px_rgba(47,85,255,0.3)]" data-testid="new-deal-btn">
                <Plus className="w-3.5 h-3.5" /> New Deal
              </button>
            )}

            <button className="relative p-2 text-white/35 hover:text-white/60 transition-colors" data-testid="notifications-btn">
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF4757] rounded-full"></span>
            </button>

            {role === 'staff' && (
              <button 
                onClick={() => setShowCopilot(!showCopilot)}
                className={`p-2 rounded-lg transition-all ${showCopilot ? 'bg-[#6BFF9A]/10 text-[#6BFF9A]' : 'text-white/35 hover:text-white/60'}`}
                data-testid="copilot-toggle"
              >
                <Sparkles className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </header>

        <main className="p-8 relative z-[1]">
          <Outlet />
        </main>
      </div>

      {/* Copilot Panel */}
      {role === 'staff' && showCopilot && (
        <aside className="copilot-panel w-80 fixed right-0 top-0 h-screen overflow-y-auto z-30 p-6" data-testid="copilot-panel">
          <div className="flex items-center gap-3 mb-6 pt-1">
            <div className="copilot-icon w-8 h-8 rounded-lg bg-[#6BFF9A]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#6BFF9A]" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">TASCK Copilot</h3>
              <span className="text-[10px] text-[#6BFF9A]/50 uppercase tracking-wider">AI-Powered</span>
            </div>
          </div>

          {/* Typing indicator */}
          <div className="typing-indicator flex items-center gap-1.5 mb-5">
            <span></span><span></span><span></span>
            <span className="text-[11px] text-white/20 ml-1">Thinking...</span>
          </div>
          
          <div className="space-y-4">
            <div className="copilot-insight bg-white/[0.02] rounded-lg py-3 pr-3">
              <p className="text-white/70 text-sm mb-1">3 deals need attention today</p>
              <p className="text-white/30 text-xs">Pipeline velocity is up 15% — you're closing faster this quarter.</p>
            </div>
            <div className="copilot-insight bg-white/[0.02] rounded-lg py-3 pr-3">
              <p className="text-white/70 text-sm mb-1">MTN counter-offer expiring</p>
              <p className="text-white/30 text-xs">Tems ambassador deal drops ₦13M if not responded by Friday.</p>
            </div>
            <div className="copilot-insight bg-white/[0.02] rounded-lg py-3 pr-3">
              <p className="text-white/70 text-sm mb-1">Coca-Cola staffing gap</p>
              <p className="text-white/30 text-xs">Coke Studio project needs 8 opportunities posted. Consider Mavin roster.</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-white/20 text-[10px] uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <button className="text-[11px] rounded-full bg-white/5 text-white/40 px-3 py-1.5 hover:text-white/70 hover:bg-white/8 transition-colors">Draft email</button>
              <button className="text-[11px] rounded-full bg-white/5 text-white/40 px-3 py-1.5 hover:text-white/70 hover:bg-white/8 transition-colors">Summarize pipeline</button>
              <button className="text-[11px] rounded-full bg-white/5 text-white/40 px-3 py-1.5 hover:text-white/70 hover:bg-white/8 transition-colors">Find talent</button>
            </div>
          </div>
        </aside>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-32" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette w-full max-w-xl shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="command-palette">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-white/30" />
                <input 
                  type="text"
                  placeholder="Search commands, deals, projects..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-white/20 font-mono">ESC</span>
              </div>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] text-white/25 uppercase tracking-wider">Quick Actions</div>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-white/60 hover:bg-white/5 rounded-lg text-left text-sm transition-colors">
                <Plus className="w-4 h-4 text-white/25" /> Create Deal
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-white/60 hover:bg-white/5 rounded-lg text-left text-sm transition-colors">
                <FolderOpen className="w-4 h-4 text-white/25" /> Create Project
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-white/60 hover:bg-white/5 rounded-lg text-left text-sm transition-colors">
                <Target className="w-4 h-4 text-white/25" /> Create Opportunity
              </button>
              <div className="px-3 py-2 text-[10px] text-white/25 uppercase tracking-wider mt-2">Recent</div>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-white/50 hover:bg-white/5 rounded-lg text-left text-sm transition-colors">
                <ChevronRight className="w-4 h-4 text-white/15" /> Opened Deal Room: Guinness x Burna Boy — 10 min ago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
