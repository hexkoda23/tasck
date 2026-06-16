import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CheckCircle, FileText } from 'lucide-react';
import { v3AdminOverview } from '../../lib/v3api';

const typeMeta = {
  alignment_snapshot_missing: { icon: AlertTriangle, color: '#C49B5F' },
  agreement_missing: { icon: FileText, color: '#B54A37' },
  relationship_manager_missing: { icon: AlertTriangle, color: '#C49B5F' },
  contract_missing: { icon: FileText, color: '#B54A37' },
  contract_pending: { icon: FileText, color: '#1F4A3A' },
  report_missing: { icon: AlertTriangle, color: '#C49B5F' },
  stage_stalled: { icon: Clock, color: '#9B9380' },
  business_case: { icon: CheckCircle, color: '#1F4A3A' },
  brand: { icon: CheckCircle, color: '#1F4A3A' },
  creator: { icon: CheckCircle, color: '#567B3F' },
  default: { icon: Bell, color: '#5C5C5C' },
};

const READ_STORAGE_KEY = 'tasck-v3-notifications-read';

const loadReadKeys = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(READ_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const notificationKey = (source, item, index) => `${source}:${item.type || 'default'}:${item.id || item.title || index}`;

const notificationLink = (item) => {
  if (!item?.id) return '/v3/admin';
  if (item.type === 'relationship_manager_missing' || item.type === 'brand') return `/v3/admin/crm/${item.id}`;
  if (item.type === 'alignment_snapshot_missing') return `/v3/admin/business-cases/${item.id}/frame/snapshot`;
  if (item.type === 'contract_missing' || item.type === 'contract_pending' || item.type === 'agreement_missing') {
    return `/v3/admin/business-cases/${item.id}/delivery/contracts`;
  }
  if (item.type === 'report_missing') return `/v3/admin/business-cases/${item.id}/reporting/final-report`;
  if (item.type === 'stage_stalled' || item.type === 'business_case') return `/v3/admin/business-cases/${item.id}`;
  if (item.type === 'creator') return `/v3/admin/creators/${item.id}`;
  return '/v3/admin';
};

const V3NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [readKeys, setReadKeys] = useState(loadReadKeys);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const storedReadKeys = loadReadKeys();
    v3AdminOverview()
      .then((data) => {
        if (cancelled) return;
        const attention = (data?.needs_attention || []).map((n, i) => {
          const key = notificationKey('attention', n, i);
          return {
            key,
            id: `att-${i}`,
            type: n.type,
            title: n.title,
            desc: n.message,
            time: 'Action required',
            link: notificationLink(n),
            read: storedReadKeys.includes(key),
          };
        });
        const activity = (data?.latest_activity || []).slice(0, 5).map((a, i) => {
          const key = notificationKey('activity', a, i);
          return {
            key,
            id: `act-${i}`,
            type: a.type,
            title: a.title,
            desc: a.message || 'Imported from CRM workbook',
            time: a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
            link: notificationLink(a),
            read: true,
          };
        });
        setItems([...attention, ...activity]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;
  const markRead = (key) => {
    const next = Array.from(new Set([...readKeys, key]));
    setReadKeys(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next));
    }
    setItems((current) => current.map((item) => (item.key === key ? { ...item, read: true } : item)));
  };

  return (
    <div className="relative" data-testid="v3-notification-center">
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-[#F4F2EC] transition-colors"
        data-testid="notification-bell"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.6} className="text-[#5C5C5C]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#B54A37] text-white text-[9px] font-bold flex items-center justify-center leading-none"
            data-testid="notification-badge"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-96 bg-white border border-[#E8E4DB] rounded-xl shadow-lg z-50 overflow-hidden" data-testid="notification-panel">
            <div className="p-3 border-b border-[#E8E4DB] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#1A1A1A]">Notifications</span>
              <span className="text-[10px] text-[#8A8A8A]">{unreadCount} unread</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="p-6 text-center text-[11px] text-[#8A8A8A]">No notifications yet.</div>
              )}
              {items.map((n) => {
                const meta = typeMeta[n.type] || typeMeta.default;
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => { markRead(n.key); navigate(n.link); setOpen(false); }}
                    className={`w-full text-left p-3 flex gap-3 hover:bg-[#FAFAF7] transition-colors border-b border-[#F4F2EC] last:border-0 ${!n.read ? 'bg-[#1F4A3A05]' : ''}`}
                    data-testid={`notif-${n.id}`}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${meta.color}1A` }}>
                      <Icon size={14} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[12px] ${!n.read ? 'font-medium text-[#1A1A1A]' : 'text-[#5C5C5C]'} truncate`}>{n.title}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${n.read ? 'bg-[#F4F2EC] text-[#8A8A8A]' : 'bg-[#DDE7E2] text-[#1F4A3A]'}`}>
                          {n.read ? 'Read' : 'New'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8A8A8A] mt-0.5 line-clamp-2">{n.desc}</p>
                      <p className="text-[9px] text-[#D4CDBF] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{n.time}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default V3NotificationCenter;
