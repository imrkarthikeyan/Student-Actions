import { formatDistanceToNow, format } from 'date-fns'

export function relativeTime(date: string | null | undefined): string {
  if (!date) return 'Never'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function absoluteTime(date: string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function truncate(str: string, n = 120): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function clipboardTypeIcon(type: string): string {
  const map: Record<string, string> = {
    text: '📄',
    image: '🖼️',
    file: '📎',
    url: '🔗',
    code: '💻',
    markdown: '📝',
  }
  return map[type] ?? '📋'
}

export function clipboardTypeColor(type: string): string {
  const map: Record<string, string> = {
    text: 'bg-gray-700 text-gray-200',
    image: 'bg-brand-600/20 text-brand-700',
    file: 'bg-gray-800 text-gray-100 border border-gray-600',
    url: 'bg-brand-600/10 text-brand-700',
    code: 'bg-black text-brand-400 border border-brand-700',
    markdown: 'bg-brand-800/40 text-brand-700',
  }
  return map[type] ?? 'bg-gray-700 text-gray-300'
}
