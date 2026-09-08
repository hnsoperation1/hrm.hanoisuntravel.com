import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

// Cấu hình cho luồng duyệt đơn từ qua Telegram: chat_id Telegram của từng
// nhân viên (admin nhập tay), quản lý trực tiếp của từng nhân viên, danh
// sách nhóm HCNS bot được phép đọc, và admin chấm công (người bấm "Duyệt").
export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const [{ data: employees, error: empError }, { data: links, error: linkError }, { data: reqs, error: reqError }, { data: groups, error: groupError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from('users').select('id, full_name, email').order('full_name'),
      supabase.from('hrm_telegram_links').select('chat_id, user_id'),
      supabase.from('hrm_employee_requirements').select('user_id, manager_id'),
      supabase.from('hrm_telegram_groups').select('chat_id, label').order('label'),
      supabase.from('hrm_app_settings').select('attendance_admin_user_id').eq('id', 1).maybeSingle(),
    ])

  if (empError || linkError || reqError || groupError || settingsError) {
    return NextResponse.json({ error: 'Không tải được dữ liệu' }, { status: 500 })
  }

  const chatByUser = new Map((links ?? []).map((l) => [l.user_id, l.chat_id]))
  const managerByUser = new Map((reqs ?? []).map((r) => [r.user_id, r.manager_id]))

  const merged = (employees ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    email: e.email,
    telegram_chat_id: chatByUser.get(e.id) ?? null,
    manager_id: managerByUser.get(e.id) ?? null,
  }))

  return NextResponse.json({
    employees: merged,
    groups: groups ?? [],
    attendanceAdminUserId: settings?.attendance_admin_user_id ?? null,
  })
}

export async function POST(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)

  if (body?.kind === 'link') {
    const userId = typeof body.userId === 'string' ? body.userId : null
    const chatId = body.chatId === null ? null : Number(body.chatId)
    if (!userId || (chatId !== null && Number.isNaN(chatId))) {
      return NextResponse.json({ error: 'Thiếu userId hoặc chat_id không hợp lệ' }, { status: 400 })
    }
    if (chatId === null) {
      const { error } = await supabase.from('hrm_telegram_links').delete().eq('user_id', userId)
      if (error) return NextResponse.json({ error: 'Không xoá được liên kết' }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    // 1 chat_id chỉ gắn với 1 user tại 1 thời điểm — xoá liên kết cũ (nếu chat_id
    // này trước đó gắn nhầm/đã gắn với người khác) trước khi gán lại.
    await supabase.from('hrm_telegram_links').delete().eq('chat_id', chatId)
    await supabase.from('hrm_telegram_links').delete().eq('user_id', userId)
    const { error } = await supabase.from('hrm_telegram_links').insert({ chat_id: chatId, user_id: userId })
    if (error) return NextResponse.json({ error: 'Không lưu được liên kết' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body?.kind === 'manager') {
    const userId = typeof body.userId === 'string' ? body.userId : null
    if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 })
    const managerId = body.managerId === null ? null : typeof body.managerId === 'string' ? body.managerId : undefined
    if (managerId === undefined) return NextResponse.json({ error: 'managerId không hợp lệ' }, { status: 400 })
    const { error } = await supabase
      .from('hrm_employee_requirements')
      .upsert({ user_id: userId, manager_id: managerId, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: 'Không lưu được quản lý trực tiếp' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body?.kind === 'group_add') {
    const chatId = Number(body.chatId)
    const label = typeof body.label === 'string' ? body.label.trim() : ''
    if (Number.isNaN(chatId) || !label) return NextResponse.json({ error: 'Thiếu chat_id hoặc tên nhóm' }, { status: 400 })
    const { error } = await supabase.from('hrm_telegram_groups').insert({ chat_id: chatId, label })
    if (error) return NextResponse.json({ error: 'Không thêm được nhóm (chat_id có thể đã tồn tại)' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body?.kind === 'group_remove') {
    const chatId = Number(body.chatId)
    if (Number.isNaN(chatId)) return NextResponse.json({ error: 'chat_id không hợp lệ' }, { status: 400 })
    const { error } = await supabase.from('hrm_telegram_groups').delete().eq('chat_id', chatId)
    if (error) return NextResponse.json({ error: 'Không xoá được nhóm' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body?.kind === 'admin') {
    const userId = body.userId === null ? null : typeof body.userId === 'string' ? body.userId : undefined
    if (userId === undefined) return NextResponse.json({ error: 'userId không hợp lệ' }, { status: 400 })
    const { error } = await supabase
      .from('hrm_app_settings')
      .update({ attendance_admin_user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) return NextResponse.json({ error: 'Không lưu được admin chấm công' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Thiếu kind hợp lệ' }, { status: 400 })
}
