import React, { useState, useEffect } from 'react';
import { getPipelineSummary, updateDealStatus } from '../../lib/api';
import { formatNaira, formatRelativeTime, truncate } from '../../lib/utils';
import { StatusBadge, PriorityBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  MoreVertical, 
  ChevronRight, 
  Building2, 
  User,
  Clock,
  DollarSign
} from 'lucide-react';

const pipelineColumns = [
  { id: 'lead', label: 'Lead', color: 'bg-white/20' },
  { id: 'discovery', label: 'Discovery', color: 'bg-[#2F55FF]/30' },
  { id: 'scoping', label: 'Scoping', color: 'bg-[#2F55FF]/50' },
  { id: 'awaiting_nda', label: 'Awaiting NDA', color: 'bg-[#FFA502]/30' },
  { id: 'awaiting_terms', label: 'Awaiting Terms', color: 'bg-[#FFA502]/50' },
  { id: 'active', label: 'Active', color: 'bg-[#6BFF9A]/30' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-[#6BFF9A]/50' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-[#FF4757]/30' }
];

export const StaffPipeline = () => {
  const [dealsByStatus, setDealsByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

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

  const handleDragStart = (deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (status) => {
    if (!draggedDeal || draggedDeal.status === status) {
      setDraggedDeal(null);
      return;
    }

    try {
      await updateDealStatus(draggedDeal.id, status);
      // Update local state
      setDealsByStatus(prev => {
        const newState = { ...prev };
        // Remove from old column
        newState[draggedDeal.status] = (newState[draggedDeal.status] || []).filter(d => d.id !== draggedDeal.id);
        // Add to new column
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
      draggable
      onDragStart={() => handleDragStart(deal)}
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar name={deal.brand_name} size="sm" />
          <div>
            <h4 className="text-sm font-medium text-white">{deal.brand_name}</h4>
            <span className="text-xs text-white/40">{deal.campaign_type || 'Campaign'}</span>
          </div>
        </div>
        <button className="text-white/40 hover:text-white">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      
      <div className="text-lg font-mono text-[#6BFF9A] mb-2">
        {formatNaira(deal.value, { compact: true })}
      </div>
      
      {deal.super_creative_name && (
        <div className="flex items-center gap-1 text-xs text-white/50 mb-2">
          <User className="w-3 h-3" />
          {deal.super_creative_name}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-white/40">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(deal.last_activity)}
        </div>
        <PriorityBadge priority={deal.priority} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-pipeline">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-white/50 text-sm">Drag deals between stages to update status</p>
        </div>
      </div>

      <div className="overflow-x-auto">
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
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-white">{column.label}</h3>
                    <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                      {deals.length}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">
                    {formatNaira(totalValue, { compact: true })}
                  </div>
                </div>
                
                <div className="p-4 min-h-[300px]">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="skeleton h-32 rounded-lg"></div>
                      ))}
                    </div>
                  ) : deals.length === 0 ? (
                    <div className="text-center text-white/20 text-sm py-8">
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
