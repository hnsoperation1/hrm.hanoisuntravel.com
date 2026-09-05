-- Thêm 'telegram_webapp' vào danh sách channel hợp lệ — kênh chấm công mới
-- qua trang /cham-cong mở dưới dạng Telegram Web App (chạy như trình duyệt
-- thật, giữ được IP thật của nhân viên) — khác với 'telegram' (chia sẻ vị
-- trí kiểu cũ qua bàn phím request_location, đi qua server Telegram nên
-- không check IP được, xem migration 20260905c_telegram_bot.sql).
alter table hrm_attendance_logs drop constraint if exists hrm_attendance_logs_channel_check;
alter table hrm_attendance_logs add constraint hrm_attendance_logs_channel_check
  check (channel in ('web', 'telegram', 'telegram_webapp'));
