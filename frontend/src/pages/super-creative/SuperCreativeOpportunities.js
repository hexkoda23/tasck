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
      open: 'bg-[#6BFF9A]/20 text-[#6BFF9A]',
      shortlisted: 'bg-[#FFA502]/20 text-[#FFA502]',
      filled: 'bg-[#2F55FF]/20 text-[#2F55FF]',
      closed: 'bg-white/10 text-white/50'
    };
    return styles[status] || styles.open;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sc-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-white/50 text-sm">Manage job listings and hired talent</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Post Opportunity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Total Posted</p>
          <p className="text-2xl font-bold text-white">{opportunities.length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Open</p>
          <p className="text-2xl font-bold text-[#6BFF9A]">{opportunities.filter(o => o.status === 'open').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Filled</p>
          <p className="text-2xl font-bold text-[#2F55FF]">{opportunities.filter(o => o.status === 'filled').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Total Applications</p>
          <p className="text-2xl font-bold text-white">{opportunities.reduce((sum, o) => sum + o.applicants, 0)}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search opportunities..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none"
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
                      <p className="text-white font-medium">{opp.role}</p>
                      <div className="flex gap-1 mt-1">
                        {opp.skills.slice(0, 2).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-white/60 text-sm">{opp.project}</td>
                <td className="text-[#6BFF9A] font-mono">{formatNaira(opp.budget)}</td>
                <td className="text-white/60 text-sm">{opp.duration}</td>
                <td>
                  <div className="flex items-center gap-1 text-white/60">
                    <Users className="w-4 h-4" /> {opp.applicants}
                  </div>
                </td>
                <td>
                  {opp.creative ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={opp.creative} size="sm" />
                      <span className="text-white/80 text-sm">{opp.creative}</span>
                    </div>
                  ) : (
                    <span className="text-white/30 text-sm">—</span>
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
