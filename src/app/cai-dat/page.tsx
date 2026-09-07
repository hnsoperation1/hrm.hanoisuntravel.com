'use client'

import Link from 'next/link'
import { ChevronRight, LogOut, MapPin, ScanFace, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

function Row({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
      <Icon size={18} className="shrink-0 text-brand-500" />
      <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
      <ChevronRight size={16} className="shrink-0 text-gray-300" />
    </Link>
  )
}

// Màn "Cài đặt" — gom TẤT CẢ các trang cấu hình (địa điểm, yêu cầu chấm công
// theo nhân viên + ngưỡng khớp khuôn mặt chung) vào 1 chỗ, thay vì mỗi cái
// một mục riêng trên thanh điều hướng dưới đáy. Đăng xuất cũng chuyển về đây
// vì không còn nằm trên thanh dưới đáy nữa (chỉ còn đúng 3 mục cố định).
export default function CaiDatPage() {
  const { user, logout } = useAuth()
  const isAdmin = user?.is_super_admin || user?.is_boss

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <h1 className="text-lg font-bold text-gray-800">Cài đặt</h1>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <Row href="/dang-ky-khuon-mat" label="Khuôn mặt" Icon={ScanFace} />
      </div>

      {isAdmin && (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <Row href="/admin/dia-diem" label="Địa điểm chấm công" Icon={MapPin} />
          <Row href="/admin/yeu-cau-cham-cong" label="Yêu cầu chấm công theo nhân viên" Icon={SlidersHorizontal} />
        </div>
      )}

      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
      >
        <LogOut size={16} />
        Đăng xuất
      </button>
    </div>
  )
}
