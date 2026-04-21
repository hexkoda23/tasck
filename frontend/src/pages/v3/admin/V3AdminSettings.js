import React, { useState } from 'react';
import { Settings, Bell, Shield, Globe, Palette, Clock, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

const V3AdminSettings = () => {
  const [reminders, setReminders] = useState({
    inactiveLead: { enabled: true, days: 14 },
    budgetConfirmation: { enabled: true, days: 7 },
    deliverableReview: { enabled: true, days: 3 },
    feedbackCollection: { enabled: true, days: 5 },
    escalation: { enabled: true, days: 21 },
    reEngagement: { enabled: true, days: 30 },
  });

  const toggle = (key) => setReminders(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  const updateDays = (key, days) => setReminders(prev => ({ ...prev, [key]: { ...prev[key], days: parseInt(days) || 0 } }));

  const Toggle = ({ enabled, onToggle }) => (
    <button onClick={onToggle} className="flex-shrink-0">
      {enabled ? <ToggleRight className="w-8 h-4 text-[#1F4A3A]" /> : <ToggleLeft className="w-8 h-4 text-[#D4CDBF]" />}
    </button>
  );

  return (
    <div data-testid="v3-admin-settings">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">SETTINGS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Settings</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Platform configuration and workflow automation.</p>

      <div className="space-y-6">
        {/* Organization */}
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} /><h3 className="text-[13px] font-semibold text-[#1A1A1A]">Organization</h3></div>
          <div className="space-y-3">
            {[
              { label: 'Company name', value: 'The TASCK Agency' },
              { label: 'HQ', value: 'Victoria Island, Lagos' },
              { label: 'Stage model', value: '4-stage (Connect → Frame → Plan → Deliver)' },
              { label: 'Default engagement', value: 'Retainer' },
              { label: 'Default usage rights', value: '12 months' },
              { label: 'Max Creative Snapshot revisions', value: '3' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F4F2EC] last:border-0">
                <span className="text-[13px] text-[#8A8A8A]">{item.label}</span>
                <span className="text-[13px] text-[#1A1A1A]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Automated Reminders & Escalation — INTERACTIVE */}
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} /><h3 className="text-[13px] font-semibold text-[#1A1A1A]">Automated Reminders & Escalation</h3></div>
          <div className="space-y-3">
            {[
              { key: 'inactiveLead', label: 'Inactive lead alert', desc: 'Flag when a CRM contact goes quiet' },
              { key: 'budgetConfirmation', label: 'Budget confirmation reminder', desc: 'Nudge brand to confirm budget ceiling' },
              { key: 'deliverableReview', label: 'Deliverable review deadline', desc: 'Alert RM when deliverable awaits review' },
              { key: 'feedbackCollection', label: 'Feedback collection', desc: 'Send feedback form after project closure' },
              { key: 'escalation', label: 'Escalation trigger', desc: 'Auto-escalate to senior RM or ops lead' },
              { key: 'reEngagement', label: 'Re-engagement workflow', desc: 'Trigger nurture sequence for stale leads' },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-4 py-2 border-b border-[#F4F2EC] last:border-0" data-testid={`reminder-${item.key}`}>
                <Toggle enabled={reminders[item.key].enabled} onToggle={() => toggle(item.key)} />
                <div className="flex-1">
                  <p className={`text-[13px] ${reminders[item.key].enabled ? 'text-[#1A1A1A]' : 'text-[#D4CDBF]'}`}>{item.label}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-[#8A8A8A]">After</span>
                  <input type="number" value={reminders[item.key].days}
                    onChange={e => updateDays(item.key, e.target.value)}
                    disabled={!reminders[item.key].enabled}
                    className="w-12 px-2 py-1 text-[12px] text-center rounded-md border border-[#E8E4DB] bg-white disabled:opacity-30"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }} />
                  <span className="text-[10px] text-[#8A8A8A]">days</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} /><h3 className="text-[13px] font-semibold text-[#1A1A1A]">Notification Channels</h3></div>
          <div className="space-y-3">
            {[
              { label: 'New brand lead', value: 'Email + In-app' },
              { label: 'Stage advancement', value: 'In-app' },
              { label: 'Deliverable uploaded', value: 'Email + In-app' },
              { label: 'Payment released', value: 'Email' },
              { label: 'Scope change requested', value: 'Email + In-app' },
              { label: 'Feedback submitted', value: 'In-app' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F4F2EC] last:border-0">
                <span className="text-[13px] text-[#8A8A8A]">{item.label}</span>
                <span className="text-[13px] text-[#1A1A1A]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} /><h3 className="text-[13px] font-semibold text-[#1A1A1A]">Integrations</h3></div>
          <div className="space-y-3">
            {[
              { label: 'CRM sync', value: 'Manual (API ready)', status: 'ready' },
              { label: 'Kantar brand tracking', value: 'Connected', status: 'connected' },
              { label: 'Meltwater EMV', value: 'Connected', status: 'connected' },
              { label: 'Payment gateway', value: 'Escrow (internal)', status: 'connected' },
              { label: 'WhatsApp Business', value: 'Not configured', status: 'pending' },
              { label: 'Google Calendar', value: 'Not configured', status: 'pending' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F4F2EC] last:border-0">
                <span className="text-[13px] text-[#8A8A8A]">{item.label}</span>
                <span className={`text-[13px] ${item.status === 'connected' ? 'text-[#1F4A3A]' : item.status === 'ready' ? 'text-[#C49B5F]' : 'text-[#D4CDBF]'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3AdminSettings;
