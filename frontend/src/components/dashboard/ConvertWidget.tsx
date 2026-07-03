import { useEffect, useState } from 'react'
import { RefreshCw, UploadCloud, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { convertService, type ConvertResponse } from '../../services/convertService'
import { Button } from '../ui/Button'
import { FeatureCard } from './FeatureCard'

function extOf(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'jpeg' ? 'jpg' : ext
}

export function ConvertWidget() {
  const [formats, setFormats] = useState<Record<string, string[]>>({})
  const [file, setFile] = useState<File | null>(null)
  const [targetFormat, setTargetFormat] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConvertResponse | null>(null)

  useEffect(() => {
    convertService.getFormats().then((res) => setFormats(res.formats)).catch(() => {})
  }, [])

  const sourceExt = file ? extOf(file.name) : ''
  const targets = formats[sourceExt] ?? []

  const pickFile = (f: File) => {
    const ext = extOf(f.name)
    if (!formats[ext]) {
      toast.error(`.${ext || '?'} isn't supported yet`)
      return
    }
    setFile(f)
    setTargetFormat(formats[ext][0] ?? '')
    setResult(null)
  }

  const convert = async () => {
    if (!file || !targetFormat) return
    setLoading(true)
    try {
      setResult(await convertService.convert(file, targetFormat))
    } catch {
      toast.error('Conversion failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FeatureCard icon={<RefreshCw className="w-4 h-4" />} title="Quick Convert" to="/convert">
      {result ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-gray-200 truncate max-w-full">{result.file_name}</p>
          <a href={result.file_url} download={result.file_name}>
            <Button size="sm"><Download className="w-3.5 h-3.5" /> Download</Button>
          </a>
          <Button variant="outline" size="xs" onClick={() => { setFile(null); setResult(null) }}>Convert another</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {file ? (
            <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-gray-200">{file.name}</span>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-100"
              >
                {targets.map((t) => <option key={t} value={t}>.{t.toUpperCase()}</option>)}
              </select>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-gray-700 hover:border-brand-500 rounded-lg px-3 py-6 cursor-pointer transition-colors">
              <UploadCloud className="w-6 h-6 text-gray-500" />
              <span className="text-xs text-gray-400">Drop or browse a file</span>
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
            </label>
          )}
          <Button size="sm" onClick={convert} loading={loading} disabled={!file || !targetFormat} className="self-start">
            Convert
          </Button>
        </div>
      )}
    </FeatureCard>
  )
}
