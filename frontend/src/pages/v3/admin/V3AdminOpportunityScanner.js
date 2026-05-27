import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  v3AcceptOpportunityCandidate,
  v3ListOpportunityCandidates,
  v3RejectOpportunityCandidate,
  v3RunOpportunityScan,
} from '../../../lib/v3api';
import { demoOpportunityCandidates } from '../../../lib/v3opportunityDemo';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Globe2,
  ListFilter,
  Mail,
  Megaphone,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react';

const defaultTemplate = {
  query: '',
  keywords: 'brand ambassador program celebrity partnership endorsement deal influencer campaign Nigeria',
  country: 'Nigeria',
  industries: 'Fashion, Food & Beverage, Tech, Beauty, Sports, FMCG, Telco, Fintech',
  campaign_types: 'brand ambassador program, celebrity partnership, celebrity endorsement deal, brand partnership opportunity, influencer campaign open application, creator campaign',
  recency: 'past_year',
  result_limit: 10,
  // v3.3 Addendum — multi-source fan-out controls
  enabled_sources: ['google_web', 'google_news', 'linkedin', 'trade_press'],
  hot_ratio: 0.6,
  per_source_limit: 10,
};

const ALL_SOURCES = [
  { key: 'google_web', label: 'Google Web' },
  { key: 'google_news', label: 'Google News' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'trade_press', label: 'Nigerian Trade' },
];

const examples = [
  '"brand ambassador" "Nigeria" "celebrity"',
  '"celebrity endorsement" "Nigeria" brand',
  '"influencer campaign" "Nigeria" "brand ambassador"',
  '"brand partnership opportunity" "Nigeria"',
  '"open application" "brand ambassador" Africa',
];

const splitList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

const scoreColor = (score) => (score >= 85 ? '#1F4A3A' : score >= 70 ? '#C49B5F' : '#B54A37');

const isMissingKeyError = (error) => /SERPAPI_API_KEY/i.test(error?.response?.data?.detail || error?.message || '');

const valueOrManual = (value) => value || 'Not found - recommend manual search.';

const InfoPanel = ({ icon: Icon, title, children, accent = '#1F4A3A' }) => (
  <div className="min-w-0 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3">
    <div className="flex items-center gap-2 mb-2 min-w-0">
      <span className="w-7 h-7 rounded-md bg-white border border-[#E8E4DB] inline-flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
      </span>
      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] truncate">{title}</p>
    </div>
    <div className="space-y-1 text-[12px] leading-relaxed text-[#1A1A1A] break-words">
      {children}
    </div>
  </div>
);

const V3AdminOpportunityScanner = () => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState(defaultTemplate);
  const [activeTab, setActiveTab] = useState('new');
  const [candidates, setCandidates] = useState([]);
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [pipelineCounts, setPipelineCounts] = useState({});
  // v3.3 Addendum — UI filters
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | source_key
  const [freshnessFilter, setFreshnessFilter] = useState('all'); // 'all' | 'hot' | 'pipeline'

  // v3.3 pipeline states drive the counter tabs. Legacy `status` field is
  // mirrored to pipeline_state so old records (status: 'pending') surface
  // under the 'new' tab during the demo transition.
  const filtered = useMemo(
    () => candidates
      .filter((candidate) => {
        const state = candidate.pipeline_state || (
          candidate.status === 'pending' ? 'new'
            : candidate.status === 'accepted' ? 'won'
            : candidate.status === 'rejected' ? 'dismissed'
            : 'new'
        );
        if (state !== activeTab) return false;
        if (sourceFilter !== 'all' && candidate.source_key !== sourceFilter) return false;
        // Freshness filter: cards without freshness_bucket (legacy/pre-addendum)
        // show in BOTH hot and pipeline views so old data isn't hidden.
        if (freshnessFilter !== 'all') {
          const bucket = candidate.freshness_bucket;
          if (bucket && bucket !== freshnessFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Real-brand cards first (partner_name populated)
        const aNoBrand = !(a.partner_name || a.brand_name);
        const bNoBrand = !(b.partner_name || b.brand_name);
        if (aNoBrand !== bNoBrand) return aNoBrand ? 1 : -1;
        // HOT before PIPELINE
        const aHot = (a.freshness_bucket || 'pipeline') === 'hot';
        const bHot = (b.freshness_bucket || 'pipeline') === 'hot';
        if (aHot !== bHot) return aHot ? -1 : 1;
        const aSig = Number(a.signal_strength ?? a.confidence_score ?? 0);
        const bSig = Number(b.signal_strength ?? b.confidence_score ?? 0);
        if (bSig !== aSig) return bSig - aSig;
        return Number(b.brand_confidence ?? 0) - Number(a.brand_confidence ?? 0);
      }),
    [candidates, activeTab, sourceFilter, freshnessFilter]
  );

  const loadCandidates = async () => {
    try {
      const rows = await v3ListOpportunityCandidates({});
      setCandidates(Array.isArray(rows) ? rows : []);
      setDemoMode(false);
      setError('');
    } catch (e) {
      setCandidates((current) => (current.length ? current : demoOpportunityCandidates));
      setDemoMode(true);
      setError('');
    }
  };

  const loadCounts = async () => {
    try {
      const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/v3/opportunities/pipeline-counts`);
      const data = await r.json();
      setPipelineCounts(data || {});
    } catch (e) {
      // silent — counters are non-essential
    }
  };

  useEffect(() => {
    loadCandidates();
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transitionCandidate = async (candidate, toState) => {
    setBusy(true);
    try {
      const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/v3/opportunities/candidates/${candidate.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_state: toState }),
      });
      if (!r.ok) throw new Error(`Transition failed (${r.status})`);
      const updated = await r.json();
      setCandidates((current) => current.map((item) => (item.id === candidate.id ? { ...item, ...updated } : item)));
      await loadCounts();
      setActiveTab(toState);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const runScan = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = {
        query: template.query,
        template: {
          keywords: template.keywords,
          country: template.country,
          industries: splitList(template.industries),
          campaign_types: splitList(template.campaign_types),
          recency: template.recency,
          result_limit: Number(template.result_limit) || 10,
          // v3.3 Addendum — multi-source fan-out
          enabled_sources: template.enabled_sources,
          hot_ratio: Number(template.hot_ratio) || 0.6,
          per_source_limit: Number(template.per_source_limit) || 10,
        },
        created_by: 'admin',
      };
      const result = await v3RunOpportunityScan(payload);
      // eslint-disable-next-line no-console
      console.log('[SerpAPI Scan] response from /api/v3/opportunities/scans →', result);
      setScan(result.scan);
      setCandidates((current) => {
        const next = Array.isArray(result.candidates) ? result.candidates : [];
        const byId = new Map(current.map((item) => [item.id, item]));
        next.forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values());
      });
      setActiveTab('new');
      setDemoMode(false);
      await loadCounts();
    } catch (e) {
      const message = e.response?.data?.detail || e.message;
      if (isMissingKeyError(e)) {
        setError(message);
      } else {
        setCandidates(demoOpportunityCandidates);
        setDemoMode(true);
        setError('Backend unavailable. Showing demo scanner candidates for presentation.');
      }
    } finally {
      setBusy(false);
    }
  };

  const acceptCandidate = async (candidate) => {
    setBusy(true);
    setError('');
    try {
      const result = await v3AcceptOpportunityCandidate(candidate.id, { reviewed_by: 'admin' });
      setCandidates((current) => current.map((item) => (
        item.id === candidate.id ? { ...item, ...result.candidate, status: 'accepted', pipeline_state: 'won', business_case_id: result.business_case_id } : item
      )));
      await loadCounts();
      if (result.business_case_id) {
        navigate(`/v3/admin/business-cases/${result.business_case_id}`);
      } else {
        setActiveTab('won');
      }
    } catch (e) {
      if (demoMode) {
        setCandidates((current) => current.map((item) => (
          item.id === candidate.id
            ? { ...item, status: 'accepted', accepted_brand_id: item.accepted_brand_id || `brand-${item.id}`, reviewed_at: new Date().toISOString(), reviewed_by: 'admin' }
            : item
        )));
        setActiveTab('accepted');
      } else {
        setError(e.response?.data?.detail || e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const rejectCandidate = async (candidate) => {
    setBusy(true);
    setError('');
    try {
      const result = await v3RejectOpportunityCandidate(candidate.id, { reviewed_by: 'admin' });
      setCandidates((current) => current.map((item) => (
        item.id === candidate.id ? { ...item, ...result, status: 'rejected', pipeline_state: 'dismissed' } : item
      )));
      await loadCounts();
    } catch (e) {
      if (demoMode) {
        setCandidates((current) => current.map((item) => (
          item.id === candidate.id
            ? { ...item, status: 'rejected', pipeline_state: 'dismissed', reviewed_at: new Date().toISOString(), reviewed_by: 'admin' }
            : item
        )));
      } else {
        setError(e.response?.data?.detail || e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-full overflow-x-hidden space-y-5" data-testid="v3-admin-opportunity-scanner">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <button onClick={() => navigate('/v3/admin/crm')} className="v3-btn-secondary text-[11px] mb-4" data-testid="opps-back-crm">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CRM
          </button>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CRM intelligence</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Brand Opportunity Scanner</h1>
          <p className="text-[#8A8A8A] text-sm mt-1">
            Finds brands with celebrity, endorsement, ambassador, and influencer partnership signals.
          </p>
        </div>
        <button onClick={runScan} disabled={busy} className="v3-btn-primary self-start xl:self-auto shrink-0" data-testid="opps-run-scan">
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy
            ? `Fanning out ${(template.enabled_sources || []).length * 4} parallel calls…`
            : `Run web scan (${(template.enabled_sources || []).length * 4} calls)`}
        </button>
      </div>

      {error && (
        <div className="v3-card p-4 mb-5 border-[#F5D9D2]" data-testid="opps-error">
          <p className="text-[13px] text-[#B54A37]">{error}</p>
          {error.includes('SERPAPI_API_KEY') && (
            <p className="text-[12px] text-[#6E6657] mt-1">
              Add `SERPAPI_API_KEY` to backend deployment secrets, then rerun the scan.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <div className="v3-card p-5 min-w-0 overflow-hidden" data-testid="opps-query-template">
            <div className="flex items-center gap-2 mb-4 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#DDE7E2] inline-flex items-center justify-center shrink-0">
                <Settings2 className="w-4 h-4 text-[#1F4A3A]" />
              </span>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A] truncate">Editable query template</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Direct query override</label>
                <textarea
                  value={template.query}
                  onChange={(e) => setTemplate({ ...template, query: e.target.value })}
                  rows={3}
                  placeholder="Optional custom query..."
                  className="w-full min-w-0 px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
                  data-testid="opps-query"
                />
              </div>
              {[
                ['keywords', 'Keywords'],
                ['country', 'Country'],
                ['industries', 'Industries'],
                ['campaign_types', 'Partnership signals'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">{label}</label>
                  <input
                    value={template[key]}
                    onChange={(e) => setTemplate({ ...template, [key]: e.target.value })}
                    className="w-full min-w-0 px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
                    data-testid={`opps-template-${key}`}
                  />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Per-source limit</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={template.per_source_limit}
                    onChange={(e) => setTemplate({ ...template, per_source_limit: e.target.value })}
                    className="w-full min-w-0 px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
                    data-testid="opps-template-per-source-limit"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
                    HOT mix: {Math.round((Number(template.hot_ratio) || 0.6) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={Math.round((Number(template.hot_ratio) || 0.6) * 100)}
                    onChange={(e) => setTemplate({ ...template, hot_ratio: Number(e.target.value) / 100 })}
                    className="w-full"
                    data-testid="opps-template-hot-ratio"
                  />
                </div>
              </div>

              {/* v3.3 Addendum — Source toggles */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-2">Sources to scan</label>
                <div className="flex flex-wrap gap-2" data-testid="opps-template-sources">
                  {ALL_SOURCES.map((source) => {
                    const enabled = (template.enabled_sources || []).includes(source.key);
                    return (
                      <button
                        key={source.key}
                        type="button"
                        onClick={() => {
                          const current = new Set(template.enabled_sources || []);
                          if (enabled) current.delete(source.key); else current.add(source.key);
                          setTemplate({ ...template, enabled_sources: Array.from(current) });
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                          enabled
                            ? 'border-[#1F4A3A] bg-[#DDE7E2] text-[#1F4A3A]'
                            : 'border-[#E8E4DB] bg-white text-[#6E6657] hover:border-[#C49B5F]'
                        }`}
                        data-testid={`opps-source-${source.key}`}
                      >
                        {source.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#8A8A8A] mt-2">
                  Fan-out: {(template.enabled_sources || []).length * 4} parallel SerpAPI calls per scan
                </p>
              </div>
            </div>
          </div>

          <div className="v3-card p-5 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-[#F2EAD8] inline-flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-[#7A5F23]" />
              </span>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Example searches</h3>
            </div>
            <div className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setTemplate({ ...template, query: example })}
                  className="w-full text-left px-3 py-2 rounded border border-[#E8E4DB] bg-[#FAFAF7] text-[12px] text-[#6E6657] hover:border-[#C49B5F] break-words"
                  data-testid={`opps-example-${example.slice(0, 12).replace(/\s/g, '-').toLowerCase()}`}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {scan && (
            <div className="v3-card p-4 min-w-0 overflow-hidden" data-testid="opps-scan-summary">
              <div data-testid="opps-last-scan-summary">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Last scan</p>
              <p className="text-[12px] text-[#1A1A1A] break-words">{scan.query}</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-[#6E6657]" data-testid="opps-scan-stats">
                <span>Fan-out: <b className="text-[#1A1A1A]">{scan.fan_out ?? '—'}</b> calls</span>
                <span>Raw: <b className="text-[#1A1A1A]">{scan.raw_count}</b></span>
                <span>Hot/Pipe: <b className="text-[#1A1A1A]">{scan.hot_count ?? 0}/{scan.pipeline_count ?? 0}</b></span>
                <span>Pass-1 reject: <b className="text-[#1A1A1A]">{scan.pass1_rejected ?? 0}</b></span>
                <span>Auto-dismiss: <b className="text-[#1A1A1A]">{scan.auto_dismissed ?? 0}</b></span>
                <span>Candidates: <b className="text-[#1F4A3A]">{scan.candidate_count}</b></span>
              </div>
              {scan.cost_estimate && (
                <div className="mt-2 pt-2 border-t border-[#E8E4DB] text-[10px] text-[#8A8A8A]" data-testid="opps-cost-telemetry">
                  Est. cost: <b className="text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${scan.cost_estimate.total_usd?.toFixed(3)}</b>
                  {' '}({scan.cost_estimate.serpapi_calls} SerpAPI · {scan.cost_estimate.llm_calls} LLM)
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {/* v3.3 — Counters bar (replaces 3-tab Pending/Accepted/Archive) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4" data-testid="opps-counters">
            {[
              { key: 'new', label: 'New', testid: 'opps-tab-new' },
              { key: 'reviewing', label: 'Reviewing', testid: 'opps-tab-reviewing' },
              { key: 'outreach_sent', label: 'Outreach Sent', testid: 'opps-tab-outreach' },
              { key: 'meeting_booked', label: 'Meetings Booked', testid: 'opps-tab-meeting' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              const count = pipelineCounts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`v3-card p-3 text-left transition-colors ${isActive ? 'border-[#1F4A3A] bg-[#DDE7E2]' : 'hover:border-[#D4CDBF]'}`}
                  data-testid={tab.testid}
                >
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{tab.label}</p>
                  <p className="text-xl font-semibold text-[#1A1A1A] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{count}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A] mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#E8E4DB]">
              <ListFilter className="w-3.5 h-3.5" /> {activeTab.replace('_', ' ')}
            </span>
            <span>{filtered.length} card{filtered.length === 1 ? '' : 's'}</span>
            <button
              onClick={() => setActiveTab(activeTab === 'won' ? 'new' : 'won')}
              className="ml-auto text-[10px] uppercase tracking-wider text-[#6E6657] hover:text-[#1F4A3A]"
              data-testid="opps-tab-won"
            >
              {activeTab === 'won' ? '← Back to live queue' : 'View accepted (won) →'}
            </button>
          </div>

          {/* v3.3 Addendum — Source + Freshness filter chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3" data-testid="opps-filter-chips">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Source:</span>
            {[{ key: 'all', label: 'All' }, ...ALL_SOURCES].map((source) => (
              <button
                key={source.key}
                onClick={() => setSourceFilter(source.key)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  sourceFilter === source.key
                    ? 'border-[#1F4A3A] bg-[#DDE7E2] text-[#1F4A3A]'
                    : 'border-[#E8E4DB] bg-white text-[#6E6657] hover:border-[#C49B5F]'
                }`}
                data-testid={`opps-filter-source-${source.key}`}
              >
                {source.label}
              </button>
            ))}
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] ml-2">Freshness:</span>
            {[
              { key: 'all', label: 'All' },
              { key: 'hot', label: 'Hot' },
              { key: 'pipeline', label: 'Pipeline' },
            ].map((bucket) => (
              <button
                key={bucket.key}
                onClick={() => setFreshnessFilter(bucket.key)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  freshnessFilter === bucket.key
                    ? 'border-[#7A5F23] bg-[#FDF7E3] text-[#7A5F23]'
                    : 'border-[#E8E4DB] bg-white text-[#6E6657] hover:border-[#C49B5F]'
                }`}
                data-testid={`opps-filter-freshness-${bucket.key}`}
              >
                {bucket.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="v3-card p-10 text-center" data-testid="opps-empty">
              <Search className="w-7 h-7 mx-auto mb-3 text-[#C49B5F]" />
              <p className="text-[14px] text-[#1A1A1A]">No {activeTab.replace('_', ' ')} cards</p>
              <p className="text-[12px] text-[#8A8A8A] mt-1">Run a scan or switch tabs to review other states.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((candidate) => (
                <V33Card
                  key={candidate.id}
                  candidate={candidate}
                  busy={busy}
                  activeTab={activeTab}
                  onAccept={() => acceptCandidate(candidate)}
                  onReject={() => rejectCandidate(candidate)}
                  onTransition={(toState) => transitionCandidate(candidate, toState)}
                  onOpenBC={() => candidate.business_case_id && navigate(`/v3/admin/business-cases/${candidate.business_case_id}`)}
                  onOpenBrand={() => candidate.accepted_brand_id && navigate(`/v3/admin/crm/${candidate.accepted_brand_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// v3.3 Card — TASCK CRM-aligned, empty fields hidden, two-score badge
// ============================================================================
const SIGNAL_PILL = {
  creator_signing: { label: 'Creator signing', bg: '#EFE3F5', fg: '#6B3E92' },
  campaign_launch: { label: 'Campaign launch', bg: '#DDE7E2', fg: '#1F4A3A' },
  rfp_open: { label: 'RFP open', bg: '#FDF7E3', fg: '#7A5F23' },
  spend_signal: { label: 'Spend signal', bg: '#DCE3F5', fg: '#1F2BEE' },
  unknown: { label: 'Signal', bg: '#F4F2EC', fg: '#6E6657' },
};

const FRESHNESS_PILL = {
  hot: { label: 'HOT', bg: '#FBE6DE', fg: '#B54A37' },        // past month — burnt orange
  pipeline: { label: 'PIPELINE', bg: '#E6EEF3', fg: '#1F4A6E' }, // past 6 months — steel blue
};

const SOURCE_LABEL = {
  google_web: 'Google',
  google_news: 'News',
  linkedin: 'LinkedIn',
  trade_press: 'Trade',
};

const LIKELIHOOD_BG = {
  Likely: { bg: '#DDE7E2', fg: '#1F4A3A' },
  Confirmed: { bg: '#FDF7E3', fg: '#7A5F23' },
  Unclear: { bg: '#F4F2EC', fg: '#6E6657' },
  Unlikely: { bg: '#F5D9D2', fg: '#B54A37' },
};

const V33Card = ({ candidate, busy, activeTab, onAccept, onReject, onTransition, onOpenBC, onOpenBrand }) => {
  const [showDraft, setShowDraft] = React.useState(false);

  const partnerName = candidate.partner_name || candidate.brand_name || 'Unknown brand';
  const signalType = candidate.signal_type || 'unknown';
  const pill = SIGNAL_PILL[signalType] || SIGNAL_PILL.unknown;
  const brandConf = candidate.brand_confidence ?? candidate.confidence_score ?? 0;
  const signalStr = candidate.signal_strength ?? candidate.confidence_score ?? 0;

  // Build the "Brand Context" rows — omit any null/empty value
  const brandContextRows = [
    ['Key Marketing Focus', candidate.key_marketing_focus],
    ['Primary Target Audience', candidate.primary_target_audience],
    ['Key Marketing Channels', candidate.key_marketing_channels],
    ['Marketing KPIs', candidate.marketing_kpis],
  ].filter(([, v]) => v && String(v).trim());

  // Contact line — appears only if at least one contact field is populated
  const contactParts = [
    candidate.primary_contact_name,
    candidate.primary_contact_role,
    candidate.primary_contact_email,
    candidate.primary_contact_phone,
    candidate.primary_contact_linkedin,
  ].filter((v) => v && String(v).trim());

  const likelihood = candidate.likelihood_to_work_with_tta;
  const likelihoodStyle = likelihood && LIKELIHOOD_BG[likelihood];

  return (
    <div className="v3-card p-4 lg:p-5 min-w-0 overflow-hidden" data-testid={`opps-candidate-${candidate.id}`}>
      {/* Top row: signal pill + freshness + two-score badge + source */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider" style={{ background: pill.bg, color: pill.fg }} data-testid={`opps-signal-pill-${candidate.id}`}>
            {pill.label}
          </span>
          {candidate.freshness_bucket && FRESHNESS_PILL[candidate.freshness_bucket] && (
            <span
              className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold"
              style={{
                background: FRESHNESS_PILL[candidate.freshness_bucket].bg,
                color: FRESHNESS_PILL[candidate.freshness_bucket].fg,
              }}
              title={candidate.freshness_bucket === 'hot' ? 'Past month' : 'Past 6 months'}
              data-testid={`opps-freshness-${candidate.id}`}
            >
              {FRESHNESS_PILL[candidate.freshness_bucket].label}
            </span>
          )}
          {candidate.source_key && SOURCE_LABEL[candidate.source_key] && (
            <span
              className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border border-[#E8E4DB] bg-white text-[#6E6657]"
              data-testid={`opps-source-key-${candidate.id}`}
            >
              {SOURCE_LABEL[candidate.source_key]}
            </span>
          )}
          <span
            className="text-[10px] px-2 py-0.5 rounded font-semibold"
            style={{ fontFamily: "'JetBrains Mono', monospace", background: '#F4F2EC', color: '#1A1A1A' }}
            title={`Brand certainty ${brandConf} · Signal actionability ${signalStr}`}
            data-testid={`opps-score-${candidate.id}`}
          >
            {brandConf} / {signalStr}
          </span>
          {likelihood && likelihoodStyle && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: likelihoodStyle.bg, color: likelihoodStyle.fg }}>
              Likelihood: {likelihood}
            </span>
          )}
        </div>
        <a
          href={candidate.source_url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-[#6E6657] hover:text-[#1F4A3A] inline-flex items-center gap-1 max-w-[40%] truncate"
          data-testid={`opps-source-${candidate.id}`}
        >
          {candidate.source_domain || 'source'} · {candidate.source_date || '↗'}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </div>

      {/* Title + campaign */}
      <h3 className="text-[16px] font-semibold text-[#1A1A1A] mb-1 break-words" style={{ fontFamily: "'Fraunces', serif" }}>{partnerName}</h3>
      {candidate.industry && (
        <p className="text-[11px] text-[#8A8A8A] mb-3">{candidate.industry}{candidate.country ? ` · ${candidate.country}` : ''}</p>
      )}

      {/* The Signal */}
      {candidate.signal_summary && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">The Signal</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{candidate.signal_summary}</p>
        </div>
      )}

      {/* Brand Context — only render if at least one row has data */}
      {brandContextRows.length > 0 && (
        <div className="mb-4 border-t border-[#E8E4DB] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Brand Context</p>
          <div className="space-y-2">
            {brandContextRows.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</p>
                <p className="text-[13px] text-[#1A1A1A]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact — only if any contact field is set */}
      {contactParts.length > 0 && (
        <div className="mb-4 border-t border-[#E8E4DB] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Contact (if found)</p>
          <p className="text-[13px] text-[#1A1A1A]">{contactParts.join(' · ')}</p>
        </div>
      )}

      {/* Why this matters */}
      {candidate.why_this_matters && (
        <div className="mb-4 border-t border-[#E8E4DB] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Why This Matters for TTA</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{candidate.why_this_matters}</p>
        </div>
      )}

      {/* Outreach angle + draft */}
      {(candidate.outreach_angle || candidate.outreach_draft) && (
        <div className="mb-4 border-t border-[#E8E4DB] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Outreach</p>
          {candidate.outreach_angle && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mt-2">Suggested angle</p>
              <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{candidate.outreach_angle}</p>
            </>
          )}
          {candidate.outreach_draft && (
            <>
              <button
                onClick={() => setShowDraft(!showDraft)}
                className="mt-3 text-[11px] text-[#1F4A3A] hover:underline inline-flex items-center gap-1"
                data-testid={`opps-toggle-draft-${candidate.id}`}
              >
                <Mail className="w-3.5 h-3.5" /> {showDraft ? 'Hide draft email' : 'View draft email'}
              </button>
              {showDraft && (
                <div className="mt-2 p-3 bg-[#FAF9F5] rounded text-[12px] text-[#1A1A1A] whitespace-pre-wrap leading-relaxed border border-[#E8E4DB]" data-testid={`opps-draft-${candidate.id}`}>
                  {candidate.outreach_draft}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E8E4DB]">
        {activeTab === 'new' && (
          <>
            <button onClick={() => onTransition('reviewing')} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`opps-mark-reviewing-${candidate.id}`}>
              Reviewing
            </button>
            <button onClick={onAccept} disabled={busy} className="v3-btn-primary text-[11px]" data-testid={`opps-accept-${candidate.id}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Accept to CRM →
            </button>
            <button onClick={onReject} disabled={busy} className="v3-btn-secondary text-[11px] ml-auto" data-testid={`opps-reject-${candidate.id}`}>
              <XCircle className="w-3.5 h-3.5" /> Dismiss
            </button>
          </>
        )}
        {activeTab === 'reviewing' && (
          <>
            <button onClick={() => onTransition('outreach_sent')} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`opps-mark-outreach-${candidate.id}`}>
              Outreach sent
            </button>
            <button onClick={onAccept} disabled={busy} className="v3-btn-primary text-[11px]" data-testid={`opps-accept-${candidate.id}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Accept to CRM →
            </button>
            <button onClick={onReject} disabled={busy} className="v3-btn-secondary text-[11px] ml-auto" data-testid={`opps-reject-${candidate.id}`}>
              Dismiss
            </button>
          </>
        )}
        {activeTab === 'outreach_sent' && (
          <>
            <button onClick={() => onTransition('meeting_booked')} disabled={busy} className="v3-btn-primary text-[11px]" data-testid={`opps-mark-meeting-${candidate.id}`}>
              Meeting booked
            </button>
            <button onClick={onAccept} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`opps-accept-${candidate.id}`}>
              Accept to CRM →
            </button>
          </>
        )}
        {activeTab === 'meeting_booked' && (
          <button onClick={onAccept} disabled={busy} className="v3-btn-primary text-[11px]" data-testid={`opps-accept-${candidate.id}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Accept to CRM →
          </button>
        )}
        {activeTab === 'won' && (
          <>
            <button onClick={onOpenBC} disabled={!candidate.business_case_id} className="v3-btn-primary text-[11px]" data-testid={`opps-open-business-case-${candidate.id}`}>
              Open Business Case →
            </button>
            <button onClick={onOpenBrand} disabled={!candidate.accepted_brand_id} className="v3-btn-secondary text-[11px]">
              Open CRM brand
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default V3AdminOpportunityScanner;

