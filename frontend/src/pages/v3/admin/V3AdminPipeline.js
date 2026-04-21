import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Clock } from 'lucide-react';

const V3AdminPipeline = () => {
  const navigate = useNavigate();
  const columns = v3Stages.map(s => ({
    ...s,
    projects: v3Projects.filter(p => p.stage === s.key),
    totalValue: v3Projects.filter(p => p.stage === s.key).reduce((a, p) => a + p.estimatedValue, 0),
  }));

  return (
    <div data-testid="v3-admin-pipeline">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PIPELINE</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Campaign Pipeline</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">{v3Projects.length} projects &middot; {formatNairaV3(v3Projects.reduce((a, p) => a + p.estimatedValue, 0))} total value</p>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.key} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
              <span className="text-[13px] font-semibold" style={{ color: col.color }}>{col.label}</span>
              <span className="text-[11px] text-[#8A8A8A] ml-auto">{col.projects.length}</span>
              <span className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(col.totalValue)}</span>
            </div>

            {/* Project cards */}
            <div className="space-y-2">
              {col.projects.map(proj => {
                const brand = getBrand(proj.brandId);
                const creator = getCreator(proj.creatorId);
                const rm = getRM(proj.rmId);
                return (
                  <button
                    key={proj.id}
                    onClick={() => navigate(`/v3/admin/projects/${proj.id}`)}
                    className="w-full v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors group"
                    data-testid={`pipeline-card-${proj.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">{brand?.company?.split(' ')[0] || brand?.company}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${proj.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>
                        {proj.engagement}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#5C5C5C] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</p>
                    {creator && (
                      <p className="text-[11px] text-[#8A8A8A] mb-2">with {creator.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#F4F2EC] flex items-center justify-center text-[8px] font-semibold text-[#5C5C5C]">{rm?.initials}</div>
                        <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1"><Clock className="w-3 h-3" />{proj.daysInStage}d</span>
                      </div>
                      <span className="text-[11px] text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span>
                    </div>
                    <p className="text-[10px] text-[#8A8A8A] mt-2 italic">{proj.nextAction}</p>
                  </button>
                );
              })}
              {col.projects.length === 0 && (
                <div className="v3-card p-6 text-center">
                  <p className="text-[#D4CDBF] text-[12px]">No projects in this stage</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default V3AdminPipeline;
