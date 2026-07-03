import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, Plus, Copy, Calendar, Radio } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { meetingService } from '../services/meetingService'
import type { Meeting } from '../types'
import { absoluteTime, relativeTime } from '../utils/format'

function inviteUrl(roomCode: string): string {
  return `${window.location.origin}/meetings/${roomCode}`
}

function StatusBadge({ meeting }: { meeting: Meeting }) {
  if (meeting.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-600 text-white animate-glow">
        <Radio className="w-3 h-3" /> Live
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-600">
      <Calendar className="w-3 h-3" /> Scheduled
    </span>
  )
}

function CreateMeetingModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (m: Meeting) => void
}) {
  const [title, setTitle] = useState('')
  const [hostName, setHostName] = useState('')
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const meeting = await meetingService.create({
        title: title.trim() || 'Instant Meeting',
        host_name: hostName.trim() || undefined,
        scheduled_at: mode === 'schedule' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      })
      onCreated(meeting)
      setTitle('')
      setHostName('')
      setScheduledAt('')
      setMode('now')
    } catch {
      toast.error('Failed to create meeting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New meeting">
      <div className="flex flex-col gap-4">
        <Input label="Meeting title" placeholder="Team Standup" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Your name" placeholder="How others will see you" value={hostName} onChange={(e) => setHostName(e.target.value)} />

        <div className="flex gap-2">
          <button
            onClick={() => setMode('now')}
            className={clsx(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
              mode === 'now' ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-700 text-gray-400 hover:text-gray-200'
            )}
          >
            Start now
          </button>
          <button
            onClick={() => setMode('schedule')}
            className={clsx(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
              mode === 'schedule' ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-700 text-gray-400 hover:text-gray-200'
            )}
          >
            Schedule for later
          </button>
        </div>

        {mode === 'schedule' && (
          <Input
            label="Date & time"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        )}

        <Button onClick={submit} loading={loading} disabled={mode === 'schedule' && !scheduledAt}>
          {mode === 'now' ? 'Create & get link' : 'Schedule meeting'}
        </Button>
      </div>
    </Modal>
  )
}

function CreatedMeetingModal({ meeting, onClose }: { meeting: Meeting | null; onClose: () => void }) {
  const navigate = useNavigate()
  if (!meeting) return null

  const url = inviteUrl(meeting.room_code)
  const copy = () => {
    navigator.clipboard.writeText(url)
    toast.success('Invite link copied')
  }

  return (
    <Modal open={!!meeting} onClose={onClose} title="Meeting ready">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-400">
          Share this link with anyone you want to join{meeting.status === 'scheduled' && meeting.scheduled_at
            ? ` — the meeting starts ${absoluteTime(meeting.scheduled_at)}`
            : ''}.
        </p>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-200 truncate flex-1 font-mono">{url}</span>
          <button onClick={copy} className="text-gray-400 hover:text-gray-100 shrink-0">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={() => navigate(`/meetings/${meeting.room_code}`)}>
            <Video className="w-4 h-4" /> Join now
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function MeetingsPage() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [created, setCreated] = useState<Meeting | null>(null)

  const load = () => meetingService.list().then(setMeetings).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Meetings"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New meeting
          </Button>
        }
      />
      <div className="flex-1 p-4 sm:p-6">
        <p className="text-sm text-gray-500 mb-5 max-w-2xl">
          Start an instant video meeting or schedule one for later, then send the link to whoever you want to join.
        </p>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20">
            <Video className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No meetings yet</p>
            <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Create your first meeting
            </Button>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {meetings.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 surface surface-hover p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-200 truncate">{m.title}</p>
                      <StatusBadge meeting={m} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {m.status === 'scheduled' && m.scheduled_at
                        ? `Starts ${absoluteTime(m.scheduled_at)}`
                        : `Started ${m.started_at ? relativeTime(m.started_at) : ''}`}
                      {m.host_name ? ` · Hosted by ${m.host_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl(m.room_code))
                      toast.success('Invite link copied')
                    }}
                    className="p-2 text-gray-500 hover:text-gray-100 hover:bg-gray-800 transition-colors shrink-0"
                    title="Copy invite link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <Button size="sm" onClick={() => navigate(`/meetings/${m.room_code}`)} className="flex-1 sm:flex-initial">
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateMeetingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(m) => {
          setShowCreate(false)
          setCreated(m)
          load()
        }}
      />
      <CreatedMeetingModal meeting={created} onClose={() => setCreated(null)} />
    </div>
  )
}
