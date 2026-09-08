import { Mail, Phone } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

// Placeholder — chưa có thông tin liên hệ chính thức (email/hotline hỗ trợ).
export default function LienHePage() {
  return (
    <div>
      <PageHeader title="Liên hệ" />
      <div className="mx-auto max-w-md space-y-3 px-4 py-6">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <Phone size={18} className="shrink-0 text-brand-500" />
          <div>
            <p className="text-sm font-bold text-gray-800">Hotline hỗ trợ</p>
            <p className="text-xs text-gray-400">Đang cập nhật</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <Mail size={18} className="shrink-0 text-brand-500" />
          <div>
            <p className="text-sm font-bold text-gray-800">Email hỗ trợ</p>
            <p className="text-xs text-gray-400">Đang cập nhật</p>
          </div>
        </div>
      </div>
    </div>
  )
}
