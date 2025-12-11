'use client'

// API URL formatını düzelt: /api varsa bırak, yoksa ekle
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  // Eğer zaten /api ile bitiyorsa, olduğu gibi kullan
  if (envUrl.endsWith('/api')) {
    return envUrl
  }
  // Eğer /api/ ile bitiyorsa, sadece /api yap
  if (envUrl.endsWith('/api/')) {
    return envUrl.slice(0, -1) // Son / karakterini kaldır
  }
  // Eğer /api yoksa, ekle
  return `${envUrl.replace(/\/$/, '')}/api`
}

const API_BASE_URL = getApiBaseUrl()

export type TwilioRegion = 'poland' | 'uk'

export async function startCall(phoneNumber: string, region: TwilioRegion = 'poland') {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: phoneNumber, region }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

export async function startBulkCall(phoneNumbers: string[], region: TwilioRegion = 'poland') {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/start-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumbers, region }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

// Call History API fonksiyonları
export async function getCallHistory(limit = 20, offset = 0) {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

export async function getCallDetails(executionSid: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/history/${executionSid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

export async function getCallStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

/**
 * Fetches all call history records for export (no pagination)
 * 
 * @returns Promise with all call history data
 * @throws Error if the request fails
 */
export async function getAllCallHistoryForExport() {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/history/export/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

// Legacy function - compatibility için - EVENTS için
export async function getEventHistory(page = 1, limit = 100) {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/events?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    // Backend'den gelen format: { success, data: { events: [], pagination } }
    // Frontend beklediği format: { success, data: [] }
    return {
      success: data.success,
      data: data.data?.events || [],
      pagination: data.data?.pagination
    }
  } catch (error) {
    throw error
  }
}

/**
 * Günlük çağrı özetini getirir (Twilio API'den doğrudan)
 * 
 * @param date - YYYY-MM-DD formatında tarih (opsiyonel, varsayılan: bugün)
 * @param direction - 'all', 'inbound', 'outbound' (opsiyonel, varsayılan: 'all')
 * @returns Promise with daily summary data
 * @throws Error if the request fails
 */
export async function getDailySummary(date?: string, direction: 'all' | 'inbound' | 'outbound' = 'all') {
  try {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (direction) params.append('direction', direction)
    
    const queryString = params.toString()
    const url = `${API_BASE_URL}/calls/daily-summary${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

/**
 * Aylık çağrı özetini getirir
 * 
 * @param year - Yıl (opsiyonel, varsayılan: bu yıl)
 * @param month - Ay (1-12, opsiyonel, varsayılan: bu ay)
 * @returns Promise with monthly summary data
 * @throws Error if the request fails
 */
export async function getMonthlySummary(year?: number, month?: number) {
  try {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (month) params.append('month', month.toString())
    
    const queryString = params.toString()
    const url = `${API_BASE_URL}/calls/monthly-summary${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    throw error
  }
}

// ==================== TOPLU ARAMA (CALL QUEUE) ====================

export interface CallQueue {
  id: number
  name: string
  listId: number | null
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed'
  totalNumbers: number
  calledCount: number
  successCount: number
  failedCount: number
  currentBatch: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StartQueueResult {
  success: boolean
  message: string
  completed: boolean
  queueId: number
  totalNumbers: number
  calledCount: number
  successCount: number
  failedCount: number
  batchSent: number
  batchFailed: number
  remaining: number
  shouldContinue: boolean
}

// Listelerden toplu arama kuyruğu oluştur
export async function createBulkCallFromLists(listIds: number[]): Promise<{
  success: boolean
  message: string
  queueId: number
  totalNumbers: number
  lists: Array<{ id: number; name: string }>
}> {
  const response = await fetch(`${API_BASE_URL}/calls/start-bulk-from-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listIds })
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Kuyruğu başlat (batch bazlı)
export async function startCallQueue(queueId: number): Promise<StartQueueResult> {
  const response = await fetch(`${API_BASE_URL}/calls/queue/${queueId}/start`, {
    method: 'POST'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Auto-continue: Tamamlanana kadar devam et
export async function startCallQueueWithAutoContinue(
  queueId: number,
  onProgress?: (result: StartQueueResult) => void
): Promise<StartQueueResult> {
  let lastResult: StartQueueResult | null = null
  
  while (true) {
    const result = await startCallQueue(queueId)
    lastResult = result
    
    if (onProgress) {
      onProgress(result)
    }
    
    if (result.completed || !result.shouldContinue) {
      break
    }
    
    // Batch'ler arası bekleme (10 arama için ~15 saniye)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  return lastResult!
}

// Tüm kuyrukları listele
export async function getCallQueues(): Promise<{ success: boolean; data: CallQueue[] }> {
  const response = await fetch(`${API_BASE_URL}/calls/queues`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Kuyruk detayı
export async function getCallQueue(queueId: number): Promise<{
  success: boolean
  data: CallQueue & {
    phoneNumbers: string[]
    results: Array<{ to: string; executionSid: string; time: string }>
    errors: Array<{ to: string; error: string; code?: string; time: string }>
  }
}> {
  const response = await fetch(`${API_BASE_URL}/calls/queue/${queueId}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Kuyruğu duraklat
export async function pauseCallQueue(queueId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/calls/queue/${queueId}/pause`, {
    method: 'POST'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Kuyruğu sil
export async function deleteCallQueue(queueId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/calls/queue/${queueId}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}