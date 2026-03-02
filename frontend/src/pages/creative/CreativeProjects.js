import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/shared/Avatar';
import { FolderOpen, Clock, CheckSquare, ArrowRight } from 'lucide-react';

const projects = [
  {
    id: 'PRJ-2026-0024',
    title: 'Don Jazzy x Cadbury — Brand Campaign 2026',
    role: 'Lead Photographer',
    client: 'Mavin Records',
    status: 'active',
    budget: 750000,
    earned: 375000,
    tasks: { total: 6, completed: 3 },
    deadline: '2026-04-30',
    progress: 50
  },
  {
    id: 'PRJ-2025-0089',
    title: 'UBA Foundation — Corporate Portrait Series',
    role: 'Photographer',
    client: 'UBA Foundation',
    status: 'active',
    budget: 600000,
    earned: 450000,
    tasks: { total: 4, completed: 3 },
    deadline: '2026-03-15',
    progress: 75
  },
  {
    id: 'PRJ-2025-0078',
    title: 'Johnnie Walker x Don Jazzy — Walk With Giants',
    role: 'Campaign Photographer',
    client: 'Mavin Records',
    status: 'review',
    budget: 500000,
    earned: 500000,
    tasks: { total: 5, completed: 5 },
    deadline: '2026-03-10',
    progress: 100
  },
  {
    id: 'PRJ-2025-0095',
    title: 'Beat FM New Year Concert 2026',
    role: 'Event Photographer',
    client: 'Mavin Records',
    status: 'completed',
    budget: 350000,
    earned: 350000,
    tasks: { total: 3, completed: 3 },
    deadline: '2026-01-05',
    progress: 100
  }
];

const formatNaira = (amount) => `₦${(amount / 1000).toFixed(0)}K`;

export const CreativeProjects = () => {
  const { user } = useAuth();

  const getStatusColor = (status) => {
    const colors = { active: 'bg-[#6BFF9A]/20 text-[#6BFF9A]', review: 'bg-[#FFA502]/20 text-[#FFA502]', completed: 'bg-[#2F55FF]/20 text-[#2F55FF]' };
    return colors[status] || 'bg-white/10 text-white/60';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="creative-projects">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="text-white/50 text-sm">Projects you're currently working on</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Active Projects</p>
          <p className="text-2xl font-bold text-[#6BFF9A]">{projects.filter(p => p.status === 'active').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Total Earnings</p>
          <p className="text-2xl font-bold text-white font-mono">₦1.675M</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Tasks Completed</p>
          <p className="text-2xl font-bold text-white">14/18</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Reliability Score</p>
          <p className="text-2xl font-bold text-[#6BFF9A]">97%</p>
        </div>
      </div>

      {/* Project Cards */}
      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="dashboard-card p-6 hover:border-[#2F55FF]/30 transition-colors cursor-pointer" data-testid={`project-${project.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#2F55FF]/20 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-[#2F55FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/40 text-xs">{project.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(project.status)}`}>{project.status}</span>
                  </div>
                  <h3 className="text-white font-semibold">{project.title}</h3>
                  <p className="text-white/50 text-sm">Your role: <span className="text-white/80">{project.role}</span></p>
                  <p className="text-white/40 text-xs mt-1">Client: {project.client}</p>
                </div>
              </div>
              <button className="btn-ghost text-sm flex items-center gap-1">
                View <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Progress</span>
                <span className="font-mono">{project.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${project.progress}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#6BFF9A] font-mono">{formatNaira(project.budget)}</p>
                <p className="text-white/40 text-xs">Contract</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white font-mono">{formatNaira(project.earned)}</p>
                <p className="text-white/40 text-xs">Earned</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white font-mono flex items-center justify-center gap-1"><CheckSquare className="w-3 h-3" /> {project.tasks.completed}/{project.tasks.total}</p>
                <p className="text-white/40 text-xs">Tasks</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white/60 text-sm flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> {project.deadline.split('-').slice(1).join('/')}</p>
                <p className="text-white/40 text-xs">Deadline</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreativeProjects;
