'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, Mail, Send, AlertCircle } from 'lucide-react'
import type { EmailStats } from '@/types/email'

interface EmailStatsCardsProps {
  stats: EmailStats | null
  loading?: boolean
}

export function EmailStatsCards({ stats, loading }: EmailStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      title: 'Şablonlar',
      value: stats.templates,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Listeler',
      value: stats.lists,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Aktif Aboneler',
      value: stats.activeSubscribers,
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Kampanyalar',
      value: stats.campaigns,
      icon: Send,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Günlük Kota',
      value: `${stats.rateLimit.remaining}/${stats.rateLimit.dailyLimit}`,
      icon: AlertCircle,
      color: stats.rateLimit.remaining < 100 ? 'text-red-600' : 'text-teal-600',
      bgColor: stats.rateLimit.remaining < 100 ? 'bg-red-100' : 'bg-teal-100',
      subtitle: `${stats.rateLimit.dailyUsed} kullanıldı`
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}













