import React from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrandIdentityCard, ErrorState, LoadingState, ProjectStageRail, bundleCase, formatDate, projectProgress, projectSummary, projectValue, sentenceCaseStatus, stageLabel, useV1BrandPortalData } from './V1BrandPortalData';

export const V1BrandProjectDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const data = useV1BrandPortalData();
  if (data.loading || !data.hydrated) return <LoadingState />;
  if (data.error) return <ErrorState error={data.error} />;
  const bundle = data.bundles.find((item) => bundleCase(item).id === id);
  const businessCase = bundleCase(bundle);
  if (!bundle) return <div className="v3-card p-6 text-[13px] text-[#6B6258]">This project is not connected to the signed-in brand account.</div>;
  return <div className="space-y-5" data-testid="v1-brand-project-detail"><button onClick={() => navigate('/brand/projects')} className="v3-btn-secondary"><ArrowLeft className="w-4 h-4" /> Back to projects</button><div className="v3-card p-5"><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Brand project</p><h1 className="v3-heading text-3xl mt-1" style={{ fontFamily: "'Fraunces', serif" }}>{businessCase.title || 'Untitled project'}</h1><p className="text-[13px] text-[#6B6258] mt-2 max-w-3xl">{projectSummary(bundle)}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5"><div className="rounded-xl border border-[#E8E4DB] bg-white p-4"><p className="text-[11px] uppercase text-[#8A8A8A]">Stage</p><p className="font-semibold mt-1">{stageLabel(businessCase.stage)}</p></div><div className="rounded-xl border border-[#E8E4DB] bg-white p-4"><p className="text-[11px] uppercase text-[#8A8A8A]">Project value</p><p className="font-semibold mt-1">{projectValue(businessCase)}</p></div><div className="rounded-xl border border-[#E8E4DB] bg-white p-4"><p className="text-[11px] uppercase text-[#8A8A8A]">Last update</p><p className="font-semibold mt-1">{formatDate(businessCase.updated_at || businessCase.created_at)}</p></div></div><div className="mt-5"><ProjectStageRail stage={businessCase.stage} /></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[['Alignment Snapshot', bundle.alignment_snapshot, '/brand/alignment-snapshot'], ['Pitch Deck', bundle.pitch_deck, '/brand/pitch-deck'], ['Contract', bundle.contract, '/brand/contracts'], ['Report & Feedback', bundle.final_report, '/brand/reports-feedback']].map(([label, doc, path]) => <button key={label} onClick={() => navigate(path)} className="v3-card p-4 text-left hover:border-[#1F4A3A]"><p className="font-semibold text-[#1F1B18]">{label}</p><p className="text-[12px] text-[#6B6258] mt-1">Status: {sentenceCaseStatus(doc?.status || 'not ready yet')}</p></button>)}</div></div>;
};

const V1BrandProjects = () => {
  const navigate = useNavigate();
  const data = useV1BrandPortalData();
  if (data.loading || !data.hydrated) return <LoadingState />;
  if (data.error) return <ErrorState error={data.error} />;
  return <div className="space-y-5" data-testid="v1-brand-projects"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Brand projects</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Projects with TASCK</h1><p className="text-[13px] text-[#6B6258] mt-2">Only live projects connected to this brand account appear here.</p></div><BrandIdentityCard brand={data.brand} session={data.session} compact /><div className="space-y-3">{data.bundles.length === 0 && <div className="v3-card p-6 text-[13px] text-[#6B6258]">No project has been shared with this brand account yet.</div>}{data.bundles.map((bundle) => { const businessCase = bundleCase(bundle); return <div key={businessCase.id} className="v3-card p-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#8A8A8A]"><BriefcaseBusiness className="w-3.5 h-3.5" /> TASCK project</div><h2 className="text-xl font-semibold text-[#1F1B18] mt-1">{businessCase.title || 'Untitled project'}</h2><p className="text-[13px] text-[#5C5C5C] mt-2 leading-6 max-w-3xl">{projectSummary(bundle)}</p></div><div className="text-left lg:text-right"><p className="text-[12px] text-[#8A8A8A]">{projectValue(businessCase)}</p><p className="text-[13px] font-semibold text-[#1F4A3A] mt-1">{stageLabel(businessCase.stage)} · {projectProgress(businessCase.stage)}%</p></div></div><div className="mt-5"><ProjectStageRail stage={businessCase.stage} /></div><button onClick={() => navigate('/brand/projects/' + businessCase.id)} className="v3-btn-secondary mt-5"><ArrowRight className="w-4 h-4" /> View project</button></div>; })}</div></div>;
};
export default V1BrandProjects;
