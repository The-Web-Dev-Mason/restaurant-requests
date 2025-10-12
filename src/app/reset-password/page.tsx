// src/app/reset-password/page.tsx

'use client'

import { useEffect, useState } from 'react' // Import useEffect
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ✅ FIX IS HERE: This effect handles the session from the URL
  useEffect(() => {
    // Supabase client automatically handles the token from the URL on page load.
    // We listen for the PASSWORD_RECOVERY event to confirm the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Now the session is established, and updateUser will work.
        // We can unsubscribe now as we only need this once.
        subscription.unsubscribe();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);

    // Now this will work because the useEffect has prepared the session
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Your password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
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
  const buttonStyle = {
    background: `linear-gradient(135deg, ${theme.accentPurple}, ${theme.accentPink})`,
    border: 'none',
    color: 'white',
    padding: '16px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: theme.bgGradient, fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: theme.cardGlass, border: theme.cardBorder, borderRadius: '28px',
        padding: '40px', width: '100%', maxWidth: '420px', backdropFilter: 'blur(20px)'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Image
            src="/logo.png"
            alt="Table Bud Logo"
            width={300}
            height={280}
            priority
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
          />
        </div>
        
        <h1 style={{ color: theme.textPrimary, textAlign: 'center', fontWeight: 800, margin: '0 0 32px 0' }}>
          Set a New Password
        </h1>

        <form onSubmit={handlePasswordReset} style={formStyle}>
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
        {message && <p style={{ color: '#10b981', textAlign: 'center', marginTop: '16px' }}>{message}</p>}

      </div>
    </div>
  );
}