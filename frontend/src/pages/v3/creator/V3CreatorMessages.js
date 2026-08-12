import React, { useState } from 'react';
import { v3Projects, getBrand, getRM } from '../../../lib/v3data';
import { MessageSquare, Send, Paperclip, ChevronLeft } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorMessages = () => {
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');

  const threads = [
    {
      id: 'ct-guinness',
      project: 'Made of More: Africa',
      brand: 'Guinness',
      rm: getRM('rm-adaeze'),
      lastMessage: 'The Strategy Snapshot v1 is drafted and under internal review. I\'ll share it with you before it goes to Tunde.',
      time: '3 hours ago',
      unread: 1,
      messages: [
        { id: 'cm1', sender: 'Adaeze Obi', senderType: 'rm', time: '5 days ago', text: 'Hi Rema - thanks for the brief response. Your concept direction is exactly what we were hoping for. The Nigerian subject being a woman in climate/food systems is a smart creative choice - it opens the gender door without telegraphing it.' },
        { id: 'cm2', sender: 'Rema', senderType: 'creator', time: '5 days ago', text: 'Good. That was the intent. I also want to talk about the Obongjayar collaboration for film 3. I\'ve reached out to his team - they\'re interested but need the timeline locked.' },
        { id: 'cm3', sender: 'Adaeze Obi', senderType: 'rm', time: '4 days ago', text: 'Noted. I\'ve built the Obongjayar conversation into the Strategy Snapshot timeline. His team would need confirmation by end of April if we\'re shooting in October. Is that workable?' },
        { id: 'cm4', sender: 'Rema', senderType: 'creator', time: '4 days ago', text: 'Yes. He\'s clear Oct-Nov. But I need to know about the DOP budget. I want Kagho Idhebor. His day rate is higher than standard but the visual quality is non-negotiable for this project.' },
        { id: 'cm5', sender: 'Adaeze Obi', senderType: 'rm', time: '3 days ago', text: 'Budget-wise, the ₦48M production line can accommodate Kagho. I\'ve factored in his rate at ₦2.5M/day for 15 shoot days across 3 countries. We\'re within range.' },
        { id: 'cm6', sender: 'Rema', senderType: 'creator', time: '3 days ago', text: 'Perfect. One more thing - I want final edit. That was in my brief response but I want it confirmed in the contract, not just the Strategy Snapshot.' },
        { id: 'cm7', sender: 'Adaeze Obi', senderType: 'rm', time: '3 hours ago', text: 'Understood - I\'ve flagged this for the contracts team. It\'ll be a clause with a brand safety carve-out (standard TASCK practice). The Strategy Snapshot v1 is drafted and under internal review. I\'ll share it with you before it goes to Tunde\'s team.' },
      ],
    },
    {
      id: 'ct-puma',
      project: 'Puma × Rema: Move Different',
      brand: 'Puma',
      rm: getRM('rm-temi'),
      lastMessage: 'All deliverables approved and payments released. Campaign closed. Great work!',
      time: '2 months ago',
      unread: 0,
      messages: [
        { id: 'pm1', sender: 'Temi Bakare', senderType: 'rm', time: '4 months ago', text: 'Rema - Puma\'s team approved the final master. They\'re thrilled with the visual direction. Payments are being processed now.' },
        { id: 'pm2', sender: 'Rema', senderType: 'creator', time: '4 months ago', text: 'Good. When do the social assets go live?' },
        { id: 'pm3', sender: 'Temi Bakare', senderType: 'rm', time: '4 months ago', text: 'Social launch is set for November 20. Your team will get the final posting schedule 48 hours before. Puma will coordinate from their side.' },
        { id: 'pm4', sender: 'Temi Bakare', senderType: 'rm', time: '2 months ago', text: 'Campaign wrapped cleanly. All deliverables approved, all payments released to your account. Your updated reliability score is 8.4/10. Puma\'s satisfaction rating: 8.6/10. Great work - they\'ve already asked about future collaborations.' },
      ],
    },
    {
      id: 'ct-browns',
      project: 'Browns × Rema: Lagos to London',
      brand: 'Browns Fashion',
      rm: getRM('rm-temi'),
      lastMessage: 'Documentary approved. Browns team loved the Lagos market sequence.',
      time: '6 weeks ago',
      unread: 0,
      messages: [
        { id: 'bm1', sender: 'Temi Bakare', senderType: 'rm', time: '2 months ago', text: 'Browns wants a 15-minute documentary connecting your Lagos roots to the London fashion scene. They\'re giving you full creative control on the narrative structure.' },
        { id: 'bm2', sender: 'Rema', senderType: 'creator', time: '2 months ago', text: 'I have an idea. We start in Benin City, not Lagos. That\'s where the real story is. Then to Lagos, then London. Three cities, one arc.' },
        { id: 'bm3', sender: 'Temi Bakare', senderType: 'rm', time: '2 months ago', text: 'I love that. Let me run it by their team. The Benin angle adds authenticity that a Lagos-only framing wouldn\'t.' },
        { id: 'bm4', sender: 'Temi Bakare', senderType: 'rm', time: '6 weeks ago', text: 'Browns approved the final documentary. The team specifically called out the Lagos market sequence - "exactly the kind of cultural texture we wanted." Payments processing now.' },
      ],
    },
  ];

  const selected = threads.find(t => t.id === selectedThread);

  return (
    <div data-testid="v3-creator-messages">
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
                data-testid={`creator-thread-${thread.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A] flex-shrink-0 mt-0.5">
                    {thread.rm?.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">{thread.rm?.name}</span>
                      <span className="text-[10px] text-[#8A8A8A] ml-auto flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{thread.time}</span>
                    </div>
                    <p className="text-[10px] text-[#1F4A3A] mb-1">{thread.brand} - {thread.project}</p>
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
              <div className="p-4 border-b border-[#E8E4DB] flex items-center gap-3">
                <button onClick={() => setSelectedThread(null)} className="md:hidden text-[#8A8A8A]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]">
                  {selected.rm?.initials}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{selected.rm?.name}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{selected.brand} - {selected.project}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderType === 'creator' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%]">
                      <div className={`flex items-center gap-2 mb-1 ${msg.senderType === 'creator' ? 'justify-end' : ''}`}>
                        {msg.senderType !== 'creator' && (
                          <div className="w-6 h-6 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[8px] font-bold text-[#1F4A3A]">
                            {selected.rm?.initials}
                          </div>
                        )}
                        <span className="text-[10px] text-[#8A8A8A]">{msg.sender}</span>
                        <span className="text-[9px] text-[#D4CDBF]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{msg.time}</span>
                      </div>
                      <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                        msg.senderType === 'creator'
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
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 text-[13px] rounded-xl border border-[#E8E4DB] bg-[#FAFAF7] focus:outline-none focus:border-[#1F4A3A] transition-colors"
                    data-testid="creator-message-input" />
                  <button className="p-2.5 bg-[#1F4A3A] text-white rounded-xl hover:bg-[#173D30] transition-colors" data-testid="creator-send-btn">
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
                <p className="text-[12px] text-[#D4CDBF] mt-1">Choose a thread to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3CreatorMessages;
