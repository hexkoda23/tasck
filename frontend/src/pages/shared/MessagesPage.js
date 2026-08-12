import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/shared/Avatar';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, Check, CheckCheck } from 'lucide-react';

const threads = [
  {
    id: 'thread-001',
    name: 'Adenike Ogunlesi',
    role: 'Guinness Nigeria',
    avatar: null,
    lastMessage: 'Thanks Tunde! Legal is reviewing now. Quick question - can we add a clause...',
    time: '2 hours ago',
    unread: 2,
    online: true
  },
  {
    id: 'thread-002',
    name: 'Mavin Records',
    role: 'Super Creative',
    avatar: null,
    lastMessage: 'Kelechi, the Cadbury Set 2 photos are stunning! Quick note...',
    time: '5 hours ago',
    unread: 0,
    online: true
  },
  {
    id: 'thread-003',
    name: 'DMW (Davido)',
    role: 'Super Creative',
    avatar: null,
    lastMessage: 'That\'s fine. Davido isn\'t currently in talks with any other beverage brand.',
    time: 'Yesterday',
    unread: 0,
    online: false
  },
  {
    id: 'thread-004',
    name: 'Adia Sowho',
    role: 'MTN Nigeria',
    avatar: null,
    lastMessage: 'We can discuss the counter-offer tomorrow. Let me check with finance.',
    time: 'Yesterday',
    unread: 0,
    online: false
  },
  {
    id: 'thread-005',
    name: 'Kelechi Amadi-Obi',
    role: 'Creative',
    avatar: null,
    lastMessage: 'I\'ll have the re-crops to you by end of day.',
    time: '2 days ago',
    unread: 0,
    online: true
  }
];

const messages = [
  { id: 1, sender: 'them', name: 'Adenike Ogunlesi', content: 'Hi Tunde, hope you\'re doing well! I wanted to follow up on the Burna Boy campaign proposal.', time: '10:15 AM', read: true },
  { id: 2, sender: 'me', content: 'Hi Adenike! Yes, I just sent over the revised contract for the Burna Boy activation. Let me know if legal has any questions.', time: '10:20 AM', read: true },
  { id: 3, sender: 'them', name: 'Adenike Ogunlesi', content: 'Thanks Tunde! Legal is reviewing now. Quick question - can we add a clause about social media exclusivity during the campaign period?', time: '10:42 AM', read: true },
  { id: 4, sender: 'me', content: 'Absolutely. I\'ll draft that amendment and send over by EOD. Burna\'s team is flexible on this.', time: '10:45 AM', read: true },
  { id: 5, sender: 'them', name: 'Adenike Ogunlesi', content: 'Perfect. Also, Mark wants to discuss the listening party logistics. Can we do a call Thursday?', time: '11:00 AM', read: false },
  { id: 6, sender: 'them', name: 'Adenike Ogunlesi', content: 'Maybe around 2pm Lagos time?', time: '11:01 AM', read: false }
];

export const MessagesPage = () => {
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState(threads[0]);
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6" data-testid="messages-page">
      {/* Thread List */}
      <div className="w-80 border-r border-[#F1F5F9] flex flex-col">
        <div className="p-4 border-b border-[#F1F5F9]">
          <h1 className="text-sm font-semibold text-[#0F172A] mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setSelectedThread(thread)}
              className={`flex items-center gap-3 p-4 cursor-pointer border-l-2 transition-colors ${
                selectedThread?.id === thread.id 
                  ? 'bg-[#F8FAFC] border-[#2F55FF]' 
                  : 'border-transparent hover:bg-[#F8FAFC]'
              }`}
            >
              <div className="relative">
                <Avatar name={thread.name} size="md" />
                {thread.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] rounded-full border-2 border-[#0A1A30]"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[#0F172A] font-medium text-sm truncate">{thread.name}</h3>
                  <span className="text-[#94A3B8] text-xs">{thread.time}</span>
                </div>
                <p className="text-[#64748B] text-xs truncate">{thread.lastMessage}</p>
              </div>
              {thread.unread > 0 && (
                <span className="bg-[#2F55FF] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {thread.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={selectedThread?.name} size="md" />
            <div>
              <h2 className="text-[#0F172A] font-semibold">{selectedThread?.name}</h2>
              <p className="text-[#94A3B8] text-sm">{selectedThread?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md ${msg.sender === 'me' ? 'order-2' : ''}`}>
                {msg.sender !== 'me' && (
                  <p className="text-[#94A3B8] text-xs mb-1">{msg.name}</p>
                )}
                <div className={`rounded-2xl px-4 py-2 ${
                  msg.sender === 'me' 
                    ? 'bg-[#2F55FF] text-white' 
                    : 'bg-[#F1F5F9] text-[#334155]'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs text-[#94A3B8] ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'me' && (
                    msg.read ? <CheckCheck className="w-3 h-3 text-[#22C55E]" /> : <Check className="w-3 h-3" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <button className="p-2 text-[#94A3B8] hover:text-[#0F172A]">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-4 py-2 text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
            />
            <button className="btn-primary p-2 rounded-full">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
