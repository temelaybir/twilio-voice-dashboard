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
  Users,
  FolderOpen
} from 'lucide-react'
import type { EmailList } from '@/types/email'

interface ListManagerProps {
  lists: EmailList[]
  loading?: boolean
  onEdit: (list: EmailList) => void
  onCreate: () => void
  onDelete: (id: number) => void
  onViewSubscribers: (list: EmailList) => void
}

export function ListManager({
  lists,
  loading,
  onEdit,
  onCreate,
  onDelete,
  onViewSubscribers
}: ListManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
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
              <FolderOpen className="h-5 w-5" />
              Email Listeleri
            </CardTitle>
            <CardDescription>
              Abone listelerinizi yönetin
            </CardDescription>
          </div>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Liste
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Liste ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* List Grid */}
        {filteredLists.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">Henüz liste yok</p>
            <p className="text-sm text-gray-400">İlk listenizi oluşturmak için butona tıklayın</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map(list => (
              <div
                key={list.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{list.name}</h3>
                    {list.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                  {!list.isActive && (
                    <Badge variant="outline" className="text-gray-500">
                      Pasif
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{list.subscriberCount} abone</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewSubscribers(list)}
                      title="Aboneleri Gör"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(list)}
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(list.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400 mt-3">
                  Oluşturulma: {new Date(list.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


