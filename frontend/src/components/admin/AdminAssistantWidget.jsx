// ============================================================================
// AdminAssistantWidget
// ----------------------------------------------------------------------------
// Global bottom-right chat bot, mounted once in V1AdminLayout so it appears
// on every admin page. In general mode it just answers questions and declines
// requests it can't act on. When the current page has registered itself as an
// edit target (see AdminAssistantContext), it can additionally rewrite that
// page's sections in place - the admin still has to click that page's own
// "Save edits" button to persist anything; this widget never saves on its
// own.
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { useAdminAssistant } from '../../context/AdminAssistantContext';
import { v3AdminAssistantChat } from '../../lib/v3api';

const GENERAL_GREETING = 'Hi! How can I help?';
const HISTORY_TURNS = 6;

const AdminAssistantWidget = () => {
  const { editTarget } = useAdminAssistant();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const lastTargetIdRef = useRef(undefined);
  const listRef = useRef(null);

  const greeting = editTarget?.greeting || GENERAL_GREETING;

  // Fresh greeting whenever the edit target's identity changes - including
  // going in/out of edit mode entirely - so context never leaks between
  // pages or between two different snapshots.
  useEffect(() => {
    const targetId = editTarget?.id || null;
    if (targetId !== lastTargetIdRef.current) {
      lastTargetIdRef.current = targetId;
      setMessages([{ role: 'assistant', text: greeting }]);
    }
  }, [editTarget?.id, greeting]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const history = nextMessages.slice(-1 - HISTORY_TURNS, -1).map((m) => ({ role: m.role, text: m.text }));
      const payload = editTarget
        ? {
          mode: 'edit',
          message: text,
          history,
          edit_target_id: editTarget.id,
          sections: editTarget.sections,
          rewritable_types: editTarget.rewritableTypes,
        }
        : { mode: 'general', message: text, history };
      const res = await v3AdminAssistantChat(payload);
      const reply = res?.reply || "Sorry, I couldn't come up with a reply.";
      setMessages((current) => [...current, { role: 'assistant', text: reply }]);
      if (res?.section_update && editTarget?.applySectionUpdate) {
        const { index, section } = res.section_update;
        if (typeof index === 'number' && section) {
          editTarget.applySectionUpdate(index, section);
          setMessages((current) => [...current, { role: 'assistant', text: 'Updated - review the change and click Save edits to keep it.' }]);
        }
      }
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Something went wrong reaching the assistant.';
      setMessages((current) => [...current, { role: 'assistant', text: detail }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" data-testid="admin-assistant-widget">
      {open && (
        <div className="mb-3 w-80 sm:w-96 max-h-[70vh] flex flex-col rounded-[10px] border border-[#E8E4DB] bg-white shadow-2xl" data-testid="admin-assistant-panel">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E8E4DB]">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#1A1A1A]">TASCK Assistant</p>
              {editTarget?.label && <p className="text-[10px] text-[#8A8A8A] truncate">{editTarget.label}</p>}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-[#8A8A8A] hover:text-[#1A1A1A] hover:bg-[#F4F2EC]"
              aria-label="Close assistant"
              data-testid="admin-assistant-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[220px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-[#1F4A3A] text-white' : 'bg-[#F4F2EC] text-[#1A1A1A]'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[10px] px-3 py-2 text-[12px] bg-[#F4F2EC] text-[#8A8A8A]">Thinking...</div>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2 p-2.5 border-t border-[#E8E4DB]">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={editTarget ? 'Describe the change...' : 'Ask a question...'}
              className="flex-1 resize-none rounded-lg border border-[#E8E4DB] bg-white px-2.5 py-2 text-[12px] focus:outline-none focus:border-[#1F4A3A]"
              data-testid="admin-assistant-input"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !input.trim()}
              className="p-2 rounded-lg bg-[#1F4A3A] text-white disabled:opacity-40 hover:bg-[#173A2D] transition-colors"
              aria-label="Send"
              data-testid="admin-assistant-send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-[#1F4A3A] text-white shadow-2xl flex items-center justify-center hover:bg-[#173A2D] transition-colors"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        data-testid="admin-assistant-toggle"
      >
        <Bot className="w-5 h-5" />
      </button>
    </div>
  );
};

export default AdminAssistantWidget;
