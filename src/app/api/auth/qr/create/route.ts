import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseDeviceLabel, QR_LOGIN_SESSION_TTL_MS } from '@/lib/qrLoginSession'

// Không cần đăng nhập để gọi — đây chính là màn hình ĐĂNG NHẬP, chưa có ai
// xác thực cả. Chỉ tạo 1 phiên tạm rỗng (chưa gắn user nào) để mã hoá thành QR.
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const id = randomBytes(24).toString('hex')
  const deviceLabel = parseDeviceLabel(req.headers.get('user-agent'))
  const expiresAt = new Date(Date.now() + QR_LOGIN_SESSION_TTL_MS)

  const { error } = await supabase
    .from('hrm_qr_login_sessions')
    .insert({ id, device_label: deviceLabel, expires_at: expiresAt.toISOString() })

  if (error) return NextResponse.json({ error: 'Không tạo được phiên đăng nhập' }, { status: 500 })
  return NextResponse.json({ sessionId: id, expiresAt: expiresAt.toISOString() })
}
