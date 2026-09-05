import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const CODE_TTL_MINUTES = 10

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function GET() {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const admin = createAdminClient()
  const { data } = await admin
    .from('hrm_telegram_links')
    .select('telegram_username, linked_at')
    .eq('user_id', user!.id)
    .maybeSingle()

  return NextResponse.json({ linked: !!data, telegramUsername: data?.telegram_username ?? null })
}

export async function POST() {
  const { user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const admin = createAdminClient()
  const code = generateCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

  const { error } = await admin.from('hrm_telegram_link_codes').insert({
    code,
    user_id: user!.id,
    expires_at: expiresAt,
  })

  if (error) return NextResponse.json({ error: 'Không tạo được mã liên kết' }, { status: 500 })

  return NextResponse.json({
    code,
    expiresInMinutes: CODE_TTL_MINUTES,
    botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null,
  })
}
