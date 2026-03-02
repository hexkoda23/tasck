import React, { useState, useRef } from 'react';
import Avatar from '../../components/shared/Avatar';
import { Video, Plus, Clock, CheckCircle, Play, FileText, Sparkles, Mic, Calendar, Users, X, Upload, File, Trash2 } from 'lucide-react';

const meetings = [
  {
    id: 'MTG-001', title: 'Guinness x Burna Boy — Deal Review', date: '2026-03-02', time: '10:00 AM', duration: '45 min', status: 'transcribed',
    participants: ['Tunde Adeyemi', 'Adenike Okafor', 'James Smith (Guinness)'], recording: true, transcript: true,
    actionItems: [
      { text: 'Send revised contract with updated payment terms to Guinness legal', assignee: 'Tunde Adeyemi', due: '2026-03-04', done: false },
      { text: 'Confirm Burna Boy availability for April 15-20 shoot dates', assignee: 'Adenike Okafor', due: '2026-03-03', done: false },
      { text: 'Prepare creative brief deck for Guinness brand team review', assignee: 'Tunde Adeyemi', due: '2026-03-05', done: false }
    ],
    summary: 'Discussed final terms for the Guinness x Burna Boy "Black Shines Brightest" campaign. Guinness confirmed ₦45M budget with milestone-based payments. Key blocker: need to finalize shoot dates before contract signing.'
  },
  {
    id: 'MTG-002', title: 'MTN x Tems — Counter-Offer Discussion', date: '2026-02-28', time: '2:00 PM', duration: '30 min', status: 'transcribed',
    participants: ['Tunde Adeyemi', 'Folake Johnson (MTN)', 'Leading Vibes Team'], recording: true, transcript: true,
    actionItems: [
      { text: 'Draft counter-proposal at ₦68M (midpoint)', assignee: 'Tunde Adeyemi', due: '2026-03-01', done: true },
      { text: 'Get Tems team sign-off on revised scope', assignee: 'Adenike Okafor', due: '2026-03-02', done: false }
    ],
    summary: 'MTN dropped ambassador deal from ₦75M to ₦62M citing budget cuts. Discussed middle ground at ₦68M with reduced deliverables.'
  },
  {
    id: 'MTG-003', title: 'Weekly Pipeline Standup', date: '2026-02-27', time: '9:00 AM', duration: '25 min', status: 'transcribed',
    participants: ['Tunde Adeyemi', 'Adenike Okafor', 'Chidi Nwosu', 'Bola Adekunle'], recording: true, transcript: true,
    actionItems: [
      { text: 'Follow up on Coca-Cola Coke Studio RFP — deadline March 5', assignee: 'Chidi Nwosu', due: '2026-03-01', done: true },
      { text: 'Schedule Pepsi brand refresh discovery call', assignee: 'Bola Adekunle', due: '2026-02-28', done: true },
      { text: 'Update CRM with UBA Foundation deal status', assignee: 'Adenike Okafor', due: '2026-02-28', done: true }
    ],
    summary: 'Reviewed pipeline: 5 active deals worth ₦240M. Coca-Cola Coke Studio is highest priority. Pepsi moving to discovery.'
  },
  {
    id: 'MTG-004', title: 'Coca-Cola — Coke Studio Africa Kickoff', date: '2026-03-03', time: '11:00 AM', duration: '60 min', status: 'scheduled',
    participants: ['Tunde Adeyemi', 'Sarah Chen (Coca-Cola)', 'Mavin Records Rep', 'DMW Rep'], recording: false, transcript: false, actionItems: [], summary: null
  },
  {
    id: 'MTG-005', title: 'Access Bank — Brand Partnership Review', date: '2026-03-04', time: '3:00 PM', duration: '45 min', status: 'scheduled',
    participants: ['Chidi Nwosu', 'Uche Nnamdi (Access Bank)'], recording: false, transcript: false, actionItems: [], summary: null
  },
  {
    id: 'MTG-006', title: 'Rema x Boomplay — Content Strategy', date: '2026-02-25', time: '1:00 PM', duration: '35 min', status: 'transcribed',
    participants: ['Adenike Okafor', 'Rema Team', 'Boomplay Marketing'], recording: true, transcript: true,
    actionItems: [
      { text: 'Share content calendar with Boomplay team', assignee: 'Adenike Okafor', due: '2026-02-27', done: true },
      { text: 'Finalize exclusive release dates', assignee: 'Rema Team', due: '2026-03-01', done: false }
    ],
    summary: 'Aligned on exclusive content drops for Rema x Boomplay partnership. 3-month rollout plan agreed. First exclusive drops March 15.'
  },
  {
    id: 'MTG-007', title: 'UBA Foundation — CSR Campaign Brief', date: '2026-03-05', time: '10:30 AM', duration: '50 min', status: 'scheduled',
    participants: ['Bola Adekunle', 'UBA CSR Team', 'Davido Foundation Rep'], recording: false, transcript: false, actionItems: [], summary: null
  }
];

export const StaffMeetings = () => {
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [tab, setTab] = useState('all');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = tab === 'all' ? meetings : tab === 'upcoming' ? meetings.filter(m => m.status === 'scheduled') : meetings.filter(m => m.status === 'transcribed');

  const getStatusBadge = (status) => {
    if (status === 'transcribed') return { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', label: 'Transcribed', icon: CheckCircle };
    if (status === 'recording') return { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', label: 'Recording', icon: Mic };
    return { bg: 'bg-[#EEF2FF]', text: 'text-[#4F46E5]', label: 'Scheduled', icon: Calendar };
  };

  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).map(f => ({
      name: f.name, size: (f.size / 1024).toFixed(1) + ' KB', type: f.type, status: 'uploaded', id: Date.now() + Math.random()
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-5 animate-fade-in" data-testid="staff-meetings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Meetings</h1>
          <p className="text-[#94A3B8] text-xs">Record, transcribe, upload transcripts, and convert to action steps</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)} className="btn-secondary flex items-center gap-2 text-xs py-2 px-4" data-testid="upload-transcript-btn">
            <Upload className="w-3.5 h-3.5" /> Upload Transcript
          </button>
          <button onClick={() => setShowNewMeeting(true)} className="btn-primary flex items-center gap-2 text-xs py-2 px-4" data-testid="new-meeting-btn">
            <Plus className="w-3.5 h-3.5" /> New Meeting
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-card"><span className="metric-label block mb-1">This Week</span><div className="big-number">3</div><div className="text-[10px] text-[#94A3B8]">meetings scheduled</div></div>
        <div className="metric-card"><span className="metric-label block mb-1">Recordings</span><div className="big-number">12</div><div className="text-[10px] text-[#94A3B8]">total recordings</div></div>
        <div className="metric-card"><span className="metric-label block mb-1">Transcribed</span><div className="big-number" style={{color:'#22C55E'}}>10</div><div className="text-[10px] text-[#94A3B8]">with AI summaries</div></div>
        <div className="metric-card"><span className="metric-label block mb-1">Action Items</span><div className="big-number">8</div><div className="text-[10px] text-[#94A3B8]">3 pending, 5 done</div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['all', 'upcoming', 'transcribed'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tab === t ? 'bg-[#2F55FF] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'}`}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'all' ? meetings.length : t === 'upcoming' ? meetings.filter(m => m.status === 'scheduled').length : meetings.filter(m => m.status === 'transcribed').length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Meeting List */}
        <div className="lg:col-span-1 space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
          {filtered.map(meeting => {
            const status = getStatusBadge(meeting.status);
            const StatusIcon = status.icon;
            return (
              <div key={meeting.id} onClick={() => setSelectedMeeting(meeting)}
                className={`dashboard-card p-3.5 cursor-pointer transition-all hover:shadow-sm ${selectedMeeting?.id === meeting.id ? 'border-[#2F55FF] shadow-sm' : ''}`}
                data-testid={`meeting-${meeting.id}`}>
                <div className="flex items-start justify-between mb-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${status.bg} ${status.text}`}>
                    <StatusIcon className="w-2.5 h-2.5" /> {status.label}
                  </span>
                  <span className="text-[10px] text-[#CBD5E1]">{meeting.id}</span>
                </div>
                <h3 className="text-[#0F172A] font-medium text-xs mb-1">{meeting.title}</h3>
                <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]">
                  <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {meeting.date}</span>
                  <span>{meeting.time}</span>
                  <span>{meeting.duration}</span>
                </div>
                <div className="flex items-center gap-0.5 mt-2">
                  {meeting.participants.slice(0, 3).map((p, i) => <Avatar key={i} name={p} size="sm" className="-ml-1 first:ml-0 border-2 border-white" />)}
                  {meeting.participants.length > 3 && <span className="text-[10px] text-[#94A3B8] ml-1">+{meeting.participants.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Meeting Detail */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <div className="dashboard-card p-5 space-y-5" data-testid="meeting-detail">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] mb-1">{selectedMeeting.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-[#64748B]">
                    <span>{selectedMeeting.date} at {selectedMeeting.time}</span>
                    <span>{selectedMeeting.duration}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedMeeting.recording && (
                    <button className="flex items-center gap-1.5 text-xs bg-[#FEF2F2] text-[#DC2626] px-3 py-1.5 rounded-lg hover:bg-[#FECACA] transition-colors" data-testid="play-recording-btn">
                      <Play className="w-3.5 h-3.5" /> Play
                    </button>
                  )}
                  <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 text-xs bg-[#EEF2FF] text-[#2F55FF] px-3 py-1.5 rounded-lg hover:bg-[#DBEAFE] transition-colors" data-testid="upload-to-meeting-btn">
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div>
                <h3 className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Participants</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMeeting.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-[#F8FAFC] px-2.5 py-1 rounded-lg">
                      <Avatar name={p} size="sm" />
                      <span className="text-xs text-[#475569]">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploaded Transcripts */}
              {uploadedFiles.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider mb-2">Uploaded Transcripts</h3>
                  <div className="space-y-1.5">
                    {uploadedFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-3 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9]">
                        <File className="w-4 h-4 text-[#2F55FF]" />
                        <div className="flex-1">
                          <p className="text-xs text-[#0F172A]">{f.name}</p>
                          <p className="text-[10px] text-[#94A3B8]">{f.size}</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">Processing</span>
                        <button onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))} className="text-[#CBD5E1] hover:text-[#EF4444]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {selectedMeeting.summary && (
                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#F1F5F9]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
                    <h3 className="text-xs font-semibold text-[#0F172A]">AI Summary</h3>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">{selectedMeeting.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {selectedMeeting.transcript && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider">Transcript</h3>
                    <button className="text-[#2F55FF] text-[10px] hover:underline">View Full</button>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl p-3.5 space-y-2.5 border border-[#F1F5F9] max-h-40 overflow-y-auto">
                    {[
                      { time: '0:00', speaker: selectedMeeting.participants[0]?.split(' ')[0], color: '#2F55FF', text: 'Good morning everyone. Let\'s review where we are on this deal and what we need to close...' },
                      { time: '2:15', speaker: selectedMeeting.participants[1]?.split(' ')[0] || 'Participant', color: '#22C55E', text: 'The budget is confirmed. We need to finalize the timeline and get contracts out this week...' },
                      { time: '5:30', speaker: selectedMeeting.participants[2]?.split(' ')[0] || 'Participant', color: '#D97706', text: 'We\'re aligned on creative direction. My team will prepare the brief by end of week...' },
                      { time: '8:45', speaker: selectedMeeting.participants[0]?.split(' ')[0], color: '#2F55FF', text: 'Great. Let me summarize the action items. First, contract revision by Thursday...' }
                    ].map((line, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="text-[9px] text-[#94A3B8] w-10 flex-shrink-0 pt-0.5">{line.time}</span>
                        <div><span className="text-[10px] font-semibold" style={{color: line.color}}>{line.speaker}:</span> <span className="text-xs text-[#475569]">{line.text}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {selectedMeeting.actionItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#2F55FF]" />
                    <h3 className="text-xs font-semibold text-[#0F172A]">AI-Generated Action Items</h3>
                  </div>
                  <div className="space-y-1.5">
                    {selectedMeeting.actionItems.map((item, i) => (
                      <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${item.done ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-white border-[#E2E8F0]'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${item.done ? 'border-[#22C55E] bg-[#22C55E]' : 'border-[#CBD5E1]'}`}>
                          {item.done && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs ${item.done ? 'text-[#64748B] line-through' : 'text-[#0F172A]'}`}>{item.text}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#94A3B8]">
                            <span>{item.assignee}</span><span>Due: {item.due}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMeeting.status === 'scheduled' && (
                <div className="bg-[#EEF2FF] rounded-xl p-5 text-center">
                  <Video className="w-7 h-7 text-[#2F55FF] mx-auto mb-2" />
                  <h3 className="text-[#0F172A] font-semibold text-sm mb-1">Meeting Scheduled</h3>
                  <p className="text-xs text-[#64748B] mb-3">Recording and transcription will start automatically.</p>
                  <div className="flex justify-center gap-2">
                    <button className="btn-primary text-xs py-2 px-4">Start Meeting Now</button>
                    <button onClick={() => setShowUpload(true)} className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload Transcript
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-card p-10 text-center">
              <Video className="w-10 h-10 text-[#E2E8F0] mx-auto mb-3" />
              <h3 className="text-[#64748B] font-medium text-sm mb-1">Select a meeting</h3>
              <p className="text-xs text-[#94A3B8]">View recording, transcript, and AI-generated action items.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Transcript Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()} data-testid="upload-transcript-modal">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-[#0F172A]">Upload Meeting Transcript</h2>
              <button onClick={() => setShowUpload(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X className="w-4 h-4" /></button>
            </div>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-[#2F55FF] bg-[#EEF2FF]' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="transcript-dropzone"
            >
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-[#2F55FF]' : 'text-[#CBD5E1]'}`} />
              <p className="text-xs font-medium text-[#0F172A] mb-1">Drag and drop files here</p>
              <p className="text-[10px] text-[#94A3B8]">Supports .txt, .doc, .docx, .pdf, .srt, .vtt</p>
              <button className="mt-3 text-xs text-[#2F55FF] hover:underline">or browse files</button>
              <input ref={fileInputRef} type="file" multiple accept=".txt,.doc,.docx,.pdf,.srt,.vtt" className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
            </div>

            {/* Uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider">Uploaded Files</h3>
                {uploadedFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9]">
                    <File className="w-4 h-4 text-[#2F55FF]" />
                    <div className="flex-1">
                      <p className="text-xs text-[#0F172A]">{f.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">{f.size}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">Ready</span>
                    <button onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))} className="text-[#CBD5E1] hover:text-[#EF4444]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9] mt-4">
              <Sparkles className="w-4 h-4 text-[#22C55E]" />
              <div>
                <p className="text-xs text-[#0F172A] font-medium">AI will process uploaded transcripts</p>
                <p className="text-[10px] text-[#94A3B8]">Generates summary, key topics, and action items automatically</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#F1F5F9]">
              <button onClick={() => setShowUpload(false)} className="btn-secondary text-xs py-2 px-4">Cancel</button>
              <button onClick={() => setShowUpload(false)} className="btn-primary text-xs py-2 px-4">Process Transcripts</button>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNewMeeting(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()} data-testid="new-meeting-modal">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-[#0F172A]">Schedule New Meeting</h2>
              <button onClick={() => setShowNewMeeting(false)} className="text-[#94A3B8] hover:text-[#64748B]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3.5">
              <div><label className="text-xs font-medium text-[#475569] block mb-1">Meeting Title</label><input type="text" placeholder="e.g., Guinness Deal Review" className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-[#475569] block mb-1">Date</label><input type="date" className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" /></div>
                <div><label className="text-xs font-medium text-[#475569] block mb-1">Time</label><input type="time" className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" /></div>
              </div>
              <div><label className="text-xs font-medium text-[#475569] block mb-1">Participants</label><input type="text" placeholder="Type to add participants..." className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF]" />
                <div className="flex flex-wrap gap-1.5 mt-1.5">{['Tunde Adeyemi', 'Adenike Okafor'].map(p => <span key={p} className="bg-[#F1F5F9] text-[#475569] text-[10px] px-2 py-0.5 rounded-full">{p}</span>)}</div>
              </div>
              <div><label className="text-xs font-medium text-[#475569] block mb-1">Agenda</label><textarea rows={2} placeholder="What will be discussed?" className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F55FF]/20 focus:border-[#2F55FF] resize-none" /></div>
              <div className="flex items-center gap-3 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
                <Mic className="w-4 h-4 text-[#2F55FF]" />
                <div><p className="text-xs text-[#0F172A] font-medium">Auto-record & transcribe</p><p className="text-[10px] text-[#94A3B8]">AI will generate transcript and action items</p></div>
                <div className="ml-auto w-9 h-5 bg-[#2F55FF] rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#F1F5F9]">
              <button onClick={() => setShowNewMeeting(false)} className="btn-secondary text-xs py-2 px-4">Cancel</button>
              <button onClick={() => setShowNewMeeting(false)} className="btn-primary text-xs py-2 px-4">Schedule Meeting</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMeetings;
