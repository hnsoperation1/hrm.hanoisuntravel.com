import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

// Trả về TOÀN BỘ nhân viên kèm cấu hình yêu cầu chấm công của họ — nhân
// viên chưa có dòng nào trong hrm_employee_requirements thì mặc định cả 3
// điều kiện bắt buộc + không gán địa điểm cố định (giữ đúng hành vi gốc).
export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const [{ data: employees, error: empError }, { data: reqs, error: reqError }, { data: locations, error: locError }] =
    await Promise.all([
      supabase.from('users').select('id, full_name, email').order('full_name'),
      supabase.from('hrm_employee_requirements').select('*'),
      supabase.from('hrm_work_locations').select('id, name').eq('is_active', true).order('name'),
    ])

  if (empError || reqError || locError) {
    return NextResponse.json({ error: 'Không tải được dữ liệu' }, { status: 500 })
  }

  const reqMap = new Map((reqs ?? []).map((r) => [r.user_id, r]))

  const merged = (employees ?? []).map((e) => {
    const r = reqMap.get(e.id)
    return {
      id: e.id,
      full_name: e.full_name,
      email: e.email,
      require_gps: r?.require_gps ?? true,
      require_wifi: r?.require_wifi ?? true,
      require_face: r?.require_face ?? true,
      location_id: r?.location_id ?? null,
    }
  })

  return NextResponse.json({ employees: merged, locations: locations ?? [] })
}

export async function POST(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : null
  if (!userId) {
    return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 })
  }

  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if (typeof body.require_gps === 'boolean') update.require_gps = body.require_gps
  if (typeof body.require_wifi === 'boolean') update.require_wifi = body.require_wifi
  if (typeof body.require_face === 'boolean') update.require_face = body.require_face
  if (body.location_id === null || typeof body.location_id === 'string') update.location_id = body.location_id

  const { error } = await supabase.from('hrm_employee_requirements').upsert(update)
  if (error) return NextResponse.json({ error: 'Không lưu được cấu hình' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
