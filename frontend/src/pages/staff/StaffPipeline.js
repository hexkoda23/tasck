import React, { useState, useEffect } from 'react';
import { getPipelineSummary, updateDealStatus } from '../../lib/api';
import { formatNaira, formatRelativeTime } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { MoreVertical, User, Clock } from 'lucide-react';

const pipelineColumns = [
  { id: 'lead', label: 'Lead', color: '#94A3B8' },
  { id: 'discovery', label: 'Discovery', color: '#2F55FF' },
  { id: 'scoping', label: 'Scoping', color: '#8B5CF6' },
  { id: 'awaiting_nda', label: 'Awaiting NDA', color: '#F59E0B' },
  { id: 'awaiting_terms', label: 'Awaiting Terms', color: '#F97316' },
  { id: 'active', label: 'Active', color: '#22C55E' },
  { id: 'closed_won', label: 'Closed Won', color: '#059669' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#EF4444' }
];

const getPriorityBorder = (p) => p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#CBD5E1';

export const StaffPipeline = () => {
  const [dealsByStatus, setDealsByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState(null);

  useEffect(() => { fetchPipeline(); }, []);

  const fetchPipeline = async () => {
    try {
      const res = await getPipelineSummary();
      setDealsByStatus(res.data.deals_by_status || {});
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDragStart = (deal) => setDraggedDeal(deal);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (status) => {
    if (!draggedDeal || draggedDeal.status === status) { setDraggedDeal(null); return; }
    try {
      await updateDealStatus(draggedDeal.id, status);
      setDealsByStatus(prev => {
        const n = { ...prev };
        n[draggedDeal.status] = (n[draggedDeal.status] || []).filter(d => d.id !== draggedDeal.id);
        n[status] = [...(n[status] || []), { ...draggedDeal, status }];
        return n;
      });
    } catch (e) { console.error(e); } finally { setDraggedDeal(null); }
  };

  const DealCard = ({ deal }) => (
    <div 
      className="kanban-card mb-3"
      style={{ borderLeft: `3px solid ${getPriorityBorder(deal.priority)}` }}
      draggable onDragStart={() => handleDragStart(deal)}
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar name={deal.brand_name} size="sm" square />
          <div>
            <h4 className="text-sm font-medium text-[#0F172A]">{deal.brand_name}</h4>
            <span className="text-[11px] text-[#94A3B8]">{deal.campaign_type || 'Campaign'}</span>
          </div>
        </div>
        <button className="text-[#CBD5E1] hover:text-[#94A3B8]"><MoreVertical className="w-3.5 h-3.5" /></button>
      </div>
      
      <div className="font-mono text-xl font-bold text-[#0F172A] mb-2">
        {formatNaira(deal.value, { compact: true })}
      </div>
      
      {deal.super_creative_name && (
        <div className="flex items-center gap-1 text-[11px] text-[#2F55FF] mb-2">
          <User className="w-3 h-3" /> {deal.super_creative_name}
        </div>
      )}
      
      <div className="flex items-center gap-1 text-[11px] text-[#CBD5E1] pt-2 border-t border-[#F1F5F9]">
        <Clock className="w-3 h-3" /> {formatRelativeTime(deal.last_activity)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-pipeline">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Pipeline</h1>
        <p className="text-[#94A3B8] text-sm">Drag deals between stages</p>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-4 min-w-max pb-4">
          {pipelineColumns.map((col) => {
            const deals = dealsByStatus[col.id] || [];
            const total = deals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div key={col.id} className="kanban-column w-72 flex-shrink-0" onDragOver={handleDragOver} onDrop={() => handleDrop(col.id)} data-testid={`pipeline-column-${col.id}`}>
                <div className="p-4 border-b border-[#F1F5F9]" style={{ borderTop: `2px solid ${col.color}` }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-medium text-[#64748B] uppercase tracking-wider">{col.label}</h3>
                    <span className="text-[11px] text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded-full font-mono">{deals.length}</span>
                  </div>
                  <div className="text-xs text-[#CBD5E1] font-mono">{formatNaira(total, { compact: true })}</div>
                </div>
                <div className="p-3 min-h-[300px]">
                  {loading ? (
                    <div className="space-y-3">{[1, 2].map(i => <div key={i} className="skeleton h-32 rounded-lg"></div>)}</div>
                  ) : deals.length === 0 ? (
                    <div className="text-center text-[#E2E8F0] text-xs py-12">No deals</div>
                  ) : deals.map(d => <DealCard key={d.id} deal={d} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StaffPipeline;
