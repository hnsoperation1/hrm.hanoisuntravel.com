# HNS HRM — Chấm công theo vị trí GPS

Next.js 16 + TypeScript + Tailwind v4, dùng **chung Supabase project** với
`hns-crm`/`ketoan.hanoisuntravel.com` (cùng bảng `users`/Supabase Auth, cùng
hàm `is_super_admin()`).

## Cài đặt

```bash
npm install
cp .env.example .env.local   # điền NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
                              # (lấy từ project Supabase của hns-crm)
```

Chạy migration tại `supabase/migrations/20260903_init_hrm_attendance.sql` trên
**Supabase SQL Editor** (chưa tự execute — theo đúng quy ước các app khác
trong workspace, xem `AGENTS.md`/`CLAUDE_MEMORY.md` ở `d:\hns-erp`).

```bash
npm run dev
```

Đăng nhập bằng tài khoản Supabase Auth đã có sẵn (nhân viên nào cũng đăng
nhập được — không cần allowlist riêng như ketoan, vì chấm công áp dụng cho
toàn công ty).

## Tính năng đã có (v1)

- **`/`** — Chấm công vào/ra: xin quyền định vị trình duyệt, gửi toạ độ lên
  server, server tính khoảng cách (Haversine) tới địa điểm hợp lệ gần nhất,
  ghi log kèm cờ "trong/ngoài bán kính cho phép". Vẫn ghi log khi ngoài bán
  kính (không chặn cứng) — chỉ gắn cờ để quản lý xem lại.
- **`/admin/dia-diem`** (Super Admin/Boss) — CRUD địa điểm chấm công (toạ độ +
  bán kính), có nút "Dùng vị trí hiện tại" để lấy toạ độ nhanh khi đứng tại
  văn phòng.
- **`/admin/bao-cao`** (Super Admin/Boss) — xem 500 log chấm công gần nhất
  toàn công ty, kèm tên nhân viên, khoảng cách, cảnh báo ngoài vùng.

## Giới hạn đã biết (chưa làm ở v1)

- Chưa chống giả lập GPS (mock location) — Geolocation API trình duyệt không
  có cách phát hiện việc này từ phía web. Muốn chặt hơn cần app di động native
  (đọc được flag `isMock` trên Android) hoặc kết hợp thêm xác thực khuôn mặt
  (đã bàn riêng, chưa triển khai).
- Chưa có ràng buộc "1 ca = tối đa 1 lần vào + 1 lần ra" — loại type gửi từ
  client được tin theo trạng thái UI, chưa validate chặt phía server.
- RLS chặn insert đúng `user_id = auth.uid()` (không giả mạo chấm công hộ
  người khác qua API), nhưng không chặn tự chấm công nhiều lần liên tiếp.
