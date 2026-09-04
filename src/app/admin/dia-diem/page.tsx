'use client'

import { useEffect, useState } from 'react'
import { Loader2, MapPin, Plus, Trash2, LocateFixed } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

type WorkLocation = {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  radius_m: number
  is_active: boolean
}

export default function DiaDiemPage() {
  const { user, loading: authLoading } = useAuth()
  const [locations, setLocations] = useState<WorkLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('150')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/work-locations')
    if (res.ok) {
      const data = await res.json()
      setLocations(data.locations)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function useCurrentPosition() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
      },
      () => setError('Không lấy được vị trí hiện tại'),
    )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    const radiusNum = parseInt(radius, 10)
    if (!name.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setError('Thiếu tên hoặc toạ độ hợp lệ')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/work-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, lat: latNum, lng: lngNum, radius_m: radiusNum }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error ?? 'Không tạo được địa điểm')
      return
    }
    setName('')
    setAddress('')
    setLat('')
    setLng('')
    setRadius('150')
    load()
  }

  async function toggleActive(loc: WorkLocation) {
    await fetch(`/api/admin/work-locations/${loc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !loc.is_active }),
    })
    load()
  }

  async function remove(loc: WorkLocation) {
    if (!confirm(`Xoá địa điểm "${loc.name}"?`)) return
    await fetch(`/api/admin/work-locations/${loc.id}`, { method: 'DELETE' })
    load()
  }

  if (authLoading) return null
  if (!user?.is_super_admin && !user?.is_boss) {
    return <div className="p-8 text-center text-sm text-gray-500">Chỉ Super Admin hoặc Boss mới truy cập được trang này.</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-lg font-bold text-gray-800">Địa điểm chấm công</h1>

      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên địa điểm (vd: Văn phòng HN)"
            className="col-span-2 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Địa chỉ (tuỳ chọn)"
            className="col-span-2 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Vĩ độ (lat)"
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Kinh độ (lng)"
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="Bán kính cho phép (m)"
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            type="button"
            onClick={useCurrentPosition}
            className="flex items-center justify-center gap-1.5 text-sm text-brand-600 border border-brand-200 rounded-xl px-3 py-2 hover:bg-brand-50"
          >
            <LocateFixed size={14} />
            Dùng vị trí hiện tại
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Thêm địa điểm
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {loading ? (
          <div className="p-5 text-sm text-gray-400 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Đang tải...
          </div>
        ) : locations.length === 0 ? (
          <div className="p-5 text-sm text-gray-400">Chưa có địa điểm nào.</div>
        ) : (
          locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between p-4 gap-4">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{loc.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {loc.address ? `${loc.address} — ` : ''}
                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · bán kính {loc.radius_m}m
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(loc)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    loc.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {loc.is_active ? 'Đang bật' : 'Đã tắt'}
                </button>
                <button onClick={() => remove(loc)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
