import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Clipboard, GraduationCap, RefreshCw, Share2, Sparkles, Video, Workflow } from 'lucide-react';

const actionLinks = [
  { to: '/clipboard', icon: Clipboard, title: 'Clipboard', description: 'Capture, search, and sync items without friction.' },
  { to: '/convert', icon: RefreshCw, title: 'Quick Convert', description: 'Turn files into the right format from one shortcut.' },
  { to: '/share', icon: Share2, title: 'Share', description: 'Generate clean share links and move content fast.' },
  { to: '/meetings', icon: Video, title: 'Meetings', description: 'Launch or join a polished live room.' },
  { to: '/workspaces', icon: Workflow, title: 'Workspaces', description: 'Keep everything organized for a team or project.' },
];

const signals = [
  'Dashboard opens first, not a secondary page.',
  'A student graphic glides across before the workspace appears.',
  'No borders-heavy layout; the UI feels lighter and more editorial.',
];

function ActionRail({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-5 rounded-[2.25rem] bg-white/55 px-5 py-4 shadow-soft transition-transform duration-300 hover:-translate-y-1 hover:bg-white/75"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-brand-600/10 text-brand-700">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold text-gray-100">{title}</div>
          <div className="text-sm text-gray-500 leading-relaxed">{description}</div>
        </div>
      </div>
      <ArrowUpRight className="w-5 h-5 text-gray-400 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
    </Link>
  );
}

function StudentGraphic() {
  return (
    <div className="animate-corner-drift select-none">
      <div className="relative h-28 w-28 sm:h-36 sm:w-36">
        <div className="absolute inset-0 rounded-full bg-brand-600/10 blur-2xl" />
        <div className="absolute inset-4 rounded-full bg-white/70 shadow-soft" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white/90 shadow-soft">
            <GraduationCap className="h-9 w-9 text-brand-600" />
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-brand-600/20 blur-sm" />
        <div className="absolute left-2 top-8 h-3 w-3 rounded-full bg-brand-600/40 blur-sm" />
        <div className="absolute right-4 bottom-6 h-4 w-4 rounded-full bg-gray-900/10 blur-sm" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  return (<div className="relative min-h-screen overflow-hidden">
    <div className="ambient-bg" />
    <div className="relative z-10 flex min-h-screen flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-[3rem] bg-[radial-gradient(circle_at_top_left,rgba(224,20,20,0.15),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,247,247,0.68)_40%,rgba(247,247,248,0.94)_100%)] p-6 sm:p-8 lg:p-10 shadow-soft-lg animate-rise">
        <div className="absolute right-3 top-3 sm:right-8 sm:top-6">
          <StudentGraphic />
        </div>

        <div className="relative max-w-4xl pr-0 sm:pr-24 lg:pr-32">
          <div className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.34em] text-brand-700/90">
            <span className="h-px w-10 bg-gradient-to-r from-brand-600/10 via-brand-600 to-brand-600/10" />
            <Sparkles className="h-3.5 w-3.5" />
            <span>Professional workspace</span>
          </div>
          <h1 className="mt-5 max-w-3xl text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-100 leading-[0.9]">
            A fluid platform for clipboard, sharing, and live meetings.
          </h1>
          <p className="mt-5 max-w-2xl text-base sm:text-lg text-gray-500 leading-relaxed">
            The app opens on a quieter, more editorial dashboard with a slow student animation in the corner, so the platform feels branded and intentional before the workspace appears.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/clipboard" className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-soft-lg transition-transform hover:-translate-y-0.5">
              Open clipboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/convert" className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-3 text-sm font-semibold text-gray-100 shadow-soft transition-transform hover:-translate-y-0.5">
              Quick convert
              <RefreshCw className="w-4 h-4" />
            </Link>
            <Link to="/share" className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-3 text-sm font-semibold text-gray-100 shadow-soft transition-transform hover:-translate-y-0.5">
              Create a share
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/meetings" className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-3 text-sm font-semibold text-gray-100 shadow-soft transition-transform hover:-translate-y-0.5">
              Start a meeting
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {signals.map((signal, index) => (
              <div key={signal} className="rounded-[2rem] bg-white/55 p-5 shadow-soft">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-500">0{index + 1}</div>
                <p className="mt-3 text-sm sm:text-base text-gray-100 leading-relaxed">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {actionLinks.map((item) => <ActionRail key={item.title} {...item} />)}
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,244,244,0.58))] p-6 sm:p-7 shadow-soft">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(224,20,20,0.08),transparent_35%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Platform pulse</p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-100">
                Built to feel polished in a resume walkthrough.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[2rem] bg-white/55 p-5 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Motion</p>
                <p className="mt-2 text-sm text-gray-100">Slow introductory animation with a small student graphic gliding across.</p>
              </div>
              <div className="rounded-[2rem] bg-white/55 p-5 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Feel</p>
                <p className="mt-2 text-sm text-gray-100">Editorial layout, softer hierarchy, and less box-heavy chrome.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>);
}
