import React from 'react';
import { v3Projects, getRM, getBrand } from '../../../lib/v3data';
import { MessageSquare, Send } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandMessages = () => {
  const projects = v3Projects.filter(p => p.brandId === brandId);
  const brand = getBrand(brandId);

  const threads = projects.map(proj => {
    const rm = getRM(proj.rmId);
    return {
      id: proj.id,
      project: proj.title,
      rm: rm?.name,
      rmInitials: rm?.initials,
      lastMessage: proj.stage === 'frame'
        ? `Hi Folake — the Alignment Snapshot for "${proj.title}" is ready for your review. Let me know if you have any questions before confirming.`
        : `Project update: we're progressing on schedule. Next milestone is ${proj.nextAction?.toLowerCase() || 'in progress'}.`,
      time: proj.stage === 'frame' ? '2 hours ago' : '1 day ago',
      unread: proj.stage === 'frame' ? 1 : 0,
    };
  });

  return (
    <div data-testid="v3-brand-messages">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">MESSAGES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Messages</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Conversations with your TASCK team.</p>

      <div className="space-y-2">
        {threads.map(thread => (
          <button key={thread.id} className="w-full v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors flex items-start gap-3" data-testid={`thread-${thread.id}`}>
            <div className="w-9 h-9 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A] flex-shrink-0 mt-0.5">
              {thread.rmInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-medium text-[#1A1A1A]">{thread.rm}</span>
                <span className="text-[10px] text-[#8A8A8A]">re: {thread.project}</span>
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
      </div>
    </div>
  );
};

export default V3BrandMessages;
