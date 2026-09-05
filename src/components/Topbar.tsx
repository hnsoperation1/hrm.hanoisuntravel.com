'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, MapPin, ClipboardList, Clock, ScanFace, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/auth'

export function Topbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const isAdmin = user?.is_super_admin || user?.is_boss

  const navItem = (href: string, label: string, Icon: typeof Clock) => (
    <Link
      href={href}
      title={label}
      className={clsx(
        'flex shrink-0 items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors sm:px-3',
        pathname === href
          ? 'bg-accent-500 text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
      )}
    >
      <Icon size={15} className="shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )

  return (
    <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-200 bg-white sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-4">
        <div className="shrink-0 font-black text-base tracking-wide sm:text-lg">
          <span className="text-accent-500">HNS</span>
          <span className="text-brand-600"> HRM</span>
        </div>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navItem('/', 'Chấm công', Clock)}
          {navItem('/dang-ky-khuon-mat', 'Khuôn mặt', ScanFace)}
          {isAdmin && navItem('/admin/dia-diem', 'Địa điểm', MapPin)}
          {isAdmin && navItem('/admin/yeu-cau-cham-cong', 'Yêu cầu', SlidersHorizontal)}
          {isAdmin && navItem('/admin/bao-cao', 'Báo cáo', ClipboardList)}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-gray-500 hidden md:inline">{user?.full_name}</span>
        <button
          onClick={logout}
          title="Đăng xuất"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} className="shrink-0" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  )
}
