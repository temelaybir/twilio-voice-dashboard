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
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, FileText, Check, AlertCircle, FileSpreadsheet, Table, ArrowRight, ArrowLeft, Settings2, ChevronDown } from 'lucide-react'
import type { EmailList, BulkSubscriberResult } from '@/types/email'

interface SubscriberImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lists: EmailList[]
  onImport: (subscribers: any[], listId: number) => Promise<BulkSubscriberResult>
}

type ImportStep = 'upload' | 'mapping' | 'preview'

const TARGET_FIELDS = [
  { value: 'skip', label: 'Atla', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'fullName', label: 'Ad Soyad', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'email', label: 'Email', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'phone', label: 'Telefon', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'city', label: 'Şehir', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'stage', label: 'Stage', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'eventDate', label: 'Etkinlik Tarihi', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { value: 'eventTime', label: 'Etkinlik Saati', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
]

// Custom Dropdown Component
function FieldSelector({ 
  value, 
  onChange,
  disabled 
}: { 
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedField = TARGET_FIELDS.find(f => f.value === value) || TARGET_FIELDS[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium min-w-[100px] justify-between ${selectedField.color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
      >
        <span>{selectedField.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[120px]">
            {TARGET_FIELDS.map(field => (
              <button
                key={field.value}
                type="button"
                onClick={() => {
                  onChange(field.value)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${value === field.value ? 'bg-gray-50' : ''}`}
              >
                <span className={`w-3 h-3 rounded-full ${field.color.split(' ')[0]}`} />
                <span>{field.label}</span>
                {value === field.value && <Check className="h-3 w-3 ml-auto text-green-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function SubscriberImportModal({
  open,
  onOpenChange,
  lists,
  onImport
}: SubscriberImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [selectedListId, setSelectedListId] = useState<number>(lists[0]?.id || 0)
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<BulkSubscriberResult | null>(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  
  // Raw file data
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  
  // Parse sonuçları
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [previewData, setPreviewData] = useState<any[]>([])
  const [totalRows, setTotalRows] = useState(0)
  
  // Final mapped data
  const [mappedData, setMappedData] = useState<any[]>([])

  // Liste değiştiğinde selectedListId güncelle
  useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id)
    }
  }, [lists, selectedListId])

  const getApiBaseUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    if (envUrl.endsWith('/api')) return envUrl
    if (envUrl.endsWith('/api/')) return envUrl.slice(0, -1)
    return `${envUrl.replace(/\/$/, '')}/api`
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFileName(file.name)
    setParsing(true)
    setError('')
    setHeaders([])
    setColumnMapping({})
    setPreviewData([])
    
    const apiUrl = getApiBaseUrl()
    console.log('🔵 [Import] API Base URL:', apiUrl)
    console.log('🔵 [Import] File:', file.name, file.size, 'bytes')
    
    try {
      // Dosyayı buffer olarak oku
      const buffer = await file.arrayBuffer()
      setFileBuffer(buffer)
      
      const endpoint = `${apiUrl}/email/subscribers/parse-xls`
      console.log('🔵 [Import] Calling:', endpoint)
      
      // Backend'e gönder ve parse et
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      })
      
      console.log('🔵 [Import] Response status:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('🔵 [Import] Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Parse hatası')
      }
      
      setHeaders(data.headers)
      setColumnMapping(data.suggestedMapping)
      setPreviewData(data.previewData)
      setTotalRows(data.totalRows)
      
      // Otomatik olarak eşleştirme adımına geç
      setStep('mapping')
      
    } catch (err: any) {
      console.error('🔴 [Import] Error:', err)
      setError(err.message || 'Dosya okunamadı')
    } finally {
      setParsing(false)
    }
  }

  const handleMappingChange = (header: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [header]: value
    }))
  }

  const applyMapping = async () => {
    if (!fileBuffer) {
      setError('Dosya bulunamadı, lütfen tekrar yükleyin')
      return
    }
    
    setParsing(true)
    setError('')
    
    const apiUrl = getApiBaseUrl()
    const endpoint = `${apiUrl}/email/subscribers/apply-mapping`
    console.log('🟢 [Mapping] Calling:', endpoint)
    console.log('🟢 [Mapping] Column mapping:', columnMapping)
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'X-Column-Mapping': encodeURIComponent(JSON.stringify(columnMapping))
        },
        body: fileBuffer
      })
      
      console.log('🟢 [Mapping] Response status:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('🟢 [Mapping] Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Eşleştirme hatası')
      }
      
      setMappedData(data.data)
      setStep('preview')
      
    } catch (err: any) {
      console.error('🔴 [Mapping] Error:', err)
      setError(err.message || 'Eşleştirme uygulanamadı')
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!selectedListId) {
      setError('Lütfen bir liste seçin')
      return
    }
    
    if (mappedData.length === 0) {
      setError('İçe aktarılacak veri yok')
      return
    }
    
    setImporting(true)
    setError('')
    setResult(null)
    
    try {
      const importResult = await onImport(mappedData, selectedListId)
      setResult(importResult)
    } catch (err: any) {
      setError(err.message || 'İçe aktarma hatası')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setFileName('')
    setFileBuffer(null)
    setHeaders([])
    setColumnMapping({})
    setPreviewData([])
    setMappedData([])
    setTotalRows(0)
    setResult(null)
    setError('')
    onOpenChange(false)
  }

  const goBack = () => {
    if (step === 'mapping') {
      setStep('upload')
    } else if (step === 'preview') {
      setStep('mapping')
    }
  }

  const getMappedFieldsCount = () => {
    return Object.values(columnMapping).filter(v => v && v !== 'skip').length
  }

  const hasRequiredField = () => {
    const values = Object.values(columnMapping)
    return values.includes('phone') || values.includes('email')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Toplu Abone İçe Aktarma
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Excel (XLS/XLSX) dosyası yükleyin'}
            {step === 'mapping' && 'Sütunları eşleştirin'}
            {step === 'preview' && 'Önizleme ve içe aktarma'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step === 'upload' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">1</span>
            Dosya Yükle
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step === 'mapping' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">2</span>
            Sütun Eşleştir
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step === 'preview' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">3</span>
            İçe Aktar
          </div>
        </div>

        <div className="space-y-4 py-4">
          
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <>
              <div>
                <label className="block">
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-purple-400 transition-colors bg-purple-50/50">
                    {parsing ? (
                      <>
                        <Loader2 className="h-12 w-12 mx-auto text-purple-500 mb-3 animate-spin" />
                        <p className="text-sm text-purple-600 font-medium">Dosya işleniyor...</p>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-12 w-12 mx-auto text-purple-500 mb-3" />
                        <p className="text-lg text-gray-700 font-medium">
                          {fileName || 'Excel dosyası yüklemek için tıklayın'}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">.xls veya .xlsx formatı desteklenir</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">💡 Bilgi</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Excel dosyanızı yükleyin, sütunları manuel olarak eşleştirebilirsiniz</li>
                  <li>• En az telefon veya email sütunu gereklidir</li>
                  <li>• Telefon numaraları otomatik formatlanır (05xx → +905xx)</li>
                </ul>
              </div>
            </>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Sütun Eşleştirme
                    </span>
                    <Badge variant={getMappedFieldsCount() > 0 ? "default" : "secondary"}>
                      {getMappedFieldsCount()} alan eşleştirildi
                    </Badge>
                  </div>
                  <Badge variant="outline">{totalRows} satır</Badge>
                </div>
                
                <div className="space-y-2">
                  {headers.map(header => (
                    <div key={header} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 block truncate">{header}</span>
                        {previewData[0] && (
                          <span className="text-xs text-gray-400 truncate block">
                            örn: {String(previewData[0][header] || '-').substring(0, 30)}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <FieldSelector
                        value={columnMapping[header] || 'skip'}
                        onChange={(value) => handleMappingChange(header, value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-800 mb-3">Hızlı Seçim:</p>
                <div className="flex flex-wrap gap-2">
                  {TARGET_FIELDS.filter(f => f.value !== 'skip').map(field => (
                    <span key={field.value} className={`px-3 py-1 rounded-full text-xs font-medium ${field.color}`}>
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>

              {!hasRequiredField() && (
                <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    En az <strong>Telefon</strong> veya <strong>Email</strong> alanını eşleştirmeniz gerekiyor
                  </p>
                </div>
              )}
            </>
          )}

          {/* STEP 3: Preview & Import */}
          {step === 'preview' && (
            <>
              {/* List Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Hedef Liste *</label>
                <div className="flex flex-wrap gap-2">
                  {lists.map(list => (
                    <Badge
                      key={list.id}
                      variant={selectedListId === list.id ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => setSelectedListId(list.id)}
                    >
                      {selectedListId === list.id && <Check className="h-3 w-3 mr-1" />}
                      {list.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Final Preview */}
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  ✅ {mappedData.length} kayıt içe aktarmaya hazır
                </p>
              </div>

              {mappedData.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Table className="h-4 w-4" />
                    <span className="text-sm font-medium">İçe Aktarılacak Veriler</span>
                  </div>
                  <div className="border rounded-lg overflow-x-auto max-h-[250px]">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Ad Soyad</th>
                          <th className="px-3 py-2 text-left">Telefon</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Şehir</th>
                          <th className="px-3 py-2 text-left">Stage</th>
                          <th className="px-3 py-2 text-left">Tarih</th>
                          <th className="px-3 py-2 text-left">Saat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappedData.slice(0, 20).map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{row.fullName || '-'}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.phone || '-'}</td>
                            <td className="px-3 py-2">{row.email || '-'}</td>
                            <td className="px-3 py-2">{row.city || '-'}</td>
                            <td className="px-3 py-2">{row.stage || '-'}</td>
                            <td className="px-3 py-2">{row.eventDate || '-'}</td>
                            <td className="px-3 py-2">{row.eventTime || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {mappedData.length > 20 && (
                      <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                        ... ve {mappedData.length - 20} kayıt daha
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">İçe Aktarma Tamamlandı:</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>✅ {result.added} abone eklendi</li>
                    {result.skipped > 0 && <li>⏭️ {result.skipped} abone atlandı (mevcut/geçersiz)</li>}
                    {result.errors.length > 0 && (
                      <li>❌ {result.errors.length} hata</li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step !== 'upload' && (
              <Button variant="outline" onClick={goBack} disabled={parsing || importing}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Kapat' : 'İptal'}
            </Button>
            
            {step === 'mapping' && (
              <Button 
                onClick={applyMapping} 
                disabled={parsing || !hasRequiredField()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {parsing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Devam Et
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 'preview' && !result && (
              <Button 
                onClick={handleImport} 
                disabled={importing || mappedData.length === 0 || !selectedListId}
                className="bg-green-600 hover:bg-green-700"
              >
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mappedData.length} Kayıt İçe Aktar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
