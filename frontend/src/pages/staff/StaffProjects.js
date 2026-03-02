import React, { useState, useEffect } from 'react';
import { getProjects } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { FolderOpen, Search, Plus, Users, CheckSquare, Clock } from 'lucide-react';

export const StaffProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getProjects();
        setProjects(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-projects">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Projects</h1>
          <p className="text-[#64748B] text-sm">{projects.length} total projects</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input 
          type="text"
          placeholder="Search projects..."
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-48 rounded-lg"></div>)
        ) : (
          projects.map((project) => (
            <div key={project.id} className="dashboard-card p-6 hover:border-[#C7D2FE] transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[#94A3B8] text-xs">{project.project_id}</span>
                  <h3 className="text-[#0F172A] font-semibold">{project.title}</h3>
                  <p className="text-[#64748B] text-sm">{project.super_creative_name}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                  <span>Progress</span>
                  <span>{project.completion}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${project.completion}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#F8FAFC] rounded-lg p-2">
                  <p className="text-[#0F172A] font-mono">{formatNaira(project.budget, { compact: true })}</p>
                  <p className="text-[#94A3B8] text-xs">Budget</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-2">
                  <p className="text-[#0F172A] font-mono">{project.opportunities_filled}/{project.opportunities_count}</p>
                  <p className="text-[#94A3B8] text-xs">Hired</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-2">
                  <p className="text-[#0F172A] font-mono">{project.tasks_completed}/{project.tasks_total}</p>
                  <p className="text-[#94A3B8] text-xs">Tasks</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-2">
                  <p className="text-[#22C55E] font-mono">{formatNaira(project.released, { compact: true })}</p>
                  <p className="text-[#94A3B8] text-xs">Released</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffProjects;
