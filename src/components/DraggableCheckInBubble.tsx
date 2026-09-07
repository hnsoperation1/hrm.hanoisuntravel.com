'use client'

import { useEffect, useRef, useState } from 'react'
import { Fingerprint, X } from 'lucide-react'

const HIDE_KEY = 'hrm_checkin_bubble_hidden'
const BUBBLE_SIZE = 64
const RIGHT_MARGIN = 20
const BOTTOM_OFFSET = 110 // cách đáy màn hình, đủ cao để nổi rõ trên thanh nav
const DRAG_THRESHOLD = 6 // px — vượt ngưỡng này mới tính là kéo, không phải bấm

type Props = {
  color: 'brand' | 'accent'
  onActivate: () => void
}

/**
 * Bong bóng chấm công nổi, kéo-thả được — thả vào vùng dấu X ở đáy màn hình
 * để ẩn đi. Trạng thái ẩn lưu ở sessionStorage nên chỉ mất khi đóng hẳn tab
 * và mở lại (khác localStorage — tồn tại mãi, và khác state component — mất
 * ngay khi rời trang).
 */
export function DraggableCheckInBubble({ color, onActivate }: Props) {
  const [ready, setReady] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [overDelete, setOverDelete] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)
  const wasDraggedRef = useRef(false)
  const deleteZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let hiddenNow = false
    try {
      hiddenNow = sessionStorage.getItem(HIDE_KEY) === '1'
    } catch {}
    setHidden(hiddenNow)
    setPos({
      x: window.innerWidth - BUBBLE_SIZE - RIGHT_MARGIN,
      y: window.innerHeight - BUBBLE_SIZE - BOTTOM_OFFSET,
    })
    setReady(true)
  }, [])

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      d.moved = true
      setDragging(true)
    }
    if (!d.moved) return

    const nx = d.origX + dx
    const ny = d.origY + dy
    setPos({ x: nx, y: ny })

    const zone = deleteZoneRef.current?.getBoundingClientRect()
    if (zone) {
      const cx = nx + BUBBLE_SIZE / 2
      const cy = ny + BUBBLE_SIZE / 2
      setOverDelete(cx >= zone.left && cx <= zone.right && cy >= zone.top && cy <= zone.bottom)
    }
  }

  function handlePointerUp() {
    const d = dragRef.current
    dragRef.current = null
    setDragging(false)
    wasDraggedRef.current = !!d?.moved

    if (d?.moved && overDelete) {
      setHidden(true)
      try {
        sessionStorage.setItem(HIDE_KEY, '1')
      } catch {}
    }
    setOverDelete(false)
  }

  function handleClick() {
    // Vừa kéo xong thì bỏ qua click "ảo" mà trình duyệt tự bắn sau pointerup
    // — không thì vừa thả ra là mở luôn wizard, dù ý người dùng là kéo/thả.
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false
      return
    }
    onActivate()
  }

  if (!ready || hidden) return null

  const colorClasses =
    color === 'brand'
      ? { bg: 'bg-brand-500 hover:bg-brand-600', ping: 'bg-brand-400' }
      : { bg: 'bg-accent-500 hover:bg-accent-600', ping: 'bg-accent-400' }

  return (
    <>
      {dragging && (
        <div
          ref={deleteZoneRef}
          className={`fixed inset-x-0 bottom-0 z-40 flex h-28 items-start justify-center pt-6 transition-colors ${
            overDelete ? 'bg-red-500/90' : 'bg-black/40'
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform ${
              overDelete ? 'scale-125 bg-white/25' : 'bg-white/10'
            }`}
          >
            <X size={26} className="text-white" />
          </div>
        </div>
      )}

      <div
        className="fixed z-50 h-16 w-16 touch-none select-none"
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {!dragging && <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${colorClasses.ping}`} />}
        <button
          type="button"
          onClick={handleClick}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition-colors ${colorClasses.bg}`}
        >
          <Fingerprint size={26} />
        </button>
      </div>
    </>
  )
}
