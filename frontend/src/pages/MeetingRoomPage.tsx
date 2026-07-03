import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Copy, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { meetingService } from '../services/meetingService'
import { useMeetingCall } from '../hooks/useMeetingCall'
import type { Meeting } from '../types'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

function useCountdown(target: string | null): number {
  const [remaining, setRemaining] = useState(() => (target ? new Date(target).getTime() - Date.now() : 0))
  useEffect(() => {
    if (!target) return
    setRemaining(new Date(target).getTime() - Date.now())
    const id = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  return remaining
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'starting now'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function VideoTile({ stream, name, isLocal, muted, cameraOff }: {
  stream: MediaStream | null; name: string; isLocal?: boolean; muted?: boolean; cameraOff?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  const showVideo = !!stream && !cameraOff

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
      {showVideo ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded-md">
        {name}{isLocal ? ' (You)' : ''}
      </span>
    </div>
  )
}

export function MeetingRoomPage() {
  const { roomCode = '' } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [name, setName] = useState(() => localStorage.getItem('meeting_display_name') ?? '')
  const [joined, setJoined] = useState(false)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    meetingService.get(roomCode).then(setMeeting).catch(() => setNotFound(true))
  }, [roomCode])

  const scheduledMs = meeting?.scheduled_at ? new Date(meeting.scheduled_at).getTime() - Date.now() : 0
  const isFutureSchedule = meeting?.status === 'scheduled' && scheduledMs > 0
  const countdown = useCountdown(isFutureSchedule ? meeting!.scheduled_at : null)

  const call = useMeetingCall(roomCode, name || 'Guest', joined)

  useEffect(() => {
    if (joined || isFutureSchedule || notFound || !meeting) return
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
      if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
      stream = s
      setPreviewStream(s)
    }).catch(() => {})
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      setPreviewStream(null)
    }
  }, [joined, isFutureSchedule, notFound, meeting])

  const join = async () => {
    if (!name.trim()) { toast.error('Enter your name first'); return }
    localStorage.setItem('meeting_display_name', name.trim())
    previewStream?.getTracks().forEach((t) => t.stop())
    setPreviewStream(null)
    try { await meetingService.start(roomCode) } catch { /* non-fatal */ }
    setJoined(true)
  }

  const leave = () => navigate('/meetings')

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Invite link copied')
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 relative flex flex-col items-center justify-center text-center px-4">
        <div className="ambient-bg" />
        <p className="relative z-10 text-xl font-semibold text-gray-200 mb-2">Meeting not found</p>
        <p className="relative z-10 text-sm text-gray-500 mb-6">This link may be invalid or the meeting has ended.</p>
        <Button className="relative z-10" onClick={() => navigate('/meetings')}>Back to Meetings</Button>
      </div>
    )
  }

  if (!meeting) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Spinner /></div>
  }

  if (isFutureSchedule) {
    return (
      <div className="min-h-screen bg-gray-950 relative flex flex-col items-center justify-center text-center px-4">
        <div className="ambient-bg" />
        <p className="relative z-10 text-sm text-brand-600 font-medium mb-2">Scheduled meeting</p>
        <h1 className="relative z-10 font-display text-2xl tracking-wide text-gray-200 mb-3">{meeting.title}</h1>
        <p className="relative z-10 text-gray-400 mb-1">Starts in</p>
        <p className="relative z-10 text-4xl font-mono font-bold text-gray-100 mb-6">{formatCountdown(countdown)}</p>
        <p className="relative z-10 text-xs text-gray-600 mb-6">The call unlocks automatically when it's time — keep this tab open.</p>
        <Button variant="outline" className="relative z-10" onClick={copyLink}><Copy className="w-4 h-4" /> Copy invite link</Button>
      </div>
    )
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-950 relative flex flex-col items-center justify-center px-4 gap-6">
        <div className="ambient-bg" />
        <h1 className="relative z-10 font-display text-lg sm:text-xl tracking-wide text-gray-200 text-center">{meeting.title}</h1>
        <div className="relative z-10 w-full max-w-md aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-800">
          {previewStream ? (
            <video
              autoPlay
              muted
              playsInline
              ref={(el) => { if (el) el.srcObject = previewStream }}
              className="w-full h-full object-cover"
            />
          ) : (
            <Spinner />
          )}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Your name"
          className="relative z-10 w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-center text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="relative z-10 flex gap-3">
          <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /> Copy link</Button>
          <Button onClick={join}>Join meeting</Button>
        </div>
      </div>
    )
  }

  const tiles = [
    { sid: 'local', name: name || 'You', stream: call.localStream, isLocal: true },
    ...call.peers.map((p) => ({ ...p, isLocal: false })),
  ]

  return (
    <div className="min-h-screen bg-gray-950 relative flex flex-col">
      <div className="ambient-bg" />
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-gray-800 shrink-0 gap-2">
          <span className="text-sm font-medium text-gray-300 truncate">{meeting.title}</span>
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="w-4 h-4" /> {tiles.length}
          </span>
        </div>

        {call.error && (
          <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm text-center py-2 shrink-0">
            {call.error}
          </div>
        )}

        <div
          className="flex-1 p-3 sm:p-6 grid gap-3 sm:gap-4 content-center"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          {tiles.map((t) => (
            <VideoTile
              key={t.sid}
              stream={t.stream}
              name={t.name}
              isLocal={t.isLocal}
              muted={t.isLocal}
              cameraOff={t.isLocal && !call.cameraOn}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 py-5 border-t border-gray-800 shrink-0">
          <button
            onClick={call.toggleMic}
            className={clsx(
              'p-3 rounded-full transition-colors',
              call.micOn ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-red-600 text-white hover:bg-red-500'
            )}
            title={call.micOn ? 'Mute' : 'Unmute'}
          >
            {call.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            onClick={call.toggleCamera}
            className={clsx(
              'p-3 rounded-full transition-colors',
              call.cameraOn ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-red-600 text-white hover:bg-red-500'
            )}
            title={call.cameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {call.cameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button
            onClick={copyLink}
            className="p-3 rounded-full bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
            title="Copy invite link"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={leave}
            className="p-3 px-6 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors"
            title="Leave call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
