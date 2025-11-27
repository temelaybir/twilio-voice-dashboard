'use client'

import React, { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Save, 
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

  const onReady = (unlayer: any) => {
    console.log('🟢 Unlayer Editor Ready!', unlayer)
    setEditorReady(true)
    
    if (initialDesign) {
      unlayer.loadDesign(initialDesign)
    }
  }

  const onLoad = () => {
    console.log('🔵 Unlayer Editor Loaded')
    // Fallback: 2 saniye sonra ready olarak işaretle
    setTimeout(() => {
      if (!editorReady) {
        console.log('🟡 Fallback: Setting editorReady to true')
        setEditorReady(true)
      }
    }, 2000)
  }

  const handleSave = () => {
    const editorInstance = emailEditorRef.current
    console.log('🔵 handleSave - ref:', editorInstance)
    
    if (!editorInstance) {
      alert('Editör yüklenmedi.')
      return
    }
    
    setSaving(true)
    
    // Try different API methods
    if (typeof editorInstance.exportHtml === 'function') {
      editorInstance.exportHtml((data: any) => {
        onSave({ html: data.html, design: data.design, name })
        setSaving(false)
      })
    } else if (editorInstance.editor && typeof editorInstance.editor.exportHtml === 'function') {
      editorInstance.editor.exportHtml((data: any) => {
        onSave({ html: data.html, design: data.design, name })
        setSaving(false)
      })
    } else {
      console.log('Available methods:', Object.keys(editorInstance))
      alert('Export fonksiyonu bulunamadı.')
      setSaving(false)
    }
  }

  const handlePreview = () => {
    const editorInstance = emailEditorRef.current
    
    if (!editorInstance) {
      alert('Editör yüklenmedi.')
      return
    }
    
    const exportFn = editorInstance.exportHtml || editorInstance.editor?.exportHtml
    if (exportFn) {
      exportFn.call(editorInstance.editor || editorInstance, (data: any) => {
        const previewWindow = window.open('', '_blank')
        if (previewWindow) {
          previewWindow.document.write(data.html)
          previewWindow.document.close()
        }
      })
    }
  }

  const handleExportHtml = () => {
    const editorInstance = emailEditorRef.current
    
    if (!editorInstance) {
      alert('Editör yüklenmedi.')
      return
    }
    
    const exportFn = editorInstance.exportHtml || editorInstance.editor?.exportHtml
    if (exportFn) {
      exportFn.call(editorInstance.editor || editorInstance, (data: any) => {
        const blob = new Blob([data.html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name || 'template'}.html`
        a.click()
        URL.revokeObjectURL(url)
      })
    }
  }

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
    }
  }

  return (
    <>
      {/* Global styles for full height */}
      <style jsx global>{`
        .email-editor-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 9999 !important;
          display: flex !important;
          flex-direction: column !important;
          background: white !important;
        }
        .email-editor-container .editor-wrapper {
          flex: 1 !important;
          min-height: 0 !important;
          position: relative !important;
        }
        .email-editor-container .editor-wrapper > div {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
        .email-editor-container iframe {
          height: 100% !important;
          min-height: 100% !important;
        }
      `}</style>

      <div className="email-editor-container">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-semibold">Görsel Email Editörü</h1>
                </div>
              </div>
              
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Şablon adı..."
                className="w-56 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="text-white hover:bg-white/20 h-8"
              >
                <Eye className="h-4 w-4 mr-1" />
                Önizle
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportHtml}
                className="text-white hover:bg-white/20 h-8"
              >
                <FileCode className="h-4 w-4 mr-1" />
                HTML
              </Button>
              
              <div className="w-px h-5 bg-white/30 mx-1" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-white hover:bg-white/20 h-8"
              >
                <X className="h-4 w-4 mr-1" />
                İptal
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                size="sm"
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold h-8"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Kaydet
              </Button>
            </div>
          </div>
        </div>

        {/* Variables Bar */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Wand2 className="h-4 w-4" />
              <span className="font-medium text-sm">Değişkenler:</span>
            </div>
            <div className="flex gap-2">
              {['{{name}}', '{{email}}', '{{phone}}', '{{city}}', '{{unsubscribeUrl}}'].map(tag => (
                <code 
                  key={tag}
                  className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-mono cursor-pointer hover:bg-amber-200"
                  onClick={() => navigator.clipboard.writeText(tag)}
                >
                  {tag}
                </code>
              ))}
            </div>
          </div>
        </div>

        {/* Editor - Takes remaining space */}
        <div className="editor-wrapper">
          <EmailEditor
            ref={emailEditorRef}
            onReady={onReady}
            onLoad={onLoad}
            options={editorOptions}
          />
          
          {!editorReady && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Editör hazırlanıyor...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
