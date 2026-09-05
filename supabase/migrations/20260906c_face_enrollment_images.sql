-- Lưu thêm ẢNH gốc (không chỉ vector) của mỗi mẫu đăng ký khuôn mặt để admin
-- có thể xem lại bằng mắt, xác minh nhân viên đăng ký đúng khuôn mặt của
-- chính mình — vector 128 số không tự nói lên điều gì khi audit thủ công.
alter table hrm_face_enrollments add column if not exists image_paths jsonb;

comment on column hrm_face_enrollments.image_paths is
  'Mảng đường dẫn ảnh trong Storage bucket face-enrollments, song song với embeddings (ảnh thứ i tương ứng vector thứ i).';

-- Trước đây chỉ chính chủ đọc được dòng của mình — giờ cho thêm Super
-- Admin/Boss đọc được TOÀN BỘ để audit. Không cho sửa/xoá qua policy này,
-- nhân viên vẫn tự quản đăng ký/đăng ký lại qua policy self_manage có sẵn.
drop policy if exists "admin_read_face_enrollments" on hrm_face_enrollments;
create policy "admin_read_face_enrollments"
  on hrm_face_enrollments for select to authenticated
  using (
    is_super_admin()
    or exists (select 1 from users u where u.id = auth.uid() and u.role = 'boss')
  );

-- Bucket RIÊNG TƯ chứa ảnh khuôn mặt — không public. Route enroll upload
-- bằng service role (bỏ qua RLS storage), route admin đọc lại cũng bằng
-- service role rồi tự tạo signed URL có hạn — không cần thêm policy
-- storage.objects nào vì client không bao giờ gọi thẳng Storage API.
insert into storage.buckets (id, name, public)
values ('face-enrollments', 'face-enrollments', false)
on conflict (id) do nothing;
