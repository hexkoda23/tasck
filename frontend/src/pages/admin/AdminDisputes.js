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
      under_review: 'bg-[#FFA502]/20 text-[#FFA502]',
      resolved: 'bg-[#6BFF9A]/20 text-[#6BFF9A]',
      pending_response: 'bg-[#2F55FF]/20 text-[#2F55FF]',
      escalated: 'bg-[#FF4757]/20 text-[#FF4757]'
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
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="text-white/50 text-sm">Manage platform disputes and resolutions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Open Disputes</p>
          <p className="text-2xl font-bold text-[#FFA502]">2</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Under Review</p>
          <p className="text-2xl font-bold text-white">1</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Resolved (MTD)</p>
          <p className="text-2xl font-bold text-[#6BFF9A]">1</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Total Value</p>
          <p className="text-2xl font-bold text-white font-mono">₦780K</p>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="dashboard-card p-6" data-testid={`dispute-${dispute.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-white/40 text-sm">{dispute.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(dispute.status)}`}>
                    {formatStatus(dispute.status)}
                  </span>
                  {dispute.priority === 'high' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF4757]/20 text-[#FF4757]">
                      HIGH PRIORITY
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">{dispute.project}</h3>
                <p className="text-white/50 text-sm">{dispute.projectId}</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs">Disputed Amount</p>
                <p className="text-xl font-mono text-[#FF4757]">₦{dispute.amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs mb-2">Claimant</p>
                <div className="flex items-center gap-2">
                  <Avatar name={dispute.claimant} size="sm" />
                  <div>
                    <p className="text-white text-sm">{dispute.claimant}</p>
                    <p className="text-white/40 text-xs">{dispute.claimantRole}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs mb-2">Respondent</p>
                <div className="flex items-center gap-2">
                  <Avatar name={dispute.respondent} size="sm" />
                  <div>
                    <p className="text-white text-sm">{dispute.respondent}</p>
                    <p className="text-white/40 text-xs">{dispute.respondentRole}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Issue */}
            <div className="mb-4">
              <p className="text-white/40 text-xs mb-1">Issue Description</p>
              <p className="text-white/80 text-sm">{dispute.issue}</p>
            </div>

            {dispute.resolution && (
              <div className="mb-4 bg-[#6BFF9A]/10 border border-[#6BFF9A]/20 rounded-lg p-3">
                <p className="text-[#6BFF9A] text-xs mb-1">Resolution</p>
                <p className="text-white text-sm">{dispute.resolution}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-4 text-xs text-white/40">
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
