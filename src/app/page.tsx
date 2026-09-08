'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, LogIn, LogOut, ScanFace, XCircle } from 'lucide-react'
import { useAttendance } from '@/contexts/attendance'
import { LogRow, formatTime, formatDayHeading, groupLogsByDay, type AttendanceLog } from '@/components/AttendanceLogRow'
import { useAuth } from '@/contexts/auth'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function ChamCongPage() {
  const { user } = useAuth()
  const { status, isCheckIn, lastResult, requestCheckInOut } = useAttendance()
  const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null)
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[] | null>(null)

  const loadRecentLogs = useCallback(async () => {
    const res = await fetch('/api/attendance/recent?days=3')
    if (res.ok) setRecentLogs((await res.json()).logs ?? [])
  }, [])

  // Tải lại mỗi khi có kết quả chấm công mới (lastResult đổi = wizard vừa
  // chạy xong, dù thành công hay không) — không riêng lúc mount trang.
  useEffect(() => {
    loadRecentLogs()
  }, [loadRecentLogs, lastResult])

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

  const successCheckIn = status?.logs.find((l) => l.type === 'check_in' && l.is_success) ?? null
  const successCheckOut = status?.logs.find((l) => l.type === 'check_out' && l.is_success) ?? null

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="mb-6 px-1">
        <p className="text-lg font-bold text-gray-800">
          {greeting()}
          {user?.full_name ? `, ${user.full_name}` : ''}!
        </p>
        <p className="text-sm text-gray-400">Chúc bạn một ngày làm việc hiệu quả!</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-700">Chấm công hôm nay</h2>

        <div className="p-8 text-center">
          <p className="text-sm text-gray-400 mb-4">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>

          {/* Check-in/Check-out trong ngày — có gì hiện đó: chưa chấm công
              thì trống hẳn, mới vào thì chỉ hiện "Check-in", xong cả 2 thì
              hiện đủ "Check-in" lẫn "Check-out". */}
          {(successCheckIn || successCheckOut) && (
            <div className="mb-6 space-y-1 text-left">
              {successCheckIn && (
                <p className="flex items-center gap-1.5 text-sm text-gray-700">
                  <LogIn size={14} className="shrink-0 text-brand-500" />
                  <span className="font-semibold">Check-in:</span> {formatTime(successCheckIn.created_at)}
                </p>
              )}
              {successCheckOut && (
                <p className="flex items-center gap-1.5 text-sm text-gray-700">
                  <LogOut size={14} className="shrink-0 text-accent-500" />
                  <span className="font-semibold">Check-out:</span> {formatTime(successCheckOut.created_at)}
                </p>
              )}
            </div>
          )}

          {!status ? (
            // Chưa có dữ liệu thật (status vẫn null lúc đang tải) — hiện
            // "đang tải", KHÔNG đoán isCheckIn để tránh nhấp nháy sai nút
            // (mặc định isCheckIn=false khi status null nên trước đây có lúc
            // hiện lộn "Kết thúc ca" một nhoáng trước khi có data thật).
            <div className="w-full flex items-center justify-center py-4 rounded-2xl bg-gray-50">
              <Loader2 size={18} className="animate-spin text-gray-400" />
            </div>
          ) : (
            !status.dayComplete && (
              <button
                onClick={requestCheckInOut}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold text-white transition-colors ${
                  isCheckIn ? 'bg-brand-500 hover:bg-brand-600' : 'bg-accent-500 hover:bg-accent-600'
                }`}
              >
                {isCheckIn ? <LogIn size={18} /> : <LogOut size={18} />}
                {isCheckIn ? 'Bắt đầu ca' : 'Kết thúc ca'}
              </button>
            )
          )}

          {/* Thất bại (thiếu GPS hoặc sai mạng lúc GỬI THẬT, dù wizard đã cho
              qua từng bước) hiện banner cảnh báo tại chỗ — chỉ trường hợp
              THÀNH CÔNG mới bật modal riêng (nằm trong AttendanceProvider). */}
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

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-700">Dữ liệu chấm công</h2>

        <div className="p-5">
          {recentLogs === null ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có dữ liệu chấm công.</p>
          ) : (
            <div className="space-y-4">
              {groupLogsByDay(recentLogs).map(([day, dayLogs]) => (
                <div key={day}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{formatDayHeading(day)}</p>
                  <div className="space-y-2">
                    {dayLogs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Đang cân nhắc thiết kế đầy đủ cho phần này — tạm thời chỉ hiện
              3 ngày gần nhất kèm nút mở trang xem toàn bộ lịch sử. */}
          <Link
            href="/lich-su-cham-cong"
            className="mt-4 block text-center text-sm font-bold text-brand-600 hover:underline"
          >
            Xem thêm
          </Link>
        </div>
      </div>
    </div>
  )
}
