import { haversineDistanceMeters } from './geo'

type WorkLocationRow = {
  id: string
  name: string
  lat: number
  lng: number
  radius_m: number
  office_ip: string | null
}

/**
 * Tính điều kiện GPS + IP văn phòng cho 1 toạ độ — dùng chung giữa route
 * check-in thật và route precheck (kiểm tra nhanh trước khi mở camera).
 * KHÔNG xử lý khuôn mặt (tách riêng, cần embedding từ FaceCapture).
 *
 * `supabase` cố tình gõ kiểu `any` — kiểu thật của client (`@supabase/supabase-js`)
 * quá phức tạp/đệ quy, ép TypeScript so khớp cấu trúc với 1 interface tự viết
 * gây lỗi "Type instantiation is excessively deep". Hàm dùng nội bộ, không
 * lộ ra API công khai nên chấp nhận đánh đổi này.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function evaluateLocation(supabase: any, lat: number, lng: number, requestIp: string | null) {
  const { data: locations } = (await supabase
    .from('hrm_work_locations')
    .select('id, name, lat, lng, radius_m, office_ip')
    .eq('is_active', true)) as { data: WorkLocationRow[] | null }

  let nearest: { id: string; name: string; distance: number; radius_m: number; office_ip: string | null } | null = null
  for (const loc of locations ?? []) {
    const distance = haversineDistanceMeters(lat, lng, loc.lat, loc.lng)
    if (!nearest || distance < nearest.distance) {
      nearest = { id: loc.id, name: loc.name, distance, radius_m: loc.radius_m, office_ip: loc.office_ip }
    }
  }

  const isWithinRadius = nearest ? nearest.distance <= nearest.radius_m : false

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

  // Chỉ ràng buộc IP theo địa điểm GẦN NHẤT — địa điểm không khai office_ip
  // thì coi như không yêu cầu IP, tránh khoá chấm công ở nơi cố tình không
  // có mạng cố định (điểm hẹn tour ngoài trời...).
  const nearestRequiresIp = !!nearest?.office_ip
  const nearestIpOk =
    !nearestRequiresIp ||
    (requestIp !== null && nearest!.office_ip!.split(',').map((ip) => ip.trim()).includes(requestIp))

  return { nearest, isWithinRadius, isIpVerified, ipMatchedLocationName, nearestIpOk }
}
