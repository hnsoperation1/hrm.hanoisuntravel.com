'use client'

import Link from 'next/link'
import { ChevronRight, FileText, Info, LogOut, Phone, Settings, UserCircle2, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

function Row({ href, label, Icon, onClick }: { href?: string; label: string; Icon: LucideIcon; onClick?: () => void }) {
  const content = (
    <>
      <Icon size={18} className="shrink-0 text-brand-500" />
      <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
      <ChevronRight size={16} className="shrink-0 text-gray-300" />
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50">
        {content}
      </button>
    )
  }
  return (
    <Link href={href!} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
      {content}
    </Link>
  )
}

// Màn "Tài khoản" — bố cục theo mẫu app thẻ thành viên (thẻ hồ sơ màu chủ
// đạo ở trên + danh sách menu bên dưới), nhưng dùng màu theme HNS thay vì
// teal, và bỏ phần hạng thành viên (không áp dụng cho app chấm công nội bộ).
export default function TaiKhoanPage() {
  const { user, logout } = useAuth()

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <div className="flex items-center gap-3 rounded-2xl bg-brand-500 p-5 text-white shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <UserCircle2 size={28} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold">{user?.full_name}</p>
          <p className="truncate text-sm text-white/80">{user?.email}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <Row href="/cai-dat" label="Cài đặt" Icon={Settings} />
        <Row href="/dieu-khoan-chinh-sach" label="Điều khoản & chính sách" Icon={FileText} />
        <Row href="/lien-he" label="Liên hệ" Icon={Phone} />
        <Row href="/thong-tin-ung-dung" label="Thông tin ứng dụng" Icon={Info} />
        <Row label="Đăng xuất" Icon={LogOut} onClick={logout} />
      </div>
    </div>
  )
}
