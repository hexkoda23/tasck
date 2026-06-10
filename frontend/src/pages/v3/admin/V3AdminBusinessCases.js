// Admin Business Cases — the v3.2 spec primitive (live from /api/v3)
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  v3ListBusinessCases, v3AdminOverview, v3GetBrands, v3GetCreators,
  v3CreateBusinessCase, v3ListOpportunityCandidates,
} from '../../../lib/v3api';
import {
  formatNairaV3, v3Stages, v3Brands as fallbackBrands, v3Creators as fallbackCreators,
  buildMockBusinessCases, buildMockAdminOverview, getRM,
} from '../../../lib/v3data';
import { applyStoredDemoRows, saveStoredDemoBundle } from '../../../lib/v3demoStore';
import { candidateToBusinessOpportunity, demoOpportunityCandidates } from '../../../lib/v3opportunityDemo';
import V3Modal from '../../../components/v3/V3Modal';
import { Sparkles, Filter, ArrowRight, AlertOctagon, Plus, CheckCircle2, XCircle, Search } from 'lucide-react';

const stageMeta = {
  connect: { label: 'Connect', color: '#9B9380' },
  frame: { label: 'Frame', color: '#C49B5F' },
  plan: { label: 'Plan', color: '#1F4A3A' },
  deliver: { label: 'Deliver', color: '#567B3F' },
  closed: { label: 'Closed', color: '#B54A37' },
};

const healthBadge = (h) => {
  const map = {
    'on-track': { bg: '#DDE7E2', fg: '#1F4A3A', label: 'On track' },
    'near-closure': { bg: '#F2EAD8', fg: '#7A5F23', label: 'Near closure' },
    new: { bg: '#EEEAE0', fg: '#6E6657', label: 'New' },
    'at-risk': { bg: '#F5D9D2', fg: '#B54A37', label: 'At risk' },
  };
  return map[h] || map.new;
};

const brandCreatedAtTs = (value) => {
  const ts = Date.parse(value || '');
  return Number.isNaN(ts) ? 0 : ts;
};

const sortBrandsNewestFirst = (brandList = []) => {
  return [...brandList].sort((a, b) => {
    const newest = brandCreatedAtTs(b.created_at || b.createdAt) - brandCreatedAtTs(a.created_at || a.createdAt);
    if (newest !== 0) {
      return newest;
    }
    return (a.company || '').localeCompare(b.company || '');
  });
};

const demoOverviewFromRows = (rows) => {
  const base = buildMockAdminOverview();
  const byStage = rows.reduce((acc, row) => ({ ...acc, [row.stage]: (acc[row.stage] || 0) + 1 }), {});
  const paid = rows.filter((row) => row.engagement_track !== 'grant');
  const grants = rows.filter((row) => row.engagement_track === 'grant');
  return {
    ...base,
    business_cases_total: rows.length,
    paid_count: paid.length,
    paid_total_value: paid.reduce((sum, row) => sum + (Number(row.estimated_value) || 0), 0),
    grant_count: grants.length,
    grant_total_value: grants.reduce((sum, row) => sum + (Number(row.estimated_value) || 0), 0),
    by_stage: byStage,
  };
};

const demoGrantOpportunities = [
  {
    id: 'grant-african-creative-economy',
    title: 'African Creative Economy Growth Fund',
    funder: 'Pan-African Culture & Innovation Facility',
    amount: 75000000,
    deadline: '2026-07-18',
    source: 'culturefund.africa/opportunities/creative-economy-growth',
    fit_score: 94,
    angle: 'Supports TASCK creator infrastructure, talent discovery, and reporting tools for youth culture campaigns.',
    status: 'new',
  },
  {
    id: 'grant-youth-digital-jobs',
    title: 'Youth Digital Jobs & Media Skills Grant',
    funder: 'West Africa Digital Skills Alliance',
    amount: 48000000,
    deadline: '2026-08-02',
    source: 'wadsa.org/grants/youth-digital-media',
    fit_score: 89,
    angle: 'Good fit for creator onboarding, production training, campaign operations, and measurable employment outcomes.',
    status: 'new',
  },
  {
    id: 'grant-women-culture-commerce',
    title: 'Women In Culture Commerce Accelerator',
    funder: 'Global Inclusive Markets Lab',
    amount: 62000000,
    deadline: '2026-06-29',
    source: 'inclusivemarkets.example/apply/women-culture-commerce',
    fit_score: 86,
    angle: 'Can fund campaigns and creator partnerships led by women, plus brand access for women-owned creative businesses.',
    status: 'new',
  },
  {
    id: 'grant-climate-storytelling',
    title: 'Climate Storytelling For African Cities',
    funder: 'Green Futures Media Trust',
    amount: 35000000,
    deadline: '2026-09-10',
    source: 'greenfuturemedia.org/open-calls/african-cities',
    fit_score: 81,
    angle: 'Useful for TASCK documentary briefs, creator-led climate storytelling, and brand-funded impact reporting.',
    status: 'new',
  },
];

const demoBusinessOpportunities = [
  {
    id: 'opp-cocacola-campus-share',
    brand_id: 'brand-cocacola',
    company: 'Coca-Cola Nigeria Limited',
    title: 'Campus Share Moments',
    pain_point: 'Public social listening shows students are sharing “Detty December on campus” content, but beverage brands are not owning the moment with a structured creator-led mechanic.',
    source: 'AI web discovery: culture calendars, student creator posts, retail activation mentions',
    contact: 'Folake Adeniran, folake.adeniran@coca-cola.com',
    estimated_value: 85000000,
    fit_score: 94,
    suggested_angle: 'Generate an Alignment Snapshot around campus storytelling, personalized sharing moments, and retail-to-social UGC.',
    status: 'new',
  },
  {
    id: 'opp-mtn-data-youth',
    brand_id: 'brand-mtn',
    company: 'MTN Nigeria Communications PLC',
    title: 'Data For Creators Push',
    pain_point: 'Creator economy conversations are highlighting high data spend as a barrier to consistent posting, especially among student creators and micro-influencers.',
    source: 'AI web discovery: creator forums, X posts, student tech blogs, telco campaign mentions',
    contact: 'Kemi Adebayo, kemi.adebayo@mtn.com',
    estimated_value: 120000000,
    fit_score: 91,
    suggested_angle: 'Position MTN as the network powering the next wave of Nigerian creators with a creator challenge and data-led conversion KPI.',
    status: 'new',
  },
  {
    id: 'opp-star-nightlife-reboot',
    brand_id: 'brand-star',
    company: 'Nigerian Breweries PLC (Star Lager)',
    title: 'Nightlife Reboot',
    pain_point: 'Lagos nightlife content is fragmenting across TikTok, Instagram, and event pages; beer brands need cleaner cultural ownership and safer event-to-content reporting.',
    source: 'AI web discovery: nightlife event listings, creator content, venue pages, entertainment blogs',
    contact: 'Funke Adebiyi, funke.adebiyi@heineken.com',
    estimated_value: 98000000,
    fit_score: 88,
    suggested_angle: 'Build a Star-led nightlife content system with approved venues, creators, responsible-drinking controls, and measurable event attendance lift.',
    status: 'new',
  },
  {
    id: 'opp-access-finance-culture',
    brand_id: 'brand-access',
    company: 'Access Bank PLC',
    title: 'Creator Finance Trust Gap',
    pain_point: 'Young creators are discussing inconsistent payment cycles and limited access to structured financial products for production, tax, and savings.',
    source: 'AI web discovery: creator newsletters, finance forums, LinkedIn posts, SME program pages',
    contact: 'Obi Nwosu, obi.nwosu@accessbankplc.com',
    estimated_value: 64000000,
    fit_score: 83,
    suggested_angle: 'Create an Alignment Snapshot for a creator-finance education campaign with measurable account/product adoption signals.',
    status: 'new',
  },
];

const V3AdminBusinessCases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [overview, setOverview] = useState(null);
  const [stage, setStage] = useState('all');
  const [track, setTrack] = useState('all');
  const [error, setError] = useState(null);

  // New BC modal
  const [newOpen, setNewOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [creators, setCreators] = useState([]);
  const [busy, setBusy] = useState(false);
  const [grantAgentRan, setGrantAgentRan] = useState(false);
  const [grantOpportunities, setGrantOpportunities] = useState(demoGrantOpportunities);
  const [businessAgentOpen, setBusinessAgentOpen] = useState(false);
  const [businessOpportunities, setBusinessOpportunities] = useState(demoBusinessOpportunities);
  const [form, setForm] = useState({
    brand_id: '', creator_id: '', title: '', engagement_track: 'paid',
    estimated_value: 100000000, rm_id: 'rm-temi',
    connect_status: 'in_discovery', stated_intent: '', source: 'Inbound enquiry',
  });

  const reload = () =>
    Promise.all([v3ListBusinessCases(), v3AdminOverview()]).then(([cs, ov]) => {
      setCases(Array.isArray(cs) ? cs : buildMockBusinessCases());
      setOverview(ov && typeof ov === 'object' && !Array.isArray(ov) ? ov : buildMockAdminOverview());
      setError(null);
    }).catch(() => {
      const rows = applyStoredDemoRows(buildMockBusinessCases());
      setCases(rows);
      setOverview(demoOverviewFromRows(rows));
      setError(null);
    });

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  const openNew = async () => {
    let b = fallbackBrands;
    let c = fallbackCreators;
    try {
      [b, c] = await Promise.all([v3GetBrands(), v3GetCreators()]);
    } catch (e) {
      // Demo fallback keeps the workflow visible when the API is not running.
    }
    const brandList = Array.isArray(b) ? b : [];
    const creatorList = Array.isArray(c) ? c : [];
    const sortedBrands = sortBrandsNewestFirst(brandList);
    setBrands(sortedBrands);
    setCreators(creatorList);
    const defaultBrand = sortedBrands[0];
    setForm((f) => ({
      ...f,
      brand_id: defaultBrand?.id || '',
      creator_id: '',
      rm_id: defaultBrand?.rm_id || defaultBrand?.rmId || defaultBrand?.relationship_manager?.id || 'rm-temi',
      engagement_track: defaultBrand?.engagement_track_default || defaultBrand?.engagementTrack || 'paid',
    }));
    setNewOpen(true);
  };

  const submitNew = async () => {
    if (!form.brand_id || !form.title) return;
    setBusy(true);
    try {
      const created = await v3CreateBusinessCase({
        ...form,
        creator_id: form.creator_id || null,
        estimated_value: Number(form.estimated_value) || 0,
      });
      setNewOpen(false);
      navigate(`/v3/admin/business-cases/${created.id}`);
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () =>
      (Array.isArray(cases) ? cases : []).filter(
        (c) =>
          (stage === 'all' || c.stage === stage) &&
          (track === 'all' || c.engagement_track === track)
      ),
    [cases, stage, track]
  );
  const byStage = overview?.by_stage || {};

  const runGrantAgent = () => {
    setBusy(true);
    setTimeout(() => {
      setGrantAgentRan(true);
      setGrantOpportunities(demoGrantOpportunities);
      setBusy(false);
    }, 350);
  };

  const setGrantStatus = (id, status) => {
    setGrantOpportunities((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const runBusinessOpportunityAgent = async () => {
    setBusinessAgentOpen(true);
    setBusy(true);
    try {
      const accepted = await v3ListOpportunityCandidates({ status: 'accepted' });
      if (Array.isArray(accepted) && accepted.length) {
        setBusinessOpportunities(accepted.map((candidate) => ({
          ...candidateToBusinessOpportunity(candidate),
          source_type: 'scanner',
        })));
      } else {
        const pending = await v3ListOpportunityCandidates({ status: 'pending' });
        setBusinessOpportunities((Array.isArray(pending) && pending.length ? pending : demoOpportunityCandidates)
          .map((candidate) => ({
            ...candidateToBusinessOpportunity(candidate),
            source_type: 'scanner',
          })));
      }
    } catch (e) {
      const demoAccepted = demoOpportunityCandidates.filter((candidate) => candidate.status === 'accepted');
      setBusinessOpportunities(demoAccepted.length ? demoAccepted.map((candidate) => ({
        ...candidateToBusinessOpportunity(candidate),
        source_type: 'scanner_demo',
      })) : demoBusinessOpportunities);
    } finally {
      setBusy(false);
    }
  };

  const createBusinessCaseFromOpportunity = async (opportunity) => {
    if (opportunity.source_type === 'scanner' && opportunity.status !== 'accepted') {
      navigate('/v3/admin/crm/opportunities');
      return;
    }
    setBusy(true);
    try {
      if (opportunity.source_type === 'scanner' && opportunity.brand_id) {
        const brand = brands.find((b) => b.id === opportunity.brand_id) || fallbackBrands.find((b) => b.id === opportunity.brand_id);
        const brandRmId = brand?.rm_id || brand?.rmId || brand?.relationship_manager?.id || 'rm-temi';
        const created = await v3CreateBusinessCase({
          brand_id: opportunity.brand_id,
          creator_id: null,
          title: opportunity.title,
          engagement_track: 'paid',
          estimated_value: Number(opportunity.estimated_value) || 75000000,
          rm_id: brandRmId,
          connect_status: 'in_discovery',
          stated_intent: opportunity.pain_point,
          source: opportunity.source || 'SerpAPI opportunity scanner',
        });
        setBusinessOpportunities((items) => items.map((item) => (item.id === opportunity.id ? { ...item, status: 'converted' } : item)));
        navigate(`/v3/admin/business-cases/${created.id}`);
        return;
      }
    } catch (e) {
      // Demo/local fallback below keeps the presentation usable.
    } finally {
      setBusy(false);
    }

    const brand = fallbackBrands.find((item) => item.id === opportunity.brand_id) || {
      id: opportunity.brand_id || `brand-${opportunity.id}`,
      company: opportunity.company,
      industry: opportunity.industry || 'Brand / Consumer Marketing',
      primaryContact: 'Marketing Team',
      primary_contact: 'Marketing Team',
      role: 'Brand contact',
      email: '',
      leadScore: opportunity.fit_score || 70,
    };
    const row = {
      id: `ai-bc-${opportunity.id}`,
      brand_id: opportunity.brand_id || brand.id,
      creator_id: null,
      title: opportunity.title,
      stage: 'connect',
      engagement_track: 'paid',
      estimated_value: opportunity.estimated_value,
      rm_id: 'rm-temi',
      created_at: '2026-05-26',
      days_in_stage: 0,
      next_action: 'Review AI-scraped opportunity, schedule connector call, and generate Alignment Snapshot.',
      health: 'new',
      connect: {
        status: 'in_discovery',
        connect_status: 'in_discovery',
        source: opportunity.source,
        stated_intent: opportunity.pain_point,
        marketing_intelligence: {
          key_marketing_focus: opportunity.suggested_angle,
          primary_target_audience: 'Priority audience inferred from the scraped business opportunity; admin to confirm on connector call.',
          key_marketing_channels: ['Instagram', 'TikTok', 'YouTube', 'PR'],
          marketing_kpis: [
            { kpi: 'Reach', target: 'Confirm with brand during connector call.' },
            { kpi: 'Engagement', target: 'Confirm channel benchmark with brand.' },
            { kpi: 'Conversion signal', target: 'Define from the scraped pain point and brand objective.' },
          ],
          source: 'ai_business_opportunity_agent',
        },
      },
    };
    const bundle = {
      source: 'demo',
      business_case: {
        ...row,
        frame: {},
        plan: {},
        deliver: { scope_change_log: [] },
        closure: { report_status: 'pending', brand_feedback_received: false, creator_feedback_received: false },
      },
      brand,
      creator: null,
      rm: getRM('rm-temi'),
      interactions: [{
        id: `int-${opportunity.id}`,
        type: 'ai_discovery',
        title: 'AI-scraped business opportunity',
        author: 'TASCK AI Opportunity Agent',
        date_iso: new Date().toISOString(),
        content: `${opportunity.pain_point}\n\nSuggested angle: ${opportunity.suggested_angle}\n\nSource: ${opportunity.source}\nContact: ${opportunity.contact}`,
      }],
      alignment_snapshot: null,
      invoices: [],
      brainstorm_round: null,
      creative_brief: null,
      creative_snapshot: null,
      contract: null,
      deliverables: [],
      final_report: null,
    };
    saveStoredDemoBundle(bundle);
    setCases((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== row.id);
      const next = [row, ...withoutDuplicate];
      setOverview(demoOverviewFromRows(next));
      return next;
    });
    setBusinessOpportunities((items) => items.map((item) => (item.id === opportunity.id ? { ...item, status: 'converted' } : item)));
    navigate(`/v3/admin/business-cases/${row.id}`);
  };

  return (
    <>
    <div data-testid="v3-admin-business-cases">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Admin Control Centre</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Business Cases
          </h1>
          <p className="text-[#8A8A8A] text-sm flex items-center gap-2">
            One Business Case = one document chain across Connect → Frame → Plan → Deliver.
            <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]">
              <Sparkles className="w-3 h-3" /> live
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runBusinessOpportunityAgent} disabled={busy} className="v3-btn-secondary" data-testid="bc-ai-business-agent" title="Show AI-scraped business opportunities">
            <Sparkles className="w-3.5 h-3.5" /> AI-generated business cases
          </button>
          <button onClick={openNew} className="v3-btn-primary" data-testid="bc-new">
            <Plus className="w-4 h-4" /> New Business Case
          </button>
        </div>
      </div>

      {error && (
        <div className="v3-card p-4 mb-6 flex items-center gap-3 border-[#F5D9D2]" data-testid="bc-error">
          <AlertOctagon className="w-4 h-4 text-[#B54A37]" />
          <span className="text-[13px] text-[#B54A37]">Backend unreachable: {error}</span>
        </div>
      )}

      {businessAgentOpen && (
        <div className="v3-card p-5 mb-6 border-[#1F4A3A]" data-testid="bc-ai-business-opportunities">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">AI business opportunity agent</p>
              <h2 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                Scraped opportunities ready for Business Case creation
              </h2>
              <p className="text-[12px] text-[#6E6657] mt-1">
                Accepted scanner results from public web signals: brand pain point, source, contact route, suggested angle, fit score, and one-click conversion into a Connector-stage Business Case.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/v3/admin/crm/opportunities')} className="v3-btn-primary text-[11px]" data-testid="bc-open-opportunity-scanner">
                <Search className="w-3.5 h-3.5" /> Open scanner
              </button>
              <button onClick={() => setBusinessAgentOpen(false)} className="v3-btn-secondary text-[11px]">
                Hide
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {businessOpportunities.map((opportunity) => {
              const needsAcceptance = String(opportunity.source_type || '').startsWith('scanner') && !['accepted', 'converted'].includes(opportunity.status);
              const buttonLabel = opportunity.status === 'converted'
                ? 'Business Case created'
                : needsAcceptance
                  ? 'Accept in scanner first'
                  : 'Create Business Case';
              return (
              <div key={opportunity.id} className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4" data-testid={`bc-ai-opportunity-${opportunity.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{opportunity.title}</p>
                    <p className="text-[11px] text-[#8A8A8A]">{opportunity.company}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                    opportunity.status === 'converted' ? 'bg-[#DDE7E2] text-[#1F4A3A]' : 'bg-[#F4F2EC] text-[#6E6657]'
                  }`}>
                    {opportunity.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Value</p>
                    <p className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(opportunity.estimated_value)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Fit</p>
                    <p className="text-[12px] font-medium text-[#1F4A3A]">{opportunity.fit_score}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Track</p>
                    <p className="text-[12px] font-medium">Paid</p>
                  </div>
                </div>
                <p className="text-[12px] text-[#6E6657] mb-2">{opportunity.pain_point}</p>
                <p className="text-[12px] text-[#1F4A3A] mb-2">{opportunity.suggested_angle}</p>
                <p className="text-[10px] text-[#8A8A8A] mb-1">Contact: {opportunity.contact}</p>
                <p className="text-[10px] text-[#8A8A8A] mb-3">Source: {opportunity.source}</p>
                <button
                  onClick={() => createBusinessCaseFromOpportunity(opportunity)}
                  disabled={opportunity.status === 'converted'}
                  className="v3-btn-primary text-[11px]"
                  data-testid={`bc-create-ai-business-case-${opportunity.id}`}
                >
                  <Plus className="w-3.5 h-3.5" /> {buttonLabel}
                </button>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* Overview metrics */}
      {overview && (
        <div className="grid grid-cols-4 gap-4 mb-8" data-testid="bc-metrics">
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Total Business Cases</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {overview.business_cases_total}
            </p>
          </div>
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Paid Strategy</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {overview.paid_count}
            </p>
            <p className="text-[11px] text-[#1F4A3A] mt-1">{formatNairaV3(overview.paid_total_value)} pipeline</p>
          </div>
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Grant</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {overview.grant_count}
            </p>
            <p className="text-[11px] text-[#7A5F23] mt-1">{formatNairaV3(overview.grant_total_value)} pipeline</p>
          </div>
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">By Stage</p>
            <div className="space-y-1">
              {v3Stages.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6E6657]">{s.label}</span>
                  <span
                    className="font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: s.color }}
                  >
                    {byStage[s.key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-[#8A8A8A]" />
        <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="bc-stage-filter">
          {['all', 'connect', 'frame', 'plan', 'deliver', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`text-[11px] px-3 py-1 rounded transition-colors capitalize ${stage === s ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`bc-stage-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="bc-track-filter">
          {[
            { k: 'all', label: 'All tracks' },
            { k: 'paid', label: 'Paid' },
            { k: 'grant', label: 'Grant' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTrack(t.k)}
              className={`text-[11px] px-3 py-1 rounded transition-colors ${track === t.k ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`bc-track-${t.k}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {track === 'grant' && (
        <div className="v3-card p-5 mb-6 border-[#C49B5F]" data-testid="bc-grant-agent">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Grant web discovery agent</p>
              <h2 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                AI grant scraper for TASCK
              </h2>
              <p className="text-[12px] text-[#6E6657] mt-1">
                Demo agent scans public grant portals, funder calls, creative economy programs, and impact funding pages, then ranks opportunities TASCK can pursue.
              </p>
            </div>
            <button onClick={runGrantAgent} disabled={busy} className="v3-btn-primary" data-testid="bc-run-grant-agent">
              <Search className="w-3.5 h-3.5" /> {grantAgentRan ? 'Refresh grant scrape' : 'Scrape web for grants'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {grantOpportunities.map((grant) => (
              <div key={grant.id} className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4" data-testid={`bc-grant-${grant.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{grant.title}</p>
                    <p className="text-[11px] text-[#8A8A8A]">{grant.funder}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                    grant.status === 'approved' ? 'bg-[#DDE7E2] text-[#1F4A3A]' :
                    grant.status === 'rejected' ? 'bg-[#F5D9D2] text-[#B54A37]' :
                    'bg-[#F4F2EC] text-[#6E6657]'
                  }`}>
                    {grant.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Amount</p>
                    <p className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(grant.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Deadline</p>
                    <p className="text-[12px] font-medium">{grant.deadline}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Fit</p>
                    <p className="text-[12px] font-medium text-[#1F4A3A]">{grant.fit_score}%</p>
                  </div>
                </div>
                <p className="text-[12px] text-[#6E6657] mb-2">{grant.angle}</p>
                <p className="text-[10px] text-[#8A8A8A] mb-3">Source: {grant.source}</p>
                <div className="flex gap-2">
                  <button onClick={() => setGrantStatus(grant.id, 'approved')} className="v3-btn-primary text-[11px]" data-testid={`bc-approve-grant-${grant.id}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => setGrantStatus(grant.id, 'rejected')} className="v3-btn-secondary text-[11px]" data-testid={`bc-reject-grant-${grant.id}`}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const sm = stageMeta[c.stage] || stageMeta.connect;
          const hb = healthBadge(c.health);
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/v3/admin/business-cases/${c.id}`)}
              className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors"
              data-testid={`bc-row-${c.id}`}
            >
              <div
                className="w-1 h-12 rounded-full flex-shrink-0"
                style={{ background: sm.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium text-[#1A1A1A]">{c.title}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: `${sm.color}1A`, color: sm.color }}
                  >
                    {sm.label}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{
                      background: c.engagement_track === 'grant' ? '#F2EAD8' : '#DDE7E2',
                      color: c.engagement_track === 'grant' ? '#7A5F23' : '#1F4A3A',
                    }}
                  >
                    {c.engagement_track === 'grant' ? 'Grant' : 'Paid Strategy'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: hb.bg, color: hb.fg }}>
                    {hb.label}
                  </span>
                </div>
                <p className="text-[12px] text-[#8A8A8A] mt-1">{c.next_action}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-[12px] font-semibold text-[#1F4A3A]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatNairaV3(c.estimated_value)}
                </p>
                <p className="text-[10px] text-[#8A8A8A] mt-0.5">{c.days_in_stage}d in stage</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="v3-card p-10 text-center text-[#8A8A8A] text-[13px]">No business cases match these filters.</div>
        )}
      </div>
    </div>

    <V3Modal
      open={newOpen}
      onClose={() => setNewOpen(false)}
      title="New Business Case"
      subtitle="Spin up the document chain. Lands in Connect; advance through the stages from the detail page."
      testid="new-bc-modal"
      wide
      footer={
        <>
          <button onClick={() => setNewOpen(false)} className="v3-btn-secondary" data-testid="new-bc-cancel">Cancel</button>
          <button onClick={submitNew} disabled={busy || !form.brand_id || !form.title} className="v3-btn-primary" data-testid="new-bc-submit">
            {busy ? 'Creating…' : 'Create Business Case'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Star Originals — A Lagos After-Dark Anthology"
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-title"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Brand</label>
          <select
            value={form.brand_id}
            onChange={(e) => {
              const brand = brands.find((b) => b.id === e.target.value);
              setForm({
                ...form,
                brand_id: e.target.value,
                rm_id: brand?.rm_id || brand?.rmId || brand?.relationship_manager?.id || 'rm-temi',
                engagement_track: brand?.engagement_track_default || brand?.engagementTrack || 'paid',
              });
            }}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-brand"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.company} ({b.engagement_track_default || 'paid'})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Creator (optional)</label>
          <select
            value={form.creator_id}
            onChange={(e) => setForm({ ...form, creator_id: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-creator"
          >
            <option value="">— Pick later during Plan —</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Engagement track</label>
          <div className="flex gap-2">
            {['paid', 'grant'].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, engagement_track: t })}
                className={`flex-1 px-3 py-2 text-[12px] rounded-lg border transition-colors ${form.engagement_track === t ? 'bg-[#1F4A3A] text-white border-[#1F4A3A]' : 'bg-white border-[#E8E4DB] text-[#6E6657]'}`}
                data-testid={`new-bc-track-${t}`}
              >
                {t === 'paid' ? 'Paid Strategy' : 'Grant'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Estimated value (₦)</label>
          <input
            type="number"
            value={form.estimated_value}
            onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-value"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Relationship Manager</label>
          <select
            value={form.rm_id}
            onChange={(e) => setForm({ ...form, rm_id: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-rm"
          >
            <option value="rm-temi">Temi Bakare</option>
            <option value="rm-adaeze">Adaeze Obi</option>
            <option value="rm-tope">Tope Martins</option>
            <option value="rm-femi">Femi Oladipo</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Connect status at intake</label>
          <select
            value={form.connect_status}
            onChange={(e) => setForm({ ...form, connect_status: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-connect-status"
          >
            <option value="new_lead">New lead</option>
            <option value="in_discovery">In discovery</option>
            <option value="qualified_to_frame">Qualified to Frame</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Stated intent (from brand)</label>
          <textarea
            value={form.stated_intent}
            onChange={(e) => setForm({ ...form, stated_intent: e.target.value })}
            placeholder="A one-paragraph version of what the brand told you they want."
            rows={3}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-intent"
          />
        </div>
      </div>
    </V3Modal>
    </>
  );
};

export default V3AdminBusinessCases;
