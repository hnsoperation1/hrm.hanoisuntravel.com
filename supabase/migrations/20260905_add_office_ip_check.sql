-- Thêm lớp kiểm tra IP văn phòng — bổ sung cho GPS, KHÔNG thay thế.
-- Yếu hơn WiFi BSSID thật (không phân biệt được access point cụ thể, và có
-- thể bị qua mặt bằng VPN/tunnel về đúng mạng văn phòng), nhưng làm được
-- ngay trên nền web hiện có, không cần app native.

-- Mỗi địa điểm có thể khai 1 hoặc nhiều IP công cộng hợp lệ (cách nhau bởi
-- dấu phẩy, vd IP văn phòng có 2 đường truyền dự phòng). Để trống = không
-- áp dụng check IP cho địa điểm này (chỉ dùng GPS như trước).
alter table hrm_work_locations add column if not exists office_ip text;

comment on column hrm_work_locations.office_ip is
  'Danh sách IP công cộng hợp lệ của địa điểm này, cách nhau bởi dấu phẩy. NULL/rỗng = không áp dụng check IP.';

-- Ghi lại IP thực tế của request lúc chấm công + kết quả so khớp, để làm
-- bằng chứng/báo cáo, độc lập với is_within_radius (GPS).
alter table hrm_attendance_logs add column if not exists request_ip text;
alter table hrm_attendance_logs add column if not exists is_ip_verified boolean not null default false;
