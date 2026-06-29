// ============================================================================
// V1AdminOverview
// ----------------------------------------------------------------------------
// V1-only wrapper around the shared V3AdminOverview. Adds a "Needs Attention"
// card at the top listing recent brand/creator-initiated actions (alignment
// approved, strategy approved, contract signed, brief responded). The V3
// admin still renders V3AdminOverview directly without this wrapper, so the
// V3 admin UI is unchanged.
//
// Data source: useAdminNotifications -> GET /api/v3/admin/notifications.
// ============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileSignature, MessageSquare, RotateCcw, Sparkles } from 'lucide-react';
import V3AdminOverview from '../v3/admin/V3AdminOverview';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';

const KIND_ICON = {
  alignment_approved: CheckCircle2,
  strategy_approved: CheckCircle2,
  contract_signed: FileSignature,
  brief_response: MessageSquare,
};

const formatWhen = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const NeedsAttentionCard = () => {
  const navigate = useNavigate();
  const { items, loading, unseen, refresh, markSeen, markAllSeen } = useAdminNotifications();
  // Show up to 8 most-recent items in the card; emphasise unseen ones.
  const visible = items.slice(0, 8);

  return (
    <div className="rounded-[12px] border border-[#E8E4DB] bg-white p-5 mb-6" data-testid="v1-admin-needs-attention">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-0.5">Needs attention</p>
          <h2 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
            Recent brand and creator actions
            {unseen.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[11px] font-semibold text-white bg-[#B54A37] rounded-full px-2 py-0.5" data-testid="v1-admin-needs-attention-count">
                {unseen.length} new
              </span>
            )}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} className="v3-btn-secondary text-[11px]" data-testid="v1-admin-needs-attention-refresh">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
          {unseen.length > 0 && (
            <button type="button" onClick={markAllSeen} className="v3-btn-secondary text-[11px]" data-testid="v1-admin-needs-attention-mark-all">
              Mark all seen
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-[12px] text-[#8A8A8A]">Loading recent actions…</p>
      ) : visible.length === 0 ? (
        <p className="text-[12px] text-[#8A8A8A]">No brand or creator actions yet. New approvals and signatures will appear here automatically.</p>
      ) : (
        <ul className="divide-y divide-[#E8E4DB]">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind] || Sparkles;
            const isUnseen = !unseen.every((u) => u.id !== item.id); // O(n) but n<=8
            return (
              <li
                key={item.id}
                className={`flex items-start gap-3 py-2.5 cursor-pointer hover:bg-[#FBFAF7] -mx-2 px-2 rounded ${isUnseen ? 'bg-[#FBF4E4]/60' : ''}`}
                onClick={() => { markSeen(item.id); if (item.link) navigate(item.link); }}
                data-testid={`v1-admin-needs-attention-item-${item.id}`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 ${isUnseen ? 'bg-[#1F4A3A] text-white' : 'bg-[#E8F3ED] text-[#1F4A3A]'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1A1A1A] truncate">
                    <strong>{item.title}</strong>
                  </p>
                  <p className="text-[11px] text-[#6E6657] truncate">
                    {item.message}
                  </p>
                  <p className="text-[10px] text-[#8A8A8A] mt-0.5">{formatWhen(item.when)}</p>
                </div>
                {isUnseen && (
                  <span className="text-[10px] uppercase tracking-wider text-[#B54A37] font-semibold flex-shrink-0">New</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const V1AdminOverview = () => (
  <div>
    <NeedsAttentionCard />
    <V3AdminOverview />
  </div>
);

export default V1AdminOverview;
