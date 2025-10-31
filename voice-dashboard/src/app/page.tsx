'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Phone, PhoneCall, History, Settings, Activity, FileText } from 'lucide-react'

import { startCall, startBulkCall, getAllCallHistoryForExport } from '@/lib/api'
import { useSocket } from '@/hooks/use-socket'
import { useCallHistory } from '@/hooks/use-call-history'
import { formatPhoneNumber, formatTimestamp, isValidPhoneNumber, getCallStatusColor } from '@/lib/utils'
import { exportCallHistoryToCSV } from '@/lib/csv-export'

import { StatsCards } from '@/components/call/stats-cards'
import { CallHistoryTable } from '@/components/call/call-history-table'
import { CallDetailModal } from '@/components/call/call-detail-modal'

export default function DashboardPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bulkNumbers, setBulkNumbers] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  const { socket, isConnected, events, clearEvents, isHydrated, loadEventHistory, isPolling, lastUpdate } = useSocket()
  const { 
    callHistory, 
    stats, 
    pagination,
    loading: historyLoading, 
    error: historyError, 
    currentPage,
    itemsPerPage,
    refreshData,
    goToPage,
    nextPage,
    previousPage,
    changeItemsPerPage
  } = useCallHistory()

  // Tekil çağrı
  const handleSingleCall = async () => {
    if (!phoneNumber.trim()) {
      setMessage('❌ Telefon numarası gerekli!')
      return
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setMessage('❌ Geçerli bir telefon numarası girin (+90 veya +44 ile başlamalı)')
      return
    }

    setIsLoading(true)
    setMessage('📞 Çağrı başlatılıyor...')

    try {
      const result = await startCall(phoneNumber)
      setMessage(`✅ Çağrı başlatıldı! ID: ${result.data?.execution_sid?.slice(-8)}`)
      setPhoneNumber('')
      
      // Call history'yi yenile
      setTimeout(() => refreshData(), 2000)
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Toplu çağrı
  const handleBulkCall = async () => {
    const numberLines = bulkNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 10)
    
    const validNumbers = numberLines.filter(num => isValidPhoneNumber(num))
    
    if (validNumbers.length === 0) {
      setMessage('❌ En az bir geçerli telefon numarası gerekli!')
      return
    }

    if (numberLines.length > validNumbers.length) {
      setMessage(`⚠️ ${numberLines.length - validNumbers.length} geçersiz numara atlandı`)
    }

    setIsLoading(true)
    setMessage(`📞 ${validNumbers.length} numaraya toplu arama başlatılıyor...`)

    try {
      const result = await startBulkCall(validNumbers)
      setMessage(`✅ Toplu arama başlatıldı! ${validNumbers.length} numara`)
      setBulkNumbers('')
      
      // Call history'yi yenile
      setTimeout(() => refreshData(), 2000)
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getNumberCount = () => {
    return bulkNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .length
  }

  const getValidNumberCount = () => {
    return bulkNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && isValidPhoneNumber(line))
      .length
  }

  // Real-time events için istatistikleri hesapla
  const realTimeStats = {
    total: isHydrated ? events.length : 0,
    active: isHydrated ? events.filter(e => {
      const status = e.status || e.event
      return status && ['initiated', 'ringing'].includes(status)
    }).length : 0,
    confirmed: isHydrated ? events.filter(e => {
      return e.type === 'dtmf' && e.action === 'confirm_appointment'
    }).length : 0,
    cancelled: isHydrated ? events.filter(e => {
      return e.type === 'dtmf' && e.action === 'cancel_appointment'
    }).length : 0,
    failed: isHydrated ? events.filter(e => {
      const status = e.status || e.event
      return status && ['failed', 'canceled', 'no-answer'].includes(status)
    }).length : 0,
  }

  const handleViewCallDetails = (executionSid: string) => {
    setSelectedCallId(executionSid)
    setIsDetailModalOpen(true)
  }

  const handleRefreshAll = () => {
    refreshData()
    loadEventHistory()
  }

  const handleExportAll = async () => {
    try {
      setMessage('📥 Tüm kayıtlar dışa aktarılıyor...')
      const response = await getAllCallHistoryForExport()
      
      if (response.success && response.data) {
        exportCallHistoryToCSV(response.data)
        setMessage(`✅ ${response.total} kayıt başarıyla dışa aktarıldı!`)
        
        // 3 saniye sonra mesajı temizle
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error: any) {
      setMessage(`❌ Dışa aktarma hatası: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Voice Dashboard
                  </h1>
                  <p className="text-sm text-gray-500">
                    Happy Smile Clinics - Çağrı İzleme ve Yönetim Sistemi
                  </p>
                </div>
              </div>
              
              <Badge variant={isConnected ? "default" : "destructive"} className="ml-4">
                {isConnected ? (
                  <>
                    <Activity className="w-3 h-3 mr-1" />
                    Canlı
                  </>
                ) : (
                  'Bağlantı Kesildi'
                )}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Yenile
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearEvents}
                className="flex items-center gap-1"
              >
                Temizle
              </Button>
              
              <Link href="/call-summary">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <FileText className="h-4 w-4" />
                  Günlük Özet
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sol Panel - Çağrı Formu */}
          <div className="lg:col-span-1 space-y-6">
            {/* Çağrı Formu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isBulkMode ? <PhoneCall className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    {isBulkMode ? 'Toplu Arama' : 'Tekil Arama'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsBulkMode(!isBulkMode)
                      setMessage('')
                    }}
                  >
                    {isBulkMode ? 'Tekil' : 'Toplu'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {isBulkMode ? 'Birden fazla numaraya aynı anda arama' : 'Tek bir numaraya arama'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isBulkMode ? (
                  // Tekil çağrı formu
                  <>
                    <input 
                      type="text" 
                      placeholder="+905551234567 veya +441234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={handleSingleCall}
                      disabled={isLoading || !phoneNumber.trim()}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Aranıyor...
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 mr-2" />
                          Ara
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  // Toplu çağrı formu
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        📝 Telefon Numaraları (Her satıra bir numara)
                      </label>
                      <textarea
                        value={bulkNumbers}
                        onChange={(e) => setBulkNumbers(e.target.value)}
                        placeholder={`+905551234567\n+905552345678\n+905553456789\n...`}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={6}
                        disabled={isLoading}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          📊 {getNumberCount()}/10 numara • ✅ {getValidNumberCount()} geçerli
                        </span>
                      </div>
                    </div>

                    <Button 
                      onClick={handleBulkCall}
                      disabled={isLoading || getValidNumberCount() === 0}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Başlatılıyor...
                        </>
                      ) : (
                        <>
                          <PhoneCall className="w-4 h-4 mr-2" />
                          {getValidNumberCount()} Numaraya Toplu Arama
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Mesaj */}
                {message && (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Sistem Durumu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Sistem Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Backend API</span>
                  <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Auto-Refresh</span>
                  <Badge variant="default" className={isPolling ? "bg-blue-100 text-blue-800 animate-pulse" : "bg-green-100 text-green-800"}>
                    {isPolling ? 'Güncelleniyor...' : 'Aktif (5s)'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Son Güncelleme</span>
                  <span className="text-xs text-gray-500">
                    {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('tr-TR') : 'Henüz yok'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Veritabanı</span>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    MySQL/SQLite
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ana İçerik */}
          <div className="lg:col-span-3">
            {/* İstatistik Kartları */}
            {stats && (
              <div className="mb-6">
                <StatsCards stats={stats.today} loading={historyLoading} />
              </div>
            )}

            {/* Tab'lar */}
            <Tabs defaultValue="history" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Çağrı Geçmişi
                </TabsTrigger>
                <TabsTrigger value="realtime" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Gerçek Zamanlı
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                <CallHistoryTable 
                  calls={callHistory} 
                  pagination={pagination}
                  loading={historyLoading}
                  onViewDetails={handleViewCallDetails}
                  onPageChange={goToPage}
                  onItemsPerPageChange={changeItemsPerPage}
                  onExportAll={handleExportAll}
                />
              </TabsContent>

              <TabsContent value="realtime" className="space-y-4">
                {/* Real-time Events */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Gerçek Zamanlı Çağrı Listesi
                    </CardTitle>
                    <CardDescription>
                      Anlık çağrı durumları ve DTMF etkileşimleri
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!isHydrated ? (
                      <div className="text-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">Yükleniyor...</p>
                        <p className="text-sm text-gray-400">Çağrı kayıtları hazırlanıyor</p>
                      </div>
                    ) : events.length === 0 ? (
                      <div className="text-center py-12">
                        <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-2">Henüz çağrı yok</p>
                        <p className="text-sm text-gray-400">Çağrı başlattığınızda burada gerçek zamanlı görünecek</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {events.map((event, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  event.type === 'dtmf' && event.action ? 'bg-green-400' :
                                  event.type === 'dtmf' ? 'bg-purple-400' : 
                                  'bg-blue-400'
                                }`} />
                                <div>
                                  <p className="font-medium">
                                    {event.To || event.to || 'Bilinmiyor'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {event.execution_sid?.slice(-8)}...
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <Badge 
                                  variant={
                                    event.type === 'dtmf' && event.action ? 'default' :
                                    event.type === 'dtmf' ? 'secondary' : 'outline'
                                  }
                                  className={
                                    event.type === 'dtmf' && event.action ? 'bg-green-100 text-green-800' :
                                    event.type === 'dtmf' ? 'bg-purple-100 text-purple-800' : ''
                                  }
                                >
                                  {event.type === 'dtmf' && event.digits ? `🔢 ${event.digits}` : 
                                   event.type === 'dtmf' && event.action ? `✅ Action` :
                                   (event.status || event.event)}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatTimestamp(event.time)}
                                </p>
                              </div>
                            </div>
                            
                            {event.action && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Aksiyon:</span>
                                <Badge 
                                  variant={
                                    event.action === 'confirm_appointment' ? 'default' :
                                    event.action === 'cancel_appointment' ? 'destructive' :
                                    'secondary'
                                  }
                                  className={`ml-2 ${
                                    event.action === 'confirm_appointment' ? 'bg-green-100 text-green-800' :
                                    event.action === 'cancel_appointment' ? 'bg-red-100 text-red-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {event.action === 'confirm_appointment' && '✅ Randevu Onaylandı'}
                                  {event.action === 'cancel_appointment' && '❌ Randevu İptal Edildi'}
                                  {event.action === 'connect_to_representative' && '🎤 Sesli Mesaj'}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Call Detail Modal */}
      <CallDetailModal
        executionSid={selectedCallId}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  )
} 