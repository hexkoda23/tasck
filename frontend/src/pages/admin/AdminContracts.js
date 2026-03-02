import React from 'react';
import Avatar from '../../components/shared/Avatar';
import { FileText, Download, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const contracts = [
  {
    id: 'CTR-2026-0042',
    title: 'Burna Boy x Guinness Nigeria — Brand Activation',
    parties: ['Spaceship (Burna Boy)', 'Guinness Nigeria', 'TASCK'],
    value: 45000000,
    status: 'pending_signature',
    type: 'Brand Activation',
    created: '2026-03-01',
    expires: '2026-03-08'
  },
  {
    id: 'CTR-2026-0041',
    title: 'Tems x MTN Nigeria — Brand Ambassador 2026',
    parties: ['Leading Vibes (Tems)', 'MTN Nigeria', 'TASCK'],
    value: 62000000,
    status: 'draft',
    type: 'Brand Ambassador',
    created: '2026-02-28',
    expires: '2026-03-10'
  },
  {
    id: 'CTR-2026-0038',
    title: 'Kelechi Amadi-Obi — Concert Photography',
    parties: ['Kelechi Amadi-Obi', 'Mavin Records', 'TASCK'],
    value: 1500000,
    status: 'signed',
    type: 'Service Agreement',
    created: '2026-02-20',
    signedDate: '2026-02-22'
  },
  {
    id: 'CTR-2026-0037',
    title: 'Ade Adesanya — Videography Services',
    parties: ['Ade Adesanya', 'Mavin Records', 'TASCK'],
    value: 1200000,
    status: 'signed',
    type: 'Service Agreement',
    created: '2026-02-18',
    signedDate: '2026-02-19'
  },
  {
    id: 'CTR-2026-0035',
    title: 'Davido x Pepsi Nigeria — National Campaign',
    parties: ['DMW (Davido)', 'Pepsi Nigeria', 'TASCK'],
    value: 85000000,
    status: 'active',
    type: 'Brand Campaign',
    created: '2026-01-10',
    signedDate: '2026-01-15'
  },
  {
    id: 'CTR-2026-0030',
    title: 'Don Jazzy x Johnnie Walker — Walk With Giants',
    parties: ['Mavin Records (Don Jazzy)', 'Diageo Nigeria', 'TASCK'],
    value: 25000000,
    status: 'active',
    type: 'Brand Ambassador',
    created: '2025-12-15',
    signedDate: '2025-12-20'
  }
];

export const AdminContracts = () => {
  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-[#F1F5F9] text-[#64748B]',
      pending_signature: 'bg-[#FFFBEB] text-[#D97706]',
      signed: 'bg-[#EEF2FF] text-[#2F55FF]',
      active: 'bg-[#22C55E]/20 text-[#22C55E]',
      completed: 'bg-[#F1F5F9] text-[#64748B]',
      terminated: 'bg-[#FEF2F2] text-[#DC2626]'
    };
    return styles[status] || styles.draft;
  };

  const formatStatus = (status) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const formatNaira = (amount) => `₦${(amount / 1000000).toFixed(1)}M`;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-contracts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Contracts</h1>
          <p className="text-[#64748B] text-sm">Platform contract management</p>
        </div>
        <button className="btn-primary">+ Generate Contract</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Contracts</p>
          <p className="text-2xl font-bold text-[#0F172A]">{contracts.length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Pending Signature</p>
          <p className="text-2xl font-bold text-[#D97706]">{contracts.filter(c => c.status === 'pending_signature').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Active</p>
          <p className="text-2xl font-bold text-[#22C55E]">{contracts.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Value</p>
          <p className="text-2xl font-bold text-[#0F172A] font-mono">₦219.7M</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">This Month</p>
          <p className="text-2xl font-bold text-[#0F172A]">8</p>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="dashboard-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Parties</th>
              <th>Type</th>
              <th>Value</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id} className="group">
                <td>
                  <div>
                    <p className="text-[#0F172A] font-medium">{contract.id}</p>
                    <p className="text-[#64748B] text-xs truncate max-w-xs">{contract.title}</p>
                  </div>
                </td>
                <td>
                  <div className="flex -space-x-2">
                    {contract.parties.slice(0, 3).map((party, i) => (
                      <Avatar key={i} name={party} size="sm" className="border-2 border-[#0A1A30]" />
                    ))}
                  </div>
                </td>
                <td className="text-[#64748B] text-sm">{contract.type}</td>
                <td className="text-[#22C55E] font-mono">{formatNaira(contract.value)}</td>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(contract.status)}`}>
                    {formatStatus(contract.status)}
                  </span>
                </td>
                <td className="text-[#94A3B8] text-sm">{contract.signedDate || contract.created}</td>
                <td>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <button className="text-[#94A3B8] hover:text-[#0F172A]"><Eye className="w-4 h-4" /></button>
                    <button className="text-[#94A3B8] hover:text-[#0F172A]"><Download className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminContracts;
