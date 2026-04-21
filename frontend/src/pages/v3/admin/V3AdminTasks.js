import React, { useState } from 'react';
import { v3Projects, v3Stages, v3RMs, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { CheckSquare, Clock, User, AlertCircle, Plus, Filter } from 'lucide-react';

const seededTasks = [
  { id: 't1', projectId: 'proj-cocacola-tems', title: 'Review Alignment Snapshot draft', assignee: 'rm-temi', priority: 'high', status: 'done', dueDate: '10 Mar 2026', category: 'document' },
  { id: 't2', projectId: 'proj-cocacola-tems', title: 'Send Alignment Snapshot to brand for confirmation', assignee: 'rm-temi', priority: 'high', status: 'in_progress', dueDate: '17 Mar 2026', category: 'communication' },
  { id: 't3', projectId: 'proj-cocacola-tems', title: 'Clarify budget ceiling with Chidi Okafor', assignee: 'rm-temi', priority: 'medium', status: 'in_progress', dueDate: '18 Mar 2026', category: 'communication' },
  { id: 't4', projectId: 'proj-cocacola-tems', title: 'Prepare creator shortlist for brainstorm', assignee: 'rm-temi', priority: 'medium', status: 'todo', dueDate: '20 Mar 2026', category: 'planning' },
  { id: 't5', projectId: 'proj-guinness-rema', title: 'Review Creative Snapshot v1 internally', assignee: 'rm-adaeze', priority: 'high', status: 'in_progress', dueDate: '18 Mar 2026', category: 'document' },
  { id: 't6', projectId: 'proj-guinness-rema', title: 'Confirm Obongjayar availability for film 3 score', assignee: 'rm-adaeze', priority: 'medium', status: 'todo', dueDate: '25 Mar 2026', category: 'communication' },
  { id: 't7', projectId: 'proj-guinness-rema', title: 'Coordinate Sophia Karimi (Nairobi) sign-off timeline', assignee: 'rm-adaeze', priority: 'high', status: 'todo', dueDate: '20 Mar 2026', category: 'communication' },
  { id: 't8', projectId: 'proj-guinness-rema', title: 'Lock DOP — confirm Kagho Idhebor rate', assignee: 'rm-adaeze', priority: 'medium', status: 'todo', dueDate: '28 Mar 2026', category: 'planning' },
  { id: 't9', projectId: 'proj-mtn-burna', title: 'Collect brand feedback form (Kemi Adebayo)', assignee: 'rm-tope', priority: 'high', status: 'in_progress', dueDate: '15 Mar 2026', category: 'closure' },
  { id: 't10', projectId: 'proj-mtn-burna', title: 'Collect creator feedback form (Burna Boy)', assignee: 'rm-tope', priority: 'high', status: 'todo', dueDate: '15 Mar 2026', category: 'closure' },
  { id: 't11', projectId: 'proj-mtn-burna', title: 'Schedule post-mortem with TASCK team', assignee: 'rm-tope', priority: 'medium', status: 'todo', dueDate: '15 Dec 2025', category: 'closure' },
  { id: 't12', projectId: 'proj-mtn-burna', title: 'Final Report — send to brand for sign-off', assignee: 'rm-tope', priority: 'high', status: 'done', dueDate: '10 Mar 2026', category: 'document' },
  { id: 't13', projectId: 'proj-access-davido', title: 'Follow up on Davido brief response', assignee: 'rm-femi', priority: 'medium', status: 'in_progress', dueDate: '20 Mar 2026', category: 'communication' },
  { id: 't14', projectId: 'proj-star-ayra', title: 'Review Port Harcourt show deliverable', assignee: 'rm-adaeze', priority: 'high', status: 'in_progress', dueDate: '17 Mar 2026', category: 'delivery' },
  { id: 't15', projectId: 'proj-dangote-wizkid', title: 'Prepare for discovery call (Mar 20)', assignee: 'rm-temi', priority: 'medium', status: 'todo', dueDate: '19 Mar 2026', category: 'communication' },
  { id: 't16', projectId: 'proj-pepsi-fireboy', title: 'Complete Alignment Snapshot draft', assignee: 'rm-temi', priority: 'medium', status: 'in_progress', dueDate: '20 Mar 2026', category: 'document' },
];

const V3AdminTasks = () => {
  const [filter, setFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const filtered = seededTasks
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => assigneeFilter === 'all' || t.assignee === assigneeFilter);

  const todoCount = seededTasks.filter(t => t.status === 'todo').length;
  const inProgressCount = seededTasks.filter(t => t.status === 'in_progress').length;
  const doneCount = seededTasks.filter(t => t.status === 'done').length;

  const statusIcon = (status) => {
    if (status === 'done') return <CheckSquare className="w-4 h-4 text-[#1F4A3A]" />;
    if (status === 'in_progress') return <Clock className="w-4 h-4 text-[#C49B5F]" />;
    return <AlertCircle className="w-4 h-4 text-[#D4CDBF]" />;
  };

  const priorityStyle = (p) => p === 'high' ? 'text-[#B54A37] bg-[#B54A3712]' : 'text-[#8A8A8A] bg-[#F4F2EC]';

  return (
    <div data-testid="v3-admin-tasks">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">TEAM TASKS</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Task Board</h1>
          <p className="text-[#8A8A8A] text-sm">{seededTasks.length} tasks across {new Set(seededTasks.map(t => t.projectId)).size} projects</p>
        </div>
        <button className="v3-btn-primary" data-testid="add-task-btn"><Plus className="w-4 h-4" /> New Task</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors" onClick={() => setFilter('todo')}>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">To Do</p>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{todoCount}</p>
        </div>
        <div className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors" onClick={() => setFilter('in_progress')}>
          <p className="text-[10px] text-[#C49B5F] uppercase tracking-wider mb-1">In Progress</p>
          <p className="text-xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{inProgressCount}</p>
        </div>
        <div className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors" onClick={() => setFilter('done')}>
          <p className="text-[10px] text-[#1F4A3A] uppercase tracking-wider mb-1">Done</p>
          <p className="text-xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{doneCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          {[{ key: 'all', label: 'All' }, { key: 'todo', label: 'To Do' }, { key: 'in_progress', label: 'In Progress' }, { key: 'done', label: 'Done' }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors ${filter === f.key ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
          className="ml-auto px-3 py-1.5 text-[11px] rounded-lg border border-[#E8E4DB] bg-white text-[#5C5C5C]" data-testid="task-assignee-filter">
          <option value="all">All RMs</option>
          {v3RMs.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
        </select>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => {
          const project = v3Projects.find(p => p.id === task.projectId);
          const brand = project ? getBrand(project.brandId) : null;
          const rm = getRM(task.assignee);
          return (
            <div key={task.id} className={`v3-card p-3.5 flex items-center gap-3 ${task.status === 'done' ? 'opacity-60' : ''}`} data-testid={`task-${task.id}`}>
              {statusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] text-[#1A1A1A] ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</p>
                <p className="text-[10px] text-[#8A8A8A]">{brand?.company?.split(' ')[0]} — {project?.title}</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[8px] font-bold text-[#1F4A3A] flex-shrink-0" title={rm?.name}>{rm?.initials}</div>
              <span className={`text-[9px] px-2 py-0.5 rounded flex-shrink-0 ${priorityStyle(task.priority)}`}>{task.priority}</span>
              <span className="text-[10px] text-[#8A8A8A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{task.dueDate}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V3AdminTasks;
