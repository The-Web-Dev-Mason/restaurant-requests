'use client'

import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const currentYear = new Date().getFullYear(); // Automatically gets the current year

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)' }}>
      <nav style={{
        padding: '16px 24px',
        background: 'rgba(30, 27, 75, 0.4)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <Link href="/staff/requests" style={{ color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
          Dashboard
        </Link>
        <Link href="/staff/reports" style={{ color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
          Reports
        </Link>
        <Link href="/staff/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
          Admin
        </Link>
        <a href="https://table-bud-v2.netlify.app/qr-generator" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '16px' }}>
          QR Generator
        </a>
        
        <button 
          onClick={handleLogout} 
          style={{
            marginLeft: 'auto',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
          Log Out
        </button>
      </nav>

      <main style={{ flex: 1 }}>
        {children}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '12px',
        color: 'rgba(165, 180, 252, 0.6)',
        fontFamily: "'Inter', sans-serif",
      }}>
        © {currentYear} Table Bud. All Rights Reserved.
      </footer>
    </div>
  );
}