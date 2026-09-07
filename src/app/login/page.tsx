'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // DEBUG TẠM THỜI — điều tra vụ Chrome mobile bị đăng xuất khi reload còn
  // Safari thì không. Chỉ hiện TÊN cookie (không hiện giá trị) để xem cookie
  // "sb-...-auth-token" có thực sự tồn tại lúc quay lại trang login hay
  // không. XOÁ đoạn này sau khi xác định được nguyên nhân.
  const [debugCookies, setDebugCookies] = useState('')
  useEffect(() => {
    const names = document.cookie
      .split(';')
      .map((c) => c.split('=')[0].trim())
      .filter(Boolean)
    setDebugCookies(names.length > 0 ? names.join(', ') : '(không có cookie nào)')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    const err = await login(email, password)
    if (err) setError(err)
    setSubmitting(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="font-black text-2xl tracking-wide">
            <span className="text-accent-500">HNS</span>
            <span className="text-brand-600"> HRM</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Đăng nhập chấm công</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="ten@hanoisuntravel.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 pr-11 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Đăng nhập
          </button>
        </form>

        {/* DEBUG TẠM THỜI — xoá sau khi điều tra xong vụ Chrome mobile */}
        <p className="mt-4 break-all text-center text-[10px] text-gray-300">Cookies: {debugCookies}</p>
      </div>
    </div>
  )
}
