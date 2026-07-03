import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Radio, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { meetingService } from '../../services/meetingService';
import { absoluteTime, relativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { FeatureCard } from './FeatureCard';
export function MeetingsWidget() {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState(null);
    const [starting, setStarting] = useState(false);
    useEffect(() => {
        meetingService.list().then(setMeetings).catch(() => setMeetings([]));
    }, []);
    const startInstant = async () => {
        setStarting(true);
        try {
            const meeting = await meetingService.create({ title: 'Instant Meeting' });
            navigate(`/meetings/${meeting.room_code}`);
        }
        catch {
            toast.error('Failed to start meeting');
        }
        finally {
            setStarting(false);
        }
    };
    return (<FeatureCard icon={<Video className="w-4 h-4"/>} title="Meetings" to="/meetings">
      {meetings === null ? (<div className="flex-1 flex items-center justify-center py-6"><Spinner /></div>) : (<div className="flex flex-col gap-3">
          <Button size="sm" onClick={startInstant} loading={starting} className="self-start">
            <Video className="w-3.5 h-3.5"/> Start instant meeting
          </Button>
          {meetings.length === 0 ? (<p className="text-sm text-gray-500 text-center py-4">No meetings yet</p>) : (<div className="space-y-2">
              {meetings.slice(0, 3).map((m) => (<div key={m.id} className="flex items-center gap-2.5 text-sm">
                  <span className={clsx('shrink-0', m.status === 'live' ? 'text-brand-500' : 'text-gray-500')}>
                    {m.status === 'live' ? <Radio className="w-4 h-4"/> : <Calendar className="w-4 h-4"/>}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-gray-200">{m.title}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {m.status === 'scheduled' && m.scheduled_at ? absoluteTime(m.scheduled_at) : relativeTime(m.started_at ?? m.created_at)}
                  </span>
                </div>))}
            </div>)}
        </div>)}
    </FeatureCard>);
}
