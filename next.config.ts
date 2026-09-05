import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mini App Zalo tải model face-api.js từ đây, chạy trên domain khác —
  // cần CORS mở cho đúng thư mục model (chỉ dữ liệu công khai, không nhạy cảm).
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
