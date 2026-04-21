import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, v3Deliverables, v3BriefResponses, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Briefcase, FolderOpen, Wallet, Upload, ArrowRight, CheckCircle } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorOverview = () => {
  const navigate = useNavigate();
  const creator = getCreator(creatorId);
  const projects = v3Projects.filter(p => p.creatorId === creatorId);
  const allDeliverables = projects.flatMap(p => v3Deliverables[p.id] || []);
  const pendingDeliverables = allDeliverables.filter(d => d.status !== 'approved');
  const pendingBriefs = v3Projects.filter(p => {
    const br = v3BriefResponses[p.id];
    return br && br.creatorId === creatorId && br.interest === 'yes';
  });

  const earnings = allDeliverables.filter(d => d.paymentReleased).length * 11000000;

  return (
    <div data-testid="v3-creator-overview">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Creator Portal</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Welcome back, {creator?.name}</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Your projects and deliverables at a glance.</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Active Projects</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{projects.length}</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Open Briefs</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pendingBriefs.length}</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-[#567B3F]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Pending Uploads</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pendingDeliverables.length}</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-[#9B9380]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Earnings</span>
          </div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(earnings)}</p>
        </div>
      </div>

      {/* Active projects */}
      <div className="mb-8">
        <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Your projects</h2>
        <div className="space-y-2">
          {projects.map(proj => {
            const brand = getBrand(proj.brandId);
            const stage = v3Stages.find(s => s.key === proj.stage);
            const deliverables = v3Deliverables[proj.id] || [];
            return (
              <button key={proj.id} onClick={() => navigate(`/v3/creator/projects`)}
                className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors group"
                data-testid={`creator-proj-${proj.id}`}>
                <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: stage?.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-[#1A1A1A]">{brand?.company?.split(' ')[0]}</span>
                    <span className="text-[11px] text-[#8A8A8A]">&middot;</span>
                    <span className="text-[13px] text-[#5C5C5C]" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A]">{stage?.label} &middot; {proj.nextAction}</p>
                </div>
                <span className="text-[11px] text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4CDBF] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Reliability stats */}
      <div className="v3-card p-5">
        <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Your Performance</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator?.reliability}</p>
            <p className="text-[10px] text-[#8A8A8A] mt-1">Reliability</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator?.onTimeRate}%</p>
            <p className="text-[10px] text-[#8A8A8A] mt-1">On-time Rate</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator?.brandSatisfaction}</p>
            <p className="text-[10px] text-[#8A8A8A] mt-1">Brand Satisfaction</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator?.repeatBrandCount}</p>
            <p className="text-[10px] text-[#8A8A8A] mt-1">Repeat Brands</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3CreatorOverview;
