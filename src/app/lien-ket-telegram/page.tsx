'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send, CheckCircle2 } from 'lucide-react'

type LinkCodeResponse = {
  code: string
  expiresInMinutes: number
  botUsername: string | null
}

export default function LienKetTelegramPage() {
  const [linked, setLinked] = useState<boolean | null>(null)
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null)
  const [result, setResult] = useState<LinkCodeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/telegram/link-code')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLinked(data.linked)
          setTelegramUsername(data.telegramUsername)
        }
      })
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/telegram/link-code', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Không tạo được mã')
      return
    }
    setResult(data)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Send size={26} className="text-brand-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-1">Liên kết Telegram</h1>
        <p className="text-sm text-gray-500 mb-6">
          Chấm công qua bot Telegram, không cần mở trình duyệt — chỉ cần bấm 1 nút chia sẻ vị trí.
        </p>

        {linked && (
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3">
            <CheckCircle2 size={16} />
            Đã liên kết{telegramUsername ? ` với @${telegramUsername}` : ''}
          </div>
        )}

        {!result ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-xl"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {linked ? 'Tạo mã liên kết lại (đổi tài khoản Telegram)' : 'Tạo mã liên kết'}
          </button>
        ) : (
          <div className="space-y-3 text-left">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Mã liên kết của bạn</p>
              <p className="text-3xl font-black tracking-widest text-gray-800">{result.code}</p>
              <p className="text-xs text-gray-400 mt-1">Hết hạn sau {result.expiresInMinutes} phút</p>
            </div>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 bg-gray-50 rounded-xl p-4">
              <li>
                Mở Telegram, tìm bot{' '}
                {result.botUsername ? (
                  <a
                    href={`https://t.me/${result.botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 font-semibold"
                  >
                    @{result.botUsername}
                  </a>
                ) : (
                  <span className="font-semibold">HNS HRM Bot</span>
                )}
              </li>
              <li>
                Gửi lệnh: <code className="bg-white border border-gray-200 rounded px-1.5 py-0.5">/link {result.code}</code>
              </li>
              <li>Bot xác nhận xong là chấm công được ngay bằng nút chia sẻ vị trí.</li>
            </ol>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
