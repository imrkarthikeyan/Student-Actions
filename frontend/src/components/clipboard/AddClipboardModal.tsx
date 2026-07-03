import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Link, Code2, FileText, Type } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { useClipboardStore } from '../../store/clipboardStore'
import { clipboardService } from '../../services/clipboardService'
import type { ClipboardType } from '../../types'

interface AddClipboardModalProps {
  open: boolean
  onClose: () => void
}

const TYPES: { type: ClipboardType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
  { type: 'url', label: 'URL', icon: <Link className="w-4 h-4" /> },
  { type: 'code', label: 'Code', icon: <Code2 className="w-4 h-4" /> },
  { type: 'markdown', label: 'Markdown', icon: <FileText className="w-4 h-4" /> },
]

export function AddClipboardModal({ open, onClose }: AddClipboardModalProps) {
  const [tab, setTab] = useState<'manual' | 'upload'>('manual')
  const [type, setType] = useState<ClipboardType>('text')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const { fetchItems, prependItem } = useClipboardStore()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      if (!files[0]) return
      setLoading(true)
      try {
        const item = await clipboardService.upload(files[0])
        prependItem(item)
        toast.success('File uploaded')
        onClose()
      } catch {
        toast.error('Upload failed')
      } finally {
        setLoading(false)
      }
    },
  })

  const submit = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await useClipboardStore.getState().createItem({
        content_type: type,
        content: content.trim(),
        title: title.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      toast.success('Item added')
      setContent(''); setTitle(''); setTags('')
      onClose()
    } catch {
      toast.error('Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Clipboard Item" size="lg">
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['manual', 'upload'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            )}
          >
            {t === 'upload' ? <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Upload file</span> : 'Manual entry'}
          </button>
        ))}
      </div>

      {tab === 'manual' ? (
        <div className="space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {TYPES.map(({ type: t, label, icon }) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                  type === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto-generated if empty" />
          <Textarea
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'url' ? 'https://…' : type === 'code' ? '// paste code here' : 'Paste or type content…'}
            rows={6}
            className={type === 'code' ? 'font-mono' : ''}
          />
          <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, tutorial, bookmark" />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button loading={loading} onClick={submit} disabled={!content.trim()}>Add to Clipboard</Button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={clsx(
            'border border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
            isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700 hover:border-gray-600'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{isDragActive ? 'Drop it here!' : 'Drag & drop a file, or click to select'}</p>
          <p className="text-gray-600 text-xs mt-1">Images, PDFs, and any file type supported</p>
        </div>
      )}
    </Modal>
  )
}
