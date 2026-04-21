import React from 'react';
import { getCreator, formatNairaV3 } from '../../../lib/v3data';
import { Upload, CheckCircle, Clock, Circle, Eye, Download } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorDeliverables = () => {
  const creator = getCreator(creatorId);

  // Seeded deliverables — Rema's past + current projects
  const deliverableGroups = [
    {
      project: 'Made of More: Africa',
      brand: 'Guinness',
      stage: 'plan',
      stageColor: '#1F4A3A',
      deliverables: [
        { id: 'gd-1', title: 'Hero film 1 — Nigeria', format: 'Short documentary (8 min)', status: 'pending_upload', dueDate: 'Oct 12, 2026' },
        { id: 'gd-2', title: 'Hero film 2 — Kenya', format: 'Short documentary (8 min)', status: 'pending_upload', dueDate: 'Oct 17, 2026' },
        { id: 'gd-3', title: 'Hero film 3 — South Africa', format: 'Short documentary (8 min)', status: 'pending_upload', dueDate: 'Oct 24, 2026' },
        { id: 'gd-4', title: 'Trailer', format: 'Short film (90 sec)', status: 'pending_upload', dueDate: 'Nov 14, 2026' },
        { id: 'gd-5', title: 'Social cutdowns', format: '6 × 30 sec vertical', status: 'pending_upload', dueDate: 'Nov 28, 2026' },
        { id: 'gd-6', title: 'Behind-the-scenes', format: 'Docufeature (12 min)', status: 'pending_upload', dueDate: 'Dec 14, 2026' },
        { id: 'gd-7', title: 'Stills package', format: '40+ photographs', status: 'pending_upload', dueDate: 'Dec 14, 2026' },
        { id: 'gd-8', title: 'Physical premiere', format: 'Event — Lagos', status: 'pending_upload', dueDate: 'Jan 2027' },
      ],
    },
    {
      project: 'Puma × Rema: Move Different',
      brand: 'Puma',
      stage: 'closed',
      stageColor: '#8A8A8A',
      deliverables: [
        { id: 'pd-1', title: 'Campaign film — "Move Different"', format: 'Short film (3 min)', status: 'approved', approvedDate: '15 Oct 2025', payment: 22000000 },
        { id: 'pd-2', title: 'Creative direction package', format: 'Mood boards, art direction, styling', status: 'approved', approvedDate: '28 Sep 2025', payment: 18000000 },
        { id: 'pd-3', title: 'Music score — original', format: 'Audio (2 tracks)', status: 'approved', approvedDate: '10 Oct 2025', payment: 15000000 },
        { id: 'pd-4', title: 'Social content package', format: '12 × assets (reels, stills, stories)', status: 'approved', approvedDate: '18 Nov 2025', payment: 12000000 },
      ],
    },
    {
      project: 'Browns × Rema: Lagos to London',
      brand: 'Browns Fashion',
      stage: 'closed',
      stageColor: '#8A8A8A',
      deliverables: [
        { id: 'bd-1', title: 'Documentary — "Lagos to London"', format: 'Short documentary (15 min)', status: 'approved', approvedDate: '5 Jan 2026', payment: 28000000 },
        { id: 'bd-2', title: 'Stills + editorial package', format: '25 photographs + layout', status: 'approved', approvedDate: '22 Jan 2026', payment: 17000000 },
      ],
    },
  ];

  const totalDeliverables = deliverableGroups.reduce((a, g) => a + g.deliverables.length, 0);
  const approvedCount = deliverableGroups.reduce((a, g) => a + g.deliverables.filter(d => d.status === 'approved').length, 0);
  const pendingCount = deliverableGroups.reduce((a, g) => a + g.deliverables.filter(d => d.status === 'pending_upload').length, 0);
  const totalEarned = deliverableGroups.reduce((a, g) => a + g.deliverables.reduce((b, d) => b + (d.payment || 0), 0), 0);

  return (
    <div data-testid="v3-creator-deliverables">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">DELIVERABLES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Deliverables</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">{totalDeliverables} total across {deliverableGroups.length} projects</p>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Upcoming</p>
          <p className="text-xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pendingCount}</p>
          <p className="text-[10px] text-[#8A8A8A]">To upload</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Approved</p>
          <p className="text-xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{approvedCount}</p>
          <p className="text-[10px] text-[#8A8A8A]">Completed</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Total</p>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{totalDeliverables}</p>
          <p className="text-[10px] text-[#8A8A8A]">All time</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Earned</p>
          <p className="text-xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalEarned)}</p>
          <p className="text-[10px] text-[#8A8A8A]">From deliverables</p>
        </div>
      </div>

      {/* By project */}
      {deliverableGroups.map((group, gi) => (
        <div key={gi} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: group.stageColor }} />
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">{group.brand} — {group.project}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              group.stage === 'closed' ? 'text-[#8A8A8A] bg-[#F4F2EC]' : 'text-[#1F4A3A] bg-[#DDE7E2]'
            }`}>{group.stage === 'closed' ? 'Closed' : 'Active'}</span>
            <span className="ml-auto text-[10px] text-[#8A8A8A]">
              {group.deliverables.filter(d => d.status === 'approved').length}/{group.deliverables.length} complete
            </span>
          </div>
          <div className="space-y-2">
            {group.deliverables.map(del => (
              <div key={del.id} className="v3-card p-3.5 flex items-center gap-3" data-testid={`del-${del.id}`}>
                {del.status === 'approved' ? <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" /> :
                 del.status === 'pending_rm_review' ? <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" /> :
                 <Circle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#1A1A1A]">{del.title}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{del.format}</p>
                </div>
                {del.dueDate && <span className="text-[10px] text-[#8A8A8A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Due: {del.dueDate}</span>}
                {del.approvedDate && <span className="text-[10px] text-[#8A8A8A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{del.approvedDate}</span>}
                {del.payment && <span className="text-[11px] text-[#1F4A3A] font-medium flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(del.payment)}</span>}
                {del.status === 'pending_upload' && (
                  <button className="v3-btn-primary text-[10px] py-1 px-3 flex-shrink-0"><Upload className="w-3 h-3" /> Upload</button>
                )}
                {del.status === 'approved' && (
                  <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded flex-shrink-0">Paid</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default V3CreatorDeliverables;
