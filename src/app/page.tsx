'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, MapPin, LogIn, LogOut } from 'lucide-react'

type AttendanceLog = {
  id: string
  type: 'check_in' | 'check_out'
  created_at: string
  is_within_radius: boolean
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

  async function handleCheckInOut() {
    if (!status || submitting) return
    setSubmitting(true)
    setError('')
    setLastResult(null)
    try {
      const position = await getPosition()
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          type: status.nextType,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Chấm công thất bại')
        return
      }
      setLastResult(data)
      await loadStatus()
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
    } finally {
      setSubmitting(false)
    }
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
          {submitting ? 'Đang lấy vị trí...' : isCheckIn ? 'Chấm công vào' : 'Chấm công ra'}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-left text-sm text-red-600 bg-red-50 rounded-xl p-3">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {lastResult && (
          <div
            className={`mt-4 flex items-start gap-2 text-left text-sm rounded-xl p-3 ${
              lastResult.isWithinRadius ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
            }`}
          >
            {lastResult.isWithinRadius ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <MapPin size={16} className="shrink-0 mt-0.5" />
            )}
            <span>
              {lastResult.nearestLocationName
                ? `Cách "${lastResult.nearestLocationName}" ${lastResult.distanceM}m — ${
                    lastResult.isWithinRadius ? 'trong khu vực cho phép' : 'ngoài khu vực cho phép, đã ghi nhận kèm cảnh báo'
                  }`
                : 'Chưa có địa điểm hợp lệ nào được cấu hình — đã ghi nhận vị trí'}
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
                  {!log.is_within_radius && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">ngoài khu vực</span>
                  )}
                </span>
                <span className="text-gray-500">{formatTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
