'use client'

import { useEffect, useState, use } from 'react'
import { Loader2, MonitorSmartphone } from 'lucide-react'

type ViewState =
  | { step: 'loading' }
  | { step: 'error'; message: string }
  | { step: 'confirm'; deviceLabel: string; createdAt: string }
  | { step: 'done'; approved: boolean }

export default function XacNhanDangNhapPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const [state, setState] = useState<ViewState>({ step: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/qr/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setState({ step: 'error', message: data.error ?? 'Mã QR đã hết hạn hoặc không hợp lệ' })
          return
        }
        setState({ step: 'confirm', deviceLabel: data.deviceLabel ?? 'Thiết bị không rõ', createdAt: data.createdAt })
      })
      .catch(() => setState({ step: 'error', message: 'Có lỗi xảy ra, thử lại nhé' }))
  }, [sessionId])

  async function respond(approve: boolean) {
    if (submitting) return
    setSubmitting(true)
    const res = await fetch('/api/auth/qr/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, approve }),
    })
    setSubmitting(false)
    if (res.ok) setState({ step: 'done', approved: approve })
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <MonitorSmartphone size={40} className="text-brand-500" />

      {state.step === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Đang kiểm tra mã...
        </div>
      )}

      {state.step === 'error' && <p className="text-sm text-red-500">{state.message}</p>}

      {state.step === 'confirm' && (
        <>
          <div>
            <p className="text-base font-bold text-gray-800">Xác nhận đăng nhập?</p>
            <p className="mt-1 text-sm text-gray-500">
              Thiết bị: {state.deviceLabel}
              <br />
              Lúc: {new Date(state.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex w-full max-w-xs gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => respond(false)}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 disabled:opacity-50"
            >
              Từ chối
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => respond(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Đồng ý
            </button>
          </div>
        </>
      )}

      {state.step === 'done' && (
        <p className="text-sm font-medium text-gray-700">
          {state.approved ? '✅ Đã xác nhận — quay lại máy tính để tiếp tục.' : '❌ Đã từ chối đăng nhập.'}
        </p>
      )}
    </div>
  )
}
