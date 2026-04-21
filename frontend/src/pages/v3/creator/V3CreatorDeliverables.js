import React from 'react';
import { v3Projects, v3Deliverables, getBrand } from '../../../lib/v3data';
import { Upload, CheckCircle, Clock, Circle } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorDeliverables = () => {
  const projects = v3Projects.filter(p => p.creatorId === creatorId);

  const allDeliverables = projects.flatMap(proj => {
    const brand = getBrand(proj.brandId);
    return (v3Deliverables[proj.id] || []).map(d => ({
      ...d,
      projectTitle: proj.title,
      brandName: brand?.company?.split(' ')[0],
    }));
  });

  const pendingUpload = allDeliverables.filter(d => d.status === 'pending_upload');
  const pendingReview = allDeliverables.filter(d => d.status === 'pending_rm_review');
  const approved = allDeliverables.filter(d => d.status === 'approved');

  return (
    <div data-testid="v3-creator-deliverables">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">DELIVERABLES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Deliverables</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">{allDeliverables.length} total across {projects.length} project{projects.length !== 1 ? 's' : ''}</p>

      {/* Pending upload */}
      {pendingUpload.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-semibold text-[#C49B5F] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" /> Ready to Upload ({pendingUpload.length})
          </h3>
          <div className="space-y-2">
            {pendingUpload.map(del => (
              <div key={del.id} className="v3-card p-4 flex items-center gap-4 border-l-3" style={{ borderLeftColor: '#C49B5F', borderLeftWidth: 3 }} data-testid={`del-upload-${del.id}`}>
                <Circle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-[#1A1A1A]">{del.title}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{del.brandName} — {del.projectTitle}</p>
                </div>
                <button className="v3-btn-primary text-[11px] py-1.5 px-3"><Upload className="w-3 h-3" /> Upload</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In review */}
      {pendingReview.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> In Review ({pendingReview.length})
          </h3>
          <div className="space-y-2">
            {pendingReview.map(del => (
              <div key={del.id} className="v3-card p-4 flex items-center gap-4" data-testid={`del-review-${del.id}`}>
                <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-[#1A1A1A]">{del.title}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{del.brandName} — {del.projectTitle}</p>
                </div>
                <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded">RM review</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-[#1F4A3A] uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Approved ({approved.length})
          </h3>
          <div className="space-y-2">
            {approved.map(del => (
              <div key={del.id} className="v3-card p-4 flex items-center gap-4" data-testid={`del-approved-${del.id}`}>
                <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-[#1A1A1A]">{del.title}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{del.brandName} — {del.projectTitle}</p>
                </div>
                {del.brandApproved && <span className="text-[10px] text-[#8A8A8A]">Approved: {del.brandApproved}</span>}
                {del.paymentReleased && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">Paid</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {allDeliverables.length === 0 && (
        <div className="v3-card p-8 text-center">
          <Upload className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
          <p className="text-[14px] text-[#8A8A8A]">No deliverables to show yet. They'll appear here once your projects enter the Deliver stage.</p>
        </div>
      )}
    </div>
  );
};

export default V3CreatorDeliverables;
