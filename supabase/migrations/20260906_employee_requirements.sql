-- Cho phép admin bật/tắt riêng từng điều kiện (GPS / IP văn phòng / khuôn
-- mặt) theo TỪNG nhân viên — ví dụ nhân viên hay di chuyển không cần bắt
-- buộc đúng mạng văn phòng, nhưng vẫn cần GPS + khuôn mặt.
create table if not exists hrm_employee_requirements (
  user_id uuid primary key references users(id) on delete cascade,
  require_gps boolean not null default true,
  require_wifi boolean not null default true,
  require_face boolean not null default true,
  -- Gán CỐ ĐỊNH 1 địa điểm cho nhân viên này (vd nhân viên A luôn tính theo
  -- VP Hà Nội, nhân viên B luôn tính theo VP Sài Gòn) — NULL = giữ hành vi
  -- cũ, tự động lấy địa điểm GẦN NHẤT trong số các địa điểm đang bật.
  location_id uuid references hrm_work_locations(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table hrm_employee_requirements enable row level security;

-- Nhân viên chỉ ĐỌC được cấu hình của chính mình (route check-in chạy bằng
-- session của họ, cần tự đọc được để biết điều kiện nào áp dụng) — không
-- được tự sửa.
drop policy if exists "self_read_requirements" on hrm_employee_requirements;
create policy "self_read_requirements"
  on hrm_employee_requirements for select to authenticated
  using (user_id = auth.uid());

-- Chỉ Super Admin/Boss được thêm/sửa/xoá cấu hình của bất kỳ ai.
drop policy if exists "admin_write_requirements" on hrm_employee_requirements;
create policy "admin_write_requirements"
  on hrm_employee_requirements for all to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  )
  with check (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

comment on table hrm_employee_requirements is
  'Chưa có dòng nào cho 1 user_id = mặc định bắt buộc cả 3 điều kiện (giữ đúng hành vi trước khi có bảng này).';
