'use client'

import { useState } from 'react'
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
import { Loader2, Upload, FileText, Check, AlertCircle, FileSpreadsheet, Table } from 'lucide-react'
import type { EmailList, BulkSubscriberResult } from '@/types/email'
import { parseXlsFile } from '@/lib/email-api'

interface SubscriberImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lists: EmailList[]
  onImport: (subscribers: any[], listId: number) => Promise<BulkSubscriberResult>
}

export function SubscriberImportModal({
  open,
  onOpenChange,
  lists,
  onImport
}: SubscriberImportModalProps) {
  const [selectedListId, setSelectedListId] = useState<number>(lists[0]?.id || 0)
  const [importMode, setImportMode] = useState<'csv' | 'xls'>('xls')
  const [csvData, setCsvData] = useState('')
  const [xlsData, setXlsData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<BulkSubscriberResult | null>(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    const emailIndex = headers.findIndex(h => h === 'email' || h === 'e-mail' || h === 'mail' || h === 'eposta')
    const firstNameIndex = headers.findIndex(h => h === 'firstname' || h === 'first_name' || h === 'ad' || h === 'isim' || h === 'name')
    const lastNameIndex = headers.findIndex(h => h === 'lastname' || h === 'last_name' || h === 'soyad')
    const phoneIndex = headers.findIndex(h => h === 'phone' || h === 'telefon' || h === 'tel' || h === 'gsm' || h === 'cep')
    const cityIndex = headers.findIndex(h => h === 'city' || h === 'şehir' || h === 'sehir' || h === 'il')
    
    const subscribers = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      const email = emailIndex >= 0 ? values[emailIndex] : undefined
      const phone = phoneIndex >= 0 ? values[phoneIndex] : undefined
      
      if (email || phone) {
        let formattedPhone = phone
        if (formattedPhone) {
          formattedPhone = formattedPhone.replace(/\s/g, '').replace(/-/g, '')
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '+9' + formattedPhone
          } else if (formattedPhone.startsWith('5') && formattedPhone.length === 10) {
            formattedPhone = '+90' + formattedPhone
          } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone
          }
        }
        
        subscribers.push({
          email,
          firstName: firstNameIndex >= 0 ? values[firstNameIndex] : undefined,
          lastName: lastNameIndex >= 0 ? values[lastNameIndex] : undefined,
          phone: formattedPhone,
          city: cityIndex >= 0 ? values[cityIndex] : undefined
        })
      }
    }
    
    return subscribers
  }

  const handleXlsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFileName(file.name)
    setParsing(true)
    setError('')
    setXlsData([])
    
    try {
      const result = await parseXlsFile(file)
      setXlsData(result.data)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Dosya okunamadı')
      setXlsData([])
    } finally {
      setParsing(false)
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvData(text)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!selectedListId) {
      setError('Lütfen bir liste seçin')
      return
    }
    
    let subscribers: any[] = []
    
    if (importMode === 'xls') {
      if (xlsData.length === 0) {
        setError('Lütfen bir XLS/XLSX dosyası yükleyin')
        return
      }
      subscribers = xlsData
    } else {
      if (!csvData.trim()) {
        setError('Lütfen CSV verisi girin')
        return
      }
      try {
        subscribers = parseCSV(csvData)
      } catch (err: any) {
        setError(err.message || 'CSV parse hatası')
        return
      }
    }
    
    if (subscribers.length === 0) {
      setError('Geçerli kayıt bulunamadı')
      return
    }
    
    setImporting(true)
    setError('')
    setResult(null)
    
    try {
      const importResult = await onImport(subscribers, selectedListId)
      setResult(importResult)
      
      if (importResult.added > 0) {
        setCsvData('')
        setXlsData([])
        setFileName('')
      }
    } catch (err: any) {
      setError(err.message || 'İçe aktarma hatası')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setCsvData('')
    setXlsData([])
    setResult(null)
    setError('')
    setFileName('')
    onOpenChange(false)
  }

  const currentData = importMode === 'xls' ? xlsData : (csvData ? parseCSV(csvData) : [])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Toplu Abone İçe Aktarma
          </DialogTitle>
          <DialogDescription>
            Excel (XLS/XLSX) veya CSV dosyasından aboneleri içe aktarın
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Import Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={importMode === 'xls' ? 'default' : 'outline'}
              onClick={() => setImportMode('xls')}
              className="flex-1 gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel (XLS/XLSX)
            </Button>
            <Button
              variant={importMode === 'csv' ? 'default' : 'outline'}
              onClick={() => setImportMode('csv')}
              className="flex-1 gap-2"
            >
              <FileText className="h-4 w-4" />
              CSV
            </Button>
          </div>

          {/* List Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Hedef Liste *</label>
            <div className="flex flex-wrap gap-2">
              {lists.map(list => (
                <Badge
                  key={list.id}
                  variant={selectedListId === list.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedListId(list.id)}
                >
                  {selectedListId === list.id && <Check className="h-3 w-3 mr-1" />}
                  {list.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* XLS Upload */}
          {importMode === 'xls' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Excel Dosyası (XLS/XLSX)</label>
              <label className="block">
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleXlsUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors bg-purple-50/50">
                  {parsing ? (
                    <>
                      <Loader2 className="h-10 w-10 mx-auto text-purple-500 mb-3 animate-spin" />
                      <p className="text-sm text-purple-600">Dosya işleniyor...</p>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-10 w-10 mx-auto text-purple-500 mb-3" />
                      <p className="text-sm text-gray-600 font-medium">
                        {fileName || 'Excel dosyası yüklemek için tıklayın'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">.xls veya .xlsx formatı</p>
                    </>
                  )}
                </div>
              </label>
              
              {xlsData.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  ✅ {xlsData.length} kayıt bulundu
                </p>
              )}
            </div>
          )}

          {/* CSV Upload/Input */}
          {importMode === 'csv' && (
            <div>
              <label className="text-sm font-medium mb-2 block">CSV Dosyası veya Veri</label>
              <label className="block mb-2">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
                  <FileText className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">{fileName || 'CSV dosyası yükle'}</p>
                </div>
              </label>
              
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="w-full h-[120px] p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ad,telefon,email,şehir
Ahmet Yılmaz,05551234567,ahmet@example.com,İstanbul
Ayşe Kaya,05559876543,ayse@example.com,Ankara"
              />
            </div>
          )}

          {/* Preview Table */}
          {currentData.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Table className="h-4 w-4" />
                <span className="text-sm font-medium">Önizleme ({currentData.length} kayıt)</span>
              </div>
              <div className="border rounded-lg overflow-x-auto max-h-[200px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Ad</th>
                      <th className="px-3 py-2 text-left">Soyad</th>
                      <th className="px-3 py-2 text-left">Telefon</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Şehir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{row.firstName || '-'}</td>
                        <td className="px-3 py-2">{row.lastName || '-'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.phone || '-'}</td>
                        <td className="px-3 py-2">{row.email || '-'}</td>
                        <td className="px-3 py-2">{row.city || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {currentData.length > 10 && (
                  <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
                    ... ve {currentData.length - 10} kayıt daha
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format Help */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">
              {importMode === 'xls' ? 'Excel Formatı:' : 'CSV Formatı:'}
            </p>
            <p className="text-xs text-blue-700 mb-2">
              Desteklenen sütun başlıkları (Türkçe veya İngilizce):
            </p>
            <div className="flex flex-wrap gap-2">
              <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                ad / firstName
              </code>
              <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                telefon / phone
              </code>
              <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                email / e-posta
              </code>
              <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                şehir / city
              </code>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              💡 Telefon numaraları otomatik formatlanır (05xx → +905xx)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Kapat
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importing || parsing || currentData.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentData.length > 0 ? `${currentData.length} Kayıt İçe Aktar` : 'İçe Aktar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
