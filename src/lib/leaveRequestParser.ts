// Đọc tin nhắn tự do trong nhóm Telegram HCNS, dùng LLM (OpenAI gpt-4o-mini)
// để nhận diện có phải đơn xin nghỉ/đi muộn/về sớm/làm online/công tác
// không, và nếu đúng thì tách thành dữ liệu có cấu trúc. Gọi thẳng REST API
// bằng fetch (không thêm SDK openai chỉ để dùng 1 lệnh gọi đơn giản).

export type LeaveRequestType = 'nghi_phep' | 'di_muon' | 've_som' | 'lam_online' | 'cong_tac'

export const LEAVE_REQUEST_TITLES: Record<LeaveRequestType, string> = {
  nghi_phep: 'XIN NGHỈ',
  di_muon: 'XIN ĐI MUỘN',
  ve_som: 'XIN VỀ SỚM',
  lam_online: 'ĐĂNG KÍ LÀM ONLINE',
  cong_tac: 'ĐĂNG KÍ ĐI CÔNG TÁC',
}

// Nhãn field theo từng loại đơn — dùng chung cho cả prompt LLM lẫn hiển thị
// thẻ đơn + menu sửa thông tin, tránh lệch tên field giữa các nơi.
export const LEAVE_REQUEST_FIELDS: Record<LeaveRequestType, { key: string; label: string }[]> = {
  nghi_phep: [
    { key: 'tu_ngay', label: 'Từ ngày' },
    { key: 'den_ngay', label: 'Đến ngày' },
    { key: 'buoi', label: 'Buổi' },
    { key: 'ly_do', label: 'Lý do' },
  ],
  di_muon: [
    { key: 'ngay', label: 'Ngày' },
    { key: 'gio_du_kien_den', label: 'Giờ dự kiến đến' },
    { key: 'ly_do', label: 'Lý do' },
  ],
  ve_som: [
    { key: 'ngay', label: 'Ngày' },
    { key: 'gio_ve', label: 'Giờ về' },
    { key: 'ly_do', label: 'Lý do' },
  ],
  lam_online: [
    { key: 'tu_ngay', label: 'Từ ngày' },
    { key: 'den_ngay', label: 'Đến ngày' },
    { key: 'buoi', label: 'Buổi' },
    { key: 'ly_do', label: 'Lý do' },
  ],
  cong_tac: [
    { key: 'tu_ngay', label: 'Từ ngày' },
    { key: 'den_ngay', label: 'Đến ngày' },
    { key: 'dia_diem', label: 'Địa điểm' },
    { key: 'ly_do', label: 'Lý do' },
  ],
}

export type ParsedLeaveRequest =
  | { isRequest: false }
  | { isRequest: true; type: LeaveRequestType; fields: Record<string, string> }

function stripCodeFence(text: string) {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return match ? match[1] : trimmed
}

// Trả về null khi không parse được / lỗi gọi API — nơi gọi coi như "không
// phải đơn từ" thay vì làm gián đoạn luồng chat bình thường của nhóm.
export async function parseLeaveRequest(rawText: string): Promise<ParsedLeaveRequest | null> {
  const today = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  const fieldsDoc = (Object.entries(LEAVE_REQUEST_FIELDS) as [LeaveRequestType, { key: string; label: string }[]][])
    .map(([type, fields]) => `- ${type}: ${fields.map((f) => f.key).join(', ')}`)
    .join('\n')

  const system = `Bạn đọc tin nhắn trong 1 nhóm chat nhân sự (HCNS) của công ty du lịch. Nhiệm vụ: xác định tin nhắn có phải đơn xin nghỉ / xin đi muộn / xin về sớm / đăng ký làm online / đăng ký đi công tác hay không, nếu đúng thì tách thông tin.

Hôm nay là ngày ${today} (giờ Việt Nam). Nếu người viết nhắc ngày tương đối (mai, mốt, thứ 2 tuần sau...) hãy quy đổi ra dd/mm/yyyy dựa theo hôm nay.

5 loại đơn và các field tương ứng:
${fieldsDoc}

Riêng "nghi_phep" và "lam_online" có field "buoi" (Buổi): giá trị là "Sáng", "Chiều" hoặc "Cả ngày".
- Chỉ xin nghỉ/làm online 1 buổi của 1 ngày (vd "nghỉ chiều nay", "làm online sáng mai") -> tu_ngay = den_ngay = đúng ngày đó, buoi = "Sáng" hoặc "Chiều".
- Xin cả ngày hoặc nhiều ngày (vd "nghỉ từ mai đến thứ 6", "nghỉ cả ngày mai") -> buoi = "Cả ngày".

Chỉ trả lời bằng JSON, KHÔNG kèm chữ nào khác, đúng 1 trong 2 dạng:
{"is_request": false}
{"is_request": true, "type": "<1 trong 5 loại trên>", "fields": {"<key>": "<giá trị>", ...}}

Nếu thiếu thông tin của field nào thì để chuỗi rỗng "" cho field đó, không được bịa. Tin nhắn phiếm/chào hỏi/không liên quan -> is_request false.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: rawText },
      ],
    }),
  })

  if (!res.ok) {
    console.error('[leaveRequestParser] OpenAI API lỗi', res.status, await res.text().catch(() => ''))
    return null
  }

  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content
  if (typeof text !== 'string') return null

  try {
    const parsed = JSON.parse(stripCodeFence(text))
    if (parsed?.is_request === false) return { isRequest: false }
    if (parsed?.is_request === true && typeof parsed.type === 'string' && parsed.fields && typeof parsed.fields === 'object') {
      if (!(parsed.type in LEAVE_REQUEST_FIELDS)) return null
      return { isRequest: true, type: parsed.type, fields: parsed.fields }
    }
    return null
  } catch (e) {
    console.error('[leaveRequestParser] Không parse được JSON từ LLM', text, e)
    return null
  }
}
