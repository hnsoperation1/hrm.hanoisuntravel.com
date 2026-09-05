-- Xác thực khuôn mặt chạy trên thiết bị (face-api.js, trình duyệt tự trích
-- đặc trưng khuôn mặt/embedding — 128 số thực) — server chỉ nhận vector đã
-- trích sẵn để so sánh, KHÔNG nhận/lưu ảnh gốc, KHÔNG gọi dịch vụ bên ngoài.

-- hrm_face_enrollments: mỗi nhân viên đăng ký 1 embedding tham chiếu (ảnh
-- mẫu chụp lúc đăng ký). Tự quản (self-service) — nhân viên tự đăng ký/đăng
-- ký lại qua trang /dang-ky-khuon-mat, không cần admin duyệt ở bản v1 này.
create table if not exists hrm_face_enrollments (
  user_id uuid primary key references users(id) on delete cascade,
  embedding jsonb not null,
  enrolled_at timestamptz not null default now()
);

alter table hrm_face_enrollments enable row level security;

drop policy if exists "self_manage_face_enrollment" on hrm_face_enrollments;
create policy "self_manage_face_enrollment"
  on hrm_face_enrollments for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ghi lại kết quả so khớp khuôn mặt vào từng lượt chấm công — CHƯA bắt buộc
-- để tính is_success (chỉ ghi nhận thông tin), giống cách is_ip_verified
-- từng bắt đầu trước khi được yêu cầu tính vào is_success.
alter table hrm_attendance_logs add column if not exists is_face_verified boolean not null default false;
alter table hrm_attendance_logs add column if not exists face_distance double precision;
