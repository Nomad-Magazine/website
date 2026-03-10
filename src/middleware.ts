import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServerClient } from './utils/supabase-server'

const ADMIN_EMAIL = 'hey@nomadgossip.com'

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  const isConsoleRoute = pathname.startsWith('/console')
  const isLoginPage = pathname === '/console/login' || pathname === '/console/login/'

  if (!isConsoleRoute || isLoginPage) {
    return next()
  }

  const supabase = createSupabaseServerClient(request, cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/console/login/')
  }

  // Protect /console/admin/* — only the admin email can access
  const isAdminRoute = pathname.startsWith('/console/admin')
  if (isAdminRoute && user.email !== ADMIN_EMAIL) {
    return redirect('/console/')
  }

  return next()
})
