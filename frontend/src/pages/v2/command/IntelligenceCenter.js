import React, { useState } from 'react';
import DetailPopup from '../../../components/shared/DetailPopup';
import Avatar from '../../../components/shared/Avatar';
import { formatNaira } from '../../../lib/utils';
import { Radar, ArrowRight, Sparkles, ExternalLink, Eye, EyeOff, Filter, ChevronRight } from 'lucide-react';

const signalTypes = ['All', 'Trademark', 'Earnings', 'Job Posting', 'Ad Spend', 'Executive', 'Event', 'Product Launch', 'Competitor', 'Dissolution'];

const allSignals = [
  { id: 'SIG-001', type: 'Trademark', source: 'Nigerian Breweries — Star Lager', title: '"Star Music Live" trademark filed Feb 20', confidence: 92, est: '₦80-120M', time: '2h ago', color: '#22C55E', industry: 'Alcohol',
    analysis: 'Star Lager is repositioning toward youth culture through music. Social ad spend up 340% in 30 days. New CMO from Diageo. This is a high-probability activation budget.',
    matches: [{ name: 'Spaceship (Burna Boy)', score: 96 }, { name: 'Rema Team', score: 91 }, { name: 'Asake Team', score: 88 }] },
  { id: 'SIG-002', type: 'Earnings', source: 'Access Bank', title: 'Q4 earnings mention "significant anniversary marketing spend"', confidence: 87, est: '₦40-60M', time: '5h ago', color: '#2F55FF', industry: 'Banking',
    analysis: 'Access Bank celebrates 25th anniversary in Q2. Historical pattern shows 2-3x marketing spend in anniversary years. Current agency contract expires April.',
    matches: [{ name: 'Davido (DMW)', score: 93 }, { name: 'Tiwa Savage', score: 88 }, { name: 'Wizkid', score: 85 }] },
  { id: 'SIG-003', type: 'Job Posting', source: 'Flutterwave', title: 'Hiring "Creator Partnerships Lead" — Lagos', confidence: 84, est: '₦25-40M', time: '1d ago', color: '#F59E0B', industry: 'Tech',
    analysis: 'Flutterwave is building a creator economy strategy. Series D funded ₦180B. This hire signals creator marketing budget allocation within 3-6 months.',
    matches: [{ name: 'Don Jazzy (Mavin)', score: 94 }, { name: 'Teni', score: 87 }, { name: 'CKay', score: 82 }] },
  { id: 'SIG-004', type: 'Ad Spend', source: 'Pepsi Nigeria', title: 'Meta ad spend up 280% in 14 days', confidence: 89, est: '₦50-80M', time: '1d ago', color: '#22C55E', industry: 'FMCG',
    analysis: 'Pepsi is ramping up digital spend ahead of summer campaign. Pattern matches their 2025 "Pepsi Music" campaign which was ₦65M. Likely seeking fresh talent.',
    matches: [{ name: 'Rema Team', score: 95 }, { name: 'Ayra Starr', score: 90 }, { name: 'Omah Lay', score: 86 }] },
  { id: 'SIG-005', type: 'Executive', source: 'GTBank', title: 'New Head of Marketing appointed — ex-Diageo', confidence: 78, est: '₦30-50M', time: '2d ago', color: '#8B5CF6', industry: 'Banking',
    analysis: 'New marketing head from Diageo tends to invest heavily in experiential and creator content. GTBank Food Festival budget historically ₦40M+ for talent.',
    matches: [{ name: 'Simi', score: 89 }, { name: 'Adekunle Gold', score: 86 }, { name: 'Falz', score: 83 }] },
  { id: 'SIG-006', type: 'Event', source: 'Lagos Fashion Week', title: 'Announced March 20-23 dates, seeking sponsors', confidence: 91, est: '₦15-30M', time: '2d ago', color: '#22C55E', industry: 'Entertainment',
    analysis: 'Lagos Fashion Week consistently draws luxury and lifestyle brands. 2025 sponsors included Hennessy, Samsung. Talent partnerships for runway and after-parties.',
    matches: [{ name: 'Wizkid', score: 92 }, { name: 'Tems', score: 90 }, { name: 'Rema', score: 88 }] },
  { id: 'SIG-007', type: 'Product Launch', source: 'Dangote', title: 'Dangote Refinery — consumer brand launch', confidence: 72, est: '₦100-200M', time: '3d ago', color: '#F59E0B', industry: 'Energy',
    analysis: 'Dangote Refinery launching consumer-facing petroleum brand. Massive marketing budget expected. No current creator agency relationship — greenfield opportunity.',
    matches: [{ name: 'Burna Boy', score: 90 }, { name: 'Davido', score: 88 }, { name: 'Wizkid', score: 87 }] },
  { id: 'SIG-008', type: 'Competitor', source: 'Boomplay x Sony', title: 'Boomplay signed Sony Music Africa distribution', confidence: 85, est: '₦20-35M', time: '3d ago', color: '#EF4444', industry: 'Entertainment',
    analysis: 'Boomplay expanding with Sony deal. Will need localized content and promotional campaigns. Previous Boomplay campaigns ran through competitor agency — opportunity to pitch.',
    matches: [{ name: 'Mavin Records', score: 96 }, { name: 'Chocolate City', score: 91 }, { name: 'Spaceship', score: 87 }] },
  { id: 'SIG-009', type: 'Trademark', source: 'MTN Nigeria', title: '"MTN Pulse Music" trademark renewed', confidence: 81, est: '₦60-90M', time: '4d ago', color: '#2F55FF', industry: 'Telecoms',
    analysis: 'MTN renewing their music brand. Pulse targets 18-25 demographic. Budget cycle starts April. Current Tems deal may be part of this initiative.',
    matches: [{ name: 'Tems', score: 97 }, { name: 'Ayra Starr', score: 93 }, { name: 'Fireboy DML', score: 89 }] },
  { id: 'SIG-010', type: 'Dissolution', source: 'Airtel x Previous Agency', title: 'Airtel dropped Creative Counsel agency', confidence: 94, est: '₦70-100M', time: '5d ago', color: '#22C55E', industry: 'Telecoms',
    analysis: 'Airtel terminated relationship with Creative Counsel. Budget of ₦85M+ now unallocated. RFP expected within 2 weeks. First-mover advantage critical.',
    matches: [{ name: 'Burna Boy', score: 92 }, { name: 'Davido', score: 90 }, { name: 'Rema', score: 88 }] },
  { id: 'SIG-011', type: 'Ad Spend', source: 'Coca-Cola Nigeria', title: 'YouTube ad spend up 420% — "Coke Studio" keywords', confidence: 93, est: '₦120-180M', time: '5d ago', color: '#22C55E', industry: 'FMCG',
    analysis: 'Coca-Cola ramping Coke Studio Africa promotion. Aligns with existing deal in scoping. Budget appears larger than initially estimated.',
    matches: [{ name: 'Mavin Records', score: 95 }, { name: 'DMW', score: 92 }, { name: 'YBNL', score: 89 }] },
  { id: 'SIG-012', type: 'Executive', source: 'Indomie Nigeria', title: 'New brand manager — Gen-Z focused', confidence: 68, est: '₦15-25M', time: '1w ago', color: '#94A3B8', industry: 'FMCG',
    analysis: 'New brand manager with Gen-Z marketing background. Indomie historically conservative with creator spend. May signal shift toward digital-first approach.',
    matches: [{ name: 'Boy Spyce', score: 88 }, { name: 'CKay', score: 84 }, { name: 'Crayon', score: 81 }] }
];

const industryData = [
  { industry: 'Telecoms', signals: 8, trend: 'up', active: 3, color: '#2F55FF' },
  { industry: 'FMCG', signals: 5, trend: 'stable', active: 2, color: '#22C55E' },
  { industry: 'Banking', signals: 6, trend: 'up', active: 2, color: '#8B5CF6' },
  { industry: 'Tech', signals: 3, trend: 'up', active: 1, color: '#F59E0B' },
  { industry: 'Entertainment', signals: 4, trend: 'stable', active: 2, color: '#EC4899' },
  { industry: 'Alcohol', signals: 3, trend: 'up', active: 1, color: '#06B6D4' }
];

const IntelligenceCenter = () => {
  const [selectedType, setSelectedType] = useState('All');
  const [popup, setPopup] = useState(null);

  const filtered = selectedType === 'All' ? allSignals : allSignals.filter(s => s.type === selectedType);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="v2-intelligence">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/25 text-[10px] uppercase tracking-[0.15em] mb-1">INTELLIGENCE CENTER</p>
          <h1 className="text-white text-xl font-bold tracking-tight">Market Signals</h1>
          <p className="text-white/30 text-xs">{allSignals.length} signals detected. {allSignals.filter(s => s.confidence >= 85).length} high-confidence.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/20 font-mono">Auto-scanning</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] v2-pulse" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {signalTypes.map(t => (
          <button key={t} onClick={() => setSelectedType(t)} className={`px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition-colors ${selectedType === t ? 'bg-[#2F55FF]/15 text-[#6B8AFF] border border-[#2F55FF]/20' : 'text-white/30 border border-white/[0.04] hover:border-white/[0.08] hover:text-white/50'}`}>
            {t} {t === 'All' ? `(${allSignals.length})` : `(${allSignals.filter(s => s.type === t).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Signal Feed (65%) */}
        <div className="lg:col-span-3 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
          {filtered.map(sig => (
            <div key={sig.id} onClick={() => setPopup({ type: 'signal', data: sig })} className="v2-card p-4 cursor-pointer hover:border-white/[0.1] transition-all group" data-testid={`signal-${sig.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-white/[0.04] text-white/30">{sig.type.toUpperCase()}</span>
                <span className="text-[10px] text-white/15">{sig.time}</span>
                <span className="text-[10px] text-white/15 ml-auto">{sig.industry}</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 v2-pulse" style={{ background: sig.color }} />
                <div className="flex-1">
                  <h3 className="text-white/80 text-sm font-medium mb-1">{sig.source}</h3>
                  <p className="text-white/40 text-xs mb-3">{sig.title}</p>

                  {/* Confidence bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] text-white/25">Confidence:</span>
                    <div className="flex-1 v2-confidence"><div className="v2-confidence-fill" style={{ width: `${sig.confidence}%` }} /></div>
                    <span className="text-[10px] font-mono text-white/60">{sig.confidence}%</span>
                    <span className="text-[10px] text-white/25">Est:</span>
                    <span className="text-[10px] font-mono text-[#22C55E]">{sig.est}</span>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5"><Sparkles className="w-2.5 h-2.5 text-[#2F55FF]" /><span className="text-[9px] text-white/25 uppercase">AI Analysis</span></div>
                    <p className="text-xs text-white/40 leading-relaxed">{sig.analysis}</p>
                  </div>

                  {/* Best Matches */}
                  <div>
                    <span className="text-[9px] text-white/25 uppercase mb-1.5 block">Best Matches</span>
                    <div className="space-y-1">
                      {sig.matches.map(m => (
                        <div key={m.name} className="flex items-center gap-2">
                          <Avatar name={m.name} size="sm" />
                          <span className="text-xs text-white/50 flex-1">{m.name}</span>
                          <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${m.score}%` }} /></div>
                          <span className="text-[10px] font-mono text-white/40">{m.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/[0.04]">
                    <button className="text-[10px] px-3 py-1 rounded-md bg-[#2F55FF]/10 text-[#6B8AFF] hover:bg-[#2F55FF]/20 transition-colors">Create Deal</button>
                    <button className="text-[10px] px-3 py-1 rounded-md bg-white/[0.04] text-white/30 hover:bg-white/[0.06] transition-colors">Assign</button>
                    <button className="text-[10px] px-3 py-1 rounded-md bg-white/[0.04] text-white/30 hover:bg-white/[0.06] transition-colors">Watch</button>
                    <button className="text-[10px] px-3 py-1 rounded-md text-white/15 hover:text-white/30 transition-colors ml-auto">Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Signal Analytics (35%) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Industry Pulse */}
          <div className="v2-card p-5">
            <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Industry Pulse</h2>
            <div className="space-y-3">
              {industryData.map(ind => (
                <div key={ind.industry} onClick={() => setPopup({ type: 'industry', data: ind })} className="cursor-pointer hover:bg-white/[0.02] p-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: ind.color }} />
                      <span className="text-xs text-white/50">{ind.industry}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] ${ind.trend === 'up' ? 'text-[#22C55E]' : 'text-white/25'}`}>{ind.trend === 'up' ? '^ Heating' : '- Stable'}</span>
                      <span className="text-[10px] text-white/25">{ind.signals} signals</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/[0.04] rounded-full"><div className="h-full rounded-full" style={{ width: `${(ind.signals / 10) * 100}%`, background: ind.color }} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Calendar */}
          <div className="v2-card p-5">
            <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Spending Calendar</h2>
            <div className="space-y-2">
              {[
                { period: 'Feb', label: 'Valentine Campaigns', intensity: 40 },
                { period: 'Mar-Apr', label: 'Easter / Ramadan', intensity: 55 },
                { period: 'Jun', label: 'Mid-Year Budget Refresh', intensity: 35 },
                { period: 'Aug', label: 'Back-to-School', intensity: 30 },
                { period: 'Oct-Dec', label: 'FESTIVE PEAK', intensity: 95, glow: true }
              ].map(s => (
                <div key={s.period} className={`flex items-center gap-3 p-2 rounded-lg ${s.glow ? 'bg-[#F59E0B]/5 border border-[#F59E0B]/10' : ''}`}>
                  <span className={`text-[10px] font-mono w-14 flex-shrink-0 ${s.glow ? 'text-[#F59E0B]' : 'text-white/25'}`}>{s.period}</span>
                  <div className="flex-1">
                    <p className={`text-xs ${s.glow ? 'text-[#F59E0B] font-medium' : 'text-white/40'}`}>{s.label}</p>
                    <div className="h-1 bg-white/[0.04] rounded-full mt-1"><div className={`h-full rounded-full ${s.glow ? 'bg-[#F59E0B]' : 'bg-white/10'}`} style={{ width: `${s.intensity}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="v2-card p-5">
            <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Signal Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="v2-metric-label">This Week</p><p className="v2-metric-value">7</p></div>
              <div><p className="v2-metric-label">High Confidence</p><p className="v2-metric-value text-[#22C55E]">5</p></div>
              <div><p className="v2-metric-label">Converted</p><p className="v2-metric-value">3</p></div>
              <div><p className="v2-metric-label">Est. Value</p><p className="v2-metric-value">₦680M</p></div>
            </div>
          </div>
        </div>
      </div>

      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'signal' ? popup?.data?.source : popup?.type === 'industry' ? popup?.data?.industry : 'Details'}>
        {popup?.type === 'signal' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Confidence</p><p className="text-lg font-bold text-[#22C55E]">{popup.data.confidence}%</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Est. Value</p><p className="text-lg font-bold font-mono">{popup.data.est}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Analysis</p><p className="text-xs leading-relaxed">{popup.data.analysis}</p></div>
            <button className="btn-primary text-xs w-full py-2">Create Deal from Signal</button>
          </div>
        )}
        {popup?.type === 'industry' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Total Signals</p><p className="text-lg font-bold">{popup.data.signals}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Active</p><p className="text-lg font-bold">{popup.data.active}</p></div>
            </div>
            <p className="text-xs text-[#64748B]">Trend: {popup.data.trend === 'up' ? 'Signals increasing — more brands are active' : 'Stable activity in this sector'}</p>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default IntelligenceCenter;
