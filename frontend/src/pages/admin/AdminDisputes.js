import React from 'react';
import Avatar from '../../components/shared/Avatar';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  MessageSquare,
  FileText,
  ArrowRight
} from 'lucide-react';

const disputes = [
  {
    id: 'DSP-2026-001',
    project: 'MTN Creator Tour',
    projectId: 'PRJ-2026-0024',
    claimant: 'Ade Adesanya',
    claimantRole: 'Creative',
    respondent: 'MTN Nigeria',
    respondentRole: 'Brand',
    issue: 'Late delivery dispute - partial refund requested due to delayed video content',
    amount: 250000,
    status: 'under_review',
    priority: 'high',
    filed: '2026-02-26',
    lastUpdate: '2 hours ago'
  },
  {
    id: 'DSP-2026-002',
    project: 'Jumia E-Commerce Campaign',
    projectId: 'PRJ-2026-0015',
    claimant: 'Tolu Akinwande',
    claimantRole: 'Creative',
    respondent: 'YBNL (Olamide)',
    respondentRole: 'Super Creative',
    issue: 'Scope creep - additional design work not compensated per original contract',
    amount: 180000,
    status: 'resolved',
    priority: 'medium',
    filed: '2026-02-15',
    resolution: 'Additional payment of ₦120,000 approved',
    lastUpdate: '1 week ago'
  },
  {
    id: 'DSP-2026-003',
    project: 'Pepsi Street Vibes',
    projectId: 'PRJ-2026-0018',
    claimant: 'Chidinma Okafor',
    claimantRole: 'Creative',
    respondent: 'DMW (Davido)',
    respondentRole: 'Super Creative',
    issue: 'Content usage dispute - social media content used beyond agreed scope',
    amount: 350000,
    status: 'pending_response',
    priority: 'high',
    filed: '2026-02-28',
    lastUpdate: '1 day ago'
  }
];

export const AdminDisputes = () => {
  const getStatusBadge = (status) => {
    const styles = {
      under_review: 'bg-[#FFFBEB] text-[#D97706]',
      resolved: 'bg-[#22C55E]/20 text-[#22C55E]',
      pending_response: 'bg-[#EEF2FF] text-[#2F55FF]',
      escalated: 'bg-[#FEF2F2] text-[#DC2626]'
    };
    return styles[status] || styles.pending_response;
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-disputes">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Disputes</h1>
          <p className="text-[#64748B] text-sm">Manage platform disputes and resolutions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Open Disputes</p>
          <p className="text-lg font-bold text-[#D97706]">2</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Under Review</p>
          <p className="text-lg font-bold text-[#0F172A]">1</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Resolved (MTD)</p>
          <p className="text-lg font-bold text-[#22C55E]">1</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Value</p>
          <p className="text-lg font-bold text-[#0F172A] font-mono">₦780K</p>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="dashboard-card p-5" data-testid={`dispute-${dispute.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[#94A3B8] text-sm">{dispute.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(dispute.status)}`}>
                    {formatStatus(dispute.status)}
                  </span>
                  {dispute.priority === 'high' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">
                      HIGH PRIORITY
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A]">{dispute.project}</h3>
                <p className="text-[#64748B] text-sm">{dispute.projectId}</p>
              </div>
              <div className="text-right">
                <p className="text-[#94A3B8] text-xs">Disputed Amount</p>
                <p className="text-xl font-mono text-[#DC2626]">₦{dispute.amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[#94A3B8] text-xs mb-2">Claimant</p>
                <div className="flex items-center gap-2">
                  <Avatar name={dispute.claimant} size="sm" />
                  <div>
                    <p className="text-[#475569] text-sm">{dispute.claimant}</p>
                    <p className="text-[#94A3B8] text-xs">{dispute.claimantRole}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[#94A3B8] text-xs mb-2">Respondent</p>
                <div className="flex items-center gap-2">
                  <Avatar name={dispute.respondent} size="sm" />
                  <div>
                    <p className="text-[#475569] text-sm">{dispute.respondent}</p>
                    <p className="text-[#94A3B8] text-xs">{dispute.respondentRole}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Issue */}
            <div className="mb-4">
              <p className="text-[#94A3B8] text-xs mb-1">Issue Description</p>
              <p className="text-[#334155] text-sm">{dispute.issue}</p>
            </div>

            {dispute.resolution && (
              <div className="mb-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg p-3">
                <p className="text-[#22C55E] text-xs mb-1">Resolution</p>
                <p className="text-[#475569] text-sm">{dispute.resolution}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                <span>Filed: {dispute.filed}</span>
                <span>Last update: {dispute.lastUpdate}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost text-sm flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Messages
                </button>
                <button className="btn-ghost text-sm flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Evidence
                </button>
                <button className="btn-primary text-sm py-1.5 px-3">
                  Review <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDisputes;
