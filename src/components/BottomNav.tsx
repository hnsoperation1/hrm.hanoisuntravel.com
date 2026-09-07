'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Home, LayoutGrid, Menu as MenuIcon } from 'lucide-react'
import clsx from 'clsx'

// Danh sách đường dẫn "màn cấp 1" (top-level) — vào thẳng từ thanh điều
// hướng dưới đáy. AppShell dùng chung danh sách này để biết khi nào hiện
// thanh này (đúng như app di động thật, vd MISA: thanh dưới chỉ hiện ở màn
// gốc của từng tab, vào màn con thì thanh biến mất, nhường chỗ cho header
// riêng của màn con đó — không phải khung cố định bất biến toàn app). Các
// tính năng/cài đặt khác (khuôn mặt, địa điểm, yêu cầu chấm công, báo cáo)
// đều là màn con, vào từ /menu hoặc /cai-dat.
export const BOTTOM_NAV_PATHS = ['/', '/menu', '/thong-bao', '/cai-dat']

const items = [
  { href: '/', label: 'Trang chủ', Icon: Home },
  { href: '/menu', label: 'Menu', Icon: LayoutGrid },
  { href: '/thong-bao', label: 'Thông báo', Icon: Bell },
  { href: '/cai-dat', label: 'Cài đặt', Icon: MenuIcon },
]

// Thanh điều hướng dưới đáy, nền trắng kiểu Facebook — icon/chữ mặc định
// màu đen, tab đang chọn (hoặc hover chuột trên PC) chuyển màu cam + đậm lên.
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-3 transition-colors',
              active ? 'text-accent-500' : 'text-gray-900 hover:text-accent-500',
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
            <span className={clsx('text-[11px] transition-all', active ? 'font-bold' : 'font-medium')}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
