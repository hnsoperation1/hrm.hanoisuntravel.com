'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { BottomNav, BOTTOM_NAV_PATHS } from './BottomNav'
import { DesktopNotice } from './DesktopNotice'

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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="font-black text-2xl tracking-wide">
            <span className="text-brand-600">i</span>
            <span className="text-accent-500">HNS</span>
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
    )
  }

  if (isLoginPage) return <>{children}</>

  // Thanh điều hướng dưới đáy CHỈ hiện ở các màn cấp 1 (trong BOTTOM_NAV_PATHS)
  // — giống app di động thật (MISA...): vào màn con thì thanh này tự biến
  // mất, nhường chỗ cho header riêng (PageHeader) của màn con đó tự quyết
  // định hiển thị gì, không phải khung cố định bất biến toàn app.
  const showBottomNav = BOTTOM_NAV_PATHS.includes(pathname)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <DesktopNotice />
      <main
        className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-[calc(env(safe-area-inset-bottom)+64px)]' : ''}`}
      >
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
