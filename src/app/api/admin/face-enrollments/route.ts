import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Trả về toàn bộ nhân viên kèm dữ liệu đăng ký khuôn mặt (vector + ảnh mẫu)
// để admin audit — xác minh nhân viên đăng ký đúng khuôn mặt của chính mình.
// Ảnh nằm trong bucket riêng tư nên phải tạo signed URL (service role) mới
// xem được, không public.
export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const [{ data: employees, error: empError }, { data: enrollments, error: enrError }] = await Promise.all([
    supabase.from('users').select('id, full_name, email').order('full_name'),
    supabase.from('hrm_face_enrollments').select('user_id, embeddings, image_paths, enrolled_at'),
  ])

  if (empError || enrError) {
    return NextResponse.json({ error: 'Không tải được dữ liệu' }, { status: 500 })
  }

  const admin = createAdminClient()
  const enrMap = new Map((enrollments ?? []).map((e) => [e.user_id, e]))

  const results = await Promise.all(
    (employees ?? []).map(async (emp) => {
      const enr = enrMap.get(emp.id)
      if (!enr) return { id: emp.id, full_name: emp.full_name, email: emp.email, enrolled: false as const }

      let imageUrls: string[] = []
      const paths = Array.isArray(enr.image_paths) ? (enr.image_paths as string[]) : []
      if (paths.length > 0) {
        const { data: signed } = await admin.storage.from('face-enrollments').createSignedUrls(paths, 3600)
        imageUrls = (signed ?? []).map((s) => s.signedUrl).filter((u): u is string => !!u)
      }

      return {
        id: emp.id,
        full_name: emp.full_name,
        email: emp.email,
        enrolled: true as const,
        enrolledAt: enr.enrolled_at as string,
        embeddings: enr.embeddings as number[][],
        imageUrls,
      }
    }),
  )

  return NextResponse.json({ employees: results })
}
