'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Phone, PhoneCall, History, Settings, Activity, FileText, LogOut, Mail, Users, ChevronDown } from 'lucide-react'

import { startCall, startBulkCall, getAllCallHistoryForExport, createBulkCallFromLists, startCallQueueWithAutoContinue, getCallQueues, pauseCallQueue, deleteCallQueue } from '@/lib/api'
import type { CallQueue, StartQueueResult } from '@/lib/api'
import { getLists, getListPhones } from '@/lib/email-api'
import type { EmailList } from '@/types/email'
import { useSocket } from '@/hooks/use-socket'
import { useCallHistory } from '@/hooks/use-call-history'
import { formatPhoneNumber, formatTimestamp, isValidPhoneNumber, getCallStatusColor } from '@/lib/utils'
import { exportCallHistoryToCSV } from '@/lib/csv-export'

import { StatsCards } from '@/components/call/stats-cards'
import { CallHistoryTable } from '@/components/call/call-history-table'
import { CallDetailModal } from '@/components/call/call-detail-modal'

export default function DashboardPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bulkNumbers, setBulkNumbers] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  // Email listeleri entegrasyonu
  const [emailLists, setEmailLists] = useState<EmailList[]>([])
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [listPhones, setListPhones] = useState<Array<{phone: string; name: string; city: string}>>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [showListSelector, setShowListSelector] = useState(false)
  
  // Toplu arama kuyruk sistemi
  const [callQueues, setCallQueues] = useState<CallQueue[]>([])
  const [activeQueueId, setActiveQueueId] = useState<number | null>(null)
  const [queueProgress, setQueueProgress] = useState<StartQueueResult | null>(null)
  const [selectedListsForCall, setSelectedListsForCall] = useState<number[]>([])
  const [showQueueModal, setShowQueueModal] = useState(false)
  
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

  // Email listelerini yükle
  const loadEmailLists = useCallback(async () => {
    try {
      setLoadingLists(true)
      const response = await getLists()
      setEmailLists(response.data.filter(list => list.subscriberCount > 0))
    } catch (error) {
      console.error('Liste yükleme hatası:', error)
    } finally {
      setLoadingLists(false)
    }
  }, [])

  // Seçili listeden telefon numaralarını yükle
  const loadListPhones = useCallback(async (listId: number) => {
    try {
      setLoadingLists(true)
      const response = await getListPhones(listId)
      setListPhones(response.data)
      
      // Numaraları textarea'ya ekle
      const phoneNumbers = response.data.map(p => p.phone).join('\n')
      setBulkNumbers(phoneNumbers)
      setMessage(`✅ ${response.data.length} numara yüklendi: ${response.list.name}`)
    } catch (error: any) {
      setMessage(`❌ Liste yükleme hatası: ${error.message}`)
    } finally {
      setLoadingLists(false)
      setShowListSelector(false)
    }
  }, [])

  // Liste seçildiğinde
  const handleSelectList = (listId: number) => {
    setSelectedListId(listId)
    loadListPhones(listId)
  }

  // Sayfa yüklendiğinde listeleri getir
  useEffect(() => {
    if (isBulkMode) {
      loadEmailLists()
      loadCallQueues()
    }
  }, [isBulkMode, loadEmailLists])

  // Kuyrukları yükle
  const loadCallQueues = async () => {
    try {
      const response = await getCallQueues()
      setCallQueues(response.data)
    } catch (error) {
      console.error('Kuyruk yükleme hatası:', error)
    }
  }

  // Listelerden toplu arama başlat
  const handleStartQueueFromLists = async () => {
    if (selectedListsForCall.length === 0) {
      setMessage('❌ En az bir liste seçin!')
      return
    }

    setIsLoading(true)
    setMessage('📞 Arama kuyruğu oluşturuluyor...')

    try {
      const result = await createBulkCallFromLists(selectedListsForCall)
      setMessage(`✅ ${result.totalNumbers} numaralı kuyruk oluşturuldu!`)
      setActiveQueueId(result.queueId)
      setShowQueueModal(true)
      setSelectedListsForCall([])
      
      // Otomatik başlat
      await handleStartQueue(result.queueId)
      
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Kuyruğu başlat ve auto-continue
  const handleStartQueue = async (queueId: number) => {
    setActiveQueueId(queueId)
    setIsLoading(true)
    setMessage('📞 Toplu arama başlatılıyor...')

    try {
      const result = await startCallQueueWithAutoContinue(queueId, (progress) => {
        setQueueProgress(progress)
        setMessage(`📞 Aranıyor: ${progress.calledCount}/${progress.totalNumbers} (${progress.remaining} kaldı)`)
      })

      if (result.completed) {
        setMessage(`✅ Tamamlandı: ${result.successCount} başarılı, ${result.failedCount} başarısız`)
      } else {
        setMessage(`⏸️ Duraklatıldı: ${result.calledCount}/${result.totalNumbers}`)
      }
      
      loadCallQueues()
      setTimeout(() => refreshData(), 2000)
      
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    } finally {
      setIsLoading(false)
      setActiveQueueId(null)
      setQueueProgress(null)
    }
  }

  // Kuyruğu duraklat
  const handlePauseQueue = async (queueId: number) => {
    try {
      await pauseCallQueue(queueId)
      setMessage('⏸️ Kuyruk duraklatıldı')
      loadCallQueues()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  // Kuyruğu sil
  const handleDeleteQueue = async (queueId: number) => {
    if (!confirm('Bu kuyruğu silmek istediğinize emin misiniz?')) return
    
    try {
      await deleteCallQueue(queueId)
      setMessage('🗑️ Kuyruk silindi')
      loadCallQueues()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  // Liste seçimi toggle
  const toggleListSelection = (listId: number) => {
    setSelectedListsForCall(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    )
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      // Silent error handling
    }
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
              
              <Link href="/email-campaigns">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Mail className="h-4 w-4" />
                  Email Kampanyaları
                </Button>
              </Link>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </Button>
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
                    {/* Liste Seçici */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        📋 Listeden Yükle (Opsiyonel)
                      </label>
                      <div className="relative">
                        <Button
                          variant="outline"
                          onClick={() => setShowListSelector(!showListSelector)}
                          disabled={loadingLists}
                          className="w-full justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {selectedListId 
                              ? emailLists.find(l => l.id === selectedListId)?.name 
                              : 'Email listesinden numaraları yükle'}
                          </span>
                          {loadingLists ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        
                        {showListSelector && emailLists.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-[200px] overflow-y-auto">
                            {emailLists.map(list => (
                              <button
                                key={list.id}
                                onClick={() => handleSelectList(list.id)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                              >
                                <span>{list.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {list.subscriberCount} kişi
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {showListSelector && emailLists.length === 0 && !loadingLists && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg p-3 text-center text-sm text-gray-500">
                            Henüz liste yok.{' '}
                            <Link href="/email-campaigns" className="text-blue-600 hover:underline">
                              Liste oluşturun
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">veya manuel girin</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        📝 Telefon Numaraları (Her satıra bir numara)
                      </label>
                      <textarea
                        value={bulkNumbers}
                        onChange={(e) => {
                          setBulkNumbers(e.target.value)
                          setSelectedListId(null)
                        }}
                        placeholder={`+905551234567\n+905552345678\n+905553456789\n...`}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={6}
                        disabled={isLoading}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          📊 {getNumberCount()}/10 numara • ✅ {getValidNumberCount()} geçerli
                        </span>
                        {bulkNumbers && (
                          <button 
                            onClick={() => {
                              setBulkNumbers('')
                              setSelectedListId(null)
                              setListPhones([])
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Temizle
                          </button>
                        )}
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
                          {getValidNumberCount()} Numaraya Toplu Arama (Max 10)
                        </>
                      )}
                    </Button>

                    {/* Büyük Listeler İçin Kuyruk Sistemi */}
                    <Separator className="my-4" />
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          Liste Bazlı Toplu Arama (Sınırsız)
                        </h4>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          10'ar 10'ar
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        Büyük listeler için kuyruk sistemi. Listelerden tüm telefon numaralarını 10'ar 10'ar arar.
                      </p>

                      {/* Liste Seçimi */}
                      <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                        {emailLists.length > 0 ? (
                          emailLists.map(list => (
                            <label
                              key={list.id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedListsForCall.includes(list.id)
                                  ? 'bg-purple-50 border border-purple-200'
                                  : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedListsForCall.includes(list.id)}
                                onChange={() => toggleListSelection(list.id)}
                                className="h-4 w-4 text-purple-600 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{list.name}</p>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    (list as any).twilioRegion === 'uk' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {(list as any).twilioRegion === 'uk' ? '🇬🇧' : '🇵🇱'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {list.city && `📍 ${list.city} • `}
                                  👥 {list.subscriberCount} abone
                                </p>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-center text-sm text-gray-500 py-4">
                            {loadingLists ? 'Yükleniyor...' : 'Liste bulunamadı'}
                          </p>
                        )}
                      </div>

                      {selectedListsForCall.length > 0 && (
                        <div className="text-sm text-purple-700 bg-purple-50 p-2 rounded-lg">
                          ✓ {selectedListsForCall.length} liste seçildi
                        </div>
                      )}

                      <Button 
                        onClick={handleStartQueueFromLists}
                        disabled={isLoading || selectedListsForCall.length === 0}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {isLoading && activeQueueId ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            {queueProgress 
                              ? `${queueProgress.calledCount}/${queueProgress.totalNumbers} aranıyor...`
                              : 'Başlatılıyor...'
                            }
                          </>
                        ) : (
                          <>
                            <PhoneCall className="w-4 h-4 mr-2" />
                            Seçili Listeleri Ara
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Aktif Kuyruklar */}
                    {callQueues.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 text-sm">📋 Arama Kuyrukları</h4>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto">
                            {callQueues.slice(0, 5).map(queue => (
                              <div
                                key={queue.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{queue.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{queue.calledCount}/{queue.totalNumbers}</span>
                                    <Badge 
                                      variant="outline"
                                      className={
                                        queue.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                        queue.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        queue.status === 'paused' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-gray-50 text-gray-700 border-gray-200'
                                      }
                                    >
                                      {queue.status === 'completed' ? '✅ Tamamlandı' :
                                       queue.status === 'processing' ? '🔄 Devam Ediyor' :
                                       queue.status === 'paused' ? '⏸️ Bekliyor' :
                                       queue.status === 'pending' ? '⏳ Beklemede' :
                                       queue.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {(queue.status === 'pending' || queue.status === 'paused') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStartQueue(queue.id)}
                                      disabled={isLoading}
                                      className="h-7 px-2 text-xs"
                                    >
                                      ▶️
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteQueue(queue.id)}
                                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
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
                    {isPolling ? 'Güncelleniyor...' : 'Aktif (15s)'}
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
                        {events
                          .filter((event, index, self) => {
                            // Aynı execution_sid, time, type, digits ve action'a sahip duplicate event'leri filtrele
                            return index === self.findIndex((e) => 
                              e.execution_sid === event.execution_sid &&
                              e.time === event.time &&
                              e.type === event.type &&
                              e.digits === event.digits &&
                              e.action === event.action
                            )
                          })
                          .map((event, index) => (
                          <div key={`${event.execution_sid}-${event.time}-${event.type}-${event.action || ''}-${index}`} className="border rounded-lg p-4 bg-gray-50">
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