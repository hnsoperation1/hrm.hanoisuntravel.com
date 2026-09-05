import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessage, locationKeyboard } from '@/lib/telegram'
import { haversineDistanceMeters } from '@/lib/geo'

type Admin = ReturnType<typeof createAdminClient>

interface TelegramLocation {
  latitude: number
  longitude: number
  horizontal_accuracy?: number
}

interface TelegramMessage {
  chat: { id: number }
  from?: { username?: string }
  text?: string
  location?: TelegramLocation
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Sai secret token' }, { status: 401 })
  }

  const update = await req.json()
  const admin = createAdminClient()

  try {
    if (update.message) {
      await handleMessage(admin, update.message as TelegramMessage)
    }
  } catch (e) {
    console.error('[hrm telegram webhook]', e)
  }

  // Luôn trả 200 cho Telegram dù có lỗi nội bộ, tránh Telegram retry vô hạn.
  return NextResponse.json({ ok: true })
}

async function getLinkedUser(admin: Admin, chatId: number) {
  const { data } = await admin
    .from('hrm_telegram_links')
    .select('user_id, users(full_name)')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (!data) return null
  const users = data.users as unknown as { full_name: string } | { full_name: string }[] | null
  const fullName = Array.isArray(users) ? users[0]?.full_name : users?.full_name
  return { userId: data.user_id as string, fullName: fullName ?? 'bạn' }
}

async function handleMessage(admin: Admin, message: TelegramMessage) {
  const chatId = message.chat.id

  if (message.location) {
    await handleLocation(admin, chatId, message.location)
    return
  }

  const text = message.text?.trim()
  if (!text) return

  if (text === '/start') {
    const linked = await getLinkedUser(admin, chatId)
    if (linked) {
      await sendMessage(chatId, `Chào ${linked.fullName}! Bấm nút bên dưới để chấm công.`, locationKeyboard())
    } else {
      await sendMessage(
        chatId,
        'Chưa liên kết tài khoản. Vào web <b>hrm.hanoisuntravel.com/lien-ket-telegram</b> lấy mã, rồi gửi lại đây theo dạng:\n<code>/link 123456</code>',
      )
    }
    return
  }

  if (text.startsWith('/link')) {
    const code = text.replace('/link', '').trim()
    if (!code) {
      await sendMessage(chatId, 'Thiếu mã. Gửi theo dạng: /link 123456')
      return
    }
    await handleLinkCode(admin, chatId, code, message.from?.username)
    return
  }

  await sendMessage(chatId, 'Bấm nút "Chấm công" bên dưới để gửi vị trí, hoặc gửi /start để bắt đầu.', locationKeyboard())
}

async function handleLinkCode(admin: Admin, chatId: number, code: string, telegramUsername?: string) {
  const { data: codeRow } = await admin
    .from('hrm_telegram_link_codes')
    .select('user_id, expires_at, used_at')
    .eq('code', code)
    .maybeSingle()

  if (!codeRow) {
    await sendMessage(chatId, 'Mã không đúng. Vào web lấy mã mới nhé.')
    return
  }
  if (codeRow.used_at) {
    await sendMessage(chatId, 'Mã này đã được dùng rồi. Vào web tạo mã mới.')
    return
  }
  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    await sendMessage(chatId, 'Mã đã hết hạn. Vào web tạo mã mới.')
    return
  }

  // 1 user chỉ liên kết 1 chat_id — xoá liên kết cũ (nếu có) trước khi gán chat_id mới.
  await admin.from('hrm_telegram_links').delete().eq('user_id', codeRow.user_id)
  await admin.from('hrm_telegram_links').insert({
    chat_id: chatId,
    user_id: codeRow.user_id,
    telegram_username: telegramUsername ?? null,
  })
  await admin.from('hrm_telegram_link_codes').update({ used_at: new Date().toISOString() }).eq('code', code)

  await sendMessage(chatId, '✅ Liên kết thành công! Từ giờ bấm nút bên dưới để chấm công.', locationKeyboard())
}

async function handleLocation(admin: Admin, chatId: number, location: TelegramLocation) {
  const linked = await getLinkedUser(admin, chatId)
  if (!linked) {
    await sendMessage(
      chatId,
      'Bạn chưa liên kết tài khoản. Vào web <b>hrm.hanoisuntravel.com/lien-ket-telegram</b> lấy mã, rồi gửi /link 123456',
    )
    return
  }

  const { lat, lng } = { lat: location.latitude, lng: location.longitude }

  const { data: locations } = await admin
    .from('hrm_work_locations')
    .select('id, name, lat, lng, radius_m')
    .eq('is_active', true)

  let nearest: { id: string; name: string; distance: number; radius_m: number } | null = null
  for (const loc of locations ?? []) {
    const distance = haversineDistanceMeters(lat, lng, loc.lat, loc.lng)
    if (!nearest || distance < nearest.distance) {
      nearest = { id: loc.id, name: loc.name, distance, radius_m: loc.radius_m }
    }
  }
  const isWithinRadius = nearest ? nearest.distance <= nearest.radius_m : false
  // Kênh Telegram không check IP văn phòng được (request luôn đến từ server
  // Telegram, không phải mạng thật của nhân viên) — thành công chỉ phụ
  // thuộc GPS, khác với kênh web.
  const isSuccess = isWithinRadius

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { data: todayLogs } = await admin
    .from('hrm_attendance_logs')
    .select('type, created_at')
    .eq('user_id', linked.userId)
    .eq('is_success', true)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: true })

  const lastLog = todayLogs && todayLogs.length > 0 ? todayLogs[todayLogs.length - 1] : null
  const type: 'check_in' | 'check_out' = lastLog?.type === 'check_in' ? 'check_out' : 'check_in'

  await admin.from('hrm_attendance_logs').insert({
    user_id: linked.userId,
    type,
    lat,
    lng,
    accuracy_m: location.horizontal_accuracy ?? null,
    nearest_location_id: nearest?.id ?? null,
    distance_m: nearest?.distance ?? null,
    is_within_radius: isWithinRadius,
    is_ip_verified: false,
    request_ip: null,
    is_success: isSuccess,
    channel: 'telegram',
  })

  const typeLabel = type === 'check_in' ? 'VÀO' : 'RA'
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  if (isSuccess) {
    await sendMessage(
      chatId,
      `✅ Chấm công ${typeLabel} thành công lúc ${timeLabel}` +
        (nearest ? `\nCách "${nearest.name}" ${Math.round(nearest.distance)}m — trong khu vực cho phép.` : ''),
      locationKeyboard(),
    )
  } else {
    await sendMessage(
      chatId,
      `❌ Chấm công ${typeLabel} KHÔNG hợp lệ lúc ${timeLabel}` +
        (nearest
          ? `\nCách "${nearest.name}" ${Math.round(nearest.distance)}m — ngoài khu vực cho phép (${nearest.radius_m}m). Lượt này vẫn được lưu lại để quản lý xem xét.`
          : '\nChưa có địa điểm hợp lệ nào được cấu hình.'),
      locationKeyboard(),
    )
  }
}
