'use client'

import Link from 'next/link'
import { ChevronRight, Clock, MapPin, MessageSquareText, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { PageHeader } from '@/components/PageHeader'

function Row({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
      <Icon size={18} className="shrink-0 text-brand-500" />
      <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
      <ChevronRight size={16} className="shrink-0 text-gray-300" />
    </Link>
  )
}

// Gộp "Địa điểm chấm công" + "Yêu cầu chấm công theo nhân viên" vào 1 tính
// năng chung "Cài đặt chấm công" — trước đây 2 mục này nằm thẳng ngay trong
// Cài đặt, giờ tách thành 1 màn con riêng cho gọn.
export default function CaiDatChamCongPage() {
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.is_super_admin || user?.is_boss

  if (authLoading) return null
  if (!isAdmin) {
    return <div className="p-8 text-center text-sm text-gray-500">Chỉ Super Admin hoặc Boss mới truy cập được trang này.</div>
  }

  return (
    <div>
      <PageHeader title="Cài đặt chấm công" />
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <Row href="/admin/dia-diem" label="Địa điểm chấm công" Icon={MapPin} />
          <Row href="/admin/ca-lam-viec" label="Ca làm việc" Icon={Clock} />
          <Row href="/admin/yeu-cau-cham-cong" label="Yêu cầu chấm công theo nhân viên" Icon={SlidersHorizontal} />
          <Row href="/admin/duyet-don-tu" label="Duyệt đơn từ" Icon={MessageSquareText} />
        </div>
      </div>
    </div>
  )
}
