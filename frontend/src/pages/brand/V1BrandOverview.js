import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, FileSignature, FileText, MessageSquare, RotateCcw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandIdentityCard, ErrorState, LoadingState, ProjectStageRail, brandName, bundleCase, documentGroupsFromBundles, projectProgress, projectSummary, projectValue, stageLabel, useV1BrandPortalData } from './V1BrandPortalData';
import { v3ListBrandNotifications } from '../../lib/v3api';

const Metric = ({ label, value, icon: Icon }) => <div className="v3-card p-4"><div className="flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{label}</p><Icon className="w-4 h-4 text-[#1F4A3A]" /></div><p className="text-2xl font-semibold text-[#1F1B18] mt-3">{value}</p></div>;

// Brand-side Needs Attention card. Mirrors the admin one but with brand-
// facing copy: "TASCK approved your Alignment Snapshot", "Strategy Snapshot
// ready for your review", "Contract ready to sign". Collapsible; the state
// persists across reloads via localStorage.
const BRAND_NA_COLLAPSED_KEY = 'tasck_v1_brand_needs_attention_collapsed';
const BRAND_NA_SEEN_KEY = 'tasck_v1_brand_seen_notifications';
const BRAND_NOTIF_POLL_MS = 30000;

const formatBrandWhen = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const BRAND_KIND_ICON = {
  alignment_approved: CheckCircle2,
  strategy_ready: FileText,
  contract_ready: FileSignature,
  admin_message: MessageSquare,
};

const loadSeen = () => {
  if (typeof window === 'undefined') return new Set();
  try { const raw = window.localStorage.getItem(BRAND_NA_SEEN_KEY); return new Set(raw ? JSON.parse(raw) : []); } catch (_) { return new Set(); }
};
const saveSeen = (set) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(BRAND_NA_SEEN_KEY, JSON.stringify(Array.from(set).slice(-500))); } catch (_) {}
};

const BrandNeedsAttentionCard = ({ brandId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState(loadSeen);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(BRAND_NA_COLLAPSED_KEY) === '1'; } catch (_) { return false; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(BRAND_NA_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (_) {}
  }, [collapsed]);

  const refresh = React.useCallback(() => {
    if (!brandId) return Promise.resolve();
    return v3ListBrandNotifications(brandId)
      .then((rows) => { setItems(Array.isArray(rows) ? rows : []); setLoading(false); })
      .catch(() => { setItems([]); setLoading(false); });
  }, [brandId]);

  useEffect(() => {
    refresh();
    const handle = setInterval(refresh, BRAND_NOTIF_POLL_MS);
    return () => clearInterval(handle);
  }, [refresh]);

  const markSeen = (id) => {
    const next = new Set(seen); next.add(id); setSeen(next); saveSeen(next);
  };
  const markAllSeen = () => {
    const next = new Set(seen); for (const i of items) next.add(i.id); setSeen(next); saveSeen(next);
  };
  const unseen = items.filter((i) => !seen.has(i.id));
  const visible = items.slice(0, 8);

  if (!brandId) return null;
  if (!loading && items.length === 0) return null;

  return (
    <div className="v3-card p-5" data-testid="v1-brand-needs-attention">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
          aria-expanded={!collapsed}
          data-testid="v1-brand-needs-attention-toggle"
        >
          <ChevronDown className={`w-4 h-4 text-[#6E6657] flex-shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} strokeWidth={2.5} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-0.5">Needs attention</p>
            <h2 className="text-[18px] font-semibold text-[#1F1B18] truncate" style={{ fontFamily: "'Fraunces', serif" }}>
              Updates from TASCK
              {unseen.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center text-[11px] font-semibold text-white bg-[#B54A37] rounded-full px-2 py-0.5">{unseen.length} new</span>
              )}
            </h2>
          </div>
        </button>
        {!collapsed && (
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button type="button" onClick={refresh} className="v3-btn-secondary text-[11px]"><RotateCcw className="w-3.5 h-3.5" /> Refresh</button>
            {unseen.length > 0 && (
              <button type="button" onClick={markAllSeen} className="v3-btn-secondary text-[11px]">Mark all seen</button>
            )}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="mt-3">
          {loading ? (
            <p className="text-[12px] text-[#8A8A8A]">Loading updates…</p>
          ) : (
            <ul className="divide-y divide-[#E8E4DB]">
              {visible.map((item) => {
                const Icon = BRAND_KIND_ICON[item.kind] || CheckCircle2;
                const isUnseen = !seen.has(item.id);
                return (
                  <li
                    key={item.id}
                    onClick={() => { markSeen(item.id); if (item.link) navigate(item.link); }}
                    className={`flex items-start gap-3 py-2.5 cursor-pointer hover:bg-[#FBFAF7] -mx-2 px-2 rounded ${isUnseen ? 'bg-[#FBF4E4]/60' : ''}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 ${isUnseen ? 'bg-[#1F4A3A] text-white' : 'bg-[#E8F3ED] text-[#1F4A3A]'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1F1B18] truncate"><strong>{item.title}</strong></p>
                      <p className="text-[11px] text-[#6B6258] truncate">{item.message}</p>
                      <p className="text-[10px] text-[#8A8A8A] mt-0.5">{formatBrandWhen(item.when)}</p>
                    </div>
                    {isUnseen && <span className="text-[10px] uppercase tracking-wider text-[#B54A37] font-semibold flex-shrink-0">New</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const V1BrandOverview = () => {
  const navigate = useNavigate();
  const { loading, error, brand, session, bundles } = useV1BrandPortalData();
  const groups = useMemo(() => documentGroupsFromBundles(bundles), [bundles]);
  const activeBundles = bundles.filter((bundle) => bundleCase(bundle).stage !== 'closed');
  const currentBundle = bundles[0];
  const currentCase = bundleCase(currentBundle);
  const docs = [...groups.alignment, ...groups.strategy, ...groups.contracts, ...groups.reports];
  const pendingDocs = docs.filter((doc) => /review|sent|pending/i.test(doc.snapshot?.status || ''));
  const approvedDocs = docs.filter((doc) => /approve|signed|complete/i.test(doc.snapshot?.status || ''));
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return <div className="space-y-5" data-testid="v1-brand-overview">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Brand Portal</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>{brandName(brand)} project workspace</h1><p className="text-[13px] text-[#6B6258] mt-2 max-w-3xl">Track the live work between your brand and TASCK, review documents sent for approval, and send comments directly back to admin.</p></div><button onClick={() => navigate('/brand/projects')} className="v3-btn-primary w-fit"><BriefcaseBusiness className="w-4 h-4" /> View projects</button></div>
    <BrandNeedsAttentionCard brandId={brand?.id || session?.brandId || session?.brand_id} />
    <BrandIdentityCard brand={brand} session={session} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"><Metric label="Active projects" value={activeBundles.length} icon={BriefcaseBusiness} /><Metric label="Pending review" value={pendingDocs.length} icon={Clock3} /><Metric label="Approved documents" value={approvedDocs.length} icon={CheckCircle2} /><Metric label="Pipeline value" value={currentCase.id ? projectValue(currentCase) : 'Value pending'} icon={ShieldCheck} /></div>
    {currentCase.id ? <div className="v3-card p-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Current project progress</p><h2 className="text-xl font-semibold text-[#1F1B18] mt-1">{currentCase.title || 'Untitled project'}</h2><p className="text-[13px] text-[#5C5C5C] mt-2 leading-6 max-w-3xl">{projectSummary(currentBundle)}</p></div><div className="rounded-xl bg-[#F7EFE1] border border-[#E6D6B6] px-4 py-3 min-w-[180px]"><p className="text-[11px] uppercase tracking-wide text-[#7A5F23]">Current stage</p><p className="text-lg font-semibold text-[#1F1B18]">{stageLabel(currentCase.stage)}</p><p className="text-[12px] text-[#7A5F23]">{projectProgress(currentCase.stage)}% through the TASCK flow</p></div></div><div className="mt-5"><ProjectStageRail stage={currentCase.stage} /></div><button onClick={() => navigate('/brand/projects/' + currentCase.id)} className="v3-btn-secondary mt-5"><ArrowRight className="w-4 h-4" /> Open project</button></div> : <div className="v3-card p-6 text-[13px] text-[#6B6258]">No active project is connected to this brand account yet.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><button onClick={() => navigate('/brand/alignment-snapshot')} className="v3-card p-4 text-left hover:border-[#1F4A3A]"><ShieldCheck className="w-4 h-4 text-[#1F4A3A] mb-3" /><p className="font-semibold">Alignment Snapshot</p><p className="text-[12px] text-[#6B6258] mt-1">Review alignment details and send comments to TASCK.</p></button><button onClick={() => navigate('/brand/reports-feedback')} className="v3-card p-4 text-left hover:border-[#1F4A3A]"><MessageSquare className="w-4 h-4 text-[#1F4A3A] mb-3" /><p className="font-semibold">Reports & Feedback</p><p className="text-[12px] text-[#6B6258] mt-1">Send report feedback back to admin.</p></button></div>
  </div>;
};
export default V1BrandOverview;
