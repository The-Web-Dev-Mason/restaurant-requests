// src/app/staff/reports/page.tsx

'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
}

interface RequestTypeData {
  name: string
  value: number
}

interface HourlyData {
  hour: string
  requests: number
}

const requestLabels: { [key: string]: string } = {
  table_clean: 'Table Clean',
  toilet_clean: 'Toilet Issue',
  ready_to_order: 'Ready to Order',
  additional_order: 'Order More',
  replace_cutlery: 'New Cutlery',
  request_sauces: 'Sauces',
}

const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#6366f1'];

export default function ReportsPage() {
  const [requestTypeData, setRequestTypeData] = useState<RequestTypeData[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ Function to fetch and format analytics data
  const fetchAnalyticsData = async () => {
    const { data: typeData, error: typeError } = await supabase.rpc('get_request_type_counts')
    if (typeData) {
      const formattedTypeData = typeData.map((item: any) => ({
        name: requestLabels[item.type] || item.type,
        value: item.request_count,
      }));
      setRequestTypeData(formattedTypeData);
    } else if (typeError) {
      console.error("Error fetching request type counts:", typeError);
    }

    const { data: hourlyRawData, error: hourlyError } = await supabase.rpc('get_hourly_request_counts')
    if (hourlyRawData) {
      const formattedHourlyData = hourlyRawData.map((item: any) => ({
        hour: `${item.hour}:00`,
        requests: item.request_count,
      })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
      setHourlyData(formattedHourlyData);
    } else if (hourlyError) {
      console.error("Error fetching hourly counts:", hourlyError);
    }
    
    setLoading(false)
  }

  useEffect(() => {
    // Load initial data
    fetchAnalyticsData()

    // ✅ SET UP REAL-TIME LISTENER: Refresh data whenever requests table changes
    const channel = supabase
      .channel('requests_changes')
      .on('postgres_changes', 
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'requests'
        },
        () => {
          // When any request changes, refetch the analytics
          fetchAnalyticsData()
        }
      )
      .subscribe()

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', background: theme.bgGradient, color: theme.textPrimary }}>
      <div style={{ textAlign: 'center', background: theme.cardGlass, padding: '40px', borderRadius: '24px', backdropFilter: 'blur(20px)' }}>
        <div style={{ width: '60px', height: '60px', margin: '0 auto 20px', border: `6px solid ${theme.accentPurple}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontWeight: 700, fontSize: '20px' }}>Loading Reports...</div>
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', fontFamily: "'Inter', sans-serif", color: theme.textPrimary }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '32px', margin: 0 }}>📊 Analytics & Reports</h1>
          <button 
            onClick={() => fetchAnalyticsData()}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', padding: '10px 20px', borderRadius: '12px', fontWeight: '600',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            🔄 Refresh Data
          </button>
        </header>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '24px', backdropFilter: 'blur(20px)' }}>
            <h2 style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '20px', marginBottom: '20px' }}>Most Common Requests</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={requestTypeData} cx="50%" cy="50%" labelLine={false} innerRadius={60} outerRadius={110} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">
                  {requestTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 27, 75, 0.8)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px'
                  }}
                  itemStyle={{ color: theme.textPrimary }} 
                />
                <Legend 
                  iconSize={10} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right" 
                  wrapperStyle={{ color: theme.textPrimary }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: theme.cardGlass, border: theme.cardBorder, borderRadius: '24px', padding: '24px', backdropFilter: 'blur(20px)' }}>
            <h2 style={{ color: theme.textPrimary, fontWeight: 700, fontSize: '20px', marginBottom: '20px' }}>Peak Request Hours</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="hour" stroke={theme.textSecondary} fontSize={12} />
                <YAxis stroke={theme.textSecondary} fontSize={12} />
                <Tooltip
                  cursor={{fill: 'rgba(139, 92, 246, 0.2)'}}
                  contentStyle={{
                    background: 'rgba(30, 27, 75, 0.8)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px'
                  }}
                  labelStyle={{ color: theme.textSecondary }}
                  itemStyle={{ color: theme.textPrimary }}
                />
                <Bar dataKey="requests" fill="url(#colorUv)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.accentPurple} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={theme.accentPink} stopOpacity={0.8}/>
          </linearGradient>
        </defs>
      </svg>
    </>
  )
}
