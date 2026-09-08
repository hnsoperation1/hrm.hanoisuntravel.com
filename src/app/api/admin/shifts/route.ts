import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { data, error } = await supabase.from('hrm_shifts').select('*').order('start_time')
  if (error) return NextResponse.json({ error: 'Không tải được danh sách ca' }, { status: 500 })
  return NextResponse.json({ shifts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const startTime = typeof body?.startTime === 'string' ? body.startTime : ''
  const endTime = typeof body?.endTime === 'string' ? body.endTime : ''
  const breakMinutes = Number(body?.breakMinutes ?? 0)

  if (!name || !startTime || !endTime || Number.isNaN(breakMinutes)) {
    return NextResponse.json({ error: 'Thiếu tên ca hoặc giờ không hợp lệ' }, { status: 400 })
  }

  const { error } = await supabase.from('hrm_shifts').insert({ name, start_time: startTime, end_time: endTime, break_minutes: breakMinutes })
  if (error) return NextResponse.json({ error: 'Không tạo được ca' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : null
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') update.name = body.name.trim()
  if (typeof body.startTime === 'string') update.start_time = body.startTime
  if (typeof body.endTime === 'string') update.end_time = body.endTime
  if (typeof body.breakMinutes === 'number') update.break_minutes = body.breakMinutes
  if (typeof body.isActive === 'boolean') update.is_active = body.isActive

  // Đặt ca này làm mặc định: tắt is_default ở TẤT CẢ ca khác trước, tránh vi
  // phạm unique index (chỉ 1 ca được là mặc định).
  if (body.isDefault === true) {
    await supabase.from('hrm_shifts').update({ is_default: false }).neq('id', id)
    update.is_default = true
  } else if (body.isDefault === false) {
    update.is_default = false
  }

  const { error } = await supabase.from('hrm_shifts').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: 'Không lưu được ca' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  // shift_id ở hrm_employee_requirements là ON DELETE SET NULL — nhân viên
  // đang gán ca này sẽ tự động chuyển về dùng ca mặc định, không bị chặn xoá.
  const { error } = await supabase.from('hrm_shifts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Không xoá được ca' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
