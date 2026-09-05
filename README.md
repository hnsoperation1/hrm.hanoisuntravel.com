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

Chạy các file trong `supabase/migrations/` (theo đúng thứ tự tên file) trên
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
- **Bot Telegram** — bấm nút "📍 Chấm công" trong Telegram sẽ mở thẳng trang
  `/` dưới dạng **Telegram Web App** (nhúng trong Telegram, không bật trình
  duyệt riêng). Trang chạy như trình duyệt thật (IP thật, cookie thật) nên
  đăng nhập Supabase Auth hoạt động bình thường — lần đầu mở sẽ ra màn đăng
  nhập, các lần sau giữ nguyên session. Không có cơ chế liên kết tài khoản
  riêng — bot chỉ đóng vai trò "lối tắt" mở web. Xem setup bên dưới.

### Setup bot Telegram

1. Tạo bot qua [@BotFather](https://t.me/BotFather) trên Telegram (`/newbot`),
   lấy token — điền vào `TELEGRAM_BOT_TOKEN` trong `.env.local`/Vercel.
2. Tự đặt 1 chuỗi bí mật bất kỳ cho `TELEGRAM_WEBHOOK_SECRET` (dùng để xác
   thực request đến webhook thật sự đến từ Telegram, không phải ai đó giả mạo
   gọi thẳng URL webhook).
3. Đặt `NEXT_PUBLIC_APP_URL` = domain đã deploy (vd `https://hrm.hanoisuntravel.com`,
   **không** có dấu `/` ở cuối) — bot dùng để dựng nút mở trang chấm công.
   Telegram **bắt buộc URL Web App phải là HTTPS**, không nhận `http://localhost`.
4. Sau khi deploy, đăng ký webhook (chạy 1 lần, hoặc lại mỗi khi đổi secret):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://hrm.hanoisuntravel.com/api/telegram/webhook&secret_token=<SECRET>"
```

5. Test cục bộ (chưa deploy): dùng `ngrok http 3000` lấy URL public HTTPS tạm
   thời, trỏ cả `setWebhook` và `NEXT_PUBLIC_APP_URL` vào URL ngrok đó.

**Lưu ý**: bảng `hrm_telegram_links`/`hrm_telegram_link_codes` và giá trị
`channel = 'telegram'`/`'telegram_webapp'` trong migrations là tàn dư của 1
thiết kế cũ (bot tự nhận vị trí + liên kết tài khoản riêng) đã bỏ — không còn
code nào dùng tới, chấm công qua Telegram giờ luôn ghi `channel = 'web'` như
mở bằng trình duyệt thường. Có thể dọn các bảng đó sau nếu chắc chắn không
cần nữa, không bắt buộc vì không gây hại khi để không dùng.

## Giới hạn đã biết (chưa làm ở v1)

- Chưa chống giả lập GPS (mock location) — Geolocation API trình duyệt không
  có cách phát hiện việc này từ phía web. Muốn chặt hơn cần app di động native
  (đọc được flag `isMock` trên Android) hoặc kết hợp thêm xác thực khuôn mặt
  (đã bàn riêng, chưa triển khai).
- Chưa có ràng buộc "1 ca = tối đa 1 lần vào + 1 lần ra" — loại type gửi từ
  client được tin theo trạng thái UI, chưa validate chặt phía server.
- RLS chặn insert đúng `user_id = auth.uid()` (không giả mạo chấm công hộ
  người khác qua API), nhưng không chặn tự chấm công nhiều lần liên tiếp.
