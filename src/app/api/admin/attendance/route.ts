import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

// Báo cáo chấm công toàn công ty — chỉ Super Admin/Boss.
// Hỗ trợ filter cơ bản: ?from=ISO&to=ISO&userId=uuid
export async function GET(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const userId = searchParams.get('userId')

  let query = supabase
    .from('hrm_attendance_logs')
    .select(
      'id, user_id, type, created_at, lat, lng, accuracy_m, distance_m, is_within_radius, is_ip_verified, is_face_verified, face_distance, is_success, channel, hrm_work_locations(name), users(full_name, email)',
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Không tải được báo cáo' }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}
