import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { Notice, Field } from '../components/ui.jsx';

// One component drives login / signup / forgot-password by `mode`.
export default function Auth({ mode }) {
  const { login, signup, applyAuth, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', token: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetStage, setResetStage] = useState(false); // forgot -> show token+new pwd

  // Already signed in? Bounce to the app.
  if (user) {
    navigate('/', { replace: true });
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else if (mode === 'signup') {
        await signup(form.name, form.email, form.password);
        navigate('/');
      } else if (mode === 'forgot') {
        if (!resetStage) {
          // Request a reset token. Hackathon backend returns it in the response.
          const res = await api('/auth/forgot-password', { method: 'POST', body: { email: form.email } });
          setResetStage(true);
          if (res.resetToken) {
            setForm((f) => ({ ...f, token: res.resetToken }));
            setOk('Demo mode: reset token pre-filled below. Set a new password.');
          } else {
            setOk(res.message || 'If that email exists, a reset link has been sent.');
          }
        } else {
          const res = await api('/auth/reset-password', {
            method: 'POST',
            body: { token: form.token, password: form.password },
          });
          applyAuth(res);
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    login: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
  };
  const subs = {
    login: 'Sign in to manage your organization’s assets.',
    signup: 'New accounts start as an Employee.',
    forgot: resetStage ? 'Enter the token and choose a new password.' : 'We’ll send a reset token to your email.',
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="auth-wrap">
        <form className="auth-card" onSubmit={submit}>
          <div className="brand">Asset<span>Flow</span></div>
          <div className="auth-sub">{subs[mode]}</div>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.15rem' }}>{titles[mode]}</h2>

          <Notice error={error} ok={ok} />

          {mode === 'signup' && (
            <Field label="Full name">
              <input value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
            </Field>
          )}

          {(mode !== 'forgot' || !resetStage) && (
            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
            </Field>
          )}

          {mode === 'forgot' && resetStage && (
            <Field label="Reset token">
              <input value={form.token} onChange={set('token')} required />
            </Field>
          )}

          {(mode === 'login' || mode === 'signup' || (mode === 'forgot' && resetStage)) && (
            <Field label={mode === 'forgot' ? 'New password' : 'Password'}>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </Field>
          )}

          <button className="btn full" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : resetStage ? 'Set new password' : 'Send reset token'}
          </button>

          <div className="auth-switch">
            {mode === 'login' && (
              <>
                <div><Link to="/forgot">Forgot password?</Link></div>
                <div style={{ marginTop: 6 }}>
                  New here? <Link to="/signup">Create an account</Link>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div>Already have an account? <Link to="/login">Sign in</Link></div>
            )}
            {mode === 'forgot' && (
              <div>Remembered it? <Link to="/login">Back to sign in</Link></div>
            )}
          </div>
        </form>
      </div>
    </>
  );
}