import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Projects, getBrand, getCreator, v3FinalReports } from '../../../lib/v3data';
import { ChevronLeft, Star, Send, CheckCircle, Lock } from 'lucide-react';

const V3AdminFeedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formType, setFormType] = useState('brand');

  const project = v3Projects.find(p => p.id === id);
  const brand = project ? getBrand(project.brandId) : null;
  const creator = project ? getCreator(project.creatorId) : null;
  const finalReport = project ? v3FinalReports[id] : null;
  const feedbackUnlocked = Boolean(finalReport);
  const isMTN = id === 'proj-mtn-burna';

  if (!project) return <div className="p-8 text-[#8A8A8A]">Project not found.</div>;

  const templateQuestions = [
    { label: 'The campaign objectives were clearly understood by TASCK', score: 10 },
    { label: 'The approved deliverables were completed to the expected quality', score: 9 },
    { label: 'The creator or creative team was a strong fit for the brand', score: 10 },
    { label: 'Communication and updates from TASCK were timely', score: 9 },
    { label: 'Budget, fees, and approvals were transparent', score: 8 },
    { label: 'The final report gave the brand useful performance insight', score: 10 },
  ];
  const demoTotalScore = templateQuestions.reduce((total, item) => total + item.score, 0);
  const demoAverageScore = (demoTotalScore / templateQuestions.length).toFixed(1);

  const brandFeedback = feedbackUnlocked && isMTN ? {
    submitted: true,
    submittedAt: '28 Nov 2025',
    submittedBy: 'Kemi Adebayo',
    overall: 9.8,
    ratings: [
      { label: 'Campaign quality', score: 10 },
      { label: 'Creator performance', score: 9.6 },
      { label: 'Communication', score: 9.8 },
      { label: 'Timeline adherence', score: 10 },
      { label: 'Value for money', score: 9.4 },
    ],
    highlights: 'The Wande Coal moment was genius — our team didn\'t expect that level of cultural impact. Burna Boy\'s professionalism exceeded every benchmark we had from previous agency relationships.',
    improvements: 'Would have liked more frequent written updates during the production week. Daily verbal check-ins were good, but having a written log would have helped our internal reporting.',
    wouldRepeat: 'Absolutely. Already discussing Q2 2026 possibilities.',
  } : null;

  return (
    <div data-testid="v3-admin-feedback">
      <button onClick={() => navigate(`/v3/admin/projects/${id}`)} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to project
      </button>

      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">FEEDBACK</p>
      <h1 className="v3-heading text-xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{brand?.company?.split(' ')[0]} — {project.title}</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">Final feedback is collected after the final report has been generated.</p>

      {/* Toggle */}
      <div className="flex gap-1 mb-6">
        <button onClick={() => setFormType('brand')}
          className={`px-4 py-2 text-[12px] rounded-lg transition-colors ${formType === 'brand' ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'}`}>
          Brand Feedback
        </button>
        <button onClick={() => setFormType('creator')}
          className={`px-4 py-2 text-[12px] rounded-lg transition-colors ${formType === 'creator' ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'}`}>
          Creator Feedback
        </button>
      </div>

      {!feedbackUnlocked && (
        <div className="v3-card p-6 flex items-start gap-4" data-testid="feedback-locked">
          <Lock className="w-5 h-5 text-[#C49B5F] mt-0.5" />
          <div>
            <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">Feedback locked until final report</h3>
            <p className="text-[12px] text-[#8A8A8A] leading-relaxed">
              Generate and review the Final Campaign Report first. Once the report exists, TASCK sends the Google Form-style feedback checklist to the brand and creator for closure scoring.
            </p>
          </div>
        </div>
      )}

      {feedbackUnlocked && formType === 'brand' && brandFeedback?.submitted && (
        <div className="space-y-5">
          {/* Overall score */}
          <div className="v3-card p-5 flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{brandFeedback.overall}</p>
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1">Overall</p>
              <div className="flex gap-0.5 mt-2 justify-center">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4" fill={i <= Math.round(brandFeedback.overall / 2) ? '#C49B5F' : 'none'} stroke="#C49B5F" strokeWidth={1.5} />)}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-3">
              {brandFeedback.ratings.map((r, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-[#FAFAF7]">
                  <p className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.score}</p>
                  <p className="text-[9px] text-[#8A8A8A] mt-0.5">{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Written feedback */}
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Highlights</h3>
            <p className="text-[13px] text-[#5C5C5C] leading-relaxed italic">"{brandFeedback.highlights}"</p>
          </div>
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Areas for Improvement</h3>
            <p className="text-[13px] text-[#5C5C5C] leading-relaxed italic">"{brandFeedback.improvements}"</p>
          </div>
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Would Repeat?</h3>
            <p className="text-[13px] text-[#1F4A3A] font-medium">"{brandFeedback.wouldRepeat}"</p>
          </div>
          <p className="text-[10px] text-[#8A8A8A]">Submitted by {brandFeedback.submittedBy} on {brandFeedback.submittedAt}</p>
        </div>
      )}

      {feedbackUnlocked && formType === 'brand' && !brandFeedback?.submitted && (
        <div className="v3-card p-6 space-y-5" data-testid="brand-feedback-google-form">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">Brand Feedback Form</h3>
              <p className="text-[12px] text-[#8A8A8A]">Google Form-style checklist based on the TASCK feedback template. Scores are calculated from checked brand responses.</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{demoAverageScore}</p>
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Average score</p>
            </div>
          </div>
          <div className="space-y-3">
            {templateQuestions.map(question => (
              <label key={question.label} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7]">
                <span className="flex items-center gap-2 text-[12px] text-[#1A1A1A]">
                  <input type="checkbox" defaultChecked className="accent-[#1F4A3A]" />
                  {question.label}
                </span>
                <span className="text-[12px] text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{question.score}/10</span>
              </label>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-[#DDE7E2] border border-[#C5D6CE]">
            <p className="text-[12px] text-[#1F4A3A]"><CheckCircle className="inline w-3.5 h-3.5 mr-1" /> Demo Google Form link ready: forms.google.com/tasck/{project.id}/brand-feedback</p>
            <p className="text-[11px] text-[#6E6657] mt-1">Total score: {demoTotalScore}/{templateQuestions.length * 10}. Feedback is stored against the final report and closure score.</p>
          </div>
          <button className="v3-btn-primary"><Send className="w-3.5 h-3.5" /> Send Feedback Form to {brand?.primaryContact}</button>
        </div>
      )}

      {feedbackUnlocked && formType === 'creator' && (
        <div className="v3-card p-6 space-y-5">
          <p className="text-[13px] text-[#8A8A8A]">{creator ? `${creator.name}'s feedback form has been sent but not yet submitted.` : 'No creator assigned.'}</p>
          {creator && (
            <div className="p-3 rounded-lg bg-[#C49B5F12] border border-[#C49B5F30]">
              <p className="text-[12px] text-[#C49B5F]">Form sent 28 Nov 2025 — awaiting response</p>
            </div>
          )}
          <button className="v3-btn-secondary"><Send className="w-3.5 h-3.5" /> Resend Feedback Form</button>
        </div>
      )}
    </div>
  );
};

export default V3AdminFeedback;
