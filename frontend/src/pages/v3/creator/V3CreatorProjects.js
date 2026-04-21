import React from 'react';
import { v3Projects, v3Stages, v3Deliverables, getBrand, formatNairaV3 } from '../../../lib/v3data';
import { FolderOpen, Clock, ArrowRight } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorProjects = () => {
  const projects = v3Projects.filter(p => p.creatorId === creatorId);

  return (
    <div data-testid="v3-creator-projects">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PROJECTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Your Projects</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>

      <div className="space-y-3">
        {projects.map(proj => {
          const brand = getBrand(proj.brandId);
          const stage = v3Stages.find(s => s.key === proj.stage);
          const deliverables = v3Deliverables[proj.id] || [];
          const approvedCount = deliverables.filter(d => d.status === 'approved').length;

          return (
            <div key={proj.id} className="v3-card p-5" data-testid={`creator-project-${proj.id}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: stage?.color }} />
                <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: stage?.color }}>{stage?.label}</span>
                <span className={`ml-auto ${proj.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>{proj.engagement}</span>
              </div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</h2>
              <p className="text-[12px] text-[#8A8A8A] mb-3">for {brand?.company?.split(' ')[0]}</p>

              <div className="flex items-center gap-6 text-[12px] mb-3">
                <div><span className="text-[#8A8A8A]">Value: </span><span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span></div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#8A8A8A]" /><span className="text-[#8A8A8A]">{proj.daysInStage}d in stage</span></div>
                {deliverables.length > 0 && <div><span className="text-[#8A8A8A]">Deliverables: </span><span className="font-medium">{approvedCount}/{deliverables.length}</span></div>}
              </div>

              {deliverables.length > 0 && (
                <div className="h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-[#1F4A3A] rounded-full transition-all" style={{ width: `${Math.round((approvedCount / deliverables.length) * 100)}%` }} />
                </div>
              )}

              <p className="text-[11px] text-[#8A8A8A] italic">{proj.nextAction}</p>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="v3-card p-8 text-center">
            <FolderOpen className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
            <p className="text-[14px] text-[#8A8A8A]">No active projects yet. Check your briefs for new opportunities.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default V3CreatorProjects;
