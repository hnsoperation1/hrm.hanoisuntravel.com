import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessage, inlineKeyboard } from '@/lib/telegram'

// Gọi từ ĐIỆN THOẠI (đã đăng nhập sẵn) ngay sau khi quét QR mở link xác
// nhận — đánh dấu phiên này là của chính người đang gọi, rồi báo thêm qua
// Telegram (nếu đã liên kết) để có thể xác nhận ở CẢ 2 nơi.
export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
  if (!sessionId) return NextResponse.json({ error: 'Thiếu sessionId' }, { status: 400 })

  const admin = createAdminClient()
  const { data: session } = await admin.from('hrm_qr_login_sessions').select('*').eq('id', sessionId).maybeSingle()

  if (!session || session.status !== 'pending' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Mã QR đã hết hạn hoặc không hợp lệ' }, { status: 400 })
  }

  const { error } = await admin
    .from('hrm_qr_login_sessions')
    .update({ status: 'scanned', user_id: user!.id })
    .eq('id', sessionId)
  if (error) return NextResponse.json({ error: 'Không xác nhận được' }, { status: 500 })

  const { data: link } = await admin.from('hrm_telegram_links').select('chat_id').eq('user_id', user!.id).maybeSingle()
  if (link) {
    const time = new Date(session.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    await sendMessage(
      link.chat_id,
      `<b>Xác nhận đăng nhập</b>\nThiết bị: ${session.device_label ?? 'không rõ'}\nLúc: ${time}\n\nCó phải bạn đang đăng nhập không?`,
      inlineKeyboard([
        [
          { text: 'Đồng ý', callback_data: `qr:${sessionId}:approve` },
          { text: 'Từ chối', callback_data: `qr:${sessionId}:reject` },
        ],
      ]),
    ).catch((e) => console.error('[qr login] gửi Telegram lỗi', e))
  }

  return NextResponse.json({ deviceLabel: session.device_label, createdAt: session.created_at })
}
