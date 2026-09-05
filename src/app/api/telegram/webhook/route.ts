import { NextRequest, NextResponse } from 'next/server'
import { sendMessage, openAppButton } from '@/lib/telegram'

interface TelegramMessage {
  chat: { id: number }
  text?: string
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Sai secret token' }, { status: 401 })
  }

  const update = await req.json()

  try {
    if (update.message) {
      await handleMessage(update.message as TelegramMessage)
    }
  } catch (e) {
    console.error('[hrm telegram webhook]', e)
  }

  // Luôn trả 200 cho Telegram dù có lỗi nội bộ, tránh Telegram retry vô hạn.
  return NextResponse.json({ ok: true })
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id
  // Bot chỉ đóng vai trò "lối tắt" mở web — không tự xử lý vị trí/định danh
  // nhân viên trong Telegram nữa. Đăng nhập/chấm công vẫn hoàn toàn qua
  // Supabase Auth như mở trực tiếp bằng trình duyệt.
  await sendMessage(chatId, 'Bấm nút bên dưới để mở trang chấm công:', openAppButton())
}
