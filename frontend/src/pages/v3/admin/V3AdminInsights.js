import React, { useState, useEffect } from 'react';
import { v3Stages, formatNairaV3 } from '../../../lib/v3data';
import { v3ListBusinessCases, v3GetBrands, v3GetCreators } from '../../../lib/v3api';
import { BarChart3, TrendingUp, Users, Clock, Loader2 } from 'lucide-react';

const V3AdminInsights = () => {
  const [projects, setProjects] = useState([]);
  const [brands, setBrands] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      v3ListBusinessCases({}).catch(() => []),
      v3GetBrands({}).catch(() => []),
      v3GetCreators().catch(() => []),
    ]).then(([bcData, brandData, creatorData]) => {
      setProjects(Array.isArray(bcData) ? bcData : bcData?.items || []);
      setBrands(Array.isArray(brandData) ? brandData : brandData?.items || []);
      setCreators(Array.isArray(creatorData) ? creatorData : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]"
        data-testid="v3-admin-insights"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading insights…</span>
      </div>
    );
  }

  // Guard for empty data
  if (projects.length === 0 && brands.length === 0 && creators.length === 0) {
    return (
      <div data-testid="v3-admin-insights">
        <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">INSIGHTS</p>
        <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
          Business Insights
        </h1>
        <p className="text-[#8A8A8A] text-sm mb-8">Aggregate metrics across the pipeline.</p>
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <BarChart3 className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No data available yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Insights will populate once brands, creators, and projects are in the system.
          </p>
        </div>
      </div>
    );
  }

  // Derived metrics
  const totalValue = projects.reduce((a, p) => a + (p.estimated_value || 0), 0);
  const avgDealSize = projects.length > 0 ? Math.round(totalValue / projects.length) : 0;
  const retainerCount = projects.filter(
    (p) => p.engagement_type === 'retainer'
  ).length;
  const directCount = projects.filter(
    (p) => p.engagement_type === 'direct'
  ).length;

  const stageBreakdown = v3Stages.map((s) => ({
    ...s,
    count: projects.filter((p) => p.stage === s.key).length,
    value: projects
      .filter((p) => p.stage === s.key)
      .reduce((a, p) => a + (p.estimated_value || 0), 0),
  }));

  const activeBrands = brands.filter((b) =>
    (b.status || '').toLowerCase().startsWith('active')
  ).length;

  const topBrands = brands
    .map((b) => {
      const bid = b.id || b._id;
      const brandProjects = projects.filter((p) => p.brand_id === bid);
      return {
        ...b,
        projectCount: brandProjects.length,
        totalValue: brandProjects.reduce((a, p) => a + (p.estimated_value || 0), 0),
      };
    })
    .filter((b) => b.projectCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  const topCreators = creators
    .map((c) => {
      const cid = c.id || c._id;
      const creatorProjects = projects.filter((p) => p.creator_id === cid);
      return {
        ...c,
        projectCount: creatorProjects.length,
        totalValue: creatorProjects.reduce((a, p) => a + (p.estimated_value || 0), 0),
      };
    })
    .filter((c) => c.projectCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  return (
    <div data-testid="v3-admin-insights">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">INSIGHTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
        Business Insights
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Aggregate metrics across the pipeline.</p>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Pipeline Value',
            value: formatNairaV3(totalValue),
            icon: TrendingUp,
            color: '#1F4A3A',
          },
          {
            label: 'Avg Deal Size',
            value: formatNairaV3(avgDealSize),
            icon: BarChart3,
            color: '#C49B5F',
          },
          {
            label: 'Active Projects',
            value: projects.length,
            icon: Clock,
            color: '#9B9380',
          },
          {
            label: 'Active Brands',
            value: activeBrands || brands.length,
            icon: Users,
            color: '#567B3F',
          },
        ].map((m, i) => (
          <div key={i} className="v3-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <m.icon className="w-4 h-4" style={{ color: m.color }} strokeWidth={1.5} />
              <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">
                {m.label}
              </span>
            </div>
            <p
              className="text-xl font-semibold text-[#1A1A1A]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Stage distribution */}
      <div className="v3-card p-5 mb-8">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">
          Pipeline Distribution
        </h3>
        <div className="flex gap-2 mb-4">
          {stageBreakdown.map((s) => (
            <div
              key={s.key}
              className="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium text-white"
              style={{ background: s.color, opacity: s.count > 0 ? 1 : 0.25 }}
            >
              {s.label} ({s.count})
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3">
          {stageBreakdown.map((s) => (
            <div key={s.key} className="text-center">
              <p className="text-[11px] text-[#8A8A8A]">{s.label} value</p>
              <p
                className="text-[13px] font-medium"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(s.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement mix */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">
              Engagement Model Mix
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Retainer', count: retainerCount, color: '#1F4A3A' },
                { label: 'Direct', count: directCount, color: '#9B9380' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-[#5C5C5C]">{label}</span>
                    <span
                      className="text-[12px] font-medium"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="h-2 bg-[#E8E4DB] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: color,
                        width: projects.length > 0 ? `${(count / projects.length) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">
              Stage Summary
            </h3>
            <div className="space-y-2">
              {stageBreakdown
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="text-[12px] text-[#5C5C5C] capitalize flex-1">
                      {s.label}
                    </span>
                    <span
                      className="text-[12px] font-medium"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {s.count}
                    </span>
                  </div>
                ))}
              {stageBreakdown.every((s) => s.count === 0) && (
                <p className="text-[12px] text-[#8A8A8A]">No projects in pipeline yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top brands and creators */}
      {(topBrands.length > 0 || topCreators.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
              Top Brands by Value
            </h3>
            {topBrands.length === 0 ? (
              <p className="text-[12px] text-[#8A8A8A]">No brand project data yet.</p>
            ) : (
              <div className="space-y-2">
                {topBrands.map((b, i) => (
                  <div key={b.id || b._id} className="flex items-center gap-3 py-1.5">
                    <span
                      className="text-[10px] text-[#8A8A8A] w-4"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[#1A1A1A] flex-1">
                      {(b.company || b.name || 'Brand').split(' ')[0]}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {formatNairaV3(b.totalValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
              Top Creators by Value
            </h3>
            {topCreators.length === 0 ? (
              <p className="text-[12px] text-[#8A8A8A]">No creator project data yet.</p>
            ) : (
              <div className="space-y-2">
                {topCreators.map((c, i) => (
                  <div key={c.id || c._id} className="flex items-center gap-3 py-1.5">
                    <span
                      className="text-[10px] text-[#8A8A8A] w-4"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[#1A1A1A] flex-1">{c.name}</span>
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {formatNairaV3(c.totalValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default V3AdminInsights;
