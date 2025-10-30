'use client'

import { useEffect, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
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

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // LocalStorage'dan event'leri yükle
  const loadEventsFromStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('twilio-events')
      if (stored) {
        try {
          const parsedEvents = JSON.parse(stored)
          setEvents(parsedEvents)
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
      console.log('📡 Database\'den event geçmişi yükleniyor...')
      const response = await getEventHistory()
      
      if (response.success && response.data) {
        console.log(`✅ ${response.data.length} event veritabanından yüklendi`)
        setEvents(response.data)
        
        // LocalStorage'a da kaydet
        if (typeof window !== 'undefined') {
          localStorage.setItem('twilio-events', JSON.stringify(response.data))
        }
      } else {
        console.error('❌ Event geçmişi yüklenemedi:', response.error)
      }
    } catch (error) {
      console.error('❌ Event geçmişi yükleme hatası:', error)
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('twilio-events')
    }
  }, [])

  // Socket bağlantısı kur
  useEffect(() => {
    // VERCEL LIMITATION: Socket.IO Vercel serverless'te çalışmaz
    // Production'da Socket.IO devre dışı
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (isProduction) {
      console.warn('⚠️ Socket.IO production\'da devre dışı (Vercel serverless limitation)')
      setIsConnected(false)
      return
    }

    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Socket.IO connected')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected')
      setIsConnected(false)
    })

    // Status update events - normal webhook events
    newSocket.on('statusUpdate', (data: any) => {
      console.log('📞 Status update:', data)
      const newEvent: SocketEvent = {
        ...data,
        time: new Date().toISOString(),
        type: 'status'
      }
      
      setEvents(currentEvents => {
        const updated = [newEvent, ...currentEvents]
        return updated
      })
    })

    // DTMF events
    newSocket.on('dtmfUpdate', (data: any) => {
      console.log('🔢 DTMF update:', data)
      const newEvent: SocketEvent = {
        ...data,
        time: new Date().toISOString(),
        type: 'dtmf'
      }
      
      setEvents(currentEvents => {
        const updated = [newEvent, ...currentEvents]
        return updated
      })
    })

    // Bulk call completion events
    newSocket.on('bulkCallCompleted', (data: any) => {
      console.log('📞 Bulk call completed:', data)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Component mount olduğunda localStorage'dan yükle ve 500 event'i API'den çek
  useEffect(() => {
    loadEventsFromStorage()
    loadEventHistory() // Otomatik olarak database'den yükle
  }, [loadEventsFromStorage, loadEventHistory])

  // Events değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (isHydrated && events.length > 0) {
      saveEventsToStorage(events)
    }
  }, [events, isHydrated, saveEventsToStorage])

  return {
    socket,
    isConnected,
    events,
    clearEvents,
    isHydrated,
    loadEventHistory
  }
} 