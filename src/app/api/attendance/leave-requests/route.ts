import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// Đơn từ CỦA CHÍNH nhân viên đang gọi — chỉ để xem lại, thao tác nộp/sửa/hủy
// vẫn hoàn toàn qua Telegram (đây là API đọc, không có POST).
export async function GET() {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data: requests, error } = await supabase
    .from('hrm_leave_requests')
    .select('request_no, type, fields, status, manager_id, created_at')
    .eq('requester_id', user!.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Không tải được đơn từ' }, { status: 500 })

  const managerIds = [...new Set((requests ?? []).map((r) => r.manager_id).filter(Boolean))] as string[]
  const managerNameById = new Map<string, string>()
  if (managerIds.length > 0) {
    const { data: managers } = await supabase.from('users').select('id, full_name').in('id', managerIds)
    for (const m of managers ?? []) managerNameById.set(m.id, m.full_name)
  }

  return NextResponse.json({
    requests: (requests ?? []).map((r) => ({
      requestNo: r.request_no,
      type: r.type,
      fields: r.fields,
      status: r.status,
      managerName: r.manager_id ? managerNameById.get(r.manager_id) ?? null : null,
      createdAt: r.created_at,
    })),
  })
}
