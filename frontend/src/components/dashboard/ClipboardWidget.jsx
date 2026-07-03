import { useEffect, useState } from 'react';
import { Clipboard } from 'lucide-react';
import { clipboardService } from '../../services/clipboardService';
import { clipboardTypeIcon, relativeTime, truncate } from '../../utils/format';
import { Spinner } from '../ui/Spinner';
import { FeatureCard } from './FeatureCard';
export function ClipboardWidget() {
    const [items, setItems] = useState(null);
    useEffect(() => {
        clipboardService.list({ per_page: 4 }).then((res) => setItems(res.items)).catch(() => setItems([]));
    }, []);
    return (<FeatureCard icon={<Clipboard className="w-4 h-4"/>} title="Clipboard" to="/clipboard">
      {items === null ? (<div className="flex-1 flex items-center justify-center py-6"><Spinner /></div>) : items.length === 0 ? (<p className="text-sm text-gray-500 text-center py-6">Nothing synced yet</p>) : (<div className="space-y-2">
          {items.map((item) => (<div key={item.id} className="flex items-center gap-2.5 text-sm">
              <span className="text-base shrink-0">{clipboardTypeIcon(item.content_type)}</span>
              <span className="flex-1 min-w-0 truncate text-gray-200">
                {item.title || truncate(item.content ?? '', 40) || item.content_type}
              </span>
              <span className="text-xs text-gray-500 shrink-0">{relativeTime(item.created_at)}</span>
            </div>))}
        </div>)}
    </FeatureCard>);
}
