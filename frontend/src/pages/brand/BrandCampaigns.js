import React from 'react';
import Avatar from '../../components/shared/Avatar';
import { FolderOpen, Search, Plus, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const campaigns = [
  {
    id: 'CMP-001',
    title: 'Guinness x Burna Boy - "Black Shines Brightest"',
    status: 'active',
    artist: 'Spaceship (Burna Boy)',
    budget: 45000000,
    spent: 18500000,
    deliverables: { total: 24, completed: 8, pending: 4, upcoming: 12 },
    startDate: '2026-02-15',
    endDate: '2026-05-30',
    progress: 35,
    type: 'Brand Activation'
  },
  {
    id: 'CMP-002',
    title: 'Guinness Foreign Extra - "Made of Black" Q2',
    status: 'active',
    artist: 'DMW (Davido)',
    budget: 38000000,
    spent: 22300000,
    deliverables: { total: 18, completed: 11, pending: 3, upcoming: 4 },
    startDate: '2026-01-10',
    endDate: '2026-04-15',
    progress: 62,
    type: 'Brand Campaign'
  },
  {
    id: 'CMP-003',
    title: 'Smithwick\'s x Don Jazzy - Music Series',
    status: 'review',
    artist: 'Mavin Records (Don Jazzy)',
    budget: 25000000,
    spent: 24200000,
    deliverables: { total: 12, completed: 11, pending: 1, upcoming: 0 },
    startDate: '2025-11-01',
    endDate: '2026-02-28',
    progress: 92,
    type: 'Content Series'
  },
  {
    id: 'CMP-004',
    title: 'Harp Lager - Festive Season 2025',
    status: 'completed',
    artist: 'YBNL (Olamide)',
    budget: 15000000,
    spent: 14800000,
    deliverables: { total: 10, completed: 10, pending: 0, upcoming: 0 },
    startDate: '2025-10-15',
    endDate: '2025-12-31',
    progress: 100,
    type: 'Seasonal Campaign'
  }
];

const formatNaira = (amount) => `₦${(amount / 1000000).toFixed(1)}M`;

const getStatusBadge = (status) => {
  const styles = {
    active: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]', icon: Clock },
    review: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: AlertCircle },
    completed: { bg: 'bg-[#EEF2FF]', text: 'text-[#2F55FF]', icon: CheckCircle },
    draft: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', icon: Clock }
  };
  return styles[status] || styles.draft;
};

export const BrandCampaigns = () => {
  return (
    <div className="space-y-6 animate-fade-in" data-testid="brand-campaigns">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">My Campaigns</h1>
          <p className="text-[#64748B] text-sm">{campaigns.length} campaigns managed by TASCK</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Request Campaign
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Active Campaigns</p>
          <p className="text-lg font-bold text-[#22C55E]">{campaigns.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Budget</p>
          <p className="text-lg font-bold text-[#0F172A] font-mono">₦123M</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Spent</p>
          <p className="text-lg font-bold text-[#0F172A] font-mono">₦79.8M</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Deliverables Completed</p>
          <p className="text-lg font-bold text-[#0F172A]">40/64</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search campaigns..."
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none"
        />
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((campaign) => {
          const status = getStatusBadge(campaign.status);
          const StatusIcon = status.icon;
          return (
            <div key={campaign.id} className="dashboard-card p-5 hover:border-[#C7D2FE] transition-colors cursor-pointer" data-testid={`campaign-${campaign.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[#94A3B8] text-sm">{campaign.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B]">{campaign.type}</span>
                  </div>
                  <h3 className="text-[#0F172A] font-semibold text-lg">{campaign.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar name={campaign.artist} size="sm" />
                    <span className="text-[#64748B]">{campaign.artist}</span>
                  </div>
                </div>
                <button className="btn-ghost text-sm flex items-center gap-1">
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-[#64748B] mb-1">
                  <span>Progress</span>
                  <span className="font-mono">{campaign.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${campaign.progress}%` }}></div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-[#0F172A] font-mono">{formatNaira(campaign.budget)}</p>
                  <p className="text-[#94A3B8] text-xs">Budget</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-[#22C55E] font-mono">{formatNaira(campaign.spent)}</p>
                  <p className="text-[#94A3B8] text-xs">Spent</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-[#0F172A] font-mono">{campaign.deliverables.completed}/{campaign.deliverables.total}</p>
                  <p className="text-[#94A3B8] text-xs">Delivered</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-[#D97706] font-mono">{campaign.deliverables.pending}</p>
                  <p className="text-[#94A3B8] text-xs">Pending</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-[#64748B] text-sm">{campaign.startDate} - {campaign.endDate}</p>
                  <p className="text-[#94A3B8] text-xs">Timeline</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandCampaigns;
