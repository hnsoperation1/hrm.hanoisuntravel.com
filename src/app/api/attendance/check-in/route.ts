import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getClientIp, haversineDistanceMeters } from '@/lib/geo'

type Body = {
  lat?: unknown
  lng?: unknown
  accuracy?: unknown
  type?: unknown
}

export async function POST(req: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as Body | null
  const { lat, lng, accuracy, type } = body ?? {}

  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    (type !== 'check_in' && type !== 'check_out')
  ) {
    return NextResponse.json({ error: 'Dữ liệu vị trí không hợp lệ' }, { status: 400 })
  }

  const { data: locations, error: locError } = await supabase
    .from('hrm_work_locations')
    .select('id, name, lat, lng, radius_m, office_ip')
    .eq('is_active', true)

  if (locError) {
    return NextResponse.json({ error: 'Không tải được danh sách địa điểm' }, { status: 500 })
  }

  let nearest: { id: string; name: string; distance: number; radius_m: number } | null = null
  for (const loc of locations ?? []) {
    const distance = haversineDistanceMeters(lat, lng, loc.lat, loc.lng)
    if (!nearest || distance < nearest.distance) {
      nearest = { id: loc.id, name: loc.name, distance, radius_m: loc.radius_m }
    }
  }

  const isWithinRadius = nearest ? nearest.distance <= nearest.radius_m : false

  // Check IP văn phòng — lớp bổ sung độc lập với GPS, không thay thế. So
  // khớp IP request hiện tại với danh sách IP đã khai cho BẤT KỲ địa điểm
  // nào (không chỉ địa điểm gần nhất theo GPS), vì 1 văn phòng có thể có
  // nhiều nhân viên ở xa toạ độ chính xác (GPS lệch trong nhà) nhưng vẫn
  // đang dùng đúng mạng văn phòng.
  const requestIp = getClientIp(req.headers)
  let ipMatchedLocationName: string | null = null
  if (requestIp) {
    for (const loc of locations ?? []) {
      if (!loc.office_ip) continue
      const validIps = loc.office_ip.split(',').map((ip: string) => ip.trim())
      if (validIps.includes(requestIp)) {
        ipMatchedLocationName = loc.name
        break
      }
    }
  }
  const isIpVerified = ipMatchedLocationName !== null

  const { data: log, error: insertError } = await supabase
    .from('hrm_attendance_logs')
    .insert({
      user_id: user!.id,
      type,
      lat,
      lng,
      accuracy_m: typeof accuracy === 'number' ? accuracy : null,
      nearest_location_id: nearest?.id ?? null,
      distance_m: nearest?.distance ?? null,
      is_within_radius: isWithinRadius,
      request_ip: requestIp,
      is_ip_verified: isIpVerified,
    })
    .select('id, type, created_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Không lưu được chấm công' }, { status: 500 })
  }

  return NextResponse.json({
    log,
    nearestLocationName: nearest?.name ?? null,
    distanceM: nearest ? Math.round(nearest.distance) : null,
    radiusM: nearest?.radius_m ?? null,
    isWithinRadius,
    isIpVerified,
    ipMatchedLocationName,
  })
}
