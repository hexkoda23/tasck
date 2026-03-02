import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDeals } from '../../lib/api';
import { formatNaira, formatRelativeTime, formatStatus, getStatusColor } from '../../lib/utils';
import { StatusBadge, PriorityBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  Search, 
  Filter, 
  Plus,
  ChevronRight,
  Building2,
  User,
  Calendar,
  ArrowUpRight
} from 'lucide-react';

export const StaffDeals = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await getDeals();
        setDeals(response.data);
      } catch (error) {
        console.error('Error fetching deals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const filteredDeals = filter === 'all' 
    ? deals 
    : deals.filter(d => d.status === filter);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-deals">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Deals</h1>
          <p className="text-[#64748B] text-sm">{deals.length} total deals</p>
        </div>
        <button className="btn-primary flex items-center gap-2" data-testid="new-deal-btn">
          <Plus className="w-4 h-4" />
          New Deal
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input 
            type="text"
            placeholder="Search deals..."
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
        >
          <option value="all">All Status</option>
          <option value="lead">Lead</option>
          <option value="discovery">Discovery</option>
          <option value="scoping">Scoping</option>
          <option value="awaiting_nda">Awaiting NDA</option>
          <option value="awaiting_terms">Awaiting Terms</option>
          <option value="active">Active</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
      </div>

      {/* Deals Table */}
      <div className="dashboard-card overflow-hidden">
        <table className="data-table" data-testid="deals-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Brand</th>
              <th>Artist</th>
              <th>Value</th>
              <th>Status</th>
              <th>Last Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="skeleton h-12 w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredDeals.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-[#94A3B8] py-8">
                  No deals found
                </td>
              </tr>
            ) : (
              filteredDeals.map((deal) => (
                <tr key={deal.id} className="group" data-testid={`deal-row-${deal.id}`}>
                  <td>
                    <div>
                      <div className="text-[#0F172A] font-medium">{deal.deal_id}</div>
                      <div className="text-[#64748B] text-xs truncate max-w-xs">{deal.title}</div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={deal.brand_name} size="sm" />
                      <span className="text-[#334155]">{deal.brand_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[#64748B]">{deal.super_creative_name || '—'}</span>
                  </td>
                  <td>
                    <span className="text-[#22C55E] font-mono">{formatNaira(deal.value, { compact: true })}</span>
                  </td>
                  <td>
                    <StatusBadge status={deal.status} />
                  </td>
                  <td>
                    <span className="text-[#94A3B8] text-sm">{formatRelativeTime(deal.last_activity)}</span>
                  </td>
                  <td>
                    <Link 
                      to={`/staff/deals/${deal.id}`}
                      className="opacity-0 group-hover:opacity-100 text-[#2F55FF] hover:text-[#2F55FF]/80 transition-opacity"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffDeals;
