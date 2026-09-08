-- Đơn từ (xin nghỉ / đi muộn / về sớm / làm online / công tác) đọc từ tin
-- nhắn tự do trong nhóm Telegram HCNS, LLM tách thành dữ liệu có cấu trúc,
-- duyệt qua 3 bước: người xin xác nhận -> quản lý trực tiếp đồng ý -> admin
-- chấm công duyệt.

-- hrm_telegram_links đã có sẵn (chat_id primary key, user_id unique) từ tính
-- năng liên kết Telegram cũ (code đã gỡ nhưng bảng còn) — dùng lại nguyên
-- bảng này để admin nhập tay chat_id cho từng nhân viên, không tạo bảng mới.
-- Bảng có RLS bật nhưng CHƯA có policy nào -> thêm policy cho admin quản lý.
drop policy if exists "admin_manage_telegram_links" on hrm_telegram_links;
create policy "admin_manage_telegram_links"
  on hrm_telegram_links for all to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  )
  with check (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

-- Quản lý trực tiếp — người sẽ bấm "Đồng ý" ở bước 2. Gắn vào
-- hrm_employee_requirements vì đây cũng là cấu hình riêng theo từng nhân
-- viên của phân hệ HRM, không đụng vào bảng `users` dùng chung nhiều app.
alter table hrm_employee_requirements add column if not exists manager_id uuid references users(id) on delete set null;

-- Admin chấm công — người duy nhất bấm "Duyệt" ở bước 3, áp dụng chung toàn
-- hệ thống nên đặt trong hrm_app_settings (bảng singleton đã có sẵn).
alter table hrm_app_settings add column if not exists attendance_admin_user_id uuid references users(id) on delete set null;

-- Nhóm Telegram HCNS — nơi bot đọc tin nhắn xin nghỉ/đi muộn... 1 văn phòng
-- có thể có 1 nhóm riêng, admin tự thêm bằng cách dán chat_id (số âm) lấy
-- được từ chính bot khi có ai nhắn trong nhóm mà chưa được cấu hình.
create table if not exists hrm_telegram_groups (
  chat_id bigint primary key,
  label text not null,
  created_at timestamptz not null default now()
);

alter table hrm_telegram_groups enable row level security;

drop policy if exists "admin_manage_telegram_groups" on hrm_telegram_groups;
create policy "admin_manage_telegram_groups"
  on hrm_telegram_groups for all to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  )
  with check (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

-- 1 dòng = 1 đơn từ, từ lúc bot phát hiện trong nhóm cho tới lúc duyệt xong.
create table if not exists hrm_leave_requests (
  id uuid primary key default gen_random_uuid(),
  -- request_no ngắn hơn uuid nhiều, dùng để nhét vào callback_data của nút
  -- Telegram (giới hạn 64 byte) thay vì nhét cả uuid vào đó.
  request_no bigint generated always as identity,
  type text not null check (type in ('nghi_phep', 'di_muon', 've_som', 'lam_online', 'cong_tac')),
  requester_id uuid not null references users(id) on delete cascade,
  manager_id uuid references users(id) on delete set null,
  group_chat_id bigint not null,
  bot_message_id bigint,
  raw_text text not null,
  -- Dữ liệu LLM tách ra, khác nhau theo từng loại đơn nên dùng jsonb thay vì
  -- cột cứng — vd nghi_phep có tu_ngay/den_ngay/ly_do, di_muon có
  -- ngay/gio_du_kien_den/ly_do.
  fields jsonb not null default '{}'::jsonb,
  -- Khác NULL nghĩa là đang chờ người xin nhập giá trị mới cho đúng field
  -- này (tin nhắn tiếp theo của họ trong nhóm sẽ được hiểu là giá trị mới,
  -- không phải 1 đơn mới).
  editing_field text,
  status text not null default 'pending_requester' check (
    status in ('pending_requester', 'pending_manager', 'pending_admin', 'approved', 'rejected')
  ),
  requester_confirmed_at timestamptz,
  manager_confirmed_at timestamptz,
  admin_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_hrm_leave_requests_no on hrm_leave_requests(request_no);
create index if not exists idx_hrm_leave_requests_requester on hrm_leave_requests(requester_id);

alter table hrm_leave_requests enable row level security;

-- Webhook ghi/đọc bằng service_role (bỏ qua RLS) vì Telegram gọi thẳng vào
-- webhook, không có phiên đăng nhập Supabase. Policy dưới đây chỉ để admin
-- xem lại lịch sử đơn từ trên web sau này.
drop policy if exists "admin_read_leave_requests" on hrm_leave_requests;
create policy "admin_read_leave_requests"
  on hrm_leave_requests for select to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );
