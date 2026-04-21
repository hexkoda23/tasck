import React from 'react';
import { v3Projects, v3AlignmentSnapshots, v3CreativeSnapshots, v3FinalReports, getBrand, formatNairaV3 } from '../../../lib/v3data';
import { FileText, Download, Eye } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandDocuments = () => {
  const projects = v3Projects.filter(p => p.brandId === brandId);

  const documents = [];
  projects.forEach(proj => {
    const snapshot = v3AlignmentSnapshots[proj.id];
    if (snapshot) {
      documents.push({
        id: `${proj.id}-alignment`,
        project: proj.title,
        type: 'Alignment Snapshot',
        date: snapshot.generatedAt,
        status: snapshot.status === 'under_review' ? 'Under review' : 'Approved',
      });
    }
    const cs = v3CreativeSnapshots[proj.id];
    if (cs) {
      cs.versions.forEach(v => {
        documents.push({
          id: `${proj.id}-creative-v${v.version}`,
          project: proj.title,
          type: `Creative Snapshot v${v.version}`,
          date: v.generatedAt,
          status: v.approved ? 'Approved' : v.status === 'draft' ? 'Draft' : 'Under review',
        });
      });
    }
    const fr = v3FinalReports[proj.id];
    if (fr) {
      documents.push({
        id: `${proj.id}-final-report`,
        project: proj.title,
        type: 'Final Report',
        date: 'Latest',
        status: 'Ready for review',
      });
    }
  });

  return (
    <div data-testid="v3-brand-documents">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">DOCUMENTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Document Vault</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">All documents generated for your projects.</p>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="v3-card p-4 flex items-center gap-4" data-testid={`doc-${doc.id}`}>
              <FileText className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#1A1A1A]">{doc.type}</p>
                <p className="text-[10px] text-[#8A8A8A]">{doc.project}</p>
              </div>
              <span className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{doc.date}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                doc.status === 'Approved' ? 'text-[#1F4A3A] bg-[#DDE7E2]' :
                doc.status === 'Under review' ? 'text-[#C49B5F] bg-[#C49B5F12]' :
                'text-[#8A8A8A] bg-[#F4F2EC]'
              }`}>{doc.status}</span>
              <button className="v3-btn-secondary text-[10px] py-1 px-3"><Eye className="w-3 h-3" /> View</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="v3-card p-8 text-center">
          <FileText className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
          <p className="text-[14px] text-[#8A8A8A]">No documents yet.</p>
        </div>
      )}
    </div>
  );
};

export default V3BrandDocuments;
