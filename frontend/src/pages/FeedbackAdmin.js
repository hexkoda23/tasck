import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronLeft, Filter, Clock, User, Mail, FileText } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const FeedbackAdmin = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPage, setFilterPage] = useState('');

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const url = filterPage ? `${API}/api/feedback?page_url=${encodeURIComponent(filterPage)}` : `${API}/api/feedback`;
        const res = await fetch(url);
        const data = await res.json();
        setFeedback(data);
      } catch (err) {
        console.error('Failed to load feedback:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [filterPage]);

  const pages = [...new Set(feedback.map(f => f.page_url))];

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-white p-8" data-testid="feedback-admin">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-white/30 text-xs mb-6 hover:text-white/50 transition-colors" data-testid="feedback-back">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-[#2F55FF]" />
              <h1 className="text-xl font-bold tracking-tight">Feedback</h1>
            </div>
            <p className="text-white/30 text-xs">{feedback.length} comment{feedback.length !== 1 ? 's' : ''} received</p>
          </div>

          {/* Page filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-white/20" />
            <select
              value={filterPage}
              onChange={e => setFilterPage(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white/50 outline-none"
              data-testid="feedback-filter"
            >
              <option value="">All pages</option>
              {pages.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Feedback list */}
        {loading ? (
          <div className="text-center py-20"><p className="text-white/20 text-xs">Loading...</p></div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-20 border border-white/[0.04] rounded-xl">
            <MessageCircle className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-sm">No feedback yet</p>
            <p className="text-white/10 text-xs mt-1">Comments will appear here as viewers submit them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map(item => (
              <div key={item.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors" data-testid={`feedback-item-${item.id}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2F55FF]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#2F55FF]">{item.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white/70 font-medium">{item.name}</p>
                      <p className="text-[10px] text-white/25 flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {item.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] text-white/15 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {formatDate(item.created_at)}</p>
                    <p className="text-[9px] text-white/10 mt-0.5 flex items-center gap-1"><FileText className="w-2.5 h-2.5" /> {item.page_url}</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 leading-relaxed pl-11">{item.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackAdmin;
