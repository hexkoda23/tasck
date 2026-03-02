import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../shared/Logo';
import Avatar from '../shared/Avatar';
import { 
  Home, 
  GitBranch, 
  Handshake, 
  FolderOpen, 
  Target,
  Users,
  Building2,
  BarChart3,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  Bell,
  Search,
  LogOut,
  Plus,
  Command,
  ChevronRight,
  Wallet,
  Briefcase,
  CheckSquare,
  Shield,
  AlertTriangle,
  Activity,
  Sparkles,
  Star,
  Layout
} from 'lucide-react';

// Navigation items for each role
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
    { icon: Settings, label: 'Settings', path: '/admin/settings' }
  ]
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

  // Handle keyboard shortcut for command palette
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="dashboard-bg flex min-h-screen" data-testid={`${role}-dashboard`}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar w-64 fixed h-screen flex flex-col p-6 z-40">
        {/* Logo */}
        <div className="mb-8">
          <Logo variant="dark" size="sm" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}` || item.path === '/staff' || item.path === '/brand' || item.path === '/creative' || item.path === '/admin' || item.path === '/super-creative'}
                className={({ isActive }) => 
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{user?.name}</div>
              <div className="text-xs text-white/50 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="sidebar-item w-full text-white/50 hover:text-white"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 ml-64 ${showCopilot && role === 'staff' ? 'mr-80' : ''}`}>
        {/* Top Bar */}
        <header className="h-16 border-b border-white/5 bg-[#071426]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Search / Command Palette Trigger */}
            <button 
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/50 hover:text-white hover:border-white/20 transition-colors"
              data-testid="search-trigger"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search...</span>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded ml-8">
                <Command className="w-3 h-3 inline mr-1" />K
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {role === 'staff' && (
              <button 
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                data-testid="new-deal-btn"
              >
                <Plus className="w-4 h-4" />
                New Deal
              </button>
            )}

            {/* Notifications */}
            <button className="relative p-2 text-white/50 hover:text-white transition-colors" data-testid="notifications-btn">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF4757] rounded-full"></span>
            </button>

            {/* Copilot Toggle (Staff only) */}
            {role === 'staff' && (
              <button 
                onClick={() => setShowCopilot(!showCopilot)}
                className={`p-2 rounded-lg transition-colors ${showCopilot ? 'bg-[#6BFF9A]/20 text-[#6BFF9A]' : 'text-white/50 hover:text-white'}`}
                data-testid="copilot-toggle"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Copilot Panel (Staff only) */}
      {role === 'staff' && showCopilot && (
        <aside className="copilot-panel w-80 fixed right-0 top-0 h-screen overflow-y-auto z-30 p-6" data-testid="copilot-panel">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#6BFF9A]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#6BFF9A]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">TASCK Copilot</h3>
              <span className="text-xs text-[#6BFF9A]">AI-Powered</span>
            </div>
          </div>
          
          <div className="text-sm text-white/60 space-y-4">
            <p className="animate-pulse-soft">Analyzing your deals and opportunities...</p>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/80 mb-2">3 deals need attention today</p>
              <p className="text-xs">Pipeline velocity is up 15% — you're closing faster this quarter.</p>
            </div>
          </div>
        </aside>
      )}

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32" onClick={() => setShowCommandPalette(false)}>
          <div 
            className="command-palette w-full max-w-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="command-palette"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-white/50" />
                <input 
                  type="text"
                  placeholder="Search commands, deals, projects..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none"
                  autoFocus
                />
                <span className="text-xs text-white/30">ESC to close</span>
              </div>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wide">Quick Actions</div>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:bg-white/5 rounded-lg text-left">
                <Plus className="w-4 h-4" />
                <span>Create Deal</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:bg-white/5 rounded-lg text-left">
                <FolderOpen className="w-4 h-4" />
                <span>Create Project</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:bg-white/5 rounded-lg text-left">
                <Target className="w-4 h-4" />
                <span>Create Opportunity</span>
              </button>
              
              <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wide mt-4">Recent</div>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:bg-white/5 rounded-lg text-left">
                <ChevronRight className="w-4 h-4" />
                <span>Opened Deal Room: Guinness x Burna Boy — 10 min ago</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
