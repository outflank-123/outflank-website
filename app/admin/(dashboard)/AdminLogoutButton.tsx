'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function AdminLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      id="admin-logout-btn"
      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors"
    >
      <LogOut size={11} />
      Logout
    </button>
  )
}
