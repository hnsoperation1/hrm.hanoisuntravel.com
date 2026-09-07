import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Tên cookie riêng cho hrm — mặc định @supabase/ssr đặt tên theo
      // project ref (vd "sb-ttpyomjtlvqqpymmskrd-auth-token"), TRÙNG với tên
      // cookie mà hns-crm dùng cho phiên đăng nhập của nó (cùng 1 project
      // Supabase). hns-crm cố tình đặt cookie đó ở domain CHUNG
      // ".hanoisuntravel.com" để SSO với admin-phongve — nếu ai đã từng đăng
      // nhập hns-crm trên cùng trình duyệt, máy sẽ có 2 cookie TRÙNG TÊN
      // (1 domain chung của crm, 1 domain riêng hrm.hanoisuntravel.com của
      // app này), và Chrome/Safari có thể chọn đọc cookie khác nhau khi cả 2
      // cùng tồn tại → hrm nhận nhầm giá trị, tưởng đã hết hạn/không hợp lệ,
      // văng về login (chỉ thấy trên Chrome, không phải do Chrome xoá cookie).
      // Đặt tên cookie RIÊNG, không đụng namespace với app nào khác, để
      // không bao giờ bị lẫn nữa — không cần các app kia đổi gì cả.
      cookieOptions: { name: 'hrm-auth-token' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    },
  )
}
