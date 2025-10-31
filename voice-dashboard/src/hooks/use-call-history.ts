import { useState, useEffect, useCallback } from 'react'
import { getCallHistory, getCallStats } from '@/lib/api'
import type { CallHistoryItem, DashboardStats, CallHistoryResponse, PaginationInfo } from '@/types'

export function useCallHistory() {
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const fetchCallHistory = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = (page - 1) * limit
      
      const [historyResponse, statsResponse] = await Promise.all([
        getCallHistory(limit, offset) as Promise<CallHistoryResponse>,
        getCallStats() as Promise<{ success: boolean; data: DashboardStats }>
      ])

      if (historyResponse.success && historyResponse.data) {
        setCallHistory(historyResponse.data)
        if (historyResponse.pagination) {
          setPagination(historyResponse.pagination)
        }
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Veri yüklenirken hata oluştu'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    fetchCallHistory(page, itemsPerPage)
  }, [fetchCallHistory, itemsPerPage])

  const nextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      goToPage(currentPage + 1)
    }
  }, [pagination, currentPage, goToPage])

  const previousPage = useCallback(() => {
    if (pagination?.hasPreviousPage) {
      goToPage(currentPage - 1)
    }
  }, [pagination, currentPage, goToPage])

  const changeItemsPerPage = useCallback((newLimit: number) => {
    setItemsPerPage(newLimit)
    setCurrentPage(1)
    fetchCallHistory(1, newLimit)
  }, [fetchCallHistory])

  const refreshData = useCallback(() => {
    fetchCallHistory(currentPage, itemsPerPage)
  }, [fetchCallHistory, currentPage, itemsPerPage])

  useEffect(() => {
    fetchCallHistory(currentPage, itemsPerPage)
  }, [fetchCallHistory, currentPage, itemsPerPage])

  return {
    callHistory,
    stats,
    pagination,
    loading,
    error,
    currentPage,
    itemsPerPage,
    refreshData,
    goToPage,
    nextPage,
    previousPage,
    changeItemsPerPage,
    fetchCallHistory
  }
} 