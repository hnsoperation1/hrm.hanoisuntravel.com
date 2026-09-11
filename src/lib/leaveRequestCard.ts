// Dựng nội dung + bàn phím inline cho 1 đơn từ theo từng trạng thái — dùng
// chung cho lúc gửi tin đầu tiên (sendMessage) và mọi lần sửa tin sau đó
// (editMessageText), tránh lặp logic format ở nhiều chỗ trong webhook.
//
// Chỉ 2 vai: người nộp đơn và admin chấm công — KHÔNG có bước "quản lý trực
// tiếp" trong bot nữa, vì việc xin phép quản lý đã diễn ra riêng (ngoài bot)
// trước khi người xin đăng tin vào nhóm.

import { inlineKeyboard } from './telegram'
import { LEAVE_REQUEST_FIELDS, LEAVE_REQUEST_TITLES, type LeaveRequestType } from './leaveRequestParser'

type LeaveRequestStatus = 'pending_requester' | 'pending_admin' | 'approved' | 'rejected'

type CardInput = {
  request_no: number
  type: LeaveRequestType
  fields: Record<string, string>
  status: LeaveRequestStatus
  requesterName: string
  adminName: string | null
  requesterConfirmed: boolean
}

export function renderRequestCard({ request_no, type, fields, status, requesterName, adminName, requesterConfirmed }: CardInput) {
  const fieldDefs = LEAVE_REQUEST_FIELDS[type]

  const lines = [
    `<b>${LEAVE_REQUEST_TITLES[type]}</b>`,
    `Người xin: ${requesterName}`,
    ...fieldDefs.map((f) => `${f.label}: ${fields[f.key]?.trim() ? fields[f.key] : '(chưa rõ)'}`),
    '',
  ]

  if (requesterConfirmed) lines.push(`${requesterName} đã nộp đơn ✓`)
  if (status === 'approved') lines.push(`${adminName ?? 'Admin chấm công'} đã duyệt ✓`)
  if (status === 'rejected') lines.push('', `❌ ${requesterName} đã hủy đơn`)

  const cancelButton = { text: '❌ Hủy', callback_data: `lr:${request_no}:cancel` }

  let replyMarkup: { inline_keyboard: { text: string; callback_data: string }[][] }
  if (status === 'pending_requester') {
    replyMarkup = inlineKeyboard([
      [{ text: '✏️ Sửa lại thông tin', callback_data: `lr:${request_no}:edit` }],
      [cancelButton, { text: 'Xác nhận nộp đơn', callback_data: `lr:${request_no}:submit` }],
    ])
  } else if (status === 'pending_admin') {
    replyMarkup = inlineKeyboard([[{ text: 'Duyệt', callback_data: `lr:${request_no}:approve` }], [cancelButton]])
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
