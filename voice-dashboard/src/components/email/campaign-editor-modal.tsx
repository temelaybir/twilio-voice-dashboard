'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check } from 'lucide-react'
import type { EmailCampaign, EmailTemplate, EmailList, CampaignFormData } from '@/types/email'

interface CampaignEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign?: EmailCampaign | null
  templates: EmailTemplate[]
  lists: EmailList[]
  onSave: (data: CampaignFormData) => Promise<void>
}

export function CampaignEditorModal({
  open,
  onOpenChange,
  campaign,
  templates,
  lists,
  onSave
}: CampaignEditorModalProps) {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    templateId: 0,
    listIds: [],
    subject: '',
    fromName: '',
    fromEmail: '',
    replyTo: ''
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        templateId: campaign.templateId,
        listIds: campaign.listIds.split(',').map(id => parseInt(id.trim())),
        subject: campaign.subject || '',
        fromName: campaign.fromName || '',
        fromEmail: campaign.fromEmail || '',
        replyTo: campaign.replyTo || ''
      })
    } else {
      setFormData({
        name: '',
        templateId: templates[0]?.id || 0,
        listIds: [],
        subject: '',
        fromName: '',
        fromEmail: '',
        replyTo: ''
      })
    }
    setErrors({})
  }, [campaign, templates, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Kampanya adı zorunludur'
    if (!formData.templateId) newErrors.templateId = 'Şablon seçimi zorunludur'
    if (formData.listIds.length === 0) newErrors.listIds = 'En az bir liste seçilmelidir'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    
    setSaving(true)
    try {
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleList = (listId: number) => {
    setFormData(prev => ({
      ...prev,
      listIds: prev.listIds.includes(listId)
        ? prev.listIds.filter(id => id !== listId)
        : [...prev.listIds, listId]
    }))
  }

  const selectedTemplate = templates.find(t => t.id === formData.templateId)
  const totalSubscribers = lists
    .filter(l => formData.listIds.includes(l.id))
    .reduce((sum, l) => sum + l.subscriberCount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? 'Kampanyayı Düzenle' : 'Yeni Kampanya Oluştur'}
          </DialogTitle>
          <DialogDescription>
            Email kampanyanızı yapılandırın
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">Kampanya Adı *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Örn: Yılbaşı Kampanyası 2024"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Template Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Email Şablonu *</label>
            {templates.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz şablon oluşturulmamış</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto border rounded-lg p-2">
                {templates.filter(t => t.isActive).map(template => (
                  <div
                    key={template.id}
                    onClick={() => setFormData({ ...formData, templateId: template.id })}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      formData.templateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{template.name}</span>
                      {formData.templateId === template.id && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{template.subject}</p>
                  </div>
                ))}
              </div>
            )}
            {errors.templateId && <p className="text-red-500 text-xs mt-1">{errors.templateId}</p>}
          </div>

          {/* List Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Hedef Listeler *</label>
            {lists.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz liste oluşturulmamış</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {lists.filter(l => l.isActive).map(list => (
                    <Badge
                      key={list.id}
                      variant={formData.listIds.includes(list.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleList(list.id)}
                    >
                      {formData.listIds.includes(list.id) && <Check className="h-3 w-3 mr-1" />}
                      {list.name} ({list.subscriberCount})
                    </Badge>
                  ))}
                </div>
                {formData.listIds.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Toplam alıcı: <span className="font-semibold">{totalSubscribers}</span> kişi
                  </p>
                )}
              </>
            )}
            {errors.listIds && <p className="text-red-500 text-xs mt-1">{errors.listIds}</p>}
          </div>

          {/* Subject Override */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Email Konusu (Opsiyonel)
            </label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder={selectedTemplate ? `Varsayılan: ${selectedTemplate.subject}` : 'Şablon konusunu kullan'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Boş bırakırsanız şablonun konusu kullanılır
            </p>
          </div>

          {/* Sender Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Gönderen Adı</label>
              <Input
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                placeholder="Varsayılan: Happy Smile Clinics"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reply-To Email</label>
              <Input
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
                placeholder="Opsiyonel"
              />
            </div>
          </div>

          {/* Summary */}
          {selectedTemplate && formData.listIds.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Kampanya Özeti:</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Şablon: {selectedTemplate.name}</li>
                <li>• Konu: {formData.subject || selectedTemplate.subject}</li>
                <li>• Hedef: {formData.listIds.length} liste, {totalSubscribers} abone</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {campaign ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}








