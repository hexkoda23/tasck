// AssistantWidget
// ---------------------------------------------------------------------------
// The chat panel. Three things it does that its predecessor did not:
//
//   1. It survives navigation, because the conversation lives in the provider.
//   2. It applies the SAVED document the backend returns, rather than a local
//      draft the admin then has to remember to save.
//   3. It shows every change as a card with Undo, which is the whole safety
//      story now that content edits write straight to the database.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bot, Check, Loader2, RotateCcw, Send, X } from 'lucide-react';

import { useAssistant } from './AssistantProvider';
import { describeTransportError, splitTitle } from './assistantErrors';
import { v3AssistantChat, v3AssistantUndo } from '../lib/v3api';

// A failure is shown as its own clearly different box, never as an ordinary
// assistant bubble - an admin skimming the thread must not mistake "the key was
// rejected" for the assistant's opinion.
const ErrorBox = ({ message, hint }) => {
  const { title, body } = splitTitle(message);
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#E4BBB1] border-l-4 border-l-[#B54A37] bg-[#FBEDEA] px-3 py-2.5"
      data-testid="assistant-error-box"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[#B54A37] shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          {title && <p className="text-[11px] font-semibold text-[#8A3524]">{title}</p>}
          <p className="text-[11px] text-[#8A3524] leading-relaxed">{body}</p>
          {hint && <p className="text-[10px] text-[#A0584A]">{hint}</p>}
        </div>
      </div>
    </div>
  );
};

const bubble = (role) => (
  role === 'user'
    ? 'bg-[#1F4A3A] text-white ml-auto'
    : 'bg-[#F4F2EC] text-[#1A1A1A]'
);

const AssistantWidget = () => {
  const navigate = useNavigate();
  const {
    surface, messages, setMessages, open, setOpen, pending, setPending,
    sessionId, recentPages, pinnedSections, historyTurns, rememberSection,
    resetConversation,
  } = useAssistant();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, pending]);

  const push = (entry) => setMessages((current) => [...current, entry]);

  const send = async (text, confirmedTool = null) => {
    if (sending) return;
    const outgoing = (text || '').trim();
    if (!outgoing && !confirmedTool) return;

    const history = messages
      .filter((m) => m.kind !== 'change' && m.kind !== 'error' && m.kind !== 'context')
      .slice(-historyTurns)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

    if (outgoing) push({ role: 'user', text: outgoing });
    setInput('');
    setSending(true);
    setPending(null);

    try {
      const res = await v3AssistantChat({
        message: outgoing || 'Yes, go ahead.',
        session_id: sessionId,
        history,
        surface_label: surface?.label || '',
        surface_mode: surface?.mode || 'readonly',
        document_kind: surface?.documentKind || null,
        document_id: surface?.documentId || null,
        project_id: surface?.projectId || null,
        recent_pages: recentPages,
        pinned_sections: pinnedSections,
        confirmed_tool: confirmedTool,
      });

      if (res?.reply) push({ role: 'assistant', text: res.reply });

      // The saved document is the source of truth; hand it straight to the page
      // so the section the admin is looking at updates in place.
      if (res?.document && surface?.onDocumentChanged) {
        surface.onDocumentChanged(res.document);
      }
      (res?.tool_calls || []).forEach((call) => {
        if (typeof call?.input?.index === 'number') rememberSection(call.input.index);
      });
      // One card per request, not per change. Undo takes back the whole request
      // - a whole-page rewrite, or three edits asked for together - so a card
      // per change would put an Undo on each that actually reverts all of them.
      // Only the newest card offers Undo, because undo works back from the
      // most recent request.
      const changes = res?.changes || [];
      if (changes.length) {
        const reasons = changes.map((c) => c.reason).filter(Boolean);
        const summary = changes.length === 1
          ? (reasons[0] || 'Change applied.')
          : `${changes.length} changes — ${reasons.join('; ')}`;
        setMessages((current) => [
          ...current.map((m) => (m.kind === 'change' ? { ...m, undoable: false } : m)),
          { role: 'assistant', kind: 'change', text: summary, undoable: true },
        ]);
      }
      if (res?.pending_confirmation) setPending(res.pending_confirmation);
      if (res?.navigate_to) navigate(res.navigate_to);
      // Reported in the body by the backend, alongside anything that WAS saved.
      // Shown after the change cards so a partial success reads in order: what
      // landed, then what did not.
      if (res?.error?.message) {
        push({ role: 'assistant', kind: 'error', text: res.error.message,
          hint: res.error.hint || null });
      }
    } catch (e) {
      const { message, hint } = describeTransportError(e);
      push({ role: 'assistant', kind: 'error', text: message, hint });
    } finally {
      setSending(false);
    }
  };

  // Straight to the journal: no model call, no provider to time out, one
  // correct meaning. The card before this one becomes undoable again, because
  // undo steps back through requests newest first.
  const undo = async (cardIndex) => {
    if (sending) return;
    setSending(true);
    try {
      const res = await v3AssistantUndo(sessionId);
      if (!res?.ok) {
        push({ role: 'assistant', kind: 'error',
          text: res?.error?.message || 'Nothing could be undone.', hint: res?.error?.hint || null });
        return;
      }
      // Only hand the page a document that is actually the one on screen; the
      // admin may have moved pages since that change was made.
      if (res.document && surface?.onDocumentChanged
          && (!surface.documentId || res.document.id === surface.documentId)) {
        surface.onDocumentChanged(res.document);
      }
      setMessages((current) => {
        const next = current.map((m, i) => (i === cardIndex
          ? { ...m, undoable: false, undone: true } : m));
        for (let i = cardIndex - 1; i >= 0; i -= 1) {
          if (next[i].kind === 'change' && !next[i].undone) {
            next[i] = { ...next[i], undoable: true };
            break;
          }
        }
        return [...next, { role: 'assistant', text: res.reply }];
      });
    } catch (e) {
      const { message, hint } = describeTransportError(e);
      push({ role: 'assistant', kind: 'error', text: message, hint });
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#1F4A3A] text-white shadow-lg flex items-center justify-center hover:bg-[#163B2D]"
        aria-label="Open assistant"
        data-testid="assistant-toggle"
      >
        <Bot className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 max-h-[70vh] flex flex-col rounded-[10px] border border-[#E8E4DB] bg-white shadow-2xl" data-testid="assistant-panel">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-[#E8E4DB]">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#1A1A1A]">TASCK Assistant</p>
          <p className="text-[10px] text-[#8A8A8A] truncate">
            {surface?.label || 'Admin portal'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={resetConversation} className="text-[#8A8A8A] hover:text-[#1A1A1A]" aria-label="New conversation" title="New conversation">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="text-[#8A8A8A] hover:text-[#1A1A1A]" aria-label="Close assistant" data-testid="assistant-close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {!messages.length && (
          <p className="text-[12px] text-[#8A8A8A]">What do you want to change?</p>
        )}
        {messages.map((m, i) => {
          if (m.kind === 'context') {
            return (
              <p key={i} className="text-[10px] uppercase tracking-wider text-[#B5AC9B] text-center py-1">
                {m.text}
              </p>
            );
          }
          if (m.kind === 'change') {
            return (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 ${m.undone
                  ? 'border-[#E8E4DB] bg-[#F4F2EC]' : 'border-[#A4D4B0] bg-[#DDF0E1]'}`}
                data-testid="assistant-change-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[11px] flex-1 ${m.undone ? 'text-[#8A8A8A] line-through' : 'text-[#1F6B3A]'}`}>
                    <Check className="w-3 h-3 inline mr-1" />
                    {m.undone ? 'Undone' : 'Saved'} — {m.text}
                  </p>
                  {m.undoable && !m.undone && (
                    <button
                      onClick={() => undo(i)}
                      disabled={sending}
                      className="text-[10px] underline text-[#1F6B3A] shrink-0 disabled:opacity-40"
                      data-testid="assistant-undo"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>
            );
          }
          if (m.kind === 'error') {
            return <ErrorBox key={i} message={m.text} hint={m.hint} />;
          }
          return (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[12px] whitespace-pre-wrap ${bubble(m.role)}`}
            >
              {m.text}
            </div>
          );
        })}

        {pending && (
          <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 space-y-2" data-testid="assistant-confirm-card">
            <p className="text-[11px] text-[#7A5A1E]">{pending.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => send('Yes, go ahead.', pending.tool)}
                className="text-[11px] px-2.5 py-1 rounded bg-[#1F4A3A] text-white"
                data-testid="assistant-confirm-yes"
              >
                Confirm
              </button>
              <button
                onClick={() => { setPending(null); push({ role: 'assistant', text: 'Cancelled.' }); }}
                className="text-[11px] px-2.5 py-1 rounded border border-[#E8E4DB]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {sending && (
          <p className="text-[11px] text-[#8A8A8A] flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Working…
          </p>
        )}
      </div>

      <div className="border-t border-[#E8E4DB] p-2 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
          }}
          rows={1}
          placeholder="Describe the change…"
          className="flex-1 resize-none text-[12px] border border-[#E8E4DB] rounded-md px-2.5 py-2 focus:border-[#1F4A3A] outline-none"
          data-testid="assistant-input"
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="w-8 h-8 rounded-md bg-[#1F4A3A] text-white flex items-center justify-center disabled:opacity-40"
          data-testid="assistant-send"
          aria-label="Send"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default AssistantWidget;
