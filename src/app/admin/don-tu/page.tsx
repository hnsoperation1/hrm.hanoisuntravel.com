'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { PageHeader } from '@/components/PageHeader'
import { LEAVE_REQUEST_FIELDS, LEAVE_REQUEST_TITLES, type LeaveRequestType } from '@/lib/leaveRequestParser'
import { LEAVE_REQUEST_STATUS_COLORS, LEAVE_REQUEST_STATUS_LABELS } from '@/lib/leaveRequestDisplay'

type LeaveRequest = {
  requestNo: number
  type: LeaveRequestType
  fields: Record<string, string>
  status: string
  requesterName: string
  rawText: string
  createdAt: string
}

export default function AdminDonTuPage() {
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.is_super_admin || user?.is_boss

  const [requests, setRequests] = useState<LeaveRequest[] | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/leave-requests')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRequests(data?.requests ?? []))
  }, [])

  if (authLoading) return null
  if (!isAdmin) {
    return <div className="p-8 text-center text-sm text-gray-500">Chỉ Super Admin hoặc Boss mới truy cập được trang này.</div>
  }

  return (
    <div>
      <PageHeader title="Đơn từ (quản trị)" />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-4 text-xs text-gray-400">
          Xem lại toàn bộ đơn từ trong hệ thống — nộp/sửa/hủy/duyệt vẫn thao tác trực tiếp qua Telegram, trang này chỉ
          để đối chiếu.
        </p>

        {requests === null ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Chưa có đơn từ nào.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const isOpen = expanded === r.requestNo
              return (
                <div key={r.requestNo} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{LEAVE_REQUEST_TITLES[r.type]}</p>
                      <p className="text-xs text-gray-400">{r.requesterName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${LEAVE_REQUEST_STATUS_COLORS[r.status]}`}>
                      {LEAVE_REQUEST_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-sm text-gray-600">
                    {LEAVE_REQUEST_FIELDS[r.type].map((f) => (
                      <p key={f.key}>
                        {f.label}: {r.fields[f.key]?.trim() || '(chưa rõ)'}
                      </p>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('vi-VN')}</p>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.requestNo)}
                    className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    Tin nhắn gốc {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {isOpen && <p className="mt-1.5 rounded-lg bg-gray-50 p-2 text-xs text-gray-500">{r.rawText}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
