import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Projects, v3BriefResponses, v3Stages, getBrand, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Briefcase, CheckCircle, Clock, ArrowRight } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorBriefs = () => {
  const navigate = useNavigate();

  const briefs = [];
  Object.entries(v3BriefResponses).forEach(([projId, br]) => {
    if (br.creatorId === creatorId) {
      const proj = v3Projects.find(p => p.id === projId);
      if (proj) {
        const brand = getBrand(proj.brandId);
        const stage = v3Stages.find(s => s.key === proj.stage);
        briefs.push({ ...br, project: proj, brand, stage });
      }
    }
  });

  const pendingBriefs = v3Projects.filter(p => {
    const matchedCreator = p.creatorId === creatorId;
    const hasBriefResponse = v3BriefResponses[p.id];
    return matchedCreator && !hasBriefResponse && (p.stage === 'plan' || p.stage === 'frame');
  }).map(proj => {
    const brand = getBrand(proj.brandId);
    const stage = v3Stages.find(s => s.key === proj.stage);
    return { project: proj, brand, stage, status: 'awaiting_response' };
  });

  return (
    <div data-testid="v3-creator-briefs">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">BRIEFS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Brief Inbox</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Incoming opportunities and your responses.</p>

      {/* Responded briefs */}
      {briefs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Responded</h3>
          <div className="space-y-2">
            {briefs.map(brief => (
              <div key={brief.project.id} className="v3-card p-5" data-testid={`brief-${brief.project.id}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: brief.stage?.color }} />
                  <span className="text-[13px] font-medium text-[#1A1A1A]">{brief.brand?.company?.split(' ')[0]}</span>
                  <span className="text-[11px] text-[#8A8A8A]">—</span>
                  <span className="text-[13px] text-[#5C5C5C]" style={{ fontFamily: "'Fraunces', serif" }}>{brief.project.title}</span>
                  <span className="ml-auto text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Accepted
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#F4F2EC]">
                    <p className="text-[10px] text-[#8A8A8A]">Fee</p>
                    <p className="text-[13px] text-[#1A1A1A]">{brief.feeExpectation}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#F4F2EC]">
                    <p className="text-[10px] text-[#8A8A8A]">Budget</p>
                    <p className="text-[13px] text-[#1A1A1A]">{brief.budgetAlignment}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#F4F2EC]">
                    <p className="text-[10px] text-[#8A8A8A]">Availability</p>
                    <p className="text-[11px] text-[#1A1A1A]">{brief.availability?.substring(0, 50)}...</p>
                  </div>
                </div>
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Your proposed concept</p>
                <pre className="text-[12px] text-[#5C5C5C] leading-relaxed whitespace-pre-wrap font-sans">{brief.proposedConcept}</pre>
                <p className="text-[10px] text-[#8A8A8A] mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Responded {brief.respondedAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingBriefs.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-[#C49B5F] uppercase tracking-wider mb-3">Awaiting Response</h3>
          <div className="space-y-2">
            {pendingBriefs.map(brief => (
              <div key={brief.project.id} className="v3-card p-5 border-l-3" style={{ borderLeftColor: '#C49B5F', borderLeftWidth: 3 }}>
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-4 h-4 text-[#C49B5F]" />
                  <span className="text-[13px] font-medium text-[#1A1A1A]">{brief.brand?.company?.split(' ')[0]} — {brief.project.title}</span>
                </div>
                <p className="text-[12px] text-[#8A8A8A] mb-3">A new brief has been sent to you. Please review and respond.</p>
                <button className="v3-btn-primary text-[12px]">View Brief & Respond</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {briefs.length === 0 && pendingBriefs.length === 0 && (
        <div className="v3-card p-8 text-center">
          <Briefcase className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
          <p className="text-[14px] text-[#8A8A8A]">No briefs in your inbox right now.</p>
        </div>
      )}
    </div>
  );
};

export default V3CreatorBriefs;
