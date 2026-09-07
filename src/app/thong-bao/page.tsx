import { BellOff } from 'lucide-react'

// Placeholder — mới thêm mục "Thông báo" vào thanh điều hướng dưới đáy theo
// yêu cầu, CHƯA xây hệ thống thông báo thật (chưa có bảng lưu, chưa có API).
export default function ThongBaoPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <BellOff size={24} className="text-gray-400" />
      </div>
      <p className="text-sm font-bold text-gray-700">Chưa có thông báo</p>
      <p className="mt-1 text-xs text-gray-400">Tính năng thông báo đang được xây dựng.</p>
    </div>
  )
}
