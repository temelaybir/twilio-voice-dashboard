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

export async function startCall(phoneNumber: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: phoneNumber }),
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

export async function startBulkCall(phoneNumbers: string[]) {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/start-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumbers }),
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