'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { PageHeader } from '@/components/PageHeader'

type Shift = {
  id: string
  name: string
  start_time: string
  end_time: string
  break_minutes: number
  is_default: boolean
  is_active: boolean
}

function standardHours(shift: Pick<Shift, 'start_time' | 'end_time' | 'break_minutes'>) {
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  const minutes = eh * 60 + em - (sh * 60 + sm) - shift.break_minutes
  return (minutes / 60).toFixed(1)
}

export default function CaLamViecPage() {
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.is_super_admin || user?.is_boss

  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('08:00')
  const [newEnd, setNewEnd] = useState('17:00')
  const [newBreak, setNewBreak] = useState('60')
  const [addError, setAddError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/shifts')
    if (res.ok) setShifts((await res.json()).shifts)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function patch(id: string, body: Record<string, unknown>) {
    setSavingId(id)
    const res = await fetch('/api/admin/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    setSavingId(null)
    if (res.ok) load()
  }

  async function addShift() {
    setAddError('')
    const breakMinutes = Number(newBreak)
    if (!newName.trim() || !newStart || !newEnd || Number.isNaN(breakMinutes)) {
      setAddError('Nhập đủ tên ca, giờ vào, giờ ra')
      return
    }
    const res = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), startTime: newStart, endTime: newEnd, breakMinutes }),
    })
    if (res.ok) {
      setNewName('')
      load()
    } else {
      setAddError('Không tạo được ca')
    }
  }

  async function removeShift(id: string) {
    await fetch(`/api/admin/shifts?id=${id}`, { method: 'DELETE' })
    load()
  }

  if (authLoading) return null
  if (!isAdmin) {
    return <div className="p-8 text-center text-sm text-gray-500">Chỉ Super Admin hoặc Boss mới truy cập được trang này.</div>
  }

  return (
    <div>
      <PageHeader title="Ca làm việc" />
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <p className="text-sm text-gray-500">
          Giờ chuẩn của ca dùng để tính đủ công/thiếu công/đi muộn/làm thêm giờ trên Bảng công. Nhân viên chưa được
          gán ca riêng (ở Yêu cầu chấm công theo nhân viên) sẽ tự dùng ca đang đặt Mặc định.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-gray-400" />
          ) : (
            <div className="space-y-3">
              {shifts.length === 0 && <p className="text-xs text-gray-400">Chưa có ca nào.</p>}
              {shifts.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">
                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)} (nghỉ {s.break_minutes}p, công chuẩn {standardHours(s)}h)
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {savingId === s.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
                      <button type="button" onClick={() => removeShift(s.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={s.is_default} onChange={(e) => patch(s.id, { isDefault: e.target.checked })} />
                    Ca mặc định
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Thêm ca mới</h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên ca (vd Ca hành chính)"
              className="col-span-2 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div>
              <label className="text-xs text-gray-400">Giờ vào</label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Giờ ra</label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Nghỉ giữa ca (phút)</label>
              <input
                type="number"
                value={newBreak}
                onChange={(e) => setNewBreak(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addShift}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            <Plus size={14} /> Thêm ca
          </button>
          {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
        </div>
      </div>
    </div>
  )
}
