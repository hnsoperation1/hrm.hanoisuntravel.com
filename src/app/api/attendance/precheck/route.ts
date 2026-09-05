import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getClientIp } from '@/lib/geo'
import { evaluateLocation } from '@/lib/attendance'

// Kiểm tra nhanh GPS + IP văn phòng NGAY SAU khi lấy toạ độ, TRƯỚC khi mở
// camera xin khuôn mặt — sai vị trí/mạng thì báo luôn, đỡ bắt nhân viên
// chụp ảnh vô ích. Không ghi log (chỉ là bước kiểm tra sơ bộ), lượt chấm
// công thật sự vẫn qua /api/attendance/check-in như cũ.
export async function POST(req: NextRequest) {
  const { supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const lat = body?.lat
  const lng = body?.lng

  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Dữ liệu vị trí không hợp lệ' }, { status: 400 })
  }

  const requestIp = getClientIp(req.headers)
  const { nearest, isWithinRadius, nearestIpOk } = await evaluateLocation(supabase, lat, lng, requestIp)

  const reasons: string[] = []
  if (!isWithinRadius) reasons.push('ngoài khu vực GPS cho phép')
  if (!nearestIpOk) reasons.push('sai mạng văn phòng')

  return NextResponse.json({
    ok: isWithinRadius && nearestIpOk,
    nearestLocationName: nearest?.name ?? null,
    distanceM: nearest ? Math.round(nearest.distance) : null,
    failReason: reasons.length > 0 ? reasons.join(', ') : null,
  })
}
