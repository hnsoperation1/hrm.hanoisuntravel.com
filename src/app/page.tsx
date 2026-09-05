'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, LogIn, LogOut, Wifi, ScanFace } from 'lucide-react'
import { FaceCapture } from '@/components/FaceCapture'

type AttendanceLog = {
  id: string
  type: 'check_in' | 'check_out'
  created_at: string
  is_within_radius: boolean
  is_ip_verified: boolean
  is_face_verified: boolean
  is_success: boolean
  distance_m: number | null
  hrm_work_locations: { name: string } | null
}

type StatusResponse = {
  logs: AttendanceLog[]
  nextType: 'check_in' | 'check_out'
}

type CheckInResult = {
  nearestLocationName: string | null
  distanceM: number | null
  radiusM: number | null
  isWithinRadius: boolean
  isIpVerified: boolean
  ipMatchedLocationName: string | null
  isSuccess: boolean
  failReason: string | null
  isFaceVerified: boolean
  faceDistance: number | null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Trình duyệt không hỗ trợ định vị'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

export default function ChamCongPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null)
  const [lastSubmittedType, setLastSubmittedType] = useState<'check_in' | 'check_out' | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<GeolocationPosition | null>(null)
  const [showFaceCapture, setShowFaceCapture] = useState(false)

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

  // Tự đóng modal thành công sau vài giây, không bắt người dùng phải bấm tay.
  useEffect(() => {
    if (!showSuccessModal) return
    const timer = setTimeout(() => setShowSuccessModal(false), 4000)
    return () => clearTimeout(timer)
  }, [showSuccessModal])

  async function handleCheckInOut() {
    if (!status || submitting) return
    setSubmitting(true)
    setError('')
    setLastResult(null)
    try {
      const position = await getPosition()
      setPendingPosition(position)
      setShowFaceCapture(true)
    } catch (err) {
      const geoErr = err as GeolocationPositionError
      if (typeof geoErr?.code === 'number') {
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? 'Bạn cần cho phép truy cập vị trí để chấm công'
            : 'Không lấy được vị trí GPS — thử lại ở nơi tín hiệu tốt hơn',
        )
      } else {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
      }
      setSubmitting(false)
    }
  }

  async function submitCheckIn(faceEmbedding: number[]) {
    setShowFaceCapture(false)
    if (!status || !pendingPosition) {
      setSubmitting(false)
      return
    }
    const submittedType = status.nextType
    setLastSubmittedType(submittedType)
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pendingPosition.coords.latitude,
          lng: pendingPosition.coords.longitude,
          accuracy: pendingPosition.coords.accuracy,
          type: submittedType,
          faceEmbedding,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Chấm công thất bại')
        return
      }
      setLastResult(data)
      if (data.isSuccess) setShowSuccessModal(true)
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
      setPendingPosition(null)
    }
  }

  function handleFaceCancel() {
    setShowFaceCapture(false)
    setSubmitting(false)
    setPendingPosition(null)
  }

  const isCheckIn = status?.nextType === 'check_in'

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-400 mb-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
        <h1 className="text-lg font-bold text-gray-800 mb-6">Chấm công</h1>

        <button
          onClick={handleCheckInOut}
          disabled={loadingStatus || submitting}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white transition-colors disabled:opacity-60 ${
            isCheckIn ? 'bg-brand-500 hover:bg-brand-600' : 'bg-accent-500 hover:bg-accent-600'
          }`}
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isCheckIn ? (
            <LogIn size={18} />
          ) : (
            <LogOut size={18} />
          )}
          {submitting ? 'Đang xử lý...' : isCheckIn ? 'Chấm công vào' : 'Chấm công ra'}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-left text-sm text-red-600 bg-red-50 rounded-xl p-3">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Thất bại (thiếu GPS hoặc sai mạng) hiện banner cảnh báo tại chỗ —
            chỉ trường hợp THÀNH CÔNG mới bật modal riêng bên dưới. */}
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
                  {log.is_success ? (
                    <>
                      {log.is_ip_verified && <Wifi size={12} className="text-brand-400" />}
                      {log.is_face_verified && <ScanFace size={12} className="text-brand-400" />}
                    </>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">thất bại</span>
                  )}
                </span>
                <span className="text-gray-500">{formatTime(log.created_at)}</span>
              </div>
            ))}
          </div>
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

      {showFaceCapture && <FaceCapture onCapture={submitCheckIn} onCancel={handleFaceCancel} />}
    </div>
  )
}
