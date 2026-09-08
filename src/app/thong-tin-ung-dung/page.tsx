import { PageHeader } from '@/components/PageHeader'

export default function ThongTinUngDungPage() {
  return (
    <div>
      <PageHeader title="Thông tin ứng dụng" />
      <div className="mx-auto max-w-md px-4 py-8 text-center">
        <div className="text-2xl font-black tracking-wide">
          <span className="text-brand-600">i</span>
          <span className="text-accent-500">HNS</span>
        </div>
        <p className="mt-1 text-sm text-gray-400">Hanoi Sun Travel Staff App</p>
        <p className="mt-6 text-xs text-gray-400">Phiên bản 1.0.0</p>
        <p className="mt-1 text-xs text-gray-400">© {new Date().getFullYear()} Hanoi Sun Travel</p>
      </div>
    </div>
  )
}
