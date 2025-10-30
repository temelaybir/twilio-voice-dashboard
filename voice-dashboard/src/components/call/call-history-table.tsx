import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mic, 
  Eye, 
  Hash,
  Calendar,
  Settings2,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { CallHistoryItem, DTMFActionType, PaginationInfo } from '@/types'
import { exportCallHistoryToCSV } from '@/lib/csv-export'

interface CallHistoryTableProps {
  calls: CallHistoryItem[]
  pagination?: PaginationInfo | null
  loading?: boolean
  onViewDetails?: (executionSid: string) => void
  onPageChange?: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  onExportAll?: () => void
}

export function CallHistoryTable({ 
  calls, 
  pagination,
  loading, 
  onViewDetails,
  onPageChange,
  onItemsPerPageChange,
  onExportAll
}: CallHistoryTableProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Tamamlandı</Badge>
      case 'busy':
        return <Badge variant="destructive">Meşgul</Badge>
      case 'no-answer':
        return <Badge variant="secondary">Yanıtsız</Badge>
      case 'failed':
        return <Badge variant="destructive">Başarısız</Badge>
      case 'canceled':
        return <Badge variant="outline">İptal</Badge>
      default:
        return <Badge variant="outline">{status || 'Bilinmiyor'}</Badge>
    }
  }

  const getActionBadge = (action: DTMFActionType) => {
    switch (action) {
      case 'confirm_appointment':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylandı
          </Badge>
        )
      case 'cancel_appointment':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            İptal Edildi
          </Badge>
        )
      case 'connect_to_representative':
        return (
          <Badge variant="secondary">
            <Mic className="w-3 h-3 mr-1" />
            Sesli Mesaj
          </Badge>
        )
      default:
        return null
    }
  }

  const formatPhoneNumber = (phoneNumber: string) => {
    // +90 ile başlayan numaraları düzenle
    if (phoneNumber.startsWith('+90')) {
      const cleaned = phoneNumber.slice(3)
      return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    // Diğer numaralar için
    return phoneNumber
  }

  const getPhoneInitials = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^\d]/g, '')
    return cleaned.slice(-2) // Son 2 rakam
  }

  // Pagination logic
  const renderPaginationItems = () => {
    if (!pagination) return null

    const items = []
    const { currentPage, totalPages } = pagination

    // Previous button
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious 
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          className={!pagination.hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    )

    // First page
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => onPageChange && onPageChange(1)} className="cursor-pointer">
            1
          </PaginationLink>
        </PaginationItem>
      )
      if (currentPage > 4) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }
    }

    // Current page range
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => onPageChange && onPageChange(i)}
            isActive={i === currentPage}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    // Last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => onPageChange && onPageChange(totalPages)} className="cursor-pointer">
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    // Next button
    items.push(
      <PaginationItem key="next">
        <PaginationNext 
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          className={!pagination.hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    )

    return items
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Çağrı Geçmişi
          </CardTitle>
          <CardDescription>
            Çağrı kayıtları yükleniyor...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Çağrı Geçmişi
          </CardTitle>
          <CardDescription>
            Henüz çağrı kaydı bulunmuyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">Henüz çağrı kaydı yok</p>
            <p className="text-sm text-gray-400">Çağrı başlattığınızda burada görünecek</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleExportCurrentPage = () => {
    exportCallHistoryToCSV(calls)
  }

  const handleExportAll = () => {
    if (onExportAll) {
      onExportAll()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Çağrı Geçmişi
            </CardTitle>
            <CardDescription>
              {pagination ? (
                <>
                  Toplam {pagination.total} kayıt • Sayfa {pagination.currentPage}/{pagination.totalPages}
                </>
              ) : (
                `${calls.length} çağrı kaydı ve DTMF etkileşimleri`
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCurrentPage}
                className="flex items-center gap-2"
                disabled={calls.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Bu Sayfa</span>
                <span className="sm:hidden">Export</span>
              </Button>
              
              {onExportAll && pagination && pagination.total > calls.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAll}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Tüm Kayıtlar</span>
                  <span className="sm:hidden">Tümü</span>
                </Button>
              )}
            </div>

            {/* Items per page selector */}
            {onItemsPerPageChange && (
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <select 
                  className="text-sm border rounded px-2 py-1"
                  defaultValue="20"
                  onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
                >
                  <option value="10">10 kayıt</option>
                  <option value="20">20 kayıt</option>
                  <option value="50">50 kayıt</option>
                  <option value="100">100 kayıt</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aranan</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>DTMF Aksiyonları</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call) => (
              <TableRow key={call.executionSid}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getPhoneInitials(call.to)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {formatPhoneNumber(call.to)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {call.executionSid.slice(-8)}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(call.status)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {call.dtmfActions.length > 0 ? (
                      call.dtmfActions.map((dtmf, index) => (
                        <div key={index}>
                          {getActionBadge(dtmf.action as DTMFActionType)}
                        </div>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Etkileşim yok
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(call.lastActivity), 'dd.MM.yyyy HH:mm', { locale: tr })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails?.(call.executionSid)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Detay
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <div className="text-sm text-muted-foreground">
              {pagination.total} kayıttan {((pagination.currentPage - 1) * pagination.limit) + 1}-{Math.min(pagination.currentPage * pagination.limit, pagination.total)} arası gösteriliyor
            </div>
            
            <Pagination>
              <PaginationContent>
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 