import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

export async function GET() {
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { data, error } = await supabase
    .from('hrm_work_locations')
    .select('id, name, address, lat, lng, radius_m, office_ip, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Không tải được danh sách địa điểm' }, { status: 500 })
  return NextResponse.json({ locations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user, supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const { name, address, lat, lng, radius_m, office_ip } = body ?? {}

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return NextResponse.json({ error: 'Thiếu tên hoặc toạ độ hợp lệ' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('hrm_work_locations')
    .insert({
      name: name.trim(),
      address: typeof address === 'string' ? address.trim() : null,
      lat,
      lng,
      radius_m: typeof radius_m === 'number' && radius_m > 0 ? radius_m : 150,
      office_ip: typeof office_ip === 'string' && office_ip.trim() ? office_ip.trim() : null,
      created_by: user!.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Không tạo được địa điểm' }, { status: 500 })
  return NextResponse.json({ location: data })
}
