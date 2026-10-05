// AssistantProvider
// ---------------------------------------------------------------------------
// Conversation state for the whole admin portal, mounted once in the layout.
//
// The widget it replaces cleared its messages whenever the edit target changed,
// so walking from the Alignment Snapshot to the Pitch Deck threw the
// conversation away. That made "now do the same to the deck" impossible to say.
// Here the thread belongs to the SESSION, and moving pages is recorded as
// context rather than treated as a reset.
//
// Pages register what they can offer via useAssistantSurface(); only one
// surface is active at a time, but the trail of recent ones travels with each
// turn so the model can resolve "the deck we were just on".
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

const AssistantContext = createContext(null);

const SESSION_KEY = 'tasck.assistant.session';
const RECENT_LIMIT = 5;
// Enough for the model to resolve a pronoun, short enough to stay cheap.
const HISTORY_TURNS = 8;

const newSessionId = () => `sess-${Math.random().toString(36).slice(2, 10)}`;

const loadSessionId = () => {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = newSessionId();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch (_e) {
    // Private mode, blocked storage: an in-memory id still works for this tab.
    return newSessionId();
  }
};

export const AssistantProvider = ({ children }) => {
  const [surface, setSurface] = useState(null);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // awaiting confirmation
  const sessionId = useRef(loadSessionId());
  const recentPages = useRef([]);
  // Which section the assistant touched last, so "make it shorter still"
  // resolves to something when the message names no section at all.
  const pinnedSections = useRef([]);

  const registerSurface = useCallback((descriptor) => {
    setSurface(descriptor);
    if (descriptor?.label) {
      const trail = recentPages.current.filter((p) => p !== descriptor.label);
      recentPages.current = [...trail, descriptor.label].slice(-RECENT_LIMIT);
    }
    return () => {
      setSurface((current) => (current?.id === descriptor.id ? null : current));
    };
  }, []);

  // Moving pages is a context change, not a reset. The marker is a system note
  // so the model knows where it is without the admin having to say.
  useEffect(() => {
    if (!surface?.label || !messages.length) return;
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.kind === 'context' && last.text.includes(surface.label)) return current;
      return [...current, { role: 'system', kind: 'context', text: `Now on: ${surface.label}` }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface?.label]);

  const rememberSection = useCallback((index) => {
    if (typeof index !== 'number') return;
    pinnedSections.current = [index, ...pinnedSections.current.filter((i) => i !== index)]
      .slice(0, 3);
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setPending(null);
    pinnedSections.current = [];
    sessionId.current = newSessionId();
    try { window.sessionStorage.setItem(SESSION_KEY, sessionId.current); } catch (_e) { /* ignore */ }
  }, []);

  const value = useMemo(() => ({
    surface, registerSurface,
    messages, setMessages,
    open, setOpen,
    pending, setPending,
    resetConversation,
    rememberSection,
    sessionId: sessionId.current,
    recentPages: recentPages.current,
    pinnedSections: pinnedSections.current,
    historyTurns: HISTORY_TURNS,
  }), [surface, registerSurface, messages, open, pending, resetConversation, rememberSection]);

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
};

export const useAssistant = () => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within an AssistantProvider');
  return ctx;
};

export default AssistantContext;
