import React from 'react';
import { v3Projects, v3Brands, v3Creators, v3Stages, v3Deliverables, formatNairaV3 } from '../../../lib/v3data';
import { BarChart3, TrendingUp, Users, Clock, Target } from 'lucide-react';

const V3AdminInsights = () => {
  const totalValue = v3Projects.reduce((a, p) => a + p.estimatedValue, 0);
  const avgDealSize = Math.round(totalValue / v3Projects.length);
  const retainerCount = v3Projects.filter(p => p.engagement === 'retainer').length;
  const directCount = v3Projects.filter(p => p.engagement === 'direct').length;

  const stageBreakdown = v3Stages.map(s => ({
    ...s,
    count: v3Projects.filter(p => p.stage === s.key).length,
    value: v3Projects.filter(p => p.stage === s.key).reduce((a, p) => a + p.estimatedValue, 0),
  }));

  const avgDaysInStage = Math.round(v3Projects.reduce((a, p) => a + p.daysInStage, 0) / v3Projects.length);

  const topBrands = v3Brands
    .map(b => ({ ...b, projectCount: v3Projects.filter(p => p.brandId === b.id).length, totalValue: v3Projects.filter(p => p.brandId === b.id).reduce((a, p) => a + p.estimatedValue, 0) }))
    .filter(b => b.projectCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  const topCreators = v3Creators
    .map(c => ({ ...c, projectCount: v3Projects.filter(p => p.creatorId === c.id).length, totalValue: v3Projects.filter(p => p.creatorId === c.id).reduce((a, p) => a + p.estimatedValue, 0) }))
    .filter(c => c.projectCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  return (
    <div data-testid="v3-admin-insights">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">INSIGHTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Business Insights</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Aggregate metrics across the pipeline.</p>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Pipeline Value', value: formatNairaV3(totalValue), icon: TrendingUp, color: '#1F4A3A' },
          { label: 'Avg Deal Size', value: formatNairaV3(avgDealSize), icon: BarChart3, color: '#C49B5F' },
          { label: 'Avg Days in Stage', value: avgDaysInStage, icon: Clock, color: '#9B9380' },
          { label: 'Active Brands', value: v3Brands.filter(b => b.status.startsWith('Active')).length, icon: Users, color: '#567B3F' },
        ].map((m, i) => (
          <div key={i} className="v3-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <m.icon className="w-4 h-4" style={{ color: m.color }} strokeWidth={1.5} />
              <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">{m.label}</span>
            </div>
            <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Stage distribution */}
      <div className="v3-card p-5 mb-8">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Pipeline Distribution</h3>
        <div className="flex gap-2 mb-4">
          {stageBreakdown.map(s => (
            <div key={s.key} className="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium text-white" style={{ background: s.color, opacity: s.count > 0 ? 1 : 0.3 }}>
              {s.label} ({s.count})
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {stageBreakdown.map(s => (
            <div key={s.key} className="text-center">
              <p className="text-[11px] text-[#8A8A8A]">{s.label} value</p>
              <p className="text-[13px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Engagement mix */}
        <div className="v3-card p-5">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Engagement Model Mix</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#5C5C5C]">Retainer</span>
                <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{retainerCount}</span>
              </div>
              <div className="h-2 bg-[#E8E4DB] rounded-full overflow-hidden">
                <div className="h-full bg-[#1F4A3A] rounded-full" style={{ width: `${(retainerCount / v3Projects.length) * 100}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#5C5C5C]">Direct</span>
                <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{directCount}</span>
              </div>
              <div className="h-2 bg-[#E8E4DB] rounded-full overflow-hidden">
                <div className="h-full bg-[#9B9380] rounded-full" style={{ width: `${(directCount / v3Projects.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="v3-card p-5">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Project Health</h3>
          <div className="space-y-2">
            {['on-track', 'near-closure', 'new'].map(health => {
              const count = v3Projects.filter(p => p.health === health).length;
              return (
                <div key={health} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${health === 'on-track' ? 'bg-[#1F4A3A]' : health === 'near-closure' ? 'bg-[#567B3F]' : 'bg-[#9B9380]'}`} />
                  <span className="text-[12px] text-[#5C5C5C] capitalize flex-1">{health.replace('-', ' ')}</span>
                  <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top brands and creators */}
      <div className="grid grid-cols-2 gap-6">
        <div className="v3-card p-5">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Top Brands by Value</h3>
          <div className="space-y-2">
            {topBrands.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 py-1.5">
                <span className="text-[10px] text-[#8A8A8A] w-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                <span className="text-[13px] text-[#1A1A1A] flex-1">{b.company.split(' ')[0]}</span>
                <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(b.totalValue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="v3-card p-5">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Top Creators by Value</h3>
          <div className="space-y-2">
            {topCreators.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5">
                <span className="text-[10px] text-[#8A8A8A] w-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                <span className="text-[13px] text-[#1A1A1A] flex-1">{c.name}</span>
                <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(c.totalValue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3AdminInsights;
