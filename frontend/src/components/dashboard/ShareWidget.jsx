import { useState } from 'react';
import { KeyRound, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { shareService } from '../../services/shareService';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { FeatureCard } from './FeatureCard';
export function ShareWidget() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');
    const generate = async () => {
        if (!content.trim()) {
            toast.error('Type something to share first');
            return;
        }
        setLoading(true);
        try {
            const res = await shareService.createText(content.trim(), 30);
            setCode(res.code);
        }
        catch {
            toast.error('Failed to create share');
        }
        finally {
            setLoading(false);
        }
    };
    const copyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied');
    };
    return (<FeatureCard icon={<KeyRound className="w-4 h-4"/>} title="Quick Share" to="/share">
      {code ? (<div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs text-gray-500">Share this code</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-mono font-bold tracking-[0.25em] text-brand-600">{code}</span>
            <button onClick={copyCode} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-800">
              <Copy className="w-4 h-4"/>
            </button>
          </div>
          <Button variant="outline" size="xs" onClick={() => { setCode(''); setContent(''); }}>Share something else</Button>
        </div>) : (<div className="flex flex-col gap-3">
          <Textarea placeholder="Paste text to share…" rows={3} value={content} onChange={(e) => setContent(e.target.value)}/>
          <Button size="sm" onClick={generate} loading={loading} className="self-start">Generate code</Button>
        </div>)}
    </FeatureCard>);
}
