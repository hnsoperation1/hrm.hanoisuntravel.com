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
- **`/dang-ky-khuon-mat`** — nhân viên tự đăng ký khuôn mặt (1 lần, đăng ký
  lại bất kỳ lúc nào). Xem chi tiết ở mục riêng bên dưới.
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

## Xác thực khuôn mặt (chạy hoàn toàn trên thiết bị)

Dùng [`face-api.js`](https://github.com/justadudewhohacks/face-api.js) chạy
trong trình duyệt (TensorFlow.js, backend WebGL/WASM) — **không gọi dịch vụ
bên ngoài, không tốn phí theo lượt, không gửi ảnh lên server**:

1. Nhân viên vào `/dang-ky-khuon-mat`, trình duyệt tự trích "embedding" (128
   số đặc trưng khuôn mặt) từ ảnh mẫu, gửi vector đó (không phải ảnh) lên
   lưu trong bảng `hrm_face_enrollments`.
2. Mỗi lần chấm công ở `/`, ngay sau khi lấy GPS, trình duyệt tự mở camera,
   trích embedding mới, gửi kèm request `/api/attendance/check-in`.
3. Server so khoảng cách Euclid giữa 2 embedding (ngưỡng chuẩn `0.6` của
   `face-api.js`) — khớp thì `is_face_verified = true`, ghi cả khoảng cách
   (`face_distance`) để tiện audit.

**Model weights** (~7MB, tải 1 lần từ `justadudewhohacks/face-api.js` GitHub
repo, đã copy sẵn vào `public/models/` trong repo này — không cần tải lại
khi setup máy mới, chỉ cần `git clone` là có đủ).

**Quan trọng — CHƯA bắt buộc để tính `is_success`**: giống cách `is_ip_verified`
từng bắt đầu, khuôn mặt hiện chỉ được **ghi nhận**, chưa đưa vào điều kiện
chấm công hợp lệ. Muốn bắt buộc khớp khuôn mặt mới tính thành công, sửa dòng
`isSuccess` trong `src/app/api/attendance/check-in/route.ts` thêm điều kiện
`isFaceVerified` — cần cân nhắc trước vì sẽ chặn cứng nhân viên chưa đăng ký
khuôn mặt.

## Giới hạn đã biết (chưa làm ở v1)

- Chưa chống giả lập GPS (mock location) — Geolocation API trình duyệt không
  có cách phát hiện việc này từ phía web. Muốn chặt hơn cần app di động native
  (đọc được flag `isMock` trên Android).
- Xác thực khuôn mặt **chưa có liveness** (chống ảnh in/quay lại màn hình) —
  chỉ so khớp đặc trưng khuôn mặt, ai cầm ảnh in rõ nét của người khác vẫn có
  thể qua được. Muốn thêm cần tự viết logic chớp mắt/quay đầu qua landmark
  (`face-api.js` đã trả sẵn 68 điểm landmark, chưa dùng tới) hoặc chuyển sang
  dịch vụ thương mại có liveness (đã bàn, không chọn vì tốn phí/hạ tầng).
- Chưa có ràng buộc "1 ca = tối đa 1 lần vào + 1 lần ra" — loại type gửi từ
  client được tin theo trạng thái UI, chưa validate chặt phía server.
- RLS chặn insert đúng `user_id = auth.uid()` (không giả mạo chấm công hộ
  người khác qua API), nhưng không chặn tự chấm công nhiều lần liên tiếp.
- `hrm_face_enrollments` cho phép nhân viên tự đăng ký lại bất kỳ lúc nào,
  không cần admin duyệt — nghĩa là 1 nhân viên có thể tự thay embedding tham
  chiếu của chính mình. Đủ dùng cho mục đích hiện tại (chỉ ghi nhận, chưa
  chặn cứng), nhưng nếu sau này bắt buộc khớp khuôn mặt mới cho chấm công,
  nên cân nhắc thêm bước admin khoá lại sau lần đăng ký đầu.
