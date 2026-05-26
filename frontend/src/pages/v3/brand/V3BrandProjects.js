import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatNairaV3 } from '../../../lib/v3data';
import { getBrandPortalBrand, getBrandPortalSession, isPendingApprovalStatus, loadBrandPortalBundles } from '../../../lib/v3brandPortal';
import { ArrowRight, CheckCircle, Clock, FileText, GitBranch } from 'lucide-react';

const FLOW = [
  { key: 'connect', label: 'Connector' },
  { key: 'frame', label: 'Frame' },
  { key: 'plan', label: 'Plan' },
  { key: 'deliver', label: 'Delivery' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'closed', label: 'Closed' },
];

const stageIndex = {
  connect: 0,
  frame: 1,
  plan: 2,
  deliver: 3,
  closure: 4,
  closed: 5,
};

const statusTone = {
  approved: 'bg-[#DDE7E2] text-[#1F4A3A]',
  sent_to_brand: 'bg-[#C49B5F12] text-[#7A5F23]',
  under_review: 'bg-[#C49B5F12] text-[#7A5F23]',
  draft: 'bg-[#F4F2EC] text-[#6E6657]',
  pending: 'bg-[#F4F2EC] text-[#8A8A8A]',
};

const phaseState = (bundle, key, index) => {
  const current = stageIndex[bundle.business_case.stage] ?? 0;
  if (key === 'reporting' && bundle.final_report) return current >= 5 ? 'done' : 'current';
  if (key === 'closed') return current >= 5 ? 'current' : 'pending';
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'pending';
};

const V3BrandProjects = () => {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const session = getBrandPortalSession();
  const brand = getBrandPortalBrand();

  useEffect(() => {
    setBundles(loadBrandPortalBundles(session.brandId));
  }, [session.brandId]);

  const metrics = useMemo(() => {
    const awaiting = bundles.flatMap((bundle) => [bundle.alignment_snapshot, bundle.creative_snapshot])
      .filter((snapshot) => snapshot && isPendingApprovalStatus(snapshot.status)).length;
    return {
      total: bundles.length,
      awaiting,
      delivery: bundles.filter((bundle) => bundle.business_case.stage === 'deliver').length,
      reports: bundles.filter((bundle) => bundle.final_report).length,
    };
  }, [bundles]);

  return (
    <div data-testid="v3-brand-projects">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PROJECTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Your Campaign Flow</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">
        {brand?.company} timeline across Connector, Frame, Plan, Delivery, Reporting, and Closed stages. Admin actions and approvals update here in demo mode.
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Brand projects</p>
          <p className="text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metrics.total}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Awaiting review</p>
          <p className="text-xl font-semibold text-[#7A5F23]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metrics.awaiting}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">In delivery</p>
          <p className="text-xl font-semibold text-[#567B3F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metrics.delivery}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Reports ready</p>
          <p className="text-xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{metrics.reports}</p>
        </div>
      </div>

      <div className="space-y-3">
        {bundles.map((bundle) => {
          const bc = bundle.business_case;
          const alignmentStatus = bundle.alignment_snapshot?.status || 'pending';
          const strategyStatus = bundle.creative_snapshot?.status || 'pending';
          const deliverables = Array.isArray(bundle.deliverables) ? bundle.deliverables : [];
          const approvedDeliverables = deliverables.filter((d) => d.status === 'approved').length;
          const progress = deliverables.length ? Math.round((approvedDeliverables / deliverables.length) * 100) : 0;

          return (
            <button
              key={bc.id}
              onClick={() => navigate(`/v3/brand/projects/${bc.id}`)}
              className="w-full v3-card p-5 text-left hover:border-[#D4CDBF] transition-colors group"
              data-testid={`brand-proj-${bc.id}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{bundle.brand?.company || 'Brand'}</p>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{bc.title}</h2>
                  <p className="text-[12px] text-[#8A8A8A] mt-1">{bundle.creator ? `with ${bundle.creator.name}` : 'Creator matching in progress'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-medium text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(bc.estimated_value)}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{bc.days_in_stage} days in stage</p>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 mb-4">
                {FLOW.map((phase, index) => {
                  const state = phaseState(bundle, phase.key, index);
                  return (
                    <div
                      key={phase.key}
                      className={`rounded border px-2 py-2 min-h-[58px] ${
                        state === 'done'
                          ? 'bg-[#DDE7E2] border-[#C5D6CE] text-[#1F4A3A]'
                          : state === 'current'
                            ? 'bg-[#C49B5F12] border-[#C49B5F] text-[#7A5F23]'
                            : 'bg-[#FAFAF7] border-[#E8E4DB] text-[#8A8A8A]'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {state === 'done' ? <CheckCircle className="w-3 h-3" /> : state === 'current' ? <Clock className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}
                        <span className="text-[9px] uppercase tracking-wider">{state}</span>
                      </div>
                      <p className="text-[11px] font-medium">{phase.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded ${statusTone[alignmentStatus] || statusTone.pending}`}>
                  Alignment: {alignmentStatus.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${statusTone[strategyStatus] || statusTone.pending}`}>
                  Strategy: {strategyStatus.replace(/_/g, ' ')}
                </span>
                {deliverables.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]">
                    Delivery: {progress}% complete
                  </span>
                )}
                {bundle.final_report && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]">
                    Report ready
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#8A8A8A] group-hover:text-[#1F4A3A]">
                  View project <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[11px] text-[#8A8A8A] mt-3 italic">{bc.next_action}</p>
            </button>
          );
        })}
      </div>

      {bundles.length === 0 && (
        <div className="v3-card p-8 text-center">
          <FileText className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
          <p className="text-[14px] text-[#8A8A8A]">No demo projects available.</p>
        </div>
      )}
    </div>
  );
};

export default V3BrandProjects;
