'use client'

import React, { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Save, 
  Download, 
  Eye, 
  Undo, 
  Redo,
  Loader2,
  Wand2,
  FileCode,
  Palette
} from 'lucide-react'

// Dynamic import for SSR compatibility
const EmailEditor = dynamic(() => import('react-email-editor'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <span className="ml-2 text-gray-600">Editör yükleniyor...</span>
    </div>
  )
})

interface VisualEmailEditorProps {
  initialHtml?: string
  initialDesign?: any
  templateName?: string
  onSave: (data: { html: string; design: any; name: string }) => void
  onCancel: () => void
}

export function VisualEmailEditor({
  initialHtml,
  initialDesign,
  templateName = '',
  onSave,
  onCancel
}: VisualEmailEditorProps) {
  const emailEditorRef = useRef<any>(null)
  const [name, setName] = useState(templateName)
  const [saving, setSaving] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  const onReady = () => {
    setEditorReady(true)
    
    // Eğer mevcut design varsa yükle
    if (initialDesign && emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.loadDesign(initialDesign)
    }
  }

  const handleSave = () => {
    if (!emailEditorRef.current?.editor) return
    
    setSaving(true)
    emailEditorRef.current.editor.exportHtml((data: any) => {
      const { design, html } = data
      onSave({ html, design, name })
      setSaving(false)
    })
  }

  const handlePreview = () => {
    if (!emailEditorRef.current?.editor) return
    
    emailEditorRef.current.editor.exportHtml((data: any) => {
      const { html } = data
      const previewWindow = window.open('', '_blank')
      if (previewWindow) {
        previewWindow.document.write(html)
        previewWindow.document.close()
      }
    })
  }

  const handleExportHtml = () => {
    if (!emailEditorRef.current?.editor) return
    
    emailEditorRef.current.editor.exportHtml((data: any) => {
      const { html } = data
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name || 'template'}.html`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  // Unlayer editor options - simplified for type compatibility
  const editorOptions: any = {
    displayMode: 'email',
    appearance: {
      theme: 'modern_light'
    },
    features: {
      textEditor: {
        spellChecker: true
      }
    }
  }

  // Hazır şablon temaları
  const presetTemplates = [
    {
      name: 'Boş Şablon',
      design: null
    },
    {
      name: 'Hoş Geldiniz',
      design: {
        body: {
          rows: [
            {
              cells: [1],
              columns: [
                {
                  contents: [
                    {
                      type: 'image',
                      values: {
                        src: { url: 'https://via.placeholder.com/600x200/6366f1/ffffff?text=Happy+Smile+Clinics' },
                        alt: 'Logo'
                      }
                    },
                    {
                      type: 'heading',
                      values: {
                        text: 'Hoş Geldiniz!',
                        headingType: 'h1'
                      }
                    },
                    {
                      type: 'text',
                      values: {
                        text: '<p>Merhaba {{name}},</p><p>Happy Smile Clinics ailesine katıldığınız için teşekkür ederiz.</p>'
                      }
                    },
                    {
                      type: 'button',
                      values: {
                        text: 'Randevu Al',
                        href: 'https://happysmileclinics.com',
                        buttonColors: {
                          color: '#ffffff',
                          backgroundColor: '#6366f1'
                        }
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  ]

  const loadPresetTemplate = (template: any) => {
    if (emailEditorRef.current?.editor && template.design) {
      emailEditorRef.current.editor.loadDesign(template.design)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-lg">Görsel Email Editörü</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Şablon Adı:</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Şablon adını girin..."
                className="w-64"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Hazır Şablonlar */}
            <select
              onChange={(e) => {
                const template = presetTemplates[parseInt(e.target.value)]
                if (template) loadPresetTemplate(template)
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
              defaultValue=""
            >
              <option value="" disabled>Hazır Şablon Seç...</option>
              {presetTemplates.map((t, i) => (
                <option key={i} value={i}>{t.name}</option>
              ))}
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={!editorReady}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Önizle
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHtml}
              disabled={!editorReady}
              className="gap-2"
            >
              <FileCode className="h-4 w-4" />
              HTML İndir
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              İptal
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!editorReady || saving || !name.trim()}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* Merge Tags Info */}
      <div className="bg-purple-50 border-b border-purple-100 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-purple-700">
          <Wand2 className="h-4 w-4" />
          <span className="font-medium">Değişkenler:</span>
          <code className="bg-purple-100 px-2 py-0.5 rounded">{'{{name}}'}</code>
          <code className="bg-purple-100 px-2 py-0.5 rounded">{'{{email}}'}</code>
          <code className="bg-purple-100 px-2 py-0.5 rounded">{'{{phone}}'}</code>
          <code className="bg-purple-100 px-2 py-0.5 rounded">{'{{city}}'}</code>
          <code className="bg-purple-100 px-2 py-0.5 rounded">{'{{unsubscribeUrl}}'}</code>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-[600px]">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={editorOptions}
          style={{ height: '100%', minHeight: '600px' }}
        />
      </div>
    </div>
  )
}

