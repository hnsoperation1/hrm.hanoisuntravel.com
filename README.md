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
- **Bot Telegram chấm công** — nhân viên liên kết tài khoản qua `/lien-ket-telegram`
  (tạo mã 6 số, gửi `/link <mã>` cho bot), sau đó chỉ cần bấm nút "📍 Chấm công"
  trong Telegram để chia sẻ vị trí — không cần mở trình duyệt. Xem setup bên dưới.

### Setup bot Telegram

1. Tạo bot qua [@BotFather](https://t.me/BotFather) trên Telegram (`/newbot`),
   lấy token — điền vào `TELEGRAM_BOT_TOKEN` trong `.env.local`/Vercel.
2. Tự đặt 1 chuỗi bí mật bất kỳ cho `TELEGRAM_WEBHOOK_SECRET` (dùng để xác
   thực request đến webhook thật sự đến từ Telegram, không phải ai đó giả mạo
   gọi thẳng URL webhook).
3. Đặt `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = username bot (không có @, vd
   `HNS_HRM_bot`) — chỉ dùng để hiện link mời trong trang `/lien-ket-telegram`.
4. Sau khi deploy, đăng ký webhook (chạy 1 lần, hoặc lại mỗi khi đổi secret):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://hrm.hanoisuntravel.com/api/telegram/webhook&secret_token=<SECRET>"
```

5. Test cục bộ (chưa deploy): dùng `ngrok http 3000` lấy URL public tạm thời,
   trỏ `setWebhook` tạm vào URL ngrok đó — giống hệt cách ketoan đã làm.

**Lưu ý quan trọng**: kênh Telegram **không** áp dụng được lớp check IP văn
phòng (`office_ip`) — mọi request webhook đều đến từ server Telegram, không
phải mạng thật của nhân viên. Chấm công qua Telegram chỉ xét điều kiện GPS
(`is_within_radius`), cột `channel` trong `hrm_attendance_logs` phân biệt rõ
lượt nào tới từ web (có check IP) và lượt nào từ Telegram (chỉ GPS) — xem cột
"Kênh" trong `/admin/bao-cao`.

## Giới hạn đã biết (chưa làm ở v1)

- Chưa chống giả lập GPS (mock location) — Geolocation API trình duyệt không
  có cách phát hiện việc này từ phía web. Muốn chặt hơn cần app di động native
  (đọc được flag `isMock` trên Android) hoặc kết hợp thêm xác thực khuôn mặt
  (đã bàn riêng, chưa triển khai).
- Chưa có ràng buộc "1 ca = tối đa 1 lần vào + 1 lần ra" — loại type gửi từ
  client được tin theo trạng thái UI, chưa validate chặt phía server.
- RLS chặn insert đúng `user_id = auth.uid()` (không giả mạo chấm công hộ
  người khác qua API), nhưng không chặn tự chấm công nhiều lần liên tiếp.
