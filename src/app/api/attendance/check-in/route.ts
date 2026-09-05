import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getClientIp } from '@/lib/geo'
import { euclideanDistance, FACE_MATCH_THRESHOLD } from '@/lib/face'
import { evaluateLocation, getEmployeeRequirements } from '@/lib/attendance'

type Body = {
  lat?: unknown
  lng?: unknown
  accuracy?: unknown
  type?: unknown
  faceEmbedding?: unknown
}

export async function POST(req: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const body = (await req.json().catch(() => null)) as Body | null
  const { lat, lng, accuracy, type, faceEmbedding } = body ?? {}

  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    (type !== 'check_in' && type !== 'check_out')
  ) {
    return NextResponse.json({ error: 'Dữ liệu vị trí không hợp lệ' }, { status: 400 })
  }

  // Mỗi ngày chỉ ghi nhận đúng 1 lần vào + 1 lần ra — chặn ở server (không
  // chỉ ẩn nút trên UI), vì client hoàn toàn có thể tự gọi thẳng API này.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { data: todaySuccessLogs } = await supabase
    .from('hrm_attendance_logs')
    .select('type')
    .eq('user_id', user!.id)
    .eq('is_success', true)
    .gte('created_at', startOfDay.toISOString())

  const hasCheckIn = (todaySuccessLogs ?? []).some((l) => l.type === 'check_in')
  const hasCheckOut = (todaySuccessLogs ?? []).some((l) => l.type === 'check_out')
  if (hasCheckIn && hasCheckOut) {
    return NextResponse.json(
      { error: 'Đã hoàn tất chấm công hôm nay (đủ 1 lần vào + 1 lần ra), không thể chấm công thêm' },
      { status: 409 },
    )
  }
  if ((type === 'check_in' && hasCheckIn) || (type === 'check_out' && !hasCheckIn)) {
    return NextResponse.json({ error: 'Sai thứ tự chấm công — tải lại trang rồi thử lại' }, { status: 409 })
  }

  // Điều kiện nào bắt buộc + có bị gán cố định 1 địa điểm hay không tuỳ theo
  // cấu hình riêng của từng nhân viên (admin đặt ở /admin/yeu-cau-cham-cong).
  const requirements = await getEmployeeRequirements(supabase, user!.id)

  const requestIp = getClientIp(req.headers)
  const { nearest, isWithinRadius, isIpVerified, ipMatchedLocationName, nearestIpOk } = await evaluateLocation(
    supabase,
    lat,
    lng,
    requestIp,
    requirements.locationId,
  )

  // Xác thực khuôn mặt — trình duyệt đã tự trích embedding (128 số) ngay
  // trên thiết bị, server chỉ so sánh với embedding đã đăng ký của CHÍNH
  // nhân viên đang gọi API này (không nhận diện "đây là ai", chỉ trả lời
  // "có đúng là người đã đăng ký user_id này không"). Bắt buộc để tính
  // is_success — chưa đăng ký khuôn mặt hoặc sai mặt đều coi là thất bại.
  let isFaceVerified = false
  let faceDistance: number | null = null
  let hasEnrollment = false
  if (Array.isArray(faceEmbedding) && faceEmbedding.length === 128) {
    const { data: enrollment } = await supabase
      .from('hrm_face_enrollments')
      .select('embedding')
      .eq('user_id', user!.id)
      .maybeSingle()
    if (enrollment) {
      hasEnrollment = true
      faceDistance = euclideanDistance(faceEmbedding as number[], enrollment.embedding as number[])
      isFaceVerified = faceDistance <= FACE_MATCH_THRESHOLD
    }
  }

  const gpsOk = !requirements.requireGps || isWithinRadius
  const wifiOk = !requirements.requireWifi || nearestIpOk
  const faceOk = !requirements.requireFace || isFaceVerified

  const isSuccess = gpsOk && wifiOk && faceOk

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
      is_success: isSuccess,
      is_face_verified: isFaceVerified,
      face_distance: faceDistance,
      channel: 'web',
    })
    .select('id, type, created_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Không lưu được chấm công' }, { status: 500 })
  }

  let failReason: string | null = null
  if (!isSuccess) {
    const reasons: string[] = []
    if (!gpsOk) reasons.push('ngoài khu vực GPS cho phép')
    if (!wifiOk) reasons.push('sai mạng văn phòng')
    if (!faceOk) reasons.push(hasEnrollment ? 'khuôn mặt không khớp' : 'chưa đăng ký khuôn mặt')
    failReason = reasons.length > 0 ? reasons.join(', ') : 'không đạt điều kiện'
  }

  return NextResponse.json({
    log,
    nearestLocationName: nearest?.name ?? null,
    distanceM: nearest ? Math.round(nearest.distance) : null,
    radiusM: nearest?.radius_m ?? null,
    isWithinRadius,
    isIpVerified,
    ipMatchedLocationName,
    isSuccess,
    failReason,
    isFaceVerified,
    faceDistance,
  })
}
