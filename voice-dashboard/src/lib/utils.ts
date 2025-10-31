import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Phone number utilities
export function formatPhoneNumber(phoneNumber: string): string {
  // +90 ile başlayan numaraları düzenle
  if (phoneNumber.startsWith('+90')) {
    const cleaned = phoneNumber.slice(3)
    return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  // +44 ile başlayan numaraları düzenle
  if (phoneNumber.startsWith('+44')) {
    const cleaned = phoneNumber.slice(3)
    return `+44 ${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  return phoneNumber
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false
  }
  
  const cleaned = phoneNumber.trim()
  
  // +90 (Türkiye) formatı kontrolü
  if (cleaned.startsWith('+90')) {
    const digits = cleaned.slice(3).replace(/\D/g, '')
    return digits.length === 10 && digits.startsWith('5')
  }
  
  // +44 (İngiltere) formatı kontrolü
  if (cleaned.startsWith('+44')) {
    const digits = cleaned.slice(3).replace(/\D/g, '')
    return digits.length >= 9 && digits.length <= 11
  }
  
  // Diğer formatlar için temel kontrol
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(cleaned.replace(/\s/g, ''))
}

// Timestamp formatting
export function formatTimestamp(timestamp?: string | number | null): string {
  if (!timestamp || timestamp === null) {
    return 'Bilinmiyor'
  }
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
    
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return 'Geçersiz tarih'
    }
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days} gün önce`
    } else if (hours > 0) {
      return `${hours} saat önce`
    } else if (minutes > 0) {
      return `${minutes} dakika önce`
    } else if (seconds > 0) {
      return `${seconds} saniye önce`
    } else {
      return 'Şimdi'
    }
  } catch (error) {
    return 'Hata'
  }
}

// Call status color mapping
export function getCallStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    initiated: 'bg-blue-100 text-blue-800',
    ringing: 'bg-yellow-100 text-yellow-800',
    answered: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    busy: 'bg-red-100 text-red-800',
    'no-answer': 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
    canceled: 'bg-gray-100 text-gray-800',
    unknown: 'bg-gray-100 text-gray-800'
  }
  
  return statusColors[status] || statusColors.unknown
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

// Format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
}
