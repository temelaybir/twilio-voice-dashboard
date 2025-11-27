'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Send,
  BarChart3,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Pause
} from 'lucide-react'
import type { EmailCampaign } from '@/types/email'

interface CampaignListProps {
  campaigns: EmailCampaign[]
  loading?: boolean
  onEdit: (campaign: EmailCampaign) => void
  onCreate: () => void
  onDelete: (id: number) => void
  onSend: (campaign: EmailCampaign) => void
  onViewStats: (campaign: EmailCampaign) => void
}

export function CampaignList({
  campaigns,
  loading,
  onEdit,
  onCreate,
  onDelete,
  onSend,
  onViewStats
}: CampaignListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const statuses = ['all', 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { icon: any; className: string; label: string }> = {
      draft: { icon: Pencil, className: 'bg-gray-100 text-gray-800', label: 'Taslak' },
      scheduled: { icon: Clock, className: 'bg-blue-100 text-blue-800', label: 'Planlandı' },
      sending: { icon: Loader2, className: 'bg-yellow-100 text-yellow-800', label: 'Gönderiliyor' },
      sent: { icon: CheckCircle2, className: 'bg-green-100 text-green-800', label: 'Gönderildi' },
      paused: { icon: Pause, className: 'bg-orange-100 text-orange-800', label: 'Duraklatıldı' },
      cancelled: { icon: AlertCircle, className: 'bg-red-100 text-red-800', label: 'İptal' }
    }
    const config = configs[status] || configs.draft
    const Icon = config.icon
    
    return (
      <Badge className={`gap-1 ${config.className}`}>
        <Icon className={`h-3 w-3 ${status === 'sending' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: 'Tümü',
      draft: 'Taslak',
      scheduled: 'Planlandı',
      sending: 'Gönderiliyor',
      sent: 'Gönderildi',
      paused: 'Duraklatıldı',
      cancelled: 'İptal'
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email Kampanyaları
            </CardTitle>
            <CardDescription>
              Toplu email kampanyalarınızı yönetin
            </CardDescription>
          </div>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Kampanya
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Kampanya ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map(status => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {getStatusLabel(status)}
              </Button>
            ))}
          </div>
        </div>

        {/* Campaign List */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Send className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">Henüz kampanya yok</p>
            <p className="text-sm text-gray-400">İlk kampanyanızı oluşturmak için butona tıklayın</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map(campaign => (
              <div
                key={campaign.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    
                    {campaign.subject && (
                      <p className="text-gray-600 text-sm mb-2">
                        <span className="font-medium">Konu:</span> {campaign.subject}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-3">
                      <span>
                        <span className="font-medium">Alıcı:</span> {campaign.totalRecipients}
                      </span>
                      {campaign.status === 'sent' && (
                        <>
                          <span>
                            <span className="font-medium">Gönderilen:</span> {campaign.sentCount}
                          </span>
                          <span>
                            <span className="font-medium">Açılan:</span> {campaign.openedCount}
                          </span>
                        </>
                      )}
                      {campaign.scheduledAt && (
                        <span>
                          <span className="font-medium">Planlanan:</span>{' '}
                          {new Date(campaign.scheduledAt).toLocaleString('tr-TR')}
                        </span>
                      )}
                      {campaign.completedAt && (
                        <span>
                          <span className="font-medium">Tamamlandı:</span>{' '}
                          {new Date(campaign.completedAt).toLocaleString('tr-TR')}
                        </span>
                      )}
                    </div>
                    
                    {campaign.status === 'sent' && campaign.sentCount > 0 && (
                      <div className="mt-3">
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-600">
                            ✓ {((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(0)}% Gönderildi
                          </span>
                          {campaign.openedCount > 0 && (
                            <span className="text-blue-600">
                              👁 {((campaign.openedCount / campaign.sentCount) * 100).toFixed(0)}% Açıldı
                            </span>
                          )}
                          {campaign.bouncedCount > 0 && (
                            <span className="text-red-600">
                              ✗ {campaign.bouncedCount} Bounce
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onSend(campaign)}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4" />
                        Gönder
                      </Button>
                    )}
                    {(campaign.status === 'sent' || campaign.status === 'sending') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewStats(campaign)}
                        className="gap-1"
                      >
                        <BarChart3 className="h-4 w-4" />
                        İstatistik
                      </Button>
                    )}
                    {campaign.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(campaign)}
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(campaign.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


