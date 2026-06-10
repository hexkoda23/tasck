import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Stages, formatNairaV3 } from '../../../lib/v3data';
import { v3ListBusinessCases } from '../../../lib/v3api';
import { Clock, Loader2 } from 'lucide-react';

const V3AdminPipeline = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    v3ListBusinessCases({})
      .then((data) => {
        setProjects(Array.isArray(data) ? data : data?.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]" data-testid="v3-admin-pipeline">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading pipeline…</span>
      </div>
    );
  }

  const totalValue = projects.reduce((a, p) => a + (p.estimated_value || 0), 0);

  const columns = v3Stages.map((s) => {
    const stagePros = projects.filter((p) => p.stage === s.key);
    return {
      ...s,
      projects: stagePros,
      totalValue: stagePros.reduce((a, p) => a + (p.estimated_value || 0), 0),
    };
  });

  return (
    <div data-testid="v3-admin-pipeline">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PIPELINE</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
        Campaign Pipeline
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-8">
        {projects.length} project{projects.length !== 1 ? 's' : ''} &middot;{' '}
        {formatNairaV3(totalValue)} total value
      </p>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.key} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
              <span className="text-[13px] font-semibold" style={{ color: col.color }}>
                {col.label}
              </span>
              <span className="text-[11px] text-[#8A8A8A] ml-auto">{col.projects.length}</span>
              <span
                className="text-[10px] text-[#8A8A8A]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(col.totalValue)}
              </span>
            </div>

            {/* Project cards */}
            <div className="space-y-2">
              {col.projects.map((proj) => {
                const pid = proj.id || proj._id;
                return (
                  <button
                    key={pid}
                    onClick={() => navigate(`/v3/admin/business-cases/${pid}`)}
                    className="w-full v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors group"
                    data-testid={`pipeline-card-${pid}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">
                        {proj.brand_name
                          ? proj.brand_name.split(' ')[0]
                          : proj.brand_id?.slice(0, 8) || 'Brand'}
                      </span>
                      {proj.engagement_type && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            proj.engagement_type === 'retainer'
                              ? 'v3-badge-retainer'
                              : 'v3-badge-direct'
                          }`}
                        >
                          {proj.engagement_type}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[13px] text-[#5C5C5C] mb-2"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    >
                      {proj.title}
                    </p>
                    {proj.creator_name && (
                      <p className="text-[11px] text-[#8A8A8A] mb-2">with {proj.creator_name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {proj.rm_name && (
                          <div className="w-5 h-5 rounded-full bg-[#F4F2EC] flex items-center justify-center text-[8px] font-semibold text-[#5C5C5C]">
                            {proj.rm_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                        )}
                        {proj.days_in_stage != null && (
                          <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {proj.days_in_stage}d
                          </span>
                        )}
                      </div>
                      {proj.estimated_value > 0 && (
                        <span
                          className="text-[11px] text-[#1A1A1A]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {formatNairaV3(proj.estimated_value)}
                        </span>
                      )}
                    </div>
                    {proj.next_action && (
                      <p className="text-[10px] text-[#8A8A8A] mt-2 italic">{proj.next_action}</p>
                    )}
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
