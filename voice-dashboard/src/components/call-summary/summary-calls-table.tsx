import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhoneIncoming, PhoneOutgoing, Download } from 'lucide-react'
import type { DailySummaryCalls } from '@/types'

interface SummaryCallsTableProps {
  calls: DailySummaryCalls
  date: string
  loading?: boolean
}

/**
 * Günlük çağrı özeti tablo bileşeni
 */
export function SummaryCallsTable({ calls, date, loading = false }: SummaryCallsTableProps) {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound')

  // Status badge rengi
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-600">✅ Tamamlandı</Badge>
      case 'busy':
        return <Badge variant="destructive">📵 Meşgul</Badge>
      case 'no-answer':
        return <Badge variant="secondary">❌ Cevapsız</Badge>
      case 'failed':
        return <Badge variant="destructive">⚠️ Başarısız</Badge>
      case 'canceled':
        return <Badge variant="secondary">🚫 İptal</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Tarihi formatla
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Geçersiz tarih'
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return 'Geçersiz tarih'
    }
  }

  // Süreyi formatla
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return minutes > 0 ? `${minutes}d ${secs}sn` : `${secs}sn`
  }

  // CSV export fonksiyonu
  const handleExportCSV = (direction: 'inbound' | 'outbound') => {
    const data = direction === 'inbound' ? calls.inbound : calls.outbound
    
    // CSV başlıkları
    const headers = ['Tarih/Saat', 'Arayan/Aranan', 'Numara', 'Durum', 'Süre (sn)']
    
    // CSV satırları
    const rows = data.map(call => [
      formatTime(call.startTime),
      direction === 'inbound' ? 'Arayan' : 'Aranan',
      direction === 'inbound' ? call.from : call.to,
      call.status,
      call.duration.toString(),
    ])
    
    // CSV içeriği oluştur
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    // BOM ekle (UTF-8 encoding için)
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    // İndir
    const link = document.createElement('a')
    link.href = url
    link.download = `${direction}_calls_${date.replace(/\//g, '-')}.csv`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
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
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Çağrı Detayları</CardTitle>
        <CardDescription>{date} tarihli tüm çağrılar</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbound' | 'outbound')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="inbound" className="flex items-center gap-2">
                <PhoneIncoming className="h-4 w-4" />
                Gelen ({calls.inbound.length})
              </TabsTrigger>
              <TabsTrigger value="outbound" className="flex items-center gap-2">
                <PhoneOutgoing className="h-4 w-4" />
                Giden ({calls.outbound.length})
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV(activeTab)}
              disabled={activeTab === 'inbound' ? calls.inbound.length === 0 : calls.outbound.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV İndir
            </Button>
          </div>

          <TabsContent value="inbound" className="space-y-4">
            {calls.inbound.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bu tarihte gelen çağrı bulunamadı.
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih & Saat</TableHead>
                      <TableHead>Arayan</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">Süre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.inbound.map((call) => (
                      <TableRow key={call.sid}>
                        <TableCell className="font-mono text-sm">
                          {formatTime(call.startTime)}
                        </TableCell>
                        <TableCell className="font-mono">{call.from}</TableCell>
                        <TableCell>{getStatusBadge(call.status)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatDuration(call.duration)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="outbound" className="space-y-4">
            {calls.outbound.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bu tarihte giden çağrı bulunamadı.
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih & Saat</TableHead>
                      <TableHead>Aranan</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">Süre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.outbound.map((call) => (
                      <TableRow key={call.sid}>
                        <TableCell className="font-mono text-sm">
                          {formatTime(call.startTime)}
                        </TableCell>
                        <TableCell className="font-mono">{call.to}</TableCell>
                        <TableCell>{getStatusBadge(call.status)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatDuration(call.duration)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

