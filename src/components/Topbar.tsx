'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, MapPin, ClipboardList, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/auth'

export function Topbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const isAdmin = user?.is_super_admin || user?.is_boss

  const navItem = (href: string, label: string, Icon: typeof Clock) => (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        pathname === href
          ? 'bg-accent-500 text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
      )}
    >
      <Icon size={15} />
      {label}
    </Link>
  )

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-4">
        <div className="font-black text-lg tracking-wide">
          <span className="text-accent-500">HNS</span>
          <span className="text-brand-600"> HRM</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItem('/', 'Chấm công', Clock)}
          {isAdmin && navItem('/admin/dia-diem', 'Địa điểm', MapPin)}
          {isAdmin && navItem('/admin/bao-cao', 'Báo cáo', ClipboardList)}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:inline">{user?.full_name}</span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </header>
  )
}
