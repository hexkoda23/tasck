import { adminRoute } from '../../lib/v3AdminRouteBase';
// Admin Business Cases — the v3.2 spec primitive (live from /api/v3)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  v3ListBusinessCases, v3AdminOverview, v3GetBrands, v3GetCreators,
  v3CreateBusinessCase, v3ListOpportunityCandidates,
} from '../../lib/v3api';
import {
  formatNairaV3, formatValueV3, v3Stages,
} from '../../lib/v3data';
import { candidateToBusinessOpportunity } from '../../lib/v3opportunityDemo';
import V3Modal from '../../components/v3/V3Modal';
import { Sparkles, Filter, ArrowRight, AlertOctagon, Plus, CheckCircle2, XCircle, Search, Lock } from 'lucide-react';
import { businessCasePhasePath } from './V1BusinessCaseFlowPages';

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
  const key = (h || 'new').replace(/_/g, '-');
  return map[key] || map.new;
};

const STAGE_INDEX = { connect: 0, frame: 1, plan: 2, deliver: 3, reporting: 4, closed: 4 };

const phaseLinks = (id) => [
  ['Connect', adminRoute(`/business-cases/${id}/connect`)],
  ['Frame', adminRoute(`/business-cases/${id}/frame/snapshot`)],
  ['Plan', adminRoute(`/business-cases/${id}/plan/brainstorm`)],
  ['Delivery', adminRoute(`/business-cases/${id}/delivery/summary`)],
  ['Reporting', adminRoute(`/business-cases/${id}/reporting/final-report`)],
];

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

const businessCaseActivityTs = (businessCase) => {
  const timestamps = [
    businessCase?.updated_at,
    businessCase?.updatedAt,
    businessCase?.last_interaction_at,
    businessCase?.lastInteractionAt,
    businessCase?.created_at,
    businessCase?.createdAt,
  ].map((value) => {
    const parsed = Date.parse(value || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  });

  const timeline = Array.isArray(businessCase?.timeline) ? businessCase.timeline : [];
  timeline.forEach((item) => {
    const parsed = Date.parse(item?.at || item?.updated_at || item?.created_at || '');
    timestamps.push(Number.isNaN(parsed) ? 0 : parsed);
  });

  return Math.max(...timestamps, 0);
};

const isIntentionalNewProject = (businessCase) => {
  if (businessCase?.connect?.project_start_mode === 'new_project' || businessCase?.project_start_mode === 'new_project') return true;
  const timeline = Array.isArray(businessCase?.timeline) ? businessCase.timeline : [];
  return timeline.some((item) => item?.force_new === true || item?.project_start_mode === 'new_project');
};

const dedupeBusinessCasesForV1 = (items = []) => {
  const sorted = [...items].sort((a, b) => businessCaseActivityTs(b) - businessCaseActivityTs(a) || String(b.id || '').localeCompare(String(a.id || '')));
  const latestByBrand = new Map();
  const explicitProjects = [];

  sorted.forEach((businessCase) => {
    const brandKey = businessCase?.brand_id || businessCase?.brand?.id || '';
    if (!brandKey || isIntentionalNewProject(businessCase)) {
      explicitProjects.push(businessCase);
      return;
    }
    if (!latestByBrand.has(brandKey)) {
      latestByBrand.set(brandKey, businessCase);
    }
  });

  return [...latestByBrand.values(), ...explicitProjects]
    .sort((a, b) => businessCaseActivityTs(b) - businessCaseActivityTs(a) || String(b.id || '').localeCompare(String(a.id || '')));
};

const V1AdminBusinessCases = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStage = (searchParams.get('stage') || 'all').toLowerCase();
  const validStages = ['all', ...v3Stages.map((s) => s.key)];
  const [cases, setCases] = useState([]);
  const [overview, setOverview] = useState(null);
  const [stage, setStage] = useState(validStages.includes(initialStage) ? initialStage : 'all');
  const [track, setTrack] = useState('all');
  const [error, setError] = useState(null);

  // New BC modal
  const [newOpen, setNewOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [creators, setCreators] = useState([]);
  const [busy, setBusy] = useState(false);
  const [grantAgentRan, setGrantAgentRan] = useState(false);
  const [grantOpportunities, setGrantOpportunities] = useState([]);
  const [businessAgentOpen, setBusinessAgentOpen] = useState(false);
  const [businessOpportunities, setBusinessOpportunities] = useState([]);
  const fetchedRef = useRef(false);
  const [form, setForm] = useState({
    brand_id: '', creator_id: '', title: '', engagement_track: 'paid',
    estimated_value: 100000000, rm_id: 'rm-temi',
    connect_status: 'in_discovery', stated_intent: '', source: 'Inbound enquiry',
  });

  const reload = () =>
    Promise.all([v3ListBusinessCases(), v3AdminOverview()]).then(([cs, ov]) => {
      const csList = Array.isArray(cs) ? cs : [];
      csList.sort((a, b) => businessCaseActivityTs(b) - businessCaseActivityTs(a) || String(b.id || '').localeCompare(String(a.id || '')));
      setCases(csList);
      setOverview(ov && typeof ov === 'object' && !Array.isArray(ov) ? ov : null);
      setError(null);
    }).catch((e) => {
      setError('Backend unavailable. Please check your connection.');
    });

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  const openNew = async () => {
    let b = [], c = [];
    try {
      [b, c] = await Promise.all([v3GetBrands(), v3GetCreators()]);
    } catch (e) {
      // API unavailable — brand and creator lists will be empty
    }
    const brandList = Array.isArray(b) ? b : [];
    const creatorList = Array.isArray(c) ? c : [];
    const sortedBrands = [...brandList].sort(
      (a, z) => Date.parse(z.created_at || '') - Date.parse(a.created_at || '') || 0
    );
    setBrands(sortedBrands);
    setCreators(creatorList);
    const defaultBrand = sortedBrands[0];
    setForm((f) => ({
      ...f,
      brand_id: defaultBrand?.id || '',
      creator_id: '',
      rm_id: defaultBrand?.rm_id || defaultBrand?.relationship_manager?.id || 'rm-temi',
      engagement_track: defaultBrand?.engagement_track_default || 'paid',
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
      navigate(adminRoute(`/business-cases/${created.id}`));
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () => dedupeBusinessCasesForV1(
      (Array.isArray(cases) ? cases : []).filter(
        (c) =>
          (stage === 'all' || c.stage === stage) &&
          (track === 'all' || c.engagement_track === track)
      )
    ),
    [cases, stage, track]
  );
  const byStage = overview?.by_stage || {};

  const runGrantAgent = () => {
    setBusy(true);
    setGrantAgentRan(true);
    setGrantOpportunities([]);
    setBusy(false);
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
        const pendingList = Array.isArray(pending) ? pending : [];
        setBusinessOpportunities(pendingList.map((candidate) => ({
          ...candidateToBusinessOpportunity(candidate),
          source_type: 'scanner',
        })));
      }
    } catch (e) {
      setBusinessOpportunities([]);
      setError(e?.response?.data?.detail || e.message || 'Opportunity candidates could not be loaded from the live V3 API.');
    } finally {
      setBusy(false);
    }
  };

  const createBusinessCaseFromOpportunity = async (opportunity) => {
    if (opportunity.business_case_id) {
      navigate(adminRoute(`/business-cases/${opportunity.business_case_id}`));
      return;
    }
    if (String(opportunity.source_type || '').startsWith('scanner')) {
      navigate(adminRoute('/crm/opportunities'));
      return;
    }
    setError('This opportunity must come from the live V3 Opportunity Scanner before it can become a real Business Case.');
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
          <button onClick={() => navigate(adminRoute('/crm/opportunities'))} className="v3-btn-secondary" data-testid="bc-ai-business-agent" title="Open Brand Opportunity Scanner">
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
                Scraped opportunities awaiting qualification
              </h2>
              <p className="text-[12px] text-[#6E6657] mt-1">
                Public web signals are candidates only. Move each brand through the qualification scanner and Business Call before it becomes a Business Case.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(adminRoute('/crm/opportunities'))} className="v3-btn-primary text-[11px]" data-testid="bc-open-opportunity-scanner">
                <Search className="w-3.5 h-3.5" /> Open scanner
              </button>
              <button onClick={() => setBusinessAgentOpen(false)} className="v3-btn-secondary text-[11px]">
                Hide
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {businessOpportunities.length === 0 && (
              <div className="col-span-2 rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4 text-[13px] text-[#6E6657]">
                No live opportunity candidates returned. Open the scanner to pull real opportunities from the V3 backend.
              </div>
            )}
            {businessOpportunities.map((opportunity) => {
              const buttonLabel = opportunity.status === 'converted'
                ? 'Business Case created'
                : String(opportunity.source_type || '').startsWith('scanner')
                  ? 'Open Qualification Scanner'
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
                    {(() => {
                      const v = byStage[s.key];
                      if (v == null) return 0;
                      if (typeof v === 'object') return v.count ?? 0;
                      return v;
                    })()}
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
          {['all', 'connect', 'frame', 'plan', 'deliver', 'closed'].map((s) => {
            const stageCount = s === 'all'
              ? (Array.isArray(cases) ? cases.length : 0)
              : (byStage[s]?.count ?? (Array.isArray(cases) ? cases.filter((c) => c.stage === s).length : 0));
            return (
              <button
                key={s}
                onClick={() => {
                  setStage(s);
                  const next = new URLSearchParams(searchParams);
                  if (s === 'all') next.delete('stage'); else next.set('stage', s);
                  setSearchParams(next, { replace: true });
                }}
                className={`text-[11px] px-3 py-1 rounded transition-colors capitalize ${stage === s ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
                data-testid={`bc-stage-${s}`}
              >
                {s} <span className="text-[10px] opacity-70">({stageCount})</span>
              </button>
            );
          })}
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
                Live grant discovery will show real funder calls and ranked opportunities from the V3 backend when connected.
              </p>
            </div>
            <button onClick={runGrantAgent} disabled={busy} className="v3-btn-primary" data-testid="bc-run-grant-agent">
              <Search className="w-3.5 h-3.5" /> {grantAgentRan ? 'Refresh grant scrape' : 'Scrape web for grants'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {grantAgentRan && grantOpportunities.length === 0 && (
              <div className="col-span-2 rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4 text-[13px] text-[#6E6657]">
                No live grant opportunities returned.
              </div>
            )}
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
          const nextPath = businessCasePhasePath(c.id, c);
          return (
            <div
              key={c.id}
              className="w-full v3-card p-4 text-left flex flex-col gap-4 hover:border-[#D4CDBF] transition-colors"
              data-testid={`bc-row-${c.id}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-1 h-12 rounded-full flex-shrink-0"
                  style={{ background: sm.color }}
                />
                <button onClick={() => navigate(nextPath)} className="flex-1 min-w-0 text-left">
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
                    {c.stage === 'connect' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#EEEAE0', color: '#6E6657' }}>
                        New
                      </span>
                    ) : hb.label !== 'New' && (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: hb.bg, color: hb.fg }}>
                        {hb.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#8A8A8A] mt-1">{c.next_action}</p>
                </button>
                <div className="flex-shrink-0 text-right">
                  <p
                    className="text-[12px] font-semibold text-[#1F4A3A]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatValueV3(c)}
                  </p>
                  <p className="text-[10px] text-[#8A8A8A] mt-0.5">{Number.isFinite(c.days_in_stage) ? c.days_in_stage : 0}d in stage</p>
                </div>
                <button onClick={() => navigate(nextPath)} className="v3-btn-secondary text-[11px] flex-shrink-0">
                  Open active page <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pl-5">
                {phaseLinks(c.id).map(([label, href], idx) => {
                  const locked = idx > (STAGE_INDEX[c.stage] ?? 0);
                  const isActive = href === nextPath;
                  return (
                    <button
                      key={label}
                      onClick={() => { if (!locked) navigate(href); }}
                      disabled={locked}
                      aria-disabled={locked}
                      title={locked ? `Locked until the ${phaseLinks(c.id)[idx - 1]?.[0]} stage is completed` : ''}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                        locked
                          ? 'bg-[#F4F2EC] text-[#B8B2A4] border-[#E8E4DB] cursor-not-allowed opacity-60'
                          : isActive
                            ? 'bg-[#1F4A3A] text-white border-[#1F4A3A]'
                            : 'bg-[#FAFAF7] text-[#6E6657] border-[#E8E4DB] hover:border-[#D4CDBF]'
                      }`}
                      data-testid={`bc-${c.id}-phase-${label.toLowerCase()}${locked ? '-locked' : ''}`}
                    >
                      {locked && <Lock className="w-3 h-3 mr-1 inline-block align-[-2px]" strokeWidth={2} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
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

export default V1AdminBusinessCases;
