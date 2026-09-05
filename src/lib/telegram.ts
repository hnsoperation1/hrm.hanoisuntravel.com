const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function call(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`Telegram ${method} lỗi: ${json.description ?? res.statusText}`)
  return json.result
}

export function sendMessage(chatId: number, text: string, replyMarkup?: Record<string, unknown>) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  })
}

/** Nút mở trang chấm công dưới dạng Telegram Web App (Mini App) — hiển thị
 * nhúng ngay trong Telegram, không bật trình duyệt riêng. Trỏ thẳng vào `/`
 * (trang chấm công gốc) — chạy như trình duyệt thật (IP thật, cookie thật)
 * nên đăng nhập Supabase Auth hoạt động bình thường: lần đầu mở sẽ ra màn
 * đăng nhập, các lần sau giữ nguyên session như web bình thường. */
export function openAppButton() {
  return {
    keyboard: [[{ text: '📍 Chấm công', web_app: { url: process.env.NEXT_PUBLIC_APP_URL } }]],
    resize_keyboard: true,
  }
}
