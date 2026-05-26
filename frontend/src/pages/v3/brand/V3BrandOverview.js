import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  approvalDocsForBrand,
  getBrandPortalBrand,
  getBrandPortalSession,
  loadBrandPortalBundles,
  vaultDocsForBrand,
} from '../../../lib/v3brandPortal';
import { formatNairaV3 } from '../../../lib/v3data';
import V3BrandOnboarding from '../../../components/v3/V3BrandOnboarding';
import { ArrowRight, CheckCircle, Clock, FileText, FolderOpen, Gauge, Sparkles } from 'lucide-react';

const stageLabel = {
  connect: 'Connector',
  frame: 'Frame',
  plan: 'Plan',
  deliver: 'Delivery',
  closure: 'Reporting',
  closed: 'Closed',
};

const statusTone = {
  connect: 'bg-[#F4F2EC] text-[#6E6657]',
  frame: 'bg-[#C49B5F12] text-[#7A5F23]',
  plan: 'bg-[#DDE7E2] text-[#1F4A3A]',
  deliver: 'bg-[#E8EEF4] text-[#31546F]',
  closed: 'bg-[#DDE7E2] text-[#1F4A3A]',
};

const V3BrandOverview = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const session = getBrandPortalSession();
  const brand = getBrandPortalBrand();
  const bundles = useMemo(() => loadBrandPortalBundles(session.brandId), [session.brandId]);
  const pendingApprovals = useMemo(() => approvalDocsForBrand(session.brandId), [session.brandId]);
  const vaultDocs = useMemo(() => vaultDocsForBrand(session.brandId), [session.brandId]);

  const metrics = useMemo(() => {
    const active = bundles.filter((bundle) => !['closed'].includes(bundle.business_case.stage));
    const totalValue = bundles.reduce((sum, bundle) => sum + (Number(bundle.business_case.estimated_value) || 0), 0);
    const deliverables = bundles.flatMap((bundle) => Array.isArray(bundle.deliverables) ? bundle.deliverables : []);
    const approvedDeliverables = deliverables.filter((item) => item.status === 'approved').length;
    const deliveryPct = deliverables.length ? Math.round((approvedDeliverables / deliverables.length) * 100) : 0;
    return { active: active.length, totalValue, approvedDeliverables, deliverables: deliverables.length, deliveryPct };
  }, [bundles]);

  const primaryProject = bundles[0];

  return (
    <div data-testid="v3-brand-overview">
      {showOnboarding && <V3BrandOnboarding onComplete={() => setShowOnboarding(false)} />}

      <div className="grid grid-cols-[1.4fr_.9fr] gap-5 mb-6">
        <div className="v3-card p-6 border-[#D4CDBF]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Brand Portal</p>
              <h1 className="v3-heading text-2xl mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                {brand?.company}
              </h1>
              <p className="text-[13px] text-[#6E6657] max-w-2xl">
                Welcome back, {session.contact}. Review pending snapshots, track the full campaign flow, and keep approved documents in one clean vault.
              </p>
            </div>
            <button onClick={() => setShowOnboarding(true)} className="v3-btn-secondary text-[11px]" data-testid="replay-onboarding">
              <Sparkles className="w-3 h-3" /> Replay Onboarding
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-3">
              <FolderOpen className="w-4 h-4 text-[#1F4A3A] mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Active projects</p>
              <p className="text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metrics.active}</p>
            </div>
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-3">
              <Clock className="w-4 h-4 text-[#C49B5F] mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Pending approvals</p>
              <p className="text-xl font-semibold text-[#7A5F23]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pendingApprovals.length}</p>
            </div>
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-3">
              <FileText className="w-4 h-4 text-[#567B3F] mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Approved docs</p>
              <p className="text-xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{vaultDocs.length}</p>
            </div>
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-3">
              <Gauge className="w-4 h-4 text-[#31546F] mb-2" />
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Pipeline value</p>
              <p className="text-lg font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(metrics.totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-3">Current priority</p>
          {pendingApprovals[0] ? (
            <button
              onClick={() => navigate('/v3/brand/approvals')}
              className="w-full text-left rounded border border-[#C49B5F] bg-[#C49B5F12] p-4 hover:bg-[#F2EAD8] transition-colors"
              data-testid="brand-overview-primary-approval"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#7A5F23]" />
                <span className="text-[10px] uppercase tracking-wider text-[#7A5F23]">Approval needed</span>
              </div>
              <p className="text-[14px] font-semibold text-[#1A1A1A]">{pendingApprovals[0].label}</p>
              <p className="text-[12px] text-[#6E6657] mt-1">{pendingApprovals[0].business_case.title}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#1F4A3A] mt-4">
                Review now <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ) : (
            <div className="rounded border border-[#C5D6CE] bg-[#DDE7E2] p-4">
              <CheckCircle className="w-5 h-5 text-[#1F4A3A] mb-3" />
              <p className="text-[14px] font-semibold text-[#1A1A1A]">No pending approvals</p>
              <p className="text-[12px] text-[#6E6657] mt-1">Approved documents are available in your document vault.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1.15fr_.85fr] gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider">Project flow</h2>
            <button onClick={() => navigate('/v3/brand/projects')} className="text-[11px] text-[#1F4A3A] inline-flex items-center gap-1">
              All projects <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {bundles.map((bundle) => {
              const bc = bundle.business_case;
              const tone = statusTone[bc.stage] || statusTone.connect;
              return (
                <button
                  key={bc.id}
                  onClick={() => navigate(`/v3/brand/projects/${bc.id}`)}
                  className="w-full v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors group"
                  data-testid={`brand-overview-project-${bc.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${tone}`}>{stageLabel[bc.stage] || bc.stage}</span>
                        {bundle.creator && <span className="text-[10px] text-[#8A8A8A]">with {bundle.creator.name}</span>}
                      </div>
                      <p className="text-[14px] font-medium text-[#1A1A1A]">{bc.title}</p>
                      <p className="text-[11px] text-[#8A8A8A] mt-1">{bc.next_action}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] text-[#1F4A3A] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(bc.estimated_value)}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-[#D4CDBF] ml-auto mt-2 group-hover:text-[#1F4A3A]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Delivery pulse</h2>
          <div className="v3-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-[#8A8A8A]">Approved deliverables</span>
              <span className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metrics.approvedDeliverables}/{metrics.deliverables}</span>
            </div>
            <div className="h-2 rounded-full bg-[#E8E4DB] overflow-hidden mb-4">
              <div className="h-full bg-[#1F4A3A]" style={{ width: `${metrics.deliveryPct}%` }} />
            </div>
            {primaryProject && (
              <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Latest project</p>
                <p className="text-[13px] font-medium text-[#1A1A1A]">{primaryProject.business_case.title}</p>
                <p className="text-[11px] text-[#6E6657] mt-1">{primaryProject.business_case.next_action}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3BrandOverview;
