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
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  XCircle,
} from 'lucide-react';

const defaultTemplate = {
  query: '',
  keywords: 'brand ambassador program celebrity partnership endorsement deal influencer campaign Nigeria',
  country: 'Nigeria',
  industries: 'Fashion, Food & Beverage, Tech, Beauty, Sports, FMCG, Telco, Fintech',
  campaign_types: 'brand ambassador program, celebrity partnership, celebrity endorsement deal, brand partnership opportunity, influencer campaign open application',
  recency: 'past_year',
  result_limit: 10,
};

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

const V3AdminOpportunityScanner = () => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState(defaultTemplate);
  const [activeTab, setActiveTab] = useState('pending');
  const [candidates, setCandidates] = useState([]);
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const filtered = useMemo(
    () => candidates.filter((candidate) => candidate.status === activeTab),
    [candidates, activeTab]
  );

  const loadCandidates = async (status = activeTab) => {
    try {
      const rows = await v3ListOpportunityCandidates({ status });
      setCandidates((current) => {
        const others = current.filter((item) => item.status !== status);
        return [...others, ...(Array.isArray(rows) ? rows : [])];
      });
      setDemoMode(false);
      setError('');
    } catch (e) {
      setCandidates((current) => (current.length ? current : demoOpportunityCandidates));
      setDemoMode(true);
      setError('');
    }
  };

  useEffect(() => {
    loadCandidates(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
        },
        created_by: 'admin',
      };
      const result = await v3RunOpportunityScan(payload);
      setScan(result.scan);
      setCandidates((current) => {
        const next = Array.isArray(result.candidates) ? result.candidates : [];
        const byId = new Map(current.map((item) => [item.id, item]));
        next.forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values());
      });
      setActiveTab('pending');
      setDemoMode(false);
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
        item.id === candidate.id ? { ...item, ...result.candidate, status: 'accepted' } : item
      )));
      setActiveTab('accepted');
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
        item.id === candidate.id ? { ...item, ...result, status: 'rejected' } : item
      )));
      setActiveTab('rejected');
    } catch (e) {
      if (demoMode) {
        setCandidates((current) => current.map((item) => (
          item.id === candidate.id
            ? { ...item, status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: 'admin' }
            : item
        )));
        setActiveTab('rejected');
      } else {
        setError(e.response?.data?.detail || e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="v3-admin-opportunity-scanner">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/v3/admin/crm')} className="v3-btn-secondary text-[11px] mb-4" data-testid="opps-back-crm">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CRM
          </button>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CRM intelligence</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Brand Opportunity Scanner</h1>
          <p className="text-[#8A8A8A] text-sm mt-1">
            Finds brands with celebrity, endorsement, ambassador, and influencer partnership signals.
          </p>
        </div>
        <button onClick={runScan} disabled={busy} className="v3-btn-primary" data-testid="opps-run-scan">
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? 'Scanning...' : 'Run web scan'}
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

      <div className="grid grid-cols-[360px_1fr] gap-5">
        <div className="space-y-4">
          <div className="v3-card p-5" data-testid="opps-query-template">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4 text-[#1F4A3A]" />
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Editable query template</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Direct query override</label>
                <textarea
                  value={template.query}
                  onChange={(e) => setTemplate({ ...template, query: e.target.value })}
                  rows={3}
                  placeholder="Optional custom query..."
                  className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
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
                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
                    data-testid={`opps-template-${key}`}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Recency</label>
                  <select
                    value={template.recency}
                    onChange={(e) => setTemplate({ ...template, recency: e.target.value })}
                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
                    data-testid="opps-template-recency"
                  >
                    <option value="past_day">Past day</option>
                    <option value="past_week">Past week</option>
                    <option value="past_month">Past month</option>
                    <option value="past_year">Past year</option>
                    <option value="">Any time</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={template.result_limit}
                    onChange={(e) => setTemplate({ ...template, result_limit: e.target.value })}
                    className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white"
                    data-testid="opps-template-limit"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-3 text-[#1A1A1A]">Example searches</h3>
            <div className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setTemplate({ ...template, query: example })}
                  className="w-full text-left px-3 py-2 rounded border border-[#E8E4DB] bg-[#FAFAF7] text-[12px] text-[#6E6657] hover:border-[#C49B5F]"
                  data-testid={`opps-example-${example.slice(0, 12).replace(/\s/g, '-').toLowerCase()}`}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {scan && (
            <div className="v3-card p-4" data-testid="opps-scan-summary">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Last scan</p>
              <p className="text-[12px] text-[#1A1A1A]">{scan.query}</p>
              <p className="text-[11px] text-[#6E6657] mt-2">{scan.raw_count} raw results - {scan.candidate_count} new candidates</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="opps-tabs">
              {[
                ['pending', 'Pending'],
                ['accepted', 'Accepted'],
                ['rejected', 'Archive'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`text-[11px] px-3 py-1 rounded transition-colors ${activeTab === key ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
                  data-testid={`opps-tab-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A]">
              {demoMode && <span className="px-2 py-0.5 rounded bg-[#F2EAD8] text-[#7A5F23]">demo fallback</span>}
              <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="v3-card p-10 text-center" data-testid="opps-empty">
              <Search className="w-7 h-7 mx-auto mb-3 text-[#C49B5F]" />
              <p className="text-[14px] text-[#1A1A1A]">No {activeTab} candidates</p>
              <p className="text-[12px] text-[#8A8A8A] mt-1">Run a scan or switch tabs to review archived results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((candidate) => (
                <div key={candidate.id} className="v3-card p-5" data-testid={`opps-candidate-${candidate.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{candidate.brand_name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#6E6657]">{candidate.industry}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]">{candidate.country}</span>
                      </div>
                      <p className="text-[13px] text-[#6E6657] mt-1">{candidate.campaign_name} - {candidate.campaign_type}</p>
                      <a
                        href={candidate.brand_profile?.website || candidate.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#1F4A3A] mt-2 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> {candidate.brand_profile?.website || candidate.source_domain || 'Brand website'}
                      </a>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Confidence</p>
                      <p className="text-lg font-semibold" style={{ color: scoreColor(candidate.confidence_score), fontFamily: "'JetBrains Mono', monospace" }}>
                        {candidate.confidence_score || 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr] gap-4 my-4">
                    <div className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Partnership status</p>
                      <p className="text-[12px] text-[#1A1A1A]"><strong>Current:</strong> {valueOrManual(candidate.celebrity_partnership_status?.current_active_partnerships)}</p>
                      <p className="text-[12px] text-[#1A1A1A] mt-1"><strong>Past:</strong> {valueOrManual(candidate.celebrity_partnership_status?.past_partnerships)}</p>
                      <p className="text-[12px] text-[#1A1A1A] mt-1"><strong>Open calls:</strong> {valueOrManual(candidate.celebrity_partnership_status?.upcoming_or_open_calls)}</p>
                    </div>
                    <div className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Partnership signals</p>
                      <p className="text-[12px] text-[#1A1A1A]">{valueOrManual(candidate.partnership_signals?.influencer_or_celebrity_marketing_evidence)}</p>
                      <p className="text-[12px] text-[#6E6657] mt-1"><strong>Budget/growth:</strong> {valueOrManual(candidate.partnership_signals?.marketing_budget_or_growth_signal)}</p>
                      <p className="text-[12px] text-[#6E6657] mt-1"><strong>RFP/brief:</strong> {valueOrManual(candidate.partnership_signals?.public_rfp_or_agency_brief)}</p>
                    </div>
                    <div className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">TASCK opportunity angle</p>
                      <p className="text-[12px] text-[#1A1A1A]">{candidate.pain_point}</p>
                    </div>
                    <div className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Suggested angle</p>
                      <p className="text-[12px] text-[#1F4A3A]">{candidate.suggested_opportunity_angle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr] gap-4 mb-4">
                    <div className="p-3 rounded border border-[#E8E4DB] bg-white">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Social media presence</p>
                      <p className="text-[12px] text-[#1A1A1A]"><strong>Instagram:</strong> {valueOrManual(candidate.social_media_presence?.instagram)}</p>
                      <p className="text-[12px] text-[#1A1A1A] mt-1"><strong>TikTok:</strong> {valueOrManual(candidate.social_media_presence?.tiktok)}</p>
                      <p className="text-[12px] text-[#1A1A1A] mt-1"><strong>X / YouTube / LinkedIn:</strong> {[
                        valueOrManual(candidate.social_media_presence?.x_twitter),
                        valueOrManual(candidate.social_media_presence?.youtube),
                        valueOrManual(candidate.social_media_presence?.linkedin),
                      ].join(' | ')}</p>
                      <p className="text-[12px] text-[#6E6657] mt-1"><strong>Style:</strong> {valueOrManual(candidate.social_media_presence?.content_style)}</p>
                    </div>
                    <div className="p-3 rounded border border-[#E8E4DB] bg-white">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Contact & outreach</p>
                      <p className="text-[12px] text-[#1A1A1A]"><strong>Email:</strong> {valueOrManual(candidate.contact_outreach?.marketing_or_partnerships_email || candidate.contact_email)}</p>
                      <p className="text-[12px] text-[#1A1A1A] mt-1"><strong>PR / talent agency:</strong> {valueOrManual(candidate.contact_outreach?.pr_or_talent_agency)}</p>
                      <p className="text-[12px] text-[#1A1A1A] mt-1"><strong>Decision-maker LinkedIn:</strong> {valueOrManual(candidate.contact_outreach?.cmo_head_partnerships_or_brand_manager_linkedin)}</p>
                      <p className="text-[12px] text-[#6E6657] mt-1"><strong>Press contact:</strong> {valueOrManual(candidate.contact_outreach?.press_or_media_inquiry_contact)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={candidate.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#6E6657] hover:text-[#1F4A3A]"
                      data-testid={`opps-source-${candidate.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> {candidate.source_title || candidate.source_url}
                    </a>
                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => rejectCandidate(candidate)} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`opps-reject-${candidate.id}`}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button onClick={() => acceptCandidate(candidate)} disabled={busy} className="v3-btn-primary text-[11px]" data-testid={`opps-accept-${candidate.id}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept to CRM
                          </button>
                        </>
                      )}
                      {activeTab === 'accepted' && (
                        <button
                          onClick={() => candidate.accepted_brand_id && navigate(`/v3/admin/crm/${candidate.accepted_brand_id}`)}
                          disabled={!candidate.accepted_brand_id}
                          className="v3-btn-primary text-[11px]"
                          data-testid={`opps-open-brand-${candidate.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Open CRM brand
                        </button>
                      )}
                      {activeTab === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#8A8A8A]">
                          <Archive className="w-3.5 h-3.5" /> Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3AdminOpportunityScanner;
