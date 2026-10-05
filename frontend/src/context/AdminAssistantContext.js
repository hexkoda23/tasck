// ============================================================================
// AdminAssistantContext
// ----------------------------------------------------------------------------
// Lets any admin page register itself as an "edit target" for the global
// AdminAssistantWidget (bottom-right chat bot, mounted once in V1AdminLayout).
// A page that wants the assistant to be able to rewrite its content - the
// Alignment Snapshot editor today, Strategy Snapshot or similar later - calls
// registerEditTarget() with its own section data and its own setter, and the
// widget uses that to know it's in "edit mode" instead of general Q&A mode.
// Only one target is active at a time, which is fine since edit-capable
// routes are mutually exclusive.
// ============================================================================
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AdminAssistantContext = createContext(null);

export const AdminAssistantProvider = ({ children }) => {
  const [editTarget, setEditTarget] = useState(null);

  const registerEditTarget = useCallback((descriptor) => {
    setEditTarget(descriptor);
    return () => {
      setEditTarget((current) => (current?.id === descriptor.id ? null : current));
    };
  }, []);

  const unregisterEditTarget = useCallback((id) => {
    setEditTarget((current) => (current?.id === id ? null : current));
  }, []);

  const value = useMemo(() => ({ editTarget, registerEditTarget, unregisterEditTarget }), [editTarget, registerEditTarget, unregisterEditTarget]);

  return <AdminAssistantContext.Provider value={value}>{children}</AdminAssistantContext.Provider>;
};

export const useAdminAssistant = () => {
  const ctx = useContext(AdminAssistantContext);
  if (!ctx) throw new Error('useAdminAssistant must be used within an AdminAssistantProvider');
  return ctx;
};

export default AdminAssistantContext;
