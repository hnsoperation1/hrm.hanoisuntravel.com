'use client'

import { useEffect, useState } from 'react'
import { ScanFace, CheckCircle2, Loader2 } from 'lucide-react'
import { FaceCapture } from '@/components/FaceCapture'

export default function DangKyKhuonMatPage() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function loadStatus() {
    fetch('/api/face/enroll')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setEnrolled(data.enrolled)
          setEnrolledAt(data.enrolledAt)
        }
      })
  }

  useEffect(loadStatus, [])

  async function handleCapture(embedding: number[]) {
    setCapturing(false)
    setSaving(true)
    setError('')
    const res = await fetch('/api/face/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Không lưu được')
      return
    }
    loadStatus()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <ScanFace size={26} className="text-brand-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-1">Đăng ký khuôn mặt</h1>
        <p className="text-sm text-gray-500 mb-6">
          Dùng để xác thực đúng người mỗi lần chấm công. Xử lý hoàn toàn trên thiết bị của bạn — không gửi ảnh lên
          server, chỉ gửi 1 dãy số đặc trưng khuôn mặt.
        </p>

        {enrolled && (
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3">
            <CheckCircle2 size={16} />
            Đã đăng ký {enrolledAt ? `lúc ${new Date(enrolledAt).toLocaleString('vi-VN')}` : ''}
          </div>
        )}

        <button
          onClick={() => setCapturing(true)}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-xl"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <ScanFace size={14} />}
          {enrolled ? 'Đăng ký lại (chụp ảnh mới)' : 'Bắt đầu đăng ký'}
        </button>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>

      {capturing && <FaceCapture onCapture={handleCapture} onCancel={() => setCapturing(false)} />}
    </div>
  )
}
