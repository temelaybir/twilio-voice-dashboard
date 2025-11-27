'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText,
  Eye,
  Copy,
  Search
} from 'lucide-react'
import type { EmailTemplate } from '@/types/email'

interface TemplateListProps {
  templates: EmailTemplate[]
  loading?: boolean
  onEdit: (template: EmailTemplate) => void
  onCreate: () => void
  onDelete: (id: number) => void
  onPreview: (template: EmailTemplate) => void
  onDuplicate: (template: EmailTemplate) => void
}

export function TemplateList({
  templates,
  loading,
  onEdit,
  onCreate,
  onDelete,
  onPreview,
  onDuplicate
}: TemplateListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800',
      marketing: 'bg-blue-100 text-blue-800',
      notification: 'bg-green-100 text-green-800',
      reminder: 'bg-yellow-100 text-yellow-800',
      welcome: 'bg-purple-100 text-purple-800'
    }
    return colors[category] || colors.general
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Şablonları
            </CardTitle>
            <CardDescription>
              Kampanyalarınız için hazır email şablonları
            </CardDescription>
          </div>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Şablon
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Şablon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat === 'all' ? 'Tümü' : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Template List */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">Henüz şablon yok</p>
            <p className="text-sm text-gray-400">İlk şablonunuzu oluşturmak için butona tıklayın</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      {!template.isActive && (
                        <Badge variant="outline" className="text-gray-500">
                          Pasif
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-medium">Konu:</span> {template.subject}
                    </p>
                    <p className="text-xs text-gray-400">
                      Oluşturulma: {new Date(template.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(template)}
                      title="Önizle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(template)}
                      title="Kopyala"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(template)}
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(template.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


