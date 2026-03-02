import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSuperCreativeStats, getProjects, getWallet } from '../../lib/api';
import { formatNaira, formatRelativeTime } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { 
  Wallet, FolderOpen, Target, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export const SuperCreativeOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, projectsRes, walletRes] = await Promise.all([
          getSuperCreativeStats(user?.id || 'sc-001'),
          getProjects({ super_creative_id: user?.id || 'sc-001' }),
          getWallet(user?.id || 'sc-001')
        ]);
        setStats(statsRes.data);
        setProjects(projectsRes.data.filter(p => p.status !== 'completed').slice(0, 3));
        setTransactions(walletRes.data.transactions?.slice(0, 5) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="super-creative-overview">
      <WelcomeBanner
        role="super_creative"
        userName={stats?.team_name || 'Mavin Records'}
        subtitle={`${stats?.active_projects || 3} active projects and ${stats?.opportunities_posted || 7} opportunities posted.`}
        stats={[
          { label: 'Available', value: formatNaira(stats?.wallet_balance || 12450000, { compact: true }) },
          { label: 'Escrowed', value: formatNaira(stats?.escrowed || 9000000, { compact: true }) },
          { label: 'Projects', value: String(stats?.active_projects || 3) }
        ]}
      />

      {/* Wallet Quick View */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          title="Available Balance"
          value={formatNaira(stats?.wallet_balance || 12450000, { compact: true })}
          icon={<Wallet className="w-3.5 h-3.5" />}
        />
        <MetricCard
          title="In Escrow"
          value={formatNaira(stats?.escrowed || 9000000, { compact: true })}
          subtitle="Across 3 projects"
        />
        <MetricCard
          title="Total Balance"
          value={formatNaira(stats?.total_balance || 21450000, { compact: true })}
          change="+12% this month"
        />
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Projects */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Active Projects</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="bg-[#F8FAFC] rounded-lg p-3 hover:bg-[#F1F5F9] transition-colors cursor-pointer" data-testid={`project-${project.id}`}>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <h3 className="text-xs font-medium text-[#0F172A]">{project.title}</h3>
                    <StatusBadge status={project.status} size="sm" className="mt-1" />
                  </div>
                  <span className="text-[#94A3B8] text-[10px]">{project.project_id}</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                    <span>Progress</span>
                    <span>{project.completion}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${project.completion}%` }}></div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-[#94A3B8]">Budget</span>
                    <p className="text-[#0F172A] font-mono">{formatNaira(project.budget, { compact: true })}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Hired</span>
                    <p className="text-[#0F172A]">{project.opportunities_filled}/{project.opportunities_count}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Tasks</span>
                    <p className="text-[#0F172A]">{project.tasks_completed}/{project.tasks_total}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Activity</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-[#94A3B8] text-xs text-center py-8">No recent transactions</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9] last:border-0" data-testid={`transaction-${tx.id}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      tx.transaction_type === 'credit' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 
                      tx.transaction_type === 'escrow_hold' ? 'bg-[#FFFBEB] text-[#D97706]' :
                      'bg-[#FEF2F2] text-[#DC2626]'
                    }`}>
                      {tx.transaction_type === 'credit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    </div>
                    <div>
                      <p className="text-[#475569] text-xs">{tx.description}</p>
                      <p className="text-[#94A3B8] text-[10px]">{formatRelativeTime(tx.created_at)}</p>
                    </div>
                  </div>
                  <span className={`font-mono text-xs ${
                    tx.transaction_type === 'credit' ? 'text-[#22C55E]' : 'text-[#64748B]'
                  }`}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}{formatNaira(tx.amount, { compact: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperCreativeOverview;
