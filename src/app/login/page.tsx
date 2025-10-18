// src/app/login/page.tsx

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const theme = {
  bgGradient: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
  cardGlass: 'rgba(30, 27, 75, 0.6)',
  cardBorder: '1px solid rgba(255, 255, 255, 0.15)',
  textPrimary: '#F8FAFC',
  textSecondary: '#A5B4FC',
  accentPurple: '#8b5cf6',
  accentPink: '#ec4899',
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export default function LoginPage() {
  const [view, setView] = useState('signIn'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data: { user }, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password 
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!user) {
        setError("Could not create user. Please try again.");
        setLoading(false);
        return;
    }

    const slug = generateSlug(restaurantName);

    const { data: newRestaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({ name: restaurantName, user_id: user.id, slug: slug })
      .select('id')
      .single();

    if (restaurantError) {
      setError(`Failed to create restaurant: ${restaurantError.message}`);
      await supabase.auth.admin.deleteUser(user.id);
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ restaurant_id: newRestaurant.id, role: 'manager' })
      .eq('id', user.id);

    if (profileError) {
      setError(`Failed to update profile: ${profileError.message}`);
      setLoading(false);
      return;
    }
    
    setMessage('Success! Please check your email to confirm your account.');
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push('/staff/requests');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset link sent! Please check your email.');
    }
    setLoading(false);
  };

  const formStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '16px' };
  const inputStyle = {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '14px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
  };

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', sans-serif;
          background: ${theme.bgGradient};
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .login-button {
          background: linear-gradient(135deg, ${theme.accentPurple}, ${theme.accentPink});
          border: none;
          color: white;
          padding: 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(236, 72, 153, 0.3);
        }
        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .spinning-logo {
          animation: spin 3s linear infinite;
        }
      `}</style>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: theme.bgGradient, fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: theme.cardGlass, border: theme.cardBorder, borderRadius: '28px',
          padding: '40px', width: '100%', maxWidth: '420px', backdropFilter: 'blur(20px)'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div className="spinning-logo">
              <Image
                src="/logo.png"
                alt="Table Bud Logo"
                width={300}
                height={280}
                priority
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
              />
            </div>
          </div>
          
          <h1 style={{ color: theme.textPrimary, textAlign: 'center', fontWeight: 800, margin: '0 0 32px 0' }}>
            {view === 'signUp' && 'Create Your Account'}
            {view === 'signIn' && 'Welcome Back'}
            {view === 'forgotPassword' && 'Reset Your Password'}
          </h1>

          {view === 'signUp' && (
            <form onSubmit={handleSignUp} style={formStyle}>
              <input type="text" placeholder="Your Restaurant's Name" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} style={inputStyle} required />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required />
              <button type="submit" disabled={loading} className="login-button">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {view === 'signIn' && (
            <form onSubmit={handleLogin} style={formStyle}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
              <button type="submit" disabled={loading} className="login-button">
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </form>
          )}

          {view === 'forgotPassword' && (
            <form onSubmit={handlePasswordReset} style={formStyle}>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
              <button type="submit" disabled={loading} className="login-button">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
          {message && <p style={{ color: '#10b981', textAlign: 'center', marginTop: '16px' }}>{message}</p>}

          {view === 'signIn' && (
            <div style={{textAlign: 'center', marginTop: '16px'}}>
              <button onClick={() => setView('forgotPassword')} style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: '14px' }}>
                Forgot your password?
              </button>
            </div>
          )}

          <p style={{ color: theme.textSecondary, textAlign: 'center', marginTop: view === 'signIn' ? '16px' : '32px' }}>
            {view === 'signUp' && 'Already have an account?'}
            {view === 'forgotPassword' && 'Remembered your password?'}
            {view === 'signIn' && "Don't have an account?"}
            <button
              onClick={() => { 
                setView(view === 'signUp' || view === 'forgotPassword' ? 'signIn' : 'signUp'); 
                setError(null); 
                setMessage(null); 
              }}
              style={{
                background: 'none', border: 'none', color: theme.accentPurple,
                fontWeight: 'bold', cursor: 'pointer', marginLeft: '8px'
              }}
            >
              {view === 'signUp' || view === 'forgotPassword' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </>
  )
}
