import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import type { DailySummaryStats } from '@/types'

interface SummaryStatsCardsProps {
  stats: DailySummaryStats
  loading?: boolean
}

/**
 * Günlük çağrı özeti istatistik kartları bileşeni
 */
export function SummaryStatsCards({ stats, loading = false }: SummaryStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}s ${minutes}d ${secs}sn`
    }
    if (minutes > 0) {
      return `${minutes}d ${secs}sn`
    }
    return `${secs}sn`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Toplam Çağrı */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Toplam Çağrı</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.overall.totalCalls}</div>
          <p className="text-xs text-muted-foreground">
            Toplam Süre: {formatDuration(stats.overall.totalDuration)}
          </p>
        </CardContent>
      </Card>

      {/* Inbound Çağrılar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gelen Çağrılar</CardTitle>
          <PhoneIncoming className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inbound.total}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="default" className="bg-green-600 text-xs">
              ✓ {stats.inbound.answered}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              ✗ {stats.inbound.missed}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kaçırılma: {stats.inbound.missedRatio.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* Outbound Çağrılar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Giden Çağrılar</CardTitle>
          <PhoneOutgoing className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.outbound.total}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="default" className="bg-green-600 text-xs">
              ✓ {stats.outbound.completed}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              ✗ {stats.outbound.failed}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ort. Süre: {stats.outbound.avgDuration}sn
          </p>
        </CardContent>
      </Card>

      {/* Ortalama Çağrı Süresi */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ortalama Süre</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round((stats.inbound.avgDuration + stats.outbound.avgDuration) / 2)}sn
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-blue-600" />
              In: {stats.inbound.avgDuration}sn
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-purple-600" />
              Out: {stats.outbound.avgDuration}sn
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            En Uzun: {Math.max(stats.inbound.maxDuration, stats.outbound.maxDuration)}sn
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

