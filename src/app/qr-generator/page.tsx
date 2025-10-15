// src/app/qr-generator/page.tsx

'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { QRCodeCanvas } from 'qrcode.react'

const theme = {
  cardGlass: 'rgba(30, 27, 75, 0.4)',
  cardBorder: '1px solid rgba(255, 255, 255, 0.15)',
  textPrimary: '#F8FAFC',
  textSecondary: '#A5B4FC',
  accentPurple: '#8b5cf6',
  accentPink: '#ec4899',
  bgGradient: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
}

interface Table {
  id: string;
  label: string;
}

interface Restaurant {
  id: string;
  slug: string;
}

export default function QrGeneratorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleQRs, setVisibleQRs] = useState<Set<string>>(new Set());
  const router = useRouter();
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id, role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role !== 'manager') {
        setError("Access Denied: QR code generation is for managers only.");
        setLoading(false);
        return;
      }
      
      if (profile.restaurant_id) {
        const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('id, slug')
            .eq('id', profile.restaurant_id)
            .single();
        setRestaurant(restaurantData);
        fetchTables(profile.restaurant_id);
      } else {
        setError("No restaurant associated with your account.");
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  const fetchTables = async (restaurantId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('tables')
      .select('id, label')
      .eq('restaurant_id', restaurantId)
      .order('label', { ascending: true });
    
    if (data) setTables(data);
    setLoading(false);
  };

  const toggleQRVisibility = (tableId: string) => {
    const newVisibleQRs = new Set(visibleQRs);
    if (newVisibleQRs.has(tableId)) {
      newVisibleQRs.delete(tableId);
    } else {
      newVisibleQRs.add(tableId);
    }
    setVisibleQRs(newVisibleQRs);
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) {
    return <div style={{ color: theme.textPrimary, textAlign: 'center', padding: '40px', background: theme.bgGradient, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading QR Generator...</div>;
  }
  
  if (error) {
    return <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px', background: theme.bgGradient, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{error}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bgGradient, padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: theme.textPrimary, fontWeight: 800, fontSize: '32px', marginBottom: '32px', marginTop: 0 }}>📷 QR Code Generator</h1>

        <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '32px', backdropFilter: 'blur(20px)' }}>
          <h2 style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '20px', marginTop: 0, marginBottom: '24px' }}>Your Restaurant's Tables</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tables.length === 0 ? (
              <p style={{color: theme.textSecondary, textAlign: 'center'}}>No tables found. Please add tables in the 'Admin' panel first.</p>
            ) : (
              tables.map(table => {
                const url = `${siteUrl}/${restaurant?.slug}/${table.label}`;
                const isVisible = visibleQRs.has(table.id);
                return (
                  <div key={table.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isVisible ? '16px' : 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '16px', color: theme.textPrimary }}>Table {table.label}</span>
                      
                      <button 
                        onClick={() => toggleQRVisibility(table.id)}
                        style={{
                          background: `linear-gradient(135deg, ${theme.accentPurple}, ${theme.accentPink})`,
                          border: 'none',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {isVisible ? 'Hide QR' : 'Show QR'}
                      </button>
                    </div>
                    
                    {isVisible && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <QRCodeCanvas id={`qr-canvas-${table.id}`} value={url} size={300} level="H" includeMargin={true} />
                        <p style={{ color: theme.textSecondary, fontSize: '12px', margin: '0', textAlign: 'center', wordBreak: 'break-all' }}>{url}</p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
