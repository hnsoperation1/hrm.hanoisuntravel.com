-- Đăng nhập bằng quét QR: máy tính hiện QR, điện thoại (đã đăng nhập sẵn)
-- quét mở link xác nhận, xác nhận được ở CẢ trang đó lẫn qua Telegram (nếu
-- đã liên kết) — bên nào bấm trước cũng được vì cùng cập nhật 1 phiên này.
create table if not exists hrm_qr_login_sessions (
  id text primary key,
  status text not null default 'pending' check (status in ('pending', 'scanned', 'approved', 'rejected')),
  -- NULL cho tới khi điện thoại quét mã (claim) mới biết đây là ai.
  user_id uuid references users(id) on delete cascade,
  device_label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table hrm_qr_login_sessions enable row level security;
-- Không cấp policy cho authenticated/anon — bảng này chỉ được các API route
-- /api/auth/qr/* đọc/ghi bằng service_role, không bao giờ query trực tiếp từ
-- client. Phiên dùng 1 lần và bị xoá ngay sau khi đăng nhập thành công.
