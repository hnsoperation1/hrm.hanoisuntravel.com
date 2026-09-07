'use client'

import { useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'

const BREAKPOINT = 768 // trùng breakpoint "md" của Tailwind

// App này thiết kế ưu tiên cho di động (mobile-first) — trên màn hình rộng
// (PC/laptop) vẫn dùng được nhưng bố cục không tối ưu, nên nhắc và trỏ sang
// bản web riêng cho trải nghiệm đầy đủ hơn.
export function DesktopNotice() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    function check() {
      setIsDesktop(window.innerWidth >= BREAKPOINT)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isDesktop) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-2.5 text-center text-sm text-brand-700">
      <span className="flex items-center gap-2">
        <Monitor size={16} className="shrink-0" />
        Ứng dụng này được thiết kế ưu tiên cho di động.
      </span>
      <a
        href="https://web.ihns.vn"
        className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-600"
      >
        Trải nghiệm đầy đủ tại web.ihns.vn
      </a>
    </div>
  )
}
