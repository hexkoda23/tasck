import React from 'react';
import Avatar from '../../components/shared/Avatar';
import { FolderOpen, Search, Plus, Users, CheckSquare, Clock, ArrowRight } from 'lucide-react';

const projects = [
  {
    id: 'PRJ-2026-0024',
    title: 'Don Jazzy x Cadbury — Brand Campaign 2026',
    client: 'Cadbury Nigeria',
    status: 'active',
    budget: 32000000,
    spent: 14500000,
    progress: 45,
    team: 8,
    tasks: { total: 24, completed: 11 },
    deadline: '2026-04-30',
    opportunities: { total: 6, filled: 4 }
  },
  {
    id: 'PRJ-2026-0019',
    title: 'Mavin Concert Tour — Lagos/Abuja/PH',
    client: 'Self-Funded',
    status: 'active',
    budget: 18000000,
    spent: 12200000,
    progress: 68,
    team: 15,
    tasks: { total: 35, completed: 24 },
    deadline: '2026-03-30',
    opportunities: { total: 10, filled: 9 }
  },
  {
    id: 'PRJ-2025-0078',
    title: 'Johnnie Walker x Don Jazzy — Walk With Giants Q1',
    client: 'Diageo Nigeria',
    status: 'review',
    budget: 25000000,
    spent: 24800000,
    progress: 95,
    team: 6,
    tasks: { total: 28, completed: 27 },
    deadline: '2026-03-15',
    opportunities: { total: 4, filled: 4 }
  },
  {
    id: 'PRJ-2025-0095',
    title: 'Beat FM New Year Concert 2026',
    client: 'Beat FM',
    status: 'completed',
    budget: 8000000,
    spent: 7950000,
    progress: 100,
    team: 12,
    tasks: { total: 18, completed: 18 },
    deadline: '2026-01-05',
    opportunities: { total: 8, filled: 8 }
  }
];

const formatNaira = (amount) => `₦${(amount / 1000000).toFixed(1)}M`;

export const SuperCreativeProjects = () => {
  return (
    <div className="space-y-6 animate-fade-in" data-testid="sc-projects">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-white/50 text-sm">{projects.length} total projects</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Active Projects</p>
          <p className="text-2xl font-bold text-[#6BFF9A]">{projects.filter(p => p.status === 'active').length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Total Budget</p>
          <p className="text-2xl font-bold text-white font-mono">₦83M</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Team Members</p>
          <p className="text-2xl font-bold text-white">41</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-sm">Completion Rate</p>
          <p className="text-2xl font-bold text-[#6BFF9A]">94%</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search projects..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map((project) => {
          const getStatusColor = (status) => {
            const colors = { active: 'bg-[#6BFF9A]/20 text-[#6BFF9A]', review: 'bg-[#FFA502]/20 text-[#FFA502]', completed: 'bg-[#2F55FF]/20 text-[#2F55FF]' };
            return colors[status] || 'bg-white/10 text-white/60';
          };
          return (
            <div key={project.id} className="dashboard-card p-6 hover:border-[#2F55FF]/30 transition-colors cursor-pointer" data-testid={`project-${project.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/40 text-xs">{project.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(project.status)}`}>{project.status}</span>
                  </div>
                  <h3 className="text-white font-semibold">{project.title}</h3>
                  <p className="text-white/50 text-sm">{project.client}</p>
                </div>
                <button className="btn-ghost text-xs">
                  <ArrowRight className="w-4 h-4" />
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

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-white font-mono text-sm">{formatNaira(project.budget)}</p>
                  <p className="text-white/40 text-xs">Budget</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-white font-mono text-sm flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> {project.team}
                  </p>
                  <p className="text-white/40 text-xs">Team</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-white font-mono text-sm">{project.tasks.completed}/{project.tasks.total}</p>
                  <p className="text-white/40 text-xs">Tasks</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-white font-mono text-sm flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> {project.deadline.split('-').slice(1).join('/')}
                  </p>
                  <p className="text-white/40 text-xs">Deadline</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperCreativeProjects;
