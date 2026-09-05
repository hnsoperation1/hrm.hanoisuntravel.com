-- Đăng ký khuôn mặt giờ lưu NHIỀU embedding mẫu (~5 ảnh) thay vì 1 — chấm
-- công so khớp với CẢ 5 mẫu, lấy khoảng cách NHỎ NHẤT (khớp tốt nhất), tăng
-- độ chính xác vì mỗi mẫu chụp góc/ánh sáng hơi khác nhau.

alter table hrm_face_enrollments add column if not exists embeddings jsonb;

-- Chuyển dữ liệu cũ (1 embedding) sang định dạng mới (mảng 1 phần tử) —
-- không mất dữ liệu nhân viên đã đăng ký trước khi có migration này.
update hrm_face_enrollments
set embeddings = jsonb_build_array(embedding)
where embeddings is null and embedding is not null;

alter table hrm_face_enrollments alter column embeddings set not null;
alter table hrm_face_enrollments drop column if exists embedding;

comment on column hrm_face_enrollments.embeddings is
  'Mảng các embedding mẫu (mỗi phần tử là 128 số) — thường ~5 mẫu chụp lúc đăng ký. Chấm công so với TẤT CẢ, lấy khoảng cách nhỏ nhất.';
