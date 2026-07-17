import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentIcon, ErrorState, LoadingState, SnapshotSections, approveDocument, brandContact, cleanPortalText, documentGroupsFromBundles, formatDate, sectionsFromSnapshot, sendDocumentComment, sendReportFeedback, sentenceCaseStatus, statusTone, useV1BrandPortalData } from './V1BrandPortalData';
import { v3AlignmentDocxUrl, v3ContractDocxUrl, v3FinalReportPdfUrl, v3PitchDeckDocxUrl, v3StrategySnapshotDocxUrl } from '../../lib/v3api';
import { PrioritySelect, PriorityTag } from '../../lib/snapshotPriority';

const downloadUrlFor = (doc) => { if (doc.kind === 'alignment' && doc.snapshot?.id) return v3AlignmentDocxUrl(doc.snapshot.id); if (doc.kind === 'strategy' && doc.snapshot?.id) return v3StrategySnapshotDocxUrl(doc.snapshot.id); if (doc.kind === 'contract' && doc.snapshot?.id) return v3ContractDocxUrl(doc.snapshot.id); if (doc.kind === 'pitch' && doc.snapshot?.id) return v3PitchDeckDocxUrl(doc.snapshot.id); if (doc.kind === 'report' && doc.snapshot?.id) return v3FinalReportPdfUrl(doc.snapshot.id); return ''; };

const DocumentReview = ({ kind, title, emptyLabel }) => {
  const data = useV1BrandPortalData();
  const [selectedId, setSelectedId] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const groups = useMemo(() => documentGroupsFromBundles(data.bundles), [data.bundles]);
  const docs = groups[kind] || [];
  const selected = docs.find((doc) => (doc.snapshot?.id || doc.businessCase?.id) === selectedId) || docs[0];
  const businessCase = selected?.businessCase || {};
  const author = brandContact(data.brand, data.session);
  if (data.loading) return <LoadingState />;
  if (data.error) return <ErrorState error={data.error} />;
  const sendComment = async () => { if (!selected) return; setBusy('comment'); try { if (kind === 'reports') await sendReportFeedback({ businessCase, brand: data.brand, author, feedback: comment }); else await sendDocumentComment({ kind: selected.kind, snapshot: selected.snapshot, businessCase, brand: data.brand, comment, author }); setComment(''); toast.success('Sent back to TASCK admin.'); data.reload(); } catch (e) { toast.error(e.message || 'Could not send comment.'); } finally { setBusy(''); } };
  // Per-section comment handler (Chioma request): every part of the document
  // gets its own comment box, so the brand comments on exactly that section.
  // Not for reports - those use the feedback flow instead.
  const sendSectionComment = kind === 'reports' ? undefined : async (section, sectionIndex, text) => {
    if (!selected) return;
    try {
      await sendDocumentComment({ kind: selected.kind, snapshot: selected.snapshot, businessCase, brand: data.brand, comment: text, author, sectionIndex, sectionHeading: section.heading || section.title || `Section ${sectionIndex + 1}` });
      toast.success('Comment on "' + cleanPortalText(section.heading || 'this section') + '" sent to TASCK admin.');
      data.reload();
    } catch (e) {
      toast.error(e.message || 'Could not send the section comment.');
      throw e;
    }
  };
  const approve = async () => { if (!selected) return; setBusy('approve'); try { await approveDocument({ kind: selected.kind, businessCase, author, snapshot: selected.snapshot }); toast.success('Approval sent to TASCK admin.'); data.reload(); } catch (e) { toast.error(e.message || 'Could not approve document.'); } finally { setBusy(''); } };
  return <div className="space-y-5" data-testid={'v1-brand-' + kind}><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Brand review</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1><p className="text-[13px] text-[#6B6258] mt-2">Review the real document TASCK shared with your brand, add comments where needed, and send the response back to admin.</p></div>{docs.length === 0 ? <div className="v3-card p-6 text-[13px] text-[#6B6258]">{emptyLabel}</div> : <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4"><div className="space-y-3">{docs.map((doc) => { const docId = doc.snapshot?.id || doc.businessCase?.id; return <button key={docId} onClick={() => setSelectedId(docId)} className={'v3-card p-4 text-left w-full hover:border-[#1F4A3A] ' + (selected === doc ? 'border-[#1F4A3A]' : '')}><div className="flex items-center gap-2 text-[#1F4A3A]"><DocumentIcon kind={doc.kind} /><span className="text-[12px] font-semibold">{doc.label}</span></div><p className="font-semibold text-[#1F1B18] mt-2">{doc.businessCase.title || 'Untitled project'}</p><div className="flex flex-wrap items-center gap-1.5 mt-3"><span className={'inline-flex rounded-full border px-2 py-1 text-[11px] ' + statusTone(doc.snapshot?.status)}>{sentenceCaseStatus(doc.snapshot?.status || 'draft')}</span><PriorityTag priority={doc.snapshot?.priority} /></div></button>; })}</div><div className="space-y-4"><div className="v3-card p-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{selected.label}</p><h2 className="text-xl font-semibold text-[#1F1B18] mt-1">{selected.businessCase.title || selected.snapshot?.title || 'TASCK document'}</h2><p className="text-[12px] text-[#6B6258] mt-1">Updated {formatDate(selected.snapshot?.updated_at || selected.snapshot?.generated_at || selected.businessCase.updated_at)}</p></div>{downloadUrlFor(selected) && <a href={downloadUrlFor(selected)} className="v3-btn-secondary" target="_blank" rel="noreferrer"><Download className="w-4 h-4" /> Download document</a>}</div>{kind === 'alignment' && selected.snapshot?.id && <div className="mt-4 pt-4 border-t border-[#F1ECDF] flex flex-wrap items-center gap-3"><PrioritySelect snapshotId={selected.snapshot.id} value={selected.snapshot.priority} actor="brand" onChange={(next, error) => { if (error) { toast.error('Could not save the priority.'); return; } toast.success('Priority saved. TASCK will work to this order.'); data.reload(); }} /><p className="text-[11px] text-[#8A8A8A]">Tell TASCK how urgent this project is so the team knows what to start first.</p></div>}</div><SnapshotSections sections={sectionsFromSnapshot(selected.snapshot)} onSectionComment={sendSectionComment} /><div className="v3-card p-5"><div className="flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-[#1F4A3A]" /><h3 className="font-semibold">Send response to TASCK admin</h3></div><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} className="w-full rounded-xl border border-[#E8E4DB] bg-white p-3 text-[13px] focus:outline-none focus:border-[#1F4A3A]" placeholder="Add brand comments, requested corrections, or feedback here..." /><div className="flex flex-wrap gap-2 mt-3"><button onClick={sendComment} disabled={busy === 'comment'} className="v3-btn-primary"><Send className="w-4 h-4" /> {busy === 'comment' ? 'Sending...' : 'Send back to admin'}</button>{kind !== 'reports' && <button onClick={approve} disabled={busy === 'approve'} className="v3-btn-secondary"><CheckCircle2 className="w-4 h-4" /> {busy === 'approve' ? 'Approving...' : 'Approve as brand'}</button>}</div>{Array.isArray(selected.snapshot?.brand_comments) && selected.snapshot.brand_comments.length > 0 && <div className="mt-4 rounded-xl bg-[#FAFAF7] border border-[#E8E4DB] p-3"><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-2">Previous brand comments</p>{selected.snapshot.brand_comments.map((item, index) => <p key={item.id || index} className="text-[12px] text-[#5C5C5C] border-t border-[#EEEAE0] py-2 first:border-t-0">{item.quoted_text && item.quoted_text !== 'Brand review' && <span className="font-semibold text-[#1F4A3A]">[{cleanPortalText(item.quoted_text)}] </span>}{cleanPortalText(item.comment || item.content || item)}</p>)}</div>}</div></div></div>}</div>;
};
export const V1BrandAlignmentSnapshot = () => <DocumentReview kind="alignment" title="Alignment Snapshot" emptyLabel="No Alignment Snapshot has been sent to this brand yet." />;
export const V1BrandStrategySnapshot = () => <DocumentReview kind="strategy" title="Strategy Snapshot" emptyLabel="No Strategy Snapshot has been sent to this brand yet." />;
export const V1BrandPitchDeck = () => <DocumentReview kind="pitch" title="Pitch Deck" emptyLabel="No Pitch Deck has been shared with this brand yet." />;
export const V1BrandContracts = () => <DocumentReview kind="contracts" title="Contracts" emptyLabel="No contract has been shared with this brand yet." />;
export const V1BrandReportsFeedback = () => <DocumentReview kind="reports" title="Reports & Feedback" emptyLabel="No report is ready for this brand yet." />;
export default V1BrandAlignmentSnapshot;
