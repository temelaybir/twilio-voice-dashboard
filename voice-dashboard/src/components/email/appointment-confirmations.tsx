'use client'

import { useState, useEffect } from 'react'
import { getConfirmations, ConfirmationStats } from '@/lib/email-api'
import { EmailSubscriber } from '@/types/email'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  MapPin,
  User,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  CalendarCheck
} from 'lucide-react'

interface AppointmentConfirmationsProps {
  onRefresh?: () => void
}

export function AppointmentConfirmations({ onRefresh }: AppointmentConfirmationsProps) {
  const [confirmations, setConfirmations] = useState<EmailSubscriber[]>([])
  const [stats, setStats] = useState<ConfirmationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await getConfirmations()
      setConfirmations(result.data)
      setStats(result.stats)
    } catch (error) {
      console.error('Onay verileri yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredConfirmations = filter === 'all' 
    ? confirmations 
    : confirmations.filter(c => c.confirmationStatus === filter)

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> Potwierdzone</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Anulowane</Badge>
      case 'rescheduled':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><RefreshCw className="h-3 w-3 mr-1" /> Zmiana terminu</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><AlertCircle className="h-3 w-3 mr-1" /> Oczekuje</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Randevu Onayları
            </CardTitle>
            <CardDescription>
              Email ile gönderilen randevu onay durumlarını takip edin
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Toplam</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{stats.pending}</div>
              <div className="text-sm text-blue-600">Beklemede</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
              <div className="text-sm text-green-600">Onaylandı</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{stats.rescheduled}</div>
              <div className="text-sm text-amber-600">Değişiklik</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.cancelled}</div>
              <div className="text-sm text-red-600">İptal</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Tümü' },
            { value: 'pending', label: 'Beklemede' },
            { value: 'confirmed', label: 'Onaylı' },
            { value: 'rescheduled', label: 'Değişiklik' },
            { value: 'cancelled', label: 'İptal' },
          ].map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
              className={filter === f.value ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredConfirmations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz randevu onayı yok</p>
            </div>
          ) : (
            filteredConfirmations.map(confirmation => (
              <div 
                key={confirmation.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">
                        {confirmation.fullName || confirmation.firstName || 'Bilinmiyor'}
                      </span>
                      {getStatusBadge(confirmation.confirmationStatus)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                      {confirmation.eventDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-medium">{confirmation.eventDate}</span>
                        </div>
                      )}
                      {confirmation.eventTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-medium">{confirmation.eventTime}</span>
                        </div>
                      )}
                      {confirmation.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-500" />
                          <span>{confirmation.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {confirmation.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{confirmation.phone}</span>
                        </div>
                      )}
                      {confirmation.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{confirmation.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    {confirmation.confirmationNote && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5" />
                          <span className="text-gray-800">{confirmation.confirmationNote}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmed At */}
                  {confirmation.confirmedAt && (
                    <div className="text-right text-xs text-gray-500">
                      <div className="font-medium">Yanıt:</div>
                      <div>{new Date(confirmation.confirmedAt).toLocaleString('tr-TR')}</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
