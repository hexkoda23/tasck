import React, { useMemo, useState } from 'react';
import { getBrandPortalBrand, getBrandPortalSession, loadBrandPortalBundles } from '../../../lib/v3brandPortal';
import { ChevronLeft, MessageSquare, Paperclip, Send } from 'lucide-react';

const V3BrandMessages = () => {
  const session = getBrandPortalSession();
  const brand = getBrandPortalBrand();
  const bundles = loadBrandPortalBundles(session.brandId);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');

  const threads = useMemo(() => {
    const projectThreads = bundles.slice(0, 4).map((bundle, index) => ({
      id: `thread-${bundle.business_case.id}`,
      project: bundle.business_case.title,
      rm: bundle.rm,
      lastMessage: index === 0
        ? `The latest ${bundle.alignment_snapshot?.status !== 'approved' ? 'Alignment Snapshot' : 'project update'} is ready in your portal.`
        : bundle.business_case.next_action,
      time: index === 0 ? '2 hours ago' : `${index + 1} days ago`,
      unread: index === 0 ? 1 : 0,
      messages: [
        { id: `${bundle.business_case.id}-1`, sender: bundle.rm?.name || 'TASCK', senderType: 'rm', time: '3 days ago', text: `Hi ${session.contact}, quick update on ${bundle.business_case.title}. We have the current project stage at ${bundle.business_case.stage}.` },
        { id: `${bundle.business_case.id}-2`, sender: session.contact, senderType: 'brand', time: '2 days ago', text: 'Thanks. Please keep the approval notes clear so our internal team can move quickly.' },
        { id: `${bundle.business_case.id}-3`, sender: bundle.rm?.name || 'TASCK', senderType: 'rm', time: index === 0 ? '2 hours ago' : '1 day ago', text: bundle.business_case.next_action },
      ],
    }));
    return [
      {
        id: 'thread-general',
        project: 'General',
        rm: bundles[0]?.rm,
        lastMessage: `Welcome to TASCK, ${brand?.company}. Your brand portal is scoped to your projects only.`,
        time: '12 days ago',
        unread: 0,
        messages: [
          { id: 'g1', sender: bundles[0]?.rm?.name || 'TASCK', senderType: 'rm', time: '12 days ago', text: `Welcome to the TASCK Brand Portal, ${session.contact}. You can track ${brand?.company} projects, approvals, documents, invoices, and messages here.` },
          { id: 'g2', sender: session.contact, senderType: 'brand', time: '12 days ago', text: 'Great. Please make sure pending approvals are easy to find.' },
          { id: 'g3', sender: bundles[0]?.rm?.name || 'TASCK', senderType: 'rm', time: '11 days ago', text: 'Done. Pending snapshots live in Approvals; approved files move into Documents.' },
        ],
      },
      ...projectThreads,
    ];
  }, [brand?.company, bundles, session.contact]);

  const selected = threads.find((thread) => thread.id === selectedThread);

  return (
    <div data-testid="v3-brand-messages">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">MESSAGES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Messages</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">Conversations between {brand?.company} and the TASCK team.</p>

      <div className="flex gap-0 v3-card overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-[#E8E4DB] flex-shrink-0`}>
          <div className="p-3 border-b border-[#E8E4DB]">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">{threads.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((thread) => (
              <button key={thread.id} onClick={() => setSelectedThread(thread.id)}
                className={`w-full text-left p-4 border-b border-[#F4F2EC] hover:bg-[#FAFAF7] transition-colors ${selectedThread === thread.id ? 'bg-[#F4F2EC]' : ''}`}
                data-testid={`thread-${thread.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A] flex-shrink-0 mt-0.5">
                    {thread.rm?.initials || 'TA'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">{thread.rm?.name || 'TASCK'}</span>
                      <span className="text-[10px] text-[#8A8A8A] ml-auto flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{thread.time}</span>
                    </div>
                    <p className="text-[10px] text-[#1F4A3A] mb-1">{thread.project}</p>
                    <p className="text-[11px] text-[#8A8A8A] truncate">{thread.lastMessage}</p>
                  </div>
                  {thread.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#1F4A3A] flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                      {thread.unread}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`${!selected ? 'hidden md:flex' : 'flex'} flex-col flex-1`}>
          {selected ? (
            <>
              <div className="p-4 border-b border-[#E8E4DB] flex items-center gap-3">
                <button onClick={() => setSelectedThread(null)} className="md:hidden text-[#8A8A8A]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]">
                  {selected.rm?.initials || 'TA'}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{selected.rm?.name || 'TASCK'}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{selected.project}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderType === 'brand' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${msg.senderType === 'brand' ? 'order-2' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-[#8A8A8A]">{msg.sender}</span>
                        <span className="text-[9px] text-[#D4CDBF]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{msg.time}</span>
                      </div>
                      <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                        msg.senderType === 'brand'
                          ? 'bg-[#1F4A3A] text-white rounded-br-sm'
                          : 'bg-[#F4F2EC] text-[#1A1A1A] rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-[#E8E4DB]">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[#8A8A8A] hover:text-[#5C5C5C] transition-colors">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 text-[13px] rounded-xl border border-[#E8E4DB] bg-[#FAFAF7] focus:outline-none focus:border-[#1F4A3A] transition-colors"
                    data-testid="message-input"
                  />
                  <button className="p-2.5 bg-[#1F4A3A] text-white rounded-xl hover:bg-[#173D30] transition-colors" data-testid="send-btn">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-8 h-8 text-[#D4CDBF] mx-auto mb-3" />
                <p className="text-[14px] text-[#8A8A8A]">Select a conversation</p>
                <p className="text-[12px] text-[#D4CDBF] mt-1">Choose a thread from the left to view messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3BrandMessages;
