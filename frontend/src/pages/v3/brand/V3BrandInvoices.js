import React from 'react';
import { v3Projects, formatNairaV3 } from '../../../lib/v3data';
import { Receipt, CheckCircle, Clock } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandInvoices = () => {
  const projects = v3Projects.filter(p => p.brandId === brandId);

  const invoices = projects.map(proj => {
    const isRetainer = proj.engagement === 'retainer';
    const items = [];
    if (isRetainer) {
      items.push({
        id: `${proj.id}-retainer`,
        label: 'Consultancy Fee — Retainer',
        amount: proj.estimatedValue * 0.15,
        status: proj.stage === 'connect' ? 'not_issued' : 'pending',
        dueDate: 'Due upon project commencement',
      });
    }
    items.push({
      id: `${proj.id}-project`,
      label: 'Project Fee',
      amount: proj.estimatedValue,
      status: proj.stage === 'deliver' ? 'paid' : 'not_issued',
      dueDate: 'Due upon Creative Snapshot approval',
    });
    return { project: proj.title, items };
  });

  return (
    <div data-testid="v3-brand-invoices">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">INVOICES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Invoices</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Billing summary for your campaigns.</p>

      {invoices.map((group, gi) => (
        <div key={gi} className="mb-6">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3" style={{ fontFamily: "'Fraunces', serif" }}>{group.project}</h3>
          <div className="space-y-2">
            {group.items.map(inv => (
              <div key={inv.id} className="v3-card p-4 flex items-center gap-4" data-testid={`invoice-${inv.id}`}>
                <Receipt className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-[#1A1A1A]">{inv.label}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{inv.dueDate}</p>
                </div>
                <span className="text-[13px] font-medium text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(inv.amount)}</span>
                {inv.status === 'paid' && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>}
                {inv.status === 'pending' && <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>}
                {inv.status === 'not_issued' && <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">Not yet issued</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default V3BrandInvoices;
