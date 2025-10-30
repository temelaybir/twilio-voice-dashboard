import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { CallHistoryItem, DTMFActionType } from '@/types'

/**
 * Converts call history data to CSV format
 * 
 * @param calls - Array of call history items to convert
 * @returns CSV string with UTF-8 BOM for Excel compatibility
 */
export function convertToCSV(calls: CallHistoryItem[]): string {
  // CSV headers
  const headers = [
    'Execution ID',
    'Call ID',
    'Aranan Numara',
    'Arayan Numara',
    'Durum',
    'Oluşturma Tarihi',
    'Son Aktivite',
    'DTMF Aksiyonları',
    'DTMF Detayları',
    'Toplam Event Sayısı'
  ]

  // Convert data to CSV rows
  const rows = calls.map(call => {
    const dtmfActions = call.dtmfActions
      .map(dtmf => getActionLabel(dtmf.action as DTMFActionType))
      .join('; ')
    
    const dtmfDetails = call.dtmfActions
      .map(dtmf => `${dtmf.digits} (${format(new Date(dtmf.timestamp), 'dd.MM.yyyy HH:mm', { locale: tr })})`)
      .join('; ')

    return [
      call.executionSid,
      call.callSid || '',
      call.to,
      call.from || '',
      getStatusLabel(call.status),
      format(new Date(call.createdAt), 'dd.MM.yyyy HH:mm:ss', { locale: tr }),
      format(new Date(call.lastActivity), 'dd.MM.yyyy HH:mm:ss', { locale: tr }),
      dtmfActions || 'Etkileşim yok',
      dtmfDetails || '-',
      call.events.length.toString()
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n')

  // Add BOM for Excel UTF-8 compatibility
  return '\ufeff' + csvContent
}

/**
 * Gets human-readable label for call status
 * 
 * @param status - Call status
 * @returns Turkish label for the status
 */
function getStatusLabel(status?: string): string {
  switch (status) {
    case 'completed':
      return 'Tamamlandı'
    case 'busy':
      return 'Meşgul'
    case 'no-answer':
      return 'Yanıtsız'
    case 'failed':
      return 'Başarısız'
    case 'canceled':
      return 'İptal'
    default:
      return status || 'Bilinmiyor'
  }
}

/**
 * Gets human-readable label for DTMF action
 * 
 * @param action - DTMF action type
 * @returns Turkish label for the action
 */
function getActionLabel(action: DTMFActionType): string {
  switch (action) {
    case 'confirm_appointment':
      return 'Randevu Onaylandı'
    case 'cancel_appointment':
      return 'Randevu İptal Edildi'
    case 'connect_to_representative':
      return 'Sesli Mesaj İstendi'
    default:
      return action
  }
}

/**
 * Downloads CSV data as a file
 * 
 * @param csvData - CSV content string
 * @param filename - Name of the file to download
 */
export function downloadCSV(csvData: string, filename: string): void {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Exports call history data to CSV file
 * 
 * @param calls - Array of call history items
 * @param filename - Optional custom filename
 */
export function exportCallHistoryToCSV(calls: CallHistoryItem[], filename?: string): void {
  const csvData = convertToCSV(calls)
  const defaultFilename = `cagri-gecmisi-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
  downloadCSV(csvData, filename || defaultFilename)
}

