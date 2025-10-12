'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Restaurant { id: string; name: string; slug: string }
interface Table { id: string; label: string; restaurant_id: string }

export default function QRGeneratorPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [baseUrl, setBaseUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPrintView, setShowPrintView] = useState(false)

  useEffect(() => { setBaseUrl(window.location.origin); fetchRestaurants() }, [])
  useEffect(() => { if (selectedRestaurant) fetchTables(selectedRestaurant.id) }, [selectedRestaurant])

  const fetchRestaurants = async () => {
    const { data, error } = await supabase.from('restaurants').select('*').order('name')
    if (!error) setRestaurants(data || [])
    setLoading(false)
  }

  const fetchTables = async (restaurantId: string) => {
    const { data, error } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('label')
    if (!error) setTables(data || [])
    setSelectedTables([])
  }

  const toggleTable = (tableId: string) => setSelectedTables(prev => prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId])
  const selectAllTables = () => setSelectedTables(tables.map(t => t.id))
  const clearSelection = () => setSelectedTables([])
  const generateQRUrl = (restaurantSlug: string, tableLabel: string) => `${baseUrl}/u/${restaurantSlug}/${tableLabel}`
  const getQRCodeUrl = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  const getSelectedTablesData = () => tables.filter(t => selectedTables.includes(t.id))

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        top: '-200px',
        right: '-200px',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      <div style={{
        width: '80px',
        height: '80px',
        border: '6px solid rgba(255,255,255,0.2)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '24px'
      }}></div>
      <h3 style={{ color: 'white', fontWeight: 700, fontSize: '24px', margin: 0 }}>Loading QR Generator</h3>
      <style jsx>{`
        @keyframes spin { 0%{transform:rotate(0deg);}100%{transform:rotate(360deg);} }
        @keyframes float { 0%,100%{transform:translateY(0px);}50%{transform:translateY(-30px);} }
      `}</style>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 50px rgba(59, 130, 246, 0.8), 0 0 100px rgba(59, 130, 246, 0.5); }
        }

        .glass-card {
          border-radius: 24px;
          padding: 32px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .glass-card:hover::before {
          left: 100%;
        }

        .glass-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .glass-card.selected {
          background: rgba(59, 130, 246, 0.25);
          border-color: #3b82f6;
          animation: glow 2s ease-in-out infinite;
        }

        .btn-primary {
          padding: 18px 36px;
          font-weight: 700;
          font-size: 16px;
          border-radius: 16px;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 20px 45px rgba(59, 130, 246, 0.5);
        }

        .btn-secondary {
          padding: 18px 36px;
          font-weight: 700;
          font-size: 16px;
          border-radius: 16px;
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          color: white;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #c7d2fe 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .step-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          border-radius: 16px;
          font-weight: 800;
          font-size: 24px;
          color: white;
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
          margin-right: 16px;
        }

        .floating-orb {
          position: fixed;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: float 8s ease-in-out infinite;
        }

        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left:0; top:0; width:100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Floating Background Orbs */}
      {!showPrintView && (
        <>
          <div className="floating-orb" style={{ width: '600px', height: '600px', top: '-300px', right: '-200px' }}></div>
          <div className="floating-orb" style={{ width: '400px', height: '400px', bottom: '-100px', left: '-150px', animationDelay: '2s' }}></div>
          <div className="floating-orb" style={{ width: '300px', height: '300px', top: '40%', right: '10%', animationDelay: '4s' }}></div>
        </>
      )}

      <div style={{ 
        minHeight: '100vh', 
        padding: '32px', 
        maxWidth: '1400px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {!showPrintView ? (
          <>
            {/* Hero Header */}
            <div className="glass-card" style={{ 
              marginBottom: '48px', 
              textAlign: 'center',
              animation: 'fadeInUp 0.8s ease-out',
              cursor: 'default'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                borderRadius: '30px',
                fontSize: '56px',
                marginBottom: '24px',
                boxShadow: '0 20px 50px rgba(59, 130, 246, 0.4)',
                animation: 'float 3s ease-in-out infinite'
              }}>
                📱
              </div>
              <h1 className="gradient-text" style={{ 
                fontSize: '56px', 
                fontWeight: '800',
                marginBottom: '16px',
                letterSpacing: '-1px'
              }}>
                QR Code Generator
              </h1>
              <p style={{ 
                fontSize: '20px', 
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500',
                marginBottom: baseUrl ? '24px' : '0'
              }}>
                Create stunning QR codes for your restaurant tables
              </p>
              {baseUrl && (
                <div style={{ 
                  marginTop: '24px', 
                  fontFamily: 'monospace', 
                  color: '#c7d2fe',
                  fontSize: '16px',
                  fontWeight: '600',
                  padding: '16px 24px', 
                  borderRadius: '16px', 
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'inline-block'
                }}>
                  🌐 {baseUrl}
                </div>
              )}
            </div>

            {/* Restaurant Selection */}
            <div style={{ 
              marginBottom: '48px',
              animation: 'fadeInUp 0.8s ease-out 0.2s both'
            }}>
              <h2 style={{ 
                fontSize: '32px', 
                color: 'white', 
                marginBottom: '24px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span className="step-badge">1</span>
                Select Restaurant
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '24px'
              }}>
                {restaurants.map((r, i) => (
                  <div 
                    key={r.id} 
                    className={`glass-card ${selectedRestaurant?.id === r.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRestaurant(r)}
                    style={{
                      animation: `scaleIn 0.5s ease-out ${i * 0.1}s both`
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        background: selectedRestaurant?.id === r.id 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        flexShrink: 0
                      }}>
                        🏪
                      </div>
                      <div>
                        <div style={{ 
                          fontWeight: 700, 
                          fontSize: '22px',
                          color: 'white',
                          marginBottom: '4px'
                        }}>
                          {r.name}
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '14px', 
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontWeight: '500'
                        }}>
                          /{r.slug}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Selection */}
            {selectedRestaurant && (
              <div style={{
                animation: 'scaleIn 0.6s ease-out'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <h2 style={{ 
                    fontSize: '32px', 
                    color: 'white',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    margin: 0
                  }}>
                    <span className="step-badge">2</span>
                    Select Tables ({selectedTables.length}/{tables.length})
                  </h2>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary" onClick={selectAllTables}>
                      ✨ Select All
                    </button>
                    <button className="btn-secondary" onClick={clearSelection}>
                      🗑️ Clear All
                    </button>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '20px'
                }}>
                  {tables.map((t, i) => (
                    <div 
                      key={t.id} 
                      className={`glass-card ${selectedTables.includes(t.id) ? 'selected' : ''}`}
                      onClick={() => toggleTable(t.id)}
                      style={{
                        textAlign: 'center',
                        animation: `scaleIn 0.4s ease-out ${i * 0.05}s both`
                      }}
                    >
                      <div style={{
                        fontSize: '48px', 
                        marginBottom: '12px',
                        filter: selectedTables.includes(t.id) 
                          ? 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.6))'
                          : 'none'
                      }}>
                        {selectedTables.includes(t.id) ? '✅' : '📍'}
                      </div>
                      <div style={{
                        fontWeight: 700, 
                        fontSize: '20px',
                        color: 'white'
                      }}>
                        Table {t.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Button */}
            {selectedTables.length > 0 && (
              <div style={{
                textAlign: 'center', 
                marginTop: '48px',
                animation: 'scaleIn 0.6s ease-out'
              }}>
                <button 
                  className="btn-primary" 
                  onClick={() => setShowPrintView(true)}
                  style={{
                    fontSize: '22px',
                    padding: '24px 48px',
                    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                    boxShadow: '0 20px 50px rgba(236, 72, 153, 0.5)'
                  }}
                >
                  🎨 Generate QR Codes ({selectedTables.length})
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="print-area">
            {/* Print Header */}
            <div className="no-print" style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px',
              marginBottom: '40px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div>
                <h2 style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  color: 'white',
                  marginBottom: '8px'
                }}>
                  🖨️ Ready to Print!
                </h2>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '18px',
                  margin: 0
                }}>
                  {getSelectedTablesData().length} QR codes for {selectedRestaurant?.name}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-primary" onClick={() => window.print()}>
                  🖨️ Print Now
                </button>
                <button className="btn-secondary" onClick={() => setShowPrintView(false)}>
                  ← Back
                </button>
              </div>
            </div>

            {/* QR Codes Grid */}
            <div style={{
              display: 'grid', 
              gap: '32px', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
            }}>
              {getSelectedTablesData().map(t => {
                const url = generateQRUrl(selectedRestaurant!.slug, t.label)
                const qrUrl = getQRCodeUrl(url)
                return (
                  <div 
                    key={t.id} 
                    style={{
                      background: 'white',
                      borderRadius: '24px',
                      padding: '32px',
                      textAlign: 'center',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
                      border: '3px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box'
                    }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #fae8ff 100%)',
                      padding: '24px',
                      borderRadius: '20px',
                      marginBottom: '20px'
                    }}>
                      <img 
                        src={qrUrl} 
                        alt={`Table ${t.label}`} 
                        style={{
                          width: '200px', 
                          height: '200px', 
                          display: 'block',
                          margin: '0 auto',
                          borderRadius: '16px'
                        }}
                      />
                    </div>
                    <div style={{
                      fontWeight: 800, 
                      fontSize: '24px',
                      background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '8px'
                    }}>
                      {selectedRestaurant?.name}
                    </div>
                    <div style={{
                      fontWeight: 700, 
                      fontSize: '28px',
                      background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: '16px'
                    }}>
                      Table {t.label}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#64748b',
                      marginBottom: '16px',
                      lineHeight: '1.6'
                    }}>
                      📱 Scan to make requests<br/>
                      <span style={{ fontSize: '12px' }}>Clean table • Order food • Request sauces</span>
                    </div>
                    <div style={{
                      fontFamily: 'monospace', 
                      fontSize: '11px', 
                      padding: '12px', 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px', 
                      wordBreak: 'break-all',
                      color: '#475569'
                    }}>
                      {url}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}