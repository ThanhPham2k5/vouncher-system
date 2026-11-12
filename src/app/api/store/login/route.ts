import { NextResponse } from "next/server";
import { STORE_SESSION_COOKIE } from "@/lib/cookies";
import { MOCK_CUSTOMERS } from "@/lib/store-customers";

// TẠM THỜI: backend chưa có API đăng nhập khách hàng. Dùng tài khoản mock trong lib/store-customers.ts.
// Cookie lưu username, customerId được tra từ username khi cần gọi BE.
export async function POST(req: Request) {
  const body: { username?: string; password?: string } = await req
    .json()
    .catch(() => ({}));
  const username = body.username?.trim().toLowerCase() ?? "";
  const customer = MOCK_CUSTOMERS[username];

  if (!customer || customer.password !== body.password) {
    return NextResponse.json(
      { message: "Sai tên đăng nhập hoặc mật khẩu" },
      { status: 401 },
    );
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
