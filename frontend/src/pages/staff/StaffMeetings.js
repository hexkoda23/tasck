import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { Video, Plus, Search, Clock, CheckCircle, Play, FileText, Sparkles, ChevronRight, Mic, Calendar, Users, X } from 'lucide-react';

const meetings = [
  {
    id: 'MTG-001',
    title: 'Guinness x Burna Boy — Deal Review',
    date: '2026-03-02',
    time: '10:00 AM',
    duration: '45 min',
    status: 'transcribed',
    participants: ['Tunde Adeyemi', 'Adenike Okafor', 'James Smith (Guinness)'],
    recording: true,
    transcript: true,
    actionItems: [
      { text: 'Send revised contract with updated payment terms to Guinness legal', assignee: 'Tunde Adeyemi', due: '2026-03-04', done: false },
      { text: 'Confirm Burna Boy availability for April 15-20 shoot dates', assignee: 'Adenike Okafor', due: '2026-03-03', done: false },
      { text: 'Prepare creative brief deck for Guinness brand team review', assignee: 'Tunde Adeyemi', due: '2026-03-05', done: false }
    ],
    summary: 'Discussed final terms for the Guinness x Burna Boy "Black Shines Brightest" campaign. Guinness confirmed ₦45M budget with milestone-based payments. Key blocker: need to finalize shoot dates before contract signing. Brand team wants creative brief by Friday.'
  },
  {
    id: 'MTG-002',
    title: 'MTN x Tems — Counter-Offer Discussion',
    date: '2026-02-28',
    time: '2:00 PM',
    duration: '30 min',
    status: 'transcribed',
    participants: ['Tunde Adeyemi', 'Folake Johnson (MTN)', 'Leading Vibes Team'],
    recording: true,
    transcript: true,
    actionItems: [
      { text: 'Draft counter-proposal at ₦68M (midpoint)', assignee: 'Tunde Adeyemi', due: '2026-03-01', done: true },
      { text: 'Get Tems team sign-off on revised scope', assignee: 'Adenike Okafor', due: '2026-03-02', done: false }
    ],
    summary: 'MTN dropped ambassador deal from ₦75M to ₦62M citing budget cuts. Discussed middle ground at ₦68M with reduced deliverables. Tems team open to negotiation but needs scope clarity.'
  },
  {
    id: 'MTG-003',
    title: 'Weekly Pipeline Standup',
    date: '2026-02-27',
    time: '9:00 AM',
    duration: '25 min',
    status: 'transcribed',
    participants: ['Tunde Adeyemi', 'Adenike Okafor', 'Chidi Nwosu', 'Bola Adekunle'],
    recording: true,
    transcript: true,
    actionItems: [
      { text: 'Follow up on Coca-Cola Coke Studio RFP — deadline March 5', assignee: 'Chidi Nwosu', due: '2026-03-01', done: true },
      { text: 'Schedule Pepsi brand refresh discovery call', assignee: 'Bola Adekunle', due: '2026-02-28', done: true },
      { text: 'Update CRM with UBA Foundation deal status', assignee: 'Adenike Okafor', due: '2026-02-28', done: true }
    ],
    summary: 'Reviewed pipeline: 5 active deals worth ₦240M. Coca-Cola Coke Studio is highest priority. Pepsi moving to discovery. UBA Foundation deal expected to close this week.'
  },
  {
    id: 'MTG-004',
    title: 'Coca-Cola — Coke Studio Africa Kickoff',
    date: '2026-03-03',
    time: '11:00 AM',
    duration: '60 min',
    status: 'scheduled',
    participants: ['Tunde Adeyemi', 'Sarah Chen (Coca-Cola)', 'Mavin Records Rep', 'DMW Rep'],
    recording: false,
    transcript: false,
    actionItems: [],
    summary: null
  },
  {
    id: 'MTG-005',
    title: 'Access Bank — Brand Partnership Review',
    date: '2026-03-04',
    time: '3:00 PM',
    duration: '45 min',
    status: 'scheduled',
    participants: ['Chidi Nwosu', 'Uche Nnamdi (Access Bank)'],
    recording: false,
    transcript: false,
    actionItems: [],
    summary: null
  }
];

export const StaffMeetings = () => {
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [tab, setTab] = useState('all');

  const filtered = tab === 'all' ? meetings : tab === 'upcoming' ? meetings.filter(m => m.status === 'scheduled') : meetings.filter(m => m.status === 'transcribed');

  const getStatusBadge = (status) => {
    if (status === 'transcribed') return { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', label: 'Transcribed', icon: CheckCircle };
    if (status === 'recording') return { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', label: 'Recording', icon: Mic };
    return { bg: 'bg-[#EEF2FF]', text: 'text-[#4F46E5]', label: 'Scheduled', icon: Calendar };
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-meetings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Meetings</h1>
          <p className="text-[#94A3B8] text-sm">Record, transcribe, and convert meetings to action steps</p>
        </div>
        <button onClick={() => setShowNewMeeting(true)} className="btn-primary flex items-center gap-2 text-sm" data-testid="new-meeting-btn">
          <Plus className="w-4 h-4" /> New Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card">
          <span className="metric-label block mb-2">This Week</span>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">3</div>
          <div className="text-xs text-[#94A3B8]">meetings scheduled</div>
        </div>
        <div className="metric-card">
          <span className="metric-label block mb-2">Recordings</span>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">12</div>
          <div className="text-xs text-[#94A3B8]">total recordings</div>
        </div>
        <div className="metric-card">
          <span className="metric-label block mb-2">Transcribed</span>
          <div className="text-2xl font-bold text-[#22C55E] font-mono">10</div>
          <div className="text-xs text-[#94A3B8]">with AI summaries</div>
        </div>
        <div className="metric-card">
          <span className="metric-label block mb-2">Action Items</span>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">8</div>
          <div className="text-xs text-[#94A3B8]">3 pending, 5 done</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['all', 'upcoming', 'transcribed'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === t ? 'bg-[#2F55FF] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'}`}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'all' ? meetings.length : t === 'upcoming' ? meetings.filter(m => m.status === 'scheduled').length : meetings.filter(m => m.status === 'transcribed').length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meeting List */}
        <div className="lg:col-span-1 space-y-3">
          {filtered.map(meeting => {
            const status = getStatusBadge(meeting.status);
            const StatusIcon = status.icon;
            return (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className={`dashboard-card p-4 cursor-pointer transition-all ${selectedMeeting?.id === meeting.id ? 'border-[#2F55FF] shadow-sm' : ''}`}
                data-testid={`meeting-${meeting.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${status.bg} ${status.text}`}>
                    <StatusIcon className="w-3 h-3" /> {status.label}
                  </span>
                  <span className="text-[11px] text-[#CBD5E1]">{meeting.id}</span>
                </div>
                <h3 className="text-[#0F172A] font-medium text-sm mb-1">{meeting.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {meeting.date}</span>
                  <span>{meeting.time}</span>
                  <span>{meeting.duration}</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {meeting.participants.slice(0, 3).map((p, i) => <Avatar key={i} name={p} size="sm" className="-ml-1 first:ml-0 border-2 border-white" />)}
                  {meeting.participants.length > 3 && <span className="text-[11px] text-[#94A3B8] ml-1">+{meeting.participants.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Meeting Detail */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <div className="dashboard-card p-6 space-y-6" data-testid="meeting-detail">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A] mb-1">{selectedMeeting.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-[#64748B]">
                    <span>{selectedMeeting.date} at {selectedMeeting.time}</span>
                    <span>{selectedMeeting.duration}</span>
                  </div>
                </div>
                {selectedMeeting.recording && (
                  <button className="flex items-center gap-2 text-sm bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg">
                    <Play className="w-4 h-4" /> Play Recording
                  </button>
                )}
              </div>

              {/* Participants */}
              <div>
                <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider mb-3">Participants</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-lg">
                      <Avatar name={p} size="sm" />
                      <span className="text-sm text-[#475569]">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Summary */}
              {selectedMeeting.summary && (
                <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#F1F5F9]">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[#22C55E]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">AI Summary</h3>
                  </div>
                  <p className="text-sm text-[#475569] leading-relaxed">{selectedMeeting.summary}</p>
                </div>
              )}

              {/* Transcript excerpt */}
              {selectedMeeting.transcript && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Transcript</h3>
                    <button className="text-[#2F55FF] text-xs hover:underline">View Full</button>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-3 border border-[#F1F5F9] max-h-48 overflow-y-auto">
                    <div className="flex gap-3">
                      <span className="text-[10px] text-[#94A3B8] w-12 flex-shrink-0 pt-0.5">0:00</span>
                      <div><span className="text-xs font-semibold text-[#2F55FF]">{selectedMeeting.participants[0].split(' ')[0]}:</span> <span className="text-sm text-[#475569]">Good morning everyone. Let's review where we are on this deal and what we need to close...</span></div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[10px] text-[#94A3B8] w-12 flex-shrink-0 pt-0.5">2:15</span>
                      <div><span className="text-xs font-semibold text-[#22C55E]">{selectedMeeting.participants[1]?.split(' ')[0] || 'Participant'}:</span> <span className="text-sm text-[#475569]">The budget is confirmed. We need to finalize the timeline and get the contracts out this week...</span></div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[10px] text-[#94A3B8] w-12 flex-shrink-0 pt-0.5">5:30</span>
                      <div><span className="text-xs font-semibold text-[#D97706]">{selectedMeeting.participants[2]?.split(' ')[0] || 'Participant'}:</span> <span className="text-sm text-[#475569]">We're aligned on the creative direction. My team will prepare the brief by end of week...</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Items */}
              {selectedMeeting.actionItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[#2F55FF]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">AI-Generated Action Items</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedMeeting.actionItems.map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${item.done ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-white border-[#E2E8F0]'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${item.done ? 'border-[#22C55E] bg-[#22C55E]' : 'border-[#CBD5E1]'}`}>
                          {item.done && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${item.done ? 'text-[#64748B] line-through' : 'text-[#0F172A]'}`}>{item.text}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#94A3B8]">
                            <span>{item.assignee}</span>
                            <span>Due: {item.due}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMeeting.status === 'scheduled' && (
                <div className="bg-[#EEF2FF] rounded-xl p-5 text-center">
                  <Video className="w-8 h-8 text-[#2F55FF] mx-auto mb-3" />
                  <h3 className="text-[#0F172A] font-semibold mb-1">Meeting Scheduled</h3>
                  <p className="text-sm text-[#64748B] mb-4">Recording and transcription will start automatically when the meeting begins.</p>
                  <button className="btn-primary text-sm">Start Meeting Now</button>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-card p-12 text-center">
              <Video className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
              <h3 className="text-[#64748B] font-medium mb-1">Select a meeting</h3>
              <p className="text-sm text-[#94A3B8]">Choose a meeting to view recording, transcript, and AI-generated action items.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNewMeeting(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()} data-testid="new-meeting-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0F172A]">Schedule New Meeting</h2>
              <button onClick={() => setShowNewMeeting(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#475569] block mb-1.5">Meeting Title</label>
                <input type="text" placeholder="e.g., Guinness Deal Review" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#475569] block mb-1.5">Date</label>
                  <input type="date" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#475569] block mb-1.5">Time</label>
                  <input type="time" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#475569] block mb-1.5">Participants</label>
                <input type="text" placeholder="Type to add participants..." className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-[#F1F5F9] text-[#475569] text-xs px-2 py-1 rounded-full">Tunde Adeyemi</span>
                  <span className="bg-[#F1F5F9] text-[#475569] text-xs px-2 py-1 rounded-full">Adenike Okafor</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#475569] block mb-1.5">Agenda</label>
                <textarea rows={3} placeholder="What will be discussed?" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF] resize-none" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
                <Mic className="w-5 h-5 text-[#2F55FF]" />
                <div>
                  <p className="text-sm text-[#0F172A] font-medium">Auto-record & transcribe</p>
                  <p className="text-[11px] text-[#94A3B8]">AI will generate transcript and action items after meeting</p>
                </div>
                <div className="ml-auto w-10 h-6 bg-[#2F55FF] rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#F1F5F9]">
              <button onClick={() => setShowNewMeeting(false)} className="btn-secondary text-sm py-2 px-5">Cancel</button>
              <button className="btn-primary text-sm py-2 px-5">Schedule Meeting</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMeetings;
