import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET() {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const [{ data: isSuperAdmin }, { data: profile }] = await Promise.all([
    supabase.rpc('is_super_admin'),
    supabase.from('users').select('role, full_name').eq('id', user!.id).single(),
  ])

  return NextResponse.json({
    user: {
      id: user!.id,
      email: user!.email,
      full_name: profile?.full_name ?? user!.email,
      is_super_admin: isSuperAdmin ?? false,
      is_boss: profile?.role === 'boss',
    },
  })
}
