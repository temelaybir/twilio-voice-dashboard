'use client'

import type {
  EmailTemplate,
  EmailList,
  EmailSubscriber,
  EmailCampaign,
  EmailStats,
  CampaignStats,
  BulkSubscriberResult,
  TemplateFormData,
  ListFormData,
  SubscriberFormData,
  CampaignFormData
} from '@/types/email'

// API URL formatını düzelt
const getApiBaseUrl = () => {
  // Production URL - www ile kullan (redirect sorunu için)
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.happysmileclinics.net'
  if (envUrl.endsWith('/api')) {
    return envUrl
  }
  if (envUrl.endsWith('/api/')) {
    return envUrl.slice(0, -1)
  }
  return `${envUrl.replace(/\/$/, '')}/api`
}

const API_BASE_URL = getApiBaseUrl()

// ==================== TEMPLATES ====================

export async function getTemplates(category?: string): Promise<{ success: boolean; data: EmailTemplate[] }> {
  const params = new URLSearchParams()
  if (category) params.append('category', category)
  
  const response = await fetch(`${API_BASE_URL}/email/templates?${params}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function getTemplate(id: number): Promise<{ success: boolean; data: EmailTemplate }> {
  const response = await fetch(`${API_BASE_URL}/email/templates/${id}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function createTemplate(template: TemplateFormData): Promise<{ success: boolean; data: EmailTemplate }> {
  const response = await fetch(`${API_BASE_URL}/email/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function updateTemplate(id: number, template: Partial<TemplateFormData>): Promise<{ success: boolean; data: EmailTemplate }> {
  console.log('🔵 updateTemplate called:', { id, template })
  console.log('🔵 Language being sent:', template.language)
  
  const response = await fetch(`${API_BASE_URL}/email/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  })
  const data = await response.json()
  
  console.log('🟢 updateTemplate response:', data)
  console.log('🟢 Response language:', data.data?.language)
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function deleteTemplate(id: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/templates/${id}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// ==================== LISTS ====================

export async function getLists(): Promise<{ success: boolean; data: EmailList[] }> {
  const response = await fetch(`${API_BASE_URL}/email/lists`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function getList(id: number): Promise<{ success: boolean; data: EmailList }> {
  const response = await fetch(`${API_BASE_URL}/email/lists/${id}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function createList(list: ListFormData): Promise<{ success: boolean; data: EmailList }> {
  const response = await fetch(`${API_BASE_URL}/email/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function updateList(id: number, list: Partial<ListFormData>): Promise<{ success: boolean; data: EmailList }> {
  const response = await fetch(`${API_BASE_URL}/email/lists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function deleteList(id: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/lists/${id}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// ==================== SUBSCRIBERS ====================

export async function getSubscribers(
  listId?: number,
  status?: string,
  page = 1,
  limit = 50
): Promise<{
  success: boolean
  data: EmailSubscriber[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const params = new URLSearchParams()
  if (listId) params.append('listId', listId.toString())
  if (status) params.append('status', status)
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  
  const response = await fetch(`${API_BASE_URL}/email/subscribers?${params}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function createSubscriber(subscriber: SubscriberFormData): Promise<{ success: boolean; data: EmailSubscriber }> {
  const response = await fetch(`${API_BASE_URL}/email/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscriber)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function bulkCreateSubscribers(
  subscribers: Array<Partial<SubscriberFormData>>,
  listId: number
): Promise<{ success: boolean; data: BulkSubscriberResult }> {
  const url = `${API_BASE_URL}/email/subscribers/bulk`
  console.log('🔵 [bulkCreateSubscribers] URL:', url)
  console.log('🔵 [bulkCreateSubscribers] listId:', listId, 'subscribers count:', subscribers.length)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribers, listId })
  })
  
  console.log('🔵 [bulkCreateSubscribers] Response status:', response.status, response.statusText)
  console.log('🔵 [bulkCreateSubscribers] Response headers:', Object.fromEntries(response.headers.entries()))
  
  // Response text olarak al, sonra JSON parse et
  const responseText = await response.text()
  console.log('🔵 [bulkCreateSubscribers] Response text (first 500 chars):', responseText.substring(0, 500))
  
  let data
  try {
    data = JSON.parse(responseText)
  } catch (parseError) {
    console.error('🔴 [bulkCreateSubscribers] JSON Parse Error:', parseError)
    console.error('🔴 [bulkCreateSubscribers] Full response:', responseText)
    throw new Error(`API JSON parse hatası: ${responseText.substring(0, 100)}`)
  }
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function updateSubscriber(id: number, subscriber: Partial<SubscriberFormData>): Promise<{ success: boolean; data: EmailSubscriber }> {
  const response = await fetch(`${API_BASE_URL}/email/subscribers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscriber)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function deleteSubscriber(id: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/subscribers/${id}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Toplu abone sil
export async function bulkDeleteSubscribers(ids: number[]): Promise<{ success: boolean; deletedCount: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/subscribers/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Listedeki tüm aboneleri sil
export async function deleteAllSubscribersInList(listId: number): Promise<{ success: boolean; deletedCount: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/subscribers/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId })
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// XLS/XLSX dosyasını parse et
export async function parseXlsFile(file: File): Promise<{
  success: boolean
  data: Array<{ firstName?: string; lastName?: string; email?: string; phone?: string; city?: string }>
  total: number
  headers: string[]
}> {
  const response = await fetch(`${API_BASE_URL}/email/subscribers/parse-xls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Listedeki telefon numaralarını getir (Voice Dashboard için)
export async function getListPhones(listId: number): Promise<{
  success: boolean
  data: Array<{ phone: string; name: string; city: string }>
  list: { id: number; name: string }
  total: number
}> {
  const response = await fetch(`${API_BASE_URL}/email/lists/${listId}/phones`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// ==================== CAMPAIGNS ====================

export async function getCampaigns(
  status?: string,
  page = 1,
  limit = 20
): Promise<{
  success: boolean
  data: EmailCampaign[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  
  const response = await fetch(`${API_BASE_URL}/email/campaigns?${params}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function getCampaign(id: number): Promise<{ success: boolean; data: EmailCampaign }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function createCampaign(campaign: CampaignFormData): Promise<{ success: boolean; data: EmailCampaign }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaign)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function updateCampaign(id: number, campaign: Partial<CampaignFormData>): Promise<{ success: boolean; data: EmailCampaign }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaign)
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function deleteCampaign(id: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}`, {
    method: 'DELETE'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export interface SendCampaignResult {
  success: boolean
  message: string
  completed: boolean
  totalRecipients: number
  sentCount: number
  batchSent: number
  remaining: number
  failedCount: number
  shouldContinue: boolean
}

export async function sendCampaign(id: number): Promise<SendCampaignResult> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/send`, {
    method: 'POST'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// Auto-continue: Kampanyayı tamamlanana kadar göndermeye devam et
export async function sendCampaignWithAutoContinue(
  id: number, 
  onProgress?: (result: SendCampaignResult) => void
): Promise<SendCampaignResult> {
  let lastResult: SendCampaignResult | null = null
  
  while (true) {
    const result = await sendCampaign(id)
    lastResult = result
    
    // Progress callback
    if (onProgress) {
      onProgress(result)
    }
    
    // Tamamlandıysa veya devam etmemeli ise dur
    if (result.completed || !result.shouldContinue) {
      break
    }
    
    // Kısa bir bekleme (rate limit için)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return lastResult!
}

export async function pauseCampaign(id: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/pause`, {
    method: 'POST'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function resumeCampaign(id: number): Promise<{ success: boolean; message: string; totalSent: number; remaining: number }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/resume`, {
    method: 'POST'
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function getCampaignStats(id: number): Promise<{ success: boolean; data: CampaignStats }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/stats`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// ==================== STATS & TEST ====================

export async function getEmailStats(): Promise<{ success: boolean; data: EmailStats }> {
  const response = await fetch(`${API_BASE_URL}/email/stats`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

export async function sendTestEmail(
  to: string,
  subject?: string,
  html?: string
): Promise<{ success: boolean; message: string; messageId: string }> {
  const response = await fetch(`${API_BASE_URL}/email/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html })
  })
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

// ==================== CONFIRMATIONS ====================

export interface ConfirmationStats {
  total: number
  pending: number
  confirmed: number
  cancelled: number
  rescheduled: number
}

export interface ConfirmationFilters {
  listId?: number
  city?: string
  search?: string
  status?: string
}

export interface ConfirmationFilterOptions {
  cities: string[]
  lists: Array<{ id: number; name: string; city?: string }>
}

export async function getConfirmations(filters?: ConfirmationFilters): Promise<{
  success: boolean
  data: EmailSubscriber[]
  stats: ConfirmationStats
  filteredStats: ConfirmationStats
  filters: ConfirmationFilterOptions
}> {
  const params = new URLSearchParams()
  if (filters?.listId) params.append('listId', filters.listId.toString())
  if (filters?.city) params.append('city', filters.city)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.status) params.append('status', filters.status)
  
  const response = await fetch(`${API_BASE_URL}/email/confirmations?${params}`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

