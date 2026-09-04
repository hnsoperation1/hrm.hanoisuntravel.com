import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Xác thực session cho route handler HRM. Chỉ cần đã đăng nhập (project
 * Supabase dùng chung với hns-crm/ketoan) — không cần allowlist riêng vì
 * HRM/chấm công áp dụng cho toàn bộ nhân viên, khác với ketoan (chỉ 1 nhóm
 * kế toán mới được vào).
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
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
