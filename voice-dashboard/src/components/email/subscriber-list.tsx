'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Plus, 
  Trash2, 
  Upload,
  Search,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Loader2,
  Pencil,
  X
} from 'lucide-react'
import type { EmailSubscriber, EmailList } from '@/types/email'

interface SubscriberListProps {
  subscribers: EmailSubscriber[]
  lists: EmailList[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  selectedListId: number | null
  onSelectList: (listId: number | null) => void
  onAddSubscriber: () => void
  onBulkImport: () => void
  onDelete: (id: number) => void
  onUpdate?: (id: number, data: Partial<EmailSubscriber>) => Promise<void>
  onBulkDelete?: (ids: number[]) => Promise<void>
  onDeleteAllInList?: (listId: number) => Promise<void>
  onPageChange: (page: number) => void
}

export function SubscriberList({
  subscribers,
  lists,
  loading,
  pagination,
  selectedListId,
  onSelectList,
  onAddSubscriber,
  onBulkImport,
  onDelete,
  onUpdate,
  onBulkDelete,
  onDeleteAllInList,
  onPageChange
}: SubscriberListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)
  const [editingSubscriber, setEditingSubscriber] = useState<EmailSubscriber | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredSubscribers = subscribers.filter(sub =>
    (sub.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (sub.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (sub.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (sub.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (sub.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      unsubscribed: 'bg-gray-100 text-gray-800',
      bounced: 'bg-red-100 text-red-800',
      complained: 'bg-orange-100 text-orange-800'
    }
    const labels: Record<string, string> = {
      active: 'Aktif',
      unsubscribed: 'Abonelikten Çıktı',
      bounced: 'Bounce',
      complained: 'Şikayet'
    }
    return (
      <Badge className={styles[status] || styles.active}>
        {labels[status] || status}
      </Badge>
    )
  }

  const selectedList = lists.find(l => l.id === selectedListId)

  const toggleSelect = (id: number) => {
    if (!id || isNaN(id)) return
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubscribers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubscribers.map(s => s.id).filter(id => id && !isNaN(id)))
    }
  }

  const handleBulkDelete = async () => {
    const validIds = selectedIds.filter(id => id && !isNaN(id))
    if (validIds.length === 0) return
    if (!confirm(`${validIds.length} abone silinecek. Emin misiniz?`)) return
    
    setDeleting(true)
    try {
      if (onBulkDelete) {
        await onBulkDelete(validIds)
      }
      setSelectedIds([])
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAllInList = async () => {
    if (!selectedListId || !onDeleteAllInList) return
    if (!confirm(`"${selectedList?.name}" listesindeki TÜM aboneler silinecek. Emin misiniz?`)) return
    
    setDeleting(true)
    try {
      await onDeleteAllInList(selectedListId)
      setSelectedIds([])
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingSubscriber || !onUpdate) return

    const formData = new FormData(e.currentTarget)
    const data = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      city: formData.get('city') as string,
      stage: formData.get('stage') as string,
      eventDate: formData.get('eventDate') as string,
      eventTime: formData.get('eventTime') as string,
      status: formData.get('status') as 'active' | 'unsubscribed' | 'bounced' | 'complained',
    }

    setSaving(true)
    try {
      await onUpdate(editingSubscriber.id, data)
      setEditingSubscriber(null)
    } finally {
      setSaving(false)
    }
  }

  const getDisplayName = (sub: EmailSubscriber) => {
    if (sub.fullName) return sub.fullName
    if (sub.firstName || sub.lastName) {
      return `${sub.firstName || ''} ${sub.lastName || ''}`.trim()
    }
    return '-'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Aboneler
                {selectedList && (
                  <Badge variant="outline" className="ml-2">
                    {selectedList.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {pagination ? `${pagination.total} abone` : 'Email listelerindeki aboneler'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBulkImport} className="gap-2">
                <Upload className="h-4 w-4" />
                Toplu İçe Aktar
              </Button>
              <Button onClick={onAddSubscriber} className="gap-2">
                <Plus className="h-4 w-4" />
                Abone Ekle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Email veya isim ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedListId === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectList(null)}
              >
                Tüm Listeler
              </Button>
              {lists.map(list => (
                <Button
                  key={list.id}
                  variant={selectedListId === list.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectList(list.id)}
                >
                  {list.name} ({list.subscriberCount})
                </Button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {(selectedIds.length > 0 || selectedListId) && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedIds.length} abone seçildi
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="gap-2"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Seçilenleri Sil
                  </Button>
                </>
              )}
              {selectedListId && onDeleteAllInList && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAllInList}
                  disabled={deleting}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Tüm Listeyi Sil
                </Button>
              )}
            </div>
          )}

          {/* Subscriber Table */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">Henüz abone yok</p>
              <p className="text-sm text-gray-400">Abone eklemek için butona tıklayın veya toplu içe aktarın</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-100 rounded">
                          {selectedIds.length === filteredSubscribers.length ? (
                            <CheckSquare className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>İsim</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Şehir</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Gönderilen</TableHead>
                      <TableHead className="w-[100px]">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map(subscriber => (
                      <TableRow key={subscriber.id} className={selectedIds.includes(subscriber.id) ? 'bg-purple-50' : ''}>
                        <TableCell>
                          <button onClick={() => toggleSelect(subscriber.id)} className="p-1 hover:bg-gray-100 rounded">
                            {selectedIds.includes(subscriber.id) ? (
                              <CheckSquare className="h-4 w-4 text-purple-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {getDisplayName(subscriber)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{subscriber.phone || '-'}</TableCell>
                        <TableCell>{subscriber.email || '-'}</TableCell>
                        <TableCell>{subscriber.city || '-'}</TableCell>
                        <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                        <TableCell>{subscriber.emailsSent}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSubscriber(subscriber)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(subscriber.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Sayfa {pagination.page} / {pagination.totalPages} ({pagination.total} abone)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Sonraki
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingSubscriber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Abone Düzenle</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingSubscriber(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ad Soyad</label>
                  <Input
                    name="fullName"
                    defaultValue={editingSubscriber.fullName || ''}
                    placeholder="Ad Soyad"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefon</label>
                    <Input
                      name="phone"
                      defaultValue={editingSubscriber.phone || ''}
                      placeholder="+905551234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      name="email"
                      type="email"
                      defaultValue={editingSubscriber.email || ''}
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Şehir</label>
                    <Input
                      name="city"
                      defaultValue={editingSubscriber.city || ''}
                      placeholder="İstanbul"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Aşama/Stage</label>
                    <Input
                      name="stage"
                      defaultValue={editingSubscriber.stage || ''}
                      placeholder="Yeni Lead"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Etkinlik Tarihi</label>
                    <Input
                      name="eventDate"
                      defaultValue={editingSubscriber.eventDate || ''}
                      placeholder="2025-12-15 veya 15 Aralık"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Etkinlik Saati</label>
                    <Input
                      name="eventTime"
                      defaultValue={editingSubscriber.eventTime || ''}
                      placeholder="14:00 veya 14:00-15:00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Durum</label>
                  <select
                    name="status"
                    defaultValue={editingSubscriber.status}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="unsubscribed">Abonelikten Çıktı</option>
                    <option value="bounced">Bounce</option>
                    <option value="complained">Şikayet</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingSubscriber(null)}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Kaydet
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
