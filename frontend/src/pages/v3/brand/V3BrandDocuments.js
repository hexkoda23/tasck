import React, { useEffect, useMemo, useState } from 'react';
import {
  getBrandPortalBrand,
  getBrandPortalSession,
  vaultDocsForBrand,
} from '../../../lib/v3brandPortal';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import { CheckCircle, FileCheck, FileSignature, FileText, PackageCheck } from 'lucide-react';

const docIcon = {
  alignment: FileCheck,
  strategy: FileCheck,
  contract: FileSignature,
  report: FileText,
  deliverable: PackageCheck,
};

const renderSection = (section, index) => (
  <div key={`${section.heading}-${index}`} className="mb-6">
    <h2>{section.heading}</h2>
    {section.type === 'prose' && <p>{section.content}</p>}
    {section.type === 'bullets' && <ul>{(section.items || []).map((item, j) => <li key={j}>{item}</li>)}</ul>}
    {section.type === 'numbered' && <ol>{(section.items || []).map((item, j) => <li key={j}>{item}</li>)}</ol>}
    {section.type === 'kpis' && (
      <div className="space-y-2">
        {(section.items || []).map((item, j) => <p key={j}><strong>{item.kpi}:</strong> {item.target}</p>)}
      </div>
    )}
    {section.type === 'flags' && <ul>{(section.items || []).map((item, j) => <li key={j}>{item.text}</li>)}</ul>}
  </div>
);

const V3BrandDocuments = () => {
  const session = getBrandPortalSession();
  const brand = getBrandPortalBrand();
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const next = vaultDocsForBrand(session.brandId);
    setDocs(next);
    setSelectedId(next[0]?.id || null);
  }, [session.brandId]);

  const selected = useMemo(() => docs.find((doc) => doc.id === selectedId), [docs, selectedId]);
  const stats = useMemo(() => ({
    approvedSnapshots: docs.filter((doc) => ['alignment', 'strategy'].includes(doc.kind)).length,
    contracts: docs.filter((doc) => doc.kind === 'contract').length,
    reports: docs.filter((doc) => doc.kind === 'report').length,
  }), [docs]);

  return (
    <div data-testid="v3-brand-documents">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">DOCUMENTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Document Vault</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">
        {brand?.company} approved snapshots, signed contracts, final reports, and approved deliverables. Pending approvals stay only in the Approvals page.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Approved snapshots</p>
          <p className="text-xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.approvedSnapshots}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Contracts</p>
          <p className="text-xl font-semibold text-[#7A5F23]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.contracts}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Reports</p>
          <p className="text-xl font-semibold text-[#567B3F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.reports}</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="v3-card p-8 text-center">
          <FileText className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
          <p className="text-[14px] text-[#1A1A1A]">No approved documents yet</p>
          <p className="text-[12px] text-[#8A8A8A]">Once a snapshot is approved, it will move from Approvals into this vault.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] gap-5">
          <div className="space-y-2">
            {docs.map((doc) => {
              const Icon = docIcon[doc.kind] || FileText;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedId(doc.id)}
                  className={`w-full v3-card p-4 text-left ${selectedId === doc.id ? 'border-[#1F4A3A]' : ''}`}
                  data-testid={`brand-doc-${doc.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-[#1F4A3A]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{doc.kind}</span>
                  </div>
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{doc.label}</p>
                  <p className="text-[12px] text-[#6E6657] mt-0.5">{doc.business_case?.title || doc.title}</p>
                  <p className="text-[11px] text-[#1F4A3A] mt-1 inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {doc.status || doc.snapshot?.status || 'approved'}
                  </p>
                </button>
              );
            })}
          </div>

          {selected && ['alignment', 'strategy'].includes(selected.kind) && (
            <V3DocumentSurface title={selected.snapshot.title} meta={selected.snapshot.meta || selected.snapshot.brand_header}>
              {selected.sections.map(renderSection)}
            </V3DocumentSurface>
          )}

          {selected && !['alignment', 'strategy'].includes(selected.kind) && (
            <div className="v3-card p-6">
              <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">{selected.label}</p>
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-3" style={{ fontFamily: "'Fraunces', serif" }}>{selected.title}</h2>
              <p className="text-[13px] text-[#6E6657] leading-relaxed whitespace-pre-wrap">{selected.summary}</p>
              {selected.report?.kpis?.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">KPI results</p>
                  {selected.report.kpis.map((kpi, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-[#F4F2EC] py-2 text-[12px]">
                      <span>{kpi.kpi}</span>
                      <span className="text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{kpi.actual || kpi.target}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default V3BrandDocuments;
