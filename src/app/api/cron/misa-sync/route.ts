import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runMisaSync } from '@/lib/misaSync'

// Vercel Cron gọi route này kèm header "Authorization: Bearer <CRON_SECRET>"
// — chặn request nào không có đúng secret để tránh ai đó tự gọi route này
// trực tiếp kích hoạt đồng bộ.
function isAuthorizedCron(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Không có quyền' }, { status: 401 })

  try {
    const result = await runMisaSync(createAdminClient())
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[misa-sync cron]', e)
    return NextResponse.json({ error: 'Đồng bộ thất bại' }, { status: 502 })
  }
}
