// Đoán tên thiết bị/trình duyệt từ User-Agent để hiện trong màn xác nhận đăng
// nhập ("Chrome trên Windows") — không cần chính xác tuyệt đối, chỉ để người
// dùng nhận ra đúng là thiết bị họ đang cầm QR trên tay.
export function parseDeviceLabel(ua: string | null): string {
  if (!ua) return 'Thiết bị không rõ'

  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Macintosh/i.test(ua)
      ? 'macOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /iPhone|iPad/i.test(ua)
          ? 'iOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'không rõ'

  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Trình duyệt'

  return `${browser} trên ${os}`
}

export const QR_LOGIN_SESSION_TTL_MS = 3 * 60 * 1000
