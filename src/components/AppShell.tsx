'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { BottomNav, BOTTOM_NAV_PATHS } from './BottomNav'

// App này chỉ dành cho mobile (kể cả khi mở trên PC) — mọi trạng thái (đang
// tải, login, đã đăng nhập) đều bọc trong 1 cột rộng bằng điện thoại, căn
// giữa màn hình, thay vì kéo giãn hết chiều ngang cửa sổ trình duyệt desktop.
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen justify-center bg-gray-300">
      <div className="flex h-screen w-full max-w-md flex-col overflow-hidden bg-gray-50 shadow-xl">{children}</div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (loading) return
    if (!user && !isLoginPage) router.replace('/login')
    if (user && isLoginPage) router.replace('/')
  }, [user, loading, isLoginPage, router])

  if (loading || (!user && !isLoginPage)) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="font-black text-2xl tracking-wide">
              <span className="text-accent-500">HNS</span>
              <span className="text-brand-600"> HRM</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-400"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      </PhoneFrame>
    )
  }

  if (isLoginPage) return <PhoneFrame>{children}</PhoneFrame>

  // Thanh điều hướng dưới đáy CHỈ hiện ở các màn cấp 1 (trong BOTTOM_NAV_PATHS)
  // — giống app di động thật (MISA...): vào màn con thì thanh này tự biến
  // mất, nhường chỗ cho header riêng (PageHeader) của màn con đó tự quyết
  // định hiển thị gì, không phải khung cố định bất biến toàn app.
  const showBottomNav = BOTTOM_NAV_PATHS.includes(pathname)

  return (
    <PhoneFrame>
      <main className="flex-1 overflow-y-auto">{children}</main>
      {showBottomNav && <BottomNav />}
    </PhoneFrame>
  )
}
