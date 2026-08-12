import React, { useState } from 'react';
import Avatar from '../../../components/shared/Avatar';
import DetailPopup from '../../../components/shared/DetailPopup';
import { formatNaira } from '../../../lib/utils';
import {
  TrendingUp, AlertTriangle, Send, ArrowRight, Sparkles, CheckCircle,
  XCircle, Clock, ChevronRight, Radar, Zap, Target, ArrowUpRight,
  ArrowDownRight, ExternalLink
} from 'lucide-react';

const priorities = [
  {
    id: 1,
    title: 'Close the Guinness contract.',
    detail: '₦45M. Adenike wants it signed by Friday. The contract has been with Burna\'s team for 48 hours. Follow up now.',
    action: 'Draft Follow-Up',
    urgency: 'high',
    deal: 'Guinness x Burna Boy',
    value: 45000000
  },
  {
    id: 2,
    title: 'Respond to MTN\'s counter-offer.',
    detail: 'They dropped from ₦75M to ₦62M on the Tems deal. Your options: accept, counter at ₦68M (recommended - 74% close probability), or hold.',
    action: 'Open Deal Simulator',
    urgency: 'high',
    deal: 'MTN x Tems',
    value: 62000000
  },
  {
    id: 3,
    title: 'Coca-Cola Coke Studio proposal.',
    detail: 'In scoping. They need a proposal by Wednesday. The AI has drafted one based on similar campaigns. Review and send.',
    action: 'Review Draft Proposal',
    urgency: 'medium',
    deal: 'Coca-Cola Coke Studio',
    value: 150000000
  }
];

const signals = [
  { id: 'SIG-001', type: 'TRADEMARK', source: 'Star Lager', title: '"Star Music Live" trademark filed', confidence: 92, est: '₦80-120M', time: '2h ago', color: '#22C55E' },
  { id: 'SIG-002', type: 'EARNINGS CALL', source: 'Access Bank', title: 'Q4 mentions "significant anniversary marketing"', confidence: 87, est: '₦40-60M', time: '5h ago', color: '#2F55FF' },
  { id: 'SIG-003', type: 'JOB POSTING', source: 'Flutterwave', title: 'Hiring "Creator Partnerships Lead"', confidence: 84, est: '₦25-40M', time: '1d ago', color: '#F59E0B' }
];

const dealMovements = [
  { time: '10:42 AM', event: 'Guinness approved ₦45M budget', type: 'success', deal: 'Guinness x Burna Boy' },
  { time: '9:15 AM', event: 'MTN counter-offered ₦62M on Tems deal', type: 'warning', deal: 'MTN x Tems' },
  { time: '8:00 AM', event: 'Coca-Cola confirmed March 5 proposal deadline', type: 'info', deal: 'Coca-Cola Coke Studio' },
  { time: 'Yesterday', event: 'UBA signed ₦18M Fireboy deal', type: 'success', deal: 'UBA x Fireboy' },
  { time: 'Yesterday', event: 'Glo deal for Asake fell through', type: 'error', deal: 'Glo x Asake' },
  { time: '2 days ago', event: 'Access Bank moved to NDA stage', type: 'info', deal: 'Access Bank x Davido' },
  { time: '2 days ago', event: '₦12M escrow released - Rema x Boomplay', type: 'success', deal: 'Rema x Boomplay' }
];

const pipelineStages = [
  { stage: 'Lead', count: 3, value: 95000000, color: '#94A3B8' },
  { stage: 'Discovery', count: 3, value: 127000000, color: '#2F55FF' },
  { stage: 'Scoping', count: 3, value: 245000000, color: '#8B5CF6' },
  { stage: 'NDA', count: 1, value: 45000000, color: '#06B6D4' },
  { stage: 'Terms', count: 2, value: 130000000, color: '#F59E0B' },
  { stage: 'Active', count: 5, value: 178000000, color: '#22C55E' },
  { stage: 'Closed', count: 2, value: 27200000, color: '#10B981' }
];

const totalPipeline = pipelineStages.reduce((a, s) => a + s.value, 0);

const copilotMessages = [
  { role: 'copilot', text: "I've been monitoring your pipeline overnight. Three things need attention: the Guinness contract is aging (48h with Burna's team), the MTN counter needs a response, and I found a new signal from Star Lager that looks very promising." },
  { role: 'copilot', text: "Star Lager filed a trademark for 'Star Music Live' - this has 92% confidence as a deal signal. Their social ad spend is up 340% in 30 days and they have a new CMO from Diageo. I'd recommend reaching out today. Want me to draft outreach?" }
];

const CommandCenter = () => {
  const [popup, setPopup] = useState(null);
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in" data-testid="v2-command-center">
      {/* Three-zone layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT ZONE - The Briefing (60%) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Header */}
          <div>
            <p className="text-white/25 text-[10px] uppercase tracking-[0.15em] mb-1">DAILY BRIEFING</p>
            <h1 className="text-white text-xl font-bold tracking-tight">{greeting}, Tunde.</h1>
            <p className="text-white/30 text-xs">Here's your briefing for {dateStr}.</p>
          </div>

          {/* Block 1: Revenue Pulse */}
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-[#2F55FF]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Revenue Pulse</h2>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              You're at <span className="text-white font-bold font-mono">₦234.8M</span> YTD against a ₦500M target (<span className="text-white font-medium">47%</span>). At current velocity, you'll hit ₦480M by December - ₦20M short. The <span className="text-[#22C55E] font-medium">Coca-Cola deal (₦150M)</span> would put you well over target. Prioritize it.
            </p>
            <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2F55FF] to-[#22C55E] rounded-full" style={{ width: '47%' }} />
              <div className="absolute inset-y-0 left-[47%] w-2 h-2 bg-white rounded-full v2-pulse -translate-x-1" />
              <div className="absolute inset-y-0 right-0 w-px bg-white/20" style={{ left: '100%' }}>
                <span className="absolute -top-5 -translate-x-1/2 text-[8px] text-white/25 font-mono">₦500M</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] text-white/25 font-mono">₦0</span>
              <span className="text-[9px] text-white/25 font-mono">₦234.8M</span>
              <span className="text-[9px] text-white/25 font-mono">₦500M</span>
            </div>
          </div>

          {/* Block 2: Today's Three Priorities */}
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-3.5 h-3.5 text-[#F59E0B]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Today's Priorities</h2>
            </div>
            <div className="space-y-3">
              {priorities.map((p, i) => (
                <div key={p.id} onClick={() => setPopup({ type: 'priority', data: p })} className="group flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] cursor-pointer transition-all" data-testid={`priority-${p.id}`}>
                  <span className={`text-xs font-bold font-mono mt-0.5 ${i === 0 ? 'text-[#EF4444]' : i === 1 ? 'text-[#F59E0B]' : 'text-[#2F55FF]'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <p className="text-white/90 text-sm font-medium mb-1">{p.title}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{p.detail}</p>
                    <button className="mt-2 text-[#2F55FF] text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.action} <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block 3: Signals Detected */}
          <div className="v2-card-glow v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radar className="w-3.5 h-3.5 text-[#22C55E]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Signals Detected</h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] ml-auto">{signals.length} new</span>
            </div>
            <div className="space-y-2.5">
              {signals.map(sig => (
                <div key={sig.id} onClick={() => setPopup({ type: 'signal', data: sig })} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-[#22C55E]/20 cursor-pointer transition-all group" data-testid={`signal-${sig.id}`}>
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 v2-pulse" style={{ background: sig.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded text-white/30 bg-white/[0.04] font-mono">{sig.type}</span>
                      <span className="text-[10px] text-white/20">{sig.time}</span>
                    </div>
                    <p className="text-white/50 text-xs">{sig.source} - <span className="text-white/80">{sig.title}</span></p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-white/30">Confidence: <span className="text-white/60 font-mono">{sig.confidence}%</span></span>
                      <span className="text-[10px] text-white/30">Est: <span className="text-[#22C55E] font-mono">{sig.est}</span></span>
                    </div>
                    <button className="mt-1 text-[#2F55FF] text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Investigate <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 text-[#2F55FF] text-xs flex items-center gap-1 hover:gap-2 transition-all">
              View All Signals <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Block 4: Deal Movement */}
          <div className="v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-3.5 h-3.5 text-white/40" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Deal Movement</h2>
              <span className="text-[10px] text-white/20 ml-auto">Last 48h</span>
            </div>
            <div className="space-y-1">
              {dealMovements.map((dm, i) => (
                <div key={i} onClick={() => setPopup({ type: 'deal_movement', data: dm })} className="flex items-center gap-3 py-2 hover:bg-white/[0.02] px-2 -mx-2 rounded-lg cursor-pointer transition-colors">
                  <span className="text-[10px] text-white/15 font-mono w-16 flex-shrink-0">{dm.time}</span>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    dm.type === 'success' ? 'bg-[#22C55E]' : dm.type === 'warning' ? 'bg-[#F59E0B]' : dm.type === 'error' ? 'bg-[#EF4444]' : 'bg-[#2F55FF]'
                  }`} />
                  <span className="text-xs text-white/50 flex-1">{dm.event}</span>
                  {dm.type === 'success' && <CheckCircle className="w-3 h-3 text-[#22C55E]/40 flex-shrink-0" />}
                  {dm.type === 'warning' && <AlertTriangle className="w-3 h-3 text-[#F59E0B]/40 flex-shrink-0" />}
                  {dm.type === 'error' && <XCircle className="w-3 h-3 text-[#EF4444]/40 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT ZONE (40%) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Pipeline Snapshot */}
          <div className="v2-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Pipeline Snapshot</h2>
              <button className="text-[#2F55FF] text-[10px] hover:underline">Full Pipeline</button>
            </div>

            {/* Funnel bar */}
            <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden mb-3">
              {pipelineStages.map(s => (
                <div
                  key={s.stage}
                  onClick={() => setPopup({ type: 'stage', data: s })}
                  className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative group"
                  style={{ width: `${(s.value / totalPipeline) * 100}%`, background: `${s.color}20`, borderLeft: `2px solid ${s.color}` }}
                  title={`${s.stage}: ${s.count} deals - ${formatNaira(s.value, { compact: true })}`}
                >
                  <span className="text-[8px] font-mono text-white/50 group-hover:text-white/80 transition-colors">{s.count}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
              {pipelineStages.map(s => (
                <span key={s.stage} className="flex items-center gap-1 text-[9px] text-white/30">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  {s.stage}
                </span>
              ))}
            </div>

            {/* Stage breakdown */}
            <div className="space-y-2">
              {pipelineStages.map(s => (
                <div key={s.stage} onClick={() => setPopup({ type: 'stage', data: s })} className="flex items-center gap-3 py-1.5 hover:bg-white/[0.02] px-2 -mx-2 rounded cursor-pointer transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-white/50 flex-1">{s.stage}</span>
                  <span className="text-[10px] text-white/25">{s.count} deals</span>
                  <span className="text-xs text-white/60 font-mono">{formatNaira(s.value, { compact: true })}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/20">Total Pipeline</p>
                <p className="text-lg text-white font-bold font-mono">{formatNaira(totalPipeline, { compact: true })}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/20">Weighted</p>
                <p className="text-sm text-white/60 font-mono">₦412.5M</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/20">Avg Close</p>
                <p className="text-sm text-white/60 font-mono">34 days</p>
              </div>
            </div>
          </div>

          {/* Copilot Zone */}
          <div className="v2-card-glow v2-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#2F55FF]" />
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wider">Copilot</h2>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] v2-pulse ml-1" />
            </div>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {copilotMessages.map((msg, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#2F55FF]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-[#2F55FF]" />
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Quick replies */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Draft MTN response', 'Tell me about Star Lager', 'Show pipeline changes'].map(reply => (
                <button key={reply} onClick={() => setPopup({ type: 'copilot', data: { reply } })} className="text-[10px] px-3 py-1.5 rounded-full border border-[#2F55FF]/20 text-[#6B8AFF] hover:bg-[#2F55FF]/10 transition-colors">
                  {reply}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <input type="text" placeholder="Ask the Copilot anything..." className="flex-1 bg-transparent text-white/70 text-xs placeholder:text-white/15 outline-none" />
              <button className="p-1.5 rounded-md bg-[#2F55FF]/15 text-[#2F55FF] hover:bg-[#2F55FF]/25 transition-colors">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Popup */}
      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'priority' ? popup?.data?.deal : popup?.type === 'signal' ? popup?.data?.source : popup?.type === 'stage' ? `${popup?.data?.stage} Stage` : popup?.type === 'deal_movement' ? popup?.data?.deal : popup?.type === 'copilot' ? 'Copilot' : 'Details'}>
        {popup?.type === 'priority' && popup?.data && (
          <div className="space-y-3">
            <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Deal Value</p><p className="text-lg font-bold font-mono">{formatNaira(popup.data.value)}</p></div>
            <p className="text-xs text-[#475569]">{popup.data.detail}</p>
            <button className="btn-primary text-xs w-full py-2">{popup.data.action}</button>
          </div>
        )}
        {popup?.type === 'signal' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Confidence</p><p className="text-lg font-bold text-[#22C55E]">{popup.data.confidence}%</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Est. Value</p><p className="text-lg font-bold font-mono">{popup.data.est}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Signal</p><p className="text-xs">{popup.data.title}</p></div>
            <button className="btn-primary text-xs w-full py-2">Create Deal from Signal</button>
          </div>
        )}
        {popup?.type === 'stage' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Deals</p><p className="text-lg font-bold">{popup.data.count}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Value</p><p className="text-lg font-bold font-mono">{formatNaira(popup.data.value)}</p></div>
            </div>
            <button className="btn-primary text-xs w-full py-2">View Pipeline</button>
          </div>
        )}
        {popup?.type === 'deal_movement' && popup?.data && (
          <div className="space-y-3">
            <p className="text-xs text-[#475569]">{popup.data.event}</p>
            <p className="text-[10px] text-[#94A3B8]">Time: {popup.data.time}</p>
            <button className="btn-primary text-xs w-full py-2">Open Deal</button>
          </div>
        )}
        {popup?.type === 'copilot' && popup?.data && (
          <div className="space-y-3">
            <p className="text-xs text-[#475569]">Copilot is processing: "{popup.data.reply}"</p>
            <div className="bg-[#F8FAFC] rounded-lg p-4 text-center"><Sparkles className="w-6 h-6 text-[#2F55FF] mx-auto mb-2" /><p className="text-xs text-[#94A3B8]">AI response would appear here with data-backed insights.</p></div>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default CommandCenter;
