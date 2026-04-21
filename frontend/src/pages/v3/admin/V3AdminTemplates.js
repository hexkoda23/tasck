import React from 'react';
import { BookOpen, FileText, Sparkles } from 'lucide-react';

const templates = [
  {
    id: 'tmpl-alignment',
    name: 'Alignment Snapshot',
    description: 'AI-generated strategic alignment document produced during the Frame stage. Captures brand background, stated goals, implied KPIs, key challenges, and proposed campaign direction.',
    stage: 'Frame',
    lastUsed: '10 March 2026',
    usageCount: 4,
  },
  {
    id: 'tmpl-creative',
    name: 'Creative Snapshot',
    description: 'Comprehensive campaign plan including concept, deliverables, budget breakdown, timeline, milestones, and success metrics. Up to 3 versions with brand feedback loops.',
    stage: 'Plan',
    lastUsed: '16 March 2026',
    usageCount: 3,
  },
  {
    id: 'tmpl-brief',
    name: 'Creator Brief',
    description: 'Structured brief sent to matched creators. Includes opportunity context, role definition, commercial terms, timeline, and response form.',
    stage: 'Plan',
    lastUsed: '7 March 2026',
    usageCount: 5,
  },
  {
    id: 'tmpl-report',
    name: 'Final Campaign Report',
    description: 'AI-generated comprehensive report covering executive summary, KPI performance, timeline adherence, budget adherence, creator performance, and recommendations.',
    stage: 'Deliver/Close',
    lastUsed: '15 December 2025',
    usageCount: 1,
  },
  {
    id: 'tmpl-retainer',
    name: 'Retainer Agreement',
    description: 'Standard retainer engagement contract template with consultancy fee structure, scope of work, and milestone-based payment terms.',
    stage: 'Frame → Plan',
    lastUsed: '3 March 2026',
    usageCount: 4,
  },
  {
    id: 'tmpl-direct',
    name: 'Direct Engagement Contract',
    description: 'Standard direct engagement contract for single-project collaborations. Includes deliverable specifications, payment schedule, and usage rights.',
    stage: 'Plan → Deliver',
    lastUsed: '15 October 2025',
    usageCount: 3,
  },
];

const V3AdminTemplates = () => {
  return (
    <div data-testid="v3-admin-templates">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">TEMPLATES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Document Templates</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Standard templates used across the pipeline.</p>

      <div className="grid grid-cols-2 gap-4">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="v3-card p-5 hover:border-[#D4CDBF] transition-colors" data-testid={`template-${tmpl.id}`}>
            <div className="flex items-center gap-2 mb-3">
              {tmpl.id.includes('alignment') || tmpl.id.includes('creative') || tmpl.id.includes('report')
                ? <Sparkles className="w-4 h-4 text-[#1F4A3A]" />
                : <FileText className="w-4 h-4 text-[#8A8A8A]" />
              }
              <h3 className="text-[14px] font-medium text-[#1A1A1A]">{tmpl.name}</h3>
            </div>
            <p className="text-[12px] text-[#5C5C5C] leading-relaxed mb-3">{tmpl.description}</p>
            <div className="flex items-center gap-4 text-[10px] text-[#8A8A8A]">
              <span className="bg-[#F4F2EC] px-2 py-0.5 rounded">{tmpl.stage}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Used {tmpl.usageCount}×</span>
              <span className="ml-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Last: {tmpl.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default V3AdminTemplates;
