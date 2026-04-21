import React, { useState } from 'react';
import { v3Projects, getBrand, getRM, getCreator } from '../../../lib/v3data';
import { MessageSquare, Send, Paperclip, ChevronLeft } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandMessages = () => {
  const projects = v3Projects.filter(p => p.brandId === brandId);
  const brand = getBrand(brandId);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');

  const threads = [
    {
      id: 'thread-alignment',
      project: 'Share a Coke, Share a Story',
      rm: getRM('rm-temi'),
      lastMessage: 'Hi Folake — the Alignment Snapshot is ready for your review. Let me know if you have any questions before confirming.',
      time: '2 hours ago',
      unread: 1,
      messages: [
        { id: 'm1', sender: 'Temi Bakare', senderType: 'rm', time: '3 days ago', text: 'Hi Folake, just confirming — the scope call is set for Thursday at 2pm. Ngozi\'s office confirmed.' },
        { id: 'm2', sender: 'Folake Adeniran', senderType: 'brand', time: '3 days ago', text: 'Perfect. Chidi will join by phone from Abuja. Please send the dial-in.' },
        { id: 'm3', sender: 'Temi Bakare', senderType: 'rm', time: '3 days ago', text: 'Sent. Also attaching the POV document we discussed — "From Personalised Bottles to Personalised Stories." This will frame the conversation.' },
        { id: 'm4', sender: 'Folake Adeniran', senderType: 'brand', time: '2 days ago', text: 'Read the POV. Strong direction. One question — the retainer model you proposed, does the consultancy fee cover the Alignment Snapshot or is that separate?' },
        { id: 'm5', sender: 'Temi Bakare', senderType: 'rm', time: '2 days ago', text: 'Great question. The consultancy fee covers the full Frame stage — that includes the Alignment Snapshot, scope definition, and the initial strategic recommendation. No additional charges until we enter Plan.' },
        { id: 'm6', sender: 'Folake Adeniran', senderType: 'brand', time: '2 days ago', text: 'Clear. Let\'s proceed then.' },
        { id: 'm7', sender: 'Temi Bakare', senderType: 'rm', time: '2 hours ago', text: 'Hi Folake — the Alignment Snapshot for "Share a Coke, Share a Story" is ready for your review. I\'ve flagged 4 scope ambiguities that need your input before we can move to Plan. Take a look in your Approvals tab and let me know if you have any questions.' },
      ],
    },
    {
      id: 'thread-general',
      project: 'General',
      rm: getRM('rm-temi'),
      lastMessage: 'Welcome to TASCK! Your brand portal is set up. You\'ll find all project documents, approvals, and invoices here.',
      time: '12 days ago',
      unread: 0,
      messages: [
        { id: 'g1', sender: 'Temi Bakare', senderType: 'rm', time: '12 days ago', text: 'Welcome to the TASCK Brand Portal, Folake! Your account is set up. Here you\'ll be able to track all project progress, review documents, approve deliverables, and manage invoices. I\'m your dedicated Relationship Manager — reach out anytime.' },
        { id: 'g2', sender: 'Folake Adeniran', senderType: 'brand', time: '12 days ago', text: 'Thanks Temi. This looks clean. Quick question — can Ngozi and Chidi get access too?' },
        { id: 'g3', sender: 'Temi Bakare', senderType: 'rm', time: '12 days ago', text: 'Absolutely. I\'ll send them invite links. They\'ll have view access to all documents, and Chidi can be added as a co-approver on financial items if you\'d like.' },
        { id: 'g4', sender: 'Folake Adeniran', senderType: 'brand', time: '11 days ago', text: 'Yes, add Chidi as co-approver. Ngozi just needs view.' },
      ],
    },
    {
      id: 'thread-scheduling',
      project: 'Share a Coke, Share a Story',
      rm: getRM('rm-temi'),
      lastMessage: 'Timeline note: if we confirm the Alignment Snapshot by Friday, we\'re on track for creator matching by end of next week.',
      time: '5 days ago',
      unread: 0,
      messages: [
        { id: 's1', sender: 'Temi Bakare', senderType: 'rm', time: '6 days ago', text: 'Folake — quick timeline check. If we confirm the Alignment Snapshot by this Friday, I can have creator recommendations ready by the following Wednesday. That keeps us on track for the Dec 1 in-market date.' },
        { id: 's2', sender: 'Folake Adeniran', senderType: 'brand', time: '6 days ago', text: 'Understood. I\'ll push for internal alignment this week. Ngozi may need 48 hours to review the creative direction section.' },
        { id: 's3', sender: 'Temi Bakare', senderType: 'rm', time: '5 days ago', text: 'That works. I\'ve also flagged the budget range question to your team — Chidi mentioned "north of ₦100M, less than ₦150M" but we\'ll need a firm ceiling before Plan. Just want to make sure that conversation happens in parallel.' },
      ],
    },
  ];

  const selected = threads.find(t => t.id === selectedThread);

  return (
    <div data-testid="v3-brand-messages">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">MESSAGES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Messages</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">Conversations with your TASCK team.</p>

      <div className="flex gap-0 v3-card overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Thread list */}
        <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-[#E8E4DB] flex-shrink-0`}>
          <div className="p-3 border-b border-[#E8E4DB]">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">{threads.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map(thread => (
              <button key={thread.id} onClick={() => setSelectedThread(thread.id)}
                className={`w-full text-left p-4 border-b border-[#F4F2EC] hover:bg-[#FAFAF7] transition-colors ${selectedThread === thread.id ? 'bg-[#F4F2EC]' : ''}`}
                data-testid={`thread-${thread.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A] flex-shrink-0 mt-0.5">
                    {thread.rm?.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">{thread.rm?.name}</span>
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

        {/* Chat view */}
        <div className={`${!selected ? 'hidden md:flex' : 'flex'} flex-col flex-1`}>
          {selected ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-[#E8E4DB] flex items-center gap-3">
                <button onClick={() => setSelectedThread(null)} className="md:hidden text-[#8A8A8A]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]">
                  {selected.rm?.initials}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{selected.rm?.name}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{selected.project}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderType === 'brand' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${msg.senderType === 'brand' ? 'order-2' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.senderType !== 'brand' && (
                          <div className="w-6 h-6 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[8px] font-bold text-[#1F4A3A]">
                            {selected.rm?.initials}
                          </div>
                        )}
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

              {/* Reply box */}
              <div className="p-3 border-t border-[#E8E4DB]">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[#8A8A8A] hover:text-[#5C5C5C] transition-colors">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
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
                <p className="text-[12px] text-[#D4CDBF] mt-1">Choose a thread from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3BrandMessages;
