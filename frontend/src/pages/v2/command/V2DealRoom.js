import React, { useState, useMemo } from 'react';
import { formatNaira } from '../../../lib/utils';
import Avatar from '../../../components/shared/Avatar';
import DetailPopup from '../../../components/shared/DetailPopup';
import {
  Handshake, Calculator, FileText, MessageSquare, Clock,
  TrendingUp, ArrowRight, Sparkles, ChevronDown, ChevronUp,
  DollarSign, Target, BarChart3, SlidersHorizontal, Zap, AlertTriangle
} from 'lucide-react';

const dealsList = [
  { id: 'D-001', brand: 'Coca-Cola', creative: 'Mavin Records', title: 'Coke Studio Africa S3', value: 150000000, stage: 'scoping', probability: 68, owner: 'Tunde Balogun', type: 'Campaign' },
  { id: 'D-002', brand: 'MTN Nigeria', creative: 'Tems', title: 'MTN Pulse Music Campaign', value: 75000000, stage: 'terms', probability: 74, owner: 'Adenike Okafor', type: 'Endorsement' },
  { id: 'D-003', brand: 'Guinness', creative: 'Burna Boy', title: 'Guinness Night Football', value: 45000000, stage: 'nda', probability: 82, owner: 'Tunde Balogun', type: 'Event' },
  { id: 'D-004', brand: 'Access Bank', creative: 'Davido', title: '25th Anniversary Concert', value: 55000000, stage: 'discovery', probability: 45, owner: 'Chidi Nwosu', type: 'Concert' },
  { id: 'D-005', brand: 'Star Lager', creative: 'Rema', title: 'Star Music Live Launch', value: 95000000, stage: 'lead', probability: 30, owner: 'Tunde Balogun', type: 'Brand Launch' },
  { id: 'D-012', brand: 'Airtel Nigeria', creative: 'Burna Boy', title: 'Airtel Ambassador Deal', value: 85000000, stage: 'terms', probability: 60, owner: 'Tunde Balogun', type: 'Endorsement' },
  { id: 'D-009', brand: 'Dangote', creative: 'Wizkid', title: 'Refinery Brand Campaign', value: 180000000, stage: 'discovery', probability: 35, owner: 'Tunde Balogun', type: 'Campaign' }
];

const V2DealRoom = () => {
  const [tab, setTab] = useState('deals');
  const [selectedDeal, setSelectedDeal] = useState(dealsList[0]);
  const [popup, setPopup] = useState(null);

  // Simulator state
  const [simDealValue, setSimDealValue] = useState(selectedDeal.value);
  const [simCommission, setSimCommission] = useState(15);
  const [simCreativeSplit, setSimCreativeSplit] = useState(70);
  const [simCloseProb, setSimCloseProb] = useState(selectedDeal.probability);
  const [simTimeline, setSimTimeline] = useState(45);

  const simResults = useMemo(() => {
    const tasckRevenue = simDealValue * (simCommission / 100);
    const creativePayout = simDealValue * (simCreativeSplit / 100);
    const tasckNet = tasckRevenue - (simDealValue - creativePayout - tasckRevenue);
    const expectedValue = tasckRevenue * (simCloseProb / 100);
    const monthlyVelocity = tasckRevenue / Math.max(simTimeline / 30, 1);
    return { tasckRevenue, creativePayout, tasckNet: tasckRevenue, expectedValue, monthlyVelocity };
  }, [simDealValue, simCommission, simCreativeSplit, simCloseProb, simTimeline]);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="v2-deals">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/25 text-[10px] uppercase tracking-[0.15em] mb-1">DEAL ROOM</p>
          <h1 className="text-white text-xl font-bold tracking-tight">Deals</h1>
          <p className="text-white/30 text-xs">{dealsList.length} active deals &middot; {formatNaira(dealsList.reduce((a, d) => a + d.value, 0), { compact: true })} total</p>
        </div>
        <div className="flex items-center gap-1">
          {['deals', 'simulator'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`deals-tab-${t}`}
              className={`px-3 py-1.5 rounded-lg text-[10px] capitalize transition-colors ${tab === t ? 'bg-[#2F55FF]/15 text-[#6B8AFF] border border-[#2F55FF]/20' : 'text-white/30 border border-white/[0.04] hover:text-white/50'}`}
            >
              {t === 'simulator' && <Calculator className="w-3 h-3 inline mr-1" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* DEALS LIST VIEW */}
      {tab === 'deals' && (
        <div className="space-y-2" data-testid="deals-list">
          {dealsList.map(deal => (
            <div key={deal.id} onClick={() => setPopup({ type: 'deal', data: deal })} className="v2-card p-4 cursor-pointer hover:border-white/[0.1] transition-all" data-testid={`deal-card-${deal.id}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono text-white/20">{deal.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25">{deal.type}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                      deal.stage === 'active' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                      deal.stage === 'terms' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                      deal.stage === 'nda' ? 'bg-[#06B6D4]/10 text-[#06B6D4]' :
                      'bg-white/[0.04] text-white/30'
                    }`}>{deal.stage}</span>
                  </div>
                  <p className="text-white/80 text-sm font-medium">{deal.brand} <span className="text-white/20">&times;</span> {deal.creative}</p>
                  <p className="text-white/30 text-[10px]">{deal.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono text-sm">{formatNaira(deal.value, { compact: true })}</p>
                  <p className="text-[10px] text-white/25">{deal.probability}% probability</p>
                </div>
                <Avatar name={deal.owner} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DEAL SIMULATOR */}
      {tab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" data-testid="deal-simulator">
          {/* Left - Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Deal selector */}
            <div className="v2-card p-5">
              <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Select Deal</h2>
              <div className="space-y-1.5">
                {dealsList.slice(0, 5).map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDeal(d); setSimDealValue(d.value); setSimCloseProb(d.probability); }}
                    data-testid={`sim-deal-${d.id}`}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${selectedDeal.id === d.id ? 'bg-[#2F55FF]/10 border border-[#2F55FF]/20' : 'hover:bg-white/[0.02] border border-transparent'}`}
                  >
                    <span className="text-[9px] font-mono text-white/20 w-10">{d.id}</span>
                    <span className="text-xs text-white/60 flex-1 truncate">{d.brand}</span>
                    <span className="text-[10px] font-mono text-white/30">{formatNaira(d.value, { compact: true })}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="v2-card p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#2F55FF]" />
                <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider">Scenario Parameters</h2>
              </div>

              {/* Deal Value */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/30">Deal Value</label>
                  <span className="text-xs font-mono text-white/70">{formatNaira(simDealValue, { compact: true })}</span>
                </div>
                <input type="range" min={5000000} max={300000000} step={5000000} value={simDealValue}
                  onChange={e => setSimDealValue(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2F55FF]"
                  data-testid="sim-slider-value"
                />
              </div>

              {/* Commission */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/30">TASCK Commission</label>
                  <span className="text-xs font-mono text-white/70">{simCommission}%</span>
                </div>
                <input type="range" min={5} max={30} step={1} value={simCommission}
                  onChange={e => setSimCommission(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8B5CF6]"
                  data-testid="sim-slider-commission"
                />
              </div>

              {/* Creative Split */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/30">Creative Payout</label>
                  <span className="text-xs font-mono text-white/70">{simCreativeSplit}%</span>
                </div>
                <input type="range" min={50} max={90} step={5} value={simCreativeSplit}
                  onChange={e => setSimCreativeSplit(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22C55E]"
                  data-testid="sim-slider-creative"
                />
              </div>

              {/* Close Probability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/30">Close Probability</label>
                  <span className="text-xs font-mono text-white/70">{simCloseProb}%</span>
                </div>
                <input type="range" min={5} max={100} step={5} value={simCloseProb}
                  onChange={e => setSimCloseProb(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F59E0B]"
                  data-testid="sim-slider-probability"
                />
              </div>

              {/* Timeline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-white/30">Close Timeline</label>
                  <span className="text-xs font-mono text-white/70">{simTimeline} days</span>
                </div>
                <input type="range" min={7} max={180} step={7} value={simTimeline}
                  onChange={e => setSimTimeline(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#06B6D4]"
                  data-testid="sim-slider-timeline"
                />
              </div>
            </div>
          </div>

          {/* Right - Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* Selected deal info */}
            <div className="v2-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2F55FF]/10 flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-[#2F55FF]" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">{selectedDeal.brand} &times; {selectedDeal.creative}</p>
                  <p className="text-white/30 text-[10px]">{selectedDeal.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/20">Original Value</p>
                  <p className="text-white/50 text-sm font-mono">{formatNaira(selectedDeal.value, { compact: true })}</p>
                </div>
              </div>
            </div>

            {/* Simulation Results */}
            <div className="v2-card-glow v2-card p-5" data-testid="sim-results">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[#2F55FF]" />
                <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Simulation Output</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/20 uppercase mb-1">TASCK Revenue</p>
                  <p className="text-xl font-bold font-mono text-[#22C55E]">{formatNaira(simResults.tasckRevenue, { compact: true })}</p>
                  <p className="text-[9px] text-white/15 mt-0.5">{simCommission}% of {formatNaira(simDealValue, { compact: true })}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/20 uppercase mb-1">Expected Value</p>
                  <p className="text-xl font-bold font-mono text-[#2F55FF]">{formatNaira(simResults.expectedValue, { compact: true })}</p>
                  <p className="text-[9px] text-white/15 mt-0.5">Weighted by {simCloseProb}% probability</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/20 uppercase mb-1">Creative Payout</p>
                  <p className="text-xl font-bold font-mono text-white/70">{formatNaira(simResults.creativePayout, { compact: true })}</p>
                  <p className="text-[9px] text-white/15 mt-0.5">{simCreativeSplit}% of deal value</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/20 uppercase mb-1">Monthly Velocity</p>
                  <p className="text-xl font-bold font-mono text-white/70">{formatNaira(simResults.monthlyVelocity, { compact: true })}</p>
                  <p className="text-[9px] text-white/15 mt-0.5">Over {simTimeline} days</p>
                </div>
              </div>

              {/* Breakdown bar */}
              <div>
                <p className="text-[10px] text-white/20 uppercase mb-2">Value Distribution</p>
                <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
                  <div className="flex items-center justify-center transition-all" style={{ width: `${simCommission}%`, background: '#22C55E30', borderLeft: '2px solid #22C55E' }}>
                    <span className="text-[7px] font-mono text-[#22C55E]">TASCK</span>
                  </div>
                  <div className="flex items-center justify-center transition-all" style={{ width: `${simCreativeSplit}%`, background: '#2F55FF20', borderLeft: '2px solid #2F55FF' }}>
                    <span className="text-[7px] font-mono text-[#6B8AFF]">Creative</span>
                  </div>
                  <div className="flex items-center justify-center flex-1" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-[7px] font-mono text-white/20">Ops</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="v2-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider">AI Recommendation</h2>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">
                {simCloseProb >= 70
                  ? `This deal has strong close probability. At ${simCommission}% commission, TASCK nets ${formatNaira(simResults.tasckRevenue, { compact: true })}. Recommend proceeding to contract stage.`
                  : simCloseProb >= 40
                  ? `Moderate probability. Consider increasing engagement frequency. A ${Math.min(simCommission + 2, 25)}% commission could still work — the expected value of ${formatNaira(simResults.expectedValue, { compact: true })} justifies the effort.`
                  : `Low probability deal. The expected value of ${formatNaira(simResults.expectedValue, { compact: true })} may not justify resource allocation. Consider nurturing or deprioritizing.`
                }
              </p>
              {simCloseProb < 40 && (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                  <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                  <span className="text-[10px] text-[#F59E0B]">Low probability — resource allocation risk</span>
                </div>
              )}
            </div>

            {/* Scenario Presets */}
            <div className="v2-card p-5">
              <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Quick Scenarios</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Conservative', commission: 10, prob: selectedDeal.probability - 15, color: '#94A3B8' },
                  { label: 'Base Case', commission: 15, prob: selectedDeal.probability, color: '#2F55FF' },
                  { label: 'Aggressive', commission: 20, prob: selectedDeal.probability + 10, color: '#22C55E' }
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => { setSimCommission(s.commission); setSimCloseProb(Math.min(Math.max(s.prob, 5), 100)); }}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors text-center"
                    data-testid={`sim-preset-${s.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: s.color }} />
                    <p className="text-[10px] text-white/50 font-medium">{s.label}</p>
                    <p className="text-[9px] text-white/20">{s.commission}% / {Math.min(Math.max(s.prob, 5), 100)}%</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup */}
      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.data?.brand}>
        {popup?.type === 'deal' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Value</p><p className="text-lg font-bold font-mono">{formatNaira(popup.data.value)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Probability</p><p className="text-lg font-bold text-[#22C55E]">{popup.data.probability}%</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Title</p><p className="text-sm">{popup.data.title}</p></div>
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-[10px] text-[#94A3B8]">Type</p><p className="text-xs">{popup.data.type}</p></div>
              <div><p className="text-[10px] text-[#94A3B8]">Stage</p><p className="text-xs capitalize">{popup.data.stage}</p></div>
            </div>
            <button onClick={() => { setPopup(null); setTab('simulator'); setSelectedDeal(popup.data); setSimDealValue(popup.data.value); setSimCloseProb(popup.data.probability); }}
              className="btn-primary text-xs w-full py-2">Open in Simulator</button>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default V2DealRoom;
