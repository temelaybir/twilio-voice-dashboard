'use client'

import { useState, useEffect, useMemo } from 'react'
import { getConfirmations, ConfirmationStats, ConfirmationFilters, ConfirmationFilterOptions } from '@/lib/email-api'
import { EmailSubscriber } from '@/types/email'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  MapPin,
  User,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  CalendarCheck,
  Search,
  Filter,
  X,
  ListFilter,
  ChevronDown
} from 'lucide-react'

interface AppointmentConfirmationsProps {
  onRefresh?: () => void
}

export function AppointmentConfirmations({ onRefresh }: AppointmentConfirmationsProps) {
  const [confirmations, setConfirmations] = useState<EmailSubscriber[]>([])
  const [stats, setStats] = useState<ConfirmationStats | null>(null)
  const [filteredStats, setFilteredStats] = useState<ConfirmationStats | null>(null)
  const [filterOptions, setFilterOptions] = useState<ConfirmationFilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filtreler
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [listFilter, setListFilter] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const filters: ConfirmationFilters = {}
      if (listFilter) filters.listId = listFilter
      if (cityFilter) filters.city = cityFilter
      if (debouncedSearch) filters.search = debouncedSearch
      if (statusFilter !== 'all') filters.status = statusFilter
      
      const result = await getConfirmations(filters)
      setConfirmations(result.data)
      setStats(result.stats)
      setFilteredStats(result.filteredStats)
      setFilterOptions(result.filters)
    } catch (error) {
      console.error('Onay verileri yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, cityFilter, listFilter, debouncedSearch])

  const clearFilters = () => {
    setStatusFilter('all')
    setCityFilter('')
    setListFilter(null)
    setSearchQuery('')
  }

  const hasActiveFilters = statusFilter !== 'all' || cityFilter || listFilter || searchQuery

  const getStatusBadge = (status?: string, note?: string) => {
    // NEXT_EVENT notu varsa özel badge göster
    if (status === 'rescheduled' && note?.startsWith('NEXT_EVENT')) {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-300"><Calendar className="h-3 w-3 mr-1" /> Next Event</Badge>
    }
    
    // Telefon onayları için özel badge'ler
    const isPhoneConfirm = note?.startsWith('PHONE_');
    const phoneIcon = isPhoneConfirm ? '📞 ' : '';
    
    switch (status) {
      case 'confirmed':
        if (note === 'PHONE_CONFIRMED') {
          return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> 📞 Tel. Onaylandı</Badge>
        }
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> Potwierdzone</Badge>
      case 'cancelled':
        if (note === 'PHONE_CANCELLED') {
          return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> 📞 Tel. İptal</Badge>
        }
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Anulowane</Badge>
      case 'rescheduled':
        if (note === 'PHONE_RESCHEDULED') {
          return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><RefreshCw className="h-3 w-3 mr-1" /> 📞 Tel. Ertelendi</Badge>
        }
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><RefreshCw className="h-3 w-3 mr-1" /> Zmiana terminu</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><AlertCircle className="h-3 w-3 mr-1" /> Oczekuje</Badge>
    }
  }

  const getListName = (listId: number) => {
    if (!filterOptions?.lists) return null
    const list = filterOptions.lists.find(l => l.id === listId)
    return list?.name || null
  }

  if (loading && !confirmations.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Randevu Onayları
            </CardTitle>
            <CardDescription>
              Email ile gönderilen randevu onay durumlarını takip edin
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div 
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                statusFilter === 'all' 
                  ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-300' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setStatusFilter('all')}
            >
              <div className="text-2xl font-bold text-gray-900">
                {hasActiveFilters ? filteredStats?.total : stats.total}
              </div>
              <div className="text-sm text-gray-600">Toplam</div>
              {hasActiveFilters && filteredStats?.total !== stats.total && (
                <div className="text-xs text-gray-400 mt-1">/ {stats.total}</div>
              )}
            </div>
            <div 
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' 
                  : 'bg-blue-50 border-blue-200 hover:border-blue-300'
              }`}
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              <div className="text-2xl font-bold text-blue-700">
                {hasActiveFilters ? filteredStats?.pending : stats.pending}
              </div>
              <div className="text-sm text-blue-600">Beklemede</div>
              {hasActiveFilters && filteredStats?.pending !== stats.pending && (
                <div className="text-xs text-blue-400 mt-1">/ {stats.pending}</div>
              )}
            </div>
            <div 
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                statusFilter === 'confirmed' 
                  ? 'bg-green-100 border-green-400 ring-2 ring-green-300' 
                  : 'bg-green-50 border-green-200 hover:border-green-300'
              }`}
              onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
            >
              <div className="text-2xl font-bold text-green-700">
                {hasActiveFilters ? filteredStats?.confirmed : stats.confirmed}
              </div>
              <div className="text-sm text-green-600">Onaylandı</div>
              {hasActiveFilters && filteredStats?.confirmed !== stats.confirmed && (
                <div className="text-xs text-green-400 mt-1">/ {stats.confirmed}</div>
              )}
            </div>
            <div 
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                statusFilter === 'rescheduled' 
                  ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300' 
                  : 'bg-amber-50 border-amber-200 hover:border-amber-300'
              }`}
              onClick={() => setStatusFilter(statusFilter === 'rescheduled' ? 'all' : 'rescheduled')}
            >
              <div className="text-2xl font-bold text-amber-700">
                {hasActiveFilters ? filteredStats?.rescheduled : stats.rescheduled}
              </div>
              <div className="text-sm text-amber-600">Değişiklik</div>
              {hasActiveFilters && filteredStats?.rescheduled !== stats.rescheduled && (
                <div className="text-xs text-amber-400 mt-1">/ {stats.rescheduled}</div>
              )}
            </div>
            <div 
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                statusFilter === 'cancelled' 
                  ? 'bg-red-100 border-red-400 ring-2 ring-red-300' 
                  : 'bg-red-50 border-red-200 hover:border-red-300'
              }`}
              onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
            >
              <div className="text-2xl font-bold text-red-700">
                {hasActiveFilters ? filteredStats?.cancelled : stats.cancelled}
              </div>
              <div className="text-sm text-red-600">İptal</div>
              {hasActiveFilters && filteredStats?.cancelled !== stats.cancelled && (
                <div className="text-xs text-red-400 mt-1">/ {stats.cancelled}</div>
              )}
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="İsim, telefon veya email ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 ${showFilters ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filtreler
              {hasActiveFilters && !showFilters && (
                <Badge className="bg-purple-100 text-purple-700 ml-1">
                  {[statusFilter !== 'all', cityFilter, listFilter, searchQuery].filter(Boolean).length}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Temizle
              </Button>
            )}
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin className="h-3.5 w-3.5 inline mr-1" />
                  Şehir
                </label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Tüm şehirler</option>
                  {filterOptions?.cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              
              {/* List Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <ListFilter className="h-3.5 w-3.5 inline mr-1" />
                  Liste
                </label>
                <select
                  value={listFilter || ''}
                  onChange={(e) => setListFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Tüm listeler</option>
                  {filterOptions?.lists.map(list => (
                    <option key={list.id} value={list.id}>
                      {list.name} {list.city && `(${list.city})`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter - Visual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                  Durum
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">Tüm durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="confirmed">Onaylandı</option>
                  <option value="rescheduled">Değişiklik</option>
                  <option value="cancelled">İptal</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Active Filters Pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {statusFilter !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-gray-200"
                  onClick={() => setStatusFilter('all')}
                >
                  Durum: {statusFilter === 'pending' ? 'Beklemede' : statusFilter === 'confirmed' ? 'Onaylandı' : statusFilter === 'rescheduled' ? 'Değişiklik' : 'İptal'}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {cityFilter && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-gray-200"
                  onClick={() => setCityFilter('')}
                >
                  Şehir: {cityFilter}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {listFilter && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-gray-200"
                  onClick={() => setListFilter(null)}
                >
                  Liste: {getListName(listFilter) || `#${listFilter}`}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {searchQuery && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-gray-200"
                  onClick={() => setSearchQuery('')}
                >
                  Arama: "{searchQuery}"
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className="text-sm text-gray-500">
            {confirmations.length} sonuç gösteriliyor
            {stats && ` (toplam ${stats.total})`}
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : confirmations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{hasActiveFilters ? 'Filtrelere uygun sonuç bulunamadı' : 'Henüz randevu onayı yok'}</p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="mt-2 text-purple-600"
                >
                  Filtreleri temizle
                </Button>
              )}
            </div>
          ) : (
            confirmations.map(confirmation => (
              <div 
                key={confirmation.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">
                        {confirmation.fullName || confirmation.firstName || 'Bilinmiyor'}
                      </span>
                      {getStatusBadge(confirmation.confirmationStatus, confirmation.confirmationNote)}
                      {getListName(confirmation.listId) && (
                        <Badge variant="outline" className="text-xs">
                          {getListName(confirmation.listId)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                      {confirmation.eventDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-medium">{confirmation.eventDate}</span>
                        </div>
                      )}
                      {confirmation.eventTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-medium">{confirmation.eventTime}</span>
                        </div>
                      )}
                      {confirmation.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-500" />
                          <span>{confirmation.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {confirmation.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{confirmation.phone}</span>
                        </div>
                      )}
                      {confirmation.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{confirmation.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    {confirmation.confirmationNote && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5" />
                          <span className="text-gray-800">{confirmation.confirmationNote}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmed At */}
                  {confirmation.confirmedAt && (
                    <div className="text-right text-xs text-gray-500">
                      <div className="font-medium">Yanıt:</div>
                      <div>{new Date(confirmation.confirmedAt).toLocaleString('tr-TR')}</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
