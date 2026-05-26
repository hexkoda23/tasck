import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Brands, v3Interactions, getProjectsForBrand, v3Stages, formatNairaV3 } from '../../../lib/v3data';
import { v3GetBrand } from '../../../lib/v3api';
import { ChevronLeft, Mail, Phone, Globe, Building2, Sparkles } from 'lucide-react';

const normaliseBrand = (b) => ({
  ...b,
  primaryContact: b.primaryContact || b.primary_contact,
  leadScore: b.leadScore || b.lead_score || 0,
  lastInteraction: b.lastInteraction || b.last_interaction,
  decisionMakers: b.decisionMakers || [{ name: b.primary_contact || b.primaryContact, role: b.role || 'Primary contact', note: 'primary' }],
  leadScoreFactors: b.leadScoreFactors || [{ factor: 'CRM intake', detail: b.status || 'Captured in CRM' }],
});

const V3AdminBrandDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fallbackBrand = v3Brands.find(b => b.id === id);
  const [bundle, setBundle] = useState(fallbackBrand ? { brand: fallbackBrand, contacts: [], business_cases: getProjectsForBrand(id), interactions: v3Interactions[id] || [], emails: [] } : null);

  useEffect(() => {
    v3GetBrand(id).then(setBundle).catch(() => {});
  }, [id]);

  if (!bundle?.brand) return <div className="p-8 text-[#8A8A8A]">Brand not found.</div>;
  const brand = normaliseBrand(bundle.brand);
  const projects = bundle.business_cases || getProjectsForBrand(id);
  const interactions = bundle.interactions || v3Interactions[id] || [];
  const emails = bundle.emails || [];
  const scoreColor = brand.leadScore >= 70 ? '#1F4A3A' : brand.leadScore >= 40 ? '#C49B5F' : '#B54A37';

  return (
    <div data-testid="v3-brand-detail">
      <button onClick={() => navigate('/v3/admin/crm')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]"><ChevronLeft className="w-3.5 h-3.5" /> All brands</button>
      <div className="flex gap-8">
        <div className="w-[280px] flex-shrink-0 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{brand.company}</h1>
            <p className="text-[12px] text-[#8A8A8A] mt-1">{brand.industry}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${scoreColor}12`, border: `2px solid ${scoreColor}30` }}>
              <span className="text-lg font-bold" style={{ color: scoreColor, fontFamily: "'JetBrains Mono', monospace" }}>{brand.leadScore}</span>
            </div>
            <div><p className="text-[11px] text-[#8A8A8A]">Lead Score</p><p className="text-[12px] text-[#5C5C5C]">{brand.status}</p></div>
          </div>
          <div className="v3-card p-4 space-y-2 text-[12px]">
            <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-[#8A8A8A]" /><span className="text-[#5C5C5C]">{brand.hq}</span></div>
            <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#8A8A8A]" /><span className="text-[#5C5C5C]">{brand.email}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#8A8A8A]" /><span className="text-[#5C5C5C]">{brand.phone}</span></div>
            <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-[#8A8A8A]" /><span className="text-[#5C5C5C]">{brand.website}</span></div>
          </div>
          <div className="v3-card p-4">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Decision Makers</p>
            {brand.decisionMakers.map((dm, i) => (
              <div key={i} className="py-1.5 border-b border-[#F4F2EC] last:border-0">
                <p className="text-[12px] text-[#1A1A1A] font-medium">{dm.name}</p>
                <p className="text-[10px] text-[#8A8A8A]">{dm.role}{dm.note ? ` (${dm.note})` : ''}</p>
              </div>
            ))}
          </div>
          <div className="v3-card p-4">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Lead Score Factors</p>
            {brand.leadScoreFactors.map((f, i) => (
              <div key={i} className="py-1.5 border-b border-[#F4F2EC] last:border-0">
                <p className="text-[12px] text-[#1A1A1A]">{f.factor}</p>
                <p className="text-[10px] text-[#8A8A8A]">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Projects</h2>
              {projects.map(proj => {
                const stage = v3Stages.find(s => s.key === proj.stage);
                return (
                  <button key={proj.id} onClick={() => navigate(`/v3/admin/projects/${proj.id}`)} className="w-full v3-card p-4 text-left flex items-center gap-3 hover:border-[#D4CDBF] transition-colors mb-2">
                    <div className="w-2 h-8 rounded-full" style={{ background: stage?.color }} />
                    <div className="flex-1"><p className="text-[13px] font-medium text-[#1A1A1A]">{proj.title}</p><p className="text-[11px] text-[#8A8A8A]">{stage?.label || proj.stage} &middot; {formatNairaV3(proj.estimatedValue || proj.estimated_value || 0)}</p></div>
                  </button>
                );
              })}
            </div>
          )}
          {emails.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Queued Emails</h2>
              {emails.slice(0, 4).map(email => (
                <div key={email.id} className="v3-card p-4 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-medium text-[#1A1A1A]">{email.subject}</p>
                    <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">{email.status}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A]">{email.to}</p>
                </div>
              ))}
            </div>
          )}
          <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Interaction History</h2>
          {interactions.length > 0 ? interactions.map(int => (
            <div key={int.id} className="v3-card p-4 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#8A8A8A] capitalize">{int.type.replace('_', ' ')}</span>
                <span className="text-[11px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{int.dateISO || int.date_iso}</span>
                <span className="text-[11px] text-[#5C5C5C] ml-auto">{int.author}</span>
              </div>
              <p className="text-[13px] font-medium text-[#1A1A1A] mb-1">{int.title}</p>
              <pre className="text-[12px] text-[#5C5C5C] leading-relaxed whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">{int.content}</pre>
            </div>
          )) : (
            <div className="v3-card p-6 text-center">
              <p className="text-[#8A8A8A] text-[13px]">No interactions recorded yet.</p>
              <button className="v3-btn-secondary mt-3 text-[12px]">Add Interaction</button>
            </div>
          )}
          {/* Follow-up drafter */}
          {brand.leadScore < 75 && (
            <div className="mt-4 v3-ai-panel">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-[#1F4A3A]" /><span className="text-[11px] font-semibold uppercase tracking-wider">AI Assist</span></div>
              <p className="text-[12px] text-[#5C5C5C] mb-3">This lead hasn't been contacted recently. Draft a follow-up?</p>
              <button className="v3-btn-primary text-[12px]"><Sparkles className="w-3.5 h-3.5" /> Draft Follow-Up</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default V3AdminBrandDetail;
