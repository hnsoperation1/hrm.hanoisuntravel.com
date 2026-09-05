import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

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
  const embedding = body?.embedding

  if (!Array.isArray(embedding) || embedding.length !== 128 || !embedding.every((v) => typeof v === 'number')) {
    return NextResponse.json({ error: 'Dữ liệu khuôn mặt không hợp lệ' }, { status: 400 })
  }

  const { error } = await supabase.from('hrm_face_enrollments').upsert({
    user_id: user!.id,
    embedding,
    enrolled_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: 'Không lưu được dữ liệu khuôn mặt' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
