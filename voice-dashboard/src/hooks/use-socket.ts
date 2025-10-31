'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getEventHistory } from '@/lib/api'

interface SocketEvent {
  execution_sid?: string
  To?: string
  to?: string
  status?: string
  event?: string
  time: string
  type?: 'dtmf' | 'status' | 'flow'
  digits?: string
  action?: string
}

interface UseSocketReturn {
  socket: null  // Artık socket yok, ama API uyumluluğu için tutuyoruz
  isConnected: boolean  // API'ye bağlantı durumu
  events: SocketEvent[]
  clearEvents: () => void
  isHydrated: boolean
  loadEventHistory: () => Promise<void>
  isPolling: boolean
  lastUpdate: Date | null
}

// Polling interval (milisaniye)
const POLLING_INTERVAL = 5000 // 5 saniye
const CONNECTION_CHECK_INTERVAL = 10000 // 10 saniye

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null)
  const lastEventCountRef = useRef<number>(0)

  // LocalStorage'dan event'leri yükle
  const loadEventsFromStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('twilio-events')
      if (stored) {
        try {
          const parsedEvents = JSON.parse(stored)
          setEvents(parsedEvents)
          lastEventCountRef.current = parsedEvents.length
        } catch (error) {
          console.error('Event parsing error:', error)
        }
      }
      setIsHydrated(true)
    }
  }, [])

  // API'den event geçmişini yükle
  const loadEventHistory = useCallback(async () => {
    try {
      setIsPolling(true)
      console.log('📡 Database\'den event geçmişi yükleniyor...')
      const response = await getEventHistory()
      
      if (response.success && response.data) {
        const newEventCount = response.data.length
        console.log(`✅ ${newEventCount} event veritabanından yüklendi`)
        
        // Yeni event varsa bildirim
        if (lastEventCountRef.current > 0 && newEventCount > lastEventCountRef.current) {
          const newEventsCount = newEventCount - lastEventCountRef.current
          console.log(`🔔 ${newEventsCount} yeni event alındı!`)
        }
        
        lastEventCountRef.current = newEventCount
        setEvents(response.data)
        setLastUpdate(new Date())
        setIsConnected(true)
        
        // LocalStorage'a da kaydet
        if (typeof window !== 'undefined') {
          localStorage.setItem('twilio-events', JSON.stringify(response.data))
        }
      } else {
        console.error('❌ Event geçmişi yüklenemedi:', response.error)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('❌ Event geçmişi yükleme hatası:', error)
      setIsConnected(false)
    } finally {
      setIsPolling(false)
    }
  }, [])

  // Event'leri localStorage'a kaydet
  const saveEventsToStorage = useCallback((newEvents: SocketEvent[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('twilio-events', JSON.stringify(newEvents))
    }
  }, [])

  // Event'leri temizle
  const clearEvents = useCallback(() => {
    setEvents([])
    lastEventCountRef.current = 0
    if (typeof window !== 'undefined') {
      localStorage.removeItem('twilio-events')
    }
  }, [])

  // API bağlantısını kontrol et
  const checkConnection = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/`, {
        method: 'GET',
        cache: 'no-cache'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'online') {
          setIsConnected(true)
          console.log('✅ Backend API bağlantısı aktif')
        } else {
          setIsConnected(false)
        }
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('❌ Backend bağlantı kontrolü başarısız:', error)
      setIsConnected(false)
    }
  }, [])

  // Component mount olduğunda localStorage'dan yükle ve ilk event'leri çek
  useEffect(() => {
    loadEventsFromStorage()
    loadEventHistory() // İlk yükleme
    checkConnection() // Bağlantı kontrolü
  }, [loadEventsFromStorage, loadEventHistory, checkConnection])

  // Polling mekanizması - düzenli aralıklarla event'leri güncelle
  useEffect(() => {
    // Polling'i başlat
    pollingIntervalRef.current = setInterval(() => {
      loadEventHistory()
    }, POLLING_INTERVAL)

    // Bağlantı kontrolü
    connectionCheckRef.current = setInterval(() => {
      checkConnection()
    }, CONNECTION_CHECK_INTERVAL)

    console.log(`🔄 Auto-refresh başlatıldı (${POLLING_INTERVAL/1000}s aralıkla)`)

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        console.log('🛑 Auto-refresh durduruldu')
      }
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current)
      }
    }
  }, [loadEventHistory, checkConnection])

  // Events değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (isHydrated && events.length > 0) {
      saveEventsToStorage(events)
    }
  }, [events, isHydrated, saveEventsToStorage])

  return {
    socket: null, // Socket.IO artık yok
    isConnected,  // API bağlantı durumu
    events,
    clearEvents,
    isHydrated,
    loadEventHistory,
    isPolling,
    lastUpdate
  }
}
