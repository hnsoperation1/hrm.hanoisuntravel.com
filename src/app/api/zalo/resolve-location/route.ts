import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

// Đổi "location token" (Zalo Mini App SDK getLocation() trả về) thành toạ độ
// thật — Zalo bắt buộc bước này phải làm ở SERVER (gọi thẳng từ Mini App bị
// lỗi), vì cần secret_key của App, không thể lộ ra client.
//
// Theo tài liệu chính thức (docs.zaloplatforms.com/docs/MA/api/location/getLocation):
// GET https://graph.zalo.me/v2.0/me/info?access_token=...&code=...&secret_key=...
// - access_token: Mini App lấy qua sdk.getAccessToken() (client), gửi kèm lên đây
// - code: chính là `token` mà getLocation() trả về (client), gửi kèm lên đây
// - secret_key: App Secret — CHỈ nằm ở server (biến môi trường), không đưa cho client
// Token chỉ dùng được 1 lần, hết hạn sau 2 phút — phải gọi route này ngay
// sau khi Mini App lấy được token, không được trì hoãn.
export async function POST(req: NextRequest) {
  const { unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code : null
  const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : null

  if (!code || !accessToken) {
    return NextResponse.json({ error: 'Thiếu code hoặc accessToken từ Zalo Mini App' }, { status: 400 })
  }

  const secretKey = process.env.ZALO_APP_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Server chưa cấu hình ZALO_APP_SECRET_KEY' }, { status: 500 })
  }

  const url = new URL('https://graph.zalo.me/v2.0/me/info')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('code', code)
  url.searchParams.set('secret_key', secretKey)

  const zaloRes = await fetch(url.toString())
  const zaloData = await zaloRes.json().catch(() => null)

  if (!zaloData || zaloData.error !== 0 || !zaloData.data) {
    return NextResponse.json(
      { error: `Zalo từ chối đổi token vị trí: ${zaloData?.message ?? 'không rõ lỗi'}` },
      { status: 400 },
    )
  }

  const lat = parseFloat(zaloData.data.latitude)
  const lng = parseFloat(zaloData.data.longitude)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Toạ độ trả về từ Zalo không hợp lệ' }, { status: 500 })
  }

  return NextResponse.json({ lat, lng, provider: zaloData.data.provider })
}
