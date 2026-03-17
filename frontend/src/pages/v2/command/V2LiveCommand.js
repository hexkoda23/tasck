import React, { useState, useEffect } from 'react';
import { formatNaira } from '../../../lib/utils';
import Avatar from '../../../components/shared/Avatar';
import {
  Radio, TrendingUp, DollarSign, Users, Handshake, Zap,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertTriangle,
  XCircle, Activity, Globe, BarChart3, Sparkles
} from 'lucide-react';

const liveMetrics = [
  { label: 'Pipeline Value', value: '₦847.2M', change: '+₦45M', trend: 'up', icon: TrendingUp, color: '#2F55FF' },
  { label: 'Active Deals', value: '15', change: '+2', trend: 'up', icon: Handshake, color: '#22C55E' },
  { label: 'Revenue YTD', value: '₦234.8M', change: '+₦18M', trend: 'up', icon: DollarSign, color: '#22C55E' },
  { label: 'Burn Rate', value: '₦12.4M/mo', change: '-₦0.8M', trend: 'down', icon: Activity, color: '#F59E0B' },
  { label: 'Team Online', value: '8/12', change: '', trend: 'stable', icon: Users, color: '#8B5CF6' },
  { label: 'Signals Active', value: '12', change: '+3', trend: 'up', icon: Zap, color: '#06B6D4' }
];

const activeDealsFeed = [
  { id: 'D-001', brand: 'Coca-Cola', creative: 'Mavin Records', value: 150000000, stage: 'Scoping', health: 'on-track', action: 'Proposal due Mar 5', color: '#8B5CF6' },
  { id: 'D-002', brand: 'MTN Nigeria', creative: 'Tems', value: 75000000, stage: 'Terms', health: 'at-risk', action: 'Counter-offer pending', color: '#F59E0B' },
  { id: 'D-003', brand: 'Guinness', creative: 'Burna Boy', value: 45000000, stage: 'NDA', health: 'on-track', action: 'Contract with artist team', color: '#06B6D4' },
  { id: 'D-008', brand: 'UBA', creative: 'Fireboy DML', value: 18000000, stage: 'Active', health: 'on-track', action: 'Execution underway', color: '#22C55E' },
  { id: 'D-012', brand: 'Airtel Nigeria', creative: 'Burna Boy', value: 85000000, stage: 'Terms', health: 'on-track', action: 'RFP submitted', color: '#F59E0B' },
  { id: 'D-009', brand: 'Dangote', creative: 'Wizkid', value: 180000000, stage: 'Discovery', health: 'new', action: 'First meeting scheduled', color: '#2F55FF' }
];

const teamActivity = [
  { name: 'Tunde Balogun', role: 'Head of Deals', status: 'In Deal Room — Coca-Cola', time: '2m ago', online: true },
  { name: 'Adenike Okafor', role: 'Account Lead', status: 'Reviewing MTN counter-offer', time: '5m ago', online: true },
  { name: 'Chidi Nwosu', role: 'Deal Manager', status: 'Call with Access Bank', time: '12m ago', online: true },
  { name: 'Bola Adeyemi', role: 'Creative Liaison', status: 'Onboarding Ayra Starr team', time: '18m ago', online: true },
  { name: 'Emeka Obi', role: 'Finance', status: 'Processing UBA escrow release', time: '25m ago', online: true },
  { name: 'Ngozi Eze', role: 'Legal', status: 'Reviewing Guinness NDA', time: '30m ago', online: true },
  { name: 'Yemi Alade', role: 'Talent Scout', status: 'Offline — last active 2h ago', time: '2h ago', online: false },
  { name: 'Kunle Remi', role: 'Ops Lead', status: 'Offline — last active 3h ago', time: '3h ago', online: false }
];

const recentEvents = [
  { time: '2 min ago', event: 'Tunde opened Coca-Cola deal room', type: 'info' },
  { time: '5 min ago', event: 'MTN sent counter-offer: ₦62M → Adenike', type: 'warning' },
  { time: '12 min ago', event: 'Access Bank confirmed meeting Mar 3', type: 'success' },
  { time: '18 min ago', event: 'Star Lager trademark signal detected (92%)', type: 'success' },
  { time: '25 min ago', event: 'UBA escrow ₦12M — release initiated', type: 'success' },
  { time: '32 min ago', event: 'Glo deal for Asake marked as lost', type: 'error' },
  { time: '45 min ago', event: 'Guinness approved ₦45M budget allocation', type: 'success' },
  { time: '1 hr ago', event: 'New signal: Flutterwave hiring Creator Lead', type: 'info' },
  { time: '1.5 hrs ago', event: 'Airtel dropped Creative Counsel agency', type: 'warning' },
  { time: '2 hrs ago', event: 'Coca-Cola YouTube ad spend up 420%', type: 'info' }
];

const V2LiveCommand = () => {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setNow(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 animate-fade-in" data-testid="v2-live-command">
      {/* Live header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20">
            <Radio className="w-3.5 h-3.5 text-[#EF4444] v2-pulse" />
            <span className="text-xs text-[#EF4444] font-bold tracking-wider">LIVE</span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Mission Control</h1>
            <p className="text-white/25 text-[10px]">Real-time operations view</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/20">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[9px] text-white/10">
            {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] v2-pulse" />
        </div>
      </div>

      {/* Top metric tiles */}
      <div className="grid grid-cols-6 gap-3" data-testid="live-metrics">
        {liveMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="v2-card p-4 relative overflow-hidden group hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                <span className="text-[9px] text-white/25 uppercase tracking-wider">{m.label}</span>
              </div>
              <p className="text-white text-lg font-bold font-mono">{m.value}</p>
              {m.change && (
                <div className="flex items-center gap-1 mt-1">
                  {m.trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5 text-[#22C55E]" /> : <ArrowDownRight className="w-2.5 h-2.5 text-[#F59E0B]" />}
                  <span className={`text-[9px] font-mono ${m.trend === 'up' ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>{m.change}</span>
                </div>
              )}
              {/* Subtle animated bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-30" style={{ background: m.color }}>
                <div className="h-full bg-white/20 animate-pulse" style={{ width: `${60 + (tick * 7 + i * 13) % 40}%`, transition: 'width 3s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Active Deals */}
        <div className="space-y-4">
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Handshake className="w-3.5 h-3.5 text-[#2F55FF]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Active Deals</h2>
              <span className="text-[10px] text-white/20 ml-auto">{activeDealsFeed.length}</span>
            </div>
            <div className="space-y-2">
              {activeDealsFeed.map(deal => (
                <div key={deal.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer" data-testid={`live-deal-${deal.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono text-white/20">{deal.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${deal.color}15`, color: deal.color }}>{deal.stage}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ml-auto ${deal.health === 'at-risk' ? 'bg-[#F59E0B] v2-pulse' : deal.health === 'new' ? 'bg-[#2F55FF] v2-pulse' : 'bg-[#22C55E]'}`} />
                  </div>
                  <p className="text-white/70 text-xs font-medium">{deal.brand} &times; {deal.creative}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-white/25">{deal.action}</span>
                    <span className="text-[10px] font-mono text-white/40">{formatNaira(deal.value, { compact: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Event Feed */}
        <div className="space-y-4">
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Event Feed</h2>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-[#22C55E] v2-pulse" />
                <span className="text-[9px] text-white/15">streaming</span>
              </div>
            </div>
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
              {recentEvents.map((evt, i) => (
                <div key={i} className={`flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors ${i === 0 ? 'animate-fade-in' : ''}`}>
                  <span className="text-[9px] font-mono text-white/15 w-16 flex-shrink-0 pt-0.5">{evt.time}</span>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    evt.type === 'success' ? 'bg-[#22C55E]' :
                    evt.type === 'warning' ? 'bg-[#F59E0B]' :
                    evt.type === 'error' ? 'bg-[#EF4444]' :
                    'bg-[#2F55FF]'
                  }`} />
                  <span className="text-xs text-white/40 flex-1">{evt.event}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue target progress */}
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-[#22C55E]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Revenue Target</h2>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <p className="text-2xl font-bold font-mono text-white">₦234.8M</p>
              <p className="text-white/20 text-xs mb-1">/ ₦500M</p>
            </div>
            <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden mb-2">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2F55FF] to-[#22C55E] rounded-full transition-all duration-1000" style={{ width: '47%' }} />
              <div className="absolute inset-y-0 left-[47%] w-3 h-3 bg-white rounded-full v2-pulse -translate-x-1.5" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/15 font-mono">47% achieved</span>
              <span className="text-[9px] text-white/15 font-mono">₦265.2M remaining</span>
            </div>
          </div>
        </div>

        {/* Column 3: Team */}
        <div className="space-y-4">
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Team Activity</h2>
              <span className="text-[10px] text-[#22C55E] ml-auto">{teamActivity.filter(t => t.online).length} online</span>
            </div>
            <div className="space-y-2">
              {teamActivity.map(member => (
                <div key={member.name} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors" data-testid={`live-team-${member.name.split(' ')[0].toLowerCase()}`}>
                  <div className="relative">
                    <Avatar name={member.name} size="sm" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0A0D14] ${member.online ? 'bg-[#22C55E]' : 'bg-white/10'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-medium">{member.name}</p>
                    <p className="text-[10px] text-white/25">{member.role}</p>
                    <p className={`text-[10px] mt-0.5 ${member.online ? 'text-white/40' : 'text-white/15'}`}>{member.status}</p>
                  </div>
                  <span className="text-[9px] text-white/15 font-mono flex-shrink-0">{member.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Copilot status */}
          <div className="v2-card-glow v2-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#2F55FF]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Copilot Status</h2>
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] v2-pulse ml-1" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-1">
                <CheckCircle className="w-3 h-3 text-[#22C55E]/50" />
                <span className="text-[10px] text-white/30">Monitoring 12 market signals</span>
              </div>
              <div className="flex items-center gap-2 py-1">
                <CheckCircle className="w-3 h-3 text-[#22C55E]/50" />
                <span className="text-[10px] text-white/30">Pipeline health scan: OK</span>
              </div>
              <div className="flex items-center gap-2 py-1">
                <AlertTriangle className="w-3 h-3 text-[#F59E0B]/50" />
                <span className="text-[10px] text-[#F59E0B]/50">MTN counter-offer needs response</span>
              </div>
              <div className="flex items-center gap-2 py-1">
                <CheckCircle className="w-3 h-3 text-[#22C55E]/50" />
                <span className="text-[10px] text-white/30">Revenue forecast updated 15m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V2LiveCommand;
