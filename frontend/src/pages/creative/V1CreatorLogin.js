import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Palette } from 'lucide-react';
import Logo from '../../components/shared/Logo';
import { useAuth } from '../../context/AuthContext';
import { v3CreatorLogin } from '../../lib/v3api';

const PasswordInput = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Temporary password"
        className="w-full px-3 py-2 pr-10 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
        data-testid="v1-creator-login-password"
      />
      <button type="button" onClick={() => setVisible(!visible)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8A8A8A] hover:text-[#1F4A3A]" aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const V1CreatorLogin = () => {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) return;
    setBusy(true);
    setError('');
    try {
      const session = await v3CreatorLogin({ email: form.email, password: form.password });
      completeLogin({ user: session.user, token: session.token });
      window.localStorage.setItem('tasck_v1_creator_session', JSON.stringify(session.account));
      navigate('/creator/briefs');
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'The email or password is incorrect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6" data-testid="v1-creator-login">
      <form onSubmit={submit} className="w-full max-w-md v3-card p-6">
        <div className="mb-5"><Logo variant="light" size="sm" /></div>
        <div className="w-10 h-10 rounded-lg bg-[#DDE7E2] flex items-center justify-center mb-4">
          <Palette className="w-5 h-5 text-[#1F4A3A]" />
        </div>
        <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">V1 Creator Portal</p>
        <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Creator Login</h1>
        <p className="text-[13px] text-[#8A8A8A] mb-6">Use the brief login details sent to your email by TASCK.</p>
        <div className="space-y-3">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Creator email"
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="v1-creator-login-email"
          />
          <PasswordInput value={form.password} onChange={(password) => setForm({ ...form, password })} />
        </div>
        {error && <p className="text-[12px] text-[#B54A37] mt-3" data-testid="v1-creator-login-error">{error}</p>}
        <button type="submit" disabled={busy || !form.email || !form.password} className="v3-btn-primary w-full mt-5 justify-center" data-testid="v1-creator-login-submit">
          <Lock className="w-3.5 h-3.5" /> {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default V1CreatorLogin;