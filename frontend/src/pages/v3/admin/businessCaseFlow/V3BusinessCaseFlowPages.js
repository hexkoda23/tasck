import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  Mail,
  MessageSquare,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  v3AcceptCreatorBriefing,
  v3AddDeliverable,
  v3AnalyzeMeetingTranscript,
  v3ApproveAlignmentAs,
  v3ApproveSnapshot,
  v3CreateBrainstorm,
  v3CreateBrief,
  v3CreateContract,
  v3CreateMeeting,
  v3CreateSnapshot,
  v3DeclineCreatorBriefing,
  v3DeleteBusinessCaseConnect,
  v3GenerateAlignment,
  v3GenerateFinalReport,
  v3GetBusinessCase,
  v3GetCreators,
  v3ListBriefs,
  v3ListContracts,
  v3ListDeliverables,
  v3PromoteBusinessCaseConnect,
  v3RescheduleBusinessCaseConnect,
  v3RescheduleCreatorBriefing,
  v3SendAlignmentToBrand,
  v3SendConnectMeetingEmail,
  v3SendConnectRescheduleEmail,
  v3SendStrategySnapshotToBrand,
  v3SignContract,
  v3SuggestCreatorMatches,
  v3UploadMeetingTranscript,
} from '../../../../lib/v3api';
import { formatNairaV3 } from '../../../../lib/v3data';

const connectQuestions = [
  'Key marketing focus',
  'Primary target audience',
  'Key marketing channels',
  'KPIs',
  'Budget range',
  'Timeline',
  'Approval process / decision maker',
  'Current marketing challenge',
  'Creator/talent expectations',
  'Risks and constraints',
  'What success looks like',
];

const brainstormingSections = [
  ['Campaign core idea', ['big idea', 'campaign angle', 'cultural insight', 'audience truth']],
  ['Audience and behavior', ['primary audience', 'secondary audience', 'desired behavior change', 'conversion behavior']],
  ['Channel plan', ['Instagram', 'TikTok', 'YouTube', 'X/Twitter', 'offline/event/community', 'paid media notes']],
  ['Creator direction', ['creator archetypes', 'desired tone', 'must-have traits', 'red flags', 'audience alignment']],
  ['Content/deliverables idea log', ['hero content', 'short-form cuts', 'BTS', 'launch copy', 'UGC/community ideas', 'number of deliverables']],
  ['Budget planning', ['brand budget', 'creator fee estimate', 'production budget', 'paid media budget', 'TASCK strategy development fee', 'TASCK management fee']],
  ['Timeline inference', ['project duration', 'planning time', 'creator selection time', 'contract time', 'production time', 'revision time', 'launch window', 'reporting time']],
  ['Risks and assumptions', ['budget risks', 'timeline risks', 'creator availability risks', 'approval risks', 'legal/usage risks']],
  ['Admin notes / idea log', ['idea cards', 'created-by notes', 'decision notes']],
];

const useBusinessCaseBundle = () => {
  const params = useParams();
  const id = params.id || params.businessCaseId;
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => v3GetBusinessCase(id).then((data) => {
    setBundle(data);
    setLoading(false);
    return data;
  }), [id]);
  useEffect(() => {
    setLoading(true);
    reload().catch(() => setLoading(false));
  }, [reload]);
  return { id, bundle, loading, reload };
};

const getCase = (bundle) => bundle?.business_case || {};
const getBrand = (bundle) => bundle?.brand || {};

const stageLinks = (id) => [
  ['Connect', `/v3/admin/business-cases/${id}/connect`],
  ['Frame', `/v3/admin/business-cases/${id}/frame/snapshot`],
  ['Plan', `/v3/admin/business-cases/${id}/plan/brainstorm`],
  ['Delivery', `/v3/admin/business-cases/${id}/delivery/summary`],
  ['Reporting', `/v3/admin/business-cases/${id}/reporting/final-report`],
];

export const businessCasePhasePath = (id, bc = {}) => {
  const stage = bc.stage || 'connect';
  if (stage === 'closed' || stage === 'reporting') return `/v3/admin/business-cases/${id}/reporting/final-report`;
  if (stage === 'deliver') return `/v3/admin/business-cases/${id}/delivery/summary`;
  if (stage === 'plan') {
    const plan = bc.plan || {};
    if (!plan.brainstorm_round_id && !plan.brainstorm_status) return `/v3/admin/business-cases/${id}/plan/brainstorm`;
    if (!Array.isArray(plan.selected_creator_ids) || plan.selected_creator_ids.length === 0) return `/v3/admin/business-cases/${id}/plan/creator-scan`;
    if (!plan.creative_brief_id) return `/v3/admin/business-cases/${id}/plan/brief`;
    if (!plan.creator_briefing_status) return `/v3/admin/business-cases/${id}/plan/creator-briefing-call`;
    if (!plan.creative_snapshot_id && !plan.strategy_snapshot_status) return `/v3/admin/business-cases/${id}/plan/strategy-snapshot`;
    return `/v3/admin/business-cases/${id}/plan/waiting-brand`;
  }
  if (stage === 'frame') {
    const frame = bc.frame || {};
    const status = frame.alignment_snapshot_status || frame.status || '';
    if (status === 'approved') return `/v3/admin/business-cases/${id}/frame/approved`;
    if (status === 'sent' || status === 'waiting_brand' || status === 'pending_brand_review') return `/v3/admin/business-cases/${id}/frame/waiting-brand`;
    if (frame.brand_comments || frame.admin_comments || Number(frame.comment_count || 0) > 0) return `/v3/admin/business-cases/${id}/frame/admin-review`;
    return `/v3/admin/business-cases/${id}/frame/snapshot`;
  }
  return `/v3/admin/business-cases/${id}/connect`;
};

export const V3BusinessCaseStageHome = () => {
  const navigate = useNavigate();
  const { id, bundle, loading } = useBusinessCaseBundle();
  useEffect(() => {
    if (!loading && bundle) {
      navigate(businessCasePhasePath(id, getCase(bundle)), { replace: true });
    }
  }, [bundle, id, loading, navigate]);
  return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Opening the active Business Case page...</div>;
};

const FlowShell = ({ title, subtitle, children, nextAction }) => {
  const navigate = useNavigate();
  const { id, bundle, loading } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  if (loading) return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Loading business case...</div>;
  return (
    <div className="v3-stage-shell space-y-5" data-testid="business-case-flow-page">
      <button onClick={() => navigate('/v3/admin/business-cases')} className="v3-btn-secondary text-[11px]">
        <ArrowLeft className="w-3.5 h-3.5" /> Business Cases
      </button>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-1">{bc.title}</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1>
          <p className="text-[13px] text-[#6E6657] mt-1 max-w-3xl">{subtitle}</p>
        </div>
        {nextAction && <div className="v3-next-action-card">{nextAction}</div>}
      </div>
      <div className="v3-stepper">
        {stageLinks(id).map(([label, href]) => (
          <button key={label} onClick={() => navigate(href)} className="v3-stepper-item">{label}</button>
        ))}
      </div>
      {children}
    </div>
  );
};

const InfoCard = ({ title, children, action }) => (
  <div className="v3-card p-5">
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const TextInput = ({ label, value, onChange, rows = 1 }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    {rows > 1 ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" />
    )}
  </label>
);

const downloadDraft = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const V3BusinessCaseConnect = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const intelligence = bc.connect?.marketing_intelligence || {};
  return (
    <FlowShell title="Connect / Business Call" subtitle="Business Call — Connect is the source of truth for Alignment Snapshot readiness." nextAction="Schedule the call, send the welcome email, then analyze the transcript.">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <InfoCard title="Brand info">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {[
              ['Company', brand.company || brand.name],
              ['Contact', contact.primary_contact || brand.primary_contact],
              ['Email', contact.email || brand.email || 'Missing'],
              ['Phone', contact.phone || brand.phone || 'Missing'],
              ['Website', contact.website || brand.website || 'Missing'],
              ['Connect status', bc.connect?.connect_status || 'needs_business_call'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</p>
                <p className="text-[#1A1A1A] break-words">{value || 'Pending'}</p>
              </div>
            ))}
          </div>
        </InfoCard>
        <InfoCard title="Next steps">
          <div className="grid gap-2">
            <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/schedule`)} className="v3-btn-primary"><Plus className="w-3.5 h-3.5" /> Schedule meeting</button>
            <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/questions`)} className="v3-btn-secondary"><MessageSquare className="w-3.5 h-3.5" /> Questions + transcript</button>
            <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/analysis`)} className="v3-btn-secondary"><Sparkles className="w-3.5 h-3.5" /> AI result</button>
          </div>
        </InfoCard>
      </div>
      <InfoCard title="Alignment Snapshot readiness checklist">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {connectQuestions.slice(0, 8).map((item) => (
            <div key={item} className="rounded-lg bg-[#F4F2EC] p-3 text-[12px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F4A3A] inline mr-1" /> {item}
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[#6E6657] mt-3">Current marketing focus: {intelligence.key_marketing_focus || bc.connect?.stated_intent || 'Pending transcript analysis.'}</p>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectSchedule = () => {
  const { id, bundle } = useBusinessCaseBundle();
  const brand = getBrand(bundle);
  const bc = getCase(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const [form, setForm] = useState({
    contact_name: contact.primary_contact || brand.primary_contact || '',
    contact_email: contact.email || brand.email || '',
    scheduled_for: '',
    meeting_link: '',
    agenda: connectQuestions.join('\n'),
  });
  const [saved, setSaved] = useState(null);
  const save = async () => {
    const meeting = await v3CreateMeeting({
      title: `Business Call — Connect: ${bc.title}`,
      meeting_type: 'business_call',
      stage: 'connect',
      entity_type: 'brand',
      brand_id: bc.brand_id,
      business_case_id: id,
      business_case_title: bc.title,
      entity_name: brand.company || brand.name || '',
      ...form,
    });
    setSaved(meeting);
  };
  return (
    <FlowShell title="Connect Schedule" subtitle="Set the Business Call time, link, agenda, and brand contact before sending the welcome email." nextAction="Save the meeting, then queue the brand welcome + meeting email.">
      <InfoCard title="Schedule meeting">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput label="Contact name" value={form.contact_name} onChange={(value) => setForm({ ...form, contact_name: value })} />
          <TextInput label="Contact email" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} />
          <TextInput label="Date/time" value={form.scheduled_for} onChange={(value) => setForm({ ...form, scheduled_for: value })} />
          <TextInput label="Meeting link" value={form.meeting_link} onChange={(value) => setForm({ ...form, meeting_link: value })} />
          <div className="md:col-span-2"><TextInput label="Agenda" rows={8} value={form.agenda} onChange={(value) => setForm({ ...form, agenda: value })} /></div>
        </div>
        <button onClick={save} className="v3-btn-primary mt-4"><Save className="w-3.5 h-3.5" /> Save Meeting</button>
      </InfoCard>
      {saved && (
        <InfoCard title="Send Brand Welcome + Meeting Email">
          <p className="text-[13px] text-[#6E6657] mb-3">Queues portal/login placeholder, meeting link, welcome message, and what the call will cover.</p>
          <button onClick={() => v3SendConnectMeetingEmail(id, { ...form, meeting_id: saved.id })} className="v3-btn-primary"><Mail className="w-3.5 h-3.5" /> Queue email</button>
        </InfoCard>
      )}
    </FlowShell>
  );
};

export const V3BusinessCaseConnectQuestions = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const analyze = async () => {
    const meeting = await v3CreateMeeting({
      title: `Business Call — Connect: ${bc.title}`,
      meeting_type: 'business_call',
      stage: 'connect',
      entity_type: 'brand',
      brand_id: bc.brand_id,
      business_case_id: id,
      entity_name: brand.company || brand.name || '',
      business_case_title: bc.title,
      agenda: connectQuestions.join('\n'),
    });
    await v3UploadMeetingTranscript(meeting.id, { transcript });
    const result = await v3AnalyzeMeetingTranscript(meeting.id, {});
    setAnalysis({ ...result, meeting_id: meeting.id });
  };
  return (
    <FlowShell title="Connect Questions + Transcript" subtitle="Use these prompts to capture everything needed for Alignment Snapshot readiness." nextAction="Analyze the transcript, then open the AI result page.">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <InfoCard title="Suggested questions">
          <ol className="list-decimal pl-5 space-y-2 text-[13px]">{connectQuestions.map((q) => <li key={q}>{q}</li>)}</ol>
        </InfoCard>
        <InfoCard title="Transcript paste/upload">
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" />
          <div className="flex gap-2 mt-3">
            <button onClick={analyze} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Analyze Transcript</button>
            {analysis && <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/analysis`)} className="v3-btn-secondary">Open AI result</button>}
          </div>
          {analysis && <p className="text-[12px] text-[#1F4A3A] mt-3">{analysis.recommendation?.label || analysis.ai_recommendation}</p>}
        </InfoCard>
      </div>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectAnalysis = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const analysis = bc.connect?.analysis || {};
  const recommendation = analysis.recommendation || {};
  return (
    <FlowShell title="Connect AI Result" subtitle="Review extracted marketing intelligence, reasons, missing context, risk flags, and the promote/reschedule/delete recommendation." nextAction={recommendation.label || 'Analyze a transcript to unlock the decision.'}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfoCard title="Recommendation">
          <p className="text-xl font-semibold text-[#1A1A1A]">{recommendation.label || 'Pending analysis'}</p>
          <p className="text-[12px] text-[#6E6657] mt-2">{recommendation.summary || analysis.summary || 'No AI result stored yet.'}</p>
        </InfoCard>
        <InfoCard title="Missing context"><ul className="list-disc pl-5 text-[13px]">{(recommendation.missing_context || analysis.missing_information || []).map((x) => <li key={x}>{x}</li>)}</ul></InfoCard>
        <InfoCard title="Risk flags"><ul className="list-disc pl-5 text-[13px]">{(recommendation.risk_flags || analysis.risk_flags || []).map((x) => <li key={x}>{x}</li>)}</ul></InfoCard>
      </div>
      <InfoCard title="Decision actions">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => v3PromoteBusinessCaseConnect(id, { reason: 'Admin accepted Connect analysis.' }).then(() => navigate(`/v3/admin/business-cases/${id}/frame/snapshot`))} className="v3-btn-primary"><CheckCircle2 className="w-3.5 h-3.5" /> Promote to Frame</button>
          <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/reschedule`)} className="v3-btn-secondary"><RotateCcw className="w-3.5 h-3.5" /> Reschedule Business Call</button>
          <button onClick={() => v3DeleteBusinessCaseConnect(id, { reason: 'Admin deleted from Connect analysis.' }).then(() => navigate('/v3/admin/business-cases'))} className="v3-btn-secondary text-[#B54A37]"><Trash2 className="w-3.5 h-3.5" /> Delete Brand From Pipeline</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectReschedule = () => {
  const { id } = useBusinessCaseBundle();
  const [form, setForm] = useState({ reason: '', scheduled_for: '', meeting_link: '', contact_email: '' });
  const [done, setDone] = useState(false);
  const reschedule = async () => {
    await v3RescheduleBusinessCaseConnect(id, form);
    await v3SendConnectRescheduleEmail(id, form);
    setDone(true);
  };
  return (
    <FlowShell title="Reschedule Business Call" subtitle="Capture missing details, propose the next call, and send a clean summary email." nextAction="Send the reschedule email after saving the new meeting details.">
      <InfoCard title="Reschedule details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput label="Reason / missing details" rows={4} value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} />
          <TextInput label="Contact email" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} />
          <TextInput label="New date/time" value={form.scheduled_for} onChange={(value) => setForm({ ...form, scheduled_for: value })} />
          <TextInput label="Meeting link" value={form.meeting_link} onChange={(value) => setForm({ ...form, meeting_link: value })} />
        </div>
        <button onClick={reschedule} className="v3-btn-primary mt-4"><Mail className="w-3.5 h-3.5" /> Save + send summary email</button>
        {done && <p className="text-[12px] text-[#1F4A3A] mt-3">Reschedule meeting and email queued.</p>}
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseFrameSnapshot = () => {
  const { id, bundle, reload } = useBusinessCaseBundle();
  const snapshot = bundle?.alignment_snapshot;
  const [notice, setNotice] = useState(null);
  const stage = bundle?.business_case?.stage;
  const run = (fn, fallbackMsg) => () => {
    setNotice(null);
    fn().then(reload).catch((e) => {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 400 && String(detail || '').includes('Frame stage')) {
        setNotice("Can't generate the Alignment Snapshot yet — there isn't enough information to generate it. Complete the Connect stage and move this Business Case to Frame first.");
      } else {
        setNotice(detail || fallbackMsg);
      }
    });
  };
  return (
    <FlowShell title="Alignment Snapshot Studio" subtitle="Generate, edit, save, and send the Alignment Snapshot to the Brand Portal and email." nextAction="Generate or send the snapshot for brand approval.">
      <InfoCard title="Alignment Snapshot generated" action={<button data-testid="alignment-generate-btn" onClick={run(() => v3GenerateAlignment(id), 'Could not generate the Alignment Snapshot. Please try again.')} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Generate</button>}>
        {notice && (
          <div data-testid="alignment-notice" className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-3 text-[12px] text-[#7A5A1E]">
            {notice}{stage && stage !== 'frame' ? ` (Current stage: ${bundle?.business_case?.stage_label || stage})` : ''}
          </div>
        )}
        <p className="text-[14px] font-semibold">{snapshot?.title || 'No snapshot generated yet.'}</p>
        <p className="text-[12px] text-[#6E6657] mt-2">{snapshot?.meta || 'The generated snapshot will appear here after Connect is ready.'}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button data-testid="alignment-send-brand-btn" onClick={run(() => v3SendAlignmentToBrand(id), 'Could not send the Alignment Snapshot. Generate it first.')} className="v3-btn-primary"><Send className="w-3.5 h-3.5" /> Send Alignment Snapshot to Brand Portal + Email</button>
          <button data-testid="alignment-admin-approve-btn" onClick={run(() => v3ApproveAlignmentAs(id, 'admin', 'admin'), 'Could not approve the Alignment Snapshot. Generate it first.')} className="v3-btn-secondary"><CheckCircle2 className="w-3.5 h-3.5" /> Admin approve</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseFrameWaitingBrand = () => {
  const { bundle } = useBusinessCaseBundle();
  const snap = bundle?.alignment_snapshot || {};
  return <FlowShell title="Waiting for Brand Approval" subtitle="Track snapshot status, sent date, brand email, reminders, and comments."><InfoCard title="Waiting state"><p className="text-[13px]">Status: {snap.status || 'not sent'}</p><p className="text-[13px]">Sent: {snap.sent_to_brand_at || snap.shared_at || 'Pending'}</p><p className="text-[13px] mt-2">Comments: {(snap.brand_comments || []).length}</p></InfoCard></FlowShell>;
};

export const V3BusinessCaseFrameAdminReview = () => {
  const { bundle } = useBusinessCaseBundle();
  const comments = bundle?.alignment_snapshot?.brand_comments || [];
  return <FlowShell title="Brand Comments / Admin Review" subtitle="Resolve brand comments, edit the snapshot, and resend it."><InfoCard title="Comments">{comments.length ? comments.map((c) => <div key={c.id} className="rounded-lg border border-[#E8E4DB] p-3 mb-2 text-[13px]">{c.quoted_text || 'Snapshot section'}: {c.comment}</div>) : <p className="text-[13px] text-[#8A8A8A]">No brand comments yet.</p>}</InfoCard></FlowShell>;
};

export const V3BusinessCaseFrameApproved = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const snap = bundle?.alignment_snapshot || {};
  return <FlowShell title="Frame Approved" subtitle="Confirm approval and move the Business Case into Plan."><InfoCard title="Approval status"><p className="text-[13px]">Approved by: {snap.approved_by || 'Pending'}</p><p className="text-[13px]">Approved at: {snap.approved_at || 'Pending'}</p><button onClick={() => navigate(`/v3/admin/business-cases/${id}/plan/brainstorm`)} className="v3-btn-primary mt-4">Move to Plan Phase</button></InfoCard></FlowShell>;
};

export const V3BusinessCasePlanBrainstorm = () => {
  const navigate = useNavigate();
  const { id } = useBusinessCaseBundle();
  const [fields, setFields] = useState(Object.fromEntries(brainstormingSections.map(([title]) => [title, ''])));
  const [summary, setSummary] = useState('');
  const save = async () => {
    await v3CreateBrainstorm({ business_case_id: id, scored_creators: [], planning_fields: fields });
    setSummary(Object.entries(fields).map(([key, value]) => `${key}: ${value || 'Pending'}`).join('\n'));
  };
  return (
    <FlowShell title="Brainstorming Lab" subtitle="Structured planning records for AI creator matching and later Strategy Snapshot generation." nextAction="Save the plan, generate a summary, then continue to Creator Scan.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {brainstormingSections.map(([title, hints]) => <InfoCard key={title} title={title}><p className="text-[11px] text-[#8A8A8A] mb-2">{hints.join(' · ')}</p><textarea value={fields[title]} onChange={(e) => setFields({ ...fields, [title]: e.target.value })} rows={5} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" /></InfoCard>)}
      </div>
      <div className="flex flex-wrap gap-2 mt-4"><button onClick={save} className="v3-btn-primary"><Save className="w-3.5 h-3.5" /> Save brainstorming</button><button onClick={() => setSummary(Object.entries(fields).map(([k, v]) => `${k}: ${v || 'Pending'}`).join('\n'))} className="v3-btn-secondary"><Sparkles className="w-3.5 h-3.5" /> Generate AI planning summary</button><button onClick={() => navigate(`/v3/admin/business-cases/${id}/plan/creator-scan`)} className="v3-btn-secondary">Continue to Creator Scan</button></div>
      {summary && <pre className="v3-card p-4 mt-4 text-[12px] whitespace-pre-wrap">{summary}</pre>}
    </FlowShell>
  );
};

export const V3BusinessCasePlanCreatorScan = () => {
  const navigate = useNavigate();
  const { id } = useBusinessCaseBundle();
  const [creators, setCreators] = useState([]);
  const [matches, setMatches] = useState([]);
  useEffect(() => { v3GetCreators({ approved_only: true }).then((rows) => setCreators(Array.isArray(rows) ? rows : [])).catch(() => setCreators([])); }, []);
  return (
    <FlowShell title="Creator Match Scanner" subtitle="Scan approved creators only, then manually select or remove creators before the brief." nextAction="Only approved roster creators appear here.">
      <InfoCard title="Approved creator scan" action={<button onClick={() => v3SuggestCreatorMatches(id).then((data) => setMatches(data.matches || []))} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Run AI scan</button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{(matches.length ? matches : creators).slice(0, 8).map((creator) => <div key={creator.creator_id || creator.id} className="rounded-lg border border-[#E8E4DB] p-3"><p className="font-semibold text-[13px]">{creator.name || creator.creator_name || creator.creator_id}</p><p className="text-[12px] text-[#6E6657]">{creator.reason || creator.genre || 'Approved creator profile'}</p><p className="text-[11px] text-[#1F4A3A] mt-1">Fit {creator.score || creator.fit_score || creator.fitScore || 70}</p></div>)}</div>
        <button onClick={() => navigate(`/v3/admin/business-cases/${id}/plan/brief`)} className="v3-btn-secondary mt-4">Continue to Generate Brief</button>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanBrief = () => {
  const { id, bundle } = useBusinessCaseBundle();
  const [creators, setCreators] = useState([]);
  const [creatorId, setCreatorId] = useState('');
  const [brief, setBrief] = useState(`Creative brief for ${getCase(bundle).title || 'project'}\n\nObjective:\nDeliverables:\nTimeline:\nUsage rights:\nBudget:\n`);
  useEffect(() => { v3GetCreators({ approved_only: true }).then((rows) => { const list = Array.isArray(rows) ? rows : []; setCreators(list); setCreatorId(list[0]?.id || ''); }); }, []);
  const send = () => v3CreateBrief({ business_case_id: id, creator_id: creatorId, brief_text: brief, subject: `Creative Brief - ${getCase(bundle).title}` });
  return (
    <FlowShell title="Creative Brief Studio" subtitle="Generate, edit, send, download, and make the brief visible to selected creators." nextAction="Send the brief, then schedule the Creator Briefing Call.">
      <InfoCard title="Brief editor">
        <select value={creatorId} onChange={(e) => setCreatorId(e.target.value)} className="rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px] mb-3">{creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={14} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" />
        <div className="flex flex-wrap gap-2 mt-3"><button onClick={send} className="v3-btn-primary"><Send className="w-3.5 h-3.5" /> Send to selected creator</button><button onClick={() => downloadDraft(`creative-brief-${id}.txt`, brief)} className="v3-btn-secondary"><Download className="w-3.5 h-3.5" /> Download brief</button></div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanCreatorBriefingCall = () => {
  const { id, bundle } = useBusinessCaseBundle();
  const [meeting, setMeeting] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const creatorId = getCase(bundle).creator_id || bundle?.creator?.id || '';
  const schedule = async () => setMeeting(await v3CreateMeeting({ title: `Creator Briefing Call: ${getCase(bundle).title}`, meeting_type: 'creator_briefing', entity_type: 'creator', stage: 'plan', business_case_id: id, creator_id: creatorId, business_case_title: getCase(bundle).title, entity_name: bundle?.creator?.name || '' }));
  const analyze = async () => { if (!meeting?.id) return; await v3UploadMeetingTranscript(meeting.id, { transcript }); setAnalysis(await v3AnalyzeMeetingTranscript(meeting.id, {})); };
  return (
    <FlowShell title="Creator Briefing Call" subtitle="Plan-phase meeting for fee, availability, deliverables, rights, support, approval process, and willingness." nextAction="Analyze the transcript before accepting, rescheduling, or declining for this project.">
      <InfoCard title="Schedule + questions"><button onClick={schedule} className="v3-btn-primary"><Plus className="w-3.5 h-3.5" /> Schedule Creator Briefing Call</button><ol className="list-decimal pl-5 mt-4 text-[13px]">{(RECOMMENDED_CREATOR_BRIEFING || []).map((q) => <li key={q}>{q}</li>)}</ol></InfoCard>
      <InfoCard title="Transcript and AI decision"><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" /><div className="flex flex-wrap gap-2 mt-3"><button onClick={analyze} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Analyze</button><button onClick={() => v3AcceptCreatorBriefing(id, { meeting_id: meeting?.id, creator_id: creatorId })} className="v3-btn-secondary">Accept Creator for Strategy Snapshot</button><button onClick={() => v3RescheduleCreatorBriefing(id, { meeting_id: meeting?.id, creator_id: creatorId })} className="v3-btn-secondary">Reschedule Creator Briefing Call</button><button onClick={() => v3DeclineCreatorBriefing(id, { meeting_id: meeting?.id, creator_id: creatorId })} className="v3-btn-secondary text-[#B54A37]">Decline Creator for This Project</button></div>{analysis && <p className="text-[12px] text-[#1F4A3A] mt-3">{analysis.recommendation?.label || analysis.ai_recommendation}</p>}</InfoCard>
    </FlowShell>
  );
};

const RECOMMENDED_CREATOR_BRIEFING = [
  'What is your fee for this project?',
  'What is your availability for the campaign timeline?',
  'What deliverables are realistic?',
  'What content formats would work best?',
  'What usage rights/exclusivity limits do you require?',
  'Do you have any conflict with the brand/category?',
  'What production support do you need?',
  'What approval/revision process do you prefer?',
  'Are you willing to proceed with TASCK on this brief?',
];

export const V3BusinessCasePlanStrategySnapshot = () => {
  const { id, reload } = useBusinessCaseBundle();
  const [concept, setConcept] = useState('');
  return <FlowShell title="Strategy Snapshot Studio" subtitle="Generate, edit, send to brand portal/email, handle comments, and approve before Delivery."><InfoCard title="Strategy Snapshot"><TextInput label="Concept override" rows={4} value={concept} onChange={setConcept} /><div className="flex flex-wrap gap-2 mt-3"><button onClick={() => v3CreateSnapshot({ business_case_id: id, concept }).then(reload)} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Generate Strategy Snapshot</button><button onClick={() => v3SendStrategySnapshotToBrand(id)} className="v3-btn-secondary"><Send className="w-3.5 h-3.5" /> Send to brand</button><button onClick={() => v3ApproveSnapshot(id, 'admin')} className="v3-btn-secondary"><CheckCircle2 className="w-3.5 h-3.5" /> Approve Snapshot</button></div></InfoCard></FlowShell>;
};

export const V3BusinessCasePlanWaitingBrand = () => <FlowShell title="Strategy Review / Approval" subtitle="Brand comments, admin edit/resend loop, and approval status for Strategy Snapshot."><InfoCard title="Waiting for brand approval"><p className="text-[13px] text-[#6E6657]">Use the Strategy Snapshot Studio to resend after comments and move to Delivery once approved.</p></InfoCard></FlowShell>;

export const V3BusinessCaseDeliverySummary = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  return <FlowShell title="Delivery Summary" subtitle="Complete project summary before contract generation." nextAction="Open AI Contract Studio."><InfoCard title="Project summary"><p className="text-[13px]">{getCase(bundle).title}</p><p className="text-[13px] text-[#6E6657] mt-1">Value: {formatNairaV3(getCase(bundle).estimated_value || 0)}</p><button onClick={() => navigate(`/v3/admin/business-cases/${id}/delivery/contracts`)} className="v3-btn-primary mt-4"><FileSignature className="w-3.5 h-3.5" /> Open AI Contract Studio</button></InfoCard></FlowShell>;
};

export const V3BusinessCaseContractStudio = () => {
  const { id, bundle } = useBusinessCaseBundle();
  const [contracts, setContracts] = useState([]);
  const value = getCase(bundle).estimated_value || 0;
  useEffect(() => { v3ListContracts(id).then((rows) => setContracts(Array.isArray(rows) ? rows : [])); }, [id]);
  const create = (template) => v3CreateContract({ business_case_id: id, template, value, parties: template === 'brand_msa' ? ['TASCK', getBrand(bundle).company || 'Brand'] : ['TASCK', bundle?.creator?.name || 'Creator'] }).then((doc) => setContracts([doc, ...contracts]));
  return <FlowShell title="AI Contract Studio" subtitle="Generate separate brand and creator contracts, edit drafts, send, download, and track signature status."><InfoCard title="Contracts"><div className="flex flex-wrap gap-2 mb-4"><button onClick={() => create('brand_msa')} className="v3-btn-primary">Generate Brand Contract</button><button onClick={() => create('creator_principal')} className="v3-btn-secondary">Generate Creator Contract</button></div>{contracts.map((c) => <div key={c.id} className="rounded-lg border border-[#E8E4DB] p-3 mb-2"><p className="font-semibold text-[13px]">{c.template}</p><p className="text-[12px] text-[#6E6657]">Status: {c.status}</p><div className="flex gap-2 mt-2"><button onClick={() => downloadDraft(`${c.template}-${id}.txt`, JSON.stringify(c, null, 2))} className="v3-btn-secondary text-[11px]"><Download className="w-3.5 h-3.5" /> Download draft</button><button onClick={() => v3SignContract(c.id)} className="v3-btn-secondary text-[11px]">Mark signed</button></div></div>)}</InfoCard></FlowShell>;
};

export const V3BusinessCaseDeliveryWaitingSignatures = () => <FlowShell title="Waiting for Contract Approval / Signatures" subtitle="Track brand and creator contract statuses, comments, reminders, and resend loops."><InfoCard title="Signature tracker"><p className="text-[13px] text-[#6E6657]">Use Contract Studio to generate, download, send, and mark signed drafts. Reminder emails can be queued from the contract list.</p></InfoCard></FlowShell>;

export const V3BusinessCaseDeliverables = () => {
  const { id } = useBusinessCaseBundle();
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState([]);
  useEffect(() => { v3ListDeliverables(id).then((data) => setRows(Array.isArray(data) ? data : [])); }, [id]);
  const add = () => v3AddDeliverable({ business_case_id: id, title }).then((row) => { setRows([row, ...rows]); setTitle(''); });
  return <FlowShell title="Deliverables" subtitle="Add, edit, assign, status, link, and send multiple deliverables to portals/emails."><InfoCard title="Multiple deliverables"><div className="flex gap-2 mb-4"><input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" placeholder="Deliverable title" /><button onClick={add} className="v3-btn-primary"><PackageCheck className="w-3.5 h-3.5" /> Add</button></div>{rows.map((row) => <div key={row.id} className="rounded-lg border border-[#E8E4DB] p-3 mb-2 text-[13px]">{row.title} · {row.status}</div>)}</InfoCard></FlowShell>;
};

export const V3BusinessCaseFinalReport = () => {
  const { id, bundle, reload } = useBusinessCaseBundle();
  const report = bundle?.final_report;
  return <FlowShell title="Final Report Studio" subtitle="Generate, edit, send to brand and creator portals, and track checklist acknowledgement."><InfoCard title="Final report checklist" action={<button onClick={() => v3GenerateFinalReport(id, {}).then(reload)} className="v3-btn-primary"><FileText className="w-3.5 h-3.5" /> Generate final report</button>}><p className="text-[13px] font-semibold">{report?.title || 'No report generated yet.'}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">{(report?.closure_checklist || ['Objectives reviewed', 'Deliverables reviewed', 'KPIs/performance reviewed', 'Budget reviewed', 'Creator performance reviewed', 'Learnings reviewed', 'Next steps reviewed', 'I approve / acknowledge this final report']).map((item) => <label key={item} className="rounded-lg border border-[#E8E4DB] p-3 text-[13px]"><input type="checkbox" className="mr-2" /> {typeof item === 'string' ? item : item.label}</label>)}</div></InfoCard></FlowShell>;
};
