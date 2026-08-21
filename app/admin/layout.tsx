import AdminSidebar from './AdminSidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="h-screen bg-[#fbfbfd] flex selection:bg-[#e3231c]/20 overflow-hidden">
      <AdminSidebar userEmail={user?.email} />

      {/* Main content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-8 lg:p-12 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
