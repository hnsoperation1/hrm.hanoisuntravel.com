import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

// Placeholder — chưa có nội dung điều khoản/chính sách chính thức.
export default function DieuKhoanChinhSachPage() {
  return (
    <div>
      <PageHeader title="Điều khoản & chính sách" />
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <FileText size={24} className="text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-700">Nội dung đang được cập nhật</p>
        <p className="mt-1 text-xs text-gray-400">Điều khoản sử dụng & chính sách bảo mật sẽ hiển thị tại đây.</p>
      </div>
    </div>
  )
}
