import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Projects, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { ChevronLeft, AlertTriangle, CheckCircle, Clock, FileText, Plus } from 'lucide-react';

const seededScopeChanges = {
  'proj-mtn-burna': [
    {
      id: 'sc-1', title: 'Additional 3 social cutdowns', requestedBy: 'Kemi Adebayo (MTN)', requestDate: '18 Nov 2025',
      description: 'Brand requested 3 additional 30-second social cutdowns from the concert footage, optimized for Instagram Reels and TikTok. Original scope was 8 cutdowns; this brings total to 11.',
      impact: { budget: 4000000, timeline: '3 additional working days', scope: 'Additive — no change to existing deliverables' },
      status: 'approved', approvedBy: 'Tope Martins', approvedDate: '19 Nov 2025',
      resolution: 'Scope change amendment executed. ₦4M addendum added to project budget. New total: ₦154M.',
    },
  ],
  'proj-star-ayra': [
    {
      id: 'sc-2', title: 'Add Ibadan show date', requestedBy: 'Funke Adebiyi (Star Lager)', requestDate: '28 Feb 2026',
      description: 'Brand requesting addition of an Ibadan show to the Star Nights Tour. Original scope was Lagos, Abuja, Port Harcourt (3 cities). This would add a 4th city.',
      impact: { budget: 15000000, timeline: '+2 weeks to tour schedule', scope: 'Additive — requires new venue booking, logistics, and additional content package' },
      status: 'under_review', approvedBy: null, approvedDate: null,
      resolution: null,
    },
  ],
};

const V3AdminScopeChange = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const project = v3Projects.find(p => p.id === id);
  const brand = project ? getBrand(project.brandId) : null;
  const changes = seededScopeChanges[id] || [];

  if (!project) return <div className="p-8 text-[#8A8A8A]">Project not found.</div>;

  return (
    <div data-testid="v3-admin-scope-change">
      <button onClick={() => navigate(`/v3/admin/projects/${id}`)} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to project
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">SCOPE CHANGES</p>
          <h1 className="v3-heading text-xl" style={{ fontFamily: "'Fraunces', serif" }}>{brand?.company?.split(' ')[0]} — {project.title}</h1>
          <p className="text-[#8A8A8A] text-sm">{changes.length} scope change{changes.length !== 1 ? 's' : ''} logged</p>
        </div>
        <button className="v3-btn-primary" data-testid="new-scope-change"><Plus className="w-4 h-4" /> Log Scope Change</button>
      </div>

      <div className="space-y-4">
        {changes.map(sc => (
          <div key={sc.id} className="v3-card p-5" data-testid={`scope-${sc.id}`}>
            <div className="flex items-center gap-3 mb-4">
              {sc.status === 'approved' ? <CheckCircle className="w-5 h-5 text-[#1F4A3A]" /> :
               sc.status === 'under_review' ? <Clock className="w-5 h-5 text-[#C49B5F]" /> :
               <AlertTriangle className="w-5 h-5 text-[#B54A37]" />}
              <div className="flex-1">
                <h3 className="text-[14px] font-medium text-[#1A1A1A]">{sc.title}</h3>
                <p className="text-[11px] text-[#8A8A8A]">Requested by {sc.requestedBy} on {sc.requestDate}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                sc.status === 'approved' ? 'text-[#1F4A3A] bg-[#DDE7E2]' :
                sc.status === 'under_review' ? 'text-[#C49B5F] bg-[#C49B5F12]' :
                'text-[#B54A37] bg-[#B54A3712]'
              }`}>{sc.status === 'under_review' ? 'Under Review' : sc.status === 'approved' ? 'Approved' : 'Rejected'}</span>
            </div>

            <p className="text-[13px] text-[#5C5C5C] leading-relaxed mb-4">{sc.description}</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-[#FAFAF7]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Budget Impact</p>
                <p className="text-[14px] font-medium text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{formatNairaV3(sc.impact.budget)}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF7]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Timeline Impact</p>
                <p className="text-[13px] text-[#1A1A1A]">{sc.impact.timeline}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF7]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Scope Impact</p>
                <p className="text-[13px] text-[#1A1A1A]">{sc.impact.scope}</p>
              </div>
            </div>

            {sc.resolution && (
              <div className="p-3 rounded-lg bg-[#DDE7E2] border border-[#1F4A3A20]">
                <p className="text-[10px] text-[#1F4A3A] uppercase tracking-wider mb-1">Resolution</p>
                <p className="text-[12px] text-[#1F4A3A]">{sc.resolution}</p>
                <p className="text-[10px] text-[#1F4A3A80] mt-1">Approved by {sc.approvedBy} on {sc.approvedDate}</p>
              </div>
            )}

            {sc.status === 'under_review' && (
              <div className="flex gap-2 mt-4">
                <button className="v3-btn-primary flex-1 justify-center">Approve</button>
                <button className="v3-btn-secondary flex-1 justify-center">Request Changes</button>
                <button className="v3-btn-secondary text-[#B54A37] border-[#B54A3730] hover:bg-[#B54A3708]">Reject</button>
              </div>
            )}
          </div>
        ))}

        {changes.length === 0 && (
          <div className="v3-card p-8 text-center">
            <CheckCircle className="w-6 h-6 text-[#1F4A3A] mx-auto mb-3" />
            <p className="text-[14px] text-[#1A1A1A]">No scope changes</p>
            <p className="text-[12px] text-[#8A8A8A]">This project has stayed within the originally agreed scope.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default V3AdminScopeChange;
