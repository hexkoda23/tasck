import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentIcon, ErrorState, LoadingState, SnapshotSections, approveDocument, brandContact, BrandSentHistory, cleanPortalText, documentGroupsFromBundles, formatDate, latestRevisionInfo, sectionsFromSnapshot, sendDocumentComment, sendReportFeedback, sentenceCaseStatus, snapshotRevision, documentStatusLabel, documentStatusTone, useV1BrandPortalData } from './V1BrandPortalData';
import { v3AlignmentDocxUrl, v3ContractDocxUrl, v3FinalReportPdfUrl, v3PitchDeckDocxUrl, v3StrategySnapshotDocxUrl, v3MarkAlignmentViewed } from '../../lib/v3api';
import { PrioritySelect, PriorityTag } from '../../lib/snapshotPriority';
import { PitchDeckFlipbookEmbed } from '../../components/v1/PitchDeckFlipbook';
import { TtaLetterhead } from '../../components/v1/TtaLetterhead';

const downloadUrlFor = (doc) => { if (doc.kind === 'alignment' && doc.snapshot?.id) return v3AlignmentDocxUrl(doc.snapshot.id); if (doc.kind === 'strategy' && doc.snapshot?.id) return v3StrategySnapshotDocxUrl(doc.snapshot.id); if (doc.kind === 'contract' && doc.snapshot?.id) return v3ContractDocxUrl(doc.snapshot.id); if (doc.kind === 'pitch' && doc.snapshot?.id) return v3PitchDeckDocxUrl(doc.snapshot.id); if (doc.kind === 'report' && doc.snapshot?.id) return v3FinalReportPdfUrl(doc.snapshot.id); return ''; };

const DocumentReview = ({ kind, title, emptyLabel }) => {
  const data = useV1BrandPortalData();
  const [selectedId, setSelectedId] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const [sectionDrafts, setSectionDrafts] = useState({});
  const groups = useMemo(() => documentGroupsFromBundles(data.bundles), [data.bundles]);
  const docs = groups[kind] || [];
  const selected = docs.find((doc) => (doc.snapshot?.id || doc.businessCase?.id) === selectedId) || docs[0];
  const businessCase = selected?.businessCase || {};
  const author = brandContact(data.brand, data.session);
  const setSectionDraft = (index, value) => setSectionDrafts((current) => ({ ...current, [index]: value }));
  // Reset the in-progress drafts whenever the brand switches document, so a
  // per-section draft keyed by index on one document never leaks into another
  // document's section at the same index. Declared before the early returns
  // below so the hook order stays stable across renders.
  const selectedDocKey = selected?.snapshot?.id || selected?.businessCase?.id || '';
  useEffect(() => {
    setSectionDrafts({});
    setComment('');
  }, [selectedDocKey]);
  // Tell the backend the brand opened this snapshot (idempotent: only the
  // first open is recorded, so admin sees "brand viewed" immediately). Placed
  // before the early returns so the hook order stays stable across renders.
  useEffect(() => {
    if (selected?.kind === 'alignment' && selected?.snapshot?.id) {
      v3MarkAlignmentViewed(businessCase.id, selected.snapshot.id, author).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.snapshot?.id, selected?.kind]);
  if (data.loading || !data.hydrated) return <LoadingState />;
  if (data.error) return <ErrorState error={data.error} />;
  // Revision display: Rev 1 (or older docs without tracking) shows no badge.
  // Rev >= 2 means TASCK sent a corrected version - show a distinct banner,
  // a unique "(Rev N)" title suffix, and the list of changed sections.
  const revision = snapshotRevision(selected?.snapshot);
  const isRevised = kind === 'alignment' && revision >= 2;
  const revisionInfo = isRevised ? latestRevisionInfo(selected?.snapshot) : null;
  const changedSections = Array.isArray(revisionInfo?.changed_sections) ? revisionInfo.changed_sections : [];
  // Show the title admin actually set on the document (the "Snapshot title"
  // field on the admin page), not the business-case/project name. Admin edits
  // this per document, so it is what the brand should see; the project title
  // is only a fallback for older documents that never had one set.
  const snapshotTitle = (selected?.snapshot?.title || selected?.businessCase?.title || 'TASCK document') + (isRevised ? ` (Rev ${revision})` : '');
  const sendComment = async () => {
    if (!selected) return;
    setBusy('comment');
    try {
      if (kind === 'reports') {
        await sendReportFeedback({ businessCase, brand: data.brand, author, feedback: comment });
      } else {
        // Collect every per-section draft the brand filled in and send each
        // as its own tagged comment, then the bottom-box comment last. One
        // send button submits everything at once (Chioma feedback).
        const sections = sectionsFromSnapshot(selected.snapshot) || [];
        const filled = sections
          .map((section, index) => ({ section, index, text: String(sectionDrafts[index] || '').trim() }))
          .filter((entry) => entry.text);
        for (const entry of filled) {
          await sendDocumentComment({ kind: selected.kind, snapshot: selected.snapshot, businessCase, brand: data.brand, comment: entry.text, author, sectionIndex: entry.index, sectionHeading: entry.section.heading || entry.section.title || `Section ${entry.index + 1}` });
        }
        if (comment.trim()) {
          await sendDocumentComment({ kind: selected.kind, snapshot: selected.snapshot, businessCase, brand: data.brand, comment, author });
        }
        if (!filled.length && !comment.trim()) {
          toast.error('Add a comment before sending it back to TASCK.');
          return;
        }
      }
      setComment('');
      setSectionDrafts({});
      toast.success('Sent back to TASCK admin.');
      data.reload();
    } catch (e) {
      toast.error(e.message || 'Could not send comment.');
    } finally {
      setBusy('');
    }
  };
  const approve = async () => { if (!selected) return; setBusy('approve'); try { await approveDocument({ kind: selected.kind, businessCase, author, snapshot: selected.snapshot }); toast.success('Approval sent to TASCK admin.'); data.reload(); } catch (e) { toast.error(e.message || 'Could not approve document.'); } finally { setBusy(''); } };
  // A snapshot is "brand approved" only when the BRAND themselves approved it
  // (snapshot.brand_approved). Before that, the status pill must not read
  // "Approved" - it should prompt the brand to approve (or show pending).
  const brandApproved = Boolean(selected?.snapshot?.brand_approved);
  // Imported snapshots come from projects that finished the alignment stage
  // outside TASCK. The brand can view + download them but must not be able to
  // approve, comment, or send anything back - the stage has already passed.
  const isImportedAlignment = kind === 'alignment' && Boolean(selected?.snapshot?.imported);
  return <div className="space-y-5" data-testid={'v1-brand-' + kind}><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Brand review</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1><p className="text-[13px] text-[#6B6258] mt-2">Review the real document TASCK shared with your brand, add comments where needed, and send the response back to admin.</p></div>{kind === 'reports' && <BrandSentHistory bundles={data.bundles} />}{docs.length === 0 ? <div className="v3-card p-6 text-[13px] text-[#6B6258]">{emptyLabel}</div> : <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4"><div className="space-y-3">{docs.map((doc) => { const docId = doc.snapshot?.id || doc.businessCase?.id; return <button key={docId} onClick={() => setSelectedId(docId)} className={'v3-card p-4 text-left w-full hover:border-[#1F4A3A] ' + (selected === doc ? 'border-[#1F4A3A]' : '')}><div className="flex items-center gap-2 text-[#1F4A3A]"><DocumentIcon kind={doc.kind} /><span className="text-[12px] font-semibold">{doc.label}</span></div><p className="font-semibold text-[#1F1B18] mt-2">{doc.snapshot?.title || doc.businessCase.title || 'Untitled project'}</p><div className="flex flex-wrap items-center gap-1.5 mt-3"><span className={'inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ' + documentStatusTone(doc.snapshot)}>{documentStatusLabel(doc.snapshot)}</span><PriorityTag priority={doc.snapshot?.priority} /></div></button>; })}</div><div className="space-y-4">{isImportedAlignment && <div className="v3-card p-4 border-2 border-[#8A6B2F] bg-[#FBF4E4]" data-testid="alignment-imported-banner"><div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#8A6B2F] mt-0.5 flex-shrink-0" /><div><p className="text-[13px] font-bold text-[#5C4713] flex items-center gap-2">IMPORTED PROJECT<span className="text-[11px] font-medium text-[#8A6B2F] bg-white border border-[#E5D5AA] rounded-full px-2 py-0.5">Read-only</span></p><p className="text-[12px] text-[#5C4713] mt-1">This project was imported into TASCK after alignment was already completed outside the platform. The snapshot below is on your records for reference. Approval was captured outside TASCK, so no action is required from you here.</p></div></div></div>}{isRevised && <div className="v3-card p-4 border-2 border-[#3A5BA0] bg-[#EEF1F6]" data-testid="alignment-revised-banner"><div className="flex items-start gap-3"><RefreshCw className="w-5 h-5 text-[#3A5BA0] mt-0.5 flex-shrink-0" /><div><p className="text-[13px] font-bold text-[#28406B] flex items-center gap-2">REVISED - Rev {revision}<span className="text-[11px] font-medium text-[#3A5BA0] bg-white border border-[#C9D6EE] rounded-full px-2 py-0.5">Updated by TASCK</span></p><p className="text-[12px] text-[#3A5BA0] mt-1">TASCK updated this Alignment Snapshot based on your comments. Please re-check the changed sections below, then approve or add a new comment.</p>{changedSections.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{changedSections.map((name, i) => <span key={i} className="text-[11px] bg-white border border-[#C9D6EE] text-[#3A5BA0] rounded-md px-2 py-0.5 font-medium">Updated: {cleanPortalText(name)}</span>)}</div>}</div></div></div>}<div className="v3-card p-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{selected.label}{isRevised && <span className="ml-1 text-[#3A5BA0]">· Rev {revision}</span>}{isImportedAlignment && <span className="ml-1 text-[#8A6B2F]">· Imported</span>}</p><h2 className="text-xl font-semibold text-[#1F1B18] mt-1">{snapshotTitle}</h2><p className="text-[12px] text-[#6B6258] mt-1">Updated {formatDate(selected.snapshot?.updated_at || selected.snapshot?.sent_to_brand_at || selected.snapshot?.generated_at || selected.businessCase.updated_at)}</p></div>{downloadUrlFor(selected) && <a href={downloadUrlFor(selected)} className="v3-btn-secondary" target="_blank" rel="noreferrer"><Download className="w-4 h-4" /> Download document</a>}</div>{kind === 'alignment' && selected.snapshot?.id && !isImportedAlignment && <div className="mt-4 pt-4 border-t border-[#F1ECDF] flex flex-wrap items-center gap-3"><PrioritySelect snapshotId={selected.snapshot.id} value={selected.snapshot.priority} actor="brand" onChange={(next, error) => { if (error) { toast.error('Could not save the priority.'); return; } toast.success('Priority saved. TASCK will work to this order.'); data.reload(); }} /><p className="text-[11px] text-[#8A8A8A]">Tell TASCK how urgent this project is so the team knows what to start first.</p></div>}</div>{kind === 'pitch' ? <PitchDeckFlipbookEmbed deckId={selected.snapshot?.id} /> : (kind === 'alignment' ? <TtaLetterhead title={snapshotTitle}><SnapshotSections sections={sectionsFromSnapshot(selected.snapshot)} sectionDrafts={sectionDrafts} onSectionChange={setSectionDraft} /></TtaLetterhead> : <SnapshotSections sections={sectionsFromSnapshot(selected.snapshot)} sectionDrafts={sectionDrafts} onSectionChange={setSectionDraft} />)}{isImportedAlignment ? <div className="v3-card p-4 text-[12px] text-[#6B6258]" data-testid="alignment-imported-notice">This snapshot is on your records for reference only - no approval or comments are collected here because alignment was completed before this project was imported into TASCK.</div> : <div className="v3-card p-5"><div className="flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-[#1F4A3A]" /><h3 className="font-semibold">Send response to TASCK admin</h3></div><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} className="w-full rounded-xl border border-[#E8E4DB] bg-white p-3 text-[13px] focus:outline-none focus:border-[#1F4A3A]" placeholder="Add brand comments, requested corrections, or feedback here..." /><div className="flex flex-wrap gap-2 mt-3"><button onClick={sendComment} disabled={busy === 'comment'} className="v3-btn-primary"><Send className="w-4 h-4" /> {busy === 'comment' ? 'Sending...' : 'Send back to admin'}</button>{kind !== 'reports' && <button onClick={approve} disabled={busy === 'approve' || brandApproved} className={"v3-btn-secondary" + (brandApproved ? " opacity-70 cursor-default" : "")}><CheckCircle2 className="w-4 h-4" /> {brandApproved ? "Approved ✓" : (busy === 'approve' ? 'Approving...' : 'Approve')}</button>}</div>{brandApproved && <p className="text-[11px] text-[#1F4A3A] mt-2">You approved this on {formatDate(selected.snapshot?.brand_approved_at)}. TASCK will move it to the next phase once they confirm.</p>}{Array.isArray(selected.snapshot?.brand_comments) && selected.snapshot.brand_comments.length > 0 && <div className="mt-4 rounded-xl bg-[#FAFAF7] border border-[#E8E4DB] p-3"><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-2">Previous brand comments</p>{selected.snapshot.brand_comments.map((item, index) => <p key={item.id || index} className="text-[12px] text-[#5C5C5C] border-t border-[#EEEAE0] py-2 first:border-t-0">{Number(item.revision) > 0 && <span className="text-[10px] font-semibold text-[#3A5BA0] bg-[#EEF1F6] border border-[#C9D6EE] rounded px-1.5 py-0.5 mr-1.5">Rev {item.revision}</span>}{item.status && item.status !== 'open' && <span className="text-[10px] font-semibold text-[#2E7D5B] bg-[#E8F5ED] border border-[#C7D7CF] rounded px-1.5 py-0.5 mr-1.5">{sentenceCaseStatus(item.status)}</span>}{item.quoted_text && item.quoted_text !== 'Brand review' && <span className="font-semibold text-[#1F4A3A]">[{cleanPortalText(item.quoted_text)}] </span>}{cleanPortalText(item.comment || item.content || item)}</p>)}</div>}</div>}</div></div>}</div>;
};
export const V1BrandAlignmentSnapshot = () => <DocumentReview kind="alignment" title="Alignment Snapshot" emptyLabel="No Alignment Snapshot has been sent to this brand yet." />;
export const V1BrandStrategySnapshot = () => <DocumentReview kind="strategy" title="Strategy Snapshot" emptyLabel="No Strategy Snapshot has been sent to this brand yet." />;
export const V1BrandPitchDeck = () => <DocumentReview kind="pitch" title="Pitch Deck" emptyLabel="No Pitch Deck has been shared with this brand yet." />;
export const V1BrandContracts = () => <DocumentReview kind="contracts" title="Contracts" emptyLabel="No contract has been shared with this brand yet." />;
export const V1BrandReportsFeedback = () => <DocumentReview kind="reports" title="Reports & Feedback" emptyLabel="No report is ready for this brand yet." />;
export default V1BrandAlignmentSnapshot;
