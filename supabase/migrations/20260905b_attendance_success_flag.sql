-- Thêm cờ is_success — xác định 1 lượt chấm công có "hợp lệ" hay không, tách
-- biệt khỏi việc VẪN GHI LOG mọi lượt bấm (kể cả thất bại) để làm bằng chứng.
--
-- Quy tắc: hợp lệ khi (1) GPS trong bán kính cho phép, VÀ (2) nếu địa điểm
-- gần nhất có khai IP văn phòng thì phải đúng IP đó — địa điểm KHÔNG khai IP
-- thì chỉ cần điều kiện (1), tránh khoá chấm công ở các nơi cố tình không
-- cấu hình IP (VD điểm hẹn tour ngoài trời, không có mạng cố định).
alter table hrm_attendance_logs add column if not exists is_success boolean not null default false;

-- Backfill dữ liệu cũ (trước khi có is_success): coi các log GPS trong bán
-- kính là hợp lệ, vì is_ip_verified lúc đó chưa phải điều kiện bắt buộc.
update hrm_attendance_logs set is_success = is_within_radius where is_success = false;

comment on column hrm_attendance_logs.is_success is
  'Lượt chấm công có được tính hợp lệ không (đạt GPS + IP nếu địa điểm có yêu cầu IP). Log thất bại vẫn được lưu để làm bằng chứng, không tính vào trạng thái vào/ra hiện tại của nhân viên.';
