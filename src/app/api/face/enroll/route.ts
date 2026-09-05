import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data } = await supabase
    .from('hrm_face_enrollments')
    .select('enrolled_at')
    .eq('user_id', user!.id)
    .maybeSingle()

  return NextResponse.json({ enrolled: !!data, enrolledAt: data?.enrolled_at ?? null })
}

export async function POST(req: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const embeddings = body?.embeddings
  const images = body?.images

  const isValidEmbedding = (e: unknown): e is number[] =>
    Array.isArray(e) && e.length === 128 && e.every((v) => typeof v === 'number')

  if (!Array.isArray(embeddings) || embeddings.length < 1 || !embeddings.every(isValidEmbedding)) {
    return NextResponse.json({ error: 'Dữ liệu khuôn mặt không hợp lệ' }, { status: 400 })
  }

  const isDataUrlImage = (v: unknown): v is string => typeof v === 'string' && /^data:image\/\w+;base64,/.test(v)

  if (images !== undefined && (!Array.isArray(images) || images.length !== embeddings.length || !images.every(isDataUrlImage))) {
    return NextResponse.json({ error: 'Ảnh khuôn mặt không hợp lệ' }, { status: 400 })
  }

  // Lưu kèm ảnh gốc (không chỉ vector) để admin có thể xem lại bằng mắt,
  // xác minh nhân viên đăng ký đúng khuôn mặt của chính mình — dùng service
  // role vì nhân viên không có quyền ghi thẳng vào Storage.
  let imagePaths: string[] | null = null
  if (Array.isArray(images) && images.length > 0) {
    const bucket = createAdminClient().storage.from('face-enrollments')
    const paths: string[] = []
    for (let i = 0; i < images.length; i++) {
      const match = (images[i] as string).match(/^data:image\/(\w+);base64,(.+)$/)
      if (!match) return NextResponse.json({ error: 'Ảnh khuôn mặt không hợp lệ' }, { status: 400 })
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
      const path = `${user!.id}/${i}.${ext}`
      const { error: uploadError } = await bucket.upload(path, Buffer.from(match[2], 'base64'), {
        contentType: `image/${match[1]}`,
        upsert: true,
      })
      if (uploadError) return NextResponse.json({ error: 'Không lưu được ảnh khuôn mặt' }, { status: 500 })
      paths.push(path)
    }
    imagePaths = paths
  }

  const { error } = await supabase.from('hrm_face_enrollments').upsert({
    user_id: user!.id,
    embeddings,
    image_paths: imagePaths,
    enrolled_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: 'Không lưu được dữ liệu khuôn mặt' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
