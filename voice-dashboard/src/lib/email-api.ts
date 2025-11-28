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
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
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
  const response = await fetch(`${API_BASE_URL}/email/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  })
  const data = await response.json()
  
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
  const response = await fetch(`${API_BASE_URL}/email/subscribers/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribers, listId })
  })
  const data = await response.json()
  
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

export async function sendCampaign(id: number): Promise<{ success: boolean; message: string; totalRecipients: number }> {
  const response = await fetch(`${API_BASE_URL}/email/campaigns/${id}/send`, {
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

export async function getConfirmations(): Promise<{
  success: boolean
  data: EmailSubscriber[]
  stats: ConfirmationStats
}> {
  const response = await fetch(`${API_BASE_URL}/email/confirmations`)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  
  return data
}

