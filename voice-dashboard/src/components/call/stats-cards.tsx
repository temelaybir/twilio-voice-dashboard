import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, CheckCircle, XCircle, Mic, AlertTriangle } from 'lucide-react'
import type { CallStats } from '@/types'

interface StatsCardsProps {
  stats: CallStats
  loading?: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Toplam Çağrı',
      value: stats.totalCalls,
      description: 'Son 24 saat',
      icon: Phone,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Onaylanan',
      value: stats.confirmedAppointments,
      description: 'Randevu onayı',
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'İptal Edilen',
      value: stats.cancelledAppointments,
      description: 'Randevu iptali',
      icon: XCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: 'Sesli Mesaj',
      value: stats.voicemailRequests,
      description: 'Mesaj bırakıldı',
      icon: Mic,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Başarısız',
      value: stats.failedCalls,
      description: 'Ulaşılamayan',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-md ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.textColor}`} />
                </div>
                <div className="flex-1">
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 w-12 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{card.value}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 