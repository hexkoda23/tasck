import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Projects, v3AlignmentSnapshots, v3CreativeSnapshots, v3BriefResponses, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { ChevronLeft, Sparkles, Plus, Lightbulb, MessageSquare, Target, Palette, Users, CheckCircle } from 'lucide-react';

const V3AdminBrainstorm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');

  const notes = [
    { id: 'n1', author: 'RM', color: '#1F4A3A', text: 'Alignment Snapshot confirmed — brand wants cultural specificity, not generic Afro-aesthetic. Creator must have real authority in their cultural context.', type: 'insight', time: '2 days ago' },
    { id: 'n2', author: 'AI Assist', color: '#C49B5F', text: 'Based on the brand\'s stated goals and audience (18–28, SEC A/B, urban Nigeria), recommend focusing on short-form storytelling formats. Long-form (>5 min) underperforms with this demographic unless anchored by a recognizable creator.', type: 'ai', time: '2 days ago' },
    { id: 'n3', author: 'RM', color: '#1F4A3A', text: 'Brand contact specifically mentioned "shareability" and "earned media" as priorities. The campaign should be built for organic distribution, not just paid reach. Consider a mechanic that rewards sharing.', type: 'insight', time: '1 day ago' },
    { id: 'n4', author: 'AI Assist', color: '#C49B5F', text: 'Competitive analysis: Pepsi Nigeria ran a Fireboy campaign in Q2 2025 with similar audience targeting. It achieved 4.2% engagement — below category average. The differentiator should be cultural depth, not just celebrity placement.', type: 'ai', time: '1 day ago' },
    { id: 'n5', author: 'RM', color: '#1F4A3A', text: 'Physical activation is important — brand mentioned "Lekki or VI" for a December event. Budget carve-out for this needs clarity before Plan. Could be 15–20% of total.', type: 'strategy', time: '12 hours ago' },
    { id: 'n6', author: 'AI Assist', color: '#C49B5F', text: 'Budget note: at the estimated value, a 15% physical activation carve-out is feasible for a single-day Lagos activation with 500–1,000 attendees. Recommend confirming venue availability early — Detty December booking windows close fast.', type: 'ai', time: '12 hours ago' },
  ];

  const project = v3Projects.find(p => p.id === id);
  const brand = project ? getBrand(project.brandId) : null;
  const creator = project ? getCreator(project.creatorId) : null;
  const rm = project ? getRM(project.rmId) : null;
  const snapshot = project ? v3AlignmentSnapshots[id] : null;

  if (!project) return <div className="p-8 text-[#8A8A8A]">Project not found.</div>;

  const campaignAngles = [
    { title: 'Multi-chapter storytelling', desc: 'Creator authors 3 short stories revealed across Detty December. Bottles carry story-fragments that complete when shared.', votes: 4, status: 'leading' },
    { title: 'Creator-as-curator', desc: 'Creator curates a "Share a Coke" playlist of Nigerian moments — each moment becomes a short-form content piece.', votes: 2, status: 'exploring' },
    { title: 'UGC amplification', desc: 'Creator seeds the campaign, then fans continue the story. Mechanic: personalized bottle = personalized story.', votes: 1, status: 'exploring' },
  ];

  const creatorShortlist = [
    { name: 'Tems', fit: 94, reason: 'Grammy-winner. Strong female audience. Nigerian roots + global reach. Ideal for "Share a Coke" emotional storytelling.', status: 'Recommended' },
    { name: 'Ayra Starr', fit: 88, reason: 'Gen-Z female audience. Nightlife/fashion crossover. Could anchor physical activation. Lower rate.', status: 'Alternate' },
    { name: 'Rema', fit: 93, reason: 'Pan-African resonance. Documentary-adjacent aesthetic. But better suited for Guinness-type repositioning.', status: 'Not recommended for this brief' },
  ];

  const contentPlan = [
    { item: 'Hero creator film', format: '60 to 90 seconds', owner: 'Creative', status: 'Planned' },
    { item: 'Social cutdowns', format: '6 vertical edits', owner: 'TASCK production', status: 'Planned' },
    { item: 'Behind the scenes assets', format: '10 stills and clips', owner: 'Production team', status: 'Planned' },
    { item: 'Posting guide', format: 'Captions, CTA, tags, timing', owner: 'TASCK strategy', status: 'Planned' },
  ];

  const budgetPlan = [
    { line: 'Creator fee', amount: Math.round(project.estimatedValue * 0.28), owner: 'Negotiated by TASCK' },
    { line: 'Production budget', amount: Math.round(project.estimatedValue * 0.22), owner: 'TASCK production' },
    { line: 'Paid media and amplification', amount: Math.round(project.estimatedValue * 0.18), owner: 'Brand and TASCK' },
    { line: 'Strategy Development Fee', amount: Math.max(4000000, Math.round(project.estimatedValue * 0.035)), owner: 'Brand payable before Delivery' },
  ];

  const revenuePlan = {
    brandBudget: project.estimatedValue,
    creatorFee: budgetPlan[0].amount,
    productionBudget: budgetPlan[1].amount,
    strategyDevelopmentFee: budgetPlan[3].amount,
    tasckManagementFee: Math.round(project.estimatedValue * 0.12),
  };

  const contractPlan = [
    'Brand service agreement includes scope, approvals, payment schedule, usage rights, and reporting obligations.',
    'Independent creator agreement includes creator deliverables, fee, usage, exclusivity, cancellation, and payment triggers.',
    'Budget schedule carries creator fee, production spend, paid media, Strategy Development Fee, and TASCK management fee.',
    'Deliverables schedule feeds Delivery and the Final Campaign Report.',
  ];

  return (
    <div data-testid="v3-admin-brainstorm">
      <button onClick={() => navigate(`/v3/admin/projects/${id}`)} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to project
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-5 h-5 text-[#C49B5F]" />
        <div>
          <h1 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>Campaign Workspace</h1>
          <p className="text-[12px] text-[#8A8A8A]">{brand?.company?.split(' ')[0]} — {project.title}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main workspace */}
        <div className="flex-1 space-y-6">
          {/* Strategic notes / brainstorm feed */}
          <div className="v3-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider">Strategic Notes</h3>
              <span className="text-[10px] text-[#8A8A8A] ml-auto">{notes.length} entries</span>
            </div>
            <div className="space-y-3 mb-4">
              {notes.map(note => (
                <div key={note.id} className="flex gap-3 p-3 rounded-lg bg-[#FAFAF7]">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${note.color}15` }}>
                    {note.type === 'ai' ? <Sparkles className="w-3.5 h-3.5" style={{ color: note.color }} /> : <MessageSquare className="w-3.5 h-3.5" style={{ color: note.color }} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium text-[#1A1A1A]">{note.author}</span>
                      <span className="text-[9px] text-[#D4CDBF]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{note.time}</span>
                    </div>
                    <p className="text-[12px] text-[#5C5C5C] leading-relaxed">{note.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Add note */}
            <div className="flex gap-2">
              <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a strategic note..."
                className="flex-1 px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" data-testid="brainstorm-note-input" />
              <button className="v3-btn-primary" data-testid="brainstorm-add-note"><Plus className="w-3.5 h-3.5" /> Add</button>
              <button className="v3-btn-secondary"><Sparkles className="w-3.5 h-3.5" /> AI Suggest</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Content Plan</h3>
              <div className="space-y-3">
                {contentPlan.map(item => (
                  <div key={item.item} className="p-3 rounded-lg bg-[#FAFAF7]">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{item.item}</p>
                      <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">{item.status}</span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A]">{item.format} · {item.owner}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Budget Plan</h3>
              <div className="space-y-3">
                {budgetPlan.map(item => (
                  <div key={item.line} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#FAFAF7]">
                    <div>
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{item.line}</p>
                      <p className="text-[11px] text-[#8A8A8A]">{item.owner}</p>
                    </div>
                    <p className="text-[12px] text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(item.amount)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Revenue Plan</h3>
              {[
                ['Brand budget', revenuePlan.brandBudget],
                ['Creator fee', revenuePlan.creatorFee],
                ['Production budget', revenuePlan.productionBudget],
                ['Strategy Development Fee', revenuePlan.strategyDevelopmentFee],
                ['TASCK management fee', revenuePlan.tasckManagementFee],
                ['Projected TASCK revenue', revenuePlan.strategyDevelopmentFee + revenuePlan.tasckManagementFee],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between border-b border-[#E8E4DB] py-2 text-[12px] last:border-0">
                  <span>{label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(amount)}</span>
                </div>
              ))}
            </div>

            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Contract Plan</h3>
              <div className="space-y-2">
                {contractPlan.map(item => (
                  <div key={item} className="flex gap-2 text-[12px] text-[#5C5C5C] leading-relaxed">
                    <CheckCircle className="w-3.5 h-3.5 text-[#1F4A3A] mt-0.5 flex-shrink-0" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign angles */}
          <div className="v3-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider">Campaign Angles</h3>
            </div>
            <div className="space-y-3">
              {campaignAngles.map((angle, i) => (
                <div key={i} className={`p-4 rounded-lg border ${angle.status === 'leading' ? 'border-[#1F4A3A] bg-[#1F4A3A08]' : 'border-[#E8E4DB]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[13px] font-medium text-[#1A1A1A]">{angle.title}</h4>
                    {angle.status === 'leading' && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">Leading</span>}
                    {angle.status === 'exploring' && <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">Exploring</span>}
                  </div>
                  <p className="text-[12px] text-[#5C5C5C] leading-relaxed">{angle.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail — Creator shortlist + context */}
        <div className="w-[300px] flex-shrink-0 space-y-5">
          {/* Imported context */}
          <div className="v3-ai-panel">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#1F4A3A]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Imported from Alignment</span>
            </div>
            {snapshot && (
              <div className="space-y-2 text-[11px] text-[#5C5C5C]">
                <p><strong>Audience:</strong> 18–28, SEC A/B, urban Nigeria</p>
                <p><strong>Budget:</strong> ₦100M – ₦150M (ceiling TBC)</p>
                <p><strong>Timeline:</strong> In-market Dec 1, 2026</p>
                <p><strong>Priority:</strong> Shareability + earned media</p>
                <p><strong>Concern:</strong> Creator reliability (2024 bad experience)</p>
              </div>
            )}
          </div>

          {/* Creator shortlist */}
          <div className="v3-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-[#1F4A3A]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Creator Shortlist</span>
            </div>
            <div className="space-y-3">
              {creatorShortlist.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#FAFAF7]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-[#1A1A1A]">{c.name}</span>
                    <span className="text-[11px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.fit}</span>
                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${c.status === 'Recommended' ? 'text-[#1F4A3A] bg-[#DDE7E2]' : c.status === 'Alternate' ? 'text-[#C49B5F] bg-[#C49B5F12]' : 'text-[#8A8A8A] bg-[#F4F2EC]'}`}>{c.status}</span>
                  </div>
                  <p className="text-[10px] text-[#8A8A8A] leading-relaxed">{c.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3AdminBrainstorm;
