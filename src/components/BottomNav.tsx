'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Fingerprint, Home, LayoutGrid, User, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'

// Danh sách đường dẫn "màn cấp 1" (top-level) — vào thẳng từ thanh điều
// hướng dưới đáy. AppShell dùng chung danh sách này để biết khi nào hiện
// thanh này (đúng như app di động thật, vd MISA: thanh dưới chỉ hiện ở màn
// gốc của từng tab, vào màn con thì thanh biến mất, nhường chỗ cho header
// riêng của màn con đó — không phải khung cố định bất biến toàn app).
export const BOTTOM_NAV_PATHS = ['/', '/menu', '/cham-cong', '/thong-bao', '/tai-khoan']

const leftItems: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/', label: 'Trang chủ', Icon: Home },
  { href: '/menu', label: 'Menu', Icon: LayoutGrid },
]

const rightItems: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/thong-bao', label: 'Thông báo', Icon: Bell },
  { href: '/tai-khoan', label: 'Tài khoản', Icon: User },
]

// Thanh điều hướng dưới đáy, nền trắng — icon mặc định chỉ viền (fill="none"),
// tab đang chọn (hoặc hover chuột trên PC) chuyển cam + ĐẶC (fill="currentColor")
// thay vì chỉ đổi màu suông. Nút giữa CHỈ LÀ LINK tĩnh sang /cham-cong — không
// phải hành động chấm công, nên không cần trạng thái gì, luôn hiện y hệt
// nhau. /cham-cong hiện đang giống hệt Trang chủ (card chấm công + dữ liệu
// chấm công) vì Trang chủ sau này sẽ đổi sang nội dung khác.
export function BottomNav() {
  const pathname = usePathname()

  function renderItem({ href, label, Icon }: (typeof leftItems)[number]) {
    const active = pathname === href
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          'flex flex-1 flex-col items-center justify-center gap-1 pt-3 pb-5 transition-colors',
          active ? 'text-accent-500' : 'text-gray-900 hover:text-accent-500',
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.5 : 2} fill={active ? 'currentColor' : 'none'} className="shrink-0" />
        <span className={clsx('text-[11px] transition-all', active ? 'font-bold' : 'font-medium')}>{label}</span>
      </Link>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {leftItems.map(renderItem)}

      <div className="flex flex-1 items-center justify-center pb-3">
        <Link
          href="/cham-cong"
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg ring-4 ring-white transition-colors hover:bg-brand-600"
        >
          <Fingerprint size={24} />
        </Link>
      </div>

      {rightItems.map(renderItem)}
    </nav>
  )
}
