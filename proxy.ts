import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Next.js 16: middleware is now called "proxy" — same functionality
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required by @supabase/ssr
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/admin/login')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin') && !isAuthPage

  // Not logged in -> Redirect to login
  if (isAdminPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Logged in -> Try to access login page -> Redirect to admin dashboard
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // RBAC Enforcements
  if (isAdminPage && user) {
    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'admin' // fallback

    // 1. Junior constraints
    if (role === 'junior') {
      const allowedPaths = ['/admin/leads', '/admin/products']
      const isAllowed = allowedPaths.some(
        (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`)
      )
      
      // If trying to access dashboard or disallowed route
      if (!isAllowed || request.nextUrl.pathname === '/admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/leads'
        return NextResponse.redirect(url)
      }
    }

    // 2. Admin constraints
    if (role === 'admin') {
      if (request.nextUrl.pathname.startsWith('/admin/users')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
