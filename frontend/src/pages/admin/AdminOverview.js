import React, { useState, useEffect } from 'react';
import { getAdminStats, getUsers } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  Users, AlertTriangle, FileText, Wallet, Activity, Shield, CheckCircle, Clock, XCircle
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

  const disputes = [
    {
      id: 'DSP-001', project: 'MTN Creator Tour', parties: 'Ade Adesanya vs MTN',
      issue: 'Late delivery, partial refund requested', status: 'Under Review', filed: '2 days ago'
    },
    {
      id: 'DSP-002', project: 'Jumia Campaign', parties: 'Tolu Akinwande vs YBNL',
      issue: 'Scope creep, additional work not compensated', status: 'Resolved', filed: '2 weeks ago'
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in" data-testid="admin-overview">
      <WelcomeBanner
        role="admin"
        userName="Admin"
        subtitle="Platform governance and management overview."
        stats={[
          { label: 'Users', value: String(stats?.total_users || 187) },
          { label: 'Volume', value: formatNaira(stats?.platform_volume || 1200000000, { compact: true }) },
          { label: 'Disputes', value: String(stats?.active_disputes || 2) }
        ]}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title="Total Users" value={stats?.total_users || 187} icon={<Users className="w-3.5 h-3.5" />} />
            <MetricCard title="Pending Verifications" value={stats?.pending_verifications || 12} icon={<Clock className="w-3.5 h-3.5" />} />
            <MetricCard title="Active Disputes" value={stats?.active_disputes || 2} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
            <MetricCard title="Platform Volume" value={formatNaira(stats?.platform_volume || 1200000000, { compact: true })} icon={<Wallet className="w-3.5 h-3.5" />} />
            <MetricCard title="Active Projects" value={stats?.active_projects || 11} icon={<Activity className="w-3.5 h-3.5" />} />
            <MetricCard title="Contracts MTD" value={stats?.contracts_mtd || 8} icon={<FileText className="w-3.5 h-3.5" />} />
          </>
        )}
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Users */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Users</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {users.slice(0, 6).map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0" data-testid={`user-${user.id}`}>
                <div className="flex items-center gap-2.5">
                  <Avatar name={user.name} size="sm" />
                  <div>
                    <p className="text-[#475569] text-xs">{user.name}</p>
                    <p className="text-[#94A3B8] text-[10px] capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div>
                  {user.verified ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#22C55E]">
                      <CheckCircle className="w-2.5 h-2.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-[#D97706]">
                      <Clock className="w-2.5 h-2.5" /> Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disputes */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Active Disputes</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="bg-[#F8FAFC] rounded-lg p-3" data-testid={`dispute-${dispute.id}`}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="text-[#94A3B8] text-[10px]">{dispute.id}</span>
                    <h3 className="text-xs font-medium text-[#0F172A]">{dispute.project}</h3>
                    <p className="text-[#64748B] text-[10px]">{dispute.parties}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    dispute.status === 'Resolved' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#FFFBEB] text-[#D97706]'
                  }`}>
                    {dispute.status}
                  </span>
                </div>
                <p className="text-[#94A3B8] text-[10px]">{dispute.issue}</p>
                <p className="text-[#CBD5E1] text-[10px] mt-1">Filed: {dispute.filed}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
