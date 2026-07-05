import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Copy, Users, ShieldCheck, Wifi, ArrowLeft, Sparkles, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { meetingService } from '../services/meetingService';
import { useMeetingCall } from '../hooks/useMeetingCall';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { getMeetingMediaStream } from '../utils/media';
function useCountdown(target) {
  const [remaining, setRemaining] = useState(() => (target ? new Date(target).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!target)
      return;
    setRemaining(new Date(target).getTime() - Date.now());
    const id = setInterval(() => setRemaining(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}
function formatCountdown(ms) {
  if (ms <= 0)
    return 'starting now';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0)
    return `${d}d ${h}h ${m}m`;
  if (h > 0)
    return `${h}h ${m}m ${s}s`;
  if (m > 0)
    return `${m}m ${s}s`;
  return `${s}s`;
}
function VideoTile({ stream, name, isLocal, muted, cameraOff }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current)
      ref.current.srcObject = stream;
  }, [stream]);
  const showVideo = !!stream && !cameraOff;
  return (<div className="group relative overflow-hidden rounded-2xl aspect-video flex items-center justify-center border border-gray-800 bg-white/70 shadow-soft transition-transform duration-200 hover:-translate-y-0.5">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(224,20,20,0.08),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.65),transparent_55%)]" />
    {showVideo ? (<video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />) : (<div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </div>)}
    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-gray-950/75 to-transparent text-white">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs sm:text-sm font-medium truncate">{name}{isLocal ? ' (You)' : ''}</span>
        {isLocal ? (<span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"><span className="w-1.5 h-1.5 rounded-full bg-white animate-glow" />Live</span>) : null}
      </div>
    </div>
  </div>);
}
export function MeetingRoomPage() {
  const { roomCode = '' } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('meeting_display_name') ?? '');
  const [joined, setJoined] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);
  useEffect(() => {
    meetingService.get(roomCode).then(setMeeting).catch(() => setNotFound(true));
  }, [roomCode]);
  const scheduledMs = meeting?.scheduled_at ? new Date(meeting.scheduled_at).getTime() - Date.now() : 0;
  const isFutureSchedule = meeting?.status === 'scheduled' && scheduledMs > 0;
  const countdown = useCountdown(isFutureSchedule ? meeting.scheduled_at : null);
  const call = useMeetingCall(roomCode, name || 'Guest', joined);
  useEffect(() => {
    if (joined || isFutureSchedule || notFound || !meeting)
      return;
    let stream = null;
    let cancelled = false;
    getMeetingMediaStream().then((s) => {
      if (cancelled) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      setPreviewStream(s);
    }).catch(() => { });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    };
  }, [joined, isFutureSchedule, notFound, meeting]);
  const join = async () => {
    if (!name.trim()) {
      toast.error('Enter your name first');
      return;
    }
    localStorage.setItem('meeting_display_name', name.trim());
    previewStream?.getTracks().forEach((t) => t.stop());
    setPreviewStream(null);
    try {
      await meetingService.start(roomCode);
    }
    catch { /* non-fatal */ }
    setJoined(true);
  };
  const leave = () => navigate('/meetings');
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Invite link copied');
  };
  if (notFound) {
    return (<div className="min-h-screen relative flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      <div className="ambient-bg" />
      <div className="relative z-10 surface max-w-md w-full p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Meeting room</p>
        <p className="text-xl font-semibold text-gray-100 mb-2">Meeting not found</p>
        <p className="text-sm text-gray-500 mb-6">This link may be invalid or the meeting has ended.</p>
        <Button className="w-full" onClick={() => navigate('/meetings')}><ArrowLeft className="w-4 h-4" /> Back to meetings</Button>
      </div>
    </div>);
  }
  if (!meeting) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  }
  if (isFutureSchedule) {
    return (<div className="min-h-screen relative flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      <div className="ambient-bg" />
      <div className="relative z-10 surface max-w-lg w-full p-8 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 mb-4">
          <Radio className="w-3.5 h-3.5" /> Scheduled meeting
        </div>
        <h1 className="font-display text-2xl tracking-wide text-gray-100 mb-3">{meeting.title}</h1>
        <p className="text-gray-500 mb-1">Starts in</p>
        <p className="text-4xl font-mono font-bold text-gray-100 mb-4">{formatCountdown(countdown)}</p>
        <p className="text-xs text-gray-600 mb-6">The call unlocks automatically when it's time — keep this tab open.</p>
        <Button variant="outline" className="w-full sm:w-auto" onClick={copyLink}><Copy className="w-4 h-4" /> Copy invite link</Button>
      </div>
    </div>);
  }
  if (!joined) {
    return (<div className="min-h-screen relative flex flex-col items-center justify-center px-4 gap-6 overflow-hidden">
      <div className="ambient-bg" />
      <div className="relative z-10 surface w-full max-w-4xl p-4 sm:p-6 lg:p-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] items-center">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-600/10 px-3 py-1 text-brand-700"><Sparkles className="w-3.5 h-3.5" /> Ready to join</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-white/60 px-3 py-1 text-gray-500"><ShieldCheck className="w-3.5 h-3.5 text-brand-600" /> Stable call quality</span>
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl tracking-wide text-gray-100">{meeting.title}</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-2xl">Preview your camera and microphone before entering. The room is tuned for smoother capture with 720p video constraints and audio cleanup.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-500">
            <div className="surface p-4"><p className="font-semibold text-gray-100">HD preview</p><p className="mt-1">Sharper camera capture</p></div>
            <div className="surface p-4"><p className="font-semibold text-gray-100">Noise suppression</p><p className="mt-1">Cleaner audio on entry</p></div>
            <div className="surface p-4"><p className="font-semibold text-gray-100">One-click invite</p><p className="mt-1">Copy the room link instantly</p></div>
          </div>
          <div className="w-full aspect-video bg-white/70 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-800 shadow-soft">
            {previewStream ? (<video autoPlay muted playsInline ref={(el) => {
              if (el)
                el.srcObject = previewStream;
            }} className="w-full h-full object-cover" />) : (<Spinner />)}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && join()} placeholder="Your name" className="w-full bg-white/70 border border-gray-800 rounded-lg px-4 py-3 text-center text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /> Copy link</Button>
            <Button onClick={join}>Join meeting</Button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">Use a quiet environment for the best result. If the camera preview looks dim, switch to a brighter room before joining.</p>
        </div>
      </div>
    </div>);
  }
  const tiles = [
    { sid: 'local', name: name || 'You', stream: call.localStream, isLocal: true },
    ...call.peers.map((p) => ({ ...p, isLocal: false })),
  ];
  return (<div className="min-h-screen relative overflow-hidden">
    <div className="ambient-bg" />
    <div className="relative z-10 min-h-screen xl:grid xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="flex flex-col min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 h-auto min-h-16 border-b border-gray-800/80 bg-gray-950/75 backdrop-blur-md py-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Meeting room</p>
            <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
              <span className="text-sm sm:text-base font-semibold text-gray-100 truncate">{meeting.title}</span>
              <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]', call.connected ? 'bg-brand-600/10 text-brand-700' : 'bg-gray-800 text-gray-300')}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', call.connected ? 'bg-brand-600 animate-glow' : 'bg-gray-500')} />
                {call.connected ? 'Connected' : 'Reconnecting'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 text-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"><ShieldCheck className="w-3 h-3" /> Encrypted</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-white/60 px-3 py-1 text-xs font-medium text-gray-500"><Users className="w-3.5 h-3.5 text-brand-600" /> {tiles.length} participant{tiles.length === 1 ? '' : 's'}</span>
            <Button variant="outline" size="sm" onClick={copyLink}><Copy className="w-4 h-4" /> Copy link</Button>
          </div>
        </div>

        {call.error && (<div className="bg-brand-600/10 border-b border-brand-600/20 text-brand-700 text-sm text-center py-2 shrink-0">
          {call.error}
        </div>)}

        <div className="flex-1 p-3 sm:p-6">
          <div className="surface p-3 sm:p-4 h-full">
            <div className="grid gap-3 sm:gap-4 content-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {tiles.map((t) => (<VideoTile key={t.sid} stream={t.stream} name={t.name} isLocal={t.isLocal} muted={t.isLocal} cameraOff={t.isLocal && !call.cameraOn} />))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/80 bg-gray-950/80 backdrop-blur-md px-4 sm:px-6 py-4 shrink-0">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={call.toggleMic} className={clsx('p-3 rounded-full transition-colors shadow-soft', call.micOn ? 'bg-white/70 text-gray-100 hover:bg-white' : 'bg-brand-600 text-white hover:bg-brand-500')} title={call.micOn ? 'Mute' : 'Unmute'}>
              {call.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={call.toggleCamera} className={clsx('p-3 rounded-full transition-colors shadow-soft', call.cameraOn ? 'bg-white/70 text-gray-100 hover:bg-white' : 'bg-brand-600 text-white hover:bg-brand-500')} title={call.cameraOn ? 'Turn off camera' : 'Turn on camera'}>
              {call.cameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={copyLink} className="p-3 rounded-full bg-white/70 text-gray-100 hover:bg-white transition-colors shadow-soft" title="Copy invite link">
              <Copy className="w-5 h-5" />
            </button>
            <button onClick={leave} className="p-3 px-6 rounded-full bg-brand-600 text-white hover:bg-brand-500 transition-colors shadow-soft-lg" title="Leave call">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">Video runs with higher quality capture and resilient audio settings. If your network drops, the room will retry the signaling channel automatically.</p>
        </div>
      </section>

      <aside className="hidden xl:flex flex-col gap-4 border-l border-gray-800/80 bg-gray-950/60 backdrop-blur-sm p-5">
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Meeting health</p>
          <div className="mt-4 space-y-3 text-sm text-gray-500">
            <div className="flex items-center justify-between gap-3"><span>Signal</span><span className="font-semibold text-gray-100">{call.connected ? 'Stable' : 'Recovering'}</span></div>
            <div className="flex items-center justify-between gap-3"><span>Audio</span><span className="font-semibold text-gray-100">Noise suppression on</span></div>
            <div className="flex items-center justify-between gap-3"><span>Video</span><span className="font-semibold text-gray-100">720p capture</span></div>
            <div className="flex items-center justify-between gap-3"><span>Privacy</span><span className="font-semibold text-gray-100">Encrypted room</span></div>
          </div>
        </div>

        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Shortcuts</p>
          <div className="mt-4 flex flex-col gap-3">
            <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4" /> Copy invite link</Button>
            <Button variant="outline" onClick={() => navigate('/meetings')}><ArrowLeft className="w-4 h-4" /> Leave room</Button>
          </div>
        </div>

        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Call notes</p>
          <ul className="mt-4 space-y-3 text-sm text-gray-500 leading-relaxed">
            <li>Use the mute button when you are not speaking.</li>
            <li>Keep the camera on for the best demo impression.</li>
            <li>Share the invite link from the control bar or sidebar.</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>);
}
