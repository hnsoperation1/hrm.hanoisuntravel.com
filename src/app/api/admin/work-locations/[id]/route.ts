import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const { name, address, lat, lng, radius_m, office_ip, is_active } = body ?? {}

  const update: Record<string, unknown> = {}
  if (typeof name === 'string') update.name = name.trim()
  if (typeof address === 'string') update.address = address.trim()
  if (typeof lat === 'number' && !Number.isNaN(lat)) update.lat = lat
  if (typeof lng === 'number' && !Number.isNaN(lng)) update.lng = lng
  if (typeof radius_m === 'number' && radius_m > 0) update.radius_m = radius_m
  if (typeof office_ip === 'string') update.office_ip = office_ip.trim() || null
  if (typeof is_active === 'boolean') update.is_active = is_active

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu để cập nhật' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('hrm_work_locations')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Không cập nhật được địa điểm' }, { status: 500 })
  return NextResponse.json({ location: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, unauthorized } = await requireAdminUser()
  if (unauthorized) return unauthorized

  const { error } = await supabase.from('hrm_work_locations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Không xoá được địa điểm' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
