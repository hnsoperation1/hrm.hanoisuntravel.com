import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Xoá log chấm công của 1 nhân viên (mặc định chính admin đang gọi, hoặc
// người khác nếu truyền userId) trong 1 ngày cụ thể — công cụ hỗ trợ test
// và sửa dữ liệu chấm công lỗi. Chỉ Super Admin/Boss gọi được (requireAdminUser).
//
// Dùng admin client (service_role) để xoá — bảng hrm_attendance_logs cố
// tình không có policy update/delete cho client thường (log là bằng chứng),
// nên request qua session bình thường sẽ bị RLS chặn âm thầm (trả về thành
// công nhưng 0 dòng bị xoá) nếu dùng client session thay vì admin ở đây.
export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const dateStr = typeof body?.date === 'string' ? body.date : null
  const targetUserId = typeof body?.userId === 'string' && body.userId ? body.userId : user!.id

  const startOfDay = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  if (Number.isNaN(startOfDay.getTime())) {
    return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 })
  }
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('hrm_attendance_logs')
    .delete({ count: 'exact' })
    .eq('user_id', targetUserId)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())

  if (error) return NextResponse.json({ error: 'Không xoá được dữ liệu' }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}
