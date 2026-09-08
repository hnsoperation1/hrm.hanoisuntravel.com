'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Fingerprint, Home, LayoutGrid, User, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useAttendance } from '@/contexts/attendance'

// Danh sách đường dẫn "màn cấp 1" (top-level) — vào thẳng từ thanh điều
// hướng dưới đáy. AppShell dùng chung danh sách này để biết khi nào hiện
// thanh này (đúng như app di động thật, vd MISA: thanh dưới chỉ hiện ở màn
// gốc của từng tab, vào màn con thì thanh biến mất, nhường chỗ cho header
// riêng của màn con đó — không phải khung cố định bất biến toàn app).
export const BOTTOM_NAV_PATHS = ['/', '/menu', '/thong-bao', '/tai-khoan']

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
// thay vì chỉ đổi màu suông. Nút giữa là hành động Chấm công CỐ ĐỊNH, nổi cao
// hơn hẳn các icon còn lại (giống mẫu app thẻ thành viên) — bấm được từ MỌI
// trang chứ không riêng Trang chủ, nên đọc trạng thái từ AttendanceProvider
// (context dùng chung, xem contexts/attendance.tsx) thay vì props cục bộ.
export function BottomNav() {
  const pathname = usePathname()
  const { status, isCheckIn, requestCheckInOut } = useAttendance()
  const dayComplete = status?.dayComplete ?? false

  function renderItem({ href, label, Icon }: (typeof leftItems)[number]) {
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
        <Icon size={22} strokeWidth={active ? 2.5 : 2} fill={active ? 'currentColor' : 'none'} className="shrink-0" />
        <span className={clsx('text-[11px] transition-all', active ? 'font-bold' : 'font-medium')}>{label}</span>
      </Link>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {leftItems.map(renderItem)}

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={requestCheckInOut}
          disabled={!status || dayComplete}
          className={clsx(
            '-mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition-colors disabled:opacity-50',
            isCheckIn ? 'bg-brand-500 hover:bg-brand-600' : 'bg-accent-500 hover:bg-accent-600',
          )}
        >
          <Fingerprint size={24} />
        </button>
      </div>

      {rightItems.map(renderItem)}
    </nav>
  )
}
