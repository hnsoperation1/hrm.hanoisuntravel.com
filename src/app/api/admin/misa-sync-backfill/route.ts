import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runMisaSync } from '@/lib/misaSync'

// Đồng bộ lại từ 1 mốc cố định trong quá khứ (bỏ qua misa_last_synced_at) —
// dành riêng cho Super Admin, dùng khi cần lấy bù dữ liệu cũ (vd mới cấu
// hình xong mã nhân viên MISA, cần kéo lại từ đầu tháng thay vì chỉ từ lúc
// cấu hình xong).
export async function POST() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Chỉ Super Admin mới dùng được tính năng này' }, { status: 403 })
  }

  // Cố định mốc 01/09/2026 00:00 giờ Việt Nam.
  const fromDate = new Date('2026-09-01T00:00:00+07:00')

  try {
    // Dùng service_role — runMisaSync cần insert hrm_attendance_logs THAY
    // cho nhiều nhân viên khác nhau, trong khi client theo cookie của chính
    // admin bị chặn bởi RLS "self_insert_hrm_attendance" (chỉ tự chèn được
    // log của chính mình, không có ngoại lệ cho admin).
    const result = await runMisaSync(createAdminClient(), { fromDate })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[misa-sync-backfill]', e)
    return NextResponse.json({ error: 'Đồng bộ thất bại' }, { status: 502 })
  }
}
