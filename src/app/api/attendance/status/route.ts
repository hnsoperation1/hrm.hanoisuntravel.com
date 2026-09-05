import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET() {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: logs, error } = await supabase
    .from('hrm_attendance_logs')
    .select(
      'id, type, created_at, is_within_radius, is_ip_verified, is_success, distance_m, hrm_work_locations(name)',
    )
    .eq('user_id', user!.id)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Không tải được dữ liệu chấm công' }, { status: 500 })
  }

  // Chỉ tính lượt THÀNH CÔNG khi xác định vào/ra tiếp theo — 1 lượt bấm thất
  // bại (sai vị trí/mạng) vẫn được lưu để làm bằng chứng, nhưng không được
  // tính là "đã vào/đã ra" thật sự.
  const successLogs = (logs ?? []).filter((l) => l.is_success)
  const lastLog = successLogs.length > 0 ? successLogs[successLogs.length - 1] : null
  const nextType: 'check_in' | 'check_out' = lastLog?.type === 'check_in' ? 'check_out' : 'check_in'

  return NextResponse.json({ logs: logs ?? [], nextType })
}
