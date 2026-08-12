import React, { useState } from 'react';
import Logo from '../../components/shared/Logo';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, CheckCircle, Building2, User, Mail, Phone, FileText, Briefcase } from 'lucide-react';

const V3BrandInreach = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company: '', industry: '', website: '', contact: '', role: '', email: '', phone: '',
    campaignGoal: '', budget: '', timeline: '', creatorPrefs: '', notes: '',
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-[#DDE7E2] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#1F4A3A]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Enquiry Received</h1>
          <p className="text-[14px] text-[#5C5C5C] mb-6 leading-relaxed">
            Thank you, {form.contact}. Your enquiry for {form.company} has been submitted. A TASCK Relationship Manager will review your details and reach out within 48 hours.
          </p>
          <p className="text-[12px] text-[#8A8A8A] mb-8">Reference: ENQ-{Date.now().toString(36).toUpperCase()}</p>
          <button onClick={() => navigate('/v3')} className="v3-btn-primary">Back to TASCK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6" data-testid="v3-brand-inreach">
      <div className="w-full max-w-2xl">
        <button onClick={() => navigate('/v3')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-xs mb-8 hover:text-[#5C5C5C] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="mb-2"><Logo variant="light" size="sm" /></div>
        <div className="inline-flex items-center gap-2 mt-4 mb-6 px-3 py-1.5 rounded-full border border-[#E8E4DB] text-xs text-[#8A8A8A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1F4A3A]" /> Brand Enquiry
        </div>
        <h1 className="text-[#1A1A1A] text-2xl font-semibold tracking-tight mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Start a Campaign</h1>
        <p className="text-[#8A8A8A] text-sm mb-8">Tell us about your brand and campaign goals. A TASCK Relationship Manager will follow up within 48 hours.</p>

        <div className="v3-card p-6 space-y-6">
          {/* Company details */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4 flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-[#1F4A3A]" /> Company Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-[#8A8A8A] mb-1 block">Company name *</label>
                <input type="text" value={form.company} onChange={e => handleChange('company', e.target.value)} placeholder="e.g., Coca-Cola Nigeria Limited"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" data-testid="inreach-company" />
              </div>
              <div>
                <label className="text-[11px] text-[#8A8A8A] mb-1 block">Industry *</label>
                <select value={form.industry} onChange={e => handleChange('industry', e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" data-testid="inreach-industry">
                  <option value="">Select industry</option>
                  <option>FMCG - Beverages</option><option>FMCG - Food</option><option>Telecommunications</option>
                  <option>Banking & Financial Services</option><option>Energy & Industrials</option><option>Fashion & Lifestyle</option>
                  <option>Technology</option><option>Entertainment</option><option>Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-[#8A8A8A] mb-1 block">Website</label>
                <input type="text" value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder="e.g., coca-colacompany.com/ng"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" />
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4 flex items-center gap-2"><User className="w-3.5 h-3.5 text-[#1F4A3A]" /> Primary Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Full name *</label>
                <input type="text" value={form.contact} onChange={e => handleChange('contact', e.target.value)} placeholder="e.g., Folake Adeniran"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" data-testid="inreach-contact" /></div>
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Role *</label>
                <input type="text" value={form.role} onChange={e => handleChange('role', e.target.value)} placeholder="e.g., Head of Marketing"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" /></div>
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Email *</label>
                <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="folake@company.com"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" data-testid="inreach-email" /></div>
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Phone</label>
                <input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+234 803 XXX XXXX"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" /></div>
            </div>
          </div>

          {/* Campaign details */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-[#1F4A3A]" /> Campaign Details</h3>
            <div className="space-y-4">
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">What are you looking to achieve? *</label>
                <textarea value={form.campaignGoal} onChange={e => handleChange('campaignGoal', e.target.value)} rows={3}
                  placeholder="e.g., Launch a creator-led campaign for our Q4 activation targeting 18-28 year olds in Lagos, Abuja, and Port Harcourt..."
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors resize-none" data-testid="inreach-goal" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Budget indication</label>
                  <select value={form.budget} onChange={e => handleChange('budget', e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors">
                    <option value="">Select range</option>
                    <option>Under ₦50M</option><option>₦50M – ₦100M</option><option>₦100M – ₦200M</option><option>₦200M+</option><option>Not yet determined</option>
                  </select></div>
                <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Desired timeline</label>
                  <select value={form.timeline} onChange={e => handleChange('timeline', e.target.value)}
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors">
                    <option value="">Select timeline</option>
                    <option>Within 1 month</option><option>1–3 months</option><option>3–6 months</option><option>6+ months</option><option>Flexible</option>
                  </select></div>
              </div>
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Creator preferences (if any)</label>
                <input type="text" value={form.creatorPrefs} onChange={e => handleChange('creatorPrefs', e.target.value)}
                  placeholder="e.g., Tems, Rema, or 'open to recommendations'"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" /></div>
              <div><label className="text-[11px] text-[#8A8A8A] mb-1 block">Additional notes</label>
                <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} placeholder="Anything else we should know..."
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors resize-none" /></div>
            </div>
          </div>

          <button onClick={() => setSubmitted(true)} className="v3-btn-primary w-full justify-center py-3" data-testid="inreach-submit">
            <Send className="w-4 h-4" /> Submit Enquiry
          </button>
        </div>

        <p className="text-[10px] text-[#8A8A8A] mt-6 text-center">&copy; 2026 The TASCK Agency. All rights reserved.</p>
      </div>
    </div>
  );
};

export default V3BrandInreach;
