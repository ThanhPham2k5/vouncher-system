import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/cookies";

interface BackendAuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  tokenType: string;
}

interface BackendEnvelope<T> {
  status: number;
  message?: string;
  data?: T;
}

// Gọi backend từ server Next.js nên không cần CORS, và token không lộ ra trình duyệt
export async function POST(req: Request) {
  const body: { username?: string; password?: string } = await req.json().catch(() => ({}));
  if (!body.username || !body.password) {
    return NextResponse.json({ message: "Vui lòng nhập đầy đủ thông tin" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: body.username, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Không kết nối được máy chủ" }, { status: 503 });
  }

  const payload = (await backendRes.json().catch(() => null)) as BackendEnvelope<BackendAuthTokens> | null;

  if (!backendRes.ok || !payload?.data) {
    if (backendRes.status === 401 || backendRes.status === 403) {
      return NextResponse.json({ message: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });
    }
    if (backendRes.status >= 500) {
      return NextResponse.json({ message: "Lỗi máy chủ, vui lòng thử lại sau" }, { status: 502 });
    }
    return NextResponse.json({ message: payload?.message ?? "Đăng nhập thất bại" }, { status: 400 });
  }

  const { accessToken, refreshToken } = payload.data;
  const response = NextResponse.json({ message: "Chào mừng quản trị viên" });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ADMIN_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  response.cookies.set(ADMIN_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
