import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Stages, formatNairaV3 } from '../../../lib/v3data';
import { v3GetBrand, v3CreateInteraction, v3MoveBrandToBusinessCall, v3MoveBrandToFrame, v3ListRelationshipManagers, v3DeleteBrand, v3DraftBrandFollowUp } from '../../../lib/v3api';
import BrandLogo from '../../../components/v3/BrandLogo';
import {
  ChevronLeft,
  Mail,
  Phone,
  Globe,
  Building2,
  Copy,
  Sparkles,
  Plus,
  X,
  MessageSquare,
  Trash2,
  BriefcaseBusiness,
} from 'lucide-react';
import V3Modal from '../../../components/v3/V3Modal';

const normaliseBrand = (b) => ({
  ...b,
  primaryContact: b.primaryContact || b.primary_contact,
  leadScore: b.leadScore || b.lead_score || 0,
  lastInteraction: b.lastInteraction || b.last_interaction,
  decisionMakers: b.decisionMakers || [
    { name: b.primary_contact || b.primaryContact, role: b.role || 'Primary contact', note: 'primary' },
  ],
  leadScoreFactors: b.leadScoreFactors || [
    { factor: 'CRM intake', detail: b.status || 'Captured in CRM' },
  ],
  rmId: b.rm_id || b.relationship_manager?.id || 'rm-temi',
  relationshipManager: b.relationship_manager || {
    name: b.relationship_manager_name || 'Unassigned',
    email: b.relationship_manager_email || '',
    initials: (b.relationship_manager_name || 'U').substring(0, 2).toUpperCase(),
  },
});

const INTERACTION_TYPES = [
  { value: 'call', label: 'Phone Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'note', label: 'Internal Note' },
  { value: 'follow_up', label: 'Follow-Up' },
];

const V3AdminBrandDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [submittingInteraction, setSubmittingInteraction] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [followUpNotice, setFollowUpNotice] = useState('');
  const [draftingFollowUp, setDraftingFollowUp] = useState(false);
  const [followUpMeta, setFollowUpMeta] = useState(null);
  const [interactionForm, setInteractionForm] = useState({
    type: 'call',
    date_iso: new Date().toISOString().slice(0, 10),
    title: '',
    summary: '',
    participants: '',
    transcript: '',
    next_action: '',
    business_case_id: '',
    create_meeting: false,
  });

  useEffect(() => {
    setLoading(true);
    let mounted = true;
    v3GetBrand(id)
      .then((data) => {
        if (!mounted) return;
        setBundle(data);
        if (data?.business_cases?.length === 1) {
          setInteractionForm((f) => ({ ...f, business_case_id: data.business_cases[0].id }));
        }
      })
      .catch(() => mounted && setBundle(null))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  const submitInteraction = async () => {
    if (!interactionForm.title || !interactionForm.type) return;
    setSubmittingInteraction(true);
    try {
      const payload = {
        brand_id: id,
        ...interactionForm,
        participants: interactionForm.participants
          ? interactionForm.participants.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const created = await v3CreateInteraction(payload);
      // Optimistically prepend interaction
      setBundle((prev) => ({
        ...prev,
        interactions: [created, ...(prev?.interactions || [])],
      }));
      setInteractionOpen(false);
      setInteractionForm({
        type: 'call',
        date_iso: new Date().toISOString().slice(0, 10),
        title: '',
        summary: '',
        participants: '',
        transcript: '',
        next_action: '',
        business_case_id: '',
        create_meeting: false,
      });
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setSubmittingInteraction(false);
    }
  };

  const handleDeleteBrand = async () => {
    setDeleting(true);
    try {
      await v3DeleteBrand(id);
      navigate('/v3/admin/crm');
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Failed to delete brand.');
      setDeleting(false);
    }
  };

  const moveToBusinessCall = async () => {
    const brand = bundle?.brand;
    if (!brand) return;
    const hasContactRoute = Boolean(brand.email || brand.phone || brand.website);
    if (!hasContactRoute && !window.confirm('This brand has no email, phone, or website. Create the Business Call anyway?')) {
      return;
    }
    try {
      const result = await v3MoveBrandToBusinessCall(brand.id);
      navigate(`/v3/admin/business-cases/${result.business_case_id}/connect`);
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Failed to create Business Call — Connect.');
    }
  };

  const moveToFrame = async () => {
    const brand = bundle?.brand;
    if (!brand) return;
    try {
      const result = await v3MoveBrandToFrame(brand.id);
      navigate(`/v3/admin/business-cases/${result.business_case_id}/frame/snapshot`);
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Failed to move brand to Frame.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#8A8A8A] text-[13px]" data-testid="v3-brand-detail-loading">
        Loading brand…
      </div>
    );
  }

  if (!bundle?.brand) {
    return (
      <div className="p-8" data-testid="v3-brand-detail-not-found">
        <button
          onClick={() => navigate('/v3/admin/crm')}
          className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> All brands
        </button>
        <div className="v3-card p-8 text-center">
          <p className="text-[#8A8A8A] text-[14px]">Brand not found.</p>
          <button className="v3-btn-secondary mt-4" onClick={() => navigate('/v3/admin/crm')}>
            Back to CRM
          </button>
        </div>
      </div>
    );
  }

  const brand = normaliseBrand(bundle.brand);
  const projects = bundle.business_cases || [];
  const interactions = bundle.interactions || [];
  const emails = bundle.emails || [];
  const scoreColor = brand.leadScore >= 70 ? '#1F4A3A' : brand.leadScore >= 40 ? '#C49B5F' : '#B54A37';
  const activeProject = projects[0];
  const latestInteraction = interactions[0];
  const draftFollowUp = async () => {
    setDraftingFollowUp(true);
    setFollowUpNotice('Drafting follow-up with TASCK AI Assist…');
    const fallbackDraft = () => {
      const contactName = brand.primaryContact || brand.contact_name || 'there';
      const projectStatus = activeProject
        ? `I also wanted to reconnect on ${activeProject.title || activeProject.name || 'the active business case'}, currently in ${activeProject.stage_label || activeProject.stage || 'progress'}.`
        : 'I wanted to reconnect and confirm the next best step for a TASCK business case.';
      const recentContext = latestInteraction?.title
        ? `Last CRM note: ${latestInteraction.title}.`
        : 'There is no recent CRM follow-up logged, so I wanted to check in directly.';
      return [
        `Hi ${contactName},`,
        `Hope you are well. ${projectStatus}`,
        `${recentContext} Based on the current CRM details, the useful next step is to confirm your priority, timeline, and the decision maker for moving this forward.`,
        'Would you be open to a quick call this week so we can align on the brief and next action?',
        'Best,\nTASCK Team',
      ].join('\n\n');
    };
    let draft = '';
    let subject = `Follow-up draft — ${brand.company}`;
    let source = 'fallback';
    let model = '';
    try {
      const result = await v3DraftBrandFollowUp(brand.id || id, {});
      draft = (result?.draft || '').trim();
      subject = result?.subject || subject;
      source = result?.analysis_source || 'fallback';
      model = result?.analysis_model || '';
    } catch (err) {
      console.warn('AI draft fallback used:', err?.response?.data?.detail || err?.message);
    }
    if (!draft) {
      draft = fallbackDraft();
      source = 'fallback';
    }
    setFollowUpDraft(draft);
    setFollowUpMeta({ subject, source, model });
    setFollowUpNotice(source === 'fallback'
      ? 'AI Assist is offline — used a safe deterministic draft. Edit before sending.'
      : `Follow-up draft generated via ${source}${model ? ` (${model})` : ''}. Loaded into the interaction form.`);
    setInteractionForm({
      type: 'follow_up',
      date_iso: new Date().toISOString().slice(0, 10),
      title: subject,
      summary: draft,
      participants: brand.primaryContact || '',
      transcript: '',
      next_action: 'Review and send follow-up',
      business_case_id: activeProject?.id || '',
      create_meeting: false,
    });
    setInteractionOpen(true);
    setDraftingFollowUp(false);
  };
  const copyFollowUpDraft = () => {
    if (!followUpDraft.trim()) {
      setFollowUpNotice('Generate a follow-up draft first.');
      return;
    }
    if (!navigator.clipboard) {
      setFollowUpNotice('Copy is unavailable in this browser. The draft is visible below.');
      return;
    }
    navigator.clipboard.writeText(followUpDraft)
      .then(() => setFollowUpNotice('Follow-up draft copied.'))
      .catch(() => setFollowUpNotice('Copy failed. The draft is visible below.'));
  };

  return (
    <>
      <div data-testid="v3-brand-detail">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/v3/admin/crm')}
            className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] hover:text-[#5C5C5C]"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> All brands
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#E0B0A4] bg-[#FBF1EE] text-[#B54A37] hover:bg-[#F5D9D2] transition-colors disabled:opacity-50"
            data-testid="brand-delete-button"
            title="Delete this brand and all its linked records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete brand'}
          </button>
        </div>
        <div className="flex gap-8">
          {/* Left sidebar */}
          <div className="w-[280px] flex-shrink-0 space-y-5">
            <div className="flex items-start gap-3">
              <BrandLogo brand={brand} size="lg" testId="brand-detail-logo" />
              <div className="min-w-0 flex-1">
                <h1
                  className="text-xl font-semibold text-[#1A1A1A] truncate"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {brand.company}
                </h1>
                <p className="text-[12px] text-[#8A8A8A] mt-1">{brand.industry || 'Uncategorised'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: `${scoreColor}12`, border: `2px solid ${scoreColor}30` }}
              >
                <span
                  className="text-lg font-bold"
                  style={{ color: scoreColor, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {brand.leadScore || '—'}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-[#8A8A8A]">Lead Score</p>
                <p className="text-[12px] text-[#5C5C5C]">{brand.status || 'Active'}</p>
              </div>
            </div>
            <div className="v3-card p-4 space-y-2 text-[12px]">
              {brand.hq && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#8A8A8A]" />
                  <span className="text-[#5C5C5C]">{brand.hq}</span>
                </div>
              )}
              {brand.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#8A8A8A]" />
                  <span className="text-[#5C5C5C]">{brand.email}</span>
                </div>
              )}
              {brand.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#8A8A8A]" />
                  <span className="text-[#5C5C5C]">{brand.phone}</span>
                </div>
              )}
              {brand.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[#8A8A8A]" />
                  <span className="text-[#5C5C5C]">{brand.website}</span>
                </div>
              )}
              {!brand.hq && !brand.email && !brand.phone && !brand.website && (
                <p className="text-[#8A8A8A] italic">No contact details provided.</p>
              )}
            </div>
            <div className="v3-card p-4">
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">
                Relationship Manager
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#DDE7E2] text-[#1F4A3A] flex items-center justify-center text-[11px] font-semibold">
                  {brand.relationshipManager?.initials || '?'}
                </div>
                <div>
                  <p className="text-[13px] text-[#1A1A1A] font-medium">
                    {brand.relationshipManager?.name || 'Unassigned'}
                  </p>
                  {brand.relationshipManager?.email && (
                    <p className="text-[11px] text-[#6E6657]">{brand.relationshipManager.email}</p>
                  )}
                </div>
              </div>
            </div>
            {/* Contacts from API */}
            {(bundle.contacts || []).length > 0 && (
              <div className="v3-card p-4">
                <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Contacts</p>
                {(bundle.contacts || []).map((c, i) => (
                  <div key={c.id || i} className="py-1.5 border-b border-[#F4F2EC] last:border-0">
                    <p className="text-[12px] text-[#1A1A1A] font-medium">{c.name}</p>
                    <p className="text-[10px] text-[#8A8A8A]">
                      {c.role}
                      {c.is_primary ? ' (primary)' : ''}
                    </p>
                    {c.email && <p className="text-[10px] text-[#6E6657]">{c.email}</p>}
                  </div>
                ))}
              </div>
            )}
            {brand.decisionMakers?.length > 0 && (bundle.contacts || []).length === 0 && (
              <div className="v3-card p-4">
                <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Decision Makers</p>
                {brand.decisionMakers.map((dm, i) => (
                  <div key={i} className="py-1.5 border-b border-[#F4F2EC] last:border-0">
                    <p className="text-[12px] text-[#1A1A1A] font-medium">{dm.name}</p>
                    <p className="text-[10px] text-[#8A8A8A]">
                      {dm.role}
                      {dm.note ? ` (${dm.note})` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Business Cases */}
            {projects.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
                  Business Cases
                </h2>
                {projects.map((proj) => {
                  const stage = v3Stages.find((s) => s.key === proj.stage);
                  return (
                    <button
                      key={proj.id}
                      onClick={() => navigate(`/v3/admin/projects/${proj.id}`)}
                      className="w-full v3-card p-4 text-left flex items-center gap-3 hover:border-[#D4CDBF] transition-colors mb-2"
                    >
                      <div className="w-2 h-8 rounded-full" style={{ background: stage?.color || '#C4BDB3' }} />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-[#1A1A1A]">{proj.title}</p>
                        <p className="text-[11px] text-[#8A8A8A]">
                          {stage?.label || proj.stage} &middot;{' '}
                          {formatNairaV3(proj.estimatedValue || proj.estimated_value || 0)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Queued Emails */}
            {emails.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
                  Queued Emails
                </h2>
                {emails.slice(0, 4).map((email) => (
                  <div key={email.id} className="v3-card p-4 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{email.subject}</p>
                      <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">
                        {email.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A]">{email.to}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Interaction History */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider">
                Interaction History
              </h2>
              <div className="flex gap-2">
                <button
                  className="v3-btn-secondary text-[11px]"
                  data-testid="quick-log-interaction-btn"
                  onClick={() => setInteractionOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> Quick log
                </button>
                <button
                  className="v3-btn-primary text-[11px]"
                  data-testid="add-interaction-btn"
                  onClick={moveToBusinessCall}
                >
                  <Plus className="w-3.5 h-3.5" /> Move Brand to Business Call
                </button>
                <button
                  className="v3-btn-secondary text-[11px]"
                  style={{ borderColor: '#C49B5F', color: '#C49B5F' }}
                  data-testid="add-interaction-btn-frame"
                  onClick={moveToFrame}
                >
                  <BriefcaseBusiness className="w-3.5 h-3.5" /> Move to frame
                </button>
              </div>
            </div>

            {interactions.length > 0 ? (
              interactions.map((int) => (
                <div key={int.id} className="v3-card p-4 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#8A8A8A] capitalize">
                      {(int.type || '').replace('_', ' ')}
                    </span>
                    <span
                      className="text-[11px] text-[#8A8A8A]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {int.dateISO || int.date_iso}
                    </span>
                    {int.author && (
                      <span className="text-[11px] text-[#5C5C5C] ml-auto">{int.author}</span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-[#1A1A1A] mb-1">{int.title}</p>
                  {(int.content || int.summary) && (
                    <pre className="text-[12px] text-[#5C5C5C] leading-relaxed whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                      {int.content || int.summary}
                    </pre>
                  )}
                  {int.next_action && (
                    <p className="text-[11px] text-[#1F4A3A] mt-2 font-medium">
                      Next: {int.next_action}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="v3-card p-8 text-center" data-testid="interactions-empty">
                <MessageSquare className="w-8 h-8 text-[#C4BDB3] mx-auto mb-3" />
                <p className="text-[#8A8A8A] text-[13px] mb-1">No interactions recorded yet.</p>
                <p className="text-[12px] text-[#8A8A8A]">
                  Use the Add Interaction button to log your first contact.
                </p>
              </div>
            )}

            <div className="mt-4 v3-ai-panel">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#1F4A3A]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">AI Assist</span>
              </div>
              <p className="text-[12px] text-[#5C5C5C] mb-3">
                Draft a follow-up from this brand&apos;s CRM details, latest interaction, and Business Case status.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={draftFollowUp} disabled={draftingFollowUp} className="v3-btn-primary text-[12px]" data-testid="ai-draft-follow-up-btn">
                  <Sparkles className="w-3.5 h-3.5" /> {draftingFollowUp ? 'Drafting…' : 'Draft Follow-Up'}
                </button>
                <button onClick={copyFollowUpDraft} className="v3-btn-secondary text-[12px]" data-testid="ai-copy-follow-up-btn">
                  <Copy className="w-3.5 h-3.5" /> Copy Draft
                </button>
              </div>
              {followUpNotice && <p className="mt-3 text-[12px] text-[#1F4A3A]" data-testid="ai-follow-up-notice">{followUpNotice}</p>}
              {followUpMeta?.source && followUpMeta.source !== 'fallback' && (
                <p className="mt-1 text-[11px] text-[#6E6657]" data-testid="ai-follow-up-meta">Source: {followUpMeta.source}{followUpMeta.model ? ` · ${followUpMeta.model}` : ''}</p>
              )}
              {followUpDraft && (
                <pre className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-[#DDE7E2] bg-white/80 p-3 text-[12px] leading-relaxed text-[#3D3D3D] whitespace-pre-wrap font-sans" data-testid="ai-follow-up-draft">
                  {followUpDraft}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Interaction Modal */}
      <V3Modal
        open={interactionOpen}
        onClose={() => setInteractionOpen(false)}
        title="Add Interaction"
        subtitle={`Log a touchpoint with ${brand.company}`}
        testid="add-interaction-modal"
        footer={
          <>
            <button
              onClick={() => setInteractionOpen(false)}
              className="v3-btn-secondary"
              data-testid="add-interaction-cancel"
            >
              Cancel
            </button>
            <button
              onClick={submitInteraction}
              disabled={submittingInteraction || !interactionForm.title}
              className="v3-btn-primary"
              data-testid="add-interaction-submit"
            >
              {submittingInteraction ? 'Saving…' : 'Save Interaction'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
                Type
              </label>
              <select
                value={interactionForm.type}
                onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value })}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
                data-testid="interaction-type"
              >
                {INTERACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
                Date
              </label>
              <input
                type="date"
                value={interactionForm.date_iso}
                onChange={(e) => setInteractionForm({ ...interactionForm, date_iso: e.target.value })}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
                data-testid="interaction-date"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Title / Subject *
            </label>
            <input
              type="text"
              value={interactionForm.title}
              onChange={(e) => setInteractionForm({ ...interactionForm, title: e.target.value })}
              placeholder="e.g. Discovery call — initial brief discussion"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
              data-testid="interaction-title"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Summary
            </label>
            <textarea
              value={interactionForm.summary}
              onChange={(e) => setInteractionForm({ ...interactionForm, summary: e.target.value })}
              placeholder="Key points from the interaction…"
              rows={3}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] resize-y"
              data-testid="interaction-summary"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Participants (comma-separated)
            </label>
            <input
              type="text"
              value={interactionForm.participants}
              onChange={(e) => setInteractionForm({ ...interactionForm, participants: e.target.value })}
              placeholder="e.g. Funke Adebiyi, Tope Martins"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
              data-testid="interaction-participants"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Transcript / Notes
            </label>
            <textarea
              value={interactionForm.transcript}
              onChange={(e) => setInteractionForm({ ...interactionForm, transcript: e.target.value })}
              placeholder="Paste call transcript or detailed notes here…"
              rows={4}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] resize-y"
              data-testid="interaction-transcript"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Next Action
            </label>
            <input
              type="text"
              value={interactionForm.next_action}
              onChange={(e) => setInteractionForm({ ...interactionForm, next_action: e.target.value })}
              placeholder="e.g. Send Alignment Snapshot by Friday"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
              data-testid="interaction-next-action"
            />
          </div>
          {projects.length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
                Link to Business Case (optional)
              </label>
              <select
                value={interactionForm.business_case_id}
                onChange={(e) =>
                  setInteractionForm({ ...interactionForm, business_case_id: e.target.value })
                }
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
                data-testid="interaction-bc"
              >
                <option value="">— None —</option>
                {projects.map((bc) => (
                  <option key={bc.id} value={bc.id}>
                    {bc.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="create-meeting"
              checked={interactionForm.create_meeting}
              onChange={(e) =>
                setInteractionForm({ ...interactionForm, create_meeting: e.target.checked })
              }
              className="w-4 h-4 accent-[#1F4A3A]"
              data-testid="interaction-create-meeting"
            />
            <label htmlFor="create-meeting" className="text-[12px] text-[#5C5C5C]">
              Also create a linked meeting record
            </label>
          </div>
        </div>
      </V3Modal>

      {/* Delete confirmation modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="brand-delete-confirm"
        >
          <div className="v3-card w-full max-w-md bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FBF1EE] flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-[#B54A37]" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                  Delete this brand?
                </h3>
                <p className="text-[12px] text-[#6E6657] mt-1 leading-relaxed">
                  <strong>{brand.company}</strong> and all its linked records (contacts, business cases,
                  interactions, meetings, contracts, projects, fees, wallet, reports, tasks, queued emails)
                  will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1ECDF]">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="v3-btn-secondary text-[12px]"
                data-testid="brand-delete-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBrand}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B54A37] text-white text-[12px] font-medium hover:bg-[#9E3E2D] disabled:opacity-50"
                data-testid="brand-delete-confirm-button"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting…' : 'Yes, delete brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default V3AdminBrandDetail;
