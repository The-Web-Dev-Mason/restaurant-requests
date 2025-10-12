// src/app/[restaurantSlug]/[tableLabel]/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type RequestType } from '@/lib/supabase'

const cooldownSettings = {
  'toilet_clean': 15, 'ready_to_order': 10, 'table_clean': 10,
  'additional_order': 5, 'replace_cutlery': 5, 'request_sauces': 3
};

const requestOptions = [
  { type: 'table_clean' as RequestType, icon: '🧽', label: 'Clean Table', description: 'Need table cleaned & sanitized', colors: ['#3b82f6', '#06b6d4'], requiresPhoto: false },
  { type: 'toilet_clean' as RequestType, icon: '🚽', label: 'Toilet Issue', description: 'Report restroom problem', colors: ['#ef4444', '#ec4899'], requiresPhoto: true },
  { type: 'ready_to_order' as RequestType, icon: '🍽️', label: 'Ready to Order', description: 'Ready to place our order', colors: ['#10b981', '#059669'], requiresPhoto: false },
  { type: 'additional_order' as RequestType, icon: '➕', label: 'Order More', description: 'Want to add more items', colors: ['#f59e0b', '#d97706'], requiresPhoto: false },
  { type: 'replace_cutlery' as RequestType, icon: '🍴', label: 'New Cutlery', description: 'Need fresh utensils', colors: ['#8b5cf6', '#7c3aed'], requiresPhoto: false },
  { type: 'request_sauces' as RequestType, icon: '🥫', label: 'Sauces & Condiments', description: 'Need sauce or seasonings', colors: ['#6366f1', '#4f46e5'], requiresPhoto: false },
];

interface Restaurant { id: string; name: string; slug: string; }
interface Table { id: string; label: string; restaurant_id: string; }

// ✅ THIS IS THE FIX: We define the 'params' type directly and correctly here,
// which satisfies the strict requirements of the production build.
export default function CustomerPage({ params }: { params: { restaurantSlug: string; tableLabel: string } }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState<RequestType | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<RequestType, { until: Date | null, timeLeft: string }>>({} as any);
  const [showSparkle, setShowSparkle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRestaurantAndTable = async () => {
      setLoading(true);
      try {
        const { data: restaurantData, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', params.restaurantSlug).single();
        if (restaurantError) throw new Error('Restaurant not found');
        setRestaurant(restaurantData);

        const { data: tableData, error: tableError } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantData.id).eq('label', params.tableLabel).single();
        if (tableError) throw new Error('Table not found');
        setTable(tableData);

        await checkCooldowns(tableData.id);
      } catch (error: any) {
        setMessage(`Error: ${error.message}`);
      } finally { setLoading(false) }
    };
    fetchRestaurantAndTable();
  }, [params]);

  useEffect(() => {
    const interval = setInterval(() => {
        setCooldowns(prev => {
          const updated = { ...prev };
          let hasChanges = false;
          for (const type of Object.keys(updated) as RequestType[]) {
            if (updated[type] && updated[type].until) {
                const diff = new Date(updated[type].until!).getTime() - new Date().getTime();
                const minutes = Math.floor(diff / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                const newTimeLeft = diff > 0 ? (minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`) : '';

                if (newTimeLeft !== updated[type].timeLeft) {
                    updated[type] = { ...updated[type], timeLeft: newTimeLeft };
                    if (newTimeLeft === '') updated[type].until = null;
                    hasChanges = true;
                }
            }
          }
          return hasChanges ? updated : prev;
        })
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkCooldowns = async (tableId: string) => {
    const newCooldowns = {} as Record<RequestType, { until: Date | null, timeLeft: string }>;
    for (const option of requestOptions) {
      const { data: lastRequest } = await supabase.from('requests').select('created_at').eq('table_id', tableId).eq('type', option.type).order('created_at', { ascending: false }).limit(1);
      if (lastRequest && lastRequest.length > 0) {
        const lastRequestTime = new Date(lastRequest[0].created_at);
        const cooldownMinutes = cooldownSettings[option.type];
        const cooldownUntil = new Date(lastRequestTime.getTime() + cooldownMinutes * 60 * 1000);
        const now = new Date();
        const diff = cooldownUntil.getTime() - now.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const timeLeft = diff > 0 ? (minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`) : '';
        newCooldowns[option.type] = now < cooldownUntil ? { until: cooldownUntil, timeLeft } : { until: null, timeLeft: '' };
      } else { newCooldowns[option.type] = { until: null, timeLeft: '' } }
    }
    setCooldowns(newCooldowns);
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `toilet-${Date.now()}.${fileExt}`;
    const filePath = `toilet-photos/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const submitRequest = async (requestType: RequestType) => {
    if (!table) return;
    if (cooldowns[requestType]?.until) { setMessage(`⏳ Please wait ${cooldowns[requestType].timeLeft} before making this request again.`); setTimeout(() => setMessage(''), 4000); return }
    const option = requestOptions.find(opt => opt.type === requestType);
    if (option?.requiresPhoto && !photoFile) { setShowPhotoModal(true); return }

    setSubmitting(requestType); setMessage('')
    try {
      let photoUrl = null;
      if (photoFile && option?.requiresPhoto) photoUrl = await uploadPhoto(photoFile);
      const { error } = await supabase.from('requests').insert({ table_id: table.id, type: requestType, photo_url: photoUrl });
      if (error) throw error;

      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 1500);

      setMessage('✨ Request sent! Our team will assist you shortly.');
      closePhotoModal();
      const cooldownMinutes = cooldownSettings[requestType];
      const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);
      setCooldowns(prev => ({ ...prev, [requestType]: { until: cooldownUntil, timeLeft: `${cooldownMinutes}m 0s` } }));
      setTimeout(() => setMessage(''), 4000);
    } catch (error: any) { setMessage(`❌ ${error.message}`) } finally { setSubmitting(null) }
  };

  const closePhotoModal = () => { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null) };
  const isOnCooldown = (requestType: RequestType) => Boolean(cooldowns[requestType]?.until);

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white', background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)' }}>Loading...</div>
  if (message.includes('Error')) return <div style={{ minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'red', background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)' }}>{message}</div>
  if (!restaurant || !table) return <div style={{ minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white', background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)' }}>Restaurant or Table not found</div>

  return (
    <>
      <style jsx global>{`
        body { margin:0; padding:0; font-family: 'Inter', sans-serif; background: linear-gradient(135deg,#0f172a,#1e1b4b,#312e81); }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-25px)} }
        @keyframes sparkleAnim {0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}30%{transform:translate(-50%,-60%) scale(1.2);opacity:1}100%{transform:translate(-50%,-100%) scale(1.5);opacity:0}}
      `}</style>
      
      {showSparkle && <div style={{position:'fixed', top:'40%', left:'50%', transform:'translate(-50%,-50%)', fontSize:'48px', color:'#facc15', animation:'sparkleAnim 1.5s ease-out forwards', pointerEvents:'none', zIndex:2000}}>✨</div>}
      
      <div style={{position:'fixed', top:'-200px', right:'-200px', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', animation:'float 8s ease-in-out infinite'}}></div>
      <div style={{position:'fixed', bottom:'-100px', left:'-150px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)', animation:'float 10s ease-in-out infinite'}}></div>
      
      <div style={{minHeight:'100vh', padding:'24px'}}>
        <div style={{background:'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))', backdropFilter:'blur(30px)', borderRadius:'32px', padding:'48px 40px', textAlign:'center', marginBottom:'32px', boxShadow:'0 25px 60px rgba(0,0,0,0.4)', position:'relative', overflow:'hidden'}}>
          <div style={{fontSize:'56px', marginBottom:'24px', display:'inline-flex', alignItems:'center', justifyContent:'center', width:'100px', height:'100px', background:'linear-gradient(135deg, #8b5cf6,#ec4899)', borderRadius:'28px', animation:'float 3s ease-in-out infinite'}}>🍽️</div>
          <h1 style={{ fontSize:'48px', fontWeight:'800', margin:'16px 0', background:'linear-gradient(135deg,#fff,#c7d2fe)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{restaurant.name}</h1>
          <div style={{display:'inline-flex', alignItems:'center', gap:'12px', background:'rgba(255,255,255,0.15)', padding:'12px 24px', borderRadius:'20px', border:'2px solid rgba(255,255,255,0.2)'}}>
            <span style={{fontSize:'24px'}}>📍</span>
            <span style={{fontSize:'24px', fontWeight:'800', color:'white'}}>Table {table.label}</span>
          </div>
        </div>
        
        {message && <div style={{background: message.includes('✨')?'linear-gradient(135deg,#10b981,#059669)':message.includes('⏳')?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,#ef4444,#dc2626)', color:'white', padding:'24px', borderRadius:'24px', marginBottom:'32px', textAlign:'center', fontSize:'18px', fontWeight:'700', backdropFilter:'blur(20px)', boxShadow:'0 20px 50px rgba(0,0,0,0.3)'}}>{message}</div>}
        
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'24px', marginBottom:'40px'}}>
          {requestOptions.map((option)=>{
            const onCooldown = isOnCooldown(option.type);
            const isSubmittingThis = submitting === option.type;
            return (
              <button key={option.type} onClick={()=>submitRequest(option.type)} disabled={onCooldown || isSubmittingThis} style={{
                background: onCooldown || isSubmittingThis?'rgba(71,85,105,0.3)':`linear-gradient(135deg,${option.colors[0]},${option.colors[1]})`,
                color:'white', borderRadius:'28px', padding:'36px 28px', cursor:onCooldown?'not-allowed':'pointer', boxShadow:onCooldown?'0 10px 30px rgba(0,0,0,0.2)':'0 20px 50px rgba(0,0,0,0.3)', fontSize:'16px', fontWeight:'600', backdropFilter:'blur(20px)', opacity:onCooldown?0.5:1, position:'relative', overflow:'hidden', transition:'all 0.4s'
              }}>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'16px'}}>
                  <div style={{fontSize:'56px', marginBottom:'8px', filter: onCooldown || isSubmittingThis?'grayscale(100%)':'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'}}>
                    {isSubmittingThis?'⏳':onCooldown?'🕒':option.icon}
                  </div>
                  <div style={{fontWeight:'800', fontSize:'22px', marginBottom:'8px'}}>
                    {isSubmittingThis?'Sending Request...':onCooldown?`Wait ${cooldowns[option.type]?.timeLeft}`:option.label}
                  </div>
                  <div style={{fontSize:'15px', opacity:0.95, textAlign:'center', fontWeight:'500'}}>
                    {onCooldown?`Cooldown active • ${cooldownSettings[option.type]} min limit`:option.description}
                    {option.requiresPhoto && !onCooldown && <div style={{marginTop:'8px', fontSize:'13px', opacity:0.9, background:'rgba(0,0,0,0.2)', padding:'6px 12px', borderRadius:'12px', display:'inline-block'}}>📸 Photo required</div>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        
        {showPhotoModal && (
          <div style={{
            position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)',
            backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000, padding:'20px'
          }} onClick={closePhotoModal}>
            <div style={{
              background:'linear-gradient(135deg, rgba(30,27,75,0.6), rgba(59,54,124,0.6))',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius:'28px', padding:'32px', maxWidth:'480px', width:'100%',
              boxShadow:'0 25px 60px rgba(0,0,0,0.4)', color: 'white'
            }} onClick={(e)=>e.stopPropagation()}>
              
              <h3 style={{textAlign:'center', fontSize:'24px', fontWeight:'700', margin:'0 0 24px 0'}}>📸 Report Issue</h3>
              <p style={{textAlign: 'center', margin: '-16px 0 24px 0', color: 'rgba(255,255,255,0.7)', fontSize: '15px'}}>
                A photo helps us resolve this faster.
              </p>
              
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelect} style={{display: 'none'}}/>

              <div onClick={triggerFileInput} style={{
                  cursor:'pointer', border:'2px dashed rgba(255,255,255,0.3)', borderRadius:'16px',
                  padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  minHeight: '200px', background: 'rgba(0,0,0,0.2)', transition: 'background 0.2s'
              }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Photo preview" style={{maxHeight:'200px', borderRadius:'12px', objectFit:'contain'}}/>
                ) : (
                  <div style={{textAlign:'center', color:'rgba(255,255,255,0.7)'}}>
                    <div style={{fontSize:'40px'}}>📷</div>
                    <div style={{marginTop:'8px', fontWeight:'600'}}>Tap to select a photo</div>
                    <div style={{fontSize:'12px', opacity:0.8}}>Or take a new one</div>
                  </div>
                )}
              </div>
              
              <div style={{display:'flex', gap:'16px', marginTop:'24px'}}>
                <button onClick={closePhotoModal} style={{
                  flex:1, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
                  color:'white', padding:'16px', borderRadius:'14px', fontWeight:'700', fontSize:'16px', cursor:'pointer'
                }}>
                  Cancel
                </button>
                <button 
                  onClick={() => submitRequest('toilet_clean')} 
                  disabled={!photoFile || submitting === 'toilet_clean'}
                  style={{
                    flex:2, background:'linear-gradient(135deg, #ef4444, #ec4899)', border:'none',
                    color:'white', padding:'16px', borderRadius:'14px', fontWeight:'700', fontSize:'16px', cursor:'pointer',
                    opacity: (!photoFile || submitting === 'toilet_clean') ? 0.5 : 1
                  }}
                >
                  {submitting === 'toilet_clean' ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}