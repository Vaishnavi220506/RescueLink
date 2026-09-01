import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo, Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

const featureBullets = ['Coordinate help requests with trusted local volunteers', 'See verified hazards and alerts around your location', 'Your exact location stays private until you choose to share it'];

function AuthLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="auth-page"><div className="auth-visual"><div className="auth-visual-inner"><Logo /><div className="auth-quote"><span className="eyebrow">Community response, connected</span><h1>Small actions can make a neighborhood safer.</h1><p>RescueLink helps people find the right support quickly when regular systems are under pressure.</p><div className="auth-features">{featureBullets.map((feature) => <div key={feature}><CheckCircle2 size={16} />{feature}</div>)}</div></div><div className="auth-visual-footer"><span><span className="status-dot live" /> Live community network</span><span>Built for calm, coordinated response</span></div></div></div><div className="auth-form-side"><div className="auth-form-wrap"><div className="mobile-auth-logo"><Logo /></div><div className="auth-heading"><span className="eyebrow">Welcome to RescueLink</span><h2>{title}</h2><p>{description}</p></div>{children}</div></div></div>;
}

export function LoginPage() {
  const { user, login, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('ananya@rescue.link');
  const [password, setPassword] = useState('rescue-link');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await login(email, password); navigate('/'); } catch (submissionError) { const message = submissionError instanceof Error ? submissionError.message : 'Unable to sign in.'; setError(message); showToast(message, 'error'); } finally { setSubmitting(false); }
  };
  const enterDemo = async () => {
    setError(''); setSubmitting(true);
    try { await login('ananya@rescue.link', 'rescue-link'); navigate('/'); } catch (submissionError) { const message = submissionError instanceof Error ? submissionError.message : 'Unable to open the demo workspace.'; setError(message); showToast(message, 'error'); } finally { setSubmitting(false); }
  };
  return <AuthLayout title="Sign in to your workspace" description="Coordinate support, discover nearby needs, and stay informed."><form className="auth-form" onSubmit={submit}><label className="field-label" htmlFor="email">Email address</label><div className="input-with-icon"><Mail size={17} /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div><label className="field-label" htmlFor="password">Password <span>Minimum 8 characters</span></label><div className="input-with-icon"><LockKeyhole size={17} /><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" minLength={8} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{error && <p className="field-error" role="alert">{error}</p>}<div className="auth-options"><label><input type="checkbox" /> Keep me signed in</label><button type="button" className="text-button">Forgot password?</button></div><Button type="submit" size="lg" disabled={submitting} className="auth-submit">{submitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></Button><div className="demo-login"><span>New here?</span><Link to="/register">Create an account</Link></div><div className="auth-divider"><span>or</span></div><Button type="button" variant="secondary" className="demo-button" disabled={submitting} onClick={enterDemo}>{submitting ? 'Opening demo…' : 'Explore demo workspace'}</Button></form><p className="auth-privacy"><ShieldCheck size={14} /> Your personal details are protected with role-based access.</p></AuthLayout>;
}

export function RegisterPage() {
  const { user, register, showToast } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [role, setRole] = useState<Role>('CITIZEN'); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  if (user) return <Navigate to="/" replace />;
  const submit = async (event: FormEvent) => { event.preventDefault(); if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; } setSubmitting(true); setError(''); try { await register(name, email, password, role); navigate('/'); } catch (submissionError) { const message = submissionError instanceof Error ? submissionError.message : 'Unable to create account.'; setError(message); showToast(message, 'error'); } finally { setSubmitting(false); } };
  return <AuthLayout title="Create your account" description="Join the local network and be ready to help when it matters."><form className="auth-form" onSubmit={submit}><label className="field-label" htmlFor="name">Full name</label><div className="input-with-icon"><UserRound size={17} /><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ananya Rao" required /></div><label className="field-label" htmlFor="register-email">Email address</label><div className="input-with-icon"><Mail size={17} /><input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div><label className="field-label" htmlFor="register-password">Password</label><div className="input-with-icon"><LockKeyhole size={17} /><input id="register-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /></div><fieldset className="role-fieldset"><legend>How will you participate?</legend><div className="role-options"><label className={role === 'CITIZEN' ? 'selected' : ''}><input type="radio" name="role" checked={role === 'CITIZEN'} onChange={() => setRole('CITIZEN')} /><strong>Citizen</strong><span>Request help and report hazards</span></label><label className={role === 'VOLUNTEER' ? 'selected' : ''}><input type="radio" name="role" checked={role === 'VOLUNTEER'} onChange={() => setRole('VOLUNTEER')} /><strong>Volunteer</strong><span>Offer resources and respond nearby</span></label></div></fieldset>{error && <p className="field-error" role="alert">{error}</p>}<Button type="submit" size="lg" disabled={submitting} className="auth-submit">{submitting ? 'Creating account…' : 'Create account'}<ArrowRight size={17} /></Button></form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></AuthLayout>;
}
