'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, MapPin, ClipboardList, Clock, ScanFace, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/auth'

// Danh sách đường dẫn "màn cấp 1" (top-level) — vào thẳng từ thanh điều
// hướng dưới đáy. AppShell dùng chung danh sách này để biết khi nào hiện
// thanh này (đúng như app di động thật, vd MISA: thanh dưới chỉ hiện ở màn
// gốc của từng tab, vào màn con thì thanh biến mất, nhường chỗ cho header
// riêng của màn con đó — không phải khung cố định bất biến toàn app).
export const BOTTOM_NAV_PATHS = [
  '/',
  '/dang-ky-khuon-mat',
  '/admin/dia-diem',
  '/admin/yeu-cau-cham-cong',
  '/admin/bao-cao',
]

// Thanh điều hướng dưới đáy, kiểu app di động — thay cho Topbar cũ (luôn
// hiện cố định phía trên). App đang chuẩn bị chuyển sang tên miền riêng
// chuyên cho mobile, nên bố cục chuyển theo hướng "mobile-first": điều hướng
// chính nằm ở đáy màn hình, còn thanh trên (nếu có) là việc riêng của từng
// trang — trang nào cần mới tự hiện, không còn là khung cố định toàn cục nữa.
export function BottomNav() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const isAdmin = user?.is_super_admin || user?.is_boss

  const items = [
    { href: '/', label: 'Chấm công', Icon: Clock },
    { href: '/dang-ky-khuon-mat', label: 'Khuôn mặt', Icon: ScanFace },
    ...(isAdmin
      ? [
          { href: '/admin/dia-diem', label: 'Địa điểm', Icon: MapPin },
          { href: '/admin/yeu-cau-cham-cong', label: 'Cài đặt', Icon: SlidersHorizontal },
          { href: '/admin/bao-cao', label: 'Báo cáo', Icon: ClipboardList },
        ]
      : []),
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
              active ? 'text-accent-500' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon size={20} className="shrink-0" />
            {label}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={logout}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-gray-400 transition-colors hover:text-red-500"
      >
        <LogOut size={20} className="shrink-0" />
        Đăng xuất
      </button>
    </nav>
  )
}
