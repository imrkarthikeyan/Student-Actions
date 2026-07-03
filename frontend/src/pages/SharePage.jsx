import { useState } from 'react';
import { Copy, Send, KeyRound, FileText, Download, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { shareService } from '../services/shareService';
import { resolveStorageUrl } from '../services/api';
import { formatBytes } from '../utils/format';
const EXPIRY_OPTIONS = [
    { label: '10 minutes', value: 10 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '24 hours', value: 60 * 24 },
];
function SendCard() {
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [expiresIn, setExpiresIn] = useState(30);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const reset = () => {
        setContent('');
        setFile(null);
        setResult(null);
    };
    const send = async () => {
        if (!file && !content.trim()) {
            toast.error('Enter some text or attach a file first');
            return;
        }
        setLoading(true);
        try {
            const res = file
                ? await shareService.createFile(file, expiresIn)
                : await shareService.createText(content.trim(), expiresIn);
            setResult(res);
        }
        catch {
            toast.error('Failed to create share');
        }
        finally {
            setLoading(false);
        }
    };
    const copyCode = () => {
        if (!result)
            return;
        navigator.clipboard.writeText(result.code);
        toast.success('Code copied');
    };
    return (<div className="surface p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-brand-600"/>
        <h2 className="font-display text-sm sm:text-base tracking-wide text-gray-200">Send</h2>
      </div>

      {result ? (<div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-gray-400">Share this code with the recipient</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-mono font-bold tracking-[0.3em] text-brand-700">
              {result.code}
            </span>
            <button onClick={copyCode} className="p-2 rounded-lg text-gray-500 hover:text-gray-100 hover:bg-gray-800 transition-colors" title="Copy code">
              <Copy className="w-4 h-4"/>
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Expires {new Date(result.expires_at).toLocaleString()}
          </p>
          <Button variant="outline" size="sm" onClick={reset}>Share something else</Button>
        </div>) : (<>
          <Textarea placeholder="Paste or type the information you want to share…" rows={6} value={content} onChange={(e) => setContent(e.target.value)} disabled={!!file}/>

          {file ? (<div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <Paperclip className="w-4 h-4 text-gray-400 shrink-0"/>
              <span className="text-sm text-gray-200 truncate flex-1">{file.name}</span>
              <span className="text-xs text-gray-500 shrink-0">{formatBytes(file.size)}</span>
              <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-400 shrink-0">
                <X className="w-4 h-4"/>
              </button>
            </div>) : (<label className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer w-fit">
              <Paperclip className="w-4 h-4"/>
              Attach a file instead
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}/>
            </label>)}

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 shrink-0">Expires in</label>
            <select value={expiresIn} onChange={(e) => setExpiresIn(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {EXPIRY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <Button onClick={send} loading={loading} className="self-start">
            <Send className="w-4 h-4"/> Generate code
          </Button>
        </>)}
    </div>);
}
function ReceiveCard() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const retrieve = async () => {
        if (code.trim().length !== 6) {
            setError('Enter the 6-digit code');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await shareService.retrieve(code.trim());
            setResult(res);
        }
        catch {
            setError('Invalid or expired code');
            setResult(null);
        }
        finally {
            setLoading(false);
        }
    };
    const copyContent = () => {
        if (!result?.content)
            return;
        navigator.clipboard.writeText(result.content);
        toast.success('Copied');
    };
    const reset = () => {
        setCode('');
        setResult(null);
        setError('');
    };
    return (<div className="surface p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-brand-600"/>
        <h2 className="font-display text-sm sm:text-base tracking-wide text-gray-200">Receive</h2>
      </div>

      {result ? (<div className="flex flex-col gap-3">
          {result.content_type === 'text' ? (<>
              <Textarea readOnly rows={6} value={result.content}/>
              <Button variant="outline" size="sm" onClick={copyContent} className="self-start">
                <Copy className="w-3.5 h-3.5"/> Copy
              </Button>
            </>) : (<div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
              <FileText className="w-6 h-6 text-brand-600 shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{result.file_name}</p>
                <p className="text-xs text-gray-500">{result.file_size ? formatBytes(result.file_size) : ''}</p>
              </div>
              <a href={resolveStorageUrl(result.file_url)} download={result.file_name} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-700 transition-colors shrink-0" title="Download">
                <Download className="w-4 h-4"/>
              </a>
            </div>)}
          <Button variant="outline" size="sm" onClick={reset} className="self-start">Retrieve another</Button>
        </div>) : (<>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && retrieve()} placeholder="000000" inputMode="numeric" maxLength={6} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center text-3xl font-mono tracking-[0.3em] text-gray-100 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"/>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <Button onClick={retrieve} loading={loading} className="self-start">
            <KeyRound className="w-4 h-4"/> Retrieve
          </Button>
        </>)}
    </div>);
}
export function SharePage() {
    return (<div className="flex flex-col min-h-screen">
      <Header title="Share"/>
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-4xl">
          <p className="text-sm text-gray-500 mb-6 max-w-2xl">
            Send any text or file to someone else — they don't need an account, just the 6-digit code you give them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SendCard />
            <ReceiveCard />
          </div>
        </div>
      </div>
    </div>);
}
