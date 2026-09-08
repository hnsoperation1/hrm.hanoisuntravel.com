-- Ca làm việc — nền tảng để tính "Bảng công" kiểu MISA (đủ công/thiếu
-- công/đi muộn/OT). Trước đây hệ thống chỉ có giờ chấm công THỰC TẾ, chưa có
-- khái niệm giờ CHUẨN để so sánh.
create table if not exists hrm_shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  -- Thời gian nghỉ giữa ca (vd nghỉ trưa 60 phút) — trừ ra khi tính số giờ
  -- công chuẩn của ca.
  break_minutes integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Nhân viên chưa được gán ca cụ thể thì dùng ca mặc định — chỉ 1 ca được là
-- mặc định tại 1 thời điểm.
alter table hrm_shifts add column if not exists is_default boolean not null default false;
drop index if exists idx_hrm_shifts_one_default;
create unique index idx_hrm_shifts_one_default on hrm_shifts (is_default) where is_default;

alter table hrm_shifts enable row level security;

-- Mọi nhân viên đã đăng nhập cần đọc được giờ ca CHUẨN (của chính mình) để
-- app tự tính đủ/thiếu công — giống cách hrm_work_locations đang mở đọc.
drop policy if exists "authenticated_read_hrm_shifts" on hrm_shifts;
create policy "authenticated_read_hrm_shifts"
  on hrm_shifts for select to authenticated using (true);

drop policy if exists "admin_write_hrm_shifts" on hrm_shifts;
create policy "admin_write_hrm_shifts"
  on hrm_shifts for all to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  )
  with check (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

-- Gán ca cho từng nhân viên — NULL = dùng ca mặc định (is_default = true).
alter table hrm_employee_requirements add column if not exists shift_id uuid references hrm_shifts(id) on delete set null;
