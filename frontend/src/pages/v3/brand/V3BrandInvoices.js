import React from 'react';
import { formatNairaV3 } from '../../../lib/v3data';
import { getBrandPortalBrand, getBrandPortalSession, loadBrandPortalBundles } from '../../../lib/v3brandPortal';
import { CheckCircle, Clock, Receipt } from 'lucide-react';

const V3BrandInvoices = () => {
  const session = getBrandPortalSession();
  const brand = getBrandPortalBrand();
  const bundles = loadBrandPortalBundles(session.brandId);

  const invoices = bundles.map((bundle) => {
    const bc = bundle.business_case;
    const items = (Array.isArray(bundle.invoices) ? bundle.invoices : []).map((invoice) => ({
      id: invoice.id,
      label: 'Strategy Development Fee',
      amount: invoice.amount,
      status: invoice.status,
      dueDate: 'Due after creator brief, before Strategy Snapshot',
    }));
    items.push({
      id: `${bc.id}-project`,
      label: 'Project Fee',
      amount: bc.estimated_value,
      status: ['deliver', 'closed'].includes(bc.stage) ? 'paid' : 'not_issued',
      dueDate: 'Due upon Strategy Snapshot approval',
    });
    return { project: bc.title, items };
  });

  return (
    <div data-testid="v3-brand-invoices">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">INVOICES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Invoices</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Billing summary for {brand?.company} campaigns.</p>

      {invoices.map((group) => (
        <div key={group.project} className="mb-6">
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3" style={{ fontFamily: "'Fraunces', serif" }}>{group.project}</h3>
          <div className="space-y-2">
            {group.items.map((inv) => (
              <div key={inv.id} className="v3-card p-4 flex items-center gap-4" data-testid={`invoice-${inv.id}`}>
                <Receipt className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-[#1A1A1A]">{inv.label}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{inv.dueDate}</p>
                </div>
                <span className="text-[13px] font-medium text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(inv.amount)}</span>
                {inv.status === 'paid' && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>}
                {['pending', 'issued'].includes(inv.status) && <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>}
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
