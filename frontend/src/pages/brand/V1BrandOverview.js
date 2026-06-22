import React, { useMemo } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, MessageSquare, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandIdentityCard, ErrorState, LoadingState, ProjectStageRail, brandName, bundleCase, documentGroupsFromBundles, projectProgress, projectSummary, projectValue, stageLabel, useV1BrandPortalData } from './V1BrandPortalData';

const Metric = ({ label, value, icon: Icon }) => <div className="v3-card p-4"><div className="flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{label}</p><Icon className="w-4 h-4 text-[#1F4A3A]" /></div><p className="text-2xl font-semibold text-[#1F1B18] mt-3">{value}</p></div>;

const V1BrandOverview = () => {
  const navigate = useNavigate();
  const { loading, error, brand, session, bundles } = useV1BrandPortalData();
  const groups = useMemo(() => documentGroupsFromBundles(bundles), [bundles]);
  const activeBundles = bundles.filter((bundle) => bundleCase(bundle).stage !== 'closed');
  const currentBundle = activeBundles[0] || bundles[0];
  const currentCase = bundleCase(currentBundle);
  const docs = [...groups.alignment, ...groups.strategy, ...groups.contracts, ...groups.reports];
  const pendingDocs = docs.filter((doc) => /review|sent|pending/i.test(doc.snapshot?.status || ''));
  const approvedDocs = docs.filter((doc) => /approve|signed|complete/i.test(doc.snapshot?.status || ''));
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return <div className="space-y-5" data-testid="v1-brand-overview">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Brand Portal</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>{brandName(brand)} project workspace</h1><p className="text-[13px] text-[#6B6258] mt-2 max-w-3xl">Track the live work between your brand and TASCK, review documents sent for approval, and send comments directly back to admin.</p></div><button onClick={() => navigate('/brand/projects')} className="v3-btn-primary w-fit"><BriefcaseBusiness className="w-4 h-4" /> View projects</button></div>
    <BrandIdentityCard brand={brand} session={session} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"><Metric label="Active projects" value={activeBundles.length} icon={BriefcaseBusiness} /><Metric label="Pending review" value={pendingDocs.length} icon={Clock3} /><Metric label="Approved documents" value={approvedDocs.length} icon={CheckCircle2} /><Metric label="Pipeline value" value={currentCase.id ? projectValue(currentCase) : 'Value pending'} icon={ShieldCheck} /></div>
    {currentCase.id ? <div className="v3-card p-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Current project progress</p><h2 className="text-xl font-semibold text-[#1F1B18] mt-1">{currentCase.title || 'Untitled project'}</h2><p className="text-[13px] text-[#5C5C5C] mt-2 leading-6 max-w-3xl">{projectSummary(currentBundle)}</p></div><div className="rounded-xl bg-[#F7EFE1] border border-[#E6D6B6] px-4 py-3 min-w-[180px]"><p className="text-[11px] uppercase tracking-wide text-[#7A5F23]">Current stage</p><p className="text-lg font-semibold text-[#1F1B18]">{stageLabel(currentCase.stage)}</p><p className="text-[12px] text-[#7A5F23]">{projectProgress(currentCase.stage)}% through the TASCK flow</p></div></div><div className="mt-5"><ProjectStageRail stage={currentCase.stage} /></div><button onClick={() => navigate('/brand/projects/' + currentCase.id)} className="v3-btn-secondary mt-5"><ArrowRight className="w-4 h-4" /> Open project</button></div> : <div className="v3-card p-6 text-[13px] text-[#6B6258]">No active project is connected to this brand account yet.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3"><button onClick={() => navigate('/brand/alignment-snapshot')} className="v3-card p-4 text-left hover:border-[#1F4A3A]"><ShieldCheck className="w-4 h-4 text-[#1F4A3A] mb-3" /><p className="font-semibold">Alignment Snapshot</p><p className="text-[12px] text-[#6B6258] mt-1">Review alignment details and send comments to TASCK.</p></button><button onClick={() => navigate('/brand/strategy-snapshot')} className="v3-card p-4 text-left hover:border-[#1F4A3A]"><FileText className="w-4 h-4 text-[#1F4A3A] mb-3" /><p className="font-semibold">Strategy Snapshot</p><p className="text-[12px] text-[#6B6258] mt-1">Review strategy, budget, and execution plan.</p></button><button onClick={() => navigate('/brand/reports-feedback')} className="v3-card p-4 text-left hover:border-[#1F4A3A]"><MessageSquare className="w-4 h-4 text-[#1F4A3A] mb-3" /><p className="font-semibold">Reports & Feedback</p><p className="text-[12px] text-[#6B6258] mt-1">Send report feedback back to admin.</p></button></div>
  </div>;
};
export default V1BrandOverview;
