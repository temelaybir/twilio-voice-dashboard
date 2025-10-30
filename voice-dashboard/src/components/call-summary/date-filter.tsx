import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

interface DateFilterProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

/**
 * Tarih filtresi bileşeni
 */
export function DateFilter({ selectedDate, onDateChange }: DateFilterProps) {
  // Bugünün tarihini al
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  // Dünün tarihini al
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  // Önceki haftayı al
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  const lastWeekStr = lastWeek.toISOString().split('T')[0]

  // Hızlı seçim butonları
  const quickSelectButtons = [
    { label: 'Bugün', value: todayStr },
    { label: 'Dün', value: yesterdayStr },
    { label: '7 Gün Önce', value: lastWeekStr },
  ]

  // Tarihi formatla (görüntüleme için)
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Tarih Seçimi</h3>
          </div>

          {/* Hızlı Seçim Butonları */}
          <div className="flex flex-wrap gap-2">
            {quickSelectButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={selectedDate === btn.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDateChange(btn.value)}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {/* Manuel Tarih Seçici */}
          <div className="space-y-2">
            <label htmlFor="date-picker" className="text-sm text-muted-foreground">
              Özel Tarih Seç:
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              max={todayStr}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Seçili Tarih Gösterimi */}
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Seçili Tarih: <span className="font-medium text-foreground">{formatDisplayDate(selectedDate)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

