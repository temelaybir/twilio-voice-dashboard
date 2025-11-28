'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  Mail, 
  FileText, 
  Users, 
  Send, 
  FolderOpen,
  Phone,
  LogOut,
  Settings,
  TestTube,
  CalendarCheck
} from 'lucide-react'

// Email components
import { EmailStatsCards } from '@/components/email/email-stats-cards'
import { TemplateList } from '@/components/email/template-list'
import { ListManager } from '@/components/email/list-manager'
import { SubscriberList } from '@/components/email/subscriber-list'
import { CampaignList } from '@/components/email/campaign-list'
import { TemplateEditorModal } from '@/components/email/template-editor-modal'
import { CampaignEditorModal } from '@/components/email/campaign-editor-modal'
import { SubscriberImportModal } from '@/components/email/subscriber-import-modal'
import { AppointmentConfirmations } from '@/components/email/appointment-confirmations'

// API functions
import {
  getEmailStats,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getLists,
  createList,
  updateList,
  deleteList,
  getSubscribers,
  createSubscriber,
  updateSubscriber,
  bulkCreateSubscribers,
  deleteSubscriber,
  bulkDeleteSubscribers,
  deleteAllSubscribersInList,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  getCampaignStats,
  sendTestEmail
} from '@/lib/email-api'

import type {
  EmailStats,
  EmailTemplate,
  EmailList,
  EmailSubscriber,
  EmailCampaign,
  TemplateFormData,
  ListFormData,
  CampaignFormData
} from '@/types/email'

export default function EmailCampaignsPage() {
  const router = useRouter()
  
  // State
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([])
  const [subscriberPagination, setSubscriberPagination] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [message, setMessage] = useState('')
  
  // Filters
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [subscriberPage, setSubscriberPage] = useState(1)
  const [activeTab, setActiveTab] = useState('campaigns')
  
  // Modals
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [listModalOpen, setListModalOpen] = useState(false)
  const [editingList, setEditingList] = useState<EmailList | null>(null)
  const [campaignModalOpen, setCampaignModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [subscriberModalOpen, setSubscriberModalOpen] = useState(false)

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, templatesRes, listsRes, campaignsRes] = await Promise.all([
        getEmailStats(),
        getTemplates(),
        getLists(),
        getCampaigns()
      ])
      
      setStats(statsRes.data)
      setTemplates(templatesRes.data)
      setLists(listsRes.data)
      setCampaigns(campaignsRes.data)
    } catch (error: any) {
      setMessage(`❌ Veri yükleme hatası: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSubscribers = useCallback(async () => {
    try {
      const res = await getSubscribers(selectedListId || undefined, undefined, subscriberPage, 50)
      setSubscribers(res.data)
      setSubscriberPagination(res.pagination)
    } catch (error: any) {
      setMessage(`❌ Abone yükleme hatası: ${error.message}`)
    }
  }, [selectedListId, subscriberPage])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadSubscribers()
  }, [loadSubscribers])

  // Template handlers
  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateModalOpen(true)
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateModalOpen(true)
  }

  const handleSaveTemplate = async (data: TemplateFormData) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, data)
        setMessage('✅ Şablon güncellendi')
      } else {
        await createTemplate(data)
        setMessage('✅ Şablon oluşturuldu')
      }
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
      throw error
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return
    try {
      await deleteTemplate(id)
      setMessage('✅ Şablon silindi')
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handlePreviewTemplate = (template: EmailTemplate) => {
    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      previewWindow.document.write(template.htmlContent)
      previewWindow.document.close()
    }
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      await createTemplate({
        name: `${template.name} (Kopya)`,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || undefined,
        category: template.category
      })
      setMessage('✅ Şablon kopyalandı')
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  // List handlers
  const handleCreateList = () => {
    setEditingList(null)
    setListModalOpen(true)
  }

  const handleEditList = (list: EmailList) => {
    setEditingList(list)
    setListModalOpen(true)
  }

  const handleSaveList = async (data: ListFormData) => {
    try {
      if (editingList) {
        await updateList(editingList.id, data)
        setMessage('✅ Liste güncellendi')
      } else {
        await createList(data)
        setMessage('✅ Liste oluşturuldu')
      }
      setListModalOpen(false)
      setEditingList(null)
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleDeleteList = async (id: number) => {
    if (!confirm('Bu listeyi ve tüm abonelerini silmek istediğinize emin misiniz?')) return
    try {
      await deleteList(id)
      setMessage('✅ Liste silindi')
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleViewListSubscribers = (list: EmailList) => {
    setSelectedListId(list.id)
    setSubscriberPage(1)
    setActiveTab('subscribers') // Aboneler tab'ına geç
  }

  // Subscriber handlers
  const handleAddSubscriber = () => {
    setSubscriberModalOpen(true)
  }

  const handleDeleteSubscriber = async (id: number) => {
    if (!confirm('Bu aboneyi silmek istediğinize emin misiniz?')) return
    try {
      await deleteSubscriber(id)
      setMessage('✅ Abone silindi')
      loadSubscribers()
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleUpdateSubscriber = async (id: number, data: any) => {
    try {
      await updateSubscriber(id, data)
      setMessage('✅ Abone güncellendi')
      loadSubscribers()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleBulkImport = async (subscribers: any[], listId: number) => {
    const result = await bulkCreateSubscribers(subscribers, listId)
    loadSubscribers()
    loadData()
    return result.data
  }

  const handleBulkDeleteSubscribers = async (ids: number[]) => {
    try {
      const result = await bulkDeleteSubscribers(ids)
      setMessage(`✅ ${result.deletedCount} abone silindi`)
      loadSubscribers()
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleDeleteAllInList = async (listId: number) => {
    try {
      const result = await deleteAllSubscribersInList(listId)
      setMessage(`✅ ${result.deletedCount} abone silindi`)
      loadSubscribers()
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  // Campaign handlers
  const handleCreateCampaign = () => {
    setEditingCampaign(null)
    setCampaignModalOpen(true)
  }

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign)
    setCampaignModalOpen(true)
  }

  const handleSaveCampaign = async (data: CampaignFormData) => {
    try {
      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, data)
        setMessage('✅ Kampanya güncellendi')
      } else {
        await createCampaign(data)
        setMessage('✅ Kampanya oluşturuldu')
      }
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
      throw error
    }
  }

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    try {
      await deleteCampaign(id)
      setMessage('✅ Kampanya silindi')
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    if (!confirm(`"${campaign.name}" kampanyasını göndermek istediğinize emin misiniz?`)) return
    try {
      const result = await sendCampaign(campaign.id)
      setMessage(`✅ ${result.message} - ${result.totalRecipients} alıcıya gönderiliyor`)
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handlePauseCampaign = async (campaign: EmailCampaign) => {
    try {
      const { pauseCampaign } = await import('@/lib/email-api')
      await pauseCampaign(campaign.id)
      setMessage(`⏸️ "${campaign.name}" kampanyası duraklatıldı`)
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleResumeCampaign = async (campaign: EmailCampaign) => {
    try {
      const { resumeCampaign } = await import('@/lib/email-api')
      const result = await resumeCampaign(campaign.id)
      setMessage(`▶️ "${campaign.name}" devam ediyor - ${result.totalSent} gönderildi, ${result.remaining} kaldı`)
      loadData()
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleViewCampaignStats = async (campaign: EmailCampaign) => {
    try {
      const result = await getCampaignStats(campaign.id)
      const { stats } = result.data
      alert(`
Kampanya: ${campaign.name}
─────────────────────
Toplam: ${stats.total}
Gönderildi: ${stats.sent}
Açıldı: ${stats.opened} (${stats.openRate || 0}%)
Bounce: ${stats.bounced}
Başarısız: ${stats.failed}
      `)
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  // Test email
  const handleTestEmail = async () => {
    const email = prompt('Test email gönderilecek adres:')
    if (!email) return
    
    try {
      await sendTestEmail(email)
      setMessage(`✅ Test email gönderildi: ${email}`)
    } catch (error: any) {
      setMessage(`❌ Hata: ${error.message}`)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      // Silent
    }
  }

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Email Kampanyaları
                  </h1>
                  <p className="text-sm text-gray-500">
                    Happy Smile Clinics - Toplu Email Gönderim Sistemi
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                className="flex items-center gap-1"
              >
                <TestTube className="h-3 w-3" />
                Test Email
              </Button>
              
              <Link href="/">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Phone className="h-4 w-4" />
                  Voice Dashboard
                </Button>
              </Link>
            </div>

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
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith('✅') ? 'bg-green-100 text-green-800' :
            message.startsWith('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8">
          <EmailStatsCards stats={stats} loading={loading} />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Kampanyalar
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Şablonlar
            </TabsTrigger>
            <TabsTrigger value="lists" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Listeler
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aboneler
            </TabsTrigger>
            <TabsTrigger value="confirmations" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Onaylar
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <CampaignList
              campaigns={campaigns}
              loading={loading}
              onEdit={handleEditCampaign}
              onCreate={handleCreateCampaign}
              onDelete={handleDeleteCampaign}
              onSend={handleSendCampaign}
              onViewStats={handleViewCampaignStats}
              onPause={handlePauseCampaign}
              onResume={handleResumeCampaign}
            />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <TemplateList
              templates={templates}
              loading={loading}
              onEdit={handleEditTemplate}
              onCreate={handleCreateTemplate}
              onDelete={handleDeleteTemplate}
              onPreview={handlePreviewTemplate}
              onDuplicate={handleDuplicateTemplate}
            />
          </TabsContent>

          {/* Lists Tab */}
          <TabsContent value="lists">
            <ListManager
              lists={lists}
              loading={loading}
              onEdit={handleEditList}
              onCreate={handleCreateList}
              onDelete={handleDeleteList}
              onViewSubscribers={handleViewListSubscribers}
            />
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers">
            <SubscriberList
              subscribers={subscribers}
              lists={lists}
              loading={loading}
              pagination={subscriberPagination}
              selectedListId={selectedListId}
              onSelectList={setSelectedListId}
              onAddSubscriber={handleAddSubscriber}
              onBulkImport={() => setImportModalOpen(true)}
              onDelete={handleDeleteSubscriber}
              onUpdate={handleUpdateSubscriber}
              onBulkDelete={handleBulkDeleteSubscribers}
              onDeleteAllInList={handleDeleteAllInList}
              onPageChange={setSubscriberPage}
            />
          </TabsContent>

          {/* Confirmations Tab */}
          <TabsContent value="confirmations">
            <AppointmentConfirmations onRefresh={loadData} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <TemplateEditorModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <CampaignEditorModal
        open={campaignModalOpen}
        onOpenChange={setCampaignModalOpen}
        campaign={editingCampaign}
        templates={templates}
        lists={lists}
        onSave={handleSaveCampaign}
      />

      <SubscriberImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        lists={lists}
        onImport={handleBulkImport}
      />

      {/* Simple List Modal */}
      {listModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingList ? 'Liste Düzenle' : 'Yeni Etkinlik Listesi Oluştur'}
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const eventDay1 = formData.get('eventDay1') as string
              const eventDay2 = formData.get('eventDay2') as string
              handleSaveList({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                city: formData.get('city') as string,
                cityDisplay: formData.get('cityDisplay') as string,
                eventDay1: eventDay1,
                eventDay2: eventDay2,
                eventDates: `${eventDay1} - ${eventDay2}`, // Geriye uyumluluk
                location: formData.get('location') as string,
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Liste Adı *</label>
                  <input
                    name="name"
                    defaultValue={editingList?.name || ''}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Örn: Bydgoszcz Kasım 2025"
                  />
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-800 mb-3">📅 Etkinlik Detayları</h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Şehir *</label>
                        <input
                          name="city"
                          defaultValue={(editingList as any)?.city || ''}
                          required
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Bydgoszcz"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Görüntüleme 
                          <span className="text-xs text-gray-500 ml-1">(Lehçe)</span>
                        </label>
                        <input
                          name="cityDisplay"
                          defaultValue={(editingList as any)?.cityDisplay || ''}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Bydgoszczy"
                        />
                        <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa şehir adı kullanılır</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">1. Gün *</label>
                        <input
                          name="eventDay1"
                          defaultValue={(editingList as any)?.eventDay1 || ''}
                          required
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Örn: 30 listopada"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">2. Gün *</label>
                        <input
                          name="eventDay2"
                          defaultValue={(editingList as any)?.eventDay2 || ''}
                          required
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Örn: 1 grudnia"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Konum/Adres *</label>
                      <textarea
                        name="location"
                        defaultValue={(editingList as any)?.location || ''}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        rows={2}
                        placeholder="Örn: Hampton by Hilton, ul. Piłsudskiego 34, 10-577 Olsztyn"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-white rounded border text-xs text-gray-600">
                    <strong>Saat Dilimleri (Varsayılan):</strong>
                    <div className="mt-1 flex gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-gray-100 rounded">09:00-12:30</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">12:30-15:00</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">15:00-17:30</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Açıklama (Opsiyonel)</label>
                  <textarea
                    name="description"
                    defaultValue={editingList?.description || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={2}
                    placeholder="Liste açıklaması..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => { setListModalOpen(false); setEditingList(null); }}>
                  İptal
                </Button>
                <Button type="submit">
                  {editingList ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simple Subscriber Modal */}
      {subscriberModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Yeni Abone Ekle</h2>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const email = formData.get('email') as string
              const phone = formData.get('phone') as string
              
              if (!email && !phone) {
                setMessage('❌ Email veya telefon zorunludur')
                return
              }
              
              try {
                await createSubscriber({
                  email: email || undefined,
                  firstName: formData.get('firstName') as string,
                  lastName: formData.get('lastName') as string,
                  phone: phone || undefined,
                  city: formData.get('city') as string,
                  stage: formData.get('stage') as string,
                  eventDate: formData.get('eventDate') as string,
                  eventTime: formData.get('eventTime') as string,
                  listId: parseInt(formData.get('listId') as string)
                })
                setMessage('✅ Abone eklendi')
                setSubscriberModalOpen(false)
                loadSubscribers()
                loadData()
              } catch (error: any) {
                setMessage(`❌ Hata: ${error.message}`)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ad *</label>
                  <input
                    name="firstName"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ahmet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefon</label>
                  <input
                    name="phone"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="+905551234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="ornek@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Şehir</label>
                  <input
                    name="city"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="İstanbul"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Aşama/Stage</label>
                  <input
                    name="stage"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Yeni Lead"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Etkinlik Tarihi</label>
                    <input
                      name="eventDate"
                      type="text"
                      placeholder="2025-12-15 veya 15 Aralık"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Etkinlik Saati</label>
                    <input
                      name="eventTime"
                      type="text"
                      placeholder="14:00 veya 14:00-15:00"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Liste *</label>
                  <select
                    name="listId"
                    required
                    defaultValue={selectedListId || lists[0]?.id || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {lists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setSubscriberModalOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">
                  Ekle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

