import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/** Client dùng riêng cho request có Bearer token (Mini App Zalo, mobile...) —
 * KHÔNG dùng service_role, dùng anon key + header Authorization để PostgREST
 * tự nhận diện đúng auth.uid() từ token, RLS vẫn áp dụng bình thường như
 * client cookie-based, chỉ khác cách xác thực. */
function createBearerClient(token: string) {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Xác thực session cho route handler HRM. Chỉ cần đã đăng nhập (project
 * Supabase dùng chung với hns-crm/ketoan) — không cần allowlist riêng vì
 * HRM/chấm công áp dụng cho toàn bộ nhân viên, khác với ketoan (chỉ 1 nhóm
 * kế toán mới được vào).
 *
 * Chấp nhận 2 kiểu xác thực tuỳ nguồn gọi:
 * - Cookie (mặc định) — web `hrm.hanoisuntravel.com`, dùng `@supabase/ssr`.
 * - Header `Authorization: Bearer <access_token>` — Mini App Zalo/app di
 *   động sau này, không có cookie trình duyệt để dùng.
 */
export async function requireUser() {
  const authHeader = (await headers()).get('authorization')
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)

  const supabase = bearerMatch ? createBearerClient(bearerMatch[1]) : await createClient()
  const { data, error } = bearerMatch ? await supabase.auth.getUser(bearerMatch[1]) : await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }),
    }
  }
  return { user: data.user, supabase, unauthorized: null }
}

/**
 * Như requireUser() nhưng bắt buộc thêm Super Admin hoặc Boss — dùng cho
 * các route quản trị (địa điểm chấm công, xem báo cáo toàn công ty).
 */
export async function requireAdminUser() {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized || !user) return { user: null, supabase, unauthorized: unauthorized! }

  const [{ data: isSuperAdmin }, { data: profile }] = await Promise.all([
    supabase.rpc('is_super_admin'),
    supabase.from('users').select('role').eq('id', user.id).single(),
  ])

  if (!isSuperAdmin && profile?.role !== 'boss') {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json(
        { error: 'Chỉ Super Admin hoặc Boss mới có quyền truy cập' },
        { status: 403 },
      ),
    }
  }
  return { user, supabase, unauthorized: null }
}
