'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { LEAVE_REQUEST_FIELDS, LEAVE_REQUEST_TITLES, type LeaveRequestType } from '@/lib/leaveRequestParser'
import { LEAVE_REQUEST_STATUS_COLORS, LEAVE_REQUEST_STATUS_LABELS } from '@/lib/leaveRequestDisplay'

type LeaveRequest = {
  requestNo: number
  type: LeaveRequestType
  fields: Record<string, string>
  status: string
  managerName: string | null
  createdAt: string
}

export default function DonTuPage() {
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null)

  useEffect(() => {
    fetch('/api/attendance/leave-requests')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRequests(data?.requests ?? []))
  }, [])

  return (
    <div>
      <PageHeader title="Đơn từ" />
      <div className="mx-auto max-w-md px-4 py-6">
        <p className="mb-4 text-xs text-gray-400">
          Gửi đơn xin nghỉ/đi muộn/về sớm/làm online/công tác bằng cách nhắn trong nhóm HCNS trên Telegram — trang này
          chỉ để xem lại, không nộp/sửa/hủy được ở đây.
        </p>

        {requests === null ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">Chưa có đơn từ nào.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.requestNo} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-800">{LEAVE_REQUEST_TITLES[r.type]}</p>
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
                <p className="mt-2 text-xs text-gray-400">
                  {r.managerName ? `Quản lý trực tiếp: ${r.managerName} · ` : ''}
                  {new Date(r.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
