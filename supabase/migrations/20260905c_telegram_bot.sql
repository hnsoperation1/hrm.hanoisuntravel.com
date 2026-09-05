-- Bot Telegram chấm công — nhân viên bấm nút "Chia sẻ vị trí" trong Telegram
-- thay vì mở trình duyệt. Cần 2 bảng mới + 1 cột đánh dấu nguồn chấm công.

-- Liên kết 1 tài khoản Supabase Auth (users.id) với 1 chat Telegram. 1 user
-- chỉ liên kết 1 chat_id tại 1 thời điểm (unique user_id) — liên kết lại sẽ
-- ghi đè chat_id cũ (trường hợp đổi điện thoại/tài khoản Telegram).
create table if not exists hrm_telegram_links (
  chat_id bigint primary key,
  user_id uuid not null unique references users(id) on delete cascade,
  telegram_username text,
  linked_at timestamptz not null default now()
);

alter table hrm_telegram_links enable row level security;
-- Chỉ webhook (service_role) và chính user đó (qua API route riêng) mới cần
-- đọc/ghi bảng này — không cấp policy cho authenticated đọc thẳng qua client.

-- Mã liên kết ngắn hạn — nhân viên tạo từ web app (đã đăng nhập), gửi mã này
-- cho bot Telegram để xác nhận đúng danh tính, tránh ai đó đoán/link nhầm
-- tài khoản người khác.
create table if not exists hrm_telegram_link_codes (
  code text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table hrm_telegram_link_codes enable row level security;

-- Đánh dấu nguồn của 1 lượt chấm công — quan trọng vì lớp "check IP văn
-- phòng" (migration 20260905_add_office_ip_check.sql) KHÔNG áp dụng được cho
-- kênh Telegram: request tới webhook luôn đến từ server Telegram, không phải
-- IP thật của nhân viên, nên check IP sẽ luôn sai nếu áp cho kênh này.
alter table hrm_attendance_logs add column if not exists channel text not null default 'web';
alter table hrm_attendance_logs drop constraint if exists hrm_attendance_logs_channel_check;
alter table hrm_attendance_logs add constraint hrm_attendance_logs_channel_check check (channel in ('web', 'telegram'));
