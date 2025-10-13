'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimePostgresChangesPayload, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// --- Theme and Configurations ---
const theme = {
  bgGradient: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
  cardGlass: 'rgba(30, 27, 75, 0.4)',
  cardBorder: '1px solid rgba(255, 255, 255, 0.15)',
  textPrimary: '#F8FAFC',
  textSecondary: '#A5B4FC',
  accentPurple: '#8b5cf6',
  accentPink: '#ec4899',
  accentGreen: '#10b981',
  accentYellow: '#f59e0b',
  accentRed: '#ef4444',
  heatmapEmpty: 'rgba(255, 255, 255, 0.08)',
};

interface Table { id: string; label: string; restaurant_id: string; }
interface Request { id: string; type: RequestType; status: 'pending' | 'in_progress' | 'completed'; photo_url: string | null; created_at: string; table_id: string; tables: { label: string; restaurants: { id: string, name: string } } }
type RequestType = 'table_clean' | 'toilet_clean' | 'ready_to_order' | 'additional_order' | 'replace_cutlery' | 'request_sauces';
type Priority = 'low' | 'medium' | 'high';

const requestConfig: Record<RequestType, { icon: string; label: string; color: string; priority: Priority }> = {
  table_clean: { icon: '🧽', label: 'Table Cleaning', color: '#3b82f6', priority: 'medium' },
  toilet_clean: { icon: '🚽', label: 'Restroom Issue', color: '#ef4444', priority: 'high' },
  ready_to_order: { icon: '🍽️', label: 'Ready to Order', color: '#10b981', priority: 'high' },
  additional_order: { icon: '➕', label: 'Additional Order', color: '#f59e0b', priority: 'medium' },
  replace_cutlery: { icon: '🍴', label: 'Cutlery Request', color: '#8b5cf6', priority: 'low' },
  request_sauces: { icon: '🥫', label: 'Condiments', color: '#6366f1', priority: 'low' },
};

const statusConfig = {
  pending: { label: 'Pending', color: theme.accentYellow, icon: '⏳' },
  in_progress: { label: 'In Progress', color: theme.accentPurple, icon: '🔄' },
  completed: { label: 'Completed', color: theme.accentGreen, icon: '✅' },
};

// --- Sub-components (Heatmap & Modals) ---
const TableHeatmap = ({ tables, requests, onTableClick }: { tables: Table[], requests: Request[], onTableClick: (table: Table) => void }) => {
  const priorityOrder: Record<Priority, number> = { high: 2, medium: 1, low: 0 };
  const priorityColors: Record<Priority, string> = { high: theme.accentRed, medium: theme.accentYellow, low: theme.accentPurple };

  const tableData = useMemo(() => {
    const activeRequests = requests.filter(r => r.status === 'pending' || r.status === 'in_progress');
    const requestsByTable = new Map<string, { table: Table; highestPriority: Priority }>();

    for (const req of activeRequests) {
      if (!req.tables) continue;
      const current = requestsByTable.get(req.table_id);
      const reqPriority = requestConfig[req.type].priority;
      if (!current || priorityOrder[reqPriority] > priorityOrder[current.highestPriority]) {
        requestsByTable.set(req.table_id, { table: { id: req.table_id, label: req.tables.label, restaurant_id: req.tables.restaurants.id }, highestPriority: reqPriority });
      }
    }
    return requestsByTable;
  }, [requests, priorityOrder]);

  const sortedTables = [...tables].sort((a, b) => {
    const aLabel = a.label.match(/\d+/g)?.join('') ?? '';
    const bLabel = b.label.match(/\d+/g)?.join('') ?? '';
    return parseInt(aLabel) - parseInt(bLabel);
  });

  return (
    <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '24px', backdropFilter: 'blur(20px)', marginBottom: '32px' }}>
      <h2 style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '20px', marginBottom: '20px' }}>Restaurant Floor</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
        {sortedTables.map(table => {
          const data = tableData.get(table.id);
          const color = data ? priorityColors[data.highestPriority] : theme.heatmapEmpty;
          const hasRequests = !!data;
          return (
            <button key={table.id} onClick={() => hasRequests && onTableClick(table)} disabled={!hasRequests}
              style={{
                aspectRatio: '1 / 1', background: color, border: `1px solid ${hasRequests ? color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px', color: theme.textPrimary, fontWeight: 'bold', fontSize: '18px',
                cursor: hasRequests ? 'pointer' : 'default', transition: 'all 0.2s ease',
                opacity: hasRequests ? 1 : 0.6, transform: hasRequests ? 'scale(1)' : 'scale(0.95)',
              }}
              title={hasRequests ? `Table ${table.label} has active requests` : `Table ${table.label} - No requests`}>
              {table.label}
            </button>
          )
        })}
      </div>
    </div>
  )
};

const RequestDetailsModal = ({ table, requests, onClose, onClearAll }: { table: Table | null, requests: Request[], onClose: () => void, onClearAll: (tableId: string) => void }) => {
  if (!table) return null;
  const activeRequests = requests.filter(r => r.table_id === table.id && r.status !== 'completed');
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '24px 32px', width: '100%', maxWidth: '450px', color: theme.textPrimary }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 800 }}>Table {table.label} Requests</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '8px' }}>
          {activeRequests.length > 0 ? activeRequests.map(req => {
            const cfg = requestConfig[req.type];
            const st = statusConfig[req.status];
            return (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '24px' }}>{cfg.icon}</div>
                <div style={{ flex: 1, fontWeight: 600 }}>{cfg.label}</div>
                <div style={{ padding: '4px 10px', background: `${st.color}33`, color: st.color, borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{st.label}</div>
              </div>
            )
          }) : <p style={{ textAlign: 'center', color: theme.textSecondary }}>No active requests for this table.</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
          {activeRequests.length > 0 && (<button onClick={() => onClearAll(table.id)} className="modal-action-button" style={{ background: `linear-gradient(135deg, ${theme.accentGreen}, #059669)`, border: 'none', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>✅ Clear All Requests</button>)}
          <button onClick={onClose} className="modal-action-button" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
};

export default function StaffRequestsPage(): JSX.Element {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedTableForModal, setSelectedTableForModal] = useState<Table | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);

      if (currentUser) {
        const getProfileAndData = async () => {
          const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', currentUser.id).single();
          if (profile?.restaurant_id) {
            setRestaurantId(profile.restaurant_id);
          } else {
            setAuthLoading(false);
          }
        };
        getProfileAndData();
      } else {
        setAuthLoading(false);
        if (typeof window !== 'undefined') router.push('/login');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ✅ FIXED: Realtime subscription with proper filtering
  useEffect(() => {
    if (!restaurantId) return;

    const fetchInitialData = async (resId: string) => {
      const { data: tableData } = await supabase.from('tables').select('*').eq('restaurant_id', resId);
      if (tableData) setTables(tableData);
      const tableIds = tableData?.map(t => t.id) || [];
      if (tableIds.length > 0) {
        const { data: requestData } = await supabase.from('requests').select('*, tables(*, restaurants(*))').in('table_id', tableIds).order('created_at', { ascending: false });
        if (requestData) setRequests(requestData as Request[]);
      }
      setAuthLoading(false);
    };

    fetchInitialData(restaurantId);
    
    const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<Request>) => {
      // ✅ Only process if this request belongs to one of our tables
      const isOurTable = tables.some(t => t.id === payload.new?.table_id || t.id === (payload.old as { table_id?: string })?.table_id);
      if (!isOurTable) return;

      if (payload.eventType === 'INSERT') fetchSingleRequestWithDetails(payload.new.id);
      if (payload.eventType === 'UPDATE') fetchSingleRequestWithDetails(payload.new.id);
      if (payload.eventType === 'DELETE') setRequests(prev => prev.filter(r => r.id !== (payload.old as { id: string }).id));
    };

    // ✅ Subscribe to ALL requests, filter in the handler
    const channel = supabase
      .channel(`requests_for_restaurant_${restaurantId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'requests'
      }, handleRealtimeUpdate)
      .subscribe();
      
    return () => { supabase.removeChannel(channel) };
  }, [restaurantId, tables]);

  const fetchSingleRequestWithDetails = async (requestId: string) => {
    const { data, error } = await supabase.from('requests').select(`*, tables(*, restaurants(*))`).eq('id', requestId).single();
    if (!error && data) {
      setRequests(prev => {
        const existing = prev.find(r => r.id === requestId);
        if (existing) {
          return prev.map(r => r.id === requestId ? data as Request : r);
        }
        return [data as Request, ...prev];
      });
    }
  };

  const playTone = () => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  const updateRequestStatus = async (id: string, newStatus: Request['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    await supabase.from('requests').update({ status: newStatus }).eq('id', id);
    if (newStatus === 'completed') playTone();
  };
  
  const clearAllRequestsForTable = async (tableId: string) => {
    setRequests(prev => prev.map(r => r.table_id === tableId && r.status !== 'completed' ? { ...r, status: 'completed' } : r));
    setSelectedTableForModal(null);
    playTone();
    await supabase.from('requests').update({ status: 'completed' }).eq('table_id', tableId).in('status', ['pending', 'in_progress']);
  };

  const clearAllCompletedRequests = async () => {
    const tableIdsForThisRestaurant = tables.map(t => t.id);
    
    // Optimistic UI update
    setRequests(prev => prev.filter(r => r.status !== 'completed'));
    playTone();

    // Send the specific, filtered DELETE command
    await supabase
      .from('requests')
      .delete()
      .eq('status', 'completed')
      .in('table_id', tableIdsForThisRestaurant);
  };

  const getTimeAgo = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const filteredRequests = useMemo(() => filter === 'all' ? requests : requests.filter(r => r.status === filter), [requests, filter]);
  const completedCount = useMemo(() => requests.filter(r => r.status === 'completed').length, [requests]);

  const formattedTime = currentTime.toLocaleTimeString('en-GB');
  const formattedDate = currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', background: theme.bgGradient, color: theme.textPrimary }}>
        <div style={{ textAlign: 'center', background: theme.cardGlass, padding: '40px', borderRadius: '24px', backdropFilter: 'blur(20px)' }}>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 20px', border: `6px solid ${theme.accentPurple}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontWeight: 700, fontSize: '20px' }}>Verifying session...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body { margin: 0; background: ${theme.bgGradient}; font-family: 'Inter', sans-serif; color: ${theme.textPrimary}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .action-button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px 16px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .action-button:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
      `}</style>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '32px', margin: 0 }}>🍽️ Staff Dashboard</h1>
          <div style={{ background: theme.cardGlass, border: theme.cardBorder, padding: '10px 20px', borderRadius: '14px', textAlign: 'right' }}>
            <div style={{color: theme.textPrimary, fontWeight: '600', fontSize: '18px'}}>{formattedTime}</div>
            <div style={{color: theme.textSecondary, fontSize: '12px'}}>{formattedDate}</div>
          </div>
        </header>

        <TableHeatmap tables={tables} requests={requests} onTableClick={(table) => setSelectedTableForModal(table)} />
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '12px 20px', borderRadius: '14px', fontWeight: 700, border: 'none', background: filter === f ? `linear-gradient(135deg, ${theme.accentPurple}, ${theme.accentPink})` : 'rgba(255,255,255,0.1)', color: theme.textPrimary, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f.replace('_', ' ')}
            </button>
          ))}
          {completedCount > 0 && ( <button onClick={clearAllCompletedRequests} style={{ marginLeft: 'auto', padding: '12px 20px', borderRadius: '14px', fontWeight: 700, border: 'none', background: `linear-gradient(135deg, ${theme.accentRed}, ${theme.accentPink})`, color: theme.textPrimary, cursor: 'pointer' }}>Clear {completedCount} Completed</button> )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '80px 40px', textAlign: 'center', color: theme.textSecondary, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: '20px', color: theme.textPrimary }}>No requests here!</div>
            </div>
          ) : filteredRequests.map(req => {
            const cfg = requestConfig[req.type] || {};
            const st = statusConfig[req.status];
            if (!req.tables) return null;
            return (
              <div key={req.id} style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', backdropFilter: 'blur(20px)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${cfg.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{cfg.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: theme.textPrimary }}>{cfg.label}</div>
                      <div style={{ fontSize: '14px', color: theme.textSecondary }}>Table {req.tables.label}</div>
                    </div>
                  </div>
                  <div title={`Status: ${st.label}`} style={{ padding: '6px 12px', background: `${st.color}33`, color: st.color, borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>{st.icon}</div>
                </div>
                <div style={{ fontSize: '14px', color: theme.textSecondary }}>{req.tables.restaurants.name} • {getTimeAgo(req.created_at)}</div>
                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', flexWrap: 'wrap' }}>
                  {req.photo_url && ( <button className="action-button" onClick={() => setSelectedPhoto(req.photo_url)}>📷 View Photo</button> )}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {req.status === 'pending' && ( <button className="action-button" onClick={() => updateRequestStatus(req.id, 'in_progress')} style={{background: `${theme.accentPurple}99`}}>Start</button> )}
                    {req.status !== 'completed' && ( <button className="action-button" onClick={() => updateRequestStatus(req.id, 'completed')} style={{background: `${theme.accentGreen}99`}}>Complete</button> )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {selectedPhoto && ( <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}><img src={selectedPhoto} alt="Request detail" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.2)' }}/></div> )}
      <RequestDetailsModal 
        table={selectedTableForModal}
        requests={requests}
        onClose={() => setSelectedTableForModal(null)}
        onClearAll={clearAllRequestsForTable}
      />
    </>
  );
}
