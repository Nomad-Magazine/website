import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServerClient } from './utils/supabase-server'

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  if (request.method === 'POST' && (pathname.startsWith('/console') || /^\/nomad-directory-edit\/?$/.test(pathname) || pathname === '/nomad_directory/vote/')) {
    if (request.headers.get('origin') !== url.origin) return new Response('Invalid request origin', { status: 403 })
  }

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
    return redirect('/nomad-directory-edit/')
  }

  // Review permissions come from the private database role table.
  const isAdminRoute = pathname.startsWith('/console/admin')
  if (isAdminRoute) {
    const { data: isAdmin } = await supabase.rpc('directory_is_admin')
    if (!isAdmin) return redirect('/console/')
  }
  const response = await next()
  response.headers.set('Cache-Control', 'private, no-store')
  return response
})
