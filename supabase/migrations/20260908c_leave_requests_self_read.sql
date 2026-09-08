-- Nhân viên xem lại được đơn từ CỦA CHÍNH MÌNH trên web (trước đây chỉ admin
-- đọc được, luồng nộp/duyệt hoàn toàn qua Telegram nên chưa cần policy này).
drop policy if exists "self_read_leave_requests" on hrm_leave_requests;
create policy "self_read_leave_requests"
  on hrm_leave_requests for select to authenticated
  using (requester_id = auth.uid());
