import { NextResponse } from "next/server";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";

// TẠM THỜI: backend chưa có API đăng nhập khách hàng.
// Dùng tài khoản mock để làm luồng giao diện. Khi backend có API thật, thay phần này bằng cách gọi BACKEND_URL.
const MOCK_CUSTOMERS: Record<string, { password: string; tier: "VIP" | "LOYAL" }> = {
  nguyenvana: { password: "123456", tier: "VIP" },
  tranthib: { password: "123456", tier: "LOYAL" },
};

export async function POST(req: Request) {
  const body: { username?: string; password?: string } = await req.json().catch(() => ({}));
  const username = body.username?.trim().toLowerCase() ?? "";
  const customer = MOCK_CUSTOMERS[username];

  if (!customer || customer.password !== body.password) {
    return NextResponse.json({ message: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });
  }

  const response = NextResponse.json({ message: `Xin chào ${username}` });
  response.cookies.set(STORE_SESSION_COOKIE, username, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
