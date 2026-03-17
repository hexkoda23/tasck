import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/shared/Avatar';
import {
  Home, Radar, GitBranch, Handshake, FolderOpen, Network, Users,
  BarChart3, MessageSquare, Workflow, Settings, Search, Bell, Radio,
  LogOut, ChevronLeft, Building2, Star, CheckSquare, Wallet,
  Target, Sparkles
} from 'lucide-react';

const commandNavConfig = {
  command: [
    { icon: Home, label: 'Command Center', path: '/v2/command' },
    { icon: Radar, label: 'Intelligence', path: '/v2/command/signals' },
    { icon: GitBranch, label: 'Pipeline', path: '/v2/command/pipeline' },
    { icon: Handshake, label: 'Deals', path: '/v2/command/deals' },
    { icon: FolderOpen, label: 'Projects', path: '/v2/command/projects' },
    { icon: Network, label: 'Network', path: '/v2/command/network' },
    { icon: Users, label: 'Talent', path: '/v2/command/talent' },
    { icon: BarChart3, label: 'Revenue', path: '/v2/command/revenue' },
    { divider: true },
    { icon: MessageSquare, label: 'Messages', path: '/v2/command/messages' },
    { icon: Workflow, label: 'Automations', path: '/v2/command/automations' },
    { icon: Settings, label: 'Settings', path: '/v2/command/settings' }
  ],
  brand: [
    { icon: Home, label: 'Overview', path: '/v2/brand' },
    { icon: FolderOpen, label: 'Campaigns', path: '/v2/brand/campaigns' },
    { icon: CheckSquare, label: 'Approvals', path: '/v2/brand/approvals' },
    { icon: Star, label: 'Discover', path: '/v2/brand/discover' },
    { icon: BarChart3, label: 'Analytics', path: '/v2/brand/analytics' },
    { icon: Wallet, label: 'Spend', path: '/v2/brand/spend' },
    { divider: true },
    { icon: MessageSquare, label: 'Messages', path: '/v2/brand/messages' },
    { icon: Settings, label: 'Settings', path: '/v2/brand/settings' }
  ],
  talent: [
    { icon: Home, label: 'Overview', path: '/v2/talent' },
    { icon: Target, label: 'Opportunities', path: '/v2/talent/opportunities' },
    { icon: FolderOpen, label: 'Projects', path: '/v2/talent/projects' },
    { icon: Wallet, label: 'Wallet', path: '/v2/talent/wallet' },
    { icon: Star, label: 'Portfolio', path: '/v2/talent/portfolio' },
    { icon: BarChart3, label: 'Analytics', path: '/v2/talent/analytics' },
    { divider: true },
    { icon: MessageSquare, label: 'Messages', path: '/v2/talent/messages' },
    { icon: Settings, label: 'Settings', path: '/v2/talent/settings' }
  ]
};

const placeholders = [
  "Ask anything... Try: 'Show me deals closing this week'",
  "Find photographers in Lagos rated 4.8+",
  "What's Burna Boy's total revenue?",
  "Create a deal for MTN with Tems",
  "Which artists have no active deals?",
  "Show pipeline by industry"
];

const V2Layout = ({ portal = 'command' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const navItems = commandNavConfig[portal] || commandNavConfig.command;

  // Rotate placeholder
  React.useEffect(() => {
    const interval = setInterval(() => setPlaceholderIdx(i => (i + 1) % placeholders.length), 4000);
    return () => clearInterval(interval);
  }, []);

  // Cmd+K handler
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandBar(true);
      }
      if (e.key === 'Escape') setShowCommandBar(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = (path) => {
    if (path === `/v2/${portal}`) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="v2-shell" data-testid="v2-layout">
      {/* Sidebar */}
      <aside
        className={`v2-sidebar ${sidebarExpanded ? 'v2-sidebar--expanded' : ''}`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        data-testid="v2-sidebar"
      >
        <div className="p-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#2F55FF]/15 flex items-center justify-center">
            <span className="text-[#2F55FF] text-xs font-bold font-mono">T</span>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item, idx) => {
            if (item.divider) return <div key={idx} className="my-2 h-px bg-white/[0.04] mx-2" />;
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`v2-nav-item ${active ? 'v2-nav-item--active' : ''}`}
                data-testid={`v2-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                title={item.label}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                <span className={`v2-nav-label ${sidebarExpanded ? 'v2-nav-label--visible' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-white/[0.04]">
          {portal === 'command' && (
            <button
              onClick={() => navigate('/v2/command/live')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#DC2626]/10 text-[#EF4444] hover:bg-[#DC2626]/20 transition-colors mb-2"
              data-testid="v2-live-btn"
            >
              <Radio className="w-4 h-4" />
              <span className={`text-xs font-medium ${sidebarExpanded ? 'block' : 'hidden'}`}>LIVE</span>
            </button>
          )}
          <button onClick={() => { logout(); navigate('/'); }} className="v2-nav-item text-white/30 hover:text-white/50" data-testid="v2-logout">
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span className={`v2-nav-label ${sidebarExpanded ? 'v2-nav-label--visible' : ''}`}>Exit</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="v2-main">
        {/* Top Bar */}
        <header className="v2-topbar" data-testid="v2-topbar">
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-white/20 text-[10px] font-mono tracking-wider uppercase">
              {portal === 'command' ? 'TASCK COMMAND' : portal === 'brand' ? 'BRAND PORTAL' : 'TALENT NETWORK'}
            </span>
          </div>

          {/* Command Bar Trigger */}
          <button
            onClick={() => setShowCommandBar(true)}
            className="v2-command-trigger flex-1 max-w-2xl mx-6"
            data-testid="v2-command-trigger"
          >
            <Search className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
            <span className="text-white/20 text-xs truncate">{placeholders[placeholderIdx]}</span>
            <span className="text-[9px] text-white/15 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded flex-shrink-0">&#8984;K</span>
          </button>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Online team */}
            <div className="flex items-center -space-x-1.5">
              {['Adenike O.', 'Chidi N.', 'Bola A.'].map(n => <Avatar key={n} name={n} size="sm" className="border-2 border-[#0A0D14]" />)}
              <span className="text-[9px] text-white/25 ml-2">3 online</span>
            </div>

            <button className="relative p-2 text-white/30 hover:text-white/50 transition-colors" data-testid="v2-notifications">
              <Bell className="w-4 h-4" strokeWidth={1.5} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
              <Avatar name={user?.name || 'Tunde Balogun'} size="sm" />
              <span className="text-white/50 text-xs hidden lg:block">{user?.name?.split(' ')[0] || 'Tunde'}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="v2-content">
          <Outlet />
        </main>
      </div>

      {/* Command Bar Modal */}
      {showCommandBar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-28" onClick={() => setShowCommandBar(false)}>
          <div className="v2-command-modal" onClick={e => e.stopPropagation()} data-testid="v2-command-modal">
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-white/25" />
              <input type="text" autoFocus placeholder={placeholders[placeholderIdx]} className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 outline-none" />
              <span className="text-[9px] text-white/15 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">ESC</span>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-white/20 uppercase tracking-wider px-2 mb-2">Quick Actions</p>
              {[
                { icon: Handshake, label: 'Create New Deal', desc: 'Start deal origination wizard' },
                { icon: Radar, label: 'View Signals', desc: 'AI-detected market signals' },
                { icon: BarChart3, label: 'Revenue Dashboard', desc: 'Pipeline and forecast' },
                { icon: Users, label: 'Find Talent', desc: 'Search creative network' },
                { icon: Sparkles, label: 'Ask Copilot', desc: 'Natural language query' }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button key={i} onClick={() => setShowCommandBar(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors text-left">
                    <Icon className="w-4 h-4 text-white/15" />
                    <div><p className="text-xs">{item.label}</p><p className="text-[10px] text-white/20">{item.desc}</p></div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default V2Layout;
