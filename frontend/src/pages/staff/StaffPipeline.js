import React, { useState, useEffect } from 'react';
import { getPipelineSummary, updateDealStatus } from '../../lib/api';
import { formatNaira, formatRelativeTime } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { 
  MoreVertical, 
  User,
  Clock
} from 'lucide-react';

const pipelineColumns = [
  { id: 'lead', label: 'Lead', borderColor: '#6B7280' },
  { id: 'discovery', label: 'Discovery', borderColor: '#2F55FF' },
  { id: 'scoping', label: 'Scoping', borderColor: '#6366F1' },
  { id: 'awaiting_nda', label: 'Awaiting NDA', borderColor: '#FFA502' },
  { id: 'awaiting_terms', label: 'Awaiting Terms', borderColor: '#F59E0B' },
  { id: 'active', label: 'Active', borderColor: '#6BFF9A' },
  { id: 'closed_won', label: 'Closed Won', borderColor: '#10B981' },
  { id: 'closed_lost', label: 'Closed Lost', borderColor: '#FF4757' }
];

const getPriorityBorderColor = (priority) => {
  if (priority === 'high') return '#FF4757';
  if (priority === 'medium') return '#FFA502';
  return '#6B7280';
};

export const StaffPipeline = () => {
  const [dealsByStatus, setDealsByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState(null);

  useEffect(() => { fetchPipeline(); }, []);

  const fetchPipeline = async () => {
    try {
      const response = await getPipelineSummary();
      setDealsByStatus(response.data.deals_by_status || {});
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (deal) => setDraggedDeal(deal);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (status) => {
    if (!draggedDeal || draggedDeal.status === status) {
      setDraggedDeal(null);
      return;
    }
    try {
      await updateDealStatus(draggedDeal.id, status);
      setDealsByStatus(prev => {
        const newState = { ...prev };
        newState[draggedDeal.status] = (newState[draggedDeal.status] || []).filter(d => d.id !== draggedDeal.id);
        newState[status] = [...(newState[status] || []), { ...draggedDeal, status }];
        return newState;
      });
    } catch (error) {
      console.error('Error updating deal status:', error);
    } finally {
      setDraggedDeal(null);
    }
  };

  const DealCard = ({ deal }) => (
    <div 
      className="kanban-card mb-3"
      style={{ borderLeft: `3px solid ${getPriorityBorderColor(deal.priority)}` }}
      draggable
      onDragStart={() => handleDragStart(deal)}
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar name={deal.brand_name} size="sm" square />
          <div>
            <h4 className="text-sm font-medium text-white">{deal.brand_name}</h4>
            <span className="text-[11px] text-white/30">{deal.campaign_type || 'Campaign'}</span>
          </div>
        </div>
        <button className="text-white/20 hover:text-white/50 transition-colors">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="big-number text-[24px] mb-2" style={{ fontSize: '24px' }}>
        {formatNaira(deal.value, { compact: true })}
      </div>
      
      {deal.super_creative_name && (
        <div className="flex items-center gap-1 text-[11px] text-[#6BFF9A]/70 mb-2">
          <User className="w-3 h-3" />
          {deal.super_creative_name}
        </div>
      )}
      
      <div className="flex items-center gap-1 text-[11px] text-white/25 pt-2 border-t border-white/5">
        <Clock className="w-3 h-3" />
        {formatRelativeTime(deal.last_activity)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-pipeline">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Pipeline</h1>
        <p className="text-white/35 text-sm">Drag deals between stages to update status</p>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-4 min-w-max pb-4">
          {pipelineColumns.map((column) => {
            const deals = dealsByStatus[column.id] || [];
            const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
            
            return (
              <div 
                key={column.id}
                className="kanban-column w-72 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                data-testid={`pipeline-column-${column.id}`}
              >
                {/* Column header with colored top border */}
                <div className="p-4 border-b border-white/5" style={{ borderTop: `2px solid ${column.borderColor}` }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-medium text-white/80 uppercase tracking-wider">{column.label}</h3>
                    <span className="text-[11px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full font-mono">
                      {deals.length}
                    </span>
                  </div>
                  <div className="text-xs text-white/25 font-mono">
                    {formatNaira(totalValue, { compact: true })}
                  </div>
                </div>
                
                <div className="p-3 min-h-[300px]">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="skeleton h-32 rounded-lg"></div>
                      ))}
                    </div>
                  ) : deals.length === 0 ? (
                    <div className="text-center text-white/15 text-xs py-12">
                      No deals
                    </div>
                  ) : (
                    deals.map(deal => <DealCard key={deal.id} deal={deal} />)
                  )}
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
