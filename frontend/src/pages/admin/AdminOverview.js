import React, { useState, useEffect } from 'react';
import { getAdminStats, getUsers } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import DetailPopup from '../../components/shared/DetailPopup';
import Avatar from '../../components/shared/Avatar';
import { Users, AlertTriangle, FileText, Wallet, Activity, Shield, CheckCircle, Clock, XCircle, TrendingUp, BarChart3, Zap, Eye, DollarSign, ChevronRight, Star } from 'lucide-react';

const platformHealth = [
  { label: 'Uptime', value: '99.97%', status: 'good' },
  { label: 'API Latency', value: '42ms', status: 'good' },
  { label: 'Error Rate', value: '0.12%', status: 'good' },
  { label: 'Active Sessions', value: '847', status: 'normal' }
];

const revenueStreams = [
  { source: 'Platform Commission (8%)', amount: 96000000, pct: 48 },
  { source: 'Premium Subscriptions', amount: 42000000, pct: 21 },
  { source: 'Escrow Fees (1.5%)', amount: 28500000, pct: 14 },
  { source: 'Contract Automation', amount: 18000000, pct: 9 },
  { source: 'Verification Fees', amount: 15500000, pct: 8 }
];

const disputes = [
  { id: 'DSP-001', project: 'MTN Creator Tour', parties: 'Ade Adesanya vs MTN', issue: 'Late delivery, partial refund requested', status: 'Under Review', filed: '2d ago', amount: '₦3.2M' },
  { id: 'DSP-002', project: 'Jumia Campaign', parties: 'Tolu Akinwande vs YBNL', issue: 'Scope creep, additional work not compensated', status: 'Escalated', filed: '5d ago', amount: '₦1.8M' },
  { id: 'DSP-003', project: 'Glo Social Media', parties: 'Kelechi Obi vs Glo', issue: 'Payment delay beyond 30-day terms', status: 'Resolved', filed: '2w ago', amount: '₦850K' }
];

const complianceAlerts = [
  { title: 'KYC Verification Backlog', detail: '12 pending verifications > 48h SLA', severity: 'warning' },
  { title: 'Escrow Balance Audit', detail: 'Monthly reconciliation due Mar 5', severity: 'info' },
  { title: 'Contract Template Update', detail: 'Nigerian Labor Law changes effective Apr 1', severity: 'info' },
  { title: 'Anti-Money Laundering Check', detail: '2 flagged transactions under review', severity: 'warning' }
];

const topCreatives = [
  { name: 'Mavin Records', type: 'Super Creative', projects: 8, revenue: '₦84.5M', rating: 4.85 },
  { name: 'DMW', type: 'Super Creative', projects: 12, revenue: '₦67.2M', rating: 4.7 },
  { name: 'YBNL Nation', type: 'Super Creative', projects: 6, revenue: '₦45.8M', rating: 4.6 },
  { name: 'Spaceship', type: 'Super Creative', projects: 5, revenue: '₦38.1M', rating: 4.8 }
];

const topBrands = [
  { name: 'Guinness Nigeria', campaigns: 4, spend: '₦145M', satisfaction: '95%' },
  { name: 'MTN Nigeria', campaigns: 6, spend: '₦132M', satisfaction: '88%' },
  { name: 'Coca-Cola', campaigns: 3, spend: '₦98M', satisfaction: '92%' },
  { name: 'Access Bank', campaigns: 2, spend: '₦57M', satisfaction: '97%' }
];

const userGrowth = [
  { month: 'Dec', brands: 28, superCreatives: 12, creatives: 89 },
  { month: 'Jan', brands: 32, superCreatives: 14, creatives: 105 },
  { month: 'Feb', brands: 38, superCreatives: 16, creatives: 127 },
  { month: 'Mar (proj)', brands: 45, superCreatives: 19, creatives: 152 }
];

export const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([getAdminStats(), getUsers()]);
        setStats(statsRes.data);
        setUsers(usersRes.data.slice(0, 10));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="admin-overview">
      <WelcomeBanner role="admin" userName="Admin"
        subtitle="Platform governance: 187 users, ₦1.2B volume, 2 active disputes. All systems healthy."
        stats={[{ label: 'Users', value: '187' }, { label: 'Volume', value: '₦1.2B' }, { label: 'Revenue', value: '₦200M' }, { label: 'Disputes', value: '2' }, { label: 'Uptime', value: '99.97%' }]}
      />

      {/* Row 1: Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {loading ? Array(8).fill(0).map((_, i) => <MetricCardSkeleton key={i} />) : (<>
          <MetricCard title="Total Users" value="187" subtitle="38 brands, 16 SC, 127 creatives" icon={<Users className="w-3.5 h-3.5" />} />
          <MetricCard title="Platform Volume" value="₦1.2B" subtitle="All-time transactions" icon={<DollarSign className="w-3.5 h-3.5" />} />
          <MetricCard title="Revenue YTD" value="₦200M" subtitle="Target: ₦350M (57%)" change="+28%" icon={<TrendingUp className="w-3.5 h-3.5" />} />
          <MetricCard title="Active Projects" value="11" subtitle="Across platform" icon={<Activity className="w-3.5 h-3.5" />} />
          <MetricCard title="Pending KYC" value="12" subtitle="> 48h: 3" icon={<Clock className="w-3.5 h-3.5" />} />
          <MetricCard title="Active Disputes" value="2" subtitle="₦5M at risk" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
          <MetricCard title="Escrow Balance" value="₦142M" subtitle="Across 11 projects" icon={<Shield className="w-3.5 h-3.5" />} />
          <MetricCard title="Contracts MTD" value="8" subtitle="₦48M total value" icon={<FileText className="w-3.5 h-3.5" />} />
        </>)}
      </div>

      {/* Row 2: Platform Health + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="dashboard-card p-5">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Platform Health</h2>
            <div className="grid grid-cols-2 gap-2">
              {platformHealth.map(h => (
                <div key={h.label} onClick={() => setPopup({ type: 'health', data: h })} className="p-3 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                  <p className="text-[10px] text-[#94A3B8]">{h.label}</p>
                  <p className="text-sm font-bold text-[#0F172A]">{h.value}</p>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${h.status === 'good' ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card p-5">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Compliance & Alerts</h2>
            <div className="space-y-2">
              {complianceAlerts.map((a, i) => (
                <div key={i} onClick={() => setPopup({ type: 'alert', data: a })} className={`p-2.5 rounded-lg cursor-pointer transition-colors ${a.severity === 'warning' ? 'bg-[#FFFBEB] hover:bg-[#FEF3C7]' : 'bg-[#F8FAFC] hover:bg-[#F1F5F9]'}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.severity === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#2F55FF]'}`} />
                    <div><p className="text-xs font-medium text-[#0F172A]">{a.title}</p><p className="text-[10px] text-[#94A3B8]">{a.detail}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Revenue Breakdown</h2>
          <div className="space-y-3">
            {revenueStreams.map(r => (
              <div key={r.source} onClick={() => setPopup({ type: 'revenue', data: r })} className="cursor-pointer hover:bg-[#F8FAFC] p-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#475569]">{r.source}</span>
                  <span className="text-xs font-mono font-medium text-[#0F172A]">{formatNaira(r.amount, { compact: true })}</span>
                </div>
                <div className="h-2 bg-[#F1F5F9] rounded-full"><div className="h-full bg-[#2F55FF] rounded-full" style={{ width: `${r.pct}%` }} /></div>
                <p className="text-[9px] text-[#94A3B8] text-right mt-0.5">{r.pct}% of total</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-[10px] text-[#94A3B8]">Total Revenue YTD</span>
            <span className="text-sm font-bold text-[#0F172A] font-mono">₦200M</span>
          </div>
        </div>
      </div>

      {/* Row 3: Disputes + Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Active Disputes</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">All Disputes</button>
          </div>
          <div className="space-y-2">
            {disputes.map(d => (
              <div key={d.id} onClick={() => setPopup({ type: 'dispute', data: d })} className="p-3 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors" data-testid={`dispute-${d.id}`}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2"><span className="text-[10px] text-[#94A3B8]">{d.id}</span><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${d.status === 'Resolved' ? 'bg-[#ECFDF5] text-[#059669]' : d.status === 'Escalated' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FFFBEB] text-[#D97706]'}`}>{d.status}</span></div>
                    <p className="text-xs font-medium text-[#0F172A]">{d.project}</p>
                    <p className="text-[10px] text-[#64748B]">{d.parties}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#DC2626]">{d.amount}</span>
                </div>
                <p className="text-[10px] text-[#94A3B8]">{d.issue}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">User Growth</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">All Users</button>
          </div>
          <div className="space-y-2.5">
            {userGrowth.map(ug => (
              <div key={ug.month} onClick={() => setPopup({ type: 'growth', data: ug })} className="cursor-pointer hover:bg-[#F8FAFC] p-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#475569]">{ug.month}</span><span className="text-xs font-medium text-[#0F172A]">{ug.brands + ug.superCreatives + ug.creatives} total</span></div>
                <div className="flex gap-1 h-2">
                  <div className="bg-[#2F55FF] rounded-full" style={{ width: `${(ug.brands / (ug.brands + ug.superCreatives + ug.creatives)) * 100}%` }} title={`Brands: ${ug.brands}`} />
                  <div className="bg-[#8B5CF6] rounded-full" style={{ width: `${(ug.superCreatives / (ug.brands + ug.superCreatives + ug.creatives)) * 100}%` }} title={`Super Creatives: ${ug.superCreatives}`} />
                  <div className="bg-[#22C55E] rounded-full" style={{ width: `${(ug.creatives / (ug.brands + ug.superCreatives + ug.creatives)) * 100}%` }} title={`Creatives: ${ug.creatives}`} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[9px] text-[#94A3B8]"><span>Brands: {ug.brands}</span><span>SC: {ug.superCreatives}</span><span>Creatives: {ug.creatives}</span></div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#F1F5F9]">
            <span className="flex items-center gap-1 text-[9px] text-[#94A3B8]"><div className="w-2 h-2 rounded-full bg-[#2F55FF]" /> Brands</span>
            <span className="flex items-center gap-1 text-[9px] text-[#94A3B8]"><div className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> Super Creatives</span>
            <span className="flex items-center gap-1 text-[9px] text-[#94A3B8]"><div className="w-2 h-2 rounded-full bg-[#22C55E]" /> Creatives</span>
          </div>
        </div>
      </div>

      {/* Row 4: Top Creatives + Top Brands + Recent Users */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Top Creatives</h2>
          <div className="space-y-2">
            {topCreatives.map((c, i) => (
              <div key={c.name} onClick={() => setPopup({ type: 'topCreative', data: c })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <span className="text-[10px] text-[#94A3B8] w-4">#{i + 1}</span>
                <Avatar name={c.name} size="sm" />
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-[#0F172A] truncate">{c.name}</p><p className="text-[10px] text-[#94A3B8]">{c.projects} projects</p></div>
                <span className="text-[10px] font-mono text-[#22C55E]">{c.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Top Brands</h2>
          <div className="space-y-2">
            {topBrands.map((b, i) => (
              <div key={b.name} onClick={() => setPopup({ type: 'topBrand', data: b })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <span className="text-[10px] text-[#94A3B8] w-4">#{i + 1}</span>
                <Avatar name={b.name} size="sm" square />
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-[#0F172A] truncate">{b.name}</p><p className="text-[10px] text-[#94A3B8]">{b.campaigns} campaigns</p></div>
                <span className="text-[10px] font-mono text-[#0F172A]">{b.spend}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Users</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">All Users</button>
          </div>
          <div className="space-y-2">
            {users.slice(0, 6).map(user => (
              <div key={user.id} onClick={() => setPopup({ type: 'user', data: user })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors" data-testid={`user-${user.id}`}>
                <Avatar name={user.name} size="sm" />
                <div className="flex-1 min-w-0"><p className="text-xs text-[#475569] truncate">{user.name}</p><p className="text-[10px] text-[#94A3B8] capitalize">{user.role?.replace('_', ' ')}</p></div>
                {user.verified ? <span className="flex items-center gap-0.5 text-[9px] text-[#22C55E]"><CheckCircle className="w-2.5 h-2.5" /> Verified</span> : <span className="flex items-center gap-0.5 text-[9px] text-[#D97706]"><Clock className="w-2.5 h-2.5" /> Pending</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'dispute' ? `Dispute ${popup?.data?.id}` : popup?.type === 'revenue' ? popup?.data?.source : popup?.type === 'topCreative' ? popup?.data?.name : popup?.type === 'topBrand' ? popup?.data?.name : popup?.type === 'user' ? popup?.data?.name : popup?.type === 'alert' ? popup?.data?.title : popup?.type === 'growth' ? `${popup?.data?.month} Users` : popup?.type === 'health' ? popup?.data?.label : 'Details'}>
        {popup?.type === 'dispute' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Amount at Risk</p><p className="text-sm font-bold font-mono text-[#DC2626]">{popup.data.amount}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Status</p><p className="text-xs font-medium">{popup.data.status}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Project</p><p className="text-xs">{popup.data.project}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Parties</p><p className="text-xs">{popup.data.parties}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Issue</p><p className="text-xs">{popup.data.issue}</p></div>
            <div className="flex gap-2"><button className="btn-primary text-xs flex-1 py-2">Resolve</button><button className="btn-secondary text-xs flex-1 py-2">Escalate</button></div>
          </div>
        )}
        {popup?.type === 'revenue' && popup?.data && (
          <div className="bg-[#F8FAFC] rounded-lg p-4"><p className="text-[10px] text-[#94A3B8]">Revenue</p><p className="text-lg font-bold font-mono">{formatNaira(popup.data.amount)}</p><p className="text-xs text-[#94A3B8]">{popup.data.pct}% of total platform revenue</p></div>
        )}
        {popup?.type === 'topCreative' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.name} size="md" /><div><p className="text-sm font-medium">{popup.data.name}</p><p className="text-xs text-[#94A3B8]">{popup.data.type}</p></div></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Projects</p><p className="text-sm font-bold">{popup.data.projects}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Revenue</p><p className="text-sm font-bold font-mono text-[#22C55E]">{popup.data.revenue}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Rating</p><p className="text-sm font-bold">{popup.data.rating}</p></div>
            </div>
            <button className="btn-primary text-xs w-full py-2">View Profile</button>
          </div>
        )}
        {popup?.type === 'topBrand' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.name} size="md" square /><div><p className="text-sm font-medium">{popup.data.name}</p><p className="text-xs text-[#94A3B8]">{popup.data.campaigns} campaigns</p></div></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Total Spend</p><p className="text-sm font-bold font-mono">{popup.data.spend}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Satisfaction</p><p className="text-sm font-bold text-[#22C55E]">{popup.data.satisfaction}</p></div>
            </div>
            <button className="btn-primary text-xs w-full py-2">View Brand</button>
          </div>
        )}
        {popup?.type === 'user' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.name} size="md" /><div><p className="text-sm font-medium">{popup.data.name}</p><p className="text-xs text-[#94A3B8] capitalize">{popup.data.role?.replace('_', ' ')}</p></div></div>
            <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Verification</p><p className="text-xs font-medium">{popup.data.verified ? 'Verified' : 'Pending Verification'}</p></div>
            <div className="flex gap-2"><button className="btn-primary text-xs flex-1 py-2">View Profile</button>{!popup.data.verified && <button className="btn-secondary text-xs flex-1 py-2">Verify</button>}</div>
          </div>
        )}
        {popup?.type === 'alert' && popup?.data && (
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${popup.data.severity === 'warning' ? 'bg-[#FFFBEB]' : 'bg-[#EEF2FF]'}`}><p className="text-xs">{popup.data.detail}</p></div>
            <button className="btn-primary text-xs w-full py-2">Take Action</button>
          </div>
        )}
        {popup?.type === 'growth' && popup?.data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#EEF2FF] rounded-lg p-3 text-center"><p className="text-[10px] text-[#2F55FF]">Brands</p><p className="text-lg font-bold">{popup.data.brands}</p></div>
            <div className="bg-[#F3E8FF] rounded-lg p-3 text-center"><p className="text-[10px] text-[#8B5CF6]">Super Creatives</p><p className="text-lg font-bold">{popup.data.superCreatives}</p></div>
            <div className="bg-[#ECFDF5] rounded-lg p-3 text-center"><p className="text-[10px] text-[#22C55E]">Creatives</p><p className="text-lg font-bold">{popup.data.creatives}</p></div>
          </div>
        )}
        {popup?.type === 'health' && popup?.data && (
          <div className="bg-[#F8FAFC] rounded-lg p-4 text-center"><p className="text-2xl font-bold text-[#0F172A]">{popup.data.value}</p><p className="text-xs text-[#94A3B8]">Status: {popup.data.status === 'good' ? 'Healthy' : 'Normal'}</p></div>
        )}
      </DetailPopup>
    </div>
  );
};

export default AdminOverview;
