import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mic, 
  Hash,
  Calendar,
  Activity,
  Download,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { getCallDetails } from '@/lib/api'
import type { CallDetails, CallHistoryEvent, DTMFActionType, APIResponse } from '@/types'

interface CallDetailModalProps {
  executionSid: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CallDetailModal({ executionSid, open, onOpenChange }: CallDetailModalProps) {
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && executionSid) {
      fetchCallDetails()
    }
  }, [open, executionSid])

  const fetchCallDetails = async () => {
    if (!executionSid) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await getCallDetails(executionSid) as APIResponse<CallDetails>
      
      if (response.success && response.data) {
        setCallDetails(response.data)
      } else {
        setError(response.error || 'Detaylar yüklenirken hata oluştu')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Detaylar yüklenirken hata oluştu'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string, action?: string) => {
    switch (eventType) {
      case 'status':
        return <Phone className="h-4 w-4 text-blue-500" />
      case 'dtmf':
        if (action === 'confirm_appointment') {
          return <CheckCircle className="h-4 w-4 text-green-500" />
        } else if (action === 'cancel_appointment') {
          return <XCircle className="h-4 w-4 text-red-500" />
        } else if (action === 'connect_to_representative') {
          return <Mic className="h-4 w-4 text-purple-500" />
        }
        return <Hash className="h-4 w-4 text-gray-500" />
      case 'flow':
        return <Activity className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getEventBadge = (event: CallHistoryEvent) => {
    if (event.eventType === 'dtmf' && event.action) {
      switch (event.action as DTMFActionType) {
        case 'confirm_appointment':
          return <Badge className="bg-green-100 text-green-800">Randevu Onaylandı</Badge>
        case 'cancel_appointment':
          return <Badge variant="destructive">Randevu İptal Edildi</Badge>
        case 'connect_to_representative':
          return <Badge variant="secondary">Sesli Mesaj Talebi</Badge>
      }
    }
    
    if (event.eventType === 'status' && event.status) {
      switch (event.status) {
        case 'initiated':
          return <Badge variant="outline">Başlatıldı</Badge>
        case 'ringing':
          return <Badge className="bg-yellow-100 text-yellow-800">Çalıyor</Badge>
        case 'answered':
          return <Badge className="bg-blue-100 text-blue-800">Yanıtlandı</Badge>
        case 'completed':
          return <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>
        case 'busy':
          return <Badge variant="destructive">Meşgul</Badge>
        case 'no-answer':
          return <Badge variant="secondary">Yanıtsız</Badge>
        case 'failed':
          return <Badge variant="destructive">Başarısız</Badge>
        default:
          return <Badge variant="outline">{event.status}</Badge>
      }
    }

    return <Badge variant="outline">{event.eventType}</Badge>
  }

  const formatPhoneNumber = (phoneNumber: string) => {
    if (phoneNumber.startsWith('+90')) {
      const cleaned = phoneNumber.slice(3)
      return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    return phoneNumber
  }

  const getPhoneInitials = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^\d]/g, '')
    return cleaned.slice(-2)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Çağrı Detayları
          </DialogTitle>
          <DialogDescription>
            {executionSid && `Execution ID: ${executionSid}`}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-center mt-4 text-muted-foreground">Detaylar yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchCallDetails}
              className="mt-4"
            >
              Tekrar Dene
            </Button>
          </div>
        )}

        {callDetails && (
          <div className="space-y-6">
            {/* Call Info Header */}
            <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {getPhoneInitials(callDetails.to)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {formatPhoneNumber(callDetails.to)}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {(() => {
                      try {
                        if (!callDetails.createdAt) {
                          return 'Geçersiz tarih'
                        }
                        const date = new Date(callDetails.createdAt)
                        if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
                          return 'Geçersiz tarih'
                        }
                        return format(date, 'dd MMMM yyyy HH:mm', { locale: tr })
                      } catch {
                        return 'Geçersiz tarih'
                      }
                    })()}
                  </div>
                  {callDetails.callSid && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      Call SID: {callDetails.callSid.slice(-12)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Çağrı Zaman Çizelgesi
              </h4>
              
              {callDetails.timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Henüz olay kaydı bulunmuyor
                </p>
              ) : (
                <div className="space-y-4">
                  {callDetails.timeline.map((event, index) => (
                    <div key={event.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-muted flex items-center justify-center">
                        {getEventIcon(event.eventType, event.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getEventBadge(event)}
                            {event.dtmfDigits && (
                              <Badge variant="outline" className="text-xs">
                                Tuş: {event.dtmfDigits}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(() => {
                              try {
                                if (!event.timestamp) {
                                  return 'Geçersiz tarih'
                                }
                                const date = new Date(event.timestamp)
                                if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
                                  return 'Geçersiz tarih'
                                }
                                return format(date, 'HH:mm:ss', { locale: tr })
                              } catch {
                                return 'Geçersiz tarih'
                              }
                            })()}
                          </div>
                        </div>
                        
                        {event.action && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.action === 'confirm_appointment' && 'Kullanıcı randevusunu onayladı'}
                            {event.action === 'cancel_appointment' && 'Kullanıcı randevusunu iptal etti'}
                            {event.action === 'connect_to_representative' && 'Kullanıcı sesli mesaj bırakmak istedi'}
                          </p>
                        )}
                        
                        {event.eventData && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Ham veri
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(event.eventData, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 