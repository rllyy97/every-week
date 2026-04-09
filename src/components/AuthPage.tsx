import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as Label from '@radix-ui/react-label';
import shared from '../styles/shared.module.css';
import logoSvg from '../assets/logo.svg';
import './AuthPage.css';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30_000;

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const failCount = useRef(0);
  const lockedUntil = useRef(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (Date.now() < lockedUntil.current) {
      const secs = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${secs}s.`);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      failCount.current = 0;
    } catch (err: unknown) {
      failCount.current++;
      if (failCount.current >= LOCKOUT_THRESHOLD) {
        lockedUntil.current = Date.now() + LOCKOUT_DURATION_MS;
        failCount.current = 0;
        setError(`Too many failed attempts. Try again in ${LOCKOUT_DURATION_MS / 1000}s.`);
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={logoSvg} alt="" className="auth-logo" />
        <h1 className="auth-title">EveryWeek</h1>
        <p className="auth-subtitle">Your infinite scroll calendar</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <Label.Root htmlFor="email">Email</Label.Root>
            <input
              id="email"
              type="email"
              className={shared.textInputInset}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <Label.Root htmlFor="password">Password</Label.Root>
            <input
              id="password"
              type="password"
              className={shared.textInputInset}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          className="auth-toggle"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
