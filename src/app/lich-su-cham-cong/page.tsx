'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { LogRow, groupLogsByDay, formatDayHeading, type AttendanceLog } from '@/components/AttendanceLogRow'

// Trang con (không nằm trong BOTTOM_NAV_PATHS) — mở từ nút "Xem thêm" ở card
// "Dữ liệu chấm công" trên trang chủ. Thiết kế bản đầy đủ này còn đang cân
// nhắc thêm (lọc theo tháng, phân trang...), tạm thời cứ liệt kê 90 ngày gần
// nhất gom theo ngày.
export default function LichSuChamCongPage() {
  const [logs, setLogs] = useState<AttendanceLog[] | null>(null)

  useEffect(() => {
    fetch('/api/attendance/recent?days=90')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLogs(data?.logs ?? []))
  }, [])

  const groups = logs ? groupLogsByDay(logs) : []

  return (
    <div>
      <PageHeader title="Dữ liệu chấm công" />
      <div className="mx-auto max-w-md px-4 py-6">
        {logs === null ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Chưa có dữ liệu chấm công.</p>
        ) : (
          <div className="space-y-4">
            {groups.map(([day, dayLogs]) => (
              <div key={day} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
      </div>
    </div>
  )
}
