'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, LogOut, ScanFace, Wifi } from 'lucide-react'
import { CheckInWizard, type CheckInWizardResult } from '@/components/CheckInWizard'
import type { AttendanceLog } from '@/components/AttendanceLogRow'
import { useAuth } from '@/contexts/auth'

type StatusResponse = {
  logs: AttendanceLog[]
  nextType: 'check_in' | 'check_out'
  dayComplete: boolean
}

type AttendanceCtx = {
  status: StatusResponse | null
  isCheckIn: boolean
  lastResult: CheckInWizardResult | null
  /** Bấm nút chấm công (từ Trang chủ hoặc nút giữa thanh nav) — tự xử lý
   * luôn cả bước xác nhận khi chấm công RA. */
  requestCheckInOut: () => void
  loadStatus: () => Promise<void>
}

const Ctx = createContext<AttendanceCtx | null>(null)

/**
 * Trạng thái chấm công (đã vào/ra chưa, wizard, modal xác nhận/thành công)
 * chuyển lên context dùng chung ở tầng layout — trước đây nằm hết trong
 * page.tsx, nhưng nút chấm công giờ nằm CỐ ĐỊNH giữa thanh điều hướng dưới
 * đáy (hiện ở MỌI trang, không riêng Trang chủ) nên BottomNav cần đọc được
 * cùng dữ liệu này. AuthProvider phải bọc NGOÀI provider này (cần đăng nhập
 * mới gọi API chấm công được), còn provider này phải bọc NGOÀI AppShell để
 * cả AppShell (chứa BottomNav) lẫn nội dung từng trang đều dùng chung được.
 */
export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [lastResult, setLastResult] = useState<CheckInWizardResult | null>(null)
  const [lastSubmittedType, setLastSubmittedType] = useState<'check_in' | 'check_out' | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showConfirmOut, setShowConfirmOut] = useState(false)

  async function loadStatus() {
    const res = await fetch('/api/attendance/status')
    if (res.ok) setStatus(await res.json())
  }

  // Chỉ gọi API khi đã đăng nhập — provider này bọc NGOÀI AppShell nên mount
  // cả lúc còn ở trang login/đang xác thực, gọi sớm hơn sẽ luôn nhận 401.
  useEffect(() => {
    if (user) loadStatus()
  }, [user])

  // Tự đóng modal thành công sau vài giây, không bắt người dùng phải bấm tay.
  useEffect(() => {
    if (!showSuccessModal) return
    const timer = setTimeout(() => setShowSuccessModal(false), 4000)
    return () => clearTimeout(timer)
  }, [showSuccessModal])

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
  function requestCheckInOut() {
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

  const isCheckIn = status?.nextType === 'check_in'
  const successCheckInLog = status?.logs.find((l) => l.type === 'check_in' && l.is_success) ?? null
  const lastCheckInTime = successCheckInLog
    ? new Date(successCheckInLog.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Ctx.Provider value={{ status, isCheckIn, lastResult, requestCheckInOut, loadStatus }}>
      {children}

      {/* Modal chấm công thành công — nằm ở tầng context nên hiện được dù
          đang đứng ở trang nào, vì nút chấm công giờ bấm được từ mọi trang. */}
      {showSuccessModal && lastResult?.isSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
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

      {showWizard && status && (
        <CheckInWizard type={status.nextType} onCancel={() => setShowWizard(false)} onComplete={handleWizardComplete} />
      )}
    </Ctx.Provider>
  )
}

export function useAttendance() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAttendance phải dùng trong AttendanceProvider')
  return ctx
}
