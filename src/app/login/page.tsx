'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    <div className="flex h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-black text-4xl tracking-wide">
            <span className="text-brand-600">i</span>
            <span className="text-accent-500">HNS</span>
          </div>
          <p className="text-base text-gray-400 mt-2">Hanoi Sun Travel Staff App</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="ten@hanoisuntravel.com"
            />
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Mật khẩu"
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3.5 pr-11 focus:outline-none focus:ring-2 focus:ring-brand-400"
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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white py-3.5 rounded-xl text-sm font-bold transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Đăng nhập
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">Hoặc đăng nhập với</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Chỉ mới thêm giao diện — chưa nối logic OAuth thật, bấm chưa có tác dụng. */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled
            title="Sắp ra mắt"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24Z"
              />
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.99-3.11Z" />
              <path
                fill="#EA4335"
                d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l3.99 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
              />
            </svg>
          </button>
          <button
            type="button"
            disabled
            title="Sắp ra mắt"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.462 2.098-1.14 2.822-.79.845-2.087 1.516-3.106 1.443-.132-1.116.428-2.29 1.116-3.02.79-.86 2.157-1.51 3.13-1.245Zm2.63 15.607c-.383.883-.566 1.278-1.06 2.058-.69 1.09-1.664 2.448-2.87 2.46-1.073.012-1.35-.7-2.807-.688-1.456.012-1.76.7-2.833.688-1.207-.012-2.13-1.24-2.82-2.328-1.936-3.02-2.14-6.567-.945-8.45.848-1.334 2.19-2.117 3.452-2.117 1.284 0 2.09.7 3.153.7 1.03 0 1.652-.7 3.13-.7 1.122 0 2.31.61 3.157 1.664-2.775 1.522-2.326 5.485.443 6.713Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
