import React, { useState, useEffect, useCallback } from 'react';
import { v3ListBusinessCases, v3ListRelationshipManagers } from '../../../lib/v3api';
import { CheckSquare, Clock, AlertCircle, Plus, Loader2 } from 'lucide-react';

const V3AdminTasks = () => {
  const [filter, setFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [rms, setRms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      v3ListBusinessCases({}).catch(() => []),
      v3ListRelationshipManagers().catch(() => []),
    ]).then(([bcData, rmData]) => {
      const bcs = Array.isArray(bcData) ? bcData : bcData?.items || [];
      const rmList = Array.isArray(rmData) ? rmData : [];
      setRms(rmList);

      // Build tasks from business case next_action fields and stage metadata
      const builtTasks = [];
      bcs.forEach((bc) => {
        const pid = bc.id || bc._id;
        const label = bc.brand_name || bc.brand_id?.slice(0, 8) || 'Brand';
        const rmId = bc.rm_id;

        if (bc.next_action) {
          builtTasks.push({
            id: `task-${pid}-nextaction`,
            project_id: pid,
            project_title: bc.title,
            brand_label: label,
            title: bc.next_action,
            assignee_id: rmId,
            assignee_name: bc.rm_name || rmList.find((r) => (r.id || r._id) === rmId)?.name || 'RM',
            priority: 'medium',
            status: 'todo',
            due_date: bc.next_action_date || null,
            category: 'action',
          });
        }

        // Add stage-based implicit task
        if (bc.stage === 'frame') {
          builtTasks.push({
            id: `task-${pid}-alignment`,
            project_id: pid,
            project_title: bc.title,
            brand_label: label,
            title: `Review / draft Alignment Snapshot - ${bc.title}`,
            assignee_id: rmId,
            assignee_name: bc.rm_name || 'RM',
            priority: 'high',
            status: 'in_progress',
            due_date: null,
            category: 'document',
          });
        } else if (bc.stage === 'plan') {
          builtTasks.push({
            id: `task-${pid}-brief`,
            project_id: pid,
            project_title: bc.title,
            brand_label: label,
            title: `Confirm creative brief and creator selection - ${bc.title}`,
            assignee_id: rmId,
            assignee_name: bc.rm_name || 'RM',
            priority: 'high',
            status: 'in_progress',
            due_date: null,
            category: 'planning',
          });
        } else if (bc.stage === 'deliver') {
          builtTasks.push({
            id: `task-${pid}-delivery`,
            project_id: pid,
            project_title: bc.title,
            brand_label: label,
            title: `Track delivery and deliverable approvals - ${bc.title}`,
            assignee_id: rmId,
            assignee_name: bc.rm_name || 'RM',
            priority: 'high',
            status: 'in_progress',
            due_date: null,
            category: 'delivery',
          });
        }
      });

      setTasks(builtTasks);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]" data-testid="v3-admin-tasks">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading tasks…</span>
      </div>
    );
  }

  const filtered = tasks
    .filter((t) => filter === 'all' || t.status === filter)
    .filter((t) => assigneeFilter === 'all' || t.assignee_id === assigneeFilter);

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const projectCount = new Set(tasks.map((t) => t.project_id)).size;

  const statusIcon = (status) => {
    if (status === 'done') return <CheckSquare className="w-4 h-4 text-[#1F4A3A]" />;
    if (status === 'in_progress') return <Clock className="w-4 h-4 text-[#C49B5F]" />;
    return <AlertCircle className="w-4 h-4 text-[#D4CDBF]" />;
  };

  const priorityStyle = (p) =>
    p === 'high' ? 'text-[#B54A37] bg-[#B54A3712]' : 'text-[#8A8A8A] bg-[#F4F2EC]';

  const assigneeInitials = (name) =>
    (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2);

  return (
    <div data-testid="v3-admin-tasks">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">TEAM TASKS</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Task Board
          </h1>
          <p className="text-[#8A8A8A] text-sm">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} across {projectCount} project{projectCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="v3-btn-primary" data-testid="add-task-btn">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors"
          onClick={() => setFilter('todo')}
        >
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">To Do</p>
          <p
            className="text-xl font-semibold text-[#1A1A1A]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {todoCount}
          </p>
        </div>
        <div
          className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors"
          onClick={() => setFilter('in_progress')}
        >
          <p className="text-[10px] text-[#C49B5F] uppercase tracking-wider mb-1">In Progress</p>
          <p
            className="text-xl font-semibold text-[#C49B5F]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {inProgressCount}
          </p>
        </div>
        <div
          className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors"
          onClick={() => setFilter('done')}
        >
          <p className="text-[10px] text-[#1F4A3A] uppercase tracking-wider mb-1">Done</p>
          <p
            className="text-xl font-semibold text-[#1F4A3A]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {doneCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'todo', label: 'To Do' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'done', label: 'Done' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors ${
                filter === f.key ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {rms.length > 0 && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="ml-auto px-3 py-1.5 text-[11px] rounded-lg border border-[#E8E4DB] bg-white text-[#5C5C5C]"
            data-testid="task-assignee-filter"
          >
            <option value="all">All RMs</option>
            {rms.map((rm) => (
              <option key={rm.id || rm._id} value={rm.id || rm._id}>
                {rm.name || rm.display_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <CheckSquare className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No tasks found.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Tasks are generated from active business cases and their next actions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`v3-card p-3.5 flex items-center gap-3 ${
                task.status === 'done' ? 'opacity-60' : ''
              }`}
              data-testid={`task-${task.id}`}
            >
              {statusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[12px] text-[#1A1A1A] ${
                    task.status === 'done' ? 'line-through' : ''
                  }`}
                >
                  {task.title}
                </p>
                <p className="text-[10px] text-[#8A8A8A]">
                  {task.brand_label}
                  {task.project_title ? ` - ${task.project_title}` : ''}
                </p>
              </div>
              <div
                className="w-6 h-6 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[8px] font-bold text-[#1F4A3A] flex-shrink-0"
                title={task.assignee_name}
              >
                {assigneeInitials(task.assignee_name)}
              </div>
              <span
                className={`text-[9px] px-2 py-0.5 rounded flex-shrink-0 ${priorityStyle(task.priority)}`}
              >
                {task.priority}
              </span>
              {task.due_date && (
                <span
                  className="text-[10px] text-[#8A8A8A] flex-shrink-0"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {task.due_date}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default V3AdminTasks;
