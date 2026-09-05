import { NextRequest, NextResponse } from 'next/server'

// Cho phép gọi API từ nguồn khác domain (Mini App Zalo chạy trên hạ tầng
// của Zalo, không phải hrm.hanoisuntravel.com) — an toàn vì các route dưới
// /api đều xác thực bằng Bearer token tự gửi kèm (không phải cookie), nên
// mở CORS rộng không tạo lỗ hổng CSRF kiểu cookie thông thường.
function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }))
  }
  return withCors(NextResponse.next())
}

export const config = {
  matcher: '/api/:path*',
}
