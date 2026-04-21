import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, v3Deliverables, getBrand, getCreator, formatNairaV3 } from '../../../lib/v3data';
import { Clock, ArrowRight } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandProjects = () => {
  const navigate = useNavigate();
  const projects = v3Projects.filter(p => p.brandId === brandId);

  return (
    <div data-testid="v3-brand-projects">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PROJECTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Your Campaigns</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>

      <div className="space-y-3">
        {projects.map(proj => {
          const creator = getCreator(proj.creatorId);
          const stage = v3Stages.find(s => s.key === proj.stage);
          const deliverables = v3Deliverables[proj.id] || [];
          const progress = deliverables.length > 0 ? Math.round((deliverables.filter(d => d.status === 'approved').length / deliverables.length) * 100) : 0;

          return (
            <button key={proj.id} onClick={() => navigate(`/v3/brand/projects/${proj.id}`)}
              className="w-full v3-card p-5 text-left hover:border-[#D4CDBF] transition-colors group"
              data-testid={`brand-proj-${proj.id}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: stage?.color }} />
                <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: stage?.color }}>{stage?.label}</span>
                <span className={`ml-auto ${proj.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>{proj.engagement}</span>
              </div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</h2>
              <p className="text-[12px] text-[#8A8A8A] mb-3">{creator ? `with ${creator.name}` : 'Creator matching in progress'}</p>

              <div className="flex items-center gap-6 text-[12px]">
                <div>
                  <span className="text-[#8A8A8A]">Value: </span>
                  <span className="text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#8A8A8A]" />
                  <span className="text-[#8A8A8A]">{proj.daysInStage} days in stage</span>
                </div>
                {deliverables.length > 0 && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[#8A8A8A]">Progress:</span>
                    <div className="flex-1 h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1F4A3A] rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{progress}%</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#8A8A8A] mt-3 italic">{proj.nextAction}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default V3BrandProjects;
