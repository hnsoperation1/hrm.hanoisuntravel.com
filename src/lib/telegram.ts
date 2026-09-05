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

/** Bàn phím có nút "chia sẻ vị trí" — bấm vào là hệ điều hành tự xin quyền
 * định vị và gửi thẳng toạ độ cho bot, không cần mở trình duyệt. */
export function locationKeyboard() {
  return {
    keyboard: [[{ text: '📍 Chấm công (chia sẻ vị trí)', request_location: true }]],
    resize_keyboard: true,
  }
}
