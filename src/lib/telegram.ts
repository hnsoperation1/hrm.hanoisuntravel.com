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

// Sửa lại tin nhắn cũ tại chỗ (đổi trạng thái đơn từ) thay vì gửi tin mới —
// giữ cho luồng duyệt đơn gọn trong đúng 1 tin nhắn trong nhóm.
export function editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: Record<string, unknown>) {
  return call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  })
}

// Bắt buộc gọi sau MỌI callback_query, kể cả khi từ chối thao tác — không
// gọi thì Telegram giữ icon đồng hồ loading trên nút mãi trên máy người bấm.
// showAlert = true hiện popup chặn thay vì toast nhỏ góc màn hình, dùng cho
// lỗi phân quyền để người bấm chắc chắn nhìn thấy chứ không lướt qua.
export function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  return call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  })
}

export function inlineKeyboard(rows: { text: string; callback_data: string }[][]) {
  return { inline_keyboard: rows }
}
