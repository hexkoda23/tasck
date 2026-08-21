import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, RefreshCcw, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { v3AdminMessagesMarkRead, v3CreateInteraction, v3GetBrands, v3GetBusinessCase, v3ListBusinessCases, v3ListInteractions } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { brandName, cleanPortalText, formatDate, sentenceCaseStatus } from '../brand/V1BrandPortalData';

// Module-level cache so revisits render instantly (stale-while-revalidate).
let commsCache = null;

const V1AdminBrandCommunications = () => {
  const location = useLocation();
  // Deep-link support: /admin/brand-communications?brand=<id> preselects that
  // brand so admins landing here from a "New message from …" notification see
  // the sender's thread immediately without hunting through the list.
  const queryBrandId = new URLSearchParams(location.search || '').get('brand') || '';
  const [loading, setLoading] = useState(!commsCache);
  const [brands, setBrands] = useState(commsCache?.brands || []);
  const [bundles, setBundles] = useState(commsCache?.bundles || []);
  const [interactions, setInteractions] = useState(commsCache?.interactions || []);
  const [selectedBrand, setSelectedBrand] = useState(queryBrandId || commsCache?.brands?.[0]?.id || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    if (!commsCache) setLoading(true);
    try {
      const [brandList, caseList, interactionList] = await Promise.all([v3GetBrands(), v3ListBusinessCases(), v3ListInteractions()]);
      const cases = Array.isArray(caseList) ? caseList : [];
      const nextBrands = Array.isArray(brandList) ? brandList : [];
      const nextInteractions = Array.isArray(interactionList) ? interactionList : [];
      // Phase 1: reveal immediately - messages and interaction-based comments
      // render now; snapshot comments hydrate in the background below.
      setBrands(nextBrands);
      setInteractions(nextInteractions);
      setSelectedBrand((current) => current || queryBrandId || nextBrands[0]?.id || '');
      setLoading(false);
      // Phase 2: hydrate business-case bundles for snapshot comments.
      const hydrated = await Promise.all(cases.slice(0, 80).map(async (businessCase) => { try { return await v3GetBusinessCase(businessCase.id); } catch (e) { return { business_case: businessCase }; } }));
      setBundles(hydrated);
      commsCache = { brands: nextBrands, bundles: hydrated, interactions: nextInteractions };
    } catch (e) {
      toast.error(e.message || 'Could not load brand communications.');
      setLoading(false);
    }
  }, [queryBrandId]);
  useEffect(() => { reload(); }, [reload]);
  // Landing on the admin Messages page counts as "seen" - mark every unread
  // brand->admin message as read so the sidebar badge clears immediately.
  useEffect(() => { v3AdminMessagesMarkRead().catch(() => {}); }, []);
  // When the URL brand param changes (admin clicked a different notification),
  // sync the selection so the panel jumps to that sender's thread.
  useEffect(() => { if (queryBrandId) setSelectedBrand(queryBrandId); }, [queryBrandId]);
  const reviewItems = useMemo(() => { const items = []; bundles.forEach((bundle) => { const businessCase = bundle.business_case || {}; const brand = bundle.brand || brands.find((item) => item.id === businessCase.brand_id) || {}; (bundle.alignment_snapshot?.brand_comments || []).forEach((comment) => items.push({ id: comment.id || 'alignment-' + businessCase.id, kind: 'Alignment Snapshot', brand, businessCase, comment: comment.comment || comment.content, date: comment.created_at })); (bundle.creative_snapshot?.brand_comments || []).forEach((comment) => items.push({ id: comment.id || 'strategy-' + businessCase.id, kind: 'Strategy Snapshot', brand, businessCase, comment: comment.comment || comment.content, date: comment.created_at })); }); interactions.filter((item) => ['brand_contract_comment', 'brand_report_feedback', 'brand_document_comment', 'brand_message'].includes(item.type)).forEach((item) => { const brand = brands.find((b) => b.id === item.brand_id) || {}; items.push({ id: item.id, kind: sentenceCaseStatus(item.type), brand, businessCase: { id: item.business_case_id, title: item.title }, comment: item.content, date: item.date_iso }); }); return items.sort((a, b) => Date.parse(b.date || '') - Date.parse(a.date || '')); }, [brands, bundles, interactions]);
  const selectedMessages = interactions.filter((item) => item.brand_id === selectedBrand && (String(item.type || '').includes('message') || ['brand_contract_comment', 'brand_report_feedback'].includes(item.type)));
  const currentBrand = brands.find((brand) => brand.id === selectedBrand) || brands[0] || {};
  const sendMessage = async () => { if (!selectedBrand || !message.trim()) return; setBusy(true); try { await v3CreateInteraction({ brand_id: selectedBrand, type: 'admin_brand_message', title: 'Message from TASCK admin', author: 'TASCK admin', content: cleanPortalText(message) }); setMessage(''); toast.success('Message sent to brand portal.'); reload(); } catch (e) { toast.error(e.message || 'Message could not be sent.'); } finally { setBusy(false); } };
  return <div className="space-y-5" data-testid="v1-admin-brand-communications"><div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">V1 brand communications</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Brand comments and messages</h1><p className="text-[13px] text-[#6B6258] mt-2">Review brand comments on Alignment Snapshots, Strategy Snapshots, contracts, reports, and send messages to the correct brand account.</p></div><button onClick={reload} className="v3-btn-secondary"><RefreshCcw className="w-4 h-4" /> Refresh</button></div>{loading ? <div className="v3-card p-6 text-[13px] text-[#6B6258]">Loading brand communication trail...</div> : <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4"><div className="space-y-3">{reviewItems.length === 0 && <div className="v3-card p-6 text-[13px] text-[#6B6258]">No brand comments have been sent back yet.</div>}{reviewItems.map((item) => <div key={item.id} className="v3-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{item.kind}</p><h2 className="font-semibold text-[#1F1B18] mt-1">{brandName(item.brand)} · {item.businessCase.title || 'Project'}</h2></div><span className="text-[12px] text-[#8A8A8A]">{formatDate(item.date)}</span></div><p className="text-[13px] text-[#4F4941] leading-6 mt-3 whitespace-pre-wrap">{cleanPortalText(item.comment)}</p>{item.businessCase.id && <a href={adminRoute('/business-cases/' + item.businessCase.id)} className="v3-btn-secondary mt-3 inline-flex">Open business case</a>}</div>)}</div><div className="v3-card p-5 h-fit sticky top-20"><div className="flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-[#1F4A3A]" /><h2 className="font-semibold">Message a brand</h2></div><select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)} className="w-full rounded-lg border border-[#E8E4DB] bg-white p-2 text-[13px] mb-3">{brands.map((brand) => <option key={brand.id} value={brand.id}>{brandName(brand)}</option>)}</select><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full rounded-xl border border-[#E8E4DB] bg-white p-3 text-[13px] focus:outline-none focus:border-[#1F4A3A]" placeholder={'Write to ' + brandName(currentBrand) + '...'} /><button onClick={sendMessage} disabled={busy || !message.trim()} className="v3-btn-primary mt-3"><Send className="w-4 h-4" /> {busy ? 'Sending...' : 'Send message'}</button><div className="mt-5 space-y-3 max-h-[420px] overflow-y-auto">{selectedMessages.map((item) => <div key={item.id} className="rounded-xl border border-[#E8E4DB] bg-[#FAFAF7] p-3"><p className="text-[12px] font-semibold text-[#1F1B18]">{cleanPortalText(item.title)}</p><p className="text-[11px] text-[#8A8A8A] mt-1">{cleanPortalText(item.author)} · {formatDate(item.date_iso)}</p><p className="text-[12px] text-[#4F4941] mt-2">{cleanPortalText(item.content)}</p></div>)}</div></div></div>}</div>;
};
export default V1AdminBrandCommunications;
