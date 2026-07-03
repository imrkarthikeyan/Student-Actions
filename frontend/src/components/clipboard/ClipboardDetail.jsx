import { useState } from 'react';
import { X, Star, Pin, Trash2, Copy, Wand2, Tag, Calendar, Hash, Globe, FileText, } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useClipboardStore } from '../../store/clipboardStore';
import { clipboardService } from '../../services/clipboardService';
import { absoluteTime, formatBytes, clipboardTypeColor, clipboardTypeIcon } from '../../utils/format';
import { Button } from '../ui/Button';
const AI_COMMANDS = [
    { label: 'Summarize', cmd: '/summarize' },
    { label: 'Explain', cmd: '/explain' },
    { label: 'Rewrite', cmd: '/rewrite' },
    { label: 'Markdown', cmd: '/markdown' },
    { label: 'Translate', cmd: '/translate' },
];
export function ClipboardDetail({ item, onClose }) {
    const { toggleFavorite, togglePin, deleteItem, updateItem } = useClipboardStore();
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [activeCmd, setActiveCmd] = useState(null);
    const [editingTag, setEditingTag] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const copy = async () => {
        const text = item.content ?? item.ocr_text ?? '';
        await navigator.clipboard.writeText(text);
        toast.success('Copied!');
    };
    const runAI = async (cmd) => {
        setActiveCmd(cmd);
        setAiLoading(true);
        try {
            const res = await clipboardService.runAICommand(item.id, cmd);
            setAiResult(res.result);
        }
        catch {
            toast.error('AI command failed');
        }
        finally {
            setAiLoading(false);
        }
    };
    const addTag = async () => {
        const tag = tagInput.trim().toLowerCase();
        if (!tag || item.tags.includes(tag)) {
            setTagInput('');
            setEditingTag(false);
            return;
        }
        await updateItem(item.id, { tags: [...item.tags, tag] });
        setTagInput('');
        setEditingTag(false);
        toast.success('Tag added');
    };
    const removeTag = async (tag) => {
        await updateItem(item.id, { tags: item.tags.filter((t) => t !== tag) });
    };
    const handleDelete = async () => {
        await deleteItem(item.id);
        toast.success('Deleted');
        onClose();
    };
    return (<div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', clipboardTypeColor(item.content_type))}>
          {clipboardTypeIcon(item.content_type)} {item.content_type}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleFavorite(item)} className={clsx('p-1.5 rounded-lg transition-colors', item.is_favorite ? 'text-brand-600' : 'text-gray-600 hover:text-gray-900')}>
            <Star className="w-4 h-4" fill={item.is_favorite ? 'currentColor' : 'none'}/>
          </button>
          <button onClick={() => togglePin(item)} className={clsx('p-1.5 rounded-lg transition-colors', item.is_pinned ? 'text-brand-600' : 'text-gray-600 hover:text-brand-600')}>
            <Pin className="w-4 h-4"/>
          </button>
          {(item.content || item.ocr_text) && (<button onClick={copy} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition-colors">
              <Copy className="w-4 h-4"/>
            </button>)}
          <button onClick={handleDelete} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4"/>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition-colors ml-1">
            <X className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Title */}
        {item.title && <h2 className="text-xl font-semibold text-gray-100">{item.title}</h2>}

        {/* Content */}
        {item.content && (<div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5"/> Content
            </p>
            <pre className={clsx('bg-gray-800 rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap break-words max-h-60 overflow-y-auto', item.content_type === 'code' && 'font-mono')}>
              {item.content}
            </pre>
          </div>)}

        {/* OCR text */}
        {item.ocr_text && !item.content && (<div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">OCR Text</p>
            <p className="text-sm text-gray-300 bg-gray-800 rounded-xl p-4">{item.ocr_text}</p>
          </div>)}

        {/* Summary */}
        {item.summary && (<div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI Summary</p>
            <p className="text-sm text-gray-300">{item.summary}</p>
          </div>)}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {item.language && (<div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3"/> Language</p>
              <p className="text-gray-200 font-mono">{item.language}</p>
            </div>)}
          {item.category && (<div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Category</p>
              <p className="text-gray-200">{item.category}</p>
            </div>)}
          {item.file_size && (<div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Size</p>
              <p className="text-gray-200">{formatBytes(item.file_size)}</p>
            </div>)}
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Created</p>
            <p className="text-gray-200 text-xs">{absoluteTime(item.created_at)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Access count</p>
            <p className="text-gray-200">{item.access_count}</p>
          </div>
          {item.is_shared && item.share_token && (<div className="bg-gray-800 rounded-lg p-3 col-span-2">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/> Share token</p>
              <p className="text-gray-200 font-mono text-xs truncate">{item.share_token}</p>
            </div>)}
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5"/> Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (<span key={tag} className="group flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-full">
                #{tag}
                <button onClick={() => removeTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">×</button>
              </span>))}
            {editingTag ? (<input autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter')
            addTag(); if (e.key === 'Escape') {
            setEditingTag(false);
            setTagInput('');
        } }} onBlur={addTag} placeholder="tag name" className="px-2 py-0.5 bg-gray-800 border border-brand-600 text-gray-200 text-xs rounded-full outline-none w-24"/>) : (<button onClick={() => setEditingTag(true)} className="px-2 py-0.5 bg-gray-800 border border-dashed border-gray-700 text-gray-500 text-xs rounded-full hover:border-brand-600 hover:text-brand-600 transition-colors">
                + Add tag
              </button>)}
          </div>
        </div>

        {/* AI Commands */}
        {(item.content || item.ocr_text) && (<div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5"/> AI Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_COMMANDS.map(({ label, cmd }) => (<Button key={cmd} size="xs" variant="secondary" loading={aiLoading && activeCmd === cmd} onClick={() => runAI(cmd)}>
                  {label}
                </Button>))}
            </div>
            {aiResult && (<div className="mt-3 bg-gray-800 border border-brand-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-brand-600">AI Result — {activeCmd}</span>
                  <button onClick={() => navigator.clipboard.writeText(aiResult).then(() => toast.success('Copied'))} className="text-gray-500 hover:text-gray-300">
                    <Copy className="w-3.5 h-3.5"/>
                  </button>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{aiResult}</p>
              </div>)}
          </div>)}
      </div>
    </div>);
}
