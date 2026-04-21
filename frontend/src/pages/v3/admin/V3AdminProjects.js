import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Search, FolderOpen } from 'lucide-react';

const V3AdminProjects = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="v3-admin-projects">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PROJECTS</p>
      <h1 className="v3-heading text-2xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>All Projects</h1>
      <div className="space-y-2">
        {v3Projects.map(proj => {
          const brand = getBrand(proj.brandId);
          const creator = getCreator(proj.creatorId);
          const rm = getRM(proj.rmId);
          const stage = v3Stages.find(s => s.key === proj.stage);
          return (
            <button key={proj.id} onClick={() => navigate(`/v3/admin/projects/${proj.id}`)}
              className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors"
              data-testid={`project-${proj.id}`}>
              <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: stage?.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-medium text-[#1A1A1A]">{brand?.company?.split(' ')[0]}</span>
                  {creator && <><span className="text-[11px] text-[#8A8A8A]">×</span><span className="text-[13px] text-[#5C5C5C]">{creator.name}</span></>}
                </div>
                <p className="text-[12px] text-[#5C5C5C]" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</p>
              </div>
              <span className={`${proj.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>{proj.engagement}</span>
              <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: stage?.color }}>{stage?.label}</span>
              <span className="text-[12px] text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default V3AdminProjects;
