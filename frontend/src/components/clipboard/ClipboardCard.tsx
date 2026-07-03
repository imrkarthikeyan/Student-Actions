import { Star, Pin, Trash2, RotateCcw, Share2, Copy } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { ClipboardItem } from '../../types'
import { relativeTime, clipboardTypeColor, clipboardTypeIcon, truncate, formatBytes } from '../../utils/format'
import { useClipboardStore } from '../../store/clipboardStore'

interface ClipboardCardProps {
  item: ClipboardItem
  onClick: () => void
}

export function ClipboardCard({ item, onClick }: ClipboardCardProps) {
  const { toggleFavorite, togglePin, deleteItem, restoreItem } = useClipboardStore()

  const preview = item.content ?? item.ocr_text ?? item.file_name ?? item.summary ?? ''

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = item.content ?? item.ocr_text ?? ''
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div
      onClick={onClick}
      className="group surface surface-hover p-4 cursor-pointer transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium shrink-0', clipboardTypeColor(item.content_type))}>
            {clipboardTypeIcon(item.content_type)} {item.content_type}
          </span>
          {item.is_pinned && <Pin className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
          {item.category && (
            <span className="text-xs text-gray-500 truncate">{item.category}</span>
          )}
        </div>
        <span className="text-xs text-gray-600 shrink-0">{relativeTime(item.created_at)}</span>
      </div>

      {/* Title */}
      {item.title && (
        <h3 className="text-sm font-medium text-gray-200 mb-1 truncate">{item.title}</h3>
      )}

      {/* Preview */}
      {item.content_type === 'image' ? (
        <div className="h-20 bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-xs mb-2">
          {item.file_name ?? 'Image'}
          {item.file_size && ` · ${formatBytes(item.file_size)}`}
        </div>
      ) : preview ? (
        <p className={clsx(
          'text-sm text-gray-400 mb-2 leading-relaxed',
          item.content_type === 'code' && 'font-mono text-xs bg-gray-800 rounded p-2 whitespace-pre-wrap'
        )}>
          {truncate(preview, 200)}
        </p>
      ) : null}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(item) }}
          className={clsx('p-1.5 rounded-lg transition-colors', item.is_favorite ? 'text-brand-600' : 'text-gray-600 hover:text-gray-900')}
          title="Favorite"
        >
          <Star className="w-3.5 h-3.5" fill={item.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); togglePin(item) }}
          className={clsx('p-1.5 rounded-lg transition-colors', item.is_pinned ? 'text-brand-600' : 'text-gray-600 hover:text-brand-600')}
          title="Pin"
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        {(item.content || item.ocr_text) && (
          <button onClick={copyToClipboard} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition-colors" title="Copy">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        {item.is_deleted ? (
          <button
            onClick={(e) => { e.stopPropagation(); restoreItem(item.id).then(() => toast.success('Restored')) }}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 transition-colors ml-auto"
            title="Restore"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); deleteItem(item.id).then(() => toast.success('Deleted')) }}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors ml-auto"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
