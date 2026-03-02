import React, { useState, useEffect } from 'react';
import { getAdminStats, getUsers } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  Users, 
  AlertTriangle,
  FileText,
  Wallet,
  Activity,
  Shield,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

export const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          getAdminStats(),
          getUsers()
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data.slice(0, 10));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sample disputes for demo
  const disputes = [
    {
      id: 'DSP-001',
      project: 'MTN Creator Tour',
      parties: 'Ade Adesanya vs MTN',
      issue: 'Late delivery, partial refund requested',
      status: 'Under Review',
      filed: '2 days ago'
    },
    {
      id: 'DSP-002',
      project: 'Jumia Campaign',
      parties: 'Tolu Akinwande vs YBNL',
      issue: 'Scope creep, additional work not compensated',
      status: 'Resolved',
      filed: '2 weeks ago'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-overview">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-white/50 text-sm">Platform governance and management</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="Total Users"
              value={stats?.total_users || 187}
              icon={<Users className="w-4 h-4" />}
            />
            <MetricCard
              title="Pending Verifications"
              value={stats?.pending_verifications || 12}
              icon={<Clock className="w-4 h-4" />}
            />
            <MetricCard
              title="Active Disputes"
              value={stats?.active_disputes || 2}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <MetricCard
              title="Platform Volume"
              value={formatNaira(stats?.platform_volume || 1200000000, { compact: true })}
              icon={<Wallet className="w-4 h-4" />}
            />
            <MetricCard
              title="Active Projects"
              value={stats?.active_projects || 11}
              icon={<Activity className="w-4 h-4" />}
            />
            <MetricCard
              title="Contracts MTD"
              value={stats?.contracts_mtd || 8}
              icon={<FileText className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Users</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-3">
            {users.slice(0, 6).map((user) => (
              <div 
                key={user.id}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                data-testid={`user-${user.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size="sm" />
                  <div>
                    <p className="text-white text-sm">{user.name}</p>
                    <p className="text-white/40 text-xs capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.verified ? (
                    <span className="flex items-center gap-1 text-xs text-[#6BFF9A]">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[#FFA502]">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disputes */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Disputes</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div 
                key={dispute.id}
                className="bg-white/5 rounded-lg p-4"
                data-testid={`dispute-${dispute.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-white/40 text-xs">{dispute.id}</span>
                    <h3 className="text-white font-medium">{dispute.project}</h3>
                    <p className="text-white/50 text-sm">{dispute.parties}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    dispute.status === 'Resolved' ? 'bg-[#6BFF9A]/20 text-[#6BFF9A]' : 'bg-[#FFA502]/20 text-[#FFA502]'
                  }`}>
                    {dispute.status}
                  </span>
                </div>
                <p className="text-white/40 text-sm">{dispute.issue}</p>
                <p className="text-white/30 text-xs mt-2">Filed: {dispute.filed}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
