-- Bỏ bước "quản lý trực tiếp" khỏi luồng duyệt đơn từ qua Telegram — chỉ còn
-- 2 vai: người nộp đơn và admin chấm công. Việc xin phép quản lý trực tiếp
-- diễn ra riêng (ngoài bot) trước khi đăng đơn vào nhóm, nên không cần bot
-- tự theo dõi bước này nữa. Cột manager_id chỉ được tạo ra riêng cho bước
-- này (migration 20260908_leave_requests.sql) nên gỡ bỏ luôn, không để lại
-- cột chết.
-- Đơn nào đang ở bước cũ "chờ quản lý" thì coi như đã qua bước đó, đẩy thẳng
-- sang chờ admin chấm công duyệt — tránh kẹt đơn cũ khi đổi constraint bên
-- dưới (nếu có đơn thật đã tạo trước khi bỏ bước này).
update hrm_leave_requests set status = 'pending_admin' where status = 'pending_manager';

alter table hrm_leave_requests drop column if exists manager_id;
alter table hrm_leave_requests drop column if exists manager_confirmed_at;
alter table hrm_employee_requirements drop column if exists manager_id;

alter table hrm_leave_requests drop constraint if exists hrm_leave_requests_status_check;
alter table hrm_leave_requests add constraint hrm_leave_requests_status_check check (
  status in ('pending_requester', 'pending_admin', 'approved', 'rejected')
);
