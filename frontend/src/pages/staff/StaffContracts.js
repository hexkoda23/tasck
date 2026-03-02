import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { FileText, Send, CheckCircle, Clock, AlertCircle, Download, Eye, Plus, X, ChevronRight, Pen } from 'lucide-react';

const contracts = [
  {
    id: 'CTR-2026-001',
    title: 'Guinness x Burna Boy — "Black Shines Brightest" Campaign',
    type: 'Brand Campaign Agreement',
    value: 45000000,
    status: 'pending_signature',
    createdDate: '2026-03-01',
    parties: [
      { name: 'Guinness Nigeria (Diageo)', role: 'Brand', signedDate: null, status: 'pending' },
      { name: 'Spaceship Entertainment (Burna Boy)', role: 'Super Creative', signedDate: null, status: 'pending' },
      { name: 'The TASCK Agency', role: 'Agency', signedDate: '2026-03-01', status: 'signed' }
    ],
    terms: { duration: '3 months', deliverables: 24, paymentTerms: 'Milestone-based (4 milestones)', escrow: true, commission: '15%' }
  },
  {
    id: 'CTR-2026-002',
    title: 'MTN x Tems — Brand Ambassador Agreement',
    type: 'Ambassador Agreement',
    value: 68000000,
    status: 'draft',
    createdDate: '2026-02-28',
    parties: [
      { name: 'MTN Nigeria', role: 'Brand', signedDate: null, status: 'not_sent' },
      { name: 'Leading Vibes (Tems)', role: 'Super Creative', signedDate: null, status: 'not_sent' },
      { name: 'The TASCK Agency', role: 'Agency', signedDate: null, status: 'not_sent' }
    ],
    terms: { duration: '12 months', deliverables: 36, paymentTerms: 'Quarterly', escrow: true, commission: '15%' }
  },
  {
    id: 'CTR-2025-018',
    title: "Smithwick's x Don Jazzy — Music Series",
    type: 'Content Production Agreement',
    value: 25000000,
    status: 'fully_signed',
    createdDate: '2025-11-01',
    parties: [
      { name: 'Diageo Nigeria (Smithwick\'s)', role: 'Brand', signedDate: '2025-11-05', status: 'signed' },
      { name: 'Mavin Records (Don Jazzy)', role: 'Super Creative', signedDate: '2025-11-03', status: 'signed' },
      { name: 'The TASCK Agency', role: 'Agency', signedDate: '2025-11-01', status: 'signed' }
    ],
    terms: { duration: '4 months', deliverables: 12, paymentTerms: 'Per episode', escrow: true, commission: '15%' }
  },
  {
    id: 'CTR-2025-015',
    title: 'Kelechi Amadi-Obi — Freelance Photographer Contract',
    type: 'Freelance Services Agreement',
    value: 750000,
    status: 'fully_signed',
    createdDate: '2026-02-10',
    parties: [
      { name: 'Kelechi Amadi-Obi', role: 'Creative', signedDate: '2026-02-11', status: 'signed' },
      { name: 'Mavin Records', role: 'Super Creative', signedDate: '2026-02-10', status: 'signed' },
      { name: 'The TASCK Agency', role: 'Agency', signedDate: '2026-02-10', status: 'signed' }
    ],
    terms: { duration: '2 weeks', deliverables: 6, paymentTerms: 'Task-based escrow release', escrow: true, commission: '10%' }
  }
];

const formatNaira = (a) => a >= 1000000 ? `₦${(a/1000000).toFixed(1)}M` : `₦${(a/1000).toFixed(0)}K`;

export const StaffContracts = () => {
  const [selected, setSelected] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);

  const getStatusBadge = (s) => {
    if (s === 'fully_signed') return { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', label: 'Fully Signed', icon: CheckCircle };
    if (s === 'pending_signature') return { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', label: 'Pending Signatures', icon: Clock };
    return { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', label: 'Draft', icon: FileText };
  };

  const getPartyStatus = (s) => {
    if (s === 'signed') return { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', label: 'Signed' };
    if (s === 'pending') return { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', label: 'Pending' };
    return { bg: 'bg-[#F1F5F9]', text: 'text-[#94A3B8]', label: 'Not Sent' };
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-contracts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Contracts</h1>
          <p className="text-[#94A3B8] text-sm">Create, send, and track contract signatures</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> New Contract</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card"><span className="metric-label block mb-1">Total Contracts</span><div className="text-lg font-bold text-[#0F172A] font-mono">{contracts.length}</div></div>
        <div className="metric-card"><span className="metric-label block mb-1">Pending Signature</span><div className="text-lg font-bold text-[#D97706] font-mono">{contracts.filter(c=>c.status==='pending_signature').length}</div></div>
        <div className="metric-card"><span className="metric-label block mb-1">Fully Signed</span><div className="text-lg font-bold text-[#059669] font-mono">{contracts.filter(c=>c.status==='fully_signed').length}</div></div>
        <div className="metric-card"><span className="metric-label block mb-1">Total Value</span><div className="text-lg font-bold text-[#0F172A] font-mono">₦138.8M</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract List */}
        <div className="space-y-3">
          {contracts.map(contract => {
            const status = getStatusBadge(contract.status);
            const StatusIcon = status.icon;
            return (
              <div key={contract.id} onClick={() => setSelected(contract)} className={`dashboard-card p-4 cursor-pointer transition-all ${selected?.id === contract.id ? 'border-[#2F55FF] shadow-sm' : ''}`} data-testid={`contract-${contract.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${status.bg} ${status.text}`}><StatusIcon className="w-3 h-3" /> {status.label}</span>
                  <span className="text-[11px] text-[#CBD5E1]">{contract.id}</span>
                </div>
                <h3 className="text-[#0F172A] font-medium text-sm mb-1 leading-snug">{contract.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span>{contract.type}</span>
                  <span className="font-mono font-semibold text-[#0F172A]">{formatNaira(contract.value)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contract Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="dashboard-card p-5 space-y-6" data-testid="contract-detail">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A] mb-1">{selected.title}</h2>
                  <p className="text-sm text-[#64748B]">{selected.type} &middot; Created {selected.createdDate}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost text-sm flex items-center gap-1"><Download className="w-4 h-4" /> PDF</button>
                  <button className="btn-ghost text-sm flex items-center gap-1"><Eye className="w-4 h-4" /> Preview</button>
                  {selected.status !== 'fully_signed' && (
                    <button onClick={() => setShowSendModal(true)} className="btn-primary text-sm flex items-center gap-1" data-testid="send-contract-btn">
                      <Send className="w-4 h-4" /> Send to All Parties
                    </button>
                  )}
                </div>
              </div>

              {/* Contract Value */}
              <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#F1F5F9]">
                <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Contract Value</div>
                <div className="text-xl font-bold text-[#0F172A] font-mono">{formatNaira(selected.value)}</div>
              </div>

              {/* Parties & Signatures */}
              <div>
                <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">Parties & Signature Status</h3>
                <div className="space-y-3">
                  {selected.parties.map((party, i) => {
                    const ps = getPartyStatus(party.status);
                    return (
                      <div key={i} className="flex items-center justify-between p-4 bg-white border border-[#E2E8F0] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar name={party.name} size="md" />
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{party.name}</p>
                            <p className="text-[11px] text-[#94A3B8]">{party.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {party.signedDate && <span className="text-[11px] text-[#94A3B8]">Signed {party.signedDate}</span>}
                          <span className={`text-[11px] px-2.5 py-1 rounded-full ${ps.bg} ${ps.text}`}>{ps.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Terms */}
              <div>
                <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">Contract Terms</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(selected.terms).map(([key, val]) => (
                    <div key={key} className="bg-[#F8FAFC] rounded-lg p-3">
                      <div className="text-[11px] text-[#94A3B8] capitalize mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-sm font-medium text-[#0F172A]">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-card p-12 text-center">
              <FileText className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
              <h3 className="text-[#64748B] font-medium mb-1">Select a contract</h3>
              <p className="text-sm text-[#94A3B8]">Choose a contract to view details, parties, and signature status.</p>
            </div>
          )}
        </div>
      </div>

      {/* Send Contract Modal */}
      {showSendModal && selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowSendModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()} data-testid="send-contract-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0F172A]">Send Contract</h2>
              <button onClick={() => setShowSendModal(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-[#64748B] mb-6">This will send the contract to all parties for signature via email.</p>
            <div className="space-y-3 mb-6">
              {selected.parties.filter(p => p.status !== 'signed').map((party, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
                  <Avatar name={party.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0F172A]">{party.name}</p>
                    <p className="text-[11px] text-[#94A3B8]">{party.role}</p>
                  </div>
                  <Send className="w-4 h-4 text-[#2F55FF]" />
                </div>
              ))}
            </div>
            <div className="p-4 bg-[#EEF2FF] rounded-lg mb-6">
              <p className="text-xs text-[#4F46E5]">Parties will receive an email with a secure link to review and digitally sign the contract. You'll be notified when each party signs.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSendModal(false)} className="btn-secondary text-sm py-2 px-5">Cancel</button>
              <button className="btn-primary text-sm py-2 px-5 flex items-center gap-2" onClick={() => setShowSendModal(false)}>
                <Send className="w-4 h-4" /> Send to All Parties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffContracts;
