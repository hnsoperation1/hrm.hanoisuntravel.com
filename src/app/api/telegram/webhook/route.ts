import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { sendMessage, editMessageText, answerCallbackQuery } from '@/lib/telegram'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseLeaveRequest, LEAVE_REQUEST_FIELDS, type LeaveRequestType } from '@/lib/leaveRequestParser'
import { renderRequestCard, renderEditMenu } from '@/lib/leaveRequestCard'

interface TelegramMessage {
  message_id: number
  chat: { id: number; type: string }
  from?: { id: number }
  text?: string
}

interface TelegramCallbackQuery {
  id: string
  from: { id: number }
  data?: string
  message?: { chat: { id: number }; message_id: number }
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
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query as TelegramCallbackQuery)
    }
  } catch (e) {
    console.error('[hrm telegram webhook]', e)
  }

  // Luôn trả 200 cho Telegram dù có lỗi nội bộ, tránh Telegram retry vô hạn.
  return NextResponse.json({ ok: true })
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id
  const senderId = message.from?.id
  const text = message.text?.trim()
  if (!text || !senderId) return

  const supabase = createAdminClient()

  if (message.chat.type === 'private') {
    await handlePrivateMessage(supabase, chatId, senderId)
    return
  }

  if (message.chat.type !== 'group' && message.chat.type !== 'supergroup') return

  // Đang chờ nhập giá trị mới cho 1 field (từ nút "Sửa lại thông tin")? Nếu
  // đúng thì tin nhắn này LÀ giá trị mới, không phải 1 đơn xin nghỉ mới.
  const editing = await findEditingRequest(supabase, chatId, senderId)
  if (editing) {
    await applyFieldEdit(supabase, editing, text)
    return
  }

  const { data: group } = await supabase
    .from('hrm_telegram_groups')
    .select('chat_id')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (!group) {
    // Nhóm chưa được admin đăng ký — báo ID nhóm để admin thêm vào cấu hình.
    await sendMessage(
      chatId,
      `Nhóm này chưa được cấu hình để đọc đơn từ.\nID nhóm: <code>${chatId}</code> — gửi cho admin để thêm vào cấu hình.`,
    )
    return
  }

  const { data: link } = await supabase.from('hrm_telegram_links').select('user_id').eq('chat_id', senderId).maybeSingle()
  if (!link) {
    await sendMessage(
      chatId,
      `Tài khoản Telegram của bạn chưa được liên kết.\nID Telegram của bạn: <code>${senderId}</code> — gửi cho admin để được cấu hình.`,
    )
    return
  }

  const parsed = await parseLeaveRequest(text)
  if (!parsed || !parsed.isRequest) return

  const { data: requester } = await supabase.from('users').select('full_name').eq('id', link.user_id).maybeSingle()

  const { data: created, error } = await supabase
    .from('hrm_leave_requests')
    .insert({
      type: parsed.type,
      requester_id: link.user_id,
      group_chat_id: chatId,
      raw_text: text,
      fields: parsed.fields,
      status: 'pending_requester',
    })
    .select('request_no')
    .single()

  if (error || !created) {
    console.error('[hrm telegram webhook] tạo đơn thất bại', error)
    return
  }

  const card = renderRequestCard({
    request_no: created.request_no,
    type: parsed.type,
    fields: parsed.fields,
    status: 'pending_requester',
    requesterName: requester?.full_name ?? 'Nhân viên',
    adminName: null,
    requesterConfirmed: false,
  })

  const sent = await sendMessage(chatId, card.text, card.replyMarkup)
  await supabase.from('hrm_leave_requests').update({ bot_message_id: sent.message_id }).eq('request_no', created.request_no)
}

async function handlePrivateMessage(supabase: SupabaseClient, chatId: number, senderId: number) {
  const { data: link } = await supabase.from('hrm_telegram_links').select('user_id').eq('chat_id', senderId).maybeSingle()
  if (!link) {
    await sendMessage(
      chatId,
      `Tài khoản Telegram của bạn chưa được liên kết.\nID Telegram của bạn: <code>${senderId}</code> — gửi cho admin để được cấu hình.`,
    )
    return
  }
  // Bot chỉ đóng vai trò "lối tắt" mở web — không tự xử lý vị trí/định danh
  // nhân viên trong Telegram nữa. Đăng nhập/chấm công vẫn hoàn toàn qua
  // Supabase Auth như mở trực tiếp bằng trình duyệt.
  await sendMessage(chatId, `Vào ${process.env.NEXT_PUBLIC_APP_URL} để chấm công nhé.`)
}

async function findEditingRequest(supabase: SupabaseClient, chatId: number, senderId: number) {
  const { data: link } = await supabase.from('hrm_telegram_links').select('user_id').eq('chat_id', senderId).maybeSingle()
  if (!link) return null

  const { data } = await supabase
    .from('hrm_leave_requests')
    .select('*')
    .eq('group_chat_id', chatId)
    .eq('requester_id', link.user_id)
    .eq('status', 'pending_requester')
    .not('editing_field', 'is', null)
    .maybeSingle()

  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dòng bảng hrm_leave_requests, không có type generate sẵn cho project này
async function applyFieldEdit(supabase: SupabaseClient, request: any, newValue: string) {
  const fields = { ...request.fields, [request.editing_field]: newValue }
  await supabase
    .from('hrm_leave_requests')
    .update({ fields, editing_field: null, updated_at: new Date().toISOString() })
    .eq('id', request.id)

  const menu = renderEditMenu({ request_no: request.request_no, type: request.type, fields })
  await editMessageText(request.group_chat_id, request.bot_message_id, menu.text, menu.replyMarkup)
}

async function handleCallbackQuery(cq: TelegramCallbackQuery) {
  const [prefix] = (cq.data ?? '').split(':')

  if (prefix === 'qr') {
    await handleQrLoginCallback(cq)
    return
  }

  if (prefix !== 'lr') {
    await answerCallbackQuery(cq.id)
    return
  }

  await handleLeaveRequestCallback(cq)
}

async function handleQrLoginCallback(cq: TelegramCallbackQuery) {
  const admin = createAdminClient()
  const [, sessionId, action] = (cq.data ?? '').split(':')

  const { data: session } = await admin.from('hrm_qr_login_sessions').select('*').eq('id', sessionId).maybeSingle()
  if (!session) {
    await answerCallbackQuery(cq.id, 'Phiên đăng nhập này không còn tồn tại', true)
    return
  }

  const { data: link } = await admin.from('hrm_telegram_links').select('chat_id').eq('user_id', session.user_id).maybeSingle()
  if (session.status !== 'scanned' || link?.chat_id !== cq.from.id) {
    await answerCallbackQuery(cq.id, 'Bạn không có quyền thao tác này', true)
    return
  }

  const approve = action === 'approve'
  await admin.from('hrm_qr_login_sessions').update({ status: approve ? 'approved' : 'rejected' }).eq('id', sessionId)

  if (cq.message) {
    await editMessageText(
      cq.message.chat.id,
      cq.message.message_id,
      approve ? '✅ Đã xác nhận đăng nhập.' : '❌ Đã từ chối đăng nhập.',
    )
  }
  await answerCallbackQuery(cq.id, approve ? 'Đã xác nhận' : 'Đã từ chối')
}

async function handleLeaveRequestCallback(cq: TelegramCallbackQuery) {
  const supabase = createAdminClient()
  const [, requestNoRaw, action, extra] = (cq.data ?? '').split(':')

  const { data: request } = await supabase
    .from('hrm_leave_requests')
    .select('*')
    .eq('request_no', Number(requestNoRaw))
    .maybeSingle()

  if (!request) {
    await answerCallbackQuery(cq.id, 'Đơn này không còn tồn tại', true)
    return
  }

  const callerId = cq.from.id

  async function isLinkedTo(userId: string) {
    const { data: link } = await supabase.from('hrm_telegram_links').select('chat_id').eq('user_id', userId).maybeSingle()
    return link?.chat_id === callerId
  }

  const { data: settings } = await supabase.from('hrm_app_settings').select('attendance_admin_user_id').eq('id', 1).maybeSingle()
  const adminUserId = settings?.attendance_admin_user_id ?? null

  // Chặn quyền TRƯỚC khi đổi bất cứ gì — sai người bấm thì chỉ báo lỗi, dữ
  // liệu đơn giữ nguyên.
  if (action === 'edit' || action === 'editfield' || action === 'submit' || action === 'donemenu') {
    if (request.status !== 'pending_requester' || !(await isLinkedTo(request.requester_id))) {
      await answerCallbackQuery(cq.id, 'Bạn không có quyền thao tác này', true)
      return
    }
  } else if (action === 'cancel') {
    const cancellable = ['pending_requester', 'pending_admin'].includes(request.status)
    if (!cancellable || !(await isLinkedTo(request.requester_id))) {
      await answerCallbackQuery(cq.id, 'Bạn không có quyền thao tác này', true)
      return
    }
  } else if (action === 'approve') {
    if (request.status !== 'pending_admin' || !adminUserId || !(await isLinkedTo(adminUserId))) {
      await answerCallbackQuery(cq.id, 'Bạn không có quyền thao tác này', true)
      return
    }
  } else {
    await answerCallbackQuery(cq.id)
    return
  }

  const requesterName = (await supabase.from('users').select('full_name').eq('id', request.requester_id).maybeSingle()).data?.full_name ?? 'Nhân viên'
  const adminName = adminUserId ? (await supabase.from('users').select('full_name').eq('id', adminUserId).maybeSingle()).data?.full_name ?? null : null

  if (action === 'edit') {
    const menu = renderEditMenu({ request_no: request.request_no, type: request.type, fields: request.fields })
    await editMessageText(request.group_chat_id, request.bot_message_id, menu.text, menu.replyMarkup)
    await answerCallbackQuery(cq.id)
    return
  }

  if (action === 'editfield') {
    const fieldDef = LEAVE_REQUEST_FIELDS[request.type as LeaveRequestType].find((f) => f.key === extra)
    await supabase.from('hrm_leave_requests').update({ editing_field: extra }).eq('id', request.id)
    await editMessageText(
      request.group_chat_id,
      request.bot_message_id,
      `Nhập giá trị mới cho "${fieldDef?.label ?? extra}" (nhắn thẳng vào nhóm này):`,
    )
    await answerCallbackQuery(cq.id)
    return
  }

  const statusByAction = {
    donemenu: 'pending_requester',
    submit: 'pending_admin',
    approve: 'approved',
    cancel: 'rejected',
  } as const
  const timestampColByAction: Record<string, string | null> = {
    donemenu: null,
    submit: 'requester_confirmed_at',
    approve: 'admin_approved_at',
    cancel: null,
  }
  const toastByAction: Record<string, string | undefined> = {
    donemenu: undefined,
    submit: 'Đã nộp đơn',
    approve: 'Đã duyệt',
    cancel: 'Đã hủy đơn',
  }

  const newStatus = statusByAction[action as keyof typeof statusByAction]
  const update: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  const tsCol = timestampColByAction[action]
  if (tsCol) update[tsCol] = new Date().toISOString()

  await supabase.from('hrm_leave_requests').update(update).eq('id', request.id)

  const card = renderRequestCard({
    request_no: request.request_no,
    type: request.type,
    fields: request.fields,
    status: newStatus,
    requesterName,
    adminName,
    requesterConfirmed: Boolean(update.requester_confirmed_at ?? request.requester_confirmed_at),
  })
  await editMessageText(request.group_chat_id, request.bot_message_id, card.text, card.replyMarkup)
  await answerCallbackQuery(cq.id, toastByAction[action])
}
