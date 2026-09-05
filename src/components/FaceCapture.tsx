'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, ScanFace, X } from 'lucide-react'
import { loadFaceModels, quickDetectFace, extractFaceEmbedding } from '@/lib/face'

// Số lần liên tiếp phải thấy mặt trước khi tự chụp — tránh chụp nhầm lúc
// khuôn mặt mới thoáng qua khung hình (rung tay, đưa điện thoại lên).
const STABLE_DETECTIONS_REQUIRED = 3
const POLL_INTERVAL_MS = 350

type Props = {
  onCapture: (embedding: number[]) => void
  onCancel: () => void
  title?: string
}

export function FaceCapture({ onCapture, onCancel, title = 'Đưa khuôn mặt vào khung hình' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stableCountRef = useRef(0)
  const busyRef = useRef(false)
  // 'error' ở đây CHỈ dùng cho lỗi camera/model không có đường lùi (không mở
  // được camera) — thất bại khi trích đặc trưng chỉ là hint tạm thời, vòng
  // quét vẫn tiếp tục chạy ngầm để tự thử lại, không được để chết hẳn.
  const [status, setStatus] = useState<'loading' | 'searching' | 'found' | 'processing' | 'error'>('loading')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let hintTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    async function init() {
      try {
        await loadFaceModels()
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('searching')

        pollTimer = setInterval(async () => {
          if (busyRef.current || !videoRef.current) return
          const found = await quickDetectFace(videoRef.current)
          if (cancelled) return
          if (found) {
            stableCountRef.current += 1
            setStatus('found')
            if (stableCountRef.current >= STABLE_DETECTIONS_REQUIRED) {
              busyRef.current = true
              setStatus('processing')
              const embedding = videoRef.current ? await extractFaceEmbedding(videoRef.current) : null
              if (cancelled) return
              if (embedding) {
                if (pollTimer) clearInterval(pollTimer)
                onCapture(embedding)
              } else {
                // Thất bại thì quay lại tìm mặt tiếp, KHÔNG dừng vòng quét —
                // trước đây dừng hẳn ở đây khiến cả camera bị "đứng hình".
                setHint('Không trích được đặc trưng khuôn mặt, đang thử lại...')
                setStatus('searching')
                stableCountRef.current = 0
                busyRef.current = false
                if (hintTimer) clearTimeout(hintTimer)
                hintTimer = setTimeout(() => setHint(''), 2500)
              }
            }
          } else {
            stableCountRef.current = 0
            setStatus('searching')
          }
        }, POLL_INTERVAL_MS)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không mở được camera')
        setStatus('error')
      }
    }

    init()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (hintTimer) clearTimeout(hintTimer)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCancel() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-900">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover -scale-x-100" />
          {status !== 'error' && (
            <div
              className={`pointer-events-none absolute inset-6 rounded-full border-4 transition-colors ${
                status === 'found' || status === 'processing' ? 'border-green-400' : 'border-white/50'
              }`}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 min-h-[20px]">
          {status === 'loading' && (
            <>
              <Loader2 size={15} className="animate-spin" /> Đang tải model nhận diện...
            </>
          )}
          {status === 'searching' && (
            <>
              <ScanFace size={15} /> {hint || 'Đang tìm khuôn mặt...'}
            </>
          )}
          {status === 'found' && (
            <>
              <ScanFace size={15} className="text-green-500" /> Giữ yên...
            </>
          )}
          {status === 'processing' && (
            <>
              <Loader2 size={15} className="animate-spin" /> Đang xử lý...
            </>
          )}
          {status === 'error' && <span className="text-red-500">{error}</span>}
        </div>

        {status === 'error' && (
          <button
            type="button"
            onClick={handleCancel}
            className="mt-3 w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  )
}
