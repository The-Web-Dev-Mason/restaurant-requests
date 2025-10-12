// src/app/staff/admin/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

const theme = {
  cardGlass: 'rgba(30, 27, 75, 0.4)',
  cardBorder: '1px solid rgba(255, 255, 255, 0.15)',
  textPrimary: '#F8FAFC',
  textSecondary: '#A5B4FC',
  accentPurple: '#8b5cf6',
  accentPink: '#ec4899',
  accentRed: '#ef4444',
}

interface Table {
  id: string;
  label: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ restaurant_id: string; role: string } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('restaurant_id, role')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.role !== 'manager') {
        setError("Access Denied: This page is for managers only.");
        setLoading(false);
        return;
      }
      
      setProfile(userProfile);
      fetchTables(userProfile.restaurant_id);
    };
    initialize();
  }, [router]);

  const fetchTables = async (restaurantId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tables')
      .select('id, label')
      .eq('restaurant_id', restaurantId)
      .order('label', { ascending: true });
    
    if (data) {
      setTables(data);
    } else if (error) {
      setError("Could not fetch tables.");
    }
    setLoading(false);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableLabel.trim() || !profile?.restaurant_id) return;

    const { data, error } = await supabase
      .from('tables')
      .insert({ label: newTableLabel, restaurant_id: profile.restaurant_id })
      .select()
      .single();

    if (data) {
      setTables(prev => [...prev, data]);
      setNewTableLabel('');
    } else {
      alert(`Error adding table: ${error?.message}`);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm(`Are you sure you want to delete this table? This cannot be undone.`)) return;
    
    const { error } = await supabase.from('tables').delete().eq('id', tableId);

    if (!error) {
      setTables(prev => prev.filter(t => t.id !== tableId));
    } else {
      alert(`Error deleting table: ${error.message}`);
    }
  };

  if (loading) {
    return <div style={{ color: theme.textPrimary, textAlign: 'center', padding: '40px' }}>Loading Admin Panel...</div>;
  }
  
  if (error) {
    return <div style={{ color: theme.accentRed, textAlign: 'center', padding: '40px' }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }}>
      <h1 style={{ color: theme.textPrimary, fontWeight: 800, fontSize: '32px', marginBottom: '32px' }}>⚙️ Admin Panel</h1>

      <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '32px', backdropFilter: 'blur(20px)' }}>
        <h2 style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '20px', marginTop: 0, marginBottom: '24px' }}>Manage Tables</h2>
        
        {/* List of existing tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {tables.length === 0 ? (
            <p style={{color: theme.textSecondary, textAlign: 'center'}}>No tables created yet. Add your first one below.</p>
          ) : (
            tables.map(table => (
              <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px' }}>
                <span style={{ fontWeight: 600, fontSize: '16px' }}>Table {table.label}</span>
                <button 
                  onClick={() => handleDeleteTable(table.id)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Form to add a new table */}
        <form onSubmit={handleAddTable} style={{ display: 'flex', gap: '16px' }}>
          <input
            type="text"
            value={newTableLabel}
            onChange={(e) => setNewTableLabel(e.target.value)}
            placeholder="Enter new table label (e.g., '14' or 'A3')"
            style={{
              flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)',
              padding: '14px', borderRadius: '12px', color: 'white', fontSize: '16px'
            }}
          />
          <button type="submit" style={{
            background: `linear-gradient(135deg, ${theme.accentPurple}, ${theme.accentPink})`, border: 'none', color: 'white',
            padding: '14px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer'
          }}>
            Add Table
          </button>
        </form>
      </div>
    </div>
  );
}