import React from 'react';
import { Settings, User, Bell, Shield, Globe, Palette } from 'lucide-react';

const V3AdminSettings = () => {
  const settingsSections = [
    {
      icon: User,
      title: 'Organization',
      items: [
        { label: 'Company name', value: 'The TASCK Agency' },
        { label: 'HQ', value: 'Victoria Island, Lagos' },
        { label: 'Founded', value: '2024' },
      ],
    },
    {
      icon: Shield,
      title: 'Pipeline Configuration',
      items: [
        { label: 'Stage model', value: '4-stage (Connect → Frame → Plan → Deliver)' },
        { label: 'Max Creative Snapshot revisions', value: '3' },
        { label: 'Default engagement model', value: 'Retainer' },
        { label: 'Default usage rights period', value: '12 months' },
      ],
    },
    {
      icon: Bell,
      title: 'Notifications',
      items: [
        { label: 'New brand lead', value: 'Email + In-app' },
        { label: 'Stage advancement', value: 'In-app' },
        { label: 'Deliverable uploaded', value: 'Email + In-app' },
        { label: 'Payment released', value: 'Email' },
      ],
    },
    {
      icon: Globe,
      title: 'Integrations',
      items: [
        { label: 'CRM sync', value: 'Manual (API ready)' },
        { label: 'Kantar brand tracking', value: 'Connected' },
        { label: 'Meltwater EMV', value: 'Connected' },
        { label: 'Payment gateway', value: 'Escrow (internal)' },
      ],
    },
  ];

  return (
    <div data-testid="v3-admin-settings">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">SETTINGS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Settings</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Platform configuration and preferences.</p>

      <div className="space-y-6">
        {settingsSections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="v3-card p-5" data-testid={`settings-${section.title.toLowerCase().replace(/\s/g, '-')}`}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
                <h3 className="text-[13px] font-semibold text-[#1A1A1A]">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between py-1.5 border-b border-[#F4F2EC] last:border-0">
                    <span className="text-[13px] text-[#8A8A8A]">{item.label}</span>
                    <span className="text-[13px] text-[#1A1A1A]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V3AdminSettings;
