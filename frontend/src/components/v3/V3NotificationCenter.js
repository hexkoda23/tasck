import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, AlertTriangle, Clock, CheckCircle, MessageSquare, FileText, Users } from 'lucide-react';

const notifications = [
  { id: 'n1', type: 'escalation', icon: AlertTriangle, color: '#B54A37', title: 'Dangote — no response in 18 days', desc: 'Anthony Chiejina hasn\'t replied since initial contact. Recommend escalation or re-engagement.', time: '2 hours ago', action: '/v3/admin/crm/brand-dangote', read: false },
  { id: 'n2', type: 'overdue', icon: Clock, color: '#C49B5F', title: 'Coca-Cola budget ceiling unconfirmed', desc: 'Chidi Okafor hasn\'t confirmed budget ceiling (₦100–150M range). 3 days overdue.', time: '5 hours ago', action: '/v3/admin/projects/proj-cocacola-tems', read: false },
  { id: 'n3', type: 'approval', icon: FileText, color: '#1F4A3A', title: 'Guinness Creative Snapshot ready for review', desc: 'Adaeze Obi completed internal review of v1. Ready to share with Tunde Adeola.', time: '1 day ago', action: '/v3/admin/projects/proj-guinness-rema', read: false },
  { id: 'n4', type: 'feedback', icon: MessageSquare, color: '#567B3F', title: 'MTN brand feedback received', desc: 'Kemi Adebayo submitted feedback for Lagos Unlimited. Overall: 9.8/10.', time: '1 day ago', action: '/v3/admin/projects/proj-mtn-burna/feedback', read: true },
  { id: 'n5', type: 'milestone', icon: CheckCircle, color: '#1F4A3A', title: 'Star Lager — PH show deliverable uploaded', desc: 'Ayra Starr\'s team uploaded Port Harcourt show deliverable. Pending RM review.', time: '2 days ago', action: '/v3/admin/projects/proj-star-ayra', read: true },
  { id: 'n6', type: 'creator', icon: Users, color: '#9B9380', title: 'Rema brief response received', desc: 'Rema confirmed interest in Made of More: Africa. Fee expectation: ₦88M.', time: '3 days ago', action: '/v3/admin/projects/proj-guinness-rema', read: true },
  { id: 'n7', type: 'escalation', icon: AlertTriangle, color: '#C49B5F', title: 'GTBank follow-up overdue', desc: 'Segun Ogunsanya — follow-up email drafted 6 days ago, not yet sent.', time: '3 days ago', action: '/v3/admin/crm/brand-gtbank', read: true },
  { id: 'n8', type: 'reminder', icon: Clock, color: '#9B9380', title: 'Dangote discovery call — Mar 20', desc: 'Reminder: Discovery call with Anthony Chiejina scheduled tomorrow at 2pm.', time: '4 days ago', action: '/v3/admin/projects/proj-dangote-wizkid', read: true },
];

const V3NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" data-testid="v3-notification-center">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-[#F4F2EC] transition-colors" data-testid="notification-bell">
        <Bell className="w-4.5 h-4.5 text-[#5C5C5C]" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#B54A37] text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-96 bg-white border border-[#E8E4DB] rounded-xl shadow-lg z-50 overflow-hidden" data-testid="notification-panel">
            <div className="p-3 border-b border-[#E8E4DB] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#1A1A1A]">Notifications</span>
              <span className="text-[10px] text-[#8A8A8A]">{unreadCount} unread</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <button key={n.id} onClick={() => { navigate(n.action); setOpen(false); }}
                    className={`w-full text-left p-3 flex gap-3 hover:bg-[#FAFAF7] transition-colors border-b border-[#F4F2EC] last:border-0 ${!n.read ? 'bg-[#1F4A3A05]' : ''}`}
                    data-testid={`notif-${n.id}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${n.color}12` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: n.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[12px] ${!n.read ? 'font-medium text-[#1A1A1A]' : 'text-[#5C5C5C]'} truncate`}>{n.title}</p>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#1F4A3A] flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-[#8A8A8A] mt-0.5 line-clamp-2">{n.desc}</p>
                      <p className="text-[9px] text-[#D4CDBF] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{n.time}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default V3NotificationCenter;
