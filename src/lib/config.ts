// Chỉ dùng ở phía server (route handler, middleware). Không có tiền tố NEXT_PUBLIC_
// nên giá trị này không bị lộ ra trình duyệt.
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
