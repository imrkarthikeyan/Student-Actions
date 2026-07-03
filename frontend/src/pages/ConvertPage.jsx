import { useEffect, useState } from 'react';
import { FileType, UploadCloud, Download, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { convertService } from '../services/convertService';
import { formatBytes } from '../utils/format';
function extOf(name) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return ext === 'jpeg' ? 'jpg' : ext;
}
export function ConvertPage() {
    const [formats, setFormats] = useState({});
    const [maxSizeMb, setMaxSizeMb] = useState(50);
    const [file, setFile] = useState(null);
    const [targetFormat, setTargetFormat] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    useEffect(() => {
        convertService.getFormats().then((res) => {
            setFormats(res.formats);
            setMaxSizeMb(res.max_file_size_mb);
        }).catch(() => toast.error('Failed to load supported formats'));
    }, []);
    const sourceExt = file ? extOf(file.name) : '';
    const targets = formats[sourceExt] ?? [];
    const pickFile = (f) => {
        const ext = extOf(f.name);
        if (!formats[ext]) {
            toast.error(`.${ext || '?'} files aren't supported for conversion yet`);
            return;
        }
        setFile(f);
        setTargetFormat(formats[ext][0] ?? '');
        setResult(null);
    };
    const reset = () => {
        setFile(null);
        setTargetFormat('');
        setResult(null);
    };
    const convert = async () => {
        if (!file || !targetFormat)
            return;
        setLoading(true);
        try {
            const res = await convertService.convert(file, targetFormat);
            setResult(res);
            toast.success('Converted');
        }
        catch (err) {
            toast.error(err?.response?.data?.detail ?? 'Conversion failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="flex flex-col min-h-screen">
      <Header title="Quick Convert"/>
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-xl">
          <p className="text-sm text-gray-500 mb-6 max-w-2xl">
            Convert documents and images between formats — Word ⇄ PDF, PDF ⇄ text, images between
            PNG/JPG/WEBP/BMP/GIF and PDF. Everything runs locally, nothing leaves the server.
          </p>

          <div className="surface p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-brand-600"/>
            <h2 className="font-display text-sm sm:text-base tracking-wide text-gray-200">Convert a file</h2>
          </div>

          {result ? (<div className="flex flex-col items-center gap-4 py-6">
              <FileType className="w-10 h-10 text-brand-600"/>
              <p className="text-sm text-gray-200">{result.file_name}</p>
              <p className="text-xs text-gray-500">{formatBytes(result.file_size)}</p>
              <a href={result.file_url} download={result.file_name}>
                <Button>
                  <Download className="w-4 h-4"/> Download
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={reset}>Convert another file</Button>
            </div>) : (<>
              {file ? (<div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                  <FileType className="w-4 h-4 text-gray-400 shrink-0"/>
                  <span className="text-sm text-gray-200 truncate flex-1">{file.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">{formatBytes(file.size)}</span>
                  <button onClick={reset} className="text-gray-500 hover:text-red-400 shrink-0">
                    <X className="w-4 h-4"/>
                  </button>
                </div>) : (<label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files?.[0])
                        pickFile(e.dataTransfer.files[0]);
                }} className={`flex flex-col items-center justify-center gap-2 border border-dashed rounded-lg px-4 py-10 cursor-pointer transition-colors ${dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-gray-700 hover:border-gray-600'}`}>
                  <UploadCloud className="w-8 h-8 text-gray-500"/>
                  <span className="text-sm text-gray-400">Click to browse or drop a file here</span>
                  <span className="text-xs text-gray-600">
                    Word, PDF, TXT, PNG, JPG, WEBP, BMP, GIF · up to {maxSizeMb} MB
                  </span>
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}/>
                </label>)}

              {file && (<div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400 shrink-0">Convert to</label>
                  <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)} disabled={targets.length === 0} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50">
                    {targets.length === 0 && <option>No targets available</option>}
                    {targets.map((t) => (<option key={t} value={t}>.{t.toUpperCase()}</option>))}
                  </select>
                </div>)}

              <Button onClick={convert} loading={loading} disabled={!file || !targetFormat} className="self-start">
                <RefreshCw className="w-4 h-4"/> Convert
              </Button>
            </>)}
          </div>
        </div>
      </div>
    </div>);
}
