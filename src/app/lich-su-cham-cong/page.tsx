'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

type DayStatus = 'du_cong' | 'thieu_cong' | 'nghi' | 'none'

type TimesheetDay = {
  date: string
  status: DayStatus
  checkIn: string | null
  checkOut: string | null
  isLate: boolean
  isEarly: boolean
  otHours: number
}

type Timesheet = {
  shift: { name: string; start_time: string; end_time: string } | null
  noShiftConfigured: boolean
  days: TimesheetDay[]
  stats: { tongCongDays: number; otHours: number; lateEarlyCount: number; nghiDays: number }
}

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function monthLabel(year: number, month: number) {
  const first = `01/${String(month).padStart(2, '0')}/${year}`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const last = `${lastDay}/${String(month).padStart(2, '0')}/${year}`
  return `${first} - ${last}`
}

function formatDayHeading(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

// Chủ nhật (getDay()===0) xếp cuối tuần theo cách người Việt quen dùng
// (T2..CN) thay vì đầu tuần kiểu getDay() mặc định (CN=0, T2=1...).
function mondayFirstIndex(dateKey: string) {
  const jsDay = new Date(`${dateKey}T00:00:00`).getDay()
  return (jsDay + 6) % 7
}

function StatusBadge({ status }: { status: DayStatus }) {
  if (status === 'du_cong') return <Plus size={14} className="text-white" />
  if (status === 'thieu_cong') return <Minus size={14} className="text-white" />
  if (status === 'nghi') return <span className="block h-1.5 w-3 rounded bg-white" />
  return null
}

function statusBg(status: DayStatus) {
  if (status === 'du_cong') return 'bg-green-500'
  if (status === 'thieu_cong') return 'bg-amber-500'
  if (status === 'nghi') return 'bg-gray-300'
  return 'bg-gray-100'
}

export default function BangCongPage() {
  const today = new Date(Date.now() + 7 * 3600 * 1000)
  const [year, setYear] = useState(today.getUTCFullYear())
  const [month, setMonth] = useState(today.getUTCMonth() + 1)
  const [data, setData] = useState<Timesheet | null>(null)
  const [tab, setTab] = useState<'grid' | 'list'>('grid')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  function loadTimesheet() {
    return fetch(`/api/attendance/timesheet?month=${year}-${String(month).padStart(2, '0')}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
  }

  useEffect(() => {
    setData(null)
    loadTimesheet()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần chạy lại khi đổi tháng
  }, [year, month])

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncMsg('')
    const res = await fetch('/api/attendance/misa-sync-now', { method: 'POST' })
    const result = await res.json().catch(() => ({}))
    if (res.ok) {
      setSyncMsg(result.skipped ? result.message : 'Đã đồng bộ xong')
      await loadTimesheet()
    } else {
      setSyncMsg(result.error ?? 'Đồng bộ thất bại')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 3000)
  }

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  const leadingBlanks = data ? mondayFirstIndex(data.days[0].date) : 0

  const daysWithData = useMemo(() => (data ? data.days.filter((d) => d.status !== 'none' || d.checkIn || d.checkOut) : []), [data])

  return (
    <div>
      <PageHeader
        title="Bảng công"
        right={
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Đồng bộ
          </button>
        }
      />
      <div className="mx-auto max-w-md px-4 py-4">
        {syncMsg && <p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">{syncMsg}</p>}
        <div className="mb-4 flex items-center justify-center gap-3">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700">{monthLabel(year, month)}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <ChevronRight size={18} />
          </button>
        </div>

        {!data ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-4 gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{data.stats.tongCongDays}</p>
                <p className="text-[11px] text-gray-400">Tổng công (ngày)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-brand-600">{data.stats.otHours}</p>
                <p className="text-[11px] text-gray-400">Làm thêm (giờ)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{data.stats.lateEarlyCount}</p>
                <p className="text-[11px] text-gray-400">Đi muộn, về sớm (lần)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">{data.stats.nghiDays}</p>
                <p className="text-[11px] text-gray-400">Nghỉ (ngày)</p>
              </div>
            </div>

            {data.noShiftConfigured && (
              <p className="mb-4 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
                Chưa cấu hình ca làm việc nào — số liệu đủ/thiếu công chỉ mang tính tham khảo.
              </p>
            )}
            {data.shift && (
              <p className="mb-4 text-xs text-gray-400">
                Ca áp dụng: {data.shift.name} ({data.shift.start_time.slice(0, 5)} – {data.shift.end_time.slice(0, 5)})
              </p>
            )}

            <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setTab('grid')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Bảng công
              </button>
              <button
                type="button"
                onClick={() => setTab('list')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Danh sách
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-green-500 text-white"><Plus size={10} /></span> Đủ công
              </span>
              <span className="flex items-center gap-1">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 text-white"><Minus size={10} /></span> Thiếu công
              </span>
              <span className="flex items-center gap-1">
                <span className="h-4 w-4 rounded bg-gray-300" /> Nghỉ
              </span>
              <span className="flex items-center gap-1 font-bold text-brand-600">OT Làm thêm giờ</span>
            </div>

            {tab === 'grid' ? (
              <div>
                <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
                  {WEEKDAY_HEADERS.map((w) => (
                    <span key={w} className={w === 'CN' ? 'text-red-400' : ''}>
                      {w}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {data.days.map((d) => {
                    const dayNum = Number(d.date.slice(8, 10))
                    const isSunday = new Date(`${d.date}T00:00:00`).getDay() === 0
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-1">
                        <span className={`text-xs ${isSunday ? 'text-red-400' : 'text-gray-600'}`}>{dayNum}</span>
                        {d.status !== 'none' ? (
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${statusBg(d.status)}`}>
                            <StatusBadge status={d.status} />
                          </span>
                        ) : (
                          <span className="h-6 w-6" />
                        )}
                        {d.otHours > 0 && <span className="text-[9px] font-bold text-brand-600">OT</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                {daysWithData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">Chưa có dữ liệu.</p>
                ) : (
                  <div className="space-y-2">
                    {daysWithData.map((d) => (
                      <div key={d.date} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <p className="mb-1.5 text-xs font-medium text-gray-400">{formatDayHeading(d.date)}</p>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-gray-700">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${statusBg(d.status)}`}>
                              <StatusBadge status={d.status} />
                            </span>
                            {d.status === 'nghi' ? 'Nghỉ phép' : 'Ca hành chính'}
                          </span>
                          {(d.checkIn || d.checkOut) && (
                            <span className="text-sm text-gray-500">
                              {d.checkIn ?? '--'} - {d.checkOut ?? '--'}
                            </span>
                          )}
                        </div>
                        {d.otHours > 0 && (
                          <p className="mt-1.5 text-xs font-bold text-brand-600">OT {d.otHours} giờ</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
