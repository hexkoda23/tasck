import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Send, CheckCircle, Lock, Loader2 } from 'lucide-react';
import { v3GetBusinessCase, v3ListFinalReports, v3SubmitBrandFeedback, v3SubmitCreatorFeedback } from '../../../lib/v3api';

const templateQuestions = [
  { label: 'The campaign objectives were clearly understood by TASCK' },
  { label: 'The approved deliverables were completed to the expected quality' },
  { label: 'The creator or creative team was a strong fit for the brand' },
  { label: 'Communication and updates from TASCK were timely' },
  { label: 'Budget, fees, and approvals were transparent' },
  { label: 'The final report gave the brand useful performance insight' },
];

const ScoreInput = ({ score, onChange }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className={`w-7 h-7 rounded text-[10px] font-medium transition-colors ${
          n <= score ? 'bg-[#1F4A3A] text-white' : 'bg-[#F4F2EC] text-[#8A8A8A] hover:bg-[#E8E4DB]'
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);

const V3AdminFeedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formType, setFormType] = useState('brand');
  const [bc, setBc] = useState(null);
  const [finalReports, setFinalReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Brand feedback form state
  const [brandScores, setBrandScores] = useState(templateQuestions.map(() => 0));
  const [brandHighlights, setBrandHighlights] = useState('');
  const [brandImprovements, setBrandImprovements] = useState('');
  const [brandWouldRepeat, setBrandWouldRepeat] = useState('');
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const [brandSubmitted, setBrandSubmitted] = useState(false);

  // Creator feedback form state
  const [creatorScores, setCreatorScores] = useState(templateQuestions.map(() => 0));
  const [creatorHighlights, setCreatorHighlights] = useState('');
  const [creatorSubmitting, setCreatorSubmitting] = useState(false);
  const [creatorSubmitted, setCreatorSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      v3GetBusinessCase(id).catch(() => null),
      v3ListFinalReports(id).catch(() => []),
    ]).then(([bcData, reportData]) => {
      setBc(bcData);
      setFinalReports(Array.isArray(reportData) ? reportData : []);
      // Populate submitted feedback if already present
      if (bcData?.brand_feedback) {
        setBrandSubmitted(true);
      }
      if (bcData?.creator_feedback) {
        setCreatorSubmitted(true);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]" data-testid="v3-admin-feedback">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading…</span>
      </div>
    );
  }

  if (!bc) {
    return (
      <div className="p-8 text-[#8A8A8A]" data-testid="v3-admin-feedback">
        <p>Business case not found.</p>
        <button onClick={() => navigate('/v3/admin/business-cases')} className="v3-btn-secondary mt-4 text-[11px]">
          Back to Business Cases
        </button>
      </div>
    );
  }

  const feedbackUnlocked = finalReports.length > 0;
  const brandName = bc.brand_name || bc.brand?.company || bc.brand_id || 'Brand';
  const creatorName = bc.creator_name || bc.creator?.name || null;
  const brandFeedback = bc.brand_feedback || null;
  const creatorFeedback = bc.creator_feedback || null;

  const brandAvg = brandScores.length > 0
    ? (brandScores.reduce((a, b) => a + b, 0) / brandScores.length).toFixed(1)
    : '0.0';

  const handleBrandSubmit = async () => {
    setBrandSubmitting(true);
    try {
      await v3SubmitBrandFeedback(id, {
        scores: templateQuestions.map((q, i) => ({ label: q.label, score: brandScores[i] })),
        highlights: brandHighlights,
        improvements: brandImprovements,
        would_repeat: brandWouldRepeat,
      });
      setBrandSubmitted(true);
    } catch (err) {
      console.error('Brand feedback submission failed:', err);
    }
    setBrandSubmitting(false);
  };

  const handleCreatorSubmit = async () => {
    setCreatorSubmitting(true);
    try {
      await v3SubmitCreatorFeedback(id, {
        scores: templateQuestions.map((q, i) => ({ label: q.label, score: creatorScores[i] })),
        highlights: creatorHighlights,
      });
      setCreatorSubmitted(true);
    } catch (err) {
      console.error('Creator feedback submission failed:', err);
    }
    setCreatorSubmitting(false);
  };

  return (
    <div data-testid="v3-admin-feedback">
      <button
        onClick={() => navigate(`/v3/admin/business-cases/${id}`)}
        className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to business case
      </button>

      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">FEEDBACK</p>
      <h1 className="v3-heading text-xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
        {brandName} - {bc.title}
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-6">
        Final feedback is collected after the final report has been generated.
      </p>

      {/* Toggle */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setFormType('brand')}
          className={`px-4 py-2 text-[12px] rounded-lg transition-colors ${
            formType === 'brand' ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'
          }`}
        >
          Brand Feedback
        </button>
        <button
          onClick={() => setFormType('creator')}
          className={`px-4 py-2 text-[12px] rounded-lg transition-colors ${
            formType === 'creator' ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'
          }`}
        >
          Creator Feedback
        </button>
      </div>

      {/* Locked state */}
      {!feedbackUnlocked && (
        <div className="v3-card p-6 flex items-start gap-4" data-testid="feedback-locked">
          <Lock className="w-5 h-5 text-[#C49B5F] mt-0.5" />
          <div>
            <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
              Feedback locked until final report
            </h3>
            <p className="text-[12px] text-[#8A8A8A] leading-relaxed">
              Generate and review the Final Campaign Report first. Once the report exists, TASCK
              sends the feedback checklist to the brand and creator for closure scoring.
            </p>
          </div>
        </div>
      )}

      {/* Brand feedback - already submitted */}
      {feedbackUnlocked && formType === 'brand' && (brandFeedback?.submitted || brandSubmitted) && (
        <div className="space-y-5">
          <div className="v3-card p-5 flex items-center gap-6">
            <div className="text-center">
              <p
                className="text-4xl font-semibold text-[#1F4A3A]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {brandFeedback?.overall ?? brandAvg}
              </p>
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1">Overall</p>
              <div className="flex gap-0.5 mt-2 justify-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="w-4 h-4"
                    fill={
                      i <= Math.round((brandFeedback?.overall ?? parseFloat(brandAvg)) / 2)
                        ? '#C49B5F'
                        : 'none'
                    }
                    stroke="#C49B5F"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            </div>
            {brandFeedback?.ratings?.length > 0 && (
              <div className="flex-1 grid grid-cols-5 gap-3">
                {brandFeedback.ratings.map((r, i) => (
                  <div key={i} className="text-center p-2 rounded-lg bg-[#FAFAF7]">
                    <p
                      className="text-lg font-semibold text-[#1A1A1A]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {r.score}
                    </p>
                    <p className="text-[9px] text-[#8A8A8A] mt-0.5">{r.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {brandFeedback?.highlights && (
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
                Highlights
              </h3>
              <p className="text-[13px] text-[#5C5C5C] leading-relaxed italic">
                "{brandFeedback.highlights}"
              </p>
            </div>
          )}
          {brandFeedback?.improvements && (
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
                Areas for Improvement
              </h3>
              <p className="text-[13px] text-[#5C5C5C] leading-relaxed italic">
                "{brandFeedback.improvements}"
              </p>
            </div>
          )}
          {brandFeedback?.would_repeat && (
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
                Would Repeat?
              </h3>
              <p className="text-[13px] text-[#1F4A3A] font-medium">"{brandFeedback.would_repeat}"</p>
            </div>
          )}
          {brandFeedback?.submitted_by && (
            <p className="text-[10px] text-[#8A8A8A]">
              Submitted by {brandFeedback.submitted_by} on {brandFeedback.submitted_at}
            </p>
          )}
          {!brandFeedback && brandSubmitted && (
            <div className="v3-card p-5">
              <div className="flex items-center gap-2 text-[#1F4A3A]">
                <CheckCircle className="w-4 h-4" />
                <p className="text-[13px] font-medium">Brand feedback submitted successfully.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand feedback form - not yet submitted */}
      {feedbackUnlocked && formType === 'brand' && !brandFeedback?.submitted && !brandSubmitted && (
        <div className="v3-card p-6 space-y-5" data-testid="brand-feedback-google-form">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                Brand Feedback Form
              </h3>
              <p className="text-[12px] text-[#8A8A8A]">
                Rate each item out of 10. Scores are averaged for the final closure score.
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-3xl font-semibold text-[#1F4A3A]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {brandAvg}
              </p>
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Average score</p>
            </div>
          </div>

          <div className="space-y-4">
            {templateQuestions.map((question, i) => (
              <div key={question.label} className="p-3 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7]">
                <p className="text-[12px] text-[#1A1A1A] mb-2">{question.label}</p>
                <ScoreInput
                  score={brandScores[i]}
                  onChange={(v) => {
                    const next = [...brandScores];
                    next[i] = v;
                    setBrandScores(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Highlights</span>
              <textarea
                value={brandHighlights}
                onChange={(e) => setBrandHighlights(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]"
                placeholder="What worked particularly well?"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                Areas for Improvement
              </span>
              <textarea
                value={brandImprovements}
                onChange={(e) => setBrandImprovements(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]"
                placeholder="What could have been better?"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                Would you work with TASCK again?
              </span>
              <input
                value={brandWouldRepeat}
                onChange={(e) => setBrandWouldRepeat(e.target.value)}
                className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]"
                placeholder="Yes / No / Maybe - and why"
              />
            </label>
          </div>

          <button
            onClick={handleBrandSubmit}
            disabled={brandSubmitting}
            className="v3-btn-primary"
          >
            {brandSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}{' '}
            Submit Brand Feedback
          </button>
        </div>
      )}

      {/* Creator feedback - submitted */}
      {feedbackUnlocked && formType === 'creator' && (creatorFeedback?.submitted || creatorSubmitted) && (
        <div className="v3-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#1F4A3A]">
            <CheckCircle className="w-4 h-4" />
            <p className="text-[13px] font-medium">Creator feedback submitted.</p>
          </div>
          {creatorFeedback?.highlights && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Highlights</p>
              <p className="text-[13px] text-[#5C5C5C] italic">"{creatorFeedback.highlights}"</p>
            </div>
          )}
        </div>
      )}

      {/* Creator feedback form */}
      {feedbackUnlocked && formType === 'creator' && !creatorFeedback?.submitted && !creatorSubmitted && (
        <div className="v3-card p-6 space-y-5">
          {!creatorName ? (
            <p className="text-[13px] text-[#8A8A8A]">No creator assigned to this business case.</p>
          ) : (
            <>
              <div>
                <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                  Creator Feedback Form
                </h3>
                <p className="text-[12px] text-[#8A8A8A]">
                  Collect {creatorName}'s feedback on this campaign.
                </p>
              </div>
              <div className="space-y-4">
                {templateQuestions.map((question, i) => (
                  <div key={question.label} className="p-3 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7]">
                    <p className="text-[12px] text-[#1A1A1A] mb-2">{question.label}</p>
                    <ScoreInput
                      score={creatorScores[i]}
                      onChange={(v) => {
                        const next = [...creatorScores];
                        next[i] = v;
                        setCreatorScores(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Highlights</span>
                <textarea
                  value={creatorHighlights}
                  onChange={(e) => setCreatorHighlights(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]"
                  placeholder="What worked particularly well from the creator's perspective?"
                />
              </label>
              <button
                onClick={handleCreatorSubmit}
                disabled={creatorSubmitting}
                className="v3-btn-primary"
              >
                {creatorSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}{' '}
                Submit Creator Feedback
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default V3AdminFeedback;
