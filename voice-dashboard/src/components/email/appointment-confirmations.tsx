'use client'

import { useState, useEffect } from 'react'
import { getConfirmations, ConfirmationStats } from '@/lib/email-api'
import { EmailSubscriber } from '@/types/email'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Loader2
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Potwierdzone</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Anulowane</Badge>
      case 'rescheduled':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><RefreshCw className="h-3 w-3 mr-1" /> Zmiana terminu</Badge>
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Oczekuje</Badge>
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
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-slate-400">Łącznie</div>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{stats.pending}</div>
            <div className="text-sm text-blue-300">Oczekuje</div>
          </div>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{stats.confirmed}</div>
            <div className="text-sm text-green-300">Potwierdzone</div>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
            <div className="text-2xl font-bold text-amber-400">{stats.rescheduled}</div>
            <div className="text-sm text-amber-300">Zmiana</div>
          </div>
          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{stats.cancelled}</div>
            <div className="text-sm text-red-300">Anulowane</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Wszystkie' },
          { value: 'pending', label: 'Oczekujące' },
          { value: 'confirmed', label: 'Potwierdzone' },
          { value: 'rescheduled', label: 'Zmiana terminu' },
          { value: 'cancelled', label: 'Anulowane' },
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
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Odśwież
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredConfirmations.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Brak wizyt do wyświetlenia</p>
          </div>
        ) : (
          filteredConfirmations.map(confirmation => (
            <div 
              key={confirmation.id}
              className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">
                      {confirmation.fullName || confirmation.firstName || 'Nieznany'}
                    </span>
                    {getStatusBadge(confirmation.confirmationStatus)}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                    {confirmation.eventDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {confirmation.eventDate}
                      </div>
                    )}
                    {confirmation.eventTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {confirmation.eventTime}
                      </div>
                    )}
                    {confirmation.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {confirmation.city}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    {confirmation.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {confirmation.phone}
                      </div>
                    )}
                    {confirmation.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {confirmation.email}
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  {confirmation.confirmationNote && (
                    <div className="mt-2 p-2 bg-slate-700/30 rounded-lg text-sm">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-400 mt-0.5" />
                        <span className="text-slate-300">{confirmation.confirmationNote}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmed At */}
                {confirmation.confirmedAt && (
                  <div className="text-right text-xs text-slate-500">
                    <div>Odpowiedź:</div>
                    <div>{new Date(confirmation.confirmedAt).toLocaleString('pl-PL')}</div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

