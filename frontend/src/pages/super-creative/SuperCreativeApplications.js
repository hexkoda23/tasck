import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { FileText, Search, CheckCircle, Clock, XCircle, Eye, Star, MapPin } from 'lucide-react';

const applications = [
  {
    id: 'APP-001',
    creative: 'Kelechi Amadi-Obi',
    role: 'Lead Photographer',
    project: 'Don Jazzy x Cadbury Campaign',
    rate: 750000,
    rating: 4.9,
    experience: '6 years',
    location: 'Lagos',
    skills: ['Portrait', 'Product', 'Editorial'],
    status: 'accepted',
    appliedDate: '2026-02-10',
    message: 'I\'d love to work on this project. My experience with Cadbury and brand photography makes me an ideal fit.',
    portfolio: 14
  },
  {
    id: 'APP-002',
    creative: 'Ade Adesanya',
    role: 'Lead Videographer',
    project: 'Don Jazzy x Cadbury Campaign',
    rate: 1200000,
    rating: 4.8,
    experience: '5 years',
    location: 'Lagos',
    skills: ['Commercial', 'Music Video', 'Drone'],
    status: 'accepted',
    appliedDate: '2026-02-11',
    message: 'Ready to deliver world-class video content. My recent MTN work showcases my brand video capabilities.',
    portfolio: 11
  },
  {
    id: 'APP-003',
    creative: 'Ngozi Eze',
    role: 'Graphic Designer',
    project: 'Don Jazzy x Cadbury Campaign',
    rate: 350000,
    rating: 4.6,
    experience: '3 years',
    location: 'Lagos',
    skills: ['Branding', 'Digital', 'Print'],
    status: 'shortlisted',
    appliedDate: '2026-02-20',
    message: 'Experienced in FMCG brand design. My Cadbury and Nestle portfolio speaks for itself.',
    portfolio: 8
  },
  {
    id: 'APP-004',
    creative: 'Emeka Nwosu',
    role: 'Graphic Designer',
    project: 'Don Jazzy x Cadbury Campaign',
    rate: 400000,
    rating: 4.5,
    experience: '4 years',
    location: 'Abuja',
    skills: ['UI/UX', 'Print', 'Motion Graphics'],
    status: 'pending',
    appliedDate: '2026-02-22',
    message: 'Strong background in motion graphics and print design for major Nigerian brands.',
    portfolio: 6
  },
  {
    id: 'APP-005',
    creative: 'Yemi Alade',
    role: 'Sound Engineer',
    project: 'Mavin Concert Tour',
    rate: 550000,
    rating: 4.7,
    experience: '8 years',
    location: 'Lagos',
    skills: ['Live Sound', 'Mixing', 'PA Systems'],
    status: 'pending',
    appliedDate: '2026-02-25',
    message: '8+ years as a live sound engineer. Have worked on Davido, Wizkid, and Tiwa Savage tours.',
    portfolio: 20
  },
  {
    id: 'APP-006',
    creative: 'Bola Tinubu Jr.',
    role: 'Lighting Designer',
    project: 'Mavin Concert Tour',
    rate: 1100000,
    rating: 4.4,
    experience: '5 years',
    location: 'Lagos',
    skills: ['Stage Lighting', 'DMX', 'LED'],
    status: 'rejected',
    appliedDate: '2026-02-18',
    message: 'Experienced lighting designer with international tour experience.',
    portfolio: 4,
    rejectionReason: 'Budget mismatch — another candidate selected at better rate'
  }
];

const formatNaira = (amount) => `₦${(amount / 1000).toFixed(0)}K`;

export const SuperCreativeApplications = () => {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const getStatusStyle = (status) => {
    const styles = {
      pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: Clock },
      shortlisted: { bg: 'bg-[#EEF2FF]', text: 'text-[#2F55FF]', icon: Star },
      accepted: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]', icon: CheckCircle },
      rejected: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', icon: XCircle }
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sc-applications">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Applications</h1>
          <p className="text-[#64748B] text-sm">Review and manage creative applications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Applications</p>
          <p className="text-lg font-bold text-[#0F172A]">{applications.length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Pending Review</p>
          <p className="text-lg font-bold text-[#D97706]">{applications.filter(a => a.status === 'pending').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Shortlisted</p>
          <p className="text-lg font-bold text-[#2F55FF]">{applications.filter(a => a.status === 'shortlisted').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Accepted</p>
          <p className="text-lg font-bold text-[#22C55E]">{applications.filter(a => a.status === 'accepted').length}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'shortlisted', 'accepted', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === f ? 'bg-[#2F55FF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#334155]'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? applications.length : applications.filter(a => a.status === f).length})
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filtered.map((app) => {
          const status = getStatusStyle(app.status);
          const StatusIcon = status.icon;
          return (
            <div key={app.id} className="dashboard-card p-5" data-testid={`application-${app.id}`}>
              <div className="flex items-start gap-4">
                <Avatar name={app.creative} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-[#0F172A] font-semibold text-lg">{app.creative}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${status.bg} ${status.text}`}>
                          <StatusIcon className="w-3 h-3" /> {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-[#64748B] text-sm">Applying for: <span className="text-[#334155]">{app.role}</span> — {app.project}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#22C55E] font-mono text-lg">{formatNaira(app.rate)}</p>
                      <p className="text-[#94A3B8] text-xs">Requested rate</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-3 text-sm text-[#64748B]">
                    <span className="flex items-center gap-1"><Star className="w-4 h-4 text-[#D97706]" /> {app.rating}</span>
                    <span>{app.experience} experience</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {app.location}</span>
                    <span>{app.portfolio} portfolio items</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {app.skills.map((skill) => (
                      <span key={skill} className="text-xs px-3 py-1 rounded-full bg-[#F8FAFC] text-[#64748B]">{skill}</span>
                    ))}
                  </div>

                  <div className="bg-[#F8FAFC] rounded-lg p-3 mb-3">
                    <p className="text-[#475569] text-sm">"{app.message}"</p>
                  </div>

                  {app.rejectionReason && (
                    <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3 mb-3">
                      <p className="text-[#DC2626] text-xs mb-1">Rejection Reason</p>
                      <p className="text-[#475569] text-sm">{app.rejectionReason}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                    <span className="text-[#94A3B8] text-xs">Applied: {app.appliedDate}</span>
                    <div className="flex gap-2">
                      <button className="btn-ghost text-sm flex items-center gap-1"><Eye className="w-4 h-4" /> Portfolio</button>
                      {app.status === 'pending' && (
                        <>
                          <button className="text-sm px-3 py-1.5 rounded-lg bg-[#FEF2F2] text-[#DC2626]">Reject</button>
                          <button className="text-sm px-3 py-1.5 rounded-lg bg-[#EEF2FF] text-[#2F55FF]">Shortlist</button>
                          <button className="btn-primary text-sm">Accept & Hire</button>
                        </>
                      )}
                      {app.status === 'shortlisted' && (
                        <>
                          <button className="text-sm px-3 py-1.5 rounded-lg bg-[#FEF2F2] text-[#DC2626]">Reject</button>
                          <button className="btn-primary text-sm">Accept & Hire</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperCreativeApplications;
