import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { CheckCircle, XCircle, Clock, Eye, Download, MessageSquare, Image, Film, FileText } from 'lucide-react';

const approvals = [
  {
    id: 'APR-001',
    title: 'Burna Boy Campaign - Hero Visual Set 1',
    type: 'Photography',
    campaign: 'Guinness x Burna Boy',
    creative: 'Kelechi Amadi-Obi',
    submitted: '2026-03-01',
    deadline: '2026-03-05',
    status: 'pending',
    files: 12,
    fileType: 'image',
    description: '12 high-resolution images from the Burna Boy "Black Shines" campaign shoot. Includes hero shots, lifestyle, and product integration.'
  },
  {
    id: 'APR-002',
    title: 'Davido Campaign - 30s TV Spot (Draft 2)',
    type: 'Video',
    campaign: 'Guinness Foreign Extra',
    creative: 'Ade Adesanya',
    submitted: '2026-02-28',
    deadline: '2026-03-04',
    status: 'pending',
    files: 1,
    fileType: 'video',
    description: 'Second draft of the 30-second TV commercial featuring Davido. Revised colour grading and audio mix.'
  },
  {
    id: 'APR-003',
    title: 'Don Jazzy Series - Episode 11 Final Cut',
    type: 'Video',
    campaign: "Smithwick's x Don Jazzy",
    creative: 'Mavin Records',
    submitted: '2026-02-25',
    deadline: '2026-02-28',
    status: 'approved',
    files: 1,
    fileType: 'video',
    description: 'Final episode of the music series. All brand guidelines followed, logo placement confirmed.'
  },
  {
    id: 'APR-004',
    title: 'Harp Festive Campaign - Social Media Pack',
    type: 'Design',
    campaign: 'Harp Lager Festive',
    creative: 'Chidinma Okafor',
    submitted: '2025-12-20',
    deadline: '2025-12-22',
    status: 'approved',
    files: 24,
    fileType: 'image',
    description: '24 social media assets for Instagram, Twitter, and Facebook. Includes stories, posts, and carousel designs.'
  },
  {
    id: 'APR-005',
    title: 'Burna Boy Campaign - Behind-the-Scenes Reel',
    type: 'Video',
    campaign: 'Guinness x Burna Boy',
    creative: 'Ade Adesanya',
    submitted: '2026-02-26',
    deadline: '2026-03-01',
    status: 'revision',
    files: 1,
    fileType: 'video',
    revision_notes: 'Please remove the competitor branding visible at 0:42 and adjust the intro card font to match brand guidelines.',
    description: 'Behind-the-scenes content from the campaign shoot for social media distribution.'
  }
];

const getStatusStyle = (status) => {
  const styles = {
    pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', label: 'Pending Review' },
    approved: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]', label: 'Approved' },
    rejected: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', label: 'Rejected' },
    revision: { bg: 'bg-[#EEF2FF]', text: 'text-[#2F55FF]', label: 'Revision Requested' }
  };
  return styles[status] || styles.pending;
};

const getFileIcon = (type) => {
  if (type === 'image') return Image;
  if (type === 'video') return Film;
  return FileText;
};

export const BrandApprovals = () => {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? approvals : approvals.filter(a => a.status === filter);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="brand-approvals">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Approvals</h1>
          <p className="text-[#64748B] text-sm">Review and approve campaign deliverables</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4 border-l-4 border-[#D97706]">
          <p className="text-[#64748B] text-sm">Pending Review</p>
          <p className="text-lg font-bold text-[#D97706]">{approvals.filter(a => a.status === 'pending').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Revision Requested</p>
          <p className="text-lg font-bold text-[#2F55FF]">{approvals.filter(a => a.status === 'revision').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Approved (MTD)</p>
          <p className="text-lg font-bold text-[#22C55E]">{approvals.filter(a => a.status === 'approved').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Avg Review Time</p>
          <p className="text-lg font-bold text-[#0F172A]">1.8 days</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'revision', 'approved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === f ? 'bg-[#2F55FF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#334155]'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? approvals.length : approvals.filter(a => a.status === f).length})
          </button>
        ))}
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const status = getStatusStyle(item.status);
          const FileIcon = getFileIcon(item.fileType);
          return (
            <div key={item.id} className="dashboard-card p-5" data-testid={`approval-${item.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                    <FileIcon className="w-6 h-6 text-[#2F55FF]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                      <span className="text-[#CBD5E1] text-xs">{item.id}</span>
                    </div>
                    <h3 className="text-[#0F172A] font-semibold">{item.title}</h3>
                    <p className="text-[#64748B] text-sm">{item.campaign}</p>
                    <p className="text-[#475569] text-sm mt-2">{item.description}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-[#94A3B8]">Submitted: {item.submitted}</p>
                  <p className="text-[#94A3B8]">Deadline: {item.deadline}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 text-sm text-[#64748B]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Avatar name={item.creative} size="sm" />
                    {item.creative}
                  </span>
                  <span>{item.files} file{item.files > 1 ? 's' : ''}</span>
                  <span className="capitalize">{item.type}</span>
                </div>
              </div>

              {item.revision_notes && (
                <div className="mb-4 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg p-3">
                  <p className="text-[#2F55FF] text-xs mb-1">Revision Notes</p>
                  <p className="text-[#334155] text-sm">{item.revision_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#F1F5F9]">
                <button className="btn-ghost text-sm flex items-center gap-1"><Eye className="w-4 h-4" /> Preview</button>
                <button className="btn-ghost text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Download</button>
                <button className="btn-ghost text-sm flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Comment</button>
                {item.status === 'pending' && (
                  <>
                    <button className="text-sm px-4 py-2 rounded-lg bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FF4757]/30 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Request Revision
                    </button>
                    <button className="btn-primary text-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandApprovals;
