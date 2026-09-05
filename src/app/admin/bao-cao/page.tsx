'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogIn, LogOut, Wifi, Send, Globe, ScanFace, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

type AttendanceRow = {
  id: string
  type: 'check_in' | 'check_out'
  created_at: string
  distance_m: number | null
  is_within_radius: boolean
  is_ip_verified: boolean
  is_face_verified: boolean
  face_distance: number | null
  is_success: boolean
  channel: 'web' | 'telegram'
  hrm_work_locations: { name: string } | null
  users: { full_name: string; email: string } | null
}

export default function BaoCaoPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/attendance')
      .then((res) => (res.ok ? res.json() : { logs: [] }))
      .then((data) => setRows(data.logs ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (authLoading) return null
  if (!user?.is_super_admin && !user?.is_boss) {
    return <div className="p-8 text-center text-sm text-gray-500">Chỉ Super Admin hoặc Boss mới truy cập được trang này.</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-lg font-bold text-gray-800 mb-4">Báo cáo chấm công (500 dòng gần nhất)</h1>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-400">
          Chưa có dữ liệu chấm công.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{row.users?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{row.users?.email}</p>
                </div>
                {row.is_success ? (
                  <span className="shrink-0 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    Thành công
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    Thất bại
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-gray-700">
                  {row.type === 'check_in' ? (
                    <LogIn size={14} className="text-brand-500" />
                  ) : (
                    <LogOut size={14} className="text-accent-500" />
                  )}
                  {row.type === 'check_in' ? 'Vào' : 'Ra'}
                </span>
                <span className="text-gray-500">{new Date(row.created_at).toLocaleString('vi-VN')}</span>
              </div>

              <p className="mt-1 text-sm text-gray-600">{row.hrm_work_locations?.name ?? 'Chưa có địa điểm'}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs">
                <span
                  className={`flex items-center gap-1 ${row.is_within_radius ? 'text-green-600' : 'text-red-500'}`}
                >
                  <MapPin size={13} />
                  {row.distance_m != null ? `${Math.round(row.distance_m)}m` : '—'}
                </span>
                <span className={`flex items-center gap-1 ${row.is_ip_verified ? 'text-green-600' : 'text-red-500'}`}>
                  <Wifi size={13} />
                  {row.is_ip_verified ? 'Đúng mạng' : 'Sai mạng'}
                </span>
                <span
                  className={`flex items-center gap-1 ${row.is_face_verified ? 'text-green-600' : 'text-red-500'}`}
                >
                  <ScanFace size={13} />
                  {row.face_distance != null ? row.face_distance.toFixed(2) : '—'}
                </span>
                <span className="ml-auto flex items-center gap-1 text-gray-400">
                  {row.channel === 'telegram' ? <Send size={13} /> : <Globe size={13} />}
                  {row.channel === 'telegram' ? 'Telegram' : 'Web'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
