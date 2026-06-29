// ============================================================================
// useAdminNotifications
// ----------------------------------------------------------------------------
// Polls the backend's GET /admin/notifications every 30s. Returns:
//   { items, loading, error, refresh, unseen, markSeen, markAllSeen }
//
//   items       - the full list (already sorted newest-first by the server).
//   unseen      - the subset that has not yet been acknowledged in this
//                 browser. Acknowledgement is persisted in localStorage so the
//                 admin doesn't see the same toast twice across reloads.
//
// Used by V1AdminLayout (toast on new items + bell badge) and V1AdminOverview
// (Needs Attention card). V1 only; the V3 admin is untouched.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { v3ListAdminNotifications } from '../lib/v3api';

const STORAGE_KEY = 'tasck_admin_seen_notifications';
const POLL_INTERVAL_MS = 30000; // 30 seconds

const loadSeenSet = () => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (_) {
    return new Set();
  }
};

const saveSeenSet = (set) => {
  if (typeof window === 'undefined') return;
  try {
    // Cap the stored set so it doesn't grow unbounded - keep the most
    // recent 500 ids the admin has acknowledged.
    const arr = Array.from(set).slice(-500);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (_) { /* localStorage unavailable - silent fallback */ }
};

export const useAdminNotifications = ({ onNewItem } = {}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seenRef = useRef(loadSeenSet());
  // Track ids the hook has already broadcast as "new" so we don't re-fire
  // toasts on every refresh.
  const announcedRef = useRef(new Set());

  const refresh = useCallback(async () => {
    try {
      const rows = await v3ListAdminNotifications();
      const list = Array.isArray(rows) ? rows : [];
      setItems(list);
      setLoading(false);
      setError('');
      // Fire onNewItem for anything that's both unseen AND not yet announced.
      if (typeof onNewItem === 'function') {
        const newItems = list.filter((row) => !seenRef.current.has(row.id) && !announcedRef.current.has(row.id));
        for (const item of newItems) {
          announcedRef.current.add(item.id);
          try { onNewItem(item); } catch (_) { /* don't crash on toast errors */ }
        }
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Could not load notifications.');
      setLoading(false);
    }
  }, [onNewItem]);

  useEffect(() => {
    refresh();
    const handle = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [refresh]);

  const markSeen = useCallback((id) => {
    seenRef.current.add(id);
    saveSeenSet(seenRef.current);
    // Trigger re-render so unseen count updates.
    setItems((current) => current.slice());
  }, []);

  const markAllSeen = useCallback(() => {
    for (const item of items) seenRef.current.add(item.id);
    saveSeenSet(seenRef.current);
    setItems((current) => current.slice());
  }, [items]);

  const unseen = items.filter((row) => !seenRef.current.has(row.id));

  return { items, loading, error, refresh, unseen, markSeen, markAllSeen };
};

export default useAdminNotifications;
