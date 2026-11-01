import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../hooks/useI18n.jsx';
import { useConsent } from '../hooks/useConsent.jsx';
import LangSwitch from './LangSwitch.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.8c-2 1.4-4.7 2.3-7.8 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/* Connexion / création de compte : Google ou e-mail + mot de passe. */
export default function AuthCard() {
  const { t } = useI18n();
  const { rouvrir } = useConsent();
  const { configured, signInGoogle, signInEmail, signUpEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const signingUp = mode === 'up';
  const say = (m, c = 'err') => setMsg(m ? { m, c } : null);
  const fail = e => {
    setBusy(false);
    if (e?.code === 'app/not-configured') return say(t.not_configured);
    say(t.errors[e?.code] || t.e_generic);
  };
  const mismatch = signingUp && confirm.length > 0 && password !== confirm;
  const matching = signingUp && confirm.length > 0 && password === confirm;

  const google = async () => {
    say('');
    setBusy(true);
    try {
      await signInGoogle();
      setBusy(false);
    } catch (e) {
      fail(e);
    }
  };

  const submit = async e => {
    e.preventDefault();
    const mail = email.trim();
    if (!mail || !password) return say(t.e_fields);
    if (!EMAIL_RE.test(mail)) return say(t.e_email);
    if (signingUp) {
      if (password.length < MIN_PASSWORD) return say(t.e_short);
      if (!confirm) return say(t.e_pw2);
      if (password !== confirm) return say(t.match_ko);
    }
    say('');
    setBusy(true);
    try {
      await (signingUp ? signUpEmail(mail, password) : signInEmail(mail, password));
      setBusy(false);
    } catch (err) {
      fail(err);
    }
  };

  const forgot = async () => {
    const mail = email.trim();
    if (!mail) return say(t.e_forgot);
    if (!EMAIL_RE.test(mail)) return say(t.e_email);
    try {
      await resetPassword(mail);
      say(t.reset_sent, 'ok');
    } catch (e) {
      /* auth/user-not-found ne doit pas révéler l'existence du compte */
      if (e?.code === 'auth/user-not-found') say(t.reset_sent, 'ok');
      else fail(e);
    }
  };

  const switchMode = m => {
    setMode(m);
    say('');
  };
  const pwType = show ? 'text' : 'password';

  return (
    <div className="auth-box">
      <div className="auth-top">
        <span className="logo" aria-hidden="true">
          P
        </span>
        <span className="auth-tools">
          <LangSwitch />
          <ThemeToggle />
        </span>
      </div>
      <h1 id="auth-title">{signingUp ? t.welcome_up : t.welcome_in}</h1>
      <p className="auth-sub">{signingUp ? t.welcome_up_sub : t.login_sub}</p>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!signingUp} onClick={() => switchMode('in')}>
          {t.tab_in}
        </button>
        <button type="button" role="tab" aria-selected={signingUp} onClick={() => switchMode('up')}>
          {t.tab_up}
        </button>
      </div>
      <button type="button" className="btn btn-google" onClick={google} disabled={busy}>
        <GoogleIcon />
        <span>{signingUp ? t.google_up : t.google}</span>
      </button>
      <div className="sep">{t.or_mail}</div>
      <form onSubmit={submit} noValidate aria-labelledby="auth-title">
        <label>
          {t.email}
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} placeholder="vous@exemple.fr" />
        </label>
        <label>
          {t.password}
          <span className="pwrap">
            <input
              type={pwType}
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={signingUp ? t.password_ph : ''}
              maxLength={128}
            />
            <button type="button" className="eye" onClick={() => setShow(s => !s)} aria-label={show ? t.hide_l : t.show_l}>
              {show ? t.hide : t.show}
            </button>
          </span>
        </label>
        {signingUp && (
          <label>
            {t.password2}
            <input
              type={pwType}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              aria-invalid={mismatch}
              className={mismatch ? 'bad' : matching ? 'good' : ''}
              maxLength={128}
            />
            {(mismatch || matching) && (
              <span className={`match ${mismatch ? 'ko' : 'ok'}`} role="status">
                {mismatch ? t.match_ko : t.match_ok}
              </span>
            )}
          </label>
        )}
        <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
          {busy ? '…' : signingUp ? t.go_up : t.go_in}
        </button>
      </form>
      {!signingUp && (
        <p className="fine">
          <button type="button" className="linkbtn" onClick={forgot}>
            {t.forgot}
          </button>
        </p>
      )}
      <p className={`msg ${msg ? msg.c : ''}`} role="status" aria-live="polite">
        {msg ? msg.m : ''}
      </p>
      {!configured && <p className="note">{t.not_configured}</p>}
      <p className="terms">
        {t.accept_terms_a}
        <Link to="/cgu">{t.cgu}</Link>
        {t.accept_terms_b}
        <Link to="/confidentialite">{t.privacy}</Link>.
        <br />
        <Link to="/mentions-legales">{t.legal}</Link>
        {' · '}
        <button type="button" className="linkbtn" onClick={rouvrir}>
          {t.cookies}
        </button>
      </p>
    </div>
  );
}
