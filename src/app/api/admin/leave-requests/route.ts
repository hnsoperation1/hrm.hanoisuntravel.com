import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

// Toàn bộ đơn từ trong hệ thống — chỉ để admin XEM LẠI/đối chiếu, thao tác
// duyệt/hủy vẫn hoàn toàn qua Telegram (không có PATCH/POST ở đây).
export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { data: requests, error } = await supabase
    .from('hrm_leave_requests')
    .select('request_no, type, fields, status, requester_id, manager_id, raw_text, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: 'Không tải được đơn từ' }, { status: 500 })

  const userIds = [...new Set((requests ?? []).flatMap((r) => [r.requester_id, r.manager_id]).filter(Boolean))] as string[]
  const nameById = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, full_name').in('id', userIds)
    for (const u of users ?? []) nameById.set(u.id, u.full_name)
  }

  return NextResponse.json({
    requests: (requests ?? []).map((r) => ({
      requestNo: r.request_no,
      type: r.type,
      fields: r.fields,
      status: r.status,
      requesterName: nameById.get(r.requester_id) ?? 'Không rõ',
      managerName: r.manager_id ? nameById.get(r.manager_id) ?? null : null,
      rawText: r.raw_text,
      createdAt: r.created_at,
    })),
  })
}
