import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Máy tính poll endpoint này liên tục sau khi hiện QR. Khi phiên đã được
// duyệt (approved), CHÍNH request này mint luôn 1 phiên đăng nhập thật cho
// người dùng và set cookie ngay trên response — máy tính chỉ cần thấy
// status "approved" là coi như đã đăng nhập xong, không cần gọi thêm API nào
// khác nữa.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: session } = await admin.from('hrm_qr_login_sessions').select('*').eq('id', id).maybeSingle()
  if (!session) return NextResponse.json({ status: 'expired' })

  if (session.status !== 'approved' && new Date(session.expires_at) < new Date()) {
    await admin.from('hrm_qr_login_sessions').delete().eq('id', id)
    return NextResponse.json({ status: 'expired' })
  }

  if (session.status !== 'approved') {
    return NextResponse.json({ status: session.status, deviceLabel: session.device_label })
  }

  const { data: userRow } = await admin.from('users').select('email').eq('id', session.user_id).maybeSingle()
  if (!userRow?.email) {
    await admin.from('hrm_qr_login_sessions').delete().eq('id', id)
    return NextResponse.json({ status: 'expired' })
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow.email,
  })
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[qr login] generateLink lỗi', linkError)
    return NextResponse.json({ status: 'expired' })
  }

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyError) {
    console.error('[qr login] verifyOtp lỗi', verifyError)
    return NextResponse.json({ status: 'expired' })
  }

  // Dùng 1 lần — xoá ngay để ai đó lỡ có lại sessionId cũ (vd từ lịch sử
  // trình duyệt) cũng không đăng nhập lại được lần nữa.
  await admin.from('hrm_qr_login_sessions').delete().eq('id', id)

  return NextResponse.json({ status: 'approved' })
}
