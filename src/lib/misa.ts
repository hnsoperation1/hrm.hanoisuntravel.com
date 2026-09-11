// Client gọi API "lấy dữ liệu chấm công thô" của MISA AMIS Chấm Công — xem
// tài liệu D:\hns-erp\TichHopAPIChamCong.md mục B.VII. MISA chỉ là 1 nguồn
// đầu vào cho hrm_attendance_logs, không phải hệ thống chính.

import { createHmac, randomUUID } from 'crypto'

const MISA_BASE_URL = 'https://amisapp.misa.vn/APIS/TimesheetOpenAPI/api/Open'

export type MisaRawPunch = {
  EmployeeCode: string
  FullName: string
  OrganizationUnitName: string
  CheckTime: string
  JobPositionName: string
  DataSourceID: number
}

function createMisaToken(secretKey: string, transactionId: string) {
  return createHmac('sha256', secretKey).update(transactionId, 'utf8').digest('base64')
}

// MISA yêu cầu định dạng "yyyy-MM-dd HH:mm:ss", không phải ISO.
function formatMisaDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Lấy TOÀN BỘ lượt quẹt thô trong khoảng thời gian, tự phân trang cho tới
// khi đủ Total — cron chạy 1 lần/ngày nên không cần tối ưu quá, ưu tiên đơn
// giản/chắc chắn lấy đủ dữ liệu.
export async function fetchMisaRawPunches(fromDate: Date, toDate: Date): Promise<MisaRawPunch[]> {
  const clientId = process.env.MISA_CLIENT_ID
  const secretKey = process.env.MISA_SECRET_KEY
  if (!clientId || !secretKey) throw new Error('Thiếu MISA_CLIENT_ID hoặc MISA_SECRET_KEY')

  const pageSize = 100
  const all: MisaRawPunch[] = []
  let pageIndex = 1

  while (true) {
    const transactionId = randomUUID()
    const res = await fetch(`${MISA_BASE_URL}/get-data-timekeeper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-clientid': clientId,
        'x-transactionid': transactionId,
        'x-token': createMisaToken(secretKey, transactionId),
      },
      body: JSON.stringify({
        PageSize: pageSize,
        PageIndex: pageIndex,
        FromDate: formatMisaDate(fromDate),
        ToDate: formatMisaDate(toDate),
      }),
    })

    if (!res.ok) throw new Error(`MISA API lỗi HTTP ${res.status}`)
    const json = await res.json()
    if (!json.Success) throw new Error(json.UserMessage ?? json.SystemMessage ?? 'MISA API trả về lỗi không rõ')

    const page: MisaRawPunch[] = json.Data?.PageData ?? []
    all.push(...page)

    const total = json.Data?.Total ?? all.length
    if (page.length === 0 || all.length >= total) break
    pageIndex++
  }

  return all
}
