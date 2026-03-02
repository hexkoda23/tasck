import React, { useState, useEffect } from 'react';
import { getOpportunities } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { Target, Search, Filter, Users, Clock } from 'lucide-react';

export const StaffOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await getOpportunities();
        setOpportunities(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-white/50 text-sm">{opportunities.length} opportunities across all projects</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Search opportunities..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="dashboard-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Project</th>
              <th>Client</th>
              <th>Budget</th>
              <th>Creative</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton h-12 w-full"></div></td></tr>
              ))
            ) : (
              opportunities.map((opp) => (
                <tr key={opp.id} className="group">
                  <td>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#2F55FF]" />
                      <span className="text-white font-medium">{opp.role}</span>
                    </div>
                  </td>
                  <td className="text-white/60 text-sm">{opp.project_title}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={opp.client_name} size="sm" />
                      <span className="text-white/80 text-sm">{opp.client_name}</span>
                    </div>
                  </td>
                  <td className="text-[#6BFF9A] font-mono">{formatNaira(opp.budget, { compact: true })}</td>
                  <td>
                    {opp.creative_name ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={opp.creative_name} size="sm" />
                        <span className="text-white/80 text-sm">{opp.creative_name}</span>
                      </div>
                    ) : (
                      <span className="text-white/40 text-sm">Unfilled</span>
                    )}
                  </td>
                  <td><StatusBadge status={opp.status} /></td>
                  <td>
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                        <span>{opp.tasks_completed}/{opp.tasks_count}</span>
                      </div>
                      <div className="progress-bar h-1">
                        <div className="progress-bar-fill" style={{ width: opp.tasks_count ? `${(opp.tasks_completed / opp.tasks_count) * 100}%` : '0%' }}></div>
                      </div>
                    </div>
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

export default StaffOpportunities;
