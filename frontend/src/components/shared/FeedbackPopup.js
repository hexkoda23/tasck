import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const FeedbackPopup = () => {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', comment: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); setForm({ name: '', email: '', comment: '' }); }, 2000);
  };

  return (
    <>
      {/* Trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="feedback-trigger"
          className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/15 transition-all shadow-lg"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}

      {/* Popup */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-72" data-testid="feedback-popup">
          <div className="bg-[#111318] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-white/50 text-[11px] font-medium tracking-wide">Feedback</span>
              <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white/50 transition-colors" data-testid="feedback-close">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {sent ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-2">
                  <Send className="w-3.5 h-3.5 text-[#22C55E]" />
                </div>
                <p className="text-white/50 text-xs">Thanks for your feedback.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors"
                  data-testid="feedback-name"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors"
                  data-testid="feedback-email"
                />
                <textarea
                  required
                  placeholder="Your comment..."
                  rows={3}
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors resize-none"
                  data-testid="feedback-comment"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-white/[0.08] text-white/50 text-[11px] font-medium hover:bg-white/[0.12] hover:text-white/70 transition-colors"
                  data-testid="feedback-submit"
                >
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackPopup;
