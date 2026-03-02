import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSuperCreativeStats, getProjects, getWallet } from '../../lib/api';
import { formatNaira, formatRelativeTime } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { 
  Wallet, 
  FolderOpen, 
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock
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
    <div className="space-y-6 animate-fade-in" data-testid="super-creative-overview">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-1">
            Welcome back, {stats?.team_name || 'Mavin Records'}
          </h1>
          <p className="text-[#64748B] text-sm">
            You have {stats?.active_projects || 3} active projects and {stats?.opportunities_posted || 7} opportunities posted.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" data-testid="new-project-btn">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Wallet Card */}
      <div className="dashboard-card p-6 bg-gradient-to-r from-[#2F55FF]/20 to-[#6BFF9A]/10">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-[#22C55E]" />
          <h2 className="text-lg font-semibold text-[#0F172A]">TASCK Wallet</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-[#64748B] text-sm mb-1">Available</p>
            <p className="text-3xl font-bold text-[#0F172A] font-mono">
              {formatNaira(stats?.wallet_balance || 12450000, { compact: true })}
            </p>
          </div>
          <div>
            <p className="text-[#64748B] text-sm mb-1">Escrowed</p>
            <p className="text-3xl font-bold text-[#D97706] font-mono">
              {formatNaira(stats?.escrowed || 9000000, { compact: true })}
            </p>
          </div>
          <div>
            <p className="text-[#64748B] text-sm mb-1">Total</p>
            <p className="text-3xl font-bold text-[#22C55E] font-mono">
              {formatNaira(stats?.total_balance || 21450000, { compact: true })}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="btn-primary text-sm py-2 px-4">+ Fund Wallet</button>
          <button className="btn-secondary text-sm py-2 px-4 border-white/20 text-[#0F172A]">Withdraw</button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">Active Projects</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-4">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="bg-[#F8FAFC] rounded-lg p-4 hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                data-testid={`project-${project.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-[#0F172A] font-medium">{project.title}</h3>
                    <StatusBadge status={project.status} size="sm" className="mt-1" />
                  </div>
                  <span className="text-[#94A3B8] text-sm">{project.project_id}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span>Progress</span>
                    <span>{project.completion}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${project.completion}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
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

        {/* Recent Wallet Activity */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">Recent Activity</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-[#94A3B8] text-center py-8">No recent transactions</div>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
                  data-testid={`transaction-${tx.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.transaction_type === 'credit' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 
                      tx.transaction_type === 'escrow_hold' ? 'bg-[#FFFBEB] text-[#D97706]' :
                      'bg-[#FEF2F2] text-[#DC2626]'
                    }`}>
                      {tx.transaction_type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[#475569] text-sm">{tx.description}</p>
                      <p className="text-[#94A3B8] text-xs">{formatRelativeTime(tx.created_at)}</p>
                    </div>
                  </div>
                  <span className={`font-mono text-sm ${
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
