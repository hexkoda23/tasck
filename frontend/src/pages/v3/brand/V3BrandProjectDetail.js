import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3ApproveAlignmentAs, v3ApproveSnapshot, v3GetBusinessCase } from '../../../lib/v3api';
import { buildMockBusinessCaseBundle, formatNairaV3 } from '../../../lib/v3data';
import { getStoredDemoBundle, saveStoredDemoBundle } from '../../../lib/v3demoStore';
import { getBrandPortalSession, loadBrandPortalBundle } from '../../../lib/v3brandPortal';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import { ChevronLeft, CheckCircle, Circle, Clock, FileText, Send, ShieldCheck } from 'lucide-react';

const tabs = [
  { key: 'summary', label: 'Summary' },
  { key: 'documents', label: 'Documents' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'invoices', label: 'Invoices' },
];

const FLOW = [
  { key: 'connect', label: 'Connector' },
  { key: 'frame', label: 'Frame' },
  { key: 'plan', label: 'Plan' },
  { key: 'deliver', label: 'Delivery' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'closed', label: 'Closed' },
];

const stageIndex = { connect: 0, frame: 1, plan: 2, deliver: 3, closure: 4, closed: 5 };

const phaseState = (bundle, key, index) => {
  const current = stageIndex[bundle.business_case.stage] ?? 0;
  if (key === 'reporting' && bundle.final_report) return current >= 5 ? 'done' : 'current';
  if (key === 'closed') return current >= 5 ? 'current' : 'pending';
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'pending';
};

const normalizeStrategyDeliverables = (deliverables = []) =>
  deliverables.map((item, index) => (typeof item === 'string' ? { num: index + 1, title: item, format: 'Deliverable', duration: '' } : item));

const normalizeStrategyBudget = (budget) =>
  Array.isArray(budget)
    ? budget
    : Object.entries(budget?.allocation || {}).map(([line, amount]) => ({ line: line.replace(/_/g, ' '), amount }));

const normalizeStrategyMetrics = (metrics = []) =>
  metrics.map((item) => (typeof item === 'string' ? { kpi: item.split(':')[0], target: item.split(':').slice(1).join(':').trim() } : item));

const docsFromBundle = (bundle) => {
  const docs = [];
  if (bundle.alignment_snapshot) {
    docs.push({
      kind: 'alignment',
      label: 'Alignment Snapshot',
      snapshot: bundle.alignment_snapshot,
      sections: Array.isArray(bundle.alignment_snapshot.sections) ? bundle.alignment_snapshot.sections : [],
    });
  }
  if (bundle.creative_snapshot) {
    const strategy = bundle.creative_snapshot;
    docs.push({
      kind: 'strategy',
      label: 'Strategy Snapshot',
      snapshot: strategy,
      sections: Array.isArray(strategy.sections) && strategy.sections.length
        ? strategy.sections
        : [
            { heading: '1. EXECUTIVE SNAPSHOT', type: 'prose', content: strategy.concept || '' },
            { heading: '4. CREATOR STRATEGY', type: 'bullets', items: normalizeStrategyDeliverables(strategy.deliverables || []).map((d) => `${d.title}: ${d.format}${d.duration ? ` (${d.duration})` : ''}`) },
            { heading: '6. COMMERCIAL OVERVIEW', type: 'bullets', items: normalizeStrategyBudget(strategy.budget).map((b) => `${b.line}: ${formatNairaV3(b.amount)}`) },
            { heading: '8. TRACKING PLAN', type: 'kpis', items: normalizeStrategyMetrics(strategy.success_metrics || []) },
          ],
    });
  }
  return docs;
};

const sectionValueText = (value) => {
  if (typeof value === 'number') return formatNairaV3(value);
  if (Array.isArray(value)) return value.map(sectionValueText).join(', ');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${sectionValueText(item)}`).join(' | ');
  return String(value || '');
};

const renderSection = (section, index) => (
  <div key={`${section.heading}-${index}`} className="mb-6">
    <h2>{section.heading}</h2>
    {section.content && <p>{section.content}</p>}
    {Array.isArray(section.items) && section.items.length > 0 && (
      section.type === 'numbered'
        ? <ol>{section.items.map((item, j) => <li key={j}>{sectionValueText(item)}</li>)}</ol>
        : <ul>{section.items.map((item, j) => <li key={j}>{sectionValueText(item)}</li>)}</ul>
    )}
    {Array.isArray(section.rows) && section.rows.length > 0 && (
      <table>
        <thead>
          <tr>{Object.keys(section.rows[0] || {}).map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {section.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{Object.keys(section.rows[0] || {}).map((column) => <td key={column}>{sectionValueText(row[column])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const V3BrandProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [bundle, setBundle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const session = getBrandPortalSession();
      const portalBundle = loadBrandPortalBundle(id, session.brandId);
      if (portalBundle) {
        if (mounted) setBundle(portalBundle);
        return;
      }
      const stored = getStoredDemoBundle(id);
      if (stored && stored.business_case?.brand_id === session.brandId) {
        if (mounted) setBundle(stored);
        return;
      }
      try {
        const live = await v3GetBusinessCase(id);
        if (mounted) setBundle(live?.business_case?.brand_id === session.brandId ? live : null);
      } catch (e) {
        const fallback = buildMockBusinessCaseBundle(id);
        if (mounted) setBundle(fallback?.business_case?.brand_id === session.brandId ? fallback : null);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const docs = useMemo(() => (bundle ? docsFromBundle(bundle) : []), [bundle]);
  const pendingDocs = docs.filter((doc) => doc.snapshot.status !== 'approved');

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  };

  const persistBundle = (nextBundle) => {
    setBundle(nextBundle);
    saveStoredDemoBundle(nextBundle);
  };

  const approveDocument = async (kind) => {
    if (!bundle) return;
    setBusy(true);
    try {
      try {
        if (kind === 'alignment') {
          await v3ApproveAlignmentAs(bundle.business_case.id, bundle.brand?.primary_contact || 'Brand', 'brand');
        } else {
          await v3ApproveSnapshot(bundle.business_case.id, bundle.brand?.primary_contact || 'Brand');
        }
      } catch (e) {
        // Static preview fallback keeps the brand approval path demonstrable.
      }

      const snapshotKey = kind === 'alignment' ? 'alignment_snapshot' : 'creative_snapshot';
      const nextSnapshot = {
        ...bundle[snapshotKey],
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: bundle.brand?.primary_contact || 'Brand',
        approved_by_party: 'brand',
      };
      const nextBundle = {
        ...bundle,
        [snapshotKey]: nextSnapshot,
        business_case: {
          ...bundle.business_case,
          next_action: kind === 'alignment'
            ? 'Alignment approved. TASCK is matching and briefing the right creators.'
            : 'Strategy approved. TASCK is preparing contracts.',
          frame: kind === 'alignment'
            ? { ...(bundle.business_case.frame || {}), alignment_snapshot_status: 'approved' }
            : bundle.business_case.frame,
          plan: kind === 'strategy'
            ? { ...(bundle.business_case.plan || {}), creative_snapshot_status: 'approved', strategy_snapshot_status: 'approved' }
            : bundle.business_case.plan,
        },
      };
      persistBundle(nextBundle);
      flash(`${kind === 'alignment' ? 'Alignment' : 'Strategy'} Snapshot approved.`);
    } finally {
      setBusy(false);
    }
  };

  if (!bundle) {
    return (
      <div className="v3-card p-8 text-[#8A8A8A]" data-testid="brand-project-not-found">
        This project is not available for the signed-in brand account.
      </div>
    );
  }

  const bc = bundle.business_case;
  const deliverables = Array.isArray(bundle.deliverables) ? bundle.deliverables : [];
  const approvedDeliverables = deliverables.filter((d) => d.status === 'approved').length;
  const deliveryProgress = deliverables.length ? Math.round((approvedDeliverables / deliverables.length) * 100) : 0;

  return (
    <div data-testid="v3-brand-project-detail">
      <button onClick={() => navigate('/v3/brand/projects')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> All projects
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] uppercase tracking-wider font-medium text-[#1F4A3A]">{bc.stage}</span>
          <span className={`${bc.engagement_track === 'grant' ? 'v3-badge-direct' : 'v3-badge-retainer'}`}>{bc.engagement_track}</span>
        </div>
        <h1 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{bc.title}</h1>
        <p className="text-[13px] text-[#8A8A8A] mt-1">{bundle.creator ? `with ${bundle.creator.name}` : 'Creator pending'} &middot; Managed by {bundle.rm?.name}</p>
      </div>

      {toast && (
        <div className="v3-card p-3 mb-4 bg-[#DDE7E2] border-[#C5D6CE]" data-testid="brand-project-toast">
          <p className="text-[12px] text-[#1F4A3A]">{toast}</p>
        </div>
      )}

      <div className="grid grid-cols-6 gap-2 mb-6">
        {FLOW.map((phase, index) => {
          const state = phaseState(bundle, phase.key, index);
          return (
            <div
              key={phase.key}
              className={`rounded border px-2 py-2 ${
                state === 'done'
                  ? 'bg-[#DDE7E2] border-[#C5D6CE] text-[#1F4A3A]'
                  : state === 'current'
                    ? 'bg-[#C49B5F12] border-[#C49B5F] text-[#7A5F23]'
                    : 'bg-[#FAFAF7] border-[#E8E4DB] text-[#8A8A8A]'
              }`}
              data-testid={`brand-project-phase-${phase.key}`}
            >
              <p className="text-[9px] uppercase tracking-wider mb-1">{state}</p>
              <p className="text-[11px] font-medium">{phase.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 border-b border-[#E8E4DB] mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#1F4A3A] text-[#1F4A3A]' : 'border-transparent text-[#8A8A8A] hover:text-[#5C5C5C]'}`}
            data-testid={`brand-tab-${tab.key}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Project Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[11px] text-[#8A8A8A]">Stage</p><p className="text-[14px] font-medium capitalize">{bc.stage}</p></div>
              <div><p className="text-[11px] text-[#8A8A8A]">Value</p><p className="text-[14px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(bc.estimated_value)}</p></div>
              <div><p className="text-[11px] text-[#8A8A8A]">Days in stage</p><p className="text-[14px] font-medium">{bc.days_in_stage}</p></div>
              <div><p className="text-[11px] text-[#8A8A8A]">Next action</p><p className="text-[14px] text-[#5C5C5C]">{bc.next_action}</p></div>
            </div>
          </div>

          {pendingDocs.length > 0 && (
            <div className="v3-card p-5 border-[#C49B5F]">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Awaiting brand approval</h3>
              <div className="space-y-2">
                {pendingDocs.map((doc) => (
                  <div key={doc.kind} className="flex items-center justify-between gap-3 p-3 rounded bg-[#FAFAF7] border border-[#E8E4DB]">
                    <div>
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{doc.label}</p>
                      <p className="text-[11px] text-[#8A8A8A]">Status: {doc.snapshot.status}</p>
                    </div>
                    <button onClick={() => approveDocument(doc.kind)} disabled={busy} className="v3-btn-primary text-[12px]" data-testid={`brand-project-approve-${doc.kind}`}>
                      <ShieldCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deliverables.length > 0 && (
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Delivery Progress</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 h-2 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1F4A3A] rounded-full transition-all" style={{ width: `${deliveryProgress}%` }} />
                </div>
                <span className="text-[13px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{approvedDeliverables}/{deliverables.length}</span>
              </div>
              <p className="text-[12px] text-[#8A8A8A]">{approvedDeliverables} deliverables approved, {deliverables.length - approvedDeliverables} remaining</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {docs.filter((doc) => doc.snapshot.status === 'approved').map((doc) => (
            <div key={doc.kind}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider">{doc.label}</h3>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#1F4A3A]">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                </span>
              </div>
              <V3DocumentSurface title={doc.snapshot.title} meta={doc.snapshot.meta || doc.snapshot.brand_header}>
                {doc.sections.map(renderSection)}
              </V3DocumentSurface>
            </div>
          ))}
          {docs.filter((doc) => doc.snapshot.status === 'approved').length === 0 && (
            <div className="v3-card p-8 text-center">
              <FileText className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
              <p className="text-[14px] text-[#8A8A8A]">No approved documents yet. Pending snapshots live in Approvals.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deliverables' && (
        <div className="space-y-3">
          {deliverables.length > 0 ? deliverables.map((del) => (
            <div key={del.id} className="v3-card p-4 flex items-center gap-4" data-testid={`brand-del-${del.id}`}>
              {del.status === 'approved' ? <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" /> :
               del.status === 'pending_rm_review' ? <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" /> :
               <Circle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-[13px] text-[#1A1A1A]">{del.title}</p>
                <p className="text-[10px] text-[#8A8A8A] capitalize">{del.status.replace(/_/g, ' ')}</p>
              </div>
              {del.brandApproved && <span className="text-[10px] text-[#8A8A8A]">Approved: {del.brandApproved}</span>}
              {del.paymentReleased && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">Paid</span>}
            </div>
          )) : (
            <div className="v3-card p-8 text-center">
              <p className="text-[14px] text-[#8A8A8A]">Deliverables will appear here once the project enters Delivery.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {(Array.isArray(bundle.invoices) ? bundle.invoices : []).map((invoice) => (
            <div key={invoice.id} className="v3-card p-4 flex items-center gap-4" data-testid={`brand-invoice-${invoice.id}`}>
              <FileText className="w-4 h-4 text-[#1F4A3A]" />
              <div className="flex-1">
                <p className="text-[13px] text-[#1A1A1A]">Strategy Development Fee</p>
                <p className="text-[10px] text-[#8A8A8A]">Tracked after creator brief, before Delivery</p>
              </div>
              <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(invoice.amount)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${invoice.status === 'paid' ? 'text-[#1F4A3A] bg-[#DDE7E2]' : 'text-[#C49B5F] bg-[#C49B5F12]'}`}>{invoice.status}</span>
            </div>
          ))}
          <div className="v3-card p-4 flex items-center gap-4" data-testid="brand-invoice-project">
            <FileText className="w-4 h-4 text-[#8A8A8A]" />
            <div className="flex-1">
              <p className="text-[13px] text-[#1A1A1A]">Project Fee</p>
              <p className="text-[10px] text-[#8A8A8A]">Due upon Strategy Snapshot approval</p>
            </div>
            <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(bc.estimated_value)}</span>
            <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">Not yet issued</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default V3BrandProjectDetail;
