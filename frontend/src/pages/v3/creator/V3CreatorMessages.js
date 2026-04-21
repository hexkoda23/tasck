import React from 'react';
import { v3Projects, getBrand, getRM } from '../../../lib/v3data';
import { MessageSquare } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorMessages = () => {
  const projects = v3Projects.filter(p => p.creatorId === creatorId);

  const threads = projects.map(proj => {
    const brand = getBrand(proj.brandId);
    const rm = getRM(proj.rmId);
    return {
      id: proj.id,
      project: proj.title,
      brand: brand?.company?.split(' ')[0],
      rm: rm?.name,
      rmInitials: rm?.initials,
      lastMessage: proj.stage === 'plan'
        ? `Hi — the Creative Snapshot v1 for "${proj.title}" is ready for your review. I've incorporated your proposed concept direction. Take a look and let me know your thoughts.`
        : `Checking in on the next deliverable. Timeline looking good — let me know if anything shifts on your end.`,
      time: '3 hours ago',
      unread: proj.stage === 'plan' ? 1 : 0,
    };
  });

  return (
    <div data-testid="v3-creator-messages">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">MESSAGES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Messages</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Conversations with your TASCK team.</p>

      <div className="space-y-2">
        {threads.map(thread => (
          <button key={thread.id} className="w-full v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors flex items-start gap-3" data-testid={`creator-thread-${thread.id}`}>
            <div className="w-9 h-9 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A] flex-shrink-0 mt-0.5">
              {thread.rmInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-medium text-[#1A1A1A]">{thread.rm}</span>
                <span className="text-[10px] text-[#8A8A8A]">re: {thread.brand} — {thread.project}</span>
                <span className="text-[10px] text-[#8A8A8A] ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{thread.time}</span>
              </div>
              <p className="text-[12px] text-[#5C5C5C] truncate">{thread.lastMessage}</p>
            </div>
            {thread.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-[#1F4A3A] flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                {thread.unread}
              </div>
            )}
          </button>
        ))}

        {threads.length === 0 && (
          <div className="v3-card p-8 text-center">
            <MessageSquare className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
            <p className="text-[14px] text-[#8A8A8A]">No messages yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default V3CreatorMessages;
