import React from 'react';
import { v3AlignmentSnapshots, v3CreativeSnapshots, v3FinalReports, v3Projects, getBrand, formatNairaV3 } from '../../../lib/v3data';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import { CheckCircle, Clock, FileText } from 'lucide-react';

const brandId = 'brand-cocacola';

const V3BrandApprovals = () => {
  const projects = v3Projects.filter(p => p.brandId === brandId);

  const approvalItems = [];
  projects.forEach(proj => {
    const snapshot = v3AlignmentSnapshots[proj.id];
    if (snapshot && snapshot.status === 'under_review') {
      approvalItems.push({
        id: `${proj.id}-alignment`,
        projectId: proj.id,
        title: proj.title,
        type: 'Alignment Snapshot',
        date: snapshot.generatedAt,
        status: 'pending',
      });
    }
    const cs = v3CreativeSnapshots[proj.id];
    if (cs) {
      const latest = cs.versions[cs.versions.length - 1];
      if (latest.status === 'draft') {
        approvalItems.push({
          id: `${proj.id}-creative`,
          projectId: proj.id,
          title: proj.title,
          type: `Creative Snapshot v${latest.version}`,
          date: latest.generatedAt,
          status: 'internal_review',
        });
      }
    }
  });

  return (
    <div data-testid="v3-brand-approvals">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">APPROVALS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Pending Approvals</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Documents and deliverables awaiting your review.</p>

      {approvalItems.length > 0 ? (
        <div className="space-y-3">
          {approvalItems.map(item => (
            <div key={item.id} className="v3-card p-5" data-testid={`approval-${item.id}`}>
              <div className="flex items-center gap-3 mb-3">
                {item.status === 'pending' ? (
                  <Clock className="w-4 h-4 text-[#C49B5F]" />
                ) : (
                  <FileText className="w-4 h-4 text-[#8A8A8A]" />
                )}
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{item.type}</span>
                <span className="text-[10px] text-[#8A8A8A] ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.date}</span>
              </div>
              <h3 className="text-[14px] font-medium text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{item.title}</h3>
              <div className="flex items-center gap-2">
                {item.status === 'pending' && (
                  <>
                    <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded">Awaiting your review</span>
                    <div className="ml-auto flex gap-2">
                      <button className="v3-btn-secondary text-[11px] py-1.5 px-3">View Document</button>
                      <button className="v3-btn-primary text-[11px] py-1.5 px-3">Approve</button>
                    </div>
                  </>
                )}
                {item.status === 'internal_review' && (
                  <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">In internal review — not yet shared with you</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="v3-card p-8 text-center">
          <CheckCircle className="w-6 h-6 text-[#1F4A3A] mx-auto mb-3" />
          <p className="text-[14px] text-[#1A1A1A]">All clear</p>
          <p className="text-[12px] text-[#8A8A8A]">No documents currently awaiting your approval.</p>
        </div>
      )}
    </div>
  );
};

export default V3BrandApprovals;
