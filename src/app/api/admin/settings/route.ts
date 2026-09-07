import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

// Cấu hình chung TOÀN HỆ THỐNG (1 dòng duy nhất, id=1) — khác với
// hrm_employee_requirements (theo từng nhân viên). Hiện chỉ có ngưỡng khớp
// khuôn mặt, có thể mở rộng thêm field sau này.
export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { data, error } = await supabase
    .from('hrm_app_settings')
    .select('face_match_threshold')
    .eq('id', 1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Không tải được cấu hình' }, { status: 500 })
  return NextResponse.json({ faceMatchThreshold: data?.face_match_threshold ?? 0.3 })
}

export async function POST(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const threshold = body?.faceMatchThreshold

  if (typeof threshold !== 'number' || Number.isNaN(threshold) || threshold <= 0 || threshold > 1) {
    return NextResponse.json({ error: 'Ngưỡng phải là số trong khoảng (0, 1]' }, { status: 400 })
  }

  const { error } = await supabase
    .from('hrm_app_settings')
    .update({ face_match_threshold: threshold, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: 'Không lưu được cấu hình' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
