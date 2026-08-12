import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { CheckSquare, Clock, Upload, ArrowRight, AlertCircle, CheckCircle, Eye, FileText } from 'lucide-react';

const tasks = [
  {
    id: 'TSK-001',
    title: 'Cadbury Product Photography - Set 3',
    project: 'Don Jazzy x Cadbury Campaign',
    client: 'Mavin Records',
    status: 'in_progress',
    priority: 'high',
    deadline: '2026-03-05',
    payment: 187500,
    description: 'Shoot 15 product photos for the Cadbury Dairy Milk line. Include lifestyle shots with Nigerian models.',
    deliverables: '15 high-res images (5000x3333px), 5 social-optimized crops'
  },
  {
    id: 'TSK-002',
    title: 'UBA Corporate Portraits - Final Set',
    project: 'UBA Foundation Portrait Series',
    client: 'UBA Foundation',
    status: 'in_progress',
    priority: 'medium',
    deadline: '2026-03-08',
    payment: 150000,
    description: 'Final batch of executive portraits for UBA Foundation annual report.',
    deliverables: '8 executive portraits, retouched and color-corrected'
  },
  {
    id: 'TSK-003',
    title: 'Cadbury Social Media Crops - Set 2',
    project: 'Don Jazzy x Cadbury Campaign',
    client: 'Mavin Records',
    status: 'submitted',
    priority: 'medium',
    deadline: '2026-02-28',
    payment: 187500,
    description: 'Social media optimized versions of Set 2 photos.',
    deliverables: '20 social-optimized images (Instagram, Twitter, Facebook formats)',
    submittedDate: '2026-02-27'
  },
  {
    id: 'TSK-004',
    title: 'UBA Portraits - Set 3',
    project: 'UBA Foundation Portrait Series',
    client: 'UBA Foundation',
    status: 'approved',
    priority: 'low',
    deadline: '2026-02-25',
    payment: 150000,
    description: 'Third batch of executive portraits.',
    deliverables: '6 portraits delivered and approved',
    approvedDate: '2026-02-26'
  },
  {
    id: 'TSK-005',
    title: 'Cadbury Product Photography - Set 2',
    project: 'Don Jazzy x Cadbury Campaign',
    client: 'Mavin Records',
    status: 'approved',
    priority: 'high',
    deadline: '2026-02-20',
    payment: 187500,
    description: 'Second set of product photography for Cadbury campaign.',
    deliverables: '15 high-res images + social crops',
    approvedDate: '2026-02-21'
  },
  {
    id: 'TSK-006',
    title: 'Cadbury Product Photography - Set 1',
    project: 'Don Jazzy x Cadbury Campaign',
    client: 'Mavin Records',
    status: 'approved',
    priority: 'high',
    deadline: '2026-02-10',
    payment: 187500,
    description: 'Initial product photography batch.',
    deliverables: '15 high-res images + social crops',
    approvedDate: '2026-02-12'
  },
  {
    id: 'TSK-007',
    title: 'Concert Pre-Production Shoot',
    project: 'Beat FM New Year Concert',
    client: 'Mavin Records',
    status: 'approved',
    priority: 'medium',
    deadline: '2025-12-28',
    payment: 250000,
    description: 'Pre-production photos for concert marketing materials.',
    deliverables: '30 photos - artist portraits, venue, and promotional shots',
    approvedDate: '2025-12-30'
  }
];

const formatNaira = (amount) => `₦${(amount / 1000).toFixed(0)}K`;

export const CreativeTasks = () => {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const getStatusStyle = (status) => {
    const styles = {
      in_progress: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', label: 'In Progress', icon: Clock },
      submitted: { bg: 'bg-[#EEF2FF]', text: 'text-[#2F55FF]', label: 'Submitted', icon: Upload },
      approved: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]', label: 'Approved', icon: CheckCircle },
      revision_requested: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', label: 'Revision', icon: AlertCircle }
    };
    return styles[status] || styles.in_progress;
  };

  const getPriorityStyle = (priority) => {
    const styles = {
      high: 'bg-[#FEF2F2] text-[#DC2626]',
      medium: 'bg-[#FFFBEB] text-[#D97706]',
      low: 'bg-[#F1F5F9] text-[#64748B]'
    };
    return styles[priority] || styles.medium;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="creative-tasks">
      <div>
        <h1 className="text-lg font-bold text-[#0F172A]">Tasks</h1>
        <p className="text-[#64748B] text-sm">Your assigned deliverables and submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4 border-l-4 border-[#D97706]">
          <p className="text-[#64748B] text-sm">In Progress</p>
          <p className="text-lg font-bold text-[#D97706]">{tasks.filter(t => t.status === 'in_progress').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Submitted</p>
          <p className="text-lg font-bold text-[#2F55FF]">{tasks.filter(t => t.status === 'submitted').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Approved</p>
          <p className="text-lg font-bold text-[#22C55E]">{tasks.filter(t => t.status === 'approved').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Earnings</p>
          <p className="text-lg font-bold text-[#0F172A] font-mono">₦1.3M</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'in_progress', 'submitted', 'approved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === f ? 'bg-[#2F55FF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#334155]'}`}
          >
            {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filtered.map((task) => {
          const status = getStatusStyle(task.status);
          const StatusIcon = status.icon;
          return (
            <div key={task.id} className="dashboard-card p-5" data-testid={`task-${task.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-[#2F55FF]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${getPriorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-[#CBD5E1] text-xs">{task.id}</span>
                    </div>
                    <h3 className="text-[#0F172A] font-semibold">{task.title}</h3>
                    <p className="text-[#64748B] text-sm">{task.project}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#22C55E] font-mono text-lg">{formatNaira(task.payment)}</p>
                  <p className="text-[#94A3B8] text-xs">
                    {task.status === 'approved' ? `Paid ${task.approvedDate}` : `Due ${task.deadline}`}
                  </p>
                </div>
              </div>

              <p className="text-[#64748B] text-sm mb-2">{task.description}</p>
              <div className="bg-[#F8FAFC] rounded-lg p-3 mb-3">
                <p className="text-[#94A3B8] text-xs mb-1">Deliverables</p>
                <p className="text-[#334155] text-sm">{task.deliverables}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                <span className="text-[#94A3B8] text-xs">Client: {task.client}</span>
                <div className="flex gap-2">
                  {task.status === 'in_progress' && (
                    <button className="btn-primary text-sm flex items-center gap-1">
                      <Upload className="w-4 h-4" /> Submit Deliverables
                    </button>
                  )}
                  {task.status === 'submitted' && (
                    <span className="text-[#2F55FF] text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Awaiting Review
                    </span>
                  )}
                  {task.status === 'approved' && (
                    <span className="text-[#22C55E] text-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Payment Released
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CreativeTasks;
