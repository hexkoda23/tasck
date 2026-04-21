import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, v3Deliverables, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { FolderOpen, Clock, CheckCircle, Circle, ArrowRight, FileText } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandOverview = () => {
  const navigate = useNavigate();
  const brand = getBrand(brandId);
  const projects = v3Projects.filter(p => p.brandId === brandId);
  const allProjects = v3Projects.filter(p => ['brand-cocacola', 'brand-guinness', 'brand-mtn'].includes(p.brandId));

  const pendingApprovals = [
    { id: 'appr-1', project: 'Share a Coke, Share a Story', type: 'Alignment Snapshot', status: 'awaiting_review', date: '10 March 2026' },
  ];

  return (
    <div data-testid="v3-brand-overview">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Brand Portal</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Welcome back, Folake</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Here's what's happening with your campaigns.</p>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Active Projects</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{projects.length}</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Pending Approvals</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pendingApprovals.length}</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-[#567B3F]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Total Investment</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(projects.reduce((a, p) => a + p.estimatedValue, 0))}</p>
        </div>
      </div>

      {/* Pending approvals */}
      {pendingApprovals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Requires your attention</h2>
          <div className="space-y-2">
            {pendingApprovals.map(appr => (
              <button key={appr.id} onClick={() => navigate('/v3/brand/approvals')}
                className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors group border-l-3" style={{ borderLeftColor: '#C49B5F', borderLeftWidth: 3 }}
                data-testid={`approval-${appr.id}`}>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{appr.project}</p>
                  <p className="text-[12px] text-[#8A8A8A]">{appr.type} — ready for your review</p>
                </div>
                <span className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{appr.date}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4CDBF] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Your projects</h2>
        <div className="space-y-2">
          {projects.map(proj => {
            const creator = getCreator(proj.creatorId);
            const stage = v3Stages.find(s => s.key === proj.stage);
            const deliverables = v3Deliverables[proj.id] || [];
            const approvedCount = deliverables.filter(d => d.status === 'approved').length;
            return (
              <button key={proj.id} onClick={() => navigate(`/v3/brand/projects/${proj.id}`)}
                className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors group"
                data-testid={`brand-project-${proj.id}`}>
                <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: stage?.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</p>
                  <p className="text-[11px] text-[#8A8A8A]">{creator ? `with ${creator.name}` : 'Creator pending'} &middot; {stage?.label}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {deliverables.length > 0 && (
                    <span className="text-[10px] text-[#8A8A8A]">{approvedCount}/{deliverables.length} deliverables</span>
                  )}
                  <span className="text-[11px] text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4CDBF] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default V3BrandOverview;
