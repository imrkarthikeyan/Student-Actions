import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { workspaceService } from '../../services/workspaceService'
import type { Workspace } from '../../types'
import { Spinner } from '../ui/Spinner'
import { FeatureCard } from './FeatureCard'

export function WorkspacesWidget() {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null)

  useEffect(() => {
    workspaceService.list().then(setWorkspaces).catch(() => setWorkspaces([]))
  }, [])

  return (
    <FeatureCard icon={<Users className="w-4 h-4" />} title="Workspaces" to="/workspaces">
      {workspaces === null ? (
        <div className="flex-1 flex items-center justify-center py-6"><Spinner /></div>
      ) : workspaces.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No workspaces yet</p>
      ) : (
        <div className="space-y-2">
          {workspaces.slice(0, 4).map((ws) => (
            <div key={ws.id} className="flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-700 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
                {ws.name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 min-w-0 truncate text-gray-200">{ws.name}</span>
              <span className="text-xs text-gray-500 shrink-0">{ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </FeatureCard>
  )
}
