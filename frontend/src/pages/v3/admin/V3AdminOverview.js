import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3Brands, v3Creators, v3RMs, v3Stages, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { AlertCircle, ArrowRight, Clock, FolderOpen, GitBranch, TrendingUp, Users } from 'lucide-react';

const V3AdminOverview = () => {
  const navigate = useNavigate();
  const needsAttention = v3Projects.filter(p => p.nextAction);
  const totalValue = v3Projects.reduce((a, p) => a + p.estimatedValue, 0);
  const stageDistribution = v3Stages.map(s => ({
    ...s, count: v3Projects.filter(p => p.stage === s.key).length,
    value: v3Projects.filter(p => p.stage === s.key).reduce((a, p) => a + p.estimatedValue, 0),
  }));

  return (
    <div data-testid="v3-admin-overview">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Admin Control Centre</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Today</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">What needs your attention right now.</p>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Projects', value: v3Projects.length, icon: FolderOpen, color: '#1F4A3A' },
          { label: 'Pipeline Value', value: formatNairaV3(totalValue), icon: TrendingUp, color: '#C49B5F' },
          { label: 'Brands', value: v3Brands.length, icon: Users, color: '#9B9380' },
          { label: 'Creators', value: v3Creators.length, icon: Users, color: '#567B3F' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="v3-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} />
                <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-[#1A1A1A] text-xl font-semibold v3-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline at a glance */}
      <div className="v3-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
          <h2 className="text-[13px] font-semibold text-[#1A1A1A]">Pipeline</h2>
        </div>
        <div className="flex gap-3">
          {stageDistribution.map(s => (
            <div key={s.key} className="flex-1 p-3 rounded-lg" style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</span>
              </div>
              <p className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.count}</p>
              <p className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Needs attention */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
          <h2 className="text-[13px] font-semibold text-[#1A1A1A]">Needs your attention</h2>
          <span className="text-[10px] text-[#8A8A8A] ml-auto">{needsAttention.length} items</span>
        </div>
        <div className="space-y-2">
          {needsAttention.map(proj => {
            const brand = getBrand(proj.brandId);
            const stage = v3Stages.find(s => s.key === proj.stage);
            return (
              <button
                key={proj.id}
                onClick={() => navigate(`/v3/admin/projects/${proj.id}`)}
                className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors group"
                data-testid={`attention-${proj.id}`}
              >
                <div className="w-2 h-full rounded-full flex-shrink-0" style={{ background: stage?.color, minHeight: 40 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-[#1A1A1A]">{brand?.company?.split(' ')[0]}</span>
                    <span className="text-[11px] text-[#8A8A8A]">—</span>
                    <span className="text-[13px] text-[#5C5C5C] truncate" style={{ fontFamily: "'Fraunces', serif" }}>{proj.title}</span>
                  </div>
                  <p className="text-[12px] text-[#8A8A8A]">{proj.nextAction}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${proj.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>
                    {proj.engagement}
                  </span>
                  <span className="text-[10px] text-[#8A8A8A] flex items-center gap-1"><Clock className="w-3 h-3" />{proj.daysInStage}d</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4CDBF] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Recent activity</h2>
        <div className="space-y-1">
          {[
            { time: '2 hours ago', text: 'Temi Bakare generated Alignment Snapshot for Coca-Cola × Tems', stage: 'frame' },
            { time: '5 hours ago', text: 'Adaeze Obi drafted Creative Snapshot v1 for Guinness × Rema', stage: 'plan' },
            { time: '1 day ago', text: 'MTN approved all remaining deliverables for Lagos Unlimited', stage: 'deliver' },
            { time: '1 day ago', text: 'Rema submitted brief response for Made of More: Africa', stage: 'plan' },
            { time: '2 days ago', text: 'Femi Oladipo sent Creator Brief to Davido for Access Bank project', stage: 'plan' },
            { time: '3 days ago', text: 'Star Lager × Ayra Starr — Port Harcourt show deliverable uploaded', stage: 'deliver' },
            { time: '4 days ago', text: 'Dangote CRM record created — discovery call scheduled', stage: 'connect' },
          ].map((item, i) => {
            const stageColor = v3Stages.find(s => s.key === item.stage)?.color;
            return (
              <div key={i} className="flex items-start gap-3 py-2 px-1 rounded-lg hover:bg-[#F4F2EC] transition-colors">
                <span className="text-[10px] text-[#8A8A8A] w-20 flex-shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.time}</span>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: stageColor }} />
                <span className="text-[13px] text-[#5C5C5C]">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default V3AdminOverview;
