import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../components/AuthPage';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('AuthPage', () => {
  it('renders sign in form by default', () => {
    render(<AuthPage />);
    expect(screen.getByText('Seven')).toBeInTheDocument();
    expect(screen.getByText('Your infinite scroll calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('toggles between sign in and sign up', () => {
    render(<AuthPage />);
    
    // Start with Sign In
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    
    // Toggle to Sign Up
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    
    // Toggle back to Sign In
    fireEvent.click(screen.getByText('Already have an account? Sign in'));
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('has email and password inputs', () => {
    render(<AuthPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
