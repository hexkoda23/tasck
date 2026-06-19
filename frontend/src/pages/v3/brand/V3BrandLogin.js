import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../../components/shared/Logo';
import { brandDemoAccounts, getBrandPortalAccountByEmail, setBrandPortalSession } from '../../../lib/v3brandPortal';
import { Building2, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { brandRoute } from '../../../lib/v3AdminRouteBase';

const PasswordInput = ({ value, onChange, placeholder, testid }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
        data-testid={testid}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8A8A8A] hover:text-[#1F4A3A]"
        data-testid={`${testid}-toggle`}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const V3BrandLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: brandDemoAccounts[0].email, password: brandDemoAccounts[0].password });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    const account = getBrandPortalAccountByEmail(form.email);
    if (!account || account.password !== form.password) {
      setError('Use one of the demo brand credentials below for the presentation portal.');
      return;
    }
    setBusy(true);
    setBrandPortalSession(account);
    navigate(brandRoute('/v3/brand'));
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6" data-testid="v3-brand-login">
      <form onSubmit={submit} className="w-full max-w-5xl v3-card p-6">
        <div className="mb-5">
          <Logo variant="light" size="sm" />
        </div>
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-6">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#DDE7E2] flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-[#1F4A3A]" />
            </div>
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Brand Portal</p>
            <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Company Login</h1>
            <p className="text-[13px] text-[#8A8A8A] mb-6">Sign in as one demo brand. The entire portal will show only that company&apos;s projects, approvals, documents, invoices, and messages.</p>

            <div className="space-y-3">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Company email"
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
                data-testid="brand-login-email"
              />
              <PasswordInput
                value={form.password}
                onChange={(password) => setForm({ ...form, password })}
                placeholder="Password"
                testid="brand-login-password"
              />
            </div>

            {error && <p className="text-[12px] text-[#B54A37] mt-3" data-testid="brand-login-error">{error}</p>}

            <button type="submit" disabled={busy || !form.email || !form.password} className="v3-btn-primary w-full mt-5 justify-center" data-testid="brand-login-submit">
              <Lock className="w-3.5 h-3.5" /> {busy ? 'Signing in...' : 'Sign in'}
            </button>
            <button type="button" onClick={() => navigate(brandRoute('/v3/brand/change-password'))} className="v3-btn-secondary w-full mt-2 justify-center" data-testid="brand-login-change-password">
              Change temporary password
            </button>
          </div>

          <div className="rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-4">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-3">Presentation demo credentials</p>
            <div className="space-y-2">
              {brandDemoAccounts.map((account) => (
                <button
                  key={account.brandId}
                  type="button"
                  onClick={() => {
                    setForm({ email: account.email, password: account.password });
                    setError('');
                  }}
                  className={`w-full text-left rounded border p-3 transition-colors ${
                    form.email === account.email ? 'border-[#1F4A3A] bg-[#DDE7E2]' : 'border-[#E8E4DB] bg-white hover:border-[#D4CDBF]'
                  }`}
                  data-testid={`brand-demo-login-${account.brandId}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">{account.company}</p>
                      <p className="text-[11px] text-[#8A8A8A]">{account.contact}</p>
                    </div>
                    {form.email === account.email && <CheckCircle className="w-4 h-4 text-[#1F4A3A]" />}
                  </div>
                  <div className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1 mt-3 text-[11px]">
                    <span className="text-[#8A8A8A]">Email</span>
                    <span className="text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{account.email}</span>
                    <span className="text-[#8A8A8A]">Password</span>
                    <span className="text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{account.password}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default V3BrandLogin;
