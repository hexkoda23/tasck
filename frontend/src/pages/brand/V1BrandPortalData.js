import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { v3AddAlignmentComment, v3AddPitchDeckComment, v3AddStrategySnapshotComment, v3ApproveAlignmentAs, v3ApprovePitchDeckAs, v3ApproveSnapshot, v3CreateInteraction, v3GetBrand, v3GetBusinessCase, v3ListBusinessCases, v3ListInteractions, v3SubmitBrandFeedback } from '../../lib/v3api';
import { formatNairaV3 } from '../../lib/v3data';
import { getBrandPortalSession } from '../../lib/v3brandPortal';
import { BrandLogo as SharedBrandLogo } from '../../lib/brandLogo';

export const emptyText = 'Not captured yet.';
export const cleanPortalText = (value) => String(value ?? '').replace(/Ã—/g, 'x').replace(/â€”|â€“/g, '-').replace(/â€¦/g, '...').replace(/â‚¦/g, '₦').replace(/ðŸ[^\s]*/g, '').replace(/[_-]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
export const sentenceCaseStatus = (value) => cleanPortalText(value || 'Not started').replace(/\b\w/g, (l) => l.toUpperCase()).replace(/\bAi\b/g, 'AI').replace(/\bCrm\b/g, 'CRM');
export const formatDate = (value) => { if (!value) return emptyText; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? cleanPortalText(value) : parsed.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
export const firstValue = (record, keys, fallback = '') => { for (const key of keys) { const value = record?.[key]; if (value !== undefined && value !== null && String(value).trim() !== '') return value; } return fallback; };
export const brandName = (brand) => cleanPortalText(firstValue(brand, ['company', 'name', 'brand_name'], 'Brand'));
export const brandContact = (brand, session) => cleanPortalText(firstValue(brand, ['primary_contact', 'primaryContact', 'contact_name'], session?.contact || 'Brand team'));
export const brandAbout = (brand) => cleanPortalText(firstValue(brand, ['about', 'brand_about', 'description', 'company_description'], 'TASCK is still enriching this brand profile.'));
export const brandIndustry = (brand) => cleanPortalText(firstValue(brand, ['industry', 'category', 'sector'], 'Brand'));
export const brandLogo = (brand) => firstValue(brand, ['logo_url', 'brand_logo_url', 'logoUrl', 'brandLogoUrl', 'logo'], '');
// Mirror the admin CRM logo resolution so the brand portal shows the exact same
// logo the admin sees: the saved URL first, then website-derived candidates,
// and (via SharedBrandLogo) brand-name overrides like We Yan as a final fallback.
export const domainFromWebsite = (website = '') => {
  const raw = String(website || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw.startsWith('http') ? raw : 'https://' + raw).hostname.replace(/^www\./, '');
  } catch (_) {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
};
export const brandLogoCandidates = (brand) => {
  const direct = brandLogo(brand);
  const domain = domainFromWebsite(firstValue(brand, ['website', 'url', 'brand_url', 'source_url']));
  return [
    direct,
    domain ? 'https://' + domain + '/favicon.png' : '',
    domain ? 'https://' + domain + '/favicon.ico' : '',
    domain ? 'https://' + domain + '/logo.svg' : '',
    domain ? 'https://' + domain + '/logo.png' : '',
    domain ? 'https://' + domain + '/assets/logo.svg' : '',
    domain ? 'https://' + domain + '/assets/logo.png' : '',
    domain ? 'https://www.google.com/s2/favicons?sz=256&domain=' + domain : '',
    domain ? 'https://icons.duckduckgo.com/ip3/' + domain + '.ico' : '',
  ]
    .filter(Boolean)
    .filter((value) => !/(vite\.svg|react\.svg|placeholder|blank|sprite)/i.test(value))
    .filter((value, index, array) => array.indexOf(value) === index);
};
export const stageOrder = ['connect', 'frame', 'plan', 'deliver', 'reporting', 'closed'];
export const stageLabel = (stage) => ({ connect: 'Connect', frame: 'Frame', plan: 'Plan', deliver: 'Delivery', reporting: 'Reporting', closed: 'Closed' }[stage] || sentenceCaseStatus(stage));
export const stageIndex = (stage) => Math.max(0, stageOrder.indexOf(stage || 'connect'));
export const bundleCase = (bundle) => bundle?.business_case || bundle?.businessCase || bundle?.case || bundle || {};
export const activityTime = (item) => { const bc = bundleCase(item); return Math.max(...[bc.updated_at, bc.last_interaction_at, bc.created_at, item?.updated_at, item?.created_at].map((v) => { const p = Date.parse(v || ''); return Number.isNaN(p) ? 0 : p; }), 0); };
export const projectValue = (bc) => { const value = bc?.estimated_value || bc?.value || bc?.total_value || bc?.budget; return value ? formatNairaV3(Number(value)) : 'Value pending'; };
export const projectProgress = (stage) => Math.round(((stageIndex(stage) + 1) / stageOrder.length) * 100);
export const projectSummary = (bundle) => { const bc = bundleCase(bundle); if (bc.stage === 'closed') return cleanPortalText('This project has been closed by TASCK. The final report, feedback, contracts, and approved documents remain available in this brand portal.'); return cleanPortalText(bc.next_action || bc.summary || bc.connect?.stated_intent || bc.description || 'TASCK is progressing this project with your team.'); };

export const useV1BrandPortalData = () => {
  const session = useMemo(() => getBrandPortalSession(), []);
  const brandId = session?.brandId || session?.brand_id;
  const [state, setState] = useState({ loading: true, error: '', brand: null, brandBundle: null, businessCases: [], bundles: [], interactions: [] });
  const reload = useCallback(async () => {
    if (!brandId) { setState({ loading: false, error: 'Please sign in again so TASCK can identify your brand account.', brand: null, brandBundle: null, businessCases: [], bundles: [], interactions: [] }); return; }
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [brandBundle, rawCases, rawInteractions] = await Promise.all([v3GetBrand(brandId), v3ListBusinessCases({ brand_id: brandId }), v3ListInteractions({ brand_id: brandId })]);
      const brand = brandBundle?.brand || brandBundle;
      const businessCases = Array.isArray(rawCases) ? rawCases : [];
      const bundles = await Promise.all(businessCases.map(async (businessCase) => { try { return await v3GetBusinessCase(businessCase.id); } catch (e) { return { business_case: businessCase, brand }; } }));
      bundles.sort((a, b) => activityTime(b) - activityTime(a));
      setState({ loading: false, error: '', brand, brandBundle, businessCases, bundles, interactions: Array.isArray(rawInteractions) ? rawInteractions : [] });
    } catch (e) {
      setState((current) => ({ ...current, loading: false, error: e?.response?.data?.detail || e.message || 'Brand portal data could not be loaded.' }));
    }
  }, [brandId]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, session, brandId, reload };
};

export const statusTone = (status) => { const key = String(status || '').toLowerCase(); if (key.includes('approve') || key.includes('sent') || key.includes('complete') || key.includes('signed')) return 'bg-[#DDE7E2] text-[#1F4A3A] border-[#C7D7CF]'; if (key.includes('review') || key.includes('pending') || key.includes('draft')) return 'bg-[#F2EAD8] text-[#7A5F23] border-[#E6D6B6]'; return 'bg-[#EEEAE0] text-[#5C5C5C] border-[#DDD6C8]'; };
export const documentGroupsFromBundles = (bundles) => { const groups = { alignment: [], strategy: [], pitch: [], contracts: [], reports: [] }; (bundles || []).forEach((bundle) => { const businessCase = bundleCase(bundle); const alignmentDocs = Array.isArray(bundle.alignment_snapshots) && bundle.alignment_snapshots.length ? bundle.alignment_snapshots : (bundle.alignment_snapshot ? [bundle.alignment_snapshot] : []); alignmentDocs.forEach((snap) => groups.alignment.push({ kind: 'alignment', label: snap.opportunity_title ? 'Alignment Snapshot - ' + snap.opportunity_title : 'Alignment Snapshot', snapshot: snap, businessCase, bundle })); if (bundle.creative_snapshot) groups.strategy.push({ kind: 'strategy', label: 'Strategy Snapshot', snapshot: bundle.creative_snapshot, businessCase, bundle }); if (bundle.pitch_deck) groups.pitch.push({ kind: 'pitch', label: 'Pitch Deck', snapshot: bundle.pitch_deck, businessCase, bundle }); if (bundle.contract) groups.contracts.push({ kind: 'contract', label: 'Contract', snapshot: bundle.contract, businessCase, bundle }); if (bundle.final_report) groups.reports.push({ kind: 'report', label: 'Report & Feedback', snapshot: bundle.final_report, businessCase, bundle }); }); Object.keys(groups).forEach((key) => groups[key].sort((a, b) => activityTime(b.bundle) - activityTime(a.bundle))); return groups; };
export const sectionsFromSnapshot = (snapshot) => { if (!snapshot) return []; if (Array.isArray(snapshot.sections) && snapshot.sections.length) return snapshot.sections; const sections = []; if (snapshot.title || snapshot.brand_header) sections.push({ heading: snapshot.title || snapshot.brand_header, content: snapshot.meta || snapshot.summary || snapshot.concept || '' }); if (snapshot.marketing_intelligence) Object.entries(snapshot.marketing_intelligence).forEach(([heading, value]) => sections.push({ heading: sentenceCaseStatus(heading), content: value })); if (snapshot.concept) sections.push({ heading: 'Concept', content: snapshot.concept }); if (Array.isArray(snapshot.deliverables)) sections.push({ heading: 'Deliverables', items: snapshot.deliverables.map((item) => cleanPortalText(item.title || item.format || item)) }); if (Array.isArray(snapshot.budget)) sections.push({ heading: 'Budget', rows: snapshot.budget.map((item) => ({ Line: item.line || item.title || 'Budget item', Amount: item.amount ? formatNairaV3(Number(item.amount)) : cleanPortalText(item.value || '') })) }); if (Array.isArray(snapshot.clauses)) sections.push({ heading: 'Agreement Clauses', items: snapshot.clauses.map((item) => cleanPortalText(item.title ? item.title + ': ' + item.body : item.body || item)) }); if (snapshot.body) sections.push({ heading: 'Contract Body', content: snapshot.body }); if (snapshot.summary) sections.push({ heading: 'Summary', content: snapshot.summary }); return sections.length ? sections : [{ heading: 'Document', content: emptyText }]; };

// sectionIndex / sectionHeading are optional: when the brand comments on a
// specific part of the document (per-section comment boxes), we thread the
// section through so admin sees exactly which part the comment refers to.
export const sendDocumentComment = ({ kind, snapshot, businessCase, brand, comment, author, sectionIndex, sectionHeading }) => { const cleanComment = cleanPortalText(comment); if (!cleanComment) throw new Error('Add a comment before sending it back to TASCK.'); const quoted = cleanPortalText(sectionHeading || '') || 'Brand review'; const idx = Number.isInteger(sectionIndex) ? sectionIndex : 0; if (kind === 'alignment') return v3AddAlignmentComment(snapshot.id, { section_index: idx, quoted_text: quoted, comment: cleanComment, author }); if (kind === 'strategy') return v3AddStrategySnapshotComment(snapshot.id, { section_index: idx, quoted_text: quoted, comment: cleanComment, author }); if (kind === 'pitch') return v3AddPitchDeckComment(snapshot.id, { section_index: idx, quoted_text: quoted, comment: cleanComment, author }); return v3CreateInteraction({ brand_id: businessCase.brand_id || brand?.id, business_case_id: businessCase.id, type: kind === 'contract' ? 'brand_contract_comment' : 'brand_document_comment', title: sentenceCaseStatus(kind) + ' comment from brand' + (sectionHeading ? ' - ' + cleanPortalText(sectionHeading) : ''), author, content: (sectionHeading ? '[' + cleanPortalText(sectionHeading) + '] ' : '') + cleanComment }); };
export const approveDocument = ({ kind, businessCase, author, snapshot }) => { if (kind === 'alignment') return v3ApproveAlignmentAs(businessCase.id, author, 'brand', snapshot?.id); if (kind === 'strategy') return v3ApproveSnapshot(businessCase.id, author, 'brand'); if (kind === 'pitch') return v3ApprovePitchDeckAs(businessCase.id, author, 'brand'); return v3CreateInteraction({ brand_id: businessCase.brand_id, business_case_id: businessCase.id, type: 'brand_document_approval', title: sentenceCaseStatus(kind) + ' approved by brand', author, content: 'Brand approved this document from the V1 brand portal.' }); };
export const sendReportFeedback = async ({ businessCase, brand, author, feedback }) => { const cleanFeedback = cleanPortalText(feedback); if (!cleanFeedback) throw new Error('Add feedback before sending it to TASCK.'); await v3SubmitBrandFeedback(businessCase.id, { respondent: author, comments: cleanFeedback, clarity: 10, representation: 10, coordination: 10, professionalism: 10, overall: 10 }); return v3CreateInteraction({ brand_id: businessCase.brand_id || brand?.id, business_case_id: businessCase.id, type: 'brand_report_feedback', title: 'Report feedback from brand', author, content: cleanFeedback }); };

export const BrandIdentityCard = ({ brand, session, compact = false }) => { return <div className={'v3-card ' + (compact ? 'p-4' : 'p-5')}><div className="flex items-start gap-4"><SharedBrandLogo name={brandName(brand)} candidates={brandLogoCandidates(brand)} containerClassName="w-16 h-16 rounded-xl border border-[#E8E4DB] bg-white overflow-hidden flex items-center justify-center shrink-0" imgClassName="w-full h-full object-contain p-1.5" initialsClassName="text-lg font-bold text-[#1F4A3A]" /><div className="min-w-0"><p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Signed-in brand</p><h2 className="v3-heading text-2xl break-words" style={{ fontFamily: "'Fraunces', serif" }}>{brandName(brand)}</h2><p className="text-[13px] text-[#6B6258] mt-1">{brandIndustry(brand)} · {brandContact(brand, session)}</p>{!compact && <p className="text-[13px] text-[#5C5C5C] mt-3 leading-6">{brandAbout(brand)}</p>}</div></div></div>; };
export const ProjectStageRail = ({ stage }) => { const current = stageIndex(stage); return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">{stageOrder.map((item, index) => <div key={item} className={'rounded-lg border px-3 py-2 text-[12px] ' + (index < current ? 'border-[#C7D7CF] bg-[#EEF5F1] text-[#1F4A3A]' : index === current ? 'border-[#C49B5F] bg-[#F7EFE1] text-[#7A5F23]' : 'border-[#E8E4DB] bg-white text-[#8A8A8A]')}><div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />{stageLabel(item)}</div></div>)}</div>; };
// Per-section comment box (brand portal). Rendered below EVERY section of a
// document when SnapshotSections is given an onSectionComment handler, so the
// brand can comment on each part individually instead of only one box at the
// bottom of the page. Each box manages its own draft + busy state; on success
// the draft clears and a small confirmation replaces the button label briefly.
const SectionCommentBox = ({ section, index, onSectionComment }) => {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const heading = cleanPortalText(section.heading || section.title || `Section ${index + 1}`);
  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await onSectionComment(section, index, draft);
      setDraft('');
      setSentAt(Date.now());
      setTimeout(() => setSentAt(0), 2500);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 border-t border-[#EEEAE0] pt-3" data-testid={`section-comment-${index}`}>
      <p className="text-[10px] uppercase tracking-wide text-[#8A8A8A] mb-1.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Comment on this part</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          className="flex-1 rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-2.5 text-[12px] focus:outline-none focus:border-[#1F4A3A]"
          placeholder={`Add a comment about "${heading}"...`}
          data-testid={`section-comment-input-${index}`}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !draft.trim()}
          className="v3-btn-secondary text-[11px] self-end sm:self-start disabled:opacity-50"
          data-testid={`section-comment-send-${index}`}
        >
          <Send className="w-3 h-3" /> {busy ? 'Sending...' : sentAt ? 'Sent ✓' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export const SnapshotSections = ({ sections, onSectionComment }) => <div className="space-y-4">{(sections?.length ? sections : [{ heading: 'Document', content: emptyText }]).map((section, index) => <div key={(section.heading || 'section') + index} className="rounded-xl border border-[#E8E4DB] bg-white p-4"><h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#1F4A3A] mb-2">{cleanPortalText(section.heading || section.title || 'Section')}</h3>{section.content && <p className="text-[13px] leading-6 text-[#4F4941] whitespace-pre-wrap">{cleanPortalText(section.content)}</p>}{Array.isArray(section.items) && <ul className="space-y-2 text-[13px] text-[#4F4941]">{section.items.map((item, i) => <li key={i}>• {cleanPortalText(item.title ? item.title + ': ' + (item.detail || item.description || '') : item)}</li>)}</ul>}{Array.isArray(section.points) && <ul className="space-y-2 text-[13px] text-[#4F4941]">{section.points.map((item, i) => <li key={i}>• {cleanPortalText(item)}</li>)}</ul>}{Array.isArray(section.selectors) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">{section.selectors.map((sel, i) => <div key={i} className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-3"><p className="text-[10px] uppercase tracking-wide text-[#8A8A8A]">{cleanPortalText(sel.label || 'Selector')}</p><p className="text-[13px] font-semibold text-[#1F1B18] mt-0.5">{sel.selected ? cleanPortalText(sel.selected) : 'Not selected yet'}</p></div>)}</div>}{Array.isArray(section.rows) && <div className="overflow-x-auto"><table className="w-full text-[12px]"><tbody>{section.rows.map((row, i) => <tr key={i} className="border-t border-[#EEEAE0]">{Object.entries(row).map(([key, value]) => <td key={key} className="py-2 pr-4 align-top"><span className="block text-[#8A8A8A] uppercase text-[10px]">{cleanPortalText(key)}</span><span className="text-[#4F4941]">{cleanPortalText(value)}</span></td>)}</tr>)}</tbody></table></div>}{typeof onSectionComment === 'function' && <SectionCommentBox section={section} index={index} onSectionComment={onSectionComment} />}</div>)}</div>;
export const LoadingState = ({ label = 'Loading brand portal data...' }) => <div className="v3-card p-6 text-[13px] text-[#6B6258] flex items-center gap-2"><Clock3 className="w-4 h-4" />{label}</div>;
export const ErrorState = ({ error }) => <div className="v3-card p-6 text-[13px] text-[#B54A37]">{error}</div>;
export const DocumentIcon = ({ kind }) => { const Icon = kind === 'alignment' ? ShieldCheck : kind === 'strategy' ? FileText : kind === 'report' ? MessageSquare : Send; return <Icon className="w-4 h-4" />; };
