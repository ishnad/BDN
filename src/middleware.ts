import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')
  const isApiRoute = pathname.startsWith('/api')
  const isStatic = pathname.startsWith('/_next') || pathname === '/favicon.ico'

  if (isStatic) return supabaseResponse

  // Unauthenticated — send to login (except auth + api routes)
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Fetch role for redirect logic
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role as string | undefined

    // Already on correct role route — let through
    const onSupplier = pathname.startsWith('/supplier')
    const onCustomer = pathname.startsWith('/customer')
    const onDashboard = pathname.startsWith('/dashboard')
    const onAuth = pathname.startsWith('/auth')

    // Redirect from login to home
    if (onAuth) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'supplier' ? '/supplier' : role === 'admin' ? '/dashboard' : '/customer'
      return NextResponse.redirect(url)
    }

    // Redirect root
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'supplier' ? '/supplier' : role === 'admin' ? '/dashboard' : '/customer'
      return NextResponse.redirect(url)
    }

    // Prevent suppliers accessing customer routes and vice versa
    if (role === 'supplier' && (onCustomer || onDashboard)) {
      const url = request.nextUrl.clone()
      url.pathname = '/supplier'
      return NextResponse.redirect(url)
    }
    if (role === 'customer' && (onSupplier || onDashboard)) {
      const url = request.nextUrl.clone()
      url.pathname = '/customer'
      return NextResponse.redirect(url)
    }
    if (role === 'admin' && (onSupplier || onCustomer)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
