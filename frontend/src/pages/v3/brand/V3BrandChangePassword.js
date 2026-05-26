import React, { useState } from 'react';
import { v3ChangeBrandPassword } from '../../../lib/v3api';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

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
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8A8A8A]"
        aria-label={visible ? `Hide ${placeholder}` : `Show ${placeholder}`}
        title={visible ? `Hide ${placeholder}` : `Show ${placeholder}`}
        data-testid={`${testid}-toggle`}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const V3BrandChangePassword = () => {
  const [form, setForm] = useState({ username: '', current_password: '', new_password: '' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await v3ChangeBrandPassword(form);
      setStatus({ ok: true, text: 'Password changed. Your brand portal account is ready.' });
      setForm({ username: '', current_password: '', new_password: '' });
    } catch (e) {
      setStatus({ ok: false, text: e.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="v3-brand-change-password">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">SECURITY</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Change Password</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Use the temporary details from your welcome email, then set your own password.</p>

      <div className="v3-card p-5 max-w-md space-y-3">
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="Username or email"
          className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
          data-testid="brand-password-username"
        />
        <PasswordInput value={form.current_password} onChange={(value) => setForm({ ...form, current_password: value })} placeholder="Temporary password" testid="brand-current-password" />
        <PasswordInput value={form.new_password} onChange={(value) => setForm({ ...form, new_password: value })} placeholder="New password" testid="brand-new-password" />
        {status && (
          <div className={`p-3 rounded text-[12px] ${status.ok ? 'bg-[#DDE7E2] text-[#1F4A3A]' : 'bg-[#F5D9D2] text-[#B54A37]'}`}>
            {status.text}
          </div>
        )}
        <button onClick={submit} disabled={busy || !form.username || !form.current_password || !form.new_password} className="v3-btn-primary" data-testid="brand-password-submit">
          <ShieldCheck className="w-4 h-4" /> {busy ? 'Saving...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
};

export default V3BrandChangePassword;
