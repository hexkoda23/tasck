import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  PhoneCall,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Loader2,
} from 'lucide-react';
import {
  v3ListMeetings,
  v3CreateMeeting,
  v3GetMeeting,
  v3UploadMeetingTranscript,
  v3AnalyzeMeetingTranscript,
  v3AcceptQualificationMeeting,
  v3RescheduleQualificationMeeting,
  v3DeleteQualificationMeeting,
  v3SaveMeetingContact,
} from '../../../lib/v3api';

const statusTone = (value) => {
  if (['accepted', 'transcribed', 'ready_for_alignment', 'creative_brief_ready'].includes(value))
    return 'bg-[#DDE7E2] text-[#1F4A3A]';
  if (['needs_follow_up_meeting', 'needs contact', 'scheduled', 'pending'].includes(value))
    return 'bg-[#F2EAD8] text-[#7A5F23]';
  return 'bg-[#F4F2EC] text-[#6E6657]';
};

const Badge = ({ children, tone }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${
      tone || statusTone(String(children).toLowerCase().replace(/\s+/g, '_'))
    }`}
  >
    {children}
  </span>
);

const ScoreBar = ({ value }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[#8A8A8A]">Readiness</span>
      <span
        className="font-medium text-[#1A1A1A]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}%
      </span>
    </div>
    <div className="h-2 rounded-full bg-[#F4F2EC] overflow-hidden">
      <div className="h-full rounded-full bg-[#1F4A3A]" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const PageHeader = ({ kicker = 'Admin Control Centre', title, subtitle, action }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
    <div>
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{kicker}</p>
      <h1
        className="v3-heading text-2xl"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        {title}
      </h1>
      <p className="text-[#8A8A8A] text-sm mt-1 max-w-3xl">{subtitle}</p>
    </div>
    {action}
  </div>
);

const Section = ({ title, children, action }) => (
  <div className="v3-card p-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const QuestionList = ({ questions = [] }) => (
  <div className="space-y-2">
    {questions.map((question, index) => (
      <div
        key={question}
        className="flex items-start gap-2 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3"
      >
        <span
          className="text-[10px] text-[#8A8A8A] pt-0.5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {index + 1}
        </span>
        <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{question}</p>
      </div>
    ))}
  </div>
);

const AnalysisCard = ({ analysis, score }) => {
  if (!analysis) return null;
  return (
    <div className="space-y-4">
      {score != null && <ScoreBar value={score} />}
      {analysis.summary && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Summary</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{analysis.summary}</p>
        </div>
      )}
      {analysis.missingContext?.length > 0 && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
            Missing context
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.missingContext.map((item) => (
              <Badge key={item} tone="bg-[#F5D9D2] text-[#B54A37]">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {(analysis.followUpQuestions?.length > 0 || analysis.nextQuestions?.length > 0) && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
            Follow-up questions
          </p>
          <QuestionList
            questions={analysis.followUpQuestions || analysis.nextQuestions || []}
          />
        </div>
      )}
    </div>
  );
};

const RECOMMENDED_QUESTIONS = {
  qualification: [
    'What is the main business objective behind this conversation?',
    'Which audience segment are you trying to influence first?',
    'What behaviour do you want the audience to change?',
    'What is currently not working in your market, messaging, or growth approach?',
    'What channels are currently most important to the brand?',
    'What KPIs would make this project successful?',
    'What timeline are you working toward?',
    'Is there an approved budget range or strategy development budget?',
    'Who is the final decision maker?',
    'What would make this engagement a success for your team?',
  ],
  connector: [
    'What is the strongest opportunity TTA should focus on?',
    'Which user segment should be prioritised and why?',
    'What are the key audience insights already known?',
    'What creator profile would be credible for this audience?',
    'What budget or commercial constraints should shape the recommendation?',
    'What risks would derail the project?',
    'What must be clarified before the Alignment Snapshot is approved?',
    'What are the next approval steps after alignment?',
  ],
  plan: [
    'Which strategic approach should lead: ambassador-led, creator-led, community-led, merchant-first, or hybrid?',
    'Which creators should be shortlisted and why?',
    'What selection criteria matter most?',
    'What content formats and platforms should be prioritised?',
    'What funnel or conversion behaviour should be measured?',
    'What budget categories need approval?',
    'What execution phases should be recommended?',
    'What contracts or approvals are needed before launch?',
  ],
};

const ScheduleModal = ({ mode, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:
      mode === 'qualification'
        ? 'Qualification Call: New candidate'
        : 'Business Call: Connector',
    stage: mode === 'connector' ? 'connect' : 'before_crm',
    entity_name: '',
    business_case_title: '',
    scheduled_for: '',
    duration_minutes: 30,
    meeting_link: '',
    agenda: '',
    meeting_type: mode === 'qualification' ? 'qualification' : 'connector',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await v3CreateMeeting(form);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      data-testid="meeting-schedule-modal"
    >
      <div className="v3-card w-full max-w-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">
              Schedule meeting
            </p>
            <h2
              className="v3-heading text-xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {mode === 'qualification' ? 'Qualification Call' : 'Business Call: Connector'}
            </h2>
          </div>
          <button onClick={onClose} className="v3-btn-secondary text-[11px]">
            Close
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Title</span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.title}
              onChange={set('title')}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Stage</span>
            <select
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.stage}
              onChange={set('stage')}
            >
              <option value="before_crm">Before CRM</option>
              <option value="connect">Connect</option>
              <option value="frame">Frame</option>
              <option value="plan">Plan</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Business Case
            </span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              placeholder="Optional for qualification calls"
              value={form.business_case_title}
              onChange={set('business_case_title')}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Company / Creative
            </span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.entity_name}
              onChange={set('entity_name')}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Scheduled date
            </span>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.scheduled_for}
              onChange={set('scheduled_for')}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Duration (min)
            </span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.duration_minutes}
              onChange={set('duration_minutes')}
              type="number"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Meeting link
            </span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.meeting_link}
              onChange={set('meeting_link')}
              placeholder="https://meet.google.com/..."
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Agenda</span>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              rows={3}
              value={form.agenda}
              onChange={set('agenda')}
              placeholder={
                mode === 'qualification'
                  ? 'Confirm interest, decision maker, contact details, fit, and whether they want TASCK follow-up.'
                  : 'Collect objective, audience, channels, KPIs, timeline, budget, approval owner, and constraints.'
              }
            />
          </label>

          {/* AI recommended questions — feeds Alignment & Strategy Snapshots */}
          <div className="md:col-span-2 p-4 rounded-lg bg-[#F4F2EC] border border-[#E8E4DB]" data-testid="schedule-ai-questions">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-[#1F4A3A] font-semibold">AI recommended questions</p>
              <button
                type="button"
                onClick={() => {
                  const set = RECOMMENDED_QUESTIONS[form.meeting_type === 'qualification' ? 'qualification' : (form.stage === 'plan' ? 'plan' : 'connector')] || [];
                  const block = set.map((q, i) => `${i + 1}. ${q}`).join('\n');
                  setForm((f) => ({ ...f, agenda: (f.agenda ? f.agenda + '\n\n' : '') + block }));
                }}
                className="text-[10px] px-2 py-1 rounded bg-[#1F4A3A] text-white hover:bg-[#1A1A1A]"
                data-testid="schedule-insert-questions"
              >
                Insert into agenda
              </button>
            </div>
            <p className="text-[11px] text-[#6E6657] mb-2">These prompts capture the details needed to generate the Alignment Snapshot and Strategy Snapshot. Edit, reorder, or drop them as needed.</p>
            <ol className="list-decimal pl-5 space-y-1 text-[12px] text-[#1A1A1A]">
              {(RECOMMENDED_QUESTIONS[form.meeting_type === 'qualification' ? 'qualification' : (form.stage === 'plan' ? 'plan' : 'connector')] || []).map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
          <button onClick={onClose} className="v3-btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="v3-btn-primary">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'qualification' ? (
              'Schedule Qualification Call'
            ) : (
              'Schedule Connector Business Call'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Overview ────────────────────────────────────────────────────────────────

const MeetingOverviewCard = ({ icon: Icon, eyebrow, title, description, count, button, onClick }) => (
  <button
    onClick={onClick}
    className="v3-card p-6 text-left hover:border-[#D4CDBF] transition-colors group"
    data-testid={`meeting-entry-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
  >
    <div className="flex items-start gap-4">
      <span className="w-12 h-12 rounded-xl bg-[#DDE7E2] inline-flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#1F4A3A]" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{eyebrow}</span>
        <span
          className="block text-lg font-semibold text-[#1A1A1A] mt-1"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {title}
        </span>
        <span className="block text-[13px] text-[#6E6657] leading-relaxed mt-2">
          {description}
        </span>
        <span className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-[12px] text-[#8A8A8A]">
            <strong className="text-[#1A1A1A]">{count}</strong> calls
          </span>
          <span className="v3-btn-primary text-[12px] group-hover:bg-[#173D30]">{button}</span>
        </span>
      </span>
    </div>
  </button>
);

export const V3AdminMeetingsOverview = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ qualification: 0, connector: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      v3ListMeetings({ meeting_type: 'qualification' }).catch(() => []),
      v3ListMeetings({ meeting_type: 'connector' }).catch(() => []),
    ]).then(([qualData, connData]) => {
      setCounts({
        qualification: Array.isArray(qualData) ? qualData.length : 0,
        connector: Array.isArray(connData) ? connData.length : 0,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div data-testid="v3-admin-meetings-overview">
      <PageHeader
        title="Meetings"
        subtitle="Track calls before CRM and Connector business calls that feed Alignment Snapshot readiness."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <MeetingOverviewCard
          icon={UserPlus}
          eyebrow="Before CRM"
          title="Qualification Calls"
          description="First calls used to decide if a scanned brand, creative, or Super Creative should enter TASCK. These calls support the accept, reschedule, or delete decision only."
          count={loading ? '…' : counts.qualification}
          button="Open Qualification Calls"
          onClick={() => navigate('/v3/admin/meetings/qualification')}
        />
        <MeetingOverviewCard
          icon={Briefcase}
          eyebrow="Business Case: Connector phase"
          title="Business Call: Connector"
          description="Business calls used to gather the brand details needed for the Alignment Snapshot: objective, audience, channels, KPIs, budget, timeline, approval owner, and constraints."
          count={loading ? '…' : counts.connector}
          button="Open Connector Calls"
          onClick={() => navigate('/v3/admin/meetings/connector')}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rule</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
            Qualification transcripts never generate Alignment Snapshots. They only support the CRM
            entry decision.
          </p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rule</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
            Connector call transcripts can create or update an admin-review Alignment Snapshot draft
            when enough context exists.
          </p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">
            Admin review only
          </p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
            Raw transcripts, AI analysis, generated snapshots, and generated creative briefs stay
            internal until Admin approves them.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Qualification Calls List ─────────────────────────────────────────────────

const QualificationRow = ({ call }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/v3/admin/meetings/qualification/${call.id || call._id}`)}
      className="w-full v3-card p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4 hover:border-[#D4CDBF] transition-colors"
      data-testid={`qualification-call-${call.id || call._id}`}
    >
      <div className="w-1 rounded-full bg-[#C49B5F] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
          <Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Before CRM</Badge>
          <Badge>{call.status}</Badge>
          {call.qualification_status && <Badge>{call.qualification_status}</Badge>}
        </div>
        <p className="text-[12px] text-[#8A8A8A]">
          {call.entity_name}
          {call.entity_type ? `, ${call.entity_type}` : ''}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        {call.scheduled_for && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {call.scheduled_for}
          </span>
        )}
        {call.contact_completeness != null && (
          <span className="inline-flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5" /> {call.contact_completeness}% contact
          </span>
        )}
        <span className="v3-btn-secondary text-[11px]">Open call</span>
      </div>
    </button>
  );
};

export const V3AdminQualificationCalls = () => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    v3ListMeetings({ meeting_type: 'qualification' })
      .then((data) => {
        setCalls(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="v3-admin-qualification-calls">
      <PageHeader
        title="Qualification Calls"
        subtitle="First calls used to decide if a scanned company, creative, or Super Creative should enter TASCK."
        action={
          <button onClick={() => setScheduleOpen(true)} className="v3-btn-primary">
            <Plus className="w-4 h-4" /> Schedule Qualification Call
          </button>
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#8A8A8A]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px]">Loading calls…</span>
        </div>
      ) : calls.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <UserPlus className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No qualification calls yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Schedule a call to evaluate a new brand, creative, or Super Creative.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <QualificationRow key={call.id || call._id} call={call} />
          ))}
        </div>
      )}
      {scheduleOpen && (
        <ScheduleModal
          mode="qualification"
          onClose={() => setScheduleOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

// ─── Connector Calls List ─────────────────────────────────────────────────────

const ConnectorRow = ({ call }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/v3/admin/meetings/connector/${call.id || call._id}`)}
      className="w-full v3-card p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4 hover:border-[#D4CDBF] transition-colors"
      data-testid={`connector-call-${call.id || call._id}`}
    >
      <div className="w-1 rounded-full bg-[#1F4A3A] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
          <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Connector</Badge>
          {call.readiness_status && (
            <Badge>{call.readiness_status.replace(/_/g, ' ')}</Badge>
          )}
        </div>
        <p className="text-[12px] text-[#8A8A8A]">
          {call.entity_name}
          {call.business_case_title ? `, ${call.business_case_title}` : ''}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        {call.scheduled_for && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {call.scheduled_for}
          </span>
        )}
        {call.readiness_score != null && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {call.readiness_score}% ready
          </span>
        )}
        <span className="v3-btn-secondary text-[11px]">Open call</span>
      </div>
    </button>
  );
};

export const V3AdminConnectorCalls = () => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    v3ListMeetings({ meeting_type: 'connector' })
      .then((data) => {
        setCalls(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="v3-admin-connector-calls">
      <PageHeader
        title="Business Call: Connector"
        subtitle="Business calls used to gather the brand details needed for the Alignment Snapshot."
        action={
          <button onClick={() => setScheduleOpen(true)} className="v3-btn-primary">
            <Plus className="w-4 h-4" /> Schedule Connector Business Call
          </button>
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#8A8A8A]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px]">Loading calls…</span>
        </div>
      ) : calls.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <Briefcase className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No connector calls yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Schedule a connector business call to gather Alignment Snapshot context.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <ConnectorRow key={call.id || call._id} call={call} />
          ))}
        </div>
      )}
      {scheduleOpen && (
        <ScheduleModal
          mode="connector"
          onClose={() => setScheduleOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

// ─── Qualification Call Detail ────────────────────────────────────────────────

export const V3AdminQualificationCallDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    v3GetMeeting(meetingId)
      .then((data) => {
        setMeeting(data);
        setTranscript(data.transcript || '');
        setAccepted(data.qualification_status === 'accepted');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [meetingId]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      await v3UploadMeetingTranscript(meetingId, { transcript });
      const result = await v3AnalyzeMeetingTranscript(meetingId, {});
      setMeeting((m) => ({ ...m, ...result, transcript }));
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setAnalyzing(false);
  };

  const handleAccept = async () => {
    setSaving(true);
    try {
      await v3AcceptQualificationMeeting(meetingId, {});
      setAccepted(true);
    } catch (err) {
      console.error('Accept failed:', err);
    }
    setSaving(false);
  };

  const handleReschedule = async () => {
    setSaving(true);
    try {
      await v3RescheduleQualificationMeeting(meetingId, {});
    } catch (err) {
      console.error('Reschedule failed:', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this candidate?')) return;
    try {
      await v3DeleteQualificationMeeting(meetingId, {});
      navigate('/v3/admin/meetings/qualification');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading call…</span>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8 text-[#8A8A8A]">
        <p>Meeting not found.</p>
        <button
          onClick={() => navigate('/v3/admin/meetings/qualification')}
          className="v3-btn-secondary mt-4 text-[11px]"
        >
          Back to Qualification Calls
        </button>
      </div>
    );
  }

  const snapshot = meeting.candidate_snapshot || {};
  const analysis = meeting.analysis || {};

  return (
    <div className="space-y-5" data-testid="v3-admin-qualification-call-detail">
      <button
        onClick={() => navigate('/v3/admin/meetings/qualification')}
        className="v3-btn-secondary text-[11px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Qualification Calls
      </button>
      <PageHeader
        title={meeting.title}
        subtitle="Decide if this company, creative, or Super Creative should work with TASCK."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Qualification Call</Badge>
            <Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Before CRM</Badge>
          </div>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-5">
          <Section title="Call purpose">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">
              Decide if this company should work with TASCK.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Admin checks</p>
                <p className="text-[12px] mt-1">
                  Interest, decision maker, contact details, fit, follow-up appetite.
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript use</p>
                <p className="text-[12px] mt-1">
                  CRM decision only. It must not create an Alignment Snapshot.
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Next step</p>
                <p className="text-[12px] mt-1">
                  Accept into CRM, reschedule, or delete candidate.
                </p>
              </div>
            </div>
          </Section>

          {Object.keys(snapshot).length > 0 && (
            <Section title="Scanned company intelligence">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(snapshot).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-[#E8E4DB] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </p>
                    <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section
            title="Contact and meeting setup"
            action={
              <button
                className="v3-btn-secondary text-[11px]"
                onClick={async () => {
                  try {
                    await v3SaveMeetingContact(meetingId, {
                      contact_name: meeting.contact_name,
                      contact_email: meeting.contact_email,
                      contact_phone: meeting.contact_phone,
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Save contact details
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Contact name', meeting.contact_name],
                ['Email', meeting.contact_email],
                ['Phone / WhatsApp', meeting.contact_phone],
                ['Meeting link', meeting.meeting_link],
                ['Scheduled date', meeting.scheduled_for],
                ['Contact completeness', meeting.contact_completeness != null ? `${meeting.contact_completeness}%` : null],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">
                      {label}
                    </p>
                    <p className="text-[12px] text-[#1A1A1A] break-words">{value}</p>
                  </div>
                ))}
            </div>
          </Section>

          {meeting.suggested_questions?.length > 0 && (
            <Section title="Suggested questions">
              <QuestionList questions={meeting.suggested_questions} />
            </Section>
          )}

          <Section title="Transcript upload">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3"
              placeholder="Paste transcript here..."
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="v3-btn-primary"
            >
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}{' '}
              Analyze transcript
            </button>
          </Section>
        </div>

        <div className="space-y-5">
          {(analysis.summary || analysis.readiness_score != null) && (
            <Section title="CRM qualification analysis">
              <AnalysisCard
                analysis={analysis}
                score={analysis.readiness_score ?? meeting.readiness_score}
              />
            </Section>
          )}
          <Section title="Qualification decision">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleAccept}
                disabled={saving || accepted}
                className="v3-btn-primary"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />{' '}
                {accepted ? 'Accepted into CRM' : 'Accept into CRM'}
              </button>
              <button
                onClick={handleReschedule}
                disabled={saving}
                className="v3-btn-secondary"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reschedule
              </button>
              <button
                onClick={handleDelete}
                className="v3-btn-secondary text-[#B54A37]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Candidate
              </button>
            </div>
            {accepted && (
              <div className="mt-4 rounded-lg border border-[#DDE7E2] bg-[#F5FAF7] p-3">
                <p className="text-[12px] text-[#1F4A3A] font-medium mb-2">
                  Accepted into CRM.
                </p>
                <button
                  onClick={() => navigate('/v3/admin/meetings/connector')}
                  className="v3-btn-secondary text-[11px]"
                >
                  Schedule Connector Business Call
                </button>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

// ─── Connector Call Detail ────────────────────────────────────────────────────

export const V3AdminConnectorCallDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    v3GetMeeting(meetingId)
      .then((data) => {
        setMeeting(data);
        setTranscript(data.transcript || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [meetingId]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      await v3UploadMeetingTranscript(meetingId, { transcript });
      const result = await v3AnalyzeMeetingTranscript(meetingId, {});
      setMeeting((m) => ({ ...m, ...result, transcript }));
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading call…</span>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8 text-[#8A8A8A]">
        <p>Meeting not found.</p>
        <button
          onClick={() => navigate('/v3/admin/meetings/connector')}
          className="v3-btn-secondary mt-4 text-[11px]"
        >
          Back to Connector Calls
        </button>
      </div>
    );
  }

  const analysis = meeting.analysis || {};

  return (
    <div className="space-y-5" data-testid="v3-admin-connector-call-detail">
      <button
        onClick={() => navigate('/v3/admin/meetings/connector')}
        className="v3-btn-secondary text-[11px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Business Call: Connector
      </button>
      <PageHeader
        title={meeting.title}
        subtitle="Gather the details needed for the Alignment Snapshot."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Business Call: Connector</Badge>
            <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Business Case: Connector phase</Badge>
          </div>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div className="space-y-5">
          <Section title="Call purpose">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">
              Gather the details needed for the Alignment Snapshot.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Admin checks</p>
                <p className="text-[12px] mt-1">
                  Objective, audience, channels, KPIs, timeline, budget, approval owner, constraints.
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript use</p>
                <p className="text-[12px] mt-1">
                  Draft/update Alignment Snapshot if enough context exists.
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Next step</p>
                <p className="text-[12px] mt-1">
                  Review snapshot, send to company, move Business Case forward.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Linked records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Business Case', meeting.business_case_title],
                ['Company', meeting.entity_name],
                ['Stage', meeting.stage],
                ['Meeting link', meeting.meeting_link],
                ['Scheduled', meeting.scheduled_for],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">
                      {label}
                    </p>
                    <p className="text-[12px] text-[#1A1A1A] break-words">{value}</p>
                  </div>
                ))}
            </div>
          </Section>

          {meeting.suggested_questions?.length > 0 && (
            <Section title="Suggested questions">
              <QuestionList questions={meeting.suggested_questions} />
            </Section>
          )}

          <Section title="Transcript upload">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3"
              placeholder="Paste transcript here..."
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="v3-btn-primary"
            >
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}{' '}
              Analyze transcript
            </button>
          </Section>
        </div>

        <div className="space-y-5">
          {(analysis.summary || meeting.readiness_score != null) && (
            <Section title="Alignment Snapshot readiness">
              <AnalysisCard analysis={analysis} score={meeting.readiness_score} />
              {analysis.ai_outputs?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
                    AI outputs
                  </p>
                  <div className="space-y-2">
                    {analysis.ai_outputs.map((output) => (
                      <div
                        key={output}
                        className="rounded-lg bg-[#F4F2EC] p-2 text-[12px] text-[#1A1A1A]"
                      >
                        {output}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
          <Section title="Alignment Snapshot handoff">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">
              This is the Connector business call. A strong transcript should produce Alignment
              Snapshot readiness and, when enough context exists, an admin-review draft.
            </p>
            {meeting.business_case_id && (
              <button
                onClick={() =>
                  navigate(`/v3/admin/business-cases/${meeting.business_case_id}`)
                }
                className="v3-btn-primary w-full"
              >
                <Briefcase className="w-3.5 h-3.5" /> Open Business Case Connect
              </button>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

export default V3AdminMeetingsOverview;
