import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runMisaSync } from '@/lib/misaSync'

const COOLDOWN_MS = 5 * 60 * 1000

// Nhân viên bấm "Đồng bộ" ở màn Bảng công để lấy ngay dữ liệu mới nhất từ
// MISA, không cần đợi tới cron 8h sáng hôm sau. Dùng chung service_role vì
// cần đọc/ghi hrm_attendance_logs của TẤT CẢ nhân viên (đồng bộ 1 lần cho cả
// công ty), không chỉ riêng người bấm nút — nhưng vẫn bắt buộc đăng nhập để
// tránh ai đó chưa xác thực cũng gọi được.
export async function POST() {
  const { unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const admin = createAdminClient()

  const { data: settings } = await admin.from('hrm_app_settings').select('misa_last_synced_at').eq('id', 1).maybeSingle()
  if (settings?.misa_last_synced_at) {
    const elapsed = Date.now() - new Date(settings.misa_last_synced_at).getTime()
    if (elapsed < COOLDOWN_MS) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Vừa đồng bộ gần đây, thử lại sau ít phút nhé' })
    }
  }

  try {
    const result = await runMisaSync(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[misa-sync-now]', e)
    return NextResponse.json({ error: 'Đồng bộ thất bại, thử lại sau' }, { status: 502 })
  }
}
