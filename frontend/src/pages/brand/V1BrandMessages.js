import React, { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { v3CreateInteraction } from '../../lib/v3api';
import { ErrorState, LoadingState, brandContact, brandName, cleanPortalText, formatDate, useV1BrandPortalData } from './V1BrandPortalData';

const messageTypes = new Set(['brand_message', 'admin_brand_message', 'brand_contract_comment', 'brand_report_feedback', 'brand_document_comment']);
const V1BrandMessages = () => {
  const data = useV1BrandPortalData();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const messages = useMemo(() => (data.interactions || []).filter((item) => messageTypes.has(item.type) || String(item.type || '').includes('message')), [data.interactions]);
  if (data.loading) return <LoadingState />;
  if (data.error) return <ErrorState error={data.error} />;
  const send = async () => { const clean = cleanPortalText(message); if (!clean) return; setBusy(true); try { await v3CreateInteraction({ brand_id: data.brandId, type: 'brand_message', title: 'Message from ' + brandName(data.brand), author: brandContact(data.brand, data.session), content: clean }); setMessage(''); toast.success('Message sent to TASCK admin.'); data.reload(); } catch (e) { toast.error(e.message || 'Message could not be sent.'); } finally { setBusy(false); } };
  return <div className="space-y-5" data-testid="v1-brand-messages"><div><p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Messages</p><h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Chat with TASCK admin</h1><p className="text-[13px] text-[#6B6258] mt-2">Messages are saved against the correct brand record and visible to admin in V1.</p></div><div className="v3-card p-5"><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full rounded-xl border border-[#E8E4DB] bg-white p-3 text-[13px] focus:outline-none focus:border-[#1F4A3A]" placeholder="Write a message to TASCK admin..." /><button onClick={send} disabled={busy || !message.trim()} className="v3-btn-primary mt-3"><Send className="w-4 h-4" /> {busy ? 'Sending...' : 'Send message'}</button></div><div className="space-y-3">{messages.length === 0 && <div className="v3-card p-6 text-[13px] text-[#6B6258]">No messages yet.</div>}{messages.map((item) => <div key={item.id} className="v3-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#1F1B18]">{cleanPortalText(item.title || 'Message')}</p><p className="text-[12px] text-[#8A8A8A] mt-1">{cleanPortalText(item.author || 'TASCK')} · {formatDate(item.date_iso)}</p></div><span className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">{cleanPortalText(item.type)}</span></div><p className="text-[13px] leading-6 text-[#4F4941] mt-3 whitespace-pre-wrap">{cleanPortalText(item.content)}</p></div>)}</div></div>;
};
export default V1BrandMessages;
