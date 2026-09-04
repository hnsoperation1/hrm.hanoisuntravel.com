-- HRM: chấm công theo vị trí GPS — schema khởi tạo
-- Dùng CHUNG Supabase project với hns-crm/ketoan: bảng `users` (nhân viên có
-- tài khoản Supabase Auth) và hàm `is_super_admin()` đã tồn tại sẵn trên
-- project này (tạo tay/từ hns-crm), KHÔNG định nghĩa lại ở đây.
-- Đặt tên bảng có tiền tố `hrm_` để tránh trùng với bảng của các app khác
-- đang dùng chung project.

create extension if not exists "pgcrypto";

-- ─── hrm_work_locations: các địa điểm hợp lệ để chấm công (văn phòng, điểm tour...) ───
create table if not exists hrm_work_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null default 150,
  is_active boolean not null default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── hrm_attendance_logs: 1 dòng = 1 lần chấm công vào/ra ───
create table if not exists hrm_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('check_in', 'check_out')),
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  nearest_location_id uuid references hrm_work_locations(id) on delete set null,
  distance_m double precision,
  is_within_radius boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_hrm_attendance_user on hrm_attendance_logs(user_id);
create index if not exists idx_hrm_attendance_created on hrm_attendance_logs(created_at);

-- ─── RLS ───
alter table hrm_work_locations enable row level security;
alter table hrm_attendance_logs enable row level security;

-- work_locations: mọi nhân viên đã đăng nhập đọc được (cần để hiển thị/tính
-- khoảng cách phía client nếu cần), chỉ Super Admin hoặc Boss được ghi.
drop policy if exists "authenticated_read_hrm_work_locations" on hrm_work_locations;
create policy "authenticated_read_hrm_work_locations"
  on hrm_work_locations for select to authenticated using (true);

drop policy if exists "admin_write_hrm_work_locations" on hrm_work_locations;
create policy "admin_write_hrm_work_locations"
  on hrm_work_locations for all to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  )
  with check (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

-- attendance_logs: nhân viên chỉ tự chấm công cho chính mình (user_id phải
-- khớp auth.uid() — chặn giả mạo chấm công hộ ở tầng DB, không chỉ ở API).
-- Đọc: tự xem log của mình; Super Admin/Boss xem được toàn bộ để làm báo cáo.
drop policy if exists "self_insert_hrm_attendance" on hrm_attendance_logs;
create policy "self_insert_hrm_attendance"
  on hrm_attendance_logs for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "read_own_or_admin_hrm_attendance" on hrm_attendance_logs;
create policy "read_own_or_admin_hrm_attendance"
  on hrm_attendance_logs for select to authenticated
  using (
    user_id = auth.uid()
    or is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

-- Không có policy update/delete cho attendance_logs — log chấm công là bằng
-- chứng, cố tình không cho ai (kể cả chính chủ) sửa/xoá qua client.
