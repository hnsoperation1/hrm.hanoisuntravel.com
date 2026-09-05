'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogIn, LogOut, AlertTriangle, Wifi } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

type AttendanceRow = {
  id: string
  type: 'check_in' | 'check_out'
  created_at: string
  distance_m: number | null
  is_within_radius: boolean
  is_ip_verified: boolean
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-lg font-bold text-gray-800 mb-4">Báo cáo chấm công (500 dòng gần nhất)</h1>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-gray-400 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Đang tải...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-gray-400">Chưa có dữ liệu chấm công.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Nhân viên</th>
                <th className="text-left px-4 py-2 font-semibold">Loại</th>
                <th className="text-left px-4 py-2 font-semibold">Thời gian</th>
                <th className="text-left px-4 py-2 font-semibold">Địa điểm gần nhất</th>
                <th className="text-left px-4 py-2 font-semibold">Khoảng cách</th>
                <th className="text-left px-4 py-2 font-semibold">IP văn phòng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800">{row.users?.full_name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{row.users?.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      {row.type === 'check_in' ? (
                        <LogIn size={13} className="text-brand-500" />
                      ) : (
                        <LogOut size={13} className="text-accent-500" />
                      )}
                      {row.type === 'check_in' ? 'Vào' : 'Ra'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {new Date(row.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{row.hrm_work_locations?.name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1 ${row.is_within_radius ? 'text-gray-600' : 'text-amber-600'}`}>
                      {!row.is_within_radius && <AlertTriangle size={13} />}
                      {row.distance_m != null ? `${Math.round(row.distance_m)}m` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.is_ip_verified ? (
                      <span className="flex items-center gap-1 text-brand-600">
                        <Wifi size={13} />
                        Đúng
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
