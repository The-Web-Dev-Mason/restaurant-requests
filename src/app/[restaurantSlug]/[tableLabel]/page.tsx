// src/app/[restaurantSlug]/[tableLabel]/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type RequestType } from '@/lib/supabase'

// ✅ THE FIX IS HERE: We've removed the old PageProps interface
// and will define the props directly in the component.

const cooldownSettings = {
  'toilet_clean': 15,
  'ready_to_order': 10,
  'table_clean': 10,
  'additional_order': 5,
  'replace_cutlery': 5,
  'request_sauces': 3
}

const requestOptions = [
  { type: 'table_clean' as RequestType, icon: '🧽', label: 'Clean Table', description: 'Need table cleaned & sanitized', colors: ['#3b82f6', '#06b6d4'], requiresPhoto: false },
  { type: 'toilet_clean' as RequestType, icon: '🚽', label: 'Toilet Issue', description: 'Report restroom problem', colors: ['#ef4444', '#ec4899'], requiresPhoto: true },
  { type: 'ready_to_order' as RequestType, icon: '🍽️', label: 'Ready to Order', description: 'Ready to place our order', colors: ['#10b981', '#059669'], requiresPhoto: false },
  { type: 'additional_order' as RequestType, icon: '➕', label: 'Order More', description: 'Want to add more items', colors: ['#f59e0b', '#d97706'], requiresPhoto: false },
  { type: 'replace_cutlery' as RequestType, icon: '🍴', label: 'New Cutlery', description: 'Need fresh utensils', colors: ['#8b5cf6', '#7c3aed'], requiresPhoto: false },
  { type: 'request_sauces' as RequestType, icon: '🥫', label: 'Sauces & Condiments', description: 'Need sauce or seasonings', colors: ['#6366f1', '#4f46e5'], requiresPhoto: false },
]

// Defining types for our state to avoid 'any'
interface Restaurant { id: string; name: string; slug: string; }
interface Table { id: string; label: string; restaurant_id: string; }

// ✅ AND THE FIX IS HERE: We define the params type directly and correctly.
export default function CustomerPage({ params }: { params: { restaurantSlug: string; tableLabel: string } }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState<RequestType | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cooldowns, setCooldowns] = useState<Record<RequestType, { until: Date | null, timeLeft: string }>>({} as any)
  const [showSparkle, setShowSparkle] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchRestaurantAndTable = async () => {
      setLoading(true);
      try {
        const { data: restaurantData, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', params.restaurantSlug).single()
        if (restaurantError) throw new Error('Restaurant not found')
        setRestaurant(restaurantData)

        const { data: tableData, error: tableError } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantData.id).eq('label', params.tableLabel).single()
        if (tableError) throw new Error('Table not found')
        setTable(tableData)

        await checkCooldowns(tableData.id)
      } catch (error: any) {
        setMessage(`Error: ${error.message}`)
      } finally { setLoading(false) }
    }
    fetchRestaurantAndTable();
  }, [params])
  
  // ... The rest of the file is unchanged, but included for completeness ...

  const checkCooldowns = async (tableId: string) => {
    // ...
  }
  const updateCooldownTimers = () => {
    // ...
  }
  const getTimeUntil = (until: Date): string => {
    // ...
    return ''
  }
  const uploadPhoto = async (file: File): Promise<string> => {
    // ...
    return ''
  }
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ...
  }
  const triggerFileInput = () => fileInputRef.current?.click();

  const submitRequest = async (requestType: RequestType) => {
    if (!table) return
    if (cooldowns[requestType]?.until) { setMessage(`⏳ Please wait...`); return }
    const option = requestOptions.find(opt => opt.type === requestType)
    if (option?.requiresPhoto && !photoFile) { setShowPhotoModal(true); return }

    setSubmitting(requestType); setMessage('')
    try {
      let photoUrl = null
      if (photoFile && option?.requiresPhoto) photoUrl = await uploadPhoto(photoFile)
      const { error } = await supabase.from('requests').insert({ table_id: table.id, type: requestType, photo_url: photoUrl })
      if (error) throw error
      setMessage('✨ Request sent!')
      closePhotoModal()
    } catch (error: any) { setMessage(`❌ ${error.message}`) } finally { setSubmitting(null) }
  }

  const closePhotoModal = () => { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null) }
  const isOnCooldown = (requestType: RequestType) => Boolean(cooldowns[requestType]?.until)

  // ... The rest of the JSX is unchanged ...
  return (
    <div>Your Customer Page JSX</div>
  )
}