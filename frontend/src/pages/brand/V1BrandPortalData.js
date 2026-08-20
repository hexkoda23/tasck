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

// One lifecycle for every brand-facing document - Alignment Snapshot, Pitch
// Deck, Creative Brief, Contract, Report. The raw backend status leaked
// through before ("Under Review", "Sent To Brand", "Not Ready Yet"), which
// read inconsistently and did not move when the brand acted.
//
//   Not ready  -> admin has not released it yet
//   Sent       -> admin sent it (to the brand page and/or by email)
//   In progress-> the brand replied and there is an open comment to action
//   Approved   -> signed off
//
// A re-send resolves the brand's open comments server-side, so a corrected
// document settles back on "Sent" rather than sticking on "In progress".
export const DOC_STATUS = { NOT_READY: 'Not ready', SENT: 'Sent', IN_PROGRESS: 'In progress', APPROVED: 'Approved' };

const hasOpenBrandComment = (doc) => Array.isArray(doc?.brand_comments)
  && doc.brand_comments.some((c) => {
    const status = String(c?.status || 'open').toLowerCase();
    return status === 'open' || status === '';
  });

export const documentStatusLabel = (doc) => {
  if (!doc) return DOC_STATUS.NOT_READY;
  const status = String(doc.status || '').toLowerCase();
  if (doc.brand_approved || doc.approved_at || status === 'approved') return DOC_STATUS.APPROVED;
  const released = Boolean(doc.sent_to_brand_at) || ['sent_to_brand', 'imported', 'sent'].includes(status);
  // The brand sending it back outranks "Sent": there is something to action.
  if (released && hasOpenBrandComment(doc)) return DOC_STATUS.IN_PROGRESS;
  if (released) return DOC_STATUS.SENT;
  return DOC_STATUS.NOT_READY;
};

export const documentStatusTone = (doc) => ({
  [DOC_STATUS.APPROVED]: 'border-[#C7D7CF] bg-[#E8F5ED] text-[#2E7D5B]',
  [DOC_STATUS.SENT]: 'border-[#C9D6EE] bg-[#EEF1F6] text-[#3A5BA0]',
  [DOC_STATUS.IN_PROGRESS]: 'border-[#E5C99A] bg-[#FBF4E4] text-[#7A5A1E]',
  [DOC_STATUS.NOT_READY]: 'border-[#E8E4DB] bg-white text-[#8A8A8A]',
}[documentStatusLabel(doc)]);
export const stageIndex = (stage) => Math.max(0, stageOrder.indexOf(stage || 'connect'));
export const bundleCase = (bundle) => bundle?.business_case || bundle?.businessCase || bundle?.case || bundle || {};
export const activityTime = (item) => { const bc = bundleCase(item); return Math.max(...[bc.updated_at, bc.last_interaction_at, bc.created_at, item?.updated_at, item?.created_at].map((v) => { const p = Date.parse(v || ''); return Number.isNaN(p) ? 0 : p; }), 0); };
export const projectValue = (bc) => { const value = bc?.estimated_value || bc?.value || bc?.total_value || bc?.budget; return value ? formatNairaV3(Number(value)) : 'Value pending'; };
export const projectProgress = (stage) => Math.round(((stageIndex(stage) + 1) / stageOrder.length) * 100);
export const projectSummary = (bundle) => { const bc = bundleCase(bundle); if (bc.stage === 'closed') return cleanPortalText('This project has been closed by TASCK. The final report, feedback, contracts, and approved documents remain available in this brand portal.'); return cleanPortalText(bc.next_action || bc.summary || bc.connect?.stated_intent || bc.description || 'TASCK is progressing this project with your team.'); };

// Module-level stale-while-revalidate cache: brandId -> last good payload.
// Every page navigation renders instantly from cache while a silent refresh
// runs in the background (no full-screen loader after the first visit).
const portalCache = new Map();
export const clearBrandPortalCache = () => portalCache.clear();

// A snapshot has only been "sent to brand" once admin explicitly clicks the
// "Send to Brand" action (which stamps `sent_to_brand_at` and sets status to
// `sent_to_brand` / `approved` on the server). Until that moment the doc is
// still an admin-only draft under review and MUST NOT surface anywhere in
// the brand portal (Chioma feedback, Feb 2026).
const isAlignmentVisibleToBrand = (snap) => {
  if (!snap) return false;
  if (snap.sent_to_brand_at) return true;
  const status = String(snap.status || '').toLowerCase();
  // Legacy statuses that also imply the snapshot is out-of-admin-review:
  // - 'approved' (already signed off, must remain visible to brand)
  // - 'imported' (bypass import stamps its own sent_to_brand_at, keep as a safety net)
  // - 'sent_to_brand' (explicit flag, sent_to_brand_at should exist but belt-and-braces)
  return status === 'approved' || status === 'imported' || status === 'sent_to_brand';
};

// The Pitch Deck follows the exact same rule: a generated deck is an
// admin-only draft until admin clicks "Send to brand page" (or emails it),
// which stamps `sent_to_brand_at` / `status: sent_to_brand` server-side.
const isPitchDeckVisibleToBrand = (deck) => {
  if (!deck) return false;
  if (deck.sent_to_brand_at) return true;
  const status = String(deck.status || '').toLowerCase();
  return status === 'approved' || status === 'imported' || status === 'sent_to_brand';
};

// Strip un-sent alignment snapshots and pitch decks off a bundle before it
// ever reaches any brand-portal render path. Rest of the bundle untouched.
const sanitizeBundleForBrand = (bundle) => {
  if (!bundle) return bundle;
  const sanitised = { ...bundle };
  if (Array.isArray(bundle.alignment_snapshots)) {
    sanitised.alignment_snapshots = bundle.alignment_snapshots.filter(isAlignmentVisibleToBrand);
  }
  if (bundle.alignment_snapshot && !isAlignmentVisibleToBrand(bundle.alignment_snapshot)) {
    sanitised.alignment_snapshot = null;
  }
  if (bundle.pitch_deck && !isPitchDeckVisibleToBrand(bundle.pitch_deck)) {
    sanitised.pitch_deck = null;
  }
  return sanitised;
};

export const useV1BrandPortalData = () => {
  const session = useMemo(() => getBrandPortalSession(), []);
  const brandId = session?.brandId || session?.brand_id;
  const [state, setState] = useState(() => {
    const cached = brandId ? portalCache.get(brandId) : null;
    return cached
      ? { loading: false, hydrated: true, error: '', ...cached }
      : { loading: true, hydrated: false, error: '', brand: null, brandBundle: null, businessCases: [], bundles: [], interactions: [] };
  });
  const reload = useCallback(async () => {
    if (!brandId) { setState({ loading: false, hydrated: true, error: 'Please sign in again so TASCK can identify your brand account.', brand: null, brandBundle: null, businessCases: [], bundles: [], interactions: [] }); return; }
    const hasCache = portalCache.has(brandId);
    if (!hasCache) setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [brandBundle, rawCases, rawInteractions] = await Promise.all([v3GetBrand(brandId), v3ListBusinessCases({ brand_id: brandId }), v3ListInteractions({ brand_id: brandId })]);
      const brand = brandBundle?.brand || brandBundle;
      const businessCases = Array.isArray(rawCases) ? rawCases : [];
      const interactions = Array.isArray(rawInteractions) ? rawInteractions : [];
      // Reveal core data immediately - messages/interactions don't need bundles.
      setState((current) => ({ ...current, loading: false, error: '', brand, brandBundle, businessCases, interactions }));
      const bundles = (await Promise.all(businessCases.map(async (businessCase) => { try { return await v3GetBusinessCase(businessCase.id); } catch (e) { return { business_case: businessCase, brand }; } }))).map(sanitizeBundleForBrand);
      bundles.sort((a, b) => activityTime(b) - activityTime(a));
      const fresh = { brand, brandBundle, businessCases, bundles, interactions };
      portalCache.set(brandId, fresh);
      setState({ loading: false, hydrated: true, error: '', ...fresh });
    } catch (e) {
      setState((current) => ({ ...current, loading: false, error: portalCache.has(brandId) ? current.error : (e?.response?.data?.detail || e.message || 'Brand portal data could not be loaded.') }));
    }
  }, [brandId]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, session, brandId, reload };
};

export const statusTone = (status) => { const key = String(status || '').toLowerCase(); if (key.includes('approve') || key.includes('sent') || key.includes('complete') || key.includes('signed')) return 'bg-[#DDE7E2] text-[#1F4A3A] border-[#C7D7CF]'; if (key.includes('review') || key.includes('pending') || key.includes('draft')) return 'bg-[#F2EAD8] text-[#7A5F23] border-[#E6D6B6]'; return 'bg-[#EEEAE0] text-[#5C5C5C] border-[#DDD6C8]'; };
export const documentGroupsFromBundles = (bundles) => { const groups = { alignment: [], strategy: [], pitch: [], contracts: [], reports: [] }; (bundles || []).forEach((bundle) => { const businessCase = bundleCase(bundle); const alignmentDocs = Array.isArray(bundle.alignment_snapshots) && bundle.alignment_snapshots.length ? bundle.alignment_snapshots : (bundle.alignment_snapshot ? [bundle.alignment_snapshot] : []); alignmentDocs.forEach((snap) => groups.alignment.push({ kind: 'alignment', label: snap.opportunity_title ? 'Alignment Snapshot - ' + snap.opportunity_title : 'Alignment Snapshot', snapshot: snap, businessCase, bundle })); if (bundle.creative_snapshot) groups.strategy.push({ kind: 'strategy', label: 'Strategy Snapshot', snapshot: bundle.creative_snapshot, businessCase, bundle }); if (bundle.pitch_deck) groups.pitch.push({ kind: 'pitch', label: 'Pitch Deck', snapshot: bundle.pitch_deck, businessCase, bundle }); if (bundle.contract) groups.contracts.push({ kind: 'contract', label: 'Contract', snapshot: bundle.contract, businessCase, bundle }); if (bundle.final_report) groups.reports.push({ kind: 'report', label: 'Report & Feedback', snapshot: bundle.final_report, businessCase, bundle }); }); Object.keys(groups).forEach((key) => groups[key].sort((a, b) => activityTime(b.bundle) - activityTime(a.bundle))); return groups; };
export const sectionsFromSnapshot = (snapshot) => { if (!snapshot) return []; if (Array.isArray(snapshot.sections) && snapshot.sections.length) return snapshot.sections; const sections = []; if (snapshot.title || snapshot.brand_header) sections.push({ heading: snapshot.title || snapshot.brand_header, content: snapshot.meta || snapshot.summary || snapshot.concept || '' }); if (snapshot.marketing_intelligence) Object.entries(snapshot.marketing_intelligence).forEach(([heading, value]) => sections.push({ heading: sentenceCaseStatus(heading), content: value })); if (snapshot.concept) sections.push({ heading: 'Concept', content: snapshot.concept }); if (Array.isArray(snapshot.deliverables)) sections.push({ heading: 'Deliverables', items: snapshot.deliverables.map((item) => cleanPortalText(item.title || item.format || item)) }); if (Array.isArray(snapshot.budget)) sections.push({ heading: 'Budget', rows: snapshot.budget.map((item) => ({ Line: item.line || item.title || 'Budget item', Amount: item.amount ? formatNairaV3(Number(item.amount)) : cleanPortalText(item.value || '') })) }); if (Array.isArray(snapshot.clauses)) sections.push({ heading: 'Agreement Clauses', items: snapshot.clauses.map((item) => cleanPortalText(item.title ? item.title + ': ' + item.body : item.body || item)) }); if (snapshot.body) sections.push({ heading: 'Contract Body', content: snapshot.body }); if (snapshot.summary) sections.push({ heading: 'Summary', content: snapshot.summary }); return sections.length ? sections : [{ heading: 'Document', content: emptyText }]; };
// Revision helpers: surface the revision number and the latest "what changed"
// summary so the brand page can flag a corrected snapshot distinctly. Rev 1
// snapshots (or older docs without revision tracking) report no revision.
export const snapshotRevision = (snapshot) => Number(snapshot?.revision_number) || 1;
export const latestRevisionInfo = (snapshot) => {
  if (!snapshot) return null;
  const revs = Array.isArray(snapshot.revisions) ? snapshot.revisions : [];
  if (!revs.length) return null;
  return revs[revs.length - 1];
};

// sectionIndex / sectionHeading are optional: when the brand comments on a
// specific part of the document (per-section comment boxes), we thread the
// section through so admin sees exactly which part the comment refers to.
export const sendDocumentComment = ({ kind, snapshot, businessCase, brand, comment, author, sectionIndex, sectionHeading }) => { const cleanComment = cleanPortalText(comment); if (!cleanComment) throw new Error('Add a comment before sending it back to TASCK.'); const quoted = cleanPortalText(sectionHeading || '') || 'Brand review'; const idx = Number.isInteger(sectionIndex) ? sectionIndex : 0; if (kind === 'alignment') return v3AddAlignmentComment(snapshot.id, { section_index: idx, quoted_text: quoted, comment: cleanComment, author }); if (kind === 'strategy') return v3AddStrategySnapshotComment(snapshot.id, { section_index: idx, quoted_text: quoted, comment: cleanComment, author }); if (kind === 'pitch') return v3AddPitchDeckComment(snapshot.id, { section_index: idx, quoted_text: quoted, comment: cleanComment, author }); return v3CreateInteraction({ brand_id: businessCase.brand_id || brand?.id, business_case_id: businessCase.id, type: kind === 'contract' ? 'brand_contract_comment' : 'brand_document_comment', title: sentenceCaseStatus(kind) + ' comment from brand' + (sectionHeading ? ' - ' + cleanPortalText(sectionHeading) : ''), author, content: (sectionHeading ? '[' + cleanPortalText(sectionHeading) + '] ' : '') + cleanComment }); };
export const approveDocument = ({ kind, businessCase, author, snapshot }) => { if (kind === 'alignment') return v3ApproveAlignmentAs(businessCase.id, author, 'brand', snapshot?.id); if (kind === 'strategy') return v3ApproveSnapshot(businessCase.id, author, 'brand'); if (kind === 'pitch') return v3ApprovePitchDeckAs(businessCase.id, author, 'brand'); return v3CreateInteraction({ brand_id: businessCase.brand_id, business_case_id: businessCase.id, type: 'brand_document_approval', title: sentenceCaseStatus(kind) + ' approved by brand', author, content: 'Brand approved this document from the V1 brand portal.' }); };
export const sendReportFeedback = async ({ businessCase, brand, author, feedback }) => { const cleanFeedback = cleanPortalText(feedback); if (!cleanFeedback) throw new Error('Add feedback before sending it to TASCK.'); await v3SubmitBrandFeedback(businessCase.id, { rater: author, scores: { clarity: 10, representation: 10, coordination: 10, professionalism: 10, overall: 10 }, comment: cleanFeedback }); return v3CreateInteraction({ brand_id: businessCase.brand_id || brand?.id, business_case_id: businessCase.id, type: 'brand_report_feedback', title: 'Report feedback from brand', author, content: cleanFeedback }); };

export const BrandIdentityCard = ({ brand, session, compact = false }) => { return <div className={'v3-card ' + (compact ? 'p-4' : 'p-5')}><div className="flex items-start gap-4"><SharedBrandLogo name={brandName(brand)} candidates={brandLogoCandidates(brand)} containerClassName="w-16 h-16 rounded-xl border border-[#E8E4DB] bg-white overflow-hidden flex items-center justify-center shrink-0" imgClassName="w-full h-full object-contain p-1.5" initialsClassName="text-lg font-bold text-[#1F4A3A]" /><div className="min-w-0"><p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Signed-in brand</p><h2 className="v3-heading text-2xl break-words" style={{ fontFamily: "'Fraunces', serif" }}>{brandName(brand)}</h2><p className="text-[13px] text-[#6B6258] mt-1">{brandIndustry(brand)} · {brandContact(brand, session)}</p>{!compact && <p className="text-[13px] text-[#5C5C5C] mt-3 leading-6">{brandAbout(brand)}</p>}</div></div></div>; };
// "Closed" is intentionally not shown to brands (client feedback, Aug 2026):
// it is an internal end-state, not a phase a brand is working through. It
// stays in `stageOrder` so stageIndex/projectProgress keep working for closed
// projects - it is only dropped from the rail the brand sees.
export const brandVisibleStages = stageOrder.filter((item) => item !== 'closed');
export const ProjectStageRail = ({ stage }) => { const current = stageIndex(stage); return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">{brandVisibleStages.map((item, index) => <div key={item} className={'rounded-lg border px-3 py-2 text-[12px] ' + (index < current ? 'border-[#C7D7CF] bg-[#EEF5F1] text-[#1F4A3A]' : index === current ? 'border-[#C49B5F] bg-[#F7EFE1] text-[#7A5F23]' : 'border-[#E8E4DB] bg-white text-[#8A8A8A]')}><div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />{stageLabel(item)}</div></div>)}</div>; };
// Per-section comment box (brand portal). Rendered below EVERY section of a
// document when SnapshotSections is given an onSectionChange handler, so the
// brand can comment on each part individually. There is NO send button here
// any more - every section draft is collected at the page level and submitted
// together by the single "Send back to admin" button at the bottom of the page
// (Chioma feedback: one send button, not one per section).
const SectionCommentBox = ({ section, index, value, onChange }) => {
  const heading = cleanPortalText(section.heading || section.title || `Section ${index + 1}`);
  return (
    <div className="mt-3 border-t border-[#EEEAE0] pt-3" data-testid={`section-comment-${index}`}>
      <p className="text-[10px] uppercase tracking-wide text-[#8A8A8A] mb-1.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Comment</p>
      <textarea
        value={value || ''}
        onChange={(event) => onChange(index, event.target.value)}
        rows={2}
        className="w-full rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-2.5 text-[12px] focus:outline-none focus:border-[#1F4A3A]"
        placeholder={`Add a comment about "${heading}"...`}
        data-testid={`section-comment-input-${index}`}
      />
    </div>
  );
};

export const SnapshotSections = ({ sections, sectionDrafts, onSectionChange }) => <div className="space-y-4">{(sections?.length ? sections : [{ heading: 'Document', content: emptyText }]).map((section, index) => <div key={(section.heading || 'section') + index} className="rounded-xl border border-[#E8E4DB] bg-white p-4"><h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#1F4A3A] mb-2">{cleanPortalText(section.heading || section.title || 'Section')}</h3>{section.content && <p className="text-[13px] leading-6 text-[#4F4941] whitespace-pre-wrap">{cleanPortalText(section.content)}</p>}{Array.isArray(section.items) && <ul className="space-y-2 text-[13px] text-[#4F4941]">{section.items.map((item, i) => <li key={i}>• {cleanPortalText(item.title ? item.title + ': ' + (item.detail || item.description || '') : item)}</li>)}</ul>}{Array.isArray(section.points) && <ul className="space-y-2 text-[13px] text-[#4F4941]">{section.points.map((item, i) => <li key={i}>• {cleanPortalText(item)}</li>)}</ul>}{Array.isArray(section.selectors) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">{section.selectors.map((sel, i) => <div key={i} className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-3"><p className="text-[10px] uppercase tracking-wide text-[#8A8A8A]">{cleanPortalText(sel.label || 'Selector')}</p><p className="text-[13px] font-semibold text-[#1F1B18] mt-0.5">{sel.selected ? cleanPortalText(sel.selected) : 'Not selected yet'}</p></div>)}</div>}{Array.isArray(section.rows) && <div className="overflow-x-auto"><table className="w-full text-[12px]"><tbody>{section.rows.map((row, i) => <tr key={i} className="border-t border-[#EEEAE0]">{Object.entries(row).map(([key, value]) => <td key={key} className="py-2 pr-4 align-top"><span className="block text-[#8A8A8A] uppercase text-[10px]">{cleanPortalText(key)}</span><span className="text-[#4F4941]">{cleanPortalText(value)}</span></td>)}</tr>)}</tbody></table></div>}{typeof onSectionChange === 'function' && <SectionCommentBox section={section} index={index} value={sectionDrafts ? sectionDrafts[index] : ''} onChange={onSectionChange} />}</div>)}</div>;
export const LoadingState = ({ label = 'Loading brand portal data...' }) => <div className="v3-card p-6 text-[13px] text-[#6B6258] flex items-center gap-2"><Clock3 className="w-4 h-4" />{label}</div>;
export const ErrorState = ({ error }) => <div className="v3-card p-6 text-[13px] text-[#B54A37]">{error}</div>;
export const DocumentIcon = ({ kind }) => { const Icon = kind === 'alignment' ? ShieldCheck : kind === 'strategy' ? FileText : kind === 'report' ? MessageSquare : Send; return <Icon className="w-4 h-4" />; };

// ---------------------------------------------------------------------------
// Brand → Admin communication history
// ---------------------------------------------------------------------------
// Aggregates every message the brand has sent to TASCK (per-section comments
// on alignment / strategy / pitch snapshots + the free-text feedback sent
// from the Reports & Feedback page). Each row carries a status: "Fixed" once
// TASCK has resolved the comment or once TASCK has sent a newer revision of
// the same document (implicit fix); otherwise "Awaiting TASCK".
// Used by the Reports & Feedback page so the brand can see a single history
// of what they've raised and whether admin has acted on it.
export const collectBrandSentHistory = (bundles) => {
  const rows = [];
  (bundles || []).forEach((bundle) => {
    const businessCase = bundleCase(bundle);
    const caseTitle = cleanPortalText(businessCase?.title || 'Untitled project');

    const alignmentDocs = Array.isArray(bundle.alignment_snapshots) && bundle.alignment_snapshots.length
      ? bundle.alignment_snapshots
      : (bundle.alignment_snapshot ? [bundle.alignment_snapshot] : []);
    alignmentDocs.forEach((snap) => {
      const currentRev = Number(snap?.revision_number) || 1;
      (snap?.brand_comments || []).forEach((c) => {
        if (String(c.author || '').toLowerCase() === 'admin') return;
        const isResolved = String(c.status || '').toLowerCase() === 'resolved';
        // Implicit fix: TASCK sent a newer revision after this comment was raised.
        const olderThanRev = Number(c.revision) && Number(c.revision) < currentRev;
        rows.push({
          id: `alignment:${snap.id}:${c.id || c.created_at}`,
          kind: 'alignment',
          docLabel: snap.opportunity_title ? 'Alignment Snapshot - ' + snap.opportunity_title : 'Alignment Snapshot',
          projectTitle: caseTitle,
          section: cleanPortalText(c.quoted_text || 'Brand review'),
          comment: cleanPortalText(c.comment || ''),
          sentAt: c.created_at || null,
          resolved: isResolved || olderThanRev,
          resolvedAt: c.resolved_at || null,
          resolvedNote: olderThanRev && !isResolved ? `Addressed in revised document (Rev ${currentRev}).` : null,
        });
      });
    });

    if (bundle.creative_snapshot) {
      (bundle.creative_snapshot.brand_comments || []).forEach((c) => {
        if (String(c.author || '').toLowerCase() === 'admin') return;
        rows.push({
          id: `strategy:${bundle.creative_snapshot.id}:${c.id || c.created_at}`,
          kind: 'strategy',
          docLabel: 'Strategy Snapshot',
          projectTitle: caseTitle,
          section: cleanPortalText(c.quoted_text || 'Brand review'),
          comment: cleanPortalText(c.comment || ''),
          sentAt: c.created_at || null,
          resolved: String(c.status || '').toLowerCase() === 'resolved',
          resolvedAt: c.resolved_at || null,
          resolvedNote: null,
        });
      });
    }

    if (bundle.pitch_deck) {
      (bundle.pitch_deck.brand_comments || []).forEach((c) => {
        if (String(c.author || '').toLowerCase() === 'admin') return;
        rows.push({
          id: `pitch:${bundle.pitch_deck.id}:${c.id || c.created_at}`,
          kind: 'pitch',
          docLabel: 'Pitch Deck',
          projectTitle: caseTitle,
          section: cleanPortalText(c.quoted_text || 'Brand review'),
          comment: cleanPortalText(c.comment || ''),
          sentAt: c.created_at || null,
          resolved: String(c.status || '').toLowerCase() === 'resolved',
          resolvedAt: c.resolved_at || null,
          resolvedNote: null,
        });
      });
    }

    // Report feedback (submitted via the Reports & Feedback page).
    const reportFb = (businessCase?.closure || {}).brand_feedback;
    if (reportFb?.comment) {
      const reportSent = Boolean(bundle?.final_report?.report_sent_at);
      rows.push({
        id: `feedback:${businessCase.id}:${reportFb.received_at || 'x'}`,
        kind: 'feedback',
        docLabel: 'Report Feedback',
        projectTitle: caseTitle,
        section: 'Final report response',
        comment: cleanPortalText(reportFb.comment),
        sentAt: reportFb.received_at || null,
        // Report feedback is one-way to admin. Mark as "delivered" once the
        // final report on this case shows the admin has already sent theirs
        // (i.e. the loop closed).
        resolved: reportSent,
        resolvedAt: bundle?.final_report?.report_sent_at || null,
        resolvedNote: reportSent ? 'Received by TASCK.' : null,
      });
    }
  });

  rows.sort((a, b) => (String(b.sentAt || '')).localeCompare(String(a.sentAt || '')));
  return rows;
};

// Renders the aggregated history above (or an empty state).
export const BrandSentHistory = ({ bundles }) => {
  const rows = useMemo(() => collectBrandSentHistory(bundles), [bundles]);
  if (!rows.length) {
    return (
      <div className="v3-card p-5" data-testid="brand-sent-history-empty">
        <div className="flex items-center gap-2 mb-1"><MessageSquare className="w-4 h-4 text-[#1F4A3A]" /><h3 className="font-semibold">Comments you&apos;ve sent to TASCK</h3></div>
        <p className="text-[12px] text-[#6B6258]">Nothing yet. Comments you send from the Alignment Snapshot, Strategy Snapshot, Pitch Deck, or Reports &amp; Feedback pages will show here so you can track what TASCK has actioned.</p>
      </div>
    );
  }
  const openCount = rows.filter((r) => !r.resolved).length;
  const fixedCount = rows.length - openCount;
  return (
    <div className="v3-card p-5" data-testid="brand-sent-history">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#1F4A3A]" />
          <h3 className="font-semibold">Comments you&apos;ve sent to TASCK</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="rounded-full border border-[#E5C99A] bg-[#FBF4E4] text-[#7A5A1E] px-2 py-0.5">Awaiting TASCK: {openCount}</span>
          <span className="rounded-full border border-[#A4D4B0] bg-[#DDF0E1] text-[#1F6B3A] px-2 py-0.5">Fixed / received: {fixedCount}</span>
        </div>
      </div>
      <p className="text-[12px] text-[#6B6258] mb-3">Every comment or feedback you&apos;ve sent from your brand portal. Rows tagged <strong>Fixed</strong> mean TASCK has addressed the point (either by resolving the comment or by sending a revised document).</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className={'rounded-lg border p-3 ' + (row.resolved ? 'border-[#A4D4B0] bg-[#F1F7F3]' : 'border-[#E5C99A] bg-[#FBF4E4]')} data-testid={`brand-sent-history-row-${row.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-[#1A1A1A]">
                {row.docLabel} · <span className="font-normal text-[#6B6258]">{row.projectTitle}</span>
              </p>
              <span className={'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + (row.resolved ? 'border-[#A4D4B0] bg-[#DDF0E1] text-[#1F6B3A]' : 'border-[#E5C99A] bg-white text-[#7A5A1E]')}>
                {row.resolved ? (<><CheckCircle2 className="w-3 h-3" /> Fixed</>) : (<><Clock3 className="w-3 h-3" /> Awaiting TASCK</>)}
              </span>
            </div>
            <p className="text-[11px] text-[#8A8A8A] mt-0.5">
              Section: <span className="text-[#5C5C5C]">{row.section}</span>
              {row.sentAt && <> · sent {formatDate(row.sentAt)}</>}
              {row.resolved && row.resolvedAt && <> · fixed {formatDate(row.resolvedAt)}</>}
            </p>
            {row.comment && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#1A1A1A] bg-white border border-[#E8E4DB] rounded-md px-3 py-2">{row.comment}</p>}
            {row.resolvedNote && <p className="mt-1 text-[11px] text-[#1F6B3A]">{row.resolvedNote}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
