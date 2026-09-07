-- Cấu hình chung toàn hệ thống (khác hrm_employee_requirements — đó là theo
-- TỪNG nhân viên, còn bảng này là 1 dòng DUY NHẤT áp dụng cho tất cả). Bắt
-- đầu với ngưỡng khớp khuôn mặt — trước đây hard-code 0.3 trong code, giờ
-- cho admin chỉnh trực tiếp trên UI mà không cần deploy lại.
create table if not exists hrm_app_settings (
  id smallint primary key default 1,
  face_match_threshold double precision not null default 0.3,
  updated_at timestamptz not null default now(),
  constraint hrm_app_settings_singleton check (id = 1)
);

insert into hrm_app_settings (id) values (1) on conflict (id) do nothing;

alter table hrm_app_settings enable row level security;

-- Mọi nhân viên đã đăng nhập đều cần đọc được ngưỡng này — route check-in
-- chạy bằng session của chính họ để so khớp khuôn mặt lúc chấm công.
drop policy if exists "read_app_settings" on hrm_app_settings;
create policy "read_app_settings"
  on hrm_app_settings for select to authenticated
  using (true);

-- Chỉ Super Admin/Boss được sửa.
drop policy if exists "admin_write_app_settings" on hrm_app_settings;
create policy "admin_write_app_settings"
  on hrm_app_settings for update to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  )
  with check (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );
