import React, { useState } from 'react';
import { formatNaira } from '../../../lib/utils';
import Avatar from '../../../components/shared/Avatar';
import DetailPopup from '../../../components/shared/DetailPopup';
import {
  GitBranch, ArrowRight, ChevronRight, Clock, Zap,
  BarChart3, TrendingUp, AlertTriangle, Filter
} from 'lucide-react';

const stages = [
  { key: 'lead', label: 'Lead', color: '#94A3B8' },
  { key: 'discovery', label: 'Discovery', color: '#2F55FF' },
  { key: 'scoping', label: 'Scoping', color: '#8B5CF6' },
  { key: 'nda', label: 'NDA', color: '#06B6D4' },
  { key: 'terms', label: 'Terms', color: '#F59E0B' },
  { key: 'active', label: 'Active', color: '#22C55E' },
  { key: 'closed', label: 'Closed', color: '#10B981' }
];

const deals = [
  { id: 'D-001', brand: 'Coca-Cola', creative: 'Mavin Records', title: 'Coke Studio Africa S3', value: 150000000, stage: 'scoping', probability: 68, daysInStage: 5, owner: 'Tunde Balogun', start: '2026-01-15', deadline: '2026-03-05', health: 'on-track' },
  { id: 'D-002', brand: 'MTN Nigeria', creative: 'Tems', title: 'MTN Pulse Music Campaign', value: 75000000, stage: 'terms', probability: 74, daysInStage: 3, owner: 'Adenike Okafor', start: '2026-01-20', deadline: '2026-02-28', health: 'at-risk' },
  { id: 'D-003', brand: 'Guinness', creative: 'Burna Boy', title: 'Guinness Night Football', value: 45000000, stage: 'nda', probability: 82, daysInStage: 2, owner: 'Tunde Balogun', start: '2026-02-01', deadline: '2026-03-15', health: 'on-track' },
  { id: 'D-004', brand: 'Access Bank', creative: 'Davido', title: '25th Anniversary Concert', value: 55000000, stage: 'discovery', probability: 45, daysInStage: 7, owner: 'Chidi Nwosu', start: '2026-02-10', deadline: '2026-05-01', health: 'on-track' },
  { id: 'D-005', brand: 'Star Lager', creative: 'Rema', title: 'Star Music Live Launch', value: 95000000, stage: 'lead', probability: 30, daysInStage: 1, owner: 'Tunde Balogun', start: '2026-02-27', deadline: '2026-06-01', health: 'new' },
  { id: 'D-006', brand: 'Pepsi Nigeria', creative: 'Ayra Starr', title: 'Pepsi Summer Music', value: 65000000, stage: 'lead', probability: 25, daysInStage: 3, owner: 'Bola Adeyemi', start: '2026-02-25', deadline: '2026-06-15', health: 'on-track' },
  { id: 'D-007', brand: 'Flutterwave', creative: 'Don Jazzy', title: 'Creator Economy Launch', value: 35000000, stage: 'lead', probability: 20, daysInStage: 2, owner: 'Chidi Nwosu', start: '2026-02-26', deadline: '2026-07-01', health: 'new' },
  { id: 'D-008', brand: 'UBA', creative: 'Fireboy DML', title: 'UBA Digital Concert', value: 18000000, stage: 'active', probability: 95, daysInStage: 12, owner: 'Adenike Okafor', start: '2026-01-10', deadline: '2026-03-20', health: 'on-track' },
  { id: 'D-009', brand: 'Dangote', creative: 'Wizkid', title: 'Refinery Brand Campaign', value: 180000000, stage: 'discovery', probability: 35, daysInStage: 4, owner: 'Tunde Balogun', start: '2026-02-15', deadline: '2026-08-01', health: 'on-track' },
  { id: 'D-010', brand: 'GTBank', creative: 'Adekunle Gold', title: 'GTBank Food & Music', value: 42000000, stage: 'discovery', probability: 50, daysInStage: 6, owner: 'Bola Adeyemi', start: '2026-02-05', deadline: '2026-04-15', health: 'on-track' },
  { id: 'D-011', brand: 'Rema x Boomplay', creative: 'Rema', title: 'Boomplay Exclusive', value: 12000000, stage: 'active', probability: 100, daysInStage: 20, owner: 'Adenike Okafor', start: '2025-12-20', deadline: '2026-03-01', health: 'completed' },
  { id: 'D-012', brand: 'Airtel Nigeria', creative: 'Burna Boy', title: 'Airtel Ambassador Deal', value: 85000000, stage: 'terms', probability: 60, daysInStage: 1, owner: 'Tunde Balogun', start: '2026-02-20', deadline: '2026-04-01', health: 'on-track' },
  { id: 'D-013', brand: 'Indomie', creative: 'Boy Spyce', title: 'Gen-Z Campaign', value: 20000000, stage: 'active', probability: 90, daysInStage: 8, owner: 'Chidi Nwosu', start: '2026-01-25', deadline: '2026-03-30', health: 'on-track' },
  { id: 'D-014', brand: 'Coca-Cola', creative: 'Teni', title: 'Fanta Campus Tour', value: 28000000, stage: 'active', probability: 88, daysInStage: 15, owner: 'Bola Adeyemi', start: '2026-01-05', deadline: '2026-04-01', health: 'on-track' },
  { id: 'D-015', brand: 'MTN Nigeria', creative: 'Fireboy DML', title: 'MoMo Agent Promo', value: 15000000, stage: 'active', probability: 92, daysInStage: 10, owner: 'Adenike Okafor', start: '2026-01-15', deadline: '2026-03-10', health: 'on-track' },
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

const V2Pipeline = () => {
  const [view, setView] = useState('kanban');
  const [popup, setPopup] = useState(null);

  const stageGroups = stages.map(s => ({
    ...s,
    deals: deals.filter(d => d.stage === s.key),
    totalValue: deals.filter(d => d.stage === s.key).reduce((a, d) => a + d.value, 0)
  }));

  const totalValue = deals.reduce((a, d) => a + d.value, 0);
  const weightedValue = deals.reduce((a, d) => a + (d.value * d.probability / 100), 0);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="v2-pipeline">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/25 text-[10px] uppercase tracking-[0.15em] mb-1">PIPELINE</p>
          <h1 className="text-white text-xl font-bold tracking-tight">Deal Pipeline</h1>
          <p className="text-white/30 text-xs">{deals.length} deals &middot; {formatNaira(totalValue, { compact: true })} total &middot; {formatNaira(weightedValue, { compact: true })} weighted</p>
        </div>
        <div className="flex items-center gap-1">
          {['kanban', 'flow', 'timeline'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              data-testid={`pipeline-view-${v}`}
              className={`px-3 py-1.5 rounded-lg text-[10px] capitalize transition-colors ${view === v ? 'bg-[#2F55FF]/15 text-[#6B8AFF] border border-[#2F55FF]/20' : 'text-white/30 border border-white/[0.04] hover:text-white/50'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4" data-testid="pipeline-kanban">
          {stageGroups.map(sg => (
            <div key={sg.key} className="flex-shrink-0 w-60">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: sg.color }} />
                <span className="text-xs text-white/50 font-medium">{sg.label}</span>
                <span className="text-[10px] text-white/20 ml-auto">{sg.deals.length}</span>
                <span className="text-[9px] text-white/15 font-mono">{formatNaira(sg.totalValue, { compact: true })}</span>
              </div>
              <div className="space-y-2">
                {sg.deals.map(deal => (
                  <div
                    key={deal.id}
                    onClick={() => setPopup({ type: 'deal', data: deal })}
                    className="v2-card p-3 cursor-pointer hover:border-white/[0.1] transition-all group"
                    data-testid={`deal-${deal.id}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[9px] font-mono text-white/20">{deal.id}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${deal.health === 'at-risk' ? 'bg-[#F59E0B]' : deal.health === 'completed' ? 'bg-[#10B981]' : deal.health === 'new' ? 'bg-[#2F55FF] v2-pulse' : 'bg-[#22C55E]'}`} />
                    </div>
                    <p className="text-white/80 text-xs font-medium mb-0.5">{deal.brand}</p>
                    <p className="text-white/30 text-[10px] mb-2 truncate">{deal.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 font-mono">{formatNaira(deal.value, { compact: true })}</span>
                      <span className="text-[9px] text-white/20">{deal.probability}%</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Avatar name={deal.owner} size="sm" />
                      <span className="text-[9px] text-white/20">{deal.daysInStage}d</span>
                    </div>
                  </div>
                ))}
                {sg.deals.length === 0 && (
                  <div className="v2-card p-4 text-center"><p className="text-white/10 text-[10px]">No deals</p></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FLOW VIEW (Sankey-style) */}
      {view === 'flow' && (
        <div className="space-y-5" data-testid="pipeline-flow">
          {/* Flow header stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Conversion Rate', value: '34%', sub: 'Lead to Active' },
              { label: 'Avg. Cycle Time', value: '42 days', sub: 'Lead to Close' },
              { label: 'Drop-off Peak', value: 'Discovery', sub: '3 deals lost' },
              { label: 'Velocity', value: '₦47.2M/mo', sub: 'Weighted avg' }
            ].map((s, i) => (
              <div key={i} className="v2-card p-4">
                <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-white text-lg font-bold font-mono">{s.value}</p>
                <p className="text-[9px] text-white/15">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Sankey Flow Visualization */}
          <div className="v2-card p-6">
            <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-6">Deal Flow Visualization</h2>
            <div className="relative">
              {/* Stage columns */}
              <div className="flex justify-between mb-4">
                {stages.map(s => (
                  <div key={s.key} className="text-center" style={{ width: `${100 / stages.length}%` }}>
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: s.color }} />
                    <p className="text-[9px] text-white/40">{s.label}</p>
                    <p className="text-[10px] text-white/60 font-mono">{stageGroups.find(sg => sg.key === s.key)?.deals.length || 0}</p>
                  </div>
                ))}
              </div>

              {/* Flow bars - visual representation */}
              <svg width="100%" height="200" className="overflow-visible">
                {(() => {
                  const stageCounts = stages.map(s => stageGroups.find(sg => sg.key === s.key)?.deals.length || 0);
                  const maxCount = Math.max(...stageCounts, 1);
                  const segWidth = 100 / stages.length;

                  return stages.map((s, i) => {
                    if (i === stages.length - 1) return null;
                    const count = stageCounts[i];
                    const nextCount = stageCounts[i + 1];
                    const h1 = Math.max((count / maxCount) * 160, 8);
                    const h2 = Math.max((nextCount / maxCount) * 160, 8);
                    const x1 = (segWidth * i + segWidth / 2);
                    const x2 = (segWidth * (i + 1) + segWidth / 2);
                    const y1top = 100 - h1 / 2;
                    const y1bot = 100 + h1 / 2;
                    const y2top = 100 - h2 / 2;
                    const y2bot = 100 + h2 / 2;
                    const midX = (x1 + x2) / 2;

                    return (
                      <g key={s.key}>
                        <path
                          d={`M ${x1}% ${y1top} C ${midX}% ${y1top}, ${midX}% ${y2top}, ${x2}% ${y2top} L ${x2}% ${y2bot} C ${midX}% ${y2bot}, ${midX}% ${y1bot}, ${x1}% ${y1bot} Z`}
                          fill={`${s.color}15`}
                          stroke={`${s.color}30`}
                          strokeWidth="0.5"
                        />
                        {/* Drop-off indicator */}
                        {count > nextCount && (
                          <text x={`${midX}%`} y={y1bot + 18} textAnchor="middle" className="fill-white/15" style={{ fontSize: '8px', fontFamily: 'monospace' }}>
                            {count - nextCount} lost
                          </text>
                        )}
                      </g>
                    );
                  });
                })()}
                {/* Stage value labels */}
                {stages.map((s, i) => {
                  const sg = stageGroups.find(sg2 => sg2.key === s.key);
                  const segWidth = 100 / stages.length;
                  const cx = segWidth * i + segWidth / 2;
                  return (
                    <text key={`val-${s.key}`} x={`${cx}%`} y="100" textAnchor="middle" dominantBaseline="middle" className="fill-white/60" style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                      {formatNaira(sg?.totalValue || 0, { compact: true })}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Stage conversion breakdown */}
          <div className="v2-card p-5">
            <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">Stage Transitions</h2>
            <div className="space-y-2">
              {stages.slice(0, -1).map((s, i) => {
                const fromCount = stageGroups[i].deals.length;
                const toCount = stageGroups[i + 1].deals.length;
                const convRate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2 w-24">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-white/40">{s.label}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-white/10" />
                    <div className="flex items-center gap-2 w-24">
                      <div className="w-2 h-2 rounded-full" style={{ background: stages[i + 1].color }} />
                      <span className="text-xs text-white/40">{stages[i + 1].label}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(convRate, 100)}%`, background: s.color }} />
                    </div>
                    <span className="text-[10px] font-mono text-white/40 w-10 text-right">{convRate}%</span>
                    <span className="text-[9px] text-white/20 w-20 text-right">{fromCount} &rarr; {toCount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE VIEW */}
      {view === 'timeline' && (
        <div className="space-y-5" data-testid="pipeline-timeline">
          {/* Timeline header */}
          <div className="v2-card p-5">
            <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">Deal Timeline - 2026</h2>
            {/* Month headers */}
            <div className="flex mb-2">
              <div className="w-48 flex-shrink-0" />
              {months.map(m => (
                <div key={m} className="flex-1 text-center">
                  <span className={`text-[10px] font-mono ${m === 'Feb' ? 'text-[#2F55FF]' : 'text-white/20'}`}>{m}</span>
                </div>
              ))}
            </div>

            {/* Grid lines */}
            <div className="relative">
              {deals.sort((a, b) => b.value - a.value).map((deal, idx) => {
                const startMonth = new Date(deal.start).getMonth();
                const endMonth = new Date(deal.deadline).getMonth();
                const startOffset = ((startMonth) / months.length) * 100;
                const width = Math.max(((endMonth - startMonth + 1) / months.length) * 100, 5);
                const stageData = stages.find(s => s.key === deal.stage);
                return (
                  <div key={deal.id} onClick={() => setPopup({ type: 'deal', data: deal })} className="flex items-center h-9 cursor-pointer hover:bg-white/[0.02] rounded transition-colors group">
                    <div className="w-48 flex-shrink-0 flex items-center gap-2 pr-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: stageData?.color }} />
                      <span className="text-[10px] text-white/50 truncate flex-1">{deal.brand}</span>
                      <span className="text-[9px] font-mono text-white/25">{formatNaira(deal.value, { compact: true })}</span>
                    </div>
                    <div className="flex-1 relative">
                      {/* Background grid */}
                      <div className="absolute inset-0 flex">
                        {months.map((_, mi) => (
                          <div key={mi} className="flex-1 border-l border-white/[0.03]" />
                        ))}
                      </div>
                      {/* Bar */}
                      <div
                        className="absolute h-5 rounded-md flex items-center px-2 transition-all group-hover:opacity-100 opacity-80"
                        style={{
                          left: `${startOffset}%`,
                          width: `${width}%`,
                          background: `${stageData?.color}20`,
                          borderLeft: `2px solid ${stageData?.color}`
                        }}
                      >
                        <span className="text-[8px] font-mono text-white/40 truncate">{deal.title}</span>
                      </div>
                      {/* Today marker */}
                      {idx === 0 && (
                        <div className="absolute top-0 bottom-0 w-px bg-[#EF4444]/30" style={{ left: `${(1 / months.length) * 100 + (27 / 28) * (100 / months.length)}%` }}>
                          <span className="absolute -top-4 -translate-x-1/2 text-[7px] text-[#EF4444]/50 font-mono">TODAY</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming deadlines */}
          <div className="v2-card p-5">
            <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">Approaching Deadlines</h2>
            <div className="space-y-2">
              {deals.filter(d => d.health !== 'completed').sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 6).map(d => {
                const daysLeft = Math.ceil((new Date(d.deadline) - new Date()) / 86400000);
                return (
                  <div key={d.id} onClick={() => setPopup({ type: 'deal', data: d })} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors">
                    <Clock className={`w-3 h-3 ${daysLeft < 7 ? 'text-[#EF4444]' : daysLeft < 14 ? 'text-[#F59E0B]' : 'text-white/20'}`} />
                    <span className="text-xs text-white/50 flex-1">{d.brand} - {d.title}</span>
                    <span className={`text-[10px] font-mono ${daysLeft < 7 ? 'text-[#EF4444]' : daysLeft < 14 ? 'text-[#F59E0B]' : 'text-white/25'}`}>{daysLeft}d left</span>
                    <span className="text-[9px] font-mono text-white/20">{formatNaira(d.value, { compact: true })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Deal Detail Popup */}
      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.data?.brand}>
        {popup?.type === 'deal' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Deal Value</p><p className="text-lg font-bold font-mono">{formatNaira(popup.data.value)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Probability</p><p className="text-lg font-bold text-[#22C55E]">{popup.data.probability}%</p></div>
            </div>
            <div className="bg-[#F8FAFC] rounded-lg p-3">
              <p className="text-[10px] text-[#94A3B8] mb-1">Title</p>
              <p className="text-sm font-medium">{popup.data.title}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-[10px] text-[#94A3B8]">Stage</p><p className="text-xs font-medium capitalize">{popup.data.stage}</p></div>
              <div><p className="text-[10px] text-[#94A3B8]">Creative</p><p className="text-xs">{popup.data.creative}</p></div>
              <div><p className="text-[10px] text-[#94A3B8]">Owner</p><p className="text-xs">{popup.data.owner}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-[10px] text-[#94A3B8]">Days in Stage</p><p className="text-xs font-mono">{popup.data.daysInStage}</p></div>
              <div><p className="text-[10px] text-[#94A3B8]">Deadline</p><p className="text-xs font-mono">{popup.data.deadline}</p></div>
            </div>
            <button className="btn-primary text-xs w-full py-2">Open Deal Room</button>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default V2Pipeline;
