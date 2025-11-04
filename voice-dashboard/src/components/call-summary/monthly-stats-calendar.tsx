'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getMonthlySummary } from '@/lib/api'
import type { MonthlySummaryResponse, MonthlyDayStats } from '@/types'

interface MonthlyStatsCalendarProps {
  year?: number
  month?: number
  onClose?: () => void
}

export function MonthlyStatsCalendar({ year, month, onClose }: MonthlyStatsCalendarProps) {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(year || now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(month || now.getMonth() + 1)
  const [data, setData] = useState<MonthlySummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = useState<MonthlyDayStats | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)

  const fetchMonthlyData = async (yr: number, mth: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getMonthlySummary(yr, mth)
      setData(response)
    } catch (err: any) {
      setError(err.message || 'Veri çekilirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthlyData(currentYear, currentMonth)
  }, [currentYear, currentMonth])

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Ayın ilk gününün haftanın hangi günü olduğunu bul
  const getFirstDayOfWeek = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    return firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Pazartesi = 0
  }

  // Ayın toplam gün sayısı
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfWeek = getFirstDayOfWeek()

  // Günün verilerini bul
  const getDayData = (day: number): MonthlyDayStats | null => {
    if (!data) return null
    return data.days.find(d => d.day === day) || null
  }

  // Renk seviyesi belirleme (çağrı sayısına göre)
  const getColorLevel = (totalCalls: number) => {
    if (totalCalls === 0) return 'bg-gray-50 text-gray-400'
    if (totalCalls <= 5) return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    if (totalCalls <= 15) return 'bg-blue-300 text-blue-800 hover:bg-blue-400'
    if (totalCalls <= 30) return 'bg-blue-500 text-white hover:bg-blue-600'
    return 'bg-blue-700 text-white hover:bg-blue-800'
  }

  const handleDayMouseEnter = (e: React.MouseEvent, day: number) => {
    const dayData = getDayData(day)
    if (dayData && dayData.totalCalls > 0) {
      setHoveredDay(dayData)
      setHoverPosition({ x: e.clientX, y: e.clientY })
    }
  }

  const handleDayMouseLeave = () => {
    setHoveredDay(null)
    setHoverPosition(null)
  }

  const handleDayMouseMove = (e: React.MouseEvent) => {
    if (hoveredDay) {
      setHoverPosition({ x: e.clientX, y: e.clientY })
    }
  }

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {monthNames[currentMonth - 1]} {currentYear}
            </h2>
            <p className="text-sm text-muted-foreground">
              Aylık çağrı istatistikleri
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              disabled={loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      <div>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-muted-foreground">Yükleniyor...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchMonthlyData(currentYear, currentMonth)} className="mt-4">
              Tekrar Dene
            </Button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Toplam İstatistikler */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Toplam Çağrı</div>
                <div className="text-2xl font-bold text-blue-700">{data.totals.totalCalls}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Gelen</div>
                <div className="text-2xl font-bold text-green-700">{data.totals.inbound.total}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Giden</div>
                <div className="text-2xl font-bold text-purple-700">{data.totals.outbound.total}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Cevaplanan</div>
                <div className="text-2xl font-bold text-orange-700">{data.totals.inbound.answered}</div>
              </div>
            </div>

            {/* Takvim Grid - Relative container for tooltip */}
            <div className="relative">
              <div className="grid grid-cols-7 gap-2">
                {/* Hafta günleri başlıkları */}
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}

                {/* Boş hücreler (ayın ilk gününden önceki günler) */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Günler */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dayData = getDayData(day)
                  const totalCalls = dayData?.totalCalls || 0

                  return (
                    <div
                      key={day}
                      className={`
                        aspect-square border rounded-lg p-2 cursor-pointer transition-all
                        ${getColorLevel(totalCalls)}
                        ${totalCalls === 0 ? 'border-gray-200' : 'border-blue-300'}
                      `}
                      onMouseEnter={(e) => handleDayMouseEnter(e, day)}
                      onMouseLeave={handleDayMouseLeave}
                      onMouseMove={handleDayMouseMove}
                    >
                      <div className="text-sm font-medium">{day}</div>
                      {totalCalls > 0 && (
                        <div className="text-xs mt-1 opacity-90">{totalCalls}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Hover Tooltip - Positioned relative to calendar container */}
              {hoveredDay && hoverPosition && (
                <div
                  className="fixed z-[60] bg-gray-900 text-white p-4 rounded-lg shadow-xl pointer-events-none"
                  style={{
                    left: hoverPosition.x + 220 > window.innerWidth
                      ? `${hoverPosition.x - 230}px`
                      : `${hoverPosition.x + 15}px`,
                    top: hoverPosition.y + 200 > window.innerHeight
                      ? `${hoverPosition.y - 190}px`
                      : `${hoverPosition.y + 15}px`,
                    maxWidth: '220px',
                  }}
                >
                <div className="text-sm font-semibold mb-2">
                  {hoveredDay.date}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-300">Toplam:</span>
                    <span className="font-bold">{hoveredDay.totalCalls}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-green-300">Gelen:</span>
                    <span className="font-bold">{hoveredDay.inbound.total}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">  Cevaplanan:</span>
                    <span>{hoveredDay.inbound.answered}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">  Kaçırılan:</span>
                    <span>{hoveredDay.inbound.missed}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-purple-300">Giden:</span>
                    <span className="font-bold">{hoveredDay.outbound.total}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">  Tamamlanan:</span>
                    <span>{hoveredDay.outbound.completed}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">  Başarısız:</span>
                    <span>{hoveredDay.outbound.failed}</span>
                  </div>
                </div>
              </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

