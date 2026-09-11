import { LogIn, LogOut, ScanFace, Wifi } from 'lucide-react'

export type AttendanceLog = {
  id: string
  type: 'check_in' | 'check_out'
  created_at: string
  channel: string
  is_within_radius: boolean
  is_ip_verified: boolean
  is_face_verified: boolean
  is_success: boolean
  distance_m: number | null
  face_distance: number | null
  hrm_work_locations: { name: string } | null
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// dayKey dạng "yyyy-mm-dd" (giờ local, xem groupLogsByDay).
export function formatDayHeading(dayKey: string) {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Gom log theo ngày (local time) — dùng chung cho card "Dữ liệu chấm công" ở
// trang chủ và trang xem đầy đủ /lich-su-cham-cong. Giữ nguyên thứ tự log
// mới nhất trước như API trả về (order by created_at desc).
export function groupLogsByDay(logs: AttendanceLog[]): [string, AttendanceLog[]][] {
  const map = new Map<string, AttendanceLog[]>()
  for (const log of logs) {
    const d = new Date(log.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }
  return Array.from(map.entries())
}

export function LogRow({ log }: { log: AttendanceLog }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        {log.type === 'check_in' ? (
          <LogIn size={14} className="text-brand-500" />
        ) : (
          <LogOut size={14} className="text-accent-500" />
        )}
        {log.type === 'check_in' ? 'Vào' : 'Ra'}
        {log.channel === 'misa' ? (
          // Chấm công thô kéo từ MISA (máy chấm công vật lý...) không đi qua
          // pipeline xác thực GPS/mạng/khuôn mặt của iHNS — hiện rõ nguồn
          // thay vì icon đỏ gây hiểu nhầm là xác thực thất bại.
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">MISA</span>
        ) : (
          <>
            <span className={`flex items-center gap-0.5 text-xs ${log.is_within_radius ? 'text-green-600' : 'text-red-500'}`}>
              <Wifi size={12} />
              {log.distance_m != null ? `${Math.round(log.distance_m)}m` : '—'}
            </span>
            <ScanFace size={12} className={log.is_face_verified ? 'text-green-600' : 'text-red-500'} />
          </>
        )}
        {!log.is_success && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">thất bại</span>}
      </span>
      <span className="text-gray-500">{formatTime(log.created_at)}</span>
    </div>
  )
}
