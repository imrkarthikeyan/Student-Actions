import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, Star, Trash2, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { clsx } from 'clsx'
import { useClipboardStore } from '../store/clipboardStore'
import { Header } from '../components/layout/Header'
import { ClipboardCard } from '../components/clipboard/ClipboardCard'
import { ClipboardDetail } from '../components/clipboard/ClipboardDetail'
import { AddClipboardModal } from '../components/clipboard/AddClipboardModal'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import type { ClipboardType } from '../types'

const TYPE_FILTERS: { label: string; value: ClipboardType | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Text', value: 'text' },
  { label: 'URL', value: 'url' },
  { label: 'Code', value: 'code' },
  { label: 'Image', value: 'image' },
  { label: 'File', value: 'file' },
  { label: 'Markdown', value: 'markdown' },
]

export function ClipboardPage() {
  const [searchParams] = useSearchParams()
  const [showAdd, setShowAdd] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState<ClipboardType | undefined>()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const {
    items, total, hasNext, isLoading, selectedItem,
    fetchItems, fetchMore, fetchWorkspaces, setSelectedItem,
  } = useClipboardStore()

  const load = useCallback(() => {
    fetchItems({
      content_type: typeFilter,
      is_favorite: favOnly || undefined,
      include_deleted: showDeleted,
      search: search || undefined,
    })
  }, [typeFilter, favOnly, showDeleted, search, fetchItems])

  useEffect(() => { load(); fetchWorkspaces() }, [load, fetchWorkspaces])

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) fetchMore()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Clipboard"
        actions={
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="w-4 h-4" /> Add
          </Button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — list */}
        <div
          className={clsx('flex-col', selectedItem ? 'hidden lg:flex lg:w-[55%]' : 'flex w-full')}
          onScroll={onScroll}
          style={{ overflowY: 'auto' }}
        >
          {/* Filters */}
          <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder="Search content, tags, titles…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Type pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {TYPE_FILTERS.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setTypeFilter(value)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                    typeFilter === value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  )}
                >
                  {label}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                <button
                  onClick={() => setFavOnly(!favOnly)}
                  className={clsx('p-1.5 rounded-lg transition-colors', favOnly ? 'text-brand-600' : 'text-gray-600 hover:text-gray-400')}
                  title="Favorites only"
                >
                  <Star className="w-4 h-4" fill={favOnly ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => setShowDeleted(!showDeleted)}
                  className={clsx('p-1.5 rounded-lg transition-colors', showDeleted ? 'text-red-400' : 'text-gray-600 hover:text-gray-400')}
                  title="Show deleted"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={load} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-600">{total} item{total !== 1 ? 's' : ''}</p>
          </div>

          {/* Grid */}
          <div className="p-4 sm:p-6">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-16"><Spinner /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-sm">No items found</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4" /> Add first item
                </Button>
              </div>
            ) : (
              <div className={clsx('grid gap-3', selectedItem ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
                {items.map((item) => (
                  <ClipboardCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  />
                ))}
              </div>
            )}
            {isLoading && items.length > 0 && (
              <div className="flex justify-center py-4"><Spinner /></div>
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        {selectedItem && (
          <div className="flex-1 border-l border-gray-800 bg-gray-900 overflow-y-auto">
            <ClipboardDetail item={selectedItem} onClose={() => setSelectedItem(null)} />
          </div>
        )}
      </div>

      <AddClipboardModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
