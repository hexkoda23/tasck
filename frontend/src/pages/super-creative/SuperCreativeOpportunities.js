import React from 'react';
import Avatar from '../../components/shared/Avatar';
import { Target, Plus, Search, Users, Clock, Sparkles, CheckCircle } from 'lucide-react';

const opportunities = [
  {
    id: 'OPP-001',
    role: 'Lead Photographer',
    project: 'Don Jazzy x Cadbury Campaign',
    budget: 750000,
    duration: '2 weeks',
    status: 'filled',
    creative: 'Kelechi Amadi-Obi',
    applicants: 8,
    skills: ['Portrait', 'Product', 'Editorial']
  },
  {
    id: 'OPP-002',
    role: 'Lead Videographer',
    project: 'Don Jazzy x Cadbury Campaign',
    budget: 1200000,
    duration: '3 weeks',
    status: 'filled',
    creative: 'Ade Adesanya',
    applicants: 5,
    skills: ['Commercial', 'Music Video', 'Drone']
  },
  {
    id: 'OPP-003',
    role: 'Graphic Designer',
    project: 'Don Jazzy x Cadbury Campaign',
    budget: 400000,
    duration: '2 weeks',
    status: 'open',
    creative: null,
    applicants: 12,
    skills: ['Branding', 'Digital', 'Print']
  },
  {
    id: 'OPP-004',
    role: 'Sound Engineer',
    project: 'Mavin Concert Tour',
    budget: 600000,
    duration: '4 days + rehearsal',
    status: 'open',
    creative: null,
    applicants: 6,
    skills: ['Live Sound', 'Mixing', 'PA Systems']
  },
  {
    id: 'OPP-005',
    role: 'Lighting Designer',
    project: 'Mavin Concert Tour',
    budget: 1200000,
    duration: '4 days + rehearsal',
    status: 'shortlisted',
    creative: null,
    applicants: 4,
    skills: ['Stage Lighting', 'DMX', 'Creative Design']
  },
  {
    id: 'OPP-006',
    role: 'Stage Manager',
    project: 'Mavin Concert Tour',
    budget: 500000,
    duration: '1 week',
    status: 'filled',
    creative: 'Ibrahim Hassan',
    applicants: 7,
    skills: ['Event Management', 'Logistics', 'Communication']
  },
  {
    id: 'OPP-007',
    role: 'Social Media Content Creator',
    project: 'Johnnie Walker x Don Jazzy',
    budget: 350000,
    duration: '3 weeks',
    status: 'filled',
    creative: 'Tolu Akinwande',
    applicants: 15,
    skills: ['Content Creation', 'Reels', 'Copywriting']
  }
];

const formatNaira = (amount) => `₦${(amount / 1000).toFixed(0)}K`;

export const SuperCreativeOpportunities = () => {
  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-[#22C55E]/20 text-[#22C55E]',
      shortlisted: 'bg-[#FFFBEB] text-[#D97706]',
      filled: 'bg-[#EEF2FF] text-[#2F55FF]',
      closed: 'bg-[#F1F5F9] text-[#64748B]'
    };
    return styles[status] || styles.open;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sc-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Opportunities</h1>
          <p className="text-[#64748B] text-sm">Manage job listings and hired talent</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Post Opportunity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Posted</p>
          <p className="text-2xl font-bold text-[#0F172A]">{opportunities.length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Open</p>
          <p className="text-2xl font-bold text-[#22C55E]">{opportunities.filter(o => o.status === 'open').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Filled</p>
          <p className="text-2xl font-bold text-[#2F55FF]">{opportunities.filter(o => o.status === 'filled').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Applications</p>
          <p className="text-2xl font-bold text-[#0F172A]">{opportunities.reduce((sum, o) => sum + o.applicants, 0)}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search opportunities..."
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none"
        />
      </div>

      {/* Opportunities */}
      <div className="dashboard-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Project</th>
              <th>Budget</th>
              <th>Duration</th>
              <th>Applicants</th>
              <th>Hired</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr key={opp.id} className="group cursor-pointer">
                <td>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#2F55FF]" />
                    <div>
                      <p className="text-[#0F172A] font-medium">{opp.role}</p>
                      <div className="flex gap-1 mt-1">
                        {opp.skills.slice(0, 2).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#94A3B8]">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-[#64748B] text-sm">{opp.project}</td>
                <td className="text-[#22C55E] font-mono">{formatNaira(opp.budget)}</td>
                <td className="text-[#64748B] text-sm">{opp.duration}</td>
                <td>
                  <div className="flex items-center gap-1 text-[#64748B]">
                    <Users className="w-4 h-4" /> {opp.applicants}
                  </div>
                </td>
                <td>
                  {opp.creative ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={opp.creative} size="sm" />
                      <span className="text-[#334155] text-sm">{opp.creative}</span>
                    </div>
                  ) : (
                    <span className="text-[#CBD5E1] text-sm">—</span>
                  )}
                </td>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusBadge(opp.status)}`}>{opp.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperCreativeOpportunities;
