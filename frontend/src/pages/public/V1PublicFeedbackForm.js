import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import Logo from '../../components/shared/Logo';
import { v3GetPublicFeedbackForm, v3SubmitPublicFeedbackForm } from '../../lib/v3api';

// Public, unauthenticated feedback form - the token in the URL is the only
// access control (same convention the app already uses for PDF/flip-book
// links). Sent by email from the Final Report page's "Send to Brand" /
// "Send to Creator" buttons, one token per side, so a brand link can never
// open the creator's questions and vice versa.

const PillOption = ({ label, selected, onSelect, testId }) => (
  <button
    type="button"
    onClick={onSelect}
    data-testid={testId}
    className={`flex-1 min-w-[92px] rounded-lg border px-2 py-2.5 text-center text-[12px] font-medium leading-tight transition-colors ${
      selected
        ? 'border-[#1F4A3A] bg-[#1F4A3A] text-white shadow-sm'
        : 'border-[#E8E4DB] bg-white text-[#4F3E2F] hover:border-[#1F4A3A]'
    }`}
  >
    {label}
  </button>
);

// Module-level, not defined inside V1PublicFeedbackForm - a component
// declared inside another component's body gets a new function identity on
// every render, which React treats as an entirely different component type.
// That was remounting this whole subtree (destroying and recreating the
// name/comment <input>/<textarea> DOM nodes) on every keystroke, which is
// what showed up as focus loss and the page jumping to the top.
const Shell = ({ children }) => (
  <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6" data-testid="public-feedback-form">
    <div className="w-full max-w-2xl">
      <div className="mb-6"><Logo variant="light" size="sm" /></div>
      {children}
    </div>
  </div>
);

const V1PublicFeedbackForm = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | form | already_submitted | submitted | error
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    v3GetPublicFeedbackForm(token)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setStatus(res.already_submitted ? 'already_submitted' : 'form');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.detail || e?.message || 'This feedback link could not be opened.');
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [token]);

  const questions = data?.questions || [];
  const scaleLabels = data?.scale_labels || ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
  const allAnswered = questions.length > 0 && questions.every((q) => Boolean(answers[q.key]));

  const submit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await v3SubmitPublicFeedbackForm(token, {
        answers,
        comment: comment.trim() || undefined,
        submitted_by: submittedBy.trim() || undefined,
      });
      setStatus('submitted');
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Could not submit your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <Shell>
        <div className="v3-card p-10 flex items-center justify-center gap-2 text-[#6E6657] text-[13px]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading feedback form...
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell>
        <div className="v3-card p-8 text-center">
          <h1 className="text-[18px] font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Link not available</h1>
          <p className="text-[13px] text-[#6E6657]">{error}</p>
        </div>
      </Shell>
    );
  }

  if (status === 'already_submitted') {
    return (
      <Shell>
        <div className="v3-card p-8 text-center" data-testid="public-feedback-already-submitted">
          <div className="w-14 h-14 rounded-full bg-[#DDE7E2] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[#1F4A3A]" />
          </div>
          <h1 className="text-[18px] font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Feedback already received</h1>
          <p className="text-[13px] text-[#6E6657] leading-relaxed">
            Thank you - we already have your response for {data?.project_name || 'this project'}. There is nothing more to do here.
          </p>
        </div>
      </Shell>
    );
  }

  if (status === 'submitted') {
    return (
      <Shell>
        <div className="v3-card p-8 text-center" data-testid="public-feedback-submitted">
          <div className="w-14 h-14 rounded-full bg-[#DDE7E2] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-[#1F4A3A]" />
          </div>
          <h1 className="text-[18px] font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Thank you!</h1>
          <p className="text-[13px] text-[#6E6657] leading-relaxed">
            Your feedback on {data?.project_name || 'this project'} has been sent to TASCK. We appreciate you taking the time.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-[#1A1A1A] text-2xl font-semibold tracking-tight mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
        {data?.form_title}
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-6">
        {data?.project_name}{data?.brand_name ? ` · ${data.brand_name}` : ''}
      </p>

      <div className="v3-card p-6 space-y-6">
        <p className="text-[12px] text-[#6E6657]">Please rate the following based on your experience working with TTA.</p>
        {questions.map((q, idx) => (
          <div key={q.key} className="space-y-2.5" data-testid={`public-feedback-q-${q.key}`}>
            <div>
              <p className="text-[13px] font-semibold text-[#1A1A1A]">{idx + 1}. {q.label}</p>
              <p className="text-[12px] text-[#6E6657] mt-0.5">{q.question}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scaleLabels.map((label, optionIdx) => (
                <PillOption
                  key={label}
                  label={label}
                  selected={answers[q.key] === optionIdx + 1}
                  onSelect={() => setAnswers((prev) => ({ ...prev, [q.key]: optionIdx + 1 }))}
                  testId={`public-feedback-${q.key}-${optionIdx + 1}`}
                />
              ))}
            </div>
          </div>
        ))}

        <label className="block pt-2 border-t border-[#F1ECDF]">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Your name (optional)</span>
          <input
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="So we know who to thank"
            className="mt-1 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
            data-testid="public-feedback-name"
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Comment (optional)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Anything else you'd like to share?"
            className="mt-1 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
            data-testid="public-feedback-comment"
          />
        </label>

        {error && <p className="text-[12px] text-[#B54A37]">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered || submitting}
          className="v3-btn-primary w-full justify-center disabled:opacity-50"
          data-testid="public-feedback-submit"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        {!allAnswered && <p className="text-center text-[11px] text-[#8A8A8A]">Answer every question to submit.</p>}
      </div>
    </Shell>
  );
};

export default V1PublicFeedbackForm;
