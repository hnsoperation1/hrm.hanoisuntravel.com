import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Bấm Đồng ý/Từ chối NGAY TRÊN trang xác nhận (điện thoại) — nhánh còn lại
// (bấm qua Telegram) xử lý trong webhook, cùng chung logic đổi trạng thái.
export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
  const approve = typeof body?.approve === 'boolean' ? body.approve : null
  if (!sessionId || approve === null) return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })

  const admin = createAdminClient()
  const { data: session } = await admin.from('hrm_qr_login_sessions').select('*').eq('id', sessionId).maybeSingle()

  if (!session || session.status !== 'scanned' || session.user_id !== user!.id) {
    return NextResponse.json({ error: 'Phiên không hợp lệ' }, { status: 400 })
  }

  const { error } = await admin
    .from('hrm_qr_login_sessions')
    .update({ status: approve ? 'approved' : 'rejected' })
    .eq('id', sessionId)
  if (error) return NextResponse.json({ error: 'Không lưu được' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
