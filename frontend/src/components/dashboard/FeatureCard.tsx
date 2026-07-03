import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  to: string
  children: ReactNode
  className?: string
}

export function FeatureCard({ icon, title, to, children, className }: FeatureCardProps) {
  return (
    <div className={clsx('surface surface-hover p-4 sm:p-5 flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-600/15 text-brand-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <h2 className="font-display text-xs sm:text-sm tracking-wide text-gray-200 leading-tight">{title}</h2>
        </div>
        <Link
          to={to}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors shrink-0"
        >
          Open <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  )
}
