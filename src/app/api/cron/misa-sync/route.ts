import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchMisaRawPunches, type MisaRawPunch } from '@/lib/misa'

const VN_OFFSET_MS = 7 * 3600 * 1000

function vnDayKey(iso: string) {
  const d = new Date(new Date(iso).getTime() + VN_OFFSET_MS)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// Vercel Cron gọi route này kèm header "Authorization: Bearer <CRON_SECRET>"
// — chặn request nào không có đúng secret để tránh ai đó tự gọi route này
// trực tiếp kích hoạt đồng bộ.
function isAuthorizedCron(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Không có quyền' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: settings } = await supabase.from('hrm_app_settings').select('misa_last_synced_at').eq('id', 1).maybeSingle()
  const now = new Date()
  // Lần đầu chưa có mốc nào — lấy lùi lại 2 ngày cho chắc, tránh bỏ sót lượt
  // quẹt cuối ngày hôm trước nếu server/cron trễ giờ.
  const fromDate = settings?.misa_last_synced_at ? new Date(settings.misa_last_synced_at) : new Date(now.getTime() - 2 * 24 * 3600 * 1000)

  let punches: MisaRawPunch[]
  try {
    punches = await fetchMisaRawPunches(fromDate, now)
  } catch (e) {
    console.error('[misa-sync] gọi API MISA thất bại', e)
    return NextResponse.json({ error: 'Gọi API MISA thất bại' }, { status: 502 })
  }

  const { data: mappings } = await supabase
    .from('hrm_employee_requirements')
    .select('user_id, misa_employee_code')
    .not('misa_employee_code', 'is', null)

  const userIdByCode = new Map((mappings ?? []).map((m) => [m.misa_employee_code as string, m.user_id as string]))

  // Gom theo (nhân viên, ngày VN) — ngày nào >2 lượt quẹt chỉ lấy lượt ĐẦU
  // (check_in) và lượt CUỐI (check_out), bỏ các lượt giữa (vd quẹt ra/vào
  // ăn trưa) theo đúng thống nhất trước đó.
  const byUserDay = new Map<string, MisaRawPunch[]>()
  for (const p of punches) {
    const userId = userIdByCode.get(p.EmployeeCode)
    if (!userId) continue // nhân viên chưa được ánh xạ mã MISA -> bỏ qua
    const key = `${userId}__${vnDayKey(p.CheckTime)}`
    if (!byUserDay.has(key)) byUserDay.set(key, [])
    byUserDay.get(key)!.push(p)
  }

  const rows: Record<string, unknown>[] = []
  for (const [key, dayPunches] of byUserDay) {
    const userId = key.split('__')[0]
    dayPunches.sort((a, b) => new Date(a.CheckTime).getTime() - new Date(b.CheckTime).getTime())
    const first = dayPunches[0]
    const last = dayPunches[dayPunches.length - 1]

    rows.push({
      user_id: userId,
      type: 'check_in',
      created_at: first.CheckTime,
      channel: 'misa',
      is_success: true,
    })
    // Chỉ 1 lượt quẹt trong ngày -> không suy ra được lượt ra, chỉ ghi check_in.
    if (dayPunches.length > 1) {
      rows.push({
        user_id: userId,
        type: 'check_out',
        created_at: last.CheckTime,
        channel: 'misa',
        is_success: true,
      })
    }
  }

  // Supabase-js upsert() không hỗ trợ target là unique index CÓ ĐIỀU KIỆN
  // (partial index, chỉ áp dụng cho channel='misa') qua onConflict — nên tự
  // lọc trùng bằng tay: đọc trước các dòng MISA đã có trong đúng khoảng thời
  // gian này, bỏ những dòng (user_id, created_at) đã tồn tại rồi mới insert.
  let insertedCount = 0
  if (rows.length > 0) {
    const affectedUserIds = [...new Set(rows.map((r) => r.user_id as string))]
    const { data: existing } = await supabase
      .from('hrm_attendance_logs')
      .select('user_id, created_at')
      .eq('channel', 'misa')
      .in('user_id', affectedUserIds)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', now.toISOString())

    const existingKeys = new Set((existing ?? []).map((e) => `${e.user_id}|${new Date(e.created_at).toISOString()}`))
    const newRows = rows.filter((r) => !existingKeys.has(`${r.user_id}|${new Date(r.created_at as string).toISOString()}`))

    if (newRows.length > 0) {
      const { error } = await supabase.from('hrm_attendance_logs').insert(newRows)
      if (error) {
        console.error('[misa-sync] lưu dữ liệu thất bại', error)
        return NextResponse.json({ error: 'Lưu dữ liệu thất bại' }, { status: 500 })
      }
      insertedCount = newRows.length
    }
  }

  await supabase.from('hrm_app_settings').update({ misa_last_synced_at: now.toISOString() }).eq('id', 1)

  return NextResponse.json({ ok: true, punchesFetched: punches.length, rowsInserted: insertedCount })
}
