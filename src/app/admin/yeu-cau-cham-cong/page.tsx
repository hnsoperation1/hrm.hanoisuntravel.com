'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MapPin, ScanFace, Wifi } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

type Employee = {
  id: string
  full_name: string
  email: string
  require_gps: boolean
  require_wifi: boolean
  require_face: boolean
  location_id: string | null
}

type Location = { id: string; name: string }

type FaceEnrollment =
  | { id: string; enrolled: false }
  | { id: string; enrolled: true; enrolledAt: string; embeddings: number[][]; imageUrls: string[] }

export default function YeuCauChamCongPage() {
  const { user, loading: authLoading } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [faceData, setFaceData] = useState<Map<string, FaceEnrollment>>(new Map())
  const [expandedFaceId, setExpandedFaceId] = useState<string | null>(null)
  const [expandedVectorId, setExpandedVectorId] = useState<string | null>(null)
  const [threshold, setThreshold] = useState<number | null>(null)
  const [thresholdInput, setThresholdInput] = useState('')
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [thresholdMsg, setThresholdMsg] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/employee-requirements')
    if (res.ok) {
      const data = await res.json()
      setEmployees(data.employees)
      setLocations(data.locations)
    }
    setLoading(false)
  }

  async function loadFaceData() {
    const res = await fetch('/api/admin/face-enrollments')
    if (res.ok) {
      const data = await res.json()
      setFaceData(new Map((data.employees as FaceEnrollment[]).map((e) => [e.id, e])))
    }
  }

  async function loadSettings() {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      setThreshold(data.faceMatchThreshold)
      setThresholdInput(String(data.faceMatchThreshold))
    }
  }

  useEffect(() => {
    load()
    loadFaceData()
    loadSettings()
  }, [])

  async function saveThreshold() {
    const value = parseFloat(thresholdInput)
    if (Number.isNaN(value) || value <= 0 || value > 1) {
      setThresholdMsg('Giá trị phải trong khoảng (0, 1]')
      return
    }
    setSavingThreshold(true)
    setThresholdMsg('')
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceMatchThreshold: value }),
    })
    setSavingThreshold(false)
    if (res.ok) {
      setThreshold(value)
      setThresholdMsg('Đã lưu')
      setTimeout(() => setThresholdMsg(''), 2000)
    } else {
      const data = await res.json().catch(() => ({}))
      setThresholdMsg(data.error ?? 'Lưu thất bại')
    }
  }

  async function saveField(emp: Employee, patch: Partial<Employee>) {
    // Cập nhật lạc quan trên giao diện trước, rồi mới gọi API — cảm giác bấm
    // là ăn ngay, không phải chờ round-trip mới thấy tick đổi.
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, ...patch } : e)))
    setSavingId(emp.id)
    const res = await fetch('/api/admin/employee-requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, ...patch }),
    })
    setSavingId(null)
    if (!res.ok) {
      // Lưu thất bại thì tải lại từ server cho đúng thực tế, tránh giao diện
      // hiện sai trạng thái so với dữ liệu thật.
      load()
    }
  }

  if (authLoading) return null
  if (!user?.is_super_admin && !user?.is_boss) {
    return <div className="p-8 text-center text-sm text-gray-500">Chỉ Super Admin hoặc Boss mới truy cập được trang này.</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-lg font-bold text-gray-800 mb-1">Yêu cầu chấm công theo nhân viên</h1>
      <p className="text-sm text-gray-500 mb-6">
        Bỏ tick 1 điều kiện = nhân viên đó không cần đạt điều kiện đó mới được tính chấm công thành công. Gán địa
        điểm = luôn tính theo đúng địa điểm đó, không tự động lấy địa điểm gần nhất nữa.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
          <ScanFace size={14} className="text-brand-500" />
          Ngưỡng khớp khuôn mặt (áp dụng chung cho tất cả nhân viên)
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Khoảng cách giữa embedding lúc chấm công và mẫu đã đăng ký càng NHỎ càng giống nhau. Giá trị càng thấp
          càng chặt (khó giả mạo hơn nhưng dễ từ chối nhầm chính chủ khi ảnh sáng/góc mặt kém). Mặc định 0.3.
        </p>
        {threshold === null ? (
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" /> Đang tải...
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="w-28 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              type="button"
              onClick={saveThreshold}
              disabled={savingThreshold || thresholdInput === String(threshold)}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl"
            >
              {savingThreshold && <Loader2 size={14} className="animate-spin" />}
              Lưu
            </button>
            {thresholdMsg && <span className="text-xs text-gray-500">{thresholdMsg}</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Đang tải...
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{emp.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                </div>
                {savingId === emp.id && <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emp.require_gps}
                    onChange={(e) => saveField(emp, { require_gps: e.target.checked })}
                  />
                  <MapPin size={14} className="text-brand-500" />
                  GPS
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emp.require_wifi}
                    onChange={(e) => saveField(emp, { require_wifi: e.target.checked })}
                  />
                  <Wifi size={14} className="text-brand-500" />
                  IP văn phòng
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emp.require_face}
                    onChange={(e) => saveField(emp, { require_face: e.target.checked })}
                  />
                  <ScanFace size={14} className="text-brand-500" />
                  Khuôn mặt
                </label>
              </div>

              <select
                value={emp.location_id ?? ''}
                onChange={(e) => saveField(emp, { location_id: e.target.value || null })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Tự động (địa điểm gần nhất)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    Luôn tính theo: {loc.name}
                  </option>
                ))}
              </select>

              {(() => {
                const face = faceData.get(emp.id)
                if (!face) return null
                const isFaceOpen = expandedFaceId === emp.id
                return (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedFaceId(isFaceOpen ? null : emp.id)}
                      className="flex w-full items-center justify-between text-sm text-gray-600"
                    >
                      <span className="flex items-center gap-1.5">
                        <ScanFace size={14} className="text-brand-500" />
                        Dữ liệu khuôn mặt —{' '}
                        {face.enrolled ? (
                          <span className="text-green-600">đã đăng ký ({face.embeddings.length} mẫu)</span>
                        ) : (
                          <span className="text-gray-400">chưa đăng ký</span>
                        )}
                      </span>
                      {face.enrolled && (isFaceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>

                    {isFaceOpen && face.enrolled && (
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-gray-400">
                          Đăng ký lúc {new Date(face.enrolledAt).toLocaleString('vi-VN')}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {face.imageUrls.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element -- ảnh signed URL riêng tư, không dùng next/image tối ưu qua CDN công khai
                            <img
                              key={i}
                              src={url}
                              alt={`Mẫu ${i + 1}`}
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedVectorId(expandedVectorId === emp.id ? null : emp.id)}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {expandedVectorId === emp.id ? 'Ẩn vector' : 'Xem vector'}
                        </button>

                        {expandedVectorId === emp.id && (
                          <pre className="max-h-40 overflow-auto rounded-lg bg-gray-50 p-2 text-[10px] leading-tight text-gray-500">
                            {JSON.stringify(
                              face.embeddings.map((v) => v.map((n) => Number(n.toFixed(3)))),
                              null,
                              1,
                            )}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
