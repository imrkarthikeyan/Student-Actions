interface LogoProps {
  className?: string
}

/** Abstract sync/link mark — two crossing pill shapes on a gradient badge. */
export function LogoMark({ className = 'w-5 h-5' }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <rect x="4" y="13" width="24" height="6" rx="3" fill="currentColor" transform="rotate(-32 16 16)" />
      <rect x="4" y="13" width="24" height="6" rx="3" fill="currentColor" opacity="0.55" transform="rotate(32 16 16)" />
    </svg>
  )
}

export function Logo({ className = 'w-9 h-9' }: LogoProps) {
  return (
    <div className={`${className} rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center shrink-0`}>
      <LogoMark className="w-[55%] h-[55%] text-white" />
    </div>
  )
}
