// Nhãn/màu trạng thái đơn từ dùng chung cho trang "Đơn từ" của nhân viên và
// trang quản trị của admin — tách riêng khỏi leaveRequestCard.ts (chỉ dành
// cho định dạng tin nhắn Telegram) để 2 trang UI web import mà không kéo
// theo phần inline keyboard không liên quan.

export const LEAVE_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending_requester: 'Chờ người xin xác nhận',
  pending_manager: 'Chờ quản lý trực tiếp',
  pending_admin: 'Chờ admin chấm công duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã hủy',
}

export const LEAVE_REQUEST_STATUS_COLORS: Record<string, string> = {
  pending_requester: 'bg-gray-100 text-gray-600',
  pending_manager: 'bg-amber-50 text-amber-600',
  pending_admin: 'bg-amber-50 text-amber-600',
  approved: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
}
