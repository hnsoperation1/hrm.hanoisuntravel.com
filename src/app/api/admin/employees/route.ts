import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { data, error } = await supabase.from('users').select('id, full_name, email').order('full_name')
  if (error) return NextResponse.json({ error: 'Không tải được danh sách nhân viên' }, { status: 500 })
  return NextResponse.json({ employees: data ?? [] })
}
