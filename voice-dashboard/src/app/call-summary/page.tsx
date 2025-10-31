'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, AlertCircle, TrendingUp, ArrowLeft } from 'lucide-react'

import { getDailySummary } from '@/lib/api'
import { SummaryStatsCards } from '@/components/call-summary/summary-stats-cards'
import { SummaryCallsTable } from '@/components/call-summary/summary-calls-table'
import { DateFilter } from '@/components/call-summary/date-filter'

import type { DailySummaryResponse } from '@/types'

/**
 * Günlük çağrı özeti dashboard sayfası
 * Twilio API'den doğrudan veri çeker
 */
export default function CallSummaryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [summaryData, setSummaryData] = useState<DailySummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Veriyi çek
  const fetchSummary = async (date: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getDailySummary(date, 'all')
      setSummaryData(data)
      setLastRefresh(new Date())
    } catch (err: any) {
      setError(err.message || 'Veri çekilirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Component mount kontrolü (hydration hatası önleme)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // İlk yükleme
  useEffect(() => {
    fetchSummary(selectedDate)
  }, [selectedDate])

  // Tarih değiştirme
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  // Manuel yenileme
  const handleRefresh = () => {
    fetchSummary(selectedDate)
  }

  // Son yenileme zamanını formatla
  const formatLastRefresh = () => {
    if (!lastRefresh) return '--:--:--'
    return lastRefresh.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ana Sayfa
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                📊 Günlük Çağrı Özeti
                <Badge variant="outline" className="text-xs">
                  Happy Smile Clinics
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1">
                Twilio API'den gerçek zamanlı çağrı verileri
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground" suppressHydrationWarning>
              Son Güncelleme: {isMounted ? formatLastRefresh() : '--:--:--'}
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>

        <Separator />

        {/* Hata Mesajı */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Hata Oluştu</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    onClick={handleRefresh}
                    size="sm"
                    variant="outline"
                    className="mt-3"
                  >
                    Tekrar Dene
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ana İçerik Grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sol Taraf - Filtreler */}
          <div className="lg:col-span-1 space-y-4">
            <DateFilter selectedDate={selectedDate} onDateChange={handleDateChange} />
            
            {summaryData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Hızlı İstatistikler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Toplam Çağrı:</span>
                    <Badge variant="secondary">{summaryData.stats.overall.totalCalls}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gelen:</span>
                    <Badge className="bg-blue-600">{summaryData.stats.inbound.total}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Giden:</span>
                    <Badge className="bg-purple-600">{summaryData.stats.outbound.total}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cevaplanan:</span>
                    <Badge className="bg-green-600">{summaryData.stats.inbound.answered}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Kaçırılan:</span>
                    <Badge variant="destructive">{summaryData.stats.inbound.missed}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bilgi Kartı */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Bilgi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Bu panel, Twilio API'den doğrudan gerçek zamanlı veri çeker. 
                  Tüm inbound ve outbound çağrılar (TalkYto dahil) listelenir.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Taraf - İstatistikler ve Tablo */}
          <div className="lg:col-span-3 space-y-6">
            {/* İstatistik Kartları */}
            {summaryData && (
              <SummaryStatsCards stats={summaryData.stats} loading={loading} />
            )}
            
            {loading && !summaryData && (
              <SummaryStatsCards stats={null as any} loading={true} />
            )}

            {/* Çağrı Tablosu */}
            {summaryData && (
              <SummaryCallsTable
                calls={summaryData.calls}
                date={summaryData.date}
                loading={loading}
              />
            )}
            
            {loading && !summaryData && (
              <Card>
                <CardHeader>
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Veri Yoksa */}
            {!loading && !summaryData && !error && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-muted-foreground">Bir tarih seçin veya yenile butonuna tıklayın</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

