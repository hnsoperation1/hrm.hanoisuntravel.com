'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fingerprint, LayoutGrid, Menu as MenuIcon } from 'lucide-react'
import clsx from 'clsx'

// Danh sách đường dẫn "màn cấp 1" (top-level) — vào thẳng từ thanh điều
// hướng dưới đáy. AppShell dùng chung danh sách này để biết khi nào hiện
// thanh này (đúng như app di động thật, vd MISA: thanh dưới chỉ hiện ở màn
// gốc của từng tab, vào màn con thì thanh biến mất, nhường chỗ cho header
// riêng của màn con đó — không phải khung cố định bất biến toàn app). Các
// tính năng/cài đặt khác (khuôn mặt, địa điểm, yêu cầu chấm công, báo cáo)
// đều là màn con, vào từ /menu hoặc /cai-dat.
export const BOTTOM_NAV_PATHS = ['/', '/menu', '/cai-dat']

const items = [
  { href: '/', label: 'Chấm công', Icon: Fingerprint },
  { href: '/menu', label: 'Menu', Icon: LayoutGrid },
  { href: '/cai-dat', label: 'Cài đặt', Icon: MenuIcon },
]

// Thanh điều hướng dưới đáy, kiểu app di động — cao hơn hẳn bản cũ (giống
// MISA: icon nằm trong khối bo tròn riêng, tab đang chọn có nền màu), chỉ
// còn đúng 3 mục cố định — mọi tính năng/cài đặt khác gộp vào trong Menu và
// Cài đặt thay vì liệt kê hết ra thanh này.
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href} className="flex flex-1 flex-col items-center justify-center gap-1 py-3">
            <div
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-2xl transition-colors',
                active ? 'bg-accent-50 text-accent-500' : 'text-gray-400',
              )}
            >
              <Icon size={22} className="shrink-0" />
            </div>
            <span className={clsx('text-[11px] font-medium', active ? 'text-accent-500' : 'text-gray-400')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
