'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, LogIn, LogOut, Wifi, ScanFace, CalendarCheck, Trash2 } from 'lucide-react'
import { CheckInWizard, type CheckInWizardResult } from '@/components/CheckInWizard'
import { DraggableCheckInBubble } from '@/components/DraggableCheckInBubble'
import { useAuth } from '@/contexts/auth'

type AttendanceLog = {
  id: string
  type: 'check_in' | 'check_out'
  created_at: string
  is_within_radius: boolean
  is_ip_verified: boolean
  is_face_verified: boolean
  is_success: boolean
  distance_m: number | null
  face_distance: number | null
  hrm_work_locations: { name: string } | null
}

type StatusResponse = {
  logs: AttendanceLog[]
  nextType: 'check_in' | 'check_out'
  dayComplete: boolean
}

type Employee = { id: string; full_name: string; email: string }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function todayIsoDate() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export default function ChamCongPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_super_admin || user?.is_boss
  const [resetDate, setResetDate] = useState(todayIsoDate())
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [resetUserId, setResetUserId] = useState('')
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [lastResult, setLastResult] = useState<CheckInWizardResult | null>(null)
  const [lastSubmittedType, setLastSubmittedType] = useState<'check_in' | 'check_out' | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showConfirmOut, setShowConfirmOut] = useState(false)
  const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null)

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/attendance/status')
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Nhắc đăng ký khuôn mặt NGAY tại màn chấm công nếu chưa có — trước đây
  // phải tự vào Menu mới thấy, nhiều khả năng nhân viên không biết là thiếu
  // bước này cho tới khi chấm công thất bại vì "chưa đăng ký khuôn mặt".
  useEffect(() => {
    fetch('/api/face/enroll')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setFaceEnrolled(data.enrolled)
      })
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/employees')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setEmployees(data.employees)
      })
  }, [isAdmin])

  // Tự đóng modal thành công sau vài giây, không bắt người dùng phải bấm tay.
  useEffect(() => {
    if (!showSuccessModal) return
    const timer = setTimeout(() => setShowSuccessModal(false), 4000)
    return () => clearTimeout(timer)
  }, [showSuccessModal])

  // Mở wizard chấm công theo từng bước (Wi-Fi → vị trí → khuôn mặt) — toàn
  // bộ logic lấy GPS/kiểm tra điều kiện/chụp mặt/gửi API nằm trong
  // CheckInWizard, trang này chỉ cần biết wizard xong thì cập nhật gì.
  function openWizard() {
    if (!status) return
    setLastSubmittedType(status.nextType)
    setLastResult(null)
    setShowWizard(true)
  }

  async function handleWizardComplete(result: CheckInWizardResult) {
    setShowWizard(false)
    setLastResult(result)
    if (result.isSuccess) setShowSuccessModal(true)
    // Luôn làm mới trạng thái dù thành công hay bị server từ chối (vd đã đủ
    // 1 vào + 1 ra) — tránh giao diện hiện nút cũ dù server đã coi ngày đó
    // là xong, dễ bấm thêm vô ích.
    await loadStatus()
  }

  // Chấm công vào thì bấm là chạy luôn; chấm công RA cần xác nhận lại trước
  // — tránh bấm nhầm lúc đang định bấm "vào" (nút đổi màu/label theo trạng
  // thái, dễ bấm nhầm khi thao tác nhanh), hậu quả "ra" nhầm nặng hơn "vào" nhầm.
  function handleButtonClick() {
    if (!status || status.dayComplete) return
    if (status.nextType === 'check_out') {
      setShowConfirmOut(true)
      return
    }
    openWizard()
  }

  function handleConfirmOut() {
    setShowConfirmOut(false)
    openWizard()
  }

  async function handleResetDay() {
    const target = resetUserId ? employees.find((e) => e.id === resetUserId) : null
    const targetLabel = target ? `${target.full_name} (${target.email})` : 'CHÍNH BẠN'
    if (!confirm(`Xoá toàn bộ chấm công của ${targetLabel} ngày ${resetDate}? Không hoàn tác được.`)) return
    setResetting(true)
    setResetMsg('')
    try {
      const res = await fetch('/api/admin/attendance/reset-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: resetDate, userId: resetUserId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResetMsg(data.error ?? 'Không xoá được')
        return
      }
      setResetMsg(`Đã xoá ${data.deleted} log`)
      await loadStatus()
    } finally {
      setResetting(false)
    }
  }

  const isCheckIn = status?.nextType === 'check_in'
  const lastCheckInLog = status?.logs.filter((l) => l.type === 'check_in' && l.is_success).at(-1)
  const lastCheckInTime = lastCheckInLog ? formatTime(lastCheckInLog.created_at) : null

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-400 mb-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
        <h1 className="text-lg font-bold text-gray-800 mb-6">Chấm công</h1>

        {status?.dayComplete && (
          <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold bg-green-50 text-green-700">
            <CalendarCheck size={18} />
            Đã hoàn tất chấm công hôm nay
          </div>
        )}

        {/* Thất bại (thiếu GPS hoặc sai mạng lúc GỬI THẬT, dù wizard đã cho
            qua từng bước) hiện banner cảnh báo tại chỗ — chỉ trường hợp
            THÀNH CÔNG mới bật modal riêng bên dưới. */}
        {lastResult && !lastResult.isSuccess && (
          <div className="mt-4 flex items-start gap-2 text-left text-sm text-red-600 bg-red-50 rounded-xl p-3">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              Chấm công KHÔNG hợp lệ — {lastResult.failReason ?? 'không đạt điều kiện'}.
              {lastResult.nearestLocationName &&
                ` (cách "${lastResult.nearestLocationName}" ${lastResult.distanceM}m)`}{' '}
              Lượt này vẫn được lưu lại để quản lý xem xét.
            </span>
          </div>
        )}
      </div>

      {faceEnrolled === false && (
        <div className="mt-6 rounded-2xl border border-dashed border-accent-300 bg-accent-50/60 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100">
            <ScanFace size={22} className="text-accent-500" />
          </div>
          <p className="mb-1 text-sm font-bold text-gray-800">Bạn chưa đăng ký khuôn mặt</p>
          <p className="mb-4 text-xs text-gray-500">
            Cần đăng ký khuôn mặt trước để hệ thống xác thực đúng người mỗi lần chấm công.
          </p>
          <Link
            href="/dang-ky-khuon-mat"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-600"
          >
            <ScanFace size={14} />
            Đăng ký khuôn mặt ngay
          </Link>
        </div>
      )}

      {status && status.logs.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Chấm công hôm nay</h2>
          <div className="space-y-2">
            {status.logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {log.type === 'check_in' ? (
                    <LogIn size={14} className="text-brand-500" />
                  ) : (
                    <LogOut size={14} className="text-accent-500" />
                  )}
                  {log.type === 'check_in' ? 'Vào' : 'Ra'}
                  <span
                    className={`flex items-center gap-0.5 text-xs ${
                      log.is_within_radius ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    <Wifi size={12} />
                    {log.distance_m != null ? `${Math.round(log.distance_m)}m` : '—'}
                  </span>
                  <ScanFace size={12} className={log.is_face_verified ? 'text-green-600' : 'text-red-500'} />
                  {!log.is_success && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">thất bại</span>
                  )}
                </span>
                <span className="text-gray-500">{formatTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">Công cụ quản trị — xoá chấm công</p>
          <p className="mb-3 text-xs text-amber-700">
            Xoá toàn bộ chấm công của 1 nhân viên trong 1 ngày (mặc định chính bạn) — dùng để test hoặc sửa dữ liệu lỗi.
            Không hoàn tác được.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={resetUserId}
              onChange={(e) => setResetUserId(e.target.value)}
              className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm min-w-[160px]"
            >
              <option value="">Chính tôi</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.email})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={resetDate}
              onChange={(e) => setResetDate(e.target.value)}
              className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm"
            />
            <button
              onClick={handleResetDay}
              disabled={resetting}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              {resetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Xoá dữ liệu ngày này
            </button>
          </div>
          {resetMsg && <p className="mt-2 text-xs text-amber-800">{resetMsg}</p>}
        </div>
      )}

      {/* Modal chấm công thành công */}
      {showSuccessModal && lastResult?.isSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-800">
              {lastSubmittedType === 'check_in' ? 'Chấm công vào thành công!' : 'Chấm công ra thành công!'}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              {lastResult.nearestLocationName ? ` · ${lastResult.nearestLocationName}` : ''}
            </p>
            {lastResult.isIpVerified && (
              <div className="mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 p-2 text-xs text-brand-600">
                <Wifi size={13} />
                Đúng mạng "{lastResult.ipMatchedLocationName}"
              </div>
            )}
            {lastResult.isFaceVerified && (
              <div className="mb-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 p-2 text-xs text-brand-600">
                <ScanFace size={13} />
                Đã xác thực khuôn mặt
              </div>
            )}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Xác nhận chấm công ra */}
      {showConfirmOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowConfirmOut(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-50">
              <LogOut size={32} className="text-accent-500" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-800">Xác nhận chấm công ra?</h2>
            <p className="mb-6 text-sm text-gray-500">
              {lastCheckInTime ? `Bạn đã chấm công vào lúc ${lastCheckInTime} hôm nay.` : 'Xác nhận bạn muốn kết thúc ca làm hôm nay.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmOut(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirmOut}
                className="flex-1 rounded-xl bg-accent-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-600"
              >
                Chấm công ra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nút chấm công dạng bong bóng nổi, kéo-thả được — chỉ hiện ở Trang
          chủ (không phải khung cố định toàn app). Menu cũng có 1 lối vào
          chấm công song song (xem /menu), đây vẫn là lối tắt nhanh nhất khi
          đang đứng ở Trang chủ. */}
      {status && !status.dayComplete && (
        <DraggableCheckInBubble color={isCheckIn ? 'brand' : 'accent'} onActivate={handleButtonClick} />
      )}

      {showWizard && status && (
        <CheckInWizard
          type={status.nextType}
          onCancel={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  )
}
