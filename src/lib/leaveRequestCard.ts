// Dựng nội dung + bàn phím inline cho 1 đơn từ theo từng trạng thái — dùng
// chung cho lúc gửi tin đầu tiên (sendMessage) và mọi lần sửa tin sau đó
// (editMessageText), tránh lặp logic format ở nhiều chỗ trong webhook.

import { inlineKeyboard } from './telegram'
import { LEAVE_REQUEST_FIELDS, LEAVE_REQUEST_TITLES, type LeaveRequestType } from './leaveRequestParser'

type LeaveRequestStatus = 'pending_requester' | 'pending_manager' | 'pending_admin' | 'approved' | 'rejected'

type CardInput = {
  request_no: number
  type: LeaveRequestType
  fields: Record<string, string>
  status: LeaveRequestStatus
  requesterName: string
  managerName: string | null
}

export function renderRequestCard({ request_no, type, fields, status, requesterName, managerName }: CardInput) {
  const fieldDefs = LEAVE_REQUEST_FIELDS[type]

  const lines = [
    `<b>${LEAVE_REQUEST_TITLES[type]}</b>`,
    `Người xin: ${requesterName}`,
    ...fieldDefs.map((f) => `${f.label}: ${fields[f.key]?.trim() ? fields[f.key] : '(chưa rõ)'}`),
    '',
  ]

  if (status !== 'pending_requester') lines.push(`${requesterName} đã xác nhận ✓`)
  if (status === 'pending_admin' || status === 'approved') lines.push(`${managerName ?? 'Quản lý trực tiếp'} đã đồng ý ✓`)
  if (status === 'approved') lines.push('Admin chấm công đã duyệt ✓')

  let replyMarkup: { inline_keyboard: { text: string; callback_data: string }[][] }
  if (status === 'pending_requester') {
    replyMarkup = inlineKeyboard([
      [{ text: '✏️ Sửa lại thông tin', callback_data: `lr:${request_no}:edit` }],
      [{ text: 'Xác nhận nộp đơn', callback_data: `lr:${request_no}:submit` }],
    ])
  } else if (status === 'pending_manager') {
    if (!managerName) lines.push('', '⚠️ Chưa cấu hình quản lý trực tiếp cho người này — nhờ admin cấu hình để đơn có thể đi tiếp.')
    replyMarkup = inlineKeyboard([[{ text: 'Đồng ý', callback_data: `lr:${request_no}:agree` }]])
  } else if (status === 'pending_admin') {
    replyMarkup = inlineKeyboard([[{ text: 'Duyệt', callback_data: `lr:${request_no}:approve` }]])
  } else {
    replyMarkup = { inline_keyboard: [] }
  }

  return { text: lines.join('\n'), replyMarkup }
}

export function renderEditMenu({ request_no, type, fields }: Pick<CardInput, 'request_no' | 'type' | 'fields'>) {
  const fieldDefs = LEAVE_REQUEST_FIELDS[type]
  const lines = [
    `<b>Sửa thông tin — ${LEAVE_REQUEST_TITLES[type]}</b>`,
    '',
    ...fieldDefs.map((f) => `${f.label}: ${fields[f.key]?.trim() ? fields[f.key] : '(chưa rõ)'}`),
  ]

  const replyMarkup = inlineKeyboard([
    ...fieldDefs.map((f) => [{ text: `✏️ ${f.label}`, callback_data: `lr:${request_no}:editfield:${f.key}` }]),
    [{ text: '✅ Xong, xác nhận lại', callback_data: `lr:${request_no}:donemenu` }],
  ])

  return { text: lines.join('\n'), replyMarkup }
}
