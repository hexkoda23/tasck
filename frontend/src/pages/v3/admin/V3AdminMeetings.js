import React, { useState } from 'react';
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
} from 'lucide-react';

const qualificationCalls = [
  {
    id: 'qual-coke-campus',
    title: 'Qualification Call: Coca-Cola campus signal',
    entityName: 'Coca-Cola Nigeria Limited',
    entityType: 'Brand',
    status: 'scheduled',
    qualificationStatus: 'needs contact',
    scheduledFor: '2026-06-07 10:00',
    contactCompleteness: 55,
    contactName: 'Folake Adeniran',
    contactEmail: 'folake.adeniran@coca-cola.com',
    contactPhone: 'Missing',
    meetingLink: 'https://meet.google.com/tasck-qual-coke-demo',
    candidateSnapshot: {
      company: 'Coca-Cola Nigeria Limited',
      signal: 'Campus Share Moments',
      painPoint: 'Students are sharing Detty December campus content, but beverage brands are not owning the moment with a structured creator-led mechanic.',
      suggestedOpportunity: 'Campus storytelling, personalized sharing moments, and retail-to-social UGC.',
      sourceUrl: 'culture calendars, student creator posts, retail activation mentions',
    },
    suggestedQuestions: [
      'Is Coca-Cola actively exploring a creator-led campus campaign?',
      'Who owns the marketing and procurement decision?',
      'What timeline would make TASCK useful before the campaign window closes?',
      'Would you like TASCK to prepare a follow-up Business Case if there is fit?',
    ],
    transcript: 'Folake confirmed interest in campus creator mechanics but procurement contact is not yet clear. The brand wants a short follow-up after internal alignment.',
    analysis: {
      readinessScore: 58,
      summary: 'Good brand fit and interest, but contact completeness and decision ownership are still weak.',
      missingContext: ['Procurement phone/WhatsApp', 'Budget owner', 'Whether this is Q4 or Detty December only'],
      followUpQuestions: ['Can Folake introduce the budget approver?', 'Is the team open to a 20-minute TASCK follow-up?'],
    },
    accepted: false,
  },
  {
    id: 'qual-mtn-creators',
    title: 'Qualification Call: MTN creator economy signal',
    entityName: 'MTN Nigeria Communications PLC',
    entityType: 'Brand',
    status: 'transcribed',
    qualificationStatus: 'accepted',
    scheduledFor: '2026-06-03 14:30',
    contactCompleteness: 96,
    contactName: 'Kemi Adebayo',
    contactEmail: 'kemi.adebayo@mtn.com',
    contactPhone: '+234 802 XXX 8891',
    meetingLink: 'https://meet.google.com/tasck-qual-mtn-demo',
    createdBrandId: 'brand-mtn',
    businessCaseId: 'proj-mtn-burna',
    candidateSnapshot: {
      company: 'MTN Nigeria Communications PLC',
      signal: 'Data For Creators Push',
      painPoint: 'Creators are discussing high data spend as a barrier to consistent posting.',
      suggestedOpportunity: 'Position MTN as the network powering the next wave of Nigerian creators.',
      sourceUrl: 'creator forums, X posts, student tech blogs, telco campaign mentions',
    },
    suggestedQuestions: [
      'Is MTN interested in creator economy positioning this quarter?',
      'Who will own commercial approval?',
      'Would the team want TASCK to scope an Alignment Snapshot?',
    ],
    transcript: 'Kemi confirmed MTN wants a creator economy positioning opportunity and accepted a TASCK follow-up. Approval owner is Olu Akanbi. Uche will coordinate day-to-day.',
    analysis: {
      readinessScore: 88,
      summary: 'Strong interest, known decision owner, clear marketing angle, and full contact route.',
      missingContext: ['Exact internal budget ceiling'],
      followUpQuestions: ['Can MTN share the target launch month?', 'Should TASCK scope app install KPIs?'],
    },
    accepted: true,
  },
  {
    id: 'qual-ifeoma',
    title: 'Creative Qualification Call: Ifeoma Nwosu',
    entityName: 'Ifeoma Nwosu',
    entityType: 'Creative',
    status: 'scheduled',
    qualificationStatus: 'pending',
    scheduledFor: '2026-06-08 12:00',
    contactCompleteness: 72,
    contactName: 'Ifeoma Nwosu',
    contactEmail: 'ifeoma@creator.example',
    contactPhone: '+234 806 XXX 2291',
    meetingLink: 'https://meet.google.com/tasck-qual-ifeoma-demo',
    candidateSnapshot: {
      company: 'Ifeoma Nwosu',
      signal: 'TikTok + portfolio discovery',
      painPoint: 'Strong short-form branded content but not yet verified in TASCK.',
      suggestedOpportunity: 'Verify portfolio, rates, availability, manager details, and brand-safety fit.',
      sourceUrl: 'TikTok, portfolio site, Instagram campaign credits',
    },
    suggestedQuestions: [
      'What brand categories are you open to?',
      'Do you work independently or through a manager?',
      'What is your current rate card and delivery timeline?',
    ],
    transcript: '',
    analysis: {
      readinessScore: 43,
      summary: 'Transcript not uploaded yet.',
      missingContext: ['Rate card', 'Manager details', 'Availability'],
      followUpQuestions: ['Ask for portfolio proof and brand references.'],
    },
    accepted: false,
  },
];

const connectorCalls = [
  {
    id: 'conn-coke-frame',
    title: 'Business Call: Connector: Share a Coke',
    company: 'Coca-Cola Nigeria Limited',
    businessCase: 'Share a Coke, Share a Story',
    businessCaseId: 'proj-cocacola-tems',
    stage: 'connect',
    status: 'transcribed',
    readinessStatus: 'ready_for_alignment',
    readinessScore: 86,
    scheduledFor: '2026-06-05 11:00',
    meetingLink: 'https://meet.google.com/tasck-connector-coke-demo',
    suggestedQuestions: [
      'What is the main campaign objective?',
      'Which audience must the campaign reach?',
      'What KPIs will make this successful?',
      'What budget range and timeline are approved?',
      'Who owns final approval?',
    ],
    transcript: 'Folake said the Share a Coke platform needs Nigerian cultural specificity. Target audience is 18-28 urban Nigeria. Budget is north of N100M but below N150M. Campaign must be in market by Dec 1. KPI emphasis is emotional shareability, earned media, and creator reliability.',
    analysis: {
      summary: 'Transcript has enough objective, audience, channels, budget, timeline, and risk context to draft an Alignment Snapshot for admin review.',
      missingContext: ['Exact KPI numbers', 'Physical activation budget carve-out', 'Usage rights duration'],
      aiOutputs: ['alignment_snapshot_draft: as-coke-connector-draft', 'business_case_connect.marketing_intelligence updated', 'timeline event: meeting_alignment_drafted'],
      nextQuestions: ['Can Coca-Cola confirm UGC volume target?', 'Is the physical activation inside the N100M-N150M range?'],
    },
  },
  {
    id: 'conn-access-followup',
    title: 'Business Call: Connector: Access Bank trust gap',
    company: 'Access Bank PLC',
    businessCase: 'Financial Futures',
    businessCaseId: 'proj-access-davido',
    stage: 'connect',
    status: 'transcribed',
    readinessStatus: 'needs_follow_up_meeting',
    readinessScore: 49,
    scheduledFor: '2026-06-04 15:00',
    meetingLink: 'https://meet.google.com/tasck-connector-access-demo',
    suggestedQuestions: [
      'What financial product should the campaign support?',
      'Which audience is most important?',
      'What compliance constraints must TASCK respect?',
      'Who signs off the final Alignment Snapshot?',
    ],
    transcript: 'Access Bank is interested in creator finance education but did not confirm product owner, KPI targets, compliance constraints, or decision path.',
    analysis: {
      summary: 'Useful strategic signal, but not enough operational context to draft a strong Alignment Snapshot.',
      missingContext: ['Product owner', 'KPI target', 'Compliance constraints', 'Approval owner', 'Budget range'],
      aiOutputs: ['needs_follow_up_meeting: true', 'alignment_snapshot_draft: not created'],
      nextQuestions: ['Which Access product is being promoted?', 'Who owns compliance approval?', 'What measurable action should creators drive?'],
    },
  },
  {
    id: 'conn-creative-plan',
    title: 'Creative Plan Call: Rema strategy response',
    company: 'Rema Team',
    businessCase: 'Made of More: Africa',
    businessCaseId: 'proj-guinness-rema',
    stage: 'plan',
    status: 'transcribed',
    readinessStatus: 'creative_brief_ready',
    readinessScore: 79,
    scheduledFor: '2026-06-06 16:00',
    meetingLink: 'https://meet.google.com/tasck-creative-plan-demo',
    suggestedQuestions: [
      'What creative control does the creator require?',
      'What production window is realistic?',
      'What deliverables are included in the fee?',
    ],
    transcript: 'Rema team confirmed documentary-first route, October production window, and final edit approval requirement.',
    analysis: {
      summary: 'Strong plan call. Can support Creative Brief readiness and Strategy Snapshot drafting, pending admin review.',
      missingContext: ['Final edit approval boundaries'],
      aiOutputs: ['creative_brief_readiness: ready', 'admin_review_required: true'],
      nextQuestions: ['Can final edit be limited to creator appearance and music use?'],
    },
  },
];

const meetingTypes = {
  qualification: {
    title: 'Qualification Calls',
    subtitle: 'First calls used to decide if a scanned company, creative, or Super Creative should enter TASCK.',
    button: 'Schedule Qualification Call',
    path: '/v3/admin/meetings/qualification',
  },
  connector: {
    title: 'Business Call: Connector',
    subtitle: 'Business calls used to gather the brand details needed for the Alignment Snapshot.',
    button: 'Schedule Connector Business Call',
    path: '/v3/admin/meetings/connector',
  },
};

const statusTone = (value) => {
  if (['accepted', 'transcribed', 'ready_for_alignment', 'creative_brief_ready'].includes(value)) return 'bg-[#DDE7E2] text-[#1F4A3A]';
  if (['needs_follow_up_meeting', 'needs contact', 'scheduled', 'pending'].includes(value)) return 'bg-[#F2EAD8] text-[#7A5F23]';
  return 'bg-[#F4F2EC] text-[#6E6657]';
};

const Badge = ({ children, tone }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${tone || statusTone(String(children).toLowerCase().replace(/\s+/g, '_'))}`}>
    {children}
  </span>
);

const ScoreBar = ({ value }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[#8A8A8A]">Readiness</span>
      <span className="font-medium text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-[#F4F2EC] overflow-hidden">
      <div className="h-full rounded-full bg-[#1F4A3A]" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const ScheduleModal = ({ mode, onClose }) => {
  const config = meetingTypes[mode];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" data-testid="meeting-schedule-modal">
      <div className="v3-card w-full max-w-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Schedule meeting</p>
            <h2 className="v3-heading text-xl" style={{ fontFamily: "'Fraunces', serif" }}>{config.title}</h2>
            <p className="text-[12px] text-[#8A8A8A] mt-1">{config.subtitle}</p>
          </div>
          <button onClick={onClose} className="v3-btn-secondary text-[11px]">Close</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Title</span>
            <input className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" defaultValue={mode === 'qualification' ? 'Qualification Call: New candidate' : 'Business Call: Connector'} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Stage</span>
            <select className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" defaultValue={mode === 'connector' ? 'connect' : 'before_crm'}>
              <option value="before_crm">Before CRM</option>
              <option value="connect">Connect</option>
              <option value="frame">Frame</option>
              <option value="plan">Plan</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Business Case</span>
            <input className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" placeholder="Optional for qualification calls" defaultValue={mode === 'connector' ? 'Share a Coke, Share a Story' : ''} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Company / Creative</span>
            <input className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" defaultValue={mode === 'qualification' ? 'New scanned candidate' : 'Coca-Cola Nigeria Limited'} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Scheduled date</span>
            <input type="datetime-local" className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Duration</span>
            <input className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" defaultValue="30" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Meeting link</span>
            <input className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" defaultValue={mode === 'qualification' ? 'https://meet.google.com/tasck-qualification-demo' : 'https://meet.google.com/tasck-connector-demo'} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Agenda</span>
            <textarea className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]" rows={3} defaultValue={mode === 'qualification' ? 'Confirm interest, decision maker, contact details, fit, and whether they want TASCK follow-up.' : 'Collect objective, audience, channels, KPIs, timeline, budget, approval owner, and constraints.'} />
          </label>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
          <button onClick={onClose} className="v3-btn-secondary">Cancel</button>
          <button onClick={onClose} className="v3-btn-primary">{config.button}</button>
        </div>
      </div>
    </div>
  );
};

const PageHeader = ({ kicker = 'Admin Control Centre', title, subtitle, action }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
    <div>
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{kicker}</p>
      <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1>
      <p className="text-[#8A8A8A] text-sm mt-1 max-w-3xl">{subtitle}</p>
    </div>
    {action}
  </div>
);

const MeetingOverviewCard = ({ icon: Icon, eyebrow, title, description, count, button, onClick }) => (
  <button onClick={onClick} className="v3-card p-6 text-left hover:border-[#D4CDBF] transition-colors group" data-testid={`meeting-entry-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
    <div className="flex items-start gap-4">
      <span className="w-12 h-12 rounded-xl bg-[#DDE7E2] inline-flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#1F4A3A]" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{eyebrow}</span>
        <span className="block text-lg font-semibold text-[#1A1A1A] mt-1" style={{ fontFamily: "'Fraunces', serif" }}>{title}</span>
        <span className="block text-[13px] text-[#6E6657] leading-relaxed mt-2">{description}</span>
        <span className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-[12px] text-[#8A8A8A]"><strong className="text-[#1A1A1A]">{count}</strong> demo calls ready</span>
          <span className="v3-btn-primary text-[12px] group-hover:bg-[#173D30]">{button}</span>
        </span>
      </span>
    </div>
  </button>
);

export const V3AdminMeetingsOverview = () => {
  const navigate = useNavigate();
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
          count={qualificationCalls.length}
          button="Open Qualification Calls"
          onClick={() => navigate('/v3/admin/meetings/qualification')}
        />
        <MeetingOverviewCard
          icon={Briefcase}
          eyebrow="Business Case: Connector phase"
          title="Business Call: Connector"
          description="Business calls used to gather the brand details needed for the Alignment Snapshot: objective, audience, channels, KPIs, budget, timeline, approval owner, and constraints."
          count={connectorCalls.filter((call) => call.stage === 'connect').length}
          button="Open Connector Calls"
          onClick={() => navigate('/v3/admin/meetings/connector')}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rule</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">Qualification transcripts never generate Alignment Snapshots. They only support the CRM entry decision.</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rule</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">Connector call transcripts can create or update an admin-review Alignment Snapshot draft when enough context exists.</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Admin review only</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">Raw transcripts, AI analysis, generated snapshots, and generated creative briefs stay internal until Admin approves them.</p>
        </div>
      </div>
    </div>
  );
};

const QualificationRow = ({ call }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/v3/admin/meetings/qualification/${call.id}`)} className="w-full v3-card p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4 hover:border-[#D4CDBF] transition-colors" data-testid={`qualification-call-${call.id}`}>
      <div className="w-1 rounded-full bg-[#C49B5F] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
          <Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Before CRM</Badge>
          <Badge>{call.status}</Badge>
          <Badge>{call.qualificationStatus}</Badge>
        </div>
        <p className="text-[12px] text-[#8A8A8A]">{call.entityName}, {call.entityType}</p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {call.scheduledFor}</span>
        <span className="inline-flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5" /> {call.contactCompleteness}% contact</span>
        <span className="v3-btn-secondary text-[11px]">Open call</span>
      </div>
    </button>
  );
};

export const V3AdminQualificationCalls = () => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  return (
    <div data-testid="v3-admin-qualification-calls">
      <PageHeader
        title="Qualification Calls"
        subtitle="First calls used to decide if a scanned company, creative, or Super Creative should enter TASCK."
        action={<button onClick={() => setScheduleOpen(true)} className="v3-btn-primary"><Plus className="w-4 h-4" /> Schedule Qualification Call</button>}
      />
      <div className="space-y-2">
        {qualificationCalls.map((call) => <QualificationRow key={call.id} call={call} />)}
      </div>
      {scheduleOpen && <ScheduleModal mode="qualification" onClose={() => setScheduleOpen(false)} />}
    </div>
  );
};

const ConnectorRow = ({ call }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/v3/admin/meetings/connector/${call.id}`)} className="w-full v3-card p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4 hover:border-[#D4CDBF] transition-colors" data-testid={`connector-call-${call.id}`}>
      <div className="w-1 rounded-full bg-[#1F4A3A] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
          <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Connector</Badge>
          <Badge>{call.readinessStatus.replace(/_/g, ' ')}</Badge>
        </div>
        <p className="text-[12px] text-[#8A8A8A]">{call.company}, {call.businessCase}</p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {call.scheduledFor}</span>
        <span className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {call.readinessScore}% ready</span>
        <span className="v3-btn-secondary text-[11px]">Open call</span>
      </div>
    </button>
  );
};

export const V3AdminConnectorCalls = () => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const calls = connectorCalls.filter((call) => call.stage === 'connect');
  return (
    <div data-testid="v3-admin-connector-calls">
      <PageHeader
        title="Business Call: Connector"
        subtitle="Business calls used to gather the brand details needed for the Alignment Snapshot."
        action={<button onClick={() => setScheduleOpen(true)} className="v3-btn-primary"><Plus className="w-4 h-4" /> Schedule Connector Business Call</button>}
      />
      <div className="space-y-2">
        {calls.map((call) => <ConnectorRow key={call.id} call={call} />)}
      </div>
      {scheduleOpen && <ScheduleModal mode="connector" onClose={() => setScheduleOpen(false)} />}
    </div>
  );
};

const Section = ({ title, children, action }) => (
  <div className="v3-card p-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const QuestionList = ({ questions }) => (
  <div className="space-y-2">
    {questions.map((question, index) => (
      <div key={question} className="flex items-start gap-2 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3">
        <span className="text-[10px] text-[#8A8A8A] pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{index + 1}</span>
        <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{question}</p>
      </div>
    ))}
  </div>
);

const AnalysisCard = ({ analysis, score }) => (
  <div className="space-y-4">
    <ScoreBar value={score} />
    <div>
      <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Summary</p>
      <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{analysis.summary}</p>
    </div>
    <div>
      <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">Missing context</p>
      <div className="flex flex-wrap gap-2">
        {analysis.missingContext.map((item) => <Badge key={item} tone="bg-[#F5D9D2] text-[#B54A37]">{item}</Badge>)}
      </div>
    </div>
    <div>
      <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">Follow-up questions</p>
      <QuestionList questions={analysis.followUpQuestions || analysis.nextQuestions || []} />
    </div>
  </div>
);

export const V3AdminQualificationCallDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const original = qualificationCalls.find((call) => call.id === meetingId) || qualificationCalls[0];
  const [accepted, setAccepted] = useState(Boolean(original.accepted));
  const [transcript, setTranscript] = useState(original.transcript);

  return (
    <div className="space-y-5" data-testid="v3-admin-qualification-call-detail">
      <button onClick={() => navigate('/v3/admin/meetings/qualification')} className="v3-btn-secondary text-[11px]">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Qualification Calls
      </button>
      <PageHeader
        title={original.title}
        subtitle="Decide if this company, creative, or Super Creative should work with TASCK."
        action={<div className="flex flex-wrap gap-2"><Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Qualification Call</Badge><Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Before CRM</Badge></div>}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-5">
          <Section title="Call purpose">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">Decide if this company should work with TASCK.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="v3-card-muted p-3"><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Admin checks</p><p className="text-[12px] mt-1">Interest, decision maker, contact details, fit, follow-up appetite.</p></div>
              <div className="v3-card-muted p-3"><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript use</p><p className="text-[12px] mt-1">CRM decision only. It must not create an Alignment Snapshot.</p></div>
              <div className="v3-card-muted p-3"><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Next step</p><p className="text-[12px] mt-1">Accept into CRM, reschedule, or delete candidate.</p></div>
            </div>
          </Section>

          <Section title="Scanned company intelligence">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(original.candidateSnapshot).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-[#E8E4DB] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Contact and meeting setup" action={<button className="v3-btn-secondary text-[11px]">Save contact details</button>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Contact name', original.contactName],
                ['Email', original.contactEmail],
                ['Phone / WhatsApp', original.contactPhone],
                ['Meeting link', original.meetingLink],
                ['Scheduled date', original.scheduledFor],
                ['Contact completeness', `${original.contactCompleteness}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">{label}</p>
                  <p className="text-[12px] text-[#1A1A1A] break-words">{value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Suggested questions">
            <QuestionList questions={original.suggestedQuestions} />
          </Section>

          <Section title="Transcript upload">
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3" placeholder="Paste transcript here..." />
            <button className="v3-btn-primary"><Upload className="w-3.5 h-3.5" /> Analyze transcript</button>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="CRM qualification analysis">
            <AnalysisCard analysis={original.analysis} score={original.analysis.readinessScore} />
          </Section>
          <Section title="Qualification decision">
            <textarea rows={3} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3" placeholder="Decision note..." defaultValue={accepted ? 'Accepted into CRM and linked to Business Case Connect.' : ''} />
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setAccepted(true)} className="v3-btn-primary"><CheckCircle2 className="w-3.5 h-3.5" /> Accept into CRM</button>
              <button className="v3-btn-secondary"><RotateCcw className="w-3.5 h-3.5" /> Reschedule</button>
              <button className="v3-btn-secondary text-[#B54A37]"><Trash2 className="w-3.5 h-3.5" /> Delete Candidate</button>
            </div>
            {accepted && (
              <div className="mt-4 rounded-lg border border-[#DDE7E2] bg-[#F5FAF7] p-3">
                <p className="text-[12px] text-[#1F4A3A] font-medium mb-2">Accepted into CRM and linked to Business Case.</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate(`/v3/admin/business-cases/${original.businessCaseId || 'proj-mtn-burna'}`)} className="v3-btn-primary text-[11px]">Open Business Case Connect</button>
                  <button onClick={() => navigate('/v3/admin/meetings/connector')} className="v3-btn-secondary text-[11px]">Schedule Connector Business Call</button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

export const V3AdminConnectorCallDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const original = connectorCalls.find((call) => call.id === meetingId) || connectorCalls[0];
  const [transcript, setTranscript] = useState(original.transcript);

  return (
    <div className="space-y-5" data-testid="v3-admin-connector-call-detail">
      <button onClick={() => navigate('/v3/admin/meetings/connector')} className="v3-btn-secondary text-[11px]">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Business Call: Connector
      </button>
      <PageHeader
        title={original.title}
        subtitle="Gather the details needed for the Alignment Snapshot."
        action={<div className="flex flex-wrap gap-2"><Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Business Call: Connector</Badge><Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Business Case: Connector phase</Badge></div>}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div className="space-y-5">
          <Section title="Call purpose">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">Gather the details needed for the Alignment Snapshot.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="v3-card-muted p-3"><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Admin checks</p><p className="text-[12px] mt-1">Objective, audience, channels, KPIs, timeline, budget, approval owner, constraints.</p></div>
              <div className="v3-card-muted p-3"><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript use</p><p className="text-[12px] mt-1">Draft/update Alignment Snapshot if enough context exists.</p></div>
              <div className="v3-card-muted p-3"><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Next step</p><p className="text-[12px] mt-1">Review snapshot, send to company, move Business Case forward.</p></div>
            </div>
          </Section>

          <Section title="Linked records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Business Case', original.businessCase],
                ['Company', original.company],
                ['Stage', original.stage],
                ['Meeting link', original.meetingLink],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">{label}</p>
                  <p className="text-[12px] text-[#1A1A1A] break-words">{value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Suggested questions">
            <QuestionList questions={original.suggestedQuestions} />
          </Section>

          <Section title="Transcript upload">
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={7} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3" placeholder="Paste transcript here..." />
            <button className="v3-btn-primary"><Upload className="w-3.5 h-3.5" /> Analyze transcript</button>
          </Section>
        </div>
        <div className="space-y-5">
          <Section title="Alignment Snapshot readiness">
            <AnalysisCard analysis={original.analysis} score={original.readinessScore} />
            <div className="mt-4">
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">AI outputs</p>
              <div className="space-y-2">
                {original.analysis.aiOutputs.map((output) => <div key={output} className="rounded-lg bg-[#F4F2EC] p-2 text-[12px] text-[#1A1A1A]">{output}</div>)}
              </div>
            </div>
          </Section>
          <Section title="Alignment Snapshot handoff">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">This is the Connector business call. A strong transcript should produce Alignment Snapshot readiness and, when enough context exists, an admin-review draft.</p>
            <button onClick={() => navigate(`/v3/admin/business-cases/${original.businessCaseId}`)} className="v3-btn-primary w-full">
              <Briefcase className="w-3.5 h-3.5" /> Open Business Case Connect
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default V3AdminMeetingsOverview;
