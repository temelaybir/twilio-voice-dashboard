'use client'

import React, { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Save, 
  Download, 
  Eye, 
  Loader2,
  Wand2,
  FileCode,
  Palette,
  X
} from 'lucide-react'

// Dynamic import for SSR compatibility
const EmailEditor = dynamic(() => import('react-email-editor'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center animate-pulse">
          <Palette className="h-8 w-8 text-white" />
        </div>
        <p className="text-lg font-medium text-gray-700">Editör Yükleniyor...</p>
        <p className="text-sm text-gray-500 mt-1">Lütfen bekleyin</p>
      </div>
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

  // Unlayer editor options
  const editorOptions: any = {
    displayMode: 'email',
    appearance: {
      theme: 'modern_light',
      panels: {
        tools: {
          dock: 'right'
        }
      }
    },
    features: {
      preview: true,
      imageEditor: true,
      undoRedo: true,
      stockImages: {
        enabled: true,
        safeSearch: true
      }
    },
    tools: {
      image: {
        enabled: true
      }
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-white overflow-hidden">
      {/* Header - Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Sol - Logo ve İsim */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg">Görsel Email Editörü</h1>
                <p className="text-white/70 text-xs">Sürükle-bırak ile tasarla</p>
              </div>
            </div>
            
            {/* Şablon Adı Input */}
            <div className="ml-6">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Şablon adını girin..."
                className="w-64 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
              />
            </div>
          </div>
          
          {/* Sağ - Butonlar */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              disabled={!editorReady}
              className="text-white hover:bg-white/20 gap-2"
            >
              <Eye className="h-4 w-4" />
              Önizle
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportHtml}
              disabled={!editorReady}
              className="text-white hover:bg-white/20 gap-2"
            >
              <FileCode className="h-4 w-4" />
              HTML
            </Button>
            
            <div className="w-px h-6 bg-white/30 mx-2" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-white hover:bg-white/20 gap-2"
            >
              <X className="h-4 w-4" />
              İptal
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!editorReady || saving || !name.trim()}
              className="gap-2 bg-white text-purple-700 hover:bg-white/90 font-semibold shadow-lg"
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

      {/* Değişkenler Bar */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Wand2 className="h-4 w-4" />
            <span className="font-medium text-sm">Değişkenler:</span>
          </div>
          <div className="flex gap-2">
            {['{{name}}', '{{email}}', '{{phone}}', '{{city}}', '{{unsubscribeUrl}}'].map(tag => (
              <code 
                key={tag}
                className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-mono cursor-pointer hover:bg-amber-200 transition-colors"
                onClick={() => navigator.clipboard.writeText(tag)}
                title="Kopyalamak için tıkla"
              >
                {tag}
              </code>
            ))}
          </div>
          <span className="text-xs text-amber-600 ml-2">(Kopyalamak için tıkla)</span>
        </div>
      </div>

      {/* Editor Container - Full Height */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 120px)' }}>
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={editorOptions}
          style={{ 
            height: '100%',
            width: '100%'
          }}
        />
        
        {/* Loading Overlay */}
        {!editorReady && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Editör hazırlanıyor...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
