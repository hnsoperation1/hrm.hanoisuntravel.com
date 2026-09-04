import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { haversineDistanceMeters } from '@/lib/geo'

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
    .select('id, name, lat, lng, radius_m')
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
  })
}
