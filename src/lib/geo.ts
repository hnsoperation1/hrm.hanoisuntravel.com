const EARTH_RADIUS_M = 6371000

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

/** Khoảng cách giữa 2 toạ độ GPS theo công thức Haversine, đơn vị mét. */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

/**
 * Lấy IP thật của client từ header — Vercel/proxy đặt IP client ở vị trí
 * ĐẦU TIÊN trong `x-forwarded-for` (có thể có nhiều IP nếu qua nhiều proxy).
 * `x-real-ip` dùng làm fallback cho môi trường không có x-forwarded-for.
 */
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')
}
