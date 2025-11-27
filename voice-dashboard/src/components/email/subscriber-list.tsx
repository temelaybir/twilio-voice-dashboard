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
  ChevronRight
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
  onPageChange
}: SubscriberListProps) {
  const [searchTerm, setSearchTerm] = useState('')

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

  return (
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
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">
                        {subscriber.firstName || subscriber.lastName
                          ? `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{subscriber.phone || '-'}</TableCell>
                      <TableCell>{subscriber.email || '-'}</TableCell>
                      <TableCell>{subscriber.city || '-'}</TableCell>
                      <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                      <TableCell>{subscriber.emailsSent}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(subscriber.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  )
}

