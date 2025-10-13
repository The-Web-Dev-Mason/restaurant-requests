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

  const downloadQRCode = (table: Table) => {
    const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${restaurant?.slug}-table-${table.label}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) {
    return <div style={{ color: theme.textPrimary, textAlign: 'center', padding: '40px' }}>Loading QR Generator...</div>;
  }
  
  if (error) {
    return <div style={{ color: theme.accentRed, textAlign: 'center', padding: '40px' }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }}>
      <h1 style={{ color: theme.textPrimary, fontWeight: 800, fontSize: '32px', marginBottom: '32px' }}>📷 QR Code Generator</h1>

      <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '32px', backdropFilter: 'blur(20px)' }}>
        <h2 style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '20px', marginTop: 0, marginBottom: '24px' }}>Your Restaurant's Tables</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tables.length === 0 ? (
            <p style={{color: theme.textSecondary, textAlign: 'center'}}>No tables found. Please add tables in the 'Admin' panel first.</p>
          ) : (
            tables.map(table => {
              const url = `${siteUrl}/${restaurant?.slug}/${table.label}`;
              return (
                <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '16px' }}>Table {table.label}</span>
                  
                  {/* Hidden canvas for generating the QR code */}
                  <div style={{ display: 'none' }}>
                    <QRCodeCanvas id={`qr-canvas-${table.id}`} value={url} size={512} />
                  </div>

                  <button 
                    onClick={() => downloadQRCode(table)}
                    style={{
                      background: `linear-gradient(135deg, ${theme.accentPurple}, ${theme.accentPink})`, border: 'none', color: 'white',
                      padding: '8px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Download QR
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}