import React, { useState, useEffect } from 'react';
import { Layers, Download, Loader2 } from 'lucide-react';
import {
  v3ListBusinessCases,
  v3GetCreators,
  v3ListRelationshipManagers,
  v3GetBrands,
  v3ListDeliverables,
} from '../../../lib/v3api';
import { formatNairaV3 } from '../../../lib/v3data';

const V3AdminReports = () => {
  const [bcs, setBcs] = useState([]);
  const [creators, setCreators] = useState([]);
  const [rms, setRms] = useState([]);
  const [brands, setBrands] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      v3ListBusinessCases({}).catch(() => []),
      v3GetCreators().catch(() => []),
      v3ListRelationshipManagers().catch(() => []),
      v3GetBrands({}).catch(() => []),
    ]).then(([bcData, creatorData, rmData, brandData]) => {
      const bcList = Array.isArray(bcData) ? bcData : bcData?.items || [];
      const creatorList = Array.isArray(creatorData) ? creatorData : [];
      const rmList = Array.isArray(rmData) ? rmData : [];
      const brandList = Array.isArray(brandData) ? brandData : brandData?.items || [];

      setBcs(bcList);
      setCreators(creatorList);
      setRms(rmList);
      setBrands(brandList);

      // Load deliverables for all business cases in delivery stage
      const deliverBcs = bcList.filter((bc) => bc.stage === 'deliver').slice(0, 10);
      if (deliverBcs.length > 0) {
        Promise.all(
          deliverBcs.map((bc) =>
            v3ListDeliverables(bc.id || bc._id).catch(() => []).then((d) =>
              (Array.isArray(d) ? d : []).map((item) => ({
                ...item,
                _bcTitle: bc.title,
                _bcBrandId: bc.brand_id,
              }))
            )
          )
        ).then((groups) => {
          setDeliverables(groups.flat());
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]" data-testid="v3-admin-reports">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading reports…</span>
      </div>
    );
  }

  // Derived stats
  const totalValue = bcs.reduce((a, p) => a + (p.estimated_value || 0), 0);
  const retainerValue = bcs
    .filter((p) => p.engagement_type === 'retainer')
    .reduce((a, p) => a + (p.estimated_value || 0), 0);
  const directValue = bcs
    .filter((p) => p.engagement_type === 'direct')
    .reduce((a, p) => a + (p.estimated_value || 0), 0);
  const deliveryCount = bcs.filter((p) => p.stage === 'deliver').length;
  const connectCount = bcs.filter((p) => p.stage === 'connect').length;
  const approvedDeliverables = deliverables.filter((d) => d.status === 'approved').length;

  // Top RM by project count
  let topRM = null;
  if (rms.length > 0 && bcs.length > 0) {
    const rmCounts = rms.map((rm) => ({
      rm,
      count: bcs.filter((bc) => bc.rm_id === (rm.id || rm._id)).length,
      value: bcs
        .filter((bc) => bc.rm_id === (rm.id || rm._id))
        .reduce((a, bc) => a + (bc.estimated_value || 0), 0),
    }));
    topRM = rmCounts.sort((a, b) => b.count - a.count)[0];
  }

  // Active vs lead brands
  const activeBrands = brands.filter((b) =>
    (b.status || '').toLowerCase().startsWith('active')
  ).length;
  const leadBrands = brands.filter((b) =>
    (b.status || '').toLowerCase().startsWith('lead')
  ).length;
  const avgLeadScore =
    brands.length > 0
      ? Math.round(brands.reduce((a, b) => a + (b.lead_score || 0), 0) / brands.length)
      : null;

  const superCreatives = creators.filter((c) => c.tier === 'super').length;
  const risingCreatives = creators.filter((c) => c.tier === 'rising').length;
  const avgReliability =
    creators.length > 0
      ? (creators.reduce((a, c) => a + (c.reliability || 0), 0) / creators.length).toFixed(1)
      : null;

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const reports = [
    {
      id: 'rpt-pipeline',
      title: 'Pipeline Summary',
      description:
        bcs.length > 0
          ? `${bcs.length} active projects across ${[...new Set(bcs.map((b) => b.stage))].length} stages. Total pipeline value: ${formatNairaV3(totalValue)}. ${deliveryCount} in delivery, ${connectCount} in connect.`
          : 'No projects in the pipeline yet.',
      type: 'Weekly',
      lastGenerated: today,
    },
    ...(rms.length > 0
      ? [
          {
            id: 'rpt-rm',
            title: 'RM Performance Report',
            description:
              `${rms.length} active relationship manager${rms.length !== 1 ? 's' : ''}.` +
              (topRM && topRM.count > 0
                ? ` ${topRM.rm.name} leads with ${topRM.count} project${topRM.count !== 1 ? 's' : ''} (${formatNairaV3(topRM.value)} total value).`
                : ''),
            type: 'Monthly',
            lastGenerated: today,
          },
        ]
      : []),
    ...(brands.length > 0
      ? [
          {
            id: 'rpt-brand',
            title: 'Brand Engagement Summary',
            description:
              `${brands.length} brands in CRM. ${activeBrands} active, ${leadBrands} in lead stage.` +
              (avgLeadScore != null ? ` Average lead score: ${avgLeadScore}.` : ''),
            type: 'Monthly',
            lastGenerated: today,
          },
        ]
      : []),
    ...(creators.length > 0
      ? [
          {
            id: 'rpt-creator',
            title: 'Creator Roster Report',
            description:
              `${creators.length} creator${creators.length !== 1 ? 's' : ''} on roster. ${superCreatives} super creative${superCreatives !== 1 ? 's' : ''}, ${risingCreatives} rising.` +
              (avgReliability != null ? ` Average reliability score: ${avgReliability}.` : ''),
            type: 'Monthly',
            lastGenerated: today,
          },
        ]
      : []),
    {
      id: 'rpt-financial',
      title: 'Financial Overview',
      description:
        bcs.length > 0
          ? `Total pipeline value: ${formatNairaV3(totalValue)}. Retainer projects: ${formatNairaV3(retainerValue)}. Direct: ${formatNairaV3(directValue)}.`
          : 'No financial data available yet.',
      type: 'Monthly',
      lastGenerated: today,
    },
    ...(deliveryCount > 0
      ? [
          {
            id: 'rpt-delivery',
            title: 'Delivery Status Report',
            description: `${deliveryCount} project${deliveryCount !== 1 ? 's' : ''} in delivery. ${approvedDeliverables} of ${deliverables.length} deliverable${deliverables.length !== 1 ? 's' : ''} approved and ready to feed final campaign reports.`,
            type: 'Weekly',
            lastGenerated: today,
          },
        ]
      : []),
  ];

  // Brand lookup map
  const brandMap = Object.fromEntries(
    brands.map((b) => [b.id || b._id, b])
  );

  return (
    <div data-testid="v3-admin-reports">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">REPORTS</p>
      <h1
        className="v3-heading text-2xl mb-1"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        Reports
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Generated business reports and summaries.</p>

      {reports.length === 0 && bcs.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <Layers className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No data available yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Reports will appear once you have active brands, creators, and projects.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rpt) => (
            <div
              key={rpt.id}
              className="v3-card p-5 hover:border-[#D4CDBF] transition-colors"
              data-testid={`report-${rpt.id}`}
            >
              <div className="flex items-start gap-4">
                <Layers className="w-4 h-4 text-[#1F4A3A] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[14px] font-medium text-[#1A1A1A]">{rpt.title}</h3>
                    <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">
                      {rpt.type}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#5C5C5C] leading-relaxed">{rpt.description}</p>
                  <p
                    className="text-[10px] text-[#8A8A8A] mt-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Last generated: {rpt.lastGenerated}
                  </p>
                </div>
                <button className="v3-btn-secondary text-[10px] py-1.5 px-3 flex-shrink-0">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deliverables.length > 0 && (
        <div className="v3-card p-5 mt-6" data-testid="report-deliverables-feed">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-[#1F4A3A]" />
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">
              Deliverables Feed Into Final Report
            </h3>
          </div>
          <div className="overflow-hidden rounded border border-[#E8E4DB]">
            <table className="w-full">
              <thead className="bg-[#FAFAF7]">
                <tr>
                  <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                    Project
                  </th>
                  <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                    Brand
                  </th>
                  <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                    Deliverable
                  </th>
                  <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((deliverable) => {
                  const brand = brandMap[deliverable._bcBrandId];
                  return (
                    <tr
                      key={deliverable.id || deliverable._id}
                      className="border-t border-[#F4F2EC]"
                    >
                      <td className="p-3 text-[12px] text-[#1A1A1A]">
                        {deliverable._bcTitle}
                      </td>
                      <td className="p-3 text-[12px] text-[#5C5C5C]">
                        {brand?.company || brand?.name || '—'}
                      </td>
                      <td className="p-3 text-[12px] text-[#5C5C5C]">
                        {deliverable.title}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            deliverable.status === 'approved'
                              ? 'text-[#1F4A3A] bg-[#DDE7E2]'
                              : 'text-[#C49B5F] bg-[#C49B5F12]'
                          }`}
                        >
                          {deliverable.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default V3AdminReports;
