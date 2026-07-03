import { Header } from '../components/layout/Header'
import { ClipboardWidget } from '../components/dashboard/ClipboardWidget'
import { ShareWidget } from '../components/dashboard/ShareWidget'
import { ConvertWidget } from '../components/dashboard/ConvertWidget'
import { MeetingsWidget } from '../components/dashboard/MeetingsWidget'
import { WorkspacesWidget } from '../components/dashboard/WorkspacesWidget'

export function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Dashboard" />
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
          <ClipboardWidget />
          <ShareWidget />
          <ConvertWidget />
          <MeetingsWidget />
          <WorkspacesWidget />
        </div>
      </div>
    </div>
  )
}
