'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  /** Nội dung tuỳ chỉnh bên phải header (icon hành động...) */
  right?: ReactNode
  /** Đường lùi khi bấm nút back — mặc định gọi router.back(). */
  onBack?: () => void
}

// Header cho MÀN CON (drill-down) — chỉ dùng ở những trang KHÔNG có trong
// BOTTOM_NAV_PATHS, vì AppShell tự ẩn thanh điều hướng dưới đáy ở các trang
// đó và nhường không gian cho header riêng này (nút back + tiêu đề), giống
// cách các app di động thật (vd MISA) chuyển từ tab-bar sang header khi đi
// sâu vào 1 màn chi tiết.
export function PageHeader({ title, right, onBack }: Props) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3">
      <button
        type="button"
        onClick={onBack ?? (() => router.back())}
        className="flex shrink-0 items-center justify-center rounded-full p-1 text-gray-600 hover:bg-gray-100"
      >
        <ChevronLeft size={22} />
      </button>
      <h1 className="flex-1 truncate text-lg font-bold text-gray-800">{title}</h1>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
