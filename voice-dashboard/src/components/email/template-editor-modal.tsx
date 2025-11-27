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
import { Loader2, Eye, Code, Palette, ArrowLeft } from 'lucide-react'
import { VisualEmailEditor } from './visual-email-editor'
import type { EmailTemplate, TemplateFormData } from '@/types/email'

interface TemplateEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: EmailTemplate | null
  onSave: (data: TemplateFormData) => Promise<void>
}

const defaultHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Happy Smile Clinics</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
    <h2>Merhaba {{name}},</h2>
    
    <p>Bu email içeriğini buraya yazın...</p>
    
    <p>Saygılarımızla,<br>Happy Smile Clinics Ekibi</p>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666;">
    <p>© 2024 Happy Smile Clinics. Tüm hakları saklıdır.</p>
  </div>
</body>
</html>`

const categories = ['general', 'marketing', 'notification', 'reminder', 'welcome']

type EditorMode = 'select' | 'code' | 'visual'

export function TemplateEditorModal({
  open,
  onOpenChange,
  template,
  onSave
}: TemplateEditorModalProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    subject: '',
    htmlContent: defaultHtmlContent,
    textContent: '',
    category: 'general'
  })
  const [designJson, setDesignJson] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editorMode, setEditorMode] = useState<EditorMode>('select')

  useEffect(() => {
    if (open) {
      if (template) {
        setFormData({
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent || '',
          category: template.category
        })
        setDesignJson(null)
        // Mevcut şablonu düzenlerken direkt kod editöre git
        setEditorMode('code')
      } else {
        setFormData({
          name: '',
          subject: '',
          htmlContent: defaultHtmlContent,
          textContent: '',
          category: 'general'
        })
        setDesignJson(null)
        // Yeni şablon için seçim ekranını göster
        setEditorMode('select')
      }
      setErrors({})
    }
  }, [template, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Şablon adı zorunludur'
    if (!formData.subject.trim()) newErrors.subject = 'Konu zorunludur'
    if (!formData.htmlContent.trim()) newErrors.htmlContent = 'HTML içerik zorunludur'
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

  const handleVisualEditorSave = async (data: { html: string; design: any; name: string }) => {
    const updatedFormData = {
      ...formData,
      name: data.name,
      htmlContent: data.html
    }
    setFormData(updatedFormData)
    setDesignJson(data.design)
    
    // Validasyon
    if (!updatedFormData.subject.trim()) {
      setEditorMode('code')
      setErrors({ subject: 'Email konusu zorunludur' })
      return
    }
    
    setSaving(true)
    try {
      await onSave(updatedFormData)
      onOpenChange(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const previewHtml = formData.htmlContent
    .replace(/\{\{name\}\}/gi, 'Ahmet Yılmaz')
    .replace(/\{\{email\}\}/gi, 'ahmet@example.com')
    .replace(/\{\{firstName\}\}/gi, 'Ahmet')
    .replace(/\{\{lastName\}\}/gi, 'Yılmaz')
    .replace(/\{\{subject\}\}/gi, formData.subject)

  // Editör seçim ekranı
  if (editorMode === 'select') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Şablon Oluşturma Yöntemi Seçin</DialogTitle>
            <DialogDescription>
              Email şablonunuzu nasıl oluşturmak istiyorsunuz?
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-6">
            {/* Görsel Editör */}
            <button
              onClick={() => setEditorMode('visual')}
              className="group p-6 border-2 border-dashed rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Görsel Editör</h3>
              <p className="text-sm text-gray-600">
                Sürükle-bırak ile kolayca email tasarlayın. Kod bilgisi gerektirmez.
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">Drag & Drop</Badge>
                <Badge variant="secondary" className="text-xs">Kolay</Badge>
                <Badge variant="secondary" className="text-xs">Hazır Bloklar</Badge>
              </div>
            </button>

            {/* Kod Editör */}
            <button
              onClick={() => setEditorMode('code')}
              className="group p-6 border-2 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Code className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Kod Editör</h3>
              <p className="text-sm text-gray-600">
                HTML/CSS ile tam kontrol. İleri seviye kullanıcılar için.
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">HTML</Badge>
                <Badge variant="secondary" className="text-xs">CSS</Badge>
                <Badge variant="secondary" className="text-xs">Tam Kontrol</Badge>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Görsel Editör (Tam ekran - Portal kullanarak)
  if (editorMode === 'visual') {
    return (
      <div className="fixed inset-0 z-[100] bg-white">
        <VisualEmailEditor
          initialDesign={designJson}
          templateName={formData.name}
          onSave={handleVisualEditorSave}
          onCancel={() => {
            setEditorMode('select')
            onOpenChange(false)
          }}
        />
      </div>
    )
  }

  // Kod Editör
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {!template && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditorMode('select')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {template ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'} 
                <Badge variant="outline" className="ml-2">Kod Editör</Badge>
              </DialogTitle>
              <DialogDescription>
                Email şablonunuzu oluşturun. {"{{name}}"}, {"{{email}}"} gibi değişkenler kullanabilirsiniz.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Şablon Adı *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Hoş Geldiniz Maili"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kategori</label>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <Badge
                    key={cat}
                    variant={formData.category === cat ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => setFormData({ ...formData, category: cat })}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium mb-1 block">Email Konusu *</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Örn: Hoş Geldiniz {{name}}!"
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
          </div>

          {/* HTML Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">HTML İçerik *</label>
              <div className="flex gap-2">
                <Button
                  variant={showPreview ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <Code className="h-4 w-4 mr-1" />
                  Kod
                </Button>
                <Button
                  variant={showPreview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Önizle
                </Button>
              </div>
            </div>
            
            {showPreview ? (
              <div className="border rounded-lg p-4 bg-white min-h-[300px] max-h-[400px] overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : (
              <textarea
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                className="w-full h-[300px] p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="HTML içeriğini buraya yazın..."
              />
            )}
            {errors.htmlContent && <p className="text-red-500 text-xs mt-1">{errors.htmlContent}</p>}
          </div>

          {/* Text Content */}
          <div>
            <label className="text-sm font-medium mb-1 block">Düz Metin İçerik (Opsiyonel)</label>
            <textarea
              value={formData.textContent}
              onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
              className="w-full h-[100px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="HTML görüntülenemeyen email istemcileri için düz metin versiyonu..."
            />
          </div>

          {/* Variables Help */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Kullanılabilir Değişkenler:</p>
            <div className="flex flex-wrap gap-2">
              {['{{name}}', '{{firstName}}', '{{lastName}}', '{{email}}', '{{phone}}', '{{subject}}', '{{unsubscribeUrl}}'].map(v => (
                <code key={v} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
