import React from 'react';
import { FileText, Sparkles, ShieldCheck, Palette } from 'lucide-react';

const templateGroups = [
  {
    id: 'brand',
    title: 'Brand Templates',
    icon: Palette,
    note: 'Brand-facing documents use the TTA letterhead, bordered document layout, and green/blue TASCK identity assets.',
    items: [
      { name: 'Copy of TTA Template Letterhead (Main).docx', stage: 'All brand-facing documents', usage: 'Letterhead base for snapshots, fee notes, reports, and client letters.' },
      { name: 'Copy of TTA v2 (With Borders).docx', stage: 'Formal issued documents', usage: 'Bordered version for signed or sent documents that need stronger brand framing.' },
      { name: 'Copy of Asset 1.png', stage: 'Brand identity', usage: 'Large green TTA mark used on template surfaces.' },
      { name: 'Copy of Asset 2.png', stage: 'Brand identity', usage: 'Blue circular TASCK agency mark for covers and headers.' },
    ],
  },
  {
    id: 'workflow',
    title: 'Workflow Documents',
    icon: Sparkles,
    note: 'These templates power the operating flow from Frame through Plan, Delivery, Final Report, and Feedback.',
    items: [
      { name: 'Copy of Updated Project Alignment Snapshot - Pre Paid Layer.docx', stage: 'Frame', usage: 'Alignment Snapshot before paid-plan work starts.' },
      { name: 'Copy of Updated Creative Strategy Template_.docx', stage: 'Plan', usage: 'Brand-facing Strategy Snapshot after creative brief and brainstorm inputs.' },
      { name: 'Copy of Copy of Creative Brief Template.docx', stage: 'Plan', usage: 'Creative Brief structure for one or multiple briefs sent to creatives.' },
      { name: 'Copy of Creative Brief Template.docx', stage: 'Plan', usage: 'Alternate Creative Brief version retained for production rebuild comparison.' },
      { name: 'Copy of Copy of Draft Fee Note.docx', stage: 'Plan', usage: 'Editable Strategy Development Fee note and commercial schedule.' },
      { name: 'Copy of Draft Fee Note.docx', stage: 'Plan', usage: 'Fee note variant for issued Strategy Development Fee documents.' },
      { name: 'Copy of Updated Brainstorming Outline.docx', stage: 'Plan', usage: 'Brainstorm phase covering content, budget, revenue, creator fit, and contract planning.' },
      { name: 'Copy of Project Report Template.docx', stage: 'Reporting', usage: 'Final Campaign Report populated from deliverables, KPIs, approvals, and closure notes.' },
      { name: 'Copy of Feedback Template.docx', stage: 'After final report', usage: 'Google Form-style brand feedback checklist with scores.' },
      { name: 'Copy of TTA  Business SOP.docx', stage: 'Operations', usage: 'Admin process reference for TASCK project handling.' },
    ],
  },
  {
    id: 'legal',
    title: 'Legal Templates',
    icon: ShieldCheck,
    note: 'Legal templates are selected by engagement type and attached before Delivery begins.',
    items: [
      { name: 'Copy of Grant Projects_  Independent Creator Agreement. docx', stage: 'Grant projects', usage: 'Grant-specific creator agreement for externally funded work.' },
      { name: 'Copy of Independent Creator Agreement. Template.docx', stage: 'Paid creator work', usage: 'Standard independent creator contract with deliverables, fees, usage, and payment triggers.' },
      { name: 'Copy of Service Agreement_ Template.docx', stage: 'Brand contract', usage: 'Brand service agreement for TASCK scope, approvals, fees, and reporting.' },
      { name: 'Copy of SERVICE LEVEL AGREEMENT_  Template.docx', stage: 'Brand or partner SLA', usage: 'Service-level obligations, response times, escalation, and delivery standards.' },
    ],
  },
];

const V3AdminTemplates = () => {
  return (
    <div data-testid="v3-admin-templates">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">TEMPLATES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Document Templates</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Uploaded brand, workflow, feedback, fee, report, SOP, and legal templates mapped to the TASCK V3 flow.</p>

      <div className="space-y-6">
        {templateGroups.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.id} className="v3-card p-5" data-testid={`template-group-${group.id}`}>
              <div className="flex items-start gap-3 mb-4">
                <Icon className="w-4 h-4 text-[#1F4A3A] mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-medium text-[#1A1A1A]">{group.title}</h3>
                  <p className="text-[12px] text-[#8A8A8A] leading-relaxed">{group.note}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded border border-[#E8E4DB]">
                <table className="w-full">
                  <thead className="bg-[#FAFAF7]">
                    <tr>
                      <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Template File</th>
                      <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Stage</th>
                      <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Production Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(item => (
                      <tr key={item.name} className="border-t border-[#F4F2EC]">
                        <td className="p-3 text-[12px] text-[#1A1A1A]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-[#8A8A8A]" />
                            {item.name}
                          </div>
                        </td>
                        <td className="p-3 text-[11px] text-[#1F4A3A]">{item.stage}</td>
                        <td className="p-3 text-[12px] text-[#5C5C5C] leading-relaxed">{item.usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V3AdminTemplates;
