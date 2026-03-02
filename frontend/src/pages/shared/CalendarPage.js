import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Video } from 'lucide-react';
import Avatar from '../../components/shared/Avatar';

const events = [
  { id: 1, title: 'Guinness Contract Review', time: '09:00 AM', duration: '1 hour', type: 'meeting', attendees: ['Adenike Ogunlesi', 'Legal Team'], location: 'Google Meet' },
  { id: 2, title: 'MTN Counter-Offer Discussion', time: '11:00 AM', duration: '30 min', type: 'call', attendees: ['Adia Sowho'], location: 'Phone Call' },
  { id: 3, title: 'Coca-Cola Project Kickoff', time: '02:00 PM', duration: '2 hours', type: 'meeting', attendees: ['Amina Bashir', 'Creative Team'], location: 'TASCK Office' },
  { id: 4, title: 'Mavin Concert Planning', time: '04:00 PM', duration: '1 hour', type: 'internal', attendees: ['Mavin Records Team'], location: 'Zoom' },
];

const upcomingEvents = [
  { id: 5, date: 'Mar 3', title: 'Burna Boy Team Sync', time: '10:00 AM', type: 'meeting' },
  { id: 6, date: 'Mar 4', title: 'UBA Foundation Contract Signing', time: '02:00 PM', type: 'signing' },
  { id: 7, date: 'Mar 5', title: 'Pepsi Campaign Review', time: '11:00 AM', type: 'review' },
  { id: 8, date: 'Mar 8', title: 'Star Lager Pitch Meeting', time: '03:00 PM', type: 'pitch' },
  { id: 9, date: 'Mar 10', title: 'Coke Studio Artist Selection', time: '10:00 AM', type: 'meeting' },
];

const getEventColor = (type) => {
  const colors = {
    meeting: 'bg-[#EEF2FF] border-[#2F55FF] text-[#2F55FF]',
    call: 'bg-[#22C55E]/20 border-[#22C55E] text-[#22C55E]',
    internal: 'bg-[#FFFBEB] border-[#D97706] text-[#D97706]',
    signing: 'bg-[#F5F3FF] border-[#7C5CFC] text-[#7C3AED]',
    review: 'bg-[#F1F5F9] border-white/30 text-[#64748B]',
    pitch: 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
  };
  return colors[type] || colors.meeting;
};

export const CalendarPage = () => {
  const [currentDate] = useState(new Date(2026, 2, 2)); // March 2, 2026
  
  const daysInMonth = 31;
  const firstDayOfWeek = 0; // March 2026 starts on Sunday
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="calendar-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Calendar</h1>
          <p className="text-[#64748B] text-sm">Manage your schedule and meetings</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 dashboard-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#0F172A]">March 2026</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[#94A3B8] text-sm py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map(i => <div key={`empty-${i}`} className="p-2"></div>)}
            {days.map(day => {
              const isToday = day === 2;
              const hasEvents = [2, 3, 4, 5, 8, 10, 15, 20].includes(day);
              return (
                <div 
                  key={day}
                  className={`p-2 text-center rounded-lg cursor-pointer transition-colors ${
                    isToday 
                      ? 'bg-[#2F55FF] text-white' 
                      : 'text-[#334155] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span className="text-sm">{day}</span>
                  {hasEvents && !isToday && (
                    <div className="flex justify-center gap-0.5 mt-1">
                      <span className="w-1 h-1 rounded-full bg-[#2F55FF]"></span>
                      {day % 3 === 0 && <span className="w-1 h-1 rounded-full bg-[#22C55E]"></span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg">
                <div className="text-center min-w-[50px]">
                  <p className="text-[#2F55FF] text-xs font-semibold">{event.date}</p>
                  <p className="text-[#94A3B8] text-xs">{event.time.split(' ')[0]}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-[#475569] text-sm font-medium">{event.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getEventColor(event.type)}`}>
                    {event.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="dashboard-card p-5">
        <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Today's Schedule — March 2, 2026</h2>
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className={`flex items-start gap-4 p-4 rounded-lg border-l-4 bg-[#F8FAFC] ${getEventColor(event.type).split(' ')[1]}`}>
              <div className="min-w-[80px]">
                <p className="text-[#0F172A] font-medium">{event.time}</p>
                <p className="text-[#94A3B8] text-xs">{event.duration}</p>
              </div>
              <div className="flex-1">
                <h3 className="text-[#0F172A] font-medium">{event.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-[#64748B]">
                  <span className="flex items-center gap-1">
                    {event.location.includes('Meet') || event.location.includes('Zoom') ? (
                      <Video className="w-4 h-4" />
                    ) : event.location.includes('Phone') ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.attendees.length} attendees
                  </span>
                </div>
                <div className="flex -space-x-2 mt-2">
                  {event.attendees.map((attendee, i) => (
                    <Avatar key={i} name={attendee} size="sm" className="border-2 border-[#0A1A30]" />
                  ))}
                </div>
              </div>
              <button className="btn-ghost text-sm">Join</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
