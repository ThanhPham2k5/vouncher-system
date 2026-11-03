// Chỉ dùng ở phía server (route handler). Quản lý cookie phiên admin và làm mới token với BE.
import type { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/cookies";

// Khớp AuthResponse của BE. BE trả LocalDateTime (không có múi giờ) nên dùng giờ Việt Nam.
export interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

const VN_OFFSET = "+07:00";

// Số giây còn lại đến thời điểm hết hạn, dùng làm maxAge cho cookie
function secondsUntil(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : `${value}${VN_OFFSET}`;
  const t = Date.parse(withZone);
  if (Number.isNaN(t)) return fallback;
  return Math.max(1, Math.floor((t - Date.now()) / 1000));
}

export function applyAdminCookies(
  response: NextResponse,
  tokens: BackendTokens,
): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ADMIN_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: secondsUntil(tokens.accessExpiresAt, 60 * 60 * 2),
  });
  response.cookies.set(ADMIN_REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: secondsUntil(tokens.refreshExpiresAt, 60 * 60 * 24 * 7),
  });
}

export function clearAdminCookies(response: NextResponse): void {
  response.cookies.delete(ADMIN_ACCESS_COOKIE);
  response.cookies.delete(ADMIN_REFRESH_COOKIE);
}

// Gọi BE POST /auth/refresh. Trả null nếu refresh token không còn hiệu lực.
export async function refreshBackendTokens(
  refreshToken: string,
): Promise<BackendTokens | null> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => null)) as {
    data?: BackendTokens;
  } | null;
  return payload?.data ?? null;
}
