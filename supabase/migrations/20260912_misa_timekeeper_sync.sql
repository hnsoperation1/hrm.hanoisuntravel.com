-- Đồng bộ dữ liệu chấm công thô từ MISA AMIS Chấm Công về hrm_attendance_logs
-- — MISA chỉ là 1 trong nhiều "nguồn đầu vào" (giống web/telegram), iHNS vẫn
-- là hệ thống chính nhân viên xem và admin quản trị tổng thể.

-- Chấm công từ máy vật lý/MISA không có GPS — trước đây lat/lng bắt buộc vì
-- mọi lượt đều tự trình duyệt/app định vị được.
alter table hrm_attendance_logs alter column lat drop not null;
alter table hrm_attendance_logs alter column lng drop not null;

alter table hrm_attendance_logs drop constraint if exists hrm_attendance_logs_channel_check;
alter table hrm_attendance_logs add constraint hrm_attendance_logs_channel_check
  check (channel in ('web', 'telegram', 'telegram_webapp', 'misa'));

-- Chống trùng khi cron chạy lại/lệch khoảng thời gian sync — MISA không trả
-- về ID bản ghi ổn định nên tự đặt khoá theo (nhân viên, thời điểm quẹt).
create unique index if not exists idx_hrm_attendance_misa_unique
  on hrm_attendance_logs (user_id, created_at) where channel = 'misa';

-- Mã nhân viên bên MISA AMIS Chấm Công — admin nhập tay để biết ánh xạ đúng
-- người khi đồng bộ. Nhân viên nào không có mã thì bỏ qua khi sync.
alter table hrm_employee_requirements add column if not exists misa_employee_code text;
create unique index if not exists idx_hrm_employee_requirements_misa_code
  on hrm_employee_requirements (misa_employee_code) where misa_employee_code is not null;

-- Mốc đồng bộ gần nhất — cron 8h sáng mỗi ngày chỉ cần lấy dữ liệu MỚI kể từ
-- mốc này, không phải quét lại từ đầu mỗi lần.
alter table hrm_app_settings add column if not exists misa_last_synced_at timestamptz;
